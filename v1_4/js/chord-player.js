/**
 * Chord Player
 * Manages playback state and coordinates audio/visual updates
 */

(function() {
    'use strict';

    class ChordPlayer {
        constructor() {
            this.waterSynth = null;
            this.isPlaying = false;
            this.parsedChords = [];
            this.chordTransitions = {};
            this.currentPlayingIndex = -1;
            this.currentTransitionChord = null;
            this.playbackAbortController = null;
            this.jumpToIndex = null; // For jumping to a specific chord during playback
        }

        /**
         * Initialize audio context
         */
        initAudio() {
            if (!this.waterSynth) {
                this.waterSynth = new WaterSynth();
            }
            if (this.waterSynth.audioContext && this.waterSynth.audioContext.state === 'suspended') {
                this.waterSynth.audioContext.resume();
            }
        }

        /**
         * Parse chords from input string
         * @param {string} input - Comma-separated chord string
         * @returns {Array} Parsed chords
         */
        parseChords(input) {
            this.parsedChords = ChordParser.parseChords(input);
            return this.parsedChords;
        }

        /**
         * Play a single chord
         * @param {string} rootNote - Root note name
         * @param {string} chordType - Chord type
         * @param {number} durationSec - Duration in seconds
         */
        playChord(rootNote, chordType, durationSec) {
            // Palette sound feature removed - no audio playback for chord palette
            // Visual indicators (dots) are still shown via PianoVisualizer
        }

        /**
         * Play chords sequentially with transitions
         * @param {Array} chords - Array of chord objects
         * @param {number} bpm - Beats per minute
         * @param {Function} onBeatUpdate - Callback for beat updates (beatIndex)
         * @param {Function} onChordUpdate - Callback for chord updates (chordIndex, chord, frequencies, transitionType)
         * @param {Function} onComplete - Callback when playback completes
         */
        async playChordsSequentially(chords, bpm, onBeatUpdate, onChordUpdate, onComplete) {
            const beatDurationSec = 60 / bpm;
            const beatsPerBar = Config.DEFAULTS.BEATS_PER_BAR;

            if (chords.length === 0) {
                onComplete();
                return;
            }

            this.isPlaying = true;
            this.initAudio();

            // Create abort controller for cancellation
            this.playbackAbortController = new AbortController();

            try {
                // Play chords sequentially
                let i = 0;
                while (i < chords.length) {
                    if (this.playbackAbortController.signal.aborted) break;

                    // Check if a jump was requested
                    if (this.jumpToIndex !== null) {
                        const targetIndex = this.jumpToIndex;
                        this.jumpToIndex = null; // Clear the jump request
                        if (targetIndex >= 0 && targetIndex < chords.length) {
                            i = targetIndex; // Jump directly to target index
                        }
                    }

                    this.currentPlayingIndex = i;
                    const chord = chords[i];
                    const transitionType = this.chordTransitions[i] || 'none';
                    const nextChord = (i < chords.length - 1) ? chords[i + 1] : null;
                    
                    // Calculate timing: if transition exists, main chord gets 2 beats, transition gets 2 beats
                    const hasTransition = transitionType !== 'none' && nextChord;
                    const mainChordBeats = hasTransition ? 2 : beatsPerBar;
                    const mainChordDurationSec = beatDurationSec * mainChordBeats;
                    
                    // Update display - highlight main chord
                    this.currentTransitionChord = null;
                    const mainChordFrequencies = ChordParser.getChordFrequencies(chord.rootNote, chord.chordType);
                    onChordUpdate(i, chord, mainChordFrequencies, 'none');
                    
                    // Play main chord
                    this.playChord(chord.rootNote, chord.chordType, mainChordDurationSec);
                    
                    // Animate beats for main chord
                    for (let beat = 0; beat < mainChordBeats; beat++) {
                        if (this.playbackAbortController.signal.aborted) break;
                        // Check for jump request
                        if (this.jumpToIndex !== null) {
                            i = this.jumpToIndex;
                            this.jumpToIndex = null;
                            break;
                        }
                        onBeatUpdate(beat);
                        await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                    }
                    
                    // Check for jump request after main chord beats
                    if (this.jumpToIndex !== null) {
                        i = this.jumpToIndex;
                        this.jumpToIndex = null;
                        continue;
                    }
                    
                    // Handle transition chord if exists
                    if (hasTransition && !this.playbackAbortController.signal.aborted) {
                        // Check for jump request before transition
                        if (this.jumpToIndex !== null) {
                            i = this.jumpToIndex;
                            this.jumpToIndex = null;
                            continue;
                        }
                        
                        const transitionChord = ChordParser.calculateTransitionChord(transitionType, chord, nextChord);
                        if (transitionChord) {
                            this.currentTransitionChord = transitionChord;
                            
                            // Play transition chord(s)
                            if (Array.isArray(transitionChord)) {
                                // ii-V-I: play two chords, each for 1 beat
                                onBeatUpdate(2);
                                const firstTransitionFreqs = ChordParser.getChordFrequencies(
                                    transitionChord[0].rootNote, 
                                    transitionChord[0].chordType
                                );
                                onChordUpdate(i, transitionChord[0], firstTransitionFreqs, transitionType);
                                this.playChord(transitionChord[0].rootNote, transitionChord[0].chordType, beatDurationSec);
                                await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                                
                                // Check for jump request
                                if (this.jumpToIndex !== null) {
                                    i = this.jumpToIndex;
                                    this.jumpToIndex = null;
                                    continue;
                                }
                                
                                onBeatUpdate(3);
                                const secondTransitionFreqs = ChordParser.getChordFrequencies(
                                    transitionChord[1].rootNote, 
                                    transitionChord[1].chordType
                                );
                                onChordUpdate(i, transitionChord[1], secondTransitionFreqs, transitionType);
                                this.playChord(transitionChord[1].rootNote, transitionChord[1].chordType, beatDurationSec);
                                await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                                
                                // Check for jump request
                                if (this.jumpToIndex !== null) {
                                    i = this.jumpToIndex;
                                    this.jumpToIndex = null;
                                    continue;
                                }
                            } else {
                                // Single transition chord for remaining 2 beats
                                onBeatUpdate(2);
                                const transitionFreqs = ChordParser.getChordFrequencies(
                                    transitionChord.rootNote, 
                                    transitionChord.chordType
                                );
                                onChordUpdate(i, transitionChord, transitionFreqs, transitionType);
                                this.playChord(transitionChord.rootNote, transitionChord.chordType, beatDurationSec * 2);
                                await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                                
                                // Check for jump request
                                if (this.jumpToIndex !== null) {
                                    i = this.jumpToIndex;
                                    this.jumpToIndex = null;
                                    continue;
                                }
                                
                                onBeatUpdate(3);
                                await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                                
                                // Check for jump request
                                if (this.jumpToIndex !== null) {
                                    i = this.jumpToIndex;
                                    this.jumpToIndex = null;
                                    continue;
                                }
                            }
                            
                            this.currentTransitionChord = null;
                        }
                    } else if (!this.playbackAbortController.signal.aborted) {
                        // No transition, animate remaining beats
                        for (let beat = mainChordBeats; beat < beatsPerBar; beat++) {
                            // Check for jump request
                            if (this.jumpToIndex !== null) {
                                i = this.jumpToIndex;
                                this.jumpToIndex = null;
                                break;
                            }
                            onBeatUpdate(beat);
                            await this.sleep(beatDurationSec * 1000, this.playbackAbortController.signal);
                        }
                        
                        // Check for jump request after remaining beats
                        if (this.jumpToIndex !== null) {
                            i = this.jumpToIndex;
                            this.jumpToIndex = null;
                            continue;
                        }
                    }
                    
                    // Reset beat dots
                    onBeatUpdate(-1);
                    
                    // Increment index for next iteration
                    i++;
                }
                
                // Loop if still playing
                if (this.isPlaying && !this.playbackAbortController.signal.aborted) {
                    this.currentPlayingIndex = -1;
                    this.currentTransitionChord = null;
                    onBeatUpdate(-1);
                    // Start again from the beginning
                    this.playChordsSequentially(chords, bpm, onBeatUpdate, onChordUpdate, onComplete);
                    return;
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Playback error:', error);
                }
            } finally {
                // Only reset and call onComplete if playback actually stopped (not looping)
                if (!this.isPlaying || this.playbackAbortController.signal.aborted) {
                    this.currentPlayingIndex = -1;
                    this.currentTransitionChord = null;
                    onBeatUpdate(-1);
                    onComplete();
                    this.isPlaying = false;
                }
            }
        }

        /**
         * Stop playback
         */
        stop() {
            this.isPlaying = false;
            if (this.playbackAbortController) {
                this.playbackAbortController.abort();
            }
        }

        /**
         * Sleep utility with abort support
         * @private
         */
        sleep(ms, signal) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, ms);
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
        }

        /**
         * Set transition for a chord index
         * @param {number} index - Chord index
         * @param {string} transitionType - Transition type
         */
        setTransition(index, transitionType) {
            this.chordTransitions[index] = transitionType;
        }

        /**
         * Get transition for a chord index
         * @param {number} index - Chord index
         * @returns {string} Transition type
         */
        getTransition(index) {
            return this.chordTransitions[index] || 'none';
        }

        /**
         * Jump to a specific chord index during playback
         * @param {number} index - Chord index to jump to
         */
        jumpToChord(index) {
            if (this.isPlaying && index >= 0 && index < this.parsedChords.length) {
                this.jumpToIndex = index;
            }
        }

        /**
         * Load preset
         * @param {Object} preset - Preset object
         */
        loadPreset(preset) {
            this.parsedChords = ChordParser.parseChords(preset.chords.join(', '));
            this.chordTransitions = preset.transitions || {};
            return {
                chords: this.parsedChords,
                transitions: this.chordTransitions,
                bpm: preset.bpm || Config.DEFAULTS.BPM
            };
        }
    }

    // Export to window
    window.ChordPlayer = ChordPlayer;
})();

