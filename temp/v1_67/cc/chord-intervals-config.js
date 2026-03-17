/**
 * Chord Intervals Configuration (from ChordCanvas v1_66)
 *
 * Intervals are in semitones from the root note (0 = root, 4 = major 3rd, 7 = perfect 5th, etc.)
 */

// Defines the intervals (in semitones) that make up each chord type.
// Negative values represent notes an octave lower (bass section) for thicker sound.
const CHORD_INTERVALS = {
    'major-triad': [-24, -12, -5, 0, 4, 7],
    'minor-triad': [-24, -12, -5, 0, 3, 7],
    'diminished-triad': [-24, -12, -6, 0, 3, 6],
    'augmented-triad': [-24, -12, -4, 0, 4, 8],

    'dominant-7th': [-24, -12, -5, 0, 4, 7, 10],
    'minor-7th': [-24, -12, -5, 0, 3, 7, 10],
    'major-7th': [-24, -12, -5, 0, 4, 7, 11],
    'diminished-7th': [-24, -12, -6, 0, 3, 6, 9],

    'major-6th': [-24, -12, -5, 0, 4, 7, 9],
    'minor-6th': [-24, -12, -5, 0, 3, 7, 9],

    'dominant-9th': [-24, -12, -5, 0, 4, 7, 10, 14],
    'major-9th': [-24, -12, -5, 0, 4, 7, 11, 14],
    'minor-9th': [-24, -12, -5, 0, 3, 7, 10, 14],

    'dominant-11th': [-24, -12, -5, 0, 4, 7, 10, 14, 17],
    'minor-11th': [-24, -12, -5, 0, 3, 7, 10, 14, 17],
    'major-11th': [-24, -12, -5, 0, 4, 7, 11, 14, 17],

    'dominant-13th': [-24, -12, -5, 0, 4, 7, 10, 14, 21],
    'major-13th': [-24, -12, -5, 0, 4, 7, 11, 14, 21],
    'minor-13th': [-24, -12, -5, 0, 3, 7, 10, 14, 21],

    'add2': [-24, -12, -5, 0, 2, 4, 7],
    'add4': [-24, -12, -5, 0, 4, 5, 7],
    'add9': [-24, -12, -5, 0, 4, 7, 14],
    'add11': [-24, -12, -5, 0, 4, 7, 17],
    'add13': [-24, -12, -5, 0, 4, 7, 21],
    'six-nine': [-24, -12, -5, 0, 4, 7, 9, 14],

    'dominant-7th-flat9': [-24, -12, -5, 0, 4, 7, 10, 13],
    'dominant-7th-sharp9': [-24, -12, -5, 0, 4, 7, 10, 15],
    'dominant-7th-flat5': [-24, -12, -6, 0, 4, 6, 10],
    'dominant-7th-sharp5': [-24, -12, -4, 0, 4, 8, 10],
    '7sharp11': [-24, -12, -5, 0, 4, 7, 10, 18],
    '9sharp11': [-24, -12, -5, 0, 4, 7, 10, 14, 18],
    'minor-major-7th': [-24, -12, -5, 0, 3, 7, 11],
    'half-diminished-7th': [-24, -12, -6, 0, 3, 6, 10],

    'sus2': [-24, -12, -5, 0, 2, 7],
    'sus4': [-24, -12, -5, 0, 5, 7],
    'dominant-7th-sus4': [-24, -12, -5, 0, 5, 7, 10],
    'dominant-9th-sus4': [-24, -12, -5, 0, 5, 7, 10, 14]
};

const NOTE_TO_INDEX = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
};

if (typeof window !== 'undefined') {
    window.CHORD_INTERVALS = CHORD_INTERVALS;
    window.NOTE_TO_INDEX = NOTE_TO_INDEX;
}

