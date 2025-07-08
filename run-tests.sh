#!/bin/bash

echo "🧪 Running HushPixel Unit Tests..."
echo "=================================="

# Change to web app directory
cd apps/web

echo "📍 Current directory: $(pwd)"
echo "📦 Checking if node_modules exists..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
else
    echo "❌ node_modules not found - running pnpm install..."
    pnpm install
fi

echo "🔍 Checking package.json test scripts..."
echo "Available test commands:"
npm run | grep test

echo ""
echo "🧪 Running unit tests..."
echo "========================"

# Run the tests
npm run test:run

echo ""
echo "✅ Test execution completed!"