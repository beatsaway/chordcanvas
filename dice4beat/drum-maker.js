/**
 * new3 — Same bar duration, two grids:
 * - 8-step grid: 8 steps per bar, each step divided into 4 small steps = 32 small steps/bar (straight 32nds). Step time = barDuration/32.
 * - 12-step grid: 12 steps per bar, each step divided into 3 small steps = 36 small steps/bar (16th triplets). Step time = barDuration/36.
 * Presets: 16 steps/bar → straight grid via index*2. tripletSteps (36/bar) → triplet grid.
 */

const VOICES = [
  { id: 'kick', label: 'Kick', emoji: '👟' },
  { id: 'snare', label: 'Snare', emoji: '🥁' },
  { id: 'clap', label: 'Clap', emoji: '👏' },
  { id: 'hatClosed', label: 'Hat', emoji: '🎩' },
  { id: 'hatOpen', label: 'Hat open', emoji: '🐇' },
  { id: 'ride', label: 'Ride', emoji: '💿' },
  { id: 'cowbell', label: 'Cowbell', emoji: '🛎️' },
  { id: 'tom', label: 'Tom', emoji: '😺' },
];

// 8 steps × 4 small = 32 small steps per bar (straight 32nds; was 4×4 = 16)
const STEPS_STRAIGHT_PER_BAR = 32;
// 12 steps × 3 small = 36 small steps per bar (16th-note triplets)
const STEPS_36_PER_BAR = 36;
/** Number of bars shown in the grid at once (4 beats = 1 bar, mobile-friendly). */
const VIEW_BARS = 1;
const STEPS_STRAIGHT_PER_VIEW = STEPS_STRAIGHT_PER_BAR * VIEW_BARS;
const STEPS_36_PER_VIEW = STEPS_36_PER_BAR * VIEW_BARS;
const GRID_ROWS = 1 + VOICES.length * 2;

// --- Maker sound params (from new6/maker) ---
const MAKER_RANGES = {
  kick: { f0: [48, 250], f1: [20, 62], pitchRampTime: [0.012, 0.48], decayBase: [0.1, 1.4], bodyLevel: [0.2, 1.02], bodyPunchHold: [0.003, 0.035], bodyPunchTime: [0.02, 0.14], bodyTailLevel: [0.05, 0.4], bodyHighpassHz: [0, 78], bodyShape: [0, 1], clickNoiseLevel: [0, 0.82], clickOscLevel: [0, 0.68], clickFreq: [600, 7200], clickDecay: [0.0015, 0.036], clickFilterQ: [0.4, 7], fmAmount: [0, 1.25], fmDecay: [0.018, 0.2], fmFreqMult: [0.6, 3] },
  snare: { bodyF: [75, 500], bodyFEnd: [50, 280], decayT: [0.02, 0.42], toneLevel: [0.08, 0.98], fmAmount: [0, 1.5], fmRatio: [1, 6.5], decayN: [0.03, 0.55], noiseLevel: [0.2, 1.5], noiseFilterFreq: [600, 10000], noiseFilterQ: [0.3, 4], crackLevel: [0, 1.85], crackDecay: [0.01, 0.26], crackFreq: [1800, 14000], crackQ: [0.4, 4.2] },
  clap: { decay: [0.035, 0.2], level: [0.45, 1.05], attack: [0, 0.011], bpF: [2000, 6000], bpQ: [0.28, 2.4], crackLevel: [0, 0.52], crackFreq: [2200, 7200], crackDecay: [0.004, 0.018], toneFreq: [130, 520], toneDecay: [0.014, 0.052], toneLevel: [0.02, 0.38], clapCount: [1, 8], clapSpacingMs: [6, 26], lastDecayMul: [1.1, 2.9] },
  hat: { durClosed: [0.01, 0.21], durOpen: [0.06, 0.82], levelClosed: [0.08, 0.98], levelOpen: [0.08, 0.98], attack: [0, 0.024], stickLevel: [0, 0.58], stickDecay: [0.002, 0.018], bodyLevel: [0, 0.82], bodyFreq: [300, 5400], bodyDecay: [0.006, 0.115], resonantLevel: [0, 0.48], resonantFreq: [8000, 12000], resonantQ: [2, 9.5], resonantDecay: [0.008, 0.058], hpF: [2000, 15800], bpQ: [0.25, 4.8], oscFreq1: [3600, 14800], oscFreq2: [4600, 17800], oscLevel: [0.04, 0.72] },
  tom: { level: [0.35, 0.95], decay: [0.18, 0.85], f0: [70, 200], f1: [48, 110], sweepTime: [0.06, 0.28], attack: [0, 0.028], stickLevel: [0, 0.48], stickDecay: [0.01, 0.045], stickFreq: [900, 2800], stickQ: [0.6, 2.8] },
  ride: { decay: [0.14, 0.82], level: [0.12, 0.82], stickDip: [0.38, 0.98], attack: [0, 0.019], hpF: [3800, 11800], bpF: [5800, 13800], bpQ: [0.25, 1.9], oscFreq1: [4200, 11800], oscFreq2: [5800, 13800], oscLevel: [0.06, 0.48] },
  cowbell: { level: [0.2, 0.95], decay1: [0.05, 0.32], decay2: [0.025, 0.18], f1: [450, 2100], f2: [700, 3000], level1: [0.3, 1], level2: [0.15, 0.85], secondF1: [400, 1700], secondF2: [600, 2300], secondLevel: [0.08, 0.55], secondDecay: [0.025, 0.14], stickLevel: [0, 0.58], stickDecay: [0.008, 0.038], stickFreq: [2000, 5500], stickQ: [0.6, 3.8] }
};
const MAKER_DEFAULTS = {
  kick: { f0: 150, f1: 42, pitchRampTime: 0.055, decayBase: 0.45, bodyLevel: 0.75, bodyPunchHold: 0.012, bodyPunchTime: 0.045, bodyTailLevel: 0.12, bodyHighpassHz: 32, bodyShape: 0.7, clickNoiseLevel: 0.3, clickOscLevel: 0.22, clickFreq: 3800, clickDecay: 0.005, clickFilterQ: 2, fmAmount: 0.35, fmDecay: 0.06, fmFreqMult: 1.6 },
  snare: { bodyF: 200, bodyFEnd: 120, decayT: 0.2, toneLevel: 0.5, fmAmount: 0.5, fmRatio: 2, decayN: 0.2, noiseLevel: 0.7, noiseFilterFreq: 4000, noiseFilterQ: 1.2, noiseFilterType: 'highpass', crackLevel: 0.5, crackDecay: 0.05, crackFreq: 6000, crackQ: 1.5 },
  clap: { decay: 0.08, level: 0.85, attack: 0, bpF: 4000, bpQ: 1.2, crackLevel: 0.2, crackFreq: 4500, crackDecay: 0.008, addTone: false, toneFreq: 280, toneDecay: 0.028, toneLevel: 0.18, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 },
  hat: { durClosed: 0.05, durOpen: 0.2, hpF: 6500, levelClosed: 0.58, levelOpen: 0.58, noiseType: 'pink', filterType: 'highpass', bpQ: 0.7, addOscillators: false, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.2, bodyLevel: 0.3, bodyFreq: 1400, bodyDecay: 0.022, attack: 0, stickLevel: 0.28, stickDecay: 0.006, stickFreq: 5500, resonantLevel: 0.15, resonantFreq: 10000, resonantQ: 4, resonantDecay: 0.025, hatOpen: false },
  tom: { level: 0.6, decay: 0.4, f0: 155, f1: 78, sweepTime: 0.18, bodyOscType: 'sine', attack: 0, stickLevel: 0.2, stickDecay: 0.02, stickFreq: 1800, stickQ: 1.2 },
  ride: { decay: 0.35, level: 0.4, stickDip: 0.7, attack: 0, hpF: 8000, bpF: 10000, bpQ: 0.8, addOscillators: false, oscFreq1: 8000, oscFreq2: 11000, oscLevel: 0.2 },
  cowbell: { level: 0.6, decay1: 0.15, decay2: 0.08, f1: 800, level1: 0.6, f2: 1200, level2: 0.4, osc1Type: 'sine', osc2Type: 'sine', addSecondPair: false, secondF1: 600, secondF2: 900, secondLevel: 0.2, secondDecay: 0.06, stickLevel: 0.2, stickDecay: 0.02, stickFreq: 3500, stickQ: 1.5 }
};
const MAKER_ROUND_KEYS = {
  kick: ['f0', 'f1', 'clickFreq'],
  snare: ['bodyF', 'bodyFEnd', 'noiseFilterFreq', 'crackFreq'],
  clap: ['bpF', 'clapCount', 'clapSpacingMs', 'crackFreq', 'toneFreq'],
  hat: ['hpF', 'oscFreq1', 'oscFreq2', 'bodyFreq', 'resonantFreq'],
  tom: ['f0', 'f1', 'stickFreq'],
  ride: ['hpF', 'bpF', 'oscFreq1', 'oscFreq2'],
  cowbell: ['f1', 'f2', 'secondF1', 'secondF2', 'stickFreq']
};
const makerSoundIds = ['kick', 'snare', 'clap', 'hat', 'tom', 'ride', 'cowbell'];
const makerSoundParams = {};
makerSoundIds.forEach((id) => { makerSoundParams[id] = { ...MAKER_DEFAULTS[id] }; });

function getMakerParams(voiceId) {
  if (voiceId === 'hatClosed' || voiceId === 'hatOpen') return makerSoundParams.hat;
  return makerSoundParams[voiceId] || {};
}

/** Voice id (e.g. hatClosed) → maker sound id for randomize (e.g. hat). */
function getMakerIdForVoice(voiceId) {
  return (voiceId === 'hatClosed' || voiceId === 'hatOpen') ? 'hat' : voiceId;
}

function randomInMakerRange(lo, hi, round) {
  const r = lo + Math.random() * (hi - lo);
  return round ? Math.round(r) : parseFloat(r.toFixed(3));
}

function randomizeMakerSound(id) {
  const ranges = MAKER_RANGES[id];
  const roundKeys = MAKER_ROUND_KEYS[id] || [];
  if (!ranges) return makerSoundParams[id];
  const params = { ...makerSoundParams[id] };
  Object.keys(ranges).forEach((key) => {
    const [lo, hi] = ranges[key];
    params[key] = randomInMakerRange(lo, hi, roundKeys.includes(key));
  });
  if (id === 'snare' && Math.random() > 0.5) params.noiseFilterType = ['highpass', 'bandpass'][Math.floor(Math.random() * 2)];
  if (id === 'clap') params.addTone = Math.random() > 0.5;
  if (id === 'hat') {
    if (Math.random() > 0.5) params.noiseType = ['white', 'pink'][Math.floor(Math.random() * 2)];
    if (Math.random() > 0.5) params.filterType = ['highpass', 'bandpass'][Math.floor(Math.random() * 2)];
    if (Math.random() > 0.5) params.addOscillators = Math.random() > 0.5;
    if (Math.random() > 0.5) params.hatOpen = Math.random() > 0.5;
  }
  if (id === 'tom' && Math.random() > 0.5) params.bodyOscType = ['sine', 'triangle'][Math.floor(Math.random() * 2)];
  if (id === 'ride') params.addOscillators = Math.random() > 0.5;
  if (id === 'cowbell') {
    if (Math.random() > 0.5) params.osc1Type = ['sine', 'triangle', 'square'][Math.floor(Math.random() * 3)];
    if (Math.random() > 0.5) params.osc2Type = ['sine', 'triangle', 'sawtooth', 'square'][Math.floor(Math.random() * 4)];
    if (Math.random() > 0.5) params.addSecondPair = Math.random() > 0.5;
  }
  makerSoundParams[id] = params;
  return params;
}

function randomizeAllMakerSounds() {
  makerSoundIds.forEach((id) => randomizeMakerSound(id));
}

/** Style-biased sound randomization for groove: apply after randomize, then optionally nudge params. */
const STYLE_SOUND_BIAS = {
  'Hip-Hop': { kick: { decayBase: 0.75, bodyTailLevel: 0.85 }, snare: { crackLevel: 1.1, decayN: 1.05 }, hat: { durClosed: 0.9 } },
  'House': { kick: { f1: 0.85, decayBase: 1.15, bodyLevel: 1.05 }, snare: { bodyF: 1.05 }, hat: { levelClosed: 1.05 } },
  'Electronic': { kick: { clickNoiseLevel: 1.1 }, snare: { noiseFilterFreq: 1.05 }, hat: { hpF: 1.02 } },
  'Rock': { kick: { decayBase: 0.9, bodyPunchHold: 1.2 }, snare: { crackLevel: 1.15, decayT: 0.9 }, hat: { stickLevel: 1.1 } },
  'Latin': { kick: { decayBase: 0.85 }, snare: { toneLevel: 1.1 }, cowbell: { level: 1.1 }, hat: { durOpen: 1.1 } },
  'African': { kick: { decayBase: 0.9 }, snare: { decayN: 1.1 }, hat: { levelClosed: 1.05 }, tom: { level: 1.05 } },
  'Jazz': { kick: { decayBase: 1.2, bodyLevel: 0.9 }, snare: { toneLevel: 1.2, crackLevel: 0.85 }, ride: { level: 1.1 }, hat: { durOpen: 1.2 } },
  'Blues': { kick: { decayBase: 1.1 }, snare: { decayT: 1.05 }, hat: { durOpen: 1.15 } },
  'Funk': { kick: { bodyPunchHold: 1.1 }, snare: { crackLevel: 1.05 }, cowbell: { level: 1.15 }, hat: { levelClosed: 1.05 } },
  'Soul': { kick: { decayBase: 0.95 }, snare: { toneLevel: 1.1 }, hat: { durOpen: 1.1 } },
  'Reggae': { kick: { decayBase: 0.8, bodyLevel: 0.95 }, snare: { crackDecay: 0.9 }, hat: { levelClosed: 0.95 } },
  'Pop': { kick: { bodyLevel: 1.05 }, snare: { crackLevel: 1.05 }, hat: { levelClosed: 1.02 } },
  'Gospel': { kick: { decayBase: 1.05 }, snare: { toneLevel: 1.1 }, hat: { durOpen: 1.1 } }
};

function applyStyleBiasToParams(params, bias, ranges) {
  if (!bias || !params) return;
  Object.keys(bias).forEach((key) => {
    if (params[key] != null && typeof bias[key] === 'number') {
      let v = params[key] * bias[key];
      if (ranges && ranges[key]) v = Math.max(ranges[key][0], Math.min(ranges[key][1], v));
      params[key] = typeof params[key] === 'number' ? parseFloat(v.toFixed(4)) : v;
    }
  });
}

function randomizeMakerSoundsForStyle(style) {
  makerSoundIds.forEach((id) => randomizeMakerSound(id));
  const bias = STYLE_SOUND_BIAS[style];
  if (!bias) return;
  Object.keys(bias).forEach((makerId) => {
    const b = bias[makerId];
    const ranges = MAKER_RANGES[makerId];
    if (makerSoundParams[makerId]) applyStyleBiasToParams(makerSoundParams[makerId], b, ranges);
  });
}

// --- Pre-rendered sound bank (reduces CPU at play time, better for mobile) ---
const SOUND_BANK_DURATION = 0.6;
const SOUND_BANK_SAMPLE_RATE = 44100;
/** Each entry is an array of buffers (1–4 variants); playback cycles by stepIndex. */
const soundBank = {
  kick: null,
  snare: null,
  clap: null,
  hatClosed: null,
  hatOpen: null,
  ride: null,
  cowbell: null,
  tom: null
};
/** Number of sound variants per maker (1–4). Hat uses same count for hatClosed and hatOpen. */
const voiceVersions = { kick: 1, snare: 1, clap: 1, hat: 2, ride: 2, cowbell: 1, tom: 1 };

function getVoiceVersionCount(voiceId) {
  const makerId = getMakerIdForVoice(voiceId);
  return Math.max(1, Math.min(4, voiceVersions[makerId] || 1));
}

/** Get one buffer from sound bank for a voice (array or single buffer); variantIndex = stepIndex % length. */
function getSoundBankBuffer(bankKey, stepIndex) {
  const arr = soundBank[bankKey];
  if (!arr) return null;
  const list = Array.isArray(arr) ? arr : [arr];
  if (list.length === 0) return null;
  const idx = (stepIndex ?? 0) % list.length;
  return list[idx];
}

/** Number of sound variants for a voice (bank key = voiceId). */
function getVoiceVariantCount(voiceId) {
  const arr = soundBank[voiceId];
  if (!arr) return 1;
  const list = Array.isArray(arr) ? arr : [arr];
  return Math.max(1, list.length);
}

/** Per-voice next variation index for playback: any cell hit (straight or triplet) advances this voice's variation. */
let voiceVariationNextIndex = {};

function buildSoundBank() {
  const tasks = [];
  makerSoundIds.forEach((id) => {
    const count = Math.max(1, Math.min(4, voiceVersions[id] || 1));
    tasks.push(buildSoundBankVoiceWithCount(id, count));
  });
  return Promise.all(tasks);
}

/** Rebuild one voice's buffers in the sound bank with current version count. */
function buildSoundBankVoice(makerId) {
  const count = Math.max(1, Math.min(4, voiceVersions[makerId] || 1));
  return buildSoundBankVoiceWithCount(makerId, count);
}

/** Build N variant buffers for a maker; stores arrays in soundBank. */
function buildSoundBankVoiceWithCount(makerId, count) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx || typeof window.playKickTest !== 'function') return Promise.resolve();
  const len = Math.ceil(SOUND_BANK_SAMPLE_RATE * SOUND_BANK_DURATION);
  const n = Math.max(1, Math.min(4, count));
  const promises = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) randomizeMakerSound(makerId);
    if (makerId === 'hat') {
      const p = getMakerParams('hat');
      const ctxClosed = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
      window.playHatTest(ctxClosed, ctxClosed.destination, { ...p, hatOpen: false }, 0, false);
      const ctxOpen = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
      window.playHatTest(ctxOpen, ctxOpen.destination, { ...p, hatOpen: true }, 0, true);
      promises.push(
        ctxClosed.startRendering().then((bufClosed) => ({ closed: bufClosed })),
        ctxOpen.startRendering().then((bufOpen) => ({ open: bufOpen }))
      );
    } else {
      const ctx = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
      let render;
      if (makerId === 'kick') render = (c, d) => window.playKickTest(c, d, getMakerParams('kick'), 0);
      else if (makerId === 'snare') render = (c, d) => window.playSnareTest(c, d, getMakerParams('snare'), 0);
      else if (makerId === 'clap') render = (c, d) => window.playClapTest(c, d, getMakerParams('clap'), 0);
      else if (makerId === 'ride') render = (c, d) => window.playRideTest(c, d, getMakerParams('ride'), 0);
      else if (makerId === 'cowbell') render = (c, d) => window.playCowbellTest(c, d, getMakerParams('cowbell'), 0);
      else if (makerId === 'tom') render = (c, d) => window.playTomTest(c, d, getMakerParams('tom'), 0);
      else { promises.push(Promise.resolve(null)); continue; }
      render(ctx, ctx.destination);
      promises.push(ctx.startRendering().then((buf) => ({ single: buf, key: makerId })));
    }
  }
  return Promise.all(promises).then((results) => {
    if (makerId === 'hat') {
      const closedArr = [];
      const openArr = [];
      for (let i = 0; i < results.length; i += 2) {
        if (results[i] && results[i].closed) closedArr.push(results[i].closed);
        if (results[i + 1] && results[i + 1].open) openArr.push(results[i + 1].open);
      }
      soundBank.hatClosed = closedArr.length ? closedArr : soundBank.hatClosed;
      soundBank.hatOpen = openArr.length ? openArr : soundBank.hatOpen;
    } else {
      const arr = results.filter((r) => r && r.single).map((r) => r.single);
      if (arr.length) soundBank[makerId] = arr;
    }
  });
}

function applyVoiceHueToRowLabel(rowLabelEl, hue) {
  if (!rowLabelEl) return;
  rowLabelEl.style.background = 'hsl(' + hue + ', 18%, 11%)';
  const emoji = rowLabelEl.querySelector('.voice-emoji');
  if (emoji) emoji.style.filter = 'hue-rotate(' + hue + 'deg)';
}

function randomizeAllVoiceHues() {
  VOICES.forEach(function (v) {
    voiceHues[v.id] = Math.floor(Math.random() * 360);
  });
  VOICES.forEach(function (v) {
    document.querySelectorAll('.row-label-voice[data-voice="' + v.id + '"]').forEach(function (el) {
      applyVoiceHueToRowLabel(el, voiceHues[v.id]);
    });
  });
}

async function randomizeVoiceSound(voiceId, labelEl) {
  const makerId = getMakerIdForVoice(voiceId);
  if (!makerSoundParams[makerId]) return;
  if (labelEl) {
    labelEl.classList.add('randomizing');
    labelEl.setAttribute('aria-busy', 'true');
  }
  randomizeMakerSound(makerId);
  await buildSoundBankVoice(makerId);
  if (labelEl) {
    labelEl.classList.remove('randomizing');
    labelEl.removeAttribute('aria-busy');
    voiceHues[voiceId] = Math.floor(Math.random() * 360);
    document.querySelectorAll('.row-label-voice[data-voice="' + voiceId + '"]').forEach(function (el) {
      applyVoiceHueToRowLabel(el, voiceHues[voiceId]);
    });
  }
}

let currentVoiceSoundModalVoiceId = null;
/** Indices of variation emojis selected in the voice sound modal (for 🎲👂 "change selected"). */
let selectedVariantIndicesInModal = new Set();

function refreshVoiceSoundModalEmojis() {
  const voiceId = currentVoiceSoundModalVoiceId;
  const container = document.getElementById('voiceSoundModalEmojis');
  const versionsEl = document.getElementById('voiceSoundVersions');
  if (!container || !voiceId || !versionsEl) return;
  const v = VOICES.find((x) => x.id === voiceId);
  const emoji = (v && v.emoji) || '👟';
  const n = Math.max(1, Math.min(4, parseInt(versionsEl.value, 10) || 1));
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const span = document.createElement('span');
    span.className = 'voice-variant-emoji' + (selectedVariantIndicesInModal.has(i) ? ' selected' : '');
    span.textContent = emoji;
    span.dataset.variantIndex = String(i);
    span.title = 'Click to listen; click to select/deselect for 🎲👂';
    span.addEventListener('click', () => {
      playVoiceVariant(voiceId, i);
      if (selectedVariantIndicesInModal.has(i)) selectedVariantIndicesInModal.delete(i);
      else selectedVariantIndicesInModal.add(i);
      span.classList.toggle('selected', selectedVariantIndicesInModal.has(i));
    });
    container.appendChild(span);
  }
}

function openVoiceSoundModal(voiceId) {
  currentVoiceSoundModalVoiceId = voiceId;
  selectedVariantIndicesInModal.clear();
  const makerId = getMakerIdForVoice(voiceId);
  const versionsEl = document.getElementById('voiceSoundVersions');
  const modalEl = document.getElementById('voiceSoundModal');
  if (versionsEl) {
    versionsEl.value = String(Math.max(1, Math.min(4, voiceVersions[makerId] || 1)));
    const valEl = document.getElementById('voiceSoundVersionsVal');
    if (valEl) valEl.textContent = versionsEl.value;
  }
  refreshVoiceSoundModalEmojis();
  if (modalEl) {
    modalEl.setAttribute('aria-hidden', 'false');
  }
}

/** Play one variant of a voice once. */
function playVoiceVariant(voiceId, variantIndex) {
  if (!synth || !synth.ctx) {
    synth = new DrumSynth();
    synth.init();
  }
  synth.resume().then(() => {
    const when = synth.ctx.currentTime + 0.01;
    playVoiceAt(voiceId, 0.8, when, { stepIndex: variantIndex }, 0, null, null);
  });
}

/** Rebuild only the buffer at variantIndex for one maker; keeps other variants. */
function buildSoundBankVoiceSingleVariant(makerId, variantIndex) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx || typeof window.playKickTest !== 'function') return Promise.resolve();
  const len = Math.ceil(SOUND_BANK_SAMPLE_RATE * SOUND_BANK_DURATION);
  randomizeMakerSound(makerId);
  if (makerId === 'hat') {
    const p = getMakerParams('hat');
    const ctxClosed = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
    window.playHatTest(ctxClosed, ctxClosed.destination, { ...p, hatOpen: false }, 0, false);
    const ctxOpen = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
    window.playHatTest(ctxOpen, ctxOpen.destination, { ...p, hatOpen: true }, 0, true);
    return Promise.all([ctxClosed.startRendering(), ctxOpen.startRendering()]).then(([bufClosed, bufOpen]) => {
      let closedArr = soundBank.hatClosed;
      let openArr = soundBank.hatOpen;
      if (!Array.isArray(closedArr)) closedArr = closedArr != null ? [closedArr] : [];
      if (!Array.isArray(openArr)) openArr = openArr != null ? [openArr] : [];
      while (closedArr.length <= variantIndex) closedArr.push(closedArr[closedArr.length - 1] || bufClosed);
      while (openArr.length <= variantIndex) openArr.push(openArr[openArr.length - 1] || bufOpen);
      closedArr[variantIndex] = bufClosed;
      openArr[variantIndex] = bufOpen;
      soundBank.hatClosed = closedArr;
      soundBank.hatOpen = openArr;
    });
  }
  const ctx = new OfflineCtx(1, len, SOUND_BANK_SAMPLE_RATE);
  let render;
  if (makerId === 'kick') render = (c, d) => window.playKickTest(c, d, getMakerParams('kick'), 0);
  else if (makerId === 'snare') render = (c, d) => window.playSnareTest(c, d, getMakerParams('snare'), 0);
  else if (makerId === 'clap') render = (c, d) => window.playClapTest(c, d, getMakerParams('clap'), 0);
  else if (makerId === 'ride') render = (c, d) => window.playRideTest(c, d, getMakerParams('ride'), 0);
  else if (makerId === 'cowbell') render = (c, d) => window.playCowbellTest(c, d, getMakerParams('cowbell'), 0);
  else if (makerId === 'tom') render = (c, d) => window.playTomTest(c, d, getMakerParams('tom'), 0);
  else return Promise.resolve();
  render(ctx, ctx.destination);
  return ctx.startRendering().then((buf) => {
    let arr = soundBank[makerId];
    if (!Array.isArray(arr)) arr = arr != null ? [arr] : [];
    while (arr.length <= variantIndex) arr.push(arr[arr.length - 1] || buf);
    arr[variantIndex] = buf;
    soundBank[makerId] = arr;
  });
}

function closeVoiceSoundModal() {
  const voiceId = currentVoiceSoundModalVoiceId;
  const versionsEl = document.getElementById('voiceSoundVersions');
  const modalEl = document.getElementById('voiceSoundModal');
  if (voiceId && versionsEl) {
    const makerId = getMakerIdForVoice(voiceId);
    const n = Math.max(1, Math.min(4, parseInt(versionsEl.value, 10) || 1));
    voiceVersions[makerId] = n;
  }
  if (modalEl) modalEl.setAttribute('aria-hidden', 'true');
  currentVoiceSoundModalVoiceId = null;
}

// --- Drum synth: uses sound bank when available, else maker synths or builtin ---
const REVERB_HP_HZ = 267;
/** Crossover for stereo mid-dip: below this we keep mid (no dip), above we apply slider dip. */
const STEREO_CROSSOVER_HZ = 267;

/** Generate a stereo reverb impulse response (decaying noise). */
function createReverbIR(ctx, durationSec = 1.4, decaySec = 0.8) {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * durationSec);
  const buf = ctx.createBuffer(2, len, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const decay = Math.exp(-t / decaySec);
    const n = (Math.random() * 2 - 1) * decay;
    L[i] = n;
    R[i] = (Math.random() * 2 - 1) * decay;
  }
  return buf;
}

/** Reverb duration in seconds: min = BPM/240, max = BPM/60; slider 0–100% (default 50%). */
function getReverbDurationSec() {
  const bpm = getBpm();
  const minSec = bpm / 240;
  const maxSec = bpm / 60;
  const pct = Math.max(0, Math.min(100, parseFloat(document.getElementById('reverbDuration')?.value, 10) || 50)) / 100;
  return minSec + (maxSec - minSec) * pct;
}

function updateReverbIR() {
  const durationSec = getReverbDurationSec();
  const el = document.getElementById('reverbDurationVal');
  if (el) el.textContent = durationSec.toFixed(2) + ' s';
  if (!synth.ctx || !synth.reverbConvolver) return;
  const decaySec = durationSec * 0.55;
  synth.reverbConvolver.buffer = createReverbIR(synth.ctx, durationSec, decaySec);
}

class DrumSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.reverbWetGain = null;
    this.reverbConvolver = null;
  }

  init(externalCtx) {
    if (this.ctx && !externalCtx) return this.ctx;
    if (externalCtx) {
      this.ctx = externalCtx;
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      const mix = this.ctx.createGain();
      mix.gain.value = 1;
      this.master.connect(mix);
      const reverbSend = this.ctx.createBiquadFilter();
      reverbSend.type = 'highpass';
      reverbSend.frequency.value = REVERB_HP_HZ;
      reverbSend.Q.value = 0.7;
      this.master.connect(reverbSend);
      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.normalize = true;
      const durationSec = typeof getReverbDurationSec === 'function' ? getReverbDurationSec() : 1;
      this.reverbConvolver.buffer = createReverbIR(this.ctx, durationSec, durationSec * 0.55);
      reverbSend.connect(this.reverbConvolver);
      this.reverbWetGain = this.ctx.createGain();
      this.reverbWetGain.gain.value = typeof getReverb === 'function' ? getReverb() : 0.5;
      this.reverbConvolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(mix);
      // Stereo (mid-dip) after reverb: M/S, dip mid less below STEREO_CROSSOVER_HZ
      const widthSplit = this.ctx.createChannelSplitter(2);
      const midSum = this.ctx.createGain();
      const sideSum = this.ctx.createGain();
      const invGain = this.ctx.createGain();
      invGain.gain.value = -1;
      widthSplit.connect(midSum, 0);
      widthSplit.connect(midSum, 1);
      widthSplit.connect(sideSum, 0);
      widthSplit.connect(invGain, 1);
      invGain.connect(sideSum);
      const midLowLP = this.ctx.createBiquadFilter();
      midLowLP.type = 'lowpass';
      midLowLP.frequency.value = STEREO_CROSSOVER_HZ;
      midLowLP.Q.value = 0.7;
      const midHighHP = this.ctx.createBiquadFilter();
      midHighHP.type = 'highpass';
      midHighHP.frequency.value = STEREO_CROSSOVER_HZ;
      midHighHP.Q.value = 0.7;
      const midLowGain = this.ctx.createGain();
      midLowGain.gain.value = 1;
      this.stereoMidHighGain = this.ctx.createGain();
      this.stereoMidHighGain.gain.value = typeof getStereoMidHighAmount === 'function' ? getStereoMidHighAmount() : 1;
      const midMerge = this.ctx.createGain();
      midMerge.gain.value = 1;
      midSum.connect(midLowLP);
      midLowLP.connect(midLowGain);
      midLowGain.connect(midMerge);
      midSum.connect(midHighHP);
      midHighHP.connect(this.stereoMidHighGain);
      this.stereoMidHighGain.connect(midMerge);
      const sideGain = this.ctx.createGain();
      sideGain.gain.value = 1;
      const sideGainInv = this.ctx.createGain();
      sideGainInv.gain.value = -1;
      sideSum.connect(sideGain);
      sideSum.connect(sideGainInv);
      const widthMerge = this.ctx.createChannelMerger(2);
      midMerge.connect(widthMerge, 0, 0);
      midMerge.connect(widthMerge, 0, 1);
      sideGain.connect(widthMerge, 0, 0);
      sideGainInv.connect(widthMerge, 0, 1);
      mix.connect(widthSplit);
      widthMerge.connect(this.ctx.destination);
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;

    const mix = this.ctx.createGain();
    mix.gain.value = 1;

    this.master.connect(mix);

    const reverbSend = this.ctx.createBiquadFilter();
    reverbSend.type = 'highpass';
    reverbSend.frequency.value = REVERB_HP_HZ;
    reverbSend.Q.value = 0.7;
    this.master.connect(reverbSend);

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.normalize = true;
    reverbSend.connect(this.reverbConvolver);
    updateReverbIR();

    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = (parseFloat(document.getElementById('reverb')?.value, 10) || 50) / 100;
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(mix);

    // Stereo (mid-dip) after reverb: M/S, dip mid less below STEREO_CROSSOVER_HZ
    const widthSplit = this.ctx.createChannelSplitter(2);
    const midSum = this.ctx.createGain();
    const sideSum = this.ctx.createGain();
    const invGain = this.ctx.createGain();
    invGain.gain.value = -1;
    widthSplit.connect(midSum, 0);
    widthSplit.connect(midSum, 1);
    widthSplit.connect(sideSum, 0);
    widthSplit.connect(invGain, 1);
    invGain.connect(sideSum);
    const midLowLP = this.ctx.createBiquadFilter();
    midLowLP.type = 'lowpass';
    midLowLP.frequency.value = STEREO_CROSSOVER_HZ;
    midLowLP.Q.value = 0.7;
    const midHighHP = this.ctx.createBiquadFilter();
    midHighHP.type = 'highpass';
    midHighHP.frequency.value = STEREO_CROSSOVER_HZ;
    midHighHP.Q.value = 0.7;
    const midLowGain = this.ctx.createGain();
    midLowGain.gain.value = 1;
    this.stereoMidHighGain = this.ctx.createGain();
    this.stereoMidHighGain.gain.value = getStereoMidHighAmount();
    const midMerge = this.ctx.createGain();
    midMerge.gain.value = 1;
    midSum.connect(midLowLP);
    midLowLP.connect(midLowGain);
    midLowGain.connect(midMerge);
    midSum.connect(midHighHP);
    midHighHP.connect(this.stereoMidHighGain);
    this.stereoMidHighGain.connect(midMerge);
    const sideGain = this.ctx.createGain();
    sideGain.gain.value = 1;
    const sideGainInv = this.ctx.createGain();
    sideGainInv.gain.value = -1;
    sideSum.connect(sideGain);
    sideSum.connect(sideGainInv);
    const widthMerge = this.ctx.createChannelMerger(2);
    midMerge.connect(widthMerge, 0, 0);
    midMerge.connect(widthMerge, 0, 1);
    sideGain.connect(widthMerge, 0, 0);
    sideGainInv.connect(widthMerge, 0, 1);
    mix.connect(widthSplit);
    widthMerge.connect(this.ctx.destination);
    return this.ctx;
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') return this.ctx.resume();
    return Promise.resolve();
  }

  _noise(duration = 0.1, white = true, seed = null) {
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const mul = white ? 1 : 0.7;
    if (seed != null && typeof seed === 'number') {
      for (let i = 0; i < len; i++) d[i] = (this._pseudoRand(seed + i) * 2 - 1) * mul;
    } else {
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * mul;
    }
    return buf;
  }

  /** Pink noise (1/f) via Voss-McCartney, deterministic when seed provided. Used by hat/ride variants. */
  _pinkNoise(duration = 0.1, seed = null) {
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const rand = seed != null && typeof seed === 'number'
      ? (i) => this._pseudoRand(seed + i)
      : () => Math.random();
    for (let i = 0; i < len; i++) {
      const white = (rand(i) * 2 - 1);
      b0 = b0 * 0.99829 + white * 0.00171;
      b1 = b1 * 0.99829 + b0 * 0.00171;
      b2 = b2 * 0.99829 + b1 * 0.00171;
      b3 = b3 * 0.99829 + b2 * 0.00171;
      b4 = b4 * 0.99829 + b3 * 0.00171;
      b5 = b5 * 0.99829 + b4 * 0.00171;
      b6 = b6 * 0.99829 + b5 * 0.00171;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6) * 0.15;
    }
    return buf;
  }

  /** Deterministic 0..1 from seed (same step+voice = same humanize every time) */
  _pseudoRand(seed) {
    const x = Math.sin(seed * 9999.123) * 43758.5453;
    return x - Math.floor(x);
  }
  _humanizeSeed(options = {}) {
    const step = (options.stepIndex ?? 0) | 0;
    const id = { kick: 1, snare: 2, clap: 3, hatClosed: 4, hatOpen: 5, ride: 6, cowbell: 7, tom: 8 }[options.voiceId] ?? 0;
    const sub = (options.subHit ?? 0) | 0;
    return step * 31 + id * 7 + sub;
  }
  _pitchVar(base, rangePercent = 0.06, rand) {
    const r = (rand ?? this._pseudoRand(0)) - 0.5;
    const out = base + r * base * Math.min(1.5, rangePercent);
    return Math.max(Math.max(base * 0.25, 8), Math.min(base * 2.5, out));
  }
  _decayVar(base, amount = 0.18, rand) {
    const r = (rand ?? this._pseudoRand(0)) - 0.5;
    const out = base * (1 + r * Math.min(1.5, amount));
    return Math.max(base * 0.15, out);
  }
  _attackVar(amount = 0.4, rand) {
    const r = 1 + ((rand ?? this._pseudoRand(0)) - 0.5) * Math.min(1.2, amount);
    return Math.max(0.3, Math.min(2, r));
  }
  _velTone(vel) { return 0.4 + 0.6 * Math.max(0, Math.min(1, vel)); }
  /** Cents offset for detune (chorus): amount 0..1 → ±150 cents at 1. rand in 0..1. Capped for stability. */
  _detuneCents(amount = 0.5, rand) {
    const cents = ((rand ?? this._pseudoRand(0)) - 0.5) * 2 * Math.min(2, Math.max(0, amount)) * 150;
    return Math.max(-120, Math.min(120, cents));
  }

  playKick(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('kick', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playKickTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playKickTest(this.ctx, velGain, getMakerParams('kick'), t);
      return;
    }
    this._playKickBuiltin(velocity, atTime, options);
  }
  _playKickBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.75;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.45);
    const click = this._noise(0.015, true, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = click;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2800;
    bp.Q.value = 2;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.1 * v, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    src.connect(bp).connect(cg).connect(this.master);
    src.start(t);
    src.stop(t + 0.02);
  }

  playSnare(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1, playbackRate = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('snare', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.max(0.8, Math.min(1.2, playbackRate));
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playSnareTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playSnareTest(this.ctx, velGain, getMakerParams('snare'), t);
      return;
    }
    this._playSnareBuiltin(velocity, atTime, options);
  }
  _playSnareBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.8;
    const noise = this._noise(0.25, false, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(v, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(hp).connect(ng);
    const tone = this.ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(200, t);
    tone.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.5 * v, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    tone.connect(tg);
    const mix = this.ctx.createGain();
    mix.gain.value = 1;
    ng.connect(mix);
    tg.connect(mix);
    mix.connect(this.master);
    src.start(t);
    src.stop(t + 0.25);
    tone.start(t);
    tone.stop(t + 0.14);
  }

  playClap(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('clap', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playClapTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playClapTest(this.ctx, velGain, getMakerParams('clap'), t);
      return;
    }
    this._playClapBuiltin(velocity, atTime, options);
  }
  _playClapBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.85;
    const noise = this._noise(0.12, false, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1600;
    bp.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(bp).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.12);
  }

  playHat(open, velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer(open ? 'hatOpen' : 'hatClosed', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const runLen = options.hatRunLengthStraight ?? options.hatRunLengthTriplet ?? 0;
      const pitchUp = Math.min(runLen * 0.03, 0.25);
      src.playbackRate.setValueAtTime(1 + pitchUp, t);
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playHatTest === 'function') {
      const params = getMakerParams('hat');
      const isOpen = !!open;
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playHatTest(this.ctx, velGain, { ...params, hatOpen: isOpen }, t, isOpen);
      return;
    }
    this._playHatBuiltin(open, velocity, atTime, options);
  }
  _playHatBuiltin(open, velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * (open ? 0.35 : 0.4);
    const dur = open ? 0.2 : 0.05;
    const noise = this._noise(open ? 0.25 : 0.06, true, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + Math.max(dur, open ? 0.2 : 0.04));
  }

  playTom(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1, playbackRate = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('tom', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.max(0.8, Math.min(1.2, playbackRate));
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playTomTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playTomTest(this.ctx, velGain, getMakerParams('tom'), t);
      return;
    }
    this._playTomBuiltin(velocity, atTime, options);
  }
  _playTomBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.5;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playRide(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('ride', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playRideTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playRideTest(this.ctx, velGain, getMakerParams('ride'), t);
      return;
    }
    this._playRideBuiltin(velocity, atTime, options);
  }
  _playRideBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.32;
    const noise = this._noise(0.4, true, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 9000;
    bp.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.setValueAtTime(v * 0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(hp).connect(bp).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.4);
  }

  playCowbell(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1, playbackRate = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale));
    const buf = getSoundBankBuffer('cowbell', options.stepIndex);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.max(0.8, Math.min(1.2, playbackRate));
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      src.connect(velGain);
      velGain.connect(this.master);
      src.start(t);
      return;
    }
    if (typeof window.playCowbellTest === 'function') {
      const velGain = this.ctx.createGain();
      velGain.gain.setValueAtTime(v, t);
      velGain.connect(this.master);
      window.playCowbellTest(this.ctx, velGain, getMakerParams('cowbell'), t);
      return;
    }
    this._playCowbellBuiltin(velocity, atTime, options);
  }
  _playCowbellBuiltin(velocity, atTime, options = {}) {
    const { timeOffset = 0, velScale = 1 } = options;
    const t = atTime + timeOffset;
    const v = Math.max(0, Math.min(1, velocity * velScale)) * 0.55;
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1050, t);
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1450, t);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(v, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(v * 0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(g1).connect(this.master);
    osc2.connect(g2).connect(this.master);
    osc1.start(t);
    osc1.stop(t + 0.14);
    osc2.start(t);
    osc2.stop(t + 0.1);
  }
}

// --- Bar duration: one bar = 4 beats at BPM. Both grids span this same duration. ---
function getBarDurationSeconds() {
  return (60 / getBpm()) * 4;
}

function createEmptyPattern(bars) {
  const pattern = {};
  VOICES.forEach((v) => {
    pattern[v.id] = {
      straight: Array(bars * STEPS_STRAIGHT_PER_BAR).fill(false),
      triplet: Array(bars * STEPS_36_PER_BAR).fill(false),
    };
  });
  return pattern;
}

function warmUp(synth) {
  return new Promise((resolve) => {
    if (!synth.ctx) { resolve(); return; }
    const t = synth.ctx.currentTime;
    const osc = synth.ctx.createOscillator();
    const gain = synth.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.connect(gain);
    gain.connect(synth.master);
    osc.start(t);
    osc.stop(t + 0.025);
    setTimeout(resolve, 80);
  });
}

/** Init and warm up audio in the background to reduce glitches when user presses Play later. */
async function ensureAudioReady() {
  synth.init();
  await synth.resume();
  await warmUp(synth);
  await new Promise((r) => setTimeout(r, PRELOAD_DELAY_MS));
}

// --- App ---
let synth = new DrumSynth();
let pattern = createEmptyPattern(typeof document !== 'undefined' && document.getElementById('bars') ? getBars() : 8);
let playing = false;
let scheduleTimer = null;
let nextTimeStraight = 0;
let nextTime36 = 0;
let stepIdxStraight = 0;
let stepIdx36 = 0;
let currentViewBar = 0;
/** Toggle in header nav cell (🔓/🔒). Off by default; use for follow-play etc. later. */
let headerNavLock = false;
/** Per-voice hue (0–360) for emoji and row header bg. Random on load, new random on click. */
const voiceHues = (function () {
  const o = {};
  VOICES.forEach(function (v) { o[v.id] = Math.floor(Math.random() * 360); });
  return o;
})();
const PRELOAD_DELAY_MS = 120;
const LOOK_AHEAD = 0.12;

function getMasterVolume() { return Math.max(0, Math.min(1, (parseFloat(document.getElementById('masterVolume')?.value, 10) || 100) / 100)); }
function getReverb() { return Math.max(0, Math.min(1, (parseFloat(document.getElementById('reverb')?.value, 10) || 50) / 100)); }
/** Stereo width 0..100. Used for mid-dip: 0 = no dip, 100 = full dip (like midiwav). Below 267 Hz we keep mid (no dip). */
function getStereo() { return Math.max(0, Math.min(100, parseFloat(document.getElementById('stereo')?.value, 10) || 0)); }
/** Gain for mid band above 267 Hz: 0% stereo → 1, 100% → ~0.016 (≈ -36 dB). */
function getStereoMidHighAmount() {
  const pct = getStereo() / 100;
  const db = -36 * pct;
  return Math.pow(10, db / 20);
}
function getBpm() { return Math.max(60, Math.min(200, parseInt(document.getElementById('bpm').value, 10) || 120)); }
function getBars() { return Math.max(1, Math.min(16, parseInt(document.getElementById('bars').value, 10) || 4)); }
function getHatSpeed() { return document.getElementById('hatSpeed') ? document.getElementById('hatSpeed').value : '16'; }
function getVariation() { return (parseFloat(document.getElementById('variation').value, 10) || 0) / 100; }
function getSwing8th() { return (parseFloat(document.getElementById('swing8th')?.value, 10) || 0) / 100; }
function getSwing16th() { return (parseFloat(document.getElementById('swing16th')?.value, 10) || 0) / 100; }
function getHat8x4Fill() { return (parseFloat(document.getElementById('hat8x4Fill')?.value, 10) || 0) / 100; }
function getSnare8x4Fill() { return (parseFloat(document.getElementById('snare8x4Fill')?.value, 10) || 0) / 100; }
function getHat8x4Skip() { return (parseFloat(document.getElementById('hat8x4Skip')?.value, 10) || 0) / 100; }

/** Effective hat 8×4 skip for step (8-bar cycle): bar 1 skip n/1%, bar 2 skip n/2%, … bar 8 skip n/8% so last bar is most intense. */
function getHat8x4SkipForStep(stepIdx) {
  const nPct = (parseFloat(document.getElementById('hat8x4Skip')?.value, 10) || 0);
  if (nPct <= 0) return 0;
  const barInCycle = Math.floor(stepIdx / STEPS_STRAIGHT_PER_BAR) % 8;
  const barNumber = barInCycle + 1;
  const effectivePct = nPct / barNumber;
  return Math.min(1, effectivePct / 100);
}
function getHat4x4Split() { return (parseFloat(document.getElementById('hat4x4Split')?.value, 10) || 0) / 100; }
function getHat12x3Skip() { return (parseFloat(document.getElementById('hat12x3Skip')?.value, 10) || 0) / 100; }

function getHumanize() { return {}; }

/** Deterministic jitter from step index (pseudo-random, same pattern every time) */
function jitterPseudo(amount, stepIdx, channel) {
  if (amount <= 0) return 0;
  const x = Math.sin((stepIdx * 31 + channel) * 9999.123) * 43758.5453;
  const r = x - Math.floor(x);
  return (r - 0.5) * 2 * amount;
}

/** Delay-only jitter: 0..amount (never negative, so never earlier) */
function jitterPseudoDelay(amount, stepIdx, channel) {
  if (amount <= 0) return 0;
  const x = Math.sin((stepIdx * 31 + channel) * 9999.123) * 43758.5453;
  const r = x - Math.floor(x);
  return r * amount;
}

// Pseudo-random 0..1 from step index (deterministic, same pattern every time)
function pseudoRand8x4Fill(stepIdx) {
  const x = Math.sin((stepIdx + 1) * 56.789) * 43758.5453;
  return x - Math.floor(x);
}
function pseudoRandSnareFill(stepIdx) {
  const x = Math.sin((stepIdx + 1) * 91.234) * 43758.5453;
  return x - Math.floor(x);
}

/** Structure-aware: avoid filling hat on strong downbeats (every 8th 32nd = beat start). */
function shouldApplyHatFill(stepIdx, bars) {
  if (stepIdx < 0) return false;
  const stepInBar = stepIdx % STEPS_STRAIGHT_PER_BAR;
  if (stepInBar % 8 === 0) return false;
  return true;
}

/** Structure-aware: snare fill only on offbeats (second half of bar) or in last bar (fill bar). */
function shouldApplySnareFill(nextStep, bars) {
  if (nextStep < 0 || bars <= 0) return false;
  const barIndex = Math.floor(nextStep / STEPS_STRAIGHT_PER_BAR);
  const stepInBar = nextStep % STEPS_STRAIGHT_PER_BAR;
  if (barIndex >= bars) return false;
  if (barIndex === bars - 1) return true;
  return stepInBar >= STEPS_STRAIGHT_PER_BAR / 2;
}
function pseudoRand8x4Skip(stepIdx) {
  const x = Math.sin((stepIdx + 1) * 34.5678) * 43758.5453;
  return x - Math.floor(x);
}
function pseudoRand8x4Split(stepIdx) {
  const x = Math.sin((stepIdx + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function pseudoRand36(stepIdx) {
  const x = Math.sin((stepIdx + 1) * 78.2334) * 43758.5453;
  return x - Math.floor(x);
}

/** Count consecutive preceding steps that have a hat (8×4 grid). Resets when a gap appears. */
function countHatRunStraight(stepIdx) {
  const total = getBars() * STEPS_STRAIGHT_PER_BAR;
  let r = 0;
  for (let i = 1; i <= total; i++) {
    const idx = (stepIdx - i + total) % total;
    if ((pattern.hatClosed && pattern.hatClosed.straight && pattern.hatClosed.straight[idx]) ||
        (pattern.hatOpen && pattern.hatOpen.straight && pattern.hatOpen.straight[idx]))
      r++;
    else break;
  }
  return r;
}

/** Count consecutive preceding steps that have a hat (12×3 grid). Resets when a gap appears. */
function countHatRunTriplet(stepIdx) {
  const total = getBars() * STEPS_36_PER_BAR;
  let r = 0;
  for (let i = 1; i <= total; i++) {
    const idx = (stepIdx - i + total) % total;
    if ((pattern.hatClosed && pattern.hatClosed.triplet && pattern.hatClosed.triplet[idx]) ||
        (pattern.hatOpen && pattern.hatOpen.triplet && pattern.hatOpen.triplet[idx]))
      r++;
    else break;
  }
  return r;
}

function scheduleStep32(stepIdx, when, stepDur) {
  const variation = getVariation();
  const humanizeMult = variation > 0.5 ? 1.5 : 1;
  let timeOffset = jitterPseudoDelay(variation * 0.008 * humanizeMult, stepIdx, 0);
  const swing8th = getSwing8th();
  const swing16th = getSwing16th();
  if (stepDur > 0) {
    if (swing8th > 0 && stepIdx % 2 === 1) timeOffset += swing8th * stepDur * 0.5;
    if (swing16th > 0 && (stepIdx % 4 === 1 || stepIdx % 4 === 3)) timeOffset += swing16th * stepDur * 0.35;
  }
  const velScale = 1 + jitterPseudo(variation * 0.12 * humanizeMult, stepIdx, 1);
  const hatRunStraight = countHatRunStraight(stepIdx);
  const playbackRate = 1 + jitterPseudo(variation * 0.2 * humanizeMult, stepIdx, 3);
  const baseOpts = { timeOffset, velScale, playbackRate, humanize: getHumanize(), hatRunLengthStraight: hatRunStraight };
  const vel = 0.75 + jitterPseudo(variation * 0.2 * humanizeMult, stepIdx, 2);
  const hat8x4Skip = getHat8x4SkipForStep(stepIdx);
  VOICES.forEach((v) => {
    const data = pattern[v.id];
    if (!data || !data.straight || !data.straight[stepIdx]) return;
    if ((v.id === 'hatClosed' || v.id === 'hatOpen') && hat8x4Skip > 0 && pseudoRand8x4Skip(stepIdx) < hat8x4Skip) return;
    const opts = { ...baseOpts, stepIndex: stepIdx, voiceId: v.id, subHit: 0 };
    playVoiceAt(v.id, vel, when, opts, stepDur, stepIdx, null);
  });
}

function scheduleStep36(stepIdx, when, stepDur) {
  const variation = getVariation();
  const humanizeMult = variation > 0.5 ? 1.5 : 1;
  let timeOffset = jitterPseudoDelay(variation * 0.008 * humanizeMult, stepIdx, 0);
  const swing8th = getSwing8th();
  const swing16th = getSwing16th();
  if (stepDur > 0) {
    if (swing8th > 0 && stepIdx % 9 === 3) timeOffset += swing8th * stepDur * 0.5;
    if (swing16th > 0 && stepIdx % 3 === 1) timeOffset += swing16th * stepDur * 0.35;
  }
  const velScale = 1 + jitterPseudo(variation * 0.12 * humanizeMult, stepIdx, 1);
  const hatRunTriplet = countHatRunTriplet(stepIdx);
  const playbackRate = 1 + jitterPseudo(variation * 0.2 * humanizeMult, stepIdx, 3);
  const baseOpts = { timeOffset, velScale, playbackRate, humanize: getHumanize(), hatRunLengthTriplet: hatRunTriplet };
  const vel = 0.75 + jitterPseudo(variation * 0.2 * humanizeMult, stepIdx, 2);
  const skip12x3 = getHat12x3Skip();
  VOICES.forEach((v) => {
    const data = pattern[v.id];
    if (!data || !data.triplet || !data.triplet[stepIdx]) return;
    if ((v.id === 'hatClosed' || v.id === 'hatOpen') && skip12x3 > 0 && pseudoRand36(stepIdx) < skip12x3) return;
    const opts = { ...baseOpts, stepIndex: stepIdx, voiceId: v.id, subHit: 0 };
    playVoiceAt(v.id, vel, when, opts, stepDur, null, stepIdx);
  });
}

function playVoiceAt(voiceId, vel, when, opts, stepDur, stepIdxStraight, stepIdx36) {
  const fromGrid = stepIdxStraight != null || stepIdx36 != null;
  if (fromGrid) {
    const n = getVoiceVariantCount(voiceId);
    const idx = (voiceVariationNextIndex[voiceId] ?? 0) % n;
    opts = { ...opts, stepIndex: idx };
    voiceVariationNextIndex[voiceId] = (idx + 1) % n;
  }
  const doSplit8x4 = stepIdxStraight != null && (voiceId === 'hatClosed' || voiceId === 'hatOpen') &&
    stepDur > 0 && getHat4x4Split() > 0 && pseudoRand8x4Split(stepIdxStraight) < getHat4x4Split();
  switch (voiceId) {
    case 'kick': synth.playKick(vel, when, opts); break;
    case 'snare': synth.playSnare(vel, when, opts); break;
    case 'clap': synth.playClap(vel, when, opts); break;
    case 'hatClosed':
      synth.playHat(false, vel, when, opts);
      if (stepDur > 0) {
        if (doSplit8x4) synth.playHat(false, vel * 0.6, when + stepDur * 0.5, { ...opts, subHit: 1 });
        else if (getHatSpeed() === '32') synth.playHat(false, vel * 0.55, when + stepDur * 0.5, { ...opts, subHit: 1 });
        else if (getHatSpeed() === 'triplet') {
          synth.playHat(false, vel * 0.75, when + stepDur / 3, { ...opts, subHit: 1 });
          synth.playHat(false, vel * 0.5, when + stepDur * 2 / 3, { ...opts, subHit: 2 });
        }
      }
      break;
    case 'hatOpen':
      synth.playHat(true, vel, when, opts);
      if (doSplit8x4) synth.playHat(true, vel * 0.55, when + stepDur * 0.5, { ...opts, subHit: 1 });
      break;
    case 'ride': synth.playRide(vel, when, opts); break;
    case 'cowbell': synth.playCowbell(vel, when, opts); break;
    case 'tom': synth.playTom(vel, when, opts); break;
  }
}

function scheduler() {
  if (!playing || !synth.ctx) return;
  const bars = getBars();
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const barDuration = getBarDurationSeconds();
  const stepDurStraight = barDuration / STEPS_STRAIGHT_PER_BAR;
  const stepDur36 = barDuration / STEPS_36_PER_BAR;
  const end = synth.ctx.currentTime + LOOK_AHEAD;

  const locked = headerNavLock;
  const viewStartStraight = locked ? currentViewBar * STEPS_STRAIGHT_PER_BAR : 0;
  const viewEndStraight = locked ? viewStartStraight + STEPS_STRAIGHT_PER_BAR : totalStraight;
  const viewStart36 = locked ? currentViewBar * STEPS_36_PER_BAR : 0;
  const viewEnd36 = locked ? viewStart36 + STEPS_36_PER_BAR : total36;

  while (nextTimeStraight < end || nextTime36 < end) {
    if (nextTimeStraight <= nextTime36) {
      scheduleStep32(stepIdxStraight, nextTimeStraight, stepDurStraight);
      stepIdxStraight = stepIdxStraight + 1;
      if (locked && stepIdxStraight >= viewEndStraight) stepIdxStraight = viewStartStraight;
      else if (!locked) stepIdxStraight = stepIdxStraight % totalStraight;
      nextTimeStraight += stepDurStraight;
    } else {
      scheduleStep36(stepIdx36, nextTime36, stepDur36);
      stepIdx36 = stepIdx36 + 1;
      if (locked && stepIdx36 >= viewEnd36) stepIdx36 = viewStart36;
      else if (!locked) stepIdx36 = stepIdx36 % total36;
      nextTime36 += stepDur36;
    }
  }
  updatePlayhead();
  scheduleTimer = setTimeout(scheduler, 40);
}

function updatePlayhead() {
  if (!headerNavLock) {
    const bars = getBars();
    const currentBar = Math.floor(stepIdxStraight / STEPS_STRAIGHT_PER_BAR) % bars;
    const maxViewStart = Math.max(0, bars - VIEW_BARS);
    const inView = currentBar >= currentViewBar && currentBar < currentViewBar + VIEW_BARS;
    if (!inView) {
      currentViewBar = Math.max(0, Math.min(currentBar, maxViewStart));
      buildGrid();
      bindGridClicks();
    }
  }
  document.querySelectorAll('.cell.playhead').forEach((el) => el.classList.remove('playhead'));
  document.querySelectorAll(`.cell[data-grid="straight"][data-step="${stepIdxStraight}"]`).forEach((el) => el.classList.add('playhead'));
  document.querySelectorAll(`.cell[data-grid="triplet"][data-step="${stepIdx36}"]`).forEach((el) => el.classList.add('playhead'));
}

function stop() {
  playing = false;
  if (scheduleTimer) { clearTimeout(scheduleTimer); scheduleTimer = null; }
  document.querySelectorAll('.cell.playhead').forEach((el) => el.classList.remove('playhead'));
  const btn = document.getElementById('btnPlay');
  const st = document.getElementById('status');
  if (btn) {
    btn.classList.remove('playing');
    btn.textContent = 'Play';
    btn.setAttribute('aria-label', 'Play');
  }
  if (st) st.textContent = 'Stopped';
}

// --- Download: MIDI (GM drum map) and WAV (offline render) ---
const MIDI_TICKS_PER_BEAT = 480;
const GM_DRUM_CHANNEL = 9;
const VOICE_TO_GM_NOTE = {
  kick: 36,
  snare: 38,
  clap: 39,
  hatClosed: 42,
  hatOpen: 46,
  ride: 51,
  cowbell: 56,
  tom: 45,
};

function exportDrumMidi() {
  if (typeof window.Midi === 'undefined') {
    alert('MIDI library not loaded.');
    return;
  }
  const bars = getBars();
  const bpm = getBpm();
  const ticksPerBar = 4 * MIDI_TICKS_PER_BEAT;
  const ticksPerStepStraight = ticksPerBar / STEPS_STRAIGHT_PER_BAR;
  const ticksPerStep36 = ticksPerBar / STEPS_36_PER_BAR;
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const events = [];

  for (let stepIdx = 0; stepIdx < totalStraight; stepIdx++) {
    const tick = Math.round(stepIdx * ticksPerStepStraight);
    VOICES.forEach((v) => {
      const data = pattern[v.id];
      if (!data?.straight?.[stepIdx]) return;
      const note = VOICE_TO_GM_NOTE[v.id];
      if (note == null) return;
      const vel = Math.max(1, Math.min(127, Math.round(100 * 0.75)));
      events.push({ tick, type: 'on', note, vel });
      events.push({ tick: tick + Math.max(1, Math.round(ticksPerStepStraight * 0.8)), type: 'off', note, vel });
    });
  }
  for (let stepIdx = 0; stepIdx < total36; stepIdx++) {
    const tick = Math.round(stepIdx * ticksPerStep36);
    VOICES.forEach((v) => {
      const data = pattern[v.id];
      if (!data?.triplet?.[stepIdx]) return;
      const note = VOICE_TO_GM_NOTE[v.id];
      if (note == null) return;
      const vel = Math.max(1, Math.min(127, Math.round(100 * 0.75)));
      events.push({ tick, type: 'on', note, vel });
      events.push({ tick: tick + Math.max(1, Math.round(ticksPerStep36 * 0.8)), type: 'off', note, vel });
    });
  }
  events.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : (a.type === 'off' ? 1 : -1));
  let lastTick = 0;
  const file = new window.Midi.File({ ticks: MIDI_TICKS_PER_BEAT });
  const track = new window.Midi.Track();
  track.setTempo(bpm, 0);
  events.forEach((ev) => {
    const delta = Math.max(0, ev.tick - lastTick);
    if (ev.type === 'on') track.noteOn(GM_DRUM_CHANNEL, ev.note, delta, ev.vel);
    else track.noteOff(GM_DRUM_CHANNEL, ev.note, delta, ev.vel);
    lastTick = ev.tick;
  });
  file.addTrack(track);
  const blob = file.toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freakbeat-${Date.now()}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function encodeWavFromBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  function writeString(offset, text) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = buffer.getChannelData(ch)[i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

async function exportDrumWav() {
  const bars = getBars();
  const bpm = getBpm();
  const barDurationSec = (60 / bpm) * 4;
  const durationSec = bars * barDurationSec;
  const sampleRate = 44100;
  const numSamples = Math.ceil(durationSec * sampleRate);
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) {
    alert('OfflineAudioContext not supported.');
    return;
  }
  const offlineCtx = new OfflineCtx(2, numSamples, sampleRate);
  const renderSynth = new DrumSynth();
  renderSynth.init(offlineCtx);
  const stepDurStraight = barDurationSec / STEPS_STRAIGHT_PER_BAR;
  const stepDur36 = barDurationSec / STEPS_36_PER_BAR;
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const savedSynth = synth;
  synth = renderSynth;
  for (let stepIdx = 0; stepIdx < totalStraight; stepIdx++) {
    const when = stepIdx * stepDurStraight;
    scheduleStep32(stepIdx, when, stepDurStraight);
  }
  for (let stepIdx = 0; stepIdx < total36; stepIdx++) {
    const when = stepIdx * stepDur36;
    scheduleStep36(stepIdx, when, stepDur36);
  }
  synth = savedSynth;
  const buffer = await offlineCtx.startRendering();
  const blob = encodeWavFromBuffer(buffer);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freakbeat-${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Composition JSON: full round-trip of grid, bar length, and sound settings (pattern, bars, controls, makerSoundParams, voiceVersions, voiceHues) ---
const COMPOSITION_JSON_VERSION = 2;

function exportCompositionJson() {
  const bars = getBars();
  const lenStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const lenTriplet = bars * STEPS_36_PER_BAR;
  const patternCopy = {};
  VOICES.forEach((v) => {
    const d = pattern[v.id];
    const straight = (d && d.straight) ? d.straight.slice(0, lenStraight) : [];
    const triplet = (d && d.triplet) ? d.triplet.slice(0, lenTriplet) : [];
    patternCopy[v.id] = {
      straight: straight.length === lenStraight ? straight : [...straight, ...Array(lenStraight - straight.length).fill(false)],
      triplet: triplet.length === lenTriplet ? triplet : [...triplet, ...Array(lenTriplet - triplet.length).fill(false)],
    };
  });
  const makerCopy = {};
  makerSoundIds.forEach((id) => {
    makerCopy[id] = makerSoundParams[id] ? { ...makerSoundParams[id] } : {};
  });
  const controls = {
    bpm: getBpm(),
    masterVolume: Math.round((getMasterVolume() * 100)),
    reverb: Math.round((getReverb() * 100)),
    reverbDuration: Math.round((parseFloat(document.getElementById('reverbDuration')?.value, 10) || 50)),
    stereo: Math.round(getStereo()),
    hatSpeed: getHatSpeed(),
    hat8x4Fill: parseFloat(document.getElementById('hat8x4Fill')?.value || 10),
    hat8x4Skip: parseFloat(document.getElementById('hat8x4Skip')?.value || 10),
    hat4x4Split: parseFloat(document.getElementById('hat4x4Split')?.value || 10),
    snare8x4Fill: parseFloat(document.getElementById('snare8x4Fill')?.value || 10),
    hat12x3Skip: parseFloat(document.getElementById('hat12x3Skip')?.value || 10),
    variation: parseFloat(document.getElementById('variation')?.value || 50),
    swing8th: parseFloat(document.getElementById('swing8th')?.value || 0),
    swing16th: parseFloat(document.getElementById('swing16th')?.value || 0),
  };
  return {
    version: COMPOSITION_JSON_VERSION,
    bars,
    pattern: patternCopy,
    makerSoundParams: makerCopy,
    voiceHues: { ...voiceHues },
    voiceVersions: { ...voiceVersions },
    controls,
  };
}

function downloadCompositionJson() {
  const data = exportCompositionJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freakbeat-composition-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadCompositionFromJson(data) {
  const v = data && (data.version === 1 || data.version === 2) ? data.version : 0;
  if (!data || !v) {
    alert('Invalid or unsupported composition file.');
    return;
  }
  const bars = Math.max(1, Math.min(16, parseInt(data.bars, 10) || 4));
  const controls = data.controls || {};
  if (playing) stop();

  // --- Bar length and all control values (BPM, volume, reverb, stereo, hat options, variation, swing) ---
  document.getElementById('bars').value = String(bars);
  document.getElementById('bpm').value = String(Math.max(60, Math.min(200, parseInt(controls.bpm, 10) || 120)));
  document.getElementById('masterVolume').value = String(Math.max(0, Math.min(100, parseFloat(controls.masterVolume) || 100)));
  document.getElementById('reverb').value = String(Math.max(0, Math.min(100, parseFloat(controls.reverb) || 50)));
  document.getElementById('reverbDuration').value = String(Math.max(0, Math.min(100, parseFloat(controls.reverbDuration) || 50)));
  document.getElementById('stereo').value = String(Math.max(0, Math.min(100, parseFloat(controls.stereo) || 0)));
  const hatSpeedEl = document.getElementById('hatSpeed');
  if (hatSpeedEl && ['16', '32', 'triplet'].includes(controls.hatSpeed)) hatSpeedEl.value = controls.hatSpeed;
  document.getElementById('hat8x4Fill').value = String(Math.max(0, Math.min(100, parseFloat(controls.hat8x4Fill) || 10)));
  document.getElementById('hat8x4Skip').value = String(Math.max(0, Math.min(100, parseFloat(controls.hat8x4Skip) || 10)));
  document.getElementById('hat4x4Split').value = String(Math.max(0, Math.min(100, parseFloat(controls.hat4x4Split) || 10)));
  document.getElementById('snare8x4Fill').value = String(Math.max(0, Math.min(100, parseFloat(controls.snare8x4Fill) || 10)));
  document.getElementById('hat12x3Skip').value = String(Math.max(0, Math.min(100, parseFloat(controls.hat12x3Skip) || 10)));
  document.getElementById('variation').value = String(Math.max(0, Math.min(100, parseFloat(controls.variation) || 50)));
  const swing8thVal = Math.max(0, Math.min(100, parseFloat(controls.swing8th) != null ? controls.swing8th : (parseFloat(controls.swing) != null ? controls.swing : 0)));
  const swing16thVal = Math.max(0, Math.min(100, parseFloat(controls.swing16th) != null ? controls.swing16th : 0));
  document.getElementById('swing8th').value = String(swing8thVal);
  document.getElementById('swing16th').value = String(swing16thVal);

  // --- Pattern: every voice, all cell notes (straight + triplet) ---
  pattern = createEmptyPattern(bars);
  const lenStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const lenTriplet = bars * STEPS_36_PER_BAR;
  if (data.pattern && typeof data.pattern === 'object') {
    VOICES.forEach((v) => {
      const src = data.pattern[v.id];
      if (!src) return;
      const dst = pattern[v.id];
      if (src.straight && Array.isArray(src.straight)) {
        const n = Math.min(src.straight.length, lenStraight);
        for (let i = 0; i < n; i++) dst.straight[i] = !!src.straight[i];
      }
      if (src.triplet && Array.isArray(src.triplet)) {
        const n = Math.min(src.triplet.length, lenTriplet);
        for (let i = 0; i < n; i++) dst.triplet[i] = !!src.triplet[i];
      }
    });
  }

  // --- Sound design: per-maker params (kick, snare, hat, etc.) ---
  if (data.makerSoundParams && typeof data.makerSoundParams === 'object') {
    makerSoundIds.forEach((id) => {
      const src = data.makerSoundParams[id];
      if (src && typeof src === 'object') makerSoundParams[id] = { ...MAKER_DEFAULTS[id], ...src };
    });
  }

  // --- Row label hues (per-voice) ---
  if (data.voiceHues && typeof data.voiceHues === 'object') {
    VOICES.forEach((voice) => {
      const h = data.voiceHues[voice.id];
      if (typeof h === 'number' && h >= 0 && h <= 360) voiceHues[voice.id] = Math.round(h);
    });
  }

  // --- Variation count per voice (1–4) ---
  if (data.voiceVersions && typeof data.voiceVersions === 'object') {
    makerSoundIds.forEach((id) => {
      const n = data.voiceVersions[id];
      if (typeof n === 'number' && n >= 1 && n <= 4) voiceVersions[id] = Math.round(n);
    });
  }

  setPresetSelectValue('');

  // --- Update all display spans ---
  document.getElementById('masterVolumeVal').textContent = document.getElementById('masterVolume').value + '%';
  document.getElementById('reverbVal').textContent = document.getElementById('reverb').value + '%';
  document.getElementById('stereoVal').textContent = document.getElementById('stereo').value + '%';
  document.getElementById('hat8x4FillVal').textContent = document.getElementById('hat8x4Fill').value + '%';
  document.getElementById('hat8x4SkipVal').textContent = document.getElementById('hat8x4Skip').value + '%';
  document.getElementById('hat4x4SplitVal').textContent = document.getElementById('hat4x4Split').value + '%';
  document.getElementById('snare8x4FillVal').textContent = document.getElementById('snare8x4Fill').value + '%';
  document.getElementById('hat12x3SkipVal').textContent = document.getElementById('hat12x3Skip').value + '%';
  document.getElementById('variationVal').textContent = document.getElementById('variation').value + '%';
  document.getElementById('swing8thVal').textContent = document.getElementById('swing8th').value + '%';
  document.getElementById('swing16thVal').textContent = document.getElementById('swing16th').value + '%';
  updateReverbIR();

  buildGrid();
  bindGridClicks();
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Preloading sounds…';
  buildSoundBank().then(() => {
    if (statusEl) statusEl.textContent = 'Composition loaded. Draw or Play';
  });
}

async function play(optionalStartBar) {
  const btn = document.getElementById('btnPlay');
  const statusEl = document.getElementById('status');
  if (playing) { stop(); return; }
  statusEl.textContent = 'Preloading…';
  statusEl.className = 'status preload';
  synth.init();
  await synth.resume();
  synth.master.gain.value = getMasterVolume();
  if (synth.reverbWetGain) synth.reverbWetGain.gain.value = getReverb();
  if (synth.stereoMidHighGain) synth.stereoMidHighGain.gain.value = getStereoMidHighAmount();
  await warmUp(synth);
  if (!getSoundBankBuffer('kick', 0)) {
    statusEl.textContent = 'Preloading sounds…';
    await buildSoundBank();
  }
  await new Promise((r) => setTimeout(r, PRELOAD_DELAY_MS));
  const bars = getBars();
  if (!pattern.kick || pattern.kick.straight.length !== bars * STEPS_STRAIGHT_PER_BAR || pattern.kick.triplet.length !== bars * STEPS_36_PER_BAR) {
    pattern = createEmptyPattern(bars);
    renderGrid();
  }
  let startBar = optionalStartBar != null ? Math.max(0, Math.min(optionalStartBar, bars - 1)) : 0;
  if (headerNavLock) startBar = Math.max(0, Math.min(currentViewBar, bars - 1));
  playing = true;
  const start = synth.ctx.currentTime + 0.02;
  nextTimeStraight = start;
  nextTime36 = start;
  stepIdxStraight = startBar * STEPS_STRAIGHT_PER_BAR;
  stepIdx36 = startBar * STEPS_36_PER_BAR;
  statusEl.textContent = 'Playing';
  statusEl.className = 'status playing';
  btn.classList.add('playing');
  btn.textContent = 'Stop';
  btn.setAttribute('aria-label', 'Stop');
  scheduler();
}

/** Start playback from a specific bar (used by ▶︎ in beat header). Overrides master Play: if already playing, restarts from that bar. */
function playFromBar(barIndex) {
  const bars = getBars();
  const b = Math.max(0, Math.min(barIndex, bars - 1));
  if (playing) {
    stop();
    stepIdxStraight = b * STEPS_STRAIGHT_PER_BAR;
    stepIdx36 = b * STEPS_36_PER_BAR;
    const start = synth.ctx.currentTime + 0.02;
    nextTimeStraight = start;
    nextTime36 = start;
    playing = true;
    const btn = document.getElementById('btnPlay');
    const statusEl = document.getElementById('status');
    if (btn) { btn.classList.add('playing'); btn.textContent = 'Stop'; btn.setAttribute('aria-label', 'Stop'); }
    if (statusEl) { statusEl.textContent = 'Playing'; statusEl.className = 'status playing'; }
    scheduler();
    return;
  }
  play(b);
}

// --- Grid: show VIEW_BARS (1) bar at a time (4 beats). currentViewBar = current bar. Auto-follow when playing. ---
function buildGrid() {
  const grid = document.getElementById('grid');
  const bars = getBars();
  const maxViewStart = Math.max(0, bars - VIEW_BARS);
  currentViewBar = Math.max(0, Math.min(currentViewBar, maxViewStart));
  const b = currentViewBar;

  grid.style.setProperty('--bars', '1');
  grid.style.setProperty('--grid-rows', String(GRID_ROWS));
  grid.innerHTML = '';

  // Header: prev/next arrows to navigate 1-bar pages
  const headerLabel = document.createElement('div');
  headerLabel.className = 'row-label row-header row-header-nav';
  headerLabel.style.gridColumn = '1';
  headerLabel.style.gridRow = '1';
  const prevSpan = document.createElement('span');
  prevSpan.className = 'header-nav-span' + (b <= 0 ? ' header-nav-disabled' : '');
  prevSpan.textContent = '🞀';
  prevSpan.title = 'Previous bar';
  if (b > 0) {
    prevSpan.addEventListener('click', () => {
      currentViewBar = Math.max(0, currentViewBar - VIEW_BARS);
      renderGrid();
    });
  }
  const nextSpan = document.createElement('span');
  nextSpan.className = 'header-nav-span' + (b >= maxViewStart ? ' header-nav-disabled' : '');
  nextSpan.textContent = '🞂';
  nextSpan.title = 'Next bar';
  if (b < maxViewStart) {
    nextSpan.addEventListener('click', () => {
      currentViewBar = Math.min(maxViewStart, currentViewBar + VIEW_BARS);
      renderGrid();
    });
  }
  const lockSpan = document.createElement('span');
  lockSpan.className = 'header-nav-lock' + (headerNavLock ? '' : ' header-nav-lock-unlocked');
  lockSpan.setAttribute('role', 'img');
  lockSpan.title = headerNavLock ? 'Unlock: loop full composition (click to toggle)' : 'Lock: loop current 4 beats only (click to toggle)';
  lockSpan.textContent = headerNavLock ? '🔒' : '🔓';
  lockSpan.addEventListener('click', () => {
    headerNavLock = !headerNavLock;
    lockSpan.textContent = headerNavLock ? '🔒' : '🔓';
    lockSpan.title = headerNavLock ? 'Unlock: loop full composition (click to toggle)' : 'Lock: loop current 4 beats only (click to toggle)';
    lockSpan.classList.toggle('header-nav-lock-unlocked', !headerNavLock);
  });
  headerLabel.appendChild(prevSpan);
  headerLabel.appendChild(lockSpan);
  headerLabel.appendChild(nextSpan);
  grid.appendChild(headerLabel);
  const barCellHeader = document.createElement('div');
  barCellHeader.className = 'bar-row-cell grid-straight row-header row-header-beats';
  barCellHeader.style.gridColumn = '2';
  barCellHeader.style.gridRow = '1';
  const beatsPerView = VIEW_BARS * 4; // 4 beats per bar
  for (let i = 0; i < beatsPerView; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell beat-cell beat-cell-clickable';
    cell.style.gridColumn = (i * 8 + 1) + ' / span 8';
    const globalBeatIndex = b * 4 + i;
    const diceSpan = document.createElement('span');
    diceSpan.className = 'beat-cell-dice';
    diceSpan.textContent = '🎲';
    diceSpan.title = 'Randomise this beat from a random preset';
    diceSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      regenerateBeat(globalBeatIndex);
    });
    cell.appendChild(diceSpan);
    const beatNumSpan = document.createElement('span');
    beatNumSpan.className = 'beat-cell-num';
    beatNumSpan.textContent = String(b * 4 + i + 1);
    cell.appendChild(beatNumSpan);
    const playSpan = document.createElement('span');
    playSpan.className = 'beat-cell-play';
    playSpan.textContent = '▶︎';
    playSpan.title = 'Play from this bar';
    playSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      playFromBar(b);
    });
    cell.appendChild(playSpan);
    barCellHeader.appendChild(cell);
  }
  grid.appendChild(barCellHeader);

  VOICES.forEach((v, voiceIndex) => {
    const data = pattern[v.id] || { straight: [], triplet: [] };

    // One label per voice spanning both rows (8×4 and 12×3)
    const startRow = 2 + voiceIndex * 2;
    const label = document.createElement('div');
    label.className = 'row-label row-label-voice row-label-voice-merged';
    label.dataset.voice = v.id;
    label.style.gridColumn = '1';
    label.style.gridRow = startRow + ' / span 2';
    const emoji = document.createElement('span');
    emoji.className = 'voice-emoji';
    emoji.textContent = v.emoji || '';
    label.appendChild(emoji);
    label.title = "Click to choose sound versions and randomise '" + v.label + "'";
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => openVoiceSoundModal(v.id));
    applyVoiceHueToRowLabel(label, voiceHues[v.id]);
    grid.appendChild(label);

    const barCellStraight = document.createElement('div');
    barCellStraight.className = 'bar-row-cell grid-straight';
    barCellStraight.style.gridColumn = '2';
    barCellStraight.style.gridRow = String(startRow);
    for (let i = 0; i < STEPS_STRAIGHT_PER_VIEW; i++) {
      const stepIdx = b * STEPS_STRAIGHT_PER_BAR + i;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.step = String(stepIdx);
      cell.dataset.voice = v.id;
      cell.dataset.grid = 'straight';
      if (data.straight && data.straight[stepIdx]) cell.classList.add('on');
      barCellStraight.appendChild(cell);
    }
    grid.appendChild(barCellStraight);

    const barCell36 = document.createElement('div');
    barCell36.className = 'bar-row-cell grid-36';
    barCell36.style.gridColumn = '2';
    barCell36.style.gridRow = String(startRow + 1);
    for (let j = 0; j < STEPS_36_PER_VIEW; j++) {
      const stepIdx = b * STEPS_36_PER_BAR + j;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.step = String(stepIdx);
      cell.dataset.voice = v.id;
      cell.dataset.grid = 'triplet';
      if (data.triplet && data.triplet[stepIdx]) cell.classList.add('on');
      barCell36.appendChild(cell);
    }
    grid.appendChild(barCell36);
  });

}

function renderGrid() {
  buildGrid();
  bindGridClicks();
}

function bindGridClicks() {
  document.querySelectorAll('.grid .cell[data-voice][data-step][data-grid]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const voice = cell.dataset.voice;
      const step = parseInt(cell.dataset.step, 10);
      const gridType = cell.dataset.grid;
      if (!pattern[voice]) pattern[voice] = { straight: [], triplet: [] };
      const arr = gridType === 'straight' ? pattern[voice].straight : pattern[voice].triplet;
      if (!arr) return;
      arr[step] = !arr[step];
      cell.classList.toggle('on', arr[step]);
    });
  });
}

/** Clear pattern for one beat (8 straight steps, 9 triplet steps). */
function clearBeat(globalBeatIndex) {
  const bars = getBars();
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const startS = globalBeatIndex * 8;
  const startT = globalBeatIndex * 9;
  VOICES.forEach((v) => {
    if (!pattern[v.id]) return;
    for (let i = 0; i < 8 && startS + i < totalStraight; i++) pattern[v.id].straight[startS + i] = false;
    for (let j = 0; j < 9 && startT + j < total36; j++) pattern[v.id].triplet[startT + j] = false;
  });
}

/** Fill one beat from a preset using that beat position (preset bar + beat-in-bar), not always first beat. */
function fillBeatFromPreset(globalBeatIndex, preset) {
  if (!preset) return;
  const bars = getBars();
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const stepsPerBar = preset.stepsPerBar || 16;
  const presetBars = preset.bars || 4;
  const barIndex = Math.floor(globalBeatIndex / 4);
  const beatInBar = globalBeatIndex % 4;
  const startS = globalBeatIndex * 8;
  const startT = globalBeatIndex * 9;
  const voiceIdsNoHats = ['kick', 'snare', 'clap', 'ride', 'cowbell', 'tom'];
  const sourceBarIdx = barIndex % presetBars;
  const sourceBar = preset.barSteps && preset.barSteps[sourceBarIdx] ? preset.barSteps[sourceBarIdx] : null;

  if (sourceBar) {
    const stepLo = beatInBar * (stepsPerBar / 4);
    const stepHi = stepLo + (stepsPerBar / 4);
    voiceIdsNoHats.forEach((voiceId) => {
      const indices = sourceBar[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((idx) => {
        if (idx < stepLo || idx >= stepHi) return;
        const rel = idx - stepLo;
        if (stepsPerBar === 16) {
          if (startS + rel * 2 < totalStraight) pattern[voiceId].straight[startS + rel * 2] = true;
          if (startS + rel * 2 + 1 < totalStraight) pattern[voiceId].straight[startS + rel * 2 + 1] = true;
        } else {
          if (startS + rel < totalStraight) pattern[voiceId].straight[startS + rel] = true;
        }
      });
    });
    if (sourceBar.kickTriplet && Array.isArray(sourceBar.kickTriplet) && pattern.kick && pattern.kick.triplet) {
      const tLo = beatInBar * 9;
      const tHi = tLo + 9;
      sourceBar.kickTriplet.forEach((idx) => {
        if (idx >= tLo && idx < tHi && startT + (idx - tLo) < total36) pattern.kick.triplet[startT + (idx - tLo)] = true;
      });
    }
  }

  if (preset.hatStraight && typeof preset.hatStraight === 'object') {
    const stepsPerBarHat = 16;
    const stepLo = sourceBarIdx * stepsPerBarHat + beatInBar * 4;
    const stepHi = stepLo + 4;
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatStraight[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((idx) => {
        if (idx < stepLo || idx >= stepHi) return;
        const rel = idx - stepLo;
        if (startS + rel * 2 < totalStraight) pattern[voiceId].straight[startS + rel * 2] = true;
        if (startS + rel * 2 + 1 < totalStraight) pattern[voiceId].straight[startS + rel * 2 + 1] = true;
      });
    });
  }
  if (preset.hatTriplet && typeof preset.hatTriplet === 'object') {
    const tPerBar = 36;
    const tLo = sourceBarIdx * tPerBar + beatInBar * 9;
    const tHi = tLo + 9;
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatTriplet[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((idx) => {
        if (idx >= tLo && idx < tHi && startT + (idx - tLo) < total36) pattern[voiceId].triplet[startT + (idx - tLo)] = true;
      });
    });
  }
}

/** Fill one beat with current style: current preset if selected, else hat/snare fill only. */
function fillBeatWithCurrentStyle(globalBeatIndex) {
  const presetId = document.getElementById('presetSelect')?.value;
  const currentPreset = (typeof getDrumPresetById !== 'undefined' && presetId) ? getDrumPresetById(presetId) : null;
  if (currentPreset) {
    fillBeatFromPreset(globalBeatIndex, currentPreset);
    return;
  }
  clearBeat(globalBeatIndex);
  const bars = getBars();
  const startS = globalBeatIndex * 8;
  const startT = globalBeatIndex * 9;
  const hat8x4Fill = getHat8x4Fill();
  for (let i = 0; i < 8; i++) {
    const stepIdx = startS + i;
    if (hat8x4Fill > 0 && shouldApplyHatFill(stepIdx, bars) && pseudoRand8x4Fill(stepIdx) < hat8x4Fill) {
      ['hatClosed', 'hatOpen'].forEach((voiceId) => {
        if (pattern[voiceId] && pattern[voiceId].straight) pattern[voiceId].straight[stepIdx] = true;
      });
    }
  }
  const snare8x4Fill = getSnare8x4Fill();
  if (snare8x4Fill > 0 && pattern.snare && pattern.snare.straight) {
    for (let i = 0; i < 7; i++) {
      const stepIdx = startS + i;
      if (!pattern.snare.straight[stepIdx]) continue;
      const nextStep = stepIdx + 1;
      if (pattern.snare.straight[nextStep]) continue;
      if (shouldApplySnareFill(nextStep, bars) && pseudoRandSnareFill(nextStep) < snare8x4Fill) pattern.snare.straight[nextStep] = true;
    }
  }
}

/** Regenerate one beat from a random preset (that beat position in the preset). */
function regenerateBeat(globalBeatIndex) {
  clearBeat(globalBeatIndex);
  const randomPreset = typeof getRandomPresetForGroove !== 'undefined' ? getRandomPresetForGroove() : (typeof getRandomDrumPreset !== 'undefined' ? getRandomDrumPreset() : null);
  if (randomPreset) fillBeatFromPreset(globalBeatIndex, randomPreset);
  else fillBeatWithCurrentStyle(globalBeatIndex);
  renderGrid();
}

/** Fill bars [startBarIndex, endBarIndex) with preset pattern (cycle preset bars). Same logic as applyPreset + hat/snare fill, scoped to range. */
function fillNewBarsWithPreset(preset, startBarIndex, endBarIndex) {
  if (!preset || startBarIndex >= endBarIndex) return;
  const bars = getBars();
  const stepsPerBar = preset.stepsPerBar || 16;
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;
  const presetBars = preset.bars || 4;
  const voiceIdsNoHats = ['kick', 'snare', 'clap', 'ride', 'cowbell', 'tom'];

  function mapToStraight(globalStep) {
    const totalLegacy = bars * stepsPerBar;
    if (globalStep < 0 || globalStep >= totalLegacy) return -1;
    if (stepsPerBar === 16) return globalStep * 2;
    if (stepsPerBar === 32) return globalStep;
    return -1;
  }
  function mapToTriplet(globalStep) {
    const totalLegacy = bars * stepsPerBar;
    if (globalStep < 0 || globalStep >= totalLegacy) return -1;
    if (stepsPerBar === 12) {
      const barIndex = Math.floor(globalStep / 12);
      const stepInBar = globalStep % 12;
      return barIndex * 36 + stepInBar * 3;
    }
    return -1;
  }

  if (preset.barSteps && Array.isArray(preset.barSteps) && preset.barSteps.length > 0) {
    for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
      const sourceBarIdx = (barIndex - startBarIndex) % presetBars;
      const sourceBar = preset.barSteps[sourceBarIdx];
      if (!sourceBar) continue;
      const baseStep = barIndex * stepsPerBar;
      voiceIdsNoHats.forEach((voiceId) => {
        const indices = sourceBar[voiceId];
        if (!Array.isArray(indices) || !pattern[voiceId]) return;
        indices.forEach((relStep) => {
          if (relStep < 0 || relStep >= stepsPerBar) return;
          const globalStep = baseStep + relStep;
          const s = mapToStraight(globalStep);
          if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
          const t = mapToTriplet(globalStep);
          if (t >= 0 && t < total36) pattern[voiceId].triplet[t] = true;
        });
      });
      if (sourceBar.kickTriplet && Array.isArray(sourceBar.kickTriplet) && pattern.kick && pattern.kick.triplet) {
        sourceBar.kickTriplet.forEach((tripletStep) => {
          if (tripletStep >= 0 && tripletStep < 36) {
            const t = barIndex * 36 + tripletStep;
            if (t >= 0 && t < total36) pattern.kick.triplet[t] = true;
          }
        });
      }
    }
  } else if (preset.steps) {
    for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
      const sourceBarIdx = (barIndex - startBarIndex) % presetBars;
      const baseStep = barIndex * stepsPerBar;
      const sourceRangeStart = sourceBarIdx * stepsPerBar;
      const sourceRangeEnd = (sourceBarIdx + 1) * stepsPerBar;
      voiceIdsNoHats.forEach((voiceId) => {
        const indices = preset.steps[voiceId];
        if (!Array.isArray(indices) || !pattern[voiceId]) return;
        indices.forEach((stepIndex) => {
          if (stepIndex < sourceRangeStart || stepIndex >= sourceRangeEnd) return;
          const relStep = stepIndex - sourceRangeStart;
          const globalStep = baseStep + relStep;
          const s = mapToStraight(globalStep);
          if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
          const t = mapToTriplet(globalStep);
          if (t >= 0 && t < total36) pattern[voiceId].triplet[t] = true;
        });
      });
    }
  }

  if (preset.hatStraight && typeof preset.hatStraight === 'object') {
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatStraight[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
        const sourceBarIdx = (barIndex - startBarIndex) % presetBars;
        const sourceRangeStart = sourceBarIdx * stepsPerBar;
        const sourceRangeEnd = (sourceBarIdx + 1) * stepsPerBar;
        indices.forEach((idx) => {
          if (idx < sourceRangeStart || idx >= sourceRangeEnd) return;
          const s = barIndex * STEPS_STRAIGHT_PER_BAR + (idx - sourceRangeStart) * 2;
          if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
        });
      }
    });
  }
  if (preset.hatTriplet && typeof preset.hatTriplet === 'object') {
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatTriplet[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      for (let barIndex = startBarIndex; barIndex < endBarIndex; barIndex++) {
        const sourceBarIdx = (barIndex - startBarIndex) % presetBars;
        const sourceRangeStart = sourceBarIdx * 36;
        const sourceRangeEnd = (sourceBarIdx + 1) * 36;
        indices.forEach((idx) => {
          if (idx < sourceRangeStart || idx >= sourceRangeEnd) return;
          const t = barIndex * STEPS_36_PER_BAR + (idx - sourceRangeStart);
          if (t >= 0 && t < total36) pattern[voiceId].triplet[t] = true;
        });
      }
    });
  }

  const hat8x4Fill = getHat8x4Fill();
  if (hat8x4Fill > 0) {
    const stepStart = startBarIndex * STEPS_STRAIGHT_PER_BAR;
    const stepEnd = endBarIndex * STEPS_STRAIGHT_PER_BAR;
    for (let stepIdx = stepStart; stepIdx < stepEnd; stepIdx++) {
      if (!shouldApplyHatFill(stepIdx, bars)) continue;
      ['hatClosed', 'hatOpen'].forEach((voiceId) => {
        if (!pattern[voiceId] || !pattern[voiceId].straight) return;
        if (pattern[voiceId].straight[stepIdx]) return;
        if (pseudoRand8x4Fill(stepIdx) < hat8x4Fill) pattern[voiceId].straight[stepIdx] = true;
      });
    }
  }
  const snare8x4Fill = getSnare8x4Fill();
  if (snare8x4Fill > 0 && pattern.snare && pattern.snare.straight) {
    const stepStart = startBarIndex * STEPS_STRAIGHT_PER_BAR;
    const stepEnd = endBarIndex * STEPS_STRAIGHT_PER_BAR;
    for (let stepIdx = stepStart; stepIdx < stepEnd - 1; stepIdx++) {
      if (!pattern.snare.straight[stepIdx]) continue;
      const nextStep = stepIdx + 1;
      if (pattern.snare.straight[nextStep]) continue;
      if (!shouldApplySnareFill(nextStep, bars)) continue;
      if (pseudoRandSnareFill(nextStep) < snare8x4Fill) pattern.snare.straight[nextStep] = true;
    }
  }
}

function resizePattern() {
  const bars = getBars();
  const newStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const new36 = bars * STEPS_36_PER_BAR;
  const prevStraight = (pattern.kick && pattern.kick.straight && pattern.kick.straight.length) || 0;
  const prev36 = (pattern.kick && pattern.kick.triplet && pattern.kick.triplet.length) || 0;
  if (prevStraight === newStraight && prev36 === new36) return;
  const prevBars = prevStraight / STEPS_STRAIGHT_PER_BAR;
  const newPattern = createEmptyPattern(bars);
  VOICES.forEach((v) => {
    const old = pattern[v.id];
    const neu = newPattern[v.id];
    if (old && old.straight && neu.straight) {
      const n = Math.min(old.straight.length, neu.straight.length);
      for (let i = 0; i < n; i++) neu.straight[i] = old.straight[i];
    }
    if (old && old.triplet && neu.triplet) {
      const n = Math.min(old.triplet.length, neu.triplet.length);
      for (let i = 0; i < n; i++) neu.triplet[i] = old.triplet[i];
    }
  });
  pattern = newPattern;
  if (bars > prevBars && typeof getDrumPresetById !== 'undefined') {
    const presetId = document.getElementById('presetSelect')?.value;
    const preset = presetId ? getDrumPresetById(presetId) : null;
    if (preset) fillNewBarsWithPreset(preset, Math.floor(prevBars), bars);
  }
  buildGrid();
  bindGridClicks();
}

function clearPattern() {
  if (playing) stop();
  pattern = createEmptyPattern(getBars());
  buildGrid();
  bindGridClicks();
  setPresetSelectValue('');
}

function applyPreset(preset, options) {
  if (!preset) return;
  const preserveBars = options && options.preserveBars;
  const bars = preserveBars ? getBars() : (preset.bars || 4);
  const stepsPerBar = preset.stepsPerBar || 16;
  if (!preserveBars) document.getElementById('bars').value = bars;
  pattern = createEmptyPattern(bars);
  const totalLegacy = bars * stepsPerBar;
  const totalStraight = bars * STEPS_STRAIGHT_PER_BAR;
  const total36 = bars * STEPS_36_PER_BAR;

  // When dice: preserve bar count and fill by cycling preset (reuse fillNewBarsWithPreset for full range)
  if (preserveBars && bars > 0) {
    fillNewBarsWithPreset(preset, 0, bars);
    buildGrid();
    bindGridClicks();
    setPresetSelectValue(preset.id);
    applySwingFromPreset(preset);
    return;
  }

  // Non-hat voices only from steps/barSteps (hats use hatStraight / hatTriplet in new3 presets)
  const voiceIdsNoHats = ['kick', 'snare', 'clap', 'ride', 'cowbell', 'tom'];

  // Presets use 16 steps/bar; map to 32-step grid so same timing: index * 2
  function mapToStraight(globalStep) {
    if (globalStep < 0 || globalStep >= totalLegacy) return -1;
    if (stepsPerBar === 16) return globalStep * 2;
    if (stepsPerBar === 32) return globalStep;
    return -1;
  }

  function mapToTriplet(globalStep) {
    if (globalStep < 0 || globalStep >= totalLegacy) return -1;
    if (stepsPerBar === 12) {
      const barIndex = Math.floor(globalStep / 12);
      const stepInBar = globalStep % 12;
      return barIndex * 36 + stepInBar * 3;
    }
    return -1;
  }

  // Apply non-hat voices from barSteps or steps
  if (preset.barSteps && Array.isArray(preset.barSteps) && preset.barSteps.length >= bars) {
    for (let barIndex = 0; barIndex < bars; barIndex++) {
      const sourceBar = preset.barSteps[barIndex];
      const baseStep = barIndex * stepsPerBar;
      voiceIdsNoHats.forEach((voiceId) => {
        const indices = sourceBar[voiceId];
        if (!Array.isArray(indices) || !pattern[voiceId]) return;
        indices.forEach((relStep) => {
          if (relStep < 0 || relStep >= stepsPerBar) return;
          const globalStep = baseStep + relStep;
          const s = mapToStraight(globalStep);
          if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
          const t = mapToTriplet(globalStep);
          if (t >= 0) pattern[voiceId].triplet[t] = true;
        });
      });
      // Per-bar triplet kick (12×3): optional kickTriplet array of 36-step indices within this bar (0–35)
      if (sourceBar.kickTriplet && Array.isArray(sourceBar.kickTriplet) && pattern.kick && pattern.kick.triplet) {
        sourceBar.kickTriplet.forEach((tripletStep) => {
          if (tripletStep >= 0 && tripletStep < 36) {
            const t = barIndex * 36 + tripletStep;
            if (t >= 0 && t < total36) pattern.kick.triplet[t] = true;
          }
        });
      }
    }
  } else if (preset.steps) {
    voiceIdsNoHats.forEach((voiceId) => {
      const indices = preset.steps[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((stepIndex) => {
        if (stepIndex < 0 || stepIndex >= totalLegacy) return;
        const s = mapToStraight(stepIndex);
        if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
        const t = mapToTriplet(stepIndex);
        if (t >= 0) pattern[voiceId].triplet[t] = true;
      });
    });
  }

  // New3: hats from hatStraight (preset 16-step indices → map to 32-step: idx*2)
  if (preset.hatStraight && typeof preset.hatStraight === 'object') {
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatStraight[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((idx) => {
        const s = idx * 2;
        if (s >= 0 && s < totalStraight) pattern[voiceId].straight[s] = true;
      });
    });
  }
  if (preset.hatTriplet && typeof preset.hatTriplet === 'object') {
    ['hatClosed', 'hatOpen'].forEach((voiceId) => {
      const indices = preset.hatTriplet[voiceId];
      if (!Array.isArray(indices) || !pattern[voiceId]) return;
      indices.forEach((idx) => {
        if (idx >= 0 && idx < total36) pattern[voiceId].triplet[idx] = true;
      });
    });
  }

  const hat8x4Fill = getHat8x4Fill();
  if (hat8x4Fill > 0) {
    for (let stepIdx = 0; stepIdx < totalStraight; stepIdx++) {
      if (!shouldApplyHatFill(stepIdx, bars)) continue;
      ['hatClosed', 'hatOpen'].forEach((voiceId) => {
        if (!pattern[voiceId] || !pattern[voiceId].straight) return;
        if (pattern[voiceId].straight[stepIdx]) return;
        if (pseudoRand8x4Fill(stepIdx) < hat8x4Fill) pattern[voiceId].straight[stepIdx] = true;
      });
    }
  }

  const snare8x4Fill = getSnare8x4Fill();
  if (snare8x4Fill > 0 && pattern.snare && pattern.snare.straight) {
    for (let stepIdx = 0; stepIdx < totalStraight - 1; stepIdx++) {
      if (!pattern.snare.straight[stepIdx]) continue;
      const nextStep = stepIdx + 1;
      if (pattern.snare.straight[nextStep]) continue;
      if (!shouldApplySnareFill(nextStep, bars)) continue;
      if (pseudoRandSnareFill(nextStep) < snare8x4Fill) pattern.snare.straight[nextStep] = true;
    }
  }

  buildGrid();
  bindGridClicks();
  setPresetSelectValue(preset.id);
  applySwingFromPreset(preset);
}

function applySwingFromPreset(preset) {
  if (!preset) return;
  const def = typeof getSwingDefaultsForPreset === 'function' ? getSwingDefaultsForPreset(preset) : { swing8th: 0, swing16th: 0 };
  const el8 = document.getElementById('swing8th');
  const el16 = document.getElementById('swing16th');
  const val8 = document.getElementById('swing8thVal');
  const val16 = document.getElementById('swing16thVal');
  if (el8) { el8.value = String(Math.max(0, Math.min(100, def.swing8th))); if (val8) val8.textContent = el8.value + '%'; }
  if (el16) { el16.value = String(Math.max(0, Math.min(100, def.swing16th))); if (val16) val16.textContent = el16.value + '%'; }
}

function setPresetSelectValue(presetId) {
  const sel = document.getElementById('presetSelect');
  if (!sel) return;
  sel.value = presetId || '';
}

function populatePresetDropdown() {
  const sel = document.getElementById('presetSelect');
  if (!sel || typeof DRUM_PRESETS === 'undefined') return;
  const fragment = document.createDocumentFragment();
  DRUM_PRESETS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + ' (' + p.genre + ')';
    fragment.appendChild(opt);
  });
  sel.appendChild(fragment);
}

document.getElementById('masterVolume')?.addEventListener('input', function () {
  const pct = Math.max(0, Math.min(100, parseFloat(this.value) || 0));
  const el = document.getElementById('masterVolumeVal');
  if (el) el.textContent = Math.round(pct) + '%';
  if (synth.master) synth.master.gain.value = pct / 100;
});
document.getElementById('reverb')?.addEventListener('input', function () {
  const pct = Math.max(0, Math.min(100, parseFloat(this.value) || 0));
  const el = document.getElementById('reverbVal');
  if (el) el.textContent = Math.round(pct) + '%';
  if (synth.reverbWetGain) synth.reverbWetGain.gain.value = pct / 100;
});
document.getElementById('reverbDuration')?.addEventListener('input', function () {
  updateReverbIR();
});
document.getElementById('stereo')?.addEventListener('input', function () {
  const pct = Math.max(0, Math.min(100, parseFloat(this.value, 10) || 0));
  const el = document.getElementById('stereoVal');
  if (el) el.textContent = Math.round(pct) + '%';
  if (synth.stereoMidHighGain) synth.stereoMidHighGain.gain.value = getStereoMidHighAmount();
});
document.getElementById('bpm').addEventListener('change', function () {
  resizePattern();
  updateReverbIR();
});
document.getElementById('bars').addEventListener('change', function () {
  resizePattern();
  renderGrid();
});
document.getElementById('variation').addEventListener('input', (e) => {
  document.getElementById('variationVal').textContent = e.target.value + '%';
});
document.getElementById('swing8th')?.addEventListener('input', (e) => {
  const v = document.getElementById('swing8thVal');
  if (v) v.textContent = e.target.value + '%';
});
document.getElementById('swing16th')?.addEventListener('input', (e) => {
  const v = document.getElementById('swing16thVal');
  if (v) v.textContent = e.target.value + '%';
});
document.getElementById('hat8x4Fill').addEventListener('input', (e) => {
  document.getElementById('hat8x4FillVal').textContent = e.target.value + '%';
});
document.getElementById('snare8x4Fill').addEventListener('input', (e) => {
  document.getElementById('snare8x4FillVal').textContent = e.target.value + '%';
});
document.getElementById('hat8x4Skip').addEventListener('input', (e) => {
  document.getElementById('hat8x4SkipVal').textContent = e.target.value + '%';
});
document.getElementById('hat4x4Split').addEventListener('input', (e) => {
  document.getElementById('hat4x4SplitVal').textContent = e.target.value + '%';
});
document.getElementById('hat12x3Skip').addEventListener('input', (e) => {
  document.getElementById('hat12x3SkipVal').textContent = e.target.value + '%';
});
document.getElementById('btnPlay')?.addEventListener('click', () => { if (playing) stop(); else play(); });
const downloadModal = document.getElementById('downloadOptionsModal');
const downloadMidiBtn = document.getElementById('downloadMidiBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
function closeMenuDropdowns() {
  document.querySelectorAll('.menu-bar-item[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
}
document.getElementById('menuFile')?.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('menuEdit')?.setAttribute('aria-expanded', 'false');
  const file = document.getElementById('menuFile');
  file?.setAttribute('aria-expanded', file.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
});
document.getElementById('menuEdit')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (document.getElementById('menuFile')) document.getElementById('menuFile').setAttribute('aria-expanded', 'false');
  const edit = document.getElementById('menuEdit');
  edit?.setAttribute('aria-expanded', edit.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
});
document.body.addEventListener('click', closeMenuDropdowns);

document.getElementById('menuFileDownloadMidi')?.addEventListener('click', () => { closeMenuDropdowns(); exportDrumMidi(); });
document.getElementById('menuFileDownloadWav')?.addEventListener('click', async () => {
  closeMenuDropdowns();
  const statusEl = document.getElementById('status');
  const prev = statusEl?.textContent;
  if (statusEl) statusEl.textContent = 'Rendering WAV…';
  try { await exportDrumWav(); } finally {
    if (statusEl) statusEl.textContent = prev || 'Draw pattern or pick preset, then Play';
  }
});
document.getElementById('menuFileDownloadJson')?.addEventListener('click', () => { closeMenuDropdowns(); downloadCompositionJson(); });
document.getElementById('menuFileLoad')?.addEventListener('click', () => { closeMenuDropdowns(); document.getElementById('loadCompositionInput')?.click(); });

if (downloadModal) {
  downloadModal.querySelector('.download-modal-backdrop')?.addEventListener('click', () => {
    downloadModal.setAttribute('aria-hidden', 'true');
  });
}
if (downloadMidiBtn) {
  downloadMidiBtn.addEventListener('click', () => {
    if (downloadModal) downloadModal.setAttribute('aria-hidden', 'true');
    exportDrumMidi();
  });
}
if (downloadWavBtn) {
  downloadWavBtn.addEventListener('click', async () => {
    if (downloadModal) downloadModal.setAttribute('aria-hidden', 'true');
    const statusEl = document.getElementById('status');
    const prev = statusEl?.textContent;
    if (statusEl) statusEl.textContent = 'Rendering WAV…';
    try {
      await exportDrumWav();
    } finally {
      if (statusEl) statusEl.textContent = prev || 'Draw pattern or pick preset, then Play';
    }
  });
}
if (downloadJsonBtn) {
  downloadJsonBtn.addEventListener('click', () => {
    if (downloadModal) downloadModal.setAttribute('aria-hidden', 'true');
    downloadCompositionJson();
  });
}

const voiceSoundModalEl = document.getElementById('voiceSoundModal');
const voiceSoundRandomiseBtn = document.getElementById('voiceSoundRandomiseBtn');
const voiceSoundCloseBtn = document.getElementById('voiceSoundCloseBtn');
if (voiceSoundModalEl) {
  voiceSoundModalEl.querySelector('.download-modal-backdrop')?.addEventListener('click', closeVoiceSoundModal);
}
if (voiceSoundCloseBtn) voiceSoundCloseBtn.addEventListener('click', closeVoiceSoundModal);
document.getElementById('voiceSoundVersions')?.addEventListener('input', (e) => {
  const v = document.getElementById('voiceSoundVersionsVal');
  if (v) v.textContent = e.target.value;
  refreshVoiceSoundModalEmojis();
});
if (voiceSoundRandomiseBtn) {
  voiceSoundRandomiseBtn.addEventListener('click', async () => {
    const voiceId = currentVoiceSoundModalVoiceId;
    const versionsEl = document.getElementById('voiceSoundVersions');
    if (!voiceId || !versionsEl) return;
    const makerId = getMakerIdForVoice(voiceId);
    const count = Math.max(1, Math.min(4, parseInt(versionsEl.value, 10) || 1));
    const btn = voiceSoundRandomiseBtn;
    const prevText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      let selected = Array.from(selectedVariantIndicesInModal).filter((i) => i >= 0 && i < count);
      if (selected.length === 0) {
        selected = Array.from({ length: count }, (_, i) => i);
      }
      if (selected.length > 0) {
        for (const idx of selected) {
          await buildSoundBankVoiceSingleVariant(makerId, idx);
          playVoiceVariant(voiceId, idx);
        }
        voiceHues[voiceId] = Math.floor(Math.random() * 360);
        document.querySelectorAll('.row-label-voice[data-voice="' + voiceId + '"]').forEach((el) => {
          applyVoiceHueToRowLabel(el, voiceHues[voiceId]);
        });
      }
    } finally {
      btn.textContent = prevText;
      btn.disabled = false;
    }
  });
}

document.getElementById('btnLoad')?.addEventListener('click', () => {
  document.getElementById('loadCompositionInput')?.click();
});
document.getElementById('loadCompositionInput')?.addEventListener('change', function () {
  const file = this.files && this.files[0];
  this.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadCompositionFromJson(data);
    } catch (e) {
      alert('Could not read composition file: ' + (e.message || 'Invalid JSON'));
    }
  };
  reader.readAsText(file);
});
document.getElementById('presetSelect').addEventListener('change', function () {
  const id = this.value;
  if (!id) {
    if (playing) stop();
    pattern = createEmptyPattern(getBars());
    buildGrid();
    bindGridClicks();
    return;
  }
  const p = typeof getDrumPresetById !== 'undefined' ? getDrumPresetById(id) : null;
  if (p) applyPreset(p);
});
/** Randomise rhythm only: BPM from preset style, reverb, stereo, groove-friendly fill/skip, then apply preset. Optional preset = use it (e.g. from full Dice). */
async function doDiceRhythm(optionalPreset) {
  const p = optionalPreset || (typeof getRandomPresetForGroove !== 'undefined' ? getRandomPresetForGroove() : (typeof getRandomDrumPreset !== 'undefined' ? getRandomDrumPreset() : null));
  const bpmRange = (p && typeof getBpmRangeForPreset === 'function') ? getBpmRangeForPreset(p) : { min: 90, max: 130 };
  const bpmEl = document.getElementById('bpm');
  if (bpmEl) {
    const randomBpm = bpmRange.min + Math.floor(Math.random() * (bpmRange.max - bpmRange.min + 1));
    bpmEl.value = String(Math.max(60, Math.min(200, randomBpm)));
  }
  const reverbEl = document.getElementById('reverb');
  if (reverbEl) {
    const pct = 30 + Math.floor(Math.random() * 61);
    reverbEl.value = String(pct);
    const valEl = document.getElementById('reverbVal');
    if (valEl) valEl.textContent = pct + '%';
    if (synth.reverbWetGain) synth.reverbWetGain.gain.value = pct / 100;
  }
  const reverbDurEl = document.getElementById('reverbDuration');
  if (reverbDurEl) {
    const pct = Math.floor(Math.random() * 51);
    reverbDurEl.value = String(pct);
    updateReverbIR();
  }
  const stereoEl = document.getElementById('stereo');
  if (stereoEl) {
    const pct = 3 + Math.floor(Math.random() * 16);
    stereoEl.value = String(pct);
    const valEl = document.getElementById('stereoVal');
    if (valEl) valEl.textContent = pct + '%';
    if (synth.stereoMidHighGain) synth.stereoMidHighGain.gain.value = getStereoMidHighAmount();
  }
  function randomPct(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
  const hatFill = randomPct(8, 20);
  const hatSkip = randomPct(18, 42);
  const hatSplit = randomPct(5, 18);
  const snareFill = randomPct(5, 18);
  const hat12x3Skip = randomPct(5, 22);
  const diceFillControls = [
    ['hat8x4Fill', 'hat8x4FillVal', hatFill],
    ['hat8x4Skip', 'hat8x4SkipVal', hatSkip],
    ['hat4x4Split', 'hat4x4SplitVal', hatSplit],
    ['snare8x4Fill', 'snare8x4FillVal', snareFill],
    ['hat12x3Skip', 'hat12x3SkipVal', hat12x3Skip],
  ];
  diceFillControls.forEach(([id, valId, pct]) => {
    const el = document.getElementById(id);
    if (el) el.value = String(pct);
    const valEl = document.getElementById(valId);
    if (valEl) valEl.textContent = pct + '%';
  });
  const statusEl = document.getElementById('status');
  const prevStatus = statusEl ? statusEl.textContent : '';
  if (statusEl) statusEl.textContent = 'Preloading sounds…';
  await buildSoundBank();
  if (statusEl) statusEl.textContent = prevStatus || 'Draw pattern or pick preset, then Play';
  if (p) applyPreset(p, { preserveBars: true });
  ensureAudioReady().catch(() => {});
}

document.getElementById('appTitle').addEventListener('click', function () {
  const panel = document.getElementById('controlsPanel');
  if (panel) panel.classList.toggle('controls-panel--hidden');
});

function onRandomAll() {
  const preset = typeof getRandomPresetForGroove !== 'undefined' ? getRandomPresetForGroove() : null;
  const style = preset && typeof getStyleForPreset === 'function' ? getStyleForPreset(preset) : null;
  if (style) randomizeMakerSoundsForStyle(style);
  else randomizeAllMakerSounds();
  doDiceRhythm(preset).then(() => { randomizeAllVoiceHues(); if (!playing) play(); });
}
function onRandomSound() {
  randomizeAllMakerSounds();
  buildSoundBank().then(() => { randomizeAllVoiceHues(); if (!playing) play(); });
}
function onRandomBeat() {
  doDiceRhythm().then(() => { if (!playing) play(); });
}

document.getElementById('menuEditRandomAll')?.addEventListener('click', () => { closeMenuDropdowns(); onRandomAll(); });
document.getElementById('menuEditRandomSound')?.addEventListener('click', () => { closeMenuDropdowns(); onRandomSound(); });
document.getElementById('menuEditRandomBeat')?.addEventListener('click', () => { closeMenuDropdowns(); onRandomBeat(); });

populatePresetDropdown();
buildGrid();
bindGridClicks();
updateReverbIR();
