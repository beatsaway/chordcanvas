/**
 * Piano Sound Module
 * Uses Web Audio API with object pooling for efficient, mobile-compatible audio
 * Clean chord playback for both piano visualizer and chord preview items
 */

(function() {
    'use strict';

    let isPlaying = false;
    let currentNotes = [];
    let arpeggioVoices = [];
    let onPlayStartCallback = null;
    let onPlayEndCallback = null;
    
    // Web Audio API synth (initialized on first user interaction)
    let synth = null;
    let audioContextInitialized = false;
    
    // Track active chord notes for cleanup
    let activeChordNotes = new Set();

    /**
     * Convert note name (e.g., "C4") to frequency
     */
    function noteToFrequency(noteName) {
        const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
        if (!match) return null;

        const note = match[1];
        const octave = parseInt(match[2]);

        const A4_FREQ = 440;
        const A4_OCTAVE = 4;
        const A4_SEMITONE = 9;

        const NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        const semitone = NOTE_TO_SEMITONE[note] || 0;
        const semitonesFromA4 = (octave - A4_OCTAVE) * 12 + (semitone - A4_SEMITONE);
        
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
     * Initialize Web Audio API synth (requires user interaction)
     */
    function initializeSynth() {
        if (synth) return synth;
        
        if (!window.PolySynthWrapper) {
            console.warn('PolySynthWrapper not available - make sure audio engine files are loaded');
            return null;
        }
        
        try {
            // Ensure AudioContext is resumed before creating synth
            const audioCtx = getAudioContext();
            if (audioCtx && audioCtx.state === 'suspended') {
                // This should be called from a user gesture handler
                audioCtx.resume().catch(err => {
                    console.warn('Failed to resume audio context before synth init:', err);
                });
            }
            
            synth = new PolySynthWrapper({
                maxPolyphony: 64,
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.5
                }
            });
            
            // Resume audio context if suspended (mobile requirement)
            if (synth.audioCtx && synth.audioCtx.state !== 'running') {
                synth.audioCtx.resume().catch(err => {
                    console.warn('Failed to resume audio context:', err);
                });
            }
            
            audioContextInitialized = true;
            return synth;
        } catch (e) {
            console.error('Failed to initialize synth:', e);
            return null;
        }
    }

    /**
     * Ensure synth is initialized and audio context is running
     * This should be called from a user gesture event handler
     */
    function ensureAudioReady() {
        if (!synth) {
            initializeSynth();
        }
        
        // Resume audio context if suspended (must be in user gesture)
        const audioCtx = getAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => {
                console.warn('Failed to resume audio context:', err);
            });
        }
        
        return synth !== null;
    }

    /**
     * Release all active chord notes cleanly
     */
    function releaseAllActiveChordNotes() {
        if (!synth) return;
        
        // Release all notes in the active set
        activeChordNotes.forEach(noteName => {
            if (synth.releaseAllVoices) {
                synth.releaseAllVoices(noteName);
            } else if (synth.triggerRelease) {
                synth.triggerRelease(noteName);
            }
        });
        
        activeChordNotes.clear();
    }

    /**
     * Get or create audio context (handles user gesture requirement)
     */
    function getAudioContext() {
        // Try to get from synth first
        if (synth && synth.audioCtx) {
            return synth.audioCtx;
        }
        if (synth && synth.synth && synth.synth.audioCtx) {
            return synth.synth.audioCtx;
        }
        
        // Create new audio context if needed
        if (!window._sharedAudioContext) {
            window._sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        return window._sharedAudioContext;
    }

    /**
     * Ensure audio context is running (resume if suspended)
     * This must be called from a user gesture event handler
     */
    function resumeAudioContext() {
        const audioCtx = getAudioContext();
        if (!audioCtx) return Promise.resolve(false);
        
        if (audioCtx.state === 'suspended') {
            return audioCtx.resume().then(() => {
                return true;
            }).catch(err => {
                // Only log if it's not the expected "user gesture required" error
                if (!err.message || !err.message.includes('not allowed to start')) {
                    console.warn('Failed to resume audio context:', err);
                }
                return false;
            });
        }
        
        return Promise.resolve(audioCtx.state === 'running');
    }

    /**
     * Play a bell-like sine wave chord (for chord preview items)
     * Clean, simple sine waves with bell-like envelope
     */
    function playBellChord(notes, duration = 0.6) {
        const audioCtx = getAudioContext();
        if (!audioCtx) {
            console.warn('Audio context not available');
            return;
        }

        // Resume audio context (must be in user gesture handler)
        resumeAudioContext();

        const sortedNotes = sortNotesByPitch(notes);
        const uniqueNotes = [...new Set(sortedNotes)];
        
        if (uniqueNotes.length === 0) return;

        const now = audioCtx.currentTime;
        const startTime = now + 0.01;

        // Create bell-like envelope: fast attack, exponential decay
        const attackTime = 0.01; // Very fast attack
        const decayTime = duration * 0.3; // 30% of duration for decay
        const sustainLevel = 0.3; // Sustain at 30%
        const releaseTime = duration * 0.7; // 70% of duration for release

        uniqueNotes.forEach((noteName) => {
            const frequency = noteToFrequency(noteName);
            if (!frequency) return;

            try {
                // Create sine wave oscillator
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'sine'; // Pure sine wave for bell-like sound
                oscillator.frequency.value = frequency;

                // Create gain node for envelope
                const gainNode = audioCtx.createGain();
                gainNode.gain.setValueAtTime(0, startTime);
                
                // Bell-like envelope: fast attack, exponential decay
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + attackTime); // Quick attack to 15% volume
                gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.15, startTime + attackTime + decayTime); // Decay to sustain
                gainNode.gain.setValueAtTime(sustainLevel * 0.15, startTime + attackTime + decayTime); // Sustain
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayTime + releaseTime); // Release

                // Connect: oscillator -> gain -> destination
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                // Start and stop
                oscillator.start(startTime);
                oscillator.stop(startTime + duration + 0.1);

                // Cleanup after note finishes
                setTimeout(() => {
                    try {
                        oscillator.disconnect();
                        gainNode.disconnect();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }, (duration + 0.2) * 1000);
            } catch (e) {
                console.warn(`Failed to play bell note ${noteName}:`, e);
            }
        });
    }

    /**
     * Play bell chord with arpeggio (for piano visualizer)
     */
    function playBellChordWithArpeggio(notes, duration = 0.6) {
        const audioCtx = getAudioContext();
        if (!audioCtx) {
            console.warn('Audio context not available');
            return;
        }

        // Resume audio context
        resumeAudioContext();

        const sortedNotes = sortNotesByPitch(notes);
        const uniqueNotes = [...new Set(sortedNotes)];
        
        if (uniqueNotes.length === 0) return;

        // Play initial chord
        const chordDuration = 0.4;
        playBellChord(uniqueNotes, chordDuration);

        // Play arpeggio after chord
        if (uniqueNotes.length > 1) {
            const arpeggioDelay = 0.5;
            const arpeggioInterval = 0.12;
            const sustainDuration = 0.6;

            uniqueNotes.forEach((noteName, index) => {
                const noteDelay = arpeggioDelay + (index * arpeggioInterval);
                setTimeout(() => {
                    const audioCtx = getAudioContext();
                    if (!audioCtx) return;
                    
                    resumeAudioContext();
                    
                    const frequency = noteToFrequency(noteName);
                    if (!frequency) return;

                    const currentTime = audioCtx.currentTime;
                    const startTime = currentTime + 0.01;

                    try {
                        const oscillator = audioCtx.createOscillator();
                        oscillator.type = 'sine';
                        oscillator.frequency.value = frequency;

                        const gainNode = audioCtx.createGain();
                        gainNode.gain.setValueAtTime(0, startTime);
                        
                        // Bell envelope for arpeggio notes
                        const attackTime = 0.01;
                        const decayTime = sustainDuration * 0.3;
                        const sustainLevel = 0.25;
                        const releaseTime = sustainDuration * 0.7;
                        
                        gainNode.gain.linearRampToValueAtTime(0.12, startTime + attackTime);
                        gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.12, startTime + attackTime + decayTime);
                        gainNode.gain.setValueAtTime(sustainLevel * 0.12, startTime + attackTime + decayTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayTime + releaseTime);

                        oscillator.connect(gainNode);
                        gainNode.connect(audioCtx.destination);

                        oscillator.start(startTime);
                        oscillator.stop(startTime + sustainDuration + 0.1);

                        // Visual feedback
                        highlightKey(noteName, sustainDuration);

                        // Cleanup
                        setTimeout(() => {
                            try {
                                oscillator.disconnect();
                                gainNode.disconnect();
                                const key = document.querySelector(`.piano-key[data-note="${noteName}"]`);
                                if (key) {
                                    key.classList.remove('piano-key-playing');
                                }
                            } catch (e) {
                                // Ignore cleanup errors
                            }
                        }, (sustainDuration + 0.2) * 1000);
                    } catch (e) {
                        console.warn(`Failed to play arpeggio bell note ${noteName}:`, e);
                    }
                }, noteDelay * 1000);
            });
        }
    }

    /**
     * Play a clean chord - all notes simultaneously with proper timing
     * This is the main function used for piano visualizer (uses additive synth)
     */
    function playCleanChord(notes, duration = 0.5, options = {}) {
        if (!ensureAudioReady() || !synth) {
            console.warn('Audio not ready');
            return;
        }

        const audioCtx = synth.audioCtx || (synth.synth && synth.synth.audioCtx);
        if (!audioCtx) {
            console.warn('Audio context not available');
            return;
        }

        // Release any existing chord notes first to prevent clashes
        releaseAllActiveChordNotes();
        
        // Small delay to ensure releases complete
        const releaseDelay = 0.02; // 20ms
        const now = audioCtx.currentTime;
        const startTime = now + releaseDelay;

        const sortedNotes = sortNotesByPitch(notes);
        const uniqueNotes = [...new Set(sortedNotes)];
        
        if (uniqueNotes.length === 0) return;

        // Convert volumeDB to velocity (0-1)
        const volumeDB = options.volumeDB || 0;
        const volumeMultiplier = Math.pow(10, volumeDB / 20);
        const velocity = Math.max(0.1, Math.min(1, 0.7 * volumeMultiplier));

        // Trigger all notes at exactly the same time
        uniqueNotes.forEach((noteName) => {
            try {
                // Add to active set
                activeChordNotes.add(noteName);
                
                // Trigger attack at the same time for all notes
                synth.triggerAttack(noteName, startTime, velocity);
                
                // Visual feedback
                if (options.showVisual !== false) {
                    highlightKey(noteName, duration);
                }
            } catch (e) {
                console.warn(`Failed to play note ${noteName}:`, e);
            }
        });

        // Schedule release for all notes at the same time
        const releaseTime = startTime + duration;
        const delayMs = Math.max(0, (releaseTime - audioCtx.currentTime) * 1000);
        
        setTimeout(() => {
            uniqueNotes.forEach((noteName) => {
                try {
                    if (synth && synth.triggerRelease) {
                        synth.triggerRelease(noteName);
                    }
                    activeChordNotes.delete(noteName);
                } catch (e) {
                    console.warn(`Failed to release note ${noteName}:`, e);
                }
            });
        }, delayMs);
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

        key.classList.add('piano-key-playing');

        if (duration !== 999 && duration > 0) {
            setTimeout(() => {
                key.classList.remove('piano-key-playing');
            }, duration * 1000);
        }
    }

    /**
     * Play chord notes for piano visualizer (with arpeggio)
     */
    function playChordNotesSequentially(notes, interval = 100, options = {}) {
        if (isPlaying || !ensureAudioReady()) return;
        
        startPlaying(notes, interval, options);
    }

    function startPlaying(notes, interval, options = {}) {
        isPlaying = true;
        
        // Clean up previous voices
        if (arpeggioVoices && arpeggioVoices.length > 0) {
            arpeggioVoices.forEach(voice => {
                if (voice && voice.release) {
                    voice.release();
                }
            });
        }
        arpeggioVoices = [];
        
        if (onPlayStartCallback) {
            onPlayStartCallback();
        }
        
        clearAllVisualIndicators();

        const sortedNotes = sortNotesByPitch(notes);
        const uniqueNotes = [...new Set(sortedNotes)];
        console.log('Playing chord notes:', uniqueNotes);

        const isShortPreview = options.shortPreview === true;
        
        // Play initial chord
        const chordDuration = isShortPreview ? 0.3 : 0.4;
        playCleanChord(uniqueNotes, chordDuration, { volumeDB: 0, showVisual: true });

        let totalDuration = chordDuration + 0.1;

        // Add arpeggio only if not short preview
        if (!isShortPreview && uniqueNotes.length > 1) {
            const arpeggioDelay = 0.5;
            const arpeggioInterval = 0.12;
            const sustainDuration = 0.6;
            
            // Play arpeggio notes one by one
            uniqueNotes.forEach((noteName, index) => {
                const noteDelay = arpeggioDelay + (index * arpeggioInterval);
                setTimeout(() => {
                    if (!ensureAudioReady() || !synth) return;
                    
                    const audioCtx = synth.audioCtx || (synth.synth && synth.synth.audioCtx);
                    if (!audioCtx) return;
                    
                    const currentTime = audioCtx.currentTime;
                    const velocity = 0.6; // Slightly quieter for arpeggio
                    
                    try {
                        synth.triggerAttack(noteName, currentTime, velocity);
                        activeChordNotes.add(noteName);
                        highlightKey(noteName, 999);
                        
                        // Schedule release
                        setTimeout(() => {
                            if (synth && synth.triggerRelease) {
                                synth.triggerRelease(noteName);
                            }
                            activeChordNotes.delete(noteName);
                            const key = document.querySelector(`.piano-key[data-note="${noteName}"]`);
                            if (key) {
                                key.classList.remove('piano-key-playing');
                            }
                        }, sustainDuration * 1000);
                    } catch (e) {
                        console.warn(`Failed to play arpeggio note ${noteName}:`, e);
                    }
                }, noteDelay * 1000);
            });

            totalDuration = arpeggioDelay + (uniqueNotes.length * arpeggioInterval) + sustainDuration + 0.2;
        }

        setTimeout(() => {
            isPlaying = false;
            releaseAllActiveChordNotes();
            clearAllVisualIndicators();
            
            if (onPlayEndCallback) {
                onPlayEndCallback();
            }
        }, totalDuration * 1000);
    }

    /**
     * Play all chord notes simultaneously (simple, clean)
     */
    function playAllNotesAtOnce(notes, volumeDB = 0, duration = 0.5) {
        const uniqueNotes = [...new Set(notes)];
        playCleanChord(uniqueNotes, duration, { volumeDB: volumeDB, showVisual: true });
    }

    /**
     * Play chord notes simultaneously (API compatibility)
     */
    function playChordNotesSimultaneously(notes, volumeDB = 0) {
        playAllNotesAtOnce(notes, volumeDB, 0.5);
    }

    /**
     * Initialize piano sound functionality
     */
    function init() {
        document.addEventListener('click', (e) => {
            // Resume audio context on every click (user gesture)
            resumeAudioContext();
            
            const pianoKey = e.target.closest('.piano-key');
            if (!pianoKey) return;

            const pianoContainer = pianoKey.closest('.piano-keys') || pianoKey.closest('.piano-wrapper');
            if (!pianoContainer) return;

            const chordKeys = pianoContainer.querySelectorAll('.piano-key.has-palette');
            if (chordKeys.length === 0) return;

            const notes = Array.from(chordKeys)
                .map(key => key.getAttribute('data-note'))
                .filter(note => note !== null);

            if (notes.length > 0) {
                // Play bell chord with arpeggio (full experience for piano visualizer)
                playBellChordWithArpeggio(notes, 0.6);
            }
        });
    }

    /**
     * Initialize audio on first user interaction (mobile-friendly)
     * Also resume audio context on every interaction to prevent suspension
     */
    let audioInitInProgress = false;
    function initializeAudioOnInteraction() {
        // Always try to resume audio context on user interaction
        resumeAudioContext();
        
        // Only initialize synth once
        if (!audioContextInitialized && !audioInitInProgress) {
            audioInitInProgress = true;
            try {
                initializeSynth();
                audioContextInitialized = true;
            } catch (e) {
                console.error('Failed to initialize audio:', e);
            } finally {
                audioInitInProgress = false;
            }
        }
    }
    
    // Resume audio context on every user interaction (prevents suspension)
    // Modern web audio best practice: resume on every gesture
    // Use { once: false, passive: true } to allow multiple calls
    document.addEventListener('click', initializeAudioOnInteraction, { passive: true });
    document.addEventListener('touchstart', initializeAudioOnInteraction, { passive: true });
    document.addEventListener('keydown', initializeAudioOnInteraction, { passive: true });

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
        playCleanChord: playCleanChord, // For additive synth (if needed)
        playBellChord: playBellChord, // For chord preview (sine wave bell, no arpeggio)
        playBellChordWithArpeggio: playBellChordWithArpeggio, // For piano visualizer (sine wave bell with arpeggio)
        resumeAudioContext: resumeAudioContext, // Expose for manual resume
        getIsPlaying: () => isPlaying,
        setOnPlayStart: (callback) => { onPlayStartCallback = callback; },
        setOnPlayEnd: (callback) => { onPlayEndCallback = callback; }
    };
})();
