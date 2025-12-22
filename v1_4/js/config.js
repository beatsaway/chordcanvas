/**
 * Shared Configuration
 * Single source of truth for notes, frequencies, intervals, and colors
 */

(function() {
    'use strict';

    const Config = {
        // Base note frequencies (C4 = 261.63 Hz)
        BASE_FREQUENCIES: {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        },

        // Note name to semitone index mapping (supports enharmonic equivalents)
        NOTE_TO_INDEX: {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        },

        // Chord intervals (in semitones from root)
        CHORD_INTERVALS: {
            'major-triad': [0, 4, 7],           // C, E, G
            'minor-triad': [0, 3, 7],           // C, Eb, G
            'dominant-7th': [0, 4, 7, 10],      // C, E, G, Bb
            'minor-7th': [0, 3, 7, 10],         // C, Eb, G, Bb
            'major-7th': [0, 4, 7, 11],         // C, E, G, B
            'diminished-triad': [0, 3, 6],       // C, Eb, Gb
            'diminished-7th': [0, 3, 6, 9],     // C, Eb, Gb, A
            'augmented-triad': [0, 4, 8],        // C, E, G#
            'major-6th': [0, 4, 7, 9],          // C, E, G, A
            'minor-6th': [0, 3, 7, 9],          // C, Eb, G, A
            'major-9th': [0, 4, 7, 11, 14],     // C, E, G, B, D
            'dominant-9th': [0, 4, 7, 10, 14],  // C, E, G, Bb, D
            'minor-9th': [0, 3, 7, 10, 14],     // C, Eb, G, Bb, D
            'add9': [0, 4, 7, 14],               // C, E, G, D (9th = 2nd + octave)
            'add11': [0, 4, 7, 17],              // C, E, G, F (11th = 4th + octave)
            'add13': [0, 4, 7, 21],              // C, E, G, A (13th = 6th + octave)
            '7sharp11': [0, 4, 7, 10, 18],      // C, E, G, Bb, F# (7(#11))
            '9sharp11': [0, 4, 7, 10, 14, 18],  // C, E, G, Bb, D, F# (9(#11))
            'sus2': [0, 2, 7],                   // C, D, G
            'sus4': [0, 5, 7]                    // C, F, G
        },

        // Transition type CSS classes
        TRANSITION_COLORS: {
            'none': 'trans-none',
            'ii-v-i': 'trans-ii-v-i',
            'sec-dom': 'trans-sec-dom',
            'tritone': 'trans-tritone',
            'leading': 'trans-leading',
            'passing': 'trans-passing'
        },

        // Transition type labels
        TRANSITION_LABELS: {
            'none': 'No Transition',
            'ii-v-i': 'ii-V-I',
            'sec-dom': '2nd Dominant',
            'tritone': 'Tritone Sub',
            'leading': 'Leading Tone',
            'passing': 'Passing Dim'
        },

        // Default settings
        DEFAULTS: {
            BPM: 120,
            MIN_BPM: 60,
            MAX_BPM: 200,
            BEATS_PER_BAR: 4,
            OCTAVES: [3, 4, 5] // C3, C4, C5
        },

        /**
         * Get frequency for a note in a specific octave
         * @param {string} noteName - Note name (e.g., 'C', 'C#')
         * @param {number} octave - Octave number (any octave)
         * @returns {number} Frequency in Hz
         */
        getFrequency: function(noteName, octave = 4) {
            const baseFreq = this.BASE_FREQUENCIES[noteName];
            if (!baseFreq) return null;
            
            // Calculate frequency: baseFreq * 2^(octave - 4)
            // C4 = 261.63 Hz is the base, so octave 4 = 2^0 = 1x
            const multiplier = Math.pow(2, octave - 4);
            return baseFreq * multiplier;
        },

        /**
         * Get all note frequencies for configured octaves
         * @returns {Array} Array of {name, freq, octave, isBlack} objects
         */
        getAllNoteFrequencies: function() {
            const notes = [];
            this.DEFAULTS.OCTAVES.forEach(octave => {
                Object.keys(this.BASE_FREQUENCIES).forEach(noteName => {
                    notes.push({
                        name: noteName,
                        freq: this.getFrequency(noteName, octave),
                        octave: octave,
                        isBlack: noteName.includes('#') || noteName.includes('b')
                    });
                });
            });
            return notes;
        },

        /**
         * Convert semitone index (0-11) to note name
         * @param {number} index - Semitone index (0=C, 1=C#, 2=D, etc.)
         * @returns {string} Note name (prefers sharps: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
         */
        indexToNote: function(index) {
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const normalizedIndex = ((index % 12) + 12) % 12; // Handle negative indices
            return noteNames[normalizedIndex];
        },

        /**
         * Normalize note name (handle enharmonic equivalents)
         * @param {string} noteName - Note name with optional octave
         * @returns {string} Normalized note name
         */
        normalizeNote: function(noteName) {
            const baseNote = noteName.replace(/\d+/, '');
            const enharmonicMap = {
                'Db': 'C#',
                'Eb': 'D#',
                'Gb': 'F#',
                'Ab': 'G#',
                'Bb': 'A#'
            };
            return enharmonicMap[baseNote] || baseNote;
        }
    };

    // Export to window
    window.Config = Config;
})();

