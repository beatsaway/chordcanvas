/**
 * Hat synth: playHat(synth, open, velocity, atTime, options, soundParams)
 * Optional: noiseType 'white'|'pink' (from @synths), filterType 'highpass'|'bandpass', bpQ; addOscillators + oscFreq1, oscFreq2, oscLevel (two sines like @synths hihat).
 */
(function () {
  const DEFAULTS = { durClosed: 0.05, durOpen: 0.2, hpF: 7000, levelClosed: 0.4, levelOpen: 0.35, noiseType: 'white', filterType: 'highpass', bpQ: 0.8, addOscillators: false, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.2 };

  function playHat(synth, open, velocity, atTime, options, soundParams) {
    const p = { ...DEFAULTS, ...(soundParams || {}) };
    const { timeOffset = 0, velScale = 1, humanize = {} } = options;
    const seed = synth._humanizeSeed(options);
    const t = atTime + timeOffset;
    const level = open ? p.levelOpen : p.levelClosed;
    let v = Math.max(0, Math.min(1, velocity * velScale)) * level;
    if (humanize.velocityTone) v *= synth._velTone(velocity);
    const baseDur = open ? p.durOpen : p.durClosed;
    const dur = humanize.decay ? synth._decayVar(baseDur, 1.98 * (humanize.decayAmount ?? 1), synth._pseudoRand(seed)) : baseDur;
    const hpF = humanize.pitch ? synth._pitchVar(p.hpF, 0.45 * (humanize.pitchAmount ?? 1), synth._pseudoRand(seed + 1)) : p.hpF;
    const noise = (p.noiseType === 'pink' && synth._pinkNoise) ? synth._pinkNoise(open ? 0.25 : 0.06, seed + 10000) : synth._noise(open ? 0.25 : 0.06, true, seed + 10000);
    const src = synth.ctx.createBufferSource();
    src.buffer = noise;
    const filt = synth.ctx.createBiquadFilter();
    filt.type = (p.filterType === 'bandpass') ? 'bandpass' : 'highpass';
    filt.frequency.value = hpF;
    filt.Q.value = (p.filterType === 'bandpass') ? (p.bpQ || 0.8) : 0.7;
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(humanize.attack ? v * synth._attackVar(3.15 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 2)) : v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(gain).connect(synth.master);
    src.start(t);
    src.stop(t + Math.max(dur, open ? 0.2 : 0.04));
    if (p.addOscillators && p.oscFreq1 && p.oscFreq2) {
      const ol = (p.oscLevel || 0.2) * v;
      const osc1 = synth.ctx.createOscillator();
      const osc2 = synth.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = p.oscFreq1;
      osc2.frequency.value = p.oscFreq2;
      const og1 = synth.ctx.createGain();
      const og2 = synth.ctx.createGain();
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

  window.playHatSynth = playHat;
})();
