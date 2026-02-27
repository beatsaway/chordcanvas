/**
 * Web Audio API Additive Synthesis Engine
 * Based on research recommendations for efficient, realistic piano synthesis
 * 
 * Features:
 * - Object pooling for AudioNodes (critical for performance)
 * - Pre-computed spectral profiles for all velocities
 * - Per-voice control for realistic behavior
 * - Adaptive partial culling (LOD system)
 */

class AdditiveSynth {
    constructor(audioContext) {
        this.audioCtx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.partialPool = new PartialPool(128, this.audioCtx); // Increased to 128 partials for better polyphony
        this.spectralCache = new Map(); // baseFreq -> SpectralProfile
        this.activeNotes = new Map(); // noteId -> {partials: [], gainNode: GainNode, frequency, velocity, startTime, keyDown, pedalDown}
        this.pendingCleanups = new Map(); // noteId -> setTimeout ID (to cancel if needed)
        this.maxPartials = 12; // Reduced from 32 to 12 partials per note for better polyphony
        this.baseFreq = null; // Will be set per spectral profile
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        
        // Master output
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.25; // Reduced master volume for better velocity sensitivity (was 0.4, still too loud for low velocities)
        this.masterGain.connect(this.audioCtx.destination);
        
        // Start continuous harmonic evolution update loop
        this.updateInterval = null;
        this.startHarmonicEvolution();
        
        // Start performance adaptation
        this.adaptToPerformance();
    }
    
    /**
     * Calculate prime factor weight (pre-computed lookup)
     */
    getPrimeFactorWeight(n) {
        // Small lookup table for first 32 numbers
        const primeWeights = [
            0, 0, 1, 1, 0.5, 1, 0.33, 1, 0.25, 0.5, 0.2, 1, 0.16, 1, 0.14, 0.33,
            0.125, 1, 0.11, 1, 0.1, 0.09, 0.08, 1, 0.07, 0.06, 0.05, 1, 0.04, 0.03, 0.02, 0.01
        ];
        return primeWeights[n] || 0.01;
    }
    
    /**
     * Calculate amplitude for a harmonic based on velocity and pitch
     * Simplified version for v1_51 (without advanced physics modules)
     */
    calcAmplitude(harmonicNum, velocity, fundamentalFreq = null) {
        if (fundamentalFreq === null) {
            fundamentalFreq = 440; // Default to A4 if not provided
        }
        
        // 1. Base exponential rolloff
        let amplitude = Math.exp(-harmonicNum * 0.15);
        
        // 2. Velocity-dependent brightness boost
        const normalizedVel = Math.max(0, Math.min(127, velocity)) / 127.0;
        const brightness = 0.5 + (normalizedVel * 0.5); // 0.5 to 1.0
        amplitude *= (1.0 + normalizedVel * 0.3); // Velocity boost
        
        // 3. Odd/even harmonic balance (pianos emphasize odd harmonics)
        if (harmonicNum % 2 === 0) {
            amplitude *= 0.8; // Slightly reduce even harmonics
        }
        
        return Math.max(0, Math.min(1, amplitude));
    }
    
    /**
     * Calculate decay time for a harmonic (higher harmonics decay faster)
     */
    calcDecayTime(harmonicNum, velocity, baseDecay) {
        const normalizedVel = velocity / 127;
        const isHighHarmonic = harmonicNum > 6;
        
        if (!isHighHarmonic) {
            const harmonicFactor = Math.pow(harmonicNum, 0.7);
            const velFactor = 1.0 + (normalizedVel * 0.5);
            return (baseDecay * velFactor) / harmonicFactor;
        }
        
        const harmonicFactor = Math.pow(harmonicNum / 6, 3);
        const velFactor = 1.0 + (normalizedVel * 0.8);
        
        let maxDuration = Infinity;
        if (harmonicNum > 20) {
            maxDuration = 0.05;
        } else if (harmonicNum > 16) {
            maxDuration = 0.15;
        } else if (harmonicNum > 12) {
            maxDuration = 0.3;
        }
        
        const calculatedDecay = (baseDecay * velFactor) / harmonicFactor;
        return Math.min(calculatedDecay, maxDuration);
    }
    
    /**
     * Get or create spectral profile for a base frequency
     */
    getSpectralProfile(baseFreq) {
        const freqKey = Math.round(baseFreq);
        
        if (!this.spectralCache.has(freqKey)) {
            this.spectralCache.set(freqKey, new SpectralProfile(baseFreq, this));
        }
        
        return this.spectralCache.get(freqKey);
    }
    
    /**
     * Select which partials to activate (adaptive culling)
     */
    selectPartials(configs, maxPartials = null) {
        const limit = maxPartials || this.maxPartials;
        const ampThreshold = 0.001;
        const maxFreq = 24000;
        
        const candidates = [];
        for (let i = 0; i < configs.length; i++) {
            if (configs[i].amp > ampThreshold && configs[i].freq <= maxFreq) {
                candidates.push({ index: i, amp: configs[i].amp });
            }
        }
        
        candidates.sort((a, b) => b.amp - a.amp);
        return candidates.slice(0, limit).map(c => configs[c.index]);
    }
    
    /**
     * Trigger a note on
     */
    async noteOn(noteId, frequency, velocity, keyDown = true, pedalDown = false) {
        // Ensure partial pool is ready (AudioContext running, oscillators started)
        try {
            await this.partialPool.ensureReady();
        } catch (e) {
            console.warn('Failed to ensure partial pool ready:', e);
            return; // Can't play note if AudioContext isn't ready
        }
        
        const profile = this.getSpectralProfile(frequency);
        const configs = profile.getConfigs(velocity);
        
        // Adaptive partial allocation: use fewer partials when pool is low
        const poolAvailable = this.partialPool.available.length;
        const poolTotal = this.partialPool.pool.length;
        const poolUsageRatio = 1 - (poolAvailable / poolTotal);
        
        let adaptiveMaxPartials = this.maxPartials;
        if (poolUsageRatio > 0.7) {
            adaptiveMaxPartials = Math.max(6, Math.round(this.maxPartials * (1 - (poolUsageRatio - 0.7) / 0.3)));
        }
        
        const partialConfigs = this.selectPartials(configs, adaptiveMaxPartials);
        
        const noteGain = this.audioCtx.createGain();
        noteGain.gain.value = 1.0;
        noteGain.connect(this.masterGain);
        
        const partials = [];
        const now = this.audioCtx.currentTime;
        const initialAmplitudes = [];
        
        for (const config of partialConfigs) {
            if (config.freq > 24000) continue;
            
            let partial = this.partialPool.acquire();
            if (!partial) {
                const stolenNoteId = this.stealVoiceFromQuietestSustainedNote();
                if (stolenNoteId !== null) {
                    partial = this.partialPool.acquire();
                    if (!partial) {
                        console.warn(`Partial pool exhausted for note ${noteId}`);
                        break;
                    }
                } else {
                    console.warn(`Partial pool exhausted for note ${noteId}`);
                    break;
                }
            }
            
            if (partial) {
                partial.osc.frequency.value = config.freq;
                
                initialAmplitudes.push({
                    harmonicNum: config.harmonicNum,
                    initialAmp: config.amp
                });
                
                this.applyEnvelope(partial.gain, velocity, config.decay, now);
                
                partial.osc.connect(partial.filter);
                partial.filter.connect(partial.gain);
                partial.gain.connect(noteGain);
                
                partials.push(partial);
            }
        }
        
        this.activeNotes.set(noteId, {
            partials: partials,
            gainNode: noteGain,
            frequency: frequency,
            velocity: velocity,
            startTime: now,
            keyDown: keyDown,
            pedalDown: pedalDown,
            initialAmplitudes: initialAmplitudes,
            lastUpdateTime: now
        });
        
        return Promise.resolve(noteGain);
    }
    
    /**
     * Apply envelope to a gain node
     */
    applyEnvelope(gainNode, velocity, decayTime, startTime) {
        const normalizedVel = Math.max(0.001, velocity / 127);
        const attackTime = 0.01 + (0.02 * (1 - normalizedVel));
        const sustainLevel = Math.max(0.001, 0.3 + (normalizedVel * 0.2));
        
        const now = startTime || this.audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        
        const velocityScale = Math.pow(normalizedVel, 2.0);
        const attackStart = 0.001;
        const attackTarget = Math.max(0.001, velocityScale);
        gainNode.gain.setValueAtTime(attackStart, now);
        gainNode.gain.exponentialRampToValueAtTime(attackTarget, now + attackTime);
        
        const sustainTarget = Math.max(0.001, sustainLevel * velocityScale);
        gainNode.gain.exponentialRampToValueAtTime(sustainTarget, now + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainTarget, now + attackTime + decayTime);
    }
    
    /**
     * Trigger a note off
     */
    noteOff(noteId, releaseTime = 0.5, immediateCleanup = false) {
        const note = this.activeNotes.get(noteId);
        if (!note) return;
        
        if (this.pendingCleanups.has(noteId)) {
            clearTimeout(this.pendingCleanups.get(noteId));
            this.pendingCleanups.delete(noteId);
        }
        
        const now = this.audioCtx.currentTime;
        const safeReleaseTime = Math.max(0.1, releaseTime);
        const masterGainValue = note.gainNode ? note.gainNode.gain.value : 1.0;
        
        note.partials.forEach(partial => {
            const currentPartialValue = partial.gain.gain.value;
            partial.gain.gain.cancelScheduledValues(now);
            partial.gain.gain.setValueAtTime(currentPartialValue, now);
            
            if (safeReleaseTime < 0.15) {
                partial.gain.gain.linearRampToValueAtTime(0.001, now + safeReleaseTime);
            } else {
                partial.gain.gain.exponentialRampToValueAtTime(0.001, now + safeReleaseTime);
            }
        });
        
        if (note.gainNode && masterGainValue < 0.99) {
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(masterGainValue, now);
            if (safeReleaseTime < 0.15) {
                note.gainNode.gain.linearRampToValueAtTime(0.001, now + safeReleaseTime);
            } else {
                note.gainNode.gain.exponentialRampToValueAtTime(0.001, now + safeReleaseTime);
            }
        }
        
        if (immediateCleanup) {
            this.cleanupNote(noteId);
        } else {
            const timeoutId = setTimeout(() => {
                this.cleanupNote(noteId);
                this.pendingCleanups.delete(noteId);
            }, (releaseTime * 1000) + 100);
            this.pendingCleanups.set(noteId, timeoutId);
        }
    }
    
    /**
     * Update note state (key down, pedal down)
     */
    updateNoteState(noteId, keyDown, pedalDown) {
        const note = this.activeNotes.get(noteId);
        if (note) {
            note.keyDown = keyDown;
            note.pedalDown = pedalDown;
        }
    }
    
    /**
     * Steal voice from quietest sustained note
     */
    stealVoiceFromQuietestSustainedNote() {
        let quietestNoteId = null;
        let quietestVolume = Infinity;
        const now = this.audioCtx.currentTime;
        
        for (const [noteId, note] of this.activeNotes) {
            if (!note.keyDown && note.partials.length > 0) {
                const masterGain = note.gainNode ? note.gainNode.gain.value : 1.0;
                const avgPartialGain = note.partials.reduce((sum, p) => sum + p.gain.gain.value, 0) / note.partials.length;
                const effectiveVolume = masterGain * avgPartialGain;
                const age = now - note.startTime;
                const stealScore = effectiveVolume / (1 + age * 0.1);
                
                if (stealScore < quietestVolume) {
                    quietestVolume = stealScore;
                    quietestNoteId = noteId;
                }
            }
        }
        
        if (quietestNoteId !== null) {
            const note = this.activeNotes.get(quietestNoteId);
            if (note) {
                this.noteOff(quietestNoteId, 0.05, false);
                return quietestNoteId;
            }
        }
        
        return null;
    }
    
    /**
     * Set per-note volume
     */
    setNoteVolume(noteId, volume) {
        const note = this.activeNotes.get(noteId);
        if (note && note.gainNode) {
            const now = this.audioCtx.currentTime;
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(volume, now);
        }
    }
    
    /**
     * Ramp note volume
     */
    rampNoteVolume(noteId, targetVolume, duration) {
        const note = this.activeNotes.get(noteId);
        if (note && note.gainNode) {
            const now = this.audioCtx.currentTime;
            const currentValue = note.gainNode.gain.value;
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(currentValue, now);
            note.gainNode.gain.exponentialRampToValueAtTime(targetVolume, now + duration);
        }
    }
    
    /**
     * Start continuous harmonic evolution update loop
     */
    startHarmonicEvolution() {
        if (this.updateInterval) return;
        
        this.updateInterval = setInterval(() => {
            this.updateHarmonicEvolution();
        }, 200);
    }
    
    /**
     * Stop harmonic evolution update loop
     */
    stopHarmonicEvolution() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Update harmonic evolution for all active notes
     */
    updateHarmonicEvolution() {
        const now = this.audioCtx.currentTime;
        const sustainPedalActive = (typeof window !== 'undefined' && window.sustainPedalActive) || false;
        
        for (const [noteId, note] of this.activeNotes) {
            const elapsed = now - note.startTime;
            const decayTime = 8.0; // Simple decay
            const decayRate = Math.exp(-elapsed / decayTime);
            
            note.partials.forEach((partial, index) => {
                if (index >= note.initialAmplitudes.length) return;
                
                const harmonicInfo = note.initialAmplitudes[index];
                const harmonicNum = harmonicInfo.harmonicNum;
                const harmonicDecayRate = decayRate * (1.0 / Math.pow(harmonicNum, 0.5));
                let targetAmp = harmonicInfo.initialAmp * harmonicDecayRate;
                
                const minAmp = 0.0001;
                const clampedAmp = Math.max(minAmp, targetAmp);
                
                const currentValue = partial.gain.gain.value;
                const changeRatio = Math.abs(currentValue - clampedAmp) / Math.max(currentValue, minAmp);
                if (changeRatio > 0.05) {
                    partial.gain.gain.cancelScheduledValues(now);
                    partial.gain.gain.setValueAtTime(Math.max(minAmp, currentValue), now);
                    partial.gain.gain.exponentialRampToValueAtTime(clampedAmp, now + 0.2);
                }
            });
            
            const maxPartialAmp = Math.max(...note.partials.map(p => p.gain.gain.value));
            if (maxPartialAmp < 0.0005 && elapsed > 0.5) {
                if (!this.pendingCleanups.has(noteId)) {
                    const timeoutId = setTimeout(() => {
                        const note = this.activeNotes.get(noteId);
                        if (note) {
                            const currentMaxAmp = Math.max(...note.partials.map(p => p.gain.gain.value));
                            if (currentMaxAmp < 0.001) {
                                this.cleanupNote(noteId);
                            }
                        }
                        this.pendingCleanups.delete(noteId);
                    }, 200);
                    this.pendingCleanups.set(noteId, timeoutId);
                }
            }
            
            note.lastUpdateTime = now;
        }
    }
    
    /**
     * Clean up a note (release partials back to pool)
     */
    cleanupNote(noteId) {
        const note = this.activeNotes.get(noteId);
        if (!note) return;
        
        if (this.pendingCleanups.has(noteId)) {
            clearTimeout(this.pendingCleanups.get(noteId));
            this.pendingCleanups.delete(noteId);
        }
        
        const now = this.audioCtx.currentTime;
        
        note.partials.forEach(partial => {
            const currentValue = partial.gain.gain.value;
            partial.gain.gain.cancelScheduledValues(now);
            if (currentValue > 0.001) {
                partial.gain.gain.setValueAtTime(currentValue, now);
                partial.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
            } else {
                partial.gain.gain.setValueAtTime(0, now);
            }
            setTimeout(() => {
                partial.osc.disconnect();
                partial.filter.disconnect();
                partial.gain.disconnect();
                this.partialPool.release(partial);
            }, 15);
        });
        
        if (note.gainNode) {
            const currentGainValue = note.gainNode.gain.value;
            note.gainNode.gain.cancelScheduledValues(now);
            if (currentGainValue > 0.001) {
                note.gainNode.gain.setValueAtTime(currentGainValue, now);
                note.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
                setTimeout(() => {
                    note.gainNode.disconnect();
                }, 15);
            } else {
                note.gainNode.gain.setValueAtTime(0, now);
                note.gainNode.disconnect();
            }
        }
        
        this.activeNotes.delete(noteId);
    }
    
    /**
     * Adapt to performance
     */
    adaptToPerformance() {
        requestAnimationFrame(() => this.adaptToPerformance());
    }
    
    /**
     * Get active note count
     */
    getActiveNoteCount() {
        return this.activeNotes.size;
    }
    
    /**
     * Get active partial count
     */
    getActivePartialCount() {
        let count = 0;
        this.activeNotes.forEach(note => {
            count += note.partials.length;
        });
        return count;
    }
}

/**
 * Spectral Profile - Pre-computed configurations for all velocities
 */
class SpectralProfile {
    constructor(baseFreq, synth) {
        this.baseFreq = baseFreq;
        this.synth = synth;
        this.configs = new Array(128);
        
        synth.baseFreq = baseFreq;
        
        for (let v = 0; v < 128; v++) {
            this.configs[v] = this.computeConfigsForVelocity(v);
        }
    }
    
    computeConfigsForVelocity(velocity) {
        const normalizedVel = velocity / 127;
        const configs = [];
        const maxPartials = 32;
        
        for (let i = 0; i < maxPartials; i++) {
            const harmonicNum = i + 1;
            const primeFactor = this.synth.getPrimeFactorWeight(harmonicNum);
            const baseStretch = 0.1;
            const freqFactor = 1.0 - Math.min(1.0, this.baseFreq / 2000);
            const balancedStretch = baseStretch * freqFactor;
            const stretch = 1.0 + (normalizedVel * balancedStretch * primeFactor);
            const freq = this.baseFreq * harmonicNum * stretch;
            const amp = this.synth.calcAmplitude(harmonicNum, velocity, this.baseFreq);
            const baseDecay = 0.3;
            const decay = this.synth.calcDecayTime(harmonicNum, velocity, baseDecay);
            
            configs.push({
                freq: freq,
                amp: amp,
                decay: decay,
                harmonicNum: harmonicNum
            });
        }
        
        return configs;
    }
    
    getConfigs(velocity) {
        return this.configs[Math.max(0, Math.min(127, velocity))];
    }
}

/**
 * Partial Pool - Object pooling for AudioNodes (critical for performance)
 */
class PartialPool {
    constructor(size = 128, audioContext) {
        this.audioCtx = audioContext;
        this.pool = [];
        this.available = [];
        this.initialized = false;
        
        // Don't start oscillators yet - wait until AudioContext is running
        // This prevents "AudioContext was not allowed to start" warnings
        for (let i = 0; i < size; i++) {
            const osc = this.audioCtx.createOscillator();
            const filter = this.audioCtx.createBiquadFilter();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.value = 20000;
            filter.Q.value = 1.0;
            gain.gain.value = 0;
            
            // DON'T start oscillator here - start it lazily when acquired
            // osc.start() requires AudioContext to be running
            
            this.pool.push({
                osc: osc,
                filter: filter,
                gain: gain,
                inUse: false,
                started: false, // Track if oscillator has been started
                index: i
            });
            
            this.available.push(i);
        }
    }
    
    /**
     * Ensure AudioContext is running before starting oscillators
     */
    ensureReady() {
        if (this.initialized) return Promise.resolve();
        
        // Resume AudioContext if suspended
        if (this.audioCtx.state === 'suspended') {
            return this.audioCtx.resume().then(() => {
                // Start all oscillators now that AudioContext is running
                for (let i = 0; i < this.pool.length; i++) {
                    const partial = this.pool[i];
                    if (!partial.started) {
                        try {
                            partial.osc.start();
                            partial.started = true;
                        } catch (e) {
                            // Oscillator might already be started, ignore
                        }
                    }
                }
                this.initialized = true;
            }).catch(err => {
                console.warn('Failed to initialize partial pool:', err);
                return Promise.reject(err);
            });
        } else if (this.audioCtx.state === 'running') {
            // AudioContext is already running, start oscillators
            for (let i = 0; i < this.pool.length; i++) {
                const partial = this.pool[i];
                if (!partial.started) {
                    try {
                        partial.osc.start();
                        partial.started = true;
                    } catch (e) {
                        // Oscillator might already be started, ignore
                    }
                }
            }
            this.initialized = true;
            return Promise.resolve();
        } else {
            // AudioContext is closed or in an invalid state
            return Promise.reject(new Error('AudioContext is not available'));
        }
    }
    
    acquire() {
        if (this.available.length === 0) {
            console.warn(`Partial pool exhausted! Available: ${this.available.length}, Total: ${this.pool.length}, In use: ${this.pool.length - this.available.length}`);
            return null;
        }
        
        const idx = this.available.pop();
        const partial = this.pool[idx];
        partial.inUse = true;
        partial.gain.gain.cancelScheduledValues(0);
        partial.gain.gain.value = 0;
        
        // Ensure oscillator is started (lazy initialization)
        if (!partial.started && this.audioCtx.state === 'running') {
            try {
                partial.osc.start();
                partial.started = true;
            } catch (e) {
                // Oscillator might already be started, ignore
            }
        }
        
        return partial;
    }
    
    release(partial) {
        if (!partial || !partial.inUse) return;
        
        const idx = partial.index;
        partial.inUse = false;
        partial.gain.gain.cancelScheduledValues(0);
        partial.gain.gain.value = 0;
        
        partial.osc.disconnect();
        partial.filter.disconnect();
        partial.gain.disconnect();
        
        this.available.push(idx);
    }
}

/**
 * Performance Monitor - Adapts partial count based on performance
 */
class PerformanceMonitor {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        this.maxPartialBudget = 48;
        this.currentBudget = 48;
    }
    
    update() {
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastTime;
        
        if (elapsed >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.adaptToPerformance();
        }
    }
    
    adaptToPerformance() {
        if (this.fps < 50) {
            this.currentBudget = Math.max(16, this.currentBudget - 8);
        } else if (this.fps > 58 && this.currentBudget < this.maxPartialBudget) {
            this.currentBudget = Math.min(this.maxPartialBudget, this.currentBudget + 4);
        }
    }
    
    getPartialBudget() {
        return this.currentBudget;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdditiveSynth = AdditiveSynth;
    window.SpectralProfile = SpectralProfile;
    window.PartialPool = PartialPool;
    window.PerformanceMonitor = PerformanceMonitor;
}
