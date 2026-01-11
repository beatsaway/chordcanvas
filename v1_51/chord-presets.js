/**
 * Chord Sequence Presets
 * 
 * Diverse chord progressions across multiple styles: Pop, Jazz Christmas, Jazz, Rock, and more.
 * Balanced use of chord types with suspension used sparingly for variety.
 */

const CHORD_PRESETS = {
    

    /**
     * My Main Theme - Iconic Game Theme (6 bars)
     * Classic game theme chord progression
     */
    'ether': {
        name: 'Ether',
        style: 'Game Music',
        description: 'Classic game theme progression (6 bars)',
        bpm: 76,
        timeSignature: '4/4',
        chords: 'Em, B, G, D, A, E'
    },

    /**
     * Woofy - Smooth Jazz Progression (18 bars)
     * Warm progression with maj7, 9th, and 6th chords
     */
    'woofy': {
        name: 'Woofy',
        style: 'Jazz',
        description: 'Smooth jazz progression with maj7 and 9th chords (18 bars)',
        bpm: 74,
        timeSignature: '4/4',
        chords: 'Cmaj7, Cmaj7, Cmaj7, Cmaj7, Am9, Am9, Fmaj7, Fmaj9, G, G6, Fmaj7, Fmaj9, G, G6, Cmaj7, Cmaj7, Fmaj7, Fmaj7'
    },

    /**
     * Rough - Rock/Folk Progression (6 bars)
     * Simple progression with major triads and minor chord
     */
    'rough': {
        name: 'Rough',
        style: 'Rock / Folk',
        description: 'Simple rock/folk progression (6 bars)',
        bpm: 80,
        timeSignature: '4/4',
        chords: 'D, A, G, D, A, Dm'
    },

    /**
     * Thesia - Dark/Minor Progression (13 bars)
     * Minor key progression with chromatic movement
     */
    'thesia': {
        name: 'Thesia',
        style: 'Dark / Minor',
        description: 'Dark minor progression with chromatic movement (13 bars)',
        bpm: 96,
        timeSignature: '4/4',
        chords: 'Cm, D#, Fm, G, G#, Fm, Cm, A#, D#, G#, Fm, Cm, G'
    },

    /**
     * Dent - Modern Jazz Progression (8 bars)
     * Smooth progression with extended chords
     */
    'dent': {
        name: 'Dent',
        style: 'Modern Jazz',
        description: 'Smooth progression with extended chords (8 bars)',
        bpm: 48,
        timeSignature: '4/4',
        chords: 'Em, F#m11, Gmaj7, Bm7, F#m, Gmaj9, Dmaj7, Dmaj7'
    },

    /**
     * Lark - Gentle Progression (4 bars)
     * Soft progression with minor and extended chords
     */
    'lark': {
        name: 'Lark',
        style: 'Ambient / Folk',
        description: 'Gentle progression with minor and extended chords (4 bars)',
        bpm: 50,
        timeSignature: '4/4',
        chords: 'Dm, Em, Em11, F'
    },

    /**
     * Dread - Dark Suspended Progression (8 bars)
     * Dark progression with suspended and minor chords
     */
    'dread': {
        name: 'Dread',
        style: 'Dark / Ambient',
        description: 'Dark progression with suspended and minor chords (8 bars)',
        bpm: 80,
        timeSignature: '4/4',
        chords: 'C#sus4, E, G#m, F#, C#m, E, B, F#'
    },

    /**
     * Rim - Varied Progression (21 bars)
     * Dynamic progression with major and minor chords
     */
    'rim': {
        name: 'Rim',
        style: 'Varied',
        description: 'Dynamic progression with major and minor chords (21 bars)',
        bpm: 100,
        timeSignature: '4/4',
        chords: 'D, D, Am, Cm, C, D, D, F, F, Em, Em, G#, G#m, Am, Am, C, D, Em, Am, Am, C'
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CHORD_PRESETS = CHORD_PRESETS;
}
