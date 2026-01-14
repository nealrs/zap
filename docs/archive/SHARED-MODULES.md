# Shared Module Architecture

## Overview
The Zap game uses a modular architecture with shared utility modules that both the main game and level builder can use. This eliminates code duplication and ensures consistent behavior across both contexts.

## Shared Modules

### 1. `bubble-utils.js` - Bubble Spawning Utilities
**Purpose**: Handles creation of regular and special bubbles

**Functions**:
- `spawnBubbleInScene(lvl, targetScene, targetArray, normalMap)` - Creates regular bubbles
- `spawnSpecialBubbleInScene(lvl, targetScene, targetArray, bubbleTypes, normalMap)` - Creates special bubbles with glowing rings

**Used by**:
- `game.js` → `spawnBubble()` and `spawnSpecialBubble()` 
- `builder.js` → `spawnRegularBubble()` and `spawnSpecialBubble()`

**Features**:
- ✅ Parameterized (no global state)
- ✅ Optional normal map texture support
- ✅ Consistent spawn radius and physics
- ✅ Proper userData initialization (vel, wormholeImmunity, special, specialType, lifetime)

---

### 2. `hazards.js` - Hazard System
**Purpose**: Creates and manages all hazard types and their physics interactions

**Functions**:
- `createHazard(hData, scene)` - Creates hazard mesh (wormhole, repulsor, pulsar, asteroidbelt, comet)
- `applyHazardForce(bubble, hazard)` - Applies physics forces to bubbles
- `updateHazardVisuals(hazard)` - Updates hazard animations (comet movement, pulsar pulsing)
- `getPulsarRotationEffect()` - Returns camera rotation modulation for pulsar effect
- `clearHazards(scene)` - Removes all hazards from scene
- `getHazards()` - Returns hazards array

**Hazard Types**:
- **Wormhole**: Teleports bubbles, immunity timer, particle vortex effect
- **Repulsor**: Pushes bubbles away with inverse square force
- **Pulsar**: Modulates camera rotation speed and scene rotation axes
- **Asteroid Belt**: Rotating torus that blocks/deflects bubbles
- **Comet**: Moving hazard with glowing head, cone tail, particle trail

**Used by**:
- `game.js` → Creates hazards during level setup
- `builder.js` → Creates hazards during level preview

**Features**:
- ✅ Complete hazard implementations
- ✅ Visual effects (particles, trails, glow)
- ✅ Physics interactions with bubble userData
- ✅ State management (hazards array)

---

### 3. `specialbubbles.js` - Special Bubble Configuration
**Purpose**: Loads and provides special bubble type definitions

**Functions**:
- `loadSpecialBubblesConfig(callback)` - Fetches `/data/specialbubbles.json`

**Global Variables**:
- `specialBubbleTypes` - Type definitions (timebonus, pointsbonus, multipop, slowmo, magnetize)
- `specialBubbleSpawnConfig` - Spawn timing configuration

**Special Bubble Types**:
- **timebonus**: Adds 5 seconds to timer
- **pointsbonus**: Adds 5 bonus points
- **multipop**: Pops 5 nearest bubbles
- **slowmo**: 3 seconds of slow motion (0.3x speed)
- **magnetize**: 3 seconds of bubble attraction toward mouse/touch

**Configuration** (`/data/specialbubbles.json`):
```json
{
  "specialBubbleTypes": {
    "timebonus": {
      "color": "0x9d00ff",
      "effect": { "amount": 5 },
      "lifetime": 5,
      "visual": { "scale": 1.2, "glowColor": "0x9d00ff", "glowIntensity": 0.8 }
    },
    // ... etc
  }
}
```

**Used by**:
- `game.js` → Loads config on startup, uses `specialBubbleTypes` for spawning
- `builder.js` → Uses `specialBubbleTypesData` (loaded separately) for spawning

**Features**:
- ✅ JSON-based configuration
- ✅ Type definitions with visual properties
- ✅ Effect parameters (amount, duration, etc.)
- ✅ Error handling with overlay display

---

## Module Loading Order

### Main Game (`index.html`)
```html
1. Three.js + OrbitControls (CDN)
2. specialbubbles.js
3. hazards.js
4. bubble-utils.js
5. soundtrack.js
6. game.js
```

### Level Builder (`builder.html`)
```html
1. Three.js + OrbitControls (CDN)
2. specialbubbles.js
3. hazards.js
4. bubble-utils.js
5. builder.js
```

**Note**: `soundtrack.js` and `game.js` are NOT loaded in builder to avoid:
- Game initialization code running
- Audio system loading
- DOM element dependencies (loading screen, overlays, etc.)

---

## Usage Examples

### Creating Regular Bubbles
```javascript
// In game.js
function spawnBubble(lvl) {
    spawnBubbleInScene(lvl, scene, bubbles, bubbleNormalMap);
}

// In builder.js
function spawnRegularBubble() {
    const tempBubbles = [];
    const mesh = spawnBubbleInScene(currentLevel, scene, tempBubbles, null);
    if (mesh) {
        bubbles.push({ mesh, velocity: mesh.userData.vel, popped: false });
    }
}
```

### Creating Special Bubbles
```javascript
// In game.js
function spawnSpecialBubble(lvl) {
    spawnSpecialBubbleInScene(lvl, scene, specialBubbles, specialBubbleTypes, bubbleNormalMap);
}

// In builder.js
function spawnSpecialBubble() {
    const tempBubbles = [];
    const mesh = spawnSpecialBubbleInScene(
        currentLevel, scene, tempBubbles, 
        specialBubbleTypesData, null
    );
    if (mesh) {
        bubbles.push({ 
            mesh, 
            velocity: mesh.userData.vel, 
            popped: false,
            type: mesh.userData.specialType,
            typeData: specialBubbleTypesData[mesh.userData.specialType]
        });
    }
}
```

### Creating Hazards
```javascript
// Both game.js and builder.js
config.hazards.forEach(hazardConfig => {
    const hazardMesh = createHazard(hazardConfig, scene);
    hazardObjects.push({
        mesh: hazardMesh,
        type: hazardConfig.type,
        update: (time) => {
            updateHazardVisuals(hazardMesh);
        }
    });
});
```

### Applying Hazard Forces
```javascript
// Both game.js and builder.js (in animation loop)
bubbles.forEach(bubble => {
    hazardObjects.forEach(hazard => {
        applyHazardForce(bubble.mesh, hazard.mesh);
    });
});
```

### Getting Pulsar Effect
```javascript
// Both game.js and builder.js (in animation loop)
const pulsar = hazardObjects.find(h => h.type === 'pulsar');
if (pulsar) {
    const effect = getPulsarRotationEffect();
    controls.autoRotateSpeed = 0.5 * effect.speedMultiplier;
    scene.rotation.x = effect.axisRotationVec.x;
    scene.rotation.y = effect.axisRotationVec.y;
}
```

---

## Benefits of Shared Architecture

### Code Quality
- ✅ **DRY Principle**: No duplicate implementations
- ✅ **Single Source of Truth**: One place to fix bugs
- ✅ **Maintainability**: Changes propagate to both game and builder
- ✅ **Testability**: Can test modules independently

### Consistency
- ✅ **Identical Behavior**: Game and builder work the same way
- ✅ **Visual Parity**: Same materials, colors, effects
- ✅ **Physics Parity**: Same forces, velocities, interactions
- ✅ **Configuration Parity**: Same JSON data sources

### Developer Experience
- ✅ **Clear Separation**: Each module has single responsibility
- ✅ **Easy to Understand**: Module names describe their purpose
- ✅ **Reusable**: Can use modules in future tools/editors
- ✅ **Documented**: JSDoc comments on all public functions

---

## Future Enhancements

### Potential Additional Shared Modules
- `physics-utils.js` - Boundary checks, collision detection, velocity updates
- `visual-effects.js` - Particle bursts, floating text, screen shake
- `audio-utils.js` - Sound effects, music management (if builder adds audio)
- `level-validator.js` - Level configuration validation logic
- `scoring-utils.js` - Score calculation, combo multipliers

### Potential Improvements
- Convert to ES6 modules (`export`/`import`) for better encapsulation
- Add TypeScript definitions for better IDE support
- Extract more game.js functions that builder could use
- Create shared camera/controls setup utility
- Add unit tests for shared modules
