/**
 * Tom synth: playTom(synth, velocity, atTime, options, soundParams)
 * Optional: bodyOscType 'sine'|'triangle' (triangle = more punch/harmonics).
 */
(function () {
  const DEFAULTS = { f0: 180, f1: 90, decay: 0.4, level: 0.5, bodyOscType: 'sine' };

  function playTom(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const f0 = humanize.pitch ? synth._pitchVar(p.f0, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed)) : p.f0;
    const f1 = humanize.pitch ? synth._pitchVar(p.f1, 0.72 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.f1;
    const decay = humanize.decay ? synth._decayVar(p.decay, 1.62 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed + 2)) : p.decay;
    const osc = synth.ctx.createOscillator();
    osc.type = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(humanize.attack ? v * synth._attackVar(2.7 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 3)) : v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain).connect(synth.master);
    osc.start(t);
    osc.stop(t + Math.max(decay, 0.35));
    if (humanize.detune && (humanize.detuneAmount ?? 0) > 0) {
      const osc2 = synth.ctx.createOscillator();
      osc2.type = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';
      osc2.detune.value = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 4));
      osc2.frequency.setValueAtTime(f0, t);
      osc2.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
      const g2 = synth.ctx.createGain();
      g2.gain.setValueAtTime(v * 0.4, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + decay);
      osc2.connect(g2).connect(synth.master);
      osc2.start(t);
      osc2.stop(t + Math.max(decay, 0.35));
    }
  }

  window.playTomSynth = playTom;
})();
