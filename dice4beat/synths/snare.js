/**
 * Snare synth: playSnare(synth, velocity, atTime, options, soundParams)
 * Optional: noiseFilterType 'highpass'|'bandpass' (default highpass), noiseFilterFreq, noiseFilterQ; bodyOscType 'triangle'|'sine'.
 */
(function () {
  const DEFAULTS = { decayN: 0.2, decayT: 0.12, bodyF: 200, bodyFEnd: 120, hpF: 1800, toneLevel: 0.5, noiseFilterType: 'highpass', noiseFilterFreq: 4000, noiseFilterQ: 1, bodyOscType: 'triangle' };

  function playSnare(synth, velocity, atTime, options, soundParams) {
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
    const noiseFreq = humanize.pitch ? synth._pitchVar(p.noiseFilterType === 'bandpass' ? p.noiseFilterFreq : hpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 4)) : (p.noiseFilterType === 'bandpass' ? p.noiseFilterFreq : hpF);
    const noise = synth._noise(0.25, false, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = noise;
    const noiseFilter = synth.ctx.createBiquadFilter();
    noiseFilter.type = p.noiseFilterType === 'bandpass' ? 'bandpass' : 'highpass';
    noiseFilter.frequency.value = noiseFreq;
    noiseFilter.Q.value = p.noiseFilterType === 'bandpass' ? (p.noiseFilterQ || 1) : 0.7;
    const ng = synth.ctx.createGain();
    ng.gain.setValueAtTime(v, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + decayN);
    src.connect(noiseFilter).connect(ng);
    const tone = synth.ctx.createOscillator();
    tone.type = (p.bodyOscType === 'sine') ? 'sine' : 'triangle';
    tone.frequency.setValueAtTime(bodyF, t);
    tone.frequency.exponentialRampToValueAtTime(bodyFEnd, t + 0.1);
    const tg = synth.ctx.createGain();
    tg.gain.setValueAtTime(p.toneLevel * v, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + decayT);
    tone.connect(tg);
    const mix = synth.ctx.createGain();
    mix.gain.value = 1;
    ng.connect(mix);
    tg.connect(mix);
    if (humanize.detune && (humanize.detuneAmount ?? 0) > 0) {
      const tone2 = synth.ctx.createOscillator();
      tone2.type = (p.bodyOscType === 'sine') ? 'sine' : 'triangle';
      tone2.detune.value = synth._detuneCents(humanize.detuneAmount, synth._pseudoRand(seed + 5));
      tone2.frequency.setValueAtTime(bodyF, t);
      tone2.frequency.exponentialRampToValueAtTime(bodyFEnd, t + 0.1);
      const tg2 = synth.ctx.createGain();
      tg2.gain.setValueAtTime(0.35 * v, t);
      tg2.gain.exponentialRampToValueAtTime(0.001, t + decayT);
      tone2.connect(tg2).connect(mix);
      tone2.start(t);
      tone2.stop(t + 0.14);
    }
    mix.connect(synth.master);
    src.start(t);
    src.stop(t + Math.max(decayN, 0.2));
    tone.start(t);
    tone.stop(t + 0.14);
    if (humanize.snareBuzz && (humanize.snareBuzzAmount ?? 0) > 0) {
      const buzzDecay = humanize.decay ? synth._decayVar(0.35, 1.5 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed + 6)) : 0.35;
      const buzzGain = 1.8 * v * (humanize.snareBuzzAmount ?? 0.5) * (0.85 + 0.3 * synth._pseudoRand(seed + 7));
      const buzzNoise = synth._noise(0.4, false, seed + 20000);
      const buzzSrc = synth.ctx.createBufferSource();
      buzzSrc.buffer = buzzNoise;
      const buzzBp = synth.ctx.createBiquadFilter();
      buzzBp.type = 'bandpass';
      buzzBp.frequency.value = 2200;
      buzzBp.Q.value = 0.8;
      const buzzG = synth.ctx.createGain();
      buzzG.gain.setValueAtTime(buzzGain, t);
      buzzG.gain.exponentialRampToValueAtTime(0.001, t + buzzDecay);
      buzzSrc.connect(buzzBp).connect(buzzG).connect(mix);
      buzzSrc.start(t);
      buzzSrc.stop(t + 0.4);
    }
  }

  window.playSnareSynth = playSnare;
})();
