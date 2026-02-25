/**
 * Cowbell synth: playCowbell(synth, velocity, atTime, options, soundParams)
 * Optional: addSecondPair (false), secondF1, secondF2, secondLevel, secondDecay — second tone pair for overtones/brassy.
 */
(function () {
  const DEFAULTS = { f1: 1050, f2: 1450, decay1: 0.12, level: 0.55, addSecondPair: false, secondF1: 900, secondF2: 1200, secondLevel: 0.25, secondDecay: 0.06 };

  function playCowbell(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const f1 = humanize.pitch ? synth._pitchVar(p.f1, 0.36 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed)) : p.f1;
    const f2 = humanize.pitch ? synth._pitchVar(p.f2, 0.36 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.f2;
    const decay1 = humanize.decay ? synth._decayVar(p.decay1, 1.62 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed + 2)) : p.decay1;
    const osc1 = synth.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(f1, t);
    const osc2 = synth.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(f2, t);
    const g1 = synth.ctx.createGain();
    g1.gain.setValueAtTime(v, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + decay1);
    const g2 = synth.ctx.createGain();
    g2.gain.setValueAtTime(v * 0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(g1).connect(synth.master);
    osc2.connect(g2).connect(synth.master);
    osc1.start(t);
    osc1.stop(t + 0.14);
    osc2.start(t);
    osc2.stop(t + 0.1);
    if (p.addSecondPair && p.secondF1 && p.secondF2) {
      const sV = v * (p.secondLevel || 0.25);
      const sD = p.secondDecay || 0.06;
      const so1 = synth.ctx.createOscillator();
      const so2 = synth.ctx.createOscillator();
      so1.type = 'sine';
      so2.type = 'triangle';
      so1.frequency.setValueAtTime(p.secondF1, t);
      so2.frequency.setValueAtTime(p.secondF2, t);
      const sg1 = synth.ctx.createGain();
      const sg2 = synth.ctx.createGain();
      sg1.gain.setValueAtTime(sV, t);
      sg1.gain.exponentialRampToValueAtTime(0.001, t + sD);
      sg2.gain.setValueAtTime(sV * 0.5, t);
      sg2.gain.exponentialRampToValueAtTime(0.001, t + sD * 0.7);
      so1.connect(sg1).connect(synth.master);
      so2.connect(sg2).connect(synth.master);
      so1.start(t);
      so2.start(t);
      so1.stop(t + sD + 0.02);
      so2.stop(t + sD + 0.02);
    }
    if (humanize.detune && (humanize.detuneAmount ?? 0) > 0) {
      const d1 = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 3));
      const d2 = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 4));
      const osc1b = synth.ctx.createOscillator();
      osc1b.type = 'sine';
      osc1b.detune.value = d1;
      osc1b.frequency.setValueAtTime(f1, t);
      const osc2b = synth.ctx.createOscillator();
      osc2b.type = 'triangle';
      osc2b.detune.value = d2;
      osc2b.frequency.setValueAtTime(f2, t);
      const g1b = synth.ctx.createGain();
      g1b.gain.setValueAtTime(v * 0.35, t);
      g1b.gain.exponentialRampToValueAtTime(0.001, t + decay1);
      const g2b = synth.ctx.createGain();
      g2b.gain.setValueAtTime(v * 0.2, t);
      g2b.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc1b.connect(g1b).connect(synth.master);
      osc2b.connect(g2b).connect(synth.master);
      osc1b.start(t);
      osc1b.stop(t + 0.14);
      osc2b.start(t);
      osc2b.stop(t + 0.1);
    }
  }

  window.playCowbellSynth = playCowbell;
})();
