#!/bin/bash

echo "🚀 Deploying Node.js app on Google Cloud VM..."

# Navigate to the app directory
cd cracked_alerts

# Pull the latest code
git pull origin main

# Install dependencies
npm install

# ✅ Fetch and run the startup script from metadata
STARTUP_SCRIPT=$(curl -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/startup-script")

if [[ -n "$STARTUP_SCRIPT" ]]; then
    echo "🔄 Running startup script..."
    echo "$STARTUP_SCRIPT" | sudo bash
else
    echo "⚠️ No startup script found in metadata!"
fi

# ✅ Load the latest environment variables into the current shell
echo "🔄 Sourcing updated environment variables..."
source /etc/environment

npm run migrate

# ✅ Restart PM2 process to apply new environment variables
echo "🔄 Restarting Node.js app with updated environment variables..."

# ✅ Restart or start PM2 process for node-app
echo "🔄 Checking if 'node-app' is already running with PM2..."
if pm2 list | grep -q "node-app"; then
    echo "🔄 Restarting existing 'node-app' with updated environment variables..."
    pm2 restart node-app --update-env
else
    echo "🚀 'node-app' not found, starting a new process..."
    pm2 start npm --name "node-app" -- start
fi
pm2 save

# Restart Ops Agent to ensure logging
sudo systemctl restart google-cloud-ops-agent

echo "✅ Deployment completed successfully!"
