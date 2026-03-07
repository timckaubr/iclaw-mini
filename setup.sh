#!/bin/bash

# iClaw Mini Setup Script 🍙
echo "Starting setup for iClaw Mini..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null
then
    echo "Homebrew not found. Please install Homebrew first: https://brew.sh/"
    exit
fi

# Install Cloudflared
echo "Installing cloudflared via Homebrew..."
brew install cloudflare/cloudflare/cloudflared

# Check if cloudflared installation was successful
if command -v cloudflared &> /dev/null
then
    echo "✅ cloudflared installed successfully!"
    cloudflared --version
else
    echo "❌ cloudflared installation failed."
fi

# Install Node dependencies
echo "Ensuring node dependencies are installed..."
npm install

echo "Setup complete! Please restart your iClaw Mini server."
