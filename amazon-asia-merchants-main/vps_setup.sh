#!/bin/bash
# VPS Initial Setup Script for Ubuntu 26.04

# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js, Nginx, MySQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server

# Install PM2 globally
sudo npm install -pm2 -g

# Create web directory
sudo mkdir -p /var/www/ads-merchants-asia
sudo chown -R $USER:$USER /var/www/ads-merchants-asia

echo "======================================="
echo "Setup complete!"
echo "Next Steps:"
echo "1. Clone your repo into /var/www/ads-merchants-asia"
echo "2. Run 'npm install'"
echo "3. Run 'pm2 start server.js --name ads-merchants'"
echo "4. Setup Nginx for ads-merchants-asia.com and admin.ads-merchants-asia.com"
echo "======================================="
