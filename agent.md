# Bubble Zap 3D - Development Team Agent Guide

**Project**: Bubble Zap 3D - A fast-paced 3D bubble-popping game  
**Tech Stack**: Three.js r128, Web Audio API, Progressive Web App  
**Developer**: Neal Shyam (@nealrs)  
**Live Site**: https://zap.neal.rs/

---

## Project Overview

Bubble Zap 3D is a physics-based bubble-popping game where players tap/click bubbles in zero-gravity space while navigating hazards and collecting power-ups. The game features 20 progressively challenging levels, multiple hazard types, special bubble power-ups, procedurally-generated soundtracks, and full PWA support with offline play.

### Core Gameplay Loop
1. Player selects a level (unlocked sequentially)
2. Level intro screen shows instructions
3. Gameplay: Pop bubbles by tapping/clicking before time runs out
4. Navigate hazards (wormholes, repulsors, comets, etc.)
5. Collect special bubbles for bonuses (time, points, slow-mo, etc.)
6. Complete level by reaching target pop count
7. Progress to next level or return to level selector

---

## Architecture & Codebase

### Project Structure
```
zap/
├── app/
│   ├── js/
│   │   ├── game.js              # Main game logic (800+ lines)
│   │   ├── hazards.js           # Hazard physics & creation
│   │   ├── specialbubbles.js   # Special bubble config loader
│   │   ├── bubble-utils.js     # Shared bubble spawning utilities
│   │   ├── audio-manager.js    # Audio playback (Web Audio + HTML5)
│   │   ├── soundtrack.js       # Procedural music generation
│   │   ├── version.js          # Auto-generated version
│   │   └── sw.js               # Service Worker (offline support)
│   ├── data/
│   │   ├── levels.json         # Level configurations (EDIT THIS)
│   │   ├── hazards.json        # Hazard type definitions
│   │   ├── specialbubbles.json # Special bubble types
│   │   └── config.json         # Global game settings
│   ├── assets/                 # Icons, manifest, images
│   ├── audio/                  # Pre-rendered WAV files
│   ├── index.html              # Main game page
│   ├── builder.html            # Level builder tool
│   └── dev.html                # Dev level selector
├── docs/                       # Documentation
├── plans/                      # Product specs & development ideas
│   ├── PR0_test_env_setup.md  # Test environment setup plan
│   └── PRs.md                  # Organized PR specifications
├── tools/                      # Build scripts
└── scripts/                    # Automation scripts
```

### Plans Folder

The `/plans` folder contains product specifications and development ideas:

- **`PRs.md`**: Organized PR specifications with tasks, acceptance criteria, and agent assignments
- **`PR0_test_env_setup.md`**: Detailed implementation plan for the test environment setup

These documents serve as the source of truth for development priorities and implementation details.

### Shared Module Architecture

**Key Principle**: Code is shared between main game and level builder to ensure consistency.

1. **`bubble-utils.js`** - Bubble spawning utilities
   - `spawnBubbleInScene()` - Creates regular bubbles
   - `spawnSpecialBubbleInScene()` - Creates special bubbles with glowing rings
   - Used by both `game.js` and `builder.js`

2. **`hazards.js`** - Hazard system
   - `createHazard()` - Creates hazard meshes (wormhole, repulsor, pulsar, asteroidbelt, comet)
   - `applyHazardForce()` - Physics interactions with bubbles
   - `updateHazardVisuals()` - Animation updates
   - `getPulsarRotationEffect()` - Camera rotation modulation

3. **`specialbubbles.js`** - Special bubble configuration
   - Loads `/data/specialbubbles.json`
   - Provides type definitions globally

### Module Loading Order

**Main Game** (`index.html`):
1. Three.js + OrbitControls (CDN)
2. specialbubbles.js
3. hazards.js
4. bubble-utils.js
5. soundtrack.js
6. game.js

**Level Builder** (`builder.html`):
1. Three.js + OrbitControls (CDN)
2. specialbubbles.js
3. hazards.js
4. bubble-utils.js
5. builder.js

---

## Game Configuration

### Level Configuration (`app/data/levels.json`)

Each level is a JSON object:

```json
{
  "name": "Level Name",
  "desc": "Instructions shown to player",
  "target": 20,                    // Pops required to win
  "time": 40,                      // Seconds on clock
  "count": 25,                     // Initial bubble spawn count
  "size": 0.9,                     // Bubble radius (0.1-2)
  "gravity": 0.0002,              // Pull toward center (0.00001-0.001)
  "color": "0xff0000",             // Hex color string
  "spawnRadius": 8,                // Spawn area radius (5-15)
  "cameraZoom": 40,                // Camera distance (10-40, higher = wider view)
  "respawnBubbles": true,          // Auto-respawn when popped
  "hazards": [
    {
      "type": "wormhole",
      "pos": [5, 0, 0],
      "r": 5,                      // Effect radius (1-15)
      "s": 0.03                    // Strength (0.01-0.1)
    }
  ],
  "specialBubbles": {
    "enabled": true,
    "types": ["timebonus", "pointsbonus"],
    "spawnChancePerSecond": 0.15,   // 0.0-1.0
    "maxConcurrent": 3
  }
}
```

**Difficulty Tuning**:
- **Easier**: ↑ time, ↓ target, ↓ count, ↓ gravity, ↑ cameraZoom, ↑ spawnRadius
- **Harder**: ↓ time, ↑ target, ↑ count, ↑ gravity, ↓ cameraZoom, ↓ spawnRadius, add hazards

### Hazard Types (`app/data/hazards.json`)

1. **Wormhole** - Attracts and teleports bubbles
   - Visual: Purple glowing torus knot
   - Physics: Pulls bubbles in, teleports when very close
   - Default: r=5, s=0.03

2. **Repulsor** - Pushes bubbles away
   - Visual: Orange wireframe icosahedron
   - Physics: Inverse square repulsion force
   - Default: r=8, s=0.05

3. **Bumper** - Bounces bubbles with enhanced force
   - Visual: Yellow glowing dodecahedron
   - Physics: Reflects with increased velocity
   - Default: r=6, s=0.06

4. **Comet** - Moving hazard with trailing bubbles
   - Visual: Cyan glowing sphere with particle trail
   - Physics: Moves randomly, attracts up to 20 bubbles in wake
   - Default: r=12, s=0.015, moveSpeed=0.15

5. **Pulsar** - Modulates camera rotation
   - Visual: Pulsing effect
   - Physics: Affects scene rotation axes and camera speed

6. **Asteroid Belt** - Rotating torus that blocks bubbles
   - Visual: Rotating torus geometry
   - Physics: Deflects bubbles on contact

### Special Bubble Types (`app/data/specialbubbles.json`)

1. **timebonus** (⏱) - Adds 5 seconds to timer
   - Color: 0xff00ff (magenta)
   - Rarity: 0.15

2. **pointsbonus** (⭐) - Awards 3 bonus pops
   - Color: 0xffff00 (yellow)
   - Rarity: 0.20

3. **multipop** (💥) - Pops 5 nearest bubbles
   - Color: 0x00ffff (cyan)
   - Rarity: 0.10

4. **slowmo** (🐢) - 50% speed for 8 seconds
   - Color: 0x00ff00 (green)
   - Rarity: 0.12

5. **shield** (🛡) - Protects 1 bubble from hazards for 15s
   - Color: 0x87ceeb (sky blue)
   - Rarity: 0.08

6. **magnetize** (🧲) - Bubbles attracted to cursor for 6s
   - Color: 0xff6600 (orange)
   - Rarity: 0.10

**Note**: Magnetize is considered "bonkers and maddening" per feedback - may need rebalancing.

---

## Level Progression (20 Levels)

### Tutorial Levels (1-3)
- **Level 1**: The Void - Pure bubble popping, no hazards
- **Level 2**: Floating Garden - Introduces comet (moving hazard)
- **Level 3**: Event Horizon - Introduces wormhole (teleporting hazard)

### Medium Levels (4-6)
- **Level 4**: Dual Vortex - Multiple wormholes
- **Level 5**: The Repulsor Core - Introduces repulsor
- **Level 6**: Bouncing Chaos - Introduces bumper

### Challenge Levels (7-10)
- **Level 7**: Wormhole Madness - Time bonuses
- **Level 8**: Repulsor Onslaught - Points bonuses
- **Level 9**: Vortex Eruption - Slow-motion
- **Level 10**: Explosion Protocol - Multipop (final level)

### Advanced Levels (11-15)
- More complex hazard combinations
- Multiple special bubble types
- Increased difficulty

### Expert Levels (16-20)
- Maximum challenge
- Complex hazard interactions
- Strategic special bubble usage required

**Constraints**:
- No level longer than 60s
- No bubble count exceeds 45
- Max 2 hazards per level (if multiple, same type only)
- Max 2 special bubble types per level
- All levels default to cameraZoom: 40 (widest view)

---

## Known Issues & Feedback

### Critical Issues (from feedback.md)
1. **Replay level**: Zoom & orbit don't work when replaying
2. **Offline mode**: Still not working
3. **Level difficulty**: Some levels too easy, some too difficult
4. **Repulsor radius**: Makes levels hard
5. **Comet limit**: No more than 1 comet per level
6. **Level 21**: Surprisingly difficult (repulsor levels only work with special bubbles)
7. **Level 2**: Reduce comet size
8. **Level 3**: Easier than level 2 (needs rebalancing)
9. **Level 4**: Multi-wormhole is very busy on screen
10. **Level 8**: Too easy to be level 8

### UX Issues
1. **Win screen transition**: Feels choppy, needs smoother transition
2. **Music**: Should pause on win screen overlay
3. **Zoom**: Fix zoom at most zoomed out
4. **Level transitions**: Better transition between levels
5. **Pop area**: Larger pop area when bubbles are small (scale inversely with visual diameter)
6. **Bubble popping**: Often feels like trying to pop a bubble but no matter how much tapping, it's unpoppable unless rotating field - may be plane/distance issue
7. **Win screen**: Too much text, too many individual lines, different font sizes
8. **Button spacing**: More vertical space between buttons on win screen overlay
9. **Next level button**: Too easy to click past win screen into next level (shouldn't be in middle of screen)
10. **Special bubble colors**: Need fixed array of bubble colors and fixed set of special bubble colors that don't intersect (Level 9: special and regular bubbles too similar)

### Performance Issues
1. **Memory leak**: Phone & browser get laggy after playing a few levels - need to ensure all elements cleared between levels

### Feature Requests
1. **Special/bonus levels**: Need visual distinction, maybe increase time to 90s, add social bubbles
2. **Slomo**: Should slow all physics (including hazards)
3. **Radiation hazard**: Remove/eat bubbles (requires respawn) - maybe with blast aura every x seconds
4. **Asteroid belt**: Figure out how to create
5. **Megabubble**: Special bubble to increase diameter of all existing bubbles
6. **Better app icon**: Needed
7. **Netflix autoplay style**: Button where progress bar automatically fills over 15s before proceeding unless explicitly taking action

---

## Development Workflow

### Local Development
```bash
npm install
npm start
# Visit http://localhost:3000
```

### Docker Development
```bash
# Development mode (hot reload, local files)
docker-compose build --no-cache zap-dev
docker-compose up zap-dev
# Visit http://localhost:1338

# Production mode (GitHub main branch)
docker-compose build --no-cache zap-prod
docker-compose up zap-prod
# Visit http://localhost:1337
```

### Common Tasks

**Edit Levels**:
- Edit `app/data/levels.json`
- Reload browser to see changes

**Edit Hazards**:
- Edit `app/data/hazards.json` for type definitions
- Edit level's `hazards` array in `levels.json` for placement

**Edit Special Bubbles**:
- Edit `app/data/specialbubbles.json` for type definitions
- Edit level's `specialBubbles` in `levels.json` to enable/configure

**Generate Icons**:
```bash
npm run generate-icons
```

**Generate Audio**:
```bash
npm run generate-audio
```

**Publish Version**:
```bash
npm run publish 1.2.0
```

### Dev Routes
- `/dev` - Dev level selector (all levels unlocked)
- `/dev/builder` - Level builder tool (visual level editor)
- `/dev/finale` - Test victory screen

---

## Level Builder

The level builder (`/dev/builder`) is a visual tool for creating and testing levels:

**Features**:
- Visual level configuration
- Real-time preview
- JSON editor with validation
- Export/import levels
- Load existing levels as templates
- Add/configure hazards (max 2)
- Add/configure special bubbles (max 2 types)
- Start, pause, restart level
- Play level in preview (portrait view)
- Export/download level JSON

**Layout**: Landscape layout with config panel & controls on left, field of play (portrait view) on right

**Note**: Builder uses shared modules (`bubble-utils.js`, `hazards.js`) to ensure preview matches game exactly.

---

## Physics System

### Bubble Physics
- **Gravity**: Constant pull toward center (0,0,0) based on level's `gravity` value
- **Velocity**: Each bubble has `userData.vel` tracking velocity vector
- **Boundary**: Bubbles bounce off 25-unit radius sphere
- **Respawn**: When popped, new bubble spawns if `respawnBubbles: true`

### Hazard Forces

**Wormhole** (attractive):
```javascript
if (distance < radius) {
  direction = hazard.position - bubble.position;
  bubble.velocity += direction.normalized * strength;
  if (distance < 0.7) {
    bubble.position *= -0.95;  // Teleport to opposite side
    bubble.velocity *= 0.3;    // Exit slowly
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
```

---

## Audio System

### Sound Effects
- **Pop sound**: Synthesized using Web Audio API (800Hz → 100Hz pitch down, 0.1s duration)
- **Fail sound**: Two-tone descending (650ms)
- **Haptic feedback**: 25ms vibration on mobile when bubble popped

### Soundtracks
- 10 procedurally-generated soundtracks (one per level group)
- Pre-rendered as WAV files in `app/audio/`
- Generated using Puppeteer headless browser
- Format: WAV (PCM 16-bit, Mono, 44.1kHz)
- Each soundtrack: ~880 KB, 10-second loops

### Audio Manager
- **Web Audio API**: Desktop browsers (lower latency)
- **HTML5 Audio**: iOS Safari fallback (works in silent mode)
- Auto-detects platform and uses appropriate API
- Audio context lazy initialization on user interaction

---

## PWA & Offline Support

### Service Worker (`app/js/sw.js`)
- **Cache Version**: `bubble-zap-v5`
- **Strategy**: Cache First, Network Fallback
- **Cached Assets**:
  - All HTML/JS/JSON files
  - Three.js library from CDN
  - Icons and manifest
  - Audio files
- **Offline**: Full gameplay works offline after first load

### Manifest (`app/assets/manifest.json`)
- **Name**: "Bubble Zap 3D"
- **Short Name**: "BubbleZap"
- **Display**: fullscreen
- **Orientation**: portrait-primary
- **Icons**: 192x192, 512x512 (maskable)
- **Categories**: games, entertainment

### Installation
- Works on iOS, Android, desktop browsers
- Install prompt appears on HTTPS sites
- Can be installed as standalone app

---

## High Score System

### Storage
- Uses browser `localStorage`
- **Key**: `bubblezap_scores`
- **Format**:
```javascript
{
  "global": 45,
  "levels": {
    "The Void": 15,
    "Event Horizon": 24,
    // ... etc
  }
}
```

### Display
- **Global best**: Shown in top-right HUD during gameplay
- **Per-level record**: Shown on level intro screen
- **Messages**: "NEW LEVEL RECORD!", "NEW GLOBAL HIGH SCORE!"

### Reset
```javascript
localStorage.removeItem('bubblezap_scores');
```

---

## State Management

### Global State Variables
```javascript
let levels = [];              // Loaded from levels.json
let currentIdx = 0;           // Current level index
let score = 0;                // Pops in current level
let timeLeft = 0;             // Seconds remaining
let isRunning = false;        // Level active flag
let bubbles = [];             // Bubble mesh objects
let hazards = [];             // Hazard mesh objects
let specialBubbles = [];      // Special bubble meshes
let scene, camera, renderer, controls;  // Three.js objects
let audioContext = null;       // Web Audio API context
```

### localStorage Keys
- `maxUnlockedLevel`: Progress tracking (0-indexed)
- `lastLoadingScreenDate`: Loading screen display tracking
- `devMode`: Temporary flag for dev mode entry
- `devLevel`: Temporary level index for dev mode
- `bubblezap_scores`: High score data

---

## Key Functions

### Game Initialization
- `initScene()` - Setup Three.js scene, camera, renderer, lighting
- `loadLevels()` - Fetch & parse levels.json
- `showLevelIntro(idx)` - Display level intro screen

### Gameplay
- `startLevel(idx)` - Initialize level (clear previous, spawn bubbles/hazards, start timer)
- `spawnBubble(lvl)` - Create single bubble (calls `spawnBubbleInScene()`)
- `spawnSpecialBubble(lvl)` - Create special bubble (calls `spawnSpecialBubbleInScene()`)
- `animate()` - Main game loop (60fps, updates physics, renders scene)
- `tick()` - Timer decrement (called every 1s)
- `handleInteraction(x, y)` - Process clicks/taps (raycast, pop bubble, check win)

### Game End
- `endGame(win)` - Level complete/failed (shows overlay, unlocks next level)

---

## Visual Design

### Bubble Materials
- **Type**: MeshPhysicalMaterial
- **Properties**:
  - `emissive`: Bubble color (self-illumination/glow)
  - `emissiveIntensity`: 0.4 (40% glow strength)
  - `transmission`: 0.3 (30% transparency, glass-like)
  - `roughness`: 0.2 (smooth surface)
  - `opacity`: 1.0 (fully opaque)
  - `transparent`: true

### Lighting
- **Ambient Light**: 0.8 intensity (bright room light)
- **Directional Light**: 1.2 intensity at (5, 10, 7)

### Visual Effects
- **Reference Dots**: Spherical grid on 35-unit radius (depth perception)
- **Starfield**: 800 dim background stars
- **Particle Effects**: Colored burst when bubble pops
- **Hazard Visuals**: Glowing geometries with rotation/animations

### UI Styling
- **Glassmorphism**: Frosted glass effect on UI panels
- **Gradients**: Linear and radial gradients
- **Responsive**: Uses `clamp()` for text scaling
- **Mobile-First**: Touch-friendly button sizes

---

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Edge 60+ (Desktop & Mobile)
- ✅ Firefox 55+ (Desktop & Mobile)
- ✅ Safari 12+ (Desktop & iOS)
- ✅ Samsung Internet
- ❌ IE 11 (Not supported)

### Feature Support
- **Three.js (WebGL)**: All modern browsers
- **Service Worker**: Chrome, Firefox, Safari, Edge (not in private browsing)
- **Web Audio API**: All modern browsers
- **TouchEvents**: Mobile browsers (iOS 10+, Android 5+)
- **Vibration API**: Chrome, Firefox, Android

---

## Performance Optimization

### Mobile Optimization
- Pixel ratio capped at 2x
- Efficient bubble respawning (never exceed count limit)
- Physics calculations optimized
- Wake lock prevents screen dimming during gameplay

### Low-End Device Settings
- Reduce `count` in levels.json
- Reduce number of hazards
- Lower special bubble spawn rate
- Disable special bubbles if needed

### Memory Management
- **Critical**: Ensure all elements cleared between levels (prevents lag after multiple levels)
- Clear bubbles, hazards, special bubbles arrays
- Dispose of Three.js geometries/materials
- Reset timers and intervals

---

## Deployment

game is deployed to zap.neal.rs via docker/local machine / r53 routing

### Requirements
- HTTPS required for Service Worker
- All assets must be accessible
- Test offline functionality after deployment

---

## Testing Checklist

### Before Deploying
- [ ] All JSON files valid (check with jsonlint.com)
- [ ] All hazard types in levels.json exist in hazards.json
- [ ] All special bubble types exist in specialbubbles.json
- [ ] Color hex strings valid (e.g., "0xff0000")
- [ ] Level targets reasonable
- [ ] No trailing commas in JSON arrays
- [ ] Tested in Chrome, Firefox, Safari
- [ ] Tested on mobile (iOS and Android)
- [ ] Tested offline (Service Worker working)
- [ ] All elements cleared between levels (no memory leaks)
- [ ] Zoom & orbit work when replaying levels
- [ ] Update & consolidate documentation

---

## Code Style & Best Practices

### Principles
- **DRY**: Shared modules eliminate duplication
- **Single Source of Truth**: Configuration in JSON files
- **Modularity**: Clear separation of concerns
- **Consistency**: Game and builder use same code paths
- **Performance**: Optimize for mobile devices

### File Organization
- Game logic: `app/js/game.js`
- Shared utilities: `app/js/*-utils.js`, `app/js/hazards.js`
- Configuration: `app/data/*.json`
- Documentation: `docs/*.md`

### Naming Conventions
- Functions: camelCase
- Variables: camelCase
- Files: kebab-case
- Constants: UPPER_SNAKE_CASE

---

## Resources & References

### Documentation
- **Main README**: `/README.md`
- **Developer Guide**: `/docs/DEVELOPER.md` (1200+ lines)
- **Levels Guide**: `/docs/LEVELS-GUIDE.md`
- **Docker Guide**: `/docs/DOCKER.md`
- **High Scores**: `/docs/HIGH-SCORES.md`
- **Updates**: `/docs/UPDATES.md`
- **Manifest Guide**: `/MANIFEST-GUIDE.md`

### External Resources
- Three.js Docs: https://threejs.org/docs
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- PWA Guide: https://web.dev/progressive-web-apps/

### Tools
- JSON Validator: https://jsonlint.com
- Hex Color Picker: Search "hex color picker"
- Manifest Validator: https://manifest-validator.appspot.com/

---

## Quick Reference

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

### Color Codes (Hex Strings)
```json
"0xff0000"  // Red
"0x00ff00"  // Green
"0x0000ff"  // Blue
"0xffff00"  // Yellow
"0xff00ff"  // Magenta
"0x00ffff"  // Cyan
"0xff6600"  // Orange
"0xaa00ff"  // Purple
```

---

## Development Team

### Agent Profiles

#### Designer
**Responsibilities**:
- Building individual levels and quality of levels
- Gameplay balance and progression
- Level difficulty tuning
- JSON configuration management (`levels.json`, `hazards.json`, `specialbubbles.json`)
- Hazard placement and configuration
- Special bubble type design and spawn rates
- Color schemes and visual distinction between level types

**Expertise**: Level design, game balance, JSON configs, player experience

#### Engineer
**Responsibilities**:
- Implementing game mechanics and game engine
- Performance optimization
- Level builder tool (`/dev/builder`)
- Code architecture and shared modules
- DRY principles enforcement
- JSON config validation and tooling
- Bug fixes and technical debt
- Memory management and cleanup

**Expertise**: JavaScript, Three.js, game engine, performance, code quality, DRY principles

#### Creative
**Responsibilities**:
- Audio assets and pipeline
- Music composition and soundtrack generation
- Visual assets (icons, UI elements)
- Theme and visual identity
- Visual distinction for special/bonus levels
- App icon design

**Expertise**: Audio production, visual design, asset creation, branding

#### Tester
**Responsibilities**:
- QA and ensuring game works as designed
- Bug finding and filing detailed tickets
- Cross-platform testing (mobile, tablet, desktop)
- Regression testing
- Performance testing
- User experience validation

**Expertise**: QA, bug reporting, cross-platform testing, user experience

---

## Feedback Organization

### Organized by Theme & Agent Assignment

#### PR: Level Balance & Difficulty Tuning
**Assigned to**: Designer  
**Theme**: Rebalancing individual levels and difficulty curve

**Tasks**:
1. **Level 2**: Reduce comet size
2. **Level 3**: Increase difficulty (currently easier than Level 2)
3. **Level 8**: Increase difficulty (too easy to be level 8)
4. **Level 11**: Reduce comet diameter (comets way too big)
5. **Level 21**: Make easier OR make it the final level with more special bubbles (repulsor levels only work with special bubbles because bubbles move so fast)
6. **General**: Some levels have gotten too easy & some too difficult - review and rebalance entire progression
7. **Repulsor radius**: Makes levels hard - review and adjust repulsor configurations across levels

**Files to modify**: `app/data/levels.json`

---

#### PR: Hazard System Improvements
**Assigned to**: Designer (design) + Engineer (implementation)  
**Theme**: New hazards, hazard limits, and rebalancing

**Tasks**:
1. **Comet limit**: No more than 1 comet per level (enforce in level builder and validation)
2. **Hazard balance**: Need 1-2 more hazards, but scale back on repulsors and bumpers
3. **Radiation hazard**: Design and implement - removes/eats bubbles (requires respawn), maybe with blast aura every x seconds that eats y% of bubbles and then respawns z bubbles
4. **Asteroid belt**: Figure out how to create asteroid belt hazard
5. **Magnetize conversion**: Magnetize bubble is bonkers and maddening - convert to hazard instead of special bubble

**Files to modify**: 
- `app/data/hazards.json` (add new hazards)
- `app/js/hazards.js` (implement new hazards)
- `app/data/levels.json` (update levels)
- `app/js/builder.js` (update builder if needed)

---

#### PR: Special Bubble System Improvements
**Assigned to**: Designer (design) + Engineer (implementation)  
**Theme**: New special bubbles and system improvements

**Tasks**:
1. **Megabubble**: Create special bubble to increase diameter of all existing bubbles
2. **Color separation**: Need fixed array of bubble colors, and fixed set of special bubble colors that don't intersect (Level 9: special and regular bubbles too similar)
3. **Special/bonus levels**: Need visual distinction - maybe increase time to 90s too? And add some social bubbles?

**Files to modify**:
- `app/data/specialbubbles.json` (add megabubble)
- `app/data/config.json` or new color config (separate color arrays)
- `app/js/game.js` (implement megabubble effect)
- `app/data/levels.json` (mark special/bonus levels)

---

#### PR: Win Screen & UI Improvements
**Assigned to**: Engineer (implementation) + Designer (layout)  
**Theme**: Win screen UX and transitions

**Tasks**:
1. **Win screen transition**: Better/smoother transition from playing to win screen - feels choppy
2. **Win screen layout**: The whole win overlay feels wrong - too much text, too many individual lines, different font sizes
3. **Button spacing**: More vertical space between buttons on win screen overlay - too easy to hit buttons
4. **Next level button**: Too easy to click past win screen into next level. Button to goto next level shouldn't be in the middle of the screen. Alternatively, use a Netflix autoplay-style button where progress bar automatically fills over 15s before proceeding unless you explicitly take action
5. **Credits cleanup**: Remove links in credits from win screens
6. **Level transitions**: Better transition between levels

**Files to modify**: `app/index.html` (CSS/styling), `app/js/game.js` (transition logic)

---

#### PR: Camera & Controls Fixes
**Assigned to**: Engineer  
**Theme**: Camera zoom and orbit controls

**Tasks**:
1. **Replay level bug**: When replaying a level, zoom & orbit don't work
2. **Zoom fix**: Fix zoom at most zoomed out
3. **Camera reset**: Ensure camera resets properly when starting/replaying levels

**Files to modify**: `app/js/game.js` (camera/controls initialization)

---

#### PR: Bubble Interaction & Physics Fixes
**Assigned to**: Engineer  
**Theme**: Bubble popping detection and physics improvements

**Tasks**:
1. **Pop area scaling**: Larger pop area when bubbles are small - make area scale inversely with visual diameter
2. **Bubble popping detection**: Often feels like trying to pop a bubble but no matter how much tapping, it's unpoppable unless rotating field - maybe something about planes & how far away bubble is? Perhaps bubbles should be popped as if they're on a 2D plane?
3. **Slomo physics**: Slomo should slow all physics (including hazards)

**Files to modify**: 
- `app/js/game.js` (raycasting logic, slomo implementation)
- `app/js/hazards.js` (hazard physics in slomo)

---

#### PR: Performance & Memory Management
**Assigned to**: Engineer  
**Theme**: Memory leaks and performance

**Tasks**:
1. **Memory leak fix**: Make sure all elements are cleared between levels - phone & browser get laggy after playing a few levels
2. **Cleanup validation**: Add cleanup logging/validation to ensure all Three.js objects are disposed

**Files to modify**: `app/js/game.js` (cleanup functions)

---

#### PR: Offline Mode Fix
**Assigned to**: Engineer  
**Theme**: Service Worker and offline functionality

**Tasks**:
1. **Offline mode**: Still not working - debug and fix Service Worker caching/offline behavior

**Files to modify**: `app/js/sw.js` (Service Worker), test offline functionality

---

#### PR: Audio Improvements
**Assigned to**: Creative  
**Theme**: Music and audio pipeline

**Tasks**:
1. **Better music**: Better music, precompose? (improve soundtrack quality)
2. **Music pause**: Pause music on win screen overlay

**Files to modify**: 
- `app/js/soundtrack.js` (improve music generation)
- `app/js/audio-manager.js` (pause on overlay)
- `app/js/game.js` (trigger pause)

---

#### PR: Visual Assets
**Assigned to**: Creative  
**Theme**: Icons and visual identity

**Tasks**:
1. **App icon**: Better app icon
2. **Special level visuals**: Visual distinction for special/bonus levels (visual assets)

**Files to modify**: 
- `app/assets/icon.svg` (redesign)
- `app/index.html` (special level visual indicators)

---

#### PR: Multi-Hazard Visual Clarity
**Assigned to**: Designer + Creative  
**Theme**: Screen clarity with multiple hazards

**Tasks**:
1. **Level 4**: Multi-wormhole is very busy on screen - any level with multiple hazards actually
2. **Visual optimization**: Review and optimize visual presentation when multiple hazards are present

**Files to modify**: 
- `app/data/levels.json` (hazard placement)
- `app/js/hazards.js` (visual effects optimization)

---

#### PR: Testing & QA
**Assigned to**: Tester  
**Theme**: Comprehensive testing

**Tasks**:
1. **Manual level testing**: Play each level manually - verify difficulty, balance, fun factor
2. **iPad testing**: Try on iPad - test touch interactions, performance, layout
3. **Cross-platform testing**: Test all fixes across Chrome, Firefox, Safari, mobile browsers
4. **Regression testing**: Verify all previous fixes still work
5. **Performance testing**: Test memory leak fixes by playing multiple levels in sequence
6. **Offline testing**: Verify offline mode works after fix

**Deliverables**: Bug reports, test results, QA checklist completion

---

### Summary by Agent

#### Designer (9 PRs/Task Groups)
- Level Balance & Difficulty Tuning
- Hazard System Improvements (design)
- Special Bubble System Improvements (design)
- Win Screen & UI Improvements (layout)
- Multi-Hazard Visual Clarity
- Color system redesign

#### Engineer (7 PRs/Task Groups)
- Hazard System Improvements (implementation)
- Special Bubble System Improvements (implementation)
- Win Screen & UI Improvements (implementation)
- Camera & Controls Fixes
- Bubble Interaction & Physics Fixes
- Performance & Memory Management
- Offline Mode Fix

#### Creative (2 PRs/Task Groups)
- Audio Improvements
- Visual Assets

#### Tester (1 PR/Task Group)
- Testing & QA (ongoing across all PRs)

---

## Team Communication

### When Making Changes
1. **Edit levels**: Modify `app/data/levels.json` - no code changes needed
2. **Add hazards**: Update `app/data/hazards.json` and level configs
3. **Add special bubbles**: Update `app/data/specialbubbles.json` and level configs
4. **Fix bugs**: Update shared modules if affecting both game and builder
5. **Add features**: Consider if it should be in shared module

### Testing Requirements
- Test in main game (`/`)
- Test in level builder (`/dev/builder`)
- Test on mobile device
- Test offline functionality
- Verify no memory leaks (play multiple levels)

### Code Review Checklist
- [ ] Uses shared modules where appropriate
- [ ] No duplicate code
- [ ] JSON files valid
- [ ] Works in both game and builder contexts
- [ ] Mobile-friendly
- [ ] Performance optimized
- [ ] Memory properly cleaned up

---

## Testing Insights & Gotchas

**Critical Lessons Learned During Test Development** - These insights should inform any future testing or game development work:

### Game Mechanics That Affect Testing

1. **Special Bubble Spawn Timing**
   - Special bubbles **don't spawn until 10 seconds** into gameplay (`elapsedTime >= 10` in `game.js`)
   - After 10s, they spawn at intervals (default: every 5 seconds, configurable via `spawnIntervalSeconds`)
   - **Implication**: Tests must run **at least 20-25 seconds** to detect special bubbles spawning
   - Levels with special bubbles enabled need extended test duration (see `test-levels.js`)

2. **Respawn Mechanics & Validation**
   - Levels with `respawnBubbles: true` can have `target > count` (initially)
   - Respawn rate (`respawnRate`) determines how many bubbles spawn during gameplay
   - **Implication**: Level validation must check `respawnBubbles` before flagging `target > count` as impossible
   - Always calculate: `totalPossibleBubbles = count + (time * respawnRate)`

3. **Test Completion Timing**
   - Automated tests click bubbles actively, so levels may complete **earlier than expected** (~17 seconds instead of full 60s)
   - This is normal behavior - tests validate playability, not full level duration
   - Screenshot timing (3s, 8s, 15s) may not capture full gameplay - adjust for special bubbles

4. **Level Completion Detection**
   - Tests detect win/lose via overlay content (`#overlay` element)
   - Win screen contains "Level Complete" or "You Win"
   - Lose screen contains "Time's Up" or "Failed"
   - Level may complete while tests are still running screenshots

### Test Defaults & Configuration

5. **Headless Mode Default**
   - All tests run in **headless mode by default** (no visible browser)
   - Use `--headless=false` to see browser for debugging
   - Audio **may** work in headless with `--autoplay-policy=no-user-gesture-required` flag
   - Audio warnings vs errors: In headless, audio issues are warnings, not errors

6. **Production vs Dev Mode**
   - Tests default to **production mode** (`index.html`), not dev mode (`/dev.html`)
   - Use `--dev` flag to test in dev mode (level selector)
   - Production mode requires `localStorage.setItem('maxUnlockedLevel', '999')` to unlock all levels

7. **Viewport Defaults**
   - Default viewport: **mobile** (`iphone-portrait` - 375x667)
   - Use `--all-viewports` to test across mobile/tablet/desktop
   - Mobile-first testing aligns with game's primary platform

### Validation & Sanity Checks

8. **Level Configuration Validation**
   - Must validate **value ranges**, not just syntax and required fields
   - Check: time > 0, target > 0, count > 0, size in reasonable range (0.5-3)
   - Comet limit: Max 1 per level (PR-8 requirement)
   - **Always consider respawn** when checking `target > count` - it's not always impossible!

9. **Special Bubble Validation**
   - Only flag missing special bubbles if `specialBubbles.enabled === true`
   - Must wait 20-25 seconds before checking if special bubbles spawned
   - Check spawn interval (`spawnIntervalSeconds`) - default is 5 seconds after 10s delay

10. **Impossible Level Detection**
    - Use **100 random clicks** (not 30) to test pop rate
    - Zero pop rate after 100 clicks = impossible level
    - Low pop rate (<2%) for high-target levels (target >= 20) = impossible level
    - Consider respawn when calculating if target is achievable

### Screenshot Strategy

11. **Screenshot Timing**
    - Normal levels: Screenshots at 3s, 8s, 15s
    - Levels with special bubbles: Extended to 3s, 8s, 15s, 20s, 25s (plus 2s extra wait)
    - Always verify gameplay state before capturing (check overlay is hidden)

12. **Failure Screenshots**
    - **Critical**: Take failure screenshots **BEFORE** throwing errors, not in catch blocks
    - Catch blocks may run after page has navigated away
    - Check if page is still on level page before capturing failure screenshot
    - Avoid duplicate screenshots - check if failure screenshot already exists

### Error Handling & Reporting

13. **Early Stopping**
    - Stop test suite if **3+ failures of same type** occur
    - Indicates systemic issue affecting multiple levels
    - Continue testing if failures are different types (get full picture)

14. **Error Categorization**
    - Categorize errors by type for better reporting
    - Common types: "Bubble Spawning Issue", "Game Start Issue", "Low FPS", "Memory Leak", "Impossible Level"
    - Provides actionable fix instructions based on error type

15. **Actionable Fix Instructions**
    - Reports should include step-by-step fix instructions for common errors
    - Instructions should reference specific files and functions
    - Include diagnostic commands (e.g., `npm run test:single -- --level=X --headless=false`)

### Performance & Metrics

16. **FPS Tracking**
    - FPS tracking is built into `game.js` via `window.gameStats.fps`
    - Tracked during `animate()` loop
    - Reset on level start in `startLevel()`
    - Thresholds: <30 Critical, 30-45 Warning, 45-55 Acceptable, 55+ Good

17. **Memory Tracking**
    - Monitor JavaScript heap size via Puppeteer `page.metrics()`
    - Calculate delta: `memoryDeltaMB = (memoryEnd - memoryStart) / (1024 * 1024)`
    - Flag if >10MB per level (potential memory leak)

18. **State Transitions**
    - Track: Start → Gameplay → Win/Lose with timestamps
    - Helps debug timing issues and UI transitions
    - Useful for detecting choppy transitions (PR-5)

### JSON Validation Best Practices

19. **Enhanced Validation**
    - Don't just check syntax and required fields
    - Validate value ranges (time, target, count, size, gravity)
    - Flag suspicious configurations (target > count without respawn, time too short for target)
    - Warn about design issues (very small bubbles, negative gravity, etc.)

20. **Context-Aware Validation**
    - Consider game mechanics when validating (respawn, special bubbles)
    - Sanity checks should understand gameplay context
    - Some warnings vs errors distinction (design issues = warnings, invalid data = errors)

---

**Last Updated**: Based on all markdown documentation as of project state  
**Version**: Current development version  
**Status**: Active development - addressing feedback and known issues
