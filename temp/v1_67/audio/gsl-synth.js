/**
 * GSL Sample Synth for PriMIDI 3D piano.
 * Plays GSL instrument samples from MIDI note on/off with velocity and sustain pedal.
 * Reverb (send + convolver) and stereo width (mid/side). Compatible with midi-mapping.js.
 */
(function () {
  'use strict';

  var audioCtx = null;
  var masterGain = null;
  var chordRowModGain = null; // per-bar audio modulation when chord row is playing (Sound every-bar)
  var dryGain = null;
  var reverbSend = null;
  var reverbNode = null;
  var reverbWet = null;
  var widthSplit = null;
  var midSum = null;
  var sideSum = null;
  var midGain = null;
  var sideGain = null;
  var sideGainInv = null;
  var widthMerge = null;
  var invGain = null;
  var sumGain = null;
  var lastMasterVolumePercent = 700; // 0–2000, default 700%
  var activeVoices = {}; // noteName -> [{ gain, bufferSource, release }]
  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };
  // Ultimate outer envelope: even if sustain is long, gently fade any held note to 0 over this many seconds.
  var ULTIMATE_ENVELOPE_SECONDS = 6.0;
  // When Nostalgia mode is on, ramp playback rate over this many seconds so reverb gets the tape effect (like WAV).
  // WAV uses ramp = note duration (variable); we don't know duration at trigger, so use a short fixed ramp so the
  // pitch drop happens quickly and reverb gets the same character (short notes then match WAV; long notes hit 0.97 then stay).
  var NOSTALGIA_RAMP_SECONDS = 0.45;
  var nostalgiaMode = false;
  var DELAY_MOD_CHANCE = 0.618;
  var DELAY_MOD_AMOUNT_HUMAN = 0.05;
  var DELAY_MOD_AMOUNT_DRUNK = 0.128;
  var REF_NOTE_DURATION_FOR_DELAY = 0.25;
  var VOLUME_MOD_MIN = 0.05;
  var VOLUME_MOD_MAX = 1.3;
  var VOLUME_MOD_CURVE = 2.0;
  var NUM_SLOTS = 6;
  /* Per-layer gain nodes: every-bar modulation then user volume; filled in ensureContext */
  var slotModGains = [];
  var slotVolGains = [];
  /* Per-layer phase offsets so pseudo-random delays don't match across layers (same key = different delay each layer) */
  var delayStateBySlot = { 0: { counter: 0 }, 1: { counter: 317 }, 2: { counter: 733 }, 3: { counter: 101 }, 4: { counter: 419 }, 5: { counter: 521 } };
  var flickerStateBySlot = { 0: { counter: 0 }, 1: { counter: 0 }, 2: { counter: 0 }, 3: { counter: 0 }, 4: { counter: 0 }, 5: { counter: 0 } };

  function linearToDb(value) {
    return 20 * Math.log10(Math.max(value, 0.0001));
  }
  function dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
  function applyVolumeCurve(pos) {
    var clamped = Math.max(0, Math.min(1, pos));
    return Math.pow(clamped, VOLUME_MOD_CURVE);
  }
  function applyVolumeModIntensity(multiplier, intensity) {
    if (intensity <= 0) return 0;
    if (intensity >= 1) return multiplier;
    return intensity * (multiplier - 1) + 1;
  }
  function getVolumeModMultiplier(volumeMod, cyclePosition, intensity) {
    if (!volumeMod || volumeMod === 'none') return 1.0;
    intensity = intensity != null && !isNaN(intensity) ? Math.max(0, Math.min(1, intensity)) : 1;
    var pos = Math.max(0, Math.min(1, cyclePosition));
    var curvedPos = applyVolumeCurve(pos);
    var minDb = linearToDb(VOLUME_MOD_MIN);
    var maxDb = linearToDb(VOLUME_MOD_MAX);
    var raw = 1.0;
    switch (volumeMod) {
      case 'uphill':
        raw = dbToLinear(minDb + (curvedPos * (maxDb - minDb)));
        break;
      case 'downhill':
        raw = dbToLinear(maxDb - (curvedPos * (maxDb - minDb)));
        break;
      case 'valley':
        raw = pos <= 0.5
          ? dbToLinear(maxDb - (applyVolumeCurve(pos * 2) * (maxDb - minDb)))
          : dbToLinear(minDb + (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        break;
      case 'hill':
        raw = pos <= 0.5
          ? dbToLinear(minDb + (applyVolumeCurve(pos * 2) * (maxDb - minDb)))
          : dbToLinear(maxDb - (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        break;
      case '2hill': {
        var phase = (pos * 4) % 2;
        raw = phase <= 1
          ? dbToLinear(minDb + (applyVolumeCurve(phase) * (maxDb - minDb)))
          : dbToLinear(maxDb - (applyVolumeCurve(phase - 1) * (maxDb - minDb)));
        break;
      }
      default: {
        var nvalleyMatch = volumeMod && String(volumeMod).match(/^(\d+)valley$/);
        if (nvalleyMatch) {
          var nVal = Math.max(1, Math.min(99, parseInt(nvalleyMatch[1], 10)));
          var phaseVal = (pos * nVal) % 1;
          raw = phaseVal <= 0.5
            ? dbToLinear(maxDb - (applyVolumeCurve(phaseVal * 2) * (maxDb - minDb)))
            : dbToLinear(minDb + (applyVolumeCurve((phaseVal - 0.5) * 2) * (maxDb - minDb)));
        } else {
          var nhillMatch = volumeMod && String(volumeMod).match(/^(\d+)hill$/);
          if (nhillMatch) {
            var nHill = Math.max(1, Math.min(99, parseInt(nhillMatch[1], 10)));
            var phaseHill = (pos * 2 * nHill) % 2;
            raw = phaseHill <= 1
              ? dbToLinear(minDb + (applyVolumeCurve(phaseHill) * (maxDb - minDb)))
              : dbToLinear(maxDb - (applyVolumeCurve(phaseHill - 1) * (maxDb - minDb)));
          }
        }
        break;
      }
    }
    return applyVolumeModIntensity(raw, intensity);
  }

  function createImpulseResponse(ctx, seconds, decay) {
    var length = Math.floor(ctx.sampleRate * seconds);
    var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (var ch = 0; ch < impulse.numberOfChannels; ch += 1) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i += 1) {
        var t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
  }

  function noteNameToMidi(noteName) {
    if (typeof window !== 'undefined' && window.noteNameToMidiNote) {
      return window.noteNameToMidiNote(noteName);
    }
    var noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var m = String(noteName).match(/^([A-G]#?)(\d+)$/);
    if (!m) return null;
    var noteIndex = noteNames.indexOf(m[1]);
    if (noteIndex === -1) return null;
    var octave = parseInt(m[2], 10);
    return (octave + 1) * 12 + noteIndex;
  }

  function ensureContext() {
    if (audioCtx) return audioCtx;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(lastMasterVolumePercent / 100, audioCtx.currentTime);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(1, audioCtx.currentTime);
    reverbSend = audioCtx.createGain();
    reverbSend.gain.setValueAtTime(0.6, audioCtx.currentTime); // Full = 100% -> 1.0*0.6
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = createImpulseResponse(audioCtx, 2.2, 2.4);
    reverbWet = audioCtx.createGain();
    reverbWet.gain.setValueAtTime(0.6, audioCtx.currentTime);

    sumGain = audioCtx.createGain();
    sumGain.gain.setValueAtTime(1, audioCtx.currentTime);
    dryGain.connect(sumGain);
    reverbSend.connect(reverbNode);
    reverbNode.connect(reverbWet);
    reverbWet.connect(sumGain);
    slotModGains.length = 0;
    slotVolGains.length = 0;
    for (var s = 0; s < NUM_SLOTS; s += 1) {
      var modG = audioCtx.createGain();
      modG.gain.setValueAtTime(1, audioCtx.currentTime);
      var volG = audioCtx.createGain();
      volG.gain.setValueAtTime(0.33, audioCtx.currentTime);
      modG.connect(volG);
      volG.connect(dryGain);
      volG.connect(reverbSend);
      slotModGains.push(modG);
      slotVolGains.push(volG);
    }
    startEveryBarUpdateLoop();

    widthSplit = audioCtx.createChannelSplitter(2);
    sumGain.connect(widthSplit);
    midSum = audioCtx.createGain();
    sideSum = audioCtx.createGain();
    midGain = audioCtx.createGain();
    sideGain = audioCtx.createGain();
    sideGainInv = audioCtx.createGain();
    invGain = audioCtx.createGain();
    invGain.gain.setValueAtTime(-1, audioCtx.currentTime);
    sideGainInv.gain.setValueAtTime(-1, audioCtx.currentTime);
    widthMerge = audioCtx.createChannelMerger(2);

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
    chordRowModGain = audioCtx.createGain();
    chordRowModGain.gain.setValueAtTime(1, audioCtx.currentTime);
    widthMerge.connect(chordRowModGain);
    chordRowModGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    setStereoWidth(-25); // Subtle (default)
    return audioCtx;
  }

  function getCurrentPreset() {
    var slots = getCurrentPresetSlots();
    return (slots && slots.length > 0) ? slots[0] : ((typeof window !== 'undefined' && window.currentGslPreset) ? window.currentGslPreset : null);
  }

  function getCurrentPresetSlots() {
    return (typeof window !== 'undefined' && window.gslPresetSlots && Array.isArray(window.gslPresetSlots)) ? window.gslPresetSlots : [];
  }

  function getSlotVolume(slotIndex) {
    var defaults = [33, 33, 33, 33, 33, 33];
    var arr = typeof window !== 'undefined' && window.gslSlotVolumes && Array.isArray(window.gslSlotVolumes) ? window.gslSlotVolumes : defaults;
    var p = arr[slotIndex];
    if (p == null || isNaN(p)) return 0.33;
    var v = Math.max(0, Math.min(100, Number(p))) / 100;
    return v < 0.005 ? 0 : v;
  }

  function getSlotSemitone(slotIndex) {
    var defaults = [0, 0, 0, 0, 0, 0];
    var arr = typeof window !== 'undefined' && window.gslSlotSemitones && Array.isArray(window.gslSlotSemitones) ? window.gslSlotSemitones : defaults;
    var s = arr[slotIndex];
    return (s != null && !isNaN(s)) ? Math.max(-24, Math.min(24, s)) : 0;
  }

  function getLayerPlayStyle(slotIndex) {
    var g = typeof window !== 'undefined' && window.gslLayerPlayStyle;
    if (typeof g === 'string') return (g === 'human' || g === 'drunk') ? g : 'none';
    var arr = Array.isArray(g) ? g : ['none', 'none', 'none', 'none', 'none', 'none'];
    var v = arr[slotIndex];
    return (v === 'human' || v === 'drunk') ? v : 'none';
  }

  var everyBarUpdateLoopStarted = false;
  function startEveryBarUpdateLoop() {
    if (everyBarUpdateLoopStarted || !audioCtx) return;
    everyBarUpdateLoopStarted = true;
    function tick() {
      if (!audioCtx || slotModGains.length === 0) {
        requestAnimationFrame(tick);
        return;
      }
      var getBarPhase = typeof window !== 'undefined' && window.primidiGetBarPhase;
      var phase = 0;
      if (getBarPhase) {
        var bp = getBarPhase();
        phase = bp.phase != null ? bp.phase : 0;
      }
      var patterns = (typeof window !== 'undefined' && window.gslEveryBarPattern && Array.isArray(window.gslEveryBarPattern)) ? window.gslEveryBarPattern : [];
      var intensities = (typeof window !== 'undefined' && window.gslEveryBarIntensity && Array.isArray(window.gslEveryBarIntensity)) ? window.gslEveryBarIntensity : [];
      var muted = (typeof window !== 'undefined' && window.gslSlotMuted && Array.isArray(window.gslSlotMuted)) ? window.gslSlotMuted : [];
      var now = audioCtx.currentTime;
      for (var idx = 0; idx < slotModGains.length && idx < NUM_SLOTS; idx += 1) {
        // User volume is applied AFTER every-bar modulation (no flicker).
        var baseVol = getSlotVolume(idx);
        if (slotVolGains[idx]) slotVolGains[idx].gain.setTargetAtTime(baseVol, now, 0.02);

        if (muted[idx]) {
          slotModGains[idx].gain.setTargetAtTime(0, now, 0.02);
          continue;
        }
        var pattern = patterns[idx] || 'none';
        var intensity = intensities[idx];
        if (intensity == null || isNaN(intensity)) intensity = 0.20;
        var mult = getVolumeModMultiplier(pattern, phase, intensity);
        slotModGains[idx].gain.setTargetAtTime(mult, now, 0.02);
      }
      if (chordRowModGain) {
        var chordModActive = (typeof window !== 'undefined' && window._ccChordRowSoundModActive);
        if (chordModActive) {
          var bassPat = (typeof window !== 'undefined' && window.gslChordRowSoundBassEveryBar) ? window.gslChordRowSoundBassEveryBar : 'none';
          var treblePat = (typeof window !== 'undefined' && window.gslChordRowSoundTrebleEveryBar) ? window.gslChordRowSoundTrebleEveryBar : 'none';
          var bassInt = (typeof window !== 'undefined' && window.gslChordRowSoundBassIntensity != null) ? Math.max(0, Math.min(1, window.gslChordRowSoundBassIntensity)) : 0.2;
          var trebleInt = (typeof window !== 'undefined' && window.gslChordRowSoundTrebleIntensity != null) ? Math.max(0, Math.min(1, window.gslChordRowSoundTrebleIntensity)) : 0.2;
          var bassMult = getVolumeModMultiplier(bassPat, phase, bassInt);
          var trebleMult = getVolumeModMultiplier(treblePat, phase, trebleInt);
          chordRowModGain.gain.setTargetAtTime((bassMult + trebleMult) / 2, now, 0.02);
        } else {
          chordRowModGain.gain.setTargetAtTime(1, now, 0.02);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function hashNoteName(noteName) {
    var str = String(noteName || '');
    var h = 0;
    for (var j = 0; j < str.length; j++) h = ((h << 5) - h + str.charCodeAt(j)) | 0;
    return Math.abs(h);
  }

  function getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, state) {
    if (!delayModPattern || delayModPattern === 'none') return 0;
    if (delayModPattern !== 'human' && delayModPattern !== 'drunk') return 0;
    if (!state) return 0;
    state.counter += 1;
    var remainder = (state.counter * 0.61803398875) % 1;
    if (remainder > DELAY_MOD_CHANCE) return 0;
    var amount = delayModPattern === 'drunk' ? DELAY_MOD_AMOUNT_DRUNK : DELAY_MOD_AMOUNT_HUMAN;
    return noteDurationSeconds * amount * remainder;
  }

  function triggerAttack(noteName, when, amplitude) {
    var slots = getCurrentPresetSlots();
    if (!slots.length) return;

    var midi = noteNameToMidi(noteName);
    if (midi == null) return;

    var ctx = ensureContext();
    if (ctx.state !== 'running') ctx.resume().catch(function () {});

    var handler = window.InstrumentSampleHandler;
    var jsRegistry = (typeof window !== 'undefined' && window.PremiumSoundInstrumentProfiles) ? window.PremiumSoundInstrumentProfiles : {};
    var velocityNorm = Math.max(0.02, Math.min(1, amplitude || 0.8));
    var t0 = when != null ? when : ctx.currentTime;
    var group = [];

    // Layer play mode: leftRight (default), split, or scatter.
    // Only slots that have a preset are "active" — match UI: "only L1 R1 active" means only those slots play.
    var mode = (typeof window !== 'undefined' && window.gslLayerPlayMode) ? window.gslLayerPlayMode : 'leftRight';
    var slotsToPlay = [];
    function hasPreset(s) {
      return s != null && typeof s === 'string' && s.trim() !== '';
    }
    if (mode === 'leftRight') {
      var isRight = midi >= 60; // 60 = middle C: notes below = L1–L3, else R1–R3
      var startSlot = isRight ? 3 : 0;
      var endSlot = isRight ? 6 : 3;
      for (var s = startSlot; s < endSlot && s < slots.length; s++) {
        if (hasPreset(slots[s])) slotsToPlay.push(s);
      }
    } else if (mode === 'split') {
      var h = hashNoteName(noteName);
      var useRight = (h % 2) === 1;
      var startSlot = useRight ? 3 : 0;
      for (var s = startSlot; s < startSlot + 3 && s < slots.length; s++) {
        if (hasPreset(slots[s])) slotsToPlay.push(s);
      }
    } else if (mode === 'scatter') {
      var h = hashNoteName(noteName);
      var i0 = h % 6;
      var i1 = (i0 + 1 + (Math.floor(h / 6) % 5)) % 6;
      if (hasPreset(slots[i0])) slotsToPlay.push(i0);
      if (hasPreset(slots[i1]) && i1 !== i0) slotsToPlay.push(i1);
    }

    for (var idx = 0; idx < slotsToPlay.length; idx++) {
      var i = slotsToPlay[idx];
      var presetName = slots[i];
      if (!presetName) continue;

      var isGsl = handler && typeof handler.isGslPreset === 'function' && handler.isGslPreset(presetName);
      var preset = null;
      var zone = null;
      var buf = null;
      var isJsPreset = false;
      if (isGsl) {
        if (!handler) continue;
        preset = handler.getPreset(presetName);
        if (!preset || !preset.zones) continue;
        zone = handler.getZoneForMidi(presetName, midi);
        buf = handler.getZoneBuffer(zone, ctx);
        if (!zone || !buf) continue;
      } else {
        // JS synth (oscillator-based) preset from PremiumSoundInstrumentProfiles
        var provider = jsRegistry && jsRegistry[presetName];
        if (typeof provider !== 'function') continue;
        preset = provider({
          velocity: Math.round(velocityNorm * 127),
          velocityNormalized: velocityNorm,
          durationSeconds: ULTIMATE_ENVELOPE_SECONDS,
          note: midi
        }) || {};
        if (!preset.oscillators || !preset.oscillators.length) continue;
        isJsPreset = true;
      }

      var playStyle = getLayerPlayStyle(i);
      var delayState = delayStateBySlot[i] || (delayStateBySlot[i] = { counter: 0 });
      var bpm = (typeof window !== 'undefined' && window.gslBpm != null) ? Math.max(40, Math.min(240, Number(window.gslBpm))) : 120;
      var delayRefSeconds = 5 / bpm;
      var rawDelay = getDelayOffsetSeconds(delayRefSeconds, playStyle, delayState);
      var intensity = (typeof window !== 'undefined' && window.gslDelayIntensity != null) ? window.gslDelayIntensity : 1;
      var delayOffset = rawDelay * intensity;
      var t0Layer = t0 + delayOffset;
      if (typeof window !== 'undefined' && window.primidiOnLayerTrigger) window.primidiOnLayerTrigger(i, delayOffset);

      var mutedSlots = (typeof window !== 'undefined' && window.gslSlotMuted && Array.isArray(window.gslSlotMuted)) ? window.gslSlotMuted : [];
      if (mutedSlots[i]) continue;
      var attack = (preset.attack != null) ? preset.attack : SAMPLE_ENVELOPE.attack;
      var decay = (preset.decay != null) ? preset.decay : SAMPLE_ENVELOPE.decay;
      var sustain = (preset.sustain != null) ? preset.sustain : SAMPLE_ENVELOPE.sustain;
      var release = (preset.release != null) ? preset.release : SAMPLE_ENVELOPE.release;

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      var slotGain = slotModGains[i];
      if (slotGain) {
        gain.connect(slotGain);
      } else {
        gain.connect(dryGain);
        gain.connect(reverbSend);
      }

      var peak = velocityNorm;
      var sustainLevel = velocityNorm * sustain;
      gain.gain.linearRampToValueAtTime(peak, t0Layer + attack);
      gain.gain.linearRampToValueAtTime(sustainLevel, t0Layer + attack + decay);
      // Ultimate outer envelope: regardless of sustain, softly fade any held note to 0 after ~6 seconds.
      var ultimateOffTime = t0Layer + ULTIMATE_ENVELOPE_SECONDS;
      gain.gain.linearRampToValueAtTime(0.0001, ultimateOffTime);

      var src = null;
      // Per-layer semitone shift applies to both sample and JS synth presets
      var semitoneOffset = getSlotSemitone(i);

      if (isJsPreset) {
        // Oscillator-based JS synth voice
        var profileOscs = Array.isArray(preset.oscillators) ? preset.oscillators : [];
        var baseFreq = 440 * Math.pow(2, ((midi + semitoneOffset) - 69) / 12);
        var filterNode = null;
        if (preset.filter && preset.filter.type && preset.filter.base) {
          filterNode = ctx.createBiquadFilter();
          filterNode.type = preset.filter.type;
          var fBase = Number(preset.filter.base) || 1200;
          var fVel = Number(preset.filter.velocity) || 0;
          var freq = Math.max(40, Math.min(16000, fBase + fVel * velocityNorm));
          filterNode.frequency.setValueAtTime(freq, t0Layer);
          filterNode.connect(gain);
        }
        profileOscs.forEach(function (oscDef) {
          var osc = ctx.createOscillator();
          try { osc.type = oscDef.type || 'sine'; } catch (e) { osc.type = 'sine'; }
          var detuneSemis = Number(oscDef.detune) || 0;
          var freq = baseFreq * Math.pow(2, detuneSemis / 12);
          osc.frequency.setValueAtTime(freq, t0Layer);
          // Match sample-based subtle Doppler: glide down ~3% over the ultimate envelope window.
          var slowFreq = freq * 0.97;
          osc.frequency.linearRampToValueAtTime(slowFreq, ultimateOffTime);
          if (filterNode) {
            osc.connect(filterNode);
          } else {
            osc.connect(gain);
          }
          osc.start(t0Layer);
          if (!src) src = osc;
        });
        // If no oscillators were created, skip this layer
        if (!src) continue;
      } else {
        // GSL sample-based voice (existing path)
        var originalPitchSemitones = zone.originalPitchCents / 100;
        var playbackRate = Math.pow(2, (midi + semitoneOffset - originalPitchSemitones) / 12);
        var loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
        var loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);

        src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.setValueAtTime(playbackRate, t0Layer);
        // Subtle slowdown: slight tape/Doppler feel. Nostalgia = ramp over 1.5s so reverb gets the effect (like WAV). Default = ramp over 6s.
        var slowTarget = playbackRate * 0.97;
        var rampEnd = nostalgiaMode ? (t0Layer + NOSTALGIA_RAMP_SECONDS) : ultimateOffTime;
        src.playbackRate.linearRampToValueAtTime(slowTarget, rampEnd);
        src.loop = true;
        src.loopStart = loopStart;
        src.loopEnd = loopEnd;
        src.connect(gain);
        src.start(t0Layer);
      }

      group.push({ gain: gain, bufferSource: src, sustain: sustainLevel, release: release, ultimateOffTime: ultimateOffTime });
    }

    if (group.length === 0) return;
    if (!activeVoices[noteName]) activeVoices[noteName] = [];
    activeVoices[noteName].push(group);
  }

  function releaseOneVoice(noteName) {
    var list = activeVoices[noteName];
    if (!list || list.length === 0) return;
    var group = list.shift();
    var ctx = audioCtx;
    if (!ctx) return;
    var t = ctx.currentTime;
    for (var i = 0; i < group.length; i++) {
      var voice = group[i];
      voice.gain.gain.cancelScheduledValues(t);
      // If the ultimate envelope has already faded this voice, don't jump back up to sustain.
      var startLevel = (voice.ultimateOffTime && t >= voice.ultimateOffTime) ? 0.0001 : voice.sustain;
      voice.gain.gain.setValueAtTime(startLevel, t);
      voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || SAMPLE_ENVELOPE.release));
      var stopTime = t + (voice.release || SAMPLE_ENVELOPE.release) + 0.05;
      try {
        voice.bufferSource.stop(stopTime);
      } catch (e) {}
    }
    if (list.length === 0) delete activeVoices[noteName];
  }

  function triggerRelease(noteName) {
    releaseOneVoice(noteName);
  }

  function releaseAllVoices(noteName) {
    var list = activeVoices[noteName];
    if (!list) return;
    var ctx = audioCtx;
    var releaseTime = SAMPLE_ENVELOPE.release;
    while (list.length > 0) {
      var group = list.shift();
      if (ctx && group) {
        var t = ctx.currentTime;
        for (var i = 0; i < group.length; i++) {
          var voice = group[i];
          voice.gain.gain.cancelScheduledValues(t);
          var startLevel = (voice.ultimateOffTime && t >= voice.ultimateOffTime) ? 0.0001 : voice.sustain;
          voice.gain.gain.setValueAtTime(startLevel, t);
          voice.gain.gain.linearRampToValueAtTime(0.0001, t + (voice.release || releaseTime));
          try {
            voice.bufferSource.stop(t + (voice.release || releaseTime) + 0.05);
          } catch (e) {}
        }
      }
    }
    delete activeVoices[noteName];
  }

  function setNoteEnvelope() {}
  function updateNoteKeyState() {}
  function setSustainPedal() {}

  function setReverb(value) {
    var v = Math.max(0, Math.min(1, value));
    var amount = v * 0.6;
    if (!audioCtx) ensureContext();
    if (reverbSend) reverbSend.gain.setTargetAtTime(amount, audioCtx.currentTime, 0.01);
    if (reverbWet) reverbWet.gain.setTargetAtTime(amount, audioCtx.currentTime, 0.01);
  }

  function setStereoWidth(midEq) {
    var clamped = Math.max(-100, Math.min(0, midEq));
    var db = -36 + ((clamped + 100) / 100) * 24;
    var midAmount = Math.pow(10, db / 20);
    if (!audioCtx) ensureContext();
    if (midGain) midGain.gain.setTargetAtTime(midAmount, audioCtx.currentTime, 0.03);
    if (sideGain) sideGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.03);
  }

  function setMasterVolume(percent) {
    var p = Math.max(0, Math.min(2000, percent));
    lastMasterVolumePercent = p;
    if (!audioCtx) ensureContext();
    if (masterGain) masterGain.gain.setTargetAtTime(p / 100, audioCtx.currentTime, 0.01);
  }

  function setSlotVolumePercent(slotIndex, percent) {
    var idx = Math.max(0, Math.min(NUM_SLOTS - 1, parseInt(slotIndex, 10) || 0));
    var p = Math.max(0, Math.min(100, Number(percent)));
    var v = p / 100;
    if (v < 0.005) v = 0;
    if (!audioCtx) ensureContext();
    if (slotVolGains[idx] && slotVolGains[idx].gain) {
      slotVolGains[idx].gain.setTargetAtTime(v, audioCtx.currentTime, 0.02);
    }
  }

  function getMasterVolume() {
    return lastMasterVolumePercent;
  }

  function getReverbBufferForExport() {
    if (!audioCtx) ensureContext();
    if (!reverbNode || !reverbNode.buffer) return null;
    return { sampleRate: audioCtx.sampleRate, reverbBuffer: reverbNode.buffer };
  }

  function setNostalgiaMode(on) {
    nostalgiaMode = !!on;
  }

  function getNostalgiaMode() {
    return nostalgiaMode;
  }

  var synth = {
    triggerAttack: triggerAttack,
    triggerRelease: triggerRelease,
    releaseAllVoices: releaseAllVoices,
    setNoteEnvelope: setNoteEnvelope,
    setReverb: setReverb,
    setStereoWidth: setStereoWidth,
    setMasterVolume: setMasterVolume,
    setSlotVolumePercent: setSlotVolumePercent,
    getMasterVolume: getMasterVolume,
    getReverbBufferForExport: getReverbBufferForExport,
    setNostalgiaMode: setNostalgiaMode,
    getNostalgiaMode: getNostalgiaMode,
    synth: {
      audioCtx: null,
      masterGain: null,
      updateNoteKeyState: updateNoteKeyState,
      setSustainPedal: setSustainPedal
    }
  };

  Object.defineProperty(synth.synth, 'audioCtx', {
    get: function () { ensureContext(); return audioCtx; },
    configurable: true
  });
  Object.defineProperty(synth.synth, 'masterGain', {
    get: function () { return masterGain; },
    configurable: true
  });

  window.gslSynth = synth;
  window.synth = synth;
})();
