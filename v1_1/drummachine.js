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
    
    // Initialize audio routing
    this._setupMic();
    this._setupMasterChain();
    
    // LFO phase tracking for humanization
    this.lfoBeats = 8;
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

  // === DRUM SYNTHESIS METHODS ===

  playKick(velocity = 1, options = {}) {
    this.resume();
    // Ensure audio context is running
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    const level = 0.7 * velocity * velScale;
    
    // Main sub oscillator
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    const baseFreq = 65 + (velScale - 1) * 3;
    osc1.frequency.setValueAtTime(baseFreq, startTime);
    osc1.frequency.exponentialRampToValueAtTime(38, startTime + 0.35);
    
    // Mid-low punch layer
    const punchOsc = this.ctx.createOscillator();
    punchOsc.type = 'sine';
    const punchFreq = 75 + (velScale - 1) * 2;
    punchOsc.frequency.setValueAtTime(punchFreq, startTime);
    punchOsc.frequency.exponentialRampToValueAtTime(55, startTime + 0.3);
    const punchGain = this.ctx.createGain();
    punchGain.gain.setValueAtTime(0.35 * velocity, startTime);
    punchGain.gain.setValueAtTime(0.35 * velocity * 0.9, startTime + 0.01);
    punchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.48);
    
    // Harmonic layer
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, startTime);
    osc2.frequency.exponentialRampToValueAtTime(38 * 2, startTime + 0.28);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.06 * velocity, startTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
    
    // Attack click
    const clickNoise = this._noiseBuffer(true);
    const clickSrc = this.ctx.createBufferSource();
    clickSrc.buffer = clickNoise;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 3000;
    clickFilter.Q.value = 2;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.08 * velocity, startTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.01);
    
    // Punchy tonal/noise layer
    const punchToneNoise = this._noiseBuffer(true);
    const punchToneSrc = this.ctx.createBufferSource();
    punchToneSrc.buffer = punchToneNoise;
    const punchToneFilter = this.ctx.createBiquadFilter();
    punchToneFilter.type = 'bandpass';
    punchToneFilter.frequency.value = 280;
    punchToneFilter.Q.value = 2.5;
    const punchToneGain = this.ctx.createGain();
    punchToneGain.gain.setValueAtTime(0.22 * velocity, startTime);
    punchToneGain.gain.setValueAtTime(0.22 * velocity * 0.9, startTime + 0.003);
    punchToneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
    
    const punchToneOsc = this.ctx.createOscillator();
    punchToneOsc.type = 'triangle';
    punchToneOsc.frequency.setValueAtTime(280 + (velScale - 1) * 15, startTime);
    punchToneOsc.frequency.exponentialRampToValueAtTime(200, startTime + 0.02);
    const punchToneOscGain = this.ctx.createGain();
    punchToneOscGain.gain.setValueAtTime(0.18 * velocity, startTime);
    punchToneOscGain.gain.setValueAtTime(0.18 * velocity * 0.85, startTime + 0.002);
    punchToneOscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.022);
    
    const punchLayerMix = this.ctx.createGain();
    punchLayerMix.gain.value = 1.0;
    punchToneSrc.connect(punchToneFilter).connect(punchToneGain).connect(punchLayerMix);
    punchToneOsc.connect(punchToneOscGain).connect(punchLayerMix);
    this._routeToMics(punchLayerMix, pan, 0.0005, { close: 0.7, overhead: 1.1, room: 2.1 });
    
    punchToneSrc.start(startTime);
    punchToneSrc.stop(startTime + 0.03);
    punchToneOsc.start(startTime);
    punchToneOsc.stop(startTime + 0.025);
    
    // Natural decay envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, startTime);
    gain.gain.setValueAtTime(level * 0.8, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.52);
    
    osc1.connect(gain);
    punchOsc.connect(punchGain).connect(gain);
    
    const higherLayersMix = this.ctx.createGain();
    higherLayersMix.gain.value = 1.0;
    osc2.connect(osc2Gain).connect(higherLayersMix);
    
    const clickTransientMix = this.ctx.createGain();
    clickTransientMix.gain.value = 1.0;
    clickSrc.connect(clickFilter).connect(clickGain).connect(clickTransientMix);
    
    this._routeToMics(higherLayersMix, pan, 0.0005, { close: 0.6, overhead: 1.0, room: 2.0 });
    this._routeToMics(clickTransientMix, pan, 0.0005, { close: 0.5, overhead: 0.9, room: 2.2 });
    
    higherLayersMix.connect(gain);
    clickTransientMix.connect(gain);
    punchLayerMix.connect(gain);
    
    // EQ shaping
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 80;
    eqLow.gain.value = 3;
    const eqPunch = this.ctx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 95;
    eqPunch.Q.value = 1.5;
    eqPunch.gain.value = 4.5;
    const eqPresence = this.ctx.createBiquadFilter();
    eqPresence.type = 'peaking';
    eqPresence.frequency.value = 3500;
    eqPresence.Q.value = 1.2;
    eqPresence.gain.value = 2.0;
    const eqMidCut = this.ctx.createBiquadFilter();
    eqMidCut.type = 'peaking';
    eqMidCut.frequency.value = 600;
    eqMidCut.Q.value = 1.0;
    eqMidCut.gain.value = -5.0;
    const eqHighCut = this.ctx.createBiquadFilter();
    eqHighCut.type = 'highshelf';
    eqHighCut.frequency.value = 2500;
    eqHighCut.gain.value = -2.5;
    const eqCut = this.ctx.createBiquadFilter();
    eqCut.type = 'peaking';
    eqCut.frequency.value = 380;
    eqCut.Q.value = 1;
    eqCut.gain.value = -2;
    
    gain.connect(eqLow).connect(eqPunch).connect(eqPresence).connect(eqMidCut).connect(eqHighCut).connect(eqCut);
    
    // Room bleed layer
    const bleedDelay = this.ctx.createDelay(0.02);
    bleedDelay.delayTime.value = 0.008;
    const bleedFilter = this.ctx.createBiquadFilter();
    bleedFilter.type = 'lowpass';
    bleedFilter.frequency.value = 2000;
    const bleedGain = this.ctx.createGain();
    bleedGain.gain.value = 0.25;
    const bleedMix = this.ctx.createGain();
    bleedMix.gain.value = 1.0;
    
    eqCut.connect(bleedMix);
    eqCut.connect(bleedDelay);
    bleedDelay.connect(bleedFilter).connect(bleedGain).connect(bleedMix);
    this._routeToMics(bleedMix, pan, 0.0005, { close: 1.1, overhead: 1.25, room: 1.15 });
    
    // Cleanup handlers
    this._cleanupOscillator(osc1, startTime + 0.52);
    this._cleanupOscillator(punchOsc, startTime + 0.5);
    this._cleanupOscillator(osc2, startTime + 0.48);
    this._cleanupOscillator(punchToneOsc, startTime + 0.025);
    this._cleanupBufferSource(clickSrc, startTime + 0.02);
    this._cleanupBufferSource(punchToneSrc, startTime + 0.03);
    
    osc1.start(startTime);
    osc1.stop(startTime + 0.52);
    punchOsc.start(startTime);
    punchOsc.stop(startTime + 0.5);
    osc2.start(startTime);
    osc2.stop(startTime + 0.48);
    clickSrc.start(startTime);
    clickSrc.stop(startTime + 0.02);
  }

  playSnare(velocity = 1, options = {}) {
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    const level = 0.75 * velocity * velScale;
    
    // Noise component
    const noise = this._noiseBuffer();
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1800;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(level, startTime);
    noiseGain.gain.setValueAtTime(level * 0.7, startTime + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    
    // Body tone
    const tone = this.ctx.createOscillator();
    tone.type = 'triangle';
    const bodyFreq = 200 + (velScale - 1) * 10;
    tone.frequency.setValueAtTime(bodyFreq, startTime);
    tone.frequency.exponentialRampToValueAtTime(120, startTime + 0.12);
    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(0.55 * velocity, startTime);
    toneGain.gain.setValueAtTime(0.55 * velocity * 0.85, startTime + 0.005);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
    
    // Harmonic layer
    const ring = this.ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(bodyFreq * 1.5, startTime);
    ring.frequency.exponentialRampToValueAtTime(120 * 1.5, startTime + 0.1);
    const ringGain = this.ctx.createGain();
    ringGain.gain.setValueAtTime(0.25 * velocity, startTime);
    ringGain.gain.setValueAtTime(0.25 * velocity * 0.85, startTime + 0.004);
    ringGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    
    // Additional tonal layer
    const tonal3rd = this.ctx.createOscillator();
    tonal3rd.type = 'sine';
    tonal3rd.frequency.setValueAtTime(bodyFreq * 2.2, startTime);
    tonal3rd.frequency.exponentialRampToValueAtTime(120 * 2.2, startTime + 0.08);
    const tonal3rdGain = this.ctx.createGain();
    tonal3rdGain.gain.setValueAtTime(0.12 * velocity, startTime);
    tonal3rdGain.gain.setValueAtTime(0.12 * velocity * 0.9, startTime + 0.003);
    tonal3rdGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);
    
    // Transient crack layer
    const crackNoise = this._noiseBuffer(true);
    const crackSrc = this.ctx.createBufferSource();
    crackSrc.buffer = crackNoise;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.value = 6000;
    crackFilter.Q.value = 2.5;
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.15 * velocity, startTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.008);
    
    // Upper harmonic layer
    const bright = this.ctx.createOscillator();
    bright.type = 'sawtooth';
    bright.frequency.setValueAtTime(bodyFreq * 3, startTime);
    bright.frequency.exponentialRampToValueAtTime(120 * 3, startTime + 0.1);
    const brightFilter = this.ctx.createBiquadFilter();
    brightFilter.type = 'highpass';
    brightFilter.frequency.value = 3000;
    const brightGain = this.ctx.createGain();
    brightGain.gain.setValueAtTime(0.06 * velocity, startTime);
    brightGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    
    // Parallel processed "crack" layer
    const parallelNoise = this._noiseBuffer();
    const parallelSrc = this.ctx.createBufferSource();
    parallelSrc.buffer = parallelNoise;
    const parallelFilter = this.ctx.createBiquadFilter();
    parallelFilter.type = 'bandpass';
    parallelFilter.frequency.value = 4500;
    parallelFilter.Q.value = 1.8;
    const parallelGain = this.ctx.createGain();
    parallelGain.gain.setValueAtTime(0, startTime);
    parallelGain.gain.linearRampToValueAtTime(0.10 * velocity, startTime + 0.001);
    parallelGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    
    src.connect(noiseFilter).connect(noiseGain);
    tone.connect(toneGain);
    ring.connect(ringGain);
    tonal3rd.connect(tonal3rdGain);
    crackSrc.connect(crackFilter).connect(crackGain);
    bright.connect(brightFilter).connect(brightGain);
    parallelSrc.connect(parallelFilter).connect(parallelGain);
    
    const mix = this.ctx.createGain();
    noiseGain.connect(mix);
    toneGain.connect(mix);
    ringGain.connect(mix);
    tonal3rdGain.connect(mix);
    crackGain.connect(mix);
    brightGain.connect(mix);
    parallelGain.connect(mix);
    
    // EQ
    const eqPunch = this.ctx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 180;
    eqPunch.Q.value = 1.2;
    eqPunch.gain.value = 6.0;
    const eqMidLow = this.ctx.createBiquadFilter();
    eqMidLow.type = 'peaking';
    eqMidLow.frequency.value = 250;
    eqMidLow.Q.value = 1.0;
    eqMidLow.gain.value = 5.5;
    const eqBody = this.ctx.createBiquadFilter();
    eqBody.type = 'peaking';
    eqBody.frequency.value = 200;
    eqBody.Q.value = 1.2;
    eqBody.gain.value = 2.5;
    const eqPresence = this.ctx.createBiquadFilter();
    eqPresence.type = 'peaking';
    eqPresence.frequency.value = 4800;
    eqPresence.Q.value = 0.9;
    eqPresence.gain.value = 5.5;
    const eqCrack = this.ctx.createBiquadFilter();
    eqCrack.type = 'peaking';
    eqCrack.frequency.value = 6800;
    eqCrack.Q.value = 1.5;
    eqCrack.gain.value = 1.0;
    const eqDark = this.ctx.createBiquadFilter();
    eqDark.type = 'highshelf';
    eqDark.frequency.value = 4000;
    eqDark.gain.value = -4.0;
    
    mix.connect(eqPunch).connect(eqMidLow).connect(eqBody).connect(eqPresence).connect(eqCrack).connect(eqDark);
    
    this._routeToMics(eqCrack, pan, 0.001, { close: 1.2, overhead: 1.25, room: 1.4 });
    
    const punchReverb = this.ctx.createGain();
    punchReverb.gain.value = 1.0;
    eqPunch.connect(punchReverb);
    this._routeToMics(punchReverb, pan, 0.001, { close: 0.8, overhead: 1.0, room: 1.8 });
    
    // Cleanup handlers
    this._cleanupBufferSource(src, startTime + 0.3);
    this._cleanupBufferSource(crackSrc, startTime + 0.01);
    this._cleanupBufferSource(parallelSrc, startTime + 0.15);
    this._cleanupOscillator(tone, startTime + 0.25);
    this._cleanupOscillator(ring, startTime + 0.22);
    this._cleanupOscillator(bright, startTime + 0.18);
    this._cleanupOscillator(tonal3rd, startTime + 0.15);
    
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
  }

  playClap(velocity = 1, options = {}) {
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    const level = 0.95 * velocity * velScale;
    const noise = this._noiseBuffer();
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    
    // Sharp attack snap
    const snapNoise = this._noiseBuffer(true);
    const snapSrc = this.ctx.createBufferSource();
    snapSrc.buffer = snapNoise;
    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.value = 8000;
    snapFilter.Q.value = 3.0;
    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.35 * velocity, startTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.003);
    
    // Multiple clap layers with timing offsets
    const gain = this.ctx.createGain();
    const times = [0, 0.015, 0.03, 0.06, 0.09];
    gain.gain.setValueAtTime(0, startTime);
    times.forEach((offset, i) => {
      const on = startTime + offset;
      const layerLevel = level * (0.9 - i * 0.1);
      gain.gain.linearRampToValueAtTime(layerLevel, on);
      gain.gain.linearRampToValueAtTime(0.0001, on + 0.02);
    });
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500 + (velScale - 1) * 200;
    filter.Q.value = 1.2;
    
    const eqPunch = this.ctx.createBiquadFilter();
    eqPunch.type = 'peaking';
    eqPunch.frequency.value = 200;
    eqPunch.Q.value = 1.5;
    eqPunch.gain.value = 4.5;
    const eqBody = this.ctx.createBiquadFilter();
    eqBody.type = 'peaking';
    eqBody.frequency.value = 1200;
    eqBody.Q.value = 1.0;
    eqBody.gain.value = 3.5;
    const eqAttack = this.ctx.createBiquadFilter();
    eqAttack.type = 'peaking';
    eqAttack.frequency.value = 4000;
    eqAttack.Q.value = 2.0;
    eqAttack.gain.value = 4.0;
    
    src.connect(filter).connect(eqPunch).connect(eqBody).connect(eqAttack).connect(gain);
    snapSrc.connect(snapFilter).connect(snapGain);
    
    const mix = this.ctx.createGain();
    mix.gain.value = 1.0;
    gain.connect(mix);
    snapGain.connect(mix);
    
    this._routeToMics(mix, pan, 0.0008, { close: 1.2, overhead: 1.2, room: 1.2 });
    
    // Cleanup handlers
    this._cleanupBufferSource(src, startTime + 0.3);
    this._cleanupBufferSource(snapSrc, startTime + 0.005);
    
    src.start(startTime);
    src.stop(startTime + 0.3);
    snapSrc.start(startTime);
    snapSrc.stop(startTime + 0.005);
  }

  playTom(startFreq, endFreq, velocity = 1, options = {}) {
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    const level = 0.45 * velocity * velScale;
    
    // Main tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const freqVar = (velScale - 1) * 5;
    osc.frequency.setValueAtTime(startFreq + freqVar, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq + freqVar, startTime + 0.4);
    
    // Harmonic
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime((startFreq + freqVar) * 2, startTime);
    harmonic.frequency.exponentialRampToValueAtTime((endFreq + freqVar) * 2, startTime + 0.35);
    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.1 * velocity, startTime);
    harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    
    // Punchy tonal/noise layer
    const tomPunchNoise = this._noiseBuffer(true);
    const tomPunchSrc = this.ctx.createBufferSource();
    tomPunchSrc.buffer = tomPunchNoise;
    const tomPunchFilter = this.ctx.createBiquadFilter();
    tomPunchFilter.type = 'bandpass';
    const tomPunchFreq = (startFreq + endFreq) / 2 * 1.8;
    tomPunchFilter.frequency.value = Math.max(200, Math.min(800, tomPunchFreq));
    tomPunchFilter.Q.value = 2.2;
    const tomPunchGain = this.ctx.createGain();
    tomPunchGain.gain.setValueAtTime(0.25 * velocity, startTime);
    tomPunchGain.gain.setValueAtTime(0.25 * velocity * 0.88, startTime + 0.004);
    tomPunchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.028);
    
    const tomPunchTone = this.ctx.createOscillator();
    tomPunchTone.type = 'triangle';
    const tomPunchToneFreq = (startFreq + endFreq) / 2 * 1.6;
    tomPunchTone.frequency.setValueAtTime(tomPunchToneFreq + freqVar, startTime);
    tomPunchTone.frequency.exponentialRampToValueAtTime(tomPunchToneFreq * 0.85 + freqVar, startTime + 0.022);
    const tomPunchToneGain = this.ctx.createGain();
    tomPunchToneGain.gain.setValueAtTime(0.2 * velocity, startTime);
    tomPunchToneGain.gain.setValueAtTime(0.2 * velocity * 0.82, startTime + 0.003);
    tomPunchToneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);
    
    const tomPunchMix = this.ctx.createGain();
    tomPunchMix.gain.value = 1.0;
    tomPunchSrc.connect(tomPunchFilter).connect(tomPunchGain).connect(tomPunchMix);
    tomPunchTone.connect(tomPunchToneGain).connect(tomPunchMix);
    this._routeToMics(tomPunchMix, pan, 0.0006, { close: 0.75, overhead: 1.15, room: 2.0 });
    
    // Natural decay
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, startTime);
    gain.gain.setValueAtTime(level * 0.82, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
    
    // EQ
    const eqDip = this.ctx.createBiquadFilter();
    eqDip.type = 'peaking';
    eqDip.frequency.value = 450;
    eqDip.Q.value = 1;
    eqDip.gain.value = -1.5;
    const eqAttack = this.ctx.createBiquadFilter();
    eqAttack.type = 'peaking';
    eqAttack.frequency.value = 2500;
    eqAttack.Q.value = 0.7;
    eqAttack.gain.value = 1.5;
    
    osc.connect(gain);
    harmonic.connect(harmGain).connect(gain);
    tomPunchMix.connect(gain);
    gain.connect(eqDip).connect(eqAttack);
    this._routeToMics(eqAttack, pan, 0.0006, { close: 1.0, overhead: 1.0, room: 1.05 });
    
    // Cleanup handlers
    this._cleanupOscillator(osc, startTime + 0.55);
    this._cleanupOscillator(harmonic, startTime + 0.5);
    this._cleanupOscillator(tomPunchTone, startTime + 0.03);
    this._cleanupBufferSource(tomPunchSrc, startTime + 0.035);
    
    osc.start(startTime);
    osc.stop(startTime + 0.55);
    harmonic.start(startTime);
    harmonic.stop(startTime + 0.5);
    tomPunchSrc.start(startTime);
    tomPunchSrc.stop(startTime + 0.035);
    tomPunchTone.start(startTime);
    tomPunchTone.stop(startTime + 0.03);
  }

  playHat(open = false, velocity = 1, options = {}) {
    this.resume();
    const { pan = 0, timeOffset = 0, velScale = 1 } = options;
    const t = this.ctx.currentTime + timeOffset;
    const startTime = Math.max(t, this.ctx.currentTime);
    const base = open ? 0.32 : 0.28;
    const level = base * velocity * velScale;
    
    // LFO-altered duration for human feel
    const lfoValue = this._lfoPhase(startTime);
    const baseDur = open ? 0.7 : 0.13;
    const durVariation = lfoValue * (open ? 0.08 : 0.015);
    const dur = baseDur + durVariation;
    
    // Punchy transient layer
    const punchClick = this._noiseBuffer(true);
    const punchClickSrc = this.ctx.createBufferSource();
    punchClickSrc.buffer = punchClick;
    const punchClickFilter = this.ctx.createBiquadFilter();
    punchClickFilter.type = 'bandpass';
    punchClickFilter.frequency.value = 12000;
    punchClickFilter.Q.value = 3.0;
    const punchClickGain = this.ctx.createGain();
    punchClickGain.gain.setValueAtTime(level * 0.4, startTime);
    punchClickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.005);
    
    // Noise component
    const buffer = this._noiseBuffer(true);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500 + (velScale - 1) * 700;
    
    const sparkle = this.ctx.createBiquadFilter();
    sparkle.type = 'peaking';
    sparkle.frequency.value = 10000;
    sparkle.Q.value = 0.7;
    sparkle.gain.value = 4.5;
    
    const hotBoost = this.ctx.createBiquadFilter();
    hotBoost.type = 'highshelf';
    hotBoost.frequency.value = 12000;
    hotBoost.gain.value = 6.0;
    
    const ultraHigh = this.ctx.createBiquadFilter();
    ultraHigh.type = 'peaking';
    ultraHigh.frequency.value = 15000;
    ultraHigh.Q.value = 1.2;
    ultraHigh.gain.value = 3.5;
    
    // Tonal component with humanized pitch
    const pitchVariation = Math.sin((startTime * 3.7) % (Math.PI * 2)) * 0.12;
    const instability = (Math.random() * 2 - 1) * 0.12;
    const basePitch = open ? 8500 : 9200;
    const pitchFreq = basePitch + pitchVariation * 250 + (velScale - 1) * 200 + instability * 350;
    
    const tone = this.ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(pitchFreq, startTime);
    
    // Multiple organic pitch modulations
    const slowDrift = this.ctx.createOscillator();
    slowDrift.type = 'sine';
    slowDrift.frequency.value = 0.8 + Math.random() * 0.6;
    const slowDriftGain = this.ctx.createGain();
    slowDriftGain.gain.value = 18 + Math.random() * 22;
    slowDrift.connect(slowDriftGain);
    slowDriftGain.connect(tone.frequency);
    
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 4.5 + Math.random() * 3.5;
    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 15 + Math.random() * 18;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(tone.frequency);
    
    const microMod = this.ctx.createOscillator();
    microMod.type = 'sine';
    microMod.frequency.value = 18 + Math.random() * 14;
    const microModGain = this.ctx.createGain();
    microModGain.gain.value = 8 + Math.random() * 10;
    microMod.connect(microModGain);
    microModGain.connect(tone.frequency);
    
    const endPitch = pitchFreq * (0.91 + Math.random() * 0.02);
    tone.frequency.exponentialRampToValueAtTime(endPitch, startTime + (open ? 0.15 : 0.05));
    
    slowDrift.start(startTime);
    slowDrift.stop(startTime + dur + 0.2);
    vibrato.start(startTime);
    vibrato.stop(startTime + dur + 0.1);
    microMod.start(startTime);
    microMod.stop(startTime + dur + 0.1);
    
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'bandpass';
    toneFilter.frequency.value = pitchFreq;
    toneFilter.Q.value = 2.5;
    
    const toneGain = this.ctx.createGain();
    const toneLevel = open ? 0.18 * velocity : 0.20 * velocity;
    toneGain.gain.setValueAtTime(toneLevel, startTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + (open ? 0.45 : 0.18));
    
    // Punchy attack envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level * 1.15, startTime);
    gain.gain.setValueAtTime(level * 1.05, startTime + 0.001);
    gain.gain.setValueAtTime(level * 0.95, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    
    // Mix
    const noiseMix = this.ctx.createGain();
    noiseMix.gain.value = 1.0;
    const toneMix = this.ctx.createGain();
    toneMix.gain.value = 1.0;
    const finalMix = this.ctx.createGain();
    finalMix.gain.value = 1.0;
    const punchMix = this.ctx.createGain();
    punchMix.gain.value = 1.0;
    
    // Saturation
    const saturator = this.ctx.createWaveShaper();
    const satCurve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      satCurve[i] = Math.tanh(x * 1.4) * 0.96 + Math.sign(x) * Math.abs(x) * 0.04;
    }
    saturator.curve = satCurve;
    saturator.oversample = '4x';
    
    punchClickSrc.connect(punchClickFilter).connect(punchClickGain).connect(punchMix);
    punchMix.connect(finalMix);
    src.connect(filter).connect(sparkle).connect(hotBoost).connect(ultraHigh).connect(saturator).connect(noiseMix);
    tone.connect(toneFilter).connect(toneGain).connect(toneMix);
    noiseMix.connect(finalMix);
    toneMix.connect(finalMix);
    finalMix.connect(gain);
    
    // Heat tail
    const heatTailBuffer = this._noiseBuffer(true);
    const heatTailSrc = this.ctx.createBufferSource();
    heatTailSrc.buffer = heatTailBuffer;
    const heatTailFilter = this.ctx.createBiquadFilter();
    heatTailFilter.type = 'highpass';
    heatTailFilter.frequency.value = 10000;
    const heatTailSparkle = this.ctx.createBiquadFilter();
    heatTailSparkle.type = 'peaking';
    heatTailSparkle.frequency.value = 14000;
    heatTailSparkle.Q.value = 1.0;
    heatTailSparkle.gain.value = 6.0;
    const heatTailUltra = this.ctx.createBiquadFilter();
    heatTailUltra.type = 'highshelf';
    heatTailUltra.frequency.value = 15000;
    heatTailUltra.gain.value = 8.0;
    const heatTailGain = this.ctx.createGain();
    const heatTailLevel = level * 0.35;
    heatTailGain.gain.setValueAtTime(heatTailLevel * 0.3, startTime);
    heatTailGain.gain.linearRampToValueAtTime(heatTailLevel, startTime + 0.01);
    const heatTailDur = dur * (open ? 1.8 : 2.5);
    heatTailGain.gain.exponentialRampToValueAtTime(0.0001, startTime + heatTailDur);
    const heatTailMix = this.ctx.createGain();
    heatTailMix.gain.value = 1.0;
    heatTailSrc.connect(heatTailFilter).connect(heatTailSparkle).connect(heatTailUltra).connect(heatTailGain).connect(heatTailMix);
    heatTailMix.connect(gain);
    
    // Route to mic (reverb removed for CPU savings)
    this._routeToMics(gain, pan, 0.0003, { close: 1.0 });
    
    // Cleanup handlers
    this._cleanupBufferSource(punchClickSrc, startTime + 0.01);
    this._cleanupBufferSource(src, startTime + dur + 0.05);
    this._cleanupBufferSource(heatTailSrc, startTime + heatTailDur + 0.1);
    this._cleanupOscillator(tone, startTime + (open ? 0.5 : 0.2));
    this._cleanupOscillator(slowDrift, startTime + dur + 0.2);
    this._cleanupOscillator(vibrato, startTime + dur + 0.1);
    this._cleanupOscillator(microMod, startTime + dur + 0.1);
    
    punchClickSrc.start(startTime);
    punchClickSrc.stop(startTime + 0.01);
    src.start(startTime);
    src.stop(startTime + dur + 0.05);
    tone.start(startTime);
    tone.stop(startTime + (open ? 0.5 : 0.2));
    heatTailSrc.start(startTime);
    heatTailSrc.stop(startTime + heatTailDur + 0.1);
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

