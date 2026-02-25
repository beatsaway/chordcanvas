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

  function playTomTest(ctx, destination, params, atTime) {
    const p = {
      level: 0.5,
      decay: 0.4,
      f0: 155,
      f1: 78,
      sweepTime: 0.18,
      bodyOscType: 'sine',
      attack: 0,
      stickLevel: 0.2,
      stickDecay: 0.02,
      stickFreq: 1800,
      stickQ: 1.2,
      ...params
    };
    const t = atTime;
    const v = Math.max(0.1, Math.min(1, p.level));

    const outNorm = ctx.createGain();
    const refLevel = 0.5;
    const normGain = Math.min(2.2, refLevel / Math.max(p.level, 0.22));
    outNorm.gain.setValueAtTime(normGain, t);
    outNorm.connect(destination);

    if (p.stickLevel > 0.005) {
      const stickNoise = makeNoiseBuffer(ctx, 0.03, 20000);
      const stickSrc = ctx.createBufferSource();
      stickSrc.buffer = stickNoise;
      const stickBp = ctx.createBiquadFilter();
      stickBp.type = 'bandpass';
      stickBp.frequency.value = Math.min(6000, Math.max(400, p.stickFreq));
      stickBp.Q.value = Math.max(0.3, Math.min(5, p.stickQ));
      const stickG = ctx.createGain();
      stickG.gain.setValueAtTime(v * p.stickLevel, t);
      stickG.gain.exponentialRampToValueAtTime(0.001, t + p.stickDecay);
      stickSrc.connect(stickBp).connect(stickG).connect(outNorm);
      stickSrc.start(t);
      stickSrc.stop(t + 0.03);
    }

    const f0 = Math.min(240, Math.max(60, p.f0));
    let f1 = Math.min(135, Math.max(35, p.f1));
    if (f1 >= f0) f1 = Math.max(25, f0 * 0.92);
    const endFreq = Math.max(22, Math.min(f1, f0 - 2));
    const decay = Math.max(0.12, Math.min(1, p.decay));
    const sweepTime = Math.max(0.03, Math.min(0.4, p.sweepTime || 0.18));
    const oscType = (p.bodyOscType === 'triangle') ? 'triangle' : 'sine';

    const osc = ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + sweepTime);

    const gain = ctx.createGain();
    const attack = Math.max(0, Math.min(0.04, p.attack || 0));
    if (attack > 0.0005) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + attack);
    } else {
      gain.gain.setValueAtTime(v, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.connect(gain).connect(outNorm);
    osc.start(t);
    osc.stop(t + Math.max(decay, sweepTime) + 0.02);
  }

  window.playTomTest = playTomTest;
})();
