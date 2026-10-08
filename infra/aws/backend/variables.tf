variable "name" {
  description = "Short workload name used in AWS resource names."
  type        = string
  default     = "mullen-analytics"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "owner" {
  description = "Business or team responsible for the workload."
  type        = string
  default     = "Mullen Analytics and AI Consulting LLC"
}

variable "aws_region" {
  description = "AWS region covered by the workload review."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR for the isolated workload VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "availability_zone_count" {
  description = "Two or more AZs are required for production."
  type        = number
  default     = 2

  validation {
    condition     = var.availability_zone_count >= 2
    error_message = "At least two availability zones are required."
  }
}

variable "allowed_ingress_cidrs" {
  description = "Networks allowed to reach the public HTTPS load balancer."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "certificate_arn" {
  description = "ACM certificate ARN for the backend hostname. Required when services are enabled."
  type        = string
  default     = ""
}

variable "container_image" {
  description = "Immutable ECR image URI including digest or release tag."
  type        = string
  default     = ""
}

variable "deploy_services" {
  description = "Enable only after the application image is pushed and certificate is issued."
  type        = bool
  default     = false
}

variable "start_services" {
  description = "Scale API/worker above zero only after migrations and synthetic checks pass."
  type        = bool
  default     = false
}

variable "app_url" {
  description = "Canonical browser origin allowed by the API."
  type        = string
  default     = "https://mullenanalytics.com"
}

variable "api_url" {
  description = "Canonical API URL after DNS cutover."
  type        = string
  default     = "https://api.mullenanalytics.com"
}

variable "auth_mode" {
  description = "Authentication mode used by the AWS backend."
  type        = string
  default     = "cognito"

  validation {
    condition     = contains(["session", "cognito"], var.auth_mode)
    error_message = "auth_mode must be session or cognito."
  }
}

variable "cognito_user_pool_id" {
  description = "Existing Cognito user pool ID when auth_mode is cognito."
  type        = string
  default     = ""
}

variable "cognito_client_id" {
  description = "Existing Cognito application client ID when auth_mode is cognito."
  type        = string
  default     = ""
}

variable "database_name" {
  type    = string
  default = "mullen_analytics"
}

variable "database_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "database_allocated_storage" {
  description = "Initial gp3 storage in GiB."
  type        = number
  default     = 50
}

variable "database_max_allocated_storage" {
  description = "Autoscaling storage ceiling in GiB."
  type        = number
  default     = 500
}

variable "database_backup_retention_days" {
  type    = number
  default = 35
}

variable "api_cpu" {
  type    = number
  default = 1024
}

variable "api_memory" {
  type    = number
  default = 2048
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "worker_cpu" {
  type    = number
  default = 2048
}

variable "worker_memory" {
  type    = number
  default = 4096
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "log_retention_days" {
  type    = number
  default = 365
}

variable "alarm_email" {
  description = "Operational mailbox subscribed to production alarms. Leave blank only during staging bootstrap."
  type        = string
  default     = ""
}

variable "extra_secret_arns" {
  description = "Map of ECS environment variable name to Secrets Manager valueFrom ARN."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "enable_phi_ingestion" {
  description = "Production kill switch. Keep false until the release gate is approved."
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  description = "Protect the production database and load balancer from accidental deletion."
  type        = bool
  default     = true
}
