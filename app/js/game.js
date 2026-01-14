// Game State
let levels = [];
let currentIdx = 0;
let score = 0;
let timeLeft = 0;
let isRunning = false;
let bubbles = [];
let particles = [];
let timer = null;

// Three.js references
let scene, camera, renderer, controls, raycaster;

// Audio context (for sound effects)
let audioContext = null;
let isMuted = false; // Mute state

// Wake Lock
let wakeLock = null;

// Initial camera state (for resetting on level start)
const initialCameraPos = { x: 0, y: 0, z: 25 };
const initialControlsTarget = { x: 0, y: 0, z: 0 };

let specialBubbles = [];
let specialBubbleSpawnTimer = 0;
let slowmoTimer = 0;
let magnetizeTimer = 0;
let magnetizeForce = 0;
let mouseWorldPos = new THREE.Vector3();
let floatingTexts = []; // Array to track floating text elements
let gameConfig = null;
let bubbleNormalMap = null; // Procedural texture for bubbles
let isDevMode = false; // Flag for dev mode testing
let loadingStartTime = Date.now(); // Track when loading started
let pendingClicks = []; // Grace window for missed clicks


/**
 * Create a procedural normal map texture for bubbles
 */
function createBubbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Create radial gradient for subtle surface detail
    const gradient = ctx.createRadialGradient(128, 128, 50, 128, 128, 128);
    gradient.addColorStop(0, '#8888ff');
    gradient.addColorStop(0.5, '#7070aa');
    gradient.addColorStop(1, '#606088');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add subtle noise for texture
    const imageData = ctx.getImageData(0, 0, 256, 256);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 10;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
    }
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

/**
 * Hide the loading screen with fade out animation
 * Ensures minimum 5 second display time on first visit per day
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        const today = new Date().toDateString();
        const lastShown = localStorage.getItem('lastLoadingScreenDate');
        const isFirstVisitToday = lastShown !== today;
        
        const elapsedTime = Date.now() - loadingStartTime;
        const minLoadingTime = isFirstVisitToday ? 5000 : 0; // 5 seconds only on first visit per day
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Mark that we've shown the loading screen today
        if (isFirstVisitToday) {
            localStorage.setItem('lastLoadingScreenDate', today);
        }
        
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            // Remove from DOM after transition completes
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 600);
            
            // Display version if available
            const versionEl = document.getElementById('version-display');
            if (versionEl && typeof window.BUBBLEZAP_VERSION !== 'undefined') {
                versionEl.textContent = `v${window.BUBBLEZAP_VERSION}`;
            }
        }, remainingTime);
    }
}

/**
 * Get the highest level the player has unlocked (0-indexed)
 * Returns 0 for new players (can play level 1)
 */
function getUnlockedLevel() {
    const unlocked = localStorage.getItem('maxUnlockedLevel');
    return unlocked ? parseInt(unlocked) : 0;
}

/**
 * Update the max unlocked level (when player completes a level)
 */
function unlockNextLevel(completedLevel) {
    const currentMax = getUnlockedLevel();
    const newMax = Math.max(currentMax, completedLevel + 1);
    localStorage.setItem('maxUnlockedLevel', newMax);
}

/**
 * Show the level selector screen
 */
function showLevelSelector() {
    const maxUnlocked = getUnlockedLevel();
    
    // Stop soundtrack when showing overlay
    if (typeof stopSoundtrack === 'function') {
        stopSoundtrack();
    }
    
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('victory-finale');
    document.getElementById('main-title').innerText = "SELECT LEVEL";
    document.getElementById('sub-title').innerText = "";
    
    // Build level selector grid
    let selectorHTML = '<div style="padding: 10px;">';
    selectorHTML += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 600px; margin: 0 auto;">';
    
    levels.forEach((lvl, idx) => {
        const isUnlocked = idx <= maxUnlocked;
        const btnStyle = isUnlocked 
            ? 'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #fff; cursor: pointer;'
            : 'background: #333; color: #666; cursor: not-allowed;';
        
        selectorHTML += `
            <button 
                style="${btnStyle} border: 2px solid rgba(255,255,255,0.3); padding: 20px 10px; font-size: 16px; font-weight: 600; border-radius: 8px; transition: all 0.2s;"
                ${isUnlocked ? `onclick="startLevelFromSelector(${idx})"` : 'disabled'}
                ${isUnlocked ? `onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.3)';"` : ''}
                ${isUnlocked ? `onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"` : ''}
            >
                ${isUnlocked ? '🔓' : '🔒'}<br>
                Level ${idx + 1}<br>
                <small style="font-size: 12px; opacity: 0.8;">${lvl.name}</small>
            </button>
        `;
    });
    
    selectorHTML += '</div>';
    
    selectorHTML += '</div>';
    
    document.getElementById('level-desc').innerHTML = selectorHTML;
    
    const btn = document.getElementById('start-btn');
    btn.style.display = 'none'; // Hide the main button
}

/**
 * Start a level from the selector
 */
function startLevelFromSelector(idx) {
    showLevelIntro(idx);
}

/**
 * Load game configuration
 */
function loadGameConfig(callback) {
    fetch('/data/config.json')
        .then(res => {
            if (!res.ok) throw new Error('config.json not found or failed to load');
            return res.json();
        })
        .then(data => {
            gameConfig = data;
            console.log('Game config loaded:', gameConfig);
            if (callback) callback();
        })
        .catch(err => {
            console.error('Failed to load config.json:', err);
            // Use defaults if config fails to load
            gameConfig = {
                interaction: { bubbleHitZoneTolerance: 1.1 }
            };
            if (callback) callback();
        });
}

/**
 * High Score Management - REMOVED
 * High scores are no longer tracked
 */

/**
 * Request wake lock to keep screen awake during gameplay
 */
async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
        console.log('Wake Lock API not supported');
        return;
    }
    
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
        
        // Re-acquire wake lock if it's released
        wakeLock.addEventListener('release', () => {
            console.log('Wake lock was released');
            wakeLock = null;
        });
    } catch (err) {
        console.error('Failed to acquire wake lock:', err);
    }
}

/**
 * Release wake lock when gameplay ends
 */
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().then(() => {
            console.log('Wake lock released');
            wakeLock = null;
        }).catch(err => console.error('Failed to release wake lock:', err));
    }
}

/**
 * Initialize Web Audio API for sound effects
 */
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized:', audioContext.state);
            
            // Add a compressor to prevent clipping/crackling
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-20, audioContext.currentTime);
            compressor.knee.setValueAtTime(10, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            compressor.connect(audioContext.destination);
            
            // Store compressor for sound effects to use
            audioContext.compressor = compressor;
            
            // Safari iOS workaround: create and play a silent buffer
            if (audioContext.state === 'suspended') {
                const silentBuffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = silentBuffer;
                source.connect(audioContext.destination);
                source.start(0);
                source.connect(audioContext.destination);
                source.start(0);
                
                // Then try to resume
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed after silent buffer');
                }).catch(err => {
                    console.error('Failed to resume AudioContext after silent buffer:', err);
                });
            }
        } catch (e) {
            console.error('Failed to create AudioContext:', e);
            return null;
        }
    }
    
    // Resume context if suspended (browser requirement)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed:', audioContext.state);
        }).catch(err => {
            console.error('Failed to resume AudioContext:', err);
        });
    }
    
    return audioContext;
}

/**
 * Play a pop sound effect
 * Uses AudioManager for HTML5 Audio fallback on Safari
 */
function playPopSound() {
    if (isMuted) return; // Check mute state
    
    // Use AudioManager if available (handles Web Audio vs HTML5 Audio)
    if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
        AudioManager.playPopSound();
        return;
    }
    
    // Fallback to Web Audio API (legacy)
    try {
        const ctx = initAudio();
        if (!ctx) {
            console.warn('AudioContext not available');
            return;
        }
        
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        
        // Connect to compressor if available, otherwise destination
        if (ctx.compressor) {
            gain.connect(ctx.compressor);
        } else {
            gain.connect(ctx.destination);
        }
        
        // High-pitched pop sound - reduced volume to prevent clipping
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain.gain.setValueAtTime(0.3, now); // Reduced from 0.8 to 0.3
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.1);
        
        console.log('Pop sound played');
    } catch (e) {
        console.error('Error playing pop sound:', e.message);
    }
}

/**
 * Play a "womp womp" failure sound effect
 * Uses AudioManager for HTML5 Audio fallback on Safari
 */
function playFailSound() {
    if (isMuted) return; // Check mute state
    
    // Use AudioManager if available (handles Web Audio vs HTML5 Audio)
    if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
        AudioManager.playFailSound();
        return;
    }
    
    // Fallback to Web Audio API (legacy)
    try {
        const ctx = initAudio();
        if (!ctx) {
            console.warn('AudioContext not available');
            return;
        }
        
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        
        // Connect to compressor if available, otherwise destination
        if (ctx.compressor) {
            gain.connect(ctx.compressor);
        } else {
            gain.connect(ctx.destination);
        }
        
        // First "womp" - descending tone
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        // Second "womp" - lower descending tone
        osc2.frequency.setValueAtTime(150, now + 0.35);
        osc2.frequency.exponentialRampToValueAtTime(75, now + 0.65);
        
        // Envelope
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        gain.gain.setValueAtTime(0.6, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
        
        osc1.start(now);
        osc1.stop(now + 0.3);
        osc2.start(now + 0.35);
        osc2.stop(now + 0.65);
        
        console.log('Fail sound played');
    } catch (e) {
        console.error('Error playing fail sound:', e.message);
    }
}

/**
 * Create particle burst effect when bubble is popped
 * @param {THREE.Vector3} position - Position to spawn particles
 * @param {number} color - Particle color
 */
function createParticleBurst(position, color) {
    const particleCount = 12;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        // Particle position (starts at bubble center)
        positions.push(position.x, position.y, position.z);
        
        // Particle velocity (radial burst)
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 0.3 + Math.random() * 0.2;
        velocities.push(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * speed
        );
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    
    // Ensure color is a THREE.Color object
    const particleColor = new THREE.Color(color);
    
    const particleMaterial = new THREE.PointsMaterial({
        color: particleColor,
        size: 5.0,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: false,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    
    // Store particle data for animation
    particles.push({
        system: particleSystem,
        positions: new Float32Array(positions),
        velocities: velocities,
        life: 0.6,
        maxLife: 0.6,
        material: particleMaterial
    });
}

/**
 * Create floating text that rises and fades away
 * @param {THREE.Vector3} worldPosition - 3D position in the scene
 * @param {string} text - Text to display
 * @param {string} color - CSS color for the text
 */
function createFloatingText(worldPosition, text, color = '#ffffff') {
    // Convert 3D world position to 2D screen position
    const vector = worldPosition.clone();
    vector.project(camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vector.y) * 0.5 + 0.5) * window.innerHeight;
    
    // Responsive font size - smaller on mobile
    const isMobile = window.innerWidth < 768;
    const fontSize = isMobile ? '18px' : '28px';
    
    // Create text element
    const textEl = document.createElement('div');
    textEl.style.position = 'absolute';
    textEl.style.left = x + 'px';
    textEl.style.top = y + 'px';
    textEl.style.color = color;
    textEl.style.fontSize = fontSize;
    textEl.style.fontWeight = 'bold';
    textEl.style.textShadow = '0 0 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.9)';
    textEl.style.pointerEvents = 'none';
    textEl.style.userSelect = 'none';
    textEl.style.zIndex = '1000';
    textEl.style.transform = 'translate(-50%, -50%)';
    textEl.style.whiteSpace = 'nowrap';
    textEl.style.fontFamily = 'Arial, sans-serif';
    textEl.innerText = text;
    
    document.body.appendChild(textEl);
    
    console.log('Created floating text:', text, 'at', x, y); // Debug log
    
    // Track for animation
    floatingTexts.push({
        element: textEl,
        worldPos: worldPosition.clone(),
        startY: y,
        life: 0,
        maxLife: 1.0, // 1 second - faster to avoid clutter
        startTime: Date.now()
    });
}

/**
 * Initialize the Three.js scene, camera, and renderer
 */
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    // Create bubble texture for subtle surface detail
    bubbleNormalMap = createBubbleTexture();

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    
    // Zoom constraints to keep bubbles clickable and not too large
    // minDistance: prevent bubbles from exceeding 10% of screen
    // maxDistance: ensure bubbles stay large enough to click (min 40px on screen)
    controls.minDistance = 8;   // Closest zoom - bubbles ~8-10% of screen
    controls.maxDistance = 60;  // Farthest zoom - allow full zoom out (levels start at 60)
    
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };
    
    raycaster = new THREE.Raycaster();
    // Increase threshold to make bubbles easier to click (larger hit zone)
    raycaster.params.Points.threshold = 0.5;
    raycaster.params.Line.threshold = 0.5;
    // For mesh objects (our bubbles), we'll use a custom distance check
    
    console.log('scene:', scene);
    console.log('camera:', camera);
    console.log('renderer:', renderer);
    console.log('controls:', controls);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    // Starfield background with subtle grid overlay for rotation visualization
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for(let i=0; i<800; i++) {
        starPos.push(
            (Math.random()-0.5)*250,
            (Math.random()-0.5)*250,
            (Math.random()-0.5)*250
        );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0x666666, size: 0.25})));
    
    // Add very subtle reference dots for depth perception
    // Create a sparse spherical grid of dim dots
    const refDotsGeo = new THREE.BufferGeometry();
    const refDotsPos = [];
    const radius = 35;
    
    // Create sparse latitude/longitude grid
    for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 6) {
        for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 6) {
            const x = radius * Math.cos(lat) * Math.cos(lon);
            const y = radius * Math.sin(lat);
            const z = radius * Math.cos(lat) * Math.sin(lon);
            refDotsPos.push(x, y, z);
        }
    }
    
    refDotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(refDotsPos, 3));
    const refDots = new THREE.Points(refDotsGeo, new THREE.PointsMaterial({
        color: 0x666666,
        size: 1.0,
        transparent: true,
        opacity: 0.6
    }));
    scene.add(refDots);

    // Load levels and start the game (called via callback chain from window.load)
    // loadLevels();
}

/**
 * Load levels from levels.json
 */
function loadLevels() {
    fetch('/data/levels.json')
        .then(res => {
            if (!res.ok) throw new Error('levels.json not found or failed to load');
            return res.json();
        })
        .then(data => {
            levels = data;
            // Parse hex color strings to actual hex numbers
            if (Array.isArray(levels)) {
                levels.forEach(lvl => {
                    if (lvl && typeof lvl.color === 'string') {
                        lvl.color = parseInt(lvl.color, 16);
                    }
                });
            }
            
            // Check for dev mode
            const devMode = localStorage.getItem('devMode') === 'true';
            const devLevel = parseInt(localStorage.getItem('devLevel') || '0');
            
            // Check for dev finale test
            const urlParams = new URLSearchParams(window.location.search);
            const devFinale = urlParams.has('devFinale');
            
            // Hide loading screen
            hideLoadingScreen();
            
            if (devFinale) {
                // Show finale screen directly
                animate();
                currentIdx = levels.length - 1;
                score = 45; // Sample final score
                showDevFinale();
            } else if (devMode) {
                // Clear dev mode flags and set global flag
                localStorage.removeItem('devMode');
                localStorage.removeItem('devLevel');
                isDevMode = true;
                
                // Start the specified level
                animate();
                showLevelIntro(devLevel);
            } else {
                // Normal mode - show level selector
                isDevMode = false;
                animate();
                showLevelSelector();
            }
        })
        .catch(err => {
            console.error('Failed to load levels:', err);
            hideLoadingScreen();
            showErrorOverlay('Could not load levels.json.\n' + err.message);
        });
}

/**
 * Show dev finale screen for testing
 */
function showDevFinale() {
    // Stop soundtrack when showing overlay
    if (typeof stopSoundtrack === 'function') {
        stopSoundtrack();
    }
    
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('overlay').classList.add('victory-finale');
    
    document.getElementById('main-title').innerText = "🎉 CHAMPION 🎉";
    document.getElementById('sub-title').innerText = "GAME COMPLETE";
    
    let victoryMessage = `${levels.length} LEVELS CONQUERED\n\n`;
    victoryMessage += `✨ BUBBLE ZAP MASTER ✨\n\n`;
    victoryMessage += `(Dev Mode Test)\n\n`;
    victoryMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
    victoryMessage += `Created by Neal Shyam (@nealrs)\n`;
    victoryMessage += `© 2026 Neal Shyam. All rights reserved.`;
    
    document.getElementById('level-desc').innerText = victoryMessage;
    
    const btn = document.getElementById('start-btn');
    btn.innerText = "← BACK TO DEV MENU";
    btn.onclick = () => {
        window.location.href = '/dev';
    };
}

/**
 * Display the level introduction overlay
 * @param {number} idx - Level index to display
 */
function showLevelIntro(idx) {
    // Stop any existing game logic
    isRunning = false; 
    if (timer) clearInterval(timer);
    
    // Stop soundtrack when showing overlay
    if (typeof stopSoundtrack === 'function') {
        stopSoundtrack();
    }
    
    // Clean up any selector buttons from previous screens (remove all instances)
    const oldSelectorBtns = document.querySelectorAll('#selector-btn');
    oldSelectorBtns.forEach(btn => btn.remove());
    
    currentIdx = idx;
    const lvl = levels[idx];
    
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('victory-finale');
    document.getElementById('main-title').innerText = lvl.name;
    document.getElementById('sub-title').innerText = `Level ${idx + 1}`;
    document.getElementById('level-desc').innerText = lvl.desc;
    
    const btn = document.getElementById('start-btn');
    btn.style.display = ''; // Make button visible again
    btn.innerText = "START LEVEL";
    btn.onclick = () => {
        // Wake up audio context on user interaction
        initAudio();
        // Play a brief test sound to wake up audio
        try {
            const ctx = audioContext;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume();
            }
        } catch (e) {}
        // Start the level
        startLevel(idx);
    };
    
    // Add "Back to Level Selector" option for normal mode
    if (!isDevMode) {
        const selectorBtn = document.createElement('button');
        selectorBtn.id = 'selector-btn';
        selectorBtn.innerText = "All Levels";
        selectorBtn.style.display = 'block';
        selectorBtn.style.margin = '10px auto 0';
        selectorBtn.style.fontSize = '14px';
        selectorBtn.style.padding = '8px 16px';
        selectorBtn.style.background = 'rgba(255,255,255,0.1)';
        selectorBtn.style.border = '1px solid rgba(255,255,255,0.3)';
        selectorBtn.style.color = 'rgba(255,255,255,0.7)';
        selectorBtn.onclick = () => {
            // Remove the temporary button
            if (document.getElementById('selector-btn')) {
                document.getElementById('selector-btn').remove();
            }
            showLevelSelector();
        };
        btn.parentNode.insertBefore(selectorBtn, btn.nextSibling);
    } else {
        // Dev mode: add back to dev menu button
        const devMenuBtn = document.createElement('button');
        devMenuBtn.id = 'selector-btn';
        devMenuBtn.innerText = "← Dev Menu";
        devMenuBtn.style.marginTop = '15px';
        devMenuBtn.style.display = 'block'; // Force new line
        devMenuBtn.style.width = '100%'; // Full width
        devMenuBtn.style.fontSize = '14px';
        devMenuBtn.style.padding = '8px 16px';
        devMenuBtn.style.background = 'rgba(255,107,107,0.2)';
        devMenuBtn.style.border = '1px solid rgba(255,107,107,0.5)';
        devMenuBtn.style.color = 'rgba(255,107,107,0.9)';
        devMenuBtn.onclick = () => {
            window.location.href = '/dev';
        };
        btn.parentNode.insertBefore(devMenuBtn, btn.nextSibling);
    }
}

/**
 * Start a level and initialize all game elements
 * @param {number} idx - Level index to start
 */
function startLevel(idx) {
    const lvl = levels[idx];
    
    // Safety check
    if (!lvl) {
        console.error('Level not found:', idx);
        return;
    }
    
    // Reset FPS tracking on level start
    if (window.gameStats) {
        window.gameStats.frameCount = 0;
        window.gameStats.lastFPSUpdate = performance.now();
        window.gameStats.fps = 60;
        window.gameStats.frameTimes = [];
    }
    
    // Initialize audio context on first level start
    initAudio();
    
    // Request wake lock to keep screen awake during gameplay
    requestWakeLock();
    
    // Reset camera position and orbit controls
    camera.position.copy(new THREE.Vector3(initialCameraPos.x, initialCameraPos.y, initialCameraPos.z));
    controls.target.copy(new THREE.Vector3(initialControlsTarget.x, initialControlsTarget.y, initialControlsTarget.z));
    controls.reset();
    
    // 1. CLEAR EVERYTHING
    bubbles.forEach(b => scene.remove(b));
    specialBubbles.forEach(b => scene.remove(b));
    clearHazards(scene);
    bubbles = [];
    specialBubbles = [];
    pendingClicks = []; // Clear pending clicks
    
    // Clear floating texts
    floatingTexts.forEach(ft => {
        if (ft.element && ft.element.parentNode) {
            document.body.removeChild(ft.element);
        }
    });
    floatingTexts = [];
    
    // 2. RESET STATE
    score = 0; 
    timeLeft = lvl.time;
    isRunning = true;
    specialBubbleSpawnTimer = 0;

    // 3. UPDATE UI
    document.getElementById('level-el').innerText = idx + 1;
    document.getElementById('score-el').innerText = "0";
    document.getElementById('target-el').innerText = lvl.target;
    document.getElementById('time-el').innerText = timeLeft;
    document.getElementById('overlay').classList.add('hidden');
    
    // Start level soundtrack (if not muted)
    if (!isMuted) {
        // Use AudioManager if available
        if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
            AudioManager.startSoundtrack(idx);
        } else if (audioContext) {
            // Fallback to Web Audio API (legacy)
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed for soundtrack');
                    generateSoundtrack(audioContext, idx);
                });
            } else if (audioContext.state === 'running') {
                generateSoundtrack(audioContext, idx);
            }
        }
    }

    // 4. SPAWN HAZARDS
    lvl.hazards.forEach(hData => {
        createHazard(hData, scene);
    });

    // 5. INITIAL BUBBLE SPAWN
    for(let i=0; i<lvl.count; i++) {
        spawnBubble(lvl);
    }

    // 6. START GAME TIMER
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
}

/**
 * Start a level from a JSON configuration object (for builder/embed mode)
 * @param {object} levelConfig - Level configuration object matching levels.json format
 */
function startLevelFromConfig(levelConfig) {
    // Validate config
    if (!levelConfig) {
        console.error('Invalid level config');
        return;
    }
    
    // Initialize audio context on first level start
    initAudio();
    
    // Request wake lock to keep screen awake during gameplay
    requestWakeLock();
    
    // Reset camera position and orbit controls
    camera.position.copy(new THREE.Vector3(initialCameraPos.x, initialCameraPos.y, initialCameraPos.z));
    controls.target.copy(new THREE.Vector3(initialControlsTarget.x, initialControlsTarget.y, initialControlsTarget.z));
    controls.reset();
    
    // 1. CLEAR EVERYTHING
    bubbles.forEach(b => scene.remove(b));
    specialBubbles.forEach(b => scene.remove(b));
    clearHazards(scene);
    bubbles = [];
    specialBubbles = [];
    pendingClicks = []; // Clear pending clicks
    
    // Clear floating texts
    floatingTexts.forEach(ft => {
        if (ft.element && ft.element.parentNode) {
            document.body.removeChild(ft.element);
        }
    });
    floatingTexts = [];
    
    // 2. RESET STATE
    score = 0; 
    timeLeft = levelConfig.time;
    isRunning = true;
    specialBubbleSpawnTimer = 0;

    // 3. UPDATE UI
    document.getElementById('score-el').innerText = "0";
    document.getElementById('target-el').innerText = levelConfig.target;
    document.getElementById('time-el').innerText = timeLeft;
    
    // Hide overlay if present
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('hidden');
    
    // Update level name if in campaign mode
    const levelEl = document.getElementById('level-el');
    if (levelEl && !window.embedMode) {
        levelEl.innerText = levelConfig.name || 'Custom';
    }
    
    // 4. APPLY LEVEL SETTINGS
    // Camera zoom
    if (levelConfig.cameraZoom) {
        camera.position.z = levelConfig.cameraZoom;
    }
    
    // Auto rotate
    if (controls && levelConfig.autoRotate !== undefined) {
        controls.autoRotate = levelConfig.autoRotate;
    }
    
    // 5. SPAWN HAZARDS
    levelConfig.hazards.forEach(hData => {
        createHazard(hData, scene);
    });

    // 6. INITIAL BUBBLE SPAWN
    for(let i=0; i<levelConfig.count; i++) {
        spawnBubbleInScene(levelConfig, scene, bubbles, bubbleNormalMap);
    }

    // 7. START GAME TIMER
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if(!isRunning) return;
        timeLeft--;
        document.getElementById('time-el').innerText = timeLeft;
        if(timeLeft <= 0) endGame(false);
    }, 1000);
    
    // Store current config for respawn and special bubbles
    window.currentLevelConfig = levelConfig;
}

/**
 * Spawn a single bubble in the scene
 * @param {object} lvl - Level configuration object
 */
function spawnBubble(lvl) {
    spawnBubbleInScene(lvl, scene, bubbles, bubbleNormalMap);
}

/**
 * Spawn a special bubble in the scene
 * @param {object} lvl - Level configuration object
 */
function spawnSpecialBubble(lvl) {
    spawnSpecialBubbleInScene(lvl, scene, specialBubbles, specialBubbleTypes, bubbleNormalMap);
}

/**
 * Game tick - decrements timer and checks for game over
 */
function tick() {
    if(!isRunning) return;
    timeLeft--;
    document.getElementById('time-el').innerText = timeLeft;
    if(timeLeft <= 0) endGame(false);
}

/**
 * End the current level
 * @param {boolean} win - Whether the player won the level
 */
function endGame(win) {
    isRunning = false;
    clearInterval(timer);
    
    // Release wake lock when gameplay ends
    releaseWakeLock();
    
    // Stop soundtrack
    if (typeof stopSoundtrack === 'function') {
        stopSoundtrack();
    }
    
    // Play appropriate sound
    if (!win) {
        playFailSound();
    }
    
    // Clean up any existing selector buttons before adding new ones
    const oldSelectorBtns = document.querySelectorAll('#selector-btn');
    oldSelectorBtns.forEach(btn => btn.remove());
    
    document.getElementById('overlay').classList.remove('hidden');
    
    // Check if this is the final level victory
    const isFinalVictory = win && currentIdx === levels.length - 1 && !isDevMode;
    
    if (isFinalVictory) {
        // EPIC FINAL VICTORY SCREEN - Colorful Celebration
        document.getElementById('main-title').innerText = "🎉 CHAMPION 🎉";
        document.getElementById('sub-title').innerText = "GAME COMPLETE";
        
        let victoryMessage = `${levels.length} LEVELS CONQUERED\n\n`;
        victoryMessage += `✨ BUBBLE ZAP MASTER ✨`;
        
        document.getElementById('level-desc').innerText = victoryMessage;
        
        const btn = document.getElementById('start-btn');
        btn.innerText = "🎮 PLAY AGAIN 🎮";
        btn.onclick = () => {
            // Remove victory animation and go to level selector
            document.getElementById('overlay').classList.remove('victory-finale');
            showLevelSelector();
        };
        
        // Add victory animation class
        document.getElementById('overlay').classList.add('victory-finale');
        
        return;
    }
    
    // Remove victory class if present
    document.getElementById('overlay').classList.remove('victory-finale');
    
    // DEV MODE: Show different options
    if (isDevMode) {
        document.getElementById('main-title').innerText = win ? "✓ PASSED" : "✗ FAILED";
        document.getElementById('sub-title').innerText = `Level ${currentIdx + 1} - ${levels[currentIdx].name}`;
        
        let devDesc = win 
            ? `✓ Level complete!\n` 
            : `✗ Time ran out\n`;
        devDesc += `Time: ${win ? levels[currentIdx].time - timeLeft : levels[currentIdx].time}s\n\n`;
        devDesc += `━━━━━━━━━━━━━━━━━━\n\n`;
        devDesc += `Dev Mode Active`;
        
        document.getElementById('level-desc').innerText = devDesc;
        
        const btn = document.getElementById('start-btn');
        btn.innerText = "← BACK TO DEV MENU";
        btn.onclick = () => {
            window.location.href = '/dev';
        };
        
        return;
    }
    
    // Unlock next level on victory
    if (win) {
        unlockNextLevel(currentIdx);
    }
    
    document.getElementById('main-title').innerText = win ? "VICTORY" : "FAILED";
    document.getElementById('sub-title').innerText = win ? "Level Complete" : "Time Ran Out";
    
    // Build description
    let description = win 
        ? `Level complete!` 
        : `Time ran out. Try again!`;
    
    document.getElementById('level-desc').innerText = description;
    
    const btn = document.getElementById('start-btn');
    if(win && currentIdx < levels.length - 1) {
        // Victory! Show combined results + next level info
        const nextLvl = levels[currentIdx + 1];
        const nextIdx = currentIdx + 1;
        // Combine current level results with next level info
        let combinedDesc = description + '\n\n';
        combinedDesc += `━━━━━━━━━━━━━━━━━━\n`;
        combinedDesc += `Next: Level ${nextIdx + 1} - ${nextLvl.name}\n`;
        combinedDesc += `${nextLvl.desc}\n`;
        combinedDesc += `Target: ${nextLvl.target} pops | Time: ${nextLvl.time}s`;
        document.getElementById('main-title').innerText = "READY?";
        document.getElementById('sub-title').innerText = `Level ${nextIdx + 1}`;
        document.getElementById('level-desc').innerText = combinedDesc;
        btn.innerText = "NEXT LEVEL";
        btn.onclick = () => {
            currentIdx = nextIdx;
            startLevel(nextIdx);
        };
        
        // Add "Back to Level Selector" option
        const selectorBtn = document.createElement('button');
        selectorBtn.id = 'selector-btn';
        selectorBtn.innerText = "All Levels";
        selectorBtn.style.display = 'block';
        selectorBtn.style.margin = '10px auto 0';
        selectorBtn.style.fontSize = '14px';
        selectorBtn.style.padding = '8px 16px';
        selectorBtn.style.background = 'rgba(255,255,255,0.1)';
        selectorBtn.style.border = '1px solid rgba(255,255,255,0.3)';
        selectorBtn.style.color = 'rgba(255,255,255,0.7)';
        selectorBtn.onclick = () => {
            // Remove the temporary button
            if (document.getElementById('selector-btn')) {
                document.getElementById('selector-btn').remove();
            }
            showLevelSelector();
        };
        btn.parentNode.insertBefore(selectorBtn, btn.nextSibling);
    } else {
        btn.innerText = "RETRY LEVEL";
        btn.onclick = () => showLevelIntro(currentIdx);
        
        // Also add selector option on failure
        const selectorBtn = document.createElement('button');
        selectorBtn.id = 'selector-btn';
        selectorBtn.innerText = "All Levels";
        selectorBtn.style.marginTop = '10px';
        selectorBtn.style.fontSize = '14px';
        selectorBtn.style.padding = '8px 16px';
        selectorBtn.style.background = 'rgba(255,255,255,0.1)';
        selectorBtn.style.border = '1px solid rgba(255,255,255,0.3)';
        selectorBtn.style.color = 'rgba(255,255,255,0.7)';
        selectorBtn.onclick = () => {
            // Remove the temporary button
            if (document.getElementById('selector-btn')) {
                document.getElementById('selector-btn').remove();
            }
            showLevelSelector();
        };
        btn.parentNode.insertBefore(selectorBtn, btn.nextSibling);
    }
}

/**
 * Handle mouse/touch interactions for bubble popping
 * @param {number} x - X coordinate of interaction
 * @param {number} y - Y Coordinate of interaction
 */
function handleInteraction(x, y) {
    if (!isRunning) return;
    
    // Raycast for special bubbles first
    const mouse = new THREE.Vector2(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    
    // Store the 3D world position of the click for grace window
    const clickWorldPos = new THREE.Vector3();
    raycaster.ray.at(15, clickWorldPos); // Sample at distance 15 (middle of game space)
    
    let specialIntersects = raycaster.intersectObjects(specialBubbles, false);
    
    // If no direct hit on special bubbles, check for near-miss
    if (specialIntersects.length === 0 && specialBubbles.length > 0) {
        const ray = raycaster.ray;
        const tolerance = gameConfig?.interaction?.bubbleHitZoneTolerance || 1.1;
        
        for (let bubble of specialBubbles) {
            const bubbleRadius = bubble.geometry.parameters.radius;
            const expandedRadius = bubbleRadius * tolerance;
            
            const closestPoint = new THREE.Vector3();
            ray.closestPointToPoint(bubble.position, closestPoint);
            const distance = closestPoint.distanceTo(bubble.position);
            
            if (distance <= expandedRadius) {
                specialIntersects = [{
                    object: bubble,
                    distance: bubble.position.distanceTo(camera.position)
                }];
                break;
            }
        }
    }
    
    if (specialIntersects.length > 0) {
        const b = specialIntersects[0].object;
        const type = b.userData.specialType;
        const def = specialBubbleTypes[type];
        // Remove from scene and array
        scene.remove(b);
        specialBubbles.splice(specialBubbles.indexOf(b), 1);
        // Play pop sound and effect
        playPopSound();
        createParticleBurst(b.position, def ? parseInt(def.color) : 0xffffff);
        
        // All special bubble clicks count toward score
        score++;
        document.getElementById('score-el').innerText = score;
        
        // Apply effect and show floating text
        if (type === 'timebonus') {
            timeLeft += def.effect.amount;
            createFloatingText(b.position, `+${def.effect.amount}s TIME`, '#9d00ff');
        } else if (type === 'pointsbonus') {
            score += def.effect.amount;
            document.getElementById('score-el').innerText = score;
            createFloatingText(b.position, `+${def.effect.amount} POINTS`, '#ffeb3b');
        } else if (type === 'multipop') {
            // Pop N nearest regular bubbles
            let toPop = def.effect.popCount;
            let sorted = bubbles.slice().sort((a, b2) => a.position.distanceTo(b.position) - b2.position.distanceTo(b.position));
            for (let i = 0; i < Math.min(toPop, sorted.length); i++) {
                scene.remove(sorted[i]);
                bubbles.splice(bubbles.indexOf(sorted[i]), 1);
                score++;
                createParticleBurst(sorted[i].position, 0xffffff);
            }
            document.getElementById('score-el').innerText = score;
            createFloatingText(b.position, `MULTI POP x${toPop}`, '#00ffff');
        } else if (type === 'slowmo') {
            slowmoTimer = def.effect.durationSeconds;
            createFloatingText(b.position, `${def.effect.durationSeconds}s SLOW-MO`, '#00ff00');
        } else if (type === 'magnetize') {
            magnetizeTimer = def.effect.durationSeconds;
            magnetizeForce = def.effect.attractionForce;
            createFloatingText(b.position, `${def.effect.durationSeconds}s MAGNET`, '#ff6600');
        }
        // ...add more effects as needed...
        
        // Check for level completion after special bubble effects
        const lvl = window.currentLevelConfig || levels[currentIdx];
        if(lvl && score >= lvl.target) {
            endGame(true);
        }
        
        return;
    }
    // Now raycast for regular bubbles
    raycaster.setFromCamera(mouse, camera);
    let regularIntersects = raycaster.intersectObjects(bubbles, false);
    
    // If no direct hit, check for near-miss within expanded radius
    if (regularIntersects.length === 0) {
        // Create a ray from the camera through the mouse position
        const ray = raycaster.ray;
        const tolerance = gameConfig?.interaction?.bubbleHitZoneTolerance || 1.1;
        
        // Check each bubble for proximity to the ray
        for (let bubble of bubbles) {
            const bubbleRadius = bubble.geometry.parameters.radius;
            const expandedRadius = bubbleRadius * tolerance;
            
            // Calculate closest point on ray to bubble center
            const closestPoint = new THREE.Vector3();
            ray.closestPointToPoint(bubble.position, closestPoint);
            const distance = closestPoint.distanceTo(bubble.position);
            
            if (distance <= expandedRadius) {
                // Create a fake intersect object
                regularIntersects = [{
                    object: bubble,
                    distance: bubble.position.distanceTo(camera.position)
                }];
                break;
            }
        }
    }
    
    if(regularIntersects.length > 0) {
        const obj = regularIntersects[0].object;
        const bubbleColor = obj.material.color.getHex();
        const bubblePosition = obj.position.clone();
        
        scene.remove(obj);
        const idx = bubbles.indexOf(obj);
        if (idx > -1) bubbles.splice(idx, 1);
        
        score++;
        document.getElementById('score-el').innerText = score;
        
        // Play pop sound
        playPopSound();
        
        // Create particle burst effect
        createParticleBurst(bubblePosition, bubbleColor);
        
        // Stronger haptic feedback (pattern: strong-pause-strong)
        if("vibrate" in navigator) {
            navigator.vibrate([50, 30, 100]);
        }
        
        // Check for level completion
        const lvl = window.currentLevelConfig || levels[currentIdx];
        if(lvl && score >= lvl.target) {
            endGame(true);
        }
        
        // Spawn new bubble if respawn is enabled and target not yet reached
        if (lvl && lvl.respawnBubbles && score < lvl.target) {
            spawnBubbleInScene(lvl, scene, bubbles, bubbleNormalMap);
        }
    } else {
        // No bubble hit - add to pending clicks for grace window (100ms)
        const graceWindow = gameConfig?.interaction?.clickGraceWindow || 100;
        pendingClicks.push({
            worldPos: clickWorldPos,
            ray: raycaster.ray.clone(),
            timestamp: performance.now(),
            expiresAt: performance.now() + graceWindow
        });
    }
}

/**
 * Check pending clicks for bubbles that have moved into the click zone
 */
function checkPendingClicks() {
    if (!isRunning || pendingClicks.length === 0) return;
    
    const now = performance.now();
    const tolerance = gameConfig?.interaction?.bubbleHitZoneTolerance || 1.1;
    const graceRadius = 1.5; // World space radius to check around click position
    
    // Remove expired clicks
    pendingClicks = pendingClicks.filter(click => click.expiresAt > now);
    
    // Check each pending click against all bubbles
    for (let i = pendingClicks.length - 1; i >= 0; i--) {
        const click = pendingClicks[i];
        
        // Check special bubbles first
        for (let bubble of specialBubbles) {
            const bubbleRadius = bubble.geometry.parameters.radius;
            const expandedRadius = bubbleRadius * tolerance;
            
            // Check distance from click world position
            const distance = bubble.position.distanceTo(click.worldPos);
            
            if (distance <= expandedRadius + graceRadius) {
                // Found a bubble! Pop it
                const type = bubble.userData.specialType;
                const def = specialBubbleTypes[type];
                scene.remove(bubble);
                specialBubbles.splice(specialBubbles.indexOf(bubble), 1);
                playPopSound();
                createParticleBurst(bubble.position, def ? parseInt(def.color) : 0xffffff);
                
                score++;
                document.getElementById('score-el').innerText = score;
                
                // Apply effect and show floating text
                if (type === 'timebonus') {
                    timeLeft += def.effect.amount;
                    createFloatingText(bubble.position, `+${def.effect.amount}s TIME`, '#9d00ff');
                } else if (type === 'pointsbonus') {
                    score += def.effect.amount;
                    document.getElementById('score-el').innerText = score;
                    createFloatingText(bubble.position, `+${def.effect.amount} POINTS`, '#ffeb3b');
                } else if (type === 'multipop') {
                    let toPop = def.effect.popCount;
                    let sorted = bubbles.slice().sort((a, b2) => a.position.distanceTo(bubble.position) - b2.position.distanceTo(bubble.position));
                    for (let j = 0; j < Math.min(toPop, sorted.length); j++) {
                        scene.remove(sorted[j]);
                        bubbles.splice(bubbles.indexOf(sorted[j]), 1);
                        score++;
                        createParticleBurst(sorted[j].position, 0xffffff);
                    }
                    document.getElementById('score-el').innerText = score;
                    createFloatingText(bubble.position, `MULTI POP x${toPop}`, '#00ffff');
                } else if (type === 'slowmo') {
                    slowmoTimer = def.effect.durationSeconds;
                    createFloatingText(bubble.position, `${def.effect.durationSeconds}s SLOW-MO`, '#00ff00');
                } else if (type === 'magnetize') {
                    magnetizeTimer = def.effect.durationSeconds;
                    magnetizeForce = def.effect.attractionForce;
                    createFloatingText(bubble.position, `${def.effect.durationSeconds}s MAGNET`, '#ff6600');
                }
                
                const lvl = window.currentLevelConfig || levels[currentIdx];
                if(lvl && score >= lvl.target) {
                    endGame(true);
                }
                
                // Remove this click from pending
                pendingClicks.splice(i, 1);
                return; // Only pop one bubble per check
            }
        }
        
        // Check regular bubbles
        for (let bubble of bubbles) {
            const bubbleRadius = bubble.geometry.parameters.radius;
            const expandedRadius = bubbleRadius * tolerance;
            
            // Check distance from click world position
            const distance = bubble.position.distanceTo(click.worldPos);
            
            if (distance <= expandedRadius + graceRadius) {
                // Found a bubble! Pop it
                const bubbleColor = bubble.material.color.getHex();
                const bubblePosition = bubble.position.clone();
                
                scene.remove(bubble);
                const idx = bubbles.indexOf(bubble);
                if (idx > -1) bubbles.splice(idx, 1);
                
                score++;
                document.getElementById('score-el').innerText = score;
                playPopSound();
                createParticleBurst(bubblePosition, bubbleColor);
                
                // Stronger haptic feedback
                if("vibrate" in navigator) {
                    navigator.vibrate([50, 30, 100]);
                }
                
                const lvl = window.currentLevelConfig || levels[currentIdx];
                if(lvl && score >= lvl.target) {
                    endGame(true);
                }
                
                if (lvl && lvl.respawnBubbles && score < lvl.target) {
                    spawnBubbleInScene(lvl, scene, bubbles, bubbleNormalMap);
                }
                
                // Remove this click from pending
                pendingClicks.splice(i, 1);
                return; // Only pop one bubble per check
            }
        }
    }
}

/**
 * Main animation loop - handles physics and rendering
 */
function animate() {
    requestAnimationFrame(animate);
    
    // FPS tracking (for testing, not visible to players)
    if (!window.gameStats) {
        window.gameStats = {
            frameCount: 0,
            lastFPSUpdate: performance.now(),
            fps: 60, // Default
            frameTimes: []
        };
    }
    
    // Update FPS tracking
    const now = performance.now();
    window.gameStats.frameCount++;
    window.gameStats.frameTimes.push(now);
    
    // Calculate FPS every second
    if (now - window.gameStats.lastFPSUpdate >= 1000) {
        const framesInSecond = window.gameStats.frameTimes.filter(t => now - t <= 1000).length;
        window.gameStats.fps = framesInSecond;
        window.gameStats.lastFPSUpdate = now;
        // Keep only recent frame times (last 2 seconds)
        window.gameStats.frameTimes = window.gameStats.frameTimes.filter(t => now - t <= 2000);
    }
    
    if (typeof controls !== 'undefined' && controls) {
        // Apply pulsar rotation effects
        if (isRunning) {
            const pulsarEffect = getPulsarRotationEffect();
            controls.autoRotateSpeed = 0.5 * pulsarEffect.speedMultiplier;
            
            // Apply axis rotation changes to the scene
            if (pulsarEffect.axisRotationVec) {
                scene.rotation.x += pulsarEffect.axisRotationVec.x * 0.01;
                scene.rotation.y += pulsarEffect.axisRotationVec.y * 0.01;
                scene.rotation.z += pulsarEffect.axisRotationVec.z * 0.01;
            }
        }
        controls.update();
    }
    // Guard: only render if renderer, scene, and camera are ready
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    
    if(isRunning) {
        const lvl = window.currentLevelConfig || levels[currentIdx];
        
        // Check pending clicks for grace window
        checkPendingClicks();
        
        // Update bubble physics
        bubbles.forEach(b => {
            // Decrement wormhole immunity timer
            if (b.userData.wormholeImmunity > 0) {
                b.userData.wormholeImmunity -= 1/60; // Assuming 60 FPS
            }
            
            // Apply gravity (bubbles drift toward center)
            b.userData.vel.add(
                b.position.clone().negate().multiplyScalar(lvl.gravity)
            );
            
            // Apply hazard forces
            const hazards = getHazards();
            hazards.forEach(h => {
                applyHazardForce(b, h);
                updateHazardVisuals(h);
            });
            
            // Apply magnetize effect - attract bubbles to mouse/touch position
            if (magnetizeTimer > 0) {
                const dirToMouse = mouseWorldPos.clone().sub(b.position).normalize();
                b.userData.vel.add(dirToMouse.multiplyScalar(magnetizeForce));
            }

            // Apply slowmo speed reduction
            let velocityMultiplier = 1.0;
            if (slowmoTimer > 0) {
                velocityMultiplier = 0.5; // 50% speed during slowmo
            }

            // Update bubble position with velocity (affected by slowmo)
            b.position.add(b.userData.vel.clone().multiplyScalar(velocityMultiplier));
            
            // Bounce off the play area boundary
            if(b.position.length() > 25) {
                b.userData.vel.multiplyScalar(-0.7);
            }
        });
        
        // Special bubble spawn logic - deterministic spawning every X seconds
        // Only start spawning after first 10 seconds of gameplay
        if (lvl.specialBubbles && lvl.specialBubbles.enabled) {
            specialBubbleSpawnTimer += 1/60;
            const elapsedTime = lvl.time - timeLeft;
            const spawnInterval = lvl.specialBubbles.spawnIntervalSeconds || 5;
            
            // Only spawn after 10 second delay and when timer reaches interval
            if (elapsedTime >= 10 && specialBubbleSpawnTimer >= spawnInterval) {
                // Reset timer
                specialBubbleSpawnTimer = 0;
                
                // Spawn if under concurrent limit
                if (specialBubbles.length < (specialBubbleSpawnConfig.level?.maxConcurrent || 3)) {
                    spawnSpecialBubble(lvl);
                }
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1/60; // Assuming 60 FPS
        
        const positions = p.system.geometry.attributes.position.array;
        
        // Update each particle position
        for (let j = 0; j < p.velocities.length; j += 3) {
            const idx = (j / 3) * 3;
            positions[idx] += p.velocities[j];
            positions[idx + 1] += p.velocities[j + 1];
            positions[idx + 2] += p.velocities[j + 2];
            
            // Apply gravity to particles
            p.velocities[j + 1] -= 0.01;
        }
        
        p.system.geometry.attributes.position.needsUpdate = true;
        
        // Fade out particles
        p.material.opacity = Math.max(0, p.life / p.maxLife);
        
        // Remove dead particles
        if (p.life <= 0) {
            scene.remove(p.system);
            particles.splice(i, 1);
        }
    }
    
    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        const elapsed = (Date.now() - ft.startTime) / 1000; // seconds
        ft.life = elapsed;
        
        // Update position (float upward faster)
        const vector = ft.worldPos.clone();
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y) * 0.5 + 0.5) * window.innerHeight - (elapsed * 80); // Rise 80px per second (faster)
        
        ft.element.style.left = x + 'px';
        ft.element.style.top = y + 'px';
        
        // Fade out quickly at the end
        const opacity = Math.max(0, 1 - Math.pow(elapsed / ft.maxLife, 2));
        ft.element.style.opacity = opacity;
        
        // Scale up slightly
        const scale = 1 + (elapsed * 0.2);
        ft.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        // Remove when dead
        if (ft.life >= ft.maxLife) {
            document.body.removeChild(ft.element);
            floatingTexts.splice(i, 1);
        }
    }
    
    // Update special bubbles
    for (let i = specialBubbles.length - 1; i >= 0; i--) {
        const b = specialBubbles[i];
        
        // Check lifetime and remove if expired
        const age = performance.now() - b.userData.spawnTime;
        if (age > b.userData.lifetime) {
            scene.remove(b);
            specialBubbles.splice(i, 1);
            continue;
        }
        
        // Animate visuals (pulse)
        const def = specialBubbleTypes[b.userData.specialType];
        if (def && def.visual && b.material) {
            const scale = def.visual.scale || 1.2;
            const pulse = 1 + Math.sin(performance.now() * def.visual.pulseSpeed) * 0.08;
            b.scale.setScalar(scale * pulse);
        }
        
        // Only apply physics if game is running and level exists
        if (!isRunning || (!window.currentLevelConfig && !levels[currentIdx])) continue;
        
        const lvl = window.currentLevelConfig || levels[currentIdx];
        
        // Physics
        b.userData.vel.add(
            b.position.clone().negate().multiplyScalar(lvl.gravity)
        );
        hazards.forEach(h => {
            const dist = b.position.distanceTo(h.position);
            if(dist < h.userData.r) {
                const dir = new THREE.Vector3().subVectors(h.position, b.position).normalize();
                if(h.userData.type === 'wormhole') {
                    if (b.userData.wormholeImmunity <= 0) {
                        // Teleport to random position within safe spawn area (radius 7)
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * 6; // 0-6 units from center
                        const y = (Math.random() - 0.5) * 12; // ±6 vertical
                        b.position.set(
                            Math.cos(angle) * distance,
                            y,
                            Math.sin(angle) * distance
                        );
                        const velAngle = Math.random() * Math.PI * 2;
                        b.userData.vel.set(
                            Math.cos(velAngle) * 3,
                            (Math.random() - 0.5) * 2,
                            Math.sin(velAngle) * 3
                        );
                        b.userData.wormholeImmunity = 0.5;
                    }
                } else if (h.userData.type === 'repulsor') {
                    // Repulsor: continuous push
                    const dir = new THREE.Vector3().subVectors(h.position, b.position).normalize();
                    b.userData.vel.add(
                        dir.multiplyScalar(-h.userData.s * 2.2)
                    );
                } else {
                    b.userData.vel.add(
                        dir.multiplyScalar(-h.userData.s * 1.8)
                    );
                }
            }
            h.rotation.y += 0.02;
        });
        
        // Apply magnetize effect to special bubbles too
        if (magnetizeTimer > 0) {
            const dirToMouse = mouseWorldPos.clone().sub(b.position).normalize();
            b.userData.vel.add(dirToMouse.multiplyScalar(magnetizeForce));
        }
        
        // Apply slowmo speed reduction
        let velocityMultiplier = 1.0;
        if (slowmoTimer > 0) {
            velocityMultiplier = 0.5; // 50% speed during slowmo
        }
        
        b.position.add(b.userData.vel.clone().multiplyScalar(velocityMultiplier));
        if(b.position.length() > 25) {
            b.userData.vel.multiplyScalar(-0.7);
        }
    }
    
    // Decrement slowmo timer
    if (slowmoTimer > 0) {
        slowmoTimer -= 1/60;
    }
    
    // Decrement magnetize timer
    if (magnetizeTimer > 0) {
        magnetizeTimer -= 1/60;
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Show error overlay with message
 * @param {string} msg - Error message to display
 */
function showErrorOverlay(msg) {
    // Stop soundtrack when showing overlay
    if (typeof stopSoundtrack === 'function') {
        stopSoundtrack();
    }
    
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    document.getElementById('main-title').innerText = 'ERROR';
    document.getElementById('sub-title').innerText = 'Game Failed to Load';
    document.getElementById('level-desc').innerText = msg;
    const btn = document.getElementById('start-btn');
    btn.innerText = 'RELOAD';
    btn.onclick = () => window.location.reload();
}

// Initialize when window loads
window.addEventListener('load', () => {
    // Display version on loading screen
    const loadingVersionEl = document.getElementById('loading-version');
    if (loadingVersionEl && typeof window.BUBBLEZAP_VERSION !== 'undefined') {
        loadingVersionEl.textContent = `v${window.BUBBLEZAP_VERSION}`;
    }
    
    initScene();
    loadGameConfig(() => {
        loadSpecialBubblesConfig(loadLevels);
    });
    // Add click handlers after scene is initialized
    renderer.domElement.addEventListener('click', e => handleInteraction(e.clientX, e.clientY));
    
    // Track mouse position for magnetize effect
    renderer.domElement.addEventListener('mousemove', e => {
        const mouse = new THREE.Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.at(15, mouseWorldPos); // Sample at distance 15 (middle of game space)
    });
    
    // Track touch position for magnetize effect
    renderer.domElement.addEventListener('touchmove', e => {
        if (e.touches.length > 0) {
            const mouse = new THREE.Vector2(
                (e.touches[0].clientX / window.innerWidth) * 2 - 1,
                -(e.touches[0].clientY / window.innerHeight) * 2 + 1
            );
            raycaster.setFromCamera(mouse, camera);
            raycaster.ray.at(15, mouseWorldPos);
        }
    });
    
    // Initialize audio on first user interaction (mobile Safari fix)
    const initAudioOnInteraction = () => {
        initAudio();
        document.removeEventListener('touchstart', initAudioOnInteraction);
        document.removeEventListener('click', initAudioOnInteraction);
    };
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    
    // Mute button handler
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubble popping
            isMuted = !isMuted;
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
            muteBtn.style.opacity = isMuted ? '0.5' : '0.8';
            
            // Update AudioManager mute state if available
            if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
                AudioManager.setMuted(isMuted);
            }
            
            // Handle soundtrack
            if (isMuted) {
                // Stop soundtrack when muting
                if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
                    AudioManager.stopSoundtrack();
                } else if (typeof stopSoundtrack === 'function') {
                    stopSoundtrack();
                }
            } else {
                // Restart soundtrack when unmuting (if game is running)
                if (typeof AudioManager !== 'undefined' && AudioManager.isInitialized) {
                    if (isRunning) {
                        AudioManager.startSoundtrack(currentIdx);
                    }
                } else {
                    if (!audioContext) {
                        initAudio();
                    }
                    if (isRunning && audioContext && typeof generateSoundtrack === 'function') {
                        generateSoundtrack(audioContext, currentIdx);
                    }
                }
            }
            
            console.log('Audio muted:', isMuted);
        });
    }
    
    // Detect embed mode from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    window.embedMode = urlParams.has('embed');
    
    // Listen for postMessage commands (for builder/embed mode)
    window.addEventListener('message', (event) => {
        // Security: In production, check event.origin
        if (event.data && event.data.action === 'loadLevel') {
            const config = event.data.config;
            if (config) {
                console.log('Loading level from builder:', config.name);
                startLevelFromConfig(config);
            }
        } else if (event.data && event.data.action === 'stopLevel') {
            isRunning = false;
            clearInterval(timer);
        }
    });
    
    // If in embed mode, hide UI elements and wait for postMessage
    if (window.embedMode) {
        console.log('Game running in embed mode - waiting for level config');
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.add('hidden');
    }
});
window.addEventListener('resize', handleResize);
window.addEventListener('touchstart', e => handleInteraction(e.touches[0].clientX, e.touches[0].clientY));
