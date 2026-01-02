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
    } else if (hData.type === 'pulsar') {
        // Pulsar: pulsing energy sphere with radiating rings
        geo = new THREE.SphereGeometry(hData.r * 0.4, 32, 32);
        mat = new THREE.MeshPhysicalMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            transmission: 0.3
        });
        mesh = new THREE.Mesh(geo, mat);
        
        // Add radiating rings
        const ring1Geo = new THREE.TorusGeometry(hData.r * 0.5, 0.05, 16, 32);
        const ring1Mat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.6
        });
        const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
        ring1.rotation.x = Math.PI / 2;
        mesh.add(ring1);
        
        const ring2Geo = new THREE.TorusGeometry(hData.r * 0.7, 0.04, 16, 32);
        const ring2Mat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4
        });
        const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
        ring2.rotation.x = Math.PI / 2;
        mesh.add(ring2);
        
        mesh.userData.pulsarRing1 = ring1;
        mesh.userData.pulsarRing2 = ring2;
        mesh.userData.nextRotationChange = performance.now() + (hData.changeInterval || 3000);
        mesh.userData.pulse = true;
        // Initialize speed modulation and axis rotation tracking
        mesh.userData.speedMod = 1.0;
        mesh.userData.lastSpeedIncrease = Math.random() > 0.5; // track last change direction
        mesh.userData.axisRotationVec = new THREE.Vector3(0, 0, 0);
    } else if (hData.type === 'asteroidbelt') {
        // Asteroid belt: scattered field of unpoppable boulders like real asteroid belt
        // Create a parent group for the belt
        const beltGroup = new THREE.Group();
        beltGroup.position.set(...hData.pos);
        
        // Create multiple irregular boulder meshes scattered in 3D space
        // More asteroids with varied sizes for realistic distribution
        const boulderCount = hData.boulderCount || 20;
        const boulders = [];
        
        for (let i = 0; i < boulderCount; i++) {
            // Create irregular geometry by randomly displacing vertices
            // Size variation: some small, some medium, few large (realistic distribution)
            const sizeRoll = Math.random();
            let sizeMultiplier;
            if (sizeRoll < 0.6) {
                // 60% small asteroids
                sizeMultiplier = 0.05 + Math.random() * 0.03;
            } else if (sizeRoll < 0.9) {
                // 30% medium asteroids
                sizeMultiplier = 0.08 + Math.random() * 0.04;
            } else {
                // 10% large asteroids
                sizeMultiplier = 0.12 + Math.random() * 0.06;
            }
            
            const baseGeo = new THREE.DodecahedronGeometry(hData.r * sizeMultiplier, 0);
            const positions = baseGeo.attributes.position;
            
            // Randomly displace vertices to make irregular rocky shapes
            for (let j = 0; j < positions.count; j++) {
                const x = positions.getX(j);
                const y = positions.getY(j);
                const z = positions.getZ(j);
                const factor = 0.6 + Math.random() * 0.8; // More variation in shape
                positions.setXYZ(j, x * factor, y * factor, z * factor);
            }
            baseGeo.computeVertexNormals();
            
            // Vary colors slightly for realism (grays and browns)
            const colorVariation = Math.random();
            let boulderColor, emissiveColor;
            if (colorVariation < 0.5) {
                // Gray asteroids
                const gray = Math.floor(0x333333 + Math.random() * 0x222222);
                boulderColor = gray;
                emissiveColor = Math.floor(gray * 0.3);
            } else {
                // Brown/reddish asteroids
                boulderColor = 0x554433;
                emissiveColor = 0x221100;
            }
            
            const mat = new THREE.MeshPhongMaterial({
                color: boulderColor,
                emissive: emissiveColor,
                emissiveIntensity: 0.05,
                flatShading: true,
                shininess: 5
            });
            
            const boulder = new THREE.Mesh(baseGeo, mat);
            
            // Position boulders throughout the volume with more random distribution
            // Use spherical coordinates but with wider radius variation
            const theta = Math.random() * Math.PI * 2; // Full circle
            const phi = Math.acos((Math.random() * 2) - 1); // Full sphere distribution
            const radius = hData.r * (0.3 + Math.random() * 0.6); // Wide spread from center
            
            boulder.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            // Random rotation
            boulder.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Very slow individual rotation - tumbling effect
            boulder.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 0.0003,
                y: (Math.random() - 0.5) * 0.0003,
                z: (Math.random() - 0.5) * 0.0003
            };
            
            beltGroup.add(boulder);
            boulders.push(boulder);
        }
        
        mesh = beltGroup;
        mesh.userData.boulders = boulders;
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
    } else if (hazard.userData.type === 'pulsar') {
        // Pulsar doesn't directly affect bubbles - it affects field rotation
        // (handled in updateHazardVisuals and game.js animation loop)
        return;
    } else if (hazard.userData.type === 'asteroidbelt') {
        // Asteroid belt: check collision with each boulder and deflect
        if (!hazard.userData.boulders) return;
        
        for (let boulder of hazard.userData.boulders) {
            // Get boulder world position
            const boulderWorldPos = new THREE.Vector3();
            boulder.getWorldPosition(boulderWorldPos);
            
            // Check distance to bubble
            // Calculate actual boulder radius from its geometry
            const boulderGeometry = boulder.geometry;
            const boulderScale = boulder.scale.x; // Assuming uniform scale
            const boulderRadius = boulderGeometry.parameters.radius * boulderScale;
            
            const distToBoulder = bubble.position.distanceTo(boulderWorldPos);
            
            if (distToBoulder < boulderRadius + bubble.geometry.parameters.radius) {
                // Collision! Deflect bubble
                const normal = bubble.position.clone().sub(boulderWorldPos).normalize();
                const dot = bubble.userData.vel.dot(normal);
                
                if (dot < 0) { // Only deflect if moving toward boulder
                    // Reflect velocity off the normal
                    bubble.userData.vel.sub(normal.multiplyScalar(2 * dot)).multiplyScalar(0.9);
                    // Push bubble away slightly to prevent sticking
                    bubble.position.add(normal.multiplyScalar(0.1));
                }
                break; // Only process one collision per frame
            }
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
    
    // Pulsar pulsing and ring animation
    if (hazard.userData.type === 'pulsar') {
        const time = performance.now();
        const pulse = 1 + Math.sin(time * 0.005) * 0.2;
        hazard.scale.setScalar(pulse);
        
        // Animate rings
        if (hazard.userData.pulsarRing1) {
            hazard.userData.pulsarRing1.rotation.z += 0.03;
            const ring1Scale = 1 + Math.sin(time * 0.004) * 0.15;
            hazard.userData.pulsarRing1.scale.setScalar(ring1Scale);
        }
        if (hazard.userData.pulsarRing2) {
            hazard.userData.pulsarRing2.rotation.z -= 0.02;
            const ring2Scale = 1 + Math.sin(time * 0.006 + Math.PI) * 0.2;
            hazard.userData.pulsarRing2.scale.setScalar(ring2Scale);
        }
    }
    
    // Asteroid belt rotation
    if (hazard.userData.type === 'asteroidbelt' && hazard.userData.boulders) {
        // No parent group rotation - keep asteroids stationary
        // Only rotate individual boulders very slowly
        hazard.userData.boulders.forEach(boulder => {
            boulder.rotation.x += boulder.userData.rotationSpeed.x;
            boulder.rotation.y += boulder.userData.rotationSpeed.y;
            boulder.rotation.z += boulder.userData.rotationSpeed.z;
        });
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

/**
 * Get pulsar rotation modifications for auto-rotate
 * @returns {object} Rotation speed and axis modifications
 */
function getPulsarRotationEffect() {
    const pulsars = hazards.filter(h => h.userData.type === 'pulsar');
    if (pulsars.length === 0) {
        return { speedMultiplier: 1, axisRotationVec: new THREE.Vector3(0, 0, 0) };
    }
    
    const now = performance.now();
    let totalSpeedMod = 1;
    const totalAxis = new THREE.Vector3(0, 0, 0);
    
    pulsars.forEach(pulsar => {
        // Check if it's time to change rotation
        if (now > pulsar.userData.nextRotationChange) {
            // Alternate speed direction: if last change was increase, now decrease, and vice-versa
            const willIncrease = !pulsar.userData.lastSpeedIncrease;
            if (willIncrease) {
                // Noticeably increase speed (1.3 - 2.0)
                pulsar.userData.speedMod = 1.3 + Math.random() * 0.7;
            } else {
                // Noticeably decrease speed (0.4 - 0.7)
                pulsar.userData.speedMod = 0.4 + Math.random() * 0.3;
            }
            pulsar.userData.lastSpeedIncrease = willIncrease;
            
            // Axis rotation change: at least 30 degrees (PI/6) up to 60 degrees (PI/3) per axis
            const minAngle = Math.PI / 6; // 30 degrees
            const maxAngle = Math.PI / 3; // 60 degrees
            const signX = Math.random() > 0.5 ? 1 : -1;
            const signY = Math.random() > 0.5 ? 1 : -1;
            const signZ = Math.random() > 0.5 ? 1 : -1;
            const deltaX = signX * (minAngle + Math.random() * (maxAngle - minAngle));
            const deltaY = signY * (minAngle + Math.random() * (maxAngle - minAngle));
            const deltaZ = signZ * (minAngle + Math.random() * (maxAngle - minAngle));
            
            // Store the axis rotation delta for this pulsar
            pulsar.userData.axisRotationVec = new THREE.Vector3(deltaX, deltaY, deltaZ);
            
            // Next change in 2-5 seconds
            pulsar.userData.nextRotationChange = now + 2000 + Math.random() * 3000;
        }
        
        totalSpeedMod *= (pulsar.userData.speedMod || 1);
        // Accumulate axis rotation vectors
        const vec = pulsar.userData.axisRotationVec || new THREE.Vector3(0, 0, 0);
        totalAxis.add(vec);
    });
    
    return {
        speedMultiplier: totalSpeedMod,
        axisRotationVec: totalAxis
    };
}
