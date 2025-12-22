/**
 * Panel Integration
 * Integrates the sound system and test panel with the main app
 */

(function() {
    'use strict';

    // Note selection type labels (CPU optimized: each zone plays only ONE note)
    const NOTE_SELECTION_LABELS = {
        0: 'Zone 0: Lowest note only',
        1: 'Zone 1: 2nd lowest note only',
        2: 'Zone 2: 3rd lowest note only',
        3: 'Zone 3: 4th lowest note only',
        4: 'Zone 4: 4th lowest note only',
        5: 'Zone 5: 5th lowest note only',
        6: 'Zone 6: Octave high of 3rd highest note'
    };

    // Fixed root note (we'll use 'C' as the base)
    const BASE_ROOT_NOTE = 'C';

    // Cycle rates for each region
    const REGION_RATES = [240, 120, 60, 40, 30, 20, 15];

    const PanelIntegration = {
        soundManager: null,
        audioContext: null,
        masterGain: null,
        isPlaying: false,
        shouldStop: false,
        currentLoopTimeout: null,
        layer1Sources: [],
        layer2Sources: [],
        layer1Gains: [],
        layer2Gains: [],
        layer1StartTimes: [], // Track when each source started (for fade-out logic)
        layer2StartTimes: [], // Track when each source started (for fade-out logic)
        currentCycleRate: 40,
        nextCycleRate: 40,
        isDragging: false,
        currentRegionIndex: -1,
        currentPitchShift: 0,
        nextPitchShift: 0,
        currentVolume: 1.0,
        nextVolume: 1.0,
        baseVolume: 1.0, // Store base volume when drag starts
        currentRegionType: 0,
        nextRegionType: 0,
        panelCenterY: null,
        panelHeight: null,
        activeTouches: null, // Will be initialized as Map in init

        init: function() {
            // Initialize activeTouches Map for multi-touch support
            this.activeTouches = new Map();
            // Initialize sound manager
            this.soundManager = new SoundManager({
                numSounds: 3,
                presets: window.SoundPresets
            });

            // Initialize audio
            this.initAudio();

            // Populate layer dropdowns first
            this.populateLayerDropdowns();

            // Move layer selects to soundbar after a short delay to ensure DOM is ready
            // Use requestAnimationFrame to ensure DOM updates are complete
            requestAnimationFrame(() => {
                this.moveLayerSelectsToSoundbar();
            });

            // Setup sound selection handlers
            this.setupSoundHandlers();

            // Setup test panel handlers
            this.setupTestPanelHandlers();

            // Setup auto manage checkbox
            this.setupAutoManage();

            // Setup soundbar handlers
            this.setupSoundbarHandlers();

            // Update connection lines
            this.updateAllConnectionLines();

            // Update percentages
            this.updateSoundPercentages();

            // Update soundbar visual state
            this.updateSoundbarVisualState();

            // Setup window resize handler
            window.addEventListener('resize', () => this.updateAllConnectionLines());

            // Periodic update for sound percentages (for crossfade animation)
            setInterval(() => {
                // Update during playback or during crossfade (even if not playing, crossfade might be finishing)
                if (this.isPlaying || this.soundManager.getIsCrossfading()) {
                    this.updateSoundPercentages();
                }
            }, 50);

            // Note: Removed updateChordTypeDisplay call - test panel info removed for CPU savings
        },

        initAudio: function() {
            window.AudioManager.initialize();
            this.audioContext = window.AudioManager.getContext();
            this.masterGain = window.AudioManager.getMasterGain();
            this.soundManager.initialize(this.audioContext, this.masterGain);

            // Don't resume AudioContext here - wait for user gesture
            // It will be resumed in handlePointerDown or startPlayback
        },
        
        resumeAudioContext: function() {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                return this.audioContext.resume().catch(error => {
                    console.warn('Failed to resume AudioContext:', error);
                });
            }
            return Promise.resolve();
        },

        populateLayerDropdowns: function() {
            const presets = window.SoundPresets;
            if (!presets || Object.keys(presets).length === 0) {
                console.warn('SoundPresets not available yet, retrying...');
                // Retry after a short delay if presets aren't loaded yet
                setTimeout(() => this.populateLayerDropdowns(), 100);
                return;
            }
            
            [1, 2, 3].forEach(soundNum => {
                const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
                const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
                
                if (!layer1Select || !layer2Select) {
                    console.warn(`Layer selects not found for sound ${soundNum}`);
                    return;
                }

                // Clear existing options first
                layer1Select.innerHTML = '';
                layer2Select.innerHTML = '';

                Object.keys(presets).forEach(presetName => {
                    const option1 = document.createElement('option');
                    option1.value = presetName;
                    option1.textContent = presetName;
                    layer1Select.appendChild(option1);
            
                    const option2 = document.createElement('option');
                    option2.value = presetName;
                    option2.textContent = presetName;
                    layer2Select.appendChild(option2);
                });
                
                // Randomize layers for each sound individually
                this.randomizeSoundLayers(soundNum);
            });
        },

        setupSoundHandlers: function() {
            // Sound selection click handlers
            [1, 2, 3].forEach(soundNum => {
                const output = document.getElementById(`soundOutput${soundNum}`);
                if (output) {
                    output.addEventListener('click', () => this.selectSound(soundNum));
                }
            });

            // Layer select change handlers
            [1, 2, 3].forEach(soundNum => {
                const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
                const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
                
                if (layer1Select) {
                    layer1Select.addEventListener('change', () => {
                        this.soundManager.invalidateGenerators(soundNum);
                        this.updateConnectionLines(soundNum);
                    });
                }
                if (layer2Select) {
                    layer2Select.addEventListener('change', () => {
                        this.soundManager.invalidateGenerators(soundNum);
                        this.updateConnectionLines(soundNum);
                    });
                }
            });
        },

        getCrossfadeSpeed: function() {
            const select = document.getElementById('crossfadeSpeedSelect');
            if (!select) return 8; // Default to 8 bars
            return parseInt(select.value) || 8;
        },

        setupAutoManage: function() {
            const select = document.getElementById('autoManageSelect');
            if (!select) return;

            // Initialize auto-manage state from dropdown (defaults to "none")
            const mode = select.value;
            const enabled = mode !== 'none';
            this.soundManager.setAutoManageEnabled(enabled);
            this.soundManager.setAutoManageMode(mode);
            this.setSoundSelectionLocked(enabled);

            select.addEventListener('change', (e) => {
                const mode = e.target.value;
                const enabled = mode !== 'none';
                this.soundManager.setAutoManageEnabled(enabled);
                this.soundManager.setAutoManageMode(mode);
                this.setSoundSelectionLocked(enabled);
                
                if (enabled && this.isPlaying && !this.soundManager.getIsCrossfading()) {
                    this.triggerAutoManageNext();
                }
            });

            // Set callback for auto manage
            this.soundManager.setAutoManageCallback(() => {
                this.triggerAutoManageNext();
            });
        },

        moveLayerSelectsToSoundbar: function() {
            // Move layer selects from settings panel to soundbar (reuse same DOM elements)
            [1, 2, 3].forEach(soundNum => {
                const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
                const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
                const soundbarLayers = document.getElementById(`soundbarLayers${soundNum}`);
                
                if (layer1Select && layer2Select && soundbarLayers) {
                    // Move selects to soundbar (this preserves all event handlers and options)
                    soundbarLayers.appendChild(layer1Select);
                    soundbarLayers.appendChild(layer2Select);
                } else {
                    console.warn(`Could not move layer selects for sound ${soundNum}:`, {
                        layer1Select: !!layer1Select,
                        layer2Select: !!layer2Select,
                        soundbarLayers: !!soundbarLayers
                    });
                }
            });
        },

        setupSoundbarHandlers: function() {
            // Setup click handlers for soundbar labels
            [1, 2, 3].forEach(soundNum => {
                const label = document.getElementById(`soundbarLabel${soundNum}`);
                if (label) {
                    label.addEventListener('click', (e) => {
                        // Don't trigger sound selection if clicking the dice
                        if (e.target.classList.contains('soundbar-dice')) {
                            return;
                        }
                        this.selectSound(soundNum);
                    });
                }
                
                // Setup dice click handlers for randomizing layers
                const dice = document.getElementById(`soundbarDice${soundNum}`);
                if (dice) {
                    dice.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent triggering label click
                        this.randomizeSoundLayers(soundNum);
                    });
                }
            });

            // Update soundbar visual state based on active sound
            this.updateSoundbarVisualState();
        },

        updateSoundbarVisualState: function() {
            const activeSound = this.soundManager.getActiveSound();
            [1, 2, 3].forEach(num => {
                const soundbarLabel = document.getElementById(`soundbarLabel${num}`);
                if (soundbarLabel) {
                    if (num === activeSound) {
                        soundbarLabel.classList.add('active');
                    } else {
                        soundbarLabel.classList.remove('active');
                    }
                }
            });
        },

        setupTestPanelHandlers: function() {
            const testPanel = document.getElementById('testPanel');
            if (!testPanel) return;

            // Mouse events
            testPanel.addEventListener('mousedown', (e) => this.handlePointerDown(e));
            document.addEventListener('mousemove', (e) => this.handlePointerMove(e));
            document.addEventListener('mouseup', (e) => this.handlePointerUp(e));
            
            // Touch events
            testPanel.addEventListener('touchstart', (e) => this.handlePointerDown(e), { passive: false });
            document.addEventListener('touchmove', (e) => this.handlePointerMove(e), { passive: false });
            document.addEventListener('touchend', (e) => this.handlePointerUp(e), { passive: false });
            document.addEventListener('touchcancel', (e) => this.handlePointerUp(e), { passive: false });
        },

        selectSound: function(soundNum) {
            // Allow selection even when autoManageEnabled is true (user can override)
            // But if autoManageEnabled is true, disable it temporarily when user manually selects
            if (this.soundManager.autoManageEnabled) {
                // Disable auto manage when user manually selects
                const autoManageSelect = document.getElementById('autoManageSelect');
                if (autoManageSelect) {
                    autoManageSelect.value = 'none';
                    this.soundManager.setAutoManageEnabled(false);
                    this.setSoundSelectionLocked(false);
                }
            }
            
            const activeSound = this.soundManager.getActiveSound();
            const isCrossfading = this.soundManager.getIsCrossfading();
            
            // Check if autocrossfade is enabled
            const autoManageSelect = document.getElementById('autoManageSelect');
            const autocrossfadeEnabled = autoManageSelect ? autoManageSelect.value === 'autoautocrossfade' : false;
            
            // Update visual state immediately (both soundbar and settings)
            [1, 2, 3].forEach(num => {
                const output = document.getElementById(`soundOutput${num}`);
                const soundbarLabel = document.getElementById(`soundbarLabel${num}`);
                if (output) {
                    if (num === soundNum) {
                        output.classList.add('active');
                    } else {
                        output.classList.remove('active');
                    }
                }
                if (soundbarLabel) {
                    if (num === soundNum) {
                        soundbarLabel.classList.add('active');
                    } else {
                        soundbarLabel.classList.remove('active');
                    }
                }
            });
            
            // If clicking the same sound and not playing and not crossfading, just update visuals
            if (soundNum === activeSound && !this.isPlaying && !isCrossfading) {
                this.updateSoundPercentages();
                return;
            }
            
            // Update percentages
            this.updateSoundPercentages();
            
            // If playing, switch sound (with or without crossfade)
            if (this.isPlaying) {
                if (autocrossfadeEnabled) {
                    // Use crossfade
                    const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                    const crossfadeBars = this.getCrossfadeSpeed();
                    this.soundManager.startCrossfade(soundNum, bpm, () => {
                        this.updateSoundPercentages();
                        if (this.soundManager.autoManageEnabled && this.isPlaying) {
                            this.triggerAutoManageNext();
                        }
                    }, crossfadeBars);
                } else {
                    // Instant switch (no crossfade)
                    this.soundManager.switchSoundInstantly(soundNum);
                    this.updateSoundPercentages();
                }
            } else {
                // Not playing - just set active sound
                this.soundManager.setActiveSound(soundNum);
                this.updateSoundPercentages();
            }
        },

        setSoundSelectionLocked: function(locked) {
            [1, 2, 3].forEach(soundNum => {
                const output = document.getElementById(`soundOutput${soundNum}`);
                if (output) {
                    output.style.pointerEvents = locked ? 'none' : 'auto';
                    output.style.opacity = locked ? '0.6' : '1';
                }
                
                const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
                const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
                if (layer1Select) {
                    layer1Select.disabled = locked;
                    layer1Select.style.opacity = locked ? '0.6' : '1';
                }
                if (layer2Select) {
                    layer2Select.disabled = locked;
                    layer2Select.style.opacity = locked ? '0.6' : '1';
                }
            });
        },

        randomizeSoundLayers: function(soundNum) {
            const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
            const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
            if (!layer1Select || !layer2Select) return;

            const presets = window.SoundPresets;
            if (!presets) return;
            
            const presetNames = Object.keys(presets);
            if (presetNames.length === 0) return;
            
            const random1 = presetNames[Math.floor(Math.random() * presetNames.length)];
            let random2 = presetNames[Math.floor(Math.random() * presetNames.length)];
            while (random2 === random1 && presetNames.length > 1) {
                random2 = presetNames[Math.floor(Math.random() * presetNames.length)];
            }
            
            // Only set values if they exist as options
            if (layer1Select.querySelector(`option[value="${random1}"]`)) {
                layer1Select.value = random1;
            }
            if (layer2Select.querySelector(`option[value="${random2}"]`)) {
                layer2Select.value = random2;
            }
            
            // Trigger change events to ensure UI updates
            layer1Select.dispatchEvent(new Event('change', { bubbles: true }));
            layer2Select.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Invalidate generators so they get recreated with new layers
            this.soundManager.invalidateGenerators(soundNum);
            
            // Update connection lines
            this.updateConnectionLines(soundNum);
        },

        triggerAutoManageNext: function() {
            if (!this.soundManager.autoManageEnabled || !this.isPlaying) return;
            
            const mode = this.soundManager.getAutoManageMode();
            let selectedSound;
            
            if (mode === 'autojump' || mode === 'autorandom') {
                // Jump to next sound in sequence (1->2->3->1...)
                const activeSound = this.soundManager.getActiveSound();
                selectedSound = activeSound === 3 ? 1 : activeSound + 1;
            } else {
                // autoautocrossfade: pick random sound from remaining
                const remainingSounds = this.soundManager.getRemainingSounds();
                if (remainingSounds.length === 0) return;
                const randomIndex = Math.floor(Math.random() * remainingSounds.length);
                selectedSound = remainingSounds[randomIndex];
            }
            
            // Update visual state (both soundbar and settings)
            [1, 2, 3].forEach(num => {
                const output = document.getElementById(`soundOutput${num}`);
                const soundbarLabel = document.getElementById(`soundbarLabel${num}`);
                if (output) {
                    if (num === selectedSound) {
                        output.classList.add('active');
                    } else {
                        output.classList.remove('active');
                    }
                }
                if (soundbarLabel) {
                    if (num === selectedSound) {
                        soundbarLabel.classList.add('active');
                    } else {
                        soundbarLabel.classList.remove('active');
                    }
                }
            });
            
            // Check if autocrossfade is enabled
            const autoManageSelect = document.getElementById('autoManageSelect');
            const autocrossfadeEnabled = autoManageSelect ? autoManageSelect.value === 'autoautocrossfade' : false;
            
            if (autocrossfadeEnabled) {
                // Use crossfade
                const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                const crossfadeBars = this.getCrossfadeSpeed();
                this.soundManager.startCrossfade(selectedSound, bpm, () => {
                    this.updateSoundPercentages();
                    if (this.soundManager.autoManageEnabled && this.isPlaying) {
                        this.triggerAutoManageNext();
                    }
                }, crossfadeBars);
            } else {
                // Instant switch (no crossfade) for autojump and autorandom
                // Randomize layers AFTER switching if autorandom mode (to avoid timing issues)
                if (mode === 'autorandom') {
                    // Switch first, then randomize
                    this.soundManager.switchSoundInstantly(selectedSound);
                    this.updateSoundPercentages();
                    // Randomize layers after a small delay to ensure switch completes
                    setTimeout(() => {
                        this.randomizeSoundLayers(selectedSound);
                    }, 50);
                } else {
                    this.soundManager.switchSoundInstantly(selectedSound);
                    this.updateSoundPercentages();
                }
                
                if (this.soundManager.autoManageEnabled && this.isPlaying) {
                    // Schedule next auto-manage based on speed setting
                    const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                    const crossfadeBars = this.getCrossfadeSpeed();
                    const delayMs = ((crossfadeBars * 240) / bpm) * 1000;
                    setTimeout(() => {
                        if (this.soundManager.autoManageEnabled && this.isPlaying) {
                            this.triggerAutoManageNext();
                        }
                    }, delayMs);
                }
            }
        },

        updateConnectionLines: function(soundNum) {
            const diagram = document.getElementById(`soundDiagram${soundNum}`);
            const soundOutput = document.getElementById(`soundOutput${soundNum}`);
            const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
            const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
            const connectionLines = document.getElementById(`connectionLines${soundNum}`);
            
            if (!diagram || !soundOutput || !layer1Select || !layer2Select || !connectionLines) return;
            
            connectionLines.innerHTML = '';
            
            const diagramRect = diagram.getBoundingClientRect();
            const soundRect = soundOutput.getBoundingClientRect();
            const layer1Rect = layer1Select.getBoundingClientRect();
            const layer2Rect = layer2Select.getBoundingClientRect();
            
            const soundLeft = soundRect.left - diagramRect.left;
            const soundCenterY = (soundRect.top + soundRect.bottom) / 2 - diagramRect.top;
            const layer1Right = layer1Rect.right - diagramRect.left;
            const layer1CenterY = (layer1Rect.top + layer1Rect.bottom) / 2 - diagramRect.top;
            const layer2Right = layer2Rect.right - diagramRect.left;
            const layer2CenterY = (layer2Rect.top + layer2Rect.bottom) / 2 - diagramRect.top;
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            
            const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line1.setAttribute('x1', layer1Right);
            line1.setAttribute('y1', layer1CenterY);
            line1.setAttribute('x2', soundLeft);
            line1.setAttribute('y2', soundCenterY);
            line1.setAttribute('stroke', '#666');
            line1.setAttribute('stroke-width', '2');
            line1.setAttribute('opacity', '0.6');
            svg.appendChild(line1);
            
            const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line2.setAttribute('x1', layer2Right);
            line2.setAttribute('y1', layer2CenterY);
            line2.setAttribute('x2', soundLeft);
            line2.setAttribute('y2', soundCenterY);
            line2.setAttribute('stroke', '#666');
            line2.setAttribute('stroke-width', '2');
            line2.setAttribute('opacity', '0.6');
            svg.appendChild(line2);
            
            connectionLines.appendChild(svg);
        },

        updateAllConnectionLines: function() {
            [1, 2, 3].forEach(soundNum => {
                setTimeout(() => this.updateConnectionLines(soundNum), 10);
            });
        },

        updateSoundPercentages: function() {
            [1, 2, 3].forEach(soundNum => {
                const percentageEl = document.getElementById(`soundPercentage${soundNum}`);
                if (!percentageEl) return;
                
                const volume = this.soundManager.getSoundVolume(soundNum);
                percentageEl.textContent = `${volume}%`;
            });
            
            // Also update soundbar visual state
            this.updateSoundbarVisualState();
        },

        getRegionFromX: function(x) {
            const panel = document.getElementById('testPanel');
            if (!panel) return 0;
            const rect = panel.getBoundingClientRect();
            const relativeX = x - rect.left;
            const regionWidth = rect.width / 7;
            const regionIndex = Math.floor(relativeX / regionWidth);
            return Math.max(0, Math.min(6, regionIndex));
        },

        updatePanelDimensions: function() {
            const panel = document.getElementById('testPanel');
            if (!panel) return;
            const rect = panel.getBoundingClientRect();
            this.panelHeight = rect.height;
            this.panelCenterY = rect.top + (this.panelHeight / 2); // Center Y position of panel
        },

        getPitchAndVolumeFromY: function(y) {
            const panel = document.getElementById('testPanel');
            if (!panel) return { pitchShift: 0, volume: 1.0 };
            
            // Update panel dimensions if needed
            if (this.panelCenterY === null || this.panelHeight === null) {
                this.updatePanelDimensions();
            }
            
            if (this.panelCenterY === null || this.panelHeight === null) {
                return { pitchShift: 0, volume: 1.0 };
            }
            
            const MAX_VOLUME = 1.3; // Maximum volume (130%)
            const MIN_VOLUME = 0.0; // Minimum volume (0%)
            const SAFE_ZONE_PERCENT = 0.10; // 10% safe zone from center
            const baseVolume = this.baseVolume || 1.0;
            
            // Calculate distance from center (positive = above center, negative = below center)
            const distanceFromCenter = this.panelCenterY - y;
            const absDistance = Math.abs(distanceFromCenter);
            
            // Calculate safe zone size (10% of panel height from center)
            const safeZoneSize = this.panelHeight * SAFE_ZONE_PERCENT;
            
            // Calculate pitch shift (still top-to-bottom for now)
            // Match v1_4: ±25 cents (0.25 semitones) max
            const rect = panel.getBoundingClientRect();
            const relativeY = y - rect.top;
            const height = rect.height;
            const normalizedY = Math.max(0, Math.min(1, relativeY / height));
            const pitchShift = 0.25 - (normalizedY * 0.5); // Range: +0.25 to -0.25 semitones (±25 cents)
            
            // Check if we're in the safe zone (±10% from center)
            let volume;
            if (absDistance <= safeZoneSize) {
                // In safe zone: use base volume
                volume = baseVolume;
            } else {
                // Calculate the effective range (from safe zone edge to panel edge)
                const maxDistance = (this.panelHeight / 2) - safeZoneSize;
                const effectiveDistance = absDistance - safeZoneSize;
                
                // Normalize to 0-1 (0 = at safe zone edge, 1 = at panel edge)
                const normalizedDistance = Math.min(effectiveDistance / maxDistance, 1.0);
                
                // Calculate volume based on direction
                if (distanceFromCenter > 0) {
                    // Above center (dragged up) = louder
                    // Interpolate from baseVolume to MAX_VOLUME
                    volume = baseVolume + (normalizedDistance * (MAX_VOLUME - baseVolume));
                } else {
                    // Below center (dragged down) = quieter
                    // Interpolate from baseVolume to MIN_VOLUME
                    volume = baseVolume - (normalizedDistance * baseVolume);
                }
                
                // Clamp volume to range
                volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
            }
            
            return { pitchShift, volume };
        },

        semitonesToMultiplier: function(semitones) {
            return Math.pow(2, semitones / 12);
        },

        updateActiveRegion: function(index, isHover = false) {
            const regions = document.querySelectorAll('.cycle-region');
            const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
            
            regions.forEach((region, i) => {
                region.classList.remove('active', 'hover', 'pulsing');
                if (i === index) {
                    if (isHover && !this.isPlaying) {
                        region.classList.add('hover');
                    } else {
                        region.classList.add('active');
                        // Add pulsing animation when playing
                        if (this.isPlaying) {
                            const rate = parseInt(region.getAttribute('data-rate')) || 120;
                            // Calculate pulse duration to match cycle duration: (rate * 60) / (bpm * bpm) seconds
                            const pulseDuration = (rate * 60) / (bpm * bpm);
                            region.style.setProperty('--pulse-duration', pulseDuration + 's');
                            region.classList.add('pulsing');
                        }
                    }
                }
            });
        },

        getNoteForZone: function(zoneIndex, sortedNotes) {
            // Helper function to get the note for a specific zone
            if (sortedNotes.length === 0) return null;
            
            let selectedNote = null;
            
            switch (zoneIndex) {
                case 0:
                    // Zone 0: lowest note only
                    selectedNote = sortedNotes[0];
                    break;
                case 1:
                    // Zone 1: 2nd lowest note only
                    selectedNote = sortedNotes.length > 1 ? sortedNotes[1] : sortedNotes[0];
                    break;
                case 2:
                    // Zone 2: 3rd lowest note only
                    selectedNote = sortedNotes.length > 2 ? sortedNotes[2] : sortedNotes[Math.min(1, sortedNotes.length - 1)];
                    break;
                case 3:
                    // Zone 3: 4th lowest note only
                    selectedNote = sortedNotes.length > 3 ? sortedNotes[3] : sortedNotes[Math.min(2, sortedNotes.length - 1)];
                    break;
                case 4:
                    // Zone 4: 4th lowest note only
                    selectedNote = sortedNotes.length > 3 ? sortedNotes[3] : sortedNotes[Math.min(2, sortedNotes.length - 1)];
                    break;
                case 5:
                    // Zone 5: 5th lowest note only
                    selectedNote = sortedNotes.length > 4 ? sortedNotes[4] : sortedNotes[Math.min(3, sortedNotes.length - 1)];
                    break;
                case 6:
                    // Zone 6: octave high version of 3rd highest note
                    if (sortedNotes.length >= 3) {
                        // 3rd highest = index (length - 3)
                        const thirdHighest = sortedNotes[sortedNotes.length - 3];
                        // Raise by one octave
                        selectedNote = {
                            note: thirdHighest.note,
                            octave: thirdHighest.octave + 1
                        };
                    } else if (sortedNotes.length >= 2) {
                        // If less than 3 notes, use highest note and raise by octave
                        const highest = sortedNotes[sortedNotes.length - 1];
                        selectedNote = {
                            note: highest.note,
                            octave: highest.octave + 1
                        };
                    } else {
                        // Only one note, raise it by octave
                        selectedNote = {
                            note: sortedNotes[0].note,
                            octave: sortedNotes[0].octave + 1
                        };
                    }
                    break;
                default:
                    // Fallback: use lowest note
                    selectedNote = sortedNotes[0];
            }
            
            return selectedNote;
        },

        getChordFrequencies: function(regionType) {
            // Get current palette notes from PianoVisualizer
            if (!window.PianoVisualizer) {
                console.warn('PianoVisualizer not available');
                return [];
            }
            
            let currentPaletteNotes = window.PianoVisualizer.getCurrentPaletteNotes();
            
            // If palette is empty (not playing), try to get first chord from chord display
            if (!currentPaletteNotes || currentPaletteNotes.length === 0) {
                if (window.app && window.app.player && window.app.player.parsedChords && window.app.player.parsedChords.length > 0) {
                    // Get first chord from parsed chords
                    const firstChord = window.app.player.parsedChords[0];
                    if (firstChord && firstChord.rootNote && firstChord.chordType) {
                        // Generate palette notes from first chord
                        currentPaletteNotes = window.PianoVisualizer.getChordPaletteNotes(firstChord.rootNote, firstChord.chordType);
                    }
                }
            }
            
            if (!currentPaletteNotes || currentPaletteNotes.length === 0) {
                // Still no palette notes - return empty array (will be handled gracefully)
                return [];
            }
            
            // Sort palette notes by octave and note index (lowest first)
            const sortedNotes = [...currentPaletteNotes].sort((a, b) => {
                if (a.octave !== b.octave) {
                    return a.octave - b.octave;
                }
                const aIndex = Config.NOTE_TO_INDEX[a.note];
                const bIndex = Config.NOTE_TO_INDEX[b.note];
                return aIndex - bIndex;
            });
            
            if (sortedNotes.length === 0) {
                return [];
            }
            
            // Get playback mode from dropdown
            const playbackModeSelect = document.getElementById('playbackModeSelect');
            const playbackMode = playbackModeSelect ? playbackModeSelect.value : 'normal';
            
            let selectedNotes = [];
            
            // Helper function for cyclic zone calculation
            const getCyclicZone = (zone, offset) => {
                let result = zone + offset;
                // Wrap around cyclically (0-6)
                while (result < 0) result += 7;
                while (result > 6) result -= 7;
                return result;
            };
            
            switch (playbackMode) {
                case 'normal':
                    // Normal mode: just the current zone's note
                    const note = this.getNoteForZone(regionType, sortedNotes);
                    if (note) selectedNotes.push(note);
                    break;
                    
                case 'pairlow':
                    // Pair Low: current zone + previous zone (cyclic)
                    const currentNoteLow = this.getNoteForZone(regionType, sortedNotes);
                    const prevZoneLow = getCyclicZone(regionType, -1);
                    const prevNoteLow = this.getNoteForZone(prevZoneLow, sortedNotes);
                    if (currentNoteLow) selectedNotes.push(currentNoteLow);
                    if (prevNoteLow) selectedNotes.push(prevNoteLow);
                    break;
                    
                case 'pairhigh':
                    // Pair High: current zone + next zone (cyclic)
                    const currentNoteHigh = this.getNoteForZone(regionType, sortedNotes);
                    const nextZoneHigh = getCyclicZone(regionType, 1);
                    const nextNoteHigh = this.getNoteForZone(nextZoneHigh, sortedNotes);
                    if (currentNoteHigh) selectedNotes.push(currentNoteHigh);
                    if (nextNoteHigh) selectedNotes.push(nextNoteHigh);
                    break;
                    
                case 'threeclose':
                    // Three Close: current zone + previous + next (3 notes, neighbors)
                    const currentNoteClose = this.getNoteForZone(regionType, sortedNotes);
                    const prevZoneClose = getCyclicZone(regionType, -1);
                    const nextZoneClose = getCyclicZone(regionType, 1);
                    const prevNoteClose = this.getNoteForZone(prevZoneClose, sortedNotes);
                    const nextNoteClose = this.getNoteForZone(nextZoneClose, sortedNotes);
                    if (prevNoteClose) selectedNotes.push(prevNoteClose);
                    if (currentNoteClose) selectedNotes.push(currentNoteClose);
                    if (nextNoteClose) selectedNotes.push(nextNoteClose);
                    break;
                    
                case 'threegap':
                    // Three Gap: current zone + previous-previous + next-next (3 notes, skipping one)
                    const currentNoteGap = this.getNoteForZone(regionType, sortedNotes);
                    const prevPrevZoneGap = getCyclicZone(regionType, -2);
                    const nextNextZoneGap = getCyclicZone(regionType, 2);
                    const prevPrevNoteGap = this.getNoteForZone(prevPrevZoneGap, sortedNotes);
                    const nextNextNoteGap = this.getNoteForZone(nextNextZoneGap, sortedNotes);
                    if (prevPrevNoteGap) selectedNotes.push(prevPrevNoteGap);
                    if (currentNoteGap) selectedNotes.push(currentNoteGap);
                    if (nextNextNoteGap) selectedNotes.push(nextNextNoteGap);
                    break;
                    
                case 'fourrandom':
                    // 4 Random: current zone + 3 random zones (4 notes total)
                    const currentNoteRandom = this.getNoteForZone(regionType, sortedNotes);
                    if (currentNoteRandom) selectedNotes.push(currentNoteRandom);
                    
                    // Get all 7 zones and pick 3 random ones (excluding current zone)
                    const allZones = [0, 1, 2, 3, 4, 5, 6];
                    const otherZones = allZones.filter(zone => zone !== regionType);
                    
                    // Shuffle and pick 3 random zones
                    const shuffledZones = [...otherZones].sort(() => Math.random() - 0.5);
                    const randomZones = shuffledZones.slice(0, 3);
                    
                    // Get notes for the 3 random zones
                    randomZones.forEach(zone => {
                        const note = this.getNoteForZone(zone, sortedNotes);
                        if (note) selectedNotes.push(note);
                    });
                    break;
                    
                default:
                    // Fallback to normal mode
                    const fallbackNote = this.getNoteForZone(regionType, sortedNotes);
                    if (fallbackNote) selectedNotes.push(fallbackNote);
            }
            
            // Convert selected notes to frequencies
            const frequencies = [];
            selectedNotes.forEach(note => {
                const freq = Config.getFrequency(note.note, note.octave);
                if (freq) frequencies.push(freq);
            });
            
            return frequencies;
        },

        updateChordTypeDisplay: function(regionIndex) {
            // Function kept for compatibility but does nothing - test panel info removed for CPU savings
            return;
            
            if (chordTypeEl) {
                chordTypeEl.textContent = NOTE_SELECTION_LABELS[regionIndex] || `Type ${regionIndex}`;
            }
            
            if (notesEl && window.PianoVisualizer) {
                // Get note arrays from current palette (real-time)
                const currentPaletteNotes = window.PianoVisualizer.getCurrentPaletteNotes();
                const arrays = window.PianoVisualizer.deriveNoteArraysFromPalette(currentPaletteNotes);
                const typeKey = `type${regionIndex}`;
                const notes = arrays[typeKey] || [];
                
                if (notes.length > 0) {
                    notesEl.textContent = notes.join(', ');
                } else {
                    notesEl.textContent = '-';
                }
            }
            
            // Update piano keys visual feedback
            this.updatePianoKeysForType(regionIndex);
        },

        updatePianoKeysForType: function(regionIndex) {
            if (!window.PianoVisualizer) return;
            
            // Clear all type highlighting
            const allKeys = window.PianoVisualizer.pianoContainer.querySelectorAll('.piano-key');
            allKeys.forEach(key => {
                key.classList.remove('playing-type');
            });
            
            // Get notes for this type
            const currentPaletteNotes = window.PianoVisualizer.getCurrentPaletteNotes();
            if (!currentPaletteNotes || currentPaletteNotes.length === 0) return;
            
            const arrays = window.PianoVisualizer.deriveNoteArraysFromPalette(currentPaletteNotes);
            const typeKey = `type${regionIndex}`;
            const notes = arrays[typeKey] || [];
            
            // Highlight piano keys for notes in this type
            notes.forEach(noteName => {
                allKeys.forEach(keyElement => {
                    const keyNote = keyElement.getAttribute('data-note');
                    if (keyNote === noteName) {
                        keyElement.classList.add('playing-type');
                    }
                });
            });
        },

        playCycle: async function(frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, regionType) {
            if (this.shouldStop) {
                this.isPlaying = false;
                this.shouldStop = false;
                return;
            }
            
            // Ensure AudioContext is running before playing
            if (!this.audioContext || this.audioContext.state === 'suspended') {
                await this.resumeAudioContext();
            }
            
            // Skip if still no frequencies
            if (!frequencies || frequencies.length === 0) {
                // Update frequencies from current palette before playing (real-time update)
                const currentFrequencies = this.getChordFrequencies(regionType);
                if (currentFrequencies.length > 0) {
                    frequencies = currentFrequencies;
                } else {
                    // Still no frequencies - skip this cycle
                    if (!this.shouldStop && this.isPlaying) {
                        const nextBpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                        const nextCycleDuration = (this.nextCycleRate * 60) / (nextBpm * nextBpm);
                        this.currentLoopTimeout = setTimeout(() => {
                            if (this.isPlaying && !this.shouldStop) {
                                this.currentCycleRate = this.nextCycleRate;
                                this.currentPitchShift = this.nextPitchShift;
                                this.currentVolume = this.nextVolume;
                                this.currentRegionType = this.nextRegionType;
                                const nextFrequencies = this.getChordFrequencies(this.nextRegionType);
                                if (nextFrequencies.length > 0) {
                                    this.playCycle(nextFrequencies, nextBpm, nextCycleDuration, this.nextCycleRate, this.nextPitchShift, this.nextVolume, this.nextRegionType);
                                }
                            }
                        }, cycleDuration * 1000);
                    }
                    return;
                }
            }

            const now = this.audioContext.currentTime;
            const activeSound = this.soundManager.getActiveSound();
            const targetSound = this.soundManager.getTargetSound();
            const isCrossfading = this.soundManager.getIsCrossfading();
            
            const soundsToPlay = (isCrossfading || (targetSound !== activeSound && targetSound !== null))
                ? [activeSound, targetSound]
                : [activeSound];
            
            // All zones now auto-retrigger for consistency
            // Zone 0 = 240/bpm (4 beats), Zone 1 = 120/bpm (2 beats) - will loop like other zones
            const isLongCycle = false; // Keep parameter for compatibility but all zones loop now
            
            soundsToPlay.forEach(soundNum => {
                this.createSoundGenerators(soundNum);
                const generators = this.soundManager.getGenerators(soundNum);
                if (!generators) return;
                
                const soundGain = this.soundManager.getSoundGain(
                    soundNum,
                    (soundNum === activeSound && !isCrossfading) ? 1.0 : 0.0
                );
                
                this.playSoundCycle(soundNum, generators, soundGain, frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, now, isLongCycle);
            });
            
            // All zones use setTimeout to schedule next cycle (auto-retrigger while dragging)
            // This provides consistent behavior across all zones
            
            if (!this.shouldStop && this.isPlaying) {
                const nextBpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                const nextCycleDuration = (this.nextCycleRate * 60) / (nextBpm * nextBpm);
                
                this.currentLoopTimeout = setTimeout(() => {
                    if (this.isPlaying && !this.shouldStop) {
                        this.currentCycleRate = this.nextCycleRate;
                        this.currentPitchShift = this.nextPitchShift;
                        this.currentVolume = this.nextVolume;
                        this.currentRegionType = this.nextRegionType;
                        // Get frequencies from current palette (real-time update)
                        const nextFrequencies = this.getChordFrequencies(this.nextRegionType);
                        this.playCycle(nextFrequencies, nextBpm, nextCycleDuration, this.nextCycleRate, this.nextPitchShift, this.nextVolume, this.nextRegionType);
                    } else {
                        this.isPlaying = false;
                        this.shouldStop = false;
                        this.currentRegionIndex = -1;
                        this.updateActiveRegion(-1);
                    }
                }, cycleDuration * 1000);
            } else if (this.shouldStop) {
                this.isPlaying = false;
                this.shouldStop = false;
                this.currentRegionIndex = -1;
                this.updateActiveRegion(-1);
            }
        },

        playSoundCycle: function(soundNum, generators, soundGain, frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, now, isLongCycle = false) {
            // Store cycleDuration for this cycle (needed to check if old sources should finish naturally)
            this.currentCycleDuration = cycleDuration;
            // Debug logging
            const debugId = `[Cycle-${cycleRate}-${Date.now() % 10000}]`;
            console.log(`${debugId} Starting cycle: rate=${cycleRate}, now=${now.toFixed(4)}, oldSources=${this.layer1Sources.length + this.layer2Sources.length}`);
            
            // CRITICAL FIX: Always use actual currentTime, not the stale 'now' parameter
            // When cycles retrigger quickly, 'now' can be from when setTimeout was scheduled (in the past)
            // This causes sources to start in the past, creating audio glitches
            const actualCurrentTime = this.audioContext.currentTime;
            const timeDiff = Math.abs(now - actualCurrentTime);
            
            // Use actual time if 'now' is stale (>5ms difference)
            const effectiveNow = timeDiff > 0.005 ? actualCurrentTime : now;
            
            console.log(`${debugId} Starting cycle: rate=${cycleRate}, scheduledNow=${now.toFixed(4)}, actualNow=${actualCurrentTime.toFixed(4)}, diff=${(timeDiff * 1000).toFixed(2)}ms, using=${effectiveNow.toFixed(4)}, oldSources=${this.layer1Sources.length + this.layer2Sources.length}`);
            
            // SIMPLIFIED: Don't fade out or stop old sources - let them play naturally
            // The onended callbacks will clean them up automatically
            // This prevents abrupt termination when tapping quickly
            // Just ensure we don't have too many sources accumulating (cleanup only stuck ones)
            if (this.layer1Sources.length + this.layer2Sources.length > 20) {
                // Only cleanup if we have too many sources (memory protection)
                this.cleanupFinishedSourcesOnly(debugId);
            }
            
            // Start new sources immediately (no delay needed since we're not fading out)
            // Use effectiveNow (actual time) to prevent scheduling in the past
            const startTime = effectiveNow + 0.001; // Small safety margin
            
            // Ensure startTime is not in the past (safety check)
            const safeStartTime = Math.max(startTime, actualCurrentTime + 0.001);
            
            if (safeStartTime !== startTime) {
                // Only warn if adjustment is significant (>5ms) - small adjustments are normal
                const adjustmentMs = (safeStartTime - startTime) * 1000;
                if (Math.abs(adjustmentMs) > 5) {
                    console.warn(`${debugId} Adjusted startTime by ${adjustmentMs.toFixed(2)}ms (was in past)`);
                }
            }
            
            // Reduced verbosity - only log in debug mode or for significant delays
            // console.log(`${debugId} New sources will start at: ${safeStartTime.toFixed(4)} (${((safeStartTime - effectiveNow) * 1000).toFixed(2)}ms delay from effectiveNow)`);
            
            const pitchMultiplier = this.semitonesToMultiplier(pitchShift);
            const shiftedFrequencies = frequencies.map(freq => freq * pitchMultiplier);

            const masterGain1 = this.audioContext.createGain();
            const masterGain2 = this.audioContext.createGain();
            
            masterGain1.connect(soundGain);
            masterGain2.connect(soundGain);
            
            const longCycleSources = []; // Track sources for onended callback (zone 0/1 only - but won't auto-retrigger)

            // SIMPLIFIED: Start at full volume immediately (no fade-in)
            // This prevents abrupt start issues
            masterGain1.gain.setValueAtTime(volume, safeStartTime);
            masterGain2.gain.setValueAtTime(0.0, safeStartTime);

            // Crossfade between layers (keep this for the layer transition effect)
            masterGain1.gain.linearRampToValueAtTime(0.0, safeStartTime + 0.1);
            masterGain2.gain.linearRampToValueAtTime(volume, safeStartTime + 0.1);

            // Get node pool if available (for efficient node reuse)
            const nodePool = window.AudioManager ? window.AudioManager.getNodePool() : null;

            shiftedFrequencies.forEach(freq => {
                const buffer1a = generators.layer1Gen1.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                const buffer1b = generators.layer1Gen2.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                
                // Optimized TypedArray mixing: use set() and add() for better performance
                const mixedBuffer1 = this.audioContext.createBuffer(1, buffer1a.length, this.audioContext.sampleRate);
                const channelData1 = mixedBuffer1.getChannelData(0);
                const data1a = buffer1a.getChannelData(0);
                const data1b = buffer1b.getChannelData(0);
                
                // Efficient TypedArray mixing: copy first buffer, then add second
                channelData1.set(data1a);
                for (let i = 0, len = channelData1.length; i < len; i++) {
                    channelData1[i] += data1b[i];
                }
                
                // Create new BufferSource (they are single-use, cannot be pooled)
                const source1 = this.audioContext.createBufferSource();
                source1.buffer = mixedBuffer1;
                source1.connect(masterGain1);
                
                // Debug: Log source creation
                const sourceId = `L1-${freq.toFixed(1)}Hz`;
                console.log(`${debugId} Creating ${sourceId}: bufferLength=${mixedBuffer1.length}, startTime=${safeStartTime.toFixed(4)}, volume=${volume.toFixed(2)}`);
                
                try {
                    source1.start(safeStartTime); // Start after fade-out completes (using safe time)
                    console.log(`${debugId} ${sourceId} started successfully`);
                } catch (e) {
                    console.error(`${debugId} ${sourceId} start failed:`, e);
                }
                
                this.layer1Sources.push(source1);
                this.layer1Gains.push(masterGain1);
                this.layer1StartTimes.push(safeStartTime); // Track actual start time
                
                // Track for long cycle scheduling (zone 0/1)
                if (isLongCycle) {
                    longCycleSources.push(source1);
                }
                
                // Cleanup handler: remove from array when finished to free memory
                source1.onended = () => {
                    const actualTime = this.audioContext ? this.audioContext.currentTime : 0;
                    console.log(`${debugId} ${sourceId} finished at ${actualTime.toFixed(4)}`);
                    
                    // Remove from array (prevents memory accumulation)
                    const index = this.layer1Sources.indexOf(source1);
                    if (index > -1) {
                        this.layer1Sources.splice(index, 1);
                        this.layer1Gains.splice(index, 1);
                        this.layer1StartTimes.splice(index, 1); // Remove start time too
                    }
                    
                    // Release to node pool if available
                    if (nodePool) {
                        nodePool.releaseBufferSource(source1);
                    }
                    
                    // Disconnect to free memory
                    try {
                        source1.disconnect();
                    } catch (e) {
                        // Already disconnected
                    }
                };

                const buffer2a = generators.layer2Gen1.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                const buffer2b = generators.layer2Gen2.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                
                // Optimized TypedArray mixing
                const mixedBuffer2 = this.audioContext.createBuffer(1, buffer2a.length, this.audioContext.sampleRate);
                const channelData2 = mixedBuffer2.getChannelData(0);
                const data2a = buffer2a.getChannelData(0);
                const data2b = buffer2b.getChannelData(0);
                
                // Efficient TypedArray mixing
                channelData2.set(data2a);
                for (let i = 0, len = channelData2.length; i < len; i++) {
                    channelData2[i] += data2b[i];
                }
                
                // Create new BufferSource (they are single-use, cannot be pooled)
                const source2 = this.audioContext.createBufferSource();
                source2.buffer = mixedBuffer2;
                source2.connect(masterGain2);
                
                // Debug: Log source creation
                const sourceId2 = `L2-${freq.toFixed(1)}Hz`;
                console.log(`${debugId} Creating ${sourceId2}: bufferLength=${mixedBuffer2.length}, startTime=${safeStartTime.toFixed(4)}, volume=${volume.toFixed(2)}`);
                
                try {
                    source2.start(safeStartTime); // Start after fade-out completes (using safe time)
                    console.log(`${debugId} ${sourceId2} started successfully`);
                } catch (e) {
                    console.error(`${debugId} ${sourceId2} start failed:`, e);
                }
                
                this.layer2Sources.push(source2);
                this.layer2Gains.push(masterGain2);
                this.layer2StartTimes.push(safeStartTime); // Track actual start time
                
                // Track for long cycle scheduling (zone 0/1)
                if (isLongCycle) {
                    longCycleSources.push(source2);
                }
                
                // Cleanup handler: remove from array when finished to free memory
                source2.onended = () => {
                    const actualTime = this.audioContext ? this.audioContext.currentTime : 0;
                    console.log(`${debugId} ${sourceId2} finished at ${actualTime.toFixed(4)}`);
                    
                    // Remove from array (prevents memory accumulation)
                    const index = this.layer2Sources.indexOf(source2);
                    if (index > -1) {
                        this.layer2Sources.splice(index, 1);
                        this.layer2Gains.splice(index, 1);
                        this.layer2StartTimes.splice(index, 1); // Remove start time too
                    }
                    
                    // Release to node pool if available
                    if (nodePool) {
                        nodePool.releaseBufferSource(source2);
                    }
                    
                    // Disconnect to free memory
                    try {
                        source2.disconnect();
                    } catch (e) {
                        // Already disconnected
                    }
                };
            });
            
            // All zones now auto-retrigger for consistency
            // Sources will finish naturally and be cleaned up by onended callbacks
        },
        
        /**
         * SIMPLIFIED: Only clean up sources that are already finished or very close to finishing
         * This prevents abrupt termination - sources are allowed to play naturally
         * @param {string} debugId - Debug identifier for logging
         */
        cleanupFinishedSourcesOnly: function(debugId = '') {
            if (!this.audioContext) return;
            
            const currentTime = this.audioContext.currentTime;
            
            // Only remove sources that are already finished (onended callback handles this)
            // Just clean up any sources that might be stuck in arrays
            // Don't actively stop sources - let them finish naturally
            let cleanedCount = 0;
            
            // Remove sources that are no longer in the arrays (already cleaned up by onended)
            // This is just a safety check - the onended callbacks should handle cleanup
            this.layer1Sources = this.layer1Sources.filter((source, index) => {
                try {
                    // Check if source is still valid (not already stopped)
                    // If it's been playing for more than 2 seconds, assume it's stuck and remove it
                    const startTime = this.layer1StartTimes[index];
                    if (startTime && source.buffer) {
                        const bufferDuration = source.buffer.length / this.audioContext.sampleRate;
                        const estimatedEndTime = startTime + bufferDuration;
                        const timeSinceEnd = currentTime - estimatedEndTime;
                        
                        // If source should have ended more than 100ms ago, remove it (stuck)
                        if (timeSinceEnd > 0.1) {
                            cleanedCount++;
                            try {
                                if (this.layer1Gains[index]) {
                                    this.layer1Gains[index].disconnect();
                                }
                                source.disconnect();
                            } catch (e) {
                                // Already disconnected
                            }
                            return false; // Remove from array
                        }
                    }
                    return true; // Keep in array
                } catch (e) {
                    // Source is invalid, remove it
                    cleanedCount++;
                    return false;
                }
            });
            
            // Sync arrays (remove corresponding entries)
            this.layer1Gains = this.layer1Gains.slice(0, this.layer1Sources.length);
            this.layer1StartTimes = this.layer1StartTimes.slice(0, this.layer1Sources.length);
            
            // Same for layer 2
            this.layer2Sources = this.layer2Sources.filter((source, index) => {
                try {
                    const startTime = this.layer2StartTimes[index];
                    if (startTime && source.buffer) {
                        const bufferDuration = source.buffer.length / this.audioContext.sampleRate;
                        const estimatedEndTime = startTime + bufferDuration;
                        const timeSinceEnd = currentTime - estimatedEndTime;
                        
                        if (timeSinceEnd > 0.1) {
                            cleanedCount++;
                            try {
                                if (this.layer2Gains[index]) {
                                    this.layer2Gains[index].disconnect();
                                }
                                source.disconnect();
                            } catch (e) {
                                // Already disconnected
                            }
                            return false;
                        }
                    }
                    return true;
                } catch (e) {
                    cleanedCount++;
                    return false;
                }
            });
            
            this.layer2Gains = this.layer2Gains.slice(0, this.layer2Sources.length);
            this.layer2StartTimes = this.layer2StartTimes.slice(0, this.layer2Sources.length);
            
            if (cleanedCount > 0) {
                console.log(`${debugId} Cleaned up ${cleanedCount} stuck sources`);
            }
        },
        
        /**
         * OLD METHOD - Keeping for reference but not used
         * Fade out and clean up old audio sources to prevent memory accumulation
         * Uses fade-out to avoid audio glitches (thuds/clicks) when stopping sources
         * Critical when user drags/holds - cycles retrigger and old sources accumulate
         * @param {number} now - Audio context time to use for scheduling (must match new source start time)
         * @param {number} fadeTime - Fade-out duration in seconds
         * @param {string} debugId - Debug identifier for logging
         */
        fadeOutAndCleanupOldSources_OLD: function(now, fadeTime = 0.01, debugId = '') {
            if (!this.audioContext) return;
            
            // Use actual currentTime if there's a significant difference (>10ms)
            // This prevents timing issues when cycles retrigger quickly
            const actualCurrentTime = this.audioContext.currentTime;
            const timeDiff = Math.abs(now - actualCurrentTime);
            const currentTime = timeDiff > 0.01 ? actualCurrentTime : now; // Use actual if >10ms diff
            
            if (this.layer1Sources.length > 0 || this.layer2Sources.length > 0) {
                console.log(`${debugId} Fading out old sources: L1=${this.layer1Sources.length}, L2=${this.layer2Sources.length}, now=${now.toFixed(4)}, actual=${actualCurrentTime.toFixed(4)}, diff=${(timeDiff * 1000).toFixed(2)}ms, using=${currentTime.toFixed(4)}`);
            }
            
            // Store old sources for cleanup (don't clear arrays yet - new sources will be added)
            const oldLayer1Sources = [...this.layer1Sources];
            const oldLayer2Sources = [...this.layer2Sources];
            const oldLayer1Gains = [...this.layer1Gains];
            const oldLayer2Gains = [...this.layer2Gains];
            const oldLayer1StartTimes = [...this.layer1StartTimes];
            const oldLayer2StartTimes = [...this.layer2StartTimes];
            
            let fadedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            
            // Fade out and stop old sources smoothly
            // Note: AudioBufferSourceNode doesn't have playbackState property
            // We track state by checking if source is in our array and gain value
            oldLayer1Sources.forEach((source, index) => {
                try {
                    const gain = oldLayer1Gains[index];
                    const currentGain = gain ? gain.gain.value : 0;
                    const startTime = oldLayer1StartTimes[index] || currentTime; // Use tracked start time
                    
                    // Check if source is close to finishing naturally (within 30ms of buffer end)
                    // If so, let it finish naturally instead of fading out (prevents abrupt termination)
                    let shouldFadeOut = true;
                    if (source.buffer && startTime) {
                        const bufferDuration = source.buffer.length / this.audioContext.sampleRate;
                        const estimatedEndTime = startTime + bufferDuration;
                        const timeUntilEnd = estimatedEndTime - currentTime;
                        
                        // If source will finish naturally within 30ms, let it finish (don't fade)
                        // This prevents abrupt termination when user taps quickly
                        if (timeUntilEnd > 0 && timeUntilEnd < 0.03) {
                            shouldFadeOut = false;
                            skippedCount++;
                            console.log(`${debugId} L1[${index}] will finish naturally in ${(timeUntilEnd * 1000).toFixed(2)}ms (started at ${startTime.toFixed(4)}, ends at ${estimatedEndTime.toFixed(4)}), skipping fade`);
                        }
                    }
                    
                    // Only fade out if gain is significant (> 0.01) and source won't finish soon
                    if (shouldFadeOut && gain && currentGain > 0.01) {
                        // Fade out gain node before stopping source
                        gain.gain.cancelScheduledValues(currentTime);
                        gain.gain.setValueAtTime(currentGain, currentTime);
                        gain.gain.linearRampToValueAtTime(0.001, currentTime + fadeTime);
                        
                        // Stop source after fade (use try-catch since source might already be stopped)
                        try {
                            source.stop(currentTime + fadeTime);
                            fadedCount++;
                            console.log(`${debugId} Fading out L1[${index}]: gain=${currentGain.toFixed(3)}, stopAt=${(currentTime + fadeTime).toFixed(4)}`);
                        } catch (e) {
                            // Source might already be stopped - that's okay
                            skippedCount++;
                            console.log(`${debugId} L1[${index}] already stopped, gain=${currentGain.toFixed(3)}`);
                        }
                    } else if (shouldFadeOut) {
                        // Gain is already very low or zero - just stop immediately
                        try {
                            if (gain) {
                                gain.gain.cancelScheduledValues(currentTime);
                                gain.gain.setValueAtTime(0, currentTime);
                            }
                            source.stop(currentTime);
                            skippedCount++;
                            console.log(`${debugId} Stopping L1[${index}] immediately (gain=${currentGain.toFixed(3)})`);
                        } catch (e) {
                            // Already stopped - ignore
                        }
                    }
                } catch (e) {
                    errorCount++;
                    console.error(`${debugId} L1[${index}] fade error:`, e);
                }
            });
            
            oldLayer2Sources.forEach((source, index) => {
                try {
                    const gain = oldLayer2Gains[index];
                    const currentGain = gain ? gain.gain.value : 0;
                    const startTime = oldLayer2StartTimes[index] || currentTime; // Use tracked start time
                    
                    // Check if source is close to finishing naturally (within 30ms of buffer end)
                    // If so, let it finish naturally instead of fading out (prevents abrupt termination)
                    let shouldFadeOut = true;
                    if (source.buffer && startTime) {
                        const bufferDuration = source.buffer.length / this.audioContext.sampleRate;
                        const estimatedEndTime = startTime + bufferDuration;
                        const timeUntilEnd = estimatedEndTime - currentTime;
                        
                        // If source will finish naturally within 30ms, let it finish (don't fade)
                        // This prevents abrupt termination when user taps quickly
                        if (timeUntilEnd > 0 && timeUntilEnd < 0.03) {
                            shouldFadeOut = false;
                            skippedCount++;
                            console.log(`${debugId} L2[${index}] will finish naturally in ${(timeUntilEnd * 1000).toFixed(2)}ms (started at ${startTime.toFixed(4)}, ends at ${estimatedEndTime.toFixed(4)}), skipping fade`);
                        }
                    }
                    
                    // Only fade out if gain is significant (> 0.01) and source won't finish soon
                    if (shouldFadeOut && gain && currentGain > 0.01) {
                        // Fade out gain node before stopping source
                        gain.gain.cancelScheduledValues(currentTime);
                        gain.gain.setValueAtTime(currentGain, currentTime);
                        gain.gain.linearRampToValueAtTime(0.001, currentTime + fadeTime);
                        
                        // Stop source after fade
                        try {
                            source.stop(currentTime + fadeTime);
                            fadedCount++;
                            console.log(`${debugId} Fading out L2[${index}]: gain=${currentGain.toFixed(3)}, stopAt=${(currentTime + fadeTime).toFixed(4)}`);
                        } catch (e) {
                            // Source might already be stopped - that's okay
                            skippedCount++;
                            console.log(`${debugId} L2[${index}] already stopped, gain=${currentGain.toFixed(3)}`);
                        }
                    } else if (shouldFadeOut) {
                        // Gain is already very low or zero - just stop immediately
                        try {
                            if (gain) {
                                gain.gain.cancelScheduledValues(currentTime);
                                gain.gain.setValueAtTime(0, currentTime);
                            }
                            source.stop(currentTime);
                            skippedCount++;
                            console.log(`${debugId} Stopping L2[${index}] immediately (gain=${currentGain.toFixed(3)})`);
                        } catch (e) {
                            // Already stopped - ignore
                        }
                    }
                } catch (e) {
                    errorCount++;
                    console.error(`${debugId} L2[${index}] fade error:`, e);
                }
            });
            
            if (fadedCount > 0 || skippedCount > 0 || errorCount > 0) {
                console.log(`${debugId} Cleanup summary: faded=${fadedCount}, skipped=${skippedCount}, errors=${errorCount}`);
            }
            
            // Clear the arrays now (new sources will be added in this cycle)
            this.layer1Sources = [];
            this.layer2Sources = [];
            this.layer1Gains = [];
            this.layer2Gains = [];
            this.layer1StartTimes = [];
            this.layer2StartTimes = [];
            
            // Schedule cleanup of old sources after fade completes
            setTimeout(() => {
                oldLayer1Sources.forEach((source, index) => {
                    try {
                        source.disconnect();
                        const gain = oldLayer1Gains[index];
                        if (gain) gain.disconnect();
                    } catch (e) {
                        // Already disconnected
                    }
                });
                
                oldLayer2Sources.forEach((source, index) => {
                    try {
                        source.disconnect();
                        const gain = oldLayer2Gains[index];
                        if (gain) gain.disconnect();
                    } catch (e) {
                        // Already disconnected
                    }
                });
            }, (fadeTime + 0.001) * 1000);
        },
        
        /**
         * Clean up old audio sources immediately (for stop/emergency cleanup)
         * Use fadeOutAndCleanupOldSources for normal cycle transitions
         */
        cleanupOldSources: function() {
            // Stop and disconnect all old sources immediately
            this.layer1Sources.forEach((source, index) => {
                try {
                    if (source.playbackState !== 'finished') {
                        source.stop();
                    }
                    source.disconnect();
                    const gain = this.layer1Gains[index];
                    if (gain) gain.disconnect();
                } catch (e) {
                    // Already stopped/disconnected
                }
            });
            
            this.layer2Sources.forEach((source, index) => {
                try {
                    if (source.playbackState !== 'finished') {
                        source.stop();
                    }
                    source.disconnect();
                    const gain = this.layer2Gains[index];
                    if (gain) gain.disconnect();
                } catch (e) {
                    // Already stopped/disconnected
                }
            });
            
            // Clear the arrays to free memory
            this.layer1Sources = [];
            this.layer2Sources = [];
            this.layer1Gains = [];
            this.layer2Gains = [];
            this.layer1StartTimes = [];
            this.layer2StartTimes = [];
        },

        createSoundGenerators: function(soundNum) {
            if (this.soundManager.getGenerators(soundNum)) return;
            
            const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
            const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
            if (!layer1Select || !layer2Select) return;
            
            const layerName1 = layer1Select.value;
            const layerName2 = layer2Select.value;
            const presets = window.SoundPresets;
            const layer1Preset = presets[layerName1];
            const layer2Preset = presets[layerName2];
            
            if (!layer1Preset || !layer2Preset) return;
            
            this.soundManager.createSoundGenerators(soundNum, (num) => {
                const l1 = document.getElementById(`layerSelect${num}_1`);
                const l2 = document.getElementById(`layerSelect${num}_2`);
                return l1 && l2 ? { layer1Name: l1.value, layer2Name: l2.value } : null;
            });
        },

        startPlayback: function(cycleRate, pitchShift, volume, regionType) {
            this.shouldStop = false;
            if (this.currentLoopTimeout) {
                clearTimeout(this.currentLoopTimeout);
                this.currentLoopTimeout = null;
            }
            
            this.initAudio();
            // Resume AudioContext after user gesture
            this.resumeAudioContext();
            
            this.isPlaying = true;
            this.soundManager.setPlaying(true);
            this.currentCycleRate = cycleRate;
            this.nextCycleRate = cycleRate;
            this.currentPitchShift = pitchShift;
            this.nextPitchShift = pitchShift;
            this.currentVolume = volume;
            this.nextVolume = volume;
            this.currentRegionType = regionType;
            this.nextRegionType = regionType;
            
            const activeSound = this.soundManager.getActiveSound();
            this.createSoundGenerators(activeSound);
            const soundGain = this.soundManager.getSoundGain(activeSound, 1.0);
            
            // Get frequencies from current palette (real-time update)
            const frequencies = this.getChordFrequencies(regionType);
            if (frequencies.length === 0) {
                // Palette not ready yet - wait a bit and try again, or use fallback
                console.warn('Palette not ready, will retry on next cycle');
                // Don't return - let it play with empty frequencies (will be updated on next cycle)
            }

            const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
            const cycleDuration = (cycleRate * 60) / (bpm * bpm);

            // Only start playback if we have frequencies
            if (frequencies.length > 0) {
                this.playCycle(frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, regionType);
                
                if (this.soundManager.autoManageEnabled) {
                    this.triggerAutoManageNext();
                }
            } else {
                // Retry after a short delay
                setTimeout(() => {
                    if (this.isPlaying && !this.shouldStop) {
                        const retryFrequencies = this.getChordFrequencies(regionType);
                        if (retryFrequencies.length > 0) {
                            this.playCycle(retryFrequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, regionType);
                            if (this.soundManager.autoManageEnabled) {
                                this.triggerAutoManageNext();
                            }
                        }
                    }
                }, 100);
            }
        },

        stopPlayback: function() {
            if (!this.isPlaying) return;
            
            this.shouldStop = true;
            this.soundManager.setPlaying(false);
            if (this.currentLoopTimeout) {
                clearTimeout(this.currentLoopTimeout);
                this.currentLoopTimeout = null;
            }
            
            // Clean up all sources immediately to free memory
            this.cleanupOldSources();
            
            const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
            const cycleDuration = (this.currentCycleRate * 60) / (bpm * bpm);
            
            setTimeout(() => {
                if (this.shouldStop) {
                    this.isPlaying = false;
                    this.shouldStop = false;
                    this.currentRegionIndex = -1;
                    this.updateActiveRegion(-1);
                }
            }, cycleDuration * 1000 + 100);
        },

        handlePointerDown: function(e) {
            e.preventDefault();
            
            // Resume AudioContext on user gesture
            this.resumeAudioContext();
            
            // Update panel dimensions and store base volume (only once)
            if (!this.isDragging) {
                this.updatePanelDimensions();
                if (this.masterGain && this.audioContext) {
                    this.baseVolume = this.masterGain.gain.value || 1.0;
                } else {
                    this.baseVolume = 1.0;
                }
            }
            
            this.isDragging = true;
            
            // Handle mouse or single touch
            if (e.type === 'mousedown') {
                const x = e.clientX;
                const y = e.clientY;
                this.handleTouchPoint('mouse', x, y);
            } else if (e.type === 'touchstart' && e.touches) {
                // Handle all touches for multi-touch support
                Array.from(e.touches).forEach(touch => {
                    this.handleTouchPoint(touch.identifier, touch.clientX, touch.clientY);
                });
            }
        },
        
        handleTouchPoint: function(touchId, x, y) {
            const regionIndex = this.getRegionFromX(x);
            const cycleRate = REGION_RATES[regionIndex];
            const { pitchShift, volume } = this.getPitchAndVolumeFromY(y);
            
            // Store touch info
            this.activeTouches.set(touchId, { regionIndex, x, y, pitchShift, volume });
            
            // Get first touch for playback control (region, pitch, etc.)
            const firstTouch = Array.from(this.activeTouches.values())[0];
            
            // Update master gain in real-time (only if AudioContext is running)
            // Use average volume of all touches
            if (this.masterGain && this.audioContext && this.audioContext.state === 'running') {
                const avgVolume = Array.from(this.activeTouches.values())
                    .reduce((sum, touch) => sum + touch.volume, 0) / this.activeTouches.size;
                this.masterGain.gain.setTargetAtTime(avgVolume, this.audioContext.currentTime, 0.05);
            }
            
            // Use the first touch's region for playback control
            if (this.activeTouches.size === 1) {
                // Single touch: use this touch's parameters
                this.currentRegionIndex = regionIndex;
                this.updateActiveRegion(regionIndex);
                
                // Update display immediately
                this.updateChordTypeDisplay(regionIndex);
                
                if (!this.isPlaying) {
                    this.startPlayback(cycleRate, pitchShift, volume, regionIndex);
                } else {
                    this.nextCycleRate = cycleRate;
                    this.nextPitchShift = pitchShift;
                    this.nextVolume = volume;
                    this.nextRegionType = regionIndex;
                    // Update display for next cycle
                    this.updateChordTypeDisplay(regionIndex);
                }
            } else {
                // Multi-touch: update active region and playback params based on first touch
                this.currentRegionIndex = firstTouch.regionIndex;
                this.updateActiveRegion(firstTouch.regionIndex);
                
                if (this.isPlaying) {
                    // Update playback params based on first touch
                    this.nextCycleRate = REGION_RATES[firstTouch.regionIndex];
                    this.nextPitchShift = firstTouch.pitchShift;
                    this.nextVolume = firstTouch.volume;
                    this.nextRegionType = firstTouch.regionIndex;
                    // Update display for next cycle
                    this.updateChordTypeDisplay(firstTouch.regionIndex);
                }
            }
        },

        handlePointerMove: function(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            
            // Handle mouse or touch
            if (e.type === 'mousemove') {
                this.handleTouchPoint('mouse', e.clientX, e.clientY);
            } else if (e.type === 'touchmove' && e.touches) {
                // Handle all touches for multi-touch support
                Array.from(e.touches).forEach(touch => {
                    this.handleTouchPoint(touch.identifier, touch.clientX, touch.clientY);
                });
                
                // Remove touches that are no longer active
                const activeTouchIds = new Set(Array.from(e.touches).map(t => t.identifier));
                for (const touchId of this.activeTouches.keys()) {
                    if (!activeTouchIds.has(touchId)) {
                        this.activeTouches.delete(touchId);
                    }
                }
            }
        },

        resetVolume: function() {
            // Reset volume to base volume (only if AudioContext is running)
            if (this.masterGain && this.audioContext && this.audioContext.state === 'running') {
                const baseVol = this.baseVolume || 1.0;
                this.masterGain.gain.setTargetAtTime(baseVol, this.audioContext.currentTime, 0.1);
            }
        },

        handlePointerUp: function(e) {
            e.preventDefault();
            
            // Remove the touch that ended
            if (e.type === 'mouseup') {
                this.activeTouches.delete('mouse');
            } else if (e.type === 'touchend' || e.type === 'touchcancel') {
                if (e.changedTouches) {
                    Array.from(e.changedTouches).forEach(touch => {
                        this.activeTouches.delete(touch.identifier);
                    });
                }
            }
            
            // If no touches remain, stop dragging and playback
            if (this.activeTouches.size === 0) {
                this.isDragging = false;
                this.resetVolume();
                this.stopPlayback();
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PanelIntegration.init());
    } else {
        PanelIntegration.init();
    }

    // Export to window
    window.PanelIntegration = PanelIntegration;
})();

