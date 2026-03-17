(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.softPiano = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "triangle", detune: 0 }],
    attack: 0.01,
    decay: 0.32,
    sustain: 0.35,
    release: 0.36,
    noise: 0.02,
    filter: { type: "lowpass", base: 2200, velocity: 1600 },
  });
})();
