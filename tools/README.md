# Audio Asset Generation

BubbleZap 3D uses procedurally generated audio from the `soundtrack.js` functions. Audio files are pre-rendered as WAV files for optimal performance and iOS Safari compatibility.

## Quick Start

```bash
npm run generate-audio
```

This will:
- Generate `pop.wav` and `fail.wav` sound effects
- Render all 10 level soundtracks using the actual `soundtrack.js` theme functions
- Save files to `app/audio/` directory
- Automatically increment service worker cache version

## How It Works

The `generate-audio-headless.js` script uses Puppeteer to:
1. Start a temporary web server
2. Launch a headless browser
3. Load the game's `soundtrack.js` file
4. Render each theme function using `OfflineAudioContext` (Web Audio API)
5. Convert rendered audio to WAV format
6. Save files directly to `app/audio/`

This ensures the generated audio is **identical** to what plays in the game.

## Generated Files

```
app/audio/
├── pop.wav                    # Pop sound (100ms, frequency sweep 800Hz→100Hz)
├── fail.wav                   # Fail sound (650ms, two-tone descending)
├── soundtrack-level-0.wav     # Ethereal Pad (Dark Pulse)
├── soundtrack-level-1.wav     # Deep Space Drone
├── soundtrack-level-2.wav     # Crystalline Chimes
├── soundtrack-level-3.wav     # Pulsing Waves
├── soundtrack-level-4.wav     # Cosmic Wind
├── soundtrack-level-5.wav     # Orbital Melody
├── soundtrack-level-6.wav     # Nebula Dream
├── soundtrack-level-7.wav     # Stellar Pulse
├── soundtrack-level-8.wav     # Aurora Waves
└── soundtrack-level-9.wav     # Void Echo
```

## Audio Format

- **Format:** WAV (PCM 16-bit, Mono, 44.1kHz)
- **Pop:** ~8.8 KB
- **Fail:** ~57 KB  
- **Soundtracks:** ~880 KB each (10 seconds)
- **Total Size:** ~10 MB for all assets

## AudioManager Integration

The game uses `audio-manager.js` to provide:
- **Web Audio API** on desktop browsers (lower latency)
- **HTML5 Audio** on iOS Safari (works in silent mode)

The AudioManager automatically detects the platform and uses the appropriate API.

## Updating Soundtracks

If you modify theme functions in `soundtrack.js`:

1. Make your changes to `app/js/soundtrack.js`
2. Run `npm run generate-audio`
3. Test the new audio in the game
4. Increment cache version with `npm run publish <version>`

## Technical Details

- Uses real Web Audio API via Puppeteer (not a Node.js polyfill)
- Renders at 44.1kHz sample rate
- Applies the same DynamicsCompressor as the live game
- 10-second loops designed for seamless playback

## Troubleshooting

**Problem:** Puppeteer fails to install or run
- **Solution:** Install Puppeteer: `npm install --save-dev puppeteer`

**Problem:** Server port 6767 already in use
- **Solution:** Edit `generate-audio-headless.js` and change the port number

**Problem:** Soundtracks sound different from in-game
- **Solution:** Ensure you're using the headless generator (not browser-based methods)
