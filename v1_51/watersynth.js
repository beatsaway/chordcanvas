// Water Synthesizer
class WaterSynthTone {
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
            } catch (e) {
                console.warn('Error cleaning up voice:', e);
            }
        });
        this.activeVoices = [];
    }
    
    createWaterVoice(frequency, noteDuration, pitchDrop = 0.02, noiseAmount = 0.03, isHighNote = false, tempo = null) {
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
        
        // Random decay reduction 0-40ms
        const decayReduction = Math.random() * 0.04;
        
        const finalPitchDrop = frequency * (pitchDrop + Math.random() * 0.02);
        const finalNoiseAmount = noiseAmount * (0.8 + Math.random() * 0.4);
        
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
        
        // Calculate release time with decay reduction
        const baseRelease = Math.min(0.3, noteDuration * 0.3);
        const reducedRelease = Math.max(0.01, baseRelease - decayReduction);
        
        // Random sustain variation: -0 to -2dB (linear: 1.0 to 0.794)
        const sustainVariation = Math.random() * (1.0 - 0.794) + 0.794; // Random between 0.794 and 1.0
        const sustainVariation2 = Math.random() * (1.0 - 0.794) + 0.794;
        const sustainVariation3 = Math.random() * (1.0 - 0.794) + 0.794;
        const sustainVariation4 = Math.random() * (1.0 - 0.794) + 0.794;
        
        // Use water-specific attack time
        const currentAttack = typeof waterAttackTime === 'number' ? waterAttackTime : 0.02;
        
        const env = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: 0.01,
            sustain: 0.35 * sustainVariation,
            release: reducedRelease
        });
        
        const env2 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: 0.01,
            sustain: 0.25 * sustainVariation2,
            release: reducedRelease
        });
        
        const env3 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: 0.01,
            sustain: 0.15 * sustainVariation3,
            release: reducedRelease
        });
        
        const env4 = new Tone.AmplitudeEnvelope({
            attack: currentAttack,
            decay: 0.01,
            sustain: 0.1 * sustainVariation4,
            release: reducedRelease
        });
        
        // Use water-specific harmonic gains
        const currentHarmonic2 = typeof waterHarmonic2Gain === 'number' ? waterHarmonic2Gain : 0.3;
        const currentHarmonic3 = typeof waterHarmonic3Gain === 'number' ? waterHarmonic3Gain : 0.2;
        const currentHarmonic4 = typeof waterHarmonic4Gain === 'number' ? waterHarmonic4Gain : 0.1;
        
        const harmonicGain2 = new Tone.Gain(currentHarmonic2);
        const harmonicGain3 = new Tone.Gain(currentHarmonic3);
        const harmonicGain4 = new Tone.Gain(currentHarmonic4);
        
        const noise = new Tone.Noise({
            type: 'white',
            volume: -20
        });
        
        const noiseEnv = new Tone.AmplitudeEnvelope({
            attack: 0.01,
            decay: 0.07,
            sustain: 0,
            release: 0
        });
        
        const noiseGain = new Tone.Gain();
        noiseGain.gain.value = finalNoiseAmount * 0.5;
        
        const pan = new Tone.Panner((Math.random() - 0.5) * 0.15);
        // Apply -12 dB reduction for high notes (linear gain ≈ 0.251)
        const highNoteVolumeReduction = isHighNote ? 0.251 : 1.0;
        // Random volume reduction 0-6dB (linear gain: 0.5012 to 1.0)
        const volumeVariation = 0.5012 + Math.random() * (1.0 - 0.5012);
        const volumeGain = new Tone.Gain(highNoteVolumeReduction * volumeVariation);
        
        osc.connect(env);
        env.connect(volumeGain);
        osc2.connect(env2);
        env2.connect(harmonicGain2);
        harmonicGain2.connect(volumeGain);
        osc3.connect(env3);
        env3.connect(harmonicGain3);
        harmonicGain3.connect(volumeGain);
        osc4.connect(env4);
        env4.connect(harmonicGain4);
        harmonicGain4.connect(volumeGain);
        volumeGain.connect(pan);
        pan.connect(this.masterGain);
        
        noise.connect(noiseGain);
        noiseGain.connect(noiseEnv);
        noiseEnv.connect(pan);
        
        osc.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);
        osc4.start(startTime);
        noise.start(startTime);
        env.triggerAttack(startTime);
        env2.triggerAttack(startTime);
        env3.triggerAttack(startTime);
        env4.triggerAttack(startTime);
        noiseEnv.triggerAttack(startTime);
        
        noise.stop(startTime + 0.15);
        
        const stopTime = startTime + noteDuration;
        osc.stop(stopTime);
        osc2.stop(stopTime);
        osc3.stop(stopTime);
        osc4.stop(stopTime);
        
        const releaseTime = Math.max(startTime + 0.01, stopTime - reducedRelease);
        env.triggerRelease(releaseTime);
        env2.triggerRelease(releaseTime);
        env3.triggerRelease(releaseTime);
        env4.triggerRelease(releaseTime);
        
        const voice = {
            oscillator: osc,
            oscillator2: osc2,
            oscillator3: osc3,
            oscillator4: osc4,
            envelope: env,
            envelope2: env2,
            envelope3: env3,
            envelope4: env4,
            noise: noise,
            noiseEnv: noiseEnv,
            pan: pan,
            volumeGain: volumeGain,
            stopTime: stopTime,
            cycleNumber: masterCycleNumber, // Track which cycle this voice was created in
            stop: () => {
                try {
                    env.triggerRelease();
                    env2.triggerRelease();
                    env3.triggerRelease();
                    env4.triggerRelease();
                    osc.stop('+0.1');
                    osc2.stop('+0.1');
                    osc3.stop('+0.1');
                    osc4.stop('+0.1');
                    noise.stop();
                } catch (e) {
                    console.warn('Error stopping voice:', e);
                }
            },
            dispose: () => {
                try {
                    osc.dispose();
                    osc2.dispose();
                    osc3.dispose();
                    osc4.dispose();
                    env.dispose();
                    env2.dispose();
                    env3.dispose();
                    env4.dispose();
                    noise.dispose();
                    noiseEnv.dispose();
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

