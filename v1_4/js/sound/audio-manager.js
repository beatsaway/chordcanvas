/**
 * Audio Manager - Handles Web Audio API setup, reverb, master gain, limiter, and autogain
 */

(function() {
    'use strict';
    
    class AudioManager {
        constructor() {
            this.audioContext = null;
            this.masterGain = null;
            this.reverb = null;
            this.reverbGain = null;
            this.dryGain = null;
            this.baseVolume = 0.5;
            
            // Multiband compression (for punchy sound like v1_4)
            this.multibandEnabled = true;
            this.lowSplitter = null;
            this.midSplitter = null;
            this.highSplitter = null;
            this.lowBandCompressor = null;
            this.midBandCompressor = null;
            this.highBandCompressor = null;
            this.lowMerger = null;
            this.midMerger = null;
            this.highMerger = null;
            
            // Limiter for preventing clipping and increasing loudness
            this.limiter = null;
            
            // Autogain system for consistent output volume
            this.autogainEnabled = true;
            this.autogainAnalyser = null;
            this.autogainNode = null;
            this.autogainTargetLevel = -12; // Target RMS level in dB
            this.autogainInterval = null;
        }
        
        /**
         * Create reverb impulse response buffer
         * @param {number} lengthSeconds - Duration of impulse response
         * @returns {AudioBuffer|null}
         */
        createReverbImpulse(lengthSeconds = 1.0) {
            if (!this.audioContext) return null;
            
            const sampleRate = this.audioContext.sampleRate;
            const length = sampleRate * lengthSeconds;
            const buffer = this.audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const data = buffer.getChannelData(channel);
                data[0] = 1;
                data[1] = 0.5;
                
                for (let i = 2; i < length; i++) {
                    data[i] = (data[i - 1] * 0.97) + (Math.random() * 0.02);
                    if (i % 5000 === 0) {
                        data[i] += 0.25 * Math.pow(0.8, i / 5000);
                    }
                }
            }
            return buffer;
        }
        
        /**
         * Initialize audio context and routing with limiter and autogain
         */
        initialize() {
            if (this.audioContext) return;
            
            // Get quality settings from CPU manager
            const cpuManager = window.CPUManager;
            const qualityPreset = cpuManager ? cpuManager.getQualityPreset() : null;
            const sampleRate = qualityPreset ? qualityPreset.sampleRate : 44100;
            const bufferSize = qualityPreset ? qualityPreset.bufferSize : 512;
            
            // Create AudioContext with quality-aware settings
            // Note: sampleRate option may not be supported in all browsers
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: sampleRate,
                    latencyHint: 'interactive' // Prefer low latency
                });
            } catch (e) {
                // Fallback if sampleRate option not supported
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.warn('AudioContext sampleRate option not supported, using default');
            }
            
            // Set desired buffer size (if supported)
            // Note: This is a hint and may not be honored by the browser
            if (this.audioContext.createScriptProcessor) {
                // Legacy API - not recommended but available
                console.log(`Audio buffer size hint: ${bufferSize} samples`);
            }
            
            // Create audio node pool for efficient node reuse
            if (window.AudioNodePool) {
                this.nodePool = new window.AudioNodePool(this.audioContext);
            }
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.baseVolume;
            
            // Create reverb nodes
            this.reverb = this.audioContext.createConvolver();
            this.reverbGain = this.audioContext.createGain();
            this.dryGain = this.audioContext.createGain();
            
            // Set gain values (dry signal quieter, reverb louder for wetter sound)
            this.dryGain.gain.value = 0.025;
            this.reverbGain.gain.value = 0.4;
            
            // Multiband compressor setup (for punchy sound like v1_4)
            // Set filter parameters with proper scheduling to avoid instability
            const now = this.audioContext.currentTime;
            
            this.lowSplitter = this.audioContext.createBiquadFilter();
            this.lowSplitter.type = 'lowpass';
            this.lowSplitter.frequency.setValueAtTime(500, now);
            this.lowSplitter.Q.setValueAtTime(0.707, now);
            
            this.midSplitter = this.audioContext.createBiquadFilter();
            this.midSplitter.type = 'bandpass';
            this.midSplitter.frequency.setValueAtTime(2000, now);
            this.midSplitter.Q.setValueAtTime(1.414, now);
            
            this.highSplitter = this.audioContext.createBiquadFilter();
            this.highSplitter.type = 'highpass';
            this.highSplitter.frequency.setValueAtTime(5000, now);
            this.highSplitter.Q.setValueAtTime(0.707, now);
            
            // Compressors for each band with fast attack times for punch
            this.lowBandCompressor = this.audioContext.createDynamicsCompressor();
            this.lowBandCompressor.threshold.value = -20;
            this.lowBandCompressor.knee.value = 5;
            this.lowBandCompressor.ratio.value = 4;
            this.lowBandCompressor.attack.value = 0.003; // 3ms - emphasizes low-end transients
            this.lowBandCompressor.release.value = 0.1;
            
            this.midBandCompressor = this.audioContext.createDynamicsCompressor();
            this.midBandCompressor.threshold.value = -18;
            this.midBandCompressor.knee.value = 4;
            this.midBandCompressor.ratio.value = 6;
            this.midBandCompressor.attack.value = 0.002; // 2ms - emphasizes mid-range transients
            this.midBandCompressor.release.value = 0.08;
            
            this.highBandCompressor = this.audioContext.createDynamicsCompressor();
            this.highBandCompressor.threshold.value = -16;
            this.highBandCompressor.knee.value = 3;
            this.highBandCompressor.ratio.value = 8;
            this.highBandCompressor.attack.value = 0.001; // 1ms - emphasizes high-end transients
            this.highBandCompressor.release.value = 0.05;
            
            // Merger nodes to combine compressed bands
            this.lowMerger = this.audioContext.createGain();
            this.midMerger = this.audioContext.createGain();
            this.highMerger = this.audioContext.createGain();
            
            // Create limiter (aggressive settings to prevent clipping and increase loudness)
            this.limiter = this.audioContext.createDynamicsCompressor();
            this.limiter.threshold.value = -1;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.001;
            this.limiter.release.value = 0.01;
            
            // Create autogain system
            this.autogainAnalyser = this.audioContext.createAnalyser();
            this.autogainAnalyser.fftSize = 2048;
            this.autogainAnalyser.smoothingTimeConstant = 0.8;
            
            this.autogainNode = this.audioContext.createGain();
            this.autogainNode.gain.value = 1.0; // Start at unity gain
            
            // Routing: masterGain splits to dry and reverb paths
            this.masterGain.connect(this.dryGain);
            this.masterGain.connect(this.reverb);
            this.reverb.connect(this.reverbGain);
            
            // Multiband compression on dry signal (for punchy transients)
            if (this.multibandEnabled) {
                // Split dry signal into 3 bands
                this.dryGain.connect(this.lowSplitter);
                this.dryGain.connect(this.midSplitter);
                this.dryGain.connect(this.highSplitter);
                
                // Each band goes through its compressor
                this.lowSplitter.connect(this.lowBandCompressor);
                this.midSplitter.connect(this.midBandCompressor);
                this.highSplitter.connect(this.highBandCompressor);
                
                // Compressed bands merge
                this.lowBandCompressor.connect(this.lowMerger);
                this.midBandCompressor.connect(this.midMerger);
                this.highBandCompressor.connect(this.highMerger);
                
                // Merged bands go to limiter
                this.lowMerger.connect(this.limiter);
                this.midMerger.connect(this.limiter);
                this.highMerger.connect(this.limiter);
            } else {
                // Skip multiband - connect dryGain directly to limiter
                this.dryGain.connect(this.limiter);
            }
            
            // Reverb path goes directly to limiter (bypasses multiband)
            this.reverbGain.connect(this.limiter);
            
            // Autogain chain: limiter -> autogainNode -> analyser -> destination
            if (this.autogainEnabled) {
                this.limiter.connect(this.autogainNode);
                this.autogainNode.connect(this.autogainAnalyser);
                this.autogainAnalyser.connect(this.audioContext.destination);
                
                // Start autogain monitoring
                this.startAutogain();
            } else {
                // Skip autogain - connect limiter directly to destination
                this.limiter.connect(this.audioContext.destination);
            }
            
            // Create and set reverb impulse response
            const reverbBuffer = this.createReverbImpulse(1.0);
            if (reverbBuffer) {
                this.reverb.buffer = reverbBuffer;
            }
        }
        
        /**
         * Start autogain monitoring and adjustment
         */
        startAutogain() {
            if (!this.autogainAnalyser || !this.autogainNode || !this.audioContext) return;
            
            // Clear any existing interval
            if (this.autogainInterval) {
                clearInterval(this.autogainInterval);
            }
            
            const bufferLength = this.autogainAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Get autogain interval from CPU manager (adaptive based on quality)
            const cpuManager = window.CPUManager;
            const qualityPreset = cpuManager ? cpuManager.getQualityPreset() : null;
            const autogainIntervalMs = qualityPreset ? qualityPreset.autogainInterval : 150;
            
            // Monitor and adjust gain (interval adapts to CPU load)
            this.autogainInterval = setInterval(() => {
                if (!this.autogainEnabled || !this.autogainAnalyser || !this.autogainNode || !this.audioContext) {
                    return;
                }
                
                // Only adjust if AudioContext is running (prevents filter instability)
                if (this.audioContext.state !== 'running') {
                    return;
                }
                
                // Get RMS level from analyser
                this.autogainAnalyser.getByteTimeDomainData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const normalized = (dataArray[i] - 128) / 128;
                    sum += normalized * normalized;
                }
                const rms = Math.sqrt(sum / bufferLength);
                
                // Only adjust if there's significant audio (avoid adjusting on silence)
                if (rms < 0.01) {
                    return; // Too quiet, don't adjust
                }
                
                // Convert RMS to dB (avoid log(0))
                const rmsDb = 20 * Math.log10(rms);
                
                // Calculate gain adjustment needed to reach target level
                const gainAdjustmentDb = this.autogainTargetLevel - rmsDb;
                
                // Convert dB to linear gain (clamp to reasonable range: -12dB to +6dB)
                const targetGain = Math.pow(10, gainAdjustmentDb / 20);
                const clampedGain = Math.max(0.25, Math.min(2.0, targetGain)); // -12dB to +6dB range
                
                // Smoothly adjust gain (avoid sudden jumps) - use exponential smoothing
                const currentGain = this.autogainNode.gain.value;
                // Blend 85% current, 15% target for smooth transitions
                const newGain = currentGain * 0.85 + clampedGain * 0.15;
                
                // Only update if change is significant (prevents rapid micro-adjustments)
                if (Math.abs(newGain - currentGain) < 0.001) {
                    return; // Change too small, skip update
                }
                
                const now = this.audioContext.currentTime;
                // Use longer smoothing time (0.2s) for more musical, less aggressive adjustments
                this.autogainNode.gain.setTargetAtTime(newGain, now, 0.2);
            }, autogainIntervalMs);
        }
        
        /**
         * Stop autogain monitoring
         */
        stopAutogain() {
            if (this.autogainInterval) {
                clearInterval(this.autogainInterval);
                this.autogainInterval = null;
            }
        }
        
        /**
         * Enable or disable autogain
         * @param {boolean} enabled
         */
        setAutogainEnabled(enabled) {
            this.autogainEnabled = enabled;
            if (enabled && this.audioContext) {
                this.startAutogain();
            } else {
                this.stopAutogain();
                if (this.autogainNode && this.audioContext) {
                    this.autogainNode.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.1);
                }
            }
        }
        
        /**
         * Set autogain target level
         * @param {number} targetLevelDb - Target RMS level in dB (default: -12)
         */
        setAutogainTargetLevel(targetLevelDb) {
            this.autogainTargetLevel = targetLevelDb;
        }
        
        /**
         * Get the audio context
         * @returns {AudioContext|null}
         */
        getContext() {
            return this.audioContext;
        }
        
        /**
         * Get the master gain node
         * @returns {GainNode|null}
         */
        getMasterGain() {
            return this.masterGain;
        }
        
        /**
         * Set master volume
         * @param {number} volume - Volume level (0-2.0)
         * @param {number} rampTime - Time to ramp to new volume
         */
        setVolume(volume, rampTime = 0.05) {
            if (!this.masterGain || !this.audioContext) return;
            const clampedVolume = Math.max(0.0, Math.min(2.0, volume));
            this.masterGain.gain.setTargetAtTime(clampedVolume, this.audioContext.currentTime, rampTime);
        }
        
        /**
         * Get current base volume
         * @returns {number}
         */
        getBaseVolume() {
            return this.baseVolume;
        }
        
        /**
         * Set base volume (for resetting to center)
         * @param {number} volume
         */
        setBaseVolume(volume) {
            this.baseVolume = volume;
        }
        
        /**
         * Enable or disable multiband compression
         * @param {boolean} enabled
         */
        setMultibandEnabled(enabled) {
            this.multibandEnabled = enabled;
            // Note: Requires reinitialization to take effect
        }
        
        /**
         * Get multiband compression enabled state
         * @returns {boolean}
         */
        isMultibandEnabled() {
            return this.multibandEnabled;
        }
        
        /**
         * Get audio node pool (for efficient node reuse)
         * @returns {AudioNodePool|null}
         */
        getNodePool() {
            return this.nodePool || null;
        }
        
        /**
         * Reinitialize with new quality settings (call when quality changes)
         */
        reinitializeForQuality() {
            // Note: AudioContext sampleRate cannot be changed after creation
            // This would require creating a new AudioContext, which is complex
            // For now, we'll use the initial sample rate
            // Buffer size changes would require recreating the context
            console.log('Audio quality change detected - will apply on next initialization');
        }
    }
    
    // Export singleton instance
    window.AudioManager = new AudioManager();
})();

