// Sub Synthesizer (Piano-like sound)
class SubSynthTone {
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
        
        // Lowpass filter for sub-bass character (but allow more harmonics for piano-like sound)
        this.eq = new Tone.Filter({
            type: 'lowpass',
            frequency: 200,
            Q: 0.7
        });
        
        // High pass filter for reverb to reduce low-end mud
        this.reverbHighPass = new Tone.Filter({
            type: 'highpass',
            frequency: 300,
            Q: 0.7
        });
        
        // Saturation for warmth and character
        this.saturation = new Tone.Distortion(0);
        
        this.masterGain = new Tone.Gain(1.0);
        this.outputVolume = new Tone.Gain(0.22); // Output volume control before reverb (default 22%)
        this.dryGain = new Tone.Gain(0.1);
        this.reverbGain = new Tone.Gain(0.12);
        
        // Audio chain: masterGain -> volumeModulation -> outputVolume -> saturation -> (dryGain + reverbGain) -> reverb/eq -> compressor -> masterVolume
        // Output volume is independent control before reverb chain
        this.masterGain.connect(this.volumeModulation);
        this.volumeModulation.connect(this.outputVolume);
        this.outputVolume.connect(this.saturation);
        this.saturation.connect(this.dryGain);
        this.saturation.connect(this.reverbGain);
        
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
     */
    initializeVoicePool() {
        if (this.initialized) return;
        
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
        console.log(`Sub synth voice pool initialized with ${this.poolSize} voices`);
    }
    
    /**
     * Create voice nodes (internal - for pool initialization)
     * Reuses expensive nodes (envelopes, gains, filters) but creates new oscillators each time
     */
    _createVoiceNodes() {
        // Reusable nodes
        const env = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 });
        const env2 = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 });
        const env3 = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 });
        const filter = new Tone.Filter({ type: 'lowpass', frequency: 3520, Q: 1.0 });
        const gain1 = new Tone.Gain(1.0);
        const gain2 = new Tone.Gain(0.3);
        const gain3 = new Tone.Gain(0.15);
        const volumeGain = new Tone.Gain(1.0);
        const pan = new Tone.Panner(0);
        
        // Connect reusable nodes (oscillators will be connected when created)
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        filter.connect(volumeGain);
        volumeGain.connect(pan);
        pan.connect(this.masterGain);
        
        return {
            // Oscillators will be created fresh each time
            oscillator: null,
            oscillator2: null,
            oscillator3: null,
            // Reusable nodes
            envelope: env,
            envelope2: env2,
            envelope3: env3,
            filter: filter,
            pan: pan,
            volumeGain: volumeGain,
            gain1: gain1,
            gain2: gain2,
            gain3: gain3,
            inUse: false,
            stopTime: 0,
            cycleNumber: 0
        };
    }
    
    /**
     * Get a voice from the pool or create a new one if pool is exhausted
     */
    _getVoiceFromPool() {
        let voice = this.voicePool.find(v => !v.inUse);
        if (!voice) {
            console.warn('Sub voice pool exhausted, creating temporary voice');
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
                voice.envelope.cancel();
                voice.envelope2.cancel();
                voice.envelope3.cancel();
            } catch (e) {
                console.warn('Error resetting sub voice:', e);
            }
        } else {
            this._disposeVoice(voice);
        }
    }
    
    /**
     * Dispose of a voice
     */
    _disposeVoice(voice) {
        try {
            if (voice.oscillator) voice.oscillator.dispose();
            if (voice.oscillator2) voice.oscillator2.dispose();
            if (voice.oscillator3) voice.oscillator3.dispose();
            if (voice.envelope) voice.envelope.dispose();
            if (voice.envelope2) voice.envelope2.dispose();
            if (voice.envelope3) voice.envelope3.dispose();
            if (voice.filter) voice.filter.dispose();
            if (voice.pan) voice.pan.dispose();
            if (voice.volumeGain) voice.volumeGain.dispose();
            if (voice.gain1) voice.gain1.dispose();
            if (voice.gain2) voice.gain2.dispose();
            if (voice.gain3) voice.gain3.dispose();
        } catch (e) {
            console.warn('Error disposing sub voice:', e);
        }
    }
    
    cleanupVoices() {
        this.activeVoices.forEach(voice => {
            try {
                if (voice && voice.stop) {
                    voice.stop();
                }
                this._returnVoiceToPool(voice);
            } catch (e) {
                console.warn('Error cleaning up voice:', e);
            }
        });
        this.activeVoices = [];
    }
    
    createSubVoice(frequency, noteDuration, tempo = null) {
        // CRITICAL: Ensure AudioContext is running before creating nodes (mobile requirement)
        if (!window.Tone || !window.Tone.context) {
            console.warn('Tone.js not available, skipping voice creation');
            return;
        }
        
        const ctx = window.Tone.context;
        if (ctx.state !== 'running') {
            console.warn('AudioContext not running when creating voice. State:', ctx.state);
            ctx.resume().catch(err => {
                console.error('Failed to resume AudioContext in createSubVoice:', err);
            });
        }
        
        // Initialize voice pool if not already done
        if (!this.initialized) {
            this.initializeVoicePool();
        }
        
        // Use context.currentTime directly for more reliable timing
        const now = ctx.state === 'running' ? Tone.now() : (ctx.currentTime || 0);
        
        // Tempo-based random delay
        let startDelay = 0;
        if (tempo !== null && isFinite(tempo) && tempo > 0 && typeof currentBPM !== 'undefined' && isFinite(currentBPM) && currentBPM > 0) {
            const maxDelay = (tempo / currentBPM) * 0.02;
            startDelay = Math.random() * maxDelay;
        } else {
            startDelay = Math.random() * 0.02;
        }
        const startTime = now + startDelay;
        
        // Piano-like sound: use sharp attack
        const currentAttack = typeof subAttackTime === 'number' ? subAttackTime : 0.01;
        
        // Get a voice from the pool (reuse expensive nodes, create new oscillators)
        const voice = this._getVoiceFromPool();
        
        // Create new oscillators (they can't be restarted after stopping)
        const osc = new Tone.Oscillator({
            type: 'sine',
            frequency: frequency
        });
        
        const osc2 = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency * 2
        });
        
        const osc3 = new Tone.Oscillator({
            type: 'triangle',
            frequency: frequency * 3
        });
        
        // Connect new oscillators to reused gains
        osc.connect(voice.gain1);
        osc2.connect(voice.gain2);
        osc3.connect(voice.gain3);
        
        // Store oscillators in voice
        voice.oscillator = osc;
        voice.oscillator2 = osc2;
        voice.oscillator3 = osc3;
        
        // Configure reused nodes for this note
        voice.envelope.attack = currentAttack;
        voice.envelope.decay = Math.min(0.1, noteDuration * 0.2);
        voice.envelope.sustain = 0.4;
        voice.envelope.release = Math.min(0.3, noteDuration * 0.5);
        
        voice.envelope2.attack = currentAttack;
        voice.envelope2.decay = Math.min(0.1, noteDuration * 0.2);
        voice.envelope2.sustain = 0.4;
        voice.envelope2.release = Math.min(0.3, noteDuration * 0.5);
        
        voice.envelope3.attack = currentAttack;
        voice.envelope3.decay = Math.min(0.1, noteDuration * 0.2);
        voice.envelope3.sustain = 0.4;
        voice.envelope3.release = Math.min(0.3, noteDuration * 0.5);
        
        voice.filter.frequency.value = frequency * 8;
        
        const volumeVariation = 0.5012 + Math.random() * (1.0 - 0.5012);
        voice.volumeGain.gain.value = volumeVariation;
        
        voice.pan.pan.value = (Math.random() - 0.5) * 0.1;
        
        // Start oscillators and trigger envelopes
        osc.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);
        voice.envelope.triggerAttackRelease(noteDuration, startTime);
        voice.envelope2.triggerAttackRelease(noteDuration, startTime);
        voice.envelope3.triggerAttackRelease(noteDuration, startTime);
        
        const stopTime = startTime + noteDuration;
        osc.stop(stopTime);
        osc2.stop(stopTime);
        osc3.stop(stopTime);
        
        // Store metadata
        voice.stopTime = stopTime;
        voice.cycleNumber = typeof masterCycleNumber !== 'undefined' ? masterCycleNumber : 0;
        
        voice.stop = () => {
            try {
                voice.envelope.triggerRelease();
                voice.envelope2.triggerRelease();
                voice.envelope3.triggerRelease();
                if (voice.oscillator) voice.oscillator.stop('+0.1');
                if (voice.oscillator2) voice.oscillator2.stop('+0.1');
                if (voice.oscillator3) voice.oscillator3.stop('+0.1');
            } catch (e) {
                console.warn('Error stopping voice:', e);
            }
        };
        
        voice.dispose = () => {
            // Return to pool (oscillators will be disposed, reusable nodes kept)
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

