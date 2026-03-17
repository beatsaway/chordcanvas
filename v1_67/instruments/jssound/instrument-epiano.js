(() => {
  const registry = (window.PremiumSoundInstrumentProfiles =
    window.PremiumSoundInstrumentProfiles || {});
  registry.epiano = ({
    velocity,
    velocityNormalized,
    durationSeconds,
    note,
  } = {}) => ({
    oscillators: [{ type: "square", detune: -0.0352 }, { type: "triangle", detune: 0.0311 }],
    attack: 0.0025,
    decay: 0.12,
    sustain: 0.25,
    release: 0.18,
    noise: 0.05,
    filter: { type: "lowpass", base: 7200, velocity: 4200 },
  });
})();
