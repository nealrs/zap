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
let gameConfig = null;
let bubbleNormalMap = null; // Procedural texture for bubbles


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
            
            // Safari iOS workaround: create and play a silent buffer
            if (audioContext.state === 'suspended') {
                const silentBuffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = silentBuffer;
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
        gain.connect(ctx.destination);
        
        // High-pitched pop sound
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain.gain.setValueAtTime(0.8, now);
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
        gain.connect(ctx.destination);
        
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
        color: 0x333333,
        size: 0.5,
        transparent: true,
        opacity: 0.3
    }));
    scene.add(refDots);

    // Load levels and start the game
    //loadLevels();
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
            levels.forEach(lvl => {
                if (typeof lvl.color === 'string') {
                    lvl.color = parseInt(lvl.color, 16);
                }
            });
            // High score tracking removed
            animate();
            showLevelIntro(0);
        })
        .catch(err => {
            console.error('Failed to load levels:', err);
            showErrorOverlay('Could not load levels.json.\n' + err.message);
        });
}

/**
 * Display the level introduction overlay
 * @param {number} idx - Level index to display
 */
function showLevelIntro(idx) {
    // Stop any existing game logic
    isRunning = false; 
    if (timer) clearInterval(timer);
    
    currentIdx = idx;
    const lvl = levels[idx];
    
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('main-title').innerText = lvl.name;
    document.getElementById('sub-title').innerText = `Level ${idx + 1}`;
    document.getElementById('level-desc').innerText = lvl.desc;
    
    const btn = document.getElementById('start-btn');
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
}

/**
 * Start a level and initialize all game elements
 * @param {number} idx - Level index to start
 */
function startLevel(idx) {
    const lvl = levels[idx];
    
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
    clearHazards(scene);
    bubbles = [];
    specialBubbles = [];
    
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
        transmission: 0.5,
        roughness: 0.1,
        transparent: true,
        opacity: 1.0,
        normalMap: bubbleNormalMap,
        normalScale: new THREE.Vector2(0.4, 0.4)
    });
    const b = new THREE.Mesh(geo, mat);
    
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
    
    // Play appropriate sound
    if (!win) {
        playFailSound();
    }
    
    document.getElementById('overlay').classList.remove('hidden');
    
    // Check if this is the final level victory
    const isFinalVictory = win && currentIdx === levels.length - 1;
    
    if (isFinalVictory) {
        // EPIC FINAL VICTORY SCREEN - Arcade Style
        document.getElementById('main-title').innerText = "★ CHAMPION ★";
        document.getElementById('sub-title').innerText = "ALL LEVELS CONQUERED";
        
        let victoryMessage = `╔═══════════════════════════╗\n`;
        victoryMessage += `║  CONGRATULATIONS PILOT!   ║\n`;
        victoryMessage += `╚═══════════════════════════╝\n\n`;
        victoryMessage += `You've mastered all hazards:\n`;
        victoryMessage += `✓ Comets    ✓ Wormholes\n`;
        victoryMessage += `✓ Repulsors ✓ Bumpers\n\n`;
        victoryMessage += `Total Levels Completed: ${levels.length}\n`;
        victoryMessage += `Final Score: ${score} pops\n\n`;
        victoryMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        victoryMessage += `You are a true\n`;
        victoryMessage += `BUBBLE ZAP MASTER!`;
        
        document.getElementById('level-desc').innerText = victoryMessage;
        
        const btn = document.getElementById('start-btn');
        btn.innerText = "🎮 PLAY AGAIN 🎮";
        btn.onclick = () => {
            currentIdx = 0;
            showLevelIntro(0);
        };
        
        // Add victory animation class
        document.getElementById('overlay').classList.add('victory-finale');
        
        return;
    }
    
    // Remove victory class if present
    document.getElementById('overlay').classList.remove('victory-finale');
    
    document.getElementById('main-title').innerText = win ? "VICTORY" : "FAILED";
    document.getElementById('sub-title').innerText = win ? "Level Complete" : "Time Ran Out";
    
    // Build description with score
    let description = win 
        ? `Successfully popped ${score} bubbles.` 
        : `You popped ${score} bubbles. Goal was ${levels[currentIdx].target}.`;
    
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
        btn.innerText = "BEGIN NEXT LEVEL";
        btn.onclick = () => {
            currentIdx = nextIdx;
            startLevel(nextIdx);
        };
    } else {
        btn.innerText = "RETRY LEVEL";
        btn.onclick = () => showLevelIntro(currentIdx);
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
        }
        // ...add more effects as needed...
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
        
        // Enhanced haptic feedback (pattern: short-short-long)
        if("vibrate" in navigator) {
            navigator.vibrate([30, 50, 50]);
        }
        
        // Check for level completion
        if(score >= levels[currentIdx].target) {
            endGame(true);
        }
        
        // Spawn new bubble if respawn is enabled and target not yet reached
        if (levels[currentIdx].respawnBubbles && score < levels[currentIdx].target) {
            spawnBubble(levels[currentIdx]);
        }
    }
}

/**
 * Main animation loop - handles physics and rendering
 */
function animate() {
    requestAnimationFrame(animate);
    if (typeof controls !== 'undefined' && controls) {
        controls.update();
    }
    // Guard: only render if renderer, scene, and camera are ready
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    
    if(isRunning) {
        const lvl = levels[currentIdx];
        
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

            // Update bubble position
            b.position.add(b.userData.vel);
            
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
        // Animate visuals (pulse)
        const def = specialBubbleTypes[b.userData.specialType];
        if (def && def.visual && b.material) {
            const scale = def.visual.scale || 1.2;
            const pulse = 1 + Math.sin(performance.now() * def.visual.pulseSpeed) * 0.08;
            b.scale.setScalar(scale * pulse);
        }
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
        b.position.add(b.userData.vel);
        if(b.position.length() > 25) {
            b.userData.vel.multiplyScalar(-0.7);
        }
    }
    
    // Apply slowmo effect
    if (slowmoTimer > 0) {
        slowmoTimer -= 1/60;
        // Reduce all bubble velocities
        bubbles.forEach(b => {
            b.userData.vel.multiplyScalar(0.98);
        });
        specialBubbles.forEach(b => {
            b.userData.vel.multiplyScalar(0.98);
        });
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
