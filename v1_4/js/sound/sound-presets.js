/**
 * Sound Presets - Collection of preset configurations for sound generation
 */

(function() {
    'use strict';
    
    const presets = {
        'warm-plucked': {
            layer1: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'None' },
            layer2: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'None' }
        },
        'bright-bell': {
            layer1: { method: 'Additive', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Natural Decay' },
            layer2: { method: 'Additive', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Natural Decay' }
        },
        'vintage-rhodes': {
            layer1: { method: 'FM', harmonics: 'Tine', envelope: 'Rhodes', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'FM', harmonics: 'Tine', envelope: 'Rhodes', modulation: 'High-Freq Rolloff' }
        },
        'rich-pad': {
            layer1: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Pad', modulation: 'Dynamic Resonance' },
            layer2: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Pad', modulation: 'Dynamic Resonance' }
        },
        'metallic-organ': {
            layer1: { method: 'Waveform', harmonics: 'Organ', envelope: 'Organ', modulation: 'Formant Shift' },
            layer2: { method: 'Waveform', harmonics: 'Organ', envelope: 'Organ', modulation: 'Formant Shift' }
        },
        'brass-synth': {
            layer1: { method: 'Subtractive', harmonics: 'Brass', envelope: 'Synth', modulation: 'Subtle Vibrato' },
            layer2: { method: 'Subtractive', harmonics: 'Brass', envelope: 'Synth', modulation: 'Subtle Vibrato' }
        },
        'natural-piano': {
            layer1: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Piano', modulation: 'Natural Decay' },
            layer2: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Piano', modulation: 'Natural Decay' }
        },
        'ethereal-harp': {
            layer1: { method: 'Additive', harmonics: 'Detuned', envelope: 'Harp', modulation: 'Harmonic Evolution' },
            layer2: { method: 'Additive', harmonics: 'Detuned', envelope: 'Harp', modulation: 'Harmonic Evolution' }
        },
        'warm-bell': {
            layer1: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'None' },
            layer2: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'None' }
        },
        'crystal-pad': {
            layer1: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Pad', modulation: 'Decaying Filter' },
            layer2: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Pad', modulation: 'Decaying Filter' }
        },
        'dark-strings': {
            layer1: { method: 'Subtractive', harmonics: 'Harmonic', envelope: 'Warm', modulation: 'Decaying Filter' },
            layer2: { method: 'Additive', harmonics: 'Detuned', envelope: 'Pad', modulation: 'None' }
        },
        'bright-piano': {
            layer1: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Piano', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Piano', modulation: 'Natural Decay' }
        },
        'soft-pad': {
            layer1: { method: 'Additive', harmonics: 'Detuned', envelope: 'Pad', modulation: 'Dynamic Resonance' },
            layer2: { method: 'FM', harmonics: 'Harmonic', envelope: 'Pad', modulation: 'Subtle Vibrato' }
        },
        'metallic-bell': {
            layer1: { method: 'Waveform', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Formant Shift' },
            layer2: { method: 'Additive', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Natural Decay' }
        },
        'warm-strings': {
            layer1: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'Harmonic Evolution' },
            layer2: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Warm', modulation: 'None' }
        },
        'crystal-bell': {
            layer1: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Decaying Filter' },
            layer2: { method: 'Additive', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'High-Freq Rolloff' }
        },
        'vintage-organ': {
            layer1: { method: 'Waveform', harmonics: 'Organ', envelope: 'Organ', modulation: 'Formant Shift' },
            layer2: { method: 'FM', harmonics: 'Organ', envelope: 'Organ', modulation: 'Subtle Vibrato' }
        },
        'ethereal-pad': {
            layer1: { method: 'Additive', harmonics: 'Detuned', envelope: 'Pad', modulation: 'Harmonic Evolution' },
            layer2: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Pad', modulation: 'Dynamic Resonance' }
        },
        'brass-horn': {
            layer1: { method: 'Subtractive', harmonics: 'Brass', envelope: 'Synth', modulation: 'Subtle Vibrato' },
            layer2: { method: 'Physical Modeling', harmonics: 'Brass', envelope: 'Synth', modulation: 'Formant Shift' }
        },
        'plucked-harp': {
            layer1: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Harp', modulation: 'None' },
            layer2: { method: 'Additive', harmonics: 'Detuned', envelope: 'Harp', modulation: 'Natural Decay' }
        },
        'synth-lead': {
            layer1: { method: 'Subtractive', harmonics: 'Harmonic', envelope: 'Synth', modulation: 'Subtle Vibrato' },
            layer2: { method: 'FM', harmonics: 'Harmonic', envelope: 'Synth', modulation: 'Dynamic Resonance' }
        },
        'warm-organ': {
            layer1: { method: 'Waveform', harmonics: 'Organ', envelope: 'Organ', modulation: 'None' },
            layer2: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'Subtle Vibrato' }
        },
        'bright-harp': {
            layer1: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Harp', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Harp', modulation: 'Natural Decay' }
        },
        'dark-pad': {
            layer1: { method: 'Subtractive', harmonics: 'Harmonic', envelope: 'Pad', modulation: 'Decaying Filter' },
            layer2: { method: 'FM', harmonics: 'Detuned', envelope: 'Pad', modulation: 'None' }
        },
        'metallic-strings': {
            layer1: { method: 'Waveform', harmonics: 'Harmonic', envelope: 'Warm', modulation: 'Formant Shift' },
            layer2: { method: 'Additive', harmonics: 'Inharmonic', envelope: 'Warm', modulation: 'High-Freq Rolloff' }
        },
        'soft-bell': {
            layer1: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Bell', modulation: 'None' },
            layer2: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Bell', modulation: 'Natural Decay' }
        },
        'crystal-strings': {
            layer1: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Warm', modulation: 'Decaying Filter' },
            layer2: { method: 'Additive', harmonics: 'Detuned', envelope: 'Warm', modulation: 'Harmonic Evolution' }
        },
        'vintage-piano': {
            layer1: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Piano', modulation: 'Natural Decay' },
            layer2: { method: 'FM', harmonics: 'Tine', envelope: 'Piano', modulation: 'High-Freq Rolloff' }
        },
        'ethereal-bell': {
            layer1: { method: 'Additive', harmonics: 'Detuned', envelope: 'Bell', modulation: 'Harmonic Evolution' },
            layer2: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Dynamic Resonance' }
        },
        'warm-synth': {
            layer1: { method: 'Subtractive', harmonics: 'Detuned', envelope: 'Synth', modulation: 'None' },
            layer2: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Warm', modulation: 'Subtle Vibrato' }
        },
        'aggressive-lead': {
            layer1: { method: 'Subtractive', harmonics: 'Brass', envelope: 'Synth', modulation: 'Dynamic Resonance' },
            layer2: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Synth', modulation: 'Formant Shift' }
        },
        'mellow-pluck': {
            layer1: { method: 'Physical Modeling', harmonics: 'Simple', envelope: 'Pluck', modulation: 'Natural Decay' },
            layer2: { method: 'Additive', harmonics: 'Detuned', envelope: 'Pluck', modulation: 'None' }
        },
        'experimental-fm': {
            layer1: { method: 'FM', harmonics: 'Inharmonic', envelope: 'Pad', modulation: 'Harmonic Evolution' },
            layer2: { method: 'FM', harmonics: 'Simple', envelope: 'Synth', modulation: 'Decaying Filter' }
        },
        'vintage-strings': {
            layer1: { method: 'Waveform', harmonics: 'Harmonic', envelope: 'Warm', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'Physical Modeling', harmonics: 'Detuned', envelope: 'Warm', modulation: 'Natural Decay' }
        },
        'digital-pad': {
            layer1: { method: 'Additive', harmonics: 'Simple', envelope: 'Pad', modulation: 'Dynamic Resonance' },
            layer2: { method: 'FM', harmonics: 'Simple', envelope: 'Pad', modulation: 'Subtle Vibrato' }
        },
        'metallic-pluck': {
            layer1: { method: 'Subtractive', harmonics: 'Inharmonic', envelope: 'Pluck', modulation: 'Formant Shift' },
            layer2: { method: 'Waveform', harmonics: 'Inharmonic', envelope: 'Pluck', modulation: 'Decaying Filter' }
        },
        'warm-brass': {
            layer1: { method: 'Physical Modeling', harmonics: 'Brass', envelope: 'Warm', modulation: 'Subtle Vibrato' },
            layer2: { method: 'Additive', harmonics: 'Brass', envelope: 'Warm', modulation: 'Natural Decay' }
        },
        'crystal-organ': {
            layer1: { method: 'FM', harmonics: 'Organ', envelope: 'Organ', modulation: 'Harmonic Evolution' },
            layer2: { method: 'Additive', harmonics: 'Organ', envelope: 'Organ', modulation: 'High-Freq Rolloff' }
        },
        'dark-synth': {
            layer1: { method: 'Subtractive', harmonics: 'Detuned', envelope: 'Synth', modulation: 'Decaying Filter' },
            layer2: { method: 'Subtractive', harmonics: 'Harmonic', envelope: 'Synth', modulation: 'Decaying Filter' }
        },
        'bright-pluck': {
            layer1: { method: 'Additive', harmonics: 'Harmonic', envelope: 'Pluck', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'Physical Modeling', harmonics: 'Harmonic', envelope: 'Pluck', modulation: 'Natural Decay' }
        },
        'ethereal-simple': {
            layer1: { method: 'Physical Modeling', harmonics: 'Simple', envelope: 'Pad', modulation: 'Harmonic Evolution' },
            layer2: { method: 'Additive', harmonics: 'Simple', envelope: 'Pad', modulation: 'Dynamic Resonance' }
        },
        'aggressive-bell': {
            layer1: { method: 'Waveform', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Formant Shift' },
            layer2: { method: 'Subtractive', harmonics: 'Inharmonic', envelope: 'Bell', modulation: 'Dynamic Resonance' }
        },
        'vintage-pluck': {
            layer1: { method: 'FM', harmonics: 'Detuned', envelope: 'Pluck', modulation: 'High-Freq Rolloff' },
            layer2: { method: 'Physical Modeling', harmonics: 'Tine', envelope: 'Pluck', modulation: 'Natural Decay' }
        },
        'rich-brass': {
            layer1: { method: 'Additive', harmonics: 'Brass', envelope: 'Warm', modulation: 'Dynamic Resonance' },
            layer2: { method: 'Physical Modeling', harmonics: 'Brass', envelope: 'Warm', modulation: 'Harmonic Evolution' }
        },
        'experimental-pad': {
            layer1: { method: 'Subtractive', harmonics: 'Simple', envelope: 'Pad', modulation: 'Harmonic Evolution' },
            layer2: { method: 'FM', harmonics: 'Simple', envelope: 'Pad', modulation: 'Decaying Filter' }
        }
    };
    
    // Export to window
    window.SoundPresets = presets;
})();

