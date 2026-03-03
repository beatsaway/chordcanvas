/**
 * Sample-based instruments for v1_65 synth.
 * Supports: piano, guitar (optional under GSL), and all instruments in instruments/GSL.
 * Each GSL folder has zones.json + zone_*.wav; zones are loaded on first use.
 */
(function () {
  'use strict';

  var registry = (window.PremiumSoundInstrumentProfiles = window.PremiumSoundInstrumentProfiles || {});

  var GSL_BASE = 'instruments/GSL/';
  var GSL_MANIFEST_URL = 'instruments/GSL/gsl-manifest.json';
  var gslManifest = null;       // { id, slug }[]
  var gslSlugToId = {};         // slug -> id (folder name)
  var gslZonesCache = {};       // id -> zones[]

  function bufferMap(z) {
    if (!z._bufferByContext) z._bufferByContext = new WeakMap();
    return z._bufferByContext;
  }

  function idToSlug(id) {
    return 'gsl_' + String(id).replace(/\s+/g, '_').replace(/&/g, 'and').replace(/'/g, '');
  }

  function isGslPreset(presetName) {
    return typeof presetName === 'string' && presetName.indexOf('gsl_') === 0;
  }

  var SAMPLE_ENVELOPE = { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.3 };

  // Piano: under GSL as 0000_Chaos_sf2_file_wavs (or keep instruments/piano)
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

  var guitarZones = [
    { keyLow: 0,  keyHigh: 47,  originalPitchCents: 4500, file: '0250_Chaos_sf2_file_wavs/zone_0_midi25_keys_0-47.wav',   loopStart: 1.6107482993197279, loopEnd: 1.6375963718820862 },
    { keyLow: 48, keyHigh: 54,  originalPitchCents: 5000, file: '0250_Chaos_sf2_file_wavs/zone_1_midi25_keys_48-54.wav',  loopStart: 2.0592743764172336, loopEnd: 2.1337868480725624 },
    { keyLow: 55, keyHigh: 63,  originalPitchCents: 5900, file: '0250_Chaos_sf2_file_wavs/zone_2_midi25_keys_55-63.wav',  loopStart: 1.536326530612245,  loopEnd: 1.6291156462585034 },
    { keyLow: 64, keyHigh: 73,  originalPitchCents: 6900, file: '0250_Chaos_sf2_file_wavs/zone_3_midi25_keys_64-73.wav',  loopStart: 1.1586394557823129, loopEnd: 1.2061678004535147 },
    { keyLow: 74, keyHigh: 127, originalPitchCents: 7900, file: '0250_Chaos_sf2_file_wavs/zone_4_midi25_keys_74-127.wav', loopStart: 0.8000907029478458,  loopEnd: 0.8319274376417233 }
  ];

  // Piano and guitar sample folders live under instruments/GSL/ (0000_Chaos_sf2_file_wavs, 0250_Chaos_sf2_file_wavs).
  var PIANO_BASE = 'instruments/GSL/';
  var GUITAR_BASE = 'instruments/GSL/';

  registry.piano = function () {
    return {
      type: 'sample',
      basePath: PIANO_BASE,
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
      basePath: GUITAR_BASE,
      zones: guitarZones,
      attack: SAMPLE_ENVELOPE.attack,
      decay: SAMPLE_ENVELOPE.decay,
      sustain: SAMPLE_ENVELOPE.sustain,
      release: SAMPLE_ENVELOPE.release
    };
  };

  function ensureGslManifest() {
    if (gslManifest) return Promise.resolve();
    var base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI.replace(/\/[^/]*$/, '/') : '';
    var url = base + GSL_MANIFEST_URL;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('GSL manifest: ' + r.status);
      return r.json();
    }).then(function (list) {
      gslManifest = list;
      gslSlugToId = {};
      list.forEach(function (entry) {
        gslSlugToId[entry.slug] = entry.id;
        (function (capturedId) {
          registry[entry.slug] = function () { return getGslPresetConfig(capturedId); };
        })(entry.id);
      });
      return gslManifest;
    });
  }

  function getGslPresetConfig(id) {
    var zones = gslZonesCache[id];
    if (!zones || !zones.length) return null;
    return {
      type: 'sample',
      basePath: GSL_BASE + encodeURIComponent(id) + '/',
      zones: zones,
      attack: SAMPLE_ENVELOPE.attack,
      decay: SAMPLE_ENVELOPE.decay,
      sustain: SAMPLE_ENVELOPE.sustain,
      release: SAMPLE_ENVELOPE.release
    };
  }

  function ensureGslZonesLoaded(presetName, baseUrl) {
    var id = gslSlugToId[presetName];
    if (!id) return Promise.reject(new Error('Unknown GSL preset: ' + presetName));
    if (gslZonesCache[id]) return Promise.resolve();
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    var url = base + GSL_BASE + encodeURIComponent(id) + '/zones.json';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('GSL zones: ' + r.status + ' ' + url);
      return r.json();
    }).then(function (zones) {
      gslZonesCache[id] = zones;
    });
  }

  function getPreset(presetName) {
    var reg = window.PremiumSoundInstrumentProfiles;
    if (isGslPreset(presetName)) {
      var id = gslSlugToId[presetName];
      if (!id || !gslZonesCache[id]) return null;
      return getGslPresetConfig(id);
    }
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

  function getZoneBuffer(zone, ctx) {
    return zone && ctx ? bufferMap(zone).get(ctx) : null;
  }

  function loadPresetInner(ctx, presetName, baseUrl) {
    var preset = getPreset(presetName);
    if (!preset || !preset.zones) return Promise.resolve();
    var basePath = preset.basePath;
    var zones = preset.zones;
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    return Promise.all(zones.map(function (z) {
      var url = base + basePath + (z.file || '');
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

  function loadPreset(ctx, presetName, baseUrl) {
    return ensureGslManifest().then(function () {
      if (gslSlugToId[presetName]) {
        return ensureGslZonesLoaded(presetName, baseUrl || '').then(function () {
          return loadPresetInner(ctx, presetName, baseUrl);
        });
      }
      return loadPresetInner(ctx, presetName, baseUrl);
    });
  }

  function ensurePresetLoaded(ctx, presetName, baseUrl) {
    var base = (baseUrl || '').replace(/\/[^/]*$/, '/');
    if (isGslPreset(presetName)) {
      return ensureGslZonesLoaded(presetName, base).then(function () {
        return loadPresetInner(ctx, presetName, baseUrl);
      });
    }
    return ensureGslManifest().then(function () {
      if (gslSlugToId[presetName]) {
        return ensureGslZonesLoaded(presetName, base).then(function () {
          return loadPresetInner(ctx, presetName, baseUrl);
        });
      }
      return loadPresetInner(ctx, presetName, baseUrl);
    });
  }

  /** Returns slug -> id map after ensureGslManifest(); used to know which preset names need zones loaded before getPreset. */
  function getGslSlugToId() {
    return gslSlugToId;
  }

  window.InstrumentSampleHandler = {
    getPreset: getPreset,
    getZoneForMidi: getZoneForMidi,
    getZoneBuffer: getZoneBuffer,
    loadPreset: loadPreset,
    ensurePresetLoaded: ensurePresetLoaded,
    getGslManifest: function () { return gslManifest; },
    ensureGslManifest: ensureGslManifest,
    getGslSlugToId: getGslSlugToId,
    ensureGslZonesLoaded: ensureGslZonesLoaded,
    isGslPreset: isGslPreset
  };
})();
