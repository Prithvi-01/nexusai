variable "aws_region" {
  type        = string
  description = "Target AWS Region for deployment"
  default     = "us-east-2"
}

variable "instance_type" {
  type        = string
  description = "AWS EC2 Instance type. Upgraded to t3.medium for rapid builds and model runs."
  default     = "t3.medium"
}

variable "key_name" {
  type        = string
  description = "Name of the SSH Key Pair in AWS Console to enable EC2 shell login"
  default     = "nexusai-deploy-key"
}

variable "project_name" {
  type        = string
  description = "Project tagging identifier"
  default     = "nexusai"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR range for the private deployment VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  type        = string
  description = "CIDR range for the public subnet hosting the EC2 instance"
  default     = "10.0.1.0/24"
}
