(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5) | 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoiseBuffer(ctx, duration, seed) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const rnd = seed != null ? mulberry32(seed) : () => Math.random();
    for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1);
    return buf;
  }

  function playSnareTest(ctx, destination, params, atTime) {
    atTime = atTime || 0;
    const p = {
      bodyF: 200,
      bodyFEnd: 120,
      decayT: 0.12,
      toneLevel: 0.5,
      fmAmount: 0.7,
      fmRatio: 3,
      decayN: 0.2,
      noiseLevel: 0.85,
      noiseFilterType: 'highpass',
      noiseFilterFreq: 4000,
      noiseFilterQ: 0.7,
      crackLevel: 1.1,
      crackDecay: 0.09,
      crackFreq: 7200,
      crackQ: 1.4,
      ...params
    };
    const t = atTime;
    const v = 0.8;

    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(1, t);
    outNorm.connect(destination);

    const noiseFreq = Math.min(12000, p.noiseFilterFreq);

    if (p.crackLevel > 0.01) {
      const crackNoise = makeNoiseBuffer(ctx, 0.12, 10000);
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackNoise;
      const crackBp = ctx.createBiquadFilter();
      crackBp.type = 'bandpass';
      crackBp.frequency.value = Math.min(12000, p.crackFreq);
      crackBp.Q.value = p.crackQ;
      const crackG = ctx.createGain();
      crackG.gain.setValueAtTime(v * p.crackLevel, t);
      crackG.gain.exponentialRampToValueAtTime(0.001, t + p.crackDecay);
      crackSrc.connect(crackBp).connect(crackG).connect(outNorm);
      crackSrc.start(t);
      crackSrc.stop(t + 0.12);
    }

    if (p.noiseLevel > 0.01) {
      const bodyNoise = makeNoiseBuffer(ctx, 0.25, 20001);
      const bodySrc = ctx.createBufferSource();
      bodySrc.buffer = bodyNoise;
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = p.noiseFilterType === 'bandpass' ? 'bandpass' : 'highpass';
      bodyFilter.frequency.value = noiseFreq;
      bodyFilter.Q.value = p.noiseFilterType === 'bandpass' ? Math.max(0.3, p.noiseFilterQ) : 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(v * p.noiseLevel, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + p.decayN);
      bodySrc.connect(bodyFilter).connect(ng).connect(outNorm);
      bodySrc.start(t);
      bodySrc.stop(t + Math.max(p.decayN, 0.2));
    }

    const mod = ctx.createOscillator();
    mod.type = 'sine';
    const ratio = Math.max(1, p.fmRatio);
    mod.frequency.setValueAtTime(p.bodyF * ratio, t);
    mod.frequency.exponentialRampToValueAtTime(p.bodyFEnd * ratio, t + 0.1);
    const modGain = ctx.createGain();
    modGain.gain.value = p.bodyF * (p.fmAmount || 0.7);
    mod.connect(modGain);
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(p.bodyF, t);
    carrier.frequency.exponentialRampToValueAtTime(p.bodyFEnd, t + 0.1);
    modGain.connect(carrier.frequency);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(p.toneLevel * v, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + p.decayT);
    carrier.connect(tg).connect(outNorm);
    mod.start(t);
    mod.stop(t + 0.14);
    carrier.start(t);
    carrier.stop(t + 0.14);
  }

  window.playSnareTest = playSnareTest;
})();
