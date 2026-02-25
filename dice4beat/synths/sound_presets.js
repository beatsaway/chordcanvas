/**
 * Sound presets per voice. Each preset has { name, params }.
 * Params are passed to the synth play functions.
 * Inspired by @synths (initialFreq/freqDecay/duration/click, noiseLevel/oscLevel/oscFreq, filterFreq/filterQ, etc.).
 */
const soundPresets = {
  kick: [
    { name: 'Default', params: { f0: 65, f1: 38, decayBase: 0.45, clickLevel: 0.1, clickFreq: 2800, clickDecay: 0.012 } },
    { name: 'House', params: { f0: 68, f1: 42, decayBase: 0.35, clickLevel: 0.2, clickFreq: 3000, clickDecay: 0.007 } },
    { name: 'Trap', params: { f0: 50, f1: 28, decayBase: 1.0, clickLevel: 0.05, clickFreq: 2000, clickDecay: 0.018 } },
    { name: 'Techno', params: { f0: 58, f1: 34, decayBase: 0.5, clickLevel: 0.16, clickFreq: 3200, clickDecay: 0.009, clickFilterQ: 2.8 } },
    { name: 'DnB', params: { f0: 82, f1: 48, decayBase: 0.18, clickLevel: 0.26, clickFreq: 3800, clickDecay: 0.005 } },
    { name: 'Rock', params: { f0: 70, f1: 44, decayBase: 0.38, clickLevel: 0.2, clickFreq: 2800, clickDecay: 0.008, bodyOscType: 'triangle' } },
    { name: '808', params: { f0: 55, f1: 30, decayBase: 0.9, clickLevel: 0.08, clickFreq: 2400, clickDecay: 0.014 } },
    { name: 'Dubstep', params: { f0: 48, f1: 26, decayBase: 0.75, clickLevel: 0.04, clickFreq: 1800, clickDecay: 0.02 } },
    { name: 'Disco', params: { f0: 72, f1: 45, decayBase: 0.3, clickLevel: 0.22, clickFreq: 3500, clickDecay: 0.006 } },
    { name: 'Big Room', params: { f0: 76, f1: 40, decayBase: 0.42, clickLevel: 0.24, clickFreq: 3400, clickDecay: 0.007, clickFilterQ: 3.2 } },
  ],
  snare: [
    { name: 'Default', params: { decayN: 0.2, decayT: 0.12, bodyF: 200, bodyFEnd: 120, hpF: 1800, toneLevel: 0.5 } },
    { name: 'Crack', params: { decayN: 0.12, decayT: 0.08, bodyF: 220, bodyFEnd: 140, hpF: 2200, toneLevel: 0.45 } },
    { name: 'Fat', params: { decayN: 0.35, decayT: 0.18, bodyF: 170, bodyFEnd: 95, hpF: 1400, toneLevel: 0.58 } },
    { name: 'Rim', params: { decayN: 0.06, decayT: 0.05, bodyF: 380, bodyFEnd: 200, hpF: 3200, toneLevel: 0.35 } },
    { name: 'Crystal Shard', params: { decayN: 0.25, decayT: 0.14, bodyF: 250, bodyFEnd: 150, hpF: 2600, toneLevel: 0.55 } },
    { name: 'Echo Chamber', params: { decayN: 0.28, decayT: 0.15, bodyF: 180, bodyFEnd: 110, hpF: 2000, toneLevel: 0.48 } },
    { name: 'Quantum Snap', params: { decayN: 0.08, decayT: 0.1, bodyF: 156, bodyFEnd: 100, hpF: 2400, toneLevel: 0.62 } },
    { name: 'Time Warp', params: { decayN: 0.42, decayT: 0.22, bodyF: 170, bodyFEnd: 95, hpF: 1600, toneLevel: 0.4 } },
    { name: 'Dry', params: { decayN: 0.1, decayT: 0.07, bodyF: 195, bodyFEnd: 118, hpF: 2000, toneLevel: 0.52 } },
    { name: 'Piccolo', params: { decayN: 0.05, decayT: 0.04, bodyF: 340, bodyFEnd: 190, hpF: 3500, toneLevel: 0.38 } },
    { name: 'Boxy', params: { decayN: 0.22, decayT: 0.14, bodyF: 195, bodyFEnd: 115, hpF: 1800, toneLevel: 0.5, noiseFilterType: 'bandpass', noiseFilterFreq: 4000, noiseFilterQ: 1 } },
    { name: 'Metal', params: { decayN: 0.14, decayT: 0.09, bodyF: 260, bodyFEnd: 155, hpF: 2800, toneLevel: 0.42, bodyOscType: 'sine' } },
    { name: 'Room', params: { decayN: 0.38, decayT: 0.2, bodyF: 175, bodyFEnd: 98, hpF: 1600, toneLevel: 0.48, noiseFilterType: 'bandpass', noiseFilterFreq: 3500, noiseFilterQ: 0.8 } },
  ],
  clap: [
    { name: 'Default', params: { decay: 0.08, bpF: 1600, bpQ: 1.2, level: 0.85 } },
    { name: 'Sharp', params: { decay: 0.05, bpF: 2200, bpQ: 1.8, level: 0.9 } },
    { name: 'Soft', params: { decay: 0.12, bpF: 1200, bpQ: 0.8, level: 0.7 } },
    { name: 'Room', params: { decay: 0.15, bpF: 1400, bpQ: 0.6, level: 0.75 } },
    { name: 'Starlight Burst', params: { decay: 0.06, bpF: 1860, bpQ: 0.5, level: 0.88 } },
    { name: 'Aurora Wave', params: { decay: 0.18, bpF: 1440, bpQ: 0.4, level: 0.72 } },
    { name: 'Moonlight Echo', params: { decay: 0.12, bpF: 1440, bpQ: 0.35, level: 0.78 } },
    { name: 'Galactic Snap', params: { decay: 0.08, bpF: 3000, bpQ: 0.3, level: 0.82 } },
    { name: 'Tight', params: { decay: 0.04, bpF: 2600, bpQ: 1.5, level: 0.86 } },
    { name: 'Wide', params: { decay: 0.2, bpF: 1100, bpQ: 0.25, level: 0.68 } },
    { name: 'Staggered', params: { decay: 0.07, bpF: 1650, bpQ: 1, level: 0.82, multiClap: true, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 } },
    { name: 'Double', params: { decay: 0.06, bpF: 1700, bpQ: 1.3, level: 0.85, multiClap: true, clapCount: 2, clapSpacingMs: 15, lastDecayMul: 1.5 } },
    { name: 'Slap', params: { decay: 0.05, bpF: 2000, bpQ: 1.2, level: 0.88, multiClap: true, clapCount: 3, clapSpacingMs: 8, lastDecayMul: 2 } },
  ],
  hat: [
    { name: 'Default', params: { durClosed: 0.05, durOpen: 0.2, hpF: 7000, levelClosed: 0.4, levelOpen: 0.35 } },
    { name: 'Bright', params: { durClosed: 0.04, durOpen: 0.18, hpF: 9000, levelClosed: 0.42, levelOpen: 0.38 } },
    { name: 'Dark', params: { durClosed: 0.07, durOpen: 0.25, hpF: 5000, levelClosed: 0.38, levelOpen: 0.32 } },
    { name: 'Thin', params: { durClosed: 0.03, durOpen: 0.15, hpF: 8500, levelClosed: 0.35, levelOpen: 0.3 } },
    { name: 'Quantum Spark', params: { durClosed: 0.045, durOpen: 0.19, hpF: 8000, levelClosed: 0.41, levelOpen: 0.36 } },
    { name: 'Photon Beam', params: { durClosed: 0.055, durOpen: 0.21, hpF: 7200, levelClosed: 0.39, levelOpen: 0.34 } },
    { name: 'Shadow Pulse', params: { durClosed: 0.065, durOpen: 0.23, hpF: 6100, levelClosed: 0.37, levelOpen: 0.31 } },
    { name: 'Time Ripple', params: { durClosed: 0.04, durOpen: 0.28, hpF: 11500, levelClosed: 0.43, levelOpen: 0.4 } },
    { name: 'Space Dust', params: { durClosed: 0.038, durOpen: 0.17, hpF: 11900, levelClosed: 0.4, levelOpen: 0.33 } },
    { name: 'Sizzle', params: { durClosed: 0.06, durOpen: 0.3, hpF: 5500, levelClosed: 0.36, levelOpen: 0.38 } },
    { name: 'Metallic', params: { durClosed: 0.045, durOpen: 0.19, hpF: 7500, levelClosed: 0.4, levelOpen: 0.35, addOscillators: true, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.25 } },
    { name: 'Bandpass', params: { durClosed: 0.05, durOpen: 0.21, hpF: 7000, levelClosed: 0.38, levelOpen: 0.33, filterType: 'bandpass', bpQ: 0.8 } },
  ],
  ride: [
    { name: 'Default', params: { decay: 0.35, hpF: 6000, bpF: 9000, bpQ: 0.6, level: 0.32 } },
    { name: 'Ping', params: { decay: 0.5, hpF: 5500, bpF: 8000, bpQ: 1, level: 0.3 } },
    { name: 'Crash', params: { decay: 0.25, hpF: 7000, bpF: 10000, bpQ: 0.4, level: 0.38 } },
    { name: 'Bell', params: { decay: 0.6, hpF: 5000, bpF: 7500, bpQ: 0.8, level: 0.28 } },
    { name: 'Dry', params: { decay: 0.2, hpF: 6500, bpF: 9500, bpQ: 0.5, level: 0.34 } },
    { name: 'Wash', params: { decay: 0.55, hpF: 5200, bpF: 8500, bpQ: 0.35, level: 0.3 } },
    { name: 'Stick', params: { decay: 0.15, hpF: 7500, bpF: 11000, bpQ: 0.7, level: 0.36 } },
    { name: 'China', params: { decay: 0.4, hpF: 5800, bpF: 9200, bpQ: 0.45, level: 0.35 } },
    { name: 'Pink', params: { decay: 0.38, hpF: 5800, bpF: 8800, bpQ: 0.55, level: 0.31, noiseType: 'pink' } },
    { name: 'Metallic', params: { decay: 0.4, hpF: 6200, bpF: 9000, bpQ: 0.6, level: 0.3, addOscillators: true, oscFreq1: 6000, oscFreq2: 8500, oscLevel: 0.18 } },
    { name: 'Wash', params: { decay: 0.5, hpF: 5200, bpF: 8200, bpQ: 0.35, level: 0.29, noiseType: 'pink' } },
  ],
  cowbell: [
    { name: 'Default', params: { f1: 1050, f2: 1450, decay1: 0.12, level: 0.55 } },
    { name: 'High', params: { f1: 1300, f2: 1700, decay1: 0.1, level: 0.5 } },
    { name: 'Low', params: { f1: 800, f2: 1100, decay1: 0.15, level: 0.6 } },
    { name: 'Short', params: { f1: 1100, f2: 1500, decay1: 0.06, level: 0.52 } },
    { name: 'Long', params: { f1: 1000, f2: 1400, decay1: 0.22, level: 0.54 } },
    { name: 'Bright', params: { f1: 1200, f2: 1650, decay1: 0.09, level: 0.5 } },
    { name: 'Muted', params: { f1: 950, f2: 1300, decay1: 0.08, level: 0.48 } },
    { name: 'Double', params: { f1: 1150, f2: 1550, decay1: 0.14, level: 0.56 } },
    { name: 'Overtones', params: { f1: 1050, f2: 1450, decay1: 0.12, level: 0.52, addSecondPair: true, secondF1: 900, secondF2: 1200, secondLevel: 0.22, secondDecay: 0.06 } },
    { name: 'Brassy', params: { f1: 1100, f2: 1520, decay1: 0.1, level: 0.54, addSecondPair: true, secondF1: 1300, secondF2: 1600, secondLevel: 0.2, secondDecay: 0.05 } },
    { name: 'DoubleHit', params: { f1: 1080, f2: 1480, decay1: 0.13, level: 0.53, addSecondPair: true, secondF1: 950, secondF2: 1280, secondLevel: 0.35, secondDecay: 0.07 } },
  ],
  tom: [
    { name: 'Default', params: { f0: 180, f1: 90, decay: 0.4, level: 0.5 } },
    { name: 'High', params: { f0: 220, f1: 120, decay: 0.3, level: 0.48 } },
    { name: 'Floor', params: { f0: 130, f1: 65, decay: 0.55, level: 0.55 } },
    { name: 'Tight', params: { f0: 200, f1: 100, decay: 0.22, level: 0.45 } },
    { name: 'Deep', params: { f0: 150, f1: 72, decay: 0.5, level: 0.52 } },
    { name: 'Concert', params: { f0: 165, f1: 85, decay: 0.45, level: 0.5 } },
    { name: 'Power', params: { f0: 190, f1: 95, decay: 0.38, level: 0.54 } },
    { name: 'Jazz', params: { f0: 210, f1: 108, decay: 0.28, level: 0.46 } },
    { name: 'Punch', params: { f0: 195, f1: 98, decay: 0.32, level: 0.5, bodyOscType: 'triangle' } },
    { name: 'Wood', params: { f0: 170, f1: 85, decay: 0.38, level: 0.51, bodyOscType: 'triangle' } },
    { name: 'Body', params: { f0: 185, f1: 92, decay: 0.35, level: 0.49, bodyOscType: 'triangle' } },
  ],
};

// Expose for drum-maker and synths
window.soundPresets = soundPresets;
window.KICK_PRESETS = soundPresets.kick;
window.SNARE_PRESETS = soundPresets.snare;
window.CLAP_PRESETS = soundPresets.clap;
window.HAT_PRESETS = soundPresets.hat;
window.RIDE_PRESETS = soundPresets.ride;
window.COWBELL_PRESETS = soundPresets.cowbell;
window.TOM_PRESETS = soundPresets.tom;
