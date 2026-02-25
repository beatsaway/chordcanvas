/**
 * Snare synth B: FM body (stronger modulation, 3:1 ratio) + dual-band noise (crack + body).
 * More synthetic and "cracky" than A. Params: decayN, decayT, bodyF, bodyFEnd, hpF, toneLevel, noiseFilterType, noiseFilterFreq, noiseFilterQ.
 */
(function () {
  const DEFAULTS = { decayN: 0.2, decayT: 0.12, bodyF: 200, bodyFEnd: 120, hpF: 1800, toneLevel: 0.5, noiseFilterType: 'highpass', noiseFilterFreq: 4000, noiseFilterQ: 1 };

  function playSnareB(synth, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * 0.8;
    v *= humanize.velocityTone ? synth._velTone(velocity) : 1;
    const decayN = humanize.decay ? synth._decayVar(p.decayN, 1.8 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : p.decayN;
    const decayT = humanize.decay ? synth._decayVar(p.decayT, 1.98 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed + 1)) : p.decayT;
    const bodyF = humanize.pitch ? synth._pitchVar(p.bodyF, 0.54 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 2)) : p.bodyF;
    const bodyFEnd = humanize.pitch ? synth._pitchVar(p.bodyFEnd, 0.72 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 3)) : p.bodyFEnd;
    const hpF = humanize.velocityTone ? 1600 + 400 * Math.max(0, Math.min(1, velocity)) : p.hpF;
    const noiseFreq = p.noiseFilterType === 'bandpass' ? (p.noiseFilterFreq || 4000) : hpF;

    // Dual-band noise: high "crack" (short) + main body noise
    const crackNoise = synth._noise(0.12, false, seed + 10000);
    const crackSrc = synth.ctx.createBufferSource();
    crackSrc.buffer = crackNoise;
    const crackBp = synth.ctx.createBiquadFilter();
    crackBp.type = 'bandpass';
    crackBp.frequency.value = Math.min(12000, noiseFreq * 1.8);
    crackBp.Q.value = 1.4;
    const crackG = synth.ctx.createGain();
    crackG.gain.setValueAtTime(v * 1.1, t);
    crackG.gain.exponentialRampToValueAtTime(0.001, t + decayN * 0.45);
    crackSrc.connect(crackBp).connect(crackG).connect(synth.master);
    crackSrc.start(t);
    crackSrc.stop(t + 0.12);

    const bodyNoise = synth._noise(0.25, false, seed + 20001);
    const bodySrc = synth.ctx.createBufferSource();
    bodySrc.buffer = bodyNoise;
    const bodyFilter = synth.ctx.createBiquadFilter();
    bodyFilter.type = p.noiseFilterType === 'bandpass' ? 'bandpass' : 'highpass';
    bodyFilter.frequency.value = noiseFreq;
    bodyFilter.Q.value = p.noiseFilterType === 'bandpass' ? (p.noiseFilterQ || 1) : 0.7;
    const ng = synth.ctx.createGain();
    ng.gain.setValueAtTime(v * 0.85, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + decayN);
    bodySrc.connect(bodyFilter).connect(ng).connect(synth.master);
    bodySrc.start(t);
    bodySrc.stop(t + Math.max(decayN, 0.2));

    // FM body: 3:1 ratio, stronger mod index for more metallic tone
    const mod = synth.ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(bodyF * 3, t);
    mod.frequency.exponentialRampToValueAtTime(bodyFEnd * 3, t + 0.1);
    const modGain = synth.ctx.createGain();
    modGain.gain.value = bodyF * 0.7;
    mod.connect(modGain);
    const carrier = synth.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(bodyF, t);
    carrier.frequency.exponentialRampToValueAtTime(bodyFEnd, t + 0.1);
    modGain.connect(carrier.frequency);
    const tg = synth.ctx.createGain();
    tg.gain.setValueAtTime(p.toneLevel * v, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + decayT);
    carrier.connect(tg).connect(synth.master);
    mod.start(t);
    mod.stop(t + 0.14);
    carrier.start(t);
    carrier.stop(t + 0.14);
  }

  window.playSnareSynthB = playSnareB;
})();
