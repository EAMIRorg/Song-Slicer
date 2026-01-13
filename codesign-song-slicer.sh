#!/bin/bash
 
# Make this executable by running: chmod +x codesign-song-slicer.sh
# Run it with: ./codesign-song-slicer.sh

set -e

# Read version from package.json (assumes version is on line 4 or defined as "version": "x.y.z")
VERSION=$(jq -r '.version' package.json)
# If jq is not installed, fallback to grep (less robust):
# VERSION=$(grep -m1 '"version":' package.json | cut -d '"' -f 4)

# Apple Developer ID signing and notarization script for Song-Slicer
APP_NAME="Song-Slicer"
ARCH="$(uname -m)"
APP_BUNDLE="out/${APP_NAME}-darwin-${ARCH}/${APP_NAME}.app"

NOTARIZE_ZIP="out/${APP_NAME}-${VERSION}-NOTARIZE.zip"
FINAL_ZIP="out/${APP_NAME}-${VERSION}-mac-${ARCH}.zip"

TEAM_ID="HSAYDGFEVC"
IDENTITY="Developer ID Application: Clear Blue Media LLC (${TEAM_ID})"
ENTITLEMENTS_PATH="./entitlements.plist"

if [ -f ./signing.env ]; then
  # shellcheck disable=SC1091
  source ./signing.env
fi

: "${NOTARY_PROFILE:=eamir-notary}"

echo "🧼 Cleaning previous zip files..."
rm -f "$NOTARIZE_ZIP" "$FINAL_ZIP"

echo "🔏 Signing nested binaries and frameworks individually with entitlements..."

# Sign Electron Framework dylibs
for LIB in "$APP_BUNDLE/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/"*.dylib; do
  echo "Signing $LIB"
  codesign --force --timestamp --options runtime \
    --entitlements "$ENTITLEMENTS_PATH" \
    --sign "$IDENTITY" "$LIB"
done

# Sign Squirrel ShipIt helper
SHIPIT="$APP_BUNDLE/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt"
echo "Signing $SHIPIT"
codesign --force --timestamp --options runtime \
  --entitlements "$ENTITLEMENTS_PATH" \
  --sign "$IDENTITY" "$SHIPIT"

# Sign Helper apps
HELPERS=(
  "$APP_BUNDLE/Contents/Frameworks/${APP_NAME} Helper.app"
  "$APP_BUNDLE/Contents/Frameworks/${APP_NAME} Helper (Plugin).app"
  "$APP_BUNDLE/Contents/Frameworks/${APP_NAME} Helper (GPU).app"
  "$APP_BUNDLE/Contents/Frameworks/${APP_NAME} Helper (Renderer).app"
)
for HELPER in "${HELPERS[@]}"; do
  echo "Signing $HELPER"
  codesign --force --timestamp --options runtime \
    --entitlements "$ENTITLEMENTS_PATH" \
    --sign "$IDENTITY" "$HELPER"
done

# Sign other frameworks
OTHER_FRAMEWORKS=(
  "$APP_BUNDLE/Contents/Frameworks/ReactiveObjC.framework/Versions/A/ReactiveObjC"
  "$APP_BUNDLE/Contents/Frameworks/Mantle.framework/Versions/A/Mantle"
)
for FRAMEWORK in "${OTHER_FRAMEWORKS[@]}"; do
  if [ -e "$FRAMEWORK" ]; then
    echo "Signing $FRAMEWORK"
    codesign --force --timestamp --options runtime \
      --entitlements "$ENTITLEMENTS_PATH" \
      --sign "$IDENTITY" "$FRAMEWORK"
  fi
done

echo "🔏 Signing main app bundle deeply with entitlements..."
codesign --deep --force --timestamp --options runtime \
  --entitlements "$ENTITLEMENTS_PATH" \
  --sign "$IDENTITY" "$APP_BUNDLE"

echo "🔍 Verifying codesign..."
codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"

echo "📦 Creating zip for notarization..."
ditto -c -k --keepParent "$APP_BUNDLE" "$NOTARIZE_ZIP"

echo "☁️ Submitting to Apple for notarization..."
xcrun notarytool submit "$NOTARIZE_ZIP" \
  --keychain-profile "$NOTARY_PROFILE" \
  --wait

echo "📎 Stapling ticket to .app..."
xcrun stapler staple "$APP_BUNDLE"

echo "📦 Creating stapled zip for distribution..."
ditto -c -k --keepParent "$APP_BUNDLE" "$FINAL_ZIP"

echo "🧹 Cleaning up notarization zip..."
rm -f "$NOTARIZE_ZIP"


echo "✅ Done!"
echo "Notarized app bundle: $APP_BUNDLE"
echo "Final stapled zip for distribution: $FINAL_ZIP"


echo "✅ Done!"
echo "Notarized app bundle: $APP_BUNDLE"
echo "Final stapled zip for distribution: $FINAL_ZIP"

# To check the logs, uncomment and customize this command:
# xcrun notarytool log <REQUEST_ID> \
#   --apple-id "$APPLE_ID" \
#   --password "$APP_SPECIFIC_PASSWORD" \
#   --team-id "$TEAM_ID" \
#   --output notarization-log.json
