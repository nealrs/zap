/**
 * Hazards Module - Handles hazard creation and physics interactions
 */

let hazards = [];

/**
 * Create a hazard mesh based on type
 * @param {object} hData - Hazard data from level config
 * @param {object} scene - Three.js scene
 * @returns {THREE.Mesh} The created hazard mesh
 */
function createHazard(hData, scene) {
    let geo, mat, mesh;
    
    if (hData.type === 'wormhole') {
        geo = new THREE.TorusKnotGeometry(hData.r * 0.4, 0.1, 40, 8);
        mat = new THREE.MeshPhongMaterial({color: 0x6600ff, emissive: 0x220066});
        mesh = new THREE.Mesh(geo, mat);
    } else if (hData.type === 'repulsor') {
        geo = new THREE.SphereGeometry(hData.r * 0.35, 24, 24);
        mat = new THREE.MeshPhysicalMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            transmission: 0.5
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.userData.pulse = true;
    } else if (hData.type === 'bumper') {
        geo = new THREE.IcosahedronGeometry(hData.r * 0.3, 1);
        mat = new THREE.MeshPhongMaterial({color: 0xffaa00, wireframe: true});
        mesh = new THREE.Mesh(geo, mat);
        // Add a spinning ring for visual clarity
        const ringGeo = new THREE.TorusGeometry(hData.r * 0.32, 0.08, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({color: 0xffff00});
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI/2;
        mesh.add(ring);
        mesh.userData.bumperRing = ring;
    } else if (hData.type === 'comet') {
        // Use cone geometry as the comet body (no sphere)
        geo = new THREE.ConeGeometry(hData.r * 0.2, hData.r * 1.2, 12);
        mat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.85
        });
        mesh = new THREE.Mesh(geo, mat);
        
        // Rotate cone to point forward
        mesh.rotation.x = -Math.PI / 2;
        
        // Initialize random movement direction
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
        mesh.userData.moveDir = new THREE.Vector3(
            Math.cos(angle) * Math.cos(elevation),
            Math.sin(elevation),
            Math.sin(angle) * Math.cos(elevation)
        );
        mesh.userData.moveSpeed = hData.moveSpeed || 0.15;
        mesh.userData.nextDirChange = performance.now() + 2000 + Math.random() * 3000;
        mesh.userData.trailingBubbles = [];
    } else {
        // Default hazard
        geo = new THREE.IcosahedronGeometry(hData.r * 0.3, 1);
        mat = new THREE.MeshPhongMaterial({color: 0xffaa00, wireframe: true});
        mesh = new THREE.Mesh(geo, mat);
    }
    
    mesh.position.set(...hData.pos);
    mesh.userData = Object.assign(mesh.userData || {}, hData);
    scene.add(mesh);
    hazards.push(mesh);
    
    return mesh;
}

/**
 * Apply hazard forces to a bubble
 * @param {THREE.Mesh} bubble - The bubble to affect
 * @param {THREE.Mesh} hazard - The hazard applying force
 */
function applyHazardForce(bubble, hazard) {
    const dist = bubble.position.distanceTo(hazard.position);
    if (dist >= hazard.userData.r) return;
    
    const dir = new THREE.Vector3()
        .subVectors(hazard.position, bubble.position)
        .normalize();
    
    if (hazard.userData.type === 'wormhole') {
        // Only affect bubbles that are not immune
        if (bubble.userData.wormholeImmunity <= 0) {
            // Teleport to a random position within safe spawn area (radius 7)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 6; // 0-6 units from center
            const y = (Math.random() - 0.5) * 12; // ±6 vertical
            bubble.position.set(
                Math.cos(angle) * distance,
                y,
                Math.sin(angle) * distance
            );
            // Give bubble a random outward velocity
            const velAngle = Math.random() * Math.PI * 2;
            bubble.userData.vel.set(
                Math.cos(velAngle) * 3,
                (Math.random() - 0.5) * 2,
                Math.sin(velAngle) * 3
            );
            // Make bubble immune to wormhole for 0.5 seconds to prevent re-capture
            bubble.userData.wormholeImmunity = 0.5;
        }
    } else if (hazard.userData.type === 'repulsor') {
        // Repulsor: continuous push
        bubble.userData.vel.add(
            dir.multiplyScalar(-hazard.userData.s * 2.2)
        );
    } else if (hazard.userData.type === 'bumper') {
        // Bumper: reflect velocity
        const relVel = bubble.userData.vel.clone();
        const normal = bubble.position.clone().sub(hazard.position).normalize();
        const dot = relVel.dot(normal);
        if (dot < 0) { // Only reflect if moving toward bumper
            bubble.userData.vel.sub(normal.multiplyScalar(2 * dot)).multiplyScalar(1.1);
        }
    } else if (hazard.userData.type === 'comet') {
        // Comet: weak attraction to create trailing effect
        // Only attract if not already at max trailing bubbles
        if (!hazard.userData.trailingBubbles) {
            hazard.userData.trailingBubbles = [];
        }
        
        const maxTrailing = 20;
        const isTrailing = hazard.userData.trailingBubbles.includes(bubble);
        
        if (isTrailing || hazard.userData.trailingBubbles.length < maxTrailing) {
            // Weak attraction force
            bubble.userData.vel.add(
                dir.multiplyScalar(hazard.userData.s * 1.5)
            );
            
            // Add to trailing list if close enough and not already trailing
            if (!isTrailing && dist < hazard.userData.r * 0.6) {
                hazard.userData.trailingBubbles.push(bubble);
            }
        }
        
        // Remove from trailing if too far away
        if (isTrailing && dist > hazard.userData.r * 1.2) {
            const idx = hazard.userData.trailingBubbles.indexOf(bubble);
            if (idx > -1) {
                hazard.userData.trailingBubbles.splice(idx, 1);
            }
        }
    } else {
        // Default: repulsor behavior
        bubble.userData.vel.add(
            dir.multiplyScalar(-hazard.userData.s * 1.8)
        );
    }
}

/**
 * Update hazard visuals (rotation, pulsing, etc.)
 * @param {THREE.Mesh} hazard - The hazard to update
 */
function updateHazardVisuals(hazard) {
    // Comet movement
    if (hazard.userData.type === 'comet') {
        const now = performance.now();
        
        // Change direction periodically
        if (now > hazard.userData.nextDirChange) {
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
            hazard.userData.moveDir.set(
                Math.cos(angle) * Math.cos(elevation),
                Math.sin(elevation),
                Math.sin(angle) * Math.cos(elevation)
            );
            hazard.userData.nextDirChange = now + 2000 + Math.random() * 3000;
        }
        
        // Move comet
        hazard.position.add(
            hazard.userData.moveDir.clone().multiplyScalar(hazard.userData.moveSpeed)
        );
        
        // Keep comet in bounds (sphere radius ~20)
        const distFromCenter = hazard.position.length();
        if (distFromCenter > 18) {
            // Reflect direction to bounce back
            const centerDir = hazard.position.clone().normalize();
            hazard.userData.moveDir.reflect(centerDir);
            // Push back inside
            hazard.position.multiplyScalar(17 / distFromCenter);
        }
        
        // Orient cone to point in movement direction
        const moveDir = hazard.userData.moveDir.clone().normalize();
        const targetPoint = hazard.position.clone().add(moveDir.multiplyScalar(10));
        hazard.lookAt(targetPoint);
        // Adjust rotation since cone points along Y axis by default
        hazard.rotateX(-Math.PI / 2);
        
        return; // Skip default rotation for comets
    }
    
    // Rotate hazard for visual effect
    hazard.rotation.y += 0.02;
    
    // Repulsor pulsing effect
    if (hazard.userData.type === 'repulsor' && hazard.userData.pulse) {
        const scale = 1 + Math.sin(performance.now() * 0.003) * 0.15;
        hazard.scale.setScalar(scale);
    }
    
    // Bumper ring rotation
    if (hazard.userData.type === 'bumper' && hazard.userData.bumperRing) {
        hazard.userData.bumperRing.rotation.z += 0.08;
    }
}

/**
 * Clear all hazards from the scene
 * @param {object} scene - Three.js scene
 */
function clearHazards(scene) {
    hazards.forEach(h => scene.remove(h));
    hazards = [];
}

/**
 * Get all hazards
 * @returns {Array} Array of hazard meshes
 */
function getHazards() {
    return hazards;
}
