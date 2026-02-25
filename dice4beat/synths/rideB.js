/**
 * Ride synth B: oscillator-dominant "ping" — 3 sines carry the tail; noise only as short transient.
 * Sounds more tonal and less washy than A. Params: decay, hpF, bpF, bpQ, level, noiseType; oscFreq1, oscFreq2, oscFreq3, oscLevel.
 */
(function () {
  const DEFAULTS = { decay: 0.35, hpF: 6000, bpF: 9000, bpQ: 0.6, level: 0.32, noiseType: 'white', oscFreq1: 6000, oscFreq2: 8500, oscFreq3: 11000, oscLevel: 0.28 };

  function playRideB(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const decay = humanize.decay ? synth._decayVar(p.decay, 1.8 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : p.decay;
    const ol = (p.oscLevel || 0.28) * v;
    const freqs = [p.oscFreq1, p.oscFreq2, p.oscFreq3].filter(Boolean);
    // Main sound: sines with full decay (ping character)
    freqs.forEach((freq, i) => {
      const f = humanize.pitch ? synth._pitchVar(freq, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + i)) : freq;
      const osc = synth.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const og = synth.ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(ol / freqs.length, t + 0.003);
      og.gain.exponentialRampToValueAtTime(0.001, t + decay);
      osc.connect(og).connect(synth.master);
      osc.start(t);
      osc.stop(t + decay + 0.1);
    });
    // Noise only as short attack transient (first ~25 ms) — no sustained wash
    const noise = (p.noiseType === 'pink' && synth._pinkNoise) ? synth._pinkNoise(0.06, seed + 10000) : synth._noise(0.06, true, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = noise;
    const hp = synth.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = humanize.pitch ? synth._pitchVar(p.hpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 10)) : p.hpF;
    const bp = synth.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = humanize.pitch ? synth._pitchVar(p.bpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 11)) : p.bpF;
    bp.Q.value = p.bpQ;
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(v * 0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);
    src.connect(hp).connect(bp).connect(gain).connect(synth.master);
    src.start(t);
    src.stop(t + 0.06);
  }

  window.playRideSynthB = playRideB;
})();
