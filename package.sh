#!/bin/bash
# Package script for Tab Orchestra extension

echo "🎼 Packaging Tab Orchestra Extension..."

# Create a dist directory if it doesn't exist
mkdir -p dist

# Create the zip file
zip -r dist/tab-orchestra.zip \
  manifest.json \
  background.js \
  LICENSE \
  README.md \
  assets/ \
  content/ \
  popup/ \
  sidepanel/ \
  server.js \
  package.json \
  start.sh \
  start.bat

echo "✅ Package created at dist/tab-orchestra.zip"
echo "📦 To install the extension:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked' and select the extracted zip folder"
echo "   4. Run the server with './start.sh' or 'start.bat'"

