/**
 * Sound presets B — for second synthesis methods (playXxxSynthB).
 * Each preset has { name, params, synthB: true }.
 */
const soundPresetsB = {
  kick: [
    { name: 'B Default', params: { f0: 65, f1: 38, decayBase: 0.45, clickLevel: 0.12, clickFreq: 2800, clickDecay: 0.012 }, synthB: true },
    { name: 'B House', params: { f0: 68, f1: 42, decayBase: 0.35, clickLevel: 0.18, clickFreq: 3000, clickDecay: 0.007 }, synthB: true },
    { name: 'B Trap', params: { f0: 50, f1: 28, decayBase: 1.0, clickLevel: 0.06, clickFreq: 2000, clickDecay: 0.018 }, synthB: true },
    { name: 'B Techno', params: { f0: 58, f1: 34, decayBase: 0.5, clickLevel: 0.14, clickFreq: 3200, clickDecay: 0.009, clickFilterQ: 2.8 }, synthB: true },
    { name: 'B DnB', params: { f0: 82, f1: 48, decayBase: 0.18, clickLevel: 0.24, clickFreq: 3800, clickDecay: 0.005 }, synthB: true },
    { name: 'B Rock', params: { f0: 70, f1: 44, decayBase: 0.38, clickLevel: 0.18, clickFreq: 2800, clickDecay: 0.008 }, synthB: true },
    { name: 'B 808', params: { f0: 55, f1: 30, decayBase: 0.9, clickLevel: 0.09, clickFreq: 2400, clickDecay: 0.014 }, synthB: true },
    { name: 'B Dubstep', params: { f0: 48, f1: 26, decayBase: 0.75, clickLevel: 0.05, clickFreq: 1800, clickDecay: 0.02 }, synthB: true },
    { name: 'B Disco', params: { f0: 72, f1: 45, decayBase: 0.3, clickLevel: 0.2, clickFreq: 3500, clickDecay: 0.006 }, synthB: true },
    { name: 'B Big Room', params: { f0: 76, f1: 40, decayBase: 0.42, clickLevel: 0.22, clickFreq: 3400, clickDecay: 0.007, clickFilterQ: 3.2 }, synthB: true },
  ],
  snare: [
    { name: 'B Default', params: { decayN: 0.2, decayT: 0.12, bodyF: 200, bodyFEnd: 120, hpF: 1800, toneLevel: 0.5 }, synthB: true },
    { name: 'B Crack', params: { decayN: 0.12, decayT: 0.08, bodyF: 220, bodyFEnd: 140, hpF: 2200, toneLevel: 0.45 }, synthB: true },
    { name: 'B Fat', params: { decayN: 0.35, decayT: 0.18, bodyF: 170, bodyFEnd: 95, hpF: 1400, toneLevel: 0.58 }, synthB: true },
    { name: 'B Rim', params: { decayN: 0.06, decayT: 0.05, bodyF: 380, bodyFEnd: 200, hpF: 3200, toneLevel: 0.35 }, synthB: true },
    { name: 'B Room', params: { decayN: 0.28, decayT: 0.15, bodyF: 180, bodyFEnd: 110, hpF: 2000, toneLevel: 0.48, noiseFilterType: 'bandpass', noiseFilterFreq: 3500, noiseFilterQ: 0.8 }, synthB: true },
  ],
  clap: [
    { name: 'B Default', params: { decay: 0.08, bpF: 1600, bpQ: 1.2, level: 0.85 }, synthB: true },
    { name: 'B Sharp', params: { decay: 0.05, bpF: 2200, bpQ: 1.8, level: 0.9 }, synthB: true },
    { name: 'B Soft', params: { decay: 0.12, bpF: 1200, bpQ: 0.8, level: 0.7 }, synthB: true },
    { name: 'B Staggered', params: { decay: 0.07, bpF: 1650, bpQ: 1, level: 0.82, multiClap: true, clapCount: 4, clapSpacingMs: 10, lastDecayMul: 2.5 }, synthB: true },
    { name: 'B Double', params: { decay: 0.06, bpF: 1700, bpQ: 1.3, level: 0.85, multiClap: true, clapCount: 2, clapSpacingMs: 15, lastDecayMul: 1.5 }, synthB: true },
  ],
  hat: [
    { name: 'B Default', params: { durClosed: 0.05, durOpen: 0.2, hpF: 7000, levelClosed: 0.4, levelOpen: 0.35, filterType: 'bandpass', bpQ: 1.2 }, synthB: true },
    { name: 'B Bright', params: { durClosed: 0.04, durOpen: 0.18, hpF: 9000, levelClosed: 0.42, levelOpen: 0.38, filterType: 'bandpass', bpQ: 1 }, synthB: true },
    { name: 'B Dark', params: { durClosed: 0.07, durOpen: 0.25, hpF: 5000, levelClosed: 0.38, levelOpen: 0.32, filterType: 'bandpass', bpQ: 1.4 }, synthB: true },
    { name: 'B Metallic', params: { durClosed: 0.045, durOpen: 0.19, hpF: 7500, levelClosed: 0.4, levelOpen: 0.35, addOscillators: true, oscFreq1: 8000, oscFreq2: 10000, oscLevel: 0.2, filterType: 'bandpass' }, synthB: true },
  ],
  ride: [
    { name: 'B Default', params: { decay: 0.35, hpF: 6000, bpF: 9000, bpQ: 0.6, level: 0.32, oscFreq1: 6000, oscFreq2: 8500, oscFreq3: 11000, oscLevel: 0.25 }, synthB: true },
    { name: 'B Ping', params: { decay: 0.5, hpF: 5500, bpF: 8000, bpQ: 1, level: 0.3, oscFreq1: 5800, oscFreq2: 8200, oscFreq3: 10500, oscLevel: 0.28 }, synthB: true },
    { name: 'B Crash', params: { decay: 0.25, hpF: 7000, bpF: 10000, bpQ: 0.4, level: 0.38, oscFreq1: 6200, oscFreq2: 9200, oscFreq3: 12000, oscLevel: 0.22 }, synthB: true },
    { name: 'B Bell', params: { decay: 0.6, hpF: 5000, bpF: 7500, bpQ: 0.8, level: 0.28, oscFreq1: 5200, oscFreq2: 7800, oscFreq3: 9800, oscLevel: 0.3 }, synthB: true },
    { name: 'B Wash', params: { decay: 0.5, hpF: 5200, bpF: 8200, bpQ: 0.35, level: 0.29, noiseType: 'pink', oscFreq1: 5400, oscFreq2: 8000, oscFreq3: 10200, oscLevel: 0.2 }, synthB: true },
  ],
  cowbell: [
    { name: 'B Default', params: { f1: 1050, f2: 1450, decay1: 0.12, level: 0.55 }, synthB: true },
    { name: 'B High', params: { f1: 1300, f2: 1700, decay1: 0.1, level: 0.5 }, synthB: true },
    { name: 'B Low', params: { f1: 800, f2: 1100, decay1: 0.15, level: 0.6 }, synthB: true },
    { name: 'B Brassy', params: { f1: 1100, f2: 1520, decay1: 0.1, level: 0.54, addSecondPair: true, secondF1: 1300, secondF2: 1600, secondLevel: 0.2, secondDecay: 0.05 }, synthB: true },
    { name: 'B Overtones', params: { f1: 1050, f2: 1450, decay1: 0.12, level: 0.52, addSecondPair: true, secondF1: 900, secondF2: 1200, secondLevel: 0.22, secondDecay: 0.06 }, synthB: true },
  ],
  tom: [
    { name: 'B Default', params: { f0: 180, f1: 90, decay: 0.4, level: 0.5, bodyOscType: 'square' }, synthB: true },
    { name: 'B High', params: { f0: 220, f1: 120, decay: 0.3, level: 0.48, bodyOscType: 'square' }, synthB: true },
    { name: 'B Floor', params: { f0: 130, f1: 65, decay: 0.55, level: 0.55, bodyOscType: 'square' }, synthB: true },
    { name: 'B Punch', params: { f0: 195, f1: 98, decay: 0.32, level: 0.5, bodyOscType: 'sawtooth' }, synthB: true },
    { name: 'B Wood', params: { f0: 170, f1: 85, decay: 0.38, level: 0.51, bodyOscType: 'sawtooth' }, synthB: true },
  ],
};

window.soundPresetsB = soundPresetsB;
window.KICK_PRESETS_B = soundPresetsB.kick;
window.SNARE_PRESETS_B = soundPresetsB.snare;
window.CLAP_PRESETS_B = soundPresetsB.clap;
window.HAT_PRESETS_B = soundPresetsB.hat;
window.RIDE_PRESETS_B = soundPresetsB.ride;
window.COWBELL_PRESETS_B = soundPresetsB.cowbell;
window.TOM_PRESETS_B = soundPresetsB.tom;
