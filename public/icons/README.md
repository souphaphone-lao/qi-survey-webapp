# PWA Icons

This directory contains icons for the Progressive Web App (PWA).

## ✅ Generated Icons

The required PNG icons have been generated from `icon.svg`:
- ✅ `icon-192.png` - 192x192 pixels (3.6 KB)
- ✅ `icon-512.png` - 512x512 pixels (13.4 KB)

These icons are now ready for PWA installation!

---

## Regenerating Icons

If you modify `icon.svg`, regenerate the PNG icons using:

### Method 1: NPM Script (Easiest)

```bash
npm run generate-icons
```

This uses the `sharp` library (already installed) to convert SVG to PNG.

### Method 2: ImageMagick (Alternative)

```bash
# Install ImageMagick if not already installed
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# Generate icons
cd public/icons
magick icon.svg -resize 192x192 icon-192.png
magick icon.svg -resize 512x512 icon-512.png
```

### Method 3: Online Tools

1. Go to https://svgtopng.com/
2. Upload `icon.svg`
3. Set width/height to 192 and download as `icon-192.png`
4. Set width/height to 512 and download as `icon-512.png`

---

## Icon Specifications

- **Format:** PNG (required for PWA)
- **Sizes:** 192×192 and 512×512 (PWA standard)
- **Purpose:** `any maskable` (works on all platforms)
- **Background:** Transparent or solid color
- **Usage:** Home screen icon, splash screen, PWA installation

---

## Files

- `icon.svg` - Source template (editable)
- `icon-192.png` - Small icon for home screen ✅
- `icon-512.png` - Large icon for splash screen ✅
- `README.md` - This file
- `.gitkeep` - Keep directory in git
