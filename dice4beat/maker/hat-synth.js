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

  function makePinkBuffer(ctx, duration, seed) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const rand = seed != null
      ? (i) => { const x = Math.sin((seed + i) * 9999.123) * 43758.5453; return x - Math.floor(x); }
      : () => Math.random();
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = (rand(i) * 2 - 1);
      b0 = b0 * 0.99829 + white * 0.00171;
      b1 = b1 * 0.99829 + b0 * 0.00171;
      b2 = b2 * 0.99829 + b1 * 0.00171;
      b3 = b3 * 0.99829 + b2 * 0.00171;
      b4 = b4 * 0.99829 + b3 * 0.00171;
      b5 = b5 * 0.99829 + b4 * 0.00171;
      b6 = b6 * 0.99829 + b5 * 0.00171;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6) * 0.15;
    }
    return buf;
  }

  function playHatTest(ctx, destination, params, atTime, open) {
    const p = {
      durClosed: 0.05,
      durOpen: 0.2,
      hpF: 6500,
      levelClosed: 0.58,
      levelOpen: 0.58,
      noiseType: 'pink',
      filterType: 'highpass',
      bpQ: 0.7,
      addOscillators: false,
      oscFreq1: 8000,
      oscFreq2: 10000,
      oscLevel: 0.2,
      bodyLevel: 0.3,
      bodyFreq: 1400,
      bodyDecay: 0.022,
      attack: 0,
      stickLevel: 0.28,
      stickDecay: 0.006,
      stickFreq: 5500,
      resonantLevel: 0.15,
      resonantFreq: 10000,
      resonantQ: 4,
      resonantDecay: 0.025,
      ...params
    };
    const t = atTime;
    const isOpen = !!open;
    const dur = isOpen ? p.durOpen : p.durClosed;
    const level = isOpen ? p.levelOpen : p.levelClosed;
    const v = Math.max(0.08, Math.min(1, level));
    const hpF = Math.min(16000, Math.max(100, p.hpF));
    const seed = 10000 + (isOpen ? 1 : 0);

    const ol = (p.addOscillators && p.oscFreq1 && p.oscFreq2) ? (p.oscLevel || 0.2) * v : 0;
    const resLev = p.resonantLevel || 0;
    const currentSum = v + v * (p.bodyLevel || 0) + ol + (p.stickLevel || 0) + resLev;
    const REF_SUM = 0.58 + 0.3 + 0.2 + 0.28 + 0.15;
    const compGain = REF_SUM / Math.max(currentSum, 0.05);
    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(compGain, t);
    outNorm.connect(destination);

    if (p.stickLevel > 0.001) {
      const stickFreq = Math.min(7000, Math.max(4000, p.stickFreq || 5500));
      const stickDec = Math.max(0.002, Math.min(0.02, p.stickDecay || 0.006));
      const stickNoiseDur = 0.012;
      const stickNoise = makeNoiseBuffer(ctx, stickNoiseDur, seed + 9999);
      const stickSrc = ctx.createBufferSource();
      stickSrc.buffer = stickNoise;
      const stickBp = ctx.createBiquadFilter();
      stickBp.type = 'bandpass';
      stickBp.frequency.value = stickFreq;
      stickBp.Q.value = 2;
      const stickG = ctx.createGain();
      stickG.gain.setValueAtTime(p.stickLevel, t);
      stickG.gain.exponentialRampToValueAtTime(0.001, t + stickDec);
      stickSrc.connect(stickBp).connect(stickG).connect(outNorm);
      stickSrc.start(t);
      stickSrc.stop(t + stickNoiseDur);
      const stickOsc = ctx.createOscillator();
      stickOsc.type = 'sine';
      stickOsc.frequency.value = stickFreq;
      const stickOscG = ctx.createGain();
      stickOscG.gain.setValueAtTime(p.stickLevel * 0.6, t);
      stickOscG.gain.exponentialRampToValueAtTime(0.001, t + stickDec);
      stickOsc.connect(stickOscG).connect(outNorm);
      stickOsc.start(t);
      stickOsc.stop(t + Math.max(stickDec, 0.008));
    }

    if (p.resonantLevel > 0.002) {
      const resFreq = Math.min(12000, Math.max(8000, p.resonantFreq || 10000));
      const resQ = Math.max(2, Math.min(12, p.resonantQ || 4));
      const resDec = Math.max(0.008, Math.min(0.08, p.resonantDecay || 0.025));
      const resNoiseDur = Math.min(0.06, resDec * 2);
      const resNoise = (p.noiseType === 'pink')
        ? makePinkBuffer(ctx, resNoiseDur, seed + 7777)
        : makeNoiseBuffer(ctx, resNoiseDur, seed + 7777);
      const resSrc = ctx.createBufferSource();
      resSrc.buffer = resNoise;
      const resBp = ctx.createBiquadFilter();
      resBp.type = 'bandpass';
      resBp.frequency.value = resFreq;
      resBp.Q.value = resQ;
      const resG = ctx.createGain();
      resG.gain.setValueAtTime(v * p.resonantLevel, t);
      resG.gain.exponentialRampToValueAtTime(0.001, t + resDec);
      resSrc.connect(resBp).connect(resG).connect(outNorm);
      resSrc.start(t);
      resSrc.stop(t + resNoiseDur);
    }

    if (p.bodyLevel > 0.005) {
      const bodyDur = Math.max(p.bodyDecay, 0.04);
      const bodyNoise = makeNoiseBuffer(ctx, bodyDur, seed + 5000);
      const bodySrc = ctx.createBufferSource();
      bodySrc.buffer = bodyNoise;
      const bodyBp = ctx.createBiquadFilter();
      bodyBp.type = 'bandpass';
      bodyBp.frequency.value = Math.min(10000, Math.max(150, p.bodyFreq));
      bodyBp.Q.value = 0.6;
      const bodyG = ctx.createGain();
      const bodyAttack = Math.max(0, Math.min(0.02, p.attack || 0));
      if (bodyAttack > 0.0005) {
        bodyG.gain.setValueAtTime(0, t);
        bodyG.gain.linearRampToValueAtTime(v * p.bodyLevel, t + bodyAttack);
      } else {
        bodyG.gain.setValueAtTime(v * p.bodyLevel, t);
      }
      bodyG.gain.exponentialRampToValueAtTime(0.001, t + p.bodyDecay);
      bodySrc.connect(bodyBp).connect(bodyG).connect(outNorm);
      bodySrc.start(t);
      bodySrc.stop(t + bodyDur);
    }

    const noise = (p.noiseType === 'pink')
      ? makePinkBuffer(ctx, Math.max(dur, isOpen ? 0.25 : 0.06), seed)
      : makeNoiseBuffer(ctx, Math.max(dur, isOpen ? 0.25 : 0.06), seed);
    const src = ctx.createBufferSource();
    src.buffer = noise;

    const filt = ctx.createBiquadFilter();
    filt.type = (p.filterType === 'bandpass') ? 'bandpass' : 'highpass';
    filt.frequency.value = hpF;
    filt.Q.value = (p.filterType === 'bandpass') ? (p.bpQ || 0.8) : 0.7;

    const gain = ctx.createGain();
    const attack = Math.max(0, Math.min(0.03, p.attack || 0));
    if (attack > 0.0005) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v, t + attack);
    } else {
      gain.gain.setValueAtTime(v, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filt).connect(gain).connect(outNorm);
    src.start(t);
    src.stop(t + Math.max(dur, isOpen ? 0.2 : 0.04));

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
      og1.gain.linearRampToValueAtTime(ol, t + 0.001);
      og2.gain.linearRampToValueAtTime(ol, t + 0.001);
      og1.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
      og2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
      osc1.connect(og1);
      osc2.connect(og2);
      og1.connect(filt);
      og2.connect(filt);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur + 0.05);
      osc2.stop(t + dur + 0.05);
    }
  }

  window.playHatTest = playHatTest;
})();
