/**
 * Piano Visualizer
 * Displays a piano keyboard that shows which notes are in the current chord
 */

(function() {
    'use strict';

    const PianoVisualizer = {
        pianoContainer: null,
        
        // Note names in order (88 keys: A0 to C8)
        allNotes: [],
        
        // Current palette notes (stored as array of {note, octave} objects)
        currentPaletteNotes: [],

        /**
         * Initialize the piano visualizer
         */
        init: function(containerId) {
            this.pianoContainer = document.getElementById(containerId);
            if (!this.pianoContainer) {
                console.error('Piano container not found:', containerId);
                return;
            }

            // Generate all 88 keys: A0 to C8 (7¼ octaves)
            // Standard piano: 52 white keys + 36 black keys = 88 keys total
            const noteNames = Object.keys(Config.BASE_FREQUENCIES);
            
            this.allNotes = [];
            
            // Octave 0: A, A#, B (3 keys)
            const octave0Notes = ['A', 'A#', 'B'];
            octave0Notes.forEach(note => {
                this.allNotes.push(note + '0');
            });
            
            // Octaves 1-7: Full 12-note scale (C through B) for each octave
            for (let octave = 1; octave <= 7; octave++) {
                noteNames.forEach(note => {
                    this.allNotes.push(note + octave);
                });
            }
            
            // Octave 8: Just C (1 key)
            this.allNotes.push('C8');

            this.createPiano();
        },

        /**
         * Check if a note is a black key
         */
        isBlackKey: function(noteName) {
            return noteName.includes('#') || noteName.includes('b');
        },

        /**
         * Normalize note name (handle enharmonic equivalents)
         */
        normalizeNote: function(noteName) {
            // Remove octave number if present
            const baseNote = noteName.replace(/\d+/, '');
            return Config.normalizeNote(baseNote);
        },

        /**
         * Create the piano keyboard
         */
        createPiano: function() {
            const pianoKeys = document.createElement('div');
            pianoKeys.className = 'piano-keys';
            
            // Create white keys first
            this.allNotes.forEach(noteName => {
                if (!this.isBlackKey(noteName)) {
                    const key = this.createKey(noteName, false);
                    pianoKeys.appendChild(key);
                }
            });

            // Create black keys and append them
            this.allNotes.forEach(noteName => {
                if (this.isBlackKey(noteName)) {
                    const key = this.createKey(noteName, true);
                    pianoKeys.appendChild(key);
                }
            });

            // Append container first so we can measure
            this.pianoContainer.appendChild(pianoKeys);
            
            // Position black keys after white keys are rendered
            setTimeout(() => {
                this.positionBlackKeys(pianoKeys);
            }, 0);
        },

        /**
         * Position black keys relative to white keys
         * Black keys are positioned between their reference white key and the next white key
         */
        positionBlackKeys: function(pianoKeys) {
            const whiteKeys = pianoKeys.querySelectorAll('.piano-key:not(.black-key)');
            const blackKeys = pianoKeys.querySelectorAll('.piano-key.black-key');
            
            // Create a map of white key positions by note name
            const whiteKeyMap = new Map();
            whiteKeys.forEach((wk, index) => {
                const noteName = wk.getAttribute('data-note');
                whiteKeyMap.set(noteName, { element: wk, index: index });
            });
            
            blackKeys.forEach(blackKey => {
                const noteName = blackKey.getAttribute('data-note');
                // Extract base note and octave
                const baseNote = noteName.replace(/\d+/, '');
                const octave = noteName.match(/\d+/)?.[0] || '';
                
                // Map black keys to their reference white keys
                let referenceNote = null;
                if (baseNote.includes('C#') || baseNote.includes('Db')) {
                    referenceNote = 'C' + octave;
                } else if (baseNote.includes('D#') || baseNote.includes('Eb')) {
                    referenceNote = 'D' + octave;
                } else if (baseNote.includes('F#') || baseNote.includes('Gb')) {
                    referenceNote = 'F' + octave;
                } else if (baseNote.includes('G#') || baseNote.includes('Ab')) {
                    referenceNote = 'G' + octave;
                } else if (baseNote.includes('A#') || baseNote.includes('Bb')) {
                    referenceNote = 'A' + octave;
                }
                
                if (referenceNote && whiteKeyMap.has(referenceNote)) {
                    const whiteKeyInfo = whiteKeyMap.get(referenceNote);
                    const whiteKey = whiteKeyInfo.element;
                    const whiteKeyIndex = whiteKeyInfo.index;
                    
                    const whiteKeyRect = whiteKey.getBoundingClientRect();
                    const containerRect = pianoKeys.getBoundingClientRect();
                    
                    // Find the next white key
                    let nextWhiteKey = null;
                    if (whiteKeys[whiteKeyIndex + 1]) {
                        nextWhiteKey = whiteKeys[whiteKeyIndex + 1];
                    }
                    
                    if (nextWhiteKey) {
                        // Position black key at the boundary between two white keys
                        // margin-left: -10px in CSS means visual left edge is 10px left of 'left' position
                        // So setting left = boundaryPoint centers the 20px black key at the boundary
                        const boundaryPoint = whiteKeyRect.left - containerRect.left + whiteKeyRect.width;
                        blackKey.style.left = boundaryPoint + 'px';
                    } else {
                        // Fallback: position at 70% of white key width
                        const leftOffset = (whiteKeyRect.left - containerRect.left) + (whiteKeyRect.width * 0.7);
                        blackKey.style.left = leftOffset + 'px';
                    }
                }
            });
        },

        /**
         * Create a single piano key
         */
        createKey: function(noteName, isBlack) {
            const key = document.createElement('div');
            key.className = `piano-key ${isBlack ? 'black-key' : ''}`;
            key.id = `piano-key-${noteName}`;
            key.setAttribute('data-note', noteName);
            
            const dot = document.createElement('div');
            dot.className = 'chord-palette-dot';
            key.appendChild(dot);
            
            const label = document.createElement('div');
            label.className = 'key-label';
            // Show note name with octave number
            label.textContent = noteName;
            key.appendChild(label);
            
            return key;
        },

        /**
         * Get chord palette notes directly from intervals (without frequency conversion)
         * Returns note names with octaves for: exact intervals + one-octave-lower (lowest & 3rd lowest) + two-octave-lower (lowest)
         * @param {string} rootNote - Root note name (e.g., 'C', 'C#')
         * @param {string} chordType - Chord type (e.g., 'major-triad')
         * @returns {Array} Array of {note, octave} objects
         */
        getChordPaletteNotes: function(rootNote, chordType) {
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

            // Convert intervals directly to note names with octaves
            const baseOctave = 4; // Start in middle octave (C4)
            const notesWithOctaves = [];

            // Add bass note if slash chord (one octave lower)
            if (bassNote) {
                const bassIndex = Config.NOTE_TO_INDEX[bassNote];
                if (bassIndex !== undefined) {
                    const bassNoteName = Config.indexToNote(bassIndex);
                    notesWithOctaves.push({
                        note: bassNoteName,
                        octave: baseOctave - 1
                    });
                }
            }

            // Convert intervals to note names
            intervals.forEach((interval) => {
                const totalSemitones = rootIndex + interval;
                const noteIndex = totalSemitones % 12;
                const noteName = Config.indexToNote(noteIndex);
                
                // Calculate octave: start from base octave, add octave for each 12 semitones
                // C4 = 0 semitones from C, so rootIndex=0, interval=0 → octave 4
                // If rootIndex=0 (C) and interval=12, that's C5 → octave 5
                const octaveOffset = Math.floor(totalSemitones / 12);
                const octave = baseOctave + octaveOffset;
                
                notesWithOctaves.push({
                    note: noteName,
                    octave: octave
                });
            });

            // Sort by octave first, then by note index (lowest first)
            notesWithOctaves.sort((a, b) => {
                if (a.octave !== b.octave) {
                    return a.octave - b.octave;
                }
                const aIndex = Config.NOTE_TO_INDEX[a.note];
                const bIndex = Config.NOTE_TO_INDEX[b.note];
                return aIndex - bIndex;
            });

            // Build array of notes to include in palette
            const paletteNotes = [];
            
            // 1. Add all exact interval notes (original notes)
            notesWithOctaves.forEach(noteObj => {
                paletteNotes.push({
                    note: noteObj.note,
                    octave: noteObj.octave
                });
            });

            // 2. Add one-octave-lower versions of lowest note and 3rd lowest note
            if (notesWithOctaves.length > 0) {
                const lowestNote = notesWithOctaves[0];
                paletteNotes.push({
                    note: lowestNote.note,
                    octave: Math.max(0, lowestNote.octave - 1)
                });
                
                // Two octaves lower of lowest note
                paletteNotes.push({
                    note: lowestNote.note,
                    octave: Math.max(0, lowestNote.octave - 2)
                });
            }
            
            if (notesWithOctaves.length >= 3) {
                const thirdLowestNote = notesWithOctaves[2];
                paletteNotes.push({
                    note: thirdLowestNote.note,
                    octave: Math.max(0, thirdLowestNote.octave - 1)
                });
            }

            return paletteNotes;
        },

        /**
         * Get chord palette frequencies directly from root note and chord type
         * Uses the direct interval-to-note conversion (more straightforward)
         * @param {string} rootNote - Root note name (e.g., 'C', 'C#')
         * @param {string} chordType - Chord type (e.g., 'major-triad')
         * @returns {Array} Array of frequencies to play/display
         */
        getChordPaletteFrequenciesFromChord: function(rootNote, chordType) {
            const paletteNotes = this.getChordPaletteNotes(rootNote, chordType);
            return paletteNotes.map(noteObj => {
                return Config.getFrequency(noteObj.note, noteObj.octave);
            });
        },

        /**
         * Get chord palette frequencies from interval frequencies (legacy method - kept for compatibility)
         * Now uses the direct interval-to-note conversion internally
         * @param {Array} frequencies - Array of frequencies for the current chord intervals
         * @returns {Array} Array of frequencies to play/display
         */
        getChordPaletteFrequencies: function(frequencies) {
            if (!frequencies || frequencies.length === 0) return [];

            // Map frequencies to note names with octaves (for backward compatibility)
            const notesWithOctaves = [];
            
            frequencies.forEach(freq => {
                // Find the closest matching note with octave across all possible octaves
                let closestNote = null;
                let closestOctave = null;
                let minDiff = Infinity;
                
                // Check all octaves from 0 to 8 (full piano range)
                for (let octave = 0; octave <= 8; octave++) {
                    Object.keys(Config.BASE_FREQUENCIES).forEach(note => {
                        const noteFreq = Config.getFrequency(note, octave);
                        const diff = Math.abs(noteFreq - freq);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestNote = note;
                            closestOctave = octave;
                        }
                    });
                }

                if (closestNote && closestOctave !== null && minDiff < 10) { // Allow 10Hz tolerance
                    notesWithOctaves.push({
                        note: closestNote,
                        octave: closestOctave,
                        freq: freq
                    });
                }
            });

            // Sort by frequency (lowest first)
            notesWithOctaves.sort((a, b) => a.freq - b.freq);

            // Build array of frequencies to play
            const paletteFrequencies = [];
            
            // 1. Add all exact interval notes (original notes with their frequencies)
            notesWithOctaves.forEach(noteObj => {
                paletteFrequencies.push(noteObj.freq);
            });

            // 2. Add one-octave-lower versions of lowest note and 3rd lowest note
            if (notesWithOctaves.length > 0) {
                const lowestNote = notesWithOctaves[0];
                const lowestNoteOctave1 = Math.max(0, lowestNote.octave - 1);
                paletteFrequencies.push(Config.getFrequency(lowestNote.note, lowestNoteOctave1));
                
                // Two octaves lower of lowest note
                const lowestNoteOctave2 = Math.max(0, lowestNote.octave - 2);
                paletteFrequencies.push(Config.getFrequency(lowestNote.note, lowestNoteOctave2));
            }
            
            if (notesWithOctaves.length >= 3) {
                const thirdLowestNote = notesWithOctaves[2];
                const thirdLowestOctave = Math.max(0, thirdLowestNote.octave - 1);
                paletteFrequencies.push(Config.getFrequency(thirdLowestNote.note, thirdLowestOctave));
            }

            return paletteFrequencies;
        },

        /**
         * Update the piano to show the current chord palette (direct method from chord)
         * @param {string} rootNote - Root note name (e.g., 'C', 'C#')
         * @param {string} chordType - Chord type (e.g., 'major-triad')
         * @param {string} transitionType - Type of transition ('none', 'ii-v-i', etc.)
         */
        updateChordPaletteFromChord: function(rootNote, chordType, transitionType) {
            // Clear all palette indicators
            const allKeys = this.pianoContainer.querySelectorAll('.piano-key');
            allKeys.forEach(key => {
                key.classList.remove('has-palette');
                key.classList.remove('trans-ii-v-i', 'trans-sec-dom', 'trans-tritone', 'trans-leading', 'trans-passing');
            });

            // Get palette notes directly from intervals
            const paletteNotes = this.getChordPaletteNotes(rootNote, chordType);
            if (paletteNotes.length === 0) return;

            // Store current palette notes for real-time access
            this.currentPaletteNotes = [...paletteNotes];

            // Show palette dots only on the specific keys
            paletteNotes.forEach(noteObj => {
                const noteWithOctave = noteObj.note + noteObj.octave;
                const allKeys = this.pianoContainer.querySelectorAll('.piano-key');
                allKeys.forEach(keyElement => {
                    const keyNote = keyElement.getAttribute('data-note');
                    
                    // Match exact note name with octave
                    if (keyNote === noteWithOctave) {
                        keyElement.classList.add('has-palette');
                        
                        // Add transition color class if applicable
                        if (transitionType && transitionType !== 'none' && Config.TRANSITION_COLORS[transitionType]) {
                            keyElement.classList.add(Config.TRANSITION_COLORS[transitionType]);
                        }
                    }
                });
            });
        },

        /**
         * Update the piano to show the current chord palette (legacy method - kept for compatibility)
         * @param {Array} frequencies - Array of frequencies for the current chord
         * @param {string} transitionType - Type of transition ('none', 'ii-v-i', etc.)
         */
        updateChordPalette: function(frequencies, transitionType) {
            // Clear all palette indicators
            const allKeys = this.pianoContainer.querySelectorAll('.piano-key');
            allKeys.forEach(key => {
                key.classList.remove('has-palette');
                key.classList.remove('trans-ii-v-i', 'trans-sec-dom', 'trans-tritone', 'trans-leading', 'trans-passing');
            });

            if (!frequencies || frequencies.length === 0) return;

            // Get palette frequencies
            const paletteFrequencies = this.getChordPaletteFrequencies(frequencies);
            
            // Map palette frequencies to note names with octaves for display
            const notesToShow = new Set();
            
            paletteFrequencies.forEach(freq => {
                // Find the closest matching note with octave
                let closestNote = null;
                let closestOctave = null;
                let minDiff = Infinity;
                
                for (let octave = 0; octave <= 8; octave++) {
                    Object.keys(Config.BASE_FREQUENCIES).forEach(note => {
                        const noteFreq = Config.getFrequency(note, octave);
                        const diff = Math.abs(noteFreq - freq);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestNote = note;
                            closestOctave = octave;
                        }
                    });
                }

                if (closestNote && closestOctave !== null && minDiff < 10) {
                    notesToShow.add(closestNote + closestOctave);
                }
            });

            // Show palette dots only on the specific keys
            notesToShow.forEach(noteWithOctave => {
                // Find the exact key matching this note and octave
                const allKeys = this.pianoContainer.querySelectorAll('.piano-key');
                allKeys.forEach(keyElement => {
                    const keyNote = keyElement.getAttribute('data-note');
                    
                    // Match exact note name with octave
                    if (keyNote === noteWithOctave) {
                        keyElement.classList.add('has-palette');
                        
                        // Add transition color class if applicable
                        if (transitionType && transitionType !== 'none' && Config.TRANSITION_COLORS[transitionType]) {
                            keyElement.classList.add(Config.TRANSITION_COLORS[transitionType]);
                        }
                    }
                });
            });
        },

        /**
         * Get note frequencies for all notes (A0 to C8)
         * Uses Config for frequency calculations
         */
        getNoteFrequencies: function() {
            const frequencies = {};
            const allNotes = Config.getAllNoteFrequencies();
            
            allNotes.forEach(note => {
                const key = note.octave === 4 ? note.name : note.name + note.octave;
                frequencies[key] = note.freq;
            });

            return frequencies;
        },

        /**
         * Clear all palette indicators
         */
        clearPalette: function() {
            const allKeys = this.pianoContainer.querySelectorAll('.piano-key');
            const transitionClasses = Object.values(Config.TRANSITION_COLORS);
            allKeys.forEach(key => {
                key.classList.remove('has-palette', ...transitionClasses);
            });
            // Clear stored palette notes
            this.currentPaletteNotes = [];
        },

        /**
         * Get current palette notes
         * @returns {Array} Array of {note, octave} objects from current palette
         */
        getCurrentPaletteNotes: function() {
            return this.currentPaletteNotes || [];
        },

        /**
         * Derive 7 arrays of usable notes from palette notes
         * @param {Array} paletteNotes - Array of {note, octave} objects (optional, uses current palette if not provided)
         * @returns {Object} Object with 7 arrays (type0 through type6)
         */
        deriveNoteArraysFromPalette: function(paletteNotes = null) {
            const notes = paletteNotes || this.currentPaletteNotes || [];
            if (notes.length === 0) {
                return {
                    type0: [], type1: [], type2: [], type3: [], 
                    type4: [], type5: [], type6: []
                };
            }

            // Sort palette notes by octave and note index (lowest first)
            const sortedNotes = [...notes].sort((a, b) => {
                if (a.octave !== b.octave) {
                    return a.octave - b.octave;
                }
                const aIndex = Config.NOTE_TO_INDEX[a.note];
                const bIndex = Config.NOTE_TO_INDEX[b.note];
                return aIndex - bIndex;
            });

            // Helper function to format note as string
            const formatNote = (noteObj) => `${noteObj.note}${noteObj.octave}`;

            // type0: lowest 3 notes
            const type0 = sortedNotes.slice(0, 3).map(formatNote);

            // type1: lowest 4 notes
            const type1 = sortedNotes.slice(0, 4).map(formatNote);

            // type2: 3 lowest + 1 octave lower of 2 highest
            const type2 = [];
            // Add 3 lowest notes
            if (sortedNotes.length > 0) {
                sortedNotes.slice(0, Math.min(3, sortedNotes.length)).forEach(noteObj => {
                    type2.push(formatNote(noteObj));
                });
            }
            // Get 2 highest notes and lower them by 1 octave
            if (sortedNotes.length >= 2) {
                const highest2 = sortedNotes.slice(-2);
                highest2.forEach(noteObj => {
                    const lowered = {
                        note: noteObj.note,
                        octave: noteObj.octave - 1
                    };
                    type2.push(formatNote(lowered));
                });
            }

            // type3: all notes from palette
            const type3 = sortedNotes.map(formatNote);

            // type4: all notes excluding highest and 2 lowest
            const type4 = [];
            if (sortedNotes.length > 2) {
                const highestIndex = sortedNotes.length - 1;
                for (let i = 2; i < sortedNotes.length; i++) {
                    if (i !== highestIndex) {
                        type4.push(formatNote(sortedNotes[i]));
                    }
                }
            }

            // type5: all notes excluding 3 lowest
            const type5 = sortedNotes.slice(3).map(formatNote);

            // type6: all notes excluding 3 lowest + octave high version of 2nd highest
            const type6 = [];
            if (sortedNotes.length > 3) {
                // Add all notes excluding 3 lowest
                sortedNotes.slice(3).forEach(noteObj => {
                    type6.push(formatNote(noteObj));
                });
                
                // Add octave high version of 2nd highest note
                if (sortedNotes.length >= 2) {
                    const secondHighest = sortedNotes[sortedNotes.length - 2];
                    const octaveHigh = {
                        note: secondHighest.note,
                        octave: secondHighest.octave + 1
                    };
                    type6.push(formatNote(octaveHigh));
                }
            }

            return { type0, type1, type2, type3, type4, type5, type6 };
        },

        /**
         * Derive 7 arrays of usable notes from chord palette
         * @param {string} rootNote - Root note name
         * @param {string} chordType - Chord type
         * @returns {Object} Object with 7 arrays (type0 through type6)
         */
        deriveNoteArrays: function(rootNote, chordType) {
            const paletteNotes = this.getChordPaletteNotes(rootNote, chordType);
            if (paletteNotes.length === 0) {
                return {
                    type0: [], type1: [], type2: [], type3: [], 
                    type4: [], type5: [], type6: []
                };
            }

            // Sort palette notes by octave and note index (lowest first)
            const sortedNotes = [...paletteNotes].sort((a, b) => {
                if (a.octave !== b.octave) {
                    return a.octave - b.octave;
                }
                const aIndex = Config.NOTE_TO_INDEX[a.note];
                const bIndex = Config.NOTE_TO_INDEX[b.note];
                return aIndex - bIndex;
            });

            // Helper function to format note as string
            const formatNote = (noteObj) => `${noteObj.note}${noteObj.octave}`;

            // type0: lowest 3 notes
            const type0 = sortedNotes.slice(0, 3).map(formatNote);

            // type1: lowest 4 notes
            const type1 = sortedNotes.slice(0, 4).map(formatNote);

            // type2: 3 lowest + 1 octave lower of 2 highest
            const type2 = [];
            // Add 3 lowest notes
            if (sortedNotes.length > 0) {
                sortedNotes.slice(0, Math.min(3, sortedNotes.length)).forEach(noteObj => {
                    type2.push(formatNote(noteObj));
                });
            }
            // Get 2 highest notes and lower them by 1 octave
            if (sortedNotes.length >= 2) {
                const highest2 = sortedNotes.slice(-2);
                highest2.forEach(noteObj => {
                    const lowered = {
                        note: noteObj.note,
                        octave: noteObj.octave - 1
                    };
                    type2.push(formatNote(lowered));
                });
            }

            // type3: all notes from palette
            const type3 = sortedNotes.map(formatNote);

            // type4: all notes excluding highest and 2 lowest
            const type4 = [];
            if (sortedNotes.length > 2) {
                const highestIndex = sortedNotes.length - 1;
                for (let i = 2; i < sortedNotes.length; i++) {
                    if (i !== highestIndex) {
                        type4.push(formatNote(sortedNotes[i]));
                    }
                }
            }

            // type5: all notes excluding 3 lowest
            const type5 = sortedNotes.slice(3).map(formatNote);

            // type6: all notes excluding 3 lowest + octave high version of 2nd highest
            const type6 = [];
            if (sortedNotes.length > 3) {
                // Add all notes excluding 3 lowest
                sortedNotes.slice(3).forEach(noteObj => {
                    type6.push(formatNote(noteObj));
                });
                
                // Add octave high version of 2nd highest note
                if (sortedNotes.length >= 2) {
                    const secondHighest = sortedNotes[sortedNotes.length - 2];
                    const octaveHigh = {
                        note: secondHighest.note,
                        octave: secondHighest.octave + 1
                    };
                    type6.push(formatNote(octaveHigh));
                }
            }

            return { type0, type1, type2, type3, type4, type5, type6 };
        },

        /**
         * Update the note arrays display
         * @param {string} rootNote - Root note name
         * @param {string} chordType - Chord type
         */
        updateNoteArraysDisplay: function(rootNote, chordType) {
            const displayEl = document.getElementById('noteArraysDisplay');
            if (!displayEl) return;

            const arrays = this.deriveNoteArrays(rootNote, chordType);
            
            displayEl.innerHTML = '';
            
            // Create display for each type
            for (let i = 0; i <= 6; i++) {
                const typeKey = `type${i}`;
                const notes = arrays[typeKey];
                
                const group = document.createElement('div');
                group.className = 'array-group';
                
                const label = document.createElement('div');
                label.className = 'array-label';
                label.textContent = `Type ${i}:`;
                
                const notesContainer = document.createElement('div');
                notesContainer.className = 'array-notes';
                
                if (notes.length === 0) {
                    notesContainer.textContent = '(empty)';
                } else {
                    notes.forEach((note, idx) => {
                        const span = document.createElement('span');
                        span.textContent = note;
                        notesContainer.appendChild(span);
                        if (idx < notes.length - 1) {
                            notesContainer.appendChild(document.createTextNode(', '));
                        }
                    });
                }
                
                group.appendChild(label);
                group.appendChild(notesContainer);
                displayEl.appendChild(group);
            }
        }
    };

    // Export to window
    window.PianoVisualizer = PianoVisualizer;
})();

