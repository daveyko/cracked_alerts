#!/bin/bash

echo "🚀 Deploying Node.js app on Google Cloud VM..."

# Navigate to the app directory
cd cracked_alerts

# Pull the latest code
git pull origin main

# Install dependencies
npm install

# Run migrations
npx node-pg-migrate up

# Restart PM2 process
pm2 restart node-app

# Restart Ops Agent to ensure logging
sudo systemctl restart google-cloud-ops-agent

echo "✅ Deployment completed successfully!"
