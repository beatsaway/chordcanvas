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
        chords: 'D, D, Am, Cm, C, D, D, F, F, Em, Em, G#, G#m, Am, Am, C, D, Em, Am, Am, C'
    },

    /**
     * Classic Pop - I V vi IV (4 bars)
     */
    'classic-pop': {
        name: 'Classic Pop',
        style: 'Pop',
        description: 'I-V-vi-IV progression (4 bars)',
        bpm: 96,
        chords: 'C, G, Am, F'
    },

    /**
     * 50s Progression - I vi IV V (4 bars)
     */
    'fifties': {
        name: '50s Progression',
        style: 'Doo-wop',
        description: 'I-vi-IV-V progression (4 bars)',
        bpm: 92,
        chords: 'C, Am, F, G'
    },

    /**
     * Pachelbel Loop - I V vi iii IV I IV V (8 bars)
     */
    'pachelbel': {
        name: 'Pachelbel Loop',
        style: 'Classical / Pop',
        description: 'Pachelbel-style loop (8 bars)',
        bpm: 80,
        chords: 'D, A, Bm, F#m, G, D, G, A'
    },

    /**
     * Andalusian Cadence - i VII VI V (4 bars)
     */
    'andalusian': {
        name: 'Andalusian',
        style: 'Flamenco / Latin',
        description: 'Minor Andalusian cadence (4 bars)',
        bpm: 100,
        chords: 'Am, G, F, E'
    },

    /**
     * Jazz ii-V-I (4 bars)
     */
    'ii-v-i': {
        name: 'ii-V-I',
        style: 'Jazz',
        description: 'Classic jazz cadence (4 bars)',
        bpm: 120,
        chords: 'Dm7, G7, Cmaj7, Cmaj7'
    },

    /**
     * Blues I-IV-V (12 bars)
     */
    'twelve-bar': {
        name: '12-Bar Blues',
        style: 'Blues',
        description: 'Standard 12-bar blues (12 bars)',
        bpm: 96,
        chords: 'E7, E7, E7, E7, A7, A7, E7, E7, B7, A7, E7, B7'
    },

    /**
     * Soul / R&B - vi IV I V (4 bars)
     */
    'soul-rnb': {
        name: 'Soul / R&B',
        style: 'R&B',
        description: 'Warm R&B progression (4 bars)',
        bpm: 85,
        chords: 'Am7, Fmaj7, Cmaj7, G'
    },

    /**
     * Lo-fi Loop - i v VII VI (4 bars)
     */
    'lofi-loop': {
        name: 'Lo-fi Loop',
        style: 'Lo-fi',
        description: 'Moody minor loop (4 bars)',
        bpm: 72,
        chords: 'Bm7, F#m7, A, G'
    },

    /**
     * Synthwave - i VI III VII (4 bars)
     */
    'synthwave': {
        name: 'Synthwave',
        style: '80s',
        description: 'Retro synthwave loop (4 bars)',
        bpm: 110,
        chords: 'F#m, D, A, E'
    },

    /**
     * City Pop - warm minor 6 color (4 bars)
     */
    'city-pop': {
        name: 'City Pop',
        style: '80s Pop',
        description: 'Smooth city-pop loop with minor 6ths (4 bars)',
        bpm: 98,
        chords: 'Am6, D9, Gmaj7, Cmaj7'
    },

    /**
     * Neo Soul - minor 6 flavor (4 bars)
     */
    'neo-soul': {
        name: 'Neo Soul',
        style: 'R&B',
        description: 'Neo-soul loop with minor 6ths (4 bars)',
        bpm: 86,
        chords: 'Em6, A13, Dmaj7, Cmaj7'
    },

    /**
     * Bossa Mood - minor 6 cadence (4 bars)
     */
    'bossa-m6': {
        name: 'Bossa Mood',
        style: 'Bossa Nova',
        description: 'Bossa loop with minor 6ths (4 bars)',
        bpm: 96,
        chords: 'Dm6, G7, Cmaj7, Am7'
    },

    /**
     * Film Noir - minor 6 tension (4 bars)
     */
    'film-noir': {
        name: 'Film Noir',
        style: 'Cinematic',
        description: 'Noir loop with minor 6ths (4 bars)',
        bpm: 72,
        chords: 'Cm6, Fm9, Bb7, Ebmaj7'
    },

    /**
     * Lush Ballad - minor 6 color (4 bars)
     */
    'lush-ballad': {
        name: 'Lush Ballad',
        style: 'Ballad',
        description: 'Lush ballad loop with minor 6ths (4 bars)',
        bpm: 68,
        chords: 'Gm6, C9, Fmaj7, Bbmaj7'
    },

    /**
     * Downtempo - minor 6 haze (4 bars)
     */
    'downtempo-m6': {
        name: 'Downtempo M6',
        style: 'Downtempo',
        description: 'Laid-back loop with minor 6ths (4 bars)',
        bpm: 78,
        chords: 'Fm6, Abmaj7, Ebmaj7, Dbmaj7'
    },

    /**
     * Jazz Waltz - minor 6 voice (4 bars)
     */
    'jazz-waltz-m6': {
        name: 'Jazz Waltz M6',
        style: 'Jazz',
        description: 'Jazz waltz feel with minor 6ths (4 bars)',
        bpm: 132,
        chords: 'Bm6, E7, Amaj7, Dmaj7'
    },

    /**
     * Cloud Rap - minor loop (4 bars)
     */
    'cloud-rap': {
        name: 'Cloud Rap',
        style: 'Hip-Hop',
        description: 'Moody minor loop (4 bars)',
        bpm: 74,
        chords: 'Fm7, Dbmaj7, Abmaj7, Eb'
    },

    /**
     * Trap Glow - i VI III VII (4 bars)
     */
    'trap-glow': {
        name: 'Trap Glow',
        style: 'Trap',
        description: 'Trap-ready minor loop (4 bars)',
        bpm: 140,
        chords: 'C#m, A, E, B'
    },

    /**
     * Drill Night - i bVI bVII (4 bars)
     */
    'drill-night': {
        name: 'Drill Night',
        style: 'Drill',
        description: 'Dark drill loop (4 bars)',
        bpm: 144,
        chords: 'Dm, Bb, C, Dm'
    },

    /**
     * Jersey Bounce - upbeat loop (4 bars)
     */
    'jersey-bounce': {
        name: 'Jersey Bounce',
        style: 'Jersey Club',
        description: 'Upbeat club loop (4 bars)',
        bpm: 140,
        chords: 'Am, F, C, G'
    },

    /**
     * Afro Pop - bright loop (4 bars)
     */
    'afro-pop': {
        name: 'Afro Pop',
        style: 'Afrobeats',
        description: 'Bright afrobeats loop (4 bars)',
        bpm: 110,
        chords: 'F#m, D, A, E'
    },

    /**
     * UK Garage - 2-step loop (4 bars)
     */
    'ukg-2step': {
        name: 'UK Garage',
        style: 'UKG',
        description: '2-step friendly loop (4 bars)',
        bpm: 130,
        chords: 'Bm7, Em7, G, A'
    },

    /**
     * Hyperpop Spark - bright loop (4 bars)
     */
    'hyperpop-spark': {
        name: 'Hyperpop Spark',
        style: 'Hyperpop',
        description: 'Bright hyperpop loop (4 bars)',
        bpm: 160,
        chords: 'C, G, D, A'
    },

    /**
     * K-Pop Lift - pop lift (4 bars)
     */
    'kpop-lift': {
        name: 'K-Pop Lift',
        style: 'K-Pop',
        description: 'Uplifting pop loop (4 bars)',
        bpm: 120,
        chords: 'G, D, Em, C'
    },

    /**
     * Phonk Drift - minor drive (4 bars)
     */
    'phonk-drift': {
        name: 'Phonk Drift',
        style: 'Phonk',
        description: 'Dark phonk loop (4 bars)',
        bpm: 150,
        chords: 'Em, C, D, B'
    },

    /**
     * Bedroom Indie - soft loop (4 bars)
     */
    'bedroom-indie': {
        name: 'Bedroom Indie',
        style: 'Indie',
        description: 'Soft indie loop (4 bars)',
        bpm: 88,
        chords: 'Cmaj7, Em7, Am7, G'
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CHORD_PRESETS = CHORD_PRESETS;
}
