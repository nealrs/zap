import puppeteer from 'puppeteer';
import { startTestServer, stopTestServer, validateLevelsJSON, loadTestConfig, ensureDir, killPort } from './test-utils.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Wait for a specified number of milliseconds
 * Replacement for deprecated page.waitForTimeout()
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Viewport configurations
const VIEWPORTS = {
  'iphone-portrait': { name: 'iphone-portrait', width: 375, height: 667 },
  'tablet-portrait': { name: 'tablet-portrait', width: 768, height: 1024 },
  'desktop-narrow': { name: 'desktop-narrow', width: 1024, height: 768 }
};

// Parse command line arguments
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const allViewports = args.includes('--all-viewports');
const headlessArg = args.find(arg => arg.startsWith('--headless='));
const headless = headlessArg ? headlessArg.split('=')[1] === 'true' : true;
const levelArg = args.find(arg => arg.startsWith('--level='));
const testSingleLevel = levelArg ? parseInt(levelArg.split('=')[1]) : null;
const viewportArg = args.find(arg => arg.startsWith('--viewport='));
const testViewport = viewportArg ? viewportArg.split('=')[1] : null;
// Default to production mode, use --dev flag to test in dev mode
const prodMode = !args.includes('--dev');

async function main() {
  const config = loadTestConfig();
  config.headless = headless;
  config.quickMode = quickMode;
  config.testSingleLevel = testSingleLevel;
  config.prodMode = prodMode;

  let server = null;
  const browsers = [];

  // Cleanup function
  const cleanup = async () => {
    // Close all browsers
    for (const browser of browsers) {
      try {
        await browser.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Stop server
    if (server) {
      await stopTestServer(server, config.serverPort);
    }
  };

  // Handle process signals
  const signalHandler = async (signal) => {
    console.log(`\n⚠️  Received ${signal}, cleaning up...`);
    await cleanup();
    process.exit(1);
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await cleanup();
    process.exit(1);
  });
  process.on('unhandledRejection', async (error) => {
    console.error('❌ Unhandled rejection:', error);
    await cleanup();
    process.exit(1);
  });

  try {
    console.log('🧪 Starting Bubble Zap 3D Level Tests\n');

    // Step 1: Validate JSON files
    console.log('📋 Validating JSON files...');
    const validation = validateLevelsJSON();
    if (!validation.valid) {
      console.error('❌ JSON validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      await cleanup();
      process.exit(1);
    }
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('⚠️  JSON validation warnings:');
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
      console.log('');
    }
    console.log('✓ JSON files valid\n');

    // Step 2: Load levels
    const levelsPath = join(rootDir, 'app', 'data', 'levels.json');
    const levels = JSON.parse(readFileSync(levelsPath, 'utf8'));
    
    // Convert 1-indexed level number to 0-indexed array index
    let levelIndexToTest = null;
    if (testSingleLevel !== null) {
      levelIndexToTest = testSingleLevel - 1; // Convert from 1-indexed (user input) to 0-indexed (array)
      if (levelIndexToTest < 0 || levelIndexToTest >= levels.length) {
        console.error(`❌ Invalid level number: ${testSingleLevel}. Valid range: 1-${levels.length}`);
        process.exit(1);
      }
    }
    
    const levelsToTest = levelIndexToTest !== null 
      ? [levels[levelIndexToTest]].filter(Boolean)
      : quickMode 
        ? levels.slice(0, 5)
        : levels;

    // Determine which viewports to test
    let viewportsToTest;
    if (testViewport) {
      // Single viewport specified via --viewport flag
      if (VIEWPORTS[testViewport]) {
        viewportsToTest = [VIEWPORTS[testViewport]];
      } else {
        console.error(`❌ Invalid viewport: ${testViewport}`);
        console.error(`   Available viewports: ${Object.keys(VIEWPORTS).join(', ')}`);
        await cleanup();
        process.exit(1);
      }
    } else if (allViewports) {
      // --all-viewports flag: test all viewports
      viewportsToTest = config.allViewports 
        ? config.allViewports.map(name => VIEWPORTS[name]).filter(Boolean)
        : Object.values(VIEWPORTS);
    } else {
      // Default: use configured default viewports (mobile only)
      const defaultViewportNames = config.defaultViewports || ['iphone-portrait'];
      viewportsToTest = defaultViewportNames
        .map(name => VIEWPORTS[name])
        .filter(Boolean);
      
      if (viewportsToTest.length === 0) {
        // Fallback to mobile if config is invalid
        viewportsToTest = [VIEWPORTS['iphone-portrait']];
      }
    }

    console.log(`📊 Testing ${levelsToTest.length} level(s) across ${viewportsToTest.length} viewport(s)\n`);

    // Step 3: Start server
    try {
      server = await startTestServer(config.serverPort);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for server to be ready
    } catch (error) {
      console.error('❌ Failed to start test server:', error.message);
      await cleanup();
      process.exit(1);
    }

    const allTestResults = [];

  // Test each viewport
  for (const viewport of viewportsToTest) {
    console.log(`\n📱 Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})\n`);

    // Step 4: Launch browser
    const browser = await puppeteer.launch({
      headless: config.headless,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--autoplay-policy=no-user-gesture-required' // Allow audio autoplay in headless mode
      ]
    });

    browsers.push(browser); // Track for cleanup

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: viewport.width, height: viewport.height });

    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          level: 'unknown',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    const testResults = [];
    
    // Track failure types for early stopping
    const failureTypes = new Map(); // Map<errorType, count>
    
    // Helper function to categorize errors
    function categorizeError(errorMessage) {
      const msg = errorMessage.toLowerCase();
      if (msg.includes('bubbles') && msg.includes('spawn')) return 'Bubble Spawning Issue';
      if (msg.includes('game did not start') || msg.includes('ui elements')) return 'Game Initialization Issue';
      if (msg.includes('impossible to play') || msg.includes('pop rate')) return 'Gameplay Issue';
      if (msg.includes('canvas') || msg.includes('render')) return 'Rendering Issue';
      if (msg.includes('timeout')) return 'Timeout Issue';
      if (msg.includes('audio')) return 'Audio Issue';
      return 'Other Error';
    }

    try {
      // Navigate to dev mode or production mode
      if (config.prodMode) {
        console.log('🌐 Navigating to production mode (index.html)...');
        await page.goto(`${config.baseUrl}/`, { waitUntil: 'networkidle0' });
        
        // Unlock all levels for testing
        await page.evaluate(() => {
          localStorage.setItem('maxUnlockedLevel', '999'); // Unlock all levels
        });
        
        // Reload to apply unlock
        await page.reload({ waitUntil: 'networkidle0' });
        
        // Wait for level selector to appear (production mode)
        await page.waitForSelector('#overlay, #level-desc', { timeout: 10000 });
        await wait(2000); // Wait for level selector to render
      } else {
        console.log('🌐 Navigating to dev mode...');
        await page.goto(`${config.baseUrl}/dev`, { waitUntil: 'networkidle0' });
        
        // Wait for level cards to be loaded (they're dynamically created)
        await page.waitForSelector('.level-card', { timeout: 10000 });
        await wait(1000);
      }

      // Test each level
      for (let i = 0; i < levelsToTest.length; i++) {
        const level = levelsToTest[i];
        const levelIndex = levels.indexOf(level);
        
        console.log(`\n🎮 Testing Level ${levelIndex + 1}: ${level.name} (${viewport.name})`);

        let screenshots = []; // Initialize screenshots outside try block for catch block access
        try {
          const levelStartTime = Date.now();
          let loadTime = null;
          
          if (config.prodMode) {
            // Production mode: Unlock all levels first, then click level button
            // Unlock all levels via localStorage
            await page.evaluate(() => {
              localStorage.setItem('unlockedLevel', '999'); // Unlock all levels
            });
            
            // Refresh page to apply unlock
            await page.reload({ waitUntil: 'networkidle0' });
            await wait(2000); // Wait for level selector to render
            
            // Find and click level button
            const clicked = await page.evaluate((idx) => {
              // Find button that calls startLevelFromSelector with our index
              const buttons = Array.from(document.querySelectorAll('button'));
              const button = buttons.find(btn => {
                const onclick = btn.getAttribute('onclick');
                return onclick && onclick.includes(`startLevelFromSelector(${idx})`);
              });
              
              if (button && !button.disabled) {
                button.click();
                return true;
              }
              return false;
            }, levelIndex);
            
            if (!clicked) {
              // Take a screenshot to debug
              await ensureDir(config.screenshotDir);
              const debugPath = join(rootDir, config.screenshotDir, `debug-level-${levelIndex + 1}-${viewport.name}-prod-selector.png`);
              await page.screenshot({ path: debugPath, fullPage: true });
              throw new Error(`Could not find or click level button for level ${levelIndex + 1} in production mode. Debug screenshot saved.`);
            }
            
            await wait(2000); // Wait for level intro to appear
          } else {
            // Dev mode: Find and click level card (div with class level-card)
            const levelCards = await page.$$('.level-card');
            let levelCard = null;
            
            for (const card of levelCards) {
              const text = await page.evaluate(el => el.textContent, card);
              // Match by level number (e.g., "Level 1") or level name
              if (text.includes(`Level ${levelIndex + 1}`) || text.includes(level.name)) {
                levelCard = card;
                break;
              }
            }

            if (!levelCard) {
              // Take a screenshot to debug
              await ensureDir(config.screenshotDir);
              const debugPath = join(rootDir, config.screenshotDir, `debug-level-${levelIndex + 1}-${viewport.name}.png`);
              await page.screenshot({ path: debugPath, fullPage: true });
              throw new Error(`Could not find level card for level ${levelIndex + 1}. Debug screenshot saved.`);
            }

            await levelCard.click();
            await wait(2000); // Wait for navigation to main game page
          }

          // Wait for level intro screen or game to start
          // The dev mode redirects to / which should show the level intro
          await page.waitForSelector('#overlay, #start-btn, canvas', { timeout: 10000 });
          await wait(1000);

          // Check if we're on the level intro screen or if game already started
          const hasOverlay = await page.evaluate(() => {
            const overlay = document.querySelector('#overlay');
            return overlay && !overlay.classList.contains('hidden');
          });

          // Inject audio tracking BEFORE clicking start button
          // This ensures we catch soundtrack start calls
          await page.evaluate(() => {
            if (!window.testAudio) {
              window.testAudio = {
                soundtrackStarted: false,
                soundtrackPaused: false,
                soundtrackPausedOnOverlay: false,
                soundEffectsPlayed: 0,
                overlayShownTimes: []
              };
              
              // Track soundtrack start (wrap AudioManager.startSoundtrack)
              if (typeof AudioManager !== 'undefined' && AudioManager.startSoundtrack) {
                const originalStartSoundtrack = AudioManager.startSoundtrack;
                AudioManager.startSoundtrack = function(...args) {
                  window.testAudio.soundtrackStarted = true;
                  console.log('[TEST] AudioManager.startSoundtrack called');
                  return originalStartSoundtrack.apply(this, args);
                };
              }
              
              // Also track legacy generateSoundtrack calls (Web Audio mode)
              if (typeof generateSoundtrack !== 'undefined') {
                const originalGenerateSoundtrack = generateSoundtrack;
                window.generateSoundtrack = function(...args) {
                  window.testAudio.soundtrackStarted = true;
                  console.log('[TEST] generateSoundtrack called (Web Audio mode)');
                  return originalGenerateSoundtrack.apply(this, args);
                };
              }
              
              // Track sound effects (monitor playPopSound calls)
              if (typeof AudioManager !== 'undefined' && AudioManager.playPopSound) {
                const originalPlayPop = AudioManager.playPopSound;
                AudioManager.playPopSound = function(...args) {
                  window.testAudio.soundEffectsPlayed++;
                  return originalPlayPop.apply(this, args);
                };
              }
            }
          });

          if (hasOverlay) {
            // We're on the intro screen, need to click START LEVEL
            const startButton = await page.evaluateHandle(() => {
              const btn = document.getElementById('start-btn');
              if (btn && (btn.textContent.includes('START') || btn.textContent.includes('Start'))) {
                return btn;
              }
              // Fallback: find any button with START in text
              const buttons = Array.from(document.querySelectorAll('button'));
              return buttons.find(b => 
                b.textContent.includes('START') || 
                b.textContent.includes('Start Level') ||
                b.textContent.includes('Start')
              ) || buttons[0];
            });

            if (startButton && startButton.asElement()) {
              await startButton.asElement().click();
              await wait(1000);
            } else {
              // Try clicking by selector
              const startBtn = await page.$('#start-btn');
              if (startBtn) {
                await startBtn.click();
                await wait(1000);
              }
            }
          }

          // Wait for game to start and measure load time
          const gameStartTime = Date.now();
          await wait(2000);

          // Check if game is running
          const gameRunning = await page.evaluate(() => {
            const hud = document.querySelector('#ui-layer, .hud-top');
            const canvas = document.querySelector('canvas');
            return !!(hud || canvas);
          });

          if (!gameRunning) {
            throw new Error('Game did not start - UI elements not found');
          }
          
          loadTime = (Date.now() - gameStartTime) / 1000;
          const gameplayStartTime = Date.now();
          
          // Store gameplay start time for spawn rate calculations
          await page.evaluate((startTime) => {
            window.gameplayStartTime = startTime;
          }, gameplayStartTime);

          // Wait for gameplay to actually start (bubbles should be visible)
          await wait(1000);

          // Verify we're in gameplay (not start screen or win screen)
          // Wait a bit more and check multiple times
          let inGameplay = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            await wait(500);
            inGameplay = await page.evaluate(() => {
              // Check that we're not on start/win screen
              const overlay = document.querySelector('#overlay');
              const overlayVisible = overlay && (overlay.style.display !== 'none' && !overlay.classList.contains('hidden'));
              const canvas = document.querySelector('canvas');
              const hud = document.querySelector('#ui-layer, .hud-top');
              
              // We're in gameplay if canvas exists, HUD exists, and overlay is hidden
              return !!(canvas && hud && !overlayVisible);
            });
            if (inGameplay) break;
          }

          if (!inGameplay) {
            // Take a debug screenshot (this IS the failure state - capture it)
            await ensureDir(config.screenshotDir);
            const failureScreenshotPath = join(
              rootDir, 
              config.screenshotDir, 
              `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-FAILED.png`
            );
            await page.screenshot({ path: failureScreenshotPath, fullPage: true });
            throw new Error('Game did not enter gameplay state - still on start/win screen. Failure screenshot saved.');
          }

          // Initialize memory tracking
          const memoryStart = await page.metrics().then(m => m.JSHeapUsedSize || 0);
          
          // Inject audio tracking EARLY - before gameplay starts
          // This needs to happen before startLevel() is called
          await page.evaluate(() => {
            window.testAudio = {
              soundtrackStarted: false,
              soundtrackPaused: false,
              soundtrackPausedOnOverlay: false,
              soundEffectsPlayed: 0,
              overlayShownTimes: []
            };
            
            // Track overlay visibility changes
            const overlay = document.querySelector('#overlay');
            if (overlay) {
              const observer = new MutationObserver(() => {
                const isVisible = overlay.style.display !== 'none';
                if (isVisible) {
                  window.testAudio.overlayShownTimes.push(Date.now());
                  // Check if audio paused when overlay appeared
                  if (typeof AudioManager !== 'undefined' && AudioManager.currentSoundtrack) {
                    const audio = AudioManager.currentSoundtrack;
                    if (audio.paused || (audio.readyState < 2)) {
                      window.testAudio.soundtrackPausedOnOverlay = true;
                    }
                  }
                }
              });
              observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
            }
            
            // Track soundtrack start (wrap AudioManager.startSoundtrack)
            if (typeof AudioManager !== 'undefined' && AudioManager.startSoundtrack) {
              const originalStartSoundtrack = AudioManager.startSoundtrack;
              AudioManager.startSoundtrack = function(...args) {
                window.testAudio.soundtrackStarted = true;
                console.log('[TEST] AudioManager.startSoundtrack called');
                return originalStartSoundtrack.apply(this, args);
              };
            }
            
            // Also track legacy generateSoundtrack calls (Web Audio mode)
            if (typeof generateSoundtrack !== 'undefined') {
              const originalGenerateSoundtrack = generateSoundtrack;
              window.generateSoundtrack = function(...args) {
                window.testAudio.soundtrackStarted = true;
                console.log('[TEST] generateSoundtrack called (Web Audio mode)');
                return originalGenerateSoundtrack.apply(this, args);
              };
            }
            
            // Track sound effects (monitor playPopSound calls)
            if (typeof AudioManager !== 'undefined' && AudioManager.playPopSound) {
              const originalPlayPop = AudioManager.playPopSound;
              AudioManager.playPopSound = function(...args) {
                window.testAudio.soundEffectsPlayed++;
                return originalPlayPop.apply(this, args);
              };
            }
          });

          // Capture 2-3 gameplay screenshots at different times
          screenshots = []; // Reset screenshots array
          // If special bubbles are enabled, extend test duration to allow time for them to spawn
          // Special bubbles don't spawn until 10s, then at intervals (default 5s)
          // So we need at least 20-25s to see them spawn
          const hasSpecialBubbles = level.specialBubbles && level.specialBubbles.enabled;
          const screenshotTimes = hasSpecialBubbles 
            ? [3000, 8000, 15000, 20000, 25000] // 3s, 8s, 15s, 20s, 25s (extended for special bubbles)
            : [3000, 8000, 15000]; // 3s, 8s, 15s (normal duration)
          
          for (let j = 0; j < screenshotTimes.length; j++) {
            const waitTime = j === 0 ? screenshotTimes[j] : screenshotTimes[j] - screenshotTimes[j - 1];
            await wait(waitTime);
            
            // Verify we're still in gameplay (not win screen)
            const stillInGameplay = await page.evaluate(() => {
              const overlay = document.querySelector('#overlay');
              const overlayVisible = overlay && overlay.style.display !== 'none';
              return !overlayVisible;
            });
            
            if (!stillInGameplay) {
              // Level completed, only take screenshot if we haven't taken any yet
              if (screenshots.length === 0) {
                await ensureDir(config.screenshotDir);
                const screenshotPath = join(rootDir, config.screenshotDir, `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-gameplay-${j + 1}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                screenshots.push(screenshotPath);
              }
              break; // Level ended, stop taking screenshots
            }
            
            // Take gameplay screenshot
            await ensureDir(config.screenshotDir);
            const screenshotPath = join(rootDir, config.screenshotDir, `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-gameplay-${j + 1}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            screenshots.push(screenshotPath);
            console.log(`   📸 Screenshot ${j + 1}: gameplay (${screenshotTimes[j] / 1000}s)`);
          }

          if (screenshots.length === 0) {
            // Take failure screenshot BEFORE throwing error (capture the actual failure state)
            await ensureDir(config.screenshotDir);
            const failureScreenshotPath = join(
              rootDir, 
              config.screenshotDir, 
              `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-FAILED.png`
            );
            await page.screenshot({ path: failureScreenshotPath, fullPage: true });
            throw new Error('No gameplay screenshots captured - level may have ended too quickly');
          }
          
          // If special bubbles are enabled, wait a bit more after screenshots to ensure they've had time to spawn
          // Special bubbles start spawning at 10s, so by 25s we should have seen at least one spawn
          if (hasSpecialBubbles) {
            // Check if we're still in gameplay (level hasn't ended)
            const stillInGameplay = await page.evaluate(() => {
              const overlay = document.querySelector('#overlay');
              const overlayVisible = overlay && overlay.style.display !== 'none';
              return !overlayVisible;
            });
            
            if (stillInGameplay) {
              // Wait a bit more to ensure special bubbles have spawned (they start at 10s, spawn every 5s)
              // We've already waited 25s, so we should have seen at least 2 spawns by now
              // But let's wait a bit more to be sure
              await wait(2000); // Wait 2 more seconds
              console.log(`   ⏳ Extended wait for special bubbles (total ~27s)`);
            }
          }

          // Check for "impossible to play" conditions
          const impossibleCheck = await page.evaluate((levelTarget) => {
            // Check 1: No bubbles visible
            const bubblesCount = typeof bubbles !== 'undefined' ? bubbles.length : 0;
            if (bubblesCount === 0) {
              return { impossible: true, reason: 'No bubbles spawned after 5 seconds' };
            }
            
            // Check 2: Visual check - can we see bubbles?
            const canvas = document.querySelector('canvas');
            if (!canvas) {
              return { impossible: true, reason: 'Canvas not found' };
            }
            
            return { impossible: false, bubblesCount };
          }, level.target);
          
          // If bubbles exist, test pop rate with random clicks
          if (!impossibleCheck.impossible && impossibleCheck.bubblesCount > 0) {
            // Simulate 100 random clicks over 10 seconds
            let popsBefore = await page.evaluate(() => typeof score !== 'undefined' ? score : 0);
            
            for (let click = 0; click < 100; click++) {
              // Random click position
              const x = Math.random() * viewport.width;
              const y = Math.random() * viewport.height;
              await page.mouse.click(x, y);
              await wait(100); // 100ms between clicks
            }
            
            let popsAfter = await page.evaluate(() => typeof score !== 'undefined' ? score : 0);
            const popsFromClicks = popsAfter - popsBefore;
            const popRate = popsFromClicks / 100;
            
            // Check pop rate criteria
            if (popRate === 0) {
              impossibleCheck.impossible = true;
              impossibleCheck.reason = `Zero pop rate after 100 random clicks`;
            } else if (level.target >= 20 && popRate < 0.02) {
              // Less than 2% pop rate when target is high
              impossibleCheck.impossible = true;
              impossibleCheck.reason = `Extremely low pop rate (${(popRate * 100).toFixed(1)}%) - need ${(20/1000*100).toFixed(1)}% to reach target`;
            }
            
            impossibleCheck.popsFromClicks = popsFromClicks;
            impossibleCheck.popRate = popRate;
          }
          
          if (impossibleCheck.impossible) {
            // Take failure screenshot BEFORE throwing error (capture the actual failure state)
            await ensureDir(config.screenshotDir);
            const failureScreenshotPath = join(
              rootDir, 
              config.screenshotDir, 
              `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-FAILED.png`
            );
            await page.screenshot({ path: failureScreenshotPath, fullPage: true });
            screenshots.push(failureScreenshotPath); // Include in screenshots array
            
            throw new Error(`Level is impossible to play: ${impossibleCheck.reason}`);
          }

          // Wait a bit for audio to start and gameplay to stabilize
          await wait(2000);
          
          // Final metrics collection
          const memoryEnd = await page.metrics().then(m => m.JSHeapUsedSize || 0);
          const memoryDelta = (memoryEnd - memoryStart) / (1024 * 1024); // Convert to MB
          
          const finalMetrics = await page.evaluate(() => {
            const gameState = {
              score: typeof score !== 'undefined' ? score : 0,
              bubblesCount: typeof bubbles !== 'undefined' ? bubbles.length : 0,
              specialBubblesCount: typeof specialBubbles !== 'undefined' ? specialBubbles.length : 0
            };
            
            // Get FPS from game stats (built into game.js)
            const avgFPS = window.gameStats && window.gameStats.fps !== undefined
              ? window.gameStats.fps
              : null;
            
            // Final audio state
            let audioState = {
              soundtrackPlaying: false,
              soundtrackPaused: false,
              soundtrackPausedOnOverlay: false,
              soundEffectsPlayed: 0,
              audioInitialized: false
            };
            
            if (typeof AudioManager !== 'undefined') {
              audioState.audioInitialized = AudioManager.isInitialized || false;
              
              // Check HTML5 Audio mode (currentSoundtrack is set)
              if (AudioManager.currentSoundtrack) {
                const audio = AudioManager.currentSoundtrack;
                if (audio instanceof HTMLAudioElement) {
                  audioState.soundtrackPlaying = !audio.paused && audio.readyState >= 2;
                  audioState.soundtrackPaused = audio.paused;
                }
              }
              
              // Check Web Audio mode (AudioManager.useWebAudio)
              // Note: In Web Audio mode, currentSoundtrack is null, so we check soundtrackNodes
              if (AudioManager.useWebAudio) {
                // Web Audio mode - check if soundtrack was generated
                const ctx = typeof audioContext !== 'undefined' ? audioContext : null;
                if (ctx && ctx.state === 'running') {
                  // Check if soundtrack nodes exist (from soundtrack.js)
                  if (typeof soundtrackNodes !== 'undefined' && Array.isArray(soundtrackNodes) && soundtrackNodes.length > 0) {
                    audioState.soundtrackPlaying = true;
                    audioState.soundtrackPaused = false;
                  } else if (window.testAudio?.soundtrackStarted) {
                    // Function was called, assume it's playing if context is running
                    audioState.soundtrackPlaying = true;
                    audioState.soundtrackPaused = false;
                  }
                } else if (ctx && ctx.state === 'suspended') {
                  audioState.soundtrackPlaying = false;
                  audioState.soundtrackPaused = true;
                }
              }
              
              audioState.soundtrackStarted = window.testAudio?.soundtrackStarted || false;
              audioState.soundtrackPausedOnOverlay = window.testAudio?.soundtrackPausedOnOverlay || false;
              audioState.soundEffectsPlayed = window.testAudio?.soundEffectsPlayed || 0;
            } else if (typeof audioContext !== 'undefined' && audioContext) {
              // Fallback: check legacy Web Audio (no AudioManager)
              audioState.audioInitialized = audioContext.state !== undefined;
              if (typeof soundtrackNodes !== 'undefined' && Array.isArray(soundtrackNodes) && soundtrackNodes.length > 0) {
                if (audioContext.state === 'running') {
                  audioState.soundtrackPlaying = true;
                  audioState.soundtrackPaused = false;
                } else if (audioContext.state === 'suspended') {
                  audioState.soundtrackPlaying = false;
                  audioState.soundtrackPaused = true;
                }
              }
            }
            
            // Check overlay state
            const overlay = document.querySelector('#overlay');
            const overlayVisible = overlay && overlay.style.display !== 'none';
            
            // If overlay is visible, audio should be paused
            if (overlayVisible && !audioState.soundtrackPaused && audioState.soundtrackStarted) {
              // This is a potential issue - overlay visible but audio still playing
              audioState.soundtrackPausedOnOverlay = false; // Flag as issue
            } else if (overlayVisible && audioState.soundtrackPaused) {
              audioState.soundtrackPausedOnOverlay = true; // Expected behavior
            }
            
            // Count hazards
            let hazardsActive = 0;
            if (typeof hazards !== 'undefined' && Array.isArray(hazards)) {
              hazardsActive = hazards.length;
            }
            
            // Calculate spawn rates (bubbles per second)
            const gameplayDuration = (Date.now() - (window.gameplayStartTime || Date.now())) / 1000;
            const bubbleSpawnRate = gameplayDuration > 0 ? gameState.bubblesCount / gameplayDuration : 0;
            const specialBubbleSpawnRate = gameplayDuration > 0 ? gameState.specialBubblesCount / gameplayDuration : 0;
            
            // UI transition timing (overlay show/hide times)
            const overlayTransitionTimes = window.testAudio?.overlayShownTimes || [];
            
            return {
              bubblesSpawned: gameState.bubblesCount,
              bubblesPopped: gameState.score,
              specialBubblesSpawned: gameState.specialBubblesCount,
              hazardsActive: hazardsActive,
              fps: avgFPS,
              audio: audioState,
              overlayVisible: overlayVisible,
              // Additional metrics from plan requirements
              bubbleSpawnRate: bubbleSpawnRate,
              specialBubbleSpawnRate: specialBubbleSpawnRate,
              overlayTransitionTimes: overlayTransitionTimes
            };
          });
          
          // Add memory delta to metrics
          finalMetrics.memoryDeltaMB = memoryDelta;

          // Calculate gameplay duration (from gameplay start to now)
          const gameplayDuration = (Date.now() - gameplayStartTime) / 1000;

          // Track game state transitions (start → gameplay → win/lose)
          const stateTransitions = [];
          stateTransitions.push({ state: 'start', timestamp: levelStartTime });
          stateTransitions.push({ state: 'gameplay', timestamp: gameplayStartTime });
          
          // Determine outcome and track final state
          const outcome = await page.evaluate(() => {
            const overlay = document.querySelector('#overlay');
            if (overlay && overlay.style.display !== 'none') {
              const overlayText = overlay.textContent || '';
              if (overlayText.includes('Level Complete') || overlayText.includes('You Win')) {
                return 'won';
              } else if (overlayText.includes('Time\'s Up') || overlayText.includes('Failed')) {
                return 'failed';
              }
            }
            return 'unknown';
          });
          
          if (outcome !== 'unknown') {
            stateTransitions.push({ state: outcome, timestamp: Date.now() });
          }
          
          // Calculate transition times
          const transitionTimes = {
            startToGameplay: (gameplayStartTime - levelStartTime) / 1000,
            gameplayToEnd: outcome !== 'unknown' ? (Date.now() - gameplayStartTime) / 1000 : null
          };

          // Level sanity checks - validate level configuration makes sense
          // IMPORTANT: Consider respawn mechanics when validating
          const hasRespawn = level.respawnBubbles === true && level.respawnRate && level.respawnRate > 0;
          const sanityWarnings = [];
          
          if (level.target > level.count) {
            if (hasRespawn) {
              // With respawn, estimate total possible bubbles
              const respawnRate = level.respawnRate || 0;
              const estimatedRespawns = Math.floor(level.time * respawnRate);
              const totalPossibleBubbles = level.count + estimatedRespawns;
              if (totalPossibleBubbles < level.target) {
                sanityWarnings.push(`Target (${level.target}) may be too high - initial count (${level.count}) + estimated respawns (${estimatedRespawns}) = ${totalPossibleBubbles} < target`);
              }
              // If respawn is enabled and total possible bubbles >= target, it's OK, so don't warn
            } else {
              sanityWarnings.push(`Target (${level.target}) > bubble count (${level.count}) - may be impossible (no respawn enabled)`);
            }
          }
          
          if (level.time && level.target) {
            const minTimeNeeded = level.target; // Conservative: 1 pop per second
            if (level.time < minTimeNeeded) {
              if (hasRespawn) {
                // With respawn, recalculate based on total possible bubbles
                const respawnRate = level.respawnRate || 0;
                const estimatedRespawns = Math.floor(level.time * respawnRate);
                const totalPossibleBubbles = (level.count || 0) + estimatedRespawns;
                if (totalPossibleBubbles < level.target) {
                  sanityWarnings.push(`Time (${level.time}s) may be too short for target (${level.target}) - even with respawn (${respawnRate}/s), estimated max bubbles = ${totalPossibleBubbles}`);
                }
              } else {
                sanityWarnings.push(`Time (${level.time}s) may be too short for target (${level.target})`);
              }
            }
          }
          
          if (level.count === 0) {
            if (hasRespawn) {
              sanityWarnings.push(`Initial bubble count is 0 - bubbles will only spawn via respawn (rate: ${level.respawnRate || 0}/s)`);
            } else {
              sanityWarnings.push(`Bubble count is 0 - no bubbles will spawn (respawn disabled)`);
            }
          }
          
          if (level.specialBubbles && level.specialBubbles.enabled && (!level.specialBubbles.types || level.specialBubbles.types.length === 0)) {
            sanityWarnings.push(`Special bubbles enabled but no types specified`);
          }

          // Check console errors for this level
          const levelErrors = consoleErrors.filter(e => !e.level || e.level === level.name);
          
          // Generate warnings for audio issues
          // Note: Audio CAN play in headless mode with --autoplay-policy flag, but may still have issues
          const warnings = [];
          if (finalMetrics.audio && !finalMetrics.audio.soundtrackStarted) {
            if (config.headless) {
              warnings.push('Soundtrack never started (may be expected in headless mode - audio autoplay restrictions)');
            } else {
              warnings.push('Soundtrack never started');
            }
          }
          if (finalMetrics.audio && !finalMetrics.audio.audioInitialized) {
            if (config.headless) {
              warnings.push('Audio not initialized (may be expected in headless mode)');
            } else {
              warnings.push('Audio not initialized');
            }
          }
          
          // Check if special bubbles were expected but didn't spawn (applies to ALL levels)
          if (level.specialBubbles && level.specialBubbles.enabled && finalMetrics.specialBubblesSpawned === 0) {
            warnings.push(`Special bubbles enabled but none spawned (expected ${level.specialBubbles.types?.join(', ') || 'special bubbles'})`);
          }

          testResults.push({
            levelIndex: levelIndex + 1,
            levelName: level.name,
            viewport: viewport.name,
            status: levelErrors.length > 0 ? 'failed' : 'passed',
            loadTime: loadTime,
            gameplayDuration: gameplayDuration,
            outcome: outcome,
            errors: levelErrors.map(e => e.message),
            warnings: warnings,
            screenshots: screenshots,
            metrics: finalMetrics,
            timestamp: new Date().toISOString()
          });

          console.log(`   ✓ Level ${levelIndex + 1} completed (${screenshots.length} screenshots)`);

          // Go back to selector/menu for next level
          if (i < levelsToTest.length - 1) {
            if (config.prodMode) {
              // Production mode: Navigate back to root to show level selector
              // This is more reliable than trying to find back buttons
              await page.goto(`${config.baseUrl}/`, { waitUntil: 'networkidle0' });
              
              // Ensure levels are still unlocked
              await page.evaluate(() => {
                localStorage.setItem('maxUnlockedLevel', '999'); // Unlock all levels
              });
              
              // Wait for level selector to appear
              await page.waitForSelector('#overlay, #level-desc', { timeout: 10000 });
              await wait(2000); // Wait for level selector to render
            } else {
              // Dev mode: Navigate directly back to dev menu
              await page.goto(`${config.baseUrl}/dev`, { waitUntil: 'networkidle0' });
              // Wait for level cards to reload
              await page.waitForSelector('.level-card', { timeout: 10000 });
              await wait(1000);
            }
          }

        } catch (error) {
          console.error(`   ❌ Level ${levelIndex + 1} failed: ${error.message}`);
          
          // Take failure screenshot only if we don't already have one
          // (some errors already captured screenshots before throwing)
          let failureScreenshotPath = null;
          const hasFailureScreenshot = screenshots && screenshots.some(s => s && s.includes('FAILED'));
          
          if (!hasFailureScreenshot) {
            try {
              await ensureDir(config.screenshotDir);
              failureScreenshotPath = join(
                rootDir, 
                config.screenshotDir, 
                `level-${levelIndex + 1}-${level.name.replace(/\s+/g, '-')}-${viewport.name}-FAILED.png`
              );
              
              // Only take screenshot if we're still on the level page (not navigated away)
              const currentUrl = page.url();
              const isOnLevelPage = currentUrl.includes('index.html') || currentUrl.includes('dev.html');
              if (isOnLevelPage) {
                await page.screenshot({ path: failureScreenshotPath, fullPage: true });
                if (!screenshots) screenshots = [];
                screenshots.push(failureScreenshotPath);
              }
            } catch (screenshotError) {
              // Screenshot failed - page might have navigated away, that's ok
              console.log(`   ⚠️  Could not capture failure screenshot (page may have navigated)`);
            }
          } else {
            // We already have a failure screenshot from earlier
            failureScreenshotPath = screenshots.find(s => s && s.includes('FAILED'));
          }

          // Categorize failure type (normalize error message for grouping)
          const errorType = categorizeError(error.message);
          const currentCount = failureTypes.get(errorType) || 0;
          failureTypes.set(errorType, currentCount + 1);

          testResults.push({
            levelIndex: levelIndex + 1,
            levelName: level.name,
            viewport: viewport.name,
            status: 'failed',
            errors: [error.message],
            warnings: [],
            screenshots: screenshots && screenshots.length > 0 ? screenshots : (failureScreenshotPath ? [failureScreenshotPath] : []),
            failureReason: error.message,
            errorType: errorType,
            timestamp: new Date().toISOString()
          });
          
          // Check if we should stop (3+ failures of same type)
          if (failureTypes.get(errorType) >= 3) {
            console.error(`\n⚠️  Stopping test suite: Found ${failureTypes.get(errorType)} failures of type "${errorType}"`);
            console.error(`   This suggests a systemic issue that affects multiple levels.`);
            console.error(`   Fix this issue before continuing with remaining tests.`);
            break; // Stop testing remaining levels
          }
        }
      }

      allTestResults.push(...testResults);

    } catch (error) {
      console.error(`❌ Error testing viewport ${viewport.name}:`, error.message);
      // Continue to next viewport
    } finally {
      // Browser cleanup happens in main cleanup function
    }
  }

    // Generate report
    await generateReport(allTestResults, config, levels);

    // Print summary
    const passed = allTestResults.filter(r => r.status === 'passed').length;
    const failed = allTestResults.filter(r => r.status === 'failed').length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total: ${allTestResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    if (failed > 0) {
      console.log('\n❌ Failed Levels:');
      allTestResults.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   - Level ${r.levelIndex}: ${r.levelName} (${r.viewport})`);
        r.errors.forEach(error => console.log(`     Error: ${error}`));
      });
    }

    const exitCode = failed > 0 ? 1 : 0;
    await cleanup();
    process.exit(exitCode);

  } catch (error) {
    console.error('❌ Test script error:', error);
    await cleanup();
    process.exit(1);
  }
}

async function generateReport(results, config, levels) {
  await ensureDir(config.reportDir);
  
  // Generate a single shared identifier for both Markdown and JSON reports
  const reportId = Date.now();
  const reportHash = `test-run-${reportId}`;
  
  const markdownPath = join(rootDir, config.reportDir, `test-report-${reportId}.md`);
  const jsonPath = join(rootDir, config.reportDir, `test-report-${reportId}.json`);
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const warnings = results.filter(r => r.warnings && r.warnings.length > 0).length;
  
  // Internal data structure for generating both Markdown and JSON
  const report = {
    reportId: reportId,
    reportHash: reportHash,
    timestamp: new Date().toISOString(),
    testRun: reportHash,
    summary: {
      total: results.length,
      passed: passed,
      failed: failed,
      warnings: warnings
    },
    levels: results,
    jsonValidation: {
      levels: { valid: true, errors: [] },
      hazards: { valid: true, errors: [] },
      specialBubbles: { valid: true, errors: [] }
    }
  };

  // Generate JSON report
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to: ${jsonPath}`);
  
  // Generate Markdown report
  await generateMarkdownReport(report, markdownPath, config, levels);
  console.log(`📄 Markdown report saved to: ${markdownPath}`);
}

async function generateMarkdownReport(report, reportPath, config, levels) {
  
  let markdown = `# Test Report\n\n`;
  markdown += `**Run Time**: ${new Date(report.timestamp).toLocaleString()}\n`;
  markdown += `**Test Run ID**: ${report.reportHash}\n`;
  markdown += `**Report ID**: ${report.reportId}\n`;
  markdown += `\n> 💡 This report corresponds to JSON report: \`test-report-${report.reportId}.json\`\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Levels | ${report.summary.total} |\n`;
  markdown += `| ✅ Passed | ${report.summary.passed} |\n`;
  markdown += `| ❌ Failed | ${report.summary.failed} |\n`;
  markdown += `| ⚠️  Warnings | ${report.summary.warnings} |\n\n`;
  
  // What's Broken Section
  const brokenLevels = report.levels.filter(l => l.status === 'failed');
  if (brokenLevels.length > 0) {
    markdown += `## What's Broken ❌\n\n`;
    brokenLevels.forEach(level => {
      markdown += `### Level ${level.levelIndex}: ${level.levelName}${level.viewport ? ` (${level.viewport})` : ''}\n\n`;
      markdown += `**Status**: Failed\n`;
      markdown += `**Error**: ${level.failureReason || level.errors[0] || 'Unknown error'}\n\n`;
      
      // Add fix instructions based on error type
      const fixInstructions = generateFixInstructions(level);
      if (fixInstructions) {
        markdown += `**How to Fix**:\n${fixInstructions}\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  }
  
  // What Works Section
  const workingLevels = report.levels.filter(l => l.status === 'passed');
  if (workingLevels.length > 0) {
    markdown += `## What Works ✅\n\n`;
    markdown += `**${workingLevels.length} level(s) passed successfully:**\n\n`;
    workingLevels.forEach(level => {
      markdown += `- Level ${level.levelIndex}: ${level.levelName}${level.viewport ? ` (${level.viewport})` : ''}\n`;
    });
    markdown += `\n`;
  }
  
  // Detailed Level Results
  markdown += `## Detailed Level Results\n\n`;
  report.levels.forEach(level => {
    const statusIcon = level.status === 'passed' ? '✅' : '❌';
    markdown += `### Level ${level.levelIndex}: ${level.levelName} ${statusIcon}${level.viewport ? ` (${level.viewport})` : ''}\n\n`;
    markdown += `**Status**: ${level.status === 'passed' ? 'Passed' : 'Failed'}\n`;
    if (level.loadTime) markdown += `**Load Time**: ${level.loadTime.toFixed(2)}s\n`;
    if (level.gameplayDuration) {
      markdown += `**Gameplay Duration**: ${level.gameplayDuration.toFixed(1)}s\n`;
    } else {
      markdown += `**Gameplay Duration**: N/A\n`;
    }
    markdown += `**Outcome**: ${level.outcome || (level.status === 'passed' ? 'Won (completed successfully)' : 'Failed')}\n`;
    
    // Game state transitions
    if (level.transitionTimes) {
      markdown += `**State Transitions**: `;
      const transitions = [];
      if (level.transitionTimes.startToGameplay !== undefined) {
        transitions.push(`Start → Gameplay: ${level.transitionTimes.startToGameplay.toFixed(2)}s`);
      }
      if (level.transitionTimes.gameplayToEnd !== null && level.transitionTimes.gameplayToEnd !== undefined) {
        transitions.push(`Gameplay → ${level.outcome === 'won' ? 'Win' : 'Lose'}: ${level.transitionTimes.gameplayToEnd.toFixed(1)}s`);
      }
      markdown += transitions.join(', ') + `\n`;
    }
    markdown += `\n`;
    
    // Warnings (including sanity checks)
    if (level.warnings && level.warnings.length > 0) {
      markdown += `**Warnings**:\n`;
      level.warnings.forEach(warn => markdown += `- ⚠️  ${warn}\n`);
      markdown += `\n`;
    }
    
    // Errors
    if (level.errors && level.errors.length > 0) {
      markdown += `**Errors**:\n`;
      level.errors.forEach(err => markdown += `- \`${err}\`\n`);
      markdown += `\n`;
    }
    
    // Metrics
    if (level.metrics) {
      markdown += `**Metrics**:\n`;
      if (level.metrics.fps !== undefined && level.metrics.fps !== null) {
        const fps = level.metrics.fps;
        let fpsStatus = '';
        if (fps < 30) fpsStatus = ' ❌ Critical';
        else if (fps < 45) fpsStatus = ' ⚠️  Warning';
        else if (fps < 55) fpsStatus = ' ⚠️  Acceptable';
        markdown += `- FPS: ${fps.toFixed(1)} (average)${fpsStatus}\n`;
      }
      if (level.metrics.memoryDeltaMB !== undefined) {
        markdown += `- Memory Delta: ${level.metrics.memoryDeltaMB.toFixed(2)} MB\n`;
      }
      if (level.metrics.bubblesSpawned !== undefined) {
        markdown += `- Bubbles Spawned: ${level.metrics.bubblesSpawned}\n`;
      }
      if (level.metrics.bubblesPopped !== undefined) {
        markdown += `- Bubbles Popped: ${level.metrics.bubblesPopped}\n`;
      }
      if (level.metrics.specialBubblesSpawned !== undefined) {
        markdown += `- Special Bubbles Spawned: ${level.metrics.specialBubblesSpawned}\n`;
        if (level.metrics.specialBubbleSpawnRate !== undefined && level.metrics.specialBubbleSpawnRate > 0) {
          markdown += `- Special Bubble Spawn Rate: ${level.metrics.specialBubbleSpawnRate.toFixed(2)} per second\n`;
        }
      }
      if (level.metrics.hazardsActive !== undefined) {
        markdown += `- Hazards Active: ${level.metrics.hazardsActive}\n`;
      }
      if (level.metrics.bubbleSpawnRate !== undefined && level.metrics.bubbleSpawnRate > 0) {
        markdown += `- Bubble Spawn Rate: ${level.metrics.bubbleSpawnRate.toFixed(2)} per second\n`;
      }
      if (level.metrics.overlayTransitionTimes && level.metrics.overlayTransitionTimes.length > 0) {
        markdown += `- UI Transitions: Overlay shown ${level.metrics.overlayTransitionTimes.length} time(s) at ${level.metrics.overlayTransitionTimes.map(t => new Date(t).toLocaleTimeString()).join(', ')}\n`;
      }
      
      // Audio metrics
      if (level.metrics.audio) {
        const audio = level.metrics.audio;
        markdown += `- Audio: `;
        const audioStatus = [];
        const isHeadless = config.headless !== false;
        if (audio.audioInitialized) {
          if (audio.soundtrackStarted) {
            audioStatus.push(`Soundtrack started ${audio.soundtrackPlaying ? '✅' : '❌'}`);
          } else {
            if (isHeadless) {
              audioStatus.push(`Soundtrack never started ⚠️  (may be expected in headless mode)`);
            } else {
              audioStatus.push(`Soundtrack never started ❌`);
            }
          }
          if (audio.soundtrackPausedOnOverlay !== undefined) {
            if (level.metrics.overlayVisible) {
              audioStatus.push(`Paused on overlay ${audio.soundtrackPausedOnOverlay ? '✅' : '❌'}`);
            }
          }
          if (audio.soundEffectsPlayed !== undefined) {
            audioStatus.push(`Sound effects: ${audio.soundEffectsPlayed} played`);
          }
        } else {
          if (isHeadless) {
            audioStatus.push(`Audio not initialized ⚠️  (may be expected in headless mode)`);
          } else {
            audioStatus.push(`Audio not initialized ❌`);
          }
        }
        markdown += audioStatus.join(', ') + `\n`;
      }
      
      markdown += `\n`;
    }
    
    // Screenshots
    if (level.screenshots && level.screenshots.length > 0) {
      markdown += `**Screenshots**:\n`;
      level.screenshots.forEach((screenshot, idx) => {
        const screenshotPath = typeof screenshot === 'string' ? screenshot : screenshot.path;
        // Screenshots are now in .test-results/screenshots, reports are in .test-results
        // So relative path is just screenshots/filename
        const screenshotFilename = screenshotPath.split(/[/\\]/).pop();
        const relativePath = `screenshots/${screenshotFilename}`;
        markdown += `![Gameplay ${idx + 1}](${relativePath})\n`;
      });
      markdown += `\n`;
    }
    
    // Errors
    if (level.errors && level.errors.length > 0) {
      markdown += `**Errors**:\n`;
      level.errors.forEach(err => markdown += `- \`${err}\`\n`);
      markdown += `\n`;
    }
    
    // Failure reason
    if (level.failureReason) {
      markdown += `**Failure Reason**: ${level.failureReason}\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  // Actionable Insights
  markdown += `## Actionable Insights\n\n`;
  
  const criticalIssues = report.levels.filter(l => l.status === 'failed');
  const performanceIssues = report.levels.filter(l => l.metrics && l.metrics.fps && l.metrics.fps < 30);
  const lowFPSWarnings = report.levels.filter(l => l.metrics && l.metrics.fps && l.metrics.fps >= 30 && l.metrics.fps < 45);
  
  // Audio issues
  const audioIssues = report.levels.filter(l => {
    const audio = l.metrics?.audio;
    if (!audio) return false;
    return !audio.audioInitialized || 
           !audio.soundtrackStarted || 
           (l.metrics.overlayVisible && !audio.soundtrackPausedOnOverlay);
  });
  
  // Gameplay issues
  // Need to check level config to see if special bubbles are actually enabled
  const gameplayIssues = report.levels.filter(l => {
    const m = l.metrics;
    if (!m) return false;
    
    // Check if no bubbles spawned (always an issue)
    if (m.bubblesSpawned === 0 && l.status === 'passed') {
      return true;
    }
    
    // Only flag special bubbles as issue if they're actually enabled for this level
    // We need to check the level config - get level index from report
    if (levels && levels.length > 0) {
      const levelIndex = l.levelIndex - 1; // Convert to 0-indexed
      const levelConfig = levels[levelIndex];
      if (levelConfig && levelConfig.specialBubbles && levelConfig.specialBubbles.enabled) {
        // Special bubbles are enabled, so check if none spawned
        if (m.specialBubblesSpawned === 0 && l.status === 'passed') {
          return true;
        }
      }
    }
    
    return false;
  });
  
  // Memory issues
  const memoryIssues = report.levels.filter(l => {
    const m = l.metrics;
    return m && m.memoryDeltaMB && m.memoryDeltaMB > 10; // > 10MB per level
  });
  
  if (criticalIssues.length > 0) {
    markdown += `### Critical Issues\n`;
    criticalIssues.forEach(level => {
      markdown += `- ❌ **Level ${level.levelIndex}**: ${level.failureReason || 'Failed to start/complete'}\n`;
    });
    markdown += `\n`;
  }
  
  if (performanceIssues.length > 0 || lowFPSWarnings.length > 0) {
    markdown += `### Performance Issues\n`;
    performanceIssues.forEach(level => {
      markdown += `- ⚠️  **Level ${level.levelIndex}**: Critical FPS (${level.metrics.fps.toFixed(1)} average) - unplayable\n`;
    });
    lowFPSWarnings.forEach(level => {
      markdown += `- ⚠️  **Level ${level.levelIndex}**: Low FPS (${level.metrics.fps.toFixed(1)} average) - poor experience\n`;
    });
    markdown += `\n`;
  }
  
  // Report audio issues (audio CAN work in headless with proper flags, but may still have restrictions)
  const isHeadless = config.headless !== false;
  if (audioIssues.length > 0) {
    if (isHeadless) {
      markdown += `### Audio Notes (Headless Mode)\n`;
      markdown += `⚠️  Audio may have issues in headless mode due to autoplay restrictions, even with --autoplay-policy flag.\n\n`;
    } else {
      markdown += `### Audio Issues\n`;
      audioIssues.forEach(level => {
        const audio = level.metrics?.audio;
        const issues = [];
        if (!audio?.audioInitialized) issues.push('Audio not initialized');
        if (!audio?.soundtrackStarted) issues.push('Soundtrack never started');
        if (level.metrics?.overlayVisible && !audio?.soundtrackPausedOnOverlay) {
          issues.push('Audio did not pause on overlay');
        }
        markdown += `- ⚠️  **Level ${level.levelIndex}**: ${issues.join(', ')}\n`;
      });
      markdown += `\n`;
    }
  }
  
  if (gameplayIssues.length > 0) {
    markdown += `### Gameplay Issues\n`;
    gameplayIssues.forEach(level => {
      const m = level.metrics;
      const issues = [];
      if (m.bubblesSpawned === 0) issues.push('No bubbles spawned');
      
      // Only flag special bubbles if they're actually enabled for this level
      if (levels && levels.length > 0) {
        const levelIndex = level.levelIndex - 1; // Convert to 0-indexed
        const levelConfig = levels[levelIndex];
        if (levelConfig && levelConfig.specialBubbles && levelConfig.specialBubbles.enabled) {
          if (m.specialBubblesSpawned === 0 && level.status === 'passed') {
            issues.push('Expected special bubbles but none spawned');
          }
        }
      }
      
      markdown += `- ⚠️  **Level ${level.levelIndex}**: ${issues.join(', ')}\n`;
    });
    markdown += `\n`;
  }
  
  if (memoryIssues.length > 0) {
    markdown += `### Memory Issues\n`;
    memoryIssues.forEach(level => {
      markdown += `- ⚠️  **Level ${level.levelIndex}**: High memory usage (${level.metrics.memoryDeltaMB.toFixed(2)} MB delta) - potential memory leak\n`;
    });
    markdown += `\n`;
  }
  
  if (criticalIssues.length === 0 && performanceIssues.length === 0 && audioIssues.length === 0 && gameplayIssues.length === 0 && memoryIssues.length === 0) {
    markdown += `✅ **All levels passed validation, performance, audio, gameplay, and memory checks**\n\n`;
  } else {
    markdown += `### Recommendations\n`;
    if (criticalIssues.length > 0) {
      markdown += `- Fix critical issues in levels: ${criticalIssues.map(l => l.levelIndex).join(', ')}\n`;
    }
    if (performanceIssues.length > 0 || lowFPSWarnings.length > 0) {
      const allPerfIssues = [...performanceIssues, ...lowFPSWarnings].map(l => l.levelIndex);
      markdown += `- Optimize performance for levels: ${allPerfIssues.join(', ')}\n`;
    }
    if (audioIssues.length > 0) {
      markdown += `- Fix audio issues in levels: ${audioIssues.map(l => l.levelIndex).join(', ')}\n`;
    }
    if (gameplayIssues.length > 0) {
      markdown += `- Fix gameplay issues in levels: ${gameplayIssues.map(l => l.levelIndex).join(', ')}\n`;
    }
    if (memoryIssues.length > 0) {
      markdown += `- Investigate memory leaks in levels: ${memoryIssues.map(l => l.levelIndex).join(', ')}\n`;
    }
    markdown += `\n`;
  }
  
  writeFileSync(reportPath, markdown);
}

// Generate fix instructions based on error type
function generateFixInstructions(level) {
  const errorMsg = (level.failureReason || level.errors[0] || '').toLowerCase();
  const errorType = level.errorType || '';
  
  let instructions = [];
  
  if (errorType === 'Bubble Spawning Issue' || (errorMsg.includes('bubbles') && errorMsg.includes('spawn'))) {
    instructions.push('1. **Check level configuration**: Open `app/data/levels.json` and verify the level has valid `count` and `size` values');
    instructions.push('2. **Check console**: Look for JavaScript errors in browser console that might prevent bubble spawning');
    instructions.push('3. **Verify game state**: Ensure `isRunning === true` and game has initialized properly');
    instructions.push('4. **Test manually**: Load the level in dev mode and check if bubbles appear');
  } else if (errorType === 'Game Initialization Issue' || errorMsg.includes('game did not start')) {
    instructions.push('1. **Check UI elements**: Verify `#ui-layer` or `.hud-top` elements exist in the DOM');
    instructions.push('2. **Check canvas**: Ensure Three.js canvas is rendering (check browser console for WebGL errors)');
    instructions.push('3. **Check game.js**: Look for errors in `startLevel()` function');
    instructions.push('4. **Verify level data**: Check that level JSON is valid and contains required fields');
  } else if (errorType === 'Gameplay Issue' || errorMsg.includes('impossible to play') || errorMsg.includes('pop rate')) {
    instructions.push('1. **Check bubble visibility**: Verify bubbles are actually visible on screen (not hidden or too small)');
    instructions.push('2. **Check interaction**: Test clicking/tapping bubbles manually - are they poppable?');
    instructions.push('3. **Check raycasting**: Verify `handleInteraction()` function is working correctly');
    instructions.push('4. **Check bubble size**: Bubbles might be too small to click - check `size` value in level config');
    instructions.push('5. **Check target**: Verify level target is achievable with current bubble count and spawn rate');
  } else if (errorType === 'Rendering Issue' || errorMsg.includes('canvas') || errorMsg.includes('render')) {
    instructions.push('1. **Check WebGL support**: Verify browser supports WebGL (Three.js requirement)');
    instructions.push('2. **Check console errors**: Look for Three.js initialization errors');
    instructions.push('3. **Check renderer**: Verify `renderer.render()` is being called in `animate()` function');
    instructions.push('4. **Check scene/camera**: Ensure scene and camera are properly initialized');
  } else if (errorType === 'Timeout Issue') {
    instructions.push('1. **Increase timeout**: Level might be taking longer than expected - check if this is normal');
    instructions.push('2. **Check performance**: Level might be too complex - check FPS and optimize if needed');
    instructions.push('3. **Check for infinite loops**: Look for code that might be blocking execution');
  } else if (errorType === 'Audio Issue') {
    instructions.push('1. **Check AudioManager**: Verify `AudioManager.init()` was called');
    instructions.push('2. **Check browser audio policy**: Some browsers require user interaction before audio can play');
    instructions.push('3. **Check audio files**: Verify audio files exist in `app/audio/` directory');
  } else {
    instructions.push('1. **Check error message**: Review the full error message above for specific details');
    instructions.push('2. **Check console**: Open browser console and look for JavaScript errors');
    instructions.push('3. **Test manually**: Try to reproduce the issue manually in the game');
    instructions.push('4. **Check recent changes**: Review recent code changes that might have caused this issue');
  }
  
  // Add diagnostic steps
  instructions.push('\n**Diagnostic Steps**:');
  instructions.push(`- Run \`npm run test:single -- --level=${level.levelIndex}\` to test this level in isolation`);
  instructions.push('- Run with `--headless=false` to see the browser and inspect the issue visually');
  instructions.push('- Check the failure screenshot in `.test-results/screenshots/` directory');
  instructions.push('- Review browser console logs for additional error details');
  
  return instructions.join('\n');
}

main().catch(async (error) => {
  console.error('❌ Test script failed:', error);
  // Try to cleanup on unhandled error
  try {
    const config = loadTestConfig();
    await killPort(config.serverPort || 3001);
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
  process.exit(1);
});
