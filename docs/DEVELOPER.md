# Bubble Zap 3D - Complete Developer Guide

**Status**: Production-Ready | **Version**: 1.0 | **Date**: December 31, 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Game Configuration](#game-configuration)
4. [Hazard Types](#hazard-types)
5. [Special Bubbles](#special-bubbles)
6. [Game Architecture](#game-architecture)
7. [Physics System](#physics-system)
8. [Audio & Feedback](#audio--feedback)
9. [PWA Setup](#pwa-setup)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)
12. [Examples & Recipes](#examples--recipes)
13. [Quick Reference](#quick-reference)

---

## Quick Start

### For Players
1. Open `index.html` in a modern browser
2. Click "START LEVEL"
3. Click/tap bubbles to pop them
4. Reach the target before time runs out
5. Progress through levels

### For Designers (5 minutes)
1. Open `app/data/levels.json` in a text editor
2. Find a level and change `target`, `time`, or `count`
3. Save the file
4. Reload the browser (Cmd+R or F5)
5. Play and see your changes instantly!

---

## Project Structure

```
zap/
├── app/                    # Application files
│   ├── js/                # JavaScript files
│   │   ├── game.js        # Main game logic & Three.js (800+ lines)
│   │   ├── specialbubbles.js  # Special bubbles config loader
│   │   ├── hazards.js     # Hazard physics module
│   │   └── sw.js          # Service worker (offline support)
│   ├── data/              # JSON configuration files
│   │   ├── levels.json    # Level definitions (EDIT THIS)
│   │   ├── specialbubbles.json  # Power-up definitions (EXTEND THIS)
│   │   ├── hazards.json   # Hazard definitions (CUSTOMIZE THIS)
│   │   └── config.json    # Global game configuration (TUNE THIS)
│   └── assets/            # Static assets
│       └── manifest.json  # PWA manifest
├── index.html             # Entry point HTML structure & CSS (pure UI)
├── docs/                  # Documentation
├── server.js             # Express server
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── package.json          # Node.js dependencies
```

### File Purposes

**Game Code** (Usually don't modify)
- `index.html` - HTML structure and styling only
- `app/js/game.js` - Game logic, physics, event handling
- `app/js/hazards.js` - Hazard creation and physics
- `app/js/specialbubbles.js` - Special bubble config loader
- `app/js/sw.js` - Service Worker for offline caching
- `app/assets/manifest.json` - PWA installation metadata
- `server.js` - Express server for development

**Configuration** (Edit these freely!)
- `app/data/levels.json` - Define game progression
- `app/data/hazards.json` - Customize obstacle behavior
- `app/data/specialbubbles.json` - Define power-up types
- `app/data/config.json` - Global settings (hit zones, graphics, audio)

---

## Game Configuration

### app/data/levels.json - Game Progression

Each level is a JSON object with this schema:

```json
{
  "name": "Level Name",
  "desc": "Instructions shown to player",
  "target": 20,
  "time": 40,
  "count": 25,
  "size": 0.9,
  "gravity": 0.0002,
  "color": "0xff0000",
  "spawnRadius": 8,
  "cameraZoom": 25,
  "hazards": [
    {
      "type": "wormhole",
      "pos": [x, y, z],
      "r": 5,
      "s": 0.03
    }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus"],
    "spawnChancePerSecond": 0.15
  }
}
```

#### Level Parameters

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `name` | string | - | Display name shown in level intro |
| `desc` | string | - | Instructions displayed to player |
| `target` | number | 1+ | Bubbles to pop to complete level |
| `time` | number | 5+ | Countdown timer in seconds |
| `count` | number | 1+ | Initial bubble spawn count |
| `size` | number | 0.1-2 | Bubble sphere radius (larger = easier to click) |
| `gravity` | number | 0.00001-0.001 | Pull toward center (0.0001 = very weak) |
| `color` | string | hex | Color as hex string (e.g., "0xff0000" for red) |
| `spawnRadius` | number | 5-15 | Radius of spawn area (larger = more spread out) |
| `cameraZoom` | number | 10-40 | Camera distance (higher = wider view, 40 = max zoom out) |
| `hazards` | array | - | Array of obstacle objects |
| `specialBubbles` | object | - | Special bubble configuration |

#### Difficulty Tuning

Make a level **easier**:
- ↑ Increase `time` (more seconds)
- ↓ Decrease `target` (fewer pops needed)
- ↓ Decrease `count` (fewer bubbles)
- ↓ Decrease `gravity` (weaker pull)
- ↑ Increase `cameraZoom` (wider view, easier to see all bubbles)
- ↑ Increase `spawnRadius` (bubbles more spread out)

Make a level **harder**:
- ↓ Decrease `time` (fewer seconds)
- ↑ Increase `target` (more pops needed)
- ↑ Increase `count` (more bubbles)
- ↑ Increase `gravity` (stronger pull)
- ↓ Decrease `cameraZoom` (closer view, harder to track all bubbles)
- ↓ Decrease `spawnRadius` (bubbles clustered together)
- Add `hazards` to the level

---

## Hazard Types

### app/data/hazards.json - Obstacle Physics

Hazards are physics objects that affect bubble behavior. Three types included:

#### Wormhole - Attract & Teleport

```json
"wormhole": {
  "description": "Attracts bubbles and teleports them",
  "geometry": "torusknot",
  "color": 6619647,
  "emissive": 2162758,
  "physics": {
    "attractive": true,
    "teleportDistance": 0.7,
    "exitVelocityMultiplier": 0.3
  }
}
```

**In a level:**
```json
{
  "type": "wormhole",
  "pos": [5, 0, 0],
  "r": 5,
  "s": 0.03
}
```

| Property | Effect | Range |
|----------|--------|-------|
| `pos` | 3D position | any |
| `r` | Radius of effect | 1-15 |
| `s` | Strength of pull | 0.01-0.1 |

**Visual**: Purple glowing torus knot that rotates  
**Behavior**: Pulls bubbles toward center, teleports when very close

#### Repulsor - Push Away

```json
"repulsor": {
  "description": "Pushes bubbles away from center",
  "geometry": "icosahedron",
  "color": 16755200,
  "wireframe": true,
  "physics": {
    "attractive": false,
    "forceMultiplier": 1.8
  }
}
```

**In a level:**
```json
{
  "type": "repulsor",
  "pos": [0, 0, 0],
  "r": 8,
  "s": 0.05
}
```

**Visual**: Orange wireframe icosahedron that rotates  
**Behavior**: Pushes bubbles away, keeps them away from center

#### Bumper - Bounce & Reflect

```json
"bumper": {
  "description": "Bounces bubbles with increased velocity",
  "geometry": "dodecahedron",
  "color": 16776960,
  "emissive": 8355840,
  "physics": {
    "attractive": false,
    "bounceForceMultiplier": 2.2,
    "bounceVelocityMultiplier": 1.5
  }
}
```

**Visual**: Yellow glowing dodecahedron  
**Behavior**: Reflects bubbles with increased bounce velocity

#### Comet - Moving Trail

```json
"comet": {
  "description": "Moves randomly and attracts bubbles in a trail",
  "geometry": "sphere",
  "color": 65535,
  "emissive": 43775,
  "physics": {
    "attractive": true,
    "moveSpeed": 0.15,
    "trailStrength": 0.015,
    "maxTrailingBubbles": 20
  }
}
```

**In a level:**
```json
{
  "type": "comet",
  "pos": [0, 5, 0],
  "r": 12,
  "s": 0.015,
  "moveSpeed": 0.15
}
```

| Property | Effect | Range |
|----------|--------|-------|
| `pos` | Initial position | any |
| `r` | Radius of attraction | 8-15 |
| `s` | Strength of trail pull | 0.01-0.03 |
| `moveSpeed` | Movement speed | 0.1-0.3 |

**Visual**: Cyan glowing sphere with trailing tail  
**Behavior**: Moves randomly through space, attracting up to 20 bubbles in its wake

#### Default Physics Parameters

```json
"hazardDefaults": {
  "wormhole": {
    "r": 5,
    "s": 0.03,
    "rotationSpeed": 0.02
  },
  "repulsor": {
    "r": 8,
    "s": 0.05,
    "rotationSpeed": 0.02
  },
  "bumper": {
    "r": 6,
    "s": 0.06,
    "rotationSpeed": 0.04
  },
  "comet": {
    "r": 12,
    "s": 0.015,
    "rotationSpeed": 0.0,
    "moveSpeed": 0.15
  }
}
```

#### Creating Hazards in Levels

```json
{
  "name": "Multi-Hazard Challenge",
  "hazards": [
    {
      "type": "wormhole",
      "pos": [8, 0, 0],
      "r": 6,
      "s": 0.04
    },
    {
      "type": "repulsor",
      "pos": [-8, 0, 0],
      "r": 7,
      "s": 0.05
    },
    {
      "type": "bumper",
      "pos": [0, 8, 0],
      "r": 5,
      "s": 0.06
    }
  ]
}
```

---

## Special Bubbles

### app/data/specialbubbles.json - Power-Up System

Special bubbles are bonus items that spawn randomly during gameplay. Six types included:

#### Time Bonus ⏱

```json
"timebonus": {
  "description": "Adds extra seconds to the clock",
  "rarity": 0.15,
  "spawnRate": 1,
  "color": "0xff00ff",
  "icon": "⏱",
  "effect": {
    "type": "timebonus",
    "amount": 5,
    "description": "+5 seconds"
  },
  "visual": {
    "glowColor": 16711935,
    "glowIntensity": 0.8,
    "pulseSpeed": 0.05,
    "scale": 1.3
  }
}
```

**Rarity**: 0.15 (15% spawn chance)  
**Effect**: Adds 5 seconds to the timer  
**Best for**: Easier/tutorial levels

#### Points Bonus ⭐

```json
"pointsbonus": {
  "description": "Awards extra points toward the target",
  "rarity": 0.20,
  "spawnRate": 2,
  "color": "0xffff00",
  "icon": "⭐",
  "effect": {
    "type": "pointsbonus",
    "amount": 3,
    "description": "+3 pops"
  },
  "visual": {
    "glowColor": 16776960,
    "glowIntensity": 0.6,
    "pulseSpeed": 0.03,
    "scale": 1.2
  }
}
```

**Rarity**: 0.20  
**Effect**: Awards 3 pops toward target  
**Best for**: All levels

#### Multipop 💥

```json
"multipop": {
  "description": "Pop bubbles near it automatically",
  "rarity": 0.10,
  "spawnRate": 1,
  "color": "0x00ffff",
  "icon": "💥",
  "effect": {
    "type": "multipop",
    "radius": 8,
    "popCount": 5,
    "description": "Explode nearby bubbles"
  },
  "visual": {
    "glowColor": 65535,
    "glowIntensity": 1.0,
    "pulseSpeed": 0.08,
    "scale": 1.4,
    "particleEffect": true
  }
}
```

**Effect**: Pops up to 5 nearby bubbles  
**Best for**: Challenge levels

#### Slow Motion 🐢

```json
"slowmo": {
  "description": "Slows down bubble physics temporarily",
  "rarity": 0.12,
  "spawnRate": 1,
  "color": "0x00ff00",
  "icon": "🐢",
  "effect": {
    "type": "slowmo",
    "durationSeconds": 8,
    "speedMultiplier": 0.5,
    "description": "Slow motion 8s"
  },
  "visual": {
    "glowColor": 65280,
    "glowIntensity": 0.7,
    "pulseSpeed": 0.01,
    "scale": 1.15
  }
}
```

**Effect**: Physics run at 50% speed for 8 seconds  
**Best for**: Challenge levels

#### Shield 🛡

```json
"shield": {
  "description": "Protect one bubble from being affected by hazards",
  "rarity": 0.08,
  "spawnRate": 1,
  "color": "0x87ceeb",
  "icon": "🛡",
  "effect": {
    "type": "shield",
    "bubbleCount": 1,
    "durationSeconds": 15,
    "description": "Bubble immunity"
  },
  "visual": {
    "glowColor": 8849663,
    "glowIntensity": 0.9,
    "pulseSpeed": 0.04,
    "scale": 1.25
  }
}
```

**Effect**: One random bubble becomes immune to hazards for 15 seconds  
**Best for**: Hazard-heavy levels

#### Magnetize 🧲

```json
"magnetize": {
  "description": "Bubbles drift toward your cursor",
  "rarity": 0.10,
  "spawnRate": 1,
  "color": "0xff6600",
  "icon": "🧲",
  "effect": {
    "type": "magnetize",
    "durationSeconds": 6,
    "attractionForce": 0.01,
    "description": "Attract bubbles 6s"
  },
  "visual": {
    "glowColor": 16744448,
    "glowIntensity": 0.75,
    "pulseSpeed": 0.06,
    "scale": 1.2
  }
}
```

**Effect**: All bubbles are attracted to cursor for 6 seconds  
**Best for**: Difficulty reduction

#### Enabling in Levels

```json
{
  "name": "Bonus Level",
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus", "multipop"],
    "spawnChancePerSecond": 0.15,
    "maxConcurrent": 3
  }
}
```

**Easy level** (more help):
```json
"specialBubbles": {
  "enabled": true,
  "types": ["timebonus", "pointsbonus"],
  "spawnChancePerSecond": 0.20
}
```

**Hard level** (rare bonuses):
```json
"specialBubbles": {
  "enabled": true,
  "types": ["slowmo", "shield"],
  "spawnChancePerSecond": 0.05
}
```

**Disable special bubbles:**
```json
"specialBubbles": {
  "enabled": false
}
```

---

## Game Architecture

### Code Flow

```
index.html loads
  ↓
game.js executes
  ↓
initScene() runs
  ├─ Create Three.js scene
  ├─ Initialize renderer
  ├─ Setup lighting & background
  └─ Load levels.json
  ↓
loadLevels() fetches JSON
  ├─ Parse levels.json
  ├─ Parse hex color strings
  └─ Show level intro (showLevelIntro)
  ↓
User clicks START LEVEL
  ↓
startLevel(idx) initializes
  ├─ Clear previous level
  ├─ Spawn bubbles
  ├─ Spawn hazards
  ├─ Start timer
  └─ Set isRunning = true
  ↓
animate() loop (60 FPS)
  ├─ Update bubble physics
  ├─ Apply hazard forces
  ├─ Handle user input
  └─ Render scene
  ↓
Player clicks bubble
  ↓
handleInteraction() processes
  ├─ Raycast to detect bubble
  ├─ Remove bubble from scene
  ├─ Play pop sound
  ├─ Increment score
  └─ Check win condition
  ↓
score >= target?
  ├─ Yes: endGame(true) → show next level
  └─ No: spawn new bubble & continue
```

### Key Functions

| Function | Purpose | Called By |
|----------|---------|-----------|
| `initScene()` | Setup Three.js | window.load |
| `loadLevels()` | Fetch & parse levels.json | initScene |
| `showLevelIntro(idx)` | Show level intro screen | loadLevels, endGame |
| `startLevel(idx)` | Initialize level | User click |
| `spawnBubble(lvl)` | Create bubble mesh | startLevel, handleInteraction |
| `animate()` | Main game loop | requestAnimationFrame |
| `tick()` | Decrement timer | setInterval (1s) |
| `handleInteraction(x,y)` | Process clicks/taps | mousedown, touchstart |
| `playPopSound()` | Play sound effect | handleInteraction |
| `endGame(win)` | Level complete/failed | tick, handleInteraction |

### Global State

```javascript
let levels = [];          // Loaded from levels.json
let currentIdx = 0;       // Current level index
let score = 0;            // Pops in current level
let timeLeft = 0;         // Seconds remaining
let isRunning = false;    // Level active flag
let bubbles = [];         // Bubble mesh objects
let hazards = [];         // Hazard mesh objects
let timer = null;         // Timer interval ID
let scene, camera, renderer, controls;  // Three.js objects
let audioContext = null;  // Web Audio API context
```

---

## Physics System

### Bubble Physics

Each bubble has:
- **Position**: 3D coordinate in scene
- **Velocity**: Direction and speed of movement
- **Gravity**: Constant pull toward center (0,0,0)
- **Boundary**: Bounces at 25-unit radius sphere

**Physics simulation:**
```javascript
// Each frame:
bubble.velocity += center.direction * level.gravity;  // Pull toward center
bubble.position += bubble.velocity;                    // Move bubble
if(distance > 25) bubble.velocity *= -0.7;             // Bounce at boundary
```

### Hazard Forces

**Wormhole** (attractive):
```javascript
if (distance < radius) {
  direction = hazard.position - bubble.position;
  bubble.velocity += direction.normalized * strength;
  if (distance < 0.7) {  // Very close
    bubble.position *= -0.95;  // Teleport to opposite side
    bubble.velocity *= 0.3;     // Exit slowly
  }
}
```

**Repulsor** (repulsive):
```javascript
if (distance < radius) {
  direction = bubble.position - hazard.position;
  bubble.velocity += direction.normalized * strength * 1.8;
}
```

**Bumper** (reflective):
```javascript
if (distance < radius) {
  direction = bubble.position - hazard.position;
  bubble.velocity += direction.normalized * strength * 2.2;
  bubble.velocity *= 1.5;  // Extra bounce
}
```

### Collision Detection

Uses Three.js Raycaster for mouse/touch:
```javascript
raycaster.setFromCamera(mouseCoords, camera);
hits = raycaster.intersectObjects(bubbles, true);
if (hits.length > 0) {
  // Bubble clicked!
}
```

---

## Audio & Feedback

### Pop Sound

Synthesized pop sound using Web Audio API:

```javascript
playPopSound() {
  const ctx = audioContext;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.frequency: 800 → 100 Hz (pitch down)
  gain: 0.3 → 0.01 (fade out)
  duration: 0.1 seconds
}
```

**Triggered**: When bubble is clicked/popped  
**Browser support**: All modern browsers with Web Audio API

### Haptic Feedback

Vibration on mobile:
```javascript
if("vibrate" in navigator) {
  navigator.vibrate(25);  // 25ms vibration
}
```

**Triggered**: When bubble is popped  
**Browser support**: iOS 13+, Android 5+

---

## PWA Setup

### manifest.json - Installation Metadata

```json
{
  "name": "Bubble Zap 3D",
  "short_name": "BubbleZap",
  "description": "Fast-paced physics bubble popping game",
  "start_url": "/index.html",
  "scope": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#0575e6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (sw.js) - Offline Support

Caching strategy: **Cache First, Network Fallback**

```javascript
// Install: Cache static assets
self.addEventListener('install', (e) => {
  caches.open(CACHE_NAME).then(cache => {
    cache.addAll(STATIC_ASSETS);
  });
});

// Fetch: Try cache first, fall back to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => 
      res || fetch(e.request)
    )
  );
});
```

---

## Deployment Guide

### GitHub Pages (Free)

1. Create GitHub repo named `zap` (or anything)
2. Push code to `main` branch
3. Settings → Pages → Source: `main` branch
4. Site appears at `https://yourusername.github.io/zap`
5. Install prompt appears automatically on HTTPS

### Vercel (Free)

1. Connect GitHub repo to Vercel
2. Auto-deploys on git push
3. HTTPS and CDN included by default
4. Install prompt available

### Netlify (Free)

1. Drag-drop folder or connect GitHub
2. Build: none (static site)
3. Publish: `/`
4. Instant deployment with HTTPS

### Local Testing

```bash
# Open in browser
open index.html

# Or use simple HTTP server
python -m SimpleHTTPServer 8000
# Then visit http://localhost:8000
```

---

## Troubleshooting

### Mouse/Touch Not Working

**Symptoms**: Can't click bubbles on desktop

**Fix**: Update to latest game.js (uses raycaster.intersectObjects with recursive flag)

**Debug**:
1. Open DevTools (F12)
2. Console should show no errors
3. Try `navigator.onmousedown = () => console.log('click')`
4. Check that `isRunning === true` during gameplay

### No Sound When Popping

**Symptoms**: No audio feedback

**Debug**:
1. Check browser console for audio errors
2. Ensure Web Audio API is available
3. Try playing another sound on the page first
4. Some browsers need user interaction to enable audio

**Solution**: Included fallback - game works without audio

### Levels Not Loading

**Symptoms**: Loading screen freezes

**Debug**:
1. Open DevTools Network tab
2. Check if levels.json loads (should be 200 OK)
3. Check Console for JSON parse errors
4. Validate JSON at jsonlint.com

**Common issues**:
- Trailing comma in JSON
- Missing file (check filename exactly)
- Invalid hex color (must be "0xRRGGBB" format)

### Game Slow/Laggy

**Optimization**:
- Reduce `count` in levels.json (fewer bubbles)
- Reduce number of `hazards` per level
- Lower special bubble spawn rate
- Disable special bubbles with `"enabled": false`

**For mobile**:
- Use lower pixel ratio in game.js (already capped at 2x)
- Reduce bubble size
- Use fewer hazards

### Special Bubbles Not Appearing

**Check**:
1. `specialBubbles.enabled` is `true` in level
2. `types` array contains valid type names
3. Types exist in specialbubbles.json
4. `spawnChancePerSecond` > 0

**Example**:
```json
"specialBubbles": {
  "enabled": true,
  "types": ["timebonus"],
  "spawnChancePerSecond": 0.15
}
```

---

## Examples & Recipes

### Easy Tutorial Level

```json
{
  "name": "Tutorial",
  "desc": "Learn the basics with no pressure",
  "target": 10,
  "time": 60,
  "count": 10,
  "size": 1.2,
  "gravity": 0.0001,
  "color": "0x00d4ff",
  "hazards": [],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus"],
    "spawnChancePerSecond": 0.25
  }
}
```

### Medium Challenge Level

```json
{
  "name": "Challenge",
  "desc": "Dodge obstacles and pop bubbles!",
  "target": 25,
  "time": 50,
  "count": 20,
  "size": 0.9,
  "gravity": 0.0002,
  "color": "0xff6600",
  "hazards": [
    {
      "type": "wormhole",
      "pos": [5, 5, 0],
      "r": 5,
      "s": 0.03
    }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus"],
    "spawnChancePerSecond": 0.10
  }
}
```

### Hard Boss Level

```json
{
  "name": "Final Boss",
  "desc": "Master all obstacles to win!",
  "target": 50,
  "time": 90,
  "count": 35,
  "size": 0.8,
  "gravity": 0.0004,
  "color": "0xff0000",
  "hazards": [
    {
      "type": "wormhole",
      "pos": [10, 0, 0],
      "r": 6,
      "s": 0.05
    },
    {
      "type": "repulsor",
      "pos": [-10, 0, 0],
      "r": 7,
      "s": 0.06
    },
    {
      "type": "bumper",
      "pos": [0, 10, 0],
      "r": 5,
      "s": 0.07
    }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["slowmo", "shield", "magnetize"],
    "spawnChancePerSecond": 0.08
  }
}
```

### Create Custom Power-Up

Add to specialbubbles.json:

```json
"freezeray": {
  "description": "Freezes bubbles in place",
  "rarity": 0.08,
  "spawnRate": 1,
  "color": "0x0099ff",
  "icon": "❄",
  "effect": {
    "type": "freezeray",
    "durationSeconds": 5,
    "description": "Freeze 5s"
  },
  "visual": {
    "glowColor": 6751743,
    "glowIntensity": 0.85,
    "pulseSpeed": 0.02,
    "scale": 1.2
  }
}
```

Enable in level:
```json
"specialBubbles": {
  "enabled": true,
  "types": ["freezeray"]
}
```

### Customize Hazard Strength

Make wormhole weaker:
```json
"wormhole": {
  "r": 3,         // Smaller area
  "s": 0.01,      // Weaker pull
  "rotationSpeed": 0.01
}
```

Make wormhole stronger:
```json
"wormhole": {
  "r": 8,         // Larger area
  "s": 0.08,      // Stronger pull
  "rotationSpeed": 0.05
}
```

---

## Quick Reference

### Color Codes (Hex Strings)

```json
"color": "0xff0000"    // Red
"color": "0x00ff00"    // Green
"color": "0x0000ff"    // Blue
"color": "0xffff00"    // Yellow
"color": "0xff00ff"    // Magenta
"color": "0x00ffff"    // Cyan
"color": "0xffffff"    // White
"color": "0x000000"    // Black
"color": "0xff6600"    // Orange
"color": "0xaa00ff"    // Purple
```

### Common Parameter Ranges

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| `target` | 10-15 | 20-30 | 40-50+ |
| `time` | 60+ | 40-50 | 30-40 |
| `count` | 10-15 | 20-25 | 30-40+ |
| `gravity` | 0.0001 | 0.0002 | 0.0003-0.0005 |
| `hazard.r` | 3-5 | 5-7 | 8-10+ |
| `hazard.s` | 0.01-0.03 | 0.03-0.05 | 0.05-0.1 |

### Spawn Rate Reference

| Rate | Chance | Frequency |
|------|--------|-----------|
| 0.05 | 5% | 1 every 20 seconds |
| 0.10 | 10% | 1 every 10 seconds |
| 0.15 | 15% | 1 every 6-7 seconds |
| 0.20 | 20% | 1 every 5 seconds |
| 0.25 | 25% | 1 every 4 seconds |

### Rarity Index

| Rarity | How Often | Use Case |
|--------|-----------|----------|
| 0.05 | Very rare (5%) | Special rewards |
| 0.08 | Rare (8%) | Balanced bonus |
| 0.10 | Uncommon (10%) | Regular bonus |
| 0.12 | Regular (12%) | Common bonus |
| 0.15 | Frequent (15%) | Very common |
| 0.20 | Very frequent (20%) | Always present |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F5 or Cmd+R | Reload game |
| F12 or Cmd+I | Open DevTools |
| Right-click | Inspect element |

### Useful Tools

- **JSON Validator**: https://jsonlint.com
- **Hex Color Picker**: Search "hex color picker"
- **Three.js Docs**: https://threejs.org/docs
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## File Checklist

Before deploying:

- [ ] All JSON files are valid (check with jsonlint.com)
- [ ] All hazard types in levels.json exist in hazards.json
- [ ] All special bubble types in levels exist in specialbubbles.json
- [ ] Color hex strings are valid (e.g., "0xff0000")
- [ ] Level `target` values are reasonable
- [ ] No trailing commas in JSON arrays
- [ ] Tested in Chrome, Firefox, and Safari
- [ ] Tested on mobile (iOS and Android)
- [ ] Tested offline (Service Worker working)

---

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 60+ | ✅ Full |
| Firefox | 55+ | ✅ Full |
| Safari | 12+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| IE 11 | Any | ❌ Not supported |

### Feature Support

| Feature | Browser Support |
|---------|-----------------|
| Three.js (WebGL) | Chrome, Firefox, Safari, Edge |
| Service Worker | Chrome, Firefox, Safari, Edge |
| Web Audio API | Chrome, Firefox, Safari, Edge |
| TouchEvents | Mobile browsers (iOS 10+, Android 5+) |
| Vibration API | Chrome, Firefox, Android |

---

## Performance Tips

### Optimize for Low-End Devices

```json
{
  "count": 12,
  "gravity": 0.0001,
  "hazards": [
    { "type": "wormhole", "pos": [0,0,0], "r": 4, "s": 0.02 }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus"],
    "spawnChancePerSecond": 0.08
  }
}
```

### Optimize for High-End Devices

```json
{
  "count": 50,
  "gravity": 0.0005,
  "hazards": [
    { "type": "wormhole", "pos": [10,10,0], "r": 8, "s": 0.08 },
    { "type": "repulsor", "pos": [-10,-10,0], "r": 8, "s": 0.08 },
    { "type": "bumper", "pos": [0,10,0], "r": 6, "s": 0.07 }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus", "multipop", "slowmo"],
    "spawnChancePerSecond": 0.20
  }
}
```

---

## Credits & Resources

**Built with**:
- Three.js r128 (3D graphics)
- Web Audio API (sound)
- Service Workers (offline support)
- Fetch API (async loading)

**Original Project**: https://github.com/nealrs/bubblezap

---

**Last Updated**: December 31, 2025  
**Status**: Production-Ready  
**Version**: 1.0
