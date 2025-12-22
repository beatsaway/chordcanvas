/**
 * HarmonicContent Classes - Different harmonic/inharmonic series
 * These define the frequency content that gets added to the base synthesis method
 */

(function() {
    'use strict';
    
    /**
     * Base class for harmonic content
     */
    class HarmonicContent {
        constructor() {
            this.name = 'Base';
        }
        
        getHarmonics(frequency, numSamples, sampleRate) {
            return []; // Override in subclasses - returns array of {freq, amp}
        }
    }
    
    /**
     * Harmonic Series - Standard harmonic series (1, 2, 3, 4, 5...)
     */
    class HarmonicSeries extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Harmonic';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            // Limit harmonics based on Nyquist frequency (sampleRate / 2)
            // Also cap at reasonable number for CPU savings
            const maxHarmonicFreq = sampleRate / 2.5; // Conservative limit (safety margin)
            const maxHarmonicByFreq = Math.floor(maxHarmonicFreq / frequency);
            const defaultNumHarmonics = Math.max(4, Math.min(8, Math.round(2000 / frequency))); // Reduced from 6-12 to 4-8
            const numHarmonics = Math.min(
                params.numHarmonics || defaultNumHarmonics,
                maxHarmonicByFreq
            );
            
            const inharmonicity = params.inharmonicity || 0.0002 * Math.pow(frequency / 440, -1.2);
            const harmonics = [];
            
            for (let n = 1; n <= numHarmonics; n++) {
                const inharmonicFreq = n * frequency * Math.sqrt(1 + inharmonicity * n * n);
                // Skip if frequency exceeds Nyquist
                if (inharmonicFreq >= maxHarmonicFreq) break;
                
                const amp = Math.pow(params.decayFactor || 0.8, n - 1) / Math.sqrt(n);
                harmonics.push({ freq: inharmonicFreq, amp: amp });
            }
            
            return harmonics;
        }
    }
    
    /**
     * Inharmonic Series - For bells, metallic sounds
     */
    class InharmonicSeries extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Inharmonic';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            // Bell-like inharmonic ratios: 1, 2.76, 5.4, 8.93, 13.34
            const bellRatios = params.ratios || [1.0, 2.76, 5.4, 8.93, 13.34];
            const bellAmps = params.amps || [1.0, 0.5, 0.3, 0.2, 0.1];
            const harmonics = [];
            
            for (let h = 0; h < bellRatios.length; h++) {
                harmonics.push({
                    freq: frequency * bellRatios[h],
                    amp: bellAmps[h]
                });
            }
            
            return harmonics;
        }
    }
    
    /**
     * Organ Stops - Specific harmonic ratios for pipe organ
     */
    class OrganStops extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Organ';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            // Organ stops: 8', 4', 2 2/3', 2', 1 3/5'
            const organStops = params.stops || [
                { ratio: 1.0, amp: 1.0 },
                { ratio: 2.0, amp: 0.5 },
                { ratio: 3.0, amp: 0.33 },
                { ratio: 4.0, amp: 0.25 },
                { ratio: 5.0, amp: 0.2 }
            ];
            const harmonics = [];
            
            for (let stop of organStops) {
                harmonics.push({
                    freq: frequency * stop.ratio,
                    amp: stop.amp
                });
            }
            
            return harmonics;
        }
    }
    
    /**
     * Detuned Oscillators - Multiple slightly detuned oscillators for richness
     */
    class DetunedOscillators extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Detuned';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            const detuneAmount = params.detuneAmount || 0.01;
            const numOscillators = params.numOscillators || 3;
            const harmonics = [];
            
            for (let i = 0; i < numOscillators; i++) {
                const detune = 1 + (i - (numOscillators - 1) / 2) * detuneAmount;
                harmonics.push({
                    freq: frequency * detune,
                    amp: 1.0 / numOscillators
                });
            }
            
            // Add some harmonics
            harmonics.push({ freq: frequency * 2, amp: params.harmonic2Amp || 0.3 });
            harmonics.push({ freq: frequency * 3, amp: params.harmonic3Amp || 0.15 });
            
            return harmonics;
        }
    }
    
    /**
     * Simple - Just the fundamental
     */
    class SimpleContent extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Simple';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            return [{ freq: frequency, amp: 1.0 }];
        }
    }
    
    /**
     * Tine Harmonics - For Rhodes-like sounds
     */
    class TineHarmonics extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Tine';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            return [
                { freq: frequency, amp: 1.0 },
                { freq: frequency * 2, amp: 0.4 },
                { freq: frequency * 3, amp: 0.2 }
            ];
        }
    }
    
    /**
     * Brass Harmonics - Emphasizes odd harmonics (1, 3, 5, 7, 9...)
     * Characteristic of brass and reed instruments like trumpet, trombone, clarinet
     */
    class BrassHarmonics extends HarmonicContent {
        constructor() {
            super();
            this.name = 'Brass';
        }
        
        getHarmonics(frequency, numSamples, sampleRate, params = {}) {
            // Limit harmonics based on Nyquist frequency
            const maxHarmonicFreq = sampleRate / 2.5;
            const maxHarmonicByFreq = Math.floor(maxHarmonicFreq / frequency);
            const defaultNumHarmonics = Math.max(4, Math.min(8, Math.round(3000 / frequency))); // Reduced from 5-10 to 4-8
            const numHarmonics = Math.min(
                params.numHarmonics || defaultNumHarmonics,
                maxHarmonicByFreq
            );
            
            const oddOnly = params.oddOnly !== false; // Default to odd-only, but allow all
            const brightness = params.brightness || 0.85; // How much odd harmonics are emphasized
            const harmonics = [];
            
            for (let n = 1; n <= numHarmonics; n++) {
                const isOdd = (n % 2 === 1);
                
                // Skip even harmonics if oddOnly is true
                if (oddOnly && !isOdd) continue;
                
                const harmonicFreq = frequency * n;
                // Skip if frequency exceeds Nyquist
                if (harmonicFreq >= maxHarmonicFreq) break;
                
                // Odd harmonics get stronger amplitude, even ones get reduced
                let amp;
                if (isOdd) {
                    // Odd harmonics: stronger, with natural decay
                    amp = Math.pow(brightness, (n - 1) / 2) / Math.sqrt(n);
                } else {
                    // Even harmonics: much weaker (if included)
                    amp = Math.pow(1 - brightness, 1) * Math.pow(0.6, n - 1) / Math.sqrt(n);
                }
                
                harmonics.push({ freq: harmonicFreq, amp: amp });
            }
            
            return harmonics;
        }
    }
    
    // Export to window
    window.HarmonicContents = {
        Harmonic: HarmonicSeries,
        Inharmonic: InharmonicSeries,
        Organ: OrganStops,
        Detuned: DetunedOscillators,
        Simple: SimpleContent,
        Tine: TineHarmonics,
        Brass: BrassHarmonics,
        
        // Get random content
        getRandom: function() {
            const contents = [
                HarmonicSeries,
                InharmonicSeries,
                OrganStops,
                DetunedOscillators,
                SimpleContent,
                TineHarmonics,
                BrassHarmonics
            ];
            return new contents[Math.floor(Math.random() * contents.length)]();
        },
        
        // Get all content types
        getAll: function() {
            return [
                new HarmonicSeries(),
                new InharmonicSeries(),
                new OrganStops(),
                new DetunedOscillators(),
                new SimpleContent(),
                new TineHarmonics(),
                new BrassHarmonics()
            ];
        }
    };
})();

