(() => {
  function applyFilterDecay(filter, cutoff, eventTime, noteDurationSeconds, filterDecay) {
    if (!filterDecay?.amount) return;
    const target = Math.max(80, cutoff - filterDecay.amount);
    const decayTime = Math.max(
      0.1,
      Math.min(filterDecay.time ?? 0.6, noteDurationSeconds || 0.6)
    );
    filter.frequency.linearRampToValueAtTime(target, eventTime + decayTime);
  }

  function applyFormantFilters(
    ctx,
    inputNode,
    formants,
    eventTime,
    scheduled,
    velocityNormalized = 0,
    noteDurationSeconds = 0,
    bpm = 0
  ) {
    if (!formants || !formants.length) return inputNode;
    let lastNode = inputNode;
    formants.forEach((formant) => {
      const filter = ctx.createBiquadFilter();
      filter.type = formant.type || "peaking";
      const baseFreq = Number(formant.frequency) || 1000;
      const velocityShift = Number(formant.velocityShift) || 0;
      const shiftedFreq = baseFreq * (1 + velocityNormalized * velocityShift);
      const freq = Math.max(20, Math.min(20000, shiftedFreq));
      const q = Math.max(0.1, Math.min(18, Number(formant.q) || 3));
      filter.frequency.setValueAtTime(freq, eventTime);
      filter.Q.setValueAtTime(q, eventTime);
      if (filter.type === "peaking") {
        const gain = Math.max(-24, Math.min(24, Number(formant.gain) || 3));
        filter.gain.setValueAtTime(gain, eventTime);
      }
      const baseDriftDepth =
        Number(formant.driftDepth ?? formant.drift?.depth ?? formant.drift) || 0;
      const durationScale = Math.max(0, Math.min(1, (Number(noteDurationSeconds) || 0) / 2));
      const maxDriftDepth = Number(formant.drift?.maxDepth) || baseDriftDepth;
      const driftDepth = Math.min(
        maxDriftDepth,
        baseDriftDepth * (1 + durationScale * 0.4)
      );
      const rateFromBpm = Boolean(formant.drift?.rateFromBpm);
      const fallbackRate = Number(formant.drift?.rateHz ?? formant.driftRateHz) || 0.3;
      const rateHz = rateFromBpm
        ? Math.max(0.05, Math.min(2, (Number(bpm) || 0) / 240))
        : Math.max(0.05, Math.min(2, fallbackRate));
      if (driftDepth > 0 && rateHz > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(rateHz, eventTime);
        lfoGain.gain.setValueAtTime(freq * driftDepth, eventTime);
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start(eventTime);
        const stopTime = eventTime + Math.max(0.2, Number(noteDurationSeconds) || 0) + 0.2;
        lfo.stop(stopTime);
        if (scheduled) {
          scheduled.push(lfo);
          scheduled.push(lfoGain);
        }
      }
      lastNode.connect(filter);
      lastNode = filter;
      if (scheduled) scheduled.push(filter);
    });
    return lastNode;
  }

  window.PremiumSoundHarmonics = {
    applyFormantFilters,
    applyFilterDecay,
  };
})();
