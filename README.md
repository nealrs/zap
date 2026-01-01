# Bubble Zap 3D

A 3D bubble-popping game built with Three.js.

## 📁 Project Structure

```
zap/
├── app/                    # Application files
│   ├── js/                # JavaScript files
│   │   ├── game.js        # Main game logic
│   │   ├── specialbubbles.js  # Special bubbles config loader
│   │   ├── hazards.js     # Hazard physics module
│   │   └── sw.js          # Service worker
│   ├── data/              # JSON configuration files
│   │   ├── levels.json    # Level definitions
│   │   ├── specialbubbles.json  # Special bubble types
│   │   ├── hazards.json   # Hazard definitions
│   │   └── config.json    # Global game configuration
│   └── assets/            # Static assets
│       └── manifest.json  # PWA manifest
├── index.html             # Entry point HTML file
├── docs/                  # Documentation
├── server.js             # Express server
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── package.json          # Node.js dependencies

```

## 🚀 Quick Start

### Development (with hot reload)
```bash
docker-compose up dev
```
Visit: http://localhost:3000

All changes to files in `/app` are instantly reflected - no rebuild needed!

### Production
```bash
docker-compose up app
```

## 📚 Documentation

Complete documentation in `/docs`:
- [DEVELOPER.md](docs/DEVELOPER.md) - Complete development guide, configuration, and API reference
- [LEVELS-GUIDE.md](docs/LEVELS-GUIDE.md) - Level progression, difficulty curve, and design guide
- [HIGH-SCORES.md](docs/HIGH-SCORES.md) - High score system and localStorage usage
- [DOCKER.md](docs/DOCKER.md) - Docker setup and hot reload usage
- [doc.md](docs/doc.md) - Quick reference guide

## 🎮 Features

- 3D bubble physics
- Special power-up bubbles
- Multiple hazard types (wormholes, repulsors, bumpers)
- Progressive difficulty across levels
- PWA support with offline play
