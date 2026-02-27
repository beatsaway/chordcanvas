// Water Synthesizer
class WaterSynthTone {
    constructor(masterVolumeNode) {
        this.masterVolumeNode = masterVolumeNode;
        this.activeVoices = [];
        
        // Voice pool for reusing nodes (mobile optimization)
        this.voicePool = [];
        this.poolSize = 20; // Pre-create 20 voices for reuse
        this.initialized = false;
        
        // Volume modulation node (applied only to dry path, not reverb)
        this.volumeModulation = new Tone.Volume(0);
        
        this.reverb = new Tone.Reverb({
            roomSize: 0.9,
            dampening: 3000,
            wet: 1.0
        });
        
        this.compressor = new Tone.Compressor({
            threshold: -12,
            ratio: 12,
            attack: 0.003,
            release: 0.1
        });
        
        this.eq = new Tone.Filter({
            type: 'lowpass',
            frequency: 15000,
            Q: 0.7
        });
        
        // High pass filter for reverb to reduce low-end mud
        this.reverbHighPass = new Tone.Filter({
            type: 'highpass',
            frequency: 300,
            Q: 0.7
        });
        
        this.masterGain = new Tone.Gain(1.0);
        this.outputVolume = new Tone.Gain(0.5); // Output volume control before reverb (default 50%)
        this.dryGain = new Tone.Gain(0.08);
        this.reverbGain = new Tone.Gain(0.77);
        
        // Audio chain: masterGain -> volumeModulation -> outputVolume -> (dryGain + reverbGain) -> reverb/eq -> compressor -> masterVolume
        // Volume modulation affects both dry and reverb paths BEFORE reverb
        // Output volume is independent control before reverb chain
        this.masterGain.connect(this.volumeModulation);
        this.volumeModulation.connect(this.outputVolume);
        this.outputVolume.connect(this.dryGain);
        this.outputVolume.connect(this.reverbGain);
        
        // Dry path: dryGain -> eq -> compressor
        this.dryGain.connect(this.eq);
        this.eq.connect(this.compressor);
        
        // Reverb path: reverbGain -> reverb -> reverbHighPass -> compressor
        this.reverbGain.connect(this.reverb);
        this.reverb.connect(this.reverbHighPass);
        this.reverbHighPass.connect(this.compressor);
        
        if (this.masterVolumeNode) {
            this.compressor.connect(this.masterVolumeNode);
        } else {
            this.compressor.toDestination();
        }
        
        this.reverb.generate().catch(console.error);
    }
    
    /**
     * Initialize voice pool - create reusable voice nodes
     * This should be called after AudioContext is running
     */
    initializeVoicePool() {
        if (this.initialized) return;
        
        // Ensure AudioContext is running
        if (!window.Tone || !window.Tone.context || window.Tone.context.state !== 'running') {
            console.warn('Cannot initialize voice pool - AudioContext not running');
            return;
        }
        
        for (let i = 0; i < this.poolSize; i++) {
            const voice = this._createVoiceNodes();
            voice.inUse = false;
            this.voicePool.push(voice);
        }
        
        this.initialized = true;
        console.log(`Water synth voice pool initialized with ${this.poolSize} voices`);
    }
    
    /**
     * Create voice nodes (internal - for pool initialization)
     * Reuses expensive nodes (envelopes, gains, filters) but creates new oscillators each time
     * (Oscillators can't be restarted after stopping in Tone.js)
     */
    _createVoiceNodes() {
        // Reusable nodes (expensive to create)
        const env = new Tone.AmplitudeEnvelope({ attack: 0.02, decay: 0.01, sustain: 0.35, release: 0.3 });
        const env2 = new Tone.AmplitudeEnvelope({ attack: 0.02, decay: 0.01, sustain: 0.25, release: 0.3 });
        const env3 = new Tone.AmplitudeEnvelope({ attack: 0.02, decay: 0.01, sustain: 0.15, release: 0.3 });
        const env4 = new Tone.AmplitudeEnvelope({ attack: 0.02, decay: 0.01, sustain: 0.1, release: 0.3 });
        
        const harmonicGain2 = new Tone.Gain(0.3);
        const harmonicGain3 = new Tone.Gain(0.2);
        const harmonicGain4 = new Tone.Gain(0.1);
        
        const noiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.07, sustain: 0, release: 0 });
        const noiseGain = new Tone.Gain(0.03);
        
        const pan = new Tone.Panner(0);
        const volumeGain = new Tone.Gain(1.0);
        
        // Connect reusable nodes (oscillators will be connected when created)
        env.connect(volumeGain);
        env2.connect(harmonicGain2);
        harmonicGain2.connect(volumeGain);
        env3.connect(harmonicGain3);
        harmonicGain3.connect(volumeGain);
        env4.connect(harmonicGain4);
        harmonicGain4.connect(volumeGain);
        volumeGain.connect(pan);
        pan.connect(this.masterGain);
        
        noiseGain.connect(noiseEnv);
        noiseEnv.connect(pan);
        
        return {
            // Oscillators will be created fresh each time (can't restart after stop)
            oscillator: null,
            oscillator2: null,
            oscillator3: null,
            oscillator4: null,
            noise: null,
            // Reusable nodes
            envelope: env,
            envelope2: env2,
            envelope3: env3,
            envelope4: env4,
            harmonicGain2: harmonicGain2,
            harmonicGain3: harmonicGain3,
            harmonicGain4: harmonicGain4,
            noiseEnv: noiseEnv,
            noiseGain: noiseGain,
            pan: pan,
            volumeGain: volumeGain,
            inUse: false,
            stopTime: 0,
            cycleNumber: 0
        };
    }
    
    /**
     * Get a voice from the pool or create a new one if pool is exhausted
     */
    _getVoiceFromPool() {
        // Find an unused voice in the pool
        let voice = this.voicePool.find(v => !v.inUse);
        
        // If pool is exhausted, create a new voice (but don't add to pool to avoid memory growth)
        if (!voice) {
            console.warn('Voice pool exhausted, creating temporary voice');
            voice = this._createVoiceNodes();
        } else {
            voice.inUse = true;
        }
        
        return voice;
    }
    
    /**
     * Return a voice to the pool
     */
    _returnVoiceToPool(voice) {
        if (this.voicePool.includes(voice)) {
            voice.inUse = false;
            // Dispose oscillators (they can't be restarted) but keep reusable nodes
            try {
                if (voice.oscillator) {
                    try {
                        if (voice.oscillator.state === 'started') voice.oscillator.stop();
                    } catch (e) {}
                    voice.oscillator.dispose();
                    voice.oscillator = null;
                }
                if (voice.oscillator2) {
                    try {
                        if (voice.oscillator2.state === 'started') voice.oscillator2.stop();
                    } catch (e) {}
                    voice.oscillator2.dispose();
                    voice.oscillator2 = null;
                }
                if (voice.oscillator3) {
                    try {
                        if (voice.oscillator3.state === 'started') voice.oscillator3.stop();
                    } catch (e) {}
                    voice.oscillator3.dispose();
                    voice.oscillator3 = null;
                }
                if (voice.oscillator4) {
                    try {
                        if (voice.oscillator4.state === 'started') voice.oscillator4.stop();
                    } catch (e) {}
                    voice.oscillator4.dispose();
                    voice.oscillator4 = null;
                }
                if (voice.noise) {
                    try {
                        if (voice.noise.state === 'started') voice.noise.stop();
                    } catch (e) {}
                    voice.noise.dispose();
                    voice.noise = null;
                }
                voice.envelope.cancel();
                voice.envelope2.cancel();
                voice.envelope3.cancel();
                voice.envelope4.cancel();
                voice.noiseEnv.cancel();
            } catch (e) {
                console.warn('Error resetting voice:', e);
            }
        } else {
            // Temporary voice - dispose it
            this._disposeVoice(voice);
        }
    }
    
    /**
     * Dispose of a voice (for temporary voices or cleanup)
     */
    _disposeVoice(voice) {
        try {
            if (voice.oscillator) voice.oscillator.dispose();
            if (voice.oscillator2) voice.oscillator2.dispose();
            if (voice.oscillator3) voice.oscillator3.dispose();
            if (voice.oscillator4) voice.oscillator4.dispose();
            if (voice.envelope) voice.envelope.dispose();
            if (voice.envelope2) voice.envelope2.dispose();
            if (voice.envelope3) voice.envelope3.dispose();
            if (voice.envelope4) voice.envelope4.dispose();
            if (voice.noise) voice.noise.dispose();
            if (voice.noiseEnv) voice.noiseEnv.dispose();
            if (voice.pan) voice.pan.dispose();
            if (voice.volumeGain) voice.volumeGain.dispose();
            if (voice.harmonicGain2) voice.harmonicGain2.dispose();
            if (voice.harmonicGain3) voice.harmonicGain3.dispose();
            if (voice.harmonicGain4) voice.harmonicGain4.dispose();
        } catch (e) {
            console.warn('Error disposing voice:', e);
        }
    }
    
    cleanupVoices() {
        this.activeVoices.forEach(voice => {
            try {
                if (voice && voice.stop) {
                    voice.stop();
                }
                // Return voices to pool instead of disposing
                this._returnVoiceToPool(voice);
            } catch (e) {
                console.warn('Error cleaning up voice:', e);
            }
        });
        this.activeVoices = [];
    }
    
    createWaterVoice(frequency, noteDuration, pitchDrop = 0.02, noiseAmount = 0.03, isHighNote = false, tempo = null) {
        // CRITICAL: Ensure AudioContext is running before creating nodes (mobile requirement)
        if (!window.Tone || !window.Tone.context) {
            console.warn('Tone.js not available, skipping voice creation');
            return;
        }
        
        const ctx = window.Tone.context;
        if (ctx.state !== 'running') {
            console.warn('AudioContext not running when creating voice. State:', ctx.state);
            ctx.resume().catch(err => {
                console.error('Failed to resume AudioContext in createWaterVoice:', err);
            });
        }
        
        // Initialize voice pool if not already done
        if (!this.initialized) {
            this.initializeVoicePool();
        }
        
        // Use context.currentTime directly for more reliable timing
        const now = ctx.state === 'running' ? Tone.now() : (ctx.currentTime || 0);
        
        // Tempo-based random delay: 0 to (tempo / currentBPM) * 0.02 seconds
        let startDelay = 0;
        if (tempo !== null && isFinite(tempo) && tempo > 0 && typeof currentBPM !== 'undefined' && isFinite(currentBPM) && currentBPM > 0) {
            const maxDelay = (tempo / currentBPM) * 0.02;
            startDelay = Math.random() * maxDelay;
        } else {
            startDelay = Math.random() * 0.02;
        }
        const startTime = now + startDelay;
        
        // Random decay reduction 0-40ms
        const decayReduction = Math.random() * 0.04;
        
        const finalPitchDrop = frequency * (pitchDrop + Math.random() * 0.02);
        const finalNoiseAmount = noiseAmount * (0.8 + Math.random() * 0.4);
        
        // Get a voice from the pool (reuse expensive nodes, create new oscillators)
        const voice = this._getVoiceFromPool();
        
        // Create new oscillators (they can't be restarted after stopping)
        // But reuse envelopes, gains, filters, etc.
        const osc = new Tone.Oscillator({
            type: 'sine',
            frequency: frequency + finalPitchDrop
        });
        osc.frequency.exponentialRampTo(frequency, 0.08);
        
        const osc2 = new Tone.Oscillator({
            type: 'sine',
            frequency: (frequency * 2) + (finalPitchDrop * 2)
        });
        osc2.frequency.exponentialRampTo(frequency * 2, 0.08);
        
        const osc3 = new Tone.Oscillator({
            type: 'sine',
            frequency: (frequency * 3) + (finalPitchDrop * 3)
        });
        osc3.frequency.exponentialRampTo(frequency * 3, 0.08);
        
        const osc4 = new Tone.Oscillator({
            type: 'sine',
            frequency: (frequency * 4) + (finalPitchDrop * 4)
        });
        osc4.frequency.exponentialRampTo(frequency * 4, 0.08);
        
        const noise = new Tone.Noise({
            type: 'white',
            volume: -20
        });
        
        // Connect new oscillators to reused envelopes
        osc.connect(voice.envelope);
        osc2.connect(voice.envelope2);
        osc3.connect(voice.envelope3);
        osc4.connect(voice.envelope4);
        noise.connect(voice.noiseGain);
        
        // Store oscillators in voice
        voice.oscillator = osc;
        voice.oscillator2 = osc2;
        voice.oscillator3 = osc3;
        voice.oscillator4 = osc4;
        voice.noise = noise;
        
        // Calculate release time with decay reduction
        const baseRelease = Math.min(0.3, noteDuration * 0.3);
        const reducedRelease = Math.max(0.01, baseRelease - decayReduction);
        
        // Random sustain variation: -0 to -2dB (linear: 1.0 to 0.794)
        const sustainVariation = Math.random() * (1.0 - 0.794) + 0.794;
        const sustainVariation2 = Math.random() * (1.0 - 0.794) + 0.794;
        const sustainVariation3 = Math.random() * (1.0 - 0.794) + 0.794;
        const sustainVariation4 = Math.random() * (1.0 - 0.794) + 0.794;
        
        // Use water-specific attack time
        const currentAttack = typeof waterAttackTime === 'number' ? waterAttackTime : 0.02;
        
        // Update envelope parameters
        voice.envelope.attack = currentAttack;
        voice.envelope.sustain = 0.35 * sustainVariation;
        voice.envelope.release = reducedRelease;
        
        voice.envelope2.attack = currentAttack;
        voice.envelope2.sustain = 0.25 * sustainVariation2;
        voice.envelope2.release = reducedRelease;
        
        voice.envelope3.attack = currentAttack;
        voice.envelope3.sustain = 0.15 * sustainVariation3;
        voice.envelope3.release = reducedRelease;
        
        voice.envelope4.attack = currentAttack;
        voice.envelope4.sustain = 0.1 * sustainVariation4;
        voice.envelope4.release = reducedRelease;
        
        // Use water-specific harmonic gains
        const currentHarmonic2 = typeof waterHarmonic2Gain === 'number' ? waterHarmonic2Gain : 0.3;
        const currentHarmonic3 = typeof waterHarmonic3Gain === 'number' ? waterHarmonic3Gain : 0.2;
        const currentHarmonic4 = typeof waterHarmonic4Gain === 'number' ? waterHarmonic4Gain : 0.1;
        
        voice.harmonicGain2.gain.value = currentHarmonic2;
        voice.harmonicGain3.gain.value = currentHarmonic3;
        voice.harmonicGain4.gain.value = currentHarmonic4;
        
        voice.noiseGain.gain.value = finalNoiseAmount * 0.5;
        
        // Random panning
        voice.pan.pan.value = (Math.random() - 0.5) * 0.15;
        
        // Apply -12 dB reduction for high notes (linear gain ≈ 0.251)
        const highNoteVolumeReduction = isHighNote ? 0.251 : 1.0;
        // Random volume reduction 0-6dB (linear gain: 0.5012 to 1.0)
        const volumeVariation = 0.5012 + Math.random() * (1.0 - 0.5012);
        voice.volumeGain.gain.value = highNoteVolumeReduction * volumeVariation;
        
        // Start oscillators and trigger envelopes
        voice.oscillator.start(startTime);
        voice.oscillator2.start(startTime);
        voice.oscillator3.start(startTime);
        voice.oscillator4.start(startTime);
        voice.noise.start(startTime);
        voice.envelope.triggerAttack(startTime);
        voice.envelope2.triggerAttack(startTime);
        voice.envelope3.triggerAttack(startTime);
        voice.envelope4.triggerAttack(startTime);
        voice.noiseEnv.triggerAttack(startTime);
        
        voice.noise.stop(startTime + 0.15);
        
        const stopTime = startTime + noteDuration;
        voice.oscillator.stop(stopTime);
        voice.oscillator2.stop(stopTime);
        voice.oscillator3.stop(stopTime);
        voice.oscillator4.stop(stopTime);
        
        const releaseTime = Math.max(startTime + 0.01, stopTime - reducedRelease);
        voice.envelope.triggerRelease(releaseTime);
        voice.envelope2.triggerRelease(releaseTime);
        voice.envelope3.triggerRelease(releaseTime);
        voice.envelope4.triggerRelease(releaseTime);
        
        // Store metadata
        voice.stopTime = stopTime;
        voice.cycleNumber = typeof masterCycleNumber !== 'undefined' ? masterCycleNumber : 0;
        
        // Add stop and dispose methods
        voice.stop = () => {
            try {
                voice.envelope.triggerRelease();
                voice.envelope2.triggerRelease();
                voice.envelope3.triggerRelease();
                voice.envelope4.triggerRelease();
                if (voice.oscillator) voice.oscillator.stop('+0.1');
                if (voice.oscillator2) voice.oscillator2.stop('+0.1');
                if (voice.oscillator3) voice.oscillator3.stop('+0.1');
                if (voice.oscillator4) voice.oscillator4.stop('+0.1');
                if (voice.noise) voice.noise.stop();
            } catch (e) {
                console.warn('Error stopping voice:', e);
            }
        };
        
        voice.dispose = () => {
            // Return to pool instead of disposing (oscillators will be disposed, reusable nodes kept)
            this._returnVoiceToPool(voice);
        };
        
        this.activeVoices.push(voice);
        
        // Return voice to pool after note finishes
        setTimeout(() => {
            const index = this.activeVoices.indexOf(voice);
            if (index > -1) {
                this.activeVoices.splice(index, 1);
                this._returnVoiceToPool(voice);
            }
        }, (noteDuration + 0.5) * 1000);
        
        return voice;
    }
}

