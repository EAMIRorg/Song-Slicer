#!/bin/bash

# Make this executable with: chmod +x generate-latest-mac-yml.sh

set -e

if command -v jq >/dev/null 2>&1; then
  VERSION=$(jq -r '.version' package.json)
else
  VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/')
fi

if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from package.json"
  exit 1
fi

ARCH="$(uname -m)"
FILE="out/Song-Slicer-${VERSION}-mac-${ARCH}.zip"
OUTDIR="out"
OUTFILE="${OUTDIR}/latest-mac.yml"

if [ ! -f "$FILE" ]; then
  echo "Error: File $FILE does not exist."
  exit 1
fi

SHA512=$(openssl dgst -sha512 -binary "$FILE" | openssl base64 -A)
FILESIZE=$(stat -f%z "$FILE")
RELEASEDATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$OUTFILE" <<EOF
version: ${VERSION}
files:
  - url: Song-Slicer-${VERSION}-mac-${ARCH}.zip
    sha512: ${SHA512}
    size: ${FILESIZE}
path: Song-Slicer-${VERSION}-mac-${ARCH}.zip
sha512: ${SHA512}
releaseDate: ${RELEASEDATE}
EOF

echo "latest-mac.yml generated successfully at $OUTFILE."
