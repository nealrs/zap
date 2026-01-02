/**
 * Procedural Soundtrack Generator for BubbleZap 3D
 * Generates 10 unique, loopable, 10-second space-themed soundtracks
 */

let currentSoundtrack = null;
let soundtrackNodes = [];

/**
 * Generate a space-themed soundtrack using WebAudio API
 * @param {AudioContext} audioCtx - The audio context
 * @param {number} levelIndex - Level index (0-9) for unique soundtrack
 * @returns {object} Soundtrack control object with play/stop methods
 */
function generateSoundtrack(audioCtx, levelIndex) {
    console.log('generateSoundtrack called:', { 
        audioCtx: audioCtx ? 'exists' : 'null', 
        state: audioCtx ? audioCtx.state : 'N/A',
        levelIndex 
    });
    
    if (!audioCtx) {
        console.warn('generateSoundtrack: No audio context provided');
        return null;
    }
    
    // Stop any existing soundtrack
    stopSoundtrack();
    
    soundtrackNodes = [];
    const duration = 10; // 10 seconds per loop
    const now = audioCtx.currentTime;
    
    console.log('Creating soundtrack for level', levelIndex);
    
    // Master gain for soundtrack (raised volume for better presence)
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.25; // Increased from 0.15 for better audibility
    masterGain.connect(audioCtx.destination);
    soundtrackNodes.push(masterGain);
    
    // Each level gets a unique musical theme
    const themes = [
        // Level 0: Dark Pulse - Heavy industrial drone with rhythmic bass
        () => createEtherealPad(audioCtx, masterGain, now, duration),
        
        // Level 1: Industrial Hammer - Deep bass with mechanical percussion
        () => createDeepSpaceDrone(audioCtx, masterGain, now, duration),
        
        // Level 2: Dark Melody - Minor key arpeggios with heavy bass
        () => createCrystallineChimes(audioCtx, masterGain, now, duration),
        
        // Level 3: Pulsing Assault - Heavy rhythmic synth with distorted bass
        () => createPulsingWaves(audioCtx, masterGain, now, duration),
        
        // Level 4: Industrial Storm - Noise textures with heavy bass and percussion
        () => createCosmicWind(audioCtx, masterGain, now, duration),
        
        // Level 5: Dark Arpeggio - Fast minor key patterns with heavy bass
        () => createOrbitalMelody(audioCtx, masterGain, now, duration),
        
        // Level 6: Dark Pads - Ominous minor chords with heavy sub-bass
        () => createNebulaDream(audioCtx, masterGain, now, duration),
        
        // Level 7: Heavy Assault - Fast industrial bass with aggressive percussion
        () => createStellarPulse(audioCtx, masterGain, now, duration),
        
        // Level 8: Dark Synthwave - Driving bass with aggressive rhythm
        () => createAuroraWaves(audioCtx, masterGain, now, duration),
        
        // Level 9: Dark Synthwave - Dynamic grimdark electronica with driving rhythm
        () => createVoidEcho(audioCtx, masterGain, now, duration)
    ];
    
    // Use level index modulo 10 for soundtrack selection
    const themeIndex = levelIndex % 10;
    const themeNodes = themes[themeIndex]();
    soundtrackNodes.push(...themeNodes);
    
    console.log('Soundtrack nodes created:', soundtrackNodes.length);
    
    // Schedule loop restart
    const loopTimer = setInterval(() => {
        if (audioCtx.state === 'running') {
            console.log('Looping soundtrack for level', levelIndex);
            generateSoundtrack(audioCtx, levelIndex);
        }
    }, duration * 1000);
    
    currentSoundtrack = {
        stop: () => {
            console.log('Stopping soundtrack');
            clearInterval(loopTimer);
            stopSoundtrack();
        }
    };
    
    console.log('Soundtrack started successfully');
    return currentSoundtrack;
}

/**
 * Stop the current soundtrack
 */
function stopSoundtrack() {
    soundtrackNodes.forEach(node => {
        try {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
        } catch (e) {
            // Ignore errors from already disconnected nodes
        }
    });
    soundtrackNodes = [];
    currentSoundtrack = null;
}

// ============= SOUNDTRACK THEMES =============

/**
 * Level 0: Dark Pulse - Heavy industrial drone with rhythmic bass
 */
function createEtherealPad(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 77; // 90 * 0.85 = 76.5, rounded to 77
    const beatDuration = 60 / bpm;
    
    // Deep bass drone with distortion (seamless loop - no fade)
    const bassFreqs = [55, 73.42]; // A, D (very low and ominous)
    bassFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 250;
        filter.Q.value = 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, startTime); // Constant volume for seamless loop
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        
        nodes.push(osc, filter, gain);
    });
    
    // Pulsing synth stabs
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 110; // A
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 4;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, startTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime + t);
        osc.stop(startTime + t + beatDuration * 2);
        
        nodes.push(osc, filter, gain);
    }
    
    // Heavy kick pattern
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(40, startTime + t + 0.1);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.20, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.25);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.3);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 1: Industrial Hammer - Deep bass with mechanical percussion
 */
function createDeepSpaceDrone(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 75; // 88 * 0.85 = 74.8, rounded to 75
    const beatDuration = 60 / bpm;
    
    // Deep rumbling bass
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 55.5;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 4;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, startTime);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    
    nodes.push(osc1, osc2, filter, gain);
    
    // Heavy mechanical kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(120, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(35, startTime + t + 0.12);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.18, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.35);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.4);
        
        nodes.push(kick, kickGain);
    }
    
    // Metallic percussion hits
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const metal = ctx.createOscillator();
        metal.type = 'square';
        metal.frequency.value = 800 + Math.random() * 400;
        
        const metalFilter = ctx.createBiquadFilter();
        metalFilter.type = 'bandpass';
        metalFilter.frequency.value = 1200;
        metalFilter.Q.value = 8;
        
        const metalGain = ctx.createGain();
        metalGain.gain.setValueAtTime(0.06, startTime + t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.15);
        
        metal.connect(metalFilter);
        metalFilter.connect(metalGain);
        metalGain.connect(dest);
        
        metal.start(startTime + t);
        metal.stop(startTime + t + 0.2);
        
        nodes.push(metal, metalFilter, metalGain);
    }
    
    return nodes;
}

/**
 * Level 2: Dark Melody - Minor key arpeggios with heavy bass
 */
function createCrystallineChimes(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 81; // 95 * 0.85 = 80.75, rounded to 81
    const beatDuration = 60 / bpm;
    
    // Heavy bass foundation
    const bass = ctx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.value = 55; // A low
    
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    bassFilter.Q.value = 3;
    
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.12, startTime);
    
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(dest);
    bass.start(startTime);
    bass.stop(startTime + duration);
    nodes.push(bass, bassFilter, bassGain);
    
    // Dark melodic arpeggio
    const notes = [220, 246.94, 293.66, 329.63]; // A, B, D, E (minor)
    const pattern = [0, 2, 3, 1, 3, 2, 0, 1];
    
    pattern.forEach((noteIdx, i) => {
        const time = i * beatDuration * 1.5;
        if (time >= duration) return;
        
        const freq = notes[noteIdx];
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        filter.Q.value = 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, startTime + time);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + time + beatDuration * 1.2);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime + time);
        osc.stop(startTime + time + beatDuration * 1.8);
        
        nodes.push(osc, filter, gain);
    });
    
    // Industrial kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(38, startTime + t + 0.1);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.19, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.28);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.32);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 3: Pulsing Assault - Heavy rhythmic synth with distorted bass
 */
function createPulsingWaves(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 85; // 100 * 0.85 = 85
    const beatDuration = 60 / bpm;
    
    // Heavy pulsing synth bass
    const bassNotes = [55, 61.74, 73.42]; // A, B, D (minor)
    let bassIdx = 0;
    
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = bassNotes[bassIdx % bassNotes.length];
        bassIdx++;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        filter.Q.value = 4;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.14, startTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 1.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime + t);
        osc.stop(startTime + t + beatDuration * 2);
        
        nodes.push(osc, filter, gain);
    }
    
    // Metallic hi-hat rhythm
    for (let t = 0; t < duration; t += beatDuration * 0.5) {
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const hihat = ctx.createBufferSource();
        hihat.buffer = noiseBuffer;
        
        const hiFilter = ctx.createBiquadFilter();
        hiFilter.type = 'highpass';
        hiFilter.frequency.value = 6000;
        
        const hiGain = ctx.createGain();
        hiGain.gain.setValueAtTime(0.04, startTime + t);
        hiGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.04);
        
        hihat.connect(hiFilter);
        hiFilter.connect(hiGain);
        hiGain.connect(dest);
        
        hihat.start(startTime + t);
        
        nodes.push(hihat, hiFilter, hiGain);
    }
    
    // Heavy kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(170, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(40, startTime + t + 0.1);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.21, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.25);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.3);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 4: Industrial Storm - Noise textures with heavy bass and percussion
 */
function createCosmicWind(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 78; // 92 * 0.85 = 78.2, rounded to 78
    const beatDuration = 60 / bpm;
    
    // Create filtered noise texture
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 6;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, startTime);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    
    noise.start(startTime);
    
    nodes.push(noise, filter, gain);
    
    // Heavy sub-bass pulse
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.value = 48; // Very low
        
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 150;
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.14, startTime + t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.5);
        
        bass.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(dest);
        
        bass.start(startTime + t);
        bass.stop(startTime + t + 0.6);
        
        nodes.push(bass, bassFilter, bassGain);
    }
    
    // Industrial kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(36, startTime + t + 0.12);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.20, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.3);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.35);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 5: Dark Arpeggio - Fast minor key patterns with heavy bass
 */
function createOrbitalMelody(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 89; // 105 * 0.85 = 89.25, rounded to 89
    const beatDuration = 60 / bpm;
    
    // Heavy bass drone with distortion (seamless loop - no fade)
    const bassDrone = ctx.createOscillator();
    bassDrone.type = 'sawtooth';
    bassDrone.frequency.value = 55; // A low
    
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    bassFilter.Q.value = 4;
    
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.13, startTime); // Constant volume for seamless loop
    
    bassDrone.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(dest);
    bassDrone.start(startTime);
    bassDrone.stop(startTime + duration);
    nodes.push(bassDrone, bassFilter, bassGain);
    
    // Fast dark arpeggio
    const arp = [220, 246.94, 293.66, 329.63]; // A, B, D, E (minor)
    let arpIndex = 0;
    
    for (let t = 0; t < duration; t += beatDuration * 0.5) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = arp[arpIndex % arp.length];
        arpIndex++;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1400;
        filter.Q.value = 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, startTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 0.45);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime + t);
        osc.stop(startTime + t + beatDuration * 0.55);
        
        nodes.push(osc, filter, gain);
    }
    
    // Heavy kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(165, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(38, startTime + t + 0.1);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.20, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.27);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.32);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 6: Dark Pads - Ominous minor chords with heavy sub-bass
 */
function createNebulaDream(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 72; // 85 * 0.85 = 72.25, rounded to 72
    const beatDuration = 60 / bpm;
    
    // Dark atmospheric pads (seamless loop - no frequency modulation)
    const chordFreqs = [110, 130.81, 164.81]; // A, C, E (minor)
    
    chordFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq; // Constant frequency for seamless loop
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        filter.Q.value = 3;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, startTime); // Constant volume for seamless loop
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
        
        nodes.push(osc, filter, gain);
    });
    
    // Heavy pulsing sub-bass
    for (let t = 0; t < duration; t += beatDuration) {
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 48; // Deep sub bass
        
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.16, startTime + t);
        subGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 0.75);
        
        sub.connect(subGain);
        subGain.connect(dest);
        
        sub.start(startTime + t);
        sub.stop(startTime + t + beatDuration);
        
        nodes.push(sub, subGain);
    }
    
    // Industrial kick
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(170, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(37, startTime + t + 0.11);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.19, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.28);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.33);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 7: Heavy Assault - Fast industrial bass with aggressive percussion
 */
function createStellarPulse(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 94; // 110 * 0.85 = 93.5, rounded to 94
    const beatDuration = 60 / bpm;
    
    // Aggressive heavy bass
    const bassNotes = [55, 61.74, 73.42, 82.41]; // A, B, D, E (minor)
    let bassIdx = 0;
    
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.value = bassNotes[bassIdx % bassNotes.length];
        bassIdx++;
        
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 250;
        bassFilter.Q.value = 5;
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.15, startTime + t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 1.5);
        
        bass.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(dest);
        
        bass.start(startTime + t);
        bass.stop(startTime + t + beatDuration * 2);
        
        nodes.push(bass, bassFilter, bassGain);
    }
    
    // Heavy kick pattern
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(175, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(38, startTime + t + 0.12);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.22, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.35);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.4);
        
        nodes.push(kick, kickGain);
    }
    
    // Harsh metallic percussion
    for (let t = beatDuration * 0.5; t < duration; t += beatDuration) {
        const metal = ctx.createOscillator();
        metal.type = 'square';
        metal.frequency.value = 1000 + Math.random() * 600;
        
        const metalFilter = ctx.createBiquadFilter();
        metalFilter.type = 'bandpass';
        metalFilter.frequency.value = 1800;
        metalFilter.Q.value = 12;
        
        const metalGain = ctx.createGain();
        metalGain.gain.setValueAtTime(0.07, startTime + t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.12);
        
        metal.connect(metalFilter);
        metalFilter.connect(metalGain);
        metalGain.connect(dest);
        
        metal.start(startTime + t);
        metal.stop(startTime + t + 0.15);
        
        nodes.push(metal, metalFilter, metalGain);
    }
    
    return nodes;
}

/**
 * Level 8: Dark Synthwave - Driving bass with aggressive rhythm
 */
function createAuroraWaves(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 102; // 120 * 0.85 = 102
    const beatDuration = 60 / bpm;
    
    // Aggressive driving bass line
    const bassPattern = [55, 55, 73.42, 65.41]; // A, A, D, C (dark progression)
    let bassIdx = 0;
    
    for (let t = 0; t < duration; t += beatDuration) {
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.value = bassPattern[bassIdx % bassPattern.length];
        bassIdx++;
        
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 280;
        bassFilter.Q.value = 4;
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.14, startTime + t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 0.85);
        
        bass.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(dest);
        
        bass.start(startTime + t);
        bass.stop(startTime + t + beatDuration);
        
        nodes.push(bass, bassFilter, bassGain);
    }
    
    // Dark chord stabs
    const chordFreqs = [220, 261.63, 329.63]; // A, C, E (minor)
    for (let t = 0; t < duration; t += beatDuration * 2) {
        chordFreqs.forEach(freq => {
            const synth = ctx.createOscillator();
            synth.type = 'square';
            synth.frequency.value = freq;
            
            const synthFilter = ctx.createBiquadFilter();
            synthFilter.type = 'lowpass';
            synthFilter.frequency.value = 1000;
            synthFilter.Q.value = 3;
            
            const synthGain = ctx.createGain();
            synthGain.gain.setValueAtTime(0.07, startTime + t);
            synthGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.35);
            
            synth.connect(synthFilter);
            synthFilter.connect(synthGain);
            synthGain.connect(dest);
            
            synth.start(startTime + t);
            synth.stop(startTime + t + 0.35);
            
            nodes.push(synth, synthFilter, synthGain);
        });
    }
    
    // Heavy kick drum
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(180, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(39, startTime + t + 0.11);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.23, startTime + t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.3);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.35);
        
        nodes.push(kick, kickGain);
    }
    
    return nodes;
}

/**
 * Level 9: Dark Synthwave - Dynamic grimdark electronica with driving rhythm
 * Features minor key arpeggios, heavy bass, atmospheric pads, and industrial beats
 */
function createVoidEcho(ctx, dest, startTime, duration) {
    const nodes = [];
    const bpm = 100; // Slower, more ominous tempo
    const beatDuration = 60 / bpm;
    
    // Heavy, distorted bass synth (minor key - dark and aggressive)
    const bassNotes = [110, 123.47, 146.83, 123.47]; // A, B, D, B (minor progression)
    let bassIdx = 0;
    
    for (let t = 0; t < duration; t += beatDuration * 2) {
        const bass = ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.value = bassNotes[bassIdx % bassNotes.length];
        bassIdx++;
        
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 300; // Darker, more muffled
        bassFilter.Q.value = 3;
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.15, startTime + t); // Heavier bass presence
        bassGain.gain.setValueAtTime(0.15, startTime + t + beatDuration * 2 - 0.01);
        bassGain.gain.linearRampToValueAtTime(0, startTime + t + beatDuration * 2);
        
        bass.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(dest);
        
        bass.start(startTime + t);
        bass.stop(startTime + t + beatDuration * 2);
        
        nodes.push(bass, bassFilter, bassGain);
    }
    
    // Dark arpeggio (minor key, atmospheric)
    const arpNotes = [440, 493.88, 587.33, 659.25]; // A4, B4, D5, E5 (minor)
    let arpIdx = 0;
    
    for (let t = 0; t < duration; t += beatDuration * 0.5) { // Slower arp pattern
        const arp = ctx.createOscillator();
        arp.type = 'square';
        arp.frequency.value = arpNotes[arpIdx % arpNotes.length];
        arpIdx++;
        
        const arpFilter = ctx.createBiquadFilter();
        arpFilter.type = 'lowpass';
        arpFilter.frequency.value = 1500; // Darker tone
        arpFilter.Q.value = 4;
        
        const arpGain = ctx.createGain();
        arpGain.gain.setValueAtTime(0.05, startTime + t);
        arpGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + beatDuration * 0.5);
        
        arp.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(dest);
        
        arp.start(startTime + t);
        arp.stop(startTime + t + beatDuration * 0.6);
        
        nodes.push(arp, arpFilter, arpGain);
    }
    
    // Dark atmospheric pad (dissonant and ominous) - seamless loop
    const padFreqs = [220, 277.18, 329.63]; // A, C#, E (A major, but in low register = darker)
    padFreqs.forEach(freq => {
        const pad = ctx.createOscillator();
        pad.type = 'sawtooth';
        pad.frequency.value = freq;
        
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 400; // Very muffled, ominous
        padFilter.Q.value = 2;
        
        const padGain = ctx.createGain();
        padGain.gain.setValueAtTime(0.06, startTime); // Constant volume for seamless loop
        
        pad.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(dest);
        
        pad.start(startTime);
        pad.stop(startTime + duration);
        
        nodes.push(pad, padFilter, padGain);
    });
    
    // Heavy industrial kick drum
    for (let t = 0; t < duration; t += beatDuration) {
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(180, startTime + t);
        kick.frequency.exponentialRampToValueAtTime(35, startTime + t + 0.1);
        
        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.22, startTime + t); // Heavier kick
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.25);
        
        kick.connect(kickGain);
        kickGain.connect(dest);
        
        kick.start(startTime + t);
        kick.stop(startTime + t + 0.3);
        
        nodes.push(kick, kickGain);
    }
    
    // Dark metallic hi-hat pattern (industrial sound)
    for (let t = 0; t < duration; t += beatDuration * 0.5) {
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const hihat = ctx.createBufferSource();
        hihat.buffer = noiseBuffer;
        
        const hihatFilter = ctx.createBiquadFilter();
        hihatFilter.type = 'bandpass';
        hihatFilter.frequency.value = 5000; // Less bright, more industrial
        hihatFilter.Q.value = 2;
        
        const hihatGain = ctx.createGain();
        hihatGain.gain.setValueAtTime(0.04, startTime + t);
        hihatGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.04);
        
        hihat.connect(hihatFilter);
        hihatFilter.connect(hihatGain);
        hihatGain.connect(dest);
        
        hihat.start(startTime + t);
        
        nodes.push(hihat, hihatFilter, hihatGain);
    }
    
    // Occasional distorted stabs for tension
    const stabTimes = [2, 4.5, 7, 9.5];
    stabTimes.forEach(t => {
        if (t >= duration) return;
        
        const stab = ctx.createOscillator();
        stab.type = 'square';
        stab.frequency.value = 55; // Very low, distorted
        
        const stabFilter = ctx.createBiquadFilter();
        stabFilter.type = 'lowpass';
        stabFilter.frequency.value = 200;
        stabFilter.Q.value = 10; // High resonance for harshness
        
        const stabGain = ctx.createGain();
        stabGain.gain.setValueAtTime(0.12, startTime + t);
        stabGain.gain.exponentialRampToValueAtTime(0.001, startTime + t + 0.3);
        
        stab.connect(stabFilter);
        stabFilter.connect(stabGain);
        stabGain.connect(dest);
        
        stab.start(startTime + t);
        stab.stop(startTime + t + 0.35);
        
        nodes.push(stab, stabFilter, stabGain);
    });
    
    return nodes;
}
