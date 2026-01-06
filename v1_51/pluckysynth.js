// Plucky Synthesizer
class PluckySynthTone {
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
    
    cleanupVoices() {
        this.activeVoices.forEach(voice => {
            try {
                if (voice && voice.stop) {
                    voice.stop();
                }
                if (voice.oscillator) voice.oscillator.dispose();
                if (voice.oscillator2) voice.oscillator2.dispose();
                if (voice.envelope) voice.envelope.dispose();
                if (voice.envelope2) voice.envelope2.dispose();
                if (voice.filter) voice.filter.dispose();
                if (voice.pan) voice.pan.dispose();
                if (voice.volumeGain) voice.volumeGain.dispose();
            } catch (e) {
                console.warn('Error cleaning up voice:', e);
            }
        });
        this.activeVoices = [];
    }
    
    createPluckyVoice(frequency, noteDuration, isHighNote = false, tempo = null) {
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
        
        // Very short attack for plucky sound
        // Use plucky-specific attack time
        const currentAttack = typeof pluckyAttackTime === 'number' ? Math.min(pluckyAttackTime, 0.005) : 0.005;
        
        // Create plucky sound with sharp attack and quick decay
        const osc = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency
        });
        
        const osc2 = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency * 2 // Octave for richness
        });
        
        // Sharp pluck envelope: very fast attack, quick decay
        const env = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: Math.min(0.1, noteDuration * 0.3),
            sustain: 0.1,
            release: Math.min(0.2, noteDuration * 0.4)
        });
        
        const env2 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: Math.min(0.08, noteDuration * 0.25),
            sustain: 0.05,
            release: Math.min(0.15, noteDuration * 0.35)
        });
        
        // Lowpass filter for warmth
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: frequency * 6,
            Q: 1.5
        });
        
        // Apply -12 dB reduction for high notes
        const highNoteVolumeReduction = isHighNote ? 0.251 : 1.0;
        // Random volume reduction 0-6dB (linear gain: 0.5012 to 1.0)
        const volumeVariation = 0.5012 + Math.random() * (1.0 - 0.5012);
        const volumeGain = new Tone.Gain(highNoteVolumeReduction * volumeVariation);
        
        const pan = new Tone.Panner((Math.random() - 0.5) * 0.15);
        
        // Routing
        osc.connect(env);
        env.connect(filter);
        osc2.connect(env2);
        env2.connect(filter);
        filter.connect(volumeGain);
        volumeGain.connect(pan);
        pan.connect(this.masterGain);
        
        // Start oscillators and trigger envelopes
        osc.start(startTime);
        osc2.start(startTime);
        env.triggerAttackRelease(noteDuration, startTime);
        env2.triggerAttackRelease(noteDuration * 0.9, startTime);
        
        const stopTime = startTime + noteDuration;
        osc.stop(stopTime);
        osc2.stop(stopTime);
        
        const voice = {
            oscillator: osc,
            oscillator2: osc2,
            envelope: env,
            envelope2: env2,
            filter: filter,
            pan: pan,
            volumeGain: volumeGain,
            stopTime: stopTime,
            cycleNumber: masterCycleNumber, // Track which cycle this voice was created in
            stop: () => {
                try {
                    env.triggerRelease();
                    env2.triggerRelease();
                    osc.stop('+0.1');
                    osc2.stop('+0.1');
                } catch (e) {
                    console.warn('Error stopping voice:', e);
                }
            },
            dispose: () => {
                try {
                    osc.dispose();
                    osc2.dispose();
                    env.dispose();
                    env2.dispose();
                    filter.dispose();
                    pan.dispose();
                    volumeGain.dispose();
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

