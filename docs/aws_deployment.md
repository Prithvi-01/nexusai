# AWS EC2 Free Tier Deployment Manual

This guide describes how to provision cloud infrastructure and deploy **NexusAI** onto the **AWS Free Tier** (e.g. `t2.micro` or `t3.micro` EC2 instances) using Infrastructure as Code (Terraform) and Docker Compose.

---

## 1. Prerequisites

Before starting, ensure you have:
1. An active **AWS Account** with access credentials.
2. The **AWS CLI** installed and configured locally (`aws configure`).
3. **Terraform CLI** installed locally.
4. An SSH key pair generated in your target AWS region (default `us-east-1` under the name `nexusai-deploy-key`).

---

## 2. Infrastructure Provisioning via Terraform

We use Terraform to automatically construct the network topology and compute environments.

```bash
# 1. Navigate to the terraform workspace directory
cd aws/terraform

# 2. Initialize provider modules
terraform init

# 3. Compile and review infrastructure plan
terraform plan

# 4. Apply changes and provision resources in AWS
terraform apply -auto-approve
```

Upon completion, Terraform will output:
- `ec2_public_ip`: The public IP of the newly spun EC2 server.
- `application_url`: The URL to hit the dashboard (reverse proxied on Port 80).
- `ssh_command`: The command to connect to the shell.

---

## 3. Monitoring Automated Inception Logs

The EC2 instance boots up and automatically runs the dynamic `user_data.sh` script to install Docker, clone our repository, and launch containers.

You can monitor this installation process in real-time:

```bash
# 1. SSH into the EC2 instance using the key PEM file
ssh -i ~/.ssh/nexusai-deploy-key.pem ubuntu@<EC2_PUBLIC_IP>

# 2. Watch installation progress logs
tail -f /var/log/user-data.log
```

Once the log prints `NEXUSAI NODE DEPLOYMENT COMPLETED`, the platform is fully online and serving at `http://<EC2_PUBLIC_IP>`.

---

## 4. Initializing Ollama Models on EC2

To conserve CPU/RAM on the free-tier EC2 instance, we have configured a lightweight sidecar. You must download a small, fast model (like `phi3` or `gemma:2b`) inside the dockerized Ollama container to run queries:

```bash
# 1. Shell into the active Ollama container on EC2
docker exec -it nexusai_ollama_prod ollama pull phi3

# 2. Verify model loaded successfully
docker exec -it nexusai_ollama_prod ollama list
```

Now, when you visit `http://<EC2_PUBLIC_IP>` on your browser, you can chat with documents and review performance logs!

---

## 5. Security Group Troubleshooting

If the platform is unreachable:
1. Open the **AWS Console** and navigate to **EC2 -> Security Groups**.
2. Locate the group tagged `${project_name}-security-group`.
3. Check the **Inbound Rules**:
   - Ensure port `80` (HTTP) is open to `0.0.0.0/0` (Anywhere).
   - Ensure port `22` (SSH) is open to your developer IP address.
