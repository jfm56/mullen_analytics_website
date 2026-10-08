output "ecr_repository_url" {
  description = "Push the backend image here before enabling ECS services."
  value       = aws_ecr_repository.backend.repository_url
}

output "load_balancer_dns_name" {
  description = "Create the API DNS record only after synthetic validation passes."
  value       = aws_lb.api.dns_name
}

output "database_endpoint" {
  description = "Non-secret private RDS endpoint."
  value       = aws_db_instance.main.endpoint
}

output "phi_bucket_name" {
  value = aws_s3_bucket.phi.id
}

output "pipeline_queue_url" {
  value = aws_sqs_queue.pipeline.url
}

output "pipeline_dlq_url" {
  value = aws_sqs_queue.pipeline_dlq.url
}

output "runtime_secret_arn" {
  value     = aws_secretsmanager_secret.runtime.arn
  sensitive = true
}

output "alarm_topic_arn" {
  value = aws_sns_topic.alarms.arn
}

output "services_enabled" {
  value = var.deploy_services
}

output "services_started" {
  value = var.start_services
}

output "migration_task_definition_arn" {
  value = var.deploy_services ? aws_ecs_task_definition.migration[0].arn : null
}

output "private_app_subnet_ids" {
  value = values(aws_subnet.app)[*].id
}

output "api_security_group_id" {
  value = aws_security_group.api.id
}
