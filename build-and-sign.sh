#!/bin/bash


# Make executable with: chmod +x build-and-sign.sh
# Run with: ./build-and-sign.sh

set -e  # Exit immediately on error

echo "🧹 Cleaning previous build..."
rm -rf out

echo "📦 Packaging app..."
npm run package

echo "🛠️ Creating distributable with Electron Forge..."
npm run make

echo "🔏 Codesigning and notarizing the app..."
./codesign-song-slicer.sh

echo "📀 Building, signing, and notarizing DMG..."
./rebuild-dmg.sh

if [ -f ./generate-latest-mac-yml.sh ]; then
  echo "📄 Generating latest-mac.yml..."
  ./generate-latest-mac-yml.sh
fi

echo "📂 Opening output folder..."
open out

echo "✅ All steps completed successfully!"
