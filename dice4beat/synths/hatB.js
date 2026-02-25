/**
 * Hat synth B: dual parallel bandpass layers (two noise bands at different freqs) for metallic "chorus" character.
 * Same params; filterType/bpQ apply to both bands with offset. addOscillators still adds sines.
 */
(function () {
  const DEFAULTS = { durClosed: 0.05, durOpen: 0.2, hpF: 7000, levelClosed: 0.4, levelOpen: 0.35, noiseType: 'white', filterType: 'bandpass', bpQ: 1.2, addOscillators: false, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.18 };

  function playHatB(synth, open, velocity, atTime, options, soundParams) {
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
    const bpQ = (p.filterType === 'bandpass') ? (p.bpQ || 1.2) : 0.7;
    const mix = synth.ctx.createGain();
    mix.gain.value = 1;

    // Layer 1: lower band (darker)
    const f1 = hpF * 0.72;
    const noise1 = (p.noiseType === 'pink' && synth._pinkNoise) ? synth._pinkNoise(open ? 0.25 : 0.06, seed + 10000) : synth._noise(open ? 0.25 : 0.06, true, seed + 10000);
    const src1 = synth.ctx.createBufferSource();
    src1.buffer = noise1;
    const bp1 = synth.ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = f1;
    bp1.Q.value = bpQ * 1.1;
    const g1 = synth.ctx.createGain();
    g1.gain.setValueAtTime(humanize.attack ? v * 0.6 * synth._attackVar(3.15 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 2)) : v * 0.6, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
    src1.connect(bp1).connect(g1).connect(mix);

    // Layer 2: higher band (brighter) — different seed for variation
    const f2 = hpF * 1.25;
    const noise2 = (p.noiseType === 'pink' && synth._pinkNoise) ? synth._pinkNoise(open ? 0.25 : 0.06, seed + 15000) : synth._noise(open ? 0.25 : 0.06, true, seed + 15000);
    const src2 = synth.ctx.createBufferSource();
    src2.buffer = noise2;
    const bp2 = synth.ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = Math.min(14000, f2);
    bp2.Q.value = bpQ * 0.9;
    const g2 = synth.ctx.createGain();
    g2.gain.setValueAtTime(humanize.attack ? v * 0.55 * synth._attackVar(3.15 * (humanize.attackAmount ?? 1), synth._pseudoRand(seed + 3)) : v * 0.55, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src2.connect(bp2).connect(g2).connect(mix);

    mix.connect(synth.master);
    src1.start(t);
    src1.stop(t + Math.max(dur, open ? 0.2 : 0.04));
    src2.start(t);
    src2.stop(t + Math.max(dur, open ? 0.2 : 0.04));

    if (p.addOscillators && p.oscFreq1 && p.oscFreq2) {
      const ol = (p.oscLevel || 0.18) * v;
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
      og1.connect(mix);
      og2.connect(mix);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur + 0.05);
      osc2.stop(t + dur + 0.05);
    }
  }

  window.playHatSynthB = playHatB;
})();
