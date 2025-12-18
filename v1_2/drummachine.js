/**
 * DrumMachine - Realistic drum synthesis optimized for CPU performance
 * Based on Michael Newton's Real Drum synthesis engine
 * 
 * Usage:
 *   const drumMachine = new DrumMachine();
 *   drumMachine.playKick();
 *   drumMachine.playSnare();
 *   drumMachine.playHat(false); // false = closed, true = open
 */

class DrumMachine {
  constructor(options = {}) {
    // Use shared master AudioContext if available, otherwise create new one
    this.ctx = window.masterAudioContext || new (window.AudioContext || window.webkitAudioContext)();
    
    // Options
    this.masterVolume = options.masterVolume || 0.3;
    this.transportStart = this.ctx.currentTime;
    this.bpm = options.bpm || 120;
    
    // Pre-rendered buffers storage
    this.buffers = {
      kick: null,
      snare: null,
      clap: null,
      tomLow: null,
      tomMid: null,
      tomHi: null,
      hatClosed: null,
      hatOpen: null
    };
    
    // Initialize audio routing
    this._setupMic();
    this._setupMasterChain();
    
    // LFO phase tracking for humanization
    this.lfoBeats = 8;
    
    // Pre-render all drum sounds
    this._preRenderAllSounds();
  }

  _setupMic() {
    // Single mic setup for maximum CPU savings
    // Close mic (dry, direct) with EQ
    this.closeMic = this.ctx.createGain();
    this.closeMic.gain.value = 1.0;
    this.micEQ = this.ctx.createBiquadFilter();
    this.micEQ.type = 'highshelf';
    this.micEQ.frequency.value = 5000;
    this.micEQ.gain.value = 2.5; // Moderate EQ boost
    this.closeMic.connect(this.micEQ);
  }

  _setupMasterChain() {
    // Master gain
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    
    // Low pass filter (for live mode control)
    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 20000; // Start fully open
    this.lowPassFilter.Q.value = 1;
    
    // Subtle saturation
    this.saturator = this.ctx.createWaveShaper();
    const satCurve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      satCurve[i] = Math.tanh(x * 1.2) * 0.95;
    }
    this.saturator.curve = satCurve;
    // Reduced oversampling for better performance (2x instead of 4x)
    this.saturator.oversample = '2x';
    
    // Connect mic to master
    this.micEQ.connect(this.master);
    this.master.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.saturator);
    // Connect to destination as fallback - will be reconnected to masterCompressor in initDrumMachine if available
    this.saturator.connect(this.ctx.destination);
  }

  _routeToMics(node, pan = 0, delayOffset = 0, weights = {}) {
    const { close = 1 } = weights;
    
    // Single mic routing: direct connection to close mic
    const closeGain = this.ctx.createGain();
    closeGain.gain.value = close;
    node.connect(closeGain);
    closeGain.connect(this.closeMic);
  }

  _noiseBuffer(whiteOnly = false) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      let v = Math.random() * 2 - 1;
      if (!whiteOnly) {
        v = (v + (Math.random() * 0.4 - 0.2)) * 0.8;
      }
      data[i] = v;
    }
    return buffer;
  }

  _lfoPhase(atTime) {
    const beatPos = ((atTime - this.transportStart) * this.bpm) / 60;
    const phase = (beatPos % this.lfoBeats) / this.lfoBeats;
    return Math.sin(phase * Math.PI * 2);
  }

  // Pre-render all drum sounds to AudioBuffers
  async _preRenderAllSounds() {
    const sampleRate = this.ctx.sampleRate;
    
    // Pre-render each sound
    this.buffers.kick = await this._renderKick(sampleRate);
    this.buffers.snare = await this._renderSnare(sampleRate);
    this.buffers.clap = await this._renderClap(sampleRate);
    this.buffers.tomLow = await this._renderTom(70, 50, sampleRate);
    this.buffers.tomMid = await this._renderTom(90, 60, sampleRate);
    this.buffers.tomHi = await this._renderTom(140, 80, sampleRate);
    this.buffers.hatClosed = await this._renderHat(false, sampleRate);
    this.buffers.hatOpen = await this._renderHat(true, sampleRate);
  }

  // Helper to create noise buffer with any AudioContext
  _createNoiseBuffer(ctx, whiteOnly = false) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      let v = Math.random() * 2 - 1;
      if (!whiteOnly) {
        v = (v + (Math.random() * 0.4 - 0.2)) * 0.8;
      }
      data[i] = v;
    }
    return buffer;
  }

  // Resume audio context (required for user interaction)
  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Helper to disconnect a node after it finishes
  _disconnectAfter(node, duration) {
    const disconnectTime = this.ctx.currentTime + duration + 0.1; // Small buffer
    setTimeout(() => {
      try {
        if (node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch (e) {
        // Ignore errors if node already disconnected
      }
    }, disconnectTime * 1000);
  }

  // Helper to cleanup oscillator after it stops
  _cleanupOscillator(osc, stopTime) {
    osc.onended = () => {
      try {
        osc.disconnect();
      } catch (e) {
        // Ignore errors
      }
    };
  }

  // Helper to cleanup buffer source after it stops
  _cleanupBufferSource(src, stopTime) {
    src.onended = () => {
      try {
        src.disconnect();
      } catch (e) {
        // Ignore errors
      }
    };
  }

  // === PRE-RENDERING METHODS ===

  // Render kick drum to AudioBuffer
  async _renderKick(sampleRate) {
    const duration = 0.6; // Slightly longer than the sound
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const startTime = 0;
    const velocity = 1;
    const velScale = 1;
    const level = 0.7;
    
    // Main sub oscillator
    const osc1 = offlineCtx.createOscillator();
    osc1.type = 'sine';
    const baseFreq = 65;
    osc1.frequency.setValueAtTime(baseFreq, startTime);
    osc1.frequency.exponentialRampToValueAtTime(38, startTime + 0.35);
    
    // Mid-low punch layer
    const punchOsc = offlineCtx.createOscillator();
    punchOsc.type = 'sine';
    const punchFreq = 75;
    punchOsc.frequency.setValueAtTime(punchFreq, startTime);
    punchOsc.frequency.exponentialRampToValueAtTime(55, startTime + 0.3);
    const punchGain = offlineCtx.createGain();
    punchGain.gain.setValueAtTime(0.35, startTime);
    punchGain.gain.setValueAtTime(0.35 * 0.9, startTime + 0.01);
    punchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.48);
    
    // Harmonic layer
    const osc2 = offlineCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, startTime);
    osc2.frequency.exponentialRampToValueAtTime(38 * 2, startTime + 0.28);
    const osc2Gain = offlineCtx.createGain();
    osc2Gain.gain.setValueAtTime(0.06, startTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
    
    // Attack click
    const clickNoise = this._createNoiseBuffer(offlineCtx, true);
    const clickSrc = offlineCtx.createBufferSource();
    clickSrc.buffer = clickNoise;
    const clickFilter = offlineCtx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 3000;
    clickFilter.Q.value = 2;
    const clickGain = offlineCtx.createGain();
    clickGain.gain.setValueAtTime(0.08, startTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.01);
    
    // Punchy tonal/noise layer
    const punchToneNoise = this._createNoiseBuffer(offlineCtx, true);
    const punchToneSrc = offlineCtx.createBufferSource();
    punchToneSrc.buffer = punchToneNoise;
    const punchToneFilter = offlineCtx.createBiquadFilter();
    punchToneFilter.type = 'bandpass';
    punchToneFilter.frequency.value = 280;
    punchToneFilter.Q.value = 2.5;
    const punchToneGain = offlineCtx.createGain();
    punchToneGain.gain.setValueAtTime(0.22, startTime);
    punchToneGain.gain.setValueAtTime(0.22 * 0.9, startTime + 0.003);
    punchToneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
    
    const punchToneOsc = offlineCtx.createOscillator();
    punchToneOsc.type = 'triangle';
    punchToneOsc.frequency.setValueAtTime(280, startTime);
    punchToneOsc.frequency.exponentialRampToValueAtTime(200, startTime + 0.02);
    const punchToneOscGain = offlineCtx.createGain();
    punchToneOscGain.gain.setValueAtTime(0.18, startTime);
    punchToneOscGain.gain.setValueAtTime(0.18 * 0.85, startTime + 0.002);
    punchToneOscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.022);
    
    const punchLayerMix = offlineCtx.createGain();
    punchToneSrc.connect(punchToneFilter).connect(punchToneGain).connect(punchLayerMix);
    punchToneOsc.connect(punchToneOscGain).connect(punchLayerMix);
    
    // Natural decay envelope
    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(level, startTime);
    gain.gain.setValueAtTime(level * 0.8, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.52);
    
    osc1.connect(gain);
    punchOsc.connect(punchGain).connect(gain);
    
    const higherLayersMix = offlineCtx.createGain();
    osc2.connect(osc2Gain).connect(higherLayersMix);
    
    const clickTransientMix = offlineCtx.createGain();
    clickSrc.connect(clickFilter).connect(clickGain).connect(clickTransientMix);
    
    higherLayersMix.connect(gain);
    clickTransientMix.connect(gain);
    punchLayerMix.connect(gain);
    
    // EQ shaping
    const eqLow = offlineCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 80;
    eqLow.gain.value = 3;
    const eqPunch = offlineCtx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 95;
    eqPunch.Q.value = 1.5;
    eqPunch.gain.value = 4.5;
    const eqPresence = offlineCtx.createBiquadFilter();
    eqPresence.type = 'peaking';
    eqPresence.frequency.value = 3500;
    eqPresence.Q.value = 1.2;
    eqPresence.gain.value = 2.0;
    const eqMidCut = offlineCtx.createBiquadFilter();
    eqMidCut.type = 'peaking';
    eqMidCut.frequency.value = 600;
    eqMidCut.Q.value = 1.0;
    eqMidCut.gain.value = -5.0;
    const eqHighCut = offlineCtx.createBiquadFilter();
    eqHighCut.type = 'highshelf';
    eqHighCut.frequency.value = 2500;
    eqHighCut.gain.value = -2.5;
    const eqCut = offlineCtx.createBiquadFilter();
    eqCut.type = 'peaking';
    eqCut.frequency.value = 380;
    eqCut.Q.value = 1;
    eqCut.gain.value = -2;
    
    gain.connect(eqLow).connect(eqPunch).connect(eqPresence).connect(eqMidCut).connect(eqHighCut).connect(eqCut);
    
    // Room bleed layer (simplified - no delay for pre-rendering)
    const bleedFilter = offlineCtx.createBiquadFilter();
    bleedFilter.type = 'lowpass';
    bleedFilter.frequency.value = 2000;
    const bleedGain = offlineCtx.createGain();
    bleedGain.gain.value = 0.25;
    const bleedMix = offlineCtx.createGain();
    
    eqCut.connect(bleedMix);
    eqCut.connect(bleedFilter).connect(bleedGain).connect(bleedMix);
    
    // Connect to destination
    bleedMix.connect(offlineCtx.destination);
    
    // Start all sources
    osc1.start(startTime);
    osc1.stop(startTime + 0.52);
    punchOsc.start(startTime);
    punchOsc.stop(startTime + 0.5);
    osc2.start(startTime);
    osc2.stop(startTime + 0.48);
    clickSrc.start(startTime);
    clickSrc.stop(startTime + 0.02);
    punchToneSrc.start(startTime);
    punchToneSrc.stop(startTime + 0.03);
    punchToneOsc.start(startTime);
    punchToneOsc.stop(startTime + 0.025);
    
    return await offlineCtx.startRendering();
  }

  // === DRUM PLAYBACK METHODS (using pre-rendered buffers) ===

  playKick(velocity = 1, options = {}) {
    if (!this.buffers.kick) {
      console.warn('Kick buffer not ready yet');
      return;
    }
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.kick;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * velScale;
    
    src.connect(gain);
    this._routeToMics(gain, pan, 0, { close: 1.0 });
    
    src.start(startTime);
    src.stop(startTime + this.buffers.kick.duration);
  }

  // Render snare drum to AudioBuffer
  async _renderSnare(sampleRate) {
    const duration = 0.3;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const startTime = 0;
    const velocity = 1;
    const level = 0.75;
    
    // Noise component
    const noise = this._createNoiseBuffer(offlineCtx);
    const src = offlineCtx.createBufferSource();
    src.buffer = noise;
    const noiseFilter = offlineCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1800;
    const noiseGain = offlineCtx.createGain();
    noiseGain.gain.setValueAtTime(level, startTime);
    noiseGain.gain.setValueAtTime(level * 0.7, startTime + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    
    // Body tone
    const tone = offlineCtx.createOscillator();
    tone.type = 'triangle';
    const bodyFreq = 200;
    tone.frequency.setValueAtTime(bodyFreq, startTime);
    tone.frequency.exponentialRampToValueAtTime(120, startTime + 0.12);
    const toneGain = offlineCtx.createGain();
    toneGain.gain.setValueAtTime(0.55, startTime);
    toneGain.gain.setValueAtTime(0.55 * 0.85, startTime + 0.005);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
    
    // Harmonic layer
    const ring = offlineCtx.createOscillator();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(bodyFreq * 1.5, startTime);
    ring.frequency.exponentialRampToValueAtTime(120 * 1.5, startTime + 0.1);
    const ringGain = offlineCtx.createGain();
    ringGain.gain.setValueAtTime(0.25, startTime);
    ringGain.gain.setValueAtTime(0.25 * 0.85, startTime + 0.004);
    ringGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    
    // Additional tonal layer
    const tonal3rd = offlineCtx.createOscillator();
    tonal3rd.type = 'sine';
    tonal3rd.frequency.setValueAtTime(bodyFreq * 2.2, startTime);
    tonal3rd.frequency.exponentialRampToValueAtTime(120 * 2.2, startTime + 0.08);
    const tonal3rdGain = offlineCtx.createGain();
    tonal3rdGain.gain.setValueAtTime(0.12, startTime);
    tonal3rdGain.gain.setValueAtTime(0.12 * 0.9, startTime + 0.003);
    tonal3rdGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);
    
    // Transient crack layer
    const crackNoise = this._createNoiseBuffer(offlineCtx, true);
    const crackSrc = offlineCtx.createBufferSource();
    crackSrc.buffer = crackNoise;
    const crackFilter = offlineCtx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.value = 6000;
    crackFilter.Q.value = 2.5;
    const crackGain = offlineCtx.createGain();
    crackGain.gain.setValueAtTime(0.15, startTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.008);
    
    // Upper harmonic layer
    const bright = offlineCtx.createOscillator();
    bright.type = 'sawtooth';
    bright.frequency.setValueAtTime(bodyFreq * 3, startTime);
    bright.frequency.exponentialRampToValueAtTime(120 * 3, startTime + 0.1);
    const brightFilter = offlineCtx.createBiquadFilter();
    brightFilter.type = 'highpass';
    brightFilter.frequency.value = 3000;
    const brightGain = offlineCtx.createGain();
    brightGain.gain.setValueAtTime(0.06, startTime);
    brightGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    
    // Parallel processed "crack" layer
    const parallelNoise = this._createNoiseBuffer(offlineCtx);
    const parallelSrc = offlineCtx.createBufferSource();
    parallelSrc.buffer = parallelNoise;
    const parallelFilter = offlineCtx.createBiquadFilter();
    parallelFilter.type = 'bandpass';
    parallelFilter.frequency.value = 4500;
    parallelFilter.Q.value = 1.8;
    const parallelGain = offlineCtx.createGain();
    parallelGain.gain.setValueAtTime(0, startTime);
    parallelGain.gain.linearRampToValueAtTime(0.10, startTime + 0.001);
    parallelGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    
    src.connect(noiseFilter).connect(noiseGain);
    tone.connect(toneGain);
    ring.connect(ringGain);
    tonal3rd.connect(tonal3rdGain);
    crackSrc.connect(crackFilter).connect(crackGain);
    bright.connect(brightFilter).connect(brightGain);
    parallelSrc.connect(parallelFilter).connect(parallelGain);
    
    const mix = offlineCtx.createGain();
    noiseGain.connect(mix);
    toneGain.connect(mix);
    ringGain.connect(mix);
    tonal3rdGain.connect(mix);
    crackGain.connect(mix);
    brightGain.connect(mix);
    parallelGain.connect(mix);
    
    // EQ
    const eqPunch = offlineCtx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 180;
    eqPunch.Q.value = 1.2;
    eqPunch.gain.value = 6.0;
    const eqMidLow = offlineCtx.createBiquadFilter();
    eqMidLow.type = 'peaking';
    eqMidLow.frequency.value = 250;
    eqMidLow.Q.value = 1.0;
    eqMidLow.gain.value = 5.5;
    const eqBody = offlineCtx.createBiquadFilter();
    eqBody.type = 'peaking';
    eqBody.frequency.value = 200;
    eqBody.Q.value = 1.2;
    eqBody.gain.value = 2.5;
    const eqPresence = offlineCtx.createBiquadFilter();
    eqPresence.type = 'peaking';
    eqPresence.frequency.value = 4800;
    eqPresence.Q.value = 0.9;
    eqPresence.gain.value = 5.5;
    const eqCrack = offlineCtx.createBiquadFilter();
    eqCrack.type = 'peaking';
    eqCrack.frequency.value = 6800;
    eqCrack.Q.value = 1.5;
    eqCrack.gain.value = 1.0;
    const eqDark = offlineCtx.createBiquadFilter();
    eqDark.type = 'highshelf';
    eqDark.frequency.value = 4000;
    eqDark.gain.value = -4.0;
    
    mix.connect(eqPunch).connect(eqMidLow).connect(eqBody).connect(eqPresence).connect(eqCrack).connect(eqDark);
    eqCrack.connect(offlineCtx.destination);
    
    src.start(startTime);
    src.stop(startTime + 0.3);
    tone.start(startTime);
    tone.stop(startTime + 0.25);
    ring.start(startTime);
    ring.stop(startTime + 0.22);
    crackSrc.start(startTime);
    crackSrc.stop(startTime + 0.01);
    bright.start(startTime);
    bright.stop(startTime + 0.18);
    parallelSrc.start(startTime);
    parallelSrc.stop(startTime + 0.15);
    tonal3rd.start(startTime);
    tonal3rd.stop(startTime + 0.15);
    
    return await offlineCtx.startRendering();
  }

  playSnare(velocity = 1, options = {}) {
    if (!this.buffers.snare) {
      console.warn('Snare buffer not ready yet');
      return;
    }
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.snare;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * velScale;
    
    src.connect(gain);
    this._routeToMics(gain, pan, 0, { close: 1.0 });
    
    src.start(startTime);
    src.stop(startTime + this.buffers.snare.duration);
  }

  // Render clap to AudioBuffer
  async _renderClap(sampleRate) {
    const duration = 0.3;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const startTime = 0;
    const velocity = 1;
    const level = 0.95;
    
    const noise = this._createNoiseBuffer(offlineCtx);
    const src = offlineCtx.createBufferSource();
    src.buffer = noise;
    
    // Sharp attack snap
    const snapNoise = this._createNoiseBuffer(offlineCtx, true);
    const snapSrc = offlineCtx.createBufferSource();
    snapSrc.buffer = snapNoise;
    const snapFilter = offlineCtx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.value = 8000;
    snapFilter.Q.value = 3.0;
    const snapGain = offlineCtx.createGain();
    snapGain.gain.setValueAtTime(0.35, startTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.003);
    
    // Multiple clap layers with timing offsets
    const gain = offlineCtx.createGain();
    const times = [0, 0.015, 0.03, 0.06, 0.09];
    gain.gain.setValueAtTime(0, startTime);
    times.forEach((offset, i) => {
      const on = startTime + offset;
      const layerLevel = level * (0.9 - i * 0.1);
      gain.gain.linearRampToValueAtTime(layerLevel, on);
      gain.gain.linearRampToValueAtTime(0.0001, on + 0.02);
    });
    
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 1.2;
    
    const eqPunch = offlineCtx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 200;
    eqPunch.Q.value = 1.5;
    eqPunch.gain.value = 4.5;
    const eqBody = offlineCtx.createBiquadFilter();
    eqBody.type = 'peaking';
    eqBody.frequency.value = 1200;
    eqBody.Q.value = 1.0;
    eqBody.gain.value = 3.5;
    const eqAttack = offlineCtx.createBiquadFilter();
    eqAttack.type = 'peaking';
    eqAttack.frequency.value = 4000;
    eqAttack.Q.value = 2.0;
    eqAttack.gain.value = 4.0;
    
    src.connect(filter).connect(eqPunch).connect(eqBody).connect(eqAttack).connect(gain);
    snapSrc.connect(snapFilter).connect(snapGain);
    
    const mix = offlineCtx.createGain();
    gain.connect(mix);
    snapGain.connect(mix);
    mix.connect(offlineCtx.destination);
    
    src.start(startTime);
    src.stop(startTime + 0.3);
    snapSrc.start(startTime);
    snapSrc.stop(startTime + 0.005);
    
    return await offlineCtx.startRendering();
  }

  playClap(velocity = 1, options = {}) {
    if (!this.buffers.clap) {
      console.warn('Clap buffer not ready yet');
      return;
    }
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.clap;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * velScale;
    
    src.connect(gain);
    this._routeToMics(gain, pan, 0, { close: 1.0 });
    
    src.start(startTime);
    src.stop(startTime + this.buffers.clap.duration);
  }

  // Render tom to AudioBuffer
  async _renderTom(startFreq, endFreq, sampleRate) {
    const duration = 0.6;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const startTime = 0;
    const velocity = 1;
    const level = 0.45;
    
    // Main tone
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.4);
    
    // Harmonic
    const harmonic = offlineCtx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(startFreq * 2, startTime);
    harmonic.frequency.exponentialRampToValueAtTime(endFreq * 2, startTime + 0.35);
    const harmGain = offlineCtx.createGain();
    harmGain.gain.setValueAtTime(0.1, startTime);
    harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    
    // Punchy tonal/noise layer
    const tomPunchNoise = this._createNoiseBuffer(offlineCtx, true);
    const tomPunchSrc = offlineCtx.createBufferSource();
    tomPunchSrc.buffer = tomPunchNoise;
    const tomPunchFilter = offlineCtx.createBiquadFilter();
    tomPunchFilter.type = 'bandpass';
    const tomPunchFreq = (startFreq + endFreq) / 2 * 1.8;
    tomPunchFilter.frequency.value = Math.max(200, Math.min(800, tomPunchFreq));
    tomPunchFilter.Q.value = 2.2;
    const tomPunchGain = offlineCtx.createGain();
    tomPunchGain.gain.setValueAtTime(0.25, startTime);
    tomPunchGain.gain.setValueAtTime(0.25 * 0.88, startTime + 0.004);
    tomPunchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.028);
    
    const tomPunchTone = offlineCtx.createOscillator();
    tomPunchTone.type = 'triangle';
    const tomPunchToneFreq = (startFreq + endFreq) / 2 * 1.6;
    tomPunchTone.frequency.setValueAtTime(tomPunchToneFreq, startTime);
    tomPunchTone.frequency.exponentialRampToValueAtTime(tomPunchToneFreq * 0.85, startTime + 0.022);
    const tomPunchToneGain = offlineCtx.createGain();
    tomPunchToneGain.gain.setValueAtTime(0.2, startTime);
    tomPunchToneGain.gain.setValueAtTime(0.2 * 0.82, startTime + 0.003);
    tomPunchToneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
    
    const tomPunchMix = offlineCtx.createGain();
    tomPunchSrc.connect(tomPunchFilter).connect(tomPunchGain).connect(tomPunchMix);
    tomPunchTone.connect(tomPunchToneGain).connect(tomPunchMix);
    
    // Natural decay
    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(level, startTime);
    gain.gain.setValueAtTime(level * 0.82, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    
    // EQ
    const eqDip = offlineCtx.createBiquadFilter();
    eqDip.type = 'peaking';
    eqDip.frequency.value = 450;
    eqDip.Q.value = 1;
    eqDip.gain.value = -1.5;
    const eqAttack = offlineCtx.createBiquadFilter();
    eqAttack.type = 'peaking';
    eqAttack.frequency.value = 2500;
    eqAttack.Q.value = 0.7;
    eqAttack.gain.value = 1.5;
    
    osc.connect(gain);
    harmonic.connect(harmGain).connect(gain);
    tomPunchMix.connect(gain);
    gain.connect(eqDip).connect(eqAttack).connect(offlineCtx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.55);
    harmonic.start(startTime);
    harmonic.stop(startTime + 0.5);
    tomPunchSrc.start(startTime);
    tomPunchSrc.stop(startTime + 0.035);
    tomPunchTone.start(startTime);
    tomPunchTone.stop(startTime + 0.03);
    
    return await offlineCtx.startRendering();
  }

  playTom(startFreq, endFreq, velocity = 1, options = {}) {
    // Determine which tom buffer to use
    let buffer = null;
    if (startFreq === 70 && endFreq === 50) {
      buffer = this.buffers.tomLow;
    } else if (startFreq === 90 && endFreq === 60) {
      buffer = this.buffers.tomMid;
    } else if (startFreq === 140 && endFreq === 80) {
      buffer = this.buffers.tomHi;
    }
    
    if (!buffer) {
      console.warn('Tom buffer not ready yet');
      return;
    }
    
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * velScale;
    
    src.connect(gain);
    this._routeToMics(gain, pan, 0, { close: 1.0 });
    
    src.start(startTime);
    src.stop(startTime + buffer.duration);
  }

  // Render hat to AudioBuffer (simplified - no LFO modulations for pre-rendering)
  async _renderHat(open, sampleRate) {
    const duration = open ? 0.8 : 0.2;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const startTime = 0;
    const velocity = 1;
    const base = open ? 0.32 : 0.28;
    const level = base;
    const dur = open ? 0.7 : 0.13;
    
    // Punchy transient layer
    const punchClick = this._createNoiseBuffer(offlineCtx, true);
    const punchClickSrc = offlineCtx.createBufferSource();
    punchClickSrc.buffer = punchClick;
    const punchClickFilter = offlineCtx.createBiquadFilter();
    punchClickFilter.type = 'bandpass';
    punchClickFilter.frequency.value = 12000;
    punchClickFilter.Q.value = 3.0;
    const punchClickGain = offlineCtx.createGain();
    punchClickGain.gain.setValueAtTime(level * 0.4, startTime);
    punchClickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.005);
    
    // Noise component
    const buffer = this._createNoiseBuffer(offlineCtx, true);
    const src = offlineCtx.createBufferSource();
    src.buffer = buffer;
    
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    
    const sparkle = offlineCtx.createBiquadFilter();
    sparkle.type = 'peaking';
    sparkle.frequency.value = 10000;
    sparkle.Q.value = 0.7;
    sparkle.gain.value = 4.5;
    
    const hotBoost = offlineCtx.createBiquadFilter();
    hotBoost.type = 'highshelf';
    hotBoost.frequency.value = 12000;
    hotBoost.gain.value = 6.0;
    
    const ultraHigh = offlineCtx.createBiquadFilter();
    ultraHigh.type = 'peaking';
    ultraHigh.frequency.value = 15000;
    ultraHigh.Q.value = 1.2;
    ultraHigh.gain.value = 3.5;
    
    // Simplified tonal component (no LFO modulations)
    const basePitch = open ? 8500 : 9200;
    const tone = offlineCtx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(basePitch, startTime);
    const endPitch = basePitch * 0.92;
    tone.frequency.exponentialRampToValueAtTime(endPitch, startTime + (open ? 0.15 : 0.05));
    
    const toneFilter = offlineCtx.createBiquadFilter();
    toneFilter.type = 'bandpass';
    toneFilter.frequency.value = basePitch;
    toneFilter.Q.value = 2.5;
    
    const toneGain = offlineCtx.createGain();
    const toneLevel = open ? 0.18 : 0.20;
    toneGain.gain.setValueAtTime(toneLevel, startTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + (open ? 0.45 : 0.18));
    
    // Punchy attack envelope
    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(level * 1.15, startTime);
    gain.gain.setValueAtTime(level * 1.05, startTime + 0.001);
    gain.gain.setValueAtTime(level * 0.95, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    
    // Mix
    const noiseMix = offlineCtx.createGain();
    const toneMix = offlineCtx.createGain();
    const finalMix = offlineCtx.createGain();
    const punchMix = offlineCtx.createGain();
    
    // Simplified saturation (no oversampling for pre-rendering)
    const saturator = offlineCtx.createWaveShaper();
    const satCurve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      satCurve[i] = Math.tanh(x * 1.4) * 0.96 + Math.sign(x) * Math.abs(x) * 0.04;
    }
    saturator.curve = satCurve;
    saturator.oversample = 'none';
    
    punchClickSrc.connect(punchClickFilter).connect(punchClickGain).connect(punchMix);
    punchMix.connect(finalMix);
    src.connect(filter).connect(sparkle).connect(hotBoost).connect(ultraHigh).connect(saturator).connect(noiseMix);
    tone.connect(toneFilter).connect(toneGain).connect(toneMix);
    noiseMix.connect(finalMix);
    toneMix.connect(finalMix);
    finalMix.connect(gain);
    
    // Heat tail
    const heatTailBuffer = this._createNoiseBuffer(offlineCtx, true);
    const heatTailSrc = offlineCtx.createBufferSource();
    heatTailSrc.buffer = heatTailBuffer;
    const heatTailFilter = offlineCtx.createBiquadFilter();
    heatTailFilter.type = 'highpass';
    heatTailFilter.frequency.value = 10000;
    const heatTailSparkle = offlineCtx.createBiquadFilter();
    heatTailSparkle.type = 'peaking';
    heatTailSparkle.frequency.value = 14000;
    heatTailSparkle.Q.value = 1.0;
    heatTailSparkle.gain.value = 6.0;
    const heatTailUltra = offlineCtx.createBiquadFilter();
    heatTailUltra.type = 'highshelf';
    heatTailUltra.frequency.value = 15000;
    heatTailUltra.gain.value = 8.0;
    const heatTailGain = offlineCtx.createGain();
    const heatTailLevel = level * 0.35;
    heatTailGain.gain.setValueAtTime(heatTailLevel * 0.3, startTime);
    heatTailGain.gain.linearRampToValueAtTime(heatTailLevel, startTime + 0.01);
    const heatTailDur = dur * (open ? 1.8 : 2.5);
    heatTailGain.gain.exponentialRampToValueAtTime(0.0001, startTime + heatTailDur);
    const heatTailMix = offlineCtx.createGain();
    heatTailSrc.connect(heatTailFilter).connect(heatTailSparkle).connect(heatTailUltra).connect(heatTailGain).connect(heatTailMix);
    heatTailMix.connect(gain);
    
    gain.connect(offlineCtx.destination);
    
    punchClickSrc.start(startTime);
    punchClickSrc.stop(startTime + 0.01);
    src.start(startTime);
    src.stop(startTime + dur + 0.05);
    tone.start(startTime);
    tone.stop(startTime + (open ? 0.5 : 0.2));
    heatTailSrc.start(startTime);
    heatTailSrc.stop(startTime + heatTailDur + 0.1);
    
    return await offlineCtx.startRendering();
  }

  playHat(open = false, velocity = 1, options = {}) {
    const buffer = open ? this.buffers.hatOpen : this.buffers.hatClosed;
    if (!buffer) {
      console.warn('Hat buffer not ready yet');
      return;
    }
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.value = velocity * velScale;
    
    src.connect(gain);
    this._routeToMics(gain, pan, 0, { close: 1.0 });
    
    src.start(startTime);
    src.stop(startTime + buffer.duration);
  }

  // Convenience methods for common toms
  playTomLow(velocity = 1, options = {}) {
    this.playTom(70, 50, velocity, options);
  }

  playTomMid(velocity = 1, options = {}) {
    this.playTom(90, 60, velocity, options);
  }

  playTomHi(velocity = 1, options = {}) {
    this.playTom(140, 80, velocity, options);
  }

  playHatClosed(velocity = 1, options = {}) {
    this.playHat(false, velocity, options);
  }

  playHatOpen(velocity = 1, options = {}) {
    this.playHat(true, velocity, options);
  }

  // Set master volume
  setVolume(volume) {
    this.master.gain.value = volume;
  }

  // Set BPM (for LFO sync)
  setBPM(bpm) {
    this.bpm = bpm;
    this.transportStart = this.ctx.currentTime;
  }

  // Set low pass filter frequency (0-1 maps to ~200Hz to 20000Hz)
  setLowPass(amount) {
    // Map 0-1 to frequency range: 0 = 200Hz (very filtered), 1 = 20000Hz (no filter)
    const minFreq = 200;
    const maxFreq = 20000;
    const freq = minFreq + (maxFreq - minFreq) * amount;
    this.lowPassFilter.frequency.value = freq;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrumMachine;
}

