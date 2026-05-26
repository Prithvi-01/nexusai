terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Dedicated VPC Network
resource "aws_vpc" "nexus_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = "production"
  }
}

# 2. Internet Gateway
resource "aws_internet_gateway" "nexus_igw" {
  vpc_id = aws_vpc.nexus_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# 3. Public Subnet
resource "aws_subnet" "nexus_subnet" {
  vpc_id                  = aws_vpc.nexus_vpc.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# 4. Route Table Routing Rules
resource "aws_route_table" "nexus_rt" {
  vpc_id = aws_vpc.nexus_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.nexus_igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "nexus_rta" {
  subnet_id      = aws_subnet.nexus_subnet.id
  route_table_id = aws_route_table.nexus_rt.id
}

# 5. Network Security Group (Firewall)
resource "aws_security_group" "nexus_sg" {
  name        = "${var.project_name}-security-group"
  description = "Allows SSH, HTTP and custom local ports for NexusAI"
  vpc_id      = aws_vpc.nexus_vpc.id

  # SSH Administration Ingress
  ingress {
    description = "SSH administrative entry"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict to operator IP in actual production env
  }

  # HTTP Web Reverse Proxy Ingress (Port 80 maps Nginx to next.js/FastAPI)
  ingress {
    description = "HTTP entry for frontend and API reverse proxy routing"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Direct FastAPI Backend Access (Optional testing)
  ingress {
    description = "Direct FastAPI Backend developer port"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress (All outgoing connections allowed so container pulls transformers weights)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-security-group"
  }
}

# 6. Dynamic Ubuntu 22.04 LTS SSM Parameter Lookup
data "aws_ssm_parameter" "ubuntu_ami" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

# 7. EC2 Host Instance
resource "aws_instance" "nexus_server" {
  ami                    = data.aws_ssm_parameter.ubuntu_ami.value
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.nexus_subnet.id
  vpc_security_group_ids = [aws_security_group.nexus_sg.id]

  # Inject automated bootstrap script
  user_data = file("${path.module}/templates/user_data.sh")

  # Ensure root storage volume is large enough to download containers and sqlite logs
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name        = "${var.project_name}-production-server"
    Application = "NexusAI Orchestrator"
  }
}
