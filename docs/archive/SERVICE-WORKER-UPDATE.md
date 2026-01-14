# Service Worker Update - v5

## Changes Made

Updated the service worker (`app/js/sw.js`) to include all new shared modules and ensure complete offline functionality.

## Cache Version
- **Updated from**: `bubble-zap-v4`
- **Updated to**: `bubble-zap-v5`

## New Assets Cached

### JavaScript Modules
✅ **Added `./js/bubble-utils.js`** - Shared bubble spawning utilities
✅ **Added `./js/soundtrack.js`** - Procedural music generation (was missing!)

### PWA Icons
✅ **Added `./assets/icon-192.png`** - Required for PWA install prompt
✅ **Added `./assets/icon-512.png`** - Required for PWA install prompt
✅ **Added `./assets/favicon.ico`** - Browser tab icon

## Complete Asset List

The service worker now caches:

### HTML
- `./` (root)
- `./index.html`

### JavaScript
- `./js/game.js` - Main game logic
- `./js/bubble-utils.js` - ✨ NEW - Shared bubble spawning
- `./js/specialbubbles.js` - Special bubble config loader
- `./js/hazards.js` - Hazard creation and physics
- `./js/soundtrack.js` - ✨ NEW - Procedural music

### Data Files
- `./data/levels.json` - All 20 level configurations
- `./data/specialbubbles.json` - Special bubble type definitions
- `./data/hazards.json` - Hazard configurations
- `./data/config.json` - Game configuration

### Assets
- `./assets/manifest.json` - PWA manifest
- `./assets/icon-192.png` - ✨ NEW - PWA icon
- `./assets/icon-512.png` - ✨ NEW - PWA icon
- `./assets/favicon.ico` - ✨ NEW - Browser icon

### External CDN
- `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`
- `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js`

## What About the Builder?

The **level builder is NOT cached** for offline use because:
- It's a development tool (at `/dev/builder`)
- Requires server-side functionality for saving levels
- Not needed for the core game experience
- Keeps the PWA cache smaller and faster

If you want to cache it in the future, you would need to add:
```javascript
'./builder.html',
'./js/builder.js'
```

## Testing Offline Functionality

### How to Test:
1. Load the game online once (installs service worker)
2. Open DevTools → Application → Service Workers
3. Verify `bubble-zap-v5-assets` is active
4. Check "Offline" in Network panel
5. Reload the page
6. Game should work perfectly offline! 🎉

### Expected Behavior:
✅ Game loads instantly from cache
✅ All 20 levels playable
✅ Special bubbles work
✅ All hazards work
✅ Soundtrack plays
✅ PWA installation works
✅ Icons display correctly

## Cache Strategy

The service worker uses a **"Cache First, Network Fallback"** strategy:

1. **Request comes in** → Check cache first
2. **Cache hit** → Serve from cache (fast!)
3. **Cache miss** → Fetch from network
4. **Network success** → Cache response for next time
5. **Network failure** → Return error (or cached offline page)

This provides:
- ⚡ **Fast loading** - No network wait for cached assets
- 🔌 **Offline support** - Works without internet
- 🔄 **Auto-updates** - New versions downloaded in background
- 💾 **Bandwidth saving** - Assets only downloaded once

## Version Bumping

When you make changes to any cached files, bump the cache version:

```javascript
const CACHE_VERSION = 'bubble-zap-v6'; // Increment the number
```

This will:
1. Force creation of new cache
2. Download all assets fresh
3. Delete old cache on activation
4. Ensure users get latest version

## Notes

- Service worker updates happen **on page reload**, not immediately
- Old cache is cleaned up automatically on activation
- CDN resources (Three.js) are also cached for offline use
- Builder files are NOT cached (development tool only)
