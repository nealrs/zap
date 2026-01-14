/**
 * HTML5 Audio Fallback System
 * Uses HTML5 Audio elements for better iOS Safari compatibility
 * Works in silent mode (treats audio as "media")
 */

// Audio manager
const AudioManager = {
    // Sound effects
    sfx: {
        pop: null,
        fail: null
    },
    
    // Soundtracks (one per level)
    soundtracks: [],
    currentSoundtrack: null,
    
    // State
    isInitialized: false,
    isMuted: false,
    useWebAudio: false, // Will be set based on feature detection
    
    /**
     * Initialize audio system
     * Detects Web Audio API support and falls back to HTML5 Audio
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🎵 Initializing audio system...');
        
        // Detect Web Audio API support
        const hasWebAudio = !!(window.AudioContext || window.webkitAudioContext);
        
        // Check if Safari on iOS (prefer HTML5 Audio for better silent mode support)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        // Use HTML5 Audio on iOS Safari, Web Audio elsewhere
        this.useWebAudio = hasWebAudio && !isIOS;
        
        console.log(`Audio API: ${this.useWebAudio ? 'Web Audio' : 'HTML5 Audio'}`);
        console.log(`Platform: ${isIOS ? 'iOS' : 'Desktop'}, ${isSafari ? 'Safari' : 'Other'}`);
        
        if (this.useWebAudio) {
            // Initialize Web Audio API (existing implementation)
            this.initWebAudio();
        } else {
            // Initialize HTML5 Audio
            this.initHTML5Audio();
        }
        
        this.isInitialized = true;
    },
    
    /**
     * Initialize Web Audio API (existing game audio system)
     */
    initWebAudio() {
        // Delegate to existing initAudio() function
        if (typeof initAudio === 'function') {
            initAudio();
        }
    },
    
    /**
     * Initialize HTML5 Audio elements
     */
    initHTML5Audio() {
        // Preload sound effects
        this.sfx.pop = new Audio('./audio/pop.wav');
        this.sfx.pop.volume = 0.3;
        this.sfx.pop.preload = 'auto';
        
        this.sfx.fail = new Audio('./audio/fail.wav');
        this.sfx.fail.volume = 0.6;
        this.sfx.fail.preload = 'auto';
        
        // Preload 10 soundtrack loops
        for (let i = 0; i < 10; i++) {
            const audio = new Audio(`./audio/soundtrack-level-${i}.wav`);
            audio.volume = 0.15;
            audio.loop = true;
            audio.preload = 'auto';
            this.soundtracks.push(audio);
        }
        
        console.log('✅ HTML5 Audio initialized');
    },
    
    /**
     * Play pop sound effect
     */
    playPopSound() {
        if (this.isMuted) return;
        
        // Always use HTML5 Audio (that's the whole point of AudioManager)
        if (this.sfx.pop) {
            // Clone audio for overlapping sounds
            const clone = this.sfx.pop.cloneNode();
            clone.volume = 0.3;
            clone.play().catch(err => console.warn('Pop sound failed:', err));
        }
    },
    
    /**
     * Play fail sound effect
     */
    playFailSound() {
        if (this.isMuted) return;
        
        // Always use HTML5 Audio (that's the whole point of AudioManager)
        if (this.sfx.fail) {
            this.sfx.fail.currentTime = 0;
            this.sfx.fail.play().catch(err => console.warn('Fail sound failed:', err));
        }
    },
    
    /**
     * Start soundtrack for a level
     * @param {number} levelIndex - Level index (0-9, cycles for higher levels)
     */
    startSoundtrack(levelIndex) {
        if (this.isMuted) return;
        
        // Stop current soundtrack
        this.stopSoundtrack();
        
        if (this.useWebAudio) {
            // Use existing Web Audio procedural soundtrack
            if (typeof generateSoundtrack === 'function' && audioContext) {
                generateSoundtrack(audioContext, levelIndex);
            }
        } else {
            // Use HTML5 Audio pre-generated loops
            const trackIndex = levelIndex % 10; // Cycle through 10 tracks
            const soundtrack = this.soundtracks[trackIndex];
            
            if (soundtrack) {
                this.currentSoundtrack = soundtrack;
                soundtrack.currentTime = 0;
                soundtrack.play().catch(err => {
                    console.warn('Soundtrack failed to play:', err);
                });
            }
        }
    },
    
    /**
     * Stop current soundtrack
     */
    stopSoundtrack() {
        if (this.useWebAudio) {
            // Use existing Web Audio stop
            if (typeof stopSoundtrack === 'function') {
                stopSoundtrack();
            }
        } else {
            // Stop HTML5 Audio soundtrack
            if (this.currentSoundtrack) {
                this.currentSoundtrack.pause();
                this.currentSoundtrack.currentTime = 0;
                this.currentSoundtrack = null;
            }
        }
    },
    
    /**
     * Set mute state
     * @param {boolean} muted - Whether to mute audio
     */
    setMuted(muted) {
        this.isMuted = muted;
        
        if (muted) {
            this.stopSoundtrack();
        }
    }
};

// Auto-initialize on user interaction (required for mobile)
document.addEventListener('DOMContentLoaded', () => {
    const initOnInteraction = () => {
        AudioManager.init();
        document.removeEventListener('touchstart', initOnInteraction);
        document.removeEventListener('click', initOnInteraction);
    };
    
    document.addEventListener('touchstart', initOnInteraction, { once: true });
    document.addEventListener('click', initOnInteraction, { once: true });
});

// Pause audio when page is hidden (user switches tabs/apps)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - pause all audio
        if (AudioManager.currentSoundtrack) {
            AudioManager.currentSoundtrack.pause();
            AudioManager.wasPlayingBeforeHidden = true;
        }
    } else {
        // Page is visible again - resume if it was playing
        if (AudioManager.wasPlayingBeforeHidden && AudioManager.currentSoundtrack) {
            AudioManager.currentSoundtrack.play().catch(err => {
                console.log('Could not resume audio:', err);
            });
            AudioManager.wasPlayingBeforeHidden = false;
        }
    }
});
