/**
 * Kick synth: playKick(synth, velocity, atTime, options, soundParams)
 * Optional: bodyOscType 'sine'|'triangle' (default sine), clickFilterQ (default 2).
 */
(function () {
  const DEFAULTS = {
    f0: 65,
    f1: 38,
    decayBase: 0.45,
    clickLevel: 0.1,
    clickFreq: 2800,
    clickDecay: 0.012,
    bodyOscType: 'sine',
    clickFilterQ: 2,
  };

  function playKick(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * 0.75;
    const decayMul = humanize.decay ? synth._decayVar(1, 1.62 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : 1;
    v *= humanize.velocityTone ? synth._velTone(velocity) : 1;
    const f0 = humanize.pitch ? synth._pitchVar(p.f0, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.f0;
    const f1 = humanize.pitch ? synth._pitchVar(p.f1, 0.72 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 2)) : p.f1;
    const decay = p.decayBase * decayMul;
    const osc = synth.ctx.createOscillator();
    osc.type = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain);
    gain.connect(synth.master);
    osc.start(t);
    osc.stop(t + Math.max(decay, 0.4));
    if (humanize.detune && (humanize.detuneAmount ?? 0) > 0) {
      const osc2 = synth.ctx.createOscillator();
      osc2.type = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';
      osc2.detune.value = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 3));
      osc2.frequency.setValueAtTime(f0, t);
      osc2.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
      const g2 = synth.ctx.createGain();
      g2.gain.setValueAtTime(v * 0.4, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + decay);
      osc2.connect(g2).connect(synth.master);
      osc2.start(t);
      osc2.stop(t + Math.max(decay, 0.4));
    }
    const click = synth._noise(0.015, true, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = click;
    const bp = synth.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = humanize.pitch ? synth._pitchVar(p.clickFreq, 0.54 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 4)) : p.clickFreq;
    bp.Q.value = typeof p.clickFilterQ === 'number' ? p.clickFilterQ : 2;
    const cg = synth.ctx.createGain();
    const clickGain = humanize.attack ? p.clickLevel * v * synth._attackVar(3.15 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 5)) : p.clickLevel * v;
    cg.gain.setValueAtTime(clickGain, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + p.clickDecay);
    src.connect(bp).connect(cg).connect(synth.master);
    src.start(t);
    src.stop(t + 0.02);
  }

  window.playKickSynth = playKick;
})();
