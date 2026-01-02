#!/bin/bash

# Generate PWA icons from icon.svg
# This script uses macOS built-in tools (qlmanage and sips)

set -e

ASSETS_DIR="app/assets"
SOURCE_SVG="$ASSETS_DIR/icon.svg"
TEMP_PNG="$ASSETS_DIR/icon.svg.png"

# Check if source SVG exists
if [ ! -f "$SOURCE_SVG" ]; then
    echo "Error: $SOURCE_SVG not found"
    exit 1
fi

echo "Generating icons from $SOURCE_SVG..."

# Step 1: Convert SVG to high-res PNG using macOS Quick Look
echo "Converting SVG to PNG..."
qlmanage -t -s 2048 -o "$ASSETS_DIR" "$SOURCE_SVG" > /dev/null 2>&1

# Step 2: Generate all required sizes
echo "Generating favicon sizes..."
sips -z 16 16 "$TEMP_PNG" --out "$ASSETS_DIR/favicon-16x16.png" > /dev/null 2>&1
sips -z 32 32 "$TEMP_PNG" --out "$ASSETS_DIR/favicon-32x32.png" > /dev/null 2>&1

echo "Generating Apple Touch Icon..."
sips -z 180 180 "$TEMP_PNG" --out "$ASSETS_DIR/apple-touch-icon.png" > /dev/null 2>&1

echo "Generating PWA icons..."
sips -z 192 192 "$TEMP_PNG" --out "$ASSETS_DIR/icon-192.png" > /dev/null 2>&1
sips -z 512 512 "$TEMP_PNG" --out "$ASSETS_DIR/icon-512.png" > /dev/null 2>&1

# Step 3: Create favicon.ico from 32x32 PNG
echo "Creating favicon.ico..."
cp "$ASSETS_DIR/favicon-32x32.png" "$ASSETS_DIR/favicon.ico"

# Step 4: Clean up temporary file
rm "$TEMP_PNG"

echo "✓ All icons generated successfully!"
echo ""
echo "Generated files:"
echo "  - favicon.ico (32x32)"
echo "  - favicon-16x16.png"
echo "  - favicon-32x32.png"
echo "  - apple-touch-icon.png (180x180)"
echo "  - icon-192.png (PWA)"
echo "  - icon-512.png (PWA)"
