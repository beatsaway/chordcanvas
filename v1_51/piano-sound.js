/**
 * Piano Sound Module
 * Allows users to click on piano keys to play chord notes one by one
 */

(function() {
    'use strict';

    let isPlaying = false;
    let currentNotes = [];
    let arpeggioVoices = []; // Track arpeggio notes for simultaneous release
    let onPlayStartCallback = null;
    let onPlayEndCallback = null;

    /**
     * Convert note name (e.g., "C4") to frequency
     * Uses standard 88-key piano tuning: A4 = 440 Hz
     * Formula: frequency = 440 * 2^((midiNote - 69) / 12)
     * For 88-key piano: A0 (MIDI 21) to C8 (MIDI 108)
     */
    function noteToFrequency(noteName) {
        const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
        if (!match) return null;

        const note = match[1];
        const octave = parseInt(match[2]);

        // Standard tuning: A4 = 440 Hz
        const A4_FREQ = 440;
        const A4_OCTAVE = 4;
        const A4_SEMITONE = 9; // A is the 9th semitone (C=0, C#=1, ..., A=9)

        // Get semitone index for the note (0-11)
        const NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        const semitone = NOTE_TO_SEMITONE[note] || 0;
        
        // Calculate semitones from A4
        // Example: C4 = -9 semitones from A4, C5 = +3 semitones from A4
        const semitonesFromA4 = (octave - A4_OCTAVE) * 12 + (semitone - A4_SEMITONE);
        
        // Calculate frequency using equal temperament: f = 440 * 2^(n/12)
        return A4_FREQ * Math.pow(2, semitonesFromA4 / 12);
    }

    /**
     * Sort notes by pitch (lowest to highest)
     */
    function sortNotesByPitch(notes) {
        return notes.slice().sort((a, b) => {
            const freqA = noteToFrequency(a);
            const freqB = noteToFrequency(b);
            if (!freqA || !freqB) return 0;
            return freqA - freqB;
        });
    }

    /**
     * Calculate EQ gain based on human perceived loudness (Fletcher-Munson curves)
     * Returns gain adjustment in dB to make all frequencies sound equally loud
     * @param {number} frequency - Frequency in Hz
     * @returns {number} Gain adjustment in dB
     */
    function getPerceivedLoudnessEQ(frequency) {
        // Based on Fletcher-Munson equal loudness contours (approximated)
        // Reference: 1000 Hz at 0 dB (most sensitive frequency)
        
        if (frequency < 100) {
            // Very low frequencies need significant boost
            // 50Hz needs ~+12dB, 100Hz needs ~+6dB
            return 12 - (frequency / 100) * 6;
        } else if (frequency < 200) {
            // Low frequencies need moderate boost
            // 100Hz: +6dB, 200Hz: +3dB
            return 6 - ((frequency - 100) / 100) * 3;
        } else if (frequency < 1000) {
            // Approaching most sensitive range
            // 200Hz: +3dB, 1000Hz: 0dB
            return 3 - ((frequency - 200) / 800) * 3;
        } else if (frequency < 4000) {
            // Most sensitive range (1000-4000Hz), minimal adjustment
            return 0;
        } else if (frequency < 8000) {
            // High frequencies need slight reduction
            // 4000Hz: 0dB, 8000Hz: -2dB
            return -((frequency - 4000) / 4000) * 2;
        } else {
            // Very high frequencies need more reduction
            // 8000Hz: -2dB, 16000Hz: -4dB
            return -2 - ((frequency - 8000) / 8000) * 2;
        }
    }

    /**
     * Create gain adjustment for perceived loudness compensation
     * @param {number} frequency - Fundamental frequency
     * @returns {Tone.Gain} Gain node with adjusted value
     */
    function createPerceivedLoudnessGain(frequency) {
        const eqGainDB = getPerceivedLoudnessEQ(frequency);
        
        // Convert dB to linear gain: gain = 10^(dB/20)
        const linearGain = Math.pow(10, eqGainDB / 20);
        
        const gain = new Tone.Gain(linearGain);
        return gain;
    }

    /**
     * Play a single note with visual feedback (for chord - with release)
     * Piano-like sound with harmonics and sharp attack
     * @param {number} volumeDB - Volume adjustment in dB (default: 0, negative = quieter)
     */
    function playNote(frequency, duration = 0.3, noteName = null, startTime = null, volumeDB = 0) {
        if (!window.Tone) {
            console.warn('Tone.js not available');
            return;
        }

        const now = startTime !== null ? startTime : Tone.now();
        
        // Create master gain
        const masterGain = new Tone.Gain(0);
        masterGain.toDestination();
        // Base volume: 0.019 (reduced by -12dB from 0.075, which was already -12dB from 0.3)
        // Apply additional volume adjustment: multiply by 10^(volumeDB/20)
        const baseVolume = 0.019;
        const volumeMultiplier = Math.pow(10, volumeDB / 20);
        masterGain.gain.value = baseVolume * volumeMultiplier;

        // Piano-like sound: fundamental + harmonics
        // Fundamental (sine for clean base)
        const osc1 = new Tone.Oscillator({
            type: 'sine',
            frequency: frequency
        });
        
        // Octave harmonic (sawtooth for brightness)
        const osc2 = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency * 2
        });
        
        // Fifth harmonic (triangle for warmth)
        const osc3 = new Tone.Oscillator({
            type: 'triangle',
            frequency: frequency * 3
        });

        // Sharp attack envelope for piano-like punch
        const envelope = new Tone.AmplitudeEnvelope({
            attack: 0.01, // Very quick attack for punch
            decay: 0.1,
            sustain: 0.4,
            release: 0.3
        });

        // Lowpass filter to soften harmonics slightly
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: frequency * 8, // Allow harmonics but roll off very high frequencies
            Q: 1
        });

        // EQ gain for perceived loudness compensation
        const eqGain = createPerceivedLoudnessGain(frequency);

        // Gain controls for each oscillator
        const gain1 = new Tone.Gain(1.0);   // Fundamental - full volume
        const gain2 = new Tone.Gain(0.3);   // Octave - quieter
        const gain3 = new Tone.Gain(0.15);  // Fifth - even quieter

        // Connect: oscillators -> gains -> filter -> EQ gain -> envelope -> master gain
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        filter.connect(eqGain);
        eqGain.connect(envelope);
        envelope.connect(masterGain);

        // Start all oscillators
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        envelope.triggerAttackRelease(duration, now + 0.001);
        
        // Stop oscillators
        osc1.stop(now + duration + 0.5);
        osc2.stop(now + duration + 0.5);
        osc3.stop(now + duration + 0.5);

        // Cleanup after note finishes
        setTimeout(() => {
            try {
                osc1.dispose();
                osc2.dispose();
                osc3.dispose();
                envelope.dispose();
                filter.dispose();
                eqGain.dispose();
                gain1.dispose();
                gain2.dispose();
                gain3.dispose();
                masterGain.dispose();
            } catch (e) {
                // Ignore disposal errors
            }
        }, (duration + 0.5) * 1000);
    }

    /**
     * Clean up voice nodes to save memory
     * @param {Array} voices - Array of voice objects to clean up
     */
    function cleanupVoices(voices) {
        if (!voices || voices.length === 0) return;
        
        voices.forEach(voice => {
            if (!voice) return;
            
            try {
                // Stop oscillators if they're still running
                if (voice.osc1 && voice.osc1.state === 'started') {
                    voice.osc1.stop();
                }
                if (voice.osc2 && voice.osc2.state === 'started') {
                    voice.osc2.stop();
                }
                if (voice.osc3 && voice.osc3.state === 'started') {
                    voice.osc3.stop();
                }
                
                // Trigger release if envelope is still active
                if (voice.envelope && voice.envelope.state !== 'closed') {
                    voice.envelope.triggerRelease();
                }
                
                // Dispose all nodes
                const nodes = [
                    voice.osc1, voice.osc2, voice.osc3,
                    voice.envelope, voice.filter, voice.eqGain,
                    voice.gain1, voice.gain2, voice.gain3,
                    voice.masterGain
                ];
                
                nodes.forEach(node => {
                    if (node) {
                        try {
                            node.dispose();
                        } catch (e) {
                            // Ignore disposal errors
                        }
                    }
                });
                
                // Remove visual highlight
                if (voice.noteName) {
                    const key = document.querySelector(`.piano-key[data-note="${voice.noteName}"]`);
                    if (key) {
                        key.classList.remove('piano-key-playing');
                    }
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    }

    /**
     * Play a note with sustain (for arpeggio - attack and hold, release later)
     * Piano-like sound with harmonics and sharp attack
     */
    function playNoteWithSustain(frequency, noteName, startTime) {
        if (!window.Tone) {
            console.warn('Tone.js not available');
            return null;
        }

        // Ensure startTime is in the future
        const actualStartTime = Math.max(startTime, Tone.now() + 0.001);
        
        // Create master gain
        const masterGain = new Tone.Gain(0);
        masterGain.toDestination();
        masterGain.gain.value = 0.019; // Reduced by -12dB from 0.075 (0.075 * 10^(-12/20) ≈ 0.019)

        // Piano-like sound: fundamental + harmonics
        // Fundamental (sine for clean base)
        const osc1 = new Tone.Oscillator({
            type: 'sine',
            frequency: frequency
        });
        
        // Octave harmonic (sawtooth for brightness)
        const osc2 = new Tone.Oscillator({
            type: 'sawtooth',
            frequency: frequency * 2
        });
        
        // Fifth harmonic (triangle for warmth)
        const osc3 = new Tone.Oscillator({
            type: 'triangle',
            frequency: frequency * 3
        });

        // Sharp attack envelope for piano-like punch
        const envelope = new Tone.AmplitudeEnvelope({
            attack: 0.01, // Very quick attack for punch
            decay: 0.05,
            sustain: 1.0, // Full sustain
            release: 0.4 // Smooth release (will be triggered later)
        });

        // Lowpass filter to soften harmonics slightly
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: frequency * 8,
            Q: 1
        });

        // EQ gain for perceived loudness compensation
        const eqGain = createPerceivedLoudnessGain(frequency);

        // Gain controls for each oscillator
        const gain1 = new Tone.Gain(1.0);   // Fundamental - full volume
        const gain2 = new Tone.Gain(0.3);   // Octave - quieter
        const gain3 = new Tone.Gain(0.15);  // Fifth - even quieter

        // Connect: oscillators -> gains -> filter -> EQ gain -> envelope -> master gain
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        gain1.connect(filter);
        gain2.connect(filter);
        gain3.connect(filter);
        filter.connect(eqGain);
        eqGain.connect(envelope);
        envelope.connect(masterGain);

        // Start all oscillators and trigger attack
        osc1.start(actualStartTime);
        osc2.start(actualStartTime);
        osc3.start(actualStartTime);
        envelope.triggerAttack(actualStartTime + 0.001);

        // Return voice object with release method
        return {
            osc1: osc1,
            osc2: osc2,
            osc3: osc3,
            envelope: envelope,
            filter: filter,
            eqGain: eqGain,
            gain1: gain1,
            gain2: gain2,
            gain3: gain3,
            masterGain: masterGain,
            noteName: noteName,
            release: function(releaseTime) {
                // Trigger release at specified time
                envelope.triggerRelease(releaseTime);
                osc1.stop(releaseTime + 0.5);
                osc2.stop(releaseTime + 0.5);
                osc3.stop(releaseTime + 0.5);
                
                // Remove visual highlight
                const key = document.querySelector(`.piano-key[data-note="${noteName}"]`);
                if (key) {
                    key.classList.remove('piano-key-playing');
                }

                // Cleanup after release finishes
                setTimeout(() => {
                    cleanupVoices([this]);
                }, 500);
            }
        };
    }

    /**
     * Clear all visual indicators
     */
    function clearAllVisualIndicators() {
        document.querySelectorAll('.piano-key-playing').forEach(key => {
            key.classList.remove('piano-key-playing');
        });
    }

    /**
     * Highlight a piano key to show it's playing
     */
    function highlightKey(noteName, duration) {
        const key = document.querySelector(`.piano-key[data-note="${noteName}"]`);
        if (!key) return;

        // Add playing class
        key.classList.add('piano-key-playing');

        // Remove after note duration (if duration is not 999)
        if (duration !== 999) {
            setTimeout(() => {
                key.classList.remove('piano-key-playing');
            }, duration * 1000);
        }
    }

    /**
     * Play all chord notes simultaneously (no arpeggio, immediate playback)
     * @param {Array<string>} notes - Array of note names (e.g., ["C4", "E4", "G4"])
     * @param {number} volumeDB - Volume adjustment in dB (default: 0, negative = quieter)
     * @param {number} duration - Duration in seconds (default: 0.5)
     */
    function playAllNotesAtOnce(notes, volumeDB = 0, duration = 0.5) {
        if (!window.Tone) return;
        
        // Sort notes from lowest to highest
        const sortedNotes = sortNotesByPitch(notes);
        
        // Start Tone.js if needed, but don't wait - play immediately
        const playNotes = () => {
            const now = Tone.now();
            const startTime = now + 0.01; // Small delay to ensure everything is ready
            
            // Play all notes simultaneously
            sortedNotes.forEach((noteName) => {
                const frequency = noteToFrequency(noteName);
                if (frequency) {
                    // Play note with visual feedback
                    highlightKey(noteName, duration);
                    playNote(frequency, duration, noteName, startTime, volumeDB);
                }
            });
        };
        
        // If Tone.js is already running, play immediately
        if (Tone.context.state === 'running') {
            playNotes();
        } else {
            // Start Tone.js and play (this should be fast if user already interacted)
            Tone.start().then(() => {
                playNotes();
            }).catch(err => {
                console.warn('Failed to start Tone.js:', err);
                // Try to play anyway - might work if context is partially initialized
                try {
                    playNotes();
                } catch (e) {
                    console.warn('Could not play notes:', e);
                }
            });
        }
    }

    /**
     * Play chord notes one by one (arpeggio)
     * @param {Array<string>} notes - Array of note names (e.g., ["C4", "E4", "G4"])
     * @param {number} delay - Delay before starting arpeggio in seconds (default: 0)
     * @param {number} interval - Interval between notes in seconds (default: 0.15)
     * @param {number} sustainDuration - How long to sustain each note before release (default: 0.8)
     * @param {Array} voicesArray - Optional array to collect voice objects (for cleanup)
     * @returns {Array} Array of voice objects for cleanup (populated as voices are created)
     */
    function playArpeggio(notes, delay = 0, interval = 0.15, sustainDuration = 0.8, voicesArray = null) {
        if (!window.Tone) return voicesArray || [];
        
        const sortedNotes = sortNotesByPitch(notes);
        const voices = voicesArray || [];
        
        sortedNotes.forEach((noteName, index) => {
            const frequency = noteToFrequency(noteName);
            if (frequency) {
                const noteDelay = (delay * 1000) + (index * interval * 1000);
                setTimeout(() => {
                    const currentTime = Tone.now();
                    // Call visual feedback and audio at the exact same time
                    highlightKey(noteName, 999); // Visual feedback
                    const voice = playNoteWithSustain(frequency, noteName, currentTime);
                    if (voice) {
                        voices.push(voice);
                        
                        // Schedule release for this voice
                        const voiceReleaseTime = currentTime + sustainDuration;
                        setTimeout(() => {
                            if (voice && voice.release) {
                                voice.release(voiceReleaseTime);
                            }
                        }, sustainDuration * 1000);
                    }
                }, Math.max(0, noteDelay));
            }
        });
        
        return voices;
    }

    /**
     * Play all chord notes simultaneously (no arpeggio, immediate playback)
     * @param {Array<string>} notes - Array of note names (e.g., ["C4", "E4", "G4"])
     * @param {number} volumeDB - Volume adjustment in dB (default: 0, negative = quieter)
     */
    function playChordNotesSimultaneously(notes, volumeDB = 0) {
        playAllNotesAtOnce(notes, volumeDB, 0.5);
    }

    /**
     * Play chord notes one by one with 100ms interval
     * @param {Array<string>} notes - Array of note names (e.g., ["C4", "E4", "G4"])
     * @param {number} interval - Interval between notes in milliseconds (default: 100)
     * @param {Object} options - Options object
     * @param {boolean} options.shortPreview - If true, play shorter sound without arpeggio (default: false)
     */
    function playChordNotesSequentially(notes, interval = 100, options = {}) {
        if (isPlaying || !window.Tone) return;
        
        // Ensure Tone.js is started
        if (Tone.context.state !== 'running') {
            Tone.start().then(() => {
                startPlaying(notes, interval, options);
            }).catch(err => {
                console.warn('Failed to start Tone.js:', err);
            });
        } else {
            startPlaying(notes, interval, options);
        }
    }

    function startPlaying(notes, interval, options = {}) {
        isPlaying = true;
        
        // Clean up previous arpeggio voices
        cleanupVoices(arpeggioVoices);
        arpeggioVoices = [];
        
        // Notify callback that playback started
        if (onPlayStartCallback) {
            onPlayStartCallback();
        }
        
        // Clear all visual indicators before starting
        clearAllVisualIndicators();

        // Sort notes from lowest to highest
        const sortedNotes = sortNotesByPitch(notes);
        
        // Log which notes we're playing (the yellow dotted notes)
        console.log('Playing chord notes:', sortedNotes);

        const isShortPreview = options.shortPreview === true;

        // Step 1: Play all notes simultaneously (chord) - shorter so it doesn't overlap arpeggio
        const chordDuration = isShortPreview ? 0.18 : 0.3;
        playAllNotesAtOnce(sortedNotes, 0, chordDuration);

        let totalDuration = chordDuration + 0.2;

        if (!isShortPreview) {
            // Step 2: After chord fades, arpeggiate from lowest to highest (slower, like pressing note by note)
            const arpeggioDelay = 0.4; // Start arpeggio 400ms after chord starts
            const arpeggioInterval = 0.15; // Slower arpeggio - 150ms between notes (like pressing keys)
            const sustainDuration = 0.8; // How long to sustain before release
            
            // Play arpeggio (voices will be added to arpeggioVoices as they're created)
            playArpeggio(sortedNotes, arpeggioDelay, arpeggioInterval, sustainDuration, arpeggioVoices);

            // Reset playing flag after everything finishes
            totalDuration = arpeggioDelay + (sortedNotes.length * arpeggioInterval) + sustainDuration + 0.5;
        }

        setTimeout(() => {
            isPlaying = false;
            cleanupVoices(arpeggioVoices);
            arpeggioVoices = [];
            clearAllVisualIndicators();
            
            // Notify callback that playback ended
            if (onPlayEndCallback) {
                onPlayEndCallback();
            }
        }, totalDuration * 1000);
    }

    /**
     * Initialize piano sound functionality
     * Call this after the piano visualizer is initialized
     */
    function init() {
        // Use event delegation on document to catch clicks on dynamically created piano keys
        document.addEventListener('click', (e) => {
            const pianoKey = e.target.closest('.piano-key');
            if (!pianoKey) return;

            // Find all keys that are part of the current chord (have has-palette class)
            const pianoContainer = pianoKey.closest('.piano-keys') || pianoKey.closest('.piano-wrapper');
            if (!pianoContainer) return;

            const chordKeys = pianoContainer.querySelectorAll('.piano-key.has-palette');
            if (chordKeys.length === 0) return;

            // Extract note names from chord keys
            const notes = Array.from(chordKeys)
                .map(key => key.getAttribute('data-note'))
                .filter(note => note !== null);

            if (notes.length > 0) {
                playChordNotesSequentially(notes, 100);
            }
        });
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export API
    window.PianoSound = {
        init: init,
        playChordNotes: playChordNotesSequentially,
        playChordNotesSimultaneously: playChordNotesSimultaneously,
        playAllNotesAtOnce: playAllNotesAtOnce,
        playArpeggio: playArpeggio,
        playNote: playNote,
        getIsPlaying: () => isPlaying,
        setOnPlayStart: (callback) => { onPlayStartCallback = callback; },
        setOnPlayEnd: (callback) => { onPlayEndCallback = callback; }
    };
})();

