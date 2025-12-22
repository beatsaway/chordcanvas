/**
 * HarmonicModulation Classes - Realistic frequency-dependent filtering
 * These apply time-varying, decaying filters that affect different harmonics differently
 * Mimics natural instrument behavior where frequency components evolve differently
 */

(function() {
    'use strict';
    
    /**
     * Base class for harmonic modulation
     */
    class HarmonicModulation {
        constructor() {
            this.name = 'None';
        }
        
        /**
         * Get amplitude multiplier for a specific harmonic at a given time
         * This allows frequency-dependent modulation (different harmonics affected differently)
         * @param {number} harmonicFreq - Frequency of this harmonic in Hz
         * @param {number} fundamentalFreq - Fundamental frequency in Hz
         * @param {number} t - Time in seconds
         * @param {number} duration - Total duration of the note
         * @param {Object} params - Optional parameters
         * @returns {number} - Amplitude multiplier (1.0 = no change)
         */
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            return 1.0; // Override in subclasses
        }
        
        /**
         * Get frequency modulation amount (for subtle vibrato)
         * @param {number} t - Time in seconds
         * @param {Object} params - Optional parameters
         * @returns {number} - Frequency multiplier (1.0 = no change)
         */
        getFrequencyModulation(t, params = {}) {
            return 1.0; // Override in subclasses
        }
        
        /**
         * Get amplitude modulation amount (for overall tremolo)
         * @param {number} t - Time in seconds
         * @param {Object} params - Optional parameters
         * @returns {number} - Amplitude multiplier (1.0 = no change)
         */
        getAmplitudeModulation(t, params = {}) {
            return 1.0; // Override in subclasses
        }
    }
    
    /**
     * No Modulation - Pass through unchanged
     */
    class NoModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'None';
        }
    }
    
    /**
     * Natural Decay - High frequencies decay faster, like real instruments
     * Higher harmonics fade out more quickly, creating natural timbre evolution
     */
    class NaturalDecayModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Natural Decay';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Higher harmonics decay faster
            // Fundamental (ratio 1.0) decays slowly, higher harmonics decay quickly
            const decayRate = Math.pow(harmonicRatio, 1.5); // Higher harmonics decay faster
            const decayAmount = Math.pow(1 - timeRatio, decayRate * 0.8);
            
            // Very subtle - only affects harmonics above fundamental
            if (harmonicRatio <= 1.01) return 1.0; // Fundamental unchanged
            
            return 0.95 + (decayAmount * 0.05); // Subtle 0-5% reduction
        }
    }
    
    /**
     * Frequency-Dependent Filter - Lowpass that decays over time
     * Mimics how real instruments lose high-frequency content as they decay
     */
    class DecayingFilterModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Decaying Filter';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Filter cutoff frequency decreases over time (lowpass effect)
            // Starts at ~12x fundamental, decays to ~4x fundamental (gentler)
            const cutoffRatio = 12 - (8 * timeRatio);
            
            // Apply gentle lowpass rolloff
            if (harmonicRatio > cutoffRatio) {
                // Above cutoff - apply gentle exponential rolloff
                const excess = harmonicRatio - cutoffRatio;
                const rolloff = Math.exp(-excess * 0.3); // Gentler rolloff
                return Math.max(0.2, rolloff); // Keep some content
            }
            
            return 1.0; // Below cutoff - full amplitude
        }
    }
    
    /**
     * Harmonic Evolution - Different harmonics peak at different times
     * Creates natural timbre changes as the note sustains
     */
    class HarmonicEvolutionModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Harmonic Evolution';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Each harmonic has a different "peak time"
            // Lower harmonics peak early, higher harmonics peak later
            const peakTime = 0.2 + (harmonicRatio - 1) * 0.15; // Spread peaks across time
            const distanceFromPeak = Math.abs(timeRatio - peakTime);
            
            // Bell curve around peak time
            const bellCurve = Math.exp(-Math.pow(distanceFromPeak * 3, 2));
            
            // Subtle variation: 0.98 to 1.02 (2% variation)
            return 0.98 + (bellCurve * 0.04);
        }
    }
    
    /**
     * Subtle Formant Shift - Very gentle frequency-dependent filtering
     * Mimics natural resonances that shift slightly over time
     */
    class FormantShiftModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Formant Shift';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Create formant-like peaks at specific harmonic ratios
            // These peaks shift slightly over time
            const formant1 = 2.0 + (timeRatio * 0.1); // Slight shift
            const formant2 = 4.0 - (timeRatio * 0.15);
            const formant3 = 6.5 + (timeRatio * 0.08);
            
            // Calculate distance from formants
            const dist1 = Math.abs(harmonicRatio - formant1);
            const dist2 = Math.abs(harmonicRatio - formant2);
            const dist3 = Math.abs(harmonicRatio - formant3);
            
            // Apply gentle boost near formants
            const boost1 = Math.exp(-Math.pow(dist1 * 2, 2)) * 0.03;
            const boost2 = Math.exp(-Math.pow(dist2 * 1.5, 2)) * 0.025;
            const boost3 = Math.exp(-Math.pow(dist3 * 1.2, 2)) * 0.02;
            
            return 1.0 + boost1 + boost2 + boost3; // Very subtle boosts
        }
    }
    
    /**
     * High-Frequency Rolloff - Natural high-frequency attenuation
     * Higher harmonics gradually fade, creating warmer sound
     */
    class HighFreqRolloffModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'High-Freq Rolloff';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Rolloff starts affecting harmonics above 4x fundamental (gentler)
            if (harmonicRatio <= 4.0) return 1.0;
            
            // Gentle exponential rolloff that increases slightly over time
            const excess = harmonicRatio - 4.0;
            const rolloffStrength = 0.15 + (timeRatio * 0.2); // Gentler, gets slightly stronger over time
            const attenuation = Math.exp(-excess * rolloffStrength);
            
            // Ensure minimum of 0.3 to keep some high-frequency content
            return Math.max(0.3, attenuation);
        }
    }
    
    /**
     * Dynamic Resonance - Frequency-dependent resonance that changes over time
     * Creates natural-sounding emphasis on certain harmonics
     */
    class DynamicResonanceModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Dynamic Resonance';
        }
        
        getHarmonicAmplitude(harmonicFreq, fundamentalFreq, t, duration, params = {}) {
            const harmonicRatio = harmonicFreq / fundamentalFreq;
            const timeRatio = t / Math.max(duration, 0.1);
            
            // Resonance frequencies that shift over time
            const resonance1 = 1.5 + Math.sin(timeRatio * Math.PI * 0.5) * 0.2;
            const resonance2 = 3.2 - Math.cos(timeRatio * Math.PI * 0.3) * 0.15;
            
            // Calculate resonance boost
            const dist1 = Math.abs(harmonicRatio - resonance1);
            const dist2 = Math.abs(harmonicRatio - resonance2);
            
            const boost1 = Math.exp(-Math.pow(dist1 * 3, 2)) * 0.04;
            const boost2 = Math.exp(-Math.pow(dist2 * 2.5, 2)) * 0.035;
            
            // Also apply slight high-frequency rolloff
            let rolloff = 1.0;
            if (harmonicRatio > 5.0) {
                rolloff = Math.exp(-(harmonicRatio - 5.0) * 0.2);
            }
            
            return (1.0 + boost1 + boost2) * rolloff;
        }
    }
    
    /**
     * Subtle Vibrato - Very gentle, natural-sounding pitch variation
     * Only affects frequency, not amplitude per harmonic
     */
    class SubtleVibratoModulation extends HarmonicModulation {
        constructor() {
            super();
            this.name = 'Subtle Vibrato';
        }
        
        getFrequencyModulation(t, params = {}) {
            // Very slow, very subtle vibrato
            const rate = 4.5; // Hz
            const depth = 0.003; // Very subtle (0.3% = ~5 cents)
            // Add slight randomness for natural feel
            const phase = Math.sin(t * 0.1) * 0.1; // Slow phase variation
            const vibrato = Math.sin(2 * Math.PI * rate * t + phase) * depth;
            return 1.0 + vibrato;
        }
    }
    
    // Export to window
    window.HarmonicModulations = {
        None: NoModulation,
        NaturalDecay: NaturalDecayModulation,
        DecayingFilter: DecayingFilterModulation,
        HarmonicEvolution: HarmonicEvolutionModulation,
        FormantShift: FormantShiftModulation,
        HighFreqRolloff: HighFreqRolloffModulation,
        DynamicResonance: DynamicResonanceModulation,
        SubtleVibrato: SubtleVibratoModulation,
        
        // Get random modulation
        getRandom: function() {
            const modulations = [
                NoModulation,
                NaturalDecayModulation,
                DecayingFilterModulation,
                HarmonicEvolutionModulation,
                FormantShiftModulation,
                HighFreqRolloffModulation,
                DynamicResonanceModulation,
                SubtleVibratoModulation
            ];
            return new modulations[Math.floor(Math.random() * modulations.length)]();
        },
        
        // Get all modulation types
        getAll: function() {
            return [
                new NoModulation(),
                new NaturalDecayModulation(),
                new DecayingFilterModulation(),
                new HarmonicEvolutionModulation(),
                new FormantShiftModulation(),
                new HighFreqRolloffModulation(),
                new DynamicResonanceModulation(),
                new SubtleVibratoModulation()
            ];
        }
    };
})();

