/**
 * UI Controller
 * Handles all DOM manipulation and user interactions
 */

(function() {
    'use strict';

    const UIController = {
        // Cached DOM elements
        elements: {},
        
        // Timeout for temporary chord palette preview
        chordPreviewTimeout: null,

        // Initialize UI and cache DOM elements
        init: function() {
            this.cacheElements();
            this.setupEventListeners();
            if (this.elements.bpmValue && this.elements.bpmInput) {
                this.elements.bpmValue.textContent = this.elements.bpmInput.value;
            }
            
            // Initialize master volume display
            if (this.elements.masterVolumeValue && this.elements.masterVolumeInput) {
                this.elements.masterVolumeValue.textContent = this.elements.masterVolumeInput.value;
            }
            
            // Test panel is always enabled now
        },

        /**
         * Cache frequently accessed DOM elements
         */
        cacheElements: function() {
            this.elements = {
                chordInput: document.getElementById('chordInput'),
                playStopButton: document.getElementById('playStopButton'),
                randomButton: document.getElementById('randomButton'),
                bpmInput: document.getElementById('bpmInput'),
                bpmValue: document.getElementById('bpmValue'),
                playbackModeSelect: document.getElementById('playbackModeSelect'),
                masterVolumeInput: document.getElementById('masterVolumeInput'),
                masterVolumeValue: document.getElementById('masterVolumeValue'),
                presetSelect: document.getElementById('presetSelect'),
                chordsDisplay: document.getElementById('chordsDisplay'),
                disableMultibandCheckbox: document.getElementById('disableMultibandCheckbox'),
                disableAutogainCheckbox: document.getElementById('disableAutogainCheckbox'),
                performanceModeCheckbox: document.getElementById('performanceModeCheckbox'),
                beatDots: [
                    document.getElementById('beatDot0'),
                    document.getElementById('beatDot1'),
                    document.getElementById('beatDot2'),
                    document.getElementById('beatDot3')
                ],
                helpButton: document.getElementById('helpButton'),
                helpOverlay: document.getElementById('helpOverlay'),
                helpClose: document.getElementById('helpClose'),
                menuButton: document.getElementById('menuButton'),
                settingsOverlay: document.getElementById('settingsOverlay'),
                settingsClose: document.getElementById('settingsClose'),
                settingsNavItems: document.querySelectorAll('.settings-nav-item')
            };
        },

        /**
         * Add mobile-friendly event listener (click + touchstart)
         * @param {HTMLElement} element - Element to attach listener to
         * @param {Function} handler - Event handler function
         */
        addMobileListener: function(element, handler) {
            if (!element) return;
            const wrappedHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handler(e);
            };
            element.addEventListener('click', wrappedHandler);
            element.addEventListener('touchstart', wrappedHandler, { passive: false });
        },

        /**
         * Setup event listeners
         */
        setupEventListeners: function() {
            // Debounce input for better performance
            let inputTimeout;
            this.elements.chordInput.addEventListener('input', () => {
                clearTimeout(inputTimeout);
                inputTimeout = setTimeout(() => {
                    // Parse and display chords immediately (no need to wait for app)
                    const input = this.elements.chordInput.value;
                    if (window.app && window.app.player) {
                        const chords = window.app.player.parseChords(input);
                        this.displayParsedChords(chords);
                        
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
                    }
                }, 300);
            });

            this.elements.bpmInput.addEventListener('input', () => {
                if (this.elements.bpmValue) {
                    this.elements.bpmValue.textContent = this.elements.bpmInput.value;
                }
            });
            
            // Master volume input
            if (this.elements.masterVolumeInput && this.elements.masterVolumeValue) {
                this.elements.masterVolumeInput.addEventListener('input', (e) => {
                    const volumePercent = parseInt(e.target.value);
                    this.elements.masterVolumeValue.textContent = volumePercent;
                    
                    // Convert 0-100 to 0-2.0 range for AudioManager
                    const volume = (volumePercent / 100) * 2.0;
                    
                    // Set master volume
                    if (window.AudioManager) {
                        window.AudioManager.setVolume(volume);
                    }
                });
            }

            // Performance settings handlers
            this.setupPerformanceSettings();

            // Help overlay
            this.addMobileListener(this.elements.helpButton, () => {
                this.elements.helpOverlay.style.display = 'flex';
            });

            this.addMobileListener(this.elements.helpClose, () => {
                this.elements.helpOverlay.style.display = 'none';
            });

            const handleHelpOverlayClick = (e) => {
                if (e.target.id === 'helpOverlay') {
                    this.elements.helpOverlay.style.display = 'none';
                }
            };
            this.elements.helpOverlay.addEventListener('click', handleHelpOverlayClick);
            this.elements.helpOverlay.addEventListener('touchstart', handleHelpOverlayClick, { passive: true });
            
            // Help nav tabs
            const helpNavItems = document.querySelectorAll('.help-nav-item');
            helpNavItems.forEach(item => {
                this.addMobileListener(item, () => {
                    const tabName = item.getAttribute('data-tab');
                    this.switchHelpTab(tabName);
                });
            });

            // Settings menu
            this.addMobileListener(this.elements.menuButton, () => {
                this.elements.settingsOverlay.style.display = 'flex';
            });

            this.addMobileListener(this.elements.settingsClose, () => {
                this.elements.settingsOverlay.style.display = 'none';
            });

            const handleSettingsOverlayClick = (e) => {
                if (e.target.id === 'settingsOverlay') {
                    this.elements.settingsOverlay.style.display = 'none';
                }
            };
            this.elements.settingsOverlay.addEventListener('click', handleSettingsOverlayClick);
            this.elements.settingsOverlay.addEventListener('touchstart', handleSettingsOverlayClick, { passive: true });

            // Settings nav items
            this.elements.settingsNavItems.forEach(item => {
                this.addMobileListener(item, () => {
                    const section = item.getAttribute('data-section');
                    this.switchSettingsSection(section);
                });
            });
        },


        /**
         * Update beat dots
         * @param {number} beatIndex - Active beat index (-1 to clear all)
         */
        updateBeatDots: function(beatIndex) {
            this.elements.beatDots.forEach((dot, i) => {
                if (dot) {
                    dot.classList.toggle('active', i === beatIndex);
                }
            });
        },

        /**
         * Display parsed chords with clickable spans
         * @param {Array} chords - Array of chord objects
         * @param {number} highlightIndex - Index to highlight (-1 for none)
         */
        displayParsedChords: function(chords, highlightIndex = -1) {
            const displayEl = this.elements.chordsDisplay;
            if (chords.length === 0) {
                displayEl.style.display = 'none';
                return;
            }
            
            displayEl.innerHTML = '';
            chords.forEach((chord, index) => {
                const suffix = this.getChordSuffix(chord.chordType);
                const label = chord.rootNote + suffix;
                const span = document.createElement('span');
                span.textContent = label;
                
                // Build class list
                let classes = [];
                if (index === highlightIndex) {
                    classes.push('playing');
                }
                const transition = (window.app && window.app.player) 
                    ? window.app.player.getTransition(index) 
                    : 'none';
                classes.push(Config.TRANSITION_COLORS[transition]);
                span.className = classes.join(' ');
                
                // Add click handler for transition selection or chord jump
                span.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.app && window.app.player) {
                        // If playing, jump to that chord; otherwise show transition menu
                        if (window.app.player.isPlaying) {
                            window.app.player.jumpToChord(index);
                        } else {
                            this.showTransitionMenu(e.target, index);
                        }
                    }
                });
                
                // Show chord preview on hover when not playing (for learning)
                span.addEventListener('mouseenter', (e) => {
                    if (window.app && window.app.player && !window.app.player.isPlaying) {
                        this.showChordPreview(chord, transition);
                    }
                });
                
                displayEl.appendChild(span);
                
                if (index < chords.length - 1) {
                    displayEl.appendChild(document.createTextNode(', '));
                }
            });
            
            displayEl.style.display = 'block';
        },

        /**
         * Get chord suffix for display
         * @private
         */
        getChordSuffix: function(chordType) {
            const suffixMap = {
                'minor-triad': 'm',
                'dominant-7th': '7',
                'diminished-triad': 'dim',
                'augmented-triad': 'aug'
            };
            return suffixMap[chordType] || '';
        },

        /**
         * Show transition selection menu
         * @param {HTMLElement} targetElement - Element that was clicked
         * @param {number} chordIndex - Chord index
         */
        showTransitionMenu: function(targetElement, chordIndex) {
            // Remove existing menu if any
            const existingMenu = document.getElementById('transitionMenu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = document.createElement('div');
            menu.id = 'transitionMenu';
            menu.className = 'transition-menu';
            
            const transitions = Object.keys(Config.TRANSITION_LABELS).map(value => ({
                value,
                label: Config.TRANSITION_LABELS[value]
            }));

            transitions.forEach(trans => {
                const item = document.createElement('div');
                item.className = 'transition-menu-item';
                item.textContent = trans.label;
                const colorClass = Config.TRANSITION_COLORS[trans.value] || 'trans-none';
                item.classList.add(colorClass);
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.app && window.app.player) {
                        window.app.player.setTransition(chordIndex, trans.value);
                        this.displayParsedChords(window.app.player.parsedChords, window.app.player.currentPlayingIndex);
                    }
                    menu.remove();
                });
                menu.appendChild(item);
            });

            document.body.appendChild(menu);
            
            // Position menu near clicked element
            const rect = targetElement.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';

            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== targetElement) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        },

        /**
         * Show chord palette preview when clicking a chord while not playing
         * @param {Object} chord - Chord object with rootNote and chordType
         * @param {string} transitionType - Transition type for color coding
         */
        showChordPreview: function(chord, transitionType) {
            // Clear any existing preview timeout
            if (this.chordPreviewTimeout) {
                clearTimeout(this.chordPreviewTimeout);
                this.chordPreviewTimeout = null;
            }
            
            // Show the chord palette on piano
            if (window.PianoVisualizer && chord) {
                window.PianoVisualizer.updateChordPaletteFromChord(
                    chord.rootNote, 
                    chord.chordType, 
                    transitionType || 'none'
                );
            }
            
            // Clear the palette after 4 seconds
            this.chordPreviewTimeout = setTimeout(() => {
                if (window.PianoVisualizer) {
                    window.PianoVisualizer.clearPalette();
                }
                this.chordPreviewTimeout = null;
            }, 4000);
        },

        /**
         * Update play button state
         * @param {boolean} isPlaying - Whether playback is active
         */
        updatePlayButton: function(isPlaying) {
            if (isPlaying) {
                this.elements.playStopButton.textContent = 'Stop';
                this.elements.playStopButton.classList.add('playing');
            } else {
                this.elements.playStopButton.textContent = 'Play';
                this.elements.playStopButton.classList.remove('playing');
            }
        },

        /**
         * Enable or disable the test panel based on playing state
         * @param {boolean} isPlaying - Whether playback is active
         */
        setTestPanelEnabled: function(isPlaying) {
            const testPanelContainer = document.querySelector('.test-panel-container');
            
            if (testPanelContainer) {
                if (isPlaying) {
                    testPanelContainer.classList.remove('disabled');
                } else {
                    testPanelContainer.classList.add('disabled');
                    // Clear piano key highlighting when disabled
                    this.clearPianoKeyHighlighting();
                }
            }
        },

        /**
         * Clear piano key highlighting
         */
        clearPianoKeyHighlighting: function() {
            if (window.PianoVisualizer && window.PianoVisualizer.pianoContainer) {
                const allKeys = window.PianoVisualizer.pianoContainer.querySelectorAll('.piano-key');
                allKeys.forEach(key => {
                    key.classList.remove('playing-type');
                });
            }
        },

        /**
         * Show or hide the chord input textarea
         * @param {boolean} show - Whether to show (true) or hide (false) the textarea
         */
        toggleChordInput: function(show) {
            if (this.elements.chordInput) {
                if (show) {
                    this.elements.chordInput.style.display = '';
                } else {
                    this.elements.chordInput.style.display = 'none';
                }
            }
        },

        /**
         * Initialize preset dropdown
         * @param {Array} presets - Array of preset objects
         */
        initializePresetDropdown: function(presets) {
            const presetSelect = this.elements.presetSelect;
            presetSelect.innerHTML = '';
            
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.name;
                option.textContent = preset.name;
                presetSelect.appendChild(option);
            });
            
            const handlePresetChange = (e) => {
                const presetName = e.target.value;
                if (presetName && window.app && window.app.onPresetSelect) {
                    window.app.onPresetSelect(presetName);
                } else if (presetName) {
                    // Fallback: handle preset selection directly if app not ready
                    const preset = ChordPresets.getByName(presetName);
                    if (preset) {
                        this.setChordInput(preset.chords.join(', '));
                        if (preset.bpm) {
                            this.setBPM(preset.bpm);
                        }
                    }
                }
            };
            presetSelect.addEventListener('change', handlePresetChange);
            // Add touchstart for mobile dropdown support
            presetSelect.addEventListener('touchstart', (e) => {
                // Allow native dropdown to open on touch
                e.stopPropagation();
            }, { passive: true });
        },

        /**
         * Set chord input value
         * @param {string} value - Chord string
         */
        setChordInput: function(value) {
            this.elements.chordInput.value = value;
        },

        /**
         * Set BPM input value
         * @param {number} bpm - BPM value
         */
        setBPM: function(bpm) {
            this.elements.bpmInput.value = bpm;
            if (this.elements.bpmValue) {
                this.elements.bpmValue.textContent = bpm;
            }
        },

        /**
         * Get chord input value
         * @returns {string} Chord string
         */
        getChordInput: function() {
            return this.elements.chordInput.value;
        },

        /**
         * Get BPM value
         * @returns {number} BPM
         */
        getBPM: function() {
            return parseInt(this.elements.bpmInput.value) || Config.DEFAULTS.BPM;
        },


        /**
         * Setup performance settings event handlers
         */
        setupPerformanceSettings: function() {
            if (!window.AudioManager) return;

            // Multiband compression checkbox (checked = enabled)
            if (this.elements.disableMultibandCheckbox) {
                this.elements.disableMultibandCheckbox.checked = window.AudioManager.isMultibandEnabled();
                
                this.elements.disableMultibandCheckbox.addEventListener('change', (e) => {
                    const enabled = e.target.checked;
                    window.AudioManager.setMultibandEnabled(enabled);
                    // Note: Changing multiband requires reinitialization to take effect
                    console.log(`Multiband compression ${enabled ? 'enabled' : 'disabled'}. Restart playback to apply.`);
                });
            }

            // Autogain checkbox (checked = enabled)
            if (this.elements.disableAutogainCheckbox) {
                this.elements.disableAutogainCheckbox.checked = window.AudioManager.autogainEnabled;
                
                this.elements.disableAutogainCheckbox.addEventListener('change', (e) => {
                    const enabled = e.target.checked;
                    window.AudioManager.setAutogainEnabled(enabled);
                    console.log(`Autogain ${enabled ? 'enabled' : 'disabled'}.`);
                });
            }

            // Performance mode checkbox (disables both)
            if (this.elements.performanceModeCheckbox) {
                this.elements.performanceModeCheckbox.addEventListener('change', (e) => {
                    const performanceMode = e.target.checked;
                    
                    if (performanceMode) {
                        // Disable both for maximum performance
                        window.AudioManager.setMultibandEnabled(false);
                        window.AudioManager.setAutogainEnabled(false);
                        if (this.elements.disableMultibandCheckbox) {
                            this.elements.disableMultibandCheckbox.checked = false;
                        }
                        if (this.elements.disableAutogainCheckbox) {
                            this.elements.disableAutogainCheckbox.checked = false;
                        }
                        console.log('Performance mode enabled. Multiband and autogain disabled.');
                    } else {
                        // Re-enable both
                        window.AudioManager.setMultibandEnabled(true);
                        window.AudioManager.setAutogainEnabled(true);
                        if (this.elements.disableMultibandCheckbox) {
                            this.elements.disableMultibandCheckbox.checked = true;
                        }
                        if (this.elements.disableAutogainCheckbox) {
                            this.elements.disableAutogainCheckbox.checked = true;
                        }
                        console.log('Performance mode disabled. Multiband and autogain enabled.');
                    }
                });
            }
        },

        /**
         * Switch settings section
         * @param {string} section - Section name (sound, playback, performance)
         */
        switchSettingsSection: function(section) {
            // Update nav items
            this.elements.settingsNavItems.forEach(item => {
                if (item.getAttribute('data-section') === section) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Show/hide sections
            const sections = ['sound', 'playback', 'performance'];
            sections.forEach(s => {
                const sectionEl = document.getElementById(s + 'Section');
                if (sectionEl) {
                    sectionEl.style.display = s === section ? 'block' : 'none';
                }
            });
        },

        /**
         * Switch help tab
         * @param {string} tabName - Tab name to switch to
         */
        switchHelpTab: function(tabName) {
            // Remove active class from all nav items and tab contents
            document.querySelectorAll('.help-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.help-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to selected nav item and tab content
            const selectedNavItem = document.querySelector(`.help-nav-item[data-tab="${tabName}"]`);
            const selectedTabContent = document.getElementById(`helpTab-${tabName}`);
            
            if (selectedNavItem) selectedNavItem.classList.add('active');
            if (selectedTabContent) selectedTabContent.classList.add('active');
        }
    };

    // Export to window
    window.UIController = UIController;
})();

