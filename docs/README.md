# Documentation Index

All documentation for BubbleZap 3D, organized by purpose.

## Quick Links

- **[Main README](../README.md)** - Start here! Quick start, features, scripts
- **[Tools README](../tools/README.md)** - Icon & audio generation

## Documentation by Topic

### 🎮 Game Design & Development

- **[DEVELOPER.md](DEVELOPER.md)** - Complete technical documentation (1200+ lines)
  - Project structure
  - Game configuration (levels, hazards, special bubbles)
  - Physics system
  - Audio & feedback
  - PWA setup
  - Deployment guide
  - Troubleshooting
  - Examples & recipes

- **[LEVELS-GUIDE.md](LEVELS-GUIDE.md)** - Level design & progression (307 lines)
  - 20-level progression guide
  - Tutorial levels (1-3)
  - Medium levels (4-6)
  - Challenge levels (7-10)
  - Advanced levels (11-15)
  - Expert levels (16-20)
  - Difficulty curve analysis
  - Design patterns

### 🚀 Deployment & Infrastructure

- **[DOCKER.md](DOCKER.md)** - Docker deployment
  - Development mode with hot reload
  - Production mode
  - Environment variables

### 📊 Features & Systems

- **[HIGH-SCORES.md](HIGH-SCORES.md)** - High score system documentation
  - Local storage implementation
  - Score tracking per level
  - Future: Online leaderboards

- **[UPDATES.md](UPDATES.md)** - Version history & changelog
  - Release notes
  - Breaking changes
  - Feature additions

### 📦 Other Files

- **[MANIFEST-GUIDE.md](../MANIFEST-GUIDE.md)** - PWA manifest documentation (in root)

### 📚 Archive

Historical development notes (not maintained):
- `archive/doc.md` - Old developer guide
- `archive/SHARED-MODULES.md` - Module refactoring notes
- `archive/SERVICE-WORKER-UPDATE.md` - SW update notes
- `archive/ICONS.md` - Icon generation notes
- `archive/REFACTORING.md` - Code refactoring notes
- `archive/todo.md` - Completed feature list

## Contributing

When adding documentation:
1. Put general info in the main [README](../README.md)
2. Put detailed guides in `docs/`
3. Put tool-specific docs in `tools/README.md`
4. Update this index when adding new docs

## Documentation Standards

- Use clear headings (H1 = #, H2 = ##, etc.)
- Include code examples with syntax highlighting
- Add table of contents for long documents (>200 lines)
- Keep related information together
- Use emoji sparingly for visual organization (✅❌🎮📱⚡)
