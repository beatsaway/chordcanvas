/**
 * Chord Sequence Presets
 * Each preset contains:
 * - name: Display name for the preset
 * - chords: Array of chord strings
 * - transitions: Object mapping chord index to transition type
 * - bpm: Optional BPM suggestion
 */

(function() {
    'use strict';
    
    const ChordPresets = {
        presets: [
            {
                name: "Starlight",
                chords: ["E", "G#7", "C#m", "Bmaj7", "A", "E", "G#7", "C#m7", "B", "Amaj7", "F#m", "Bmaj9", "F#m7", "B", "Amaj7", "Bmaj9", "C#m", "Amaj7", "B", "C#m7", "A", "Bmaj7", "E", "Bmaj9", "C#m", "B", "Amaj7", "Bmaj9", "C#m7", "B", "F#m"],
                transitions: {
                    3: "sec-dom",   // Bmaj7 (4th bar - end of phrase)
                    7: "ii-v-i",    // C#m7 (8th bar)
                    11: "sec-dom",    // Bmaj9 (12th bar)
                    15: "tritone",   // Bmaj9 (16th bar)
                    19: "leading",   // C#m7 (20th bar)
                    23: "sec-dom",   // Bmaj9 (24th bar)
                    27: "ii-v-i",    // Bmaj9 (28th bar)
                },
                bpm: 80
            },
            {
                name: "Stardust",
                chords: ["Am", "C", "G", "Fmaj7", "Am", "C6", "G", "Fmaj9", "Am7", "Cmaj7", "G6", "Fmaj7", "Am", "C", "Gadd9", "Fmaj9", "Am7", "Cmaj7", "G", "Fmaj7", "Am", "C6", "Gadd9", "Fmaj9", "Am7", "Cmaj7", "G6", "Fmaj7", "Am", "C", "G", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                    23: "sec-dom",  // Fmaj9 (24th bar)
                    27: "leading",  // Fmaj7 (28th bar)
                    31: "sec-dom",  // Fmaj9 (32nd bar)
                },
                bpm: 120
            },
            {
                name: "Crystal",
                chords: ["C", "G6", "Am", "Cmaj7", "G", "Am7", "C6", "Gmaj7", "Am", "Fmaj9", "G6", "Em7", "Am7", "Fmaj7", "Gadd9", "Em", "Am", "Fmaj9", "G6", "Em7", "Am7", "Asus4", "Fmaj7", "Gmaj9", "Em7", "Am", "Asus2", "Fmaj9", "Fmaj7", "G6", "Em", "Am7", "Fmaj9", "Gadd9", "Em7", "Am", "Asus4", "Fmaj7", "G6", "Em", "Am7", "Asus2", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Cmaj7 (4th bar)
                    7: "ii-v-i",    // Gmaj7 (8th bar)
                    11: "leading",  // Em7 (12th bar)
                    15: "sec-dom",  // Em (16th bar)
                    19: "ii-v-i",   // Em7 (20th bar)
                    23: "tritone",  // Gmaj9 (24th bar)
                    27: "sec-dom",  // Fmaj9 (28th bar)
                    31: "leading",  // Em (32nd bar)
                    35: "sec-dom",  // Em7 (36th bar)
                    39: "ii-v-i",   // Fmaj9 (40th bar)
                },
                bpm: 128
            },
            {
                name: "Holiday",
                chords: ["G", "Em", "C", "D", "G", "G/B", "C", "Cm/Eb", "G/D", "B7", "Em", "Cm/Eb", "G/D", "E7", "Am7", "Cm6/D", "G", "Em", "C", "D", "G", "B7", "Em", "Eb6", "G/D", "E7", "Am7", "Cm6/Eb", "G", "Em", "Am7", "D", "B7", "Em", "Eb6", "G/D", "E7", "Am7", "Cm6/Eb", "G", "Em", "Am7", "D", "B7", "Em", "Eb6", "G/D", "E7", "Am7", "Cm6/D", "D", "G", "Em", "Am7", "D", "G", "Em", "Am7", "D", "G", "Em", "Am7", "D", "G", "Em", "Am7", "D"],
                transitions: {
                    1: "sec-dom",   // Em (after G)
                    3: "leading",   // D (after C)
                    7: "ii-v-i",    // Cm/Eb, G/D, B7 sequence
                    22: "sec-dom",   // B7 (after G)
                    29: "tritone",   // Am7 (after G)
                },
                bpm: 140
            },
            {
                name: "Inferno",
                chords: ["Gb", "Bbm", "Ab", "Fm", "Gb", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Gb", "Ab", "Bbm", "Ab", "Fm", "Ebm", "Db", "Gb", "Bbm", "Db", "Ebm", "Db", "Gb", "Bbm", "Ab", "Gb", "Bbm", "Ab", "Fm"],
                transitions: {
                    1: "sec-dom",   // Bbm (after Gb)
                    3: "leading",   // Fm (after Ab)
                    10: "ii-v-i",   // Ab, Bbm sequence
                    20: "tritone",  // Ab (after Gb)
                    39: "sec-dom",  // Db (after Ebm)
                },
                bpm: 100
            },
            {
                name: "Majesty",
                chords: ["C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "Bm", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "Bm", "Em", "C", "D", "G", "Em", "C", "D", "G", "Em", "C", "D", "Bm", "Em", "C", "D", "Bm", "Em"],
                transitions: {
                    1: "sec-dom",   // D (after C)
                    3: "leading",   // Em (after G)
                    7: "ii-v-i",    // C, D, G sequence
                    30: "tritone",  // Bm (after G)
                    50: "sec-dom",  // D (after C)
                },
                bpm: 138
            },
            {
                name: "Nostalgia",
                chords: ["Am", "F", "C", "Gmaj7", "Am", "Fmaj7", "C6", "Gadd9", "Am7", "Fmaj9", "Cadd9", "Gmaj7", "Am", "Fmaj7", "C6", "Gadd9", "Am7", "Fmaj9", "Cadd9", "Gmaj7", "Am", "Fmaj7", "Cadd9", "Gadd9", "Am7", "Fmaj9", "C6", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // Gadd9 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                    23: "leading",  // Gadd9 (24th bar)
                    27: "sec-dom",  // Gmaj7 (28th bar)
                },
                bpm: 110
            },
            {
                name: "Dreamscape",
                chords: ["Cmaj9", "Am9", "Fmaj9", "Gmaj7", "Cmaj9", "Am9", "Fmaj9", "Gadd9", "Cmaj9", "Am9", "Fmaj9", "Gmaj7", "Cmaj9", "Am9", "Fmaj9", "Gadd9", "Cmaj9", "Am9", "Fmaj9", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // Gadd9 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 95
            },
            {
                name: "Jazz Cafe",
                chords: ["Dm7", "G7", "Cmaj9", "Am7", "Dm7", "G7", "Cmaj9", "Am9", "Dm7", "G7", "Cmaj9", "Fmaj9", "Dm7", "G7", "Cmaj9", "Am7"],
                transitions: {
                    3: "ii-v-i",    // Am7 (4th bar)
                    7: "sec-dom",   // Am9 (8th bar)
                    11: "leading",  // Fmaj9 (12th bar)
                    15: "sec-dom",  // Am7 (16th bar)
                },
                bpm: 120
            },
            {
                name: "Ethereal",
                chords: ["Csus2", "Gsus2", "Am", "Fsus4", "Csus2", "Gsus4", "Am7", "Fsus2", "Csus2", "Gsus2", "Am", "Fadd9", "Csus2", "Gsus4", "Am7", "Fsus4", "Cadd9", "Gadd9", "Am7", "Fadd11", "Cadd9", "Gadd9", "Am7", "Fadd13"],
                transitions: {
                    3: "sec-dom",   // Fsus4 (4th bar)
                    7: "ii-v-i",    // Fsus2 (8th bar)
                    11: "leading",  // Fadd9 (12th bar)
                    15: "sec-dom",  // Fsus4 (16th bar)
                    19: "ii-v-i",   // Fadd11 (20th bar)
                    23: "leading",  // Fadd13 (24th bar)
                },
                bpm: 85
            },
            {
                name: "Midnight",
                chords: ["Eb", "Cm", "Ab", "Bbmaj7", "Eb", "Cm7", "Abmaj7", "Bb6", "Ebm", "Cm", "Abm", "Bbmaj9", "Eb", "Cm7", "Ab", "Bbmaj7", "Eb", "Cm", "Abmaj7", "Bb6"],
                transitions: {
                    3: "sec-dom",   // Bbmaj7 (4th bar)
                    7: "ii-v-i",    // Bb6 (8th bar)
                    11: "leading",  // Bbmaj9 (12th bar)
                    15: "sec-dom",  // Bbmaj7 (16th bar)
                    19: "ii-v-i",   // Bb6 (20th bar)
                },
                bpm: 100
            },
            {
                name: "Sunset",
                chords: ["F", "G7", "Am", "Fmaj7", "Fmaj9", "G6", "Am7", "Fmaj7", "F", "G7", "Am", "Fmaj9", "Fmaj9", "Gadd9", "Am7", "Fmaj7", "F", "G7", "Am", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj7 (8th bar)
                    11: "leading",  // Fmaj9 (12th bar)
                    15: "sec-dom",  // Fmaj7 (16th bar)
                    19: "ii-v-i",   // Fmaj9 (20th bar)
                },
                bpm: 115
            },
            {
                name: "Mystery",
                chords: ["Dm", "A7", "Bb", "Fmaj7", "Dm7", "A", "Bbmaj7", "Fmaj9", "Dm", "A7", "Bb6", "Fmaj7", "Dm7", "A", "Bb", "Fmaj9", "Dm", "A7", "Bbmaj7", "Fmaj7"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                },
                bpm: 105
            },
            {
                name: "Ocean",
                chords: ["Am", "Dm", "G", "Cmaj7", "Am", "Dm7", "G6", "Cmaj9", "Am7", "Dm7", "G7", "Cmaj9", "Am", "Dm", "Gadd9", "Cmaj7", "Am7", "Dm7", "G7", "Cmaj9"],
                transitions: {
                    3: "sec-dom",   // Cmaj7 (4th bar)
                    7: "ii-v-i",    // Cmaj9 (8th bar)
                    11: "leading",  // Cmaj9 (12th bar)
                    15: "sec-dom",  // Cmaj7 (16th bar)
                    19: "ii-v-i",   // Cmaj9 (20th bar)
                },
                bpm: 90
            },
            {
                name: "Cosmic",
                chords: ["C", "E7", "Am", "Fmaj7", "C6", "E", "Am7", "Fmaj9", "Cmaj9", "E7", "Am9", "Fmaj7", "C", "E7", "Am", "Fmaj9", "Cmaj9", "E7", "Am9", "Fmaj7"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                },
                bpm: 125
            },
            {
                name: "Serenity",
                chords: ["G", "Em", "C", "Dmaj7", "Gadd9", "Em7", "Cmaj9", "D6", "G", "Em", "C6", "Dmaj7", "Gadd9", "Em7", "Cmaj9", "Dadd9", "G", "Em", "C", "Dmaj7", "Gadd9", "Em7", "Cmaj9", "D6"],
                transitions: {
                    3: "sec-dom",   // Dmaj7 (4th bar)
                    7: "ii-v-i",    // D6 (8th bar)
                    11: "leading",  // Dmaj7 (12th bar)
                    15: "sec-dom",  // Dadd9 (16th bar)
                    19: "ii-v-i",   // Dmaj7 (20th bar)
                    23: "leading",  // D6 (24th bar)
                },
                bpm: 100
            },
            {
                name: "Adventure",
                chords: ["A", "D7", "E7", "Amaj7", "A6", "D", "E", "Amaj9", "Am", "Dm7", "E", "Amaj7", "A", "D7", "E7", "Amaj9", "Am", "Dm", "E", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 130
            },
            {
                name: "Lullaby",
                chords: ["C", "Am", "F", "Gmaj7", "Cmaj9", "Am7", "Fmaj9", "Gadd9", "C6", "Am", "Fmaj7", "Gmaj7", "Cmaj9", "Am7", "Fmaj9", "Gadd9", "C", "Am", "F", "Gmaj7", "Cmaj9", "Am7", "Fmaj9", "Gadd9"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // Gadd9 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                    23: "leading",  // Gadd9 (24th bar)
                },
                bpm: 75
            },
            {
                name: "Energize",
                chords: ["C", "F7", "G7", "C6", "C7", "F7", "G9", "Cmaj7", "C", "F7", "G7", "C6", "C7", "F7", "G9", "Cmaj7", "C", "F7", "G7", "C6"],
                transitions: {
                    3: "sec-dom",   // C6 (4th bar)
                    7: "ii-v-i",    // Cmaj7 (8th bar)
                    11: "leading",  // C6 (12th bar)
                    15: "sec-dom",  // Cmaj7 (16th bar)
                    19: "ii-v-i",   // C6 (20th bar)
                },
                bpm: 140
            },
            {
                name: "Reflection",
                chords: ["Bm", "G6", "D", "Amaj7", "Bm7", "Gmaj9", "D6", "Amaj9", "Bm", "G", "D", "Amaj7", "Bm7", "Gmaj9", "Dadd9", "Amaj9", "Bm", "G6", "D", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 95
            },
            {
                name: "Euphoria",
                chords: ["F#m", "B7", "E7", "Amaj7", "F#m7", "B", "E", "Amaj9", "F#m", "B7", "E7", "Amaj7", "F#m7", "B", "E6", "Amaj9", "F#m", "B7", "E", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 135
            },
            {
                name: "Tranquil",
                chords: ["Dm", "G", "C", "Fmaj7", "Dm7", "G7", "Cmaj9", "Fmaj9", "Dm", "G6", "C6", "Fmaj7", "Dm7", "G7", "Cmaj9", "Fmaj9", "Dm", "Gadd9", "C", "Fmaj7", "Dm7", "G7", "Cmaj9", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                    23: "leading",  // Fmaj9 (24th bar)
                },
                bpm: 88
            },
            {
                name: "Voyage",
                chords: ["Am", "Fmaj7", "C6", "Gmaj7", "Am7", "Fmaj9", "Cmaj9", "Gadd9", "Am", "Fmaj7", "C", "Gmaj7", "Am7", "Fmaj9", "Cmaj9", "G6", "Am", "Fmaj7", "Cadd9", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 112
            },
            {
                name: "Celestial",
                chords: ["C", "G6", "Am", "Fmaj7", "Cmaj9", "Gadd9", "Am7", "Fmaj9", "C6", "G", "Am", "Fmaj7", "Cmaj9", "Gadd9", "Am7", "Fmaj9", "C", "G6", "Am", "Fmaj7", "Cmaj9", "Gadd9", "Am7", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                    23: "leading",  // Fmaj9 (24th bar)
                },
                bpm: 108
            },
            {
                name: "Renaissance",
                chords: ["Am", "Dm", "G6", "Cmaj7", "Am7", "Dm7", "G7", "Cmaj9", "Am", "Dm", "Gadd9", "Cmaj7", "Am7", "Dm7", "G7", "Cmaj9", "Am", "Dm", "G6", "Cmaj7"],
                transitions: {
                    3: "sec-dom",   // Cmaj7 (4th bar)
                    7: "ii-v-i",    // Cmaj9 (8th bar)
                    11: "leading",  // Cmaj7 (12th bar)
                    15: "sec-dom",  // Cmaj9 (16th bar)
                    19: "ii-v-i",   // Cmaj7 (20th bar)
                },
                bpm: 92
            },
            {
                name: "Aurora",
                chords: ["F", "Am", "C6", "Gmaj7", "Fmaj9", "Am7", "Cmaj9", "Gadd9", "F", "Am", "C", "Gmaj7", "Fmaj9", "Am7", "Cmaj9", "G6", "F", "Am", "Cadd9", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 98
            },
            {
                name: "Horizon",
                chords: ["G", "Bm", "Em", "Cmaj7", "Gadd9", "Bm7", "Em7", "Cmaj9", "G6", "Bm", "Em", "Cmaj7", "Gadd9", "Bm7", "Em7", "Cmaj9", "G", "Bm", "Em", "Cmaj7"],
                transitions: {
                    3: "sec-dom",   // Cmaj7 (4th bar)
                    7: "ii-v-i",    // Cmaj9 (8th bar)
                    11: "leading",  // Cmaj7 (12th bar)
                    15: "sec-dom",  // Cmaj9 (16th bar)
                    19: "ii-v-i",   // Cmaj7 (20th bar)
                },
                bpm: 102
            },
            {
                name: "Mystic",
                chords: ["Dm", "Am", "Bbmaj7", "Fmaj7", "Dm7", "Am7", "Bb6", "Fmaj9", "Dm", "Am", "Bb", "Fmaj7", "Dm7", "Am7", "Bbmaj9", "Fmaj9", "Dm", "Am", "Bbmaj7", "Fmaj7"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                },
                bpm: 94
            },
            {
                name: "Elevation",
                chords: ["C", "Am", "Fmaj7", "Gmaj7", "Cmaj9", "Am9", "Fmaj9", "Gadd9", "C6", "Am", "Fmaj7", "Gmaj7", "Cmaj9", "Am9", "Fmaj9", "G6", "C", "Am", "Fmaj7", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 118
            },
            {
                name: "Twilight",
                chords: ["Eb", "Abmaj7", "Bbmaj7", "Ebmaj7", "Eb6", "Ab", "Bb", "Ebmaj9", "Ebm", "Abm", "Bbmaj7", "Ebmaj7", "Eb", "Abmaj7", "Bb6", "Ebmaj9", "Ebm", "Abm", "Bbmaj7", "Ebmaj7"],
                transitions: {
                    3: "sec-dom",   // Ebmaj7 (4th bar)
                    7: "ii-v-i",    // Ebmaj9 (8th bar)
                    11: "leading",  // Ebmaj7 (12th bar)
                    15: "sec-dom",  // Ebmaj9 (16th bar)
                    19: "ii-v-i",   // Ebmaj7 (20th bar)
                },
                bpm: 96
            },
            {
                name: "Resonance",
                chords: ["A", "D7", "E7", "Amaj7", "A6", "D", "E", "Amaj9", "Amaj9", "D6", "E7", "Amaj7", "A", "D7", "E", "Amaj9", "Amaj9", "Dadd9", "E7", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 128
            },
            {
                name: "Harmony",
                chords: ["F", "Bbmaj7", "Cmaj7", "Fmaj7", "Fmaj9", "Bb6", "Cmaj9", "Fmaj7", "F", "Bbmaj7", "C6", "Fmaj9", "Fmaj9", "Bb", "Cmaj9", "Fmaj7", "F", "Bbmaj7", "Cmaj7", "Fmaj9"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj7 (8th bar)
                    11: "leading",  // Fmaj9 (12th bar)
                    15: "sec-dom",  // Fmaj7 (16th bar)
                    19: "ii-v-i",   // Fmaj9 (20th bar)
                },
                bpm: 104
            },
            {
                name: "Ascension",
                chords: ["Gm", "D7", "Ebmaj7", "Bbmaj7", "Gm7", "D", "Eb6", "Bbmaj9", "Gm", "D7", "Eb", "Bbmaj7", "Gm7", "Dadd9", "Ebmaj7", "Bbmaj9", "Gm", "D7", "Eb", "Bbmaj7"],
                transitions: {
                    3: "sec-dom",   // Bbmaj7 (4th bar)
                    7: "ii-v-i",    // Bbmaj9 (8th bar)
                    11: "leading",  // Bbmaj7 (12th bar)
                    15: "sec-dom",  // Bbmaj9 (16th bar)
                    19: "ii-v-i",   // Bbmaj7 (20th bar)
                },
                bpm: 106
            },
            {
                name: "Infinity",
                chords: ["C", "E7", "Am", "Fmaj7", "Cadd9", "E", "Am9", "Fmaj9", "C6", "E7", "Am", "Fmaj7", "Cadd9", "E", "Am9", "Fmaj9", "C", "E7", "Am", "Fmaj7"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                },
                bpm: 114
            },
            {
                name: "Echo",
                chords: ["Dm", "G7", "Cmaj7", "Amaj7", "Dm7", "G", "Cmaj9", "Amaj9", "Dm", "G7", "C6", "Amaj7", "Dm7", "Gadd9", "Cmaj9", "Amaj9", "Dm", "G7", "Cmaj7", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 99
            },
            {
                name: "Prism",
                chords: ["B", "E7", "Amaj7", "Dmaj7", "B7", "E", "A", "Dmaj9", "B", "E7", "Amaj7", "Dmaj7", "B7", "E6", "A6", "Dmaj9", "B", "E7", "Amaj7", "Dmaj7"],
                transitions: {
                    3: "sec-dom",   // Dmaj7 (4th bar)
                    7: "ii-v-i",    // Dmaj9 (8th bar)
                    11: "leading",  // Dmaj7 (12th bar)
                    15: "sec-dom",  // Dmaj9 (16th bar)
                    19: "ii-v-i",   // Dmaj7 (20th bar)
                },
                bpm: 122
            },
            {
                name: "Cascade",
                chords: ["Am", "Cmaj7", "Fmaj7", "Gmaj7", "Am7", "Cmaj9", "Fmaj9", "Gadd9", "Am", "C6", "Fmaj7", "Gmaj7", "Am7", "Cmaj9", "Fmaj9", "G6", "Am", "Cmaj7", "Fmaj7", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 111
            },
            {
                name: "Nebula",
                chords: ["F#m", "B7", "E7", "Amaj7", "F#m7", "B", "E", "Amaj9", "F#m", "B7", "E6", "Amaj7", "F#m7", "B", "E", "Amaj9", "F#m", "B7", "E7", "Amaj7"],
                transitions: {
                    3: "sec-dom",   // Amaj7 (4th bar)
                    7: "ii-v-i",    // Amaj9 (8th bar)
                    11: "leading",  // Amaj7 (12th bar)
                    15: "sec-dom",  // Amaj9 (16th bar)
                    19: "ii-v-i",   // Amaj7 (20th bar)
                },
                bpm: 117
            },
            {
                name: "Zen",
                chords: ["C", "Am", "Fmaj7", "Gmaj7", "Csus2", "Am7", "Fsus4", "Gadd9", "C6", "Am", "Fmaj7", "Gmaj7", "Csus2", "Am7", "Fsus2", "G6", "C", "Am", "Fmaj7", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 87
            },
            {
                name: "Pulse",
                chords: ["C", "F7", "G7", "C6", "C7", "F7", "G9", "Cmaj7", "C", "F7", "G7", "C6", "C7", "F7", "G9", "Cmaj7", "C", "F7", "G7", "C6"],
                transitions: {
                    3: "sec-dom",   // C6 (4th bar)
                    7: "ii-v-i",    // Cmaj7 (8th bar)
                    11: "leading",  // C6 (12th bar)
                    15: "sec-dom",  // Cmaj7 (16th bar)
                    19: "ii-v-i",   // C6 (20th bar)
                },
                bpm: 142
            },
            {
                name: "Whisper",
                chords: ["Gm", "Bbmaj7", "Ebmaj7", "Fmaj7", "Gm7", "Bb6", "Ebmaj9", "Fmaj9", "Gm", "Bbmaj7", "Eb", "Fmaj7", "Gm7", "Bb", "Ebmaj9", "Fmaj9", "Gm", "Bbmaj7", "Ebmaj7", "Fmaj7"],
                transitions: {
                    3: "sec-dom",   // Fmaj7 (4th bar)
                    7: "ii-v-i",    // Fmaj9 (8th bar)
                    11: "leading",  // Fmaj7 (12th bar)
                    15: "sec-dom",  // Fmaj9 (16th bar)
                    19: "ii-v-i",   // Fmaj7 (20th bar)
                },
                bpm: 89
            },
            {
                name: "Radiance",
                chords: ["D", "A7", "Bm", "Gmaj7", "Dmaj9", "A6", "Bm7", "Gadd9", "D", "A", "Bm", "Gmaj7", "Dmaj9", "A7", "Bm7", "G6", "D", "A", "Bm", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 113
            },
            {
                name: "Essence",
                chords: ["Am", "Fmaj7", "Cmaj7", "Gmaj7", "Am9", "Fmaj9", "Cmaj9", "Gadd9", "Am", "Fmaj7", "C6", "Gmaj7", "Am9", "Fmaj9", "Cmaj9", "G6", "Am", "Fmaj7", "Cmaj7", "Gmaj7"],
                transitions: {
                    3: "sec-dom",   // Gmaj7 (4th bar)
                    7: "ii-v-i",    // Gadd9 (8th bar)
                    11: "leading",  // Gmaj7 (12th bar)
                    15: "sec-dom",  // G6 (16th bar)
                    19: "ii-v-i",   // Gmaj7 (20th bar)
                },
                bpm: 109
            }
        ],
        
        /**
         * Get all presets
         */
        getAll: function() {
            return this.presets;
        },
        
        /**
         * Get preset by name
         */
        getByName: function(name) {
            return this.presets.find(p => p.name === name);
        },
        
        /**
         * Get random preset
         */
        getRandom: function() {
            return this.presets[Math.floor(Math.random() * this.presets.length)];
        }
    };
    
    // Export to window
    window.ChordPresets = ChordPresets;
})();

