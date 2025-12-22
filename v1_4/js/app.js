/**
 * Main Application
 * Coordinates all modules and handles application lifecycle
 */

(function() {
    'use strict';

    const App = {
        player: null,
        ui: null,

        /**
         * Initialize the application
         */
        init: function() {
            try {
                // Initialize CPU manager for performance monitoring
                if (window.CPUManager) {
                    window.CPUManager.startMonitoring();
                    // Set quality change callback (no logging for production)
                    window.CPUManager.setQualityChangeCallback(() => {
                        // Quality changes handled silently
                    });
                }
                
                // Initialize player
                this.player = new ChordPlayer();

                // Initialize UI
                UIController.init();
                this.ui = UIController;

                // Initialize piano visualizer
                PianoVisualizer.init('pianoContainer');

                // Initialize preset dropdown
                const presets = ChordPresets.getAll();
                this.ui.initializePresetDropdown(presets);

                // Setup event handlers
                this.setupEventHandlers();

                // Randomly load a preset on page load
                if (presets.length > 0) {
                    const randomPreset = ChordPresets.getRandom();
                    this.onPresetSelect(randomPreset.name);
                } else {
                    // Parse and display initial chords if no presets available
                    this.onChordInputChange();
                }

                // App initialized successfully
            } catch (error) {
                console.error('Failed to initialize app:', error);
                this.showError('Failed to initialize application. Please refresh the page.');
            }
        },

        /**
         * Setup event handlers
         */
        setupEventHandlers: function() {
            // Play/Stop button - support both click and touch for mobile
            const handlePlayStopClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handlePlayStop();
            };
            this.ui.elements.playStopButton.addEventListener('click', handlePlayStopClick);
            this.ui.elements.playStopButton.addEventListener('touchstart', handlePlayStopClick, { passive: false });

            // Random button - support both click and touch for mobile
            const handleRandomClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleRandom();
            };
            this.ui.elements.randomButton.addEventListener('click', handleRandomClick);
            this.ui.elements.randomButton.addEventListener('touchstart', handleRandomClick, { passive: false });
        },

        /**
         * Handle play/stop button click
         */
        handlePlayStop: function() {
            if (this.player.isPlaying) {
                // Stop playback
                this.player.stop();
                this.ui.updatePlayButton(false);
                this.ui.updateBeatDots(-1);
                this.ui.toggleChordInput(true); // Show chord input when stopped
                PianoVisualizer.clearPalette();
            } else {
                // Resume AudioContext on user interaction (required for mobile)
                this.resumeAudioContext().then(() => {
                    // Start playback
                    const input = this.ui.getChordInput();
                    const chords = this.player.parseChords(input);
                    
                    if (chords.length === 0) {
                        this.showError('Please enter at least one valid chord.');
                        return;
                    }

                    this.ui.displayParsedChords(chords);
                    const bpm = this.ui.getBPM();

                    // Clear any chord preview timeout when starting playback
                    if (this.ui.chordPreviewTimeout) {
                        clearTimeout(this.ui.chordPreviewTimeout);
                        this.ui.chordPreviewTimeout = null;
                    }

                    // Hide chord input when playing
                    this.ui.toggleChordInput(false);

                    // Start playback with callbacks
                    this.player.playChordsSequentially(
                        chords,
                        bpm,
                        (beatIndex) => this.ui.updateBeatDots(beatIndex),
                        (chordIndex, chord, frequencies, transitionType) => {
                            PianoVisualizer.updateChordPaletteFromChord(chord.rootNote, chord.chordType, transitionType);
                            PianoVisualizer.updateNoteArraysDisplay(chord.rootNote, chord.chordType);
                            this.ui.displayParsedChords(this.player.parsedChords, chordIndex);
                        },
                        () => {
                            this.ui.updatePlayButton(false);
                            this.ui.updateBeatDots(-1);
                            this.ui.toggleChordInput(true); // Show chord input when playback ends
                            PianoVisualizer.clearPalette();
                        }
                    );

                    this.ui.updatePlayButton(true);
                }).catch(error => {
                    console.error('Failed to resume audio context:', error);
                    this.showError('Failed to start audio. Please try again.');
                });
            }
        },

        /**
         * Resume AudioContext (required for mobile browsers)
         */
        resumeAudioContext: function() {
            const promises = [];
            
            // Resume AudioManager's context (main audio context)
            if (window.AudioManager) {
                // Initialize if not already initialized
                if (!window.AudioManager.getContext()) {
                    window.AudioManager.initialize();
                }
                
                const audioContext = window.AudioManager.getContext();
                if (audioContext && audioContext.state === 'suspended') {
                    promises.push(audioContext.resume());
                }
            }
            
            // If no promises, return resolved promise
            if (promises.length === 0) {
                return Promise.resolve();
            }
            
            return Promise.all(promises);
        },

        /**
         * Handle random button click
         */
        handleRandom: function() {
            const presets = ChordPresets.getAll();
            if (presets.length > 0) {
                const randomPreset = ChordPresets.getRandom();
                const presetName = randomPreset.name;
                this.ui.elements.presetSelect.value = presetName;
                this.onPresetSelect(presetName);
            }
        },

        /**
         * Handle chord input change
         */
        onChordInputChange: function() {
            const input = this.ui.getChordInput();
            const chords = this.player.parseChords(input);
            this.ui.displayParsedChords(chords);
            
            // Update note arrays display for first chord if available
            if (chords.length > 0) {
                const firstChord = chords[0];
                PianoVisualizer.updateNoteArraysDisplay(firstChord.rootNote, firstChord.chordType);
            } else {
                // Clear display if no chords
                const displayEl = document.getElementById('noteArraysDisplay');
                if (displayEl) {
                    displayEl.innerHTML = '';
                }
            }
        },

        /**
         * Handle preset selection
         */
        onPresetSelect: function(presetName) {
            const preset = ChordPresets.getByName(presetName);
            if (preset) {
                // Set dropdown value to show selected preset
                if (this.ui.elements.presetSelect) {
                    this.ui.elements.presetSelect.value = presetName;
                }
                
                const presetData = this.player.loadPreset(preset);
                this.ui.setChordInput(preset.chords.join(', '));
                this.ui.setBPM(presetData.bpm);
                this.ui.displayParsedChords(presetData.chords);
                
                // Update note arrays display for first chord if available
                if (presetData.chords.length > 0) {
                    const firstChord = presetData.chords[0];
                    PianoVisualizer.updateNoteArraysDisplay(firstChord.rootNote, firstChord.chordType);
                }
            }
        },

        /**
         * Show error message to user
         */
        showError: function(message) {
            // Simple error display - could be enhanced with a toast notification
            alert(message);
        }
    };

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // Export to window for global access
    window.app = App;
})();

