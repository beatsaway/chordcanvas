/**
 * Sound Generator - Combines SynthMethod, HarmonicContent, and EnvelopeShape
 * to generate complete audio buffers
 */

(function() {
    'use strict';
    
    class SoundGenerator {
        constructor(synthMethod, harmonicContent, envelopeShape, harmonicModulation = null) {
            this.synthMethod = synthMethod;
            this.harmonicContent = harmonicContent;
            this.envelopeShape = envelopeShape;
            this.harmonicModulation = harmonicModulation || new window.HarmonicModulations.None();
        }
        
        // Static buffer cache to avoid regenerating identical buffers
        static bufferCache = new Map();
        static maxCacheSize = 150; // Increased cache size for better CPU savings (memory is cheap)
        static cacheHits = 0;
        static cacheMisses = 0;
        
        // Custom beat multipliers (set via setBeatMultipliers)
        static customBeatMultipliers = null;
        
        // CPU-aware quality settings
        static qualityOverride = null; // Can be set to 'low', 'medium', 'high' to override CPU manager
        
        // Static method to set custom beat multipliers
        static setBeatMultipliers(multipliers) {
            if (Array.isArray(multipliers) && multipliers.length === 7) {
                SoundGenerator.customBeatMultipliers = multipliers;
            }
        }
        
        // Static method to get beat multipliers (custom or default)
        static getBeatMultipliers() {
            return SoundGenerator.customBeatMultipliers || [4.0, 2.0, 1.0, 2/3, 1/3, 0.25, 1/6];
        }
        
        /**
         * Generate cache key for this generator configuration
         */
        getCacheKey(frequency, bpm = null, xRegion = null) {
            // Round frequency to 2 decimal places for cache efficiency
            const freqKey = frequency.toFixed(2);
            // Include BPM in cache key if provided (different BPMs = different loop points)
            const bpmKey = bpm !== null ? `-bpm${Math.round(bpm)}` : '';
            // Include X region in cache key (0-6 discrete regions)
            const regionKey = xRegion !== null ? `-r${Math.round(xRegion)}` : '';
            return `${this.synthMethod.name}-${this.harmonicContent.name}-${this.envelopeShape.name}-${this.harmonicModulation.name}-${freqKey}${bpmKey}${regionKey}`;
        }
        
        /**
         * Calculate musical duration based on BPM and X region
         * @param {number} bpm - Beats per minute (null = use default)
         * @param {number} xRegion - X region 0-6 (0=240/bpm, 1=120/bpm, 2=60/bpm, 3=40/bpm, 4=20/bpm, 5=15/bpm, 6=10/bpm)
         * @returns {number} Duration in seconds
         */
        static calculateMusicalDuration(bpm, xRegion = null) {
            if (!bpm || bpm <= 0) {
                return 0.5; // Default 0.5s if no BPM
            }
            
            // Default to center region (3 = 40/bpm) if not specified
            const region = xRegion !== null ? Math.max(0, Math.min(6, Math.round(xRegion))) : 3;
            
            // 7 discrete regions with specific BPM multipliers:
            // Region 0: 240/bpm = 4 beats
            // Region 1: 120/bpm = 2 beats
            // Region 2: 60/bpm = 1 beat
            // Region 3: 40/bpm = 2/3 beats ≈ 0.667 beats
            // Region 4: 20/bpm = 1/3 beats ≈ 0.333 beats
            // Region 5: 15/bpm = 0.25 beats
            // Region 6: 10/bpm = 1/6 beats ≈ 0.167 beats
            // Use custom multipliers if set, otherwise use defaults
            const beatMultipliers = SoundGenerator.getBeatMultipliers();
            const multiplier = beatMultipliers[region];
            
            const beatDuration = 60 / bpm; // Duration of one beat in seconds
            return beatDuration * multiplier;
        }
        
        /**
         * Generate a complete audio buffer
         * @param {number} frequency - Frequency in Hz
         * @param {number} volume - Volume (0-1)
         * @param {AudioContext} audioContext - Web Audio API context
         * @param {number} duration - Duration in seconds (if null, calculated from BPM and X region)
         * @param {number} bpm - Beats per minute (for BPM-synced looping, null = use default 0.5s)
         * @param {number} xRegion - X region 0-6 for manual trigger (0=240/bpm, 1=120/bpm, 2=60/bpm, 3=30/bpm, 4=20/bpm, 5=15/bpm, 6=10/bpm)
         * @returns {AudioBuffer}
         */
        generate(frequency, volume = 1.0, audioContext, duration = null, bpm = null, xRegion = null) {
            if (!audioContext) {
                throw new Error('AudioContext is not initialized. Please close the welcome popup first.');
            }
            
            // Calculate duration from BPM and X region if not provided
            if (duration === null) {
                duration = SoundGenerator.calculateMusicalDuration(bpm, xRegion);
            }
            
            // Check cache first (huge CPU savings for repeated notes)
            const cacheKey = this.getCacheKey(frequency, bpm, xRegion);
            if (SoundGenerator.bufferCache.has(cacheKey)) {
                SoundGenerator.cacheHits++;
                const cachedBuffer = SoundGenerator.bufferCache.get(cacheKey);
                // Clone buffer (required - AudioBuffers can't be reused)
                const cloned = audioContext.createBuffer(1, cachedBuffer.length, cachedBuffer.sampleRate);
                cloned.getChannelData(0).set(cachedBuffer.getChannelData(0));
                return cloned;
            }
            SoundGenerator.cacheMisses++;
            
            const sampleRate = audioContext.sampleRate;
            const numSamples = Math.round(sampleRate * duration);
            const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
            const channelData = buffer.getChannelData(0);
            
            // Pre-compute envelope curve (avoid recalculating every sample)
            const envelopeCurve = new Float32Array(numSamples);
            for (let i = 0; i < numSamples; i++) {
                envelopeCurve[i] = this.envelopeShape.getEnvelope(i / sampleRate);
            }
            
            // Get harmonics from harmonic content (with CPU-aware quality limits)
            let harmonics = this.harmonicContent.getHarmonics(frequency, numSamples, sampleRate);
            
            // Apply CPU quality limits to harmonics
            const cpuManager = window.CPUManager;
            if (cpuManager) {
                const qualityPreset = cpuManager.getQualityPreset();
                const maxHarmonics = qualityPreset.maxHarmonics;
                
                // Limit harmonics if we have too many
                if (harmonics.length > maxHarmonics) {
                    // Keep fundamental and most important harmonics
                    harmonics = harmonics.slice(0, maxHarmonics);
                }
            }
            
            // Special handling for Physical Modeling (needs sample-by-sample processing)
            const isPhysicalModeling = this.synthMethod.name === 'Physical Modeling';
            
            // Pre-check if modulation is None (skip expensive calls if so)
            const hasModulation = this.harmonicModulation.name !== 'None';
            
            // Get CPU quality settings for chunked processing if needed
            const qualityPreset = cpuManager ? cpuManager.getQualityPreset() : null;
            const chunkSize = qualityPreset && qualityPreset.bufferChunkSize ? qualityPreset.bufferChunkSize : null;
            
            // Generate samples (with optional chunking for CPU management)
            if (chunkSize && numSamples > chunkSize) {
                // Process in chunks to avoid blocking main thread
                for (let chunkStart = 0; chunkStart < numSamples; chunkStart += chunkSize) {
                    const chunkEnd = Math.min(chunkStart + chunkSize, numSamples);
                    this.generateSamplesChunk(channelData, envelopeCurve, harmonics, frequency, volume, sampleRate, duration, chunkStart, chunkEnd, isPhysicalModeling, hasModulation);
                }
            } else {
                // Process all samples at once (normal case)
                this.generateSamplesChunk(channelData, envelopeCurve, harmonics, frequency, volume, sampleRate, duration, 0, numSamples, isPhysicalModeling, hasModulation);
            }
            
            // Cache the buffer (limit cache size to prevent memory issues)
            if (SoundGenerator.bufferCache.size < SoundGenerator.maxCacheSize) {
                SoundGenerator.bufferCache.set(cacheKey, buffer);
            } else {
                // If cache is full, clear oldest entries (simple FIFO)
                const firstKey = SoundGenerator.bufferCache.keys().next().value;
                SoundGenerator.bufferCache.delete(firstKey);
                SoundGenerator.bufferCache.set(cacheKey, buffer);
            }
            
            return buffer;
        }
        
        /**
         * Generate a chunk of samples (helper method for chunked processing)
         * Optimized with TypedArray operations and pre-computed constants
         * @private
         */
        generateSamplesChunk(channelData, envelopeCurve, harmonics, frequency, volume, sampleRate, duration, startIndex, endIndex, isPhysicalModeling, hasModulation) {
            // Pre-compute constants outside loop for better performance
            const TWO_PI = 2 * Math.PI;
            const invSampleRate = 1 / sampleRate;
            const volumeScale = volume * 0.25; // Scale to prevent clipping
            const isAdditive = this.synthMethod.name === 'Additive';
            
            // Pre-compute harmonic frequencies and amplitudes if not physical modeling
            let harmonicData = null;
            if (!isPhysicalModeling && harmonics.length > 0) {
                harmonicData = harmonics.map(h => ({
                    baseFreq: h.freq,
                    amp: h.amp,
                    isFundamental: h.freq === frequency
                }));
            }
            
            for (let i = startIndex; i < endIndex; i++) {
                const t = i * invSampleRate; // Multiply is faster than divide
                let sample = 0;
                
                // Get frequency modulation (for vibrato effects) - skip if None
                const freqMod = hasModulation ? this.harmonicModulation.getFrequencyModulation(t, {}) : 1.0;
                const modulatedFreq = frequency * freqMod;
                
                if (isPhysicalModeling) {
                    // Physical modeling: use base frequency for delay line, apply vibrato via fractional delay
                    // Initialize on first sample with BASE frequency (not modulated)
                    if (i === 0) {
                        this.synthMethod.initializeDelayLine(frequency, sampleRate, {
                            decay: 0.998,
                            lowpass: 0.5
                        });
                    }
                    // Generate with base frequency, but pass frequency modulation for vibrato
                    sample = this.synthMethod.generate(frequency, t, {
                        sampleRate: sampleRate,
                        baseFrequency: frequency, // Base frequency for delay line
                        frequencyModulation: freqMod, // Frequency modulation ratio for vibrato
                        decay: 0.998,
                        lowpass: 0.5
                    });
                } else {
                    // Generate base waveform from synth method with modulated frequency
                    const baseSample = this.synthMethod.generate(modulatedFreq, t, {
                        sampleRate: sampleRate,
                        modulatorRatio: 1.5,
                        modulationIndex: 2.0,
                        waveform: 'sawtooth',
                        cutoff: 2000,
                        resonance: 0.5
                    });
                    
                    // Add harmonics if using additive synthesis
                    if (harmonicData && isAdditive) {
                        // For additive, use harmonics directly with frequency modulation
                        // Optimized: pre-computed harmonic data, single loop
                        for (let j = 0, len = harmonicData.length; j < len; j++) {
                            const h = harmonicData[j];
                            const modHarmonicFreq = h.baseFreq * freqMod;
                            // Skip expensive modulation calculation if None
                            const harmonicAmp = hasModulation ? 
                                this.harmonicModulation.getHarmonicAmplitude(h.baseFreq, frequency, t, duration, {}) : 
                                1.0;
                            // Use pre-computed TWO_PI constant
                            sample += Math.sin(TWO_PI * modHarmonicFreq * t) * h.amp * harmonicAmp;
                        }
                    } else if (harmonicData && harmonicData.length > 1) {
                        // For other methods, add harmonics as additional content
                        sample = baseSample;
                        // Optimized: skip fundamental check, use pre-computed data
                        for (let j = 0, len = harmonicData.length; j < len; j++) {
                            const h = harmonicData[j];
                            if (!h.isFundamental) { // Don't duplicate fundamental
                                const modHarmonicFreq = h.baseFreq * freqMod;
                                // Skip expensive modulation calculation if None
                                const harmonicAmp = hasModulation ? 
                                    this.harmonicModulation.getHarmonicAmplitude(h.baseFreq, frequency, t, duration, {}) : 
                                    1.0;
                                // Use pre-computed TWO_PI constant
                                sample += Math.sin(TWO_PI * modHarmonicFreq * t) * h.amp * 0.3 * harmonicAmp;
                            }
                        }
                    } else {
                        // Simple case - just the base
                        sample = baseSample;
                    }
                }
                
                // Apply pre-computed envelope (much faster than calling getEnvelope every sample)
                sample *= envelopeCurve[i];
                
                // Apply amplitude modulation (for tremolo effects) - skip if None
                const ampMod = hasModulation ? this.harmonicModulation.getAmplitudeModulation(t, {}) : 1.0;
                sample *= ampMod;
                
                // Apply volume (use pre-computed volume scale)
                channelData[i] = sample * volumeScale;
            }
        }
        
        /**
         * Get description of this sound combination
         */
        getDescription() {
            const modName = this.harmonicModulation.name !== 'None' ? ` + ${this.harmonicModulation.name}` : '';
            return `${this.synthMethod.name} + ${this.harmonicContent.name} + ${this.envelopeShape.name}${modName}`;
        }
    }
    
    // Export to window
    window.SoundGenerator = SoundGenerator;
})();

