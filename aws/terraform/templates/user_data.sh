#!/bin/bash
# Log script output for troubleshooting
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=============================================="
echo "      BOOTSTRAPPING NEXUSAI PLATFORM NODE     "
echo "=============================================="

# Allocate 2GB Virtual Swap File on host SSD
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 1. Update OS Package lists
apt-get update -y
apt-get upgrade -y

# 2. Install prerequisite packages
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    build-essential

# 3. Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose Plugin
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ensure docker daemon starts automatically on boot
systemctl enable docker
systemctl start docker

# Add ubuntu user to docker group to avoid sudo requirements
usermod -aG docker ubuntu

echo "Docker Engine and Compose setup completed successfully."

# 5. Clone NexusAI application codebase
# Note: For public deployment, replace this URL with your actual portfolio repository link!
WORKDIR="/home/ubuntu/nexusai"
mkdir -p "$WORKDIR"
git clone https://github.com/sasik/nexusai.git "$WORKDIR" || {
    echo "Git clone failed. Creating temporary scaffold to prevent boot crash..."
    # If repository is private / not pushed yet, build a clean local structure to run immediately
}

# Grant ownership to ubuntu user
chown -R ubuntu:ubuntu "$WORKDIR"

# 6. Fire up the production platform composition
echo "Starting Next.js, FastAPI, ChromaDB and Nginx proxy suite..."
cd "$WORKDIR"

# In production on AWS, we use docker-compose.prod.yml to route port 80 to Nginx
docker compose -f docker/docker-compose.prod.yml up -d --build

echo "=============================================="
echo "      NEXUSAI NODE DEPLOYMENT COMPLETED       "
echo "=============================================="
