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

  function playRideTest(ctx, destination, params, atTime) {
    const p = {
      decay: 0.35,
      level: 0.32,
      stickDip: 0.6,
      attack: 0,
      hpF: 6000,
      bpF: 9000,
      bpQ: 0.6,
      addOscillators: false,
      oscFreq1: 6000,
      oscFreq2: 8500,
      oscLevel: 0.15,
      ...params
    };
    const t = atTime;
    const v = Math.max(0.08, Math.min(1, p.level));
    const decay = Math.max(0.1, Math.min(1, p.decay));
    let hpF = Math.min(16000, Math.max(500, p.hpF));
    let bpF = Math.min(16000, Math.max(500, p.bpF));
    if (hpF >= bpF * 0.92) hpF = bpF * 0.88;
    if (bpF <= hpF * 1.08) bpF = Math.min(16000, hpF * 1.15);
    const seed = 20000;

    const ol = (p.addOscillators && p.oscFreq1 && p.oscFreq2) ? (p.oscLevel || 0.15) * v : 0;
    const currentSum = v + ol;
    const REF_SUM = 0.32 + 0.15;
    const compGain = REF_SUM / Math.max(currentSum, 0.05);
    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(compGain, t);
    outNorm.connect(destination);

    const noise = makeNoiseBuffer(ctx, 0.45, seed);
    const src = ctx.createBufferSource();
    src.buffer = noise;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpF;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpF;
    bp.Q.value = Math.max(0.2, Math.min(5, p.bpQ || 0.6));

    const gain = ctx.createGain();
    const attack = Math.max(0, Math.min(0.025, p.attack || 0));
    const dip = Math.max(0.3, Math.min(1, p.stickDip != null ? p.stickDip : 0.6));
    if (attack > 0.0005) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + attack);
    } else {
      gain.gain.setValueAtTime(v, t);
    }
    gain.gain.setValueAtTime(v * dip, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    src.connect(hp).connect(bp).connect(gain).connect(outNorm);
    src.start(t);
    src.stop(t + 0.45);

    if (p.addOscillators && p.oscFreq1 && p.oscFreq2) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = p.oscFreq1;
      osc2.frequency.value = p.oscFreq2;
      const og1 = ctx.createGain();
      const og2 = ctx.createGain();
      og1.gain.setValueAtTime(0, t);
      og2.gain.setValueAtTime(0, t);
      og1.gain.linearRampToValueAtTime(ol, t + 0.002);
      og2.gain.linearRampToValueAtTime(ol, t + 0.002);
      og1.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
      og2.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
      osc1.connect(og1);
      osc2.connect(og2);
      og1.connect(outNorm);
      og2.connect(outNorm);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + decay + 0.1);
      osc2.stop(t + decay + 0.1);
    }
  }

  window.playRideTest = playRideTest;
})();
