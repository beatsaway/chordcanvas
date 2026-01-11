/**
 * PolySynth Wrapper - Provides Tone.js-like API using Web Audio API
 * Allows gradual migration from Tone.js to Web Audio API
 */

class PolySynthWrapper {
    constructor(options = {}) {
        // Create AudioContext
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create additive synth engine
        this.synth = new AdditiveSynth(this.audioCtx);
        
        // Store options
        this.maxPolyphony = options.maxPolyphony || 64;
        this.envelopeDefaults = options.envelope || {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5
        };
        
        // Track active notes - use array to handle multiple voices of same note
        this.activeVoices = new Map(); // noteName -> [{noteId, midiNote, gainNode, keyDown, pedalDown}, ...]
        this.noteIdCounter = 0;
        
        // Per-note envelope settings
        this.noteEnvelopes = new Map(); // noteName -> envelope settings
        
        // Track sustain pedal state
        this.sustainPedalActive = false;
    }
    
    /**
     * Trigger note attack (compatible with Tone.js API)
     */
    triggerAttack(noteName, time, velocity = 0.7) {
        // Convert note name to frequency
        const frequency = this.noteNameToFrequency(noteName);
        
        // Convert velocity (0-1) to MIDI velocity (0-127)
        const midiVelocity = Math.round(velocity * 127);
        
        // Generate unique note ID
        const noteId = this.noteIdCounter++;
        
        // Get envelope settings for this note (or use defaults)
        const envelope = this.noteEnvelopes.get(noteName) || this.envelopeDefaults;
        
        // Get current sustain pedal state
        const pedalDown = this.sustainPedalActive || 
            (typeof window !== 'undefined' && window.sustainPedalActive) || false;
        
        // Trigger note on additive synth with state (async, but don't block)
        // noteOn is async but we don't await it to avoid blocking
        this.synth.noteOn(noteId, frequency, midiVelocity, true, pedalDown).then(gainNode => {
            // Store voice info - use array to handle multiple voices of same note
            if (!this.activeVoices.has(noteName)) {
                this.activeVoices.set(noteName, []);
            }
            this.activeVoices.get(noteName).push({
                noteId: noteId,
                frequency: frequency,
                velocity: midiVelocity,
                gainNode: gainNode,
                keyDown: true,
                pedalDown: pedalDown
            });
        }).catch(err => {
            console.warn(`Failed to trigger attack for ${noteName}:`, err);
        });
        
        // Apply envelope settings
        this.noteEnvelopes.set(noteName, envelope);
    }
    
    /**
     * Update sustain pedal state for all active notes
     */
    setSustainPedal(pedalDown) {
        this.sustainPedalActive = pedalDown;
        
        for (const [noteName, voices] of this.activeVoices) {
            voices.forEach(voice => {
                this.synth.updateNoteState(voice.noteId, voice.keyDown, pedalDown);
                voice.pedalDown = pedalDown;
            });
        }
    }
    
    /**
     * Update note key state (when key is released but note may be sustained)
     */
    updateNoteKeyState(noteName, keyDown) {
        const voices = this.activeVoices.get(noteName);
        if (!voices) return;
        
        voices.forEach(voice => {
            voice.keyDown = keyDown;
            this.synth.updateNoteState(voice.noteId, keyDown, voice.pedalDown);
        });
    }
    
    /**
     * Trigger note release (compatible with Tone.js API)
     */
    triggerRelease(noteName, time) {
        const voices = this.activeVoices.get(noteName);
        if (!voices || voices.length === 0) return;
        
        const pedalDown = this.sustainPedalActive || 
            (typeof window !== 'undefined' && window.sustainPedalActive) || false;
        
        if (pedalDown) {
            const voice = voices[voices.length - 1];
            if (voice) {
                voice.keyDown = false;
                this.synth.updateNoteState(voice.noteId, false, pedalDown);
            }
            return;
        }
        
        const envelope = this.noteEnvelopes.get(noteName) || this.envelopeDefaults;
        const releaseTime = envelope.release || 0.5;
        
        const voice = voices.pop();
        this.synth.noteOff(voice.noteId, releaseTime);
        
        if (voices.length === 0) {
            this.activeVoices.delete(noteName);
            this.noteEnvelopes.delete(noteName);
        }
    }
    
    /**
     * Release all voices for a note
     */
    releaseAllVoices(noteName) {
        const voices = this.activeVoices.get(noteName);
        if (!voices || voices.length === 0) return;
        
        const envelope = this.noteEnvelopes.get(noteName) || this.envelopeDefaults;
        const releaseTime = envelope.release || 0.5;
        
        voices.forEach(voice => {
            this.synth.noteOff(voice.noteId, releaseTime, true);
        });
        
        this.activeVoices.delete(noteName);
        this.noteEnvelopes.delete(noteName);
    }
    
    /**
     * Set envelope parameters
     */
    set(options) {
        if (options.envelope) {
            Object.assign(this.envelopeDefaults, options.envelope);
        }
    }
    
    /**
     * Set envelope for a specific note
     */
    setNoteEnvelope(noteName, envelope) {
        this.noteEnvelopes.set(noteName, envelope);
    }
    
    /**
     * Convert note name (e.g., "C4") to frequency
     */
    noteNameToFrequency(noteName) {
        const A4 = 440;
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        const match = noteName.match(/^([A-G]#?)(\d+)$/);
        if (!match) return A4;
        
        const note = match[1];
        const octave = parseInt(match[2]);
        const noteIndex = noteNames.indexOf(note);
        
        if (noteIndex === -1) return A4;
        
        const semitones = (octave - 4) * 12 + (noteIndex - 9);
        
        return A4 * Math.pow(2, semitones / 12);
    }
    
    /**
     * Connect to destination (compatible with Tone.js API)
     */
    toDestination() {
        return this;
    }
    
    /**
     * Connect to another node
     */
    connect(destination, outputNum, inputNum) {
        this.synth.masterGain.disconnect();
        
        if (destination && destination.input) {
            this.synth.masterGain.connect(destination.input);
        } else if (destination) {
            this.synth.masterGain.connect(destination);
        }
        
        return this;
    }
    
    /**
     * Disconnect
     */
    disconnect(destination) {
        this.synth.masterGain.disconnect();
        return this;
    }
    
    /**
     * Get per-note gain node
     */
    getNoteGainNode(noteName) {
        const voices = this.activeVoices.get(noteName);
        if (!voices || voices.length === 0) return null;
        return voices[voices.length - 1].gainNode;
    }
    
    /**
     * Set per-note volume
     */
    setNoteVolume(noteName, volume) {
        const voices = this.activeVoices.get(noteName);
        if (voices && voices.length > 0) {
            voices.forEach(voice => {
                this.synth.setNoteVolume(voice.noteId, volume);
            });
        }
    }
    
    /**
     * Ramp per-note volume
     */
    rampNoteVolume(noteName, targetVolume, duration) {
        const voices = this.activeVoices.get(noteName);
        if (voices && voices.length > 0) {
            voices.forEach(voice => {
                this.synth.rampNoteVolume(voice.noteId, targetVolume, duration);
            });
        }
    }
    
    /**
     * Get active note count
     */
    getActiveNoteCount() {
        return this.activeVoices.size;
    }
    
    /**
     * Release all notes
     */
    releaseAll() {
        const noteNames = Array.from(this.activeVoices.keys());
        noteNames.forEach(noteName => {
            const voices = this.activeVoices.get(noteName);
            if (voices) {
                const envelope = this.noteEnvelopes.get(noteName) || this.envelopeDefaults;
                const releaseTime = envelope.release || 0.5;
                voices.forEach(voice => {
                    this.synth.noteOff(voice.noteId, releaseTime);
                });
            }
        });
        this.activeVoices.clear();
        this.noteEnvelopes.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PolySynthWrapper = PolySynthWrapper;
}
