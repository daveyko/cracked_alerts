#!/bin/bash

set -euo pipefail

echo "🚀 Deploying Node.js app on Google Cloud VM..."

### -------------------------------------------------------
### 1. Install Node.js using `n` with pinned version
### -------------------------------------------------------
NODE_VERSION="20.11.1"

if ! command -v node &> /dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  echo "📦 Installing Node.js v$NODE_VERSION with n..."

  if ! command -v n &> /dev/null; then
    sudo apt update
    sudo apt install -y nodejs npm
    sudo npm install -g n
    sudo apt purge -y nodejs npm
  fi

  sudo n $NODE_VERSION
fi

### -------------------------------------------------------
### 2. Install PM2 globally (if not already installed)
### -------------------------------------------------------
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

### --------------------------------------------------------------------
### 3. Fetch environment variables from GCP metadata and write to /etc/environment
### --------------------------------------------------------------------
echo "🔧 Fetching environment variables from metadata..."

sudo tee /etc/environment > /dev/null <<EOF
TELEGRAM_BOT_TOKEN=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/TELEGRAM_BOT_TOKEN)
PORT=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PORT)
TELEGRAM_CHAT_ID_LOW_THRESHOLD=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/TELEGRAM_CHAT_ID_LOW_THRESHOLD)
SOLANA_RPC_URL=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/SOLANA_RPC_URL)
PG_USER=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PG_USER)
PG_HOST=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PG_HOST)
PG_DATABASE=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PG_DATABASE)
PG_PASSWORD=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PG_PASSWORD)
PG_PORT=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/PG_PORT)
TELEGRAM_CHAT_ID_VIP=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/TELEGRAM_CHAT_ID_VIP)
TELEGRAM_CHAT_ID_HIGH_THRESHOLD=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/TELEGRAM_CHAT_ID_HIGH_THRESHOLD)
DATABASE_URL=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/attributes/DATABASE_URL)
EOF

# Export into current shell
echo "🔄 Exporting variables to current shell..."
set -a
source /etc/environment
set +a

### ----------------------------------------------------------
### 4. Configure Google Cloud Ops Agent for PM2 log ingestion
### ----------------------------------------------------------
echo "🛠 Configuring Ops Agent to collect PM2 logs..."

sudo tee /etc/google-cloud-ops-agent/config.yaml > /dev/null <<EOF
logging:
  receivers:
    node_app_logs:
      type: files
      include_paths:
        - /home/github-actions/.pm2/logs/node-app-out.log
        - /home/github-actions/.pm2/logs/node-app-error.log
      record_log_file_path: true

  service:
    pipelines:
      default_pipeline:
        receivers: [node_app_logs]
EOF

sudo systemctl restart google-cloud-ops-agent

# Install dependencies
npm install
# Sync db
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

echo "✅ Deployment completed successfully!"
