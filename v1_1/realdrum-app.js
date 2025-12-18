/**
 * RealDrumApp - Pattern player and UI manager for Real Drum
 * Uses DrumMachine class for synthesis
 */

class PatternPlayer {
  constructor(drumMachine) {
    this.drumMachine = drumMachine;
    this.stepsPerBar = 48;
    this.patternLength = 32 * this.stepsPerBar;
    this.looping = false;
    this.nextNoteTime = 0;
    this.stepIndex = 0;
    this.transportStart = 0;
    this.bpm = 120;
    this.excite = 0.7;
    this.currentPattern = {};
    this.animationFrameId = null; // Track animation frame for cleanup
    
    // LFO settings
    this.lfoBeats = 8;
    this.excitementDrop = {
      kick: 0.05,
      snare: 0.12,
      clap: 0.2,
      tomLow: 0.25,
      tomMid: 0.25,
      tomHi: 0.25,
      hatClosed: 0.6,
      hatOpen: 0.45,
    };
    
    this.lfoDepthTime = {
      kick: 0.002,
      snare: 0.0035,
      clap: 0.004,
      tomLow: 0.004,
      tomMid: 0.004,
      tomHi: 0.004,
      hatClosed: 0.006,
      hatOpen: 0.006,
    };
    
    this.lfoDepthVel = {
      kick: 0.04,
      snare: 0.06,
      clap: 0.08,
      tomLow: 0.07,
      tomMid: 0.07,
      tomHi: 0.07,
      hatClosed: 0.10,
      hatOpen: 0.10,
    };
    
    this.lfoDepthPan = {
      kick: 0,
      snare: 0.08,
      clap: 0.15,
      tomLow: 0.12,
      tomMid: 0.12,
      tomHi: 0.12,
      hatClosed: 0.3,
      hatOpen: 0.25,
    };
    
    this.patterns = this._buildAllPatterns();
  }

  _to12th(p) {
    if (typeof p === 'string' && p.startsWith('t')) {
      const idx = parseFloat(p.slice(1));
      return Math.round(idx * 4);
    }
    return Math.round(p * 3);
  }

  _buildPattern(barDefs) {
    const steps = {};
    for (let bar = 0; bar < 32; bar++) {
      const offset = bar * this.stepsPerBar;
      const def = barDefs[bar % barDefs.length];
      Object.entries(def).forEach(([name, pos]) => {
        steps[name] ||= [];
        pos.forEach((p) => steps[name].push(offset + this._to12th(p)));
      });
      steps.hatClosed32 ||= [];
      for (let i = 0; i < 8; i++) {
        steps.hatClosed32.push(offset + this.stepsPerBar - 8 + i);
      }
      if (bar < 31) {
        for (let i = 0; i < 4; i++) {
          steps.hatClosed32.push(offset + this.stepsPerBar + i);
        }
      }
      const beat2Start = offset + 12;
      const beat4Start = offset + 36;
      for (let i = 0; i < 4; i++) {
        steps.hatClosed32.push(beat2Start + i);
        steps.hatClosed32.push(beat4Start + i);
      }
    }
    return steps;
  }

  _buildAllPatterns() {
    return {
      none: {},
      house: this._buildPattern([
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t7'] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [2, 4, 6, 10, 12, 14], hatOpen: ['t4'] },
        { kick: [0, 4, 9, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: [15] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t10'] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 4, 9, 12], snare: [8], clap: [12], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t1', 't4'] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], tomMid: [11], hatOpen: ['t7'] },
      ]),
      break: this._buildPattern([
        { kick: [0, 3, 4, 11], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7] },
        { kick: [0, 4, 10], snare: [6, 14], clap: [14], hatClosed: [2, 5, 7, 9, 11, 13, 15], hatOpen: [3], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 3, 11], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], tomLow: [15] },
        { kick: [0, 4, 11], snare: [6, 14], clap: [14], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: [7] },
        { kick: [0, 3, 10], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], tomHi: [5], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 3, 11, 14], snare: [6], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 4, 9], snare: [6, 14], clap: [14], hatClosed: [2, 5, 7, 9, 11, 13, 15], tomLow: [15] },
        { kick: [0, 3, 11], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [15], hatClosedTrip: ['t3', 't7', 't11'] },
      ]),
      trap: this._buildPattern([
        { kick: [0, 8], snare: [12], clap: [12], hatClosed: [1, 2, 3, 5, 7, 9, 10, 11, 13, 15] },
        { kick: [0, 6, 8], snare: [12], clap: [12], hatClosed: [1, 2, 3, 4, 6, 8, 10, 12, 14, 15], hatOpen: [7], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 8, 11], snare: [12], clap: [12], hatClosed: [2, 3, 5, 7, 9, 11, 13, 15], tomLow: [4] },
        { kick: [0, 6, 8], snare: [12], clap: [12], hatClosed: [1, 2, 3, 5, 6, 8, 10, 11, 13, 15] },
        { kick: [0, 8], snare: [12], clap: [12], hatClosed: [1, 2, 4, 6, 8, 10, 12, 14, 15], hatOpen: [7], hatClosedTrip: ['t4', 't8'] },
        { kick: [0, 6, 9], snare: [12], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [15] },
        { kick: [0, 8, 11], snare: [12], clap: [12], hatClosed: [2, 3, 5, 6, 8, 10, 12, 14], hatOpen: [4] },
        { kick: [0, 6, 8], snare: [12], clap: [12], hatClosed: [1, 2, 3, 5, 7, 9, 11, 13, 15], tomHi: [3] },
      ]),
      glitch: this._buildPattern([
        { kick: [0, 6, 10, 12, 15], snare: [8], clap: [12], hatClosed: [1, 2, 3, 5, 7, 9, 11, 13, 14, 15], hatOpen: [4, 6, 15], tomHi: [3], tomMid: [11], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 5, 9, 12, 15], snare: [8], clap: [12], hatClosed: [1, 2, 3, 6, 7, 9, 11, 13, 15], hatOpen: [4, 10], tomMid: [7], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 6, 10, 12, 14], snare: [8], clap: [12], hatClosed: [1, 3, 5, 7, 8, 10, 12, 14, 15], hatOpen: [4, 15], tomHi: [2], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 4, 9, 12, 15], snare: [8], clap: [12], hatClosed: [1, 2, 3, 5, 7, 9, 11, 13, 15], hatOpen: [6, 14], tomMid: [11], hatClosedTrip: ['t1', 't4', 't8'] },
        { kick: [0, 6, 10, 12, 15], snare: [8], clap: [12], hatClosed: [1, 2, 3, 5, 6, 8, 10, 12, 14], hatOpen: [4, 7], tomHi: [3], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 5, 9, 12, 14], snare: [8], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: [4, 10, 15], tomMid: [6], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 6, 10, 12, 15], snare: [8], clap: [12], hatClosed: [1, 2, 3, 5, 7, 9, 11, 13, 15], hatOpen: [4, 8], tomHi: [2], tomMid: [11], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 4, 9, 12, 15], snare: [8], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: [6, 14], tomMid: [7], tomLow: [15], hatClosedTrip: ['t2', 't6', 't10'] },
      ]),
      brostep: this._buildPattern([
        { kick: [0, 8, 12], snare: [12], clap: [12], hatClosed: [2, 3, 6, 7, 10, 11, 14, 15], hatOpen: [4], tomLow: [7], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 6, 12], snare: [12], clap: [12], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [3], tomLow: [15], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 8, 11], snare: [12], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: [4], tomMid: [7], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 6, 12], snare: [12], clap: [12], hatClosed: [2, 3, 6, 7, 10, 11, 14, 15], hatOpen: [8], tomHi: [3], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 8, 12, 14], snare: [12], clap: [12], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [5], tomLow: [7], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 6, 10, 12], snare: [12], clap: [12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: [4], tomMid: [11], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 8, 12], snare: [12], clap: [12], hatClosed: [2, 3, 6, 7, 10, 11, 14, 15], hatOpen: [4, 8], tomLow: [15], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 6, 12], snare: [12], clap: [12], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [3, 11], tomHi: [7], hatClosedTrip: ['t1', 't5', 't9'] },
      ]),
      dnb: this._buildPattern([
        { kick: [0, 9], snare: [6, 14], clap: [14], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: ['t2'], tomMid: [11] },
        { kick: [0, 4, 9], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t6'], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 7, 10], snare: [6, 14], clap: [14], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: ['t2', 't8'], tomHi: [3] },
        { kick: [0, 9], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t10'] },
        { kick: [0, 4, 9], snare: [6, 14], clap: [14], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: ['t6'], tomLow: [15] },
        { kick: [0, 7, 10], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t2', 't8'], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 9], snare: [6, 14], clap: [14], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], hatOpen: ['t4'], tomMid: [11] },
        { kick: [0, 4, 9], snare: [6, 14], clap: [14], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t6', 't10'], tomLow: [15] },
      ]),
      garage: this._buildPattern([
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [3, 7, 11, 15], hatOpen: ['t2'], tomHi: [5] },
        { kick: [0, 9, 12], snare: [8], clap: [12], hatClosed: [2, 5, 10, 14], hatOpen: ['t6'], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [3, 7, 11, 15], hatOpen: ['t4'], tomMid: [11] },
        { kick: [0, 9, 12], snare: [8], clap: [12], hatClosed: [2, 5, 9, 13], hatOpen: ['t2', 't8'] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [3, 7, 11, 15], hatOpen: ['t6'], tomLow: [15] },
        { kick: [0, 9, 12], snare: [8], clap: [12], hatClosed: [2, 5, 10, 14], hatOpen: ['t4'], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [3, 7, 11, 15], hatOpen: ['t2', 't8'], tomHi: [3] },
        { kick: [0, 9, 12], snare: [8], clap: [12], hatClosed: [2, 5, 9, 13], hatOpen: ['t6'], tomMid: [11] },
      ]),
      lofi: this._buildPattern([
        { kick: [0, 9], snare: [12], clap: [4], hatClosed: [1, 5, 9, 13], hatOpen: ['t8'], tomLow: [15] },
        { kick: [0, 8], snare: [12], clap: [4], hatClosed: [2, 6, 10, 14], hatOpen: ['t4'], hatClosedTrip: ['t2', 't6'] },
        { kick: [0, 9], snare: [12], clap: [4], hatClosed: [1, 5, 9, 13], hatOpen: [15], tomMid: [11] },
        { kick: [0, 8], snare: [12], clap: [4], hatClosed: [2, 6, 10, 14], hatOpen: ['t8'], hatClosedTrip: ['t4', 't8'] },
        { kick: [0, 9], snare: [12], clap: [4], hatClosed: [1, 5, 9, 13], hatOpen: ['t4'], tomLow: [15] },
        { kick: [0, 8], snare: [12], clap: [4], hatClosed: [2, 6, 10, 14], hatOpen: ['t8'], tomHi: [3] },
        { kick: [0, 9], snare: [12], clap: [4], hatClosed: [1, 5, 9, 13], hatOpen: [15], hatClosedTrip: ['t2', 't6'] },
        { kick: [0, 8], snare: [12], clap: [4], hatClosed: [2, 6, 10, 14], hatOpen: ['t4', 't8'], tomMid: [11] },
      ]),
      afro: this._buildPattern([
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t4'], tomLow: [11] },
        { kick: [0, 7, 12], snare: [8], clap: [12], hatClosed: [1, 5, 9, 13], hatOpen: ['t8'], hatClosedTrip: ['t2', 't6'] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t4', 't10'], tomMid: [15] },
        { kick: [0, 7, 12], snare: [8], clap: [12], hatClosed: [1, 5, 9, 13], hatOpen: ['t8'], tomHi: [3] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t4'], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 7, 12], snare: [8], clap: [12], hatClosed: [1, 5, 9, 13], hatOpen: ['t8'], tomLow: [15] },
        { kick: [0, 6, 12], snare: [8], clap: [12], hatClosed: [2, 6, 10, 14], hatOpen: ['t4', 't10'], tomMid: [11] },
        { kick: [0, 7, 12], snare: [8], clap: [12], hatClosed: [1, 5, 9, 13], hatOpen: ['t8'], tomLow: [15] },
      ]),
      chillstep: this._buildPattern([
        { kick: [0, 8], snare: [12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7], tomLow: [15], hatClosedTrip: ['t4', 't8'] },
        { kick: [0, 9], snare: [12], clap: [4, 12], hatClosed: [2, 5, 8, 13], hatOpen: [7], tomMid: [11], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 8], snare: [12], clap: [4, 12], hatClosed: [1, 4, 7, 10, 13], hatOpen: [15], tomHi: [3], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 10], snare: [12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7], tomLow: [11], hatClosedTrip: ['t3', 't7', 't11'] },
        { kick: [0, 8], snare: [12], clap: [4, 12], hatClosed: [2, 6, 9, 13], hatOpen: [7], tomMid: [15], hatClosedTrip: ['t2', 't6', 't10'] },
        { kick: [0, 9], snare: [12], clap: [4, 12], hatClosed: [1, 4, 7, 10, 13], hatOpen: [15], tomHi: [3], hatClosedTrip: ['t4', 't8'] },
        { kick: [0, 8], snare: [12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7], tomLow: [15], hatClosedTrip: ['t1', 't5', 't9'] },
        { kick: [0, 9], snare: [12], clap: [4, 12], hatClosed: [2, 5, 8, 13], hatOpen: [7], tomMid: [11], hatClosedTrip: ['t3', 't7', 't11'] },
      ]),
      drill: this._buildPattern([
        { kick: [0, 6], snare: [8, 12], clap: [8, 12], hatClosed: [2, 4, 6, 10, 12, 14], tomLow: [15] },
        { kick: [0, 3, 6, 11], snare: [8, 12], clap: [8, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [14] },
        { kick: [0, 6, 9], snare: [8, 12], clap: [8, 12], hatClosed: [2, 4, 6, 8, 10, 12, 14], tomHi: [5] },
        { kick: [0, 3, 6], snare: [8, 12], clap: [8, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [15] },
        { kick: [0, 6, 11], snare: [8, 12], clap: [8, 12], hatClosed: [2, 4, 6, 10, 12, 14], tomMid: [7] },
        { kick: [0, 3, 6, 9], snare: [8, 12], clap: [8, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomHi: [11] },
        { kick: [0, 6], snare: [8, 12], clap: [8, 12], hatClosed: [2, 4, 6, 8, 10, 12, 14], tomLow: [15] },
        { kick: [0, 3, 6, 11], snare: [8, 12], clap: [8, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [3] },
      ]),
      reggaeton: this._buildPattern([
        { kick: [0, 8], snare: [4, 12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 8], snare: [4, 12], clap: [4, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [11] },
        { kick: [0, 6, 8], snare: [4, 12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [15] },
        { kick: [0, 8], snare: [4, 12], clap: [4, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [7] },
        { kick: [0, 8, 11], snare: [4, 12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 8], snare: [4, 12], clap: [4, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomHi: [15] },
        { kick: [0, 6, 8], snare: [4, 12], clap: [4, 12], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 8], snare: [4, 12], clap: [4, 12], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [11] },
      ]),
      jersey: this._buildPattern([
        { kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], hatOpen: [8] },
        { kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], tomLow: [7] },
        { kick: [0, 3, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], hatOpen: [8] },
        { kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], tomMid: [11] },
        { kick: [0, 4, 8, 12, 15], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], hatOpen: [8] },
        { kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], tomHi: [3] },
        { kick: [0, 3, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], hatOpen: [8] },
        { kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hatClosed: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], tomLow: [15] },
      ]),
      amapiano: this._buildPattern([
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [2, 6, 10, 14], hatOpen: ['t7'], tomLow: [11] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [2, 4, 6, 10, 12, 14], hatOpen: ['t4'], tomMid: [15] },
        { kick: [0, 4, 9, 12], snare: [8], clap: [8], hatClosed: [2, 6, 10, 14], hatOpen: [15], tomHi: [7] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [11] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [2, 6, 10, 14], hatOpen: ['t10'], tomMid: [3] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [2, 6, 10, 14], hatOpen: [7], tomHi: [15] },
        { kick: [0, 4, 9, 12], snare: [8], clap: [8], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: ['t1', 't4'], tomLow: [11] },
        { kick: [0, 4, 8, 12], snare: [8], clap: [8], hatClosed: [2, 6, 10, 14], tomMid: [11], hatOpen: ['t7'] },
      ]),
      techno: this._buildPattern([
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [11] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [2, 6, 10, 14], hatOpen: [15] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [7] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomHi: [15] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [2, 6, 10, 14], hatOpen: [7] },
        { kick: [0, 4, 8, 12], snare: [], clap: [], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [11] },
      ]),
      baile: this._buildPattern([
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7], tomLow: [15] },
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [11] },
        { kick: [0, 3, 6, 9, 12, 15], snare: [8], clap: [8], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7], tomHi: [5] },
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomLow: [15] },
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7], tomMid: [11] },
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomHi: [3] },
        { kick: [0, 3, 6, 9, 12, 15], snare: [8], clap: [8], hatClosed: [2, 4, 6, 8, 10, 12, 14], hatOpen: [7], tomLow: [15] },
        { kick: [0, 3, 6, 9, 12], snare: [8], clap: [8], hatClosed: [1, 3, 5, 7, 9, 11, 13, 15], tomMid: [11] },
      ]),
    };
  }

  _lfoPhase(atTime) {
    const beatPos = ((atTime - this.transportStart) * this.bpm) / 60;
    const phase = (beatPos % this.lfoBeats) / this.lfoBeats;
    return Math.sin(phase * Math.PI * 2);
  }

  _applyLfo(name, when) {
    const phase = this._lfoPhase(when);
    const tDepth = this.lfoDepthTime[name] || 0;
    const vDepth = this.lfoDepthVel[name] || 0;
    const pDepth = this.lfoDepthPan[name] || 0;
    const timeOffset = phase * tDepth;
    const velScale = 1 + phase * vDepth;
    const pan = phase * pDepth;
    return { timeOffset, velScale, pan };
  }

  setBPM(bpm) {
    this.bpm = bpm;
    this.drumMachine.setBPM(bpm);
  }

  setExcitement(excite) {
    this.excite = excite;
  }

  setPattern(patternName) {
    this.currentPattern = this.patterns[patternName] || {};
  }

  start() {
    this.looping = true;
    const ctx = this.drumMachine.ctx;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.stepIndex = 0;
    this.transportStart = ctx.currentTime;
    this.drumMachine.transportStart = ctx.currentTime;
    this.schedule();
  }

  stop() {
    this.looping = false;
    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  schedule() {
    if (!this.looping) return;
    
    const ctx = this.drumMachine.ctx;
    const lookAhead = 0.1;
    const stepDur = 60 / this.bpm / 12;
    
    while (this.nextNoteTime < ctx.currentTime + lookAhead) {
      this._playPatternStep(this.stepIndex, this.nextNoteTime);
      this.stepIndex = (this.stepIndex + 1) % this.patternLength;
      this.nextNoteTime += stepDur;
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.schedule());
  }

  _playPatternStep(step, when) {
    Object.entries(this.currentPattern).forEach(([name, steps]) => {
      if (steps.includes(step)) {
        if (name === 'hatClosed32' && this.excite < 0.8) return;
        
        const voiceName = name === 'hatClosed32' ? 'hatClosed' : name;
        const dropChance = (1 - this.excite) * (this.excitementDrop[voiceName] || 0);
        if (Math.random() < dropChance) return;
        
        const { timeOffset, velScale, pan } = this._applyLfo(voiceName, when);
        const baseVel = name === 'hatClosed32'
          ? (0.5 + this.excite * 0.5) * 0.7
          : (0.6 + this.excite * 0.7);
        
        // Call appropriate drum machine method
        const options = { pan, timeOffset, velScale };
        switch (voiceName) {
          case 'kick':
            this.drumMachine.playKick(baseVel, options);
            break;
          case 'snare':
            this.drumMachine.playSnare(baseVel, options);
            break;
          case 'clap':
            this.drumMachine.playClap(baseVel, options);
            break;
          case 'tomLow':
            this.drumMachine.playTomLow(baseVel, options);
            break;
          case 'tomMid':
            this.drumMachine.playTomMid(baseVel, options);
            break;
          case 'tomHi':
            this.drumMachine.playTomHi(baseVel, options);
            break;
          case 'hatClosed':
            this.drumMachine.playHatClosed(baseVel, options);
            break;
          case 'hatOpen':
            this.drumMachine.playHatOpen(baseVel, options);
            break;
        }
      }
    });
  }
}

class RealDrumApp {
  constructor() {
    this.drumMachine = new DrumMachine({ bpm: 120 });
    this.patternPlayer = new PatternPlayer(this.drumMachine);
    this.voices = {
      kick: { key: 'z', label: 'Kick', color: '#ff7a18', play: (v) => this.drumMachine.playKick(1) },
      snare: { key: 'x', label: 'Snare', color: '#26d0ce', play: (v) => this.drumMachine.playSnare(1) },
      clap: { key: 'c', label: 'Clap', color: '#e86aff', play: (v) => this.drumMachine.playClap(1) },
      tomLow: { key: 'v', label: 'Tom Low', color: '#f0c808', play: (v) => this.drumMachine.playTomLow(1) },
      tomMid: { key: 'b', label: 'Tom Mid', color: '#82e0aa', play: (v) => this.drumMachine.playTomMid(1) },
      tomHi: { key: 'n', label: 'Tom Hi', color: '#74b9ff', play: (v) => this.drumMachine.playTomHi(1) },
      hatClosed: { key: 'm', label: 'Hat Closed', color: '#c7ced8', play: (v) => this.drumMachine.playHatClosed(1) },
      hatOpen: { key: ',', label: 'Hat Open', color: '#f5f7fa', play: (v) => this.drumMachine.playHatOpen(1) },
    };
    
    this._setupUI();
    this._setupMeter();
  }

  _setupUI() {
    const bpmSlider = document.getElementById('bpm');
    const bpmVal = document.getElementById('bpmVal');
    const patternSel = document.getElementById('pattern');
    const playToggle = document.getElementById('playToggle');
    const exciteSlider = document.getElementById('excite');
    const exciteVal = document.getElementById('exciteVal');
    const padsEl = document.getElementById('pads');

    // BPM control (only if element exists)
    if (bpmSlider && bpmVal) {
      bpmSlider.oninput = () => {
        const bpm = parseInt(bpmSlider.value, 10);
        bpmVal.textContent = bpm;
        this.patternPlayer.setBPM(bpm);
      };
    }

    // Excitement control (only if element exists)
    if (exciteSlider && exciteVal) {
      exciteSlider.oninput = () => {
        const excite = parseInt(exciteSlider.value, 10) / 100;
        exciteVal.textContent = Math.round(excite * 100) + '%';
        this.patternPlayer.setExcitement(excite);
      };
    }

    // Pattern selection (only if element exists)
    if (patternSel) {
      patternSel.oninput = () => {
        this.patternPlayer.setPattern(patternSel.value);
      };
      // Initialize pattern
      this.patternPlayer.setPattern(patternSel.value);
    }

    // Play toggle (only if element exists)
    if (playToggle) {
      playToggle.onclick = () => {
        if (this.patternPlayer.looping) {
          this.patternPlayer.stop();
          playToggle.textContent = 'Start loop';
        } else {
          this.patternPlayer.start();
          playToggle.textContent = 'Stop loop';
        }
      };
    }

    // Create pad buttons (only if container exists)
    if (padsEl) {
      Object.values(this.voices).forEach((v) => {
        const btn = document.createElement('button');
        btn.className = 'pad';
        btn.style.borderColor = 'transparent';
        btn.innerHTML = `<strong>${v.label}</strong><br><span class="kbd">${v.key.toUpperCase()}</span>`;
        btn.onclick = () => this._trigger(v);
        padsEl.appendChild(btn);
        v.el = btn;
      });

      // Keyboard handlers (only if pads exist)
      document.addEventListener('keydown', (e) => {
        const v = Object.values(this.voices).find((x) => x.key === e.key.toLowerCase());
        if (v) {
          e.preventDefault();
          this._trigger(v);
        }
      });
    }
  }

  _trigger(v) {
    this.drumMachine.resume();
    this._flash(v.el, v.color);
    v.play(v);
  }

  _flash(el, color) {
    el.animate([
      { boxShadow: `0 0 0 0 rgba(0,0,0,0)`, borderColor: '#1f2b3d' },
      { boxShadow: `0 0 0 8px ${this._hexToRgba(color, 0.25)}`, borderColor: color },
      { boxShadow: `0 0 0 0 rgba(0,0,0,0)`, borderColor: '#1f2b3d' },
    ], { duration: 220, easing: 'ease-out' });
  }

  _hexToRgba(hex, alpha) {
    const int = parseInt(hex.replace('#', ''), 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  _setupMeter() {
    const meterFill = document.getElementById('meterFill');
    // Only setup meter if element exists
    if (!meterFill) return;
    
    const meterAnalyser = this.drumMachine.ctx.createAnalyser();
    meterAnalyser.fftSize = 2048;
    const meterData = new Uint8Array(meterAnalyser.fftSize);
    this.drumMachine.master.connect(meterAnalyser);
    
    let meterAnimationFrameId = null;
    const updateMeter = () => {
      meterAnalyser.getByteTimeDomainData(meterData);
      let peak = 0;
      for (let i = 0; i < meterData.length; i++) {
        const v = Math.abs(meterData[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      const pct = Math.min(100, Math.max(4, peak * 180));
      meterFill.style.width = pct + '%';
      meterAnimationFrameId = requestAnimationFrame(updateMeter);
    };
    updateMeter();
    
    // Store cleanup function
    this._stopMeter = () => {
      if (meterAnimationFrameId !== null) {
        cancelAnimationFrame(meterAnimationFrameId);
        meterAnimationFrameId = null;
      }
    };
  }
}

