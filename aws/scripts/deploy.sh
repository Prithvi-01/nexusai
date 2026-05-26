#!/bin/bash
# Direct push-to-EC2 utility script

if [ "$#" -ne 2 ]; then
    echo "Usage: ./deploy.sh <PATH_TO_PEM_KEY> <EC2_PUBLIC_IP>"
    exit 1
fi

KEY_PATH=$1
EC2_IP=$2
REMOTE_USER="ubuntu"
DEST_DIR="/home/ubuntu/nexusai"

echo "=========================================================="
echo "    Pushing local codebase to AWS EC2: $EC2_IP"
echo "=========================================================="

# Create target directory on EC2
ssh -i "$KEY_PATH" "$REMOTE_USER@$EC2_IP" "mkdir -p $DEST_DIR"

# Push directories using scp (recursive) or rsync if available
echo "Uploading backend services..."
scp -i "$KEY_PATH" -r ../../backend "$REMOTE_USER@$EC2_IP:$DEST_DIR/"

echo "Uploading Next.js frontend console..."
scp -i "$KEY_PATH" -r ../../frontend "$REMOTE_USER@$EC2_IP:$DEST_DIR/"

echo "Uploading Docker compose environments..."
scp -i "$KEY_PATH" -r ../../docker "$REMOTE_USER@$EC2_IP:$DEST_DIR/"

# Restart production containers on EC2
echo "Configuring and restarting container profiles on host..."
ssh -i "$KEY_PATH" "$REMOTE_USER@$EC2_IP" "cd $DEST_DIR/docker && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build"

echo "=========================================================="
echo "    Sync finished! NexusAI is now serving at: http://$EC2_IP"
echo "=========================================================="
