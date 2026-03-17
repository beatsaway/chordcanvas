/**
 * chordran.js – Random chord progression generator by key.
 * Uses ByKeyStyles (chordran-styles.js) when a style is provided; otherwise falls back to built-in diatonic.
 */

(function (global) {
    const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // major scale degrees 1–7

    function getNoteName(keyIndex, degreeIndex) {
        const semitone = (SEMITONES[degreeIndex] + keyIndex) % 12;
        return ROOTS[semitone];
    }

    const DIATONIC_MAJOR = [
        ['', 'maj7'],
        ['m', 'm7'],
        [['m', 'm7'], ['', 'maj7']],
        [['', 'maj7'], ['m', 'mmaj7']],
        ['', '7'],
        ['m', 'm7'],
        ['dim', 'm7b5']
    ];
    const SEVENTH_CHANCE = 1 / 3;

    function pickDiatonicOption(degreeIndex) {
        const entry = DIATONIC_MAJOR[degreeIndex];
        if (Array.isArray(entry[0]) && typeof entry[0][0] === 'string') {
            return entry[Math.floor(Math.random() * entry.length)];
        }
        return entry;
    }

    function pickStyleOption(optionsByDegree, degreeIndex) {
        const entry = optionsByDegree[degreeIndex];
        if (!entry) return null;
        const isMulti = Array.isArray(entry[0]) && typeof entry[0][0] === 'string';
        const pair = isMulti ? entry[Math.floor(Math.random() * entry.length)] : entry;
        return pair;
    }

    function chordSymbol(root, type) {
        if (!type) return root;
        return root + type;
    }

    /**
     * Generate an array of N random chord symbols in the given major key.
     * @param {string} keyName - Key root name (e.g. 'C', 'F#', 'Bb')
     * @param {number} count - Number of chords (2–16)
     * @param {string|object} [styleIdOrStyle] - Style id (e.g. 'diatonic', 'jazzy') or style object from ByKeyStyles
     * @returns {string[]} Chord symbols (e.g. ['C', 'Dm', 'G7', 'Am'])
     */
    function generateChordsInKey(keyName, count, styleIdOrStyle) {
        const keyIndex = ROOTS.indexOf(keyName);
        if (keyIndex === -1) return [];

        const useStyles = typeof global.ByKeyStyles !== 'undefined' && (styleIdOrStyle != null && styleIdOrStyle !== '');
        const styleObj = useStyles
            ? (typeof styleIdOrStyle === 'object' ? styleIdOrStyle : global.ByKeyStyles.get(styleIdOrStyle))
            : null;

        const n = Math.max(2, Math.min(16, Math.floor(count) || 4));
        const out = [];

        if (styleObj && styleObj.degrees && styleObj.degrees.length > 0) {
            const { degrees, optionsByDegree, extensionChance } = styleObj;
            for (let i = 0; i < n; i++) {
                const degree = degrees[Math.floor(Math.random() * degrees.length)];
                const pair = pickStyleOption(optionsByDegree, degree);
                if (!pair) continue;
                const [baseType, extType] = pair;
                const useExt = extType !== '' && Math.random() < extensionChance;
                const type = useExt ? extType : baseType;
                const root = getNoteName(keyIndex, degree);
                out.push(chordSymbol(root, type));
            }
        } else {
            for (let i = 0; i < n; i++) {
                const degree = Math.floor(Math.random() * 7);
                const [baseType, seventhType] = pickDiatonicOption(degree);
                const useSeventh = Math.random() < SEVENTH_CHANCE;
                const type = useSeventh ? seventhType : baseType;
                const root = getNoteName(keyIndex, degree);
                out.push(chordSymbol(root, type));
            }
        }

        return out;
    }

    /**
     * Generate a comma-separated chord string for the chord input.
     * @param {string} keyName - Key root name
     * @param {number} count - Number of chords (2–16)
     * @param {string|object} [styleIdOrStyle] - Optional style id or style object
     * @returns {string} e.g. "C, Dm, G7, Am"
     */
    function generateChordString(keyName, count, styleIdOrStyle) {
        return generateChordsInKey(keyName, count, styleIdOrStyle).join(', ');
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
