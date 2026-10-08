check "service_inputs" {
  assert {
    condition = !var.deploy_services || (
      var.container_image != "" &&
      var.certificate_arn != "" &&
      (var.auth_mode != "cognito" || (var.cognito_user_pool_id != "" && var.cognito_client_id != ""))
    )
    error_message = "deploy_services requires an immutable container image, ACM certificate, and Cognito IDs when cognito auth is selected."
  }
}

check "service_start_order" {
  assert {
    condition     = !var.start_services || var.deploy_services
    error_message = "start_services cannot be true until deploy_services creates the task definitions."
  }
}

resource "aws_ecs_cluster" "main" {
  name = local.prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.prefix}-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = concat(
      [
        aws_secretsmanager_secret.runtime.arn,
        aws_db_instance.main.master_user_secret[0].secret_arn,
      ],
      values(var.extra_secret_arns),
    )
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = [aws_kms_key.data.arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

resource "aws_iam_role" "api" {
  name = "${local.prefix}-api-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role" "worker" {
  name               = "${local.prefix}-worker-task"
  assume_role_policy = aws_iam_role.api.assume_role_policy
}

data "aws_iam_policy_document" "application_common" {
  statement {
    sid       = "BucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.phi.arn]
  }

  statement {
    sid = "AgencyObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
    ]
    resources = ["${aws_s3_bucket.phi.arn}/agencies/*"]
  }

  statement {
    sid = "EncryptedDataKey"
    actions = [
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.data.arn]
  }

  statement {
    sid = "LegacyFileSystem"
    actions = [
      "elasticfilesystem:ClientMount",
      "elasticfilesystem:ClientWrite",
    ]
    resources = [aws_efs_file_system.legacy.arn]
    condition {
      test     = "StringEquals"
      variable = "elasticfilesystem:AccessPointArn"
      values   = [aws_efs_access_point.app.arn]
    }
  }
}

resource "aws_iam_role_policy" "api_common" {
  name   = "application-data"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.application_common.json
}

resource "aws_iam_role_policy" "worker_common" {
  name   = "application-data"
  role   = aws_iam_role.worker.id
  policy = data.aws_iam_policy_document.application_common.json
}

resource "aws_iam_role_policy" "api_queue" {
  name = "enqueue-pipeline"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
      Resource = aws_sqs_queue.pipeline.arn
    }]
  })
}

resource "aws_iam_role_policy" "worker_queue" {
  name = "consume-pipeline"
  role = aws_iam_role.worker.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:ChangeMessageVisibility",
        "sqs:GetQueueAttributes",
      ]
      Resource = aws_sqs_queue.pipeline.arn
    }]
  })
}

resource "aws_lb" "api" {
  name                       = substr("${local.prefix}-api", 0, 32)
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = values(aws_subnet.public)[*].id
  enable_deletion_protection = var.enable_deletion_protection
  drop_invalid_header_fields = true
  enable_http2               = true
}

resource "aws_lb_target_group" "api" {
  name        = substr("${local.prefix}-api", 0, 32)
  port        = 8000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  deregistration_delay = 60

  health_check {
    enabled             = true
    path                = "/ready"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  count = var.certificate_arn == "" ? 0 : 1

  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_wafv2_web_acl" "api" {
  name  = "${local.prefix}-api"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Clinical CSV/XML uploads are intentionally larger than the managed
        # rule's generic 8 KiB body threshold. Count this one rule instead of
        # blocking every legitimate upload; application size/type validation
        # and the remaining managed rules still apply.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common-rules"
      sampled_requests_enabled   = false
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "known-bad-inputs"
      sampled_requests_enabled   = false
    }
  }

  rule {
    name     = "RateLimit"
    priority = 30
    action {
      block {}
    }
    statement {
      rate_based_statement {
        aggregate_key_type = "IP"
        limit              = 2000
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.prefix}-api"
    sampled_requests_enabled   = false
  }
}

resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

locals {
  common_environment = [
    { name = "ENVIRONMENT", value = var.environment },
    { name = "APP_URL", value = var.app_url },
    { name = "API_URL", value = var.api_url },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_S3_BUCKET", value = aws_s3_bucket.phi.id },
    { name = "AWS_KMS_KEY_ID", value = aws_kms_key.data.arn },
    { name = "STORAGE_PROVIDER", value = "s3" },
    { name = "STORAGE_BACKEND", value = "s3" },
    { name = "JOB_BACKEND", value = "sqs" },
    { name = "PIPELINE_QUEUE_URL", value = aws_sqs_queue.pipeline.url },
    { name = "JOB_VISIBILITY_TIMEOUT_SECONDS", value = tostring(aws_sqs_queue.pipeline.visibility_timeout_seconds) },
    { name = "DATA_STORAGE_ROOT", value = "/mnt/mullen/clientdata" },
    { name = "DATA_UPLOADS_ROOT", value = "/mnt/mullen/uploads" },
    { name = "DATABASE_HOST", value = aws_db_instance.main.address },
    { name = "DATABASE_PORT", value = tostring(aws_db_instance.main.port) },
    { name = "DATABASE_NAME", value = var.database_name },
    { name = "DATABASE_USER", value = "app_user" },
    { name = "DATABASE_ADMIN_USER", value = aws_db_instance.main.username },
    { name = "DATABASE_SSLMODE", value = "require" },
    { name = "AUTH_MODE", value = var.auth_mode },
    { name = "COGNITO_REGION", value = var.aws_region },
    { name = "COGNITO_USER_POOL_ID", value = var.cognito_user_pool_id },
    { name = "COGNITO_CLIENT_ID", value = var.cognito_client_id },
    { name = "SESSION_COOKIE_SECURE", value = "true" },
    { name = "EMSCS_QA_V1_ENABLED", value = "false" },
    { name = "ANALYTICS_ENABLED", value = "false" },
    { name = "LEADS_ENABLED", value = "false" },
    { name = "SCHEDULER_ENABLED", value = "false" },
    { name = "PHI_INGESTION_ENABLED", value = tostring(var.enable_phi_ingestion) },
  ]

  common_secrets = concat([
    { name = "SECRET_KEY", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:SECRET_KEY::" },
    { name = "APP_DB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:APP_DB_PASSWORD::" },
    { name = "DATABASE_PASSWORD", valueFrom = "${aws_secretsmanager_secret.runtime.arn}:APP_DB_PASSWORD::" },
    { name = "DATABASE_ADMIN_PASSWORD", valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::" },
  ], [for name, arn in var.extra_secret_arns : { name = name, valueFrom = arn }])
}

resource "aws_ecs_task_definition" "api" {
  count = var.deploy_services ? 1 : 0

  family                   = "${local.prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.api.arn

  volume {
    name = "legacy-storage"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.legacy.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.app.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name                   = "api"
    image                  = var.container_image
    essential              = true
    environment            = local.common_environment
    secrets                = local.common_secrets
    portMappings           = [{ containerPort = 8000, hostPort = 8000, protocol = "tcp" }]
    mountPoints            = [{ sourceVolume = "legacy-storage", containerPath = "/mnt/mullen", readOnly = false }]
    readonlyRootFilesystem = true
    linuxParameters        = { initProcessEnabled = true }
    healthCheck = {
      command     = ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "worker" {
  count = var.deploy_services ? 1 : 0

  family                   = "${local.prefix}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.worker_cpu
  memory                   = var.worker_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.worker.arn

  volume {
    name = "legacy-storage"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.legacy.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.app.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name                   = "worker"
    image                  = var.container_image
    essential              = true
    command                = ["python", "-m", "worker"]
    environment            = local.common_environment
    secrets                = local.common_secrets
    mountPoints            = [{ sourceVolume = "legacy-storage", containerPath = "/mnt/mullen", readOnly = false }]
    readonlyRootFilesystem = true
    linuxParameters        = { initProcessEnabled = true }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.worker.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "worker"
      }
    }
  }])
}

# Run explicitly after the image is pushed and before either service is scaled
# up. It is intentionally not attached to a service or deployment hook.
resource "aws_ecs_task_definition" "migration" {
  count = var.deploy_services ? 1 : 0

  family                   = "${local.prefix}-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.api.arn

  container_definitions = jsonencode([{
    name                   = "migration"
    image                  = var.container_image
    essential              = true
    command                = ["python", "scripts/run_migrations.py"]
    environment            = local.common_environment
    secrets                = local.common_secrets
    readonlyRootFilesystem = true
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "migration"
      }
    }
  }])
}

resource "aws_ecs_service" "api" {
  count = var.deploy_services ? 1 : 0

  name                               = "api"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api[0].arn
  desired_count                      = var.start_services ? var.api_desired_count : 0
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  enable_execute_command             = false

  network_configuration {
    subnets          = values(aws_subnet.app)[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.https,
    aws_efs_mount_target.legacy,
  ]
}

resource "aws_ecs_service" "worker" {
  count = var.deploy_services ? 1 : 0

  name                   = "worker"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.worker[0].arn
  desired_count          = var.start_services ? var.worker_desired_count : 0
  launch_type            = "FARGATE"
  platform_version       = "LATEST"
  enable_execute_command = false

  network_configuration {
    subnets          = values(aws_subnet.app)[*].id
    security_groups  = [aws_security_group.worker.id]
    assign_public_ip = false
  }

  depends_on = [aws_efs_mount_target.legacy]
}

resource "aws_appautoscaling_target" "api" {
  count = var.deploy_services && var.start_services ? 1 : 0

  max_capacity       = 8
  min_capacity       = max(2, var.api_desired_count)
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api[0].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  count = var.deploy_services && var.start_services ? 1 : 0

  name               = "${local.prefix}-api-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 60
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
