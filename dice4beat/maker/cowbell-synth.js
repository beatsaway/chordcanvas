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

  function playCowbellTest(ctx, destination, params, atTime) {
    const p = {
      level: 0.55,
      decay1: 0.12,
      decay2: 0.08,
      f1: 1050,
      f2: 1450,
      level1: 1,
      level2: 0.5,
      osc1Type: 'sine',
      osc2Type: 'triangle',
      addSecondPair: false,
      secondF1: 900,
      secondF2: 1200,
      secondLevel: 0.25,
      secondDecay: 0.06,
      stickLevel: 0.35,
      stickDecay: 0.018,
      stickFreq: 3200,
      stickQ: 1.5,
      ...params
    };
    const t = atTime;
    const v = Math.max(0.08, Math.min(1, p.level));

    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(1, t);
    outNorm.connect(destination);

    if (p.stickLevel > 0.005) {
      const stickNoise = makeNoiseBuffer(ctx, 0.025, 10000);
      const stickSrc = ctx.createBufferSource();
      stickSrc.buffer = stickNoise;
      const stickBp = ctx.createBiquadFilter();
      stickBp.type = 'bandpass';
      stickBp.frequency.value = Math.min(8000, Math.max(500, p.stickFreq));
      stickBp.Q.value = Math.max(0.3, Math.min(6, p.stickQ));
      const stickG = ctx.createGain();
      stickG.gain.setValueAtTime(v * p.stickLevel, t);
      stickG.gain.exponentialRampToValueAtTime(0.001, t + p.stickDecay);
      stickSrc.connect(stickBp).connect(stickG).connect(outNorm);
      stickSrc.start(t);
      stickSrc.stop(t + 0.025);
    }

    const f1 = Math.min(2200, Math.max(200, p.f1));
    const f2 = Math.min(4000, Math.max(300, p.f2));
    const decay1 = Math.max(0.03, Math.min(0.4, p.decay1));
    const decay2 = Math.max(0.015, Math.min(0.25, p.decay2));

    const osc1 = ctx.createOscillator();
    osc1.type = p.osc1Type || 'sine';
    osc1.frequency.setValueAtTime(f1, t);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(v * (p.level1 || 1), t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + decay1);
    osc1.connect(g1).connect(outNorm);
    osc1.start(t);
    osc1.stop(t + decay1 + 0.02);

    const osc2 = ctx.createOscillator();
    osc2.type = p.osc2Type || 'triangle';
    osc2.frequency.setValueAtTime(f2, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(v * (p.level2 || 0.5), t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + decay2);
    osc2.connect(g2).connect(outNorm);
    osc2.start(t);
    osc2.stop(t + decay2 + 0.02);

    if (p.addSecondPair && p.secondF1 && p.secondF2) {
      const sF1 = Math.min(2000, Math.max(200, p.secondF1));
      const sF2 = Math.min(3000, Math.max(300, p.secondF2));
      const sV = v * (p.secondLevel || 0.25);
      const sD = Math.max(0.02, Math.min(0.2, p.secondDecay || 0.06));
      const so1 = ctx.createOscillator();
      const so2 = ctx.createOscillator();
      so1.type = p.osc1Type || 'sine';
      so2.type = p.osc2Type || 'triangle';
      so1.frequency.setValueAtTime(sF1, t);
      so2.frequency.setValueAtTime(sF2, t);
      const sg1 = ctx.createGain();
      const sg2 = ctx.createGain();
      sg1.gain.setValueAtTime(sV, t);
      sg1.gain.exponentialRampToValueAtTime(0.001, t + sD);
      sg2.gain.setValueAtTime(sV * 0.6, t);
      sg2.gain.exponentialRampToValueAtTime(0.001, t + sD * 0.75);
      so1.connect(sg1).connect(outNorm);
      so2.connect(sg2).connect(outNorm);
      so1.start(t);
      so2.start(t);
      so1.stop(t + sD + 0.02);
      so2.stop(t + sD + 0.02);
    }
  }

  window.playCowbellTest = playCowbellTest;
})();
