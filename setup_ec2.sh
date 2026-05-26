#!/bin/bash
# Dedicated Setup Script for NexusAI t3.medium EC2 Node
set -e

echo "=============================================="
echo "      SETTING UP NEXUSAI PRODUCTION NODE      "
echo "=============================================="

# Allocate 2GB Virtual Swap File on host SSD if it doesn't exist
if [ ! -f /swapfile ]; then
    echo "Allocating 2GB Swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "Swap file already exists."
fi

# 1. Update OS Package lists
echo "Updating OS Package lists..."
sudo apt-get update -y

# 2. Install prerequisite packages
echo "Installing prerequisites..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    build-essential

# 3. Add Docker's official GPG key
echo "Adding Docker's official GPG key..."
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

# Set up the stable repository
echo "Setting up stable repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose Plugin
echo "Installing Docker Engine and Compose..."
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ensure docker daemon starts automatically on boot
echo "Enabling and starting Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

# Add ubuntu user to docker group to avoid sudo requirements
echo "Adding ubuntu user to docker group..."
sudo usermod -aG docker ubuntu || true

echo "=============================================="
echo "     NEXUSAI NODE INFRASTRUCTURE READY        "
echo "=============================================="
