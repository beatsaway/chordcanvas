/**
 * Clap synth B: dual-layer "thump + crack" — low band then high band with small delay.
 * Fuller and more distinct than A (single band). Same params; no extra params needed.
 */
(function () {
  const DEFAULTS = { decay: 0.08, bpF: 1600, bpQ: 1.2, level: 0.85, multiClap: false, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 };

  function playOneClapB(synth, v, t, decay, bpF, bpQ, seed, humanize, p) {
    const att = humanize.attack ? synth._attackVar(2.7 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 2)) : 1;
    const vv = v * att;
    // Layer 1: low "thump" (starts immediately, short decay)
    const lowBpF = Math.min(900, bpF * 0.5);
    const noiseLow = synth._noise(0.1, false, seed + 10000);
    const srcLow = synth.ctx.createBufferSource();
    srcLow.buffer = noiseLow;
    const bpLow = synth.ctx.createBiquadFilter();
    bpLow.type = 'bandpass';
    bpLow.frequency.value = lowBpF;
    bpLow.Q.value = bpQ * 0.7;
    const gLow = synth.ctx.createGain();
    gLow.gain.setValueAtTime(vv * 0.7, t);
    gLow.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.5);
    srcLow.connect(bpLow).connect(gLow).connect(synth.master);
    srcLow.start(t);
    srcLow.stop(t + 0.08);
    // Layer 2: high "crack" (starts 6 ms later, full decay)
    const tCrack = t + 0.006;
    const noiseCrack = synth._noise(0.12, false, seed + 20000);
    const srcCrack = synth.ctx.createBufferSource();
    srcCrack.buffer = noiseCrack;
    const bpCrack = synth.ctx.createBiquadFilter();
    bpCrack.type = 'bandpass';
    bpCrack.frequency.value = bpF;
    bpCrack.Q.value = bpQ;
    const gCrack = synth.ctx.createGain();
    gCrack.gain.setValueAtTime(vv, tCrack);
    gCrack.gain.exponentialRampToValueAtTime(0.001, tCrack + decay);
    srcCrack.connect(bpCrack).connect(gCrack).connect(synth.master);
    srcCrack.start(tCrack);
    srcCrack.stop(tCrack + Math.max(decay, 0.06) + 0.02);
  }

  function playClapB(synth, velocity, atTime, options, soundParams) {
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
        playOneClapB(synth, hitV, t, decay, bpF, p.bpQ, seed + i * 100, humanize, p);
      }
    } else {
      playOneClapB(synth, v, t0, decayBase, bpF, p.bpQ, seed, humanize, p);
    }
  }

  window.playClapSynthB = playClapB;
})();
