(() => {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function guessAdsr({
    velocityNormalized = 0.6,
    pitchNormalized = 0.5,
    durationSeconds = 0.5,
    baseAttack = 0.012,
    baseDecay = 0.12,
    baseSustain = 0.85,
    baseRelease = 0.22,
    
    attackRange = 0.012,
    decayRange = 0.08,
    sustainRange = 0.2,
    releaseRange = 0.18,
  } = {}) {
    const vel = clamp(velocityNormalized, 0, 1);
    const pitch = clamp(pitchNormalized, 0, 1);
    const dur = Math.max(0, Number(durationSeconds) || 0);
    const durationFactor = clamp(dur / 2, 0, 1);

    const attack = clamp(baseAttack - vel * attackRange * 0.6 - pitch * attackRange * 0.4, 0.003, 0.03);
    const decay = clamp(baseDecay - pitch * decayRange * 0.6 - vel * decayRange * 0.2, 0.04, 0.18);
    const sustain = clamp(baseSustain - pitch * sustainRange * 0.6 - vel * sustainRange * 0.2, 0.55, 0.95);
    const release = clamp(
      baseRelease + durationFactor * releaseRange * 0.6 + (1 - vel) * releaseRange * 0.2 - pitch * releaseRange * 0.4,
      0.06,
      0.35
    );

    return { attack, decay, sustain, release };
  }

  window.PremiumSoundAdsrGuess = {
    guessAdsr,
  };
})();
