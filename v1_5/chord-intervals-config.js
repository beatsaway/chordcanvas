/**
 * Chord Intervals Configuration
 * 
 * This file contains all the interval definitions for chord types.
 * Intervals are in semitones from the root note (0 = root, 4 = major 3rd, 7 = perfect 5th, etc.)
 */

// ========== CHORD INTERVALS ==========
// Defines the intervals (in semitones) that make up each chord type
// Negative values represent notes an octave lower (bass section) for thicker sound
// -24 = sub-bass (two octaves below root)
// -12 = bass (one octave below root)
// Formula: negative interval = original interval - 12 (or -24 for sub-bass)
const CHORD_INTERVALS = {
    // Basic Triads
    // Sub-bass root, then root and 5th an octave lower, then original triad
    'major-triad': [-24, -12, -5, 0, 4, 7],           // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th
    'minor-triad': [-24, -12, -5, 0, 3, 7],           // Sub-bass: Root | Bass: Root, 5th | Main: Root, Minor 3rd, Perfect 5th
    'diminished-triad': [-24, -12, -6, 0, 3, 6],      // Sub-bass: Root | Bass: Root, Dim 5th | Main: Root, Minor 3rd, Diminished 5th
    'augmented-triad': [-24, -12, -4, 0, 4, 8],       // Sub-bass: Root | Bass: Root, Aug 5th | Main: Root, Major 3rd, Augmented 5th
    
    // 7th Chords
    // Sub-bass root, then root and 5th an octave lower, then original 7th chord
    'dominant-7th': [-24, -12, -5, 0, 4, 7, 10],      // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Minor 7th
    'minor-7th': [-24, -12, -5, 0, 3, 7, 10],         // Sub-bass: Root | Bass: Root, 5th | Main: Root, Minor 3rd, Perfect 5th, Minor 7th
    'major-7th': [-24, -12, -5, 0, 4, 7, 11],         // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Major 7th
    'diminished-7th': [-24, -12, -6, 0, 3, 6, 9],     // Sub-bass: Root | Bass: Root, Dim 5th | Main: Root, Minor 3rd, Diminished 5th, Diminished 7th
    
    // 6th Chords
    // Sub-bass root, then root and 5th an octave lower, then original 6th chord
    'major-6th': [-24, -12, -5, 0, 4, 7, 9],         // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Major 6th
    'minor-6th': [-24, -12, -5, 0, 3, 7, 9],          // Sub-bass: Root | Bass: Root, 5th | Main: Root, Minor 3rd, Perfect 5th, Major 6th
    
    // 9th Chords
    // Sub-bass root, then root and 5th an octave lower, then original 9th chord
    'dominant-9th': [-24, -12, -5, 0, 4, 7, 10, 14], // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Minor 7th, Major 9th
    'major-9th': [-24, -12, -5, 0, 4, 7, 11, 14],    // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Major 7th, Major 9th
    'minor-9th': [-24, -12, -5, 0, 3, 7, 10, 14],     // Sub-bass: Root | Bass: Root, 5th | Main: Root, Minor 3rd, Perfect 5th, Minor 7th, Major 9th
    
    // Add Chords
    // Sub-bass root, then root and 5th an octave lower, then original add chord
    'add9': [-24, -12, -5, 0, 4, 7, 14],              // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Major 9th (no 7th)
    'add11': [-24, -12, -5, 0, 4, 7, 17],             // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Perfect 11th
    'add13': [-24, -12, -5, 0, 4, 7, 21],             // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Major 13th
    
    // Altered Chords
    // Sub-bass root, then root and 5th an octave lower, then original altered chord
    '7sharp11': [-24, -12, -5, 0, 4, 7, 10, 18],      // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Minor 7th, Sharp 11th
    '9sharp11': [-24, -12, -5, 0, 4, 7, 10, 14, 18],  // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 3rd, Perfect 5th, Minor 7th, Major 9th, Sharp 11th
    
    // Suspended Chords
    // Sub-bass root, then root and 5th an octave lower, then original sus chord
    'sus2': [-24, -12, -5, 0, 2, 7],                  // Sub-bass: Root | Bass: Root, 5th | Main: Root, Major 2nd, Perfect 5th
    'sus4': [-24, -12, -5, 0, 5, 7]                   // Sub-bass: Root | Bass: Root, 5th | Main: Root, Perfect 4th, Perfect 5th
};

// ========== NOTE MAPPING ==========
// Maps note names to their chromatic index (0-11)
const NOTE_TO_INDEX = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CHORD_INTERVALS = CHORD_INTERVALS;
    window.NOTE_TO_INDEX = NOTE_TO_INDEX;
}

