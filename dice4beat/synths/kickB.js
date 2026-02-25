/**
 * Kick synth B: FM body (carrier + modulating sine with fast decay) + oscillator click burst.
 * Sounds more "synthetic" and punchy than A. Same params: f0, f1, decayBase, clickLevel, clickFreq, clickDecay, bodyOscType, clickFilterQ.
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

  function playKickB(synth, velocity, atTime, options, soundParams) {
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
    const clickFreq = humanize.pitch ? synth._pitchVar(p.clickFreq, 0.54 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 4)) : p.clickFreq;

    // FM body: carrier (sine) with modulator wobble on frequency for a distinct "thunk"
    const carrier = synth.ctx.createOscillator();
    carrier.type = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';
    carrier.frequency.setValueAtTime(f0, t);
    carrier.frequency.exponentialRampToValueAtTime(f1, t + 0.35);
    const mod = synth.ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = Math.min(120, f0 * 1.8);
    const modGain = synth.ctx.createGain();
    modGain.gain.setValueAtTime(f0 * 0.5, t);
    modGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    carrier.connect(gain).connect(synth.master);
    carrier.start(t);
    carrier.stop(t + Math.max(decay, 0.4));
    mod.start(t);
    mod.stop(t + 0.08);

    // Click: oscillator burst (sine) + short noise for a sharper, more defined attack
    const clickGain = humanize.attack ? p.clickLevel * v * synth._attackVar(3.15 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 5)) : p.clickLevel * v;
    const clickOsc = synth.ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.value = clickFreq;
    const clickOscG = synth.ctx.createGain();
    clickOscG.gain.setValueAtTime(clickGain * 0.7, t);
    clickOscG.gain.exponentialRampToValueAtTime(0.001, t + p.clickDecay);
    clickOsc.connect(clickOscG).connect(synth.master);
    clickOsc.start(t);
    clickOsc.stop(t + Math.max(p.clickDecay, 0.015));
    const noiseClick = synth._noise(0.018, true, seed + 10000);
    const noiseSrc = synth.ctx.createBufferSource();
    noiseSrc.buffer = noiseClick;
    const bp = synth.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = clickFreq;
    bp.Q.value = typeof p.clickFilterQ === 'number' ? p.clickFilterQ : 2;
    const cg = synth.ctx.createGain();
    cg.gain.setValueAtTime(clickGain * 0.5, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + p.clickDecay * 0.8);
    noiseSrc.connect(bp).connect(cg).connect(synth.master);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.02);
  }

  window.playKickSynthB = playKickB;
})();
