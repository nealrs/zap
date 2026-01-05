# BubbleZap 3D 🎮

A fast-paced 3D bubble-popping game built with Three.js. Pop bubbles in zero-gravity space, navigate hazards, grab power-ups, and master 20 challenging levels!

**Play Now**: https://zap.neal.rs/

## Features

- 🎯 20 progressively challenging levels
- 🌀 Multiple hazard types (wormholes, repulsors, bumpers, comets)
- ⚡ Special bubble power-ups (time bonus, points bonus, slow-motion)
- 🎵 10 unique procedurally-generated soundtracks
- 📱 Full mobile support with haptic feedback
- � Works offline as a Progressive Web App (PWA)
- 🎨 Level builder for creating custom levels

## Quick Start

### Run Locally

```bash
npm install
npm start
```

Visit http://localhost:3000

### Docker

Development mode (with hot reload):
```bash
docker-compose up dev
```

Production mode:
```bash
docker-compose up app
```

Visit http://localhost:3000

## Development

### Project Structure

```
zap/
├── app/
│   ├── js/
│   │   ├── game.js              # Main game logic
│   │   ├── hazards.js           # Hazard types & physics
│   │   ├── specialbubbles.js    # Special bubble configs
│   │   ├── soundtrack.js        # Audio generation
│   │   ├── audio-manager.js     # Audio playback
│   │   └── version.js           # Auto-generated version
│   ├── data/
│   │   └── levels.json          # Level configurations
│   ├── audio/                   # Pre-rendered audio files
│   └── assets/                  # Images, icons, manifest
├── docs/                        # Extended documentation
├── tools/                       # Build & generation scripts
└── scripts/                     # Automation scripts
```

### Level Builder

Create custom levels with the visual level builder:

```
http://localhost:3000/builder.html
```

Features:
- Visual level configuration
- Real-time preview
- JSON editor with validation
- Export/import levels
- Load existing levels as templates

### Creating Levels

Edit `app/data/levels.json`:

```json
{
  "name": "My Level",
  "target": 25,
  "time": 60,
  "count": 30,
  "bubbleSize": 0.4,
  "bubbleDistributionRadius": 8,
  "color": "0x00ffff",
  "cameraZoom": 40,
  "autoRotate": false,
  "respawnBubbles": true,
  "hazards": [],
  "specialBubbles": []
}
```

See `docs/LEVELS-GUIDE.md` for detailed level design documentation.

## Scripts

### Development
- `npm start` - Start dev server
- `npm run dev` - Start with hot reload

### Tools
- `npm run generate-icons` - Generate PWA icons from SVG
- `npm run generate-audio` - Render audio from soundtrack.js
- `npm run publish <version>` - Update version across all files

## Audio Generation

Audio files are pre-rendered for optimal performance:

```bash
npm run generate-audio
```

This uses Puppeteer to render the Web Audio API `soundtrack.js` functions into WAV files. See `tools/README.md` for details.

## Publishing

To publish a new version:

```bash
npm run publish 1.2.0
```

This will:
1. Update `package.json` version
2. Update service worker cache version
3. Update `manifest.json`
4. Generate `version.js` with the new version
5. Display version in game UI

Then commit and push:

```bash
git add .
git commit -m "Release v1.2.0"
git tag v1.2.0
git push && git push --tags
```

## Documentation

- **[Developer Guide](docs/DEVELOPER.md)** - Complete technical documentation
- **[Levels Guide](docs/LEVELS-GUIDE.md)** - Level design & progression
- **[Docker Guide](docs/DOCKER.md)** - Docker deployment
- **[High Scores](docs/HIGH-SCORES.md)** - High score system (coming soon)
- **[Updates](docs/UPDATES.md)** - Version history & changelog

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & iOS)
- ✅ Samsung Internet
- ✅ Works offline via Service Worker

## Tech Stack

- **Three.js r128** - 3D rendering
- **Web Audio API** - Procedural audio generation
- **HTML5 Audio** - iOS Safari fallback
- **Service Worker** - Offline support
- **Express** - Development server

## Controls

- **Desktop**: Click bubbles with mouse
- **Mobile**: Tap bubbles with finger
- **Sound**: Toggle with 🔊 button

## Game Mechanics

### Hazards
- **Wormhole**: Teleports bubbles to random locations
- **Repulsor**: Pushes nearby bubbles away
- **Bumper**: Bounces bubbles off at high speed
- **Comet**: Orbits and attracts bubbles

### Special Bubbles
- **⏱️ Time Bonus**: +10 seconds
- **💎 Points Bonus**: +5 points
- **🐌 Slow-Motion**: Slows everything for 5s

### Scoring
- Pop regular bubbles: +1 point
- Pop special bubbles: bonus + effect
- Clear level: Progress to next level
- Beat all 20 levels: CHAMPION! 🎉

## License

© 2026 Neal Shyam. All rights reserved.

## Credits

Created by [Neal Shyam](https://nealshyam.com) ([@nealrs](https://github.com/nealrs))

Built with Three.js, Web Audio API, and lots of ☕
- [HIGH-SCORES.md](docs/HIGH-SCORES.md) - High score system and localStorage usage
- [DOCKER.md](docs/DOCKER.md) - Docker setup and hot reload usage
- [doc.md](docs/doc.md) - Quick reference guide

## 🎮 Features

- 3D bubble physics with camera rotation
- 20 progressively challenging levels
- Special power-up bubbles (time bonus, points, multipop, slow-mo, magnetize)
- Multiple hazard types (wormholes, repulsors, pulsars, comets)
- Configurable camera zoom per level (widest view by default)
- Progressive difficulty across levels
- PWA support with offline play
- Level builder tool at `/dev/builder` (dev mode only)
