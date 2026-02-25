(function () {
  'use strict';

  function makeNoiseBuffer(ctx, duration) {
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
    return buf;
  }

  function playKickTest(ctx, destination, params, atTime) {
    atTime = atTime || 0;
    const p = {
      f0: 150,
      f1: 42,
      pitchRampTime: 0.055,
      decayBase: 0.45,
      bodyLevel: 0.75,
      bodyShape: 0.7,
      bodyPunchHold: 0.012,
      bodyPunchTime: 0.045,
      bodyTailLevel: 0.12,
      bodyHighpassHz: 32,
      clickNoiseLevel: 0.3,
      clickOscLevel: 0.22,
      clickFreq: 3800,
      clickDecay: 0.005,
      clickFilterQ: 2,
      fmAmount: 0.35,
      fmDecay: 0.06,
      fmFreqMult: 1.6,
      ...params
    };
    const t = atTime;
    const decay = Math.max(0.2, p.decayBase);
    const v = p.bodyLevel;
    const shape = Math.max(0, Math.min(1, p.bodyShape));
    const hold = Math.max(0.002, p.bodyPunchHold || 0);
    const punchTime = Math.max(hold + 0.01, Math.min(p.bodyPunchTime, decay * 0.5));
    const tailGain = v * Math.max(0.05, p.bodyTailLevel);

    const REF_SUM = 0.75 + 0.3 + 0.22;
    const estimatedSum = p.bodyLevel + p.clickNoiseLevel + p.clickOscLevel;
    const compGain = REF_SUM / Math.max(estimatedSum, 0.05);
    const outNorm = ctx.createGain();
    outNorm.gain.setValueAtTime(compGain, t);

    const bodyOut = ctx.createGain();
    bodyOut.gain.value = 1;

    const oscTri = ctx.createOscillator();
    const oscSquare = ctx.createOscillator();
    oscTri.type = 'triangle';
    oscSquare.type = 'square';
    const f1Safe = Math.max(20, p.f1);
    const dropTime = 0.25 * p.pitchRampTime;
    oscTri.frequency.setValueAtTime(p.f0, t);
    oscTri.frequency.exponentialRampToValueAtTime(f1Safe, t + dropTime);
    oscSquare.frequency.setValueAtTime(p.f0, t);
    oscSquare.frequency.exponentialRampToValueAtTime(f1Safe, t + dropTime);

    const rmsNorm = 0.577 + 0.423 * shape;
    const gainTri = ctx.createGain();
    const gainSquare = ctx.createGain();
    gainTri.gain.setValueAtTime((v * (1 - shape)) / rmsNorm, t);
    gainTri.gain.setValueAtTime((v * (1 - shape)) / rmsNorm, t + hold);
    gainTri.gain.exponentialRampToValueAtTime(Math.max(0.001, (tailGain * (1 - shape)) / rmsNorm), t + punchTime);
    gainTri.gain.exponentialRampToValueAtTime(0.001, t + decay);
    gainSquare.gain.setValueAtTime((v * shape) / rmsNorm, t);
    gainSquare.gain.setValueAtTime((v * shape) / rmsNorm, t + hold);
    gainSquare.gain.exponentialRampToValueAtTime(Math.max(0.001, (tailGain * shape) / rmsNorm), t + punchTime);
    gainSquare.gain.exponentialRampToValueAtTime(0.001, t + decay);

    oscTri.connect(gainTri);
    oscSquare.connect(gainSquare);
    gainTri.connect(bodyOut);
    gainSquare.connect(bodyOut);
    oscTri.start(t);
    oscSquare.start(t);
    oscTri.stop(t + Math.max(decay, 0.4));
    oscSquare.stop(t + Math.max(decay, 0.4));

    if (p.bodyHighpassHz > 0) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = p.bodyHighpassHz;
      hp.Q.value = 0.7;
      bodyOut.connect(hp);
      hp.connect(outNorm);
    } else {
      bodyOut.connect(outNorm);
    }
    outNorm.connect(destination);

    if (p.fmAmount > 0.01) {
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = Math.min(140, p.f0 * p.fmFreqMult);
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(p.f0 * p.fmAmount, t);
      modGain.gain.exponentialRampToValueAtTime(0.001, t + p.fmDecay);
      mod.connect(modGain);
      modGain.connect(oscTri.frequency);
      modGain.connect(oscSquare.frequency);
      mod.start(t);
      mod.stop(t + p.fmDecay + 0.02);
    }

    if (p.clickNoiseLevel > 0.001) {
      const noise = makeNoiseBuffer(ctx, 0.025);
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = p.clickFreq;
      bp.Q.value = p.clickFilterQ;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(p.clickNoiseLevel, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + p.clickDecay);
      src.connect(bp).connect(cg).connect(outNorm);
      src.start(t);
      src.stop(t + 0.028);
    }

    if (p.clickOscLevel > 0.001) {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'sine';
      clickOsc.frequency.value = p.clickFreq;
      const clickG = ctx.createGain();
      clickG.gain.setValueAtTime(p.clickOscLevel, t);
      clickG.gain.exponentialRampToValueAtTime(0.001, t + p.clickDecay);
      clickOsc.connect(clickG).connect(outNorm);
      clickOsc.start(t);
      clickOsc.stop(t + Math.max(p.clickDecay, 0.008));
    }
  }

  window.playKickTest = playKickTest;
})();
