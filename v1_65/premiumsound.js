(() => {
    function createPremiumSound() {
    let audioCtx = null;
    let masterGain = null;
    let compressor = null;
    let dryGain = null;
    let delaySend = null;
    let delayNode = null;
    let delayFeedback = null;
    let delayWet = null;
    let reverbSend = null;
    let reverbNode = null;
    let reverbWet = null;
    let widthSplit = null;
    let midSum = null;
    let sideSum = null;
    let midGain = null;
    let sideGain = null;
    let sideGainInv = null;
    let widthMerge = null;
    let invGain = null;
    let scheduledNodes = [];
    let currentPreset = "warmPad";
    let noiseBuffer = null;
    let suspendTimeout = null;
    let rafId = 0;
    let lastEffects = { delay: 0, reverb: 0, midEq: -50 };
    let preparePromise = null;
    let bufferRafId = 0;
    let lastMasterVolume = 0.9;

    const DEFAULT_PRESET_NAME = "warmPad";

    function getInstrumentRegistry() {
      if (!window.PremiumSoundInstrumentProfiles) {
        window.PremiumSoundInstrumentProfiles = {};
      }
      return window.PremiumSoundInstrumentProfiles;
    }

    function resolvePreset(name, context = {}) {
      const registry = getInstrumentRegistry();
      const provider = registry[name];
      if (typeof provider === "function") {
        const preset = provider(context);
        if (preset && preset.attack != null) {
          if (preset.type === "sample" && preset.zones) return preset;
          if (preset.oscillators) return preset;
        }
      }
      const fallbackProvider = registry[DEFAULT_PRESET_NAME];
      if (typeof fallbackProvider === "function") {
        const fallback = fallbackProvider(context);
        if (fallback && fallback.attack != null) {
          if (fallback.type === "sample" && fallback.zones) return fallback;
          if (fallback.oscillators) return fallback;
        }
      }
      return {
        oscillators: [{ type: "sine", detune: 0 }],
        attack: 0.01,
        decay: 0.12,
        sustain: 0.8,
        release: 0.25,
        filter: { type: "lowpass", base: 1600, velocity: 2000 },
      };
    }

    function getHarmonics() {
      return window.PremiumSoundHarmonics || null;
    }
  
    function noteToFrequency(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }
  
    function createImpulseResponse(ctx, seconds, decay) {
      const length = Math.floor(ctx.sampleRate * seconds);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          const t = i / length;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return impulse;
    }
  
    function buildNoiseBuffer(ctx) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }
  
    function ensureAudioGraph() {
      if (!audioCtx) {
        audioCtx = new AudioContext();
      }
      if (masterGain) return;
  
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.9, audioCtx.currentTime);
  
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      compressor.knee.setValueAtTime(12, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(3, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
  
      dryGain = audioCtx.createGain();
      delaySend = audioCtx.createGain();
      delayNode = audioCtx.createDelay(1.5);
      delayFeedback = audioCtx.createGain();
      delayWet = audioCtx.createGain();
      reverbSend = audioCtx.createGain();
      reverbNode = audioCtx.createConvolver();
      reverbWet = audioCtx.createGain();
      widthSplit = audioCtx.createChannelSplitter(2);
      midSum = audioCtx.createGain();
      sideSum = audioCtx.createGain();
      midGain = audioCtx.createGain();
      sideGain = audioCtx.createGain();
      sideGainInv = audioCtx.createGain();
      widthMerge = audioCtx.createChannelMerger(2);
      invGain = audioCtx.createGain();
  
      delayNode.delayTime.setValueAtTime(0.22, audioCtx.currentTime);
      delayFeedback.gain.setValueAtTime(0.35, audioCtx.currentTime);
      reverbNode.buffer = createImpulseResponse(audioCtx, 2.2, 2.4);
      midGain.gain.setValueAtTime(1, audioCtx.currentTime);
      sideGain.gain.setValueAtTime(1, audioCtx.currentTime);
      invGain.gain.setValueAtTime(-1, audioCtx.currentTime);
      sideGainInv.gain.setValueAtTime(-1, audioCtx.currentTime);
  
      delaySend.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayWet);
  
      reverbSend.connect(reverbNode);
      reverbNode.connect(reverbWet);
  
      dryGain.connect(compressor);
      delayWet.connect(compressor);
      reverbWet.connect(compressor);
      compressor.connect(widthSplit);
      widthSplit.connect(midSum, 0);
      widthSplit.connect(midSum, 1);
      widthSplit.connect(sideSum, 0);
      widthSplit.connect(invGain, 1);
      invGain.connect(sideSum);
      midSum.connect(midGain);
      sideSum.connect(sideGain);
      sideGain.connect(sideGainInv);
      midGain.connect(widthMerge, 0, 0);
      sideGain.connect(widthMerge, 0, 0);
      midGain.connect(widthMerge, 0, 1);
      sideGainInv.connect(widthMerge, 0, 1);
      widthMerge.connect(masterGain);
      masterGain.connect(audioCtx.destination);
  
      setEffects(lastEffects);
    }
  
    function prepare({ warmupSeconds = 0.2 } = {}) {
      ensureAudioGraph();
      if (!audioCtx) return Promise.resolve();
      if (suspendTimeout) {
        clearTimeout(suspendTimeout);
        suspendTimeout = null;
      }
      if (preparePromise) return preparePromise;
      preparePromise = (async () => {
        if (audioCtx.state !== "running") {
          try {
            await audioCtx.resume();
          } catch {
            // ignore
          }
        }
        if (!noiseBuffer) {
          noiseBuffer = buildNoiseBuffer(audioCtx);
        }
        if (warmupSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, warmupSeconds * 1000));
        }
      })().finally(() => {
        preparePromise = null;
      });
      return preparePromise;
    }
  
    function setEffects({ delay = 0, reverb = 0, midEq = 0 } = {}) {
      lastEffects = { delay, reverb, midEq };
      if (!audioCtx) return;
      const time = audioCtx.currentTime;
      delaySend.gain.setTargetAtTime(delay * 0.5, time, 0.01);
      delayWet.gain.setTargetAtTime(delay * 0.5, time, 0.01);
      reverbSend.gain.setTargetAtTime(reverb * 0.6, time, 0.01);
      reverbWet.gain.setTargetAtTime(reverb * 0.6, time, 0.01);
      const clamped = Math.max(-100, Math.min(0, midEq));
      const db = -36 + ((clamped + 100) / 100) * 24;
      const midAmount = Math.pow(10, db / 20);
      midGain.gain.setTargetAtTime(midAmount, time, 0.03);
      sideGain.gain.setTargetAtTime(1, time, 0.03);
    }

    function setMasterVolume(value = 0.9) {
      const volume = Math.max(0, Math.min(8, value)); // allow up to 800%
      lastMasterVolume = volume;
      if (!audioCtx || !masterGain) return;
      masterGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.01);
    }
  
    function setPreset(name) {
      const registry = getInstrumentRegistry();
      currentPreset = registry[name] ? name : DEFAULT_PRESET_NAME;
    }

    function ensureCurrentPresetLoaded() {
      ensureAudioGraph();
      if (!audioCtx) return Promise.resolve();
      const baseUrl = (typeof document !== "undefined" && document.baseURI) ? document.baseURI : (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "";
      const isGslPreset = typeof window !== "undefined" && window.InstrumentSampleHandler && window.InstrumentSampleHandler.isGslPreset && window.InstrumentSampleHandler.isGslPreset(currentPreset);
      const preset0 = resolvePreset(currentPreset, { note: 60, velocity: 127, velocityNormalized: 1, durationSeconds: 0, bpm: 0 });
      const isSamplePreset = (isGslPreset || (preset0.type === "sample" && preset0.zones)) && typeof window !== "undefined" && window.InstrumentSampleHandler;
      return isSamplePreset
        ? window.InstrumentSampleHandler.ensurePresetLoaded(audioCtx, currentPreset, baseUrl)
        : Promise.resolve();
    }
  
    function stop({ suspend = true } = {}) {
      scheduledNodes.forEach((node) => {
        try {
          node.stop();
        } catch {
          // ignore
        }
        if (node.disconnect) {
          node.disconnect();
        }
      });
      scheduledNodes = [];
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (bufferRafId) {
        cancelAnimationFrame(bufferRafId);
        bufferRafId = 0;
      }
      if (audioCtx && audioCtx.state !== "closed") {
        if (masterGain) {
          const now = audioCtx.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.linearRampToValueAtTime(0, now + 0.02);
        }
        if (suspendTimeout) {
          clearTimeout(suspendTimeout);
        }
        if (suspend) {
          suspendTimeout = setTimeout(() => {
            audioCtx.suspend().catch(() => {});
          }, 80);
        }
      }
    }
  
    function scheduleVolumeAutomation(gainParam, events, startTime) {
      if (!gainParam || !events || events.length === 0) return;
      const volumeEvents = events
        .filter((event) => event.type === "volume")
        .sort((a, b) => (a.timeSeconds || 0) - (b.timeSeconds || 0));
      if (!volumeEvents.length) return;
      const clamp = (value) => Math.max(0, Math.min(2, Number(value) || 0));
      const abruptGainDelta = 0.2;
      const abruptTimeWindow = 0.05;
      let lastValue = clamp(volumeEvents[0].value);
      let lastTime = Math.max(0, volumeEvents[0].timeSeconds || 0);
      const trackLabel = volumeEvents[0].track || "synth";
      const firstTime = startTime + Math.max(0, volumeEvents[0].timeSeconds || 0);
      gainParam.setValueAtTime(gainParam.value, startTime);
      gainParam.linearRampToValueAtTime(clamp(volumeEvents[0].value), firstTime);
      for (let i = 1; i < volumeEvents.length; i += 1) {
        const rawTime = Math.max(0, volumeEvents[i].timeSeconds || 0);
        const eventTime = startTime + rawTime;
        const nextValue = clamp(volumeEvents[i].value);
        const delta = Math.abs(nextValue - lastValue);
        const dt = rawTime - lastTime;
        if (dt >= 0 && dt <= abruptTimeWindow && delta >= abruptGainDelta) {
          console.log(
            `[synth volume] abrupt transition (${trackLabel})`,
            { from: lastValue, to: nextValue, delta, dt }
          );
        }
        gainParam.linearRampToValueAtTime(nextValue, eventTime);
        lastValue = nextValue;
        lastTime = rawTime;
      }
    }

    function buildNoteDurationMap(events) {
      const pending = new Map();
      const durations = new Map();
      events.forEach((event) => {
        if (event.type === "noteOn") {
          const list = pending.get(event.note) || [];
          list.push(event);
          pending.set(event.note, list);
        } else if (event.type === "noteOff") {
          const list = pending.get(event.note);
          if (list && list.length) {
            const onEvent = list.shift();
            const duration = Math.max(0, event.timeSeconds - onEvent.timeSeconds);
            durations.set(onEvent, duration);
          }
        }
      });
      return durations;
    }

    function play({ events, durationSeconds, bpm = 0 }, onProgress, onDone, options = {}) {
      if (!events || events.length === 0) return Promise.resolve();
      const { overlap = false, preloadSeconds = 0.18 } = options;
      ensureAudioGraph();
      if (suspendTimeout) {
        clearTimeout(suspendTimeout);
        suspendTimeout = null;
      }
      const baseUrl = (typeof document !== "undefined" && document.baseURI) ? document.baseURI : (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "";
      const isGslPreset = typeof window !== "undefined" && window.InstrumentSampleHandler && window.InstrumentSampleHandler.isGslPreset && window.InstrumentSampleHandler.isGslPreset(currentPreset);
      const preset0 = resolvePreset(currentPreset, { note: 60, velocity: 127, velocityNormalized: 1, durationSeconds: 0, bpm: 0 });
      const isSamplePreset = (isGslPreset || (preset0.type === "sample" && preset0.zones)) && typeof window !== "undefined" && window.InstrumentSampleHandler;
      const loadPromise = isSamplePreset
        ? window.InstrumentSampleHandler.ensurePresetLoaded(
            audioCtx,
            currentPreset,
            baseUrl
          )
        : Promise.resolve();
      return loadPromise.then(() => {
        const now = audioCtx.currentTime;
        audioCtx.resume().catch(() => {});
        masterGain.gain.cancelScheduledValues(now);
        // Use lastMasterVolume so volume survives stop() and preset changes (masterGain.gain.value can be 0 after stop())
        masterGain.gain.setValueAtTime(overlap ? lastMasterVolume : 0, now);
        if (!overlap) {
          masterGain.gain.linearRampToValueAtTime(lastMasterVolume, now + 0.03);
        }

        if (!noiseBuffer) {
          noiseBuffer = buildNoiseBuffer(audioCtx);
        }

        const noteDurations = buildNoteDurationMap(events);
        const startTime = audioCtx.currentTime + preloadSeconds;
        // Leave masterGain at current value (set by setMasterVolume / audio settings); do not overwrite with 0.9
        const playbackGain = audioCtx.createGain();
        playbackGain.gain.setValueAtTime(1, startTime);
        playbackGain.connect(dryGain);
        playbackGain.connect(delaySend);
        playbackGain.connect(reverbSend);
        scheduledNodes.push(playbackGain);
        const activeNotes = new Map();
        scheduleVolumeAutomation(playbackGain.gain, events, startTime);

        events.forEach((event) => {
          const eventTime = startTime + event.timeSeconds;
          if (event.type === "noteOn") {
            const velocityNormalized = Math.max(0.02, event.velocity / 127);
            const noteDurationSeconds = noteDurations.get(event) ?? 0;
            const preset = resolvePreset(currentPreset, {
              note: event.note,
              velocity: event.velocity,
              velocityNormalized,
              durationSeconds: noteDurationSeconds,
              bpm,
            });
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0, eventTime);
            gain.connect(playbackGain);
            const peak = velocityNormalized;
            const sustain = velocityNormalized * preset.sustain;
            gain.gain.linearRampToValueAtTime(peak, eventTime + preset.attack);
            gain.gain.linearRampToValueAtTime(
              sustain,
              eventTime + preset.attack + preset.decay
            );

            if (preset.type === "sample" && preset.zones && window.InstrumentSampleHandler) {
              const zone = window.InstrumentSampleHandler.getZoneForMidi(currentPreset, event.note);
              const buf = window.InstrumentSampleHandler.getZoneBuffer(zone, audioCtx);
              if (zone && buf) {
                const originalPitchSemitones = zone.originalPitchCents / 100;
                const playbackRate = Math.pow(2, (event.note - originalPitchSemitones) / 12);
                const loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
                const loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);
                const src = audioCtx.createBufferSource();
                src.buffer = buf;
                src.playbackRate.setValueAtTime(playbackRate, eventTime);
                src.loop = true;
                src.loopStart = loopStart;
                src.loopEnd = loopEnd;
                src.connect(gain);
                src.start(eventTime);
                scheduledNodes.push(src);
                const list = activeNotes.get(event.note) || [];
                list.push({ gain, bufferSource: src, sustain, release: preset.release });
                activeNotes.set(event.note, list);
              }
              scheduledNodes.push(gain);
              return;
            }

            const voiceGain = audioCtx.createGain();
            voiceGain.gain.setValueAtTime(1, eventTime);
            let lastNode = voiceGain;
            const harmonics = getHarmonics();
            if (harmonics?.applyFormantFilters) {
              lastNode = harmonics.applyFormantFilters(
                audioCtx,
                lastNode,
                preset.formants,
                eventTime,
                scheduledNodes,
                velocityNormalized,
                noteDurationSeconds,
                bpm
              );
            }
            if (preset.filter) {
              const filter = audioCtx.createBiquadFilter();
              filter.type = preset.filter.type;
              const cutoff = preset.filter.base + preset.filter.velocity * velocityNormalized;
              filter.frequency.setValueAtTime(cutoff, eventTime);
              if (preset.filterDecay?.amount && harmonics?.applyFilterDecay) {
                harmonics.applyFilterDecay(
                  filter,
                  cutoff,
                  eventTime,
                  noteDurationSeconds,
                  preset.filterDecay
                );
              }
              lastNode.connect(filter);
              lastNode = filter;
              scheduledNodes.push(filter);
            }

            lastNode.connect(gain);

            const oscillators = preset.oscillators.map((config) => {
              const osc = audioCtx.createOscillator();
              osc.type = config.type;
              osc.detune.setValueAtTime(config.detune || 0, eventTime);
              osc.frequency.setValueAtTime(noteToFrequency(event.note), eventTime);
              osc.connect(voiceGain);
              osc.start(eventTime);
              scheduledNodes.push(osc);
              return osc;
            });

            if (preset.noise) {
              const noiseSource = audioCtx.createBufferSource();
              const noiseGain = audioCtx.createGain();
              noiseSource.buffer = noiseBuffer;
              noiseGain.gain.setValueAtTime(velocityNormalized * preset.noise, eventTime);
              noiseGain.gain.exponentialRampToValueAtTime(
                0.0001,
                eventTime + Math.min(0.06, preset.attack + 0.04)
              );
              noiseSource.connect(noiseGain).connect(voiceGain);
              noiseSource.start(eventTime);
              noiseSource.stop(eventTime + 0.08);
              scheduledNodes.push(noiseSource);
              scheduledNodes.push(noiseGain);
            }

            const list = activeNotes.get(event.note) || [];
            list.push({ gain, oscillators, sustain, release: preset.release });
            activeNotes.set(event.note, list);
            scheduledNodes.push(gain);
            scheduledNodes.push(voiceGain);
          } else if (event.type === "noteOff") {
            const list = activeNotes.get(event.note);
            if (list && list.length) {
              const voice = list.shift();
              const releaseTime = voice.release ?? 0;
              voice.gain.gain.cancelScheduledValues(eventTime);
              voice.gain.gain.setValueAtTime(voice.sustain, eventTime);
              voice.gain.gain.linearRampToValueAtTime(0.0001, eventTime + releaseTime);
              const stopTime = eventTime + releaseTime + 0.05;
              if (voice.bufferSource) {
                voice.bufferSource.stop(stopTime);
              }
              if (voice.oscillators) {
                voice.oscillators.forEach((osc) => {
                  osc.stop(stopTime);
                });
              }
            }
          }
        });
  
      const tick = () => {
        const elapsed = audioCtx.currentTime - startTime;
        const percent = Math.min(elapsed / durationSeconds, 1);
        if (onProgress) onProgress(percent);
        if (percent < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          if (overlap) {
            const endTime = audioCtx.currentTime;
            playbackGain.gain.cancelScheduledValues(endTime);
            playbackGain.gain.setValueAtTime(playbackGain.gain.value, endTime);
            playbackGain.gain.linearRampToValueAtTime(0, endTime + 0.5);
            setTimeout(() => {
              try {
                playbackGain.disconnect();
              } catch {
                // ignore
              }
            }, 600);
            if (onDone) onDone();
          } else {
            stop({ suspend: true });
            if (onDone) onDone();
          }
        }
      };
  
      rafId = requestAnimationFrame(tick);
      });
    }

    function createOfflineGraph(ctx) {
      const offlineMasterGain = ctx.createGain();
      offlineMasterGain.gain.setValueAtTime(0.9, 0);
  
      const offlineCompressor = ctx.createDynamicsCompressor();
      offlineCompressor.threshold.setValueAtTime(-18, 0);
      offlineCompressor.knee.setValueAtTime(12, 0);
      offlineCompressor.ratio.setValueAtTime(3, 0);
      offlineCompressor.attack.setValueAtTime(0.003, 0);
      offlineCompressor.release.setValueAtTime(0.25, 0);
  
      const offlineDryGain = ctx.createGain();
      const offlineDelaySend = ctx.createGain();
      const offlineDelayNode = ctx.createDelay(1.5);
      const offlineDelayFeedback = ctx.createGain();
      const offlineDelayWet = ctx.createGain();
      const offlineReverbSend = ctx.createGain();
      const offlineReverbNode = ctx.createConvolver();
      const offlineReverbWet = ctx.createGain();
      const offlineWidthSplit = ctx.createChannelSplitter(2);
      const offlineMidSum = ctx.createGain();
      const offlineSideSum = ctx.createGain();
      const offlineMidGain = ctx.createGain();
      const offlineSideGain = ctx.createGain();
      const offlineSideGainInv = ctx.createGain();
      const offlineWidthMerge = ctx.createChannelMerger(2);
      const offlineInvGain = ctx.createGain();
  
      offlineDelayNode.delayTime.setValueAtTime(0.22, 0);
      offlineDelayFeedback.gain.setValueAtTime(0.35, 0);
      offlineReverbNode.buffer = createImpulseResponse(ctx, 2.2, 2.4);
      offlineMidGain.gain.setValueAtTime(1, 0);
      offlineSideGain.gain.setValueAtTime(1, 0);
      offlineInvGain.gain.setValueAtTime(-1, 0);
      offlineSideGainInv.gain.setValueAtTime(-1, 0);
  
      offlineDelaySend.connect(offlineDelayNode);
      offlineDelayNode.connect(offlineDelayFeedback);
      offlineDelayFeedback.connect(offlineDelayNode);
      offlineDelayNode.connect(offlineDelayWet);
  
      offlineReverbSend.connect(offlineReverbNode);
      offlineReverbNode.connect(offlineReverbWet);
  
      offlineDryGain.connect(offlineCompressor);
      offlineDelayWet.connect(offlineCompressor);
      offlineReverbWet.connect(offlineCompressor);
      offlineCompressor.connect(offlineWidthSplit);
      offlineWidthSplit.connect(offlineMidSum, 0);
      offlineWidthSplit.connect(offlineMidSum, 1);
      offlineWidthSplit.connect(offlineSideSum, 0);
      offlineWidthSplit.connect(offlineInvGain, 1);
      offlineInvGain.connect(offlineSideSum);
      offlineMidSum.connect(offlineMidGain);
      offlineSideSum.connect(offlineSideGain);
      offlineSideGain.connect(offlineSideGainInv);
      offlineMidGain.connect(offlineWidthMerge, 0, 0);
      offlineSideGain.connect(offlineWidthMerge, 0, 0);
      offlineMidGain.connect(offlineWidthMerge, 0, 1);
      offlineSideGainInv.connect(offlineWidthMerge, 0, 1);
      offlineWidthMerge.connect(offlineMasterGain);
      offlineMasterGain.connect(ctx.destination);
  
      return {
        masterGain: offlineMasterGain,
        dryGain: offlineDryGain,
        delaySend: offlineDelaySend,
        delayWet: offlineDelayWet,
        reverbSend: offlineReverbSend,
        reverbWet: offlineReverbWet,
        midGain: offlineMidGain,
        sideGain: offlineSideGain,
      };
    }
  
    function applyEffectsAtTime(nodes, effects = {}, time = 0) {
      const delayValue = Math.max(0, Math.min(1, effects.delay ?? 0));
      const reverbValue = Math.max(0, Math.min(1, effects.reverb ?? 0));
      const midEqValue = Math.max(-100, Math.min(0, effects.midEq ?? -50));
  
      nodes.delaySend.gain.setValueAtTime(delayValue * 0.5, time);
      nodes.delayWet.gain.setValueAtTime(delayValue * 0.5, time);
      nodes.reverbSend.gain.setValueAtTime(reverbValue * 0.6, time);
      nodes.reverbWet.gain.setValueAtTime(reverbValue * 0.6, time);
  
      const db = -36 + ((midEqValue + 100) / 100) * 24;
      const midAmount = Math.pow(10, db / 20);
      nodes.midGain.gain.setValueAtTime(midAmount, time);
      nodes.sideGain.gain.setValueAtTime(1, time);
    }
  
    function scheduleEvents(ctx, nodes, noise, presetName, events, startOffset = 0, bpm = 0) {
      if (!events || events.length === 0) return;
      const startTime = startOffset + 0.12;
      const playbackGain = ctx.createGain();
      playbackGain.gain.setValueAtTime(1, startTime);
      playbackGain.connect(nodes.dryGain);
      playbackGain.connect(nodes.delaySend);
      playbackGain.connect(nodes.reverbSend);
      const activeNotes = new Map();
      scheduleVolumeAutomation(playbackGain.gain, events, startTime);

      const noteDurations = buildNoteDurationMap(events);
      events.forEach((event) => {
        const eventTime = startTime + event.timeSeconds;
        if (event.type === "noteOn") {
          const velocityNormalized = Math.max(0.02, event.velocity / 127);
          const noteDurationSeconds = noteDurations.get(event) ?? 0;
          const preset = resolvePreset(presetName, {
            note: event.note,
            velocity: event.velocity,
            velocityNormalized,
            durationSeconds: noteDurationSeconds,
            bpm,
          });
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, eventTime);
          gain.connect(playbackGain);
          const peak = velocityNormalized;
          const sustain = velocityNormalized * preset.sustain;
          gain.gain.linearRampToValueAtTime(peak, eventTime + preset.attack);
          gain.gain.linearRampToValueAtTime(
            sustain,
            eventTime + preset.attack + preset.decay
          );

          if (preset.type === "sample" && preset.zones && typeof window !== "undefined" && window.InstrumentSampleHandler) {
            const zone = window.InstrumentSampleHandler.getZoneForMidi(presetName, event.note);
            const buf = window.InstrumentSampleHandler.getZoneBuffer(zone, ctx);
            if (zone && buf) {
              const originalPitchSemitones = zone.originalPitchCents / 100;
              const playbackRate = Math.pow(2, (event.note - originalPitchSemitones) / 12);
              const loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
              const loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.playbackRate.setValueAtTime(playbackRate, eventTime);
              src.loop = true;
              src.loopStart = loopStart;
              src.loopEnd = loopEnd;
              src.connect(gain);
              src.start(eventTime);
              const list = activeNotes.get(event.note) || [];
              list.push({ gain, bufferSource: src, sustain, release: preset.release });
              activeNotes.set(event.note, list);
            }
            return;
          }

          const voiceGain = ctx.createGain();
          voiceGain.gain.setValueAtTime(1, eventTime);
          let lastNode = voiceGain;
          const harmonics = getHarmonics();
          if (harmonics?.applyFormantFilters) {
            lastNode = harmonics.applyFormantFilters(
              ctx,
              lastNode,
              preset.formants,
              eventTime,
              null,
              velocityNormalized,
              noteDurationSeconds,
              bpm
            );
          }
          if (preset.filter) {
            const filter = ctx.createBiquadFilter();
            filter.type = preset.filter.type;
            const cutoff = preset.filter.base + preset.filter.velocity * velocityNormalized;
            filter.frequency.setValueAtTime(cutoff, eventTime);
            if (preset.filterDecay?.amount && harmonics?.applyFilterDecay) {
              harmonics.applyFilterDecay(
                filter,
                cutoff,
                eventTime,
                noteDurationSeconds,
                preset.filterDecay
              );
            }
            lastNode.connect(filter);
            lastNode = filter;
          }

          lastNode.connect(gain);

          const oscillators = preset.oscillators.map((config) => {
            const osc = ctx.createOscillator();
            osc.type = config.type;
            osc.detune.setValueAtTime(config.detune || 0, eventTime);
            osc.frequency.setValueAtTime(noteToFrequency(event.note), eventTime);
            osc.connect(voiceGain);
            osc.start(eventTime);
            return osc;
          });

          if (preset.noise && noise) {
            const noiseSource = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            noiseSource.buffer = noise;
            noiseGain.gain.setValueAtTime(velocityNormalized * preset.noise, eventTime);
            noiseGain.gain.exponentialRampToValueAtTime(
              0.0001,
              eventTime + Math.min(0.06, preset.attack + 0.04)
            );
            noiseSource.connect(noiseGain).connect(voiceGain);
            noiseSource.start(eventTime);
            noiseSource.stop(eventTime + 0.08);
          }

          const list = activeNotes.get(event.note) || [];
          list.push({ gain, oscillators, sustain, release: preset.release });
          activeNotes.set(event.note, list);
        } else if (event.type === "noteOff") {
          const list = activeNotes.get(event.note);
          if (list && list.length) {
            const voice = list.shift();
            const releaseTime = voice.release ?? 0;
            voice.gain.gain.cancelScheduledValues(eventTime);
            voice.gain.gain.setValueAtTime(voice.sustain, eventTime);
            voice.gain.gain.linearRampToValueAtTime(0.0001, eventTime + releaseTime);
            const stopTime = eventTime + releaseTime + 0.05;
            if (voice.bufferSource) {
              voice.bufferSource.stop(stopTime);
            }
            if (voice.oscillators) {
              voice.oscillators.forEach((osc) => {
                osc.stop(stopTime);
              });
            }
          }
        }
      });
    }
  
    function encodeWav(buffer) {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const numFrames = buffer.length;
      const bytesPerSample = 2;
      const blockAlign = numChannels * bytesPerSample;
      const dataSize = numFrames * blockAlign;
      const arrayBuffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(arrayBuffer);
  
      function writeString(offset, text) {
        for (let i = 0; i < text.length; i += 1) {
          view.setUint8(offset + i, text.charCodeAt(i));
        }
      }
  
      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);
  
      let offset = 44;
      for (let i = 0; i < numFrames; i += 1) {
        for (let channel = 0; channel < numChannels; channel += 1) {
          let sample = buffer.getChannelData(channel)[i];
          sample = Math.max(-1, Math.min(1, sample));
          view.setInt16(
            offset,
            sample < 0 ? sample * 0x8000 : sample * 0x7fff,
            true
          );
          offset += 2;
        }
      }
  
      return new Blob([view], { type: "audio/wav" });
    }
  
    function renderWav(segments, { sampleRate = 44100 } = {}) {
      return renderBuffer(segments, { sampleRate }).then((buffer) => encodeWav(buffer));
    }
  
    function renderBuffer(segments, { sampleRate = 44100 } = {}) {
      if (!segments || !segments.length) {
        return Promise.reject(new Error("No segments to render."));
      }
      const tailSeconds = 0.8;
      const totalDuration =
        segments.reduce(
          (sum, segment) => sum + Math.max(0, segment.durationSeconds || 0),
          0
        ) + tailSeconds;
      const length = Math.ceil(totalDuration * sampleRate);
      const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
      const nodes = createOfflineGraph(offlineCtx);

      const noise = offlineCtx.createBuffer(1, offlineCtx.sampleRate, offlineCtx.sampleRate);
      const noiseData = noise.getChannelData(0);
      for (let i = 0; i < noiseData.length; i += 1) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const baseUrl = (typeof document !== "undefined" && document.baseURI) ? document.baseURI : (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "";
      const samplePresetNames = [];
      segments.forEach((segment) => {
        const name = segment.preset;
        if (name && samplePresetNames.indexOf(name) === -1) {
          const p = resolvePreset(name, {});
          if (p && p.type === "sample" && p.zones) samplePresetNames.push(name);
        }
      });
      const loadPromises = samplePresetNames.length && typeof window !== "undefined" && window.InstrumentSampleHandler
        ? samplePresetNames.map((name) => window.InstrumentSampleHandler.loadPreset(offlineCtx, name, baseUrl))
        : [Promise.resolve()];

      return Promise.all(loadPromises).then(() => {
        let cursor = 0;
        segments.forEach((segment) => {
          applyEffectsAtTime(nodes, segment.effects || lastEffects, cursor);
          scheduleEvents(
            offlineCtx,
            nodes,
            noise,
            segment.preset,
            segment.events,
            cursor,
            segment.bpm
          );
          cursor += Math.max(0, segment.durationSeconds || 0);
        });

        return offlineCtx.startRendering().then((buffer) => {
          buffer.__playDuration = Math.max(0, totalDuration - tailSeconds);
          return buffer;
        });
      });
    }
  
    function playBuffer(buffer, onProgress, onDone, options = {}) {
      if (!buffer) return;
      const { overlap = false, preloadSeconds = 0.18 } = options;
      ensureAudioGraph();
      if (suspendTimeout) {
        clearTimeout(suspendTimeout);
        suspendTimeout = null;
      }
      const now = audioCtx.currentTime;
      audioCtx.resume().catch(() => {});
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      if (!overlap) {
        masterGain.gain.setValueAtTime(0, now);
      }
  
      const startTime = audioCtx.currentTime + preloadSeconds;
      if (overlap) {
        masterGain.gain.setTargetAtTime(0.9, now, 0.02);
      } else {
        masterGain.gain.linearRampToValueAtTime(0.9, startTime + 0.03);
      }
  
      const source = audioCtx.createBufferSource();
      const bufferGain = audioCtx.createGain();
      source.buffer = buffer;
      source.connect(bufferGain);
      bufferGain.connect(masterGain);
      scheduledNodes.push(source);
      scheduledNodes.push(bufferGain);
      bufferGain.gain.setValueAtTime(1, startTime);
      const bufferDuration = buffer.duration || 0;
      const fadeOut = Math.min(0.05, Math.max(0.01, bufferDuration * 0.02));
      const fadeStart = startTime + Math.max(0, bufferDuration - fadeOut);
      bufferGain.gain.setValueAtTime(1, fadeStart);
      bufferGain.gain.linearRampToValueAtTime(0.0001, fadeStart + fadeOut);
      source.start(startTime);
  
      const durationSeconds = (buffer.__playDuration ?? buffer.duration) || 0;
      const tick = () => {
        const elapsed = audioCtx.currentTime - startTime;
        const percent = durationSeconds ? Math.min(elapsed / durationSeconds, 1) : 1;
        if (onProgress) onProgress(percent);
        if (percent < 1) {
          bufferRafId = requestAnimationFrame(tick);
        } else {
          if (onDone) onDone();
        }
      };
  
      if (bufferRafId) {
        cancelAnimationFrame(bufferRafId);
      }
      bufferRafId = requestAnimationFrame(tick);
    }
  
    return {
      PRESETS: getInstrumentRegistry(),
      getInstrumentProfiles: getInstrumentRegistry,
      ensureAudioGraph,
      prepare,
      setPreset,
      ensureCurrentPresetLoaded,
      setEffects,
      setMasterVolume,
      play,
      playBuffer,
      renderBuffer,
      stop,
      renderWav,
    };
    }

    window.PremiumSoundBass = createPremiumSound();
    window.PremiumSoundTreble = createPremiumSound();
    window.PremiumSound = window.PremiumSoundBass;
  })();
