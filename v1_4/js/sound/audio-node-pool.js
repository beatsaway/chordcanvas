/**
 * Audio Node Pool - Reuses AudioNodes to reduce allocation overhead
 * Significantly reduces CPU usage from creating/destroying nodes
 * 
 * NOTE: AudioBufferSourceNodes are single-use and cannot be pooled.
 * Once a buffer is set and the node is started, it cannot be reused.
 * Only GainNodes and Oscillators can be pooled.
 */

(function() {
    'use strict';
    
    class AudioNodePool {
        constructor(audioContext) {
            this.audioContext = audioContext;
            
            // Pools for different node types
            this.gainNodePool = [];
            this.bufferSourcePool = [];
            this.oscillatorPool = [];
            
            // Active nodes (in use)
            this.activeGainNodes = new Set();
            this.activeBufferSources = new Set();
            this.activeOscillators = new Set();
            
            // Pool sizes
            this.maxPoolSize = 20; // Maximum nodes to keep in pool
            this.minPoolSize = 5; // Minimum nodes to keep ready
        }
        
        /**
         * Get a GainNode from pool or create new one
         * @returns {GainNode}
         */
        acquireGainNode() {
            let node;
            
            if (this.gainNodePool.length > 0) {
                // Reuse from pool
                node = this.gainNodePool.pop();
            } else {
                // Create new node
                node = this.audioContext.createGain();
            }
            
            // Reset to default state
            node.gain.cancelScheduledValues(this.audioContext.currentTime);
            node.gain.setValueAtTime(1.0, this.audioContext.currentTime);
            
            // Track as active
            this.activeGainNodes.add(node);
            
            return node;
        }
        
        /**
         * Release a GainNode back to pool
         * @param {GainNode} node
         */
        releaseGainNode(node) {
            if (!node || !this.activeGainNodes.has(node)) return;
            
            // Disconnect from all connections
            try {
                node.disconnect();
            } catch (e) {
                // Already disconnected
            }
            
            // Remove from active set
            this.activeGainNodes.delete(node);
            
            // Return to pool if not full
            if (this.gainNodePool.length < this.maxPoolSize) {
                this.gainNodePool.push(node);
            }
        }
        
        /**
         * Get a BufferSource from pool or create new one
         * NOTE: AudioBufferSourceNodes are single-use and cannot be pooled
         * This method always creates a new node for safety
         * @returns {AudioBufferSourceNode}
         */
        acquireBufferSource() {
            // AudioBufferSourceNodes are single-use - cannot be reused once buffer is set
            // Always create new node
            const node = this.audioContext.createBufferSource();
            
            // Track as active (for statistics only)
            this.activeBufferSources.add(node);
            
            return node;
        }
        
        /**
         * Release a BufferSource (cleanup only, cannot be reused)
         * @param {AudioBufferSourceNode} node
         */
        releaseBufferSource(node) {
            if (!node || !this.activeBufferSources.has(node)) return;
            
            // Stop if playing
            try {
                if (node.playbackState !== 'finished') {
                    node.stop();
                }
            } catch (e) {
                // Already stopped
            }
            
            // Disconnect
            try {
                node.disconnect();
            } catch (e) {
                // Already disconnected
            }
            
            // Remove from active set
            this.activeBufferSources.delete(node);
            
            // NOTE: Do NOT return to pool - AudioBufferSourceNodes are single-use
            // The node will be garbage collected
        }
        
        /**
         * Get an Oscillator from pool or create new one
         * @returns {OscillatorNode}
         */
        acquireOscillator() {
            let node;
            
            if (this.oscillatorPool.length > 0) {
                // Reuse from pool
                node = this.oscillatorPool.pop();
            } else {
                // Create new node
                node = this.audioContext.createOscillator();
            }
            
            // Track as active
            this.activeOscillators.add(node);
            
            return node;
        }
        
        /**
         * Release an Oscillator back to pool
         * @param {OscillatorNode} node
         */
        releaseOscillator(node) {
            if (!node || !this.activeOscillators.has(node)) return;
            
            // Stop if playing
            try {
                if (node.playbackState !== 'finished') {
                    node.stop();
                }
            } catch (e) {
                // Already stopped
            }
            
            // Disconnect
            try {
                node.disconnect();
            } catch (e) {
                // Already disconnected
            }
            
            // Remove from active set
            this.activeOscillators.delete(node);
            
            // Return to pool if not full
            if (this.oscillatorPool.length < this.maxPoolSize) {
                this.oscillatorPool.push(node);
            }
        }
        
        /**
         * Clean up all pools (call when AudioContext is closed)
         */
        cleanup() {
            // Clear all pools
            this.gainNodePool = [];
            this.bufferSourcePool = [];
            this.oscillatorPool = [];
            
            // Clear active sets
            this.activeGainNodes.clear();
            this.activeBufferSources.clear();
            this.activeOscillators.clear();
        }
        
        /**
         * Get pool statistics
         * @returns {Object} Pool stats
         */
        getStats() {
            return {
                gainNodes: {
                    pooled: this.gainNodePool.length,
                    active: this.activeGainNodes.size
                },
                bufferSources: {
                    pooled: this.bufferSourcePool.length,
                    active: this.activeBufferSources.size
                },
                oscillators: {
                    pooled: this.oscillatorPool.length,
                    active: this.activeOscillators.size
                }
            };
        }
    }
    
    // Export class
    window.AudioNodePool = AudioNodePool;
})();

