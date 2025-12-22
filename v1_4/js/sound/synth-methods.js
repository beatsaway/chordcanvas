/**
 * SynthMethod Classes - Different synthesis techniques
 * Each method generates raw waveforms that can be combined with harmonic content and envelopes
 */

(function() {
    'use strict';
    
    /**
     * Base class for synthesis methods
     */
    class SynthMethod {
        constructor() {
            this.name = 'Base';
        }
        
        generate(frequency, t, params = {}) {
            return 0; // Override in subclasses
        }
    }
    
    /**
     * Additive Synthesis - Sum of sine waves
     */
    class AdditiveSynth extends SynthMethod {
        constructor() {
            super();
            this.name = 'Additive';
        }
        
        generate(frequency, t, params = {}) {
            // This is a base - harmonic content will add the harmonics
            return Math.sin(2 * Math.PI * frequency * t);
        }
    }
    
    /**
     * FM Synthesis - Frequency Modulation
     */
    class FMSynth extends SynthMethod {
        constructor() {
            super();
            this.name = 'FM';
        }
        
        generate(frequency, t, params = {}) {
            const modulatorFreq = (params.modulatorRatio || 1.5) * frequency;
            const modulationIndex = params.modulationIndex || 2.0;
            
            const modulator = Math.sin(2 * Math.PI * modulatorFreq * t) * modulationIndex;
            const carrier = Math.sin(2 * Math.PI * frequency * t + modulator);
            
            return carrier;
        }
    }
    
    /**
     * Physical Modeling - Karplus-Strong for plucked strings
     * Note: This needs to be called sequentially for each sample
     * Supports vibrato via fractional delay line reading
     */
    class PhysicalModelingSynth extends SynthMethod {
        constructor() {
            super();
            this.name = 'Physical Modeling';
            this.delayLines = new Map(); // Store delay lines per base frequency
        }
        
        initializeDelayLine(baseFrequency, sampleRate, params = {}) {
            // Use base frequency (unmodulated) as key to keep delay line stable
            if (!this.delayLines.has(baseFrequency)) {
                const N = Math.max(2, Math.round(sampleRate / baseFrequency));
                const delayLine = new Float32Array(N);
                
                // Initialize with filtered noise burst
                for (let i = 0; i < N; i++) {
                    delayLine[i] = (Math.random() * 2 - 1) * Math.exp(-i / N * 5);
                }
                
                this.delayLines.set(baseFrequency, {
                    line: delayLine,
                    pos: 0,
                    baseFreq: baseFrequency,
                    decay: params.decay || 0.998,
                    lowpass: params.lowpass || 0.5,
                    initialized: true
                });
            }
        }
        
        generate(frequency, t, params = {}) {
            const sampleRate = params.sampleRate || 44100;
            const baseFrequency = params.baseFrequency || frequency; // Base frequency for delay line
            const freqMod = params.frequencyModulation || 1.0; // Frequency modulation ratio (for vibrato)
            
            // Initialize delay line with base frequency (not modulated)
            this.initializeDelayLine(baseFrequency, sampleRate, params);
            
            const delayData = this.delayLines.get(baseFrequency);
            const N = delayData.line.length;
            
            // Apply vibrato via fractional delay line reading
            // When frequency is modulated, we read from a slightly offset position
            // This creates pitch variation without breaking the delay line structure
            let readPos;
            if (Math.abs(freqMod - 1.0) < 0.0001) {
                // No modulation - use standard integer position
                readPos = delayData.pos;
            } else {
                // Frequency modulation: adjust read position based on frequency ratio
                // Higher frequency (freqMod > 1) = shorter delay = read from earlier position (smaller index)
                // Lower frequency (freqMod < 1) = longer delay = read from later position (larger index)
                // The offset is proportional to the frequency change relative to the delay line length
                const freqChange = freqMod - 1.0; // -0.003 to +0.003 for subtle vibrato
                // Calculate how many samples to offset (negative = earlier, positive = later)
                const positionOffset = -freqChange * N; // Negative because higher freq = earlier read
                readPos = delayData.pos + positionOffset;
                
                // Wrap around delay line
                while (readPos < 0) readPos += N;
                while (readPos >= N) readPos -= N;
            }
            
            // Linear interpolation for fractional delay reading (smooth vibrato)
            const readPosInt = Math.floor(readPos);
            const readPosFrac = readPos - readPosInt;
            const readPosNext = (readPosInt + 1) % N;
            
            // Interpolate between two samples for smooth fractional delay
            const y = delayData.line[readPosInt] * (1 - readPosFrac) + 
                     delayData.line[readPosNext] * readPosFrac;
            
            // Low-pass filtering (apply to current write position)
            const filtered = delayData.lowpass * delayData.line[delayData.pos] + 
                           (1 - delayData.lowpass) * delayData.line[(delayData.pos + 1) % N];
            delayData.line[delayData.pos] = filtered * delayData.decay;
            delayData.pos = (delayData.pos + 1) % N;
            
            return y;
        }
    }
    
    /**
     * Waveform Synthesis - Sawtooth, Square, Triangle
     */
    class WaveformSynth extends SynthMethod {
        constructor() {
            super();
            this.name = 'Waveform';
        }
        
        generate(frequency, t, params = {}) {
            const waveform = params.waveform || 'sawtooth';
            
            switch(waveform) {
                case 'sawtooth':
                    return 2 * ((t * frequency) % 1) - 1;
                case 'square':
                    return Math.sign(Math.sin(2 * Math.PI * frequency * t));
                case 'triangle':
                    return 2 * Math.abs(2 * ((t * frequency) % 1) - 1) - 1;
                case 'sine':
                default:
                    return Math.sin(2 * Math.PI * frequency * t);
            }
        }
    }
    
    /**
     * Subtractive Synthesis - Filtered waveforms
     */
    class SubtractiveSynth extends SynthMethod {
        constructor() {
            super();
            this.name = 'Subtractive';
            this.lastSample = 0;
        }
        
        generate(frequency, t, params = {}) {
            // Generate rich waveform (sawtooth + square)
            const sawtooth = 2 * ((t * frequency) % 1) - 1;
            const square = Math.sign(Math.sin(2 * Math.PI * frequency * t));
            const mixed = sawtooth * 0.7 + square * 0.3;
            
            // Simple low-pass filter simulation
            const cutoff = params.cutoff || 2000;
            const resonance = params.resonance || 0.5;
            const filtered = mixed * (1 - Math.min(1, frequency / cutoff));
            
            return filtered;
        }
    }
    
    // Export to window
    window.SynthMethods = {
        Additive: AdditiveSynth,
        FM: FMSynth,
        PhysicalModeling: PhysicalModelingSynth,
        Waveform: WaveformSynth,
        Subtractive: SubtractiveSynth,
        
        // Get random method
        getRandom: function() {
            const methods = [
                AdditiveSynth,
                FMSynth,
                PhysicalModelingSynth,
                WaveformSynth,
                SubtractiveSynth
            ];
            return new methods[Math.floor(Math.random() * methods.length)]();
        },
        
        // Get all method names
        getAll: function() {
            return [
                new AdditiveSynth(),
                new FMSynth(),
                new PhysicalModelingSynth(),
                new WaveformSynth(),
                new SubtractiveSynth()
            ];
        }
    };
})();

