/**
 * Bubble Utilities - Shared bubble spawning functions
 * Used by both game.js and builder.js
 * 
 * These functions expect the following to be in scope:
 * - THREE (Three.js library)
 * - scene (THREE.Scene)
 * - specialBubbleTypes or specialBubbleTypesData (object)
 * - Optional: bubbleNormalMap (THREE.Texture)
 */

/**
 * Spawn a regular bubble in the scene
 * @param {object} lvl - Level configuration
 * @param {THREE.Scene} targetScene - Three.js scene to add to
 * @param {Array} targetArray - Array to push bubble into
 * @param {THREE.Texture|null} normalMap - Optional normal map texture
 * @returns {THREE.Mesh} The created bubble mesh
 */
function spawnBubbleInScene(lvl, targetScene, targetArray, normalMap = null) {
    const geo = new THREE.SphereGeometry(lvl.size, 16, 16);
    const matOptions = { 
        color: parseInt(lvl.color),
        emissive: parseInt(lvl.color),
        emissiveIntensity: 0.4,
        transmission: 0.3,
        roughness: 0.2, 
        transparent: true,
        opacity: 1.0
    };
    
    if (normalMap) {
        matOptions.normalMap = normalMap;
        matOptions.normalScale = new THREE.Vector2(0.3, 0.3);
    }
    
    const mat = new THREE.MeshPhysicalMaterial(matOptions);
    const b = new THREE.Mesh(geo, mat);
    
    const spawnRadius = lvl.spawnRadius || 7;
    
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
    b.userData.wormholeImmunity = 0;
    b.userData.special = false;
    
    targetScene.add(b);
    targetArray.push(b);
    
    return b;
}

/**
 * Spawn a special bubble in the scene
 * @param {object} lvl - Level configuration
 * @param {THREE.Scene} targetScene - Three.js scene to add to
 * @param {Array} targetArray - Array to push bubble into
 * @param {object} bubbleTypes - Special bubble type definitions
 * @param {THREE.Texture|null} normalMap - Optional normal map texture
 * @returns {THREE.Mesh|null} The created bubble mesh or null
 */
function spawnSpecialBubbleInScene(lvl, targetScene, targetArray, bubbleTypes, normalMap = null) {
    if (!lvl.specialBubbles || !lvl.specialBubbles.enabled) return null;
    const types = lvl.specialBubbles.types || [];
    if (types.length === 0) return null;
    
    const type = types[Math.floor(Math.random() * types.length)];
    const def = bubbleTypes[type];
    if (!def) return null;
    
    const geo = new THREE.SphereGeometry(lvl.size * (def.visual?.scale || 1.2), 16, 16);
    const matOptions = {
        color: parseInt(def.color),
        emissive: def.visual?.glowColor || parseInt(def.color),
        emissiveIntensity: def.visual?.glowIntensity || 0.7,
        transmission: 0.3,
        roughness: 0.05,
        metalness: 0.3,
        transparent: true,
        opacity: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    };
    
    if (normalMap) {
        matOptions.normalMap = normalMap;
        matOptions.normalScale = new THREE.Vector2(0.8, 0.8);
    }
    
    const mat = new THREE.MeshPhysicalMaterial(matOptions);
    const b = new THREE.Mesh(geo, mat);
    
    // Add glowing ring
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
    
    const spawnRadius = lvl.spawnRadius || 7;
    
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
    b.userData.lifetime = (def.lifetime || 5) * 1000;
    
    targetScene.add(b);
    targetArray.push(b);
    
    return b;
}
