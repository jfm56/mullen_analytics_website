resource "aws_kms_key" "data" {
  description             = "${local.prefix} PHI data encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = { Name = "${local.prefix}-data" }
}

resource "aws_kms_alias" "data" {
  name          = "alias/${local.prefix}-data"
  target_key_id = aws_kms_key.data.key_id
}

resource "aws_s3_bucket" "phi" {
  bucket_prefix = "${local.prefix}-phi-"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "phi" {
  bucket                  = aws_s3_bucket.phi.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "phi" {
  bucket = aws_s3_bucket.phi.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_versioning" "phi" {
  bucket = aws_s3_bucket.phi.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "phi" {
  bucket = aws_s3_bucket.phi.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.data.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "phi" {
  bucket = aws_s3_bucket.phi.id

  rule {
    id     = "archive-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

data "aws_iam_policy_document" "phi_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.phi.arn, "${aws_s3_bucket.phi.arn}/*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyUnencryptedObjectUploads"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.phi.arn}/*"]
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }
}

resource "aws_s3_bucket_policy" "phi" {
  bucket = aws_s3_bucket.phi.id
  policy = data.aws_iam_policy_document.phi_bucket.json
}

resource "aws_efs_file_system" "legacy" {
  encrypted        = true
  kms_key_id       = aws_kms_key.data.arn
  performance_mode = "generalPurpose"
  throughput_mode  = "elastic"

  lifecycle_policy { transition_to_ia = "AFTER_30_DAYS" }
  lifecycle_policy { transition_to_primary_storage_class = "AFTER_1_ACCESS" }

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "${local.prefix}-legacy-storage" }
}

resource "aws_efs_backup_policy" "legacy" {
  file_system_id = aws_efs_file_system.legacy.id
  backup_policy { status = "ENABLED" }
}

resource "aws_efs_mount_target" "legacy" {
  for_each = aws_subnet.app

  file_system_id  = aws_efs_file_system.legacy.id
  subnet_id       = each.value.id
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "app" {
  file_system_id = aws_efs_file_system.legacy.id

  posix_user {
    gid = 10001
    uid = 10001
  }

  root_directory {
    path = "/mullen"
    creation_info {
      owner_gid   = 10001
      owner_uid   = 10001
      permissions = "0750"
    }
  }

  tags = { Name = "${local.prefix}-app" }
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.prefix}-db"
  subnet_ids = values(aws_subnet.database)[*].id
}

resource "aws_db_instance" "main" {
  identifier = local.prefix

  engine                        = "postgres"
  instance_class                = var.database_instance_class
  db_name                       = var.database_name
  username                      = "mullen_admin"
  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.data.key_id

  allocated_storage     = var.database_allocated_storage
  max_allocated_storage = var.database_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.data.arn

  multi_az               = true
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  port                   = 5432

  backup_retention_period    = var.database_backup_retention_days
  backup_window              = "05:00-06:00"
  maintenance_window         = "sun:06:30-sun:07:30"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true
  deletion_protection        = var.enable_deletion_protection
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.prefix}-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.data.arn
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.prefix}-rds-monitoring"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_sqs_queue" "pipeline_dlq" {
  name                      = "${local.prefix}-pipeline-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = aws_kms_key.data.arn
}

resource "aws_sqs_queue" "pipeline" {
  name                       = "${local.prefix}-pipeline"
  visibility_timeout_seconds = 900
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 20
  kms_master_key_id          = aws_kms_key.data.arn
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.pipeline_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_ecr_repository" "backend" {
  name                 = "${local.prefix}-backend"
  image_tag_mutability = "IMMUTABLE"
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.data.arn
  }
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain the latest 30 release images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}

resource "random_password" "secret_key" {
  length  = 64
  special = false
}

resource "random_password" "app_db_password" {
  length           = 48
  special          = true
  override_special = "!#$%&*+-=?"
}

resource "aws_secretsmanager_secret" "runtime" {
  name                    = "${local.prefix}/runtime"
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "runtime" {
  secret_id = aws_secretsmanager_secret.runtime.id
  secret_string = jsonencode({
    SECRET_KEY      = random_password.secret_key.result
    APP_DB_PASSWORD = random_password.app_db_password.result
  })
}
