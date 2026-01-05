// BubbleZap 3D Level Builder
// Handles level configuration and sends to game iframe

let gameIframe = null;
let allLevels = []; // Store loaded levels from levels.json
let specialBubbleTypesData = {};
let hazardTypesData = {};
let isUpdatingFromJson = false; // Prevent circular updates

// Update slider display value
function updateSliderValue(id, value) {
    const displayId = id + '-val';
    const displayEl = document.getElementById(displayId);
    if (displayEl) {
        // Format the value based on the slider
        if (id === 'gravity') {
            displayEl.textContent = parseFloat(value).toFixed(5);
        } else if (id === 'size' || id === 'spawn-radius' || id === 'respawn-rate') {
            displayEl.textContent = parseFloat(value).toFixed(1);
        } else {
            displayEl.textContent = value;
        }
    }
}

// Update hazard slider value
function updateHazardSlider(hazardId, field, value) {
    const displayId = `hazard-${hazardId}-${field}-val`;
    const displayEl = document.getElementById(displayId);
    if (displayEl) {
        if (field === 's' || field === 'moveSpeed') {
            displayEl.textContent = parseFloat(value).toFixed(3);
        } else if (field === 'r') {
            displayEl.textContent = parseFloat(value).toFixed(1);
        } else {
            displayEl.textContent = value;
        }
    }
}

// Initialize the builder
function init() {
    // Load special bubbles and hazards config
    loadSpecialBubblesConfig(() => {
        specialBubbleTypesData = specialBubbleTypes;
        populateSpecialBubbleTypes();
    });
    
    // Initialize hazard types
    hazardTypesData = {
        'comet': { name: 'Comet', params: ['pos', 'r', 's', 'moveSpeed'] },
        'wormhole': { name: 'Wormhole', params: ['pos', 'r', 's'] },
        'repulsor': { name: 'Repulsor', params: ['pos', 'r', 's'] },
        'pulsar': { name: 'Pulsar', params: ['pos', 'r', 's', 'changeInterval'] }
    };

    // Get reference to game iframe
    gameIframe = document.getElementById('game-iframe');
    
    // Load existing levels from levels.json
    loadAllLevels();
    
    // Add event listeners
    document.getElementById('special-enabled').addEventListener('change', (e) => {
        document.getElementById('special-config').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Add input listeners to sync UI changes to JSON editor
    addUIListeners();
    
    // Initialize JSON editor with default level
    updateJsonEditor();
}

function loadAllLevels() {
    fetch('/data/levels.json')
        .then(response => response.json())
        .then(levels => {
            allLevels = levels;
            populateLevelSelector();
        })
        .catch(error => console.error('Error loading levels:', error));
}

function populateLevelSelector() {
    const selector = document.getElementById('level-selector');
    allLevels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Level ${index + 1}: ${level.name}`;
        selector.appendChild(option);
    });
}

function loadExistingLevel(index) {
    if (index === '') {
        // Reset to default
        resetLevel();
        return;
    }
    
    const level = allLevels[parseInt(index)];
    if (!level) return;
    
    isUpdatingFromJson = true;
    
    // Populate UI from level data
    document.getElementById('level-name').value = level.name;
    document.getElementById('level-desc').value = level.desc || '';
    document.getElementById('target').value = level.target;
    document.getElementById('time').value = level.time;
    document.getElementById('count').value = level.count;
    document.getElementById('size').value = level.size;
    document.getElementById('gravity').value = level.gravity;
    document.getElementById('spawn-radius').value = level.spawnRadius;
    document.getElementById('camera-zoom').value = level.cameraZoom || 40;
    document.getElementById('auto-rotate').checked = level.autoRotate !== undefined ? level.autoRotate : true;
    document.getElementById('color').value = level.color.replace('0x', '#');
    document.getElementById('respawn-bubbles').checked = level.respawnBubbles || false;
    document.getElementById('respawn-rate').value = level.respawnRate || 0;
    document.getElementById('special-enabled').checked = level.specialBubbles?.enabled || false;
    
    // Update all slider displays
    updateSliderValue('target', level.target);
    updateSliderValue('time', level.time);
    updateSliderValue('count', level.count);
    updateSliderValue('size', level.size);
    updateSliderValue('gravity', level.gravity);
    updateSliderValue('spawn-radius', level.spawnRadius);
    updateSliderValue('camera-zoom', level.cameraZoom || 40);
    updateSliderValue('respawn-rate', level.respawnRate || 0);
    
    // Clear and reload hazards
    document.getElementById('hazards-list').innerHTML = '';
    level.hazards.forEach(hazard => {
        addHazardFromData(hazard);
    });
    
    isUpdatingFromJson = false;
    
    // Update JSON editor
    updateJsonEditor();
    
    // Trigger rebuild
    applyLevel();
}

function addUIListeners() {
    // Add listeners to all form inputs to update JSON on change
    const inputs = document.querySelectorAll('#config-panel input, #config-panel textarea, #config-panel select');
    inputs.forEach(input => {
        const eventType = input.type === 'range' ? 'input' : 'change';
        input.addEventListener(eventType, () => {
            if (!isUpdatingFromJson) {
                updateJsonEditor();
            }
        });
    });
}

function updateJsonEditor() {
    if (isUpdatingFromJson) return; // Prevent loops
    const config = buildLevelConfig();
    const jsonEditor = document.getElementById('json-editor');
    if (jsonEditor) {
        jsonEditor.value = JSON.stringify(config, null, 2);
    }
}

let jsonDebounceTimer = null;
function debouncedApplyJson() {
    // Clear existing timer
    if (jsonDebounceTimer) {
        clearTimeout(jsonDebounceTimer);
    }
    
    // Validate JSON first (visual feedback only, don't apply if invalid)
    const jsonEditor = document.getElementById('json-editor');
    try {
        JSON.parse(jsonEditor.value);
        jsonEditor.style.borderColor = '#4facfe'; // Valid - blue border
        
        // Set new timer to apply after 1 second of no typing
        jsonDebounceTimer = setTimeout(() => {
            applyJsonToUI();
        }, 1000);
    } catch (error) {
        jsonEditor.style.borderColor = '#ff4b2b'; // Invalid - red border
    }
}

function copyJsonToClipboard() {
    const jsonEditor = document.getElementById('json-editor');
    jsonEditor.select();
    document.execCommand('copy');
    
    // Visual feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 1000);
}

function applyJsonToUI() {
    try {
        const jsonEditor = document.getElementById('json-editor');
        const config = JSON.parse(jsonEditor.value);
        
        isUpdatingFromJson = true;
        
        // Populate UI from JSON
        document.getElementById('level-name').value = config.name || '';
        document.getElementById('level-desc').value = config.desc || '';
        document.getElementById('target').value = config.target || 12;
        document.getElementById('time').value = config.time || 40;
        document.getElementById('count').value = config.count || 15;
        document.getElementById('size').value = config.size || 1.2;
        document.getElementById('gravity').value = config.gravity || 0.00008;
        document.getElementById('spawn-radius').value = config.spawnRadius || 8;
        document.getElementById('camera-zoom').value = config.cameraZoom || 40;
        document.getElementById('auto-rotate').checked = config.autoRotate !== undefined ? config.autoRotate : true;
        document.getElementById('color').value = (config.color || '0xffff00').replace('0x', '#');
        document.getElementById('respawn-bubbles').checked = config.respawnBubbles || false;
        document.getElementById('respawn-rate').value = config.respawnRate || 0;
        document.getElementById('special-enabled').checked = config.specialBubbles?.enabled || false;
        
        // Show/hide special bubbles section
        document.getElementById('special-config').style.display = config.specialBubbles?.enabled ? 'block' : 'none';
        
        // Update slider displays
        updateSliderValue('target', config.target || 12);
        updateSliderValue('time', config.time || 40);
        updateSliderValue('count', config.count || 15);
        updateSliderValue('size', config.size || 1.2);
        updateSliderValue('gravity', config.gravity || 0.00008);
        updateSliderValue('spawn-radius', config.spawnRadius || 8);
        updateSliderValue('camera-zoom', config.cameraZoom || 40);
        updateSliderValue('respawn-rate', config.respawnRate || 0);
        
        // Clear and reload hazards
        document.getElementById('hazards-list').innerHTML = '';
        if (config.hazards) {
            config.hazards.forEach(hazard => {
                addHazardFromData(hazard);
            });
        }
        
        isUpdatingFromJson = false;
        
        // Trigger rebuild
        applyLevel();
        
        // Reset border color to indicate success
        jsonEditor.style.borderColor = '#4facfe';
        
    } catch (error) {
        console.error('Invalid JSON:', error);
        jsonEditor.style.borderColor = '#ff4b2b';
        // Don't show alert - user is still editing
    }
}

function addHazardFromData(hazard) {
    // This will be implemented below - adds a hazard to the UI from data
    const hazardsList = document.getElementById('hazards-list');
    const hazardCount = hazardsList.children.length;
    
    if (hazardCount >= 2) {
        return;
    }
    
    const hazardId = Date.now();
    const hazardDiv = document.createElement('div');
    hazardDiv.className = 'hazard-item';
    hazardDiv.dataset.id = hazardId;
    
    hazardDiv.innerHTML = `
        <div class="hazard-header">
            <select class="hazard-type" onchange="updateHazardFields(${hazardId})">
                <option value="comet" ${hazard.type === 'comet' ? 'selected' : ''}>Comet</option>
                <option value="wormhole" ${hazard.type === 'wormhole' ? 'selected' : ''}>Wormhole</option>
                <option value="repulsor" ${hazard.type === 'repulsor' ? 'selected' : ''}>Repulsor</option>
                <option value="pulsar" ${hazard.type === 'pulsar' ? 'selected' : ''}>Pulsar</option>
            </select>
            <button class="btn-remove" onclick="removeHazard(${hazardId})">✕</button>
        </div>
        <div class="hazard-fields">
            <div class="form-group">
                <label>Position (x,y,z)</label>
                <input type="text" class="hazard-pos" value="${hazard.pos.join(', ')}" placeholder="0, 0, 0">
            </div>
            <div class="form-group">
                <label>Radius: <span id="hazard-${hazardId}-r-val">${hazard.r}</span></label>
                <input type="range" class="hazard-r" value="${hazard.r}" min="3" max="15" step="0.5" oninput="updateHazardSlider(${hazardId}, 'r', this.value)">
            </div>
            <div class="form-group">
                <label>Strength: <span id="hazard-${hazardId}-s-val">${hazard.s.toFixed(3)}</span></label>
                <input type="range" class="hazard-s" value="${hazard.s}" min="0.001" max="0.15" step="0.001" oninput="updateHazardSlider(${hazardId}, 's', this.value)">
            </div>
            ${hazard.type === 'comet' ? `
                <div class="form-group">
                    <label>Move Speed: <span id="hazard-${hazardId}-moveSpeed-val">${hazard.moveSpeed?.toFixed(3) || '0.030'}</span></label>
                    <input type="range" class="hazard-moveSpeed" value="${hazard.moveSpeed || 0.03}" min="0.01" max="0.1" step="0.001" oninput="updateHazardSlider(${hazardId}, 'moveSpeed', this.value)">
                </div>
            ` : ''}
            ${hazard.type === 'pulsar' ? `
                <div class="form-group">
                    <label>Change Interval (s): <span id="hazard-${hazardId}-changeInterval-val">${hazard.changeInterval || 3}</span></label>
                    <input type="range" class="hazard-changeInterval" value="${hazard.changeInterval || 3}" min="1" max="10" step="1" oninput="updateHazardSlider(${hazardId}, 'changeInterval', this.value)">
                </div>
            ` : ''}
        </div>
    `;
    
    hazardsList.appendChild(hazardDiv);
    
    // Update add button state
    document.getElementById('add-hazard').disabled = hazardCount + 1 >= 2;
}

function setupScene() {
    const container = document.getElementById('game-canvas');
    const width = 375;
    const height = 667;
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
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
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 25; // Start with widest angle
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Match game.js performance
    
    // OrbitControls for rotation and zoom
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true; // Default to on
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 10;
    controls.maxDistance = 40;
    controls.enablePan = false; // Disable panning
    
    // Raycaster for click detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
}

function onCanvasClick(event) {
    if (gameState !== 'running') return;
    
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    checkBubbleClick();
}

function onCanvasTouch(event) {
    if (gameState !== 'running') return;
    event.preventDefault();
    
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    
    // Calculate touch position in normalized device coordinates
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    checkBubbleClick();
}

function checkBubbleClick() {
    if (!currentLevel || gameState !== 'running') return;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with bubbles
    const activeBubbles = bubbles.filter(b => !b.popped).map(b => b.mesh);
    const intersects = raycaster.intersectObjects(activeBubbles);
    
    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const bubble = bubbles.find(b => b.mesh === clickedMesh);
        
        if (bubble && !bubble.popped) {
            popBubble(bubble);
        }
    }
}

function popBubble(bubble) {
    bubble.popped = true;
    scene.remove(bubble.mesh);
    
    // Always increment score for popping
    score++;
    document.getElementById('score-el').textContent = score;
    
    // Handle special bubble effects (matching game.js implementation)
    if (bubble.mesh.userData.special && bubble.mesh.userData.specialType) {
        const type = bubble.mesh.userData.specialType;
        const typeData = specialBubbleTypesData[type];
        
        if (!typeData) {
            console.warn('Special bubble type data not found:', type);
        } else {
            // Apply effects based on type
            if (type === 'timebonus') {
                const amount = typeData.effect?.amount || 5;
                gameTime = Math.max(0, gameTime - amount);
                console.log(`Time bonus: +${amount}s`);
                
            } else if (type === 'pointsbonus') {
                const amount = typeData.effect?.amount || 5;
                score += amount;
                document.getElementById('score-el').textContent = score;
                console.log(`Points bonus: +${amount}`);
                
            } else if (type === 'multipop') {
                const popCount = typeData.effect?.popCount || 5;
                const clickPos = bubble.mesh.position;
                
                // Sort bubbles by distance and pop the nearest ones
                const sorted = bubbles
                    .filter(b => !b.popped && b !== bubble && !b.mesh.userData.special)
                    .sort((a, b) => {
                        const distA = a.mesh.position.distanceTo(clickPos);
                        const distB = b.mesh.position.distanceTo(clickPos);
                        return distA - distB;
                    });
                
                for (let i = 0; i < Math.min(popCount, sorted.length); i++) {
                    sorted[i].popped = true;
                    scene.remove(sorted[i].mesh);
                    score++;
                }
                document.getElementById('score-el').textContent = score;
                console.log(`Multi pop: x${Math.min(popCount, sorted.length)}`);
                
            } else if (type === 'slowmo') {
                const duration = typeData.effect?.durationSeconds || 3;
                console.log(`Slow-mo activated: ${duration}s`);
                
            } else if (type === 'magnetize') {
                const duration = typeData.effect?.durationSeconds || 3;
                console.log(`Magnet activated: ${duration}s`);
            }
        }
    }
    
    // Check win condition
    if (score >= currentLevel.target) {
        stopLevel('Victory! 🎉');
        // Show victory banner
        document.getElementById('victory-banner').classList.add('show');
    } else {
        // Respawn bubble if enabled (matching game.js)
        if (currentLevel.respawnBubbles && score < currentLevel.target) {
            spawnRegularBubble();
        }
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Update controls
    if (controls) {
        // Apply pulsar rotation effects (matching game.js behavior)
        if (gameState === 'running' && currentLevel) {
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
    
    if (gameState === 'running' && currentLevel) {
        // Update game time
        gameTime += 0.016; // ~60fps
        
        // Display time remaining (countdown like the actual game)
        const timeRemaining = Math.max(0, currentLevel.time - Math.floor(gameTime));
        document.getElementById('time-el').textContent = timeRemaining;
        
        // Check time limit
        if (gameTime >= currentLevel.time) {
            stopLevel('Time\'s up!');
            return;
        }
        
        // Spawn special bubbles
        if (currentLevel.specialBubbles && currentLevel.specialBubbles.enabled) {
            if (!lastSpecialSpawn) {
                lastSpecialSpawn = gameTime;
            }
            const timeSinceLastSpawn = gameTime - lastSpecialSpawn;
            if (timeSinceLastSpawn >= currentLevel.specialBubbles.spawnIntervalSeconds) {
                spawnSpecialBubble();
                lastSpecialSpawn = gameTime;
            }
        }
        
        // Update bubbles
        updateBubbles();
        
        // Update hazards
        updateHazards();
    }
    
    renderer.render(scene, camera);
}

function updateBubbles() {
    bubbles.forEach(bubble => {
        if (bubble.popped) return;
        
        // Decrement wormhole immunity timer
        if (bubble.mesh.userData.wormholeImmunity > 0) {
            bubble.mesh.userData.wormholeImmunity -= 1/60; // Assuming 60 FPS
        }
        
        // Store velocity in userData for hazards.js compatibility
        if (!bubble.mesh.userData.vel) {
            bubble.mesh.userData.vel = bubble.velocity;
        }
        
        // Apply hazard forces using hazards.js module
        hazardObjects.forEach(hazardObj => {
            if (hazardObj.mesh) {
                applyHazardForce(bubble.mesh, hazardObj.mesh);
            }
        });
        
        // Simple physics simulation
        if (currentLevel.gravity > 0) {
            // Apply gravity toward center
            const direction = new THREE.Vector3(0, 0, 0).sub(bubble.mesh.position).normalize();
            bubble.velocity.add(direction.multiplyScalar(currentLevel.gravity));
        }
        
        // Apply velocity
        bubble.mesh.position.add(bubble.velocity);
        
        // Bounce off the play area boundary
        if(bubble.mesh.position.length() > 25) {
            bubble.velocity.multiplyScalar(-0.7);
        }
        
        // Rotate
        bubble.mesh.rotation.x += 0.01;
        bubble.mesh.rotation.y += 0.01;
        
        // Animate special bubble ring (matching game.js)
        if (bubble.mesh.userData.special && bubble.mesh.userData.ring) {
            bubble.mesh.userData.ring.rotation.z += 0.02;
        }
        
        // Check special bubble lifetime
        if (bubble.mesh.userData.special && bubble.mesh.userData.spawnTime) {
            const age = performance.now() - bubble.mesh.userData.spawnTime;
            if (age > bubble.mesh.userData.lifetime) {
                // Remove expired special bubble
                bubble.popped = true;
                scene.remove(bubble.mesh);
            }
        }
    });
}

function updateHazards() {
    hazardObjects.forEach(hazardObj => {
        if (hazardObj.update) {
            hazardObj.update(gameTime);
        }
    });
}

function addHazard() {
    const hazardsList = document.getElementById('hazards-list');
    const currentCount = hazardsList.children.length;
    
    if (currentCount >= 2) {
        document.getElementById('hazard-warning').style.display = 'block';
        return;
    }
    
    const hazardId = Date.now();
    const hazardDiv = document.createElement('div');
    hazardDiv.className = 'hazard-item';
    hazardDiv.id = `hazard-${hazardId}`;
    
    hazardDiv.innerHTML = `
        <div class="hazard-header">
            <h3>Hazard ${currentCount + 1}</h3>
            <button class="btn btn-small btn-danger" onclick="removeHazard(${hazardId})">Remove</button>
        </div>
        <div class="form-group">
            <label>Type</label>
            <select class="hazard-type" onchange="updateHazardFields(${hazardId})">
                <option value="comet">Comet</option>
                <option value="wormhole">Wormhole</option>
                <option value="repulsor">Repulsor</option>
                <option value="pulsar">Pulsar</option>
            </select>
        </div>
        <div class="form-group">
            <label>Position [x, y, z]</label>
            <input type="text" class="hazard-pos" value="0, 0, 0" placeholder="x, y, z">
        </div>
        <div class="form-group">
            <label>Radius: <span id="hazard-${hazardId}-r-val">5</span></label>
            <input type="range" class="hazard-r" value="5" min="1" max="15" step="0.5" oninput="updateHazardSlider(${hazardId}, 'r', this.value)">
        </div>
        <div class="form-group">
            <label>Strength: <span id="hazard-${hazardId}-s-val">0.050</span></label>
            <input type="range" class="hazard-s" value="0.05" min="0.001" max="0.15" step="0.001" oninput="updateHazardSlider(${hazardId}, 's', this.value)">
        </div>
        <div class="hazard-extra" id="hazard-extra-${hazardId}"></div>
    `;
    
    hazardsList.appendChild(hazardDiv);
    updateHazardFields(hazardId);
    
    if (currentCount + 1 >= 2) {
        document.getElementById('add-hazard').disabled = true;
    }
}

function updateHazardFields(hazardId) {
    const hazardDiv = document.getElementById(`hazard-${hazardId}`);
    const type = hazardDiv.querySelector('.hazard-type').value;
    const extraDiv = document.getElementById(`hazard-extra-${hazardId}`);
    
    extraDiv.innerHTML = '';
    
    if (type === 'comet') {
        extraDiv.innerHTML = `
            <div class="form-group">
                <label>Move Speed: <span id="hazard-${hazardId}-moveSpeed-val">0.030</span></label>
                <input type="range" class="hazard-moveSpeed" value="0.03" min="0.01" max="0.1" step="0.005" oninput="updateHazardSlider(${hazardId}, 'moveSpeed', this.value)">
            </div>
        `;
    } else if (type === 'pulsar') {
        extraDiv.innerHTML = `
            <div class="form-group">
                <label>Change Interval: <span id="hazard-${hazardId}-changeInterval-val">3000</span>ms</label>
                <input type="range" class="hazard-changeInterval" value="3000" min="1000" max="10000" step="500" oninput="updateHazardSlider(${hazardId}, 'changeInterval', this.value)">
            </div>
        `;
    }
}

function removeHazard(hazardId) {
    const hazardDiv = document.getElementById(`hazard-${hazardId}`);
    hazardDiv.remove();
    
    const hazardsList = document.getElementById('hazards-list');
    document.getElementById('add-hazard').disabled = hazardsList.children.length >= 2;
    document.getElementById('hazard-warning').style.display = 'none';
    
    // Renumber remaining hazards
    Array.from(hazardsList.children).forEach((child, index) => {
        child.querySelector('h3').textContent = `Hazard ${index + 1}`;
    });
}

function populateSpecialBubbleTypes() {
    const container = document.getElementById('special-types-list');
    container.innerHTML = '';
    
    Object.keys(specialBubbleTypesData).forEach(type => {
        const data = specialBubbleTypesData[type];
        const div = document.createElement('div');
        div.className = 'form-group inline-group';
        div.innerHTML = `
            <input type="checkbox" class="special-type" value="${type}" id="special-${type}" onchange="checkSpecialLimit()">
            <label for="special-${type}">${data.icon} ${type}</label>
        `;
        container.appendChild(div);
    });
}

function checkSpecialLimit() {
    const checked = document.querySelectorAll('.special-type:checked');
    const checkboxes = document.querySelectorAll('.special-type');
    
    if (checked.length >= 2) {
        checkboxes.forEach(cb => {
            if (!cb.checked) cb.disabled = true;
        });
        document.getElementById('special-warning').style.display = 'block';
    } else {
        checkboxes.forEach(cb => cb.disabled = false);
        document.getElementById('special-warning').style.display = 'none';
    }
}

function applyLevel() {
    // Build level config from form
    const levelConfig = buildLevelConfig();
    
    // Validate
    if (!validateLevel(levelConfig)) {
        return;
    }
    
    // Update JSON editor
    if (!isUpdatingFromJson) {
        updateJsonEditor();
    }
    
    // Send config to game iframe via postMessage
    if (gameIframe && gameIframe.contentWindow) {
        gameIframe.contentWindow.postMessage({
            action: 'loadLevel',
            config: levelConfig
        }, '*');
        
        document.getElementById('status').textContent = `Playing: ${levelConfig.name}`;
    } else {
        console.error('Game iframe not ready');
    }
}

function buildLevelConfig() {
    const config = {
        name: document.getElementById('level-name').value,
        desc: document.getElementById('level-desc').value,
        target: parseInt(document.getElementById('target').value),
        time: parseInt(document.getElementById('time').value),
        count: parseInt(document.getElementById('count').value),
        size: parseFloat(document.getElementById('size').value),
        gravity: parseFloat(document.getElementById('gravity').value),
        spawnRadius: parseFloat(document.getElementById('spawn-radius').value),
        cameraZoom: parseFloat(document.getElementById('camera-zoom').value),
        autoRotate: document.getElementById('auto-rotate').checked,
        color: document.getElementById('color').value.replace('#', '0x'),
        respawnBubbles: document.getElementById('respawn-bubbles').checked,
        respawnRate: parseFloat(document.getElementById('respawn-rate').value),
        hazards: [],
        specialBubbles: {
            enabled: document.getElementById('special-enabled').checked
        }
    };
    
    // Parse hazards
    const hazardsList = document.getElementById('hazards-list');
    Array.from(hazardsList.children).forEach(hazardDiv => {
        const type = hazardDiv.querySelector('.hazard-type').value;
        const posStr = hazardDiv.querySelector('.hazard-pos').value;
        const pos = posStr.split(',').map(v => parseFloat(v.trim()));
        
        const hazard = {
            type: type,
            pos: pos,
            r: parseFloat(hazardDiv.querySelector('.hazard-r').value),
            s: parseFloat(hazardDiv.querySelector('.hazard-s').value)
        };
        
        if (type === 'comet') {
            const moveSpeed = hazardDiv.querySelector('.hazard-moveSpeed');
            if (moveSpeed) hazard.moveSpeed = parseFloat(moveSpeed.value);
        } else if (type === 'pulsar') {
            const changeInterval = hazardDiv.querySelector('.hazard-changeInterval');
            if (changeInterval) hazard.changeInterval = parseInt(changeInterval.value);
        }
        
        config.hazards.push(hazard);
    });
    
    // Parse special bubbles
    if (config.specialBubbles.enabled) {
        const selectedTypes = [];
        document.querySelectorAll('.special-type:checked').forEach(cb => {
            selectedTypes.push(cb.value);
        });
        config.specialBubbles.types = selectedTypes;
        config.specialBubbles.spawnIntervalSeconds = parseFloat(document.getElementById('special-interval').value);
    }
    
    return config;
}

function validateLevel(config) {
    // Check hazard count
    if (config.hazards.length > 2) {
        alert('Maximum 2 hazards allowed');
        return false;
    }
    
    // Check special bubble types
    if (config.specialBubbles.enabled && config.specialBubbles.types && config.specialBubbles.types.length > 2) {
        alert('Maximum 2 special bubble types allowed');
        return false;
    }
    
    // Check time limit
    if (config.time > 60) {
        alert('Time limit cannot exceed 60 seconds');
        return false;
    }
    
    // Check bubble count
    if (config.count > 45) {
        alert('Bubble count cannot exceed 45');
        return false;
    }
    
    return true;
}

function clearScene() {
    // Remove all bubbles and dispose geometry/materials
    bubbles.forEach(bubble => {
        if (bubble.mesh) {
            scene.remove(bubble.mesh);
            if (bubble.mesh.geometry) bubble.mesh.geometry.dispose();
            if (bubble.mesh.material) bubble.mesh.material.dispose();
        }
    });
    bubbles = [];
    
    // Clear hazards using hazards.js module
    hazardObjects.forEach(hazardObj => {
        if (hazardObj.mesh) {
            scene.remove(hazardObj.mesh);
        }
    });
    hazardObjects = [];
    
    // Also clear the global hazards array from hazards.js
    if (typeof hazards !== 'undefined' && Array.isArray(hazards)) {
        hazards.forEach(h => scene.remove(h));
        hazards.length = 0;
    }
}

function createBubbles(config) {
    for (let i = 0; i < config.count; i++) {
        // Create unique geometry for each bubble to avoid raycaster issues
        const geometry = new THREE.SphereGeometry(config.size, 16, 16);
        const color = new THREE.Color(parseInt(config.color));
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Random spawn position within radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * config.spawnRadius;
        mesh.position.set(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * config.spawnRadius,
            Math.sin(angle) * distance
        );
        
        // Initialize userData for hazards.js compatibility
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        mesh.userData.vel = velocity;
        mesh.userData.special = false;
        mesh.userData.wormholeImmunity = 0;
        
        scene.add(mesh);
        
        bubbles.push({
            mesh: mesh,
            velocity: velocity,
            popped: false
        });
    }
}

function spawnRegularBubble() {
    if (!currentLevel) return;
    
    // Use shared bubble-utils.js function
    const tempBubbles = [];
    const mesh = spawnBubbleInScene(currentLevel, scene, tempBubbles, null);
    
    if (mesh) {
        bubbles.push({
            mesh: mesh,
            velocity: mesh.userData.vel,
            popped: false
        });
    }
}

function spawnSpecialBubble() {
    if (!currentLevel || !currentLevel.specialBubbles || !currentLevel.specialBubbles.enabled) {
        return;
    }
    
    // Use shared bubble-utils.js function
    const tempBubbles = [];
    const mesh = spawnSpecialBubbleInScene(
        currentLevel,
        scene,
        tempBubbles,
        specialBubbleTypesData,
        null
    );
    
    if (mesh) {
        bubbles.push({
            mesh: mesh,
            velocity: mesh.userData.vel,
            popped: false,
            type: mesh.userData.specialType,
            typeData: specialBubbleTypesData[mesh.userData.specialType]
        });
    }
}

function createHazards(config) {
    // Use the hazards.js module to create hazards exactly as the game does
    config.hazards.forEach(hazardConfig => {
        const hazardMesh = createHazard(hazardConfig, scene);
        
        // Store for updates
        hazardObjects.push({
            mesh: hazardMesh,
            type: hazardConfig.type,
            update: (time) => {
                // Use hazards.js update function
                updateHazardVisuals(hazardMesh);
            }
        });
    });
}

function createComet(config) {
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...config.pos);
    scene.add(mesh);
    
    let angle = 0;
    return {
        mesh: mesh,
        config: config,
        update: (time) => {
            angle += config.moveSpeed || 0.03;
            mesh.position.x = config.pos[0] + Math.cos(angle) * config.r;
            mesh.position.y = config.pos[1] + Math.sin(angle) * config.r;
        }
    };
}

function createWormhole(config) {
    const geometry = new THREE.TorusGeometry(1, 0.4, 16, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x9d00ff,
        emissive: 0x6600cc,
        emissiveIntensity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...config.pos);
    scene.add(mesh);
    
    return {
        mesh: mesh,
        config: config,
        update: (time) => {
            mesh.rotation.x += 0.02;
            mesh.rotation.y += 0.02;
        }
    };
}

function createRepulsor(config) {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        wireframe: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...config.pos);
    scene.add(mesh);
    
    return {
        mesh: mesh,
        config: config,
        update: (time) => {
            mesh.rotation.x += 0.015;
            mesh.rotation.y += 0.015;
        }
    };
}

function createPulsar(config) {
    const geometry = new THREE.OctahedronGeometry(1.2, 0);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffeb3b,
        emissive: 0xffaa00,
        emissiveIntensity: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...config.pos);
    scene.add(mesh);
    
    return {
        mesh: mesh,
        config: config,
        update: (time) => {
            mesh.rotation.x += 0.03;
            mesh.rotation.z += 0.03;
            const pulse = Math.sin(time * 2) * 0.3 + 1;
            mesh.scale.set(pulse, pulse, pulse);
        }
    };
}

function startLevel() {
    // This button is now just "Rebuild Level" - it applies the config
    applyLevel();
}

function pauseLevel() {
    // Pause/unpause handled by game itself via UI
}

function restartLevel() {
    // Restart by resending the current config
    applyLevel();
}

function stopLevel(message) {
    // Stop the game in iframe
    if (gameIframe && gameIframe.contentWindow) {
        gameIframe.contentWindow.postMessage({
            action: 'stopLevel'
        }, '*');
    }
}

function resetLevel() {
    // Reset form to level 3 defaults (Event Horizon)
    document.getElementById('level-name').value = 'Event Horizon';
    document.getElementById('level-desc').value = 'Wormholes suck bubbles in and teleport them. Adapt your strategy!';
    document.getElementById('target').value = '20';
    document.getElementById('time').value = '50';
    document.getElementById('count').value = '24';
    document.getElementById('size').value = '0.95';
    document.getElementById('gravity').value = '0.00015';
    document.getElementById('spawn-radius').value = '8';
    document.getElementById('camera-zoom').value = '40';
    document.getElementById('auto-rotate').checked = true;
    document.getElementById('color').value = '#ff1493';
    document.getElementById('respawn-bubbles').checked = false;
    document.getElementById('respawn-rate').value = '0';
    document.getElementById('special-enabled').checked = false;
    document.getElementById('special-config').style.display = 'none';
    
    // Update slider displays
    updateSliderValue('target', '20');
    updateSliderValue('time', '50');
    updateSliderValue('count', '24');
    updateSliderValue('size', '0.95');
    updateSliderValue('gravity', '0.00015');
    updateSliderValue('spawn-radius', '8');
    updateSliderValue('camera-zoom', '40');
    updateSliderValue('respawn-rate', '0');
    
    // Clear hazards
    document.getElementById('hazards-list').innerHTML = '';
    document.getElementById('add-hazard').disabled = false;
    document.getElementById('hazard-warning').style.display = 'none';
    
    // Uncheck special bubbles
    document.querySelectorAll('.special-type').forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });
    document.getElementById('special-warning').style.display = 'none';
    
    // Clear scene
    stopLevel();
    clearScene();
    currentLevel = null;
    
    document.getElementById('status').textContent = 'Reset complete. Configure your level.';
    document.getElementById('start-btn').disabled = true;
    document.getElementById('start-btn').textContent = '▶ Start/Pause';
    document.getElementById('restart-btn').disabled = true;
}

function exportJSON() {
    if (!currentLevel) {
        alert('Please apply a level configuration first');
        return;
    }
    
    // Create a clean copy of the level config
    const exportData = JSON.parse(JSON.stringify(currentLevel));
    
    // Format the JSON nicely
    const json = JSON.stringify(exportData, null, 2);
    
    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentLevel.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Level JSON exported as "${a.download}"`);
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
