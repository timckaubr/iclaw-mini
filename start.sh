#!/bin/bash
# iClaw Mini - Start Script v2.2
cd "$(dirname "$0")"

PORT=3010

echo "🧹 Cleaning up port $PORT..."
# Kill only the process on iClaw Mini's specific port
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true

echo "🚀 Starting iClaw Mini v1.9.1..."
# Run in background to prevent blocking the terminal, but log to console
node --no-deprecation server.js &

# Wait a moment for server to start
sleep 2
echo "✅ Server started on http://localhost:$PORT"
