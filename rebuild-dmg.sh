#!/bin/bash

# Install appdmg globally with: sudo npm install -g appdmg
# Make executable with: chmod +x rebuild-dmg.sh
# Run with: ./rebuild-dmg.sh 

set -e

# Get version number from package.json
VERSION=$(grep '"version"' package.json | head -1 | cut -d '"' -f 4)

APP_NAME="Song-Slicer"
ARCH="$(uname -m)"
APP_PATH="out/${APP_NAME}-darwin-${ARCH}/${APP_NAME}.app"
OUTPUT_DIR="out/make"
DMG_NAME="${APP_NAME}-${VERSION}-${ARCH}.dmg"
CONFIG="appdmg-config.json"  # appdmg-style layout file
TMP_CONFIG=""

# Notarization credentials
TEAM_ID="HSAYDGFEVC"

if [ -f ./signing.env ]; then
  # shellcheck disable=SC1091
  source ./signing.env
fi

: "${NOTARY_PROFILE:=eamir-notary}"

# Verify app and config exist
if [ ! -d "$APP_PATH" ]; then
  echo "❌ App not found at: $APP_PATH"
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "❌ DMG layout config not found: $CONFIG"
  exit 1
fi

echo "🧼 Removing any previous DMGs..."
for file in "$OUTPUT_DIR"/Song-Slicer-*.dmg; do
  [ -e "$file" ] && rm -f "$file"
done

echo "🧼 Removing 'zip' subfolder if it exists..."
if [ -d "$OUTPUT_DIR/zip" ]; then
  rm -rf "$OUTPUT_DIR/zip"
fi

echo "📀 Rebuilding DMG using appdmg..."
if [ -f "$OUTPUT_DIR/$DMG_NAME" ]; then
  rm -f "$OUTPUT_DIR/$DMG_NAME"
fi
TMP_BASE="$(mktemp -t appdmg-config.XXXXXX)"
TMP_CONFIG="${TMP_BASE}.json"
mv "$TMP_BASE" "$TMP_CONFIG"
python3 - <<PY
import json
import os

config_path = "${CONFIG}"
output_path = os.path.abspath("${APP_PATH}")

with open(config_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for key in ("icon", "background"):
    if key in data and isinstance(data[key], str):
        data[key] = os.path.abspath(data[key])

if data.get("contents") and isinstance(data["contents"], list):
    for entry in data["contents"]:
        if entry.get("type") == "file":
            entry["path"] = output_path

with open("${TMP_CONFIG}", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
PY

appdmg "$TMP_CONFIG" "$OUTPUT_DIR/$DMG_NAME"
if [ $? -ne 0 ]; then
  echo "❌ appdmg failed to create the DMG."
  exit 1
fi

echo "🧾 Verifying DMG was created..."
if [ ! -f "$OUTPUT_DIR/$DMG_NAME" ]; then
  echo "❌ DMG not found: $OUTPUT_DIR/$DMG_NAME"
  exit 1
fi

echo "🔏 Signing DMG..."
codesign --timestamp --sign "Developer ID Application: Clear Blue Media LLC (${TEAM_ID})" "$OUTPUT_DIR/$DMG_NAME"

echo "☁️ Submitting to Apple for notarization..."
xcrun notarytool submit "$OUTPUT_DIR/$DMG_NAME" \
  --keychain-profile "$NOTARY_PROFILE" \
  --wait

echo "📎 Stapling ticket to DMG..."
xcrun stapler staple "$OUTPUT_DIR/$DMG_NAME"

echo "✅ DMG rebuilt, signed, notarized, and stapled: $OUTPUT_DIR/$DMG_NAME"

if [ -n "$TMP_CONFIG" ] && [ -f "$TMP_CONFIG" ]; then
  rm -f "$TMP_CONFIG"
fi
