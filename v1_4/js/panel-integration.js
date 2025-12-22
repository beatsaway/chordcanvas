/**
 * Panel Integration
 * Integrates the sound system and test panel with the main app
 */

(function() {
    'use strict';

    // Note selection type labels (all from same palette, different note selections)
    const NOTE_SELECTION_LABELS = {
        0: 'Type 0: Lowest 3 notes',
        1: 'Type 1: Lowest 4 notes',
        2: 'Type 2: 3 lowest + 1 octave lower of 2 highest',
        3: 'Type 3: All notes from palette',
        4: 'Type 4: Exclude highest & 2 lowest',
        5: 'Type 5: Exclude 3 lowest',
        6: 'Type 6: Exclude 3 lowest + octave high 2nd'
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

        init: function() {
            // Initialize sound manager
            this.soundManager = new SoundManager({
                numSounds: 3,
                presets: window.SoundPresets
            });

            // Initialize audio
            this.initAudio();

            // Populate layer dropdowns
            this.populateLayerDropdowns();

            // Setup sound selection handlers
            this.setupSoundHandlers();

            // Setup test panel handlers
            this.setupTestPanelHandlers();

            // Setup auto manage checkbox
            this.setupAutoManage();

            // Update connection lines
            this.updateAllConnectionLines();

            // Update percentages
            this.updateSoundPercentages();

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
            [1, 2, 3].forEach(soundNum => {
                const layer1Select = document.getElementById(`layerSelect${soundNum}_1`);
                const layer2Select = document.getElementById(`layerSelect${soundNum}_2`);
                
                if (!layer1Select || !layer2Select) return;

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
                
                // Set defaults to more punchy presets (bright-piano and vintage-rhodes)
                layer1Select.value = 'bright-piano';
                layer2Select.value = 'vintage-rhodes';
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
            const checkbox = document.getElementById('autoManageCheckbox');
            if (!checkbox) return;

            // Initialize auto-manage state from checkbox (in case it's checked by default)
            const initiallyEnabled = checkbox.checked;
            this.soundManager.setAutoManageEnabled(initiallyEnabled);
            this.setSoundSelectionLocked(initiallyEnabled);

            checkbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.soundManager.setAutoManageEnabled(enabled);
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
            if (this.soundManager.autoManageEnabled) return;
            
            const activeSound = this.soundManager.getActiveSound();
            if (soundNum === activeSound && !this.soundManager.getIsCrossfading()) return;
            
            // Update visual state
            [1, 2, 3].forEach(num => {
                const output = document.getElementById(`soundOutput${num}`);
                if (output) {
                    if (num === soundNum) {
                        output.classList.add('active');
                    } else {
                        output.classList.remove('active');
                    }
                }
            });
            
            // Update percentages
            this.updateSoundPercentages();
            
            // If playing, start crossfade
            if (this.isPlaying) {
                const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
                const crossfadeBars = this.getCrossfadeSpeed();
                this.soundManager.startCrossfade(soundNum, bpm, () => {
                    this.updateSoundPercentages();
                    if (this.soundManager.autoManageEnabled && this.isPlaying) {
                        this.triggerAutoManageNext();
                    }
                }, crossfadeBars);
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

            const presetNames = Object.keys(window.SoundPresets);
            if (presetNames.length === 0) return;
            
            const random1 = presetNames[Math.floor(Math.random() * presetNames.length)];
            let random2 = presetNames[Math.floor(Math.random() * presetNames.length)];
            while (random2 === random1 && presetNames.length > 1) {
                random2 = presetNames[Math.floor(Math.random() * presetNames.length)];
            }
            
            // Set the values
            layer1Select.value = random1;
            layer2Select.value = random2;
            
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
            
            const remainingSounds = this.soundManager.getRemainingSounds();
            if (remainingSounds.length === 0) return;
            
            const randomIndex = Math.floor(Math.random() * remainingSounds.length);
            const selectedSound = remainingSounds[randomIndex];
            
            // Randomize its layers
            this.randomizeSoundLayers(selectedSound);
            
            // Update visual state
            [1, 2, 3].forEach(num => {
                const output = document.getElementById(`soundOutput${num}`);
                if (output) {
                    if (num === selectedSound) {
                        output.classList.add('active');
                    } else {
                        output.classList.remove('active');
                    }
                }
            });
            
            // Start crossfade
            const bpm = parseInt(document.getElementById('bpmInput')?.value || 120);
            const crossfadeBars = this.getCrossfadeSpeed();
            this.soundManager.startCrossfade(selectedSound, bpm, () => {
                this.updateSoundPercentages();
                if (this.soundManager.autoManageEnabled && this.isPlaying) {
                    this.triggerAutoManageNext();
                }
            }, crossfadeBars);
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

        getChordFrequencies: function(regionType) {
            // Get current palette notes from PianoVisualizer
            if (!window.PianoVisualizer) {
                console.warn('PianoVisualizer not available');
                return [];
            }
            
            const currentPaletteNotes = window.PianoVisualizer.getCurrentPaletteNotes();
            if (!currentPaletteNotes || currentPaletteNotes.length === 0) {
                // Palette not initialized yet - return empty array (will be handled gracefully)
                return [];
            }
            
            // Derive note arrays from current palette
            const noteArrays = window.PianoVisualizer.deriveNoteArraysFromPalette(currentPaletteNotes);
            
            // Get the type array based on region index (regionType is 0-6)
            const typeKey = `type${regionType || 0}`;
            const noteNames = noteArrays[typeKey] || [];
            
            // Convert note names (e.g., "C4") to frequencies
            const frequencies = [];
            noteNames.forEach(noteName => {
                // Parse note name like "C4" or "C#4"
                const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
                if (match) {
                    const note = match[1];
                    const octave = parseInt(match[2]);
                    const freq = Config.getFrequency(note, octave);
                    if (freq) {
                        frequencies.push(freq);
                    }
                }
            });
            
            return frequencies;
        },

        updateGlowPosition: function(x, y) {
            const glow = document.getElementById('panelGlow');
            const testPanel = document.getElementById('testPanel');
            if (!glow || !testPanel) return;
            
            const panelRect = testPanel.getBoundingClientRect();
            const relativeX = x - panelRect.left;
            const relativeY = y - panelRect.top;
            
            glow.style.left = relativeX + 'px';
            glow.style.top = relativeY + 'px';
            glow.classList.add('visible');
        },

        hideGlow: function() {
            const glow = document.getElementById('panelGlow');
            if (glow) {
                glow.classList.remove('visible');
            }
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
            
            soundsToPlay.forEach(soundNum => {
                this.createSoundGenerators(soundNum);
                const generators = this.soundManager.getGenerators(soundNum);
                if (!generators) return;
                
                const soundGain = this.soundManager.getSoundGain(
                    soundNum,
                    (soundNum === activeSound && !isCrossfading) ? 1.0 : 0.0
                );
                
                this.playSoundCycle(soundNum, generators, soundGain, frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, now);
            });
            
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

        playSoundCycle: function(soundNum, generators, soundGain, frequencies, bpm, cycleDuration, cycleRate, pitchShift, volume, now) {
            const pitchMultiplier = this.semitonesToMultiplier(pitchShift);
            const shiftedFrequencies = frequencies.map(freq => freq * pitchMultiplier);

            const masterGain1 = this.audioContext.createGain();
            const masterGain2 = this.audioContext.createGain();
            
            masterGain1.connect(soundGain);
            masterGain2.connect(soundGain);

            // Use full volume (removed 0.8 multiplier for more punch)
            masterGain1.gain.setValueAtTime(volume, now);
            masterGain2.gain.setValueAtTime(0.0, now);

            masterGain1.gain.linearRampToValueAtTime(0.0, now + 0.1);
            masterGain2.gain.linearRampToValueAtTime(volume, now + 0.1);

            shiftedFrequencies.forEach(freq => {
                const buffer1a = generators.layer1Gen1.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                const buffer1b = generators.layer1Gen2.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                
                const mixedBuffer1 = this.audioContext.createBuffer(1, buffer1a.length, this.audioContext.sampleRate);
                const channelData1 = mixedBuffer1.getChannelData(0);
                const data1a = buffer1a.getChannelData(0);
                const data1b = buffer1b.getChannelData(0);
                for (let i = 0; i < channelData1.length; i++) {
                    channelData1[i] = data1a[i] + data1b[i];
                }
                
                const source1 = this.audioContext.createBufferSource();
                source1.buffer = mixedBuffer1;
                source1.connect(masterGain1);
                source1.start(now);
                this.layer1Sources.push(source1);
                this.layer1Gains.push(masterGain1);

                const buffer2a = generators.layer2Gen1.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                const buffer2b = generators.layer2Gen2.generate(freq, 0.5, this.audioContext, cycleDuration, bpm, null);
                
                const mixedBuffer2 = this.audioContext.createBuffer(1, buffer2a.length, this.audioContext.sampleRate);
                const channelData2 = mixedBuffer2.getChannelData(0);
                const data2a = buffer2a.getChannelData(0);
                const data2b = buffer2b.getChannelData(0);
                for (let i = 0; i < channelData2.length; i++) {
                    channelData2[i] = data2a[i] + data2b[i];
                }
                
                const source2 = this.audioContext.createBufferSource();
                source2.buffer = mixedBuffer2;
                source2.connect(masterGain2);
                source2.start(now);
                this.layer2Sources.push(source2);
                this.layer2Gains.push(masterGain2);
            });
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
            this.isDragging = true;
            
            // Resume AudioContext on user gesture
            this.resumeAudioContext();
            
            // Update panel dimensions and store base volume
            this.updatePanelDimensions();
            if (this.masterGain && this.audioContext) {
                this.baseVolume = this.masterGain.gain.value || 1.0;
            } else {
                this.baseVolume = 1.0;
            }
            
            const x = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const y = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            
            // Show and position glow effect
            this.updateGlowPosition(x, y);
            
            const regionIndex = this.getRegionFromX(x);
            const cycleRate = REGION_RATES[regionIndex];
            const { pitchShift, volume } = this.getPitchAndVolumeFromY(y);
            
            // Update master gain in real-time (only if AudioContext is running)
            if (this.masterGain && this.audioContext && this.audioContext.state === 'running') {
                this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
            }
            
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
        },

        handlePointerMove: function(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            
            const x = e.type === 'mousemove' ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const y = e.type === 'mousemove' ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (x === null || y === null) return;
            
            // Update glow position during drag
            this.updateGlowPosition(x, y);
            
            const regionIndex = this.getRegionFromX(x);
            const cycleRate = REGION_RATES[regionIndex];
            const { pitchShift, volume } = this.getPitchAndVolumeFromY(y);
            
            // Update master gain in real-time during drag (only if AudioContext is running)
            if (this.masterGain && this.audioContext && this.audioContext.state === 'running') {
                this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.05);
            }
            
            this.updateActiveRegion(regionIndex);
            this.currentRegionIndex = regionIndex;
            this.nextCycleRate = cycleRate;
            this.nextPitchShift = pitchShift;
            this.nextVolume = volume;
            this.nextRegionType = regionIndex;
            // Update display for next cycle
            this.updateChordTypeDisplay(regionIndex);
        },

        resetVolume: function() {
            // Reset volume to base volume (only if AudioContext is running)
            if (this.masterGain && this.audioContext && this.audioContext.state === 'running') {
                const baseVol = this.baseVolume || 1.0;
                this.masterGain.gain.setTargetAtTime(baseVol, this.audioContext.currentTime, 0.1);
            }
        },

        handlePointerUp: function(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            
            this.isDragging = false;
            this.hideGlow();
            this.resetVolume();
            this.stopPlayback();
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

