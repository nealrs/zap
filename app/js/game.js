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
    
    // Add credits
    selectorHTML += '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-size: 14px; line-height: 1.6;">';
    selectorHTML += 'Created by <a href="https://nealshyam.com" target="_blank" rel="noopener" style="color: #a78bfa; text-decoration: none;">Neal Shyam</a> ';
    selectorHTML += '(<a href="https://github.com/nealrs" target="_blank" rel="noopener" style="color: #a78bfa; text-decoration: none;">@nealrs</a>)<br>';
    selectorHTML += '© 2026 Neal Shyam. All rights reserved.';
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
 * Play a pop sound effect using Web Audio API
 */
function playPopSound() {
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
 */
function playFailSound() {
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
    
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.3,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
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
    controls.maxDistance = 50;  // Farthest zoom - bubbles still ~2-3% of screen (clickable)
    
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
    
    // Start level soundtrack
    if (audioContext) {
        // Resume context if suspended (required on mobile browsers)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed for soundtrack');
                generateSoundtrack(audioContext, idx);
            });
        } else if (audioContext.state === 'running') {
            generateSoundtrack(audioContext, idx);
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
 * Spawn a single bubble in the scene
 * @param {object} lvl - Level configuration object
 */
function spawnBubble(lvl) {
    const geo = new THREE.SphereGeometry(lvl.size, 16, 16);
    const mat = new THREE.MeshPhysicalMaterial({ 
        color: lvl.color,
        emissive: lvl.color,
        emissiveIntensity: 0.4,
        transmission: 0.3,
        roughness: 0.2, 
        transparent: true,
        opacity: 1.0,
        normalMap: bubbleNormalMap,
        normalScale: new THREE.Vector2(0.3, 0.3)
    });
    const b = new THREE.Mesh(geo, mat);
    
    // Calculate safe spawn area based on camera frustum at minDistance (closest zoom)
    // FOV = 60°, minDistance = 8
    // Visible height at minDistance = 2 * tan(30°) * 8 ≈ 9.24
    // Use 80% of that to keep bubbles comfortably in view: 7.4
    const spawnRadius = 7;
    
    b.position.set(
        (Math.random()-0.5) * spawnRadius * 2,
        (Math.random()-0.5) * spawnRadius * 2,
        (Math.random()-0.5) * spawnRadius * 2
    );
    b.userData = b.userData || {};
    b.userData.vel = new THREE.Vector3(
        (Math.random()-0.5)*0.1,
        (Math.random()-0.5)*0.1,
        (Math.random()-0.5)*0.1
    );
    // Wormhole immunity: when a bubble is teleported, it becomes immune for 0.5 seconds
    b.userData.wormholeImmunity = 0;
    scene.add(b);
    bubbles.push(b);
}

/**
 * Spawn a special bubble in the scene
 * @param {object} lvl - Level configuration object
 */
function spawnSpecialBubble(lvl) {
    if (!lvl.specialBubbles || !lvl.specialBubbles.enabled) return;
    const types = lvl.specialBubbles.types || [];
    if (types.length === 0) return;
    // Pick a random type from allowed
    const type = types[Math.floor(Math.random() * types.length)];
    const def = specialBubbleTypes[type];
    if (!def) return;
    const geo = new THREE.SphereGeometry(lvl.size * (def.visual?.scale || 1.2), 16, 16);
    const mat = new THREE.MeshPhysicalMaterial({
        color: parseInt(def.color),
        emissive: def.visual?.glowColor || parseInt(def.color),
        emissiveIntensity: def.visual?.glowIntensity || 0.7,
        transmission: 0.3,
        roughness: 0.05,
        metalness: 0.3,
        transparent: true,
        opacity: 0.95,
        normalMap: bubbleNormalMap,
        normalScale: new THREE.Vector2(0.8, 0.8),
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
    const b = new THREE.Mesh(geo, mat);
    
    // Add glowing ring around special bubbles for extra distinction
    const ringGeo = new THREE.TorusGeometry(lvl.size * (def.visual?.scale || 1.2) * 1.1, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
        color: def.visual?.glowColor || parseInt(def.color),
        transparent: true,
        opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    b.add(ring);
    b.userData.ring = ring;
    
    // Use same safe spawn area as regular bubbles
    const spawnRadius = 7;
    
    b.position.set(
        (Math.random()-0.5) * spawnRadius * 2,
        (Math.random()-0.5) * spawnRadius * 2,
        (Math.random()-0.5) * spawnRadius * 2
    );
    b.userData = b.userData || {};
    b.userData.vel = new THREE.Vector3(
        (Math.random()-0.5)*0.1,
        (Math.random()-0.5)*0.1,
        (Math.random()-0.5)*0.1
    );
    b.userData.special = true;
    b.userData.specialType = type;
    b.userData.wormholeImmunity = 0;
    b.userData.spawnTime = performance.now();
    b.userData.lifetime = (def.lifetime || 5) * 1000; // Convert seconds to milliseconds
    scene.add(b);
    specialBubbles.push(b);
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
        
        // Apply effect
        if (type === 'timebonus') {
            timeLeft += def.effect.amount;
        } else if (type === 'pointsbonus') {
            score += def.effect.amount;
            document.getElementById('score-el').innerText = score;
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
        } else if (type === 'slowmo') {
            slowmoTimer = def.effect.durationSeconds;
        } else if (type === 'magnetize') {
            magnetizeTimer = def.effect.durationSeconds;
            magnetizeForce = def.effect.attractionForce;
        }
        // ...add more effects as needed...
        
        // Check for level completion after special bubble effects
        if(score >= levels[currentIdx].target) {
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
        if(score >= levels[currentIdx].target) {
            endGame(true);
        }
        
        // Spawn new bubble if respawn is enabled and target not yet reached
        if (levels[currentIdx].respawnBubbles && score < levels[currentIdx].target) {
            spawnBubble(levels[currentIdx]);
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
                
                // Apply effect
                if (type === 'timebonus') {
                    timeLeft += def.effect.amount;
                } else if (type === 'pointsbonus') {
                    score += def.effect.amount;
                    document.getElementById('score-el').innerText = score;
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
                } else if (type === 'slowmo') {
                    slowmoTimer = def.effect.durationSeconds;
                } else if (type === 'magnetize') {
                    magnetizeTimer = def.effect.durationSeconds;
                    magnetizeForce = def.effect.attractionForce;
                }
                
                if(score >= levels[currentIdx].target) {
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
                
                if(score >= levels[currentIdx].target) {
                    endGame(true);
                }
                
                if (levels[currentIdx].respawnBubbles && score < levels[currentIdx].target) {
                    spawnBubble(levels[currentIdx]);
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
        const lvl = levels[currentIdx];
        
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
        if (!isRunning || !levels[currentIdx]) continue;
        
        const lvl = levels[currentIdx];
        
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
});
window.addEventListener('resize', handleResize);
window.addEventListener('touchstart', e => handleInteraction(e.touches[0].clientX, e.touches[0].clientY));
