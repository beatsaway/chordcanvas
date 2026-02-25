/**
 * Tom synth B: square/saw body + linear-then-exp pitch + short "stick" noise attack.
 * More like a real tom (stick hit then body). Params: f0, f1, decay, level, bodyOscType ('square'|'sawtooth').
 */
(function () {
  const DEFAULTS = { f0: 180, f1: 90, decay: 0.4, level: 0.5, bodyOscType: 'square' };

  function playTomB(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const f0 = humanize.pitch ? synth._pitchVar(p.f0, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed)) : p.f0;
    const f1 = humanize.pitch ? synth._pitchVar(p.f1, 0.72 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.f1;
    const decay = humanize.decay ? synth._decayVar(p.decay, 1.62 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed + 2)) : p.decay;

    // Stick attack: short bandpassed noise (2–4 kHz range)
    const stickNoise = synth._noise(0.04, false, seed + 10000);
    const stickSrc = synth.ctx.createBufferSource();
    stickSrc.buffer = stickNoise;
    const stickBp = synth.ctx.createBiquadFilter();
    stickBp.type = 'bandpass';
    stickBp.frequency.value = 2800;
    stickBp.Q.value = 1.2;
    const stickG = synth.ctx.createGain();
    stickG.gain.setValueAtTime(humanize.attack ? v * 0.5 * synth._attackVar(2.7 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 5)) : v * 0.5, t);
    stickG.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
    stickSrc.connect(stickBp).connect(stickG).connect(synth.master);
    stickSrc.start(t);
    stickSrc.stop(t + 0.04);

    const oscType = (p.bodyOscType === 'sawtooth') ? 'sawtooth' : 'square';
    const osc = synth.ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime((f0 + f1) * 0.5, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(humanize.attack ? v * synth._attackVar(2.7 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 3)) : v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(gain).connect(synth.master);
    osc.start(t);
    osc.stop(t + Math.max(decay, 0.35));
    if (humanize.detune && (humanize.detuneAmount ?? 0) > 0) {
      const osc2 = synth.ctx.createOscillator();
      osc2.type = oscType;
      osc2.detune.value = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 4));
      osc2.frequency.setValueAtTime(f0, t);
      osc2.frequency.linearRampToValueAtTime((f0 + f1) * 0.5, t + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
      const g2 = synth.ctx.createGain();
      g2.gain.setValueAtTime(v * 0.35, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + decay);
      osc2.connect(g2).connect(synth.master);
      osc2.start(t);
      osc2.stop(t + Math.max(decay, 0.35));
    }
  }

  window.playTomSynthB = playTomB;
})();
