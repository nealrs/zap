# Code Refactoring: Shared Bubble & Hazard Utilities

## Overview
Refactored bubble spawning logic into a shared utility module (`bubble-utils.js`) to eliminate code duplication between the main game and level builder. Hazard logic already shared via `hazards.js`.

## Changes Made

### 1. Created `app/js/bubble-utils.js`
New shared module containing:
- **`spawnBubbleInScene(lvl, targetScene, targetArray, normalMap)`** - Creates regular bubbles with proper physics and materials
- **`spawnSpecialBubbleInScene(lvl, targetScene, targetArray, bubbleTypes, normalMap)`** - Creates special bubbles with glowing rings and effects

Key features:
- Accepts scene and array parameters (no globals)
- Works with both game.js and builder.js contexts
- Optional normal map texture support
- Consistent spawn radius and physics

### 2. Updated `app/js/game.js`
- Replaced `spawnBubble()` implementation with call to `spawnBubbleInScene()`
- Replaced `spawnSpecialBubble()` implementation with call to `spawnSpecialBubbleInScene()`
- Reduced from ~90 lines to ~10 lines of bubble spawning code

### 3. Updated `app/js/builder.js`
- Updated `spawnRegularBubble()` to use `spawnBubbleInScene()`
- Updated `spawnSpecialBubble()` to use `spawnSpecialBubbleInScene()`
- Reduced bubble spawning code by ~100 lines

### 4. Existing Shared Modules (Already in use)
- **`app/js/hazards.js`** - Hazard creation and physics (createHazard, applyHazardForce, updateHazardVisuals, getPulsarRotationEffect)
- **`app/js/specialbubbles.js`** - Special bubble type definitions and configuration loader

### 5. Updated HTML Files
- Added `<script src="/js/bubble-utils.js"></script>` to both `index.html` and `builder.html`
- Loaded after Three.js/OrbitControls and before game.js/builder.js

## Shared Module Architecture

### Bubble Utilities (`bubble-utils.js`)
- ✅ **Parameterized**: Functions accept scene/array arguments
- ✅ **No global state**: Works in any context
- ✅ **Single responsibility**: Only handles bubble creation
- ✅ **Reusable**: Used by both game and builder

### Hazard Module (`hazards.js`)
- ✅ **Already shared**: Both game and builder use same functions
- ✅ **createHazard()**: Creates all hazard types (wormhole, repulsor, pulsar, asteroidbelt, comet)
- ✅ **applyHazardForce()**: Physics interactions with bubbles
- ✅ **updateHazardVisuals()**: Animation and visual updates
- ✅ **getPulsarRotationEffect()**: Camera rotation modulation

### Special Bubbles Config (`specialbubbles.js`)
- ✅ **Already shared**: Loads `/data/specialbubbles.json`
- ✅ **loadSpecialBubblesConfig()**: Fetches type definitions
- ✅ **Global variables**: `specialBubbleTypes`, `specialBubbleSpawnConfig`

## Benefits

### Code Quality
- **DRY Principle**: Eliminated duplicate bubble spawning logic
- **Single Source of Truth**: Bubble creation maintained in one place
- **Consistency**: Game and builder use identical bubble creation
- **Maintainability**: Bug fixes only need to be made once
- **Modularity**: Clean separation of concerns

### Functionality
- **Identical Behavior**: Builder preview matches game exactly
- **Shared Physics**: Same velocity, position, userData initialization
- **Visual Consistency**: Special bubbles render identically
- **Hazard Parity**: Both use same hazard creation/physics from hazards.js

## Testing Recommendations

1. **Main Game** (`/`)
   - Verify bubbles spawn correctly with normal maps
   - Test special bubbles appear with glowing rings
   - Confirm hazards work (wormhole, repulsor, pulsar, asteroidbelt, comet)
   - Check bubble physics/movement unchanged

2. **Level Builder** (`/dev/builder`)
   - Rebuild a level and verify bubbles spawn
   - Test special bubble spawning and lifetime
   - Pop special bubbles and verify effects work
   - Test hazard creation and bubble interactions
   - Confirm restart/rebuild functionality

## Architecture Notes

### Function Signatures
Functions accept explicit parameters (scene, arrays, textures) rather than relying on global scope, making them truly reusable across different contexts.

### Normal Maps
- Game passes `bubbleNormalMap` texture
- Builder passes `null` (no normal map loaded)
- Both work correctly with optional parameter

### No Wrappers
Instead of creating new wrapper functions, we:
1. Extracted original implementations to shared module
2. Have both game.js and builder.js call shared functions directly
3. Game functions now just delegate to shared utilities

## Files Modified

- `app/js/bubble-utils.js` (NEW - 153 lines)
- `app/js/game.js` (reduced by ~80 lines)
- `app/js/builder.js` (reduced by ~100 lines)
- `app/index.html` (added bubble-utils.js script)
- `app/builder.html` (added bubble-utils.js script)

**Total Lines Saved**: ~180 lines of duplicate code eliminated

## Existing Shared Modules

- ✅ `hazards.js` - Already shared between game and builder
- ✅ `specialbubbles.js` - Already shared configuration loader
- ✅ `bubble-utils.js` - NEW shared bubble spawning utilities
