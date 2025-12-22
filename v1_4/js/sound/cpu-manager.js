/**
 * CPU Manager - Monitors performance and adjusts audio quality dynamically
 * to maintain smooth playback under CPU load
 */

(function() {
    'use strict';
    
    class CPUManager {
        constructor() {
            this.qualityLevel = 'high'; // 'low', 'medium', 'high'
            this.frameTimeHistory = [];
            this.maxHistorySize = 60; // Track last 60 frames (~1 second at 60fps)
            this.monitoringEnabled = false;
            this.monitoringInterval = null;
            this.qualityChangeCallback = null;
            
            // Quality presets
            this.qualityPresets = {
                high: {
                    maxHarmonics: 8,
                    autogainInterval: 150,
                    useSimplifiedSynthesis: false,
                    bufferChunkSize: null, // No chunking
                    reduceHarmonicsThreshold: 0.95,
                    sampleRate: 44100, // Full quality
                    bufferSize: 512 // Standard buffer size
                },
                medium: {
                    maxHarmonics: 5,
                    autogainInterval: 250,
                    useSimplifiedSynthesis: false,
                    bufferChunkSize: 4096, // Chunk processing
                    reduceHarmonicsThreshold: 0.85,
                    sampleRate: 32000, // Reduced sample rate (~27% CPU savings)
                    bufferSize: 256 // Smaller buffer for lower latency
                },
                low: {
                    maxHarmonics: 3,
                    autogainInterval: 400,
                    useSimplifiedSynthesis: true,
                    bufferChunkSize: 2048, // Smaller chunks
                    reduceHarmonicsThreshold: 0.75,
                    sampleRate: 22050, // Half sample rate (~50% CPU savings)
                    bufferSize: 128 // Smallest buffer for lowest latency
                }
            };
        }
        
        /**
         * Start monitoring CPU performance
         */
        startMonitoring() {
            if (this.monitoringEnabled) return;
            this.monitoringEnabled = true;
            
            let lastFrameTime = performance.now();
            
            const monitor = () => {
                if (!this.monitoringEnabled) return;
                
                const currentTime = performance.now();
                const frameTime = currentTime - lastFrameTime;
                lastFrameTime = currentTime;
                
                // Track frame times (lower is better)
                this.frameTimeHistory.push(frameTime);
                if (this.frameTimeHistory.length > this.maxHistorySize) {
                    this.frameTimeHistory.shift();
                }
                
                // Calculate average frame time
                const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
                
                // Adjust quality based on performance
                // Target: 16.67ms per frame (60fps)
                // If average exceeds thresholds, reduce quality
                if (avgFrameTime > 25 && this.qualityLevel !== 'low') {
                    // Frame time > 25ms, reduce to low quality
                    this.setQuality('low');
                } else if (avgFrameTime > 20 && this.qualityLevel === 'high') {
                    // Frame time > 20ms, reduce to medium quality
                    this.setQuality('medium');
                } else if (avgFrameTime < 15 && this.qualityLevel !== 'high') {
                    // Frame time < 15ms, can increase quality
                    if (this.qualityLevel === 'low' && avgFrameTime < 12) {
                        this.setQuality('medium');
                    } else if (this.qualityLevel === 'medium' && avgFrameTime < 12) {
                        this.setQuality('high');
                    }
                }
                
                // Schedule next check
                requestAnimationFrame(monitor);
            };
            
            requestAnimationFrame(monitor);
        }
        
        /**
         * Stop monitoring
         */
        stopMonitoring() {
            this.monitoringEnabled = false;
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
        }
        
        /**
         * Set quality level manually
         * @param {string} level - 'low', 'medium', or 'high'
         */
        setQuality(level) {
            if (!['low', 'medium', 'high'].includes(level)) return;
            if (this.qualityLevel === level) return;
            
            const oldLevel = this.qualityLevel;
            this.qualityLevel = level;
            
            // Notify callback if set
            if (this.qualityChangeCallback) {
                this.qualityChangeCallback(level, oldLevel);
            }
            
            // Notify audio manager of quality change
            if (window.AudioManager && window.AudioManager.reinitializeForQuality) {
                window.AudioManager.reinitializeForQuality();
            }
            
            // Quality change applied silently
        }
        
        /**
         * Get current quality preset
         * @returns {Object} Quality preset object
         */
        getQualityPreset() {
            return this.qualityPresets[this.qualityLevel];
        }
        
        /**
         * Get current quality level
         * @returns {string} Quality level
         */
        getQualityLevel() {
            return this.qualityLevel;
        }
        
        /**
         * Set callback for quality changes
         * @param {Function} callback - Callback function(level, oldLevel)
         */
        setQualityChangeCallback(callback) {
            this.qualityChangeCallback = callback;
        }
        
        /**
         * Get average frame time (performance metric)
         * @returns {number} Average frame time in milliseconds
         */
        getAverageFrameTime() {
            if (this.frameTimeHistory.length === 0) return 0;
            return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        }
        
        /**
         * Get current FPS estimate
         * @returns {number} Estimated FPS
         */
        getFPS() {
            const avgFrameTime = this.getAverageFrameTime();
            return avgFrameTime > 0 ? 1000 / avgFrameTime : 60;
        }
        
        /**
         * Check if CPU is under stress
         * @returns {boolean} True if CPU appears stressed
         */
        isCPUStressed() {
            const avgFrameTime = this.getAverageFrameTime();
            return avgFrameTime > 20; // > 20ms = < 50fps
        }
    }
    
    // Export singleton instance
    window.CPUManager = new CPUManager();
})();

