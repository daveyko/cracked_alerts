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

# ✅ Restart PM2 process to apply new environment variables
echo "🔄 Restarting Node.js app with updated environment variables..."

# Restart PM2 process
pm2 restart node-app --update-env

# Restart Ops Agent to ensure logging
sudo systemctl restart google-cloud-ops-agent

echo "✅ Deployment completed successfully!"
