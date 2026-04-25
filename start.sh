#!/bin/bash
# MongoDB setup and server startup

echo "========================================="
echo "Elderly Health Monitoring System"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Check if MongoDB is running
echo ""
echo "Checking MongoDB connection..."

# Try to connect to MongoDB (requires mongosh or mongo CLI)
timeout 3 bash -c 'echo "show dbs" | mongosh localhost:27017/elderly-health-monitoring' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MongoDB is running"
else
    echo "⚠️ MongoDB doesn't appear to be running"
    echo "Make sure MongoDB is started with: mongod"
    echo "Or start it with: brew services start mongodb-community (macOS)"
    echo ""
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Start the server
echo ""
echo "========================================="
echo "Starting server..."
echo "========================================="
echo ""
npm start
