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
     * Lark - Gentle Progression (8 bars)
     * Soft progression with minor and extended chords
     */
    'lark': {
        name: 'Lark',
        style: 'Ambient / Folk',
        description: 'Gentle progression with minor and extended chords (8 bars)',
        bpm: 50,
        chords: 'Dm, Dm7, Em, Em11, F, Fmaj7, Dm9, Emadd2'
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
     * Classic Pop - I V vi IV (8 bars)
     */
    'classic-pop': {
        name: 'Classic Pop',
        style: 'Pop',
        description: 'I-V-vi-IV with maj7 and add2 (8 bars)',
        bpm: 96,
        chords: 'C, G, Am, F, Cmaj7, Gadd2, Am7, Fmaj9'
    },

    /**
     * 50s Progression - I vi IV V (8 bars)
     */
    'fifties': {
        name: '50s Progression',
        style: 'Doo-wop',
        description: 'I-vi-IV-V with 7ths and 6ths (8 bars)',
        bpm: 92,
        chords: 'C, Am, F, G, C6, Am7, Fmaj7, G7'
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
     * Andalusian Cadence - i VII VI V (8 bars)
     */
    'andalusian': {
        name: 'Andalusian',
        style: 'Flamenco / Latin',
        description: 'Minor Andalusian cadence with sus4 (8 bars)',
        bpm: 100,
        chords: 'Am, G, F, E, Am7, Gsus4, Fmaj7, E7'
    },

    /**
     * Jazz ii-V-I (8 bars)
     */
    'ii-v-i': {
        name: 'ii-V-I',
        style: 'Jazz',
        description: 'Classic jazz cadence with extensions (8 bars)',
        bpm: 120,
        chords: 'Dm7, G7, Cmaj7, Cmaj7, Dm11, G9sus4, Cmaj9, C6'
    },

    /**
     * Soul / R&B - vi IV I V (8 bars)
     */
    'soul-rnb': {
        name: 'Soul / R&B',
        style: 'R&B',
        description: 'Warm R&B progression with 9ths (8 bars)',
        bpm: 85,
        chords: 'Am7, Fmaj7, Cmaj7, G, Am9, Fmaj9, Cmaj13, Gadd9'
    },

    /**
     * Lo-fi Loop - i v VII VI (8 bars)
     */
    'lofi-loop': {
        name: 'Lo-fi Loop',
        style: 'Lo-fi',
        description: 'Moody minor loop with sus4 (8 bars)',
        bpm: 72,
        chords: 'Bm7, F#m7, A, G, Bm9, F#m9, Asus4, Gmaj7'
    },

    /**
     * Synthwave - i VI III VII (8 bars)
     */
    'synthwave': {
        name: 'Synthwave',
        style: '80s',
        description: 'Retro synthwave loop with add2 (8 bars)',
        bpm: 110,
        chords: 'F#m, D, A, E, F#m7, Dadd2, Amaj7, Eadd9'
    },

    /**
     * City Pop - warm minor 6 color (8 bars)
     */
    'city-pop': {
        name: 'City Pop',
        style: '80s Pop',
        description: 'Smooth city-pop loop with minor 6ths (8 bars)',
        bpm: 98,
        chords: 'Am6, D9, Gmaj7, Cmaj7, Am9, D9sus4, Gmaj9, Cmaj13'
    },

    /**
     * Neo Soul - minor 6 flavor (8 bars)
     */
    'neo-soul': {
        name: 'Neo Soul',
        style: 'R&B',
        description: 'Neo-soul loop with minor 6ths (8 bars)',
        bpm: 86,
        chords: 'Em6, A13, Dmaj7, Cmaj7, Em9, A9sus4, Dmaj13, Cmaj9'
    },

    /**
     * Bossa Mood - minor 6 cadence (8 bars)
     */
    'bossa-m6': {
        name: 'Bossa Mood',
        style: 'Bossa Nova',
        description: 'Bossa loop with minor 6ths (8 bars)',
        bpm: 96,
        chords: 'Dm6, G7, Cmaj7, Am7, Dm9, G9sus4, Cmaj9, Am11'
    },

    /**
     * Film Noir - minor 6 tension (8 bars)
     */
    'film-noir': {
        name: 'Film Noir',
        style: 'Cinematic',
        description: 'Noir loop with minor 6ths (8 bars)',
        bpm: 72,
        chords: 'Cm6, Fm9, Bb7, Ebmaj7, Cm7, Fm11, Bb9sus4, Ebmaj9'
    },

    /**
     * Lush Ballad - minor 6 color (8 bars)
     */
    'lush-ballad': {
        name: 'Lush Ballad',
        style: 'Ballad',
        description: 'Lush ballad loop with minor 6ths (8 bars)',
        bpm: 68,
        chords: 'Gm6, C9, Fmaj7, Bbmaj7, Gm9, C9sus4, Fmaj9, Bbmaj13'
    },

    /**
     * Downtempo - minor 6 haze (8 bars)
     */
    'downtempo-m6': {
        name: 'Downtempo M6',
        style: 'Downtempo',
        description: 'Laid-back loop with minor 6ths (8 bars)',
        bpm: 78,
        chords: 'Fm6, Abmaj7, Ebmaj7, Dbmaj7, Fm9, Abmaj9, Ebmaj13, Dbadd9'
    },

    /**
     * Jazz Waltz - minor 6 voice (8 bars)
     */
    'jazz-waltz-m6': {
        name: 'Jazz Waltz M6',
        style: 'Jazz',
        description: 'Jazz waltz feel with minor 6ths (8 bars)',
        bpm: 132,
        chords: 'Bm6, E7, Amaj7, Dmaj7, Bm9, E9sus4, Amaj13, Dmaj9'
    },

    /**
     * Cloud Rap - minor loop (8 bars)
     */
    'cloud-rap': {
        name: 'Cloud Rap',
        style: 'Hip-Hop',
        description: 'Moody minor loop with sus4 (8 bars)',
        bpm: 74,
        chords: 'Fm7, Dbmaj7, Abmaj7, Eb, Fm9, Dbmaj9, Absus4, Ebadd9'
    },

    /**
     * Trap Glow - i VI III VII (8 bars)
     */
    'trap-glow': {
        name: 'Trap Glow',
        style: 'Trap',
        description: 'Trap-ready minor loop with add2 (8 bars)',
        bpm: 140,
        chords: 'C#m, A, E, B, C#m7, Aadd2, Emaj7, Badd9'
    },

    /**
     * Drill Night - i bVI bVII (8 bars)
     */
    'drill-night': {
        name: 'Drill Night',
        style: 'Drill',
        description: 'Dark drill loop with sus4 (8 bars)',
        bpm: 144,
        chords: 'Dm, Bb, C, Dm, Dm7, Bbsus4, Cadd9, Dm9'
    },

    /**
     * Jersey Bounce - upbeat loop (8 bars)
     */
    'jersey-bounce': {
        name: 'Jersey Bounce',
        style: 'Jersey Club',
        description: 'Upbeat club loop with maj7 (8 bars)',
        bpm: 140,
        chords: 'Am, F, C, G, Am7, Fmaj7, Cadd2, G6'
    },

    /**
     * Afro Pop - bright loop (8 bars)
     */
    'afro-pop': {
        name: 'Afro Pop',
        style: 'Afrobeats',
        description: 'Bright afrobeats loop with add2 (8 bars)',
        bpm: 110,
        chords: 'F#m, D, A, E, F#m7, Dadd2, Amaj7, Eadd9'
    },

    /**
     * UK Garage - 2-step loop (8 bars)
     */
    'ukg-2step': {
        name: 'UK Garage',
        style: 'UKG',
        description: '2-step friendly loop with sus4 (8 bars)',
        bpm: 130,
        chords: 'Bm7, Em7, G, A, Bm9, Em9, Gadd2, Asus4'
    },

    /**
     * Hyperpop Spark - bright loop (8 bars)
     */
    'hyperpop-spark': {
        name: 'Hyperpop Spark',
        style: 'Hyperpop',
        description: 'Bright hyperpop loop with add2 (8 bars)',
        bpm: 160,
        chords: 'C, G, D, A, Cadd2, Gmaj7, Dadd9, Amaj7'
    },

    /**
     * K-Pop Lift - pop lift (8 bars)
     */
    'kpop-lift': {
        name: 'K-Pop Lift',
        style: 'K-Pop',
        description: 'Uplifting pop loop with maj7 (8 bars)',
        bpm: 120,
        chords: 'G, D, Em, C, Gmaj7, Dadd2, Em7, Cmaj9'
    },

    /**
     * Phonk Drift - minor drive (8 bars)
     */
    'phonk-drift': {
        name: 'Phonk Drift',
        style: 'Phonk',
        description: 'Dark phonk loop with sus4 (8 bars)',
        bpm: 150,
        chords: 'Em, C, D, B, Em7, Csus4, Dadd9, Bm7'
    },

    /**
     * Bedroom Indie - soft loop (8 bars)
     */
    'bedroom-indie': {
        name: 'Bedroom Indie',
        style: 'Indie',
        description: 'Soft indie loop with add2 (8 bars)',
        bpm: 88,
        chords: 'Cmaj7, Em7, Am7, G, Cmaj9, Em9, Am11, Gadd9'
    },

    /**
     * D Major Lush - extended chords in D (12 bars)
     */
    'd-major-lush': {
        name: 'D Major Lush',
        style: 'Pop / Jazz',
        description: 'Extended chords in D (12 bars)',
        bpm: 85,
        chords: 'D, A, C#m7, Dmaj13, F#m, Aadd2, C#7, Dmaj13, Dadd2, Asus4, Eadd13, F#m9'
    },

    /**
     * Eb Warm - flat-key progression (12 bars)
     */
    'eb-warm': {
        name: 'Eb Warm',
        style: 'Jazz / R&B',
        description: 'Flat-key progression with maj7 colors (12 bars)',
        bpm: 80,
        chords: 'C9sus4, Ab, Ebsus4, Eb, Cm, Abmaj7, Ebmaj9, Ebadd2, Bbsus4, Bb, Abmaj13, Abmaj7'
    },

    /**
     * G Extended - maj7 and augmented flavors (8 bars)
     */
    'g-extended': {
        name: 'G Extended',
        style: 'Jazz',
        description: 'Maj7 and augmented flavors (8 bars)',
        bpm: 90,
        chords: 'Dmaj7, F#aug, Gmaj7, Gm9, E7sus4, F#11, Gmaj13, G'
    },

    /**
     * F Lush - F major with 6ths and 9ths (8 bars)
     */
    'f-lush': {
        name: 'F Lush',
        style: 'Ballad / Pop',
        description: 'F major with 6ths and 9ths (8 bars)',
        bpm: 78,
        chords: 'Am11, Gadd4, F, Fmaj9, Am9, G6, Fmaj7, Fmaj13'
    },

    /**
     * C Folk Extended - C progression with add2/add4 (12 bars)
     */
    'c-folk-extended': {
        name: 'C Folk Extended',
        style: 'Folk / Pop',
        description: 'C progression with add2/add4 (12 bars)',
        bpm: 82,
        chords: 'C, A6, Em, Emadd2, C6, Am13, Dsus4, D, Gadd2, Am11, B9sus4, B'
    },

    /**
     * C Alt Folk - alternate C-based progression (12 bars)
     */
    'c-alt-folk': {
        name: 'C Alt Folk',
        style: 'Folk / Pop',
        description: 'Alternate C-based progression (12 bars)',
        bpm: 84,
        chords: 'C, Aadd2, Em, Emadd2, Cadd4, Am11, B9sus4, B, C6, Am13, Dsus4, D'
    },

    /**
     * C Sus2 Loop - suspended and extended (12 bars)
     */
    'c-sus2-loop': {
        name: 'C Sus2 Loop',
        style: 'Ambient / Folk',
        description: 'Suspended and extended (12 bars)',
        bpm: 76,
        chords: 'Csus2, Em7, Dsus4, D, Gsus4, Cmaj7, Em7, Dsus4, Am6, Em, D13, B9'
    },

    /**
     * Chromatic Reference - all keys dim/min/aug (24 bars)
     */
    'chromatic-reference': {
        name: 'Chromatic Reference',
        style: 'Reference',
        description: 'All 12 keys with dim, min, aug (24 bars)',
        bpm: 60,
        chords: 'C, Cdim, Cm, Caug, D, Ddim, Dm, Daug, E, Edim, Em, Eaug, F, Fdim, Fm, Faug, G, Gdim, Gm, Gaug, A, Adim, Am, Aaug, B, Bdim, Bm, Baug'
    },

    /**
     * Gentle Add2 - soft add2/sus2 loop (8 bars)
     */
    'gentle-add2': {
        name: 'Gentle Add2',
        style: 'Ambient / Folk',
        description: 'Soft add2/sus2 loop (8 bars)',
        bpm: 72,
        chords: 'Am9, Em7, Gadd2, Dsus2, Am11, Em9, Gadd4, Dsus4'
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CHORD_PRESETS = CHORD_PRESETS;
}
