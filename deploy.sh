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
    echo "$STARTUP_SCRIPT" | bash
else
    echo "⚠️ No startup script found in metadata!"
fi

# Restart PM2 process
pm2 restart node-app

# Restart Ops Agent to ensure logging
sudo systemctl restart google-cloud-ops-agent

echo "✅ Deployment completed successfully!"
