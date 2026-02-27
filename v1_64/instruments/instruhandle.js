/**
 * Sample-based instruments (piano, guitar) for v1_64 synth.
 * Loads WAV zones from instruments/piano and instruments/guitar (same approach as
 * primid_v1_08 demop.html / demog.html). Registers "piano" and "guitar" presets
 * and provides loading + zone lookup for premiumsound.js.
 */
(function () {
  'use strict';

  var registry = (window.PremiumSoundInstrumentProfiles = window.PremiumSoundInstrumentProfiles || {});

  // Per-context buffer storage (Web Audio: buffer must be from same context that uses it; offline vs live must not share)
  function bufferMap(z) {
    if (!z._bufferByContext) z._bufferByContext = new WeakMap();
    return z._bufferByContext;
  }

  // Piano zones (from instruments/piano/zones.json – Chaos piano WAVs)
  var pianoZones = [
    { keyLow: 0,  keyHigh: 34,  originalPitchCents: 3100, file: '0000_Chaos_sf2_file_wavs/zone_0_midi0_keys_0-34.wav',   loopStart: 2.414875283446712,  loopEnd: 2.5583219954648526 },
    { keyLow: 35, keyHigh: 41,  originalPitchCents: 3800, file: '0000_Chaos_sf2_file_wavs/zone_1_midi0_keys_35-41.wav',  loopStart: 1.6789569160997733, loopEnd: 1.7335147392290249 },
    { keyLow: 42, keyHigh: 47,  originalPitchCents: 4500, file: '0000_Chaos_sf2_file_wavs/zone_2_midi0_keys_42-47.wav',  loopStart: 1.514467120181406,  loopEnd: 1.6964172335600907 },
    { keyLow: 48, keyHigh: 52,  originalPitchCents: 5000, file: '0000_Chaos_sf2_file_wavs/zone_3_midi0_keys_48-52.wav',  loopStart: 1.325668934240363,  loopEnd: 1.4620861678004535 },
    { keyLow: 53, keyHigh: 57,  originalPitchCents: 5500, file: '0000_Chaos_sf2_file_wavs/zone_4_midi0_keys_53-57.wav',  loopStart: 1.249092970521542,  loopEnd: 1.295079365079365 },
    { keyLow: 58, keyHigh: 62,  originalPitchCents: 6000, file: '0000_Chaos_sf2_file_wavs/zone_5_midi0_keys_58-62.wav',  loopStart: 0.9061678004535147, loopEnd: 0.9559183673469388 },
    { keyLow: 63, keyHigh: 68,  originalPitchCents: 6500, file: '0000_Chaos_sf2_file_wavs/zone_6_midi0_keys_63-68.wav',  loopStart: 0.5954648526077098, loopEnd: 0.6327891156462585 },
    { keyLow: 69, keyHigh: 75,  originalPitchCents: 7200, file: '0000_Chaos_sf2_file_wavs/zone_7_midi0_keys_69-75.wav',  loopStart: 0.423265306122449,  loopEnd: 0.5188208616780046 },
    { keyLow: 76, keyHigh: 83,  originalPitchCents: 7900, file: '0000_Chaos_sf2_file_wavs/zone_8_midi0_keys_76-83.wav',  loopStart: 0.6796825396825397, loopEnd: 0.7228571428571429 },
    { keyLow: 84, keyHigh: 92,  originalPitchCents: 8800, file: '0000_Chaos_sf2_file_wavs/zone_9_midi0_keys_84-92.wav',  loopStart: 0.4145124716553288, loopEnd: 0.4273015873015873 },
    { keyLow: 93, keyHigh: 127, originalPitchCents: 9700, file: '0000_Chaos_sf2_file_wavs/zone_10_midi0_keys_93-127.wav', loopStart: 0.3438548752834467, loopEnd: 0.3672108843537415 }
  ];

  // Guitar zones (from instruments/guitar/zones.json – Chaos guitar WAVs, demog-style)
  var guitarZones = [
    { keyLow: 0,  keyHigh: 47,  originalPitchCents: 4500, file: '0250_Chaos_sf2_file_wavs/zone_0_midi25_keys_0-47.wav',   loopStart: 1.6107482993197279, loopEnd: 1.6375963718820862 },
    { keyLow: 48, keyHigh: 54,  originalPitchCents: 5000, file: '0250_Chaos_sf2_file_wavs/zone_1_midi25_keys_48-54.wav',  loopStart: 2.0592743764172336, loopEnd: 2.1337868480725624 },
    { keyLow: 55, keyHigh: 63,  originalPitchCents: 5900, file: '0250_Chaos_sf2_file_wavs/zone_2_midi25_keys_55-63.wav',  loopStart: 1.536326530612245,  loopEnd: 1.6291156462585034 },
    { keyLow: 64, keyHigh: 73,  originalPitchCents: 6900, file: '0250_Chaos_sf2_file_wavs/zone_3_midi25_keys_64-73.wav',  loopStart: 1.1586394557823129, loopEnd: 1.2061678004535147 },
    { keyLow: 74, keyHigh: 127, originalPitchCents: 7900, file: '0250_Chaos_sf2_file_wavs/zone_4_midi25_keys_74-127.wav', loopStart: 0.8000907029478458,  loopEnd: 0.8319274376417233 }
  ];

  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };

  registry.piano = function () {
    return {
      type: 'sample',
      basePath: 'instruments/piano/',
      zones: pianoZones,
      attack: SAMPLE_ENVELOPE.attack,
      decay: SAMPLE_ENVELOPE.decay,
      sustain: SAMPLE_ENVELOPE.sustain,
      release: SAMPLE_ENVELOPE.release
    };
  };

  registry.guitar = function () {
    return {
      type: 'sample',
      basePath: 'instruments/guitar/',
      zones: guitarZones,
      attack: SAMPLE_ENVELOPE.attack,
      decay: SAMPLE_ENVELOPE.decay,
      sustain: SAMPLE_ENVELOPE.sustain,
      release: SAMPLE_ENVELOPE.release
    };
  };

  function getPreset(presetName) {
    var reg = window.PremiumSoundInstrumentProfiles;
    if (!reg || typeof reg[presetName] !== 'function') return null;
    var p = reg[presetName]({});
    return p && p.type === 'sample' ? p : null;
  }

  function getZoneForMidi(presetName, midi) {
    var preset = getPreset(presetName);
    if (!preset || !preset.zones) return null;
    var zones = preset.zones;
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (midi >= z.keyLow && midi <= z.keyHigh) return z;
    }
    return zones[zones.length - 1];
  }

  /**
   * Get the AudioBuffer for a zone in the given context (must have been loaded with loadPreset(ctx, ...)).
   * Buffers are stored per-context because Web Audio does not allow using a buffer from one context in another.
   */
  function getZoneBuffer(zone, ctx) {
    return zone && ctx ? bufferMap(zone).get(ctx) : null;
  }

  /**
   * Load all zone WAVs for a sample preset. Stores buffers per-context (required for offline WAV export).
   * @param {AudioContext} ctx
   * @param {string} presetName - 'piano' or 'guitar'
   * @param {string} baseUrl - base URL (e.g. document base or location origin + path to index)
   * @returns {Promise<void>}
   */
  function loadPreset(ctx, presetName, baseUrl) {
    var preset = getPreset(presetName);
    if (!preset || !preset.zones) return Promise.resolve();
    var basePath = preset.basePath;
    var zones = preset.zones;
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    return Promise.all(zones.map(function (z) {
      var url = base + basePath + z.file;
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
          return r.arrayBuffer();
        })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (buf) { bufferMap(z).set(ctx, buf); })
        .catch(function (err) {
          return Promise.reject(new Error('Sample load failed (' + presetName + '): ' + (err && err.message ? err.message : String(err))));
        });
    })).then(function () {});
  }

  /**
   * Ensure a sample preset is loaded for the given context; resolve when all zone buffers are ready.
   * Call this before play (live) or before offline render so zone.buffer is correct for that context.
   * @param {AudioContext} ctx
   * @param {string} presetName
   * @param {string} [baseUrl]
   * @returns {Promise<void>}
   */
  function ensurePresetLoaded(ctx, presetName, baseUrl) {
    return loadPreset(ctx, presetName, baseUrl);
  }

  window.InstrumentSampleHandler = {
    getPreset: getPreset,
    getZoneForMidi: getZoneForMidi,
    getZoneBuffer: getZoneBuffer,
    loadPreset: loadPreset,
    ensurePresetLoaded: ensurePresetLoaded
  };
})();
