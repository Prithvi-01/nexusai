output "ec2_public_ip" {
  value       = aws_instance.nexus_server.public_ip
  description = "The public IP address of the deployed EC2 server"
}

output "application_url" {
  value       = "http://${aws_instance.nexus_server.public_ip}"
  description = "The public URL to access the Next.js frontend and APIs (Reverse Proxied via Nginx)"
}

output "ssh_command" {
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_instance.nexus_server.public_ip}"
  description = "The terminal SSH command to login to your cloud EC2 instance"
}

output "deployment_progress_instructions" {
  value       = "Once EC2 boots up, it runs the user_data script. You can track progress by SSHing in and running: 'tail -f /var/log/user-data.log'"
  description = "Instructions to monitor deployment logs"
}
