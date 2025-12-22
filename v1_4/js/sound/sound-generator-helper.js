/**
 * Sound Generator Helper - Utility functions for creating sound generators from presets
 */

(function() {
    'use strict';
    
    /**
     * Create SoundGenerator from preset layer configuration
     * @param {Object} layerConfig - Configuration object with method, harmonics, envelope, modulation
     * @returns {SoundGenerator} SoundGenerator instance
     */
    function createSoundGeneratorFromPreset(layerConfig) {
        // Get synth method
        const synthMethodMap = {
            'Physical Modeling': window.SynthMethods.PhysicalModeling,
            'Additive': window.SynthMethods.Additive,
            'FM': window.SynthMethods.FM,
            'Subtractive': window.SynthMethods.Subtractive,
            'Waveform': window.SynthMethods.Waveform
        };
        const SynthMethodClass = synthMethodMap[layerConfig.method];
        if (!SynthMethodClass) {
            throw new Error(`Unknown synth method: ${layerConfig.method}`);
        }
        const synthMethod = new SynthMethodClass();

        // Get harmonic content
        const harmonicMap = {
            'Harmonic': window.HarmonicContents.Harmonic,
            'Detuned': window.HarmonicContents.Detuned,
            'Inharmonic': window.HarmonicContents.Inharmonic,
            'Tine': window.HarmonicContents.Tine,
            'Brass': window.HarmonicContents.Brass,
            'Organ': window.HarmonicContents.Organ,
            'Simple': window.HarmonicContents.Simple
        };
        const HarmonicClass = harmonicMap[layerConfig.harmonics];
        if (!HarmonicClass) {
            throw new Error(`Unknown harmonics: ${layerConfig.harmonics}`);
        }
        const harmonicContent = new HarmonicClass();

        // Get envelope shape
        const envelopeMap = {
            'Piano': window.EnvelopeShapes.Piano,
            'Warm': window.EnvelopeShapes.Warm,
            'Rhodes': window.EnvelopeShapes.Rhodes,
            'Bell': window.EnvelopeShapes.Bell,
            'Harp': window.EnvelopeShapes.Harp,
            'Pad': window.EnvelopeShapes.Pad,
            'Organ': window.EnvelopeShapes.Organ,
            'Synth': window.EnvelopeShapes.Synth,
            'Pluck': window.EnvelopeShapes.Pluck
        };
        const EnvelopeClass = envelopeMap[layerConfig.envelope];
        if (!EnvelopeClass) {
            throw new Error(`Unknown envelope: ${layerConfig.envelope}`);
        }
        const envelopeShape = new EnvelopeClass();

        // Get modulation
        const modulationMap = {
            'None': window.HarmonicModulations.None,
            'Natural Decay': window.HarmonicModulations.NaturalDecay,
            'High-Freq Rolloff': window.HarmonicModulations.HighFreqRolloff,
            'Dynamic Resonance': window.HarmonicModulations.DynamicResonance,
            'Formant Shift': window.HarmonicModulations.FormantShift,
            'Subtle Vibrato': window.HarmonicModulations.SubtleVibrato,
            'Decaying Filter': window.HarmonicModulations.DecayingFilter,
            'Harmonic Evolution': window.HarmonicModulations.HarmonicEvolution
        };
        const ModulationClass = modulationMap[layerConfig.modulation];
        if (!ModulationClass) {
            throw new Error(`Unknown modulation: ${layerConfig.modulation}`);
        }
        const harmonicModulation = new ModulationClass();

        return new window.SoundGenerator(synthMethod, harmonicContent, envelopeShape, harmonicModulation);
    }
    
    // Export to window
    window.createSoundGeneratorFromPreset = createSoundGeneratorFromPreset;
})();

