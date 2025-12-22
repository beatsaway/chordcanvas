/**
 * Sound Manager - Manages sound selection, crossfading, and auto-manage functionality
 */

(function() {
    'use strict';
    
    class SoundManager {
        constructor(options = {}) {
            this.numSounds = options.numSounds || 3;
            this.presets = options.presets || window.SoundPresets;
            this.audioContext = null;
            this.masterGain = null;
            this.isPlaying = false;
            
            // Sound selection state
            this.activeSound = 1; // Default to SOUND1
            this.targetSound = 1;
            this.isCrossfading = false;
            this.crossfadeStartTime = null;
            this.crossfadeDuration = 0;
            this.currentSoundGains = {};
            this.soundGenerators = {};
            
            // Auto manage state
            this.autoManageEnabled = false;
            this.autoManageMode = 'none'; // 'none', 'autoautocrossfade', 'autojump', 'autorandom'
            this.autoManageCallback = null; // Callback when auto-manage needs to trigger next sound
            this.crossfadeStartVolume = 1.0; // Starting volume of active sound when crossfade begins
            
            // Initialize sound gains and generators
            for (let i = 1; i <= this.numSounds; i++) {
                this.currentSoundGains[i] = null;
                this.soundGenerators[i] = null;
            }
        }
        
        /**
         * Initialize with audio context and master gain
         */
        initialize(audioContext, masterGain) {
            this.audioContext = audioContext;
            this.masterGain = masterGain;
        }
        
        /**
         * Set playing state
         */
        setPlaying(playing) {
            this.isPlaying = playing;
        }
        
        /**
         * Create sound generators for a specific sound number
         */
        createSoundGenerators(soundNum, getLayerValues) {
            if (this.soundGenerators[soundNum]) return; // Already created
            
            const layerValues = getLayerValues(soundNum);
            if (!layerValues) return;
            
            const { layer1Name, layer2Name } = layerValues;
            const layer1Preset = this.presets[layer1Name];
            const layer2Preset = this.presets[layer2Name];
            
            if (!layer1Preset || !layer2Preset) return;
            
            // Create generators
            const layer1Gen1 = window.createSoundGeneratorFromPreset(layer1Preset.layer1);
            const layer1Gen2 = window.createSoundGeneratorFromPreset(layer2Preset.layer1);
            const layer2Gen1 = window.createSoundGeneratorFromPreset(layer1Preset.layer2);
            const layer2Gen2 = window.createSoundGeneratorFromPreset(layer2Preset.layer2);
            
            this.soundGenerators[soundNum] = {
                layer1Gen1,
                layer1Gen2,
                layer2Gen1,
                layer2Gen2
            };
        }
        
        /**
         * Get generators for a sound
         */
        getGenerators(soundNum) {
            return this.soundGenerators[soundNum];
        }
        
        /**
         * Invalidate generators for a sound (force recreation)
         */
        invalidateGenerators(soundNum) {
            this.soundGenerators[soundNum] = null;
        }
        
        /**
         * Get sound gain node (create if needed)
         */
        getSoundGain(soundNum, initialVolume = 1.0) {
            if (!this.currentSoundGains[soundNum]) {
                const soundGain = this.audioContext.createGain();
                soundGain.gain.value = initialVolume;
                soundGain.connect(this.masterGain);
                this.currentSoundGains[soundNum] = soundGain;
            }
            return this.currentSoundGains[soundNum];
        }
        
        /**
         * Start crossfade between sounds
         * @param {number} targetSound - Target sound number
         * @param {number} bpm - Beats per minute
         * @param {Function} onComplete - Callback when crossfade completes
         * @param {number} bars - Number of bars for crossfade (1, 4, or 8). Default: 4
         */
        startCrossfade(targetSound, bpm, onComplete, bars = 4) {
            if (this.isCrossfading) return;
            if (targetSound === this.activeSound) return;
            
            this.isCrossfading = true;
            // Calculate duration: bars * 240 / bpm
            // 1 bar = 240/bpm, 4 bar = 960/bpm, 8 bar = 1920/bpm
            this.crossfadeDuration = (bars * 240) / bpm;
            this.crossfadeStartTime = this.audioContext.currentTime;
            this.targetSound = targetSound;
            
            // Ensure active sound gain exists and capture its current value
            const activeGain = this.getSoundGain(this.activeSound, 1.0);
            // Get the current value at the start time (may be scheduled, so we need to read it)
            const activeCurrentGain = activeGain.gain.value;
            // Store the starting volume for real-time calculation
            this.crossfadeStartVolume = activeCurrentGain;
            activeGain.gain.setValueAtTime(activeCurrentGain, this.crossfadeStartTime);
            activeGain.gain.linearRampToValueAtTime(0.0, this.crossfadeStartTime + this.crossfadeDuration);
            
            // Ensure target sound gain exists and starts at 0%
            const targetGain = this.getSoundGain(targetSound, 0.0);
            targetGain.gain.setValueAtTime(0.0, this.crossfadeStartTime);
            targetGain.gain.linearRampToValueAtTime(1.0, this.crossfadeStartTime + this.crossfadeDuration);
            
            // Switch active sound after crossfade completes
            setTimeout(() => {
                this.activeSound = targetSound;
                this.isCrossfading = false;
                
                if (onComplete) {
                    onComplete();
                }
            }, this.crossfadeDuration * 1000);
        }
        
        /**
         * Get current crossfade progress (0-1)
         */
        getCrossfadeProgress() {
            if (!this.isCrossfading) return null;
            const elapsed = this.audioContext.currentTime - this.crossfadeStartTime;
            return Math.min(1.0, elapsed / this.crossfadeDuration);
        }
        
        /**
         * Get volume percentage for a sound (0-100)
         * Calculates real-time volume during crossfade
         */
        getSoundVolume(soundNum) {
            // If crossfading, calculate real-time volume based on progress
            if (this.isCrossfading && this.crossfadeStartTime !== null && this.audioContext) {
                const elapsed = this.audioContext.currentTime - this.crossfadeStartTime;
                const progress = Math.min(1.0, Math.max(0, elapsed / this.crossfadeDuration));
                
                if (soundNum === this.activeSound) {
                    // Active sound fades from start volume to 0%
                    const currentVolume = this.crossfadeStartVolume * (1.0 - progress);
                    return Math.round(Math.max(0, Math.min(100, currentVolume * 100)));
                } else if (soundNum === this.targetSound) {
                    // Target sound fades from 0% to 100%
                    return Math.round(Math.max(0, Math.min(100, progress * 100)));
                } else {
                    // Other sounds not involved in crossfade
                    return 0;
                }
            }
            
            // Not crossfading - return based on gain node or active sound status
            if (this.currentSoundGains[soundNum]) {
                return Math.round(Math.max(0, Math.min(100, this.currentSoundGains[soundNum].gain.value * 100)));
            }
            
            // If no gain node exists, return 100% if it's the active sound, otherwise 0%
            if (soundNum === this.activeSound && !this.isCrossfading) {
                return 100;
            }
            return 0;
        }
        
        /**
         * Get the two remaining sounds (not the active one)
         */
        getRemainingSounds() {
            const remaining = [];
            for (let i = 1; i <= this.numSounds; i++) {
                if (i !== this.activeSound) {
                    remaining.push(i);
                }
            }
            return remaining;
        }
        
        /**
         * Set auto manage enabled
         */
        setAutoManageEnabled(enabled) {
            this.autoManageEnabled = enabled;
        }

        /**
         * Set auto manage mode
         */
        setAutoManageMode(mode) {
            this.autoManageMode = mode;
        }

        /**
         * Get auto manage mode
         */
        getAutoManageMode() {
            return this.autoManageMode;
        }
        
        /**
         * Set callback for auto manage next sound
         */
        setAutoManageCallback(callback) {
            this.autoManageCallback = callback;
        }
        
        /**
         * Trigger auto manage next sound (if enabled)
         */
        triggerAutoManageNext() {
            if (!this.autoManageEnabled || !this.isPlaying) return;
            if (this.autoManageCallback) {
                this.autoManageCallback();
            }
        }
        
        /**
         * Get active sound number
         */
        getActiveSound() {
            return this.activeSound;
        }
        
        /**
         * Get target sound number
         */
        getTargetSound() {
            return this.targetSound;
        }
        
        /**
         * Check if crossfading
         */
        getIsCrossfading() {
            return this.isCrossfading;
        }

        /**
         * Switch sound instantly without crossfade
         * @param {number} targetSound - Target sound number
         */
        switchSoundInstantly(targetSound) {
            if (targetSound === this.activeSound) return;
            
            // Cancel any ongoing crossfade
            if (this.isCrossfading) {
                // Stop the crossfade by setting final values immediately
                const activeGain = this.getSoundGain(this.activeSound, 0.0);
                const targetGain = this.getSoundGain(this.targetSound, 0.0);
                
                if (activeGain) {
                    activeGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                    activeGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);
                }
                if (targetGain) {
                    targetGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                    targetGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);
                }
                
                this.isCrossfading = false;
            }
            
            // Set old active sound to 0
            const oldActiveGain = this.getSoundGain(this.activeSound, 0.0);
            if (oldActiveGain) {
                oldActiveGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                oldActiveGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);
            }
            
            // Set new active sound to 100%
            const newActiveGain = this.getSoundGain(targetSound, 1.0);
            if (newActiveGain) {
                newActiveGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                newActiveGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
            }
            
            // Update active sound immediately
            this.activeSound = targetSound;
            this.targetSound = targetSound;
        }

        /**
         * Set active sound (for when not playing)
         * @param {number} soundNum - Sound number to set as active
         */
        setActiveSound(soundNum) {
            if (soundNum < 1 || soundNum > this.numSounds) return;
            
            // Reset all gains to 0 except the active one
            for (let i = 1; i <= this.numSounds; i++) {
                const gain = this.getSoundGain(i, i === soundNum ? 1.0 : 0.0);
                if (gain && this.audioContext) {
                    gain.gain.cancelScheduledValues(this.audioContext.currentTime);
                    gain.gain.setValueAtTime(i === soundNum ? 1.0 : 0.0, this.audioContext.currentTime);
                }
            }
            
            this.activeSound = soundNum;
            this.targetSound = soundNum;
        }
    }
    
    // Export to window
    window.SoundManager = SoundManager;
})();

