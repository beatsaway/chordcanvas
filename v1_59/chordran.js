/**
 * chordran.js – Random chord progression generator by key
 * Diatonic music theory: major key only (I, ii, iii, IV, V, vi, vii°).
 * 33% chance to use 7th for each chord (e.g. C → Cmaj7, G → G7).
 */

(function (global) {
    const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // major scale degrees 1–7

    function getNoteName(keyIndex, degreeIndex) {
        const semitone = (SEMITONES[degreeIndex] + keyIndex) % 12;
        return ROOTS[semitone];
    }

    // Diatonic chords in major: I, ii, iii, IV, V, vi, vii°
    // [base type, 7th type] – base is triad, 7th used 33% of the time
    const DIATONIC_MAJOR = [
        ['', 'maj7'],     // I   → C,    Cmaj7
        ['m', 'm7'],      // ii  → Dm,   Dm7
        ['m', 'm7'],      // iii → Em,   Em7
        ['', 'maj7'],     // IV  → F,    Fmaj7
        ['', '7'],        // V   → G,    G7
        ['m', 'm7'],      // vi  → Am,   Am7
        ['dim', 'm7b5']   // vii°→ Bdim, Bm7b5
    ];

    const SEVENTH_CHANCE = 1 / 3; // 33%

    function chordSymbol(root, type) {
        if (!type) return root;
        if (type === 'maj7') return root + 'maj7';
        if (type === 'm7b5') return root + 'm7b5';
        return root + type;
    }

    /**
     * Generate an array of N random diatonic chord symbols in the given major key.
     * Each chord is one of I, ii, iii, IV, V, vi, vii°. 33% chance to use 7th.
     * @param {string} keyName - Key root name (e.g. 'C', 'F#', 'Bb')
     * @param {number} count - Number of chords (2–16)
     * @returns {string[]} Chord symbols (e.g. ['C', 'Dm', 'G7', 'Am'])
     */
    function generateChordsInKey(keyName, count) {
        const keyIndex = ROOTS.indexOf(keyName);
        if (keyIndex === -1) return [];
        const n = Math.max(2, Math.min(16, Math.floor(count) || 4));
        const out = [];
        for (let i = 0; i < n; i++) {
            const degree = Math.floor(Math.random() * 7);
            const [baseType, seventhType] = DIATONIC_MAJOR[degree];
            const useSeventh = Math.random() < SEVENTH_CHANCE;
            const type = useSeventh ? seventhType : baseType;
            const root = getNoteName(keyIndex, degree);
            out.push(chordSymbol(root, type));
        }
        return out;
    }

    /**
     * Generate a comma-separated chord string for the chord input.
     * @param {string} keyName - Key root name
     * @param {number} count - Number of chords (2–16)
     * @returns {string} e.g. "C, Dm, G7, Am"
     */
    function generateChordString(keyName, count) {
        return generateChordsInKey(keyName, count).join(', ');
    }

    const ChordRan = {
        ROOTS,
        generateChordsInKey,
        generateChordString
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChordRan;
    } else {
        global.ChordRan = ChordRan;
    }
})(typeof window !== 'undefined' ? window : this);
