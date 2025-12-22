/**
 * Chord Parser
 * Handles parsing chord strings and calculating chord frequencies
 */

(function() {
    'use strict';

    const ChordParser = {
        /**
         * Parse chord from string input
         * @param {string} input - Chord string (e.g., "C", "Cm", "C7", "C#m")
         * @returns {Object|null} Parsed chord object or null if invalid
         */
        parseChord: function(input) {
            const trimmed = input.trim();
            if (!trimmed) return null;

            // Match pattern: [Note][# or b][quality suffix]
            const match = trimmed.match(/^([A-Ga-g])([#b]?)(.*)$/i);
            if (!match) return null;

            const rootLetter = match[1].toUpperCase();
            const accidental = match[2] || '';
            const suffix = match[3].toLowerCase();

            // Construct note name
            const noteName = rootLetter + accidental;

            // Check if note exists in mapping
            if (!Config.NOTE_TO_INDEX.hasOwnProperty(noteName)) {
                return null;
            }

            // Determine chord type based on suffix
            let chordType = 'major-triad'; // default
            
            // Handle slash chords (e.g., "C/E" = C major with E in bass)
            // For now, we'll just use the root chord and ignore the bass note
            const slashIndex = suffix.indexOf('/');
            if (slashIndex !== -1) {
                suffix = suffix.substring(0, slashIndex);
            }
            
            // Check suffixes in order (first match wins)
            if (suffix === 'm' || suffix === 'min' || suffix === '-') {
                chordType = 'minor-triad';
            } else if (suffix === '7' || suffix === 'dom' || suffix === 'dom7') {
                chordType = 'dominant-7th';
            } else if (suffix === 'm7' || suffix === 'min7') {
                chordType = 'minor-7th';
            } else if (suffix.includes('dim') || suffix === 'o' || suffix === '°') {
                // Check if it's diminished 7th (has both "dim" and "7")
                if (suffix.includes('7')) {
                    chordType = 'diminished-7th';
                } else {
                    chordType = 'diminished-triad';
                }
            } else if (suffix.includes('aug') || suffix === '+') {
                chordType = 'augmented-triad';
            } else if (suffix === 'maj9' || suffix === 'major9' || suffix === 'M9') {
                chordType = 'major-9th';
            } else if (suffix === 'm9' || suffix === 'min9' || suffix === '-9') {
                chordType = 'minor-9th';
            } else if (suffix === '9') {
                chordType = 'dominant-9th'; // Standard "9" means dominant 9th
            } else if (suffix === 'maj7' || suffix === 'major7' || suffix === 'M7' || suffix === 'ma7') {
                chordType = 'major-7th';
            } else if (suffix === '6') {
                chordType = 'major-6th';
            } else if (suffix === 'm6' || suffix === 'min6' || suffix === '-6') {
                chordType = 'minor-6th';
            } else if (suffix.includes('add9') || suffix === 'add9') {
                chordType = 'add9';
            } else if (suffix.includes('add11')) {
                chordType = 'add11';
            } else if (suffix.includes('add13')) {
                chordType = 'add13';
            } else if (suffix.includes('7#11') || suffix.includes('7(#11)') || suffix.includes('7+11')) {
                chordType = '7sharp11';
            } else if (suffix.includes('9#11') || suffix.includes('9(#11)') || suffix.includes('9+11')) {
                chordType = '9sharp11';
            } else if (suffix.includes('sus2') || suffix === 'sus2') {
                chordType = 'sus2';
            } else if (suffix.includes('sus4') || suffix === 'sus' || suffix === 'sus4') {
                chordType = 'sus4';
            }

            return {
                rootNote: noteName,
                chordType: chordType
            };
        },

        /**
         * Parse multiple chords from comma-separated string
         * @param {string} input - Comma-separated chord string
         * @returns {Array} Array of parsed chord objects
         */
        parseChords: function(input) {
            const chordStrings = input.split(',').map(s => s.trim()).filter(s => s);
            const chords = [];
            
            for (const chordStr of chordStrings) {
                const chord = this.parseChord(chordStr);
                if (chord) {
                    chords.push(chord);
                }
            }
            
            return chords;
        },

        /**
         * Get chord note frequencies
         * @param {string} rootNote - Root note name
         * @param {string} chordType - Chord type
         * @returns {Array} Array of frequencies in Hz
         */
        getChordFrequencies: function(rootNote, chordType) {
            // Handle slash chords (e.g., C/E)
            let actualRoot = rootNote;
            let bassNote = null;
            const slashMatch = rootNote.match(/\/([A-G][#b]?)$/);
            if (slashMatch) {
                bassNote = slashMatch[1];
                actualRoot = rootNote.replace(/\/.*/, '').trim();
            }

            const rootIndex = Config.NOTE_TO_INDEX[actualRoot];
            if (rootIndex === undefined) return [];

            const intervals = Config.CHORD_INTERVALS[chordType];
            if (!intervals) return [];

            const frequencies = [];
            const allNotes = Config.getAllNoteFrequencies();
            const rootNoteInMiddleOctave = 12 + rootIndex; // Use middle octave (C4)

            // Add bass note if slash chord (one octave lower)
            if (bassNote) {
                const bassIndex = Config.NOTE_TO_INDEX[bassNote];
                if (bassIndex !== undefined) {
                    const bassNoteInLowerOctave = 0 + bassIndex;
                    if (bassNoteInLowerOctave >= 0 && bassNoteInLowerOctave < allNotes.length) {
                        frequencies.push(allNotes[bassNoteInLowerOctave].freq);
                    }
                }
            }

            intervals.forEach((interval) => {
                let noteIndex = rootNoteInMiddleOctave + interval;
                // Keep notes within reasonable range
                while (noteIndex > 28 && noteIndex >= 0) {
                    noteIndex = noteIndex - 12;
                }
                if (noteIndex >= 0 && noteIndex < allNotes.length) {
                    frequencies.push(allNotes[noteIndex].freq);
                }
            });

            return frequencies;
        },

        /**
         * Calculate transition chord based on transition type
         * @param {string} transitionType - Type of transition
         * @param {Object} currentChord - Current chord object
         * @param {Object} targetChord - Target chord object
         * @returns {Object|Array|null} Transition chord(s) or null
         */
        calculateTransitionChord: function(transitionType, currentChord, targetChord) {
            if (!targetChord || transitionType === 'none') return null;

            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const currentRoot = currentChord.rootNote.replace(/\/.*/, '').trim();
            const targetRoot = targetChord.rootNote.replace(/\/.*/, '').trim();
            const currentRootIndex = Config.NOTE_TO_INDEX[currentRoot];
            const targetRootIndex = Config.NOTE_TO_INDEX[targetRoot];

            if (currentRootIndex === undefined || targetRootIndex === undefined) return null;

            let transitionChord = null;

            switch (transitionType) {
                case 'ii-v-i': {
                    // ii-V7 of target (two chords)
                    const iiIndex = (targetRootIndex + 2) % 12;
                    const iiNote = noteNames[iiIndex];
                    const v7Index = (targetRootIndex + 7) % 12;
                    const v7Note = noteNames[v7Index];
                    transitionChord = [
                        { rootNote: iiNote, chordType: 'minor-7th' },
                        { rootNote: v7Note, chordType: 'dominant-7th' }
                    ];
                    break;
                }
                case 'sec-dom': {
                    // V7 of target chord
                    const v7Index = (targetRootIndex + 7) % 12;
                    const v7Note = noteNames[v7Index];
                    transitionChord = { rootNote: v7Note, chordType: 'dominant-7th' };
                    break;
                }
                case 'tritone': {
                    // Dominant 7th a semitone above target
                    const tritoneIndex = (targetRootIndex + 1) % 12;
                    const tritoneNote = noteNames[tritoneIndex];
                    transitionChord = { rootNote: tritoneNote, chordType: 'dominant-7th' };
                    break;
                }
                case 'leading': {
                    // Leading tone: semitone below target root in bass (slash chord)
                    const leadingToneIndex = (targetRootIndex - 1 + 12) % 12;
                    const leadingToneName = noteNames[leadingToneIndex];
                    transitionChord = { rootNote: currentRoot + '/' + leadingToneName, chordType: 'major-triad' };
                    break;
                }
                case 'passing': {
                    // Passing diminished: chord between current and target
                    const intervalDistance = (targetRootIndex - currentRootIndex + 12) % 12;
                    let dimIndex;
                    if (intervalDistance > 6) {
                        dimIndex = (currentRootIndex + Math.floor(intervalDistance / 2)) % 12;
                    } else if (intervalDistance > 2) {
                        dimIndex = (currentRootIndex + Math.floor(intervalDistance / 2)) % 12;
                    } else {
                        dimIndex = (currentRootIndex + 1) % 12;
                    }
                    const dimNote = noteNames[dimIndex];
                    transitionChord = { rootNote: dimNote, chordType: 'diminished-7th' };
                    break;
                }
            }

            return transitionChord;
        },

        /**
         * Generate random chord sequence
         * @param {number} count - Number of chords to generate
         * @returns {string} Comma-separated chord string
         */
        generateRandomChords: function(count = 10) {
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const qualities = ['', 'm', '7', 'm7', 'maj7', 'dim', 'dim7', 'aug', '6', 'm6', 
                              '9', 'maj9', 'm9', 'add9', 'add11', 'add13', 
                              '7#11', '9#11', 'sus2', 'sus4'];
            const chords = [];
            
            for (let i = 0; i < count; i++) {
                const note = notes[Math.floor(Math.random() * notes.length)];
                const quality = qualities[Math.floor(Math.random() * qualities.length)];
                chords.push(note + quality);
            }
            
            return chords.join(', ');
        }
    };

    // Export to window
    window.ChordParser = ChordParser;
})();

