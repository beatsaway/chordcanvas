/**
 * chordran-modulation.js – Modulation layer for "Random by key".
 * Uses ChordRan for every chord; decides when to insert V7 and switch key.
 * Rules: first chord 0% chance to modulate; after a modulation, stay at least 3 chords.
 */

(function (global) {
    const MODULATION_CHANCE = 0.33;
    const MIN_CHORDS_AFTER_MODULATION = 3;

    /** Target key index from current key index (0–11). */
    const MODULATION_TYPES = {
        none: null,
        toIV: function (keyIndex) { return (keyIndex + 5) % 12; },
        toV: function (keyIndex) { return (keyIndex + 7) % 12; },
        toRelativeMinor: function (keyIndex) { return (keyIndex + 9) % 12; },
        toRelativeMajor: function (keyIndex) { return (keyIndex + 3) % 12; },
        tobVII: function (keyIndex) { return (keyIndex + 10) % 12; },
        tobVI: function (keyIndex) { return (keyIndex + 8) % 12; },
        toIII: function (keyIndex) { return (keyIndex + 4) % 12; },
        toii: function (keyIndex) { return (keyIndex + 2) % 12; },
        tobII: function (keyIndex) { return (keyIndex + 1) % 12; },
        tobIII: function (keyIndex) { return (keyIndex + 3) % 12; }
    };

    function getV7OfKey(roots, targetKeyIndex) {
        const vIndex = (targetKeyIndex + 7) % 12;
        return roots[vIndex] + '7';
    }

    /**
     * Generate a chord string with optional modulation.
     * @param {string} keyName - Starting key (e.g. 'C', 'Bb')
     * @param {number} count - Number of chord slots (2–16)
     * @param {string} styleId - ByKeyStyles style id
     * @param {string} modulationType - 'none' | 'toIV' | 'toV' | 'toRelativeMinor' | 'toRelativeMajor' | 'tobVII' | 'tobVI' | 'toIII' | 'toii' | 'tobII' | 'tobIII'
     * @param {number} [modulationChance] - 0–1, default 0.33
     * @returns {string} Comma-separated chord symbols
     */
    function generateChordStringWithModulation(keyName, count, styleId, modulationType, modulationChance) {
        const ChordRan = global.ChordRan;
        if (!ChordRan || !ChordRan.ROOTS || !ChordRan.generateChordsInKey) {
            return ChordRan ? ChordRan.generateChordString(keyName, count, styleId) : '';
        }

        const roots = ChordRan.ROOTS;
        const keyIndex = roots.indexOf(keyName);
        if (keyIndex === -1) {
            return ChordRan.generateChordString(keyName, count, styleId);
        }

        const useModulation = modulationType && modulationType !== 'none' && MODULATION_TYPES[modulationType];
        const chance = typeof modulationChance === 'number' && modulationChance >= 0 ? modulationChance : MODULATION_CHANCE;

        if (!useModulation || chance <= 0) {
            return ChordRan.generateChordString(keyName, count, styleId);
        }

        const getTargetKeyIndex = MODULATION_TYPES[modulationType];
        const chords = [];
        let currentKeyIndex = keyIndex;
        let chordsSinceModulation = MIN_CHORDS_AFTER_MODULATION; // allow modulation after first 3 slots (first chord is always no modulation)
        let slotsFilled = 0;

        while (slotsFilled < count) {
            const isFirstChord = slotsFilled === 0;
            const canModulate =
                !isFirstChord &&
                chordsSinceModulation >= MIN_CHORDS_AFTER_MODULATION &&
                slotsFilled + 2 <= count &&
                Math.random() < chance;

            if (canModulate) {
                const targetKeyIndex = getTargetKeyIndex(currentKeyIndex);
                const targetKeyName = roots[targetKeyIndex];
                const v7 = getV7OfKey(roots, targetKeyIndex);
                chords.push(v7);
                const oneInNewKey = ChordRan.generateChordsInKey(targetKeyName, 1, styleId);
                if (oneInNewKey.length) chords.push(oneInNewKey[0]);
                currentKeyIndex = targetKeyIndex;
                chordsSinceModulation = 1;
                slotsFilled += 2;
            } else {
                const currentKeyName = roots[currentKeyIndex];
                const one = ChordRan.generateChordsInKey(currentKeyName, 1, styleId);
                if (one.length) chords.push(one[0]);
                chordsSinceModulation += 1;
                slotsFilled += 1;
            }
        }

        return chords.join(', ');
    }

    const ChordRanModulation = {
        generateChordStringWithModulation,
        MODULATION_CHANCE,
        MIN_CHORDS_AFTER_MODULATION,
        MODULATION_TYPES
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChordRanModulation;
    } else {
        global.ChordRanModulation = ChordRanModulation;
    }
})(typeof window !== 'undefined' ? window : this);
