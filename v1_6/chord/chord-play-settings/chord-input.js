/**
 * Chord Input Module
 * Handles chord input via text field, displays chords on 3D piano, and plays them
 */

(function() {
    'use strict';

    // Humanisation functionality is provided by the humanisation module

    // Current chord state
    let currentChord = null; // { rootNote: string, chordType: string, notes: Array<{note: string, octave: number}> }
    let chordSequence = []; // Array of parsed chord objects
    let highlightedKeys = new Set(); // Track highlighted MIDI notes
    
    // Playback state
    let isPlaying = false;
    let currentChordIndex = 0;
    let nextChordIndex = 1;
    let cycleInterval = null;
    let bassInterval = null;
    let highInterval = null;
    let currentBPM = 120;
    
    // Track currently playing notes separately for bass and high
    let activeBassNotes = new Set(); // MIDI note numbers currently playing as bass
    let activeHighNotes = new Set(); // MIDI note numbers currently playing as high
    let bassNoteReleaseTimers = new Map(); // Map of MIDI note -> setTimeout ID for bass notes
    let highNoteReleaseTimers = new Map(); // Map of MIDI note -> setTimeout ID for high notes

    /**
     * Convert chord intervals to note names with octaves
     * @param {string} rootNote - Root note name (e.g., 'C', 'C#')
     * @param {string} chordType - Chord type (e.g., 'major-triad')
     * @param {number} baseOctave - Base octave to start from (default: 4 for C4)
     * @returns {Array} Array of {note: string, octave: number} objects
     */
    function getChordNotesFromIntervals(rootNote, chordType, baseOctave = 4) {
        if (!window.CHORD_INTERVALS || !window.NOTE_TO_INDEX) {
            console.warn('Chord intervals config not loaded');
            return [];
        }

        const rootIndex = window.NOTE_TO_INDEX[rootNote];
        if (rootIndex === undefined) {
            console.warn('Invalid root note:', rootNote);
            return [];
        }

        const intervals = window.CHORD_INTERVALS[chordType];
        if (!intervals) {
            console.warn('Invalid chord type:', chordType);
            return [];
        }

        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const notesWithOctaves = [];

        // Convert intervals to note names with octaves
        intervals.forEach((interval) => {
            const totalSemitones = rootIndex + interval;
            // Handle negative modulo correctly: -5 % 12 = -5, but we want 7
            let noteIndex = totalSemitones % 12;
            if (noteIndex < 0) {
                noteIndex += 12;
            }
            const noteName = noteNames[noteIndex];

            // Calculate octave: start from base octave, add octave for each 12 semitones
            // For negative intervals, Math.floor correctly handles: -24/12 = -2, -5/12 = -1
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
            const aIndex = window.NOTE_TO_INDEX[a.note];
            const bIndex = window.NOTE_TO_INDEX[b.note];
            return aIndex - bIndex;
        });

        return notesWithOctaves;
    }

    /**
     * Convert note name with octave to MIDI note number
     * @param {string} noteName - Note name (e.g., 'C', 'C#')
     * @param {number} octave - Octave number
     * @returns {number|null} MIDI note number or null if invalid
     */
    function noteNameToMidiNote(noteName, octave) {
        if (!window.NOTE_TO_INDEX) return null;
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteIndex = window.NOTE_TO_INDEX[noteName];
        if (noteIndex === undefined) return null;
        
        return (octave + 1) * 12 + noteIndex;
    }

    /**
     * Parse chord input string (improved version matching anotherproject)
     * Supports formats: "C", "Cm", "C7", "Dm7", "Am", "Gmaj7", etc.
     * @param {string} input - Chord input string
     * @returns {Object|null} { rootNote: string, chordType: string, original: string } or null if invalid
     */
    function parseChord(input) {
        if (!input || typeof input !== 'string') return null;
        
        const trimmed = input.trim();
        if (!trimmed) return null;
        
        const match = trimmed.match(/^([A-Ga-g])([#b]?)(.*)$/i);
        if (!match) return null;
        
        const rootLetter = match[1].toUpperCase();
        const accidental = match[2] || '';
        const suffix = match[3]; // Keep case-sensitive for M vs m distinction
        const noteName = rootLetter + accidental;
        
        if (!window.NOTE_TO_INDEX || !window.NOTE_TO_INDEX.hasOwnProperty(noteName)) return null;
        
        let chordType = 'major-triad';
        let processedSuffix = suffix;
        
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            processedSuffix = suffix.substring(0, slashIndex);
        }
        
        // Check uppercase M patterns first (before lowercase m patterns)
        const suffixLower = processedSuffix.toLowerCase();
        
        if (processedSuffix === 'M7' || processedSuffix === 'maj7' || processedSuffix === 'major7' || suffixLower === 'ma7') {
            chordType = 'major-7th';
        } else if (processedSuffix === 'M9' || processedSuffix === 'maj9' || processedSuffix === 'major9') {
            chordType = 'major-9th';
        } else if (processedSuffix === 'M11' || processedSuffix === 'maj11' || processedSuffix === 'major11') {
            chordType = 'major-11th';
        } else if (suffixLower === 'm' || suffixLower === 'min' || processedSuffix === '-') {
            chordType = 'minor-triad';
        } else if (suffixLower === '7' || suffixLower === 'dom' || suffixLower === 'dom7') {
            chordType = 'dominant-7th';
        } else if (suffixLower === 'm7' || suffixLower === 'min7') {
            chordType = 'minor-7th';
        } else if (suffixLower.includes('dim') || processedSuffix.includes('°')) {
            // Check for diminished 7th first (dim7 or °7)
            if (suffixLower.includes('7') || processedSuffix.includes('°7') || processedSuffix === '°7') {
                chordType = 'diminished-7th';
            } else {
                chordType = 'diminished-triad';
            }
        } else if (suffixLower.includes('aug') || processedSuffix === '+') {
            chordType = 'augmented-triad';
        } else if (suffixLower === 'm9' || suffixLower === 'min9' || processedSuffix === '-9') {
            chordType = 'minor-9th';
        } else if (processedSuffix === '9') {
            chordType = 'dominant-9th';
        } else if (suffixLower === 'm11' || suffixLower === 'min11' || processedSuffix === '-11') {
            chordType = 'minor-11th';
        } else if (processedSuffix === '11') {
            chordType = 'dominant-11th'; // Standard notation: no prefix = dominant
        } else if (processedSuffix === '6') {
            chordType = 'major-6th';
        } else if (suffixLower === 'm6' || suffixLower === 'min6' || processedSuffix === '-6') {
            chordType = 'minor-6th';
        } else if (suffixLower.includes('add9')) {
            chordType = 'add9';
        } else if (suffixLower.includes('add11')) {
            chordType = 'add11';
        } else if (suffixLower.includes('add13')) {
            chordType = 'add13';
        } else if (suffixLower.includes('7#11') || suffixLower.includes('7(#11)') || suffixLower.includes('7+11')) {
            chordType = '7sharp11';
        } else if (suffixLower.includes('9#11') || suffixLower.includes('9(#11)') || suffixLower.includes('9+11')) {
            chordType = '9sharp11';
        } else if (suffixLower.includes('sus2') || suffixLower === 'sus2') {
            chordType = 'sus2';
        } else if (suffixLower.includes('sus4') || suffixLower === 'sus' || suffixLower === 'sus4') {
            chordType = 'sus4';
        }
        
        return { rootNote: noteName, chordType, original: trimmed };
    }

    /**
     * Parse chord input string (alias for parseChord for backward compatibility)
     */
    function parseChordInput(input) {
        return parseChord(input);
    }

    /**
     * Parse comma-separated chord sequence
     * @param {string} input - Comma-separated chord string (e.g., "Am, D7, G, C")
     * @returns {Array} Array of chord objects
     */
    function parseChordSequence(input) {
        if (!input || typeof input !== 'string') return [];
        return input.split(',').map(s => s.trim()).filter(s => s)
            .map(str => parseChord(str)).filter(c => c !== null);
    }

    /**
     * Get formatted chord display name from rootNote and chordType
     * @param {string} rootNote - Root note name (e.g., 'C', 'C#')
     * @param {string} chordType - Chord type (e.g., 'major-triad')
     * @returns {string} Formatted chord name (e.g., 'C', 'Cm', 'C7', 'Cmaj7')
     */
    function getChordDisplayName(rootNote, chordType) {
        // Map chord types to display names
        const chordTypeNames = {
            'major-triad': '',
            'minor-triad': 'm',
            'diminished-triad': 'dim',
            'augmented-triad': 'aug',
            'dominant-7th': '7',
            'minor-7th': 'm7',
            'major-7th': 'maj7',
            'diminished-7th': 'dim7',
            'major-6th': '6',
            'minor-6th': 'm6',
            'dominant-9th': '9',
            'major-9th': 'maj9',
            'minor-9th': 'm9',
            'dominant-11th': '11',
            'minor-11th': 'm11',
            'major-11th': 'maj11',
            'add9': 'add9',
            'add11': 'add11',
            'add13': 'add13',
            '7sharp11': '7#11',
            '9sharp11': '9#11',
            'sus2': 'sus2',
            'sus4': 'sus4'
        };
        
        const suffix = chordTypeNames[chordType] || '';
        return suffix ? `${rootNote}${suffix}` : rootNote;
    }

    /**
     * Highlight chord notes on the 3D piano
     * @param {Array} notes - Array of {note: string, octave: number} objects
     */
    function highlightChordNotes(notes) {
        // Clear previous highlights
        clearChordHighlights();

        if (!window.pressKey || !window.releaseKey) {
            console.warn('Key press/release functions not available');
            return;
        }

        // Highlight each note using pressKey (visual only, doesn't play sound)
        notes.forEach(noteObj => {
            const midiNote = noteNameToMidiNote(noteObj.note, noteObj.octave);
            if (midiNote !== null) {
                highlightedKeys.add(midiNote);
                // Use pressKey to highlight (with medium velocity for visual only)
                // This will show the key as pressed/highlighted on the 3D piano
                if (window.pressKey) {
                    window.pressKey(midiNote, 64); // Medium velocity for visual
                }
            }
        });
    }

    /**
     * Clear all chord highlights
     */
    function clearChordHighlights() {
        highlightedKeys.forEach(midiNote => {
            if (window.releaseKey) {
                window.releaseKey(midiNote);
            }
        });
        highlightedKeys.clear();
    }

    /**
     * Calculate velocity multiplier based on volume mod pattern and cycle position
     * @param {string} volumeMod - Volume mod pattern name (none, uphill, downhill, valley, hill, 2hill, 4hill)
     * @param {number} cyclePosition - Current position in cycle (0.0 to 1.0, where 0 = start, 1.0 = end)
     * @returns {number} Velocity multiplier (0.0 to 1.0, will be scaled to MIDI velocity range)
     */
    function calculateVolumeModMultiplier(volumeMod, cyclePosition) {
        if (!volumeMod || volumeMod === 'none') {
            return 1.0; // No modulation
        }
        
        switch(volumeMod) {
            case 'uphill':
                // Velocity increases linearly from 0.5 to 1.0 over the cycle
                return 0.5 + (cyclePosition * 0.5);
                
            case 'downhill':
                // Velocity decreases linearly from 1.0 to 0.5 over the cycle
                return 1.0 - (cyclePosition * 0.5);
                
            case 'valley':
                // Velocity decreases to mid (0.5), then increases to end (1.0)
                if (cyclePosition <= 0.5) {
                    // First half: decrease from 1.0 to 0.5
                    return 1.0 - (cyclePosition * 2 * 0.5);
                } else {
                    // Second half: increase from 0.5 to 1.0
                    return 0.5 + ((cyclePosition - 0.5) * 2 * 0.5);
                }
                
            case 'hill':
                // Velocity increases to mid (1.0), then decreases to end (0.5)
                if (cyclePosition <= 0.5) {
                    // First half: increase from 0.5 to 1.0
                    return 0.5 + (cyclePosition * 2 * 0.5);
                } else {
                    // Second half: decrease from 1.0 to 0.5
                    return 1.0 - ((cyclePosition - 0.5) * 2 * 0.5);
                }
                
            case '2hill':
                // Two hills in one cycle: increase, decrease, increase, decrease
                const phase = (cyclePosition * 4) % 2; // 0-2 repeating
                if (phase <= 1) {
                    // First hill: increase from 0.5 to 1.0
                    return 0.5 + (phase * 0.5);
                } else {
                    // First valley: decrease from 1.0 to 0.5
                    return 1.0 - ((phase - 1) * 0.5);
                }
                
            case '4hill':
                // Four hills in one cycle
                const phase4 = (cyclePosition * 8) % 2; // 0-2 repeating 4 times
                if (phase4 <= 1) {
                    // Hill: increase from 0.5 to 1.0
                    return 0.5 + (phase4 * 0.5);
                } else {
                    // Valley: decrease from 1.0 to 0.5
                    return 1.0 - ((phase4 - 1) * 0.5);
                }
                
            default:
                return 1.0;
        }
    }
    
    /**
     * Play chord notes (for bass or high notes separately)
     * @param {Array} notes - Array of {note: string, octave: number} objects
     * @param {number} duration - Duration in seconds to hold notes before releasing
     * @param {string} noteType - 'bass' or 'high' to track which type of notes these are
     */
    function playChordNotes(notes, duration = 1.5, noteType = 'bass') {
        if (!window.handleNoteOn) {
            console.warn('handleNoteOn function not available');
            return;
        }

        const activeNotesSet = noteType === 'bass' ? activeBassNotes : activeHighNotes;
        const releaseTimersMap = noteType === 'bass' ? bassNoteReleaseTimers : highNoteReleaseTimers;
        const otherActiveNotesSet = noteType === 'bass' ? activeHighNotes : activeBassNotes;

        // Convert notes to MIDI numbers
        const midiNotes = [];
        notes.forEach(noteObj => {
            const midiNote = noteNameToMidiNote(noteObj.note, noteObj.octave);
            if (midiNote !== null) {
                midiNotes.push(midiNote);
            }
        });

        // Only release notes of the same type that are being replayed
        // Don't release notes from the other type (bass vs high)
        midiNotes.forEach(midiNote => {
            // If this note is already playing as the same type, cancel its release timer and release it now
            if (activeNotesSet.has(midiNote)) {
                const existingTimer = releaseTimersMap.get(midiNote);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    releaseTimersMap.delete(midiNote);
                }
                // Release the note now so it can be replayed
                if (window.releaseKey) {
                    window.releaseKey(midiNote);
                }
                if (window.handleNoteOff) {
                    window.handleNoteOff(midiNote);
                }
                activeNotesSet.delete(midiNote);
            }
            // Don't touch notes that are playing as the other type
        });

        // Get volume mod selection and calculate velocity multiplier
        const volumeModSelection = window.getVolumeModSelection ? window.getVolumeModSelection() : { rowVolumeMod: 'none', colVolumeMod: 'none' };
        const volumeMod = noteType === 'bass' ? (volumeModSelection.rowVolumeMod || 'none') : (volumeModSelection.colVolumeMod || 'none');
        
        // Calculate cycle position for volume modulation
        const currentTime = performance.now();
        if (!window.volumeModCycleStartTime) {
            window.volumeModCycleStartTime = currentTime;
        }
        
        // Update cycle duration based on BPM (240/bpm gives full note duration)
        const currentBPM = window.getCurrentBPM ? window.getCurrentBPM() : 120;
        const volumeModCycleDuration = 240 / currentBPM; // Full note duration in seconds
        
        const elapsed = (currentTime - window.volumeModCycleStartTime) / 1000; // Convert to seconds
        const cyclePosition = (elapsed % volumeModCycleDuration) / volumeModCycleDuration; // 0.0 to 1.0
        
        // Calculate velocity multiplier based on volume mod pattern
        const velocityMultiplier = calculateVolumeModMultiplier(volumeMod, cyclePosition);
        
        // Get min and max velocity from settings
        const minVelocity = window.getVolumeModMinVelocity ? window.getVolumeModMinVelocity() : 30;
        const maxVelocity = window.getVolumeModMaxVelocity ? window.getVolumeModMaxVelocity() : 127;
        
        // Apply multiplier to scale between min and max velocity
        // multiplier is 0.0 to 1.0, so: min + (max - min) * multiplier
        const velocity = Math.round(minVelocity + (maxVelocity - minVelocity) * velocityMultiplier);
        
        // Small delay to ensure previous notes of the same type are released
        setTimeout(() => {
            // Play notes with humanisation delays if enabled
            midiNotes.forEach((midiNote, index) => {
                // Calculate humanisation delay using the humanisation module
                const humanisationDelay = window.calculateHumanisationDelay ? window.calculateHumanisationDelay(duration) : 0;
                
                // Play note after humanisation delay
                setTimeout(() => {
                    // Press key visually first
                    if (window.pressKey) {
                        window.pressKey(midiNote, velocity);
                    }
                    // Then trigger audio
                    window.handleNoteOn(midiNote, velocity);
                    
                    // Track this note as active
                    activeNotesSet.add(midiNote);
                    
                    // Schedule note release after duration
                    if (window.handleNoteOff) {
                        const releaseTimer = setTimeout(() => {
                            // Release key visually
                            if (window.releaseKey) {
                                window.releaseKey(midiNote);
                            }
                            // Then release audio
                            window.handleNoteOff(midiNote);
                            
                            // Remove from tracking
                            activeNotesSet.delete(midiNote);
                            releaseTimersMap.delete(midiNote);
                        }, duration * 1000);
                        
                        // Store the timer so we can cancel it if needed
                        releaseTimersMap.set(midiNote, releaseTimer);
                    }
                }, humanisationDelay * 1000); // Convert seconds to milliseconds
            });
        }, 50);
    }

    /**
     * Play chord sound when user clicks on a chord preview item
     * @param {Object} chord - Chord object with rootNote and chordType
     * @param {HTMLElement} itemElement - The clicked element
     */
    function playChordSound(chord, itemElement) {
        if (!chord) return;
        
        // Add playing class for visual feedback
        if (itemElement) {
            itemElement.classList.add('playing');
        }
        
        // Get notes for this chord
        const notes = getChordNotesFromIntervals(chord.rootNote, chord.chordType, 4);
        if (notes.length === 0) return;
        
        // Play the chord notes
        playChordNotes(notes);
        
        // Remove playing class after a short delay
        if (itemElement) {
            setTimeout(() => {
                itemElement.classList.remove('playing');
            }, 500);
        }
    }

    /**
     * Update chord preview visual state (which chord is currently playing)
     */
    function updateChordPreviewVisualState() {
        const preview = document.getElementById('chord-preview');
        if (!preview) return;
        
        const items = preview.querySelectorAll('.chord-preview-item');
        items.forEach((item, index) => {
            if (index >= chordSequence.length) return;
            
            // Remove all playing classes
            item.classList.remove('playing', 'current-playing');
            
            // Add playing class if this is the current chord and we're playing
            if (isPlaying && index === currentChordIndex) {
                item.classList.add('current-playing');
            } else if (isPlaying && index === nextChordIndex) {
                // Show next chord with subtle indication (optional - can remove if not needed)
                // item.style.opacity = '0.8';
            }
        });
    }

    /**
     * Update chord preview display with clickable items
     */
    function updateChordPreview() {
        const preview = document.getElementById('chord-preview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        if (chordSequence.length === 0) {
            preview.innerHTML = '<span style="color: rgba(255, 255, 255, 0.5);">No chords entered</span>';
            return;
        }
        
        chordSequence.forEach((chord, index) => {
            const item = document.createElement('div');
            item.className = 'chord-preview-item';
            item.textContent = getChordDisplayName(chord.rootNote, chord.chordType);
            
            // Add click handler
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                // If loop is playing, clicking sets it as next chord to play
                if (isPlaying) {
                    nextChordIndex = index;
                    updateChordPreviewVisualState();
                } else {
                    // Otherwise, play the chord immediately (one-shot)
                    playChordSound(chord, item);
                }
            });
            
            preview.appendChild(item);
        });
        
        // Update visual state after creating items
        updateChordPreviewVisualState();
    }

    /**
     * Process chord input and update display
     * Supports both single chords and comma-separated sequences
     * @param {string} input - Chord input string (single chord or comma-separated sequence)
     */
    function processChordInput(input) {
        if (!input || typeof input !== 'string') {
            chordSequence = [];
            currentChord = null;
            clearChordHighlights();
            updateChordPreview();
            return;
        }
        
        const trimmed = input.trim();
        if (!trimmed) {
            chordSequence = [];
            currentChord = null;
            clearChordHighlights();
            updateChordPreview();
            return;
        }
        
        // Check if input contains commas (chord sequence)
        if (trimmed.includes(',')) {
            // Parse as sequence
            const newSequence = parseChordSequence(trimmed);
            
            // If sequence is empty or invalid, stop playback
            if (newSequence.length === 0) {
                chordSequence = [];
                currentChord = null;
                clearChordHighlights();
                if (isPlaying) {
                    stopPlaying();
                }
                updateChordPreview();
                return;
            }
            
            // Update sequence
            chordSequence = newSequence;
            
            // If playing, adapt to new sequence without stopping
            if (isPlaying) {
                // Ensure current indices are valid for new sequence
                if (currentChordIndex >= chordSequence.length) {
                    currentChordIndex = 0;
                }
                if (nextChordIndex >= chordSequence.length) {
                    nextChordIndex = chordSequence.length > 1 ? 1 : 0;
                }
                // Update current chord from the sequence
                const currentChordObj = chordSequence[currentChordIndex];
                if (currentChordObj) {
                    const notes = getChordNotesFromIntervals(currentChordObj.rootNote, currentChordObj.chordType, 4);
                    currentChord = {
                        rootNote: currentChordObj.rootNote,
                        chordType: currentChordObj.chordType,
                        notes: notes
                    };
                }
            } else {
                // Not playing - set first chord as current
                const firstChord = chordSequence[0];
                const notes = getChordNotesFromIntervals(firstChord.rootNote, firstChord.chordType, 4);
                currentChord = {
                    rootNote: firstChord.rootNote,
                    chordType: firstChord.chordType,
                    notes: notes
                };
                currentChordIndex = 0;
                nextChordIndex = chordSequence.length > 1 ? 1 : 0;
            }
            
            // Update preview
            updateChordPreview();
        } else {
            // Parse as single chord
            const parsed = parseChord(trimmed);
            if (!parsed) {
                console.warn('Invalid chord input:', trimmed);
                chordSequence = [];
                currentChord = null;
                clearChordHighlights();
                if (isPlaying) {
                    stopPlaying();
                }
                updateChordPreview();
                return;
            }

            const notes = getChordNotesFromIntervals(parsed.rootNote, parsed.chordType, 4);
            if (notes.length === 0) {
                console.warn('No notes found for chord:', parsed);
                chordSequence = [];
                currentChord = null;
                clearChordHighlights();
                if (isPlaying) {
                    stopPlaying();
                }
                updateChordPreview();
                return;
            }

            // Set as single chord in sequence
            const newSequence = [parsed];
            chordSequence = newSequence;
            
            // If playing, adapt to new sequence without stopping
            if (isPlaying) {
                // Update current chord
                currentChord = {
                    rootNote: parsed.rootNote,
                    chordType: parsed.chordType,
                    notes: notes
                };
                // Reset indices for single chord
                currentChordIndex = 0;
                nextChordIndex = 0; // Will loop back to same chord
            } else {
                // Not playing - set as current
                currentChord = {
                    rootNote: parsed.rootNote,
                    chordType: parsed.chordType,
                    notes: notes
                };
                currentChordIndex = 0;
                nextChordIndex = 0;
            }
            
            // Update preview
            updateChordPreview();
        }
    }

    /**
     * Start playing chord sequence loop
     */
    function startPlaying() {
        if (chordSequence.length === 0) {
            console.warn('No chord sequence to play');
            return;
        }
        
        if (isPlaying) {
            stopPlaying();
            return;
        }
        
        isPlaying = true;
        currentChordIndex = 0;
        nextChordIndex = chordSequence.length > 1 ? 1 : 0;
        
        // Reset volume mod cycle when starting
        window.volumeModCycleStartTime = performance.now();
        
        // Update button state
        const playBtn = document.getElementById('play-chord-btn');
        if (playBtn) {
            playBtn.textContent = '⏹ Stop';
            playBtn.classList.add('playing');
        }
        
        // Apply any pending rhythm changes
        if (window.applyPendingRhythm) {
            window.applyPendingRhythm();
        }
        
        // Get rhythm durations from grid
        const rhythms = window.getRhythmDurations ? window.getRhythmDurations() : { bass: 240, high: 30 };
        const bassDuration = rhythms.bass || 240;
        const highDuration = rhythms.high || 30;
        
        // Calculate cycle duration (240/bpm in seconds, convert to milliseconds)
        const cycleDurationMs = (240 / currentBPM) * 1000;
        
        // Calculate bass and high cycle durations
        const bassCycleMs = (bassDuration / currentBPM) * 1000;
        const highCycleMs = (highDuration / currentBPM) * 1000;
        
        // Clear any existing intervals
        if (cycleInterval) {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }
        if (bassInterval) {
            clearInterval(bassInterval);
            bassInterval = null;
        }
        if (highInterval) {
            clearInterval(highInterval);
            highInterval = null;
        }
        
        // Play first chord immediately (both bass and high)
        playCurrentChordInSequence();
        
        // Set up callback for rhythm changes
        window.onRhythmChanged = function(newBassDuration, newHighDuration) {
            if (!isPlaying) return;
            
            const newBassCycleMs = (newBassDuration / currentBPM) * 1000;
            const newHighCycleMs = (newHighDuration / currentBPM) * 1000;
            
            // Clear existing intervals
            if (bassInterval) {
                clearInterval(bassInterval);
                bassInterval = null;
            }
            if (highInterval) {
                clearInterval(highInterval);
                highInterval = null;
            }
            
            // Restart intervals with new timings
            bassInterval = setInterval(() => {
                if (!isPlaying) return;
                playBassNotes();
            }, newBassCycleMs);
            
            highInterval = setInterval(() => {
                if (!isPlaying) return;
                playHighNotes();
            }, newHighCycleMs);
        };
        
        // Set up cycle interval for chord changes
        cycleInterval = setInterval(() => {
            if (!isPlaying) return;
            
            // Safety check: if sequence is empty, stop playing
            if (chordSequence.length === 0) {
                stopPlaying();
                return;
            }
            
            // Ensure indices are valid (in case sequence changed)
            if (currentChordIndex >= chordSequence.length) {
                currentChordIndex = 0;
            }
            if (nextChordIndex >= chordSequence.length) {
                nextChordIndex = chordSequence.length > 1 ? 1 : 0;
            }
            
            // Apply any pending rhythm changes (this will trigger onRhythmChanged if rhythms changed)
            if (window.applyPendingRhythm) {
                window.applyPendingRhythm();
            }
            
            // Apply any pending arpeggio changes
            if (window.applyPendingArpeggio) {
                window.applyPendingArpeggio();
            }
            
            // Apply any pending volume mod changes
            if (window.applyPendingVolumeMod) {
                window.applyPendingVolumeMod();
            }
            if (window.applyPendingAnimal) {
                window.applyPendingAnimal();
            }
            
            // Advance to next chord
            currentChordIndex = nextChordIndex;
            nextChordIndex = (nextChordIndex + 1) % chordSequence.length;
            
            // Immediately play the new chord (both bass and high notes)
            // This ensures the earliest notes of the next cycle are played
            playBassNotes();
            playHighNotes();
            
            // Update visual state
            updateChordPreviewVisualState();
        }, cycleDurationMs);
        
        // Set up bass note interval (plays at row rhythm)
        bassInterval = setInterval(() => {
            if (!isPlaying) return;
            playBassNotes();
        }, bassCycleMs);
        
        // Set up high note interval (plays at column rhythm)
        highInterval = setInterval(() => {
            if (!isPlaying) return;
            playHighNotes();
        }, highCycleMs);
        
        // Update visual state
        updateChordPreviewVisualState();
    }
    
    /**
     * Stop playing chord sequence loop
     */
    function stopPlaying() {
        isPlaying = false;
        
        // Clear intervals
        if (cycleInterval) {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }
        if (bassInterval) {
            clearInterval(bassInterval);
            bassInterval = null;
        }
        if (highInterval) {
            clearInterval(highInterval);
            highInterval = null;
        }
        
        // Clear all release timers
        bassNoteReleaseTimers.forEach((timer) => clearTimeout(timer));
        highNoteReleaseTimers.forEach((timer) => clearTimeout(timer));
        bassNoteReleaseTimers.clear();
        highNoteReleaseTimers.clear();
        
        // Release all bass and high notes
        activeBassNotes.forEach(midiNote => {
            if (window.releaseKey) {
                window.releaseKey(midiNote);
            }
            if (window.handleNoteOff) {
                window.handleNoteOff(midiNote);
            }
        });
        activeHighNotes.forEach(midiNote => {
            if (window.releaseKey) {
                window.releaseKey(midiNote);
            }
            if (window.handleNoteOff) {
                window.handleNoteOff(midiNote);
            }
        });
        activeBassNotes.clear();
        activeHighNotes.clear();
        
        // Also call releaseAllNotes as a safety measure
        if (window.releaseAllNotes) {
            window.releaseAllNotes();
        }
        
        // Release all visual keys
        clearChordHighlights();
        
        // Update button state
        const playBtn = document.getElementById('play-chord-btn');
        if (playBtn) {
            playBtn.textContent = '▶ Play';
            playBtn.classList.remove('playing');
        }
        
        // Update visual state (removes playing indicators)
        updateChordPreviewVisualState();
    }
    
    
    /**
     * Get bass and high notes from current chord
     */
    function getBassAndHighNotes() {
        if (chordSequence.length === 0 || currentChordIndex >= chordSequence.length) {
            return { bass: [], high: [] };
        }
        
        const chord = chordSequence[currentChordIndex];
        if (!chord) return { bass: [], high: [] };
        
        const notes = getChordNotesFromIntervals(chord.rootNote, chord.chordType, 4);
        if (notes.length === 0) return { bass: [], high: [] };
        
        // Split notes: lowest 3 notes = bass, rest = high
        // Notes are already sorted by octave and note index (lowest first)
        const bassNotes = notes.slice(0, Math.min(3, notes.length));
        const highNotes = notes.slice(3);
        
        return { bass: bassNotes, high: highNotes };
    }
    
    // Arpeggio behavior state (shared with index.html via window)
    if (!window.arpeggioBehaviorState) {
        window.arpeggioBehaviorState = {
            bassUphillSkipIndex: 0,
            highUphillSkipIndex: 0,
            bassUphillIndex: 0,
            highUphillIndex: 0,
            bassDownhillIndex: 0,
            highDownhillIndex: 0
        };
    }
    
    /**
     * Apply arpeggio behavior to notes array
     * @param {Array} notes - Array of note objects
     * @param {string} arpeggio - Arpeggio name (none, -uphill, uphill, downhill, -Any, Any2, Any)
     * @param {string} noteType - 'bass' or 'high'
     * @returns {Array} Filtered/modified notes array
     */
    function applyArpeggioBehavior(notes, arpeggio, noteType) {
        if (!notes || notes.length === 0) return notes;
        
        const state = window.arpeggioBehaviorState;
        const stateKey = noteType === 'bass' ? 'bass' : 'high';
        
        switch(arpeggio) {
            case 'none':
                // Do nothing - play all notes normally
                return notes;
                
            case '-uphill':
                // Skip notes sequentially in ascending order
                const skipIndex = stateKey === 'bass' ? state.bassUphillSkipIndex : state.highUphillSkipIndex;
                const filtered = notes.filter((_, index) => index !== skipIndex);
                // Update skip index for next time
                if (stateKey === 'bass') {
                    state.bassUphillSkipIndex = (state.bassUphillSkipIndex + 1) % notes.length;
                } else {
                    state.highUphillSkipIndex = (state.highUphillSkipIndex + 1) % notes.length;
                }
                return filtered;
                
            case 'uphill':
                // Play only one note at a time, ascending
                const uphillIndex = stateKey === 'bass' ? state.bassUphillIndex : state.highUphillIndex;
                const uphillNote = notes[uphillIndex];
                // Update index for next time
                if (stateKey === 'bass') {
                    state.bassUphillIndex = (state.bassUphillIndex + 1) % notes.length;
                } else {
                    state.highUphillIndex = (state.highUphillIndex + 1) % notes.length;
                }
                return uphillNote ? [uphillNote] : [];
                
            case 'downhill':
                // Play only one note at a time, descending
                const downhillIndex = stateKey === 'bass' ? state.bassDownhillIndex : state.highDownhillIndex;
                const reverseIndex = notes.length - 1 - downhillIndex;
                const downhillNote = notes[reverseIndex];
                // Update index for next time
                if (stateKey === 'bass') {
                    state.bassDownhillIndex = (state.bassDownhillIndex + 1) % notes.length;
                } else {
                    state.highDownhillIndex = (state.highDownhillIndex + 1) % notes.length;
                }
                return downhillNote ? [downhillNote] : [];
                
            case '-Any':
                // Skip one note randomly
                const randomSkip = Math.floor(Math.random() * notes.length);
                let anyNotes = notes.filter((_, index) => index !== randomSkip);
                
                // For high notes: 21.4% chance to shift an octave higher
                if (noteType === 'high' && Math.random() < 0.214 && anyNotes.length > 0) {
                    anyNotes = anyNotes.map(note => ({
                        note: note.note,
                        octave: note.octave + 1
                    }));
                }
                return anyNotes;
                
            case 'Any2':
                // Play 2 random notes
                if (notes.length <= 2) return notes;
                const shuffled = [...notes].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, 2);
                
            case 'Any':
                // Play 1 random note
                const randomIndex = Math.floor(Math.random() * notes.length);
                let anyNote = [notes[randomIndex]];
                
                // For high notes: 21.4% chance to shift an octave higher
                if (noteType === 'high' && Math.random() < 0.214 && anyNote.length > 0) {
                    anyNote = anyNote.map(note => ({
                        note: note.note,
                        octave: note.octave + 1
                    }));
                }
                return anyNote;
                
            default:
                return notes;
        }
    }
    
    /**
     * Play bass notes (at row rhythm)
     * 
     * Note Duration Calculation:
     * - Header value = durationMultiplier / BPM (e.g., 240/120 = 2.00s)
     * - Note duration = header value * 0.786
     * - This means each note plays for 78.6% of the cycle duration
     */
    function playBassNotes() {
        const { bass } = getBassAndHighNotes();
        if (bass.length === 0) {
            return;
        }
        
        // Get arpeggio selection
        const arpeggioSelection = window.getArpeggioSelection ? window.getArpeggioSelection() : { rowArpeggio: 'none' };
        const rowArpeggio = arpeggioSelection.rowArpeggio || 'none';
        
        // Apply arpeggio behavior
        const processedBass = applyArpeggioBehavior(bass, rowArpeggio, 'bass');
        if (processedBass.length === 0) {
            return;
        }
        
        const rhythms = window.getRhythmDurations ? window.getRhythmDurations() : { bass: 240, high: 30 };
        const bassDuration = rhythms.bass || 240;
        // Header value = bassDuration / currentBPM (in seconds)
        // Note duration = header value * 0.786
        const headerValue = bassDuration / currentBPM;
        const noteDuration = headerValue * 0.786;
        
        playChordNotes(processedBass, noteDuration, 'bass');
    }
    
    /**
     * Play high notes (at column rhythm)
     * 
     * Note Duration Calculation:
     * - Header value = durationMultiplier / BPM (e.g., 30/120 = 0.25s)
     * - Note duration = header value * 0.786
     * - This means each note plays for 78.6% of the cycle duration
     */
    function playHighNotes() {
        const { high } = getBassAndHighNotes();
        if (high.length === 0) {
            return;
        }
        
        // Get arpeggio selection
        const arpeggioSelection = window.getArpeggioSelection ? window.getArpeggioSelection() : { colArpeggio: 'none' };
        const colArpeggio = arpeggioSelection.colArpeggio || 'none';
        
        // Apply arpeggio behavior
        const processedHigh = applyArpeggioBehavior(high, colArpeggio, 'high');
        if (processedHigh.length === 0) {
            return;
        }
        
        const rhythms = window.getRhythmDurations ? window.getRhythmDurations() : { bass: 240, high: 30 };
        const highDuration = rhythms.high || 30;
        // Header value = highDuration / currentBPM (in seconds)
        // Note duration = header value * 0.786
        const headerValue = highDuration / currentBPM;
        const noteDuration = headerValue * 0.786;
        
        playChordNotes(processedHigh, noteDuration, 'high');
    }
    
    /**
     * Play the current chord in the sequence (for initial play)
     */
    function playCurrentChordInSequence() {
        const { bass, high } = getBassAndHighNotes();
        if (bass.length === 0 && high.length === 0) return;
        
        // Play both bass and high notes initially
        if (bass.length > 0) {
            playBassNotes();
        }
        if (high.length > 0) {
            playHighNotes();
        }
    }

    /**
     * Initialize chord input module
     */
    function init() {
        // Make functions available globally
        window.parseChord = parseChord;
        window.parseChordSequence = parseChordSequence;
        window.getChordDisplayName = getChordDisplayName;
        window.processChordInput = processChordInput;
        window.playCurrentChord = function() {
            if (currentChord && currentChord.notes) {
                playChordNotes(currentChord.notes);
            }
        };
        window.clearChordHighlights = clearChordHighlights;
        window.getCurrentChord = function() {
            return currentChord;
        };
        window.getChordSequence = function() {
            return chordSequence;
        };
        window.updateChordPreview = updateChordPreview;
        window.startPlaying = startPlaying;
        window.stopPlaying = function() {
            stopPlaying();
            // Reset volume mod cycle when stopping
            window.volumeModCycleStartTime = null;
        };
        window.getIsPlaying = function() {
            return isPlaying;
        };
        window.getCurrentBPM = function() {
            return currentBPM;
        };
        window.setBPM = function(bpm) {
            if (isFinite(bpm) && bpm > 0 && bpm <= 240) {
                currentBPM = bpm;
                // If playing, restart with new BPM
                if (isPlaying) {
                    stopPlaying();
                    startPlaying();
                }
            }
        };
        window.updateRhythmGrid = function() {
            // This will be called when BPM changes to update grid headers
            if (window.updateGridHeaders) {
                window.updateGridHeaders();
            }
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
