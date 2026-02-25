/**
 * Clap synth: playClap(synth, velocity, atTime, options, soundParams)
 * Optional: multiClap (false), clapCount (4), clapSpacingMs (10), lastDecayMul (2.5) — from @synths multi-hit clap.
 */
(function () {
  const DEFAULTS = { decay: 0.08, bpF: 1600, bpQ: 1.2, level: 0.85, multiClap: false, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 };

  function playOneClap(synth, v, t, decay, bpF, bpQ, seed, humanize, p) {
    const noise = synth._noise(0.12, false, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = noise;
    const bp = synth.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpF;
    bp.Q.value = bpQ;
    const gain = synth.ctx.createGain();
    const att = humanize.attack ? synth._attackVar(2.7 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 2)) : 1;
    gain.gain.setValueAtTime(v * att, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(bp).connect(gain).connect(synth.master);
    src.start(t);
    src.stop(t + Math.max(decay, 0.06) + 0.02);
  }

  function playClap(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t0 = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * p.level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const decayBase = humanize.decay ? synth._decayVar(p.decay, 1.8 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : p.decay;
    const bpF = humanize.pitch ? synth._pitchVar(p.bpF, 0.54 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.bpF;
    if (p.multiClap && p.clapCount > 1) {
      const count = Math.min(8, Math.max(2, p.clapCount));
      const spacingSec = (p.clapSpacingMs || 10) / 1000;
      const lastMul = Math.max(1, p.lastDecayMul || 2);
      for (let i = 0; i < count; i++) {
        const t = t0 + i * spacingSec;
        const decay = i === count - 1 ? decayBase * lastMul : decayBase;
        const hitV = (i === count - 1) ? v : v * 0.35;
        playOneClap(synth, hitV, t, decay, bpF, p.bpQ, seed + i * 100, humanize, p);
      }
    } else {
      playOneClap(synth, v, t0, decayBase, bpF, p.bpQ, seed, humanize, p);
    }
  }

  window.playClapSynth = playClap;
})();
