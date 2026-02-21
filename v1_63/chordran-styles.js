/**
 * chordran-styles.js – Style definitions for "Random by key" generator.
 * Each style defines: which scale degrees (0=I, 1=ii, …, 6=vii°) can appear,
 * and which [base, extension] colorings each degree can have.
 * extensionChance = probability (0–1) of using the extension instead of the base.
 */
(function (global) {
    const DEGREES_ALL = [0, 1, 2, 3, 4, 5, 6];

    function style(id, name, intro, extensionChance, degrees, optionsByDegree) {
        return { id, name, intro, extensionChance, degrees, optionsByDegree };
    }

    const BY_KEY_STYLES = [
        style('diatonic', 'Diatonic', 'All 7 scale degrees, triads and 7ths. The neutral baseline.', 1 / 3, DEGREES_ALL, {
            0: ['', 'maj7'],
            1: ['m', 'm7'],
            2: [['m', 'm7'], ['', 'maj7']],
            3: [['', 'maj7'], ['m', 'mmaj7']],
            4: ['', '7'],
            5: ['m', 'm7'],
            6: ['dim', 'm7b5']
        }),
        style('jazzy', 'Jazzy', 'Rich 7ths and 9ths, ii–V–I feel. Dominant tensions on V (7#11, sus4).', 0.82, DEGREES_ALL, {
            0: [['', 'maj7'], ['', 'maj9'], ['', '6'], ['', '6/9']],
            1: [['m', 'm7'], ['m', 'm9']],
            2: [['m', 'm7'], ['', 'maj7'], ['', 'maj9']],
            3: [['', 'maj7'], ['', 'maj9'], ['', '6'], ['m', 'm7'], ['m', 'mmaj7']],
            4: [['', '7'], ['', '9'], ['', '7#11'], ['', '7sus4'], ['', '9sus4']],
            5: [['m', 'm7'], ['m', 'm9']],
            6: [['dim', 'm7b5']]
        }),
        // Soul/R&B: I–ii–IV–V–vi only, dominant 7/9 and 9sus4 “lift”, very thick
        style('soul', 'Soul / R&B', 'I–ii–IV–V–vi only. Dominant 7/9 and 9sus4 for that lift.', 0.88, [0, 1, 3, 4, 5], {
            0: [['', '7'], ['', 'maj7'], ['', '9'], ['', 'maj9']],
            1: [['m', 'm7'], ['m', 'm9']],
            3: [['', '7'], ['', 'maj7'], ['', '9'], ['', '9sus4']],
            4: [['', '7'], ['', '9'], ['', '9sus4']],
            5: [['m', 'm7'], ['m', 'm9']]
        }),
        style('pop', 'Pop / Bright', 'I–IV–V–vi (+ ii). Triads plus add9, 6, maj7. No dim or tension.', 0.42, [0, 1, 3, 4, 5], {
            0: [['', ''], ['', 'maj7'], ['', 'add9'], ['', '6'], ['', '6/9']],
            1: [['m', 'm'], ['m', 'm7']],
            3: [['', ''], ['', 'maj7'], ['', 'add9'], ['', '6']],
            4: [['', ''], ['', '7']],
            5: [['m', 'm'], ['m', 'm7'], ['m', 'm9']]
        }),
        style('dark', 'Dark / Moody', 'Minor-key flavor in major: minor I and iv, mMaj7, dim. Moody and tense.', 0.68, DEGREES_ALL, {
            0: [['m', 'm7'], ['m', 'mmaj7']],
            1: [['m', 'm7'], ['m', 'm9']],
            2: [['m', 'm7'], ['m', 'mmaj7']],
            3: [['m', 'm7'], ['m', 'mmaj7']],
            4: [['m', 'm7'], ['', '7']],
            5: [['m', 'm7'], ['m', 'm9'], ['m', 'mmaj7']],
            6: [['dim', 'dim'], ['dim', 'm7b5'], ['dim', 'dim7']]
        }),
        style('blues', 'Blues', 'Only I, IV, V. Always dominant 7 or 9. Classic three-chord blues.', 1, [0, 3, 4], {
            0: [['', '7'], ['', '9']],
            3: [['', '7'], ['', '9']],
            4: [['', '7'], ['', '9']]
        }),
        style('latin', 'Latin / Bossa', 'No vii°. Lush maj7, 6, m7, 9. Smooth bossa and Latin jazz.', 0.9, [0, 1, 2, 3, 4, 5], {
            0: [['', 'maj7'], ['', 'maj9'], ['', '6']],
            1: [['m', 'm7'], ['m', 'm9']],
            2: [['m', 'm7'], ['', 'maj7']],
            3: [['', 'maj7'], ['', '6'], ['m', 'm7']],
            4: [['', '7'], ['', '9']],
            5: [['m', 'm7'], ['m', 'm9']]
        }),
        style('ambient', 'Ambient / Pad', 'Pretty only: maj7, add9, 6/9, sus2/sus4. Soft V, no harsh dominants.', 0.78, [0, 1, 2, 3, 4, 5], {
            0: [['', 'maj7'], ['', 'add9'], ['', '6/9'], ['', 'sus2'], ['', '6']],
            1: [['m', 'm7'], ['m', 'add9'], ['m', 'm9']],
            2: [['m', 'm7'], ['', 'maj7']],
            3: [['', 'maj7'], ['', 'add9'], ['', 'sus4'], ['', '6']],
            4: [['', 'maj7'], ['', 'sus4'], ['', '6']],
            5: [['m', 'm7'], ['m', 'add9'], ['m', 'm9']]
        }),
        style('tension', 'Tension / Modern', '7b9, 7#9, 7#11, aug, dim, m7b5. Film/game and modern harmony.', 0.58, DEGREES_ALL, {
            0: [['', ''], ['', 'maj7'], ['', 'aug']],
            1: [['m', 'm7'], ['m', 'm7b5']],
            2: [['m', 'm7'], ['dim', 'dim']],
            3: [['', ''], ['', 'maj7']],
            4: [['', '7'], ['', '7b9'], ['', '7#9'], ['', '7#11'], ['', '7sus4']],
            5: [['m', 'm7'], ['m', 'm7b5']],
            6: [['dim', 'm7b5'], ['dim', 'dim7']]
        }),
        style('minimal', 'Minimal', 'Only I, IV, V. Mostly triads, a little maj7 or 7. Sparse and clear.', 0.28, [0, 3, 4], {
            0: [['', ''], ['', 'maj7']],
            3: [['', ''], ['', 'maj7']],
            4: [['', ''], ['', '7']]
        }),
        style('random-ext', 'Random extensions', 'Same degrees as diatonic, but each chord can get a different extension. Surprise!', 0.52, DEGREES_ALL, {
            0: [['', ''], ['', 'maj7'], ['', 'add9'], ['', '6'], ['', '6/9']],
            1: [['m', 'm'], ['m', 'm7'], ['m', 'm9']],
            2: [['m', 'm7'], ['', 'maj7']],
            3: [['', 'maj7'], ['m', 'mmaj7']],
            4: [['', ''], ['', '7'], ['', '9']],
            5: [['m', 'm'], ['m', 'm7'], ['m', 'm9']],
            6: [['dim', 'dim'], ['dim', 'm7b5']]
        })
    ];

    function getStyle(id) {
        if (id == null || id === '') return null;
        return BY_KEY_STYLES.find((s) => s.id === id) || null;
    }

    const ByKeyStyles = {
        list: BY_KEY_STYLES,
        get: getStyle,
        DEGREES_ALL
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ByKeyStyles;
    } else {
        global.ByKeyStyles = ByKeyStyles;
    }
})(typeof window !== 'undefined' ? window : this);
