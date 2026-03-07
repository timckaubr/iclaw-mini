#!/bin/bash

# Navigate to project directory
cd /Users/tim/iclaw/workspace/projects/latex_pages

echo "Checking dependencies..."
# Use python3 -m pip in case pip is not in PATH
python3 -m pip install -r requirements.txt

echo "Starting Flask app on port 5001..."
# Run the app in the background
python3 app.py &

# Wait a moment for server to start
sleep 2

echo "Opening browser at http://127.0.0.1:5001..."
open http://127.0.0.1:5001

# Keep the script running to see logs, or wait for process
wait
