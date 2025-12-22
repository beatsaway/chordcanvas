/**
 * EnvelopeShape Classes - Different ADSR envelope shapes
 * These control how the sound evolves over time
 */

(function() {
    'use strict';
    
    /**
     * Base class for envelope shapes
     */
    class EnvelopeShape {
        constructor() {
            this.name = 'Base';
        }
        
        getEnvelope(t, params = {}) {
            return 1.0; // Override in subclasses
        }
    }
    
    /**
     * Piano Envelope - Balanced attack and sustain
     */
    class PianoEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Piano';
        }
        
        getEnvelope(t, params = {}) {
            const attackTime = params.attackTime || 0.02;
            const decayRate = params.decayRate || 0.4;
            const sustainLevel = params.sustainLevel || 0.4;
            
            const attack = Math.min(1, t / attackTime);
            const decay = Math.exp(-t * decayRate);
            return attack * (sustainLevel + (1 - sustainLevel) * decay);
        }
    }
    
    /**
     * Warm Envelope - Slower attack, longer sustain
     */
    class WarmEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Warm';
        }
        
        getEnvelope(t, params = {}) {
            // Faster attack for more punch (reduced from 0.03s to 0.015s)
            const attackTime = params.attackTime || 0.015;
            const decayRate = params.decayRate || 0.3;
            const sustainLevel = params.sustainLevel || 0.5;
            
            const attack = Math.min(1, t / attackTime);
            const decay = Math.exp(-t * decayRate);
            return attack * (sustainLevel + (1 - sustainLevel) * decay);
        }
    }
    
    /**
     * Rhodes Envelope - Quick attack, medium decay
     */
    class RhodesEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Rhodes';
        }
        
        getEnvelope(t, params = {}) {
            const attackTime = params.attackTime || 0.005;
            const decayRate = params.decayRate || 1.2;
            
            const attack = Math.min(1, t / attackTime);
            const decay = Math.exp(-t * decayRate);
            return attack * decay;
        }
    }
    
    /**
     * Bell Envelope - Very slow decay for long sustain
     */
    class BellEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Bell';
        }
        
        getEnvelope(t, params = {}) {
            const decayRate = params.decayRate || 0.1;
            return Math.exp(-t * decayRate);
        }
    }
    
    /**
     * Harp Envelope - Quick attack, natural decay
     */
    class HarpEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Harp';
        }
        
        getEnvelope(t, params = {}) {
            const decayRate = params.decayRate || 2.0;
            return Math.exp(-t * decayRate);
        }
    }
    
    /**
     * Pad Envelope - Slow attack, long sustain
     */
    class PadEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Pad';
        }
        
        getEnvelope(t, params = {}) {
            const attackTime = params.attackTime || 0.5;
            const sustainLevel = params.sustainLevel || 0.8;
            
            const attack = Math.min(1, t / attackTime);
            return attack * sustainLevel;
        }
    }
    
    /**
     * Organ Envelope - Instant attack, constant sustain
     */
    class OrganEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Organ';
        }
        
        getEnvelope(t, params = {}) {
            const attackTime = params.attackTime || 0.01;
            const attack = Math.min(1, t / attackTime);
            return attack; // Constant sustain
        }
    }
    
    /**
     * Synth Envelope - ADSR with decay and sustain
     */
    class SynthEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Synth';
        }
        
        getEnvelope(t, params = {}) {
            const attackTime = params.attackTime || 0.05;
            const decayTime = params.decayTime || 0.1;
            const sustainLevel = params.sustainLevel || 0.6;
            
            if (t < attackTime) {
                return t / attackTime;
            } else if (t < attackTime + decayTime) {
                const decayProgress = (t - attackTime) / decayTime;
                return 1 - (1 - sustainLevel) * decayProgress;
            } else {
                return sustainLevel;
            }
        }
    }
    
    /**
     * Pluck Envelope - Very quick attack, exponential decay
     */
    class PluckEnvelope extends EnvelopeShape {
        constructor() {
            super();
            this.name = 'Pluck';
        }
        
        getEnvelope(t, params = {}) {
            const decayRate = params.decayRate || 3.0;
            return Math.exp(-t * decayRate);
        }
    }
    
    // Export to window
    window.EnvelopeShapes = {
        Piano: PianoEnvelope,
        Warm: WarmEnvelope,
        Rhodes: RhodesEnvelope,
        Bell: BellEnvelope,
        Harp: HarpEnvelope,
        Pad: PadEnvelope,
        Organ: OrganEnvelope,
        Synth: SynthEnvelope,
        Pluck: PluckEnvelope,
        
        // Get random envelope
        getRandom: function() {
            const envelopes = [
                PianoEnvelope,
                WarmEnvelope,
                RhodesEnvelope,
                BellEnvelope,
                HarpEnvelope,
                PadEnvelope,
                OrganEnvelope,
                SynthEnvelope,
                PluckEnvelope
            ];
            return new envelopes[Math.floor(Math.random() * envelopes.length)]();
        },
        
        // Get all envelope types
        getAll: function() {
            return [
                new PianoEnvelope(),
                new WarmEnvelope(),
                new RhodesEnvelope(),
                new BellEnvelope(),
                new HarpEnvelope(),
                new PadEnvelope(),
                new OrganEnvelope(),
                new SynthEnvelope(),
                new PluckEnvelope()
            ];
        }
    };
})();

