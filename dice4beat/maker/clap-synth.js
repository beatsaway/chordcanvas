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

  function playOneClap(ctx, destination, v, t, decay, bpF, bpQ, seed, opt) {
    const o = opt || {};
    const attack = Math.max(0, Math.min(0.015, o.attack || 0));

    if (o.crackLevel > 0.005) {
      const crackNoise = makeNoiseBuffer(ctx, 0.04, seed + 5000);
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackNoise;
      const crackBp = ctx.createBiquadFilter();
      crackBp.type = 'bandpass';
      crackBp.frequency.value = Math.min(12000, Math.max(500, o.crackFreq || 4500));
      crackBp.Q.value = 1.5;
      const crackG = ctx.createGain();
      crackG.gain.setValueAtTime(v * o.crackLevel, t);
      crackG.gain.exponentialRampToValueAtTime(0.001, t + (o.crackDecay || 0.008));
      crackSrc.connect(crackBp).connect(crackG).connect(destination);
      crackSrc.start(t);
      crackSrc.stop(t + 0.04);
    }

    const noise = makeNoiseBuffer(ctx, 0.14, seed);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(16000, Math.max(200, bpF));
    bp.Q.value = Math.max(0.2, Math.min(5, bpQ));
    const gain = ctx.createGain();
    if (attack > 0.0005) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + attack);
    } else {
      gain.gain.setValueAtTime(v, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(bp).connect(gain).connect(destination);
    src.start(t);
    src.stop(t + Math.max(decay, 0.06) + 0.02);

    if (o.toneLevel > 0.005 && o.toneFreq) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = Math.min(2000, Math.max(80, o.toneFreq));
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(v * o.toneLevel, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + (o.toneDecay || 0.028));
      osc.connect(tg).connect(destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  function playClapTest(ctx, destination, params, atTime) {
    const p = {
      decay: 0.08,
      level: 0.85,
      attack: 0,
      bpF: 4000,
      bpQ: 1.2,
      crackLevel: 0.2,
      crackFreq: 4500,
      crackDecay: 0.008,
      addTone: false,
      toneFreq: 280,
      toneDecay: 0.028,
      toneLevel: 0.18,
      clapCount: 4,
      clapSpacingMs: 10,
      lastDecayMul: 2.5,
      ...params
    };
    const t0 = atTime;
    const v = Math.max(0.2, Math.min(1.2, p.level));
    const decayBase = Math.max(0.02, Math.min(0.25, p.decay));
    const bpF = Math.min(6000, Math.max(2000, p.bpF));
    const bpQ = Math.max(0.2, Math.min(5, p.bpQ || 1.2));
    const seed = 30000;

    const toneContrib = (p.addTone && p.toneLevel > 0) ? p.toneLevel : 0;
    const REF_SUM = 0.85 + 0.2 + 0.18;
    const currentSum = v + (p.crackLevel || 0) * v + toneContrib * v;
    const compGain = REF_SUM / Math.max(currentSum, 0.1);
    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(compGain, t0);
    outNorm.connect(destination);

    const opt = {
      attack: p.attack,
      crackLevel: p.crackLevel || 0,
      crackFreq: p.crackFreq || 4500,
      crackDecay: p.crackDecay || 0.008,
      toneLevel: p.addTone ? (p.toneLevel || 0) : 0,
      toneFreq: p.toneFreq || 280,
      toneDecay: p.toneDecay || 0.028
    };

    const count = Math.min(8, Math.max(1, Math.round(p.clapCount)));
    const firstDecayMul = Math.max(1, Math.min(3, p.lastDecayMul || 2.5));
    const baseSpacingSec = count > 1 ? (Math.max(3, Math.min(40, p.clapSpacingMs || 10)) / 1000) : 0;
    let t = t0;
    for (let i = 0; i < count; i++) {
      const hitV = i === 0 ? v : v * 0.18;
      const decay = i === 0 ? decayBase * firstDecayMul : decayBase * 0.5;
      playOneClap(ctx, outNorm, hitV, t, decay, bpF, bpQ, seed + i * 100, opt);
      if (i < count - 1) t += baseSpacingSec * (1 + i * 0.12);
    }
  }

  window.playClapTest = playClapTest;
})();
