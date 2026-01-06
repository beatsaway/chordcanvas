// Sub Synthesizer (Piano-like sound)
class SubSynthTone {
    constructor(masterVolumeNode) {
        this.masterVolumeNode = masterVolumeNode;
        this.activeVoices = [];
        
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
    
    cleanupVoices() {
        this.activeVoices.forEach(voice => {
            try {
                if (voice && voice.stop) {
                    voice.stop();
                }
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
                console.warn('Error cleaning up voice:', e);
            }
        });
        this.activeVoices = [];
    }
    
    createSubVoice(frequency, noteDuration, tempo = null) {
        const now = Tone.now();
        
        // Tempo-based random delay: 0 to (tempo / currentBPM) * 0.02 seconds
        let startDelay = 0;
        if (tempo !== null && isFinite(tempo) && tempo > 0 && typeof currentBPM !== 'undefined' && isFinite(currentBPM) && currentBPM > 0) {
            const maxDelay = (tempo / currentBPM) * 0.02;
            startDelay = Math.random() * maxDelay;
        } else {
            // Fallback to old behavior if tempo not provided
            startDelay = Math.random() * 0.02;
        }
        const startTime = now + startDelay;
        
        // Piano-like sound: use sharp attack (0.01) instead of slow attack (0.08)
        // Use sub-specific attack time, but default to piano-like sharp attack
        const currentAttack = typeof subAttackTime === 'number' ? subAttackTime : 0.01;
        
        // Piano-like sound: fundamental + harmonics
        // Fundamental (sine for clean base)
        const osc = new Tone.Oscillator({
            type: 'sine',
            frequency: frequency
        });
        
        // Octave harmonic (sawtooth for brightness) - like piano
        const osc2 = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency * 2
        });
        
        // Fifth harmonic (triangle for warmth) - like piano
        const osc3 = new Tone.Oscillator({
            type: 'triangle',
            frequency: frequency * 3
        });
        
        // Piano-like envelope: sharp attack, decay, sustain, release
        const env = new Tone.AmplitudeEnvelope({
            attack: currentAttack, // Very quick attack for punch (piano-like)
            decay: Math.min(0.1, noteDuration * 0.2), // Match piano decay
            sustain: 0.4, // Match piano sustain
            release: Math.min(0.3, noteDuration * 0.5) // Match piano release
        });
        
        const env2 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: Math.min(0.1, noteDuration * 0.2),
            sustain: 0.4,
            release: Math.min(0.3, noteDuration * 0.5)
        });
        
        const env3 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: Math.min(0.1, noteDuration * 0.2),
            sustain: 0.4,
            release: Math.min(0.3, noteDuration * 0.5)
        });
        
        // Lowpass filter to soften harmonics slightly (like piano)
        // Allow more harmonics through (frequency * 8) instead of frequency * 3
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: frequency * 8, // Allow harmonics but roll off very high frequencies (piano-like)
            Q: 1.0
        });
        
        // Gain controls for each oscillator (matching piano harmonic balance)
        const gain1 = new Tone.Gain(1.0);   // Fundamental - full volume
        const gain2 = new Tone.Gain(0.3);   // Octave - quieter (piano-like)
        const gain3 = new Tone.Gain(0.15);  // Fifth - even quieter (piano-like)
        
        // Random volume reduction 0-6dB (linear gain: 0.5012 to 1.0)
        const volumeVariation = 0.5012 + Math.random() * (1.0 - 0.5012);
        const volumeGain = new Tone.Gain(volumeVariation);
        const pan = new Tone.Panner((Math.random() - 0.5) * 0.1); // Less panning for bass
        
        // Routing: oscillators -> gains -> filter -> volumeGain -> pan -> masterGain
        osc.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        filter.connect(volumeGain);
        volumeGain.connect(pan);
        pan.connect(this.masterGain);
        
        // Start oscillators and trigger envelopes
        osc.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);
        env.triggerAttackRelease(noteDuration, startTime);
        env2.triggerAttackRelease(noteDuration, startTime);
        env3.triggerAttackRelease(noteDuration, startTime);
        
        const stopTime = startTime + noteDuration;
        osc.stop(stopTime);
        osc2.stop(stopTime);
        osc3.stop(stopTime);
        
        const voice = {
            oscillator: osc,
            oscillator2: osc2,
            oscillator3: osc3,
            envelope: env,
            envelope2: env2,
            envelope3: env3,
            filter: filter,
            pan: pan,
            volumeGain: volumeGain,
            gain1: gain1,
            gain2: gain2,
            gain3: gain3,
            stopTime: stopTime,
            cycleNumber: masterCycleNumber, // Track which cycle this voice was created in
            stop: () => {
                try {
                    env.triggerRelease();
                    env2.triggerRelease();
                    env3.triggerRelease();
                    osc.stop('+0.1');
                    osc2.stop('+0.1');
                    osc3.stop('+0.1');
                } catch (e) {
                    console.warn('Error stopping voice:', e);
                }
            },
            dispose: () => {
                try {
                    osc.dispose();
                    osc2.dispose();
                    osc3.dispose();
                    env.dispose();
                    env2.dispose();
                    env3.dispose();
                    filter.dispose();
                    pan.dispose();
                    volumeGain.dispose();
                    gain1.dispose();
                    gain2.dispose();
                    gain3.dispose();
                } catch (e) {
                    console.warn('Error disposing voice:', e);
                }
            }
        };
        
        this.activeVoices.push(voice);
        
        setTimeout(() => {
            const index = this.activeVoices.indexOf(voice);
            if (index > -1) {
                this.activeVoices.splice(index, 1);
                voice.dispose();
            }
        }, (noteDuration + 0.5) * 1000);
        
        return voice;
    }
}

