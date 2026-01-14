# Icon Generation

This project includes an automated icon generation script that creates all required PWA, favicon, and Apple Touch icons from a single source SVG file.

## Source File

Edit the source icon at: `app/assets/icon.svg`

## Generating Icons

To regenerate all icons after editing the SVG:

```bash
npm run generate-icons
```

This will create the following files in `app/assets/`:
- `favicon.ico` (32x32)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180 for iOS)
- `icon-192.png` (192x192 for PWA)
- `icon-512.png` (512x512 for PWA)

## Requirements

The script uses macOS built-in tools:
- `qlmanage` (Quick Look) for SVG to PNG conversion
- `sips` (Scriptable Image Processing System) for resizing

These tools are pre-installed on macOS. For other platforms, you'll need to modify the script to use ImageMagick, sharp, or similar tools.

## How It Works

1. Converts `icon.svg` to a high-resolution PNG (2048x2048)
2. Resizes to all required dimensions
3. Creates favicon.ico from the 32x32 PNG
4. Cleans up temporary files

All generated icons are automatically referenced in `app/index.html` and `app/assets/manifest.json`.
