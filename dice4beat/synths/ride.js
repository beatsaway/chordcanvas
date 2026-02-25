/**
 * Ride synth: playRide(synth, velocity, atTime, options, soundParams)
 * Optional: noiseType 'white'|'pink'; addOscillators + oscFreq1, oscFreq2, oscLevel (two sines like @synths).
 */
(function () {
  const DEFAULTS = { decay: 0.35, hpF: 6000, bpF: 9000, bpQ: 0.6, level: 0.32, noiseType: 'white', addOscillators: false, oscFreq1: 6000, oscFreq2: 8500, oscLevel: 0.15 };

  function playRide(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const decay = humanize.decay ? synth._decayVar(p.decay, 1.8 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : p.decay;
    const hpF = humanize.pitch ? synth._pitchVar(p.hpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.hpF;
    const bpF = humanize.pitch ? synth._pitchVar(p.bpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 2)) : p.bpF;
    const noise = (p.noiseType === 'pink' && synth._pinkNoise) ? synth._pinkNoise(0.4, seed + 10000) : synth._noise(0.4, true, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = noise;
    const hp = synth.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpF;
    const bp = synth.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpF;
    bp.Q.value = p.bpQ;
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.setValueAtTime(v * 0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(hp).connect(bp).connect(gain).connect(synth.master);
    src.start(t);
    src.stop(t + 0.4);
    if (p.addOscillators && p.oscFreq1 && p.oscFreq2) {
      const ol = (p.oscLevel || 0.15) * v;
      const osc1 = synth.ctx.createOscillator();
      const osc2 = synth.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = p.oscFreq1;
      osc2.frequency.value = p.oscFreq2;
      const og1 = synth.ctx.createGain();
      const og2 = synth.ctx.createGain();
      og1.gain.setValueAtTime(0, t);
      og2.gain.setValueAtTime(0, t);
      og1.gain.linearRampToValueAtTime(ol, t + 0.002);
      og2.gain.linearRampToValueAtTime(ol, t + 0.002);
      og1.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
      og2.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
      osc1.connect(og1);
      osc2.connect(og2);
      og1.connect(synth.master);
      og2.connect(synth.master);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + decay + 0.1);
      osc2.stop(t + decay + 0.1);
    }
  }

  window.playRideSynth = playRide;
})();
