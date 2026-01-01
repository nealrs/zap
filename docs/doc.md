# Bubble Zap 3D - Developer Guide

A fast-paced physics-based bubble popping game built with Three.js. Pop bubbles before the timer runs out while navigating hazardous obstacles like wormholes and repulsors.

## Project Structure

```
zap/
├── app/                    # Application files
│   ├── js/                # JavaScript files
│   │   ├── game.js        # Game logic and Three.js implementation
│   │   ├── specialbubbles.js  # Special bubble config loader
│   │   ├── hazards.js     # Hazard physics module
│   │   └── sw.js          # Service Worker for offline functionality
│   ├── data/              # JSON configuration files
│   │   ├── levels.json    # Level configurations (edit this to modify levels)
│   │   ├── specialbubbles.json  # Special bubble types and spawn configurations
│   │   ├── hazards.json   # Hazard type definitions and physics parameters
│   │   └── config.json    # Global game configuration
│   └── assets/            # Static assets
│       └── manifest.json  # PWA manifest for installation
├── index.html             # Entry point HTML file (structure & styling only)
├── docs/                  # Documentation
├── server.js             # Express server for development
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── package.json          # Node.js dependencies
```

## Quick Start

1. **Local Development**: Open `index.html` in a modern browser
2. **PWA Installation**: Deploy to HTTPS-enabled hosting and use "Install App" prompt
3. **Offline Play**: Once installed, the game works completely offline

## Editing Levels

To add or modify levels, edit `app/data/levels.json`. Each level is a JSON object with the following schema:

```json
{
  "name": "Level Name",
  "desc": "Instructions shown to player",
  "target": 20,         // Pops required to win
  "time": 40,           // Seconds on clock
  "count": 25,          // Number of bubbles spawned at once
  "size": 0.9,          // Bubble radius in world units
  "gravity": 0.0002,    // Speed at which bubbles drift to center (lower = weaker pull)
  "color": "0xff0000",  // Hex color as string (e.g., "0xff0000" for red)
  "hazards": [          // Array of physics objects
    {
      "type": "wormhole",  // 'wormhole' (attract) or 'repulsor' (push)
      "pos": [0, 0, 0],    // 3D coordinates [x, y, z]
      "r": 5,              // Sphere of influence radius
      "s": 0.03            // Strength of the pull/push force
    }
  ]
}
```

### Level Configuration Guide

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `name` | string | - | Display name shown in level intro |
| `desc` | string | - | Instructions displayed to player |
| `target` | number | 1+ | Bubbles to pop to complete level |
| `time` | number | 5+ | Countdown timer in seconds |
| `count` | number | 1+ | Initial bubble spawn count |
| `size` | number | 0.1-2 | Bubble sphere radius (larger = easier to click) |
| `gravity` | number | 0.00001-0.001 | Pull toward center (0.0001 is very weak) |
| `color` | string | hex | Color as hex string (e.g., "0xff0000") |

### Hazard Types

**Wormhole** - Attracts and teleports bubbles
- Stronger `s` value = faster pull
- When bubbles get very close, they teleport to opposite side
- Visual: Purple glowing torus knot
- Color: 0x6600ff (purple)

**Repulsor** - Pushes bubbles away
- Stronger `s` value = stronger push
- Keeps bubbles away from center
- Visual: Orange wireframe icosahedron
- Color: 0xffaa00 (orange)

**Bumper** - Bounces bubbles with enhanced force
- Stronger `s` value = stronger bounce
- Reflects bubbles back with increased velocity
- Visual: Yellow glowing dodecahedron
- Color: 0xffff00 (yellow)

**Comet** - Moves randomly and attracts bubbles in a trail
- Movement speed controlled by `moveSpeed` parameter
- Attracts up to 20 bubbles in its wake
- Visual: Cyan glowing sphere with tail
- Color: 0x00ffff (cyan)

## Hazard Configuration (app/data/hazards.json)

The `app/data/hazards.json` file defines how each hazard type behaves. You can customize:

### Hazard Type Properties

```json
{
  "wormhole": {
    "description": "What this hazard does",
    "geometry": "torusknot",
    "color": 6619647,
    "emissive": 2162758,
    "physics": {
      "attractive": true,
      "teleportDistance": 0.7,
      "exitVelocityMultiplier": 0.3
    }
  }
}
```

| Property | Description | Range |
|----------|-------------|-------|
| `geometry` | 3D model shape | torusknot, icosahedron, dodecahedron, etc. |
| `color` | RGB color value | 0-16777215 (decimal) |
| `emissive` | Glow color (optional) | 0-16777215 (decimal) |
| `wireframe` | Show wireframe | true/false |
| `attractive` | Pulls or pushes | true/false |
| `teleportDistance` | Distance to trigger teleport | 0-10 |
| `bounceForceMultiplier` | Bounce strength | 1.0-3.0 |

### Default Physics Parameters

```json
{
  "hazardDefaults": {
    "wormhole": {
      "r": 5,
      "s": 0.03,
      "rotationSpeed": 0.02
    }
  }
}
```

| Parameter | Description | Range |
|-----------|-------------|-------|
| `r` | Sphere of influence radius | 1-15 |
| `s` | Strength of force (pull/push) | 0.001-0.1 |
| `rotationSpeed` | Visual rotation speed | 0.001-0.1 |

**Example: Make wormholes stronger**
```json
"wormhole": {
  "r": 7,
  "s": 0.05,
  "rotationSpeed": 0.03
}
```

## Special Bubbles Configuration (app/data/specialbubbles.json)

The `app/data/specialbubbles.json` file defines power-up and bonus bubble types. Available special bubbles:

### Built-in Special Bubble Types

**Time Bonus** (⏱)
- Adds extra seconds to the clock
- Color: 0xff00ff (magenta)
- Default: +5 seconds

**Points Bonus** (⭐)
- Awards extra pops toward target
- Color: 0xffff00 (yellow)
- Default: +3 pops

**Multipop** (💥)
- Explodes nearby bubbles automatically
- Color: 0x00ffff (cyan)
- Default: Pops up to 5 nearby bubbles

**Slow Motion** (🐢)
- Slows down physics temporarily
- Color: 0x00ff00 (green)
- Default: 50% speed for 8 seconds

**Shield** (🛡)
- Protects a bubble from hazards
- Color: 0x87ceeb (sky blue)
- Default: 1 bubble, 15 seconds

**Magnetize** (🧲)
- Bubbles drift toward your cursor
- Color: 0xff6600 (orange)
- Default: 6 seconds

### Special Bubble Type Definition

```json
{
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
}
```

### Special Bubble Properties

| Property | Description | Type |
|----------|-------------|------|
| `description` | What the bubble does | string |
| `rarity` | Spawn chance 0.0-1.0 | number |
| `spawnRate` | Relative spawn frequency | number |
| `color` | Hex color string | string |
| `icon` | Emoji or symbol | string |
| `effect.type` | Type identifier | string |
| `effect.amount` | Numeric effect value | number |
| `visual.glowColor` | Glow RGB value | number |
| `visual.glowIntensity` | Brightness 0.0-1.0 | number |
| `visual.pulseSpeed` | Animation speed | number |
| `visual.scale` | Size multiplier | number |

### Enabling Special Bubbles in a Level

In `app/data/levels.json`, add the `specialBubbles` section:

```json
{
  "name": "My Level",
  "target": 20,
  "time": 40,
  "hazards": [],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus", "multipop"],
    "spawnChancePerSecond": 0.15,
    "maxConcurrent": 3
  }
}
```

| Property | Description | Type |
|----------|-------------|------|
| `enabled` | Enable special bubbles | boolean |
| `types` | Which types to spawn | array of strings |
| `spawnChancePerSecond` | Spawn rate (0.0-1.0) | number |
| `maxConcurrent` | Max active at once | number |

**Example configurations:**

Easy mode (more help):
```json
"specialBubbles": {
  "enabled": true,
  "types": ["timebonus", "pointsbonus"],
  "spawnChancePerSecond": 0.20
}
```

Challenge mode (tricky):
```json
"specialBubbles": {
  "enabled": true,
  "types": ["slowmo", "shield"],
  "spawnChancePerSecond": 0.08
}
```

### Creating Custom Special Bubble Types

To add a new special bubble, add it to `app/data/specialbubbles.json`:

```json
"freezeray": {
  "description": "Freezes bubbles in place temporarily",
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

Then enable it in a level:
```json
"specialBubbles": {
  "enabled": true,
  "types": ["freezeray"]
}
```

## Game Code Architecture

### Main Functions

**`initScene()`**
- Initializes Three.js scene, camera, and renderer
- Sets up lighting and starfield background
- Loads app/data/levels.json and starts the game

**`loadLevels()`**
- Fetches and parses app/data/levels.json
- Converts hex color strings to numbers for Three.js
- Triggers first level intro

**`startLevel(idx)`**
- Clears previous level's objects
- Spawns bubbles and hazards
- Starts the countdown timer
- Shows game UI (HUD)

**`spawnBubble(lvl)`**
- Creates a single bubble mesh with physics
- Assigns random position and velocity
- Adds to scene and bubbles array

**`tick()`**
- Called every 1 second
- Decrements time counter
- Ends game if time reaches 0

**`handleInteraction(x, y)`**
- Raycasts from camera to detect clicked/tapped bubble
- Removes bubble from scene
- Increments score and spawns replacement bubble
- Triggers win condition when target is reached

**`animate()`**
- Main animation loop (60fps)
- Updates bubble physics (gravity + hazard forces)
- Renders scene
- Called continuously via requestAnimationFrame

### Game State Variables

```javascript
let currentIdx = 0;      // Current level index
let score = 0;           // Bubbles popped in current level
let timeLeft = 0;        // Seconds remaining
let isRunning = false;   // Whether level is active
let bubbles = [];        // Array of bubble meshes
let hazards = [];        // Array of hazard meshes
let specialBubbles = []; // Array of special bubble meshes
```

## Physics System

### Bubble Physics
- **Gravity**: Bubbles drift toward center (0,0,0) based on level's `gravity` value
- **Velocity**: Each bubble has userData.vel tracking its velocity vector
- **Boundary**: Bubbles bounce off a 25-unit radius sphere

### Hazard Effects
- **Wormhole**: Applies attractive force toward hazard center, teleports when close
- **Repulsor**: Applies repulsive force away from hazard center
- **Bumper**: Reflects bubbles with enhanced outbound velocity

### Special Bubble Effects
- **Time Bonus**: Instant timer increment
- **Points Bonus**: Instant score increment
- **Multipop**: Chain reaction bubble popping
- **Slow Motion**: Temporary physics speed reduction
- **Shield**: Hazard immunity for target bubble
- **Magnetize**: Temporary attraction toward cursor

## Styling

The game uses pure CSS with modern features:
- **Glassmorphism**: Frosted glass effect on UI panels
- **Gradients**: Linear and radial gradients for visual appeal
- **Responsive**: Uses `clamp()` for text scaling across screen sizes
- **Mobile-First**: Touch-friendly button sizes and styling

### CSS Classes

| Class | Purpose |
|-------|---------|
| `#ui-layer` | HUD container, always visible |
| `.hud-top` | Score/time/level display |
| `#overlay` | Menu/result screen (can be hidden) |
| `.panel` | Glassmorphic container for text |

## PWA Features

### Installation
The app can be installed on iOS, Android, and desktop browsers as a native-like app.

### Offline Support
The Service Worker (`sw.js`) caches:
- All HTML/JS/JSON files
- Three.js library from CDN (as much as possible)
- Uses "Cache First, Network Fallback" strategy

### Manifest
`manifest.json` defines:
- App name and icon
- Display mode (standalone = fullscreen)
- Theme colors
- Start URL

## Deployment

### Option 1: GitHub Pages (Free)
1. Push repo to GitHub
2. Enable Pages in repo settings
3. Deploy branch: `main`
4. Site will be at `https://yourusername.github.io/zap`

### Option 2: Vercel (Free)
1. Connect GitHub repo to Vercel
2. Deploy automatically on git push
3. HTTPS enabled by default

### Option 3: Netlify (Free)
1. Connect GitHub repo to Netlify
2. Build command: (none, static site)
3. Deploy directory: `/`

## Browser Compatibility

- **Three.js**: Requires WebGL support (most modern browsers)
- **Service Worker**: Required for offline (not available in private browsing)
- **Touch Events**: Mobile support built-in
- **Manifest**: iOS 13.4+, Android 4.4+

## Troubleshooting

### Service Worker not caching
- Check browser DevTools → Application → Service Workers
- Ensure site is served over HTTPS (required for SW registration)
- Clear cache and reinstall

### Levels not loading
- Verify app/data/levels.json exists in the correct directory
- Check browser console for fetch errors
- Ensure JSON syntax is valid (no trailing commas)

### Performance issues
- Lower `count` to reduce bubble count
- Reduce hazard sphere radius (`r` value)
- Lower renderer pixel ratio in initScene()

## Adding Custom Levels

Example: Adding a "Boss Level"

1. Open `app/data/levels.json`
2. Add new object to the array:

```json
{
  "name": "The Final Challenge",
  "desc": "Face the ultimate test: multiple hazards in close quarters!",
  "target": 50,
  "time": 60,
  "count": 30,
  "size": 0.7,
  "gravity": 0.0004,
  "color": "0xffff00",
  "hazards": [
    { "type": "wormhole", "pos": [8, 0, 0], "r": 4, "s": 0.02 },
    { "type": "wormhole", "pos": [-8, 0, 0], "r": 4, "s": 0.02 },
    { "type": "repulsor", "pos": [0, 0, 0], "r": 6, "s": 0.04 }
  ]
}
```

3. Save app/data/levels.json
4. Reload game - new level appears at the end

## Development Workflow

### To modify game logic:
- Edit `app/js/game.js` or `app/js/hazards.js`
- Reload browser (or use hot reload with Docker dev mode)

### To modify levels:
- Edit `app/data/levels.json`
- Reload browser

### To modify UI/styling:
- Edit `index.html` styles section
- Reload browser

### To test PWA offline:
1. Open DevTools → Application
2. Service Workers tab → Check "Offline"
3. Reload page - should still work

## Performance Notes

- Three.js r128 used for stable performance
- Antialias enabled for smoother visuals
- Pixel ratio capped at 2x for mobile devices
- Orbit controls auto-rotate for visual appeal
- Raycasting optimized to only check bubble meshes

## Future Enhancement Ideas

- Sound effects and music
- Particle effects for bubble pops
- Power-up items (slow time, magnetize, etc.)
- Leaderboard/high scores (localStorage)
- Level editor UI
- Multiplayer support
- Different game modes (endless, time attack, etc.)

---

**Original Project**: [nealrs/bubblezap](https://github.com/nealrs/bubblezap)  
**Built With**: Three.js r128, Modern Web APIs, Progressive Web App standards
