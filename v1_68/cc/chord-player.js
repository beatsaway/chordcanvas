// Minimal chord player for PriMIDI (uses ChordEngine + primidi MIDI note handlers)
(function () {
    'use strict';

    const timeouts = new Set();
    const activeNotes = new Set();
    const STORAGE_KEY_STATE = 'primidi_ccState_v1';
    let rebuildRhythmOptionsRef = null;
    let isPlaying = false;
    let playSessionId = 0;

    function clearTimeouts() {
        timeouts.forEach((id) => {
            try { clearTimeout(id); } catch (e) {}
        });
        timeouts.clear();
    }

    function allNotesOff() {
        if (typeof window.handleMidiNoteOff !== 'function') return;
        activeNotes.forEach((midi) => {
            try { window.handleMidiNoteOff(midi); } catch (e) {}
        });
        activeNotes.clear();
    }

    function normalizeChordText(text) {
        return String(text || '').replace(/\|/g, ',').replace(/\n/g, ',').replace(/\r/g, ',');
    }

    function clampMidi(midi) {
        return Math.max(21, Math.min(108, midi));
    }

    function getHumanBpmFallback() {
        const slider = document.getElementById('human-bpm');
        const v = slider ? parseInt(slider.value, 10) : NaN;
        return Number.isFinite(v) ? Math.max(40, Math.min(240, v)) : 120;
    }

    const CC_DEFAULT_BPM = 120;
    const CC_DEFAULT_BASS_VELOCITY = 70;
    const CC_DEFAULT_TREBLE_VELOCITY = 74;
    const CC_MIN_BPM = 33;
    const CC_MAX_BPM = 888;
    /** Preload delay (seconds) before first note when Play is pressed. Gives mobile time to resume AudioContext and use decoded samples without glitch. Adapted from ChordCanvas preloadSeconds idea. */
    const CC_PRELOAD_DELAY_SECONDS = 0.25;
    const CC_CHORD_BAR_BEATS = 4;
    const CC_DURATION_MULTIPLIERS = [240, 120, 60, 40, 30, 20, 15];
    const CC_NOTE_SYMBOLS_HTML = [
        '&#119133;',        // whole
        '&#119134;',        // half
        '&#119135;',        // quarter
        '&#119135;&#8323;', // quarter triplet-ish
        '&#119136;',        // eighth
        '&#119136;&#8323;', // eighth triplet-ish
        '&#119137;'         // sixteenth
    ];
    const CC_SKIP_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8];
    const CC_DELAY_MOD_OPTIONS = ['none', 'human', 'drunk'];
    const CC_VOLUME_MOD_OPTIONS = ['none', 'uphill', 'downhill', 'valley', 'hill', '2valley', '2hill'];

    const CC_DELAY_MOD_CHANCE = 0.618;
    const CC_DELAY_MOD_AMOUNT_HUMAN = 0.05;
    const CC_DELAY_MOD_AMOUNT_DRUNK = 0.128;
    const CC_VOLUME_MOD_MIN = 0.05;
    const CC_VOLUME_MOD_MAX = 1.3;

    const CC_CHORD_MAX_ROWS = 10;
    const CC_MAX_INSTRUMENT_SLOTS = 6;
    const CC_CHORD_COLORS = [
        { main: 'rgba(13, 148, 136, 0.85)', shadow: 'rgba(13, 148, 136, 0.2)', rowBg: 'rgba(13, 148, 136, 0.06)', tabBg: 'rgba(13, 148, 136, 0.12)', tabBorder: 'rgba(13, 148, 136, 0.30)' },
        { main: 'rgba(168, 85, 247, 0.85)', shadow: 'rgba(168, 85, 247, 0.2)', rowBg: 'rgba(168, 85, 247, 0.06)', tabBg: 'rgba(168, 85, 247, 0.12)', tabBorder: 'rgba(168, 85, 247, 0.30)' },
        { main: 'rgba(234, 88, 12, 0.85)', shadow: 'rgba(234, 88, 12, 0.2)', rowBg: 'rgba(234, 88, 12, 0.06)', tabBg: 'rgba(234, 88, 12, 0.12)', tabBorder: 'rgba(234, 88, 12, 0.30)' },
        { main: 'rgba(22, 163, 74, 0.85)', shadow: 'rgba(22, 163, 74, 0.2)', rowBg: 'rgba(22, 163, 74, 0.06)', tabBg: 'rgba(22, 163, 74, 0.12)', tabBorder: 'rgba(22, 163, 74, 0.30)' },
        { main: 'rgba(220, 38, 38, 0.85)', shadow: 'rgba(220, 38, 38, 0.2)', rowBg: 'rgba(220, 38, 38, 0.06)', tabBg: 'rgba(220, 38, 38, 0.12)', tabBorder: 'rgba(220, 38, 38, 0.30)' },
        { main: 'rgba(59, 130, 246, 0.85)', shadow: 'rgba(59, 130, 246, 0.2)', rowBg: 'rgba(59, 130, 246, 0.06)', tabBg: 'rgba(59, 130, 246, 0.12)', tabBorder: 'rgba(59, 130, 246, 0.30)' },
        { main: 'rgba(161, 98, 7, 0.85)', shadow: 'rgba(161, 98, 7, 0.2)', rowBg: 'rgba(161, 98, 7, 0.06)', tabBg: 'rgba(161, 98, 7, 0.12)', tabBorder: 'rgba(161, 98, 7, 0.30)' },
        { main: 'rgba(190, 18, 60, 0.85)', shadow: 'rgba(190, 18, 60, 0.2)', rowBg: 'rgba(190, 18, 60, 0.06)', tabBg: 'rgba(190, 18, 60, 0.12)', tabBorder: 'rgba(190, 18, 60, 0.30)' },
        { main: 'rgba(20, 184, 166, 0.85)', shadow: 'rgba(20, 184, 166, 0.2)', rowBg: 'rgba(20, 184, 166, 0.06)', tabBg: 'rgba(20, 184, 166, 0.12)', tabBorder: 'rgba(20, 184, 166, 0.30)' },
        { main: 'rgba(124, 58, 237, 0.85)', shadow: 'rgba(124, 58, 237, 0.2)', rowBg: 'rgba(124, 58, 237, 0.06)', tabBg: 'rgba(124, 58, 237, 0.12)', tabBorder: 'rgba(124, 58, 237, 0.30)' }
    ];
    let lastFocusedChordIndex = 0;
    let dragChordRow = null;
    let rowSettings = [];
    let chordPreviewDebounceId = null;
    let rowSoundState = [];

    const CC_DEFAULT_REVERB = 100;
    const CC_DEFAULT_STEREO_WIDTH = -25;
    const CC_DEFAULT_ROW_VOLUME = 1000;

    /** Default instrument/sound state for one row (matches current globals as much as possible). forFirstRow: true = row 1 default with all every-bar "valley". */
    function getDefaultSoundState(forFirstRow) {
        let state;
        if (typeof window !== 'undefined' && window.ccReadSoundStateFromGlobals) {
            state = window.ccReadSoundStateFromGlobals();
        } else {
            const vols = [66, 33, 33, 66, 33, 33];
            const semis = [0, 0, 0, 0, 0, 0];
            const muted = [false, false, false, false, false, false];
            const everyBar = ['none', 'none', 'none', 'none', 'none', 'none'];
            const everyBarInt = [0.20, 0.20, 0.20, 0.20, 0.20, 0.20];
            state = {
                presetSlots: ['gsl_piano'].slice(),
                slotVolumes: vols,
                slotSemitones: semis,
                slotMuted: muted,
                everyBarPattern: everyBar,
                everyBarIntensity: everyBarInt,
                layerPlayStyle: 'none',
                layerPlayMode: 'leftRight',
                reverb: CC_DEFAULT_REVERB,
                stereoWidth: CC_DEFAULT_STEREO_WIDTH,
                nostalgia: false,
                soundMode: 'normal',
                rowVolume: CC_DEFAULT_ROW_VOLUME,
                soundBassEveryBar: 'none',
                soundTrebleEveryBar: 'none',
                soundBassEveryBarIntensity: 0.2,
                soundTrebleEveryBarIntensity: 0.2
            };
        }
        if (state.reverb == null) state.reverb = CC_DEFAULT_REVERB;
        if (state.stereoWidth == null) state.stereoWidth = CC_DEFAULT_STEREO_WIDTH;
        if (state.nostalgia == null) state.nostalgia = false;
        if (state.soundMode == null) state.soundMode = (state.nostalgia ? 'nostalgia' : 'normal');
        if (state.rowVolume == null) state.rowVolume = CC_DEFAULT_ROW_VOLUME;
        if (state.soundBassEveryBar == null) state.soundBassEveryBar = 'none';
        if (state.soundTrebleEveryBar == null) state.soundTrebleEveryBar = 'none';
        if (state.soundBassEveryBarIntensity == null) state.soundBassEveryBarIntensity = 0.2;
        if (state.soundTrebleEveryBarIntensity == null) state.soundTrebleEveryBarIntensity = 0.2;
        if (forFirstRow && state.everyBarPattern) {
            state = Object.assign({}, state, { everyBarPattern: ['uphill', 'uphill', 'uphill', 'valley', 'valley', 'valley'] });
        }
        return state;
    }

    /** Copy sound state for persistence/merge; ensures reverb, stereoWidth, nostalgia, rowVolume exist. */
    function copySoundState(s) {
        if (!s) return getDefaultSoundState();
        return {
            presetSlots: (s.presetSlots || []).slice(),
            slotVolumes: (s.slotVolumes || []).slice(),
            slotSemitones: (s.slotSemitones || []).slice(),
            slotMuted: (s.slotMuted || []).slice(),
            everyBarPattern: (s.everyBarPattern || []).slice(),
            everyBarIntensity: (s.everyBarIntensity || []).slice(),
            layerPlayStyle: s.layerPlayStyle != null ? s.layerPlayStyle : 'none',
            layerPlayMode: (s.layerPlayMode === 'split' || s.layerPlayMode === 'scatter') ? s.layerPlayMode : 'leftRight',
            reverb: s.reverb != null ? s.reverb : CC_DEFAULT_REVERB,
            stereoWidth: s.stereoWidth != null ? s.stereoWidth : CC_DEFAULT_STEREO_WIDTH,
            nostalgia: !!s.nostalgia,
            soundMode: (s.soundMode === 'nostalgia' || s.soundMode === 'tremolo') ? s.soundMode : (s.nostalgia ? 'nostalgia' : 'normal'),
            rowVolume: s.rowVolume != null ? s.rowVolume : CC_DEFAULT_ROW_VOLUME,
            soundBassEveryBar: (s.soundBassEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(s.soundBassEveryBar)) ? s.soundBassEveryBar : 'none',
            soundTrebleEveryBar: (s.soundTrebleEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(s.soundTrebleEveryBar)) ? s.soundTrebleEveryBar : 'none',
            soundBassEveryBarIntensity: s.soundBassEveryBarIntensity != null ? Math.max(0, Math.min(1, s.soundBassEveryBarIntensity)) : 0.2,
            soundTrebleEveryBarIntensity: s.soundTrebleEveryBarIntensity != null ? Math.max(0, Math.min(1, s.soundTrebleEveryBarIntensity)) : 0.2
        };
    }

    /** Read current global instrument/sound state into a snapshot (for storing per row). */
    function readSoundStateFromGlobals() {
        const slots = (typeof window !== 'undefined' && window.gslPresetSlots && Array.isArray(window.gslPresetSlots)) ? window.gslPresetSlots.slice() : ['gsl_piano'];
        const vols = (typeof window !== 'undefined' && window.gslSlotVolumes && Array.isArray(window.gslSlotVolumes)) ? window.gslSlotVolumes.slice() : [66, 33, 33, 66, 33, 33];
        const semis = (typeof window !== 'undefined' && window.gslSlotSemitones && Array.isArray(window.gslSlotSemitones)) ? window.gslSlotSemitones.slice() : [0, 0, 0, 0, 0, 0];
        const muted = (typeof window !== 'undefined' && window.gslSlotMuted && Array.isArray(window.gslSlotMuted)) ? window.gslSlotMuted.slice() : [false, false, false, false, false, false];
        const everyBar = (typeof window !== 'undefined' && window.gslEveryBarPattern && Array.isArray(window.gslEveryBarPattern)) ? window.gslEveryBarPattern.slice() : ['uphill', 'uphill', 'uphill', 'none', 'none', 'none'];
        const everyBarInt = (typeof window !== 'undefined' && window.gslEveryBarIntensity && Array.isArray(window.gslEveryBarIntensity)) ? window.gslEveryBarIntensity.slice() : [0.20, 0.20, 0.20, 0.20, 0.20, 0.20];
        const layerPlayStyle = (typeof window !== 'undefined' && typeof window.gslLayerPlayStyle === 'string') ? window.gslLayerPlayStyle : 'none';
        const layerPlayMode = (typeof window !== 'undefined' && window.gslLayerPlayMode) ? window.gslLayerPlayMode : 'leftRight';
        let reverb = CC_DEFAULT_REVERB;
        let stereoWidth = CC_DEFAULT_STEREO_WIDTH;
        let nostalgia = false;
        let rowVolume = CC_DEFAULT_ROW_VOLUME;
        let soundBassEveryBar = 'none';
        let soundTrebleEveryBar = 'none';
        let soundBassEveryBarIntensity = 0.2;
        let soundTrebleEveryBarIntensity = 0.2;
        if (typeof window !== 'undefined' && window.synth) {
            if (typeof window.synth.getSoundMode === 'function') soundMode = window.synth.getSoundMode();
            else if (typeof window.synth.getNostalgiaMode === 'function') soundMode = window.synth.getNostalgiaMode() ? 'nostalgia' : 'normal';
            nostalgia = soundMode === 'nostalgia';
            if (typeof window.synth.getMasterVolume === 'function') rowVolume = window.synth.getMasterVolume();
        }
        if (typeof window !== 'undefined') {
            if (window.gslChordRowSoundBassEveryBar && CC_VOLUME_MOD_OPTIONS.includes(window.gslChordRowSoundBassEveryBar)) soundBassEveryBar = window.gslChordRowSoundBassEveryBar;
            if (window.gslChordRowSoundTrebleEveryBar && CC_VOLUME_MOD_OPTIONS.includes(window.gslChordRowSoundTrebleEveryBar)) soundTrebleEveryBar = window.gslChordRowSoundTrebleEveryBar;
            if (window.gslChordRowSoundBassIntensity != null) soundBassEveryBarIntensity = Math.max(0, Math.min(1, window.gslChordRowSoundBassIntensity));
            if (window.gslChordRowSoundTrebleIntensity != null) soundTrebleEveryBarIntensity = Math.max(0, Math.min(1, window.gslChordRowSoundTrebleIntensity));
        }
        while (slots.length < CC_MAX_INSTRUMENT_SLOTS) slots.push(null);
        while (vols.length < CC_MAX_INSTRUMENT_SLOTS) vols.push(33);
        while (semis.length < CC_MAX_INSTRUMENT_SLOTS) semis.push(0);
        while (muted.length < CC_MAX_INSTRUMENT_SLOTS) muted.push(false);
        while (everyBar.length < CC_MAX_INSTRUMENT_SLOTS) everyBar.push('none');
        while (everyBarInt.length < CC_MAX_INSTRUMENT_SLOTS) everyBarInt.push(0.20);
        return { presetSlots: slots, slotVolumes: vols, slotSemitones: semis, slotMuted: muted, everyBarPattern: everyBar, everyBarIntensity: everyBarInt, layerPlayStyle, layerPlayMode, reverb, stereoWidth, nostalgia, soundMode, rowVolume, soundBassEveryBar, soundTrebleEveryBar, soundBassEveryBarIntensity, soundTrebleEveryBarIntensity };
    }

    /** Apply a per-row sound snapshot to the global window state (Instrument/Sound/Human use these). */
    function applySoundStateToGlobals(state) {
        if (!state || typeof window === 'undefined') return;
        var slots = (state.presetSlots && state.presetSlots.slice()) || [];
        while (slots.length < CC_MAX_INSTRUMENT_SLOTS) slots.push(null);
        if (slots[0] && !slots[3]) slots[3] = slots[0];
        window.gslPresetSlots = slots;
        var vols = (state.slotVolumes && state.slotVolumes.length >= CC_MAX_INSTRUMENT_SLOTS) ? state.slotVolumes.slice() : [66, 33, 33, 66, 33, 33];
        while (vols.length < CC_MAX_INSTRUMENT_SLOTS) vols.push(33);
        window.gslSlotVolumes = vols.slice(0, CC_MAX_INSTRUMENT_SLOTS);
        window.gslSlotSemitones = (state.slotSemitones && state.slotSemitones.slice()) || [0, 0, 0, 0, 0, 0];
        window.gslSlotMuted = (state.slotMuted && state.slotMuted.slice()) || [false, false, false, false, false, false];
        window.gslEveryBarPattern = (state.everyBarPattern && state.everyBarPattern.slice()) || ['uphill', 'uphill', 'uphill', 'none', 'none', 'none'];
        window.gslEveryBarIntensity = (state.everyBarIntensity && state.everyBarIntensity.slice()) || [0.20, 0.20, 0.20, 0.20, 0.20, 0.20];
        window.gslLayerPlayStyle = (state.layerPlayStyle != null && state.layerPlayStyle !== undefined) ? state.layerPlayStyle : 'none';
        window.gslLayerPlayMode = (state.layerPlayMode === 'split' || state.layerPlayMode === 'scatter') ? state.layerPlayMode : 'leftRight';
        var modeEl = typeof document !== 'undefined' ? document.getElementById('sound-layer-play-mode') : null;
        if (modeEl) modeEl.value = window.gslLayerPlayMode;
        if (window.synth) {
            var r = state.reverb != null ? Math.max(0, Math.min(100, state.reverb)) : CC_DEFAULT_REVERB;
            if (window.synth.setReverb) window.synth.setReverb(r / 100);
            var sw = state.stereoWidth != null ? Math.max(-100, Math.min(0, state.stereoWidth)) : CC_DEFAULT_STEREO_WIDTH;
            if (window.synth.setStereoWidth) window.synth.setStereoWidth(sw);
            var sm = (state.soundMode === 'nostalgia' || state.soundMode === 'tremolo') ? state.soundMode : (state.nostalgia ? 'nostalgia' : 'normal');
            if (window.synth.setSoundMode) window.synth.setSoundMode(sm);
            else if (window.synth.setNostalgiaMode) window.synth.setNostalgiaMode(sm === 'nostalgia');
            if (sm === 'tremolo' && window.synth.setTremoloBPM) {
                var bpm = (typeof window !== 'undefined' && window.gslBpm != null) ? window.gslBpm : 120;
                window.synth.setTremoloBPM(bpm);
            }
            var rv = state.rowVolume != null ? Math.max(0, Math.min(2000, state.rowVolume)) : CC_DEFAULT_ROW_VOLUME;
            if (window.synth.setMasterVolume) window.synth.setMasterVolume(rv);
        }
        window.gslChordRowSoundBassEveryBar = (state.soundBassEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(state.soundBassEveryBar)) ? state.soundBassEveryBar : 'none';
        window.gslChordRowSoundTrebleEveryBar = (state.soundTrebleEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(state.soundTrebleEveryBar)) ? state.soundTrebleEveryBar : 'none';
        window.gslChordRowSoundBassIntensity = state.soundBassEveryBarIntensity != null ? Math.max(0, Math.min(1, state.soundBassEveryBarIntensity)) : 0.2;
        window.gslChordRowSoundTrebleIntensity = state.soundTrebleEveryBarIntensity != null ? Math.max(0, Math.min(1, state.soundTrebleEveryBarIntensity)) : 0.2;
    }

    function getDefaultRowSettings() {
        /* Backup defaults (restore if needed): trebleSkipPattern [4,3,8], patternMode 'ascend2', bassEveryBar 'uphill'|'downhill', trebleEveryBar 'valley' */
        return {
            bpm: CC_DEFAULT_BPM,
            bassDurationMultiplier: 60,        /* Quarter note */
            trebleDurationMultiplier: 30,      /* Eighth note */
            skipPattern: [2, 8, 0],
            bassSkipPattern: [],
            trebleSkipPattern: [2, 8, 0],
            patternMode: 'descend2',
            bassPatternMode: 'normal',
            bassVelocity: CC_DEFAULT_BASS_VELOCITY,
            trebleVelocity: CC_DEFAULT_TREBLE_VELOCITY,
            octaveShift: 0,
            voicing: 'full',
            trebleOctaves: 1,
            bassOctaves: 1,
            delayMod: 'human',
            delayIntensity: 1,
            bassEveryBar: '2valley',
            trebleEveryBar: 'hill',
            bassEveryBarIntensity: 0.51,
            trebleEveryBarIntensity: 0.51,
            sustainPedal: false
        };
    }

    function readRowSettingsFromUi() {
        const bpmInput = document.getElementById('cc-row-bpm');
        const bassRhythmEl = document.getElementById('cc-bass-rhythm');
        const trebleRhythmEl = document.getElementById('cc-treble-rhythm');
        const bassSkip1El = document.getElementById('cc-bass-skip1');
        const bassSkip2El = document.getElementById('cc-bass-skip2');
        const bassSkip3El = document.getElementById('cc-bass-skip3');
        const skip1El = document.getElementById('cc-skip1');
        const skip2El = document.getElementById('cc-skip2');
        const skip3El = document.getElementById('cc-skip3');
        const patternModeEl = document.getElementById('cc-pattern-mode');
        const bassPatternModeEl = document.getElementById('cc-bass-pattern-mode');
        const bassVelocityEl = document.getElementById('cc-bass-velocity');
        const trebleVelocityEl = document.getElementById('cc-treble-velocity');
        const octaveShiftEl = document.getElementById('cc-octave-shift');
        const voicingEl = document.getElementById('cc-voicing');
        const doubleTrebleEl = document.getElementById('cc-double-treble');
        const doubleBassEl = document.getElementById('cc-double-bass');
        const delayModEl = document.getElementById('cc-delay-mod');
        const bassEveryBarEl = document.getElementById('cc-bass-everybar');
        const bassEveryBarIntensityEl = document.getElementById('cc-bass-everybar-intensity');
        const trebleEveryBarEl = document.getElementById('cc-treble-everybar');
        const trebleEveryBarIntensityEl = document.getElementById('cc-treble-everybar-intensity');
        const sustainPedalEl = document.getElementById('cc-sustain-pedal');

        const bpm = clampBpm(bpmInput ? bpmInput.value : CC_DEFAULT_BPM);
        const bassDurationMultiplier = bassRhythmEl ? parseInt(bassRhythmEl.value, 10) : 30;
        const trebleDurationMultiplier = trebleRhythmEl ? parseInt(trebleRhythmEl.value, 10) : 30;
        const bassVelocityRaw = bassVelocityEl ? parseInt(bassVelocityEl.value, 10) : CC_DEFAULT_BASS_VELOCITY;
        const trebleVelocityRaw = trebleVelocityEl ? parseInt(trebleVelocityEl.value, 10) : CC_DEFAULT_TREBLE_VELOCITY;
        const bassVelocity = Number.isFinite(bassVelocityRaw) ? Math.max(1, Math.min(127, bassVelocityRaw)) : CC_DEFAULT_BASS_VELOCITY;
        const trebleVelocity = Number.isFinite(trebleVelocityRaw) ? Math.max(1, Math.min(127, trebleVelocityRaw)) : CC_DEFAULT_TREBLE_VELOCITY;
        const octaveShift = octaveShiftEl ? parseInt(octaveShiftEl.value, 10) : 0;
        const bassSkip1 = bassSkip1El ? parseInt(bassSkip1El.value, 10) : 0;
        const bassSkip2 = bassSkip2El ? parseInt(bassSkip2El.value, 10) : 0;
        const bassSkip3 = bassSkip3El ? parseInt(bassSkip3El.value, 10) : 0;
        const skip1 = skip1El ? parseInt(skip1El.value, 10) : 0;
        const skip2 = skip2El ? parseInt(skip2El.value, 10) : 0;
        const skip3 = skip3El ? parseInt(skip3El.value, 10) : 0;
        const bassSkipPattern = [bassSkip1, bassSkip2, bassSkip3].filter((n) => Number.isFinite(n) && n > 0);
        const skipPattern = [skip1, skip2, skip3].filter((n) => Number.isFinite(n) && n > 0);
        const trebleOctaves = doubleTrebleEl ? parseInt(doubleTrebleEl.value, 10) : 1;
        const bassOctaves = doubleBassEl ? parseInt(doubleBassEl.value, 10) : 1;
        const delayMod = delayModEl ? String(delayModEl.value || 'human') : 'human';
        const bassEveryBar = bassEveryBarEl ? String(bassEveryBarEl.value || 'uphill') : 'uphill';
        const trebleEveryBar = trebleEveryBarEl ? String(trebleEveryBarEl.value || 'uphill') : 'uphill';
        const bassEveryBarIntensityRaw = bassEveryBarIntensityEl ? parseInt(bassEveryBarIntensityEl.value, 10) : 51;
        const trebleEveryBarIntensityRaw = trebleEveryBarIntensityEl ? parseInt(trebleEveryBarIntensityEl.value, 10) : 51;
        const bassEveryBarIntensity = Number.isFinite(bassEveryBarIntensityRaw) ? Math.max(0, Math.min(100, bassEveryBarIntensityRaw)) / 100 : 0.51;
        const trebleEveryBarIntensity = Number.isFinite(trebleEveryBarIntensityRaw) ? Math.max(0, Math.min(100, trebleEveryBarIntensityRaw)) / 100 : 0.51;
        const sustainPedal = sustainPedalEl ? !!sustainPedalEl.checked : false;

        return {
            bpm,
            bassDurationMultiplier: Number.isFinite(bassDurationMultiplier) ? bassDurationMultiplier : 30,
            trebleDurationMultiplier: Number.isFinite(trebleDurationMultiplier) ? trebleDurationMultiplier : 30,
            skipPattern,
            bassSkipPattern,
            trebleSkipPattern: skipPattern,
            patternMode: patternModeEl ? String(patternModeEl.value || 'normal') : 'normal',
            bassPatternMode: bassPatternModeEl ? String(bassPatternModeEl.value || 'normal') : 'normal',
            bassVelocity,
            trebleVelocity,
            octaveShift,
            voicing: voicingEl ? String(voicingEl.value || 'full') : 'full',
            trebleOctaves: (trebleOctaves === 2) ? 2 : 1,
            bassOctaves: (bassOctaves === 2) ? 2 : 1,
            delayMod: CC_DELAY_MOD_OPTIONS.includes(delayMod) ? delayMod : 'human',
            delayIntensity: 1,
            bassEveryBar: CC_VOLUME_MOD_OPTIONS.includes(bassEveryBar) ? bassEveryBar : 'uphill',
            trebleEveryBar: CC_VOLUME_MOD_OPTIONS.includes(trebleEveryBar) ? trebleEveryBar : 'uphill',
            bassEveryBarIntensity,
            trebleEveryBarIntensity,
            sustainPedal
        };
    }

    function applyRowSettingsToUi(s) {
        if (!s) return;
        const setIf = (id, value) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.value = value != null ? String(value) : '';
            if (el.tagName === 'SELECT') el.value = String(value);
        };
        var bpmVal = clampBpm(s.bpm ?? CC_DEFAULT_BPM);
        setIf('cc-row-bpm', bpmVal);
        if (typeof window !== 'undefined') window.gslBpm = bpmVal;
        setIf('cc-bass-rhythm', s.bassDurationMultiplier ?? 30);
        setIf('cc-treble-rhythm', s.trebleDurationMultiplier ?? 30);
        setIf('cc-pattern-mode', s.patternMode ?? 'normal');
        setIf('cc-bass-pattern-mode', s.bassPatternMode ?? 'normal');
        setIf('cc-bass-velocity', s.bassVelocity ?? CC_DEFAULT_BASS_VELOCITY);
        setIf('cc-treble-velocity', s.trebleVelocity ?? CC_DEFAULT_TREBLE_VELOCITY);
        setIf('cc-octave-shift', s.octaveShift ?? 0);
        setIf('cc-voicing', s.voicing ?? 'full');
        setIf('cc-double-treble', s.trebleOctaves === 2 ? 2 : 1);
        setIf('cc-double-bass', s.bassOctaves === 2 ? 2 : 1);
        const bassSkip = Array.isArray(s.bassSkipPattern) ? s.bassSkipPattern : (Array.isArray(s.skipPattern) ? s.skipPattern : []);
        const trebleSkip = Array.isArray(s.trebleSkipPattern) ? s.trebleSkipPattern : (Array.isArray(s.skipPattern) ? s.skipPattern : []);
        setIf('cc-bass-skip1', bassSkip[0] ?? 0);
        setIf('cc-bass-skip2', bassSkip[1] ?? 0);
        setIf('cc-bass-skip3', bassSkip[2] ?? 0);
        setIf('cc-skip1', trebleSkip[0] ?? 0);
        setIf('cc-skip2', trebleSkip[1] ?? 0);
        setIf('cc-skip3', trebleSkip[2] ?? 0);
        setIf('cc-delay-mod', s.delayMod ?? 'human');
        setIf('cc-bass-everybar', s.bassEveryBar ?? 'uphill');
        setIf('cc-treble-everybar', s.trebleEveryBar ?? 'uphill');
        setIf('cc-bass-everybar-intensity', Math.round((s.bassEveryBarIntensity ?? 0.51) * 100));
        setIf('cc-treble-everybar-intensity', Math.round((s.trebleEveryBarIntensity ?? 0.51) * 100));
        const pedalEl = document.getElementById('cc-sustain-pedal');
        if (pedalEl) pedalEl.checked = !!s.sustainPedal;
    }

    function clampBpm(raw) {
        const v = parseInt(String(raw ?? ''), 10);
        if (!Number.isFinite(v) || v <= 0) return CC_DEFAULT_BPM;
        return Math.max(CC_MIN_BPM, Math.min(CC_MAX_BPM, v));
    }

    function setSelectOptionsHtml(selectEl, options) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        options.forEach((opt) => selectEl.appendChild(opt));
    }

    function buildRhythmOptionsForBpm(bpm) {
        const out = [];
        CC_DURATION_MULTIPLIERS.forEach((value, index) => {
            const seconds = (value / bpm).toFixed(2);
            const opt = document.createElement('option');
            opt.value = String(value);
            opt.innerHTML = `${CC_NOTE_SYMBOLS_HTML[index]} ${seconds}s`;
            out.push(opt);
        });
        return out;
    }

    function buildSkipOptions() {
        return CC_SKIP_OPTIONS.map((v) => {
            const opt = document.createElement('option');
            opt.value = String(v);
            opt.textContent = v === 0 ? '—' : String(v);
            return opt;
        });
    }

    function buildVolumeModOptions() {
        return CC_VOLUME_MOD_OPTIONS.map((v) => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            return opt;
        });
    }

    function randomInt(min, maxInclusive) {
        return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
    }
    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Key-based chord generator: pick key, then 4 chords. Diatonic + 2 extra choices: III (major 3rd) and iv (minor 4th).
    const CC_KEY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    // Root name (any common spelling) -> semitone 0–11 for transpose
    const CC_ROOT_TO_SEMITONE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const CC_MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // scale degrees 1-7 in semitones from root
    // Per degree (I, ii, iii, IV, V, vi, vii°): [triad, seventh] or multiple [triad, ext] options.
    // iii can be minor (diatonic) or major (III); IV can be major (diatonic) or minor (iv).
    const CC_DIATONIC_BY_DEGREE = [
        [['', 'maj7'], ['', 'sus2']],           // I
        ['m', 'm7'],                             // ii
        [['m', 'm7'], ['', 'maj7']],            // iii or III (major 3rd)
        [['', 'maj7'], ['', 'sus4'], ['m', 'm7']], // IV or iv (minor 4th)
        ['', '7'],                               // V
        ['m', 'm7'],                             // vi
        ['dim', 'm7b5']                          // vii°
    ];
    const CC_SEVENTH_CHANCE = 1 / 3;
    const CC_SUS_FLAVOUR_CHANCE = 0.14; // chance to use sus2 on I or sus4 on IV
    const CC_LUCKY_CHORD_COUNT = 8; // number of chords generated by I'm feeling lucky

    // Emo-style flavour extensions per diatonic degree (I, ii, iii, IV, V, vi, vii°),
    // adapted from ChordCanvas ideas.
    const CC_EMO_EXTENSIONS = [
        ['', 'add2', 'add4', 'add9', 'maj7', 'maj9', 'maj13'], // I (no maj11 per product preference)
        ['', '7', '9', '11', '13'],                                     // ii (minor)
        ['', '7', '9', '11', '13'],                                     // iii (minor)
        ['', 'add2', 'add9', 'maj7', 'maj9', 'maj13'],                  // IV (major)
        ['', 'sus2', 'sus4', 'add13', '13', '7sus4', '9sus4', 'maj7', 'maj9', 'maj13'], // V
        ['', '7', '9', '11', '13'],                                     // vi (minor)
        ['']                                                            // vii (keep simple)
    ];

    // Optional alternate qualities + extension palettes for some degrees
    // 2: iii as major (III), 3: IV as minor (iv), 5: vi as major (VI).
    const CC_EMO_ALT_QUALITY = {
        2: { quality: 'major', exts: ['', '7', '9'] },
        3: { quality: 'minor', exts: ['', '7', '9', '11', '13'] },
        5: { quality: 'major', exts: ['7sus4', '9sus4'] }
    };

    // Basic triad qualities per diatonic degree in major key (I–vii°).
    const CC_TRIAD_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];

    function getDiatonicRootName(keyIndex, degreeIndex) {
        const semitone = (CC_MAJOR_SEMITONES[degreeIndex] + keyIndex) % 12;
        return CC_KEY_ROOTS[semitone];
    }

    function pickSuffixForDegree(degreeIndex) {
        const entry = CC_DIATONIC_BY_DEGREE[degreeIndex];
        const useSeventh = Math.random() < CC_SEVENTH_CHANCE;
        let base;
        let ext;
        if (Array.isArray(entry[0]) && typeof entry[0][0] === 'string') {
            const pair = entry[Math.floor(Math.random() * entry.length)];
            base = pair[0];
            ext = pair[1];
        } else {
            base = entry[0];
            ext = entry[1];
        }
        if (useSeventh && ext) return ext;
        return base;
    }

    function generateRandomChordString(keyIndexOverride) {
        // Pick a key (either from override or at random), then build a 4-chord diatonic pattern with emo extensions.
        // We then repeat the same 4 bases with fresh extensions to get 8 chords total.
        let keyIndex;
        if (typeof keyIndexOverride === 'number' && keyIndexOverride >= 0 && keyIndexOverride < CC_KEY_ROOTS.length) {
            keyIndex = keyIndexOverride;
        } else {
            keyIndex = Math.floor(Math.random() * CC_KEY_ROOTS.length);
        }
        const bases = [];
        const extLists = [];

        // Diatonic degrees 0–5 only (I, ii, iii, IV, V, vi); exclude 6 (vii° dim) by request
        const CC_LUCKY_DEGREES = [0, 1, 2, 3, 4, 5];
        for (let i = 0; i < 4; i += 1) {
            const degreeIndex = pickRandom(CC_LUCKY_DEGREES);
            const root = getDiatonicRootName(keyIndex, degreeIndex);
            const defaultQuality = CC_TRIAD_QUALITIES[degreeIndex] || '';
            let baseTriad = root + defaultQuality;

            const altCfg = CC_EMO_ALT_QUALITY[degreeIndex] || null;
            const useAlt = !!altCfg && Math.random() < 0.5;
            let extArr;

            if (useAlt && altCfg) {
                if (altCfg.quality === 'major') {
                    // Force major quality: drop simple 'm' or 'dim' suffix.
                    baseTriad = root;
                } else if (altCfg.quality === 'minor') {
                    // Force minor quality: if not already minor or dim, append 'm'.
                    if (!/m$|dim$/i.test(baseTriad)) {
                        baseTriad = root + 'm';
                    }
                }
                extArr = altCfg.exts || [''];
            } else {
                extArr = CC_EMO_EXTENSIONS[degreeIndex] || [''];
            }

            bases.push(baseTriad);
            extLists.push(extArr);
        }

        const chords = [];

        // First pass: bases with one random extension each.
        for (let j = 0; j < 4; j += 1) {
            const ext0 = pickRandom(extLists[j] || ['']);
            chords.push(ext0 ? (bases[j] + ext0) : bases[j]);
        }

        // Second pass: same bases again with fresh extensions.
        for (let k = 0; k < 4; k += 1) {
            const extArr = extLists[k] || [''];
            const ext = pickRandom(extArr);
            chords.push(ext ? (bases[k] + ext) : bases[k]);
        }

        // Ensure we respect the global lucky chord count (defaults to 8).
        return {
            keyIndex,
            chordString: chords.slice(0, CC_LUCKY_CHORD_COUNT).join(', ')
        };
    }

    function setElValue(id, value) {
        if (id === 'cc-chord-input') {
            const ta = getActiveChordTextarea();
            if (ta) ta.value = String(value);
            return;
        }
        const el = document.getElementById(id);
        if (!el) return;
        el.value = String(value);
    }

    function getChordRowsContainer() {
        return document.getElementById('cc-chord-rows');
    }

    function getChordRows() {
        const container = getChordRowsContainer();
        if (!container) return [];
        return Array.from(container.querySelectorAll('.cc-chord-row'));
    }

    function getChordTextareas() {
        return getChordRows().map((row) => row.querySelector('.cc-chord-input'));
    }

    function getActiveChordTextarea() {
        const rows = getChordRows();
        const idx = Math.min(lastFocusedChordIndex, Math.max(0, rows.length - 1));
        const row = rows[idx];
        return row ? row.querySelector('.cc-chord-input') : null;
    }

    function getActiveChordsText() {
        const ta = getActiveChordTextarea();
        return ta ? ta.value : '';
    }

    function getChordTextareaForRow(rowIndex) {
        const rows = getChordRows();
        const row = rows[rowIndex];
        return row ? row.querySelector('.cc-chord-input') : null;
    }

    /** Build chord line with a temporary space before the chord at chordIndex (0-based) to show which chord is playing. chordIndex null = clean string. */
    function buildChordDisplayWithIndicator(cleanChordsText, chordIndex) {
        if (chordIndex == null || typeof chordIndex !== 'number' || chordIndex < 0) return cleanChordsText || '';
        const parts = (cleanChordsText || '').split(',').map(function (s) { return s.trim(); });
        if (chordIndex >= parts.length) return cleanChordsText || '';
        parts[chordIndex] = '\u00A0' + parts[chordIndex];
        return parts.join(', ');
    }

    /** Set the playing-chord indicator for a specific row (space before chord at chordIndex). Uses captured row/clean so the last chord of a row doesn't get drawn on the next row after chaining. */
    function setChordPlayingIndicatorForRow(chordIndex, rowIndex, cleanText) {
        var ta = getChordTextareaForRow(rowIndex);
        if (ta) ta.value = buildChordDisplayWithIndicator(cleanText, chordIndex);
    }

    /** Clear indicator and restore textarea (only on user stop). Uses window._ccPlayingChordRowIndex and _ccPlayingChordTextClean. */
    function setChordPlayingIndicator(chordIndex) {
        if (chordIndex != null) return;
        var rowIndex = typeof window._ccPlayingChordRowIndex === 'number' ? window._ccPlayingChordRowIndex : null;
        var clean = window._ccPlayingChordTextClean;
        var ta = rowIndex != null ? getChordTextareaForRow(rowIndex) : null;
        if (ta && clean != null) ta.value = clean;
        delete window._ccPlayingChordRowIndex;
        delete window._ccPlayingChordTextClean;
    }

    function setActiveChordsText(value) {
        const ta = getActiveChordTextarea();
        if (ta) ta.value = String(value);
    }

    /** Transpose a chord string (e.g. "C, Am, F, G7") by deltaSemitones (+1 up, -1 down). */
    function transposeChordString(str, deltaSemitones) {
        if (!str || typeof str !== 'string') return str;
        const parts = str.split(',').map((s) => s.trim());
        const out = [];
        const re = /^([A-Ga-g][#b]?)(.*)$/;
        for (let i = 0; i < parts.length; i += 1) {
            const token = parts[i];
            const m = token.match(re);
            if (!m) { out.push(token); continue; }
            const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
            const suffix = m[2] || '';
            const semitone = CC_ROOT_TO_SEMITONE[root];
            if (semitone === undefined) { out.push(token); continue; }
            const newSemitone = (semitone + deltaSemitones + 12) % 12;
            const newRoot = CC_KEY_ROOTS[newSemitone];
            out.push(newRoot + suffix);
        }
        return out.join(', ');
    }

    function getFocusedRowColorIndex() {
        const container = getChordRowsContainer();
        if (!container) return 0;
        const row = container.querySelector('.cc-chord-row.focused') || getChordRows()[lastFocusedChordIndex];
        if (!row) return 0;
        const i = parseInt(row.getAttribute('data-color-index'), 10);
        return Number.isFinite(i) ? (i % CC_CHORD_COLORS.length) : 0;
    }

    function applyActiveColor(colorIndex) {
        const container = getChordRowsContainer();
        const dockInner = document.querySelector('.cc-dock-inner');
        const c = CC_CHORD_COLORS[Math.min(colorIndex, CC_CHORD_COLORS.length - 1)] || CC_CHORD_COLORS[0];
        if (container) {
            container.style.setProperty('--cc-accent', c.main);
            container.style.setProperty('--cc-accent-shadow', c.shadow);
            container.style.setProperty('--cc-row-bg', c.rowBg);
            container.style.setProperty('--cc-btn-bg', 'rgba(255,255,255,0.96)');
        }
        if (dockInner) {
            dockInner.style.setProperty('--cc-accent', c.main);
            dockInner.style.setProperty('--cc-tab-active-bg', c.tabBg || c.rowBg);
            dockInner.style.setProperty('--cc-tab-active-border', c.tabBorder || c.main);
        }
        if (document.body) {
            document.body.style.setProperty('--cc-accent', c.main);
        }
    }

    function updateChordRowButtons() {
        /* No +/− buttons; Add/Delete shown from drag-handle tap menu */
    }

    function reindexChordRows() {
        getChordRows().forEach((row, i) => {
            row.setAttribute('data-index', String(i));
            const ta = row.querySelector('.cc-chord-input');
            if (ta) ta.setAttribute('data-index', String(i));
        });
    }

    function addChordRowAfter(index, persistCb) {
        const container = getChordRowsContainer();
        if (!container) return;
        const rows = getChordRows();
        if (rows.length >= CC_CHORD_MAX_ROWS) return;
        ensureRowSoundStateLength(rows.length);
        const colorIndex = rows.length % CC_CHORD_COLORS.length;
        const row = document.createElement('div');
        row.className = 'cc-chord-row';
        row.setAttribute('data-index', String(index + 1));
        row.setAttribute('data-color-index', String(colorIndex));
        row.innerHTML = '<div class="cc-chord-row-drag" draggable="true" title="Tap: Add/Delete · Drag: reorder" aria-label="Tap for options or drag to reorder">⋮</div><div class="cc-chord-input-wrap"><textarea class="cc-chord-input" data-index="' + (index + 1) + '" maxlength="120" placeholder="Enter chords separated by commas (e.g. F,C,G,E) or click imagine"></textarea></div>';
        const next = rows[index + 1];
        if (next) {
            container.insertBefore(row, next);
        } else {
            container.appendChild(row);
        }
        reindexChordRows();
        ensureRowSettingsLength(getChordRows().length);
        rowSettings.splice(index + 1, 0, Object.assign({}, getDefaultRowSettings(), rowSettings[index] || {}));
        rowSoundState.splice(index + 1, 0, copySoundState(rowSoundState[index]));
        lastFocusedChordIndex = index + 1;
        const newRow = getChordRows()[index + 1];
        if (newRow) {
            newRow.classList.add('focused');
            getChordRows().forEach((r, i) => { if (i !== index + 1) r.classList.remove('focused'); });
            applyRowSettingsToUi(rowSettings[index + 1]);
            const ta = newRow.querySelector('.cc-chord-input');
            if (ta) { ta.focus(); applyActiveColor(parseInt(newRow.getAttribute('data-color-index'), 10) % CC_CHORD_COLORS.length); }
        }
        updateChordRowButtons();
        if (typeof persistCb === 'function') persistCb();
    }

    function removeChordRow(index, persistCb) {
        const rows = getChordRows();
        if (rows.length <= 1) return;
        const row = rows[index];
        if (!row) return;
        row.remove();
        reindexChordRows();
        rowSettings.splice(index, 1);
        rowSoundState.splice(index, 1);
        lastFocusedChordIndex = Math.min(index, Math.max(0, getChordRows().length - 1));
        const newActive = getChordRows()[lastFocusedChordIndex];
        if (newActive) {
            newActive.classList.add('focused');
            getChordRows().forEach((r, i) => { if (i !== lastFocusedChordIndex) r.classList.remove('focused'); });
            applyRowSettingsToUi(rowSettings[lastFocusedChordIndex] || getDefaultRowSettings());
            if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
            applyActiveColor(getFocusedRowColorIndex());
        }
        updateChordRowButtons();
        if (typeof persistCb === 'function') persistCb();
    }

    /** Build compiled state for PrimidiSave.buildEvents (shared event generator). */
    function buildCompiledState(state) {
        if (typeof window.ChordEngine !== 'function' || !window.CHORD_INTERVALS || !window.NOTE_TO_INDEX) {
            return null;
        }
        const engine = new window.ChordEngine({
            noteToIndex: window.NOTE_TO_INDEX,
            chordIntervals: window.CHORD_INTERVALS
        });
        const normalized = normalizeChordText(state.chordsText);
        const chordSeq = engine.parseChordSequence(normalized);
        if (!chordSeq.length) return null;

        const bpm = clampBpm(state.bpm);
        const barSeconds = (60 / bpm) * CC_CHORD_BAR_BEATS;
        const shiftSemis = 12 * (state.octaveShift || 0);
        const trebleOctaves = state.trebleOctaves === 2 ? 2 : 1;
        const bassOctaves = state.bassOctaves === 2 ? 2 : 1;
        const MIDI_MAX = 108;
        const MIDI_MIN = 21;
        const bassNotesByChord = [];
        const trebleNotesByChord = [];
        for (let i = 0; i < chordSeq.length; i += 1) {
            const all = engine.chordToMIDINotes(chordSeq[i]).map((n) => clampMidi(n + shiftSemis));
            let bass = all.slice(0, 3);
            const treble = all.slice(3); // treble octave doubling is applied after pattern in buildEvents
            if (bassOctaves === 2) {
                const lower = bass.filter((n) => n - 12 >= MIDI_MIN).map((n) => n - 12);
                bass = bass.concat(lower);
            }
            bassNotesByChord.push(bass);
            trebleNotesByChord.push(treble);
        }
        const skipPattern = Array.isArray(state.skipPattern) ? state.skipPattern : [];
        const bassSkipPattern = Array.isArray(state.bassSkipPattern) ? state.bassSkipPattern : [];
        return {
            chordCount: chordSeq.length,
            barSeconds,
            bpm,
            bassNotesByChord,
            trebleNotesByChord,
            trebleOctaves,
            bassDurationMultiplier: state.bassDurationMultiplier,
            trebleDurationMultiplier: state.trebleDurationMultiplier,
            patternMode: state.patternMode,
            bassPatternMode: state.bassPatternMode,
            skipPattern,
            bassSkipPattern,
            delayMod: state.delayMod,
            delayIntensity: state.delayIntensity,
            bassEveryBar: state.bassEveryBar,
            trebleEveryBar: state.trebleEveryBar,
            bassEveryBarIntensity: state.bassEveryBarIntensity,
            trebleEveryBarIntensity: state.trebleEveryBarIntensity,
            voicing: state.voicing,
            bassVelocity: state.bassVelocity != null ? Math.max(1, Math.min(127, state.bassVelocity)) : CC_DEFAULT_BASS_VELOCITY,
            trebleVelocity: state.trebleVelocity != null ? Math.max(1, Math.min(127, state.trebleVelocity)) : CC_DEFAULT_TREBLE_VELOCITY,
            sustainPedal: state.sustainPedal
        };
    }

    /** Schedule live playback. Optional onEnd(barSeconds). If bpm and chordCount given, fire onEnd at start of last chord (e.g. when F starts in A,F) so we get ready for next row during the last bar and next row starts exactly when this row's content ends (no 1.2s tail gap). */
    function schedulePlaybackFromEvents(bassEvents, trebleEvents, totalSeconds, onEnd, bpm, startOffsetSeconds, chordCount) {
        const ms = (s) => Math.max(0, Math.floor(s * 1000));
        const offset = Number(startOffsetSeconds) || 0;
        const barSeconds = (bpm != null && bpm > 0) ? (60 / bpm) * CC_CHORD_BAR_BEATS : 0;
        const count = (chordCount != null && chordCount > 0) ? chordCount : 0;
        const endAt = (barSeconds > 0 && count >= 1)
            ? Math.max(0, (count - 1) * barSeconds)
            : (barSeconds > 0 ? Math.max(0, totalSeconds - barSeconds) : totalSeconds);
        bassEvents.forEach((ev) => {
            const onId = setTimeout(() => {
                try { window.handleMidiNoteOn(ev.midi, ev.velocity); } catch (e) {}
                activeNotes.add(ev.midi);
            }, ms(offset + ev.time));
            timeouts.add(onId);
            const offId = setTimeout(() => {
                try { window.handleMidiNoteOff(ev.midi); } catch (e) {}
                activeNotes.delete(ev.midi);
            }, ms(offset + ev.time + ev.duration));
            timeouts.add(offId);
        });
        trebleEvents.forEach((ev) => {
            const onId = setTimeout(() => {
                try { window.handleMidiNoteOn(ev.midi, ev.velocity); } catch (e) {}
                activeNotes.add(ev.midi);
            }, ms(offset + ev.time));
            timeouts.add(onId);
            const offId = setTimeout(() => {
                try { window.handleMidiNoteOff(ev.midi); } catch (e) {}
                activeNotes.delete(ev.midi);
            }, ms(offset + ev.time + ev.duration));
            timeouts.add(offId);
        });
        const endId = setTimeout(() => {
            if (typeof onEnd === 'function') {
                onEnd(barSeconds);
            } else if (isPlaying) {
                isPlaying = false;
                showPlayButton();
                setChordRowsDisabled(false);
                allNotesOff();
            }
        }, ms(offset + endAt));
        timeouts.add(endId);
    }

    function readStateFromUi() {
        const chordsText = getActiveChordsText();
        const chordTextareas = getChordTextareas();
        const chordsTextArray = chordTextareas.map((ta) => (ta && ta.value) ? ta.value : '');
        ensureRowSettingsLength(chordTextareas.length);
        ensureRowSoundStateLength(chordTextareas.length);
        rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
        const s = rowSettings[lastFocusedChordIndex] || getDefaultRowSettings();
        return {
            chordsText,
            chordsTextArray,
            chordsLastFocusedIndex: lastFocusedChordIndex,
            settingsPerRow: rowSettings.slice(),
            soundPerRow: rowSoundState.map(copySoundState),
            bpm: s.bpm,
            bassDurationMultiplier: s.bassDurationMultiplier,
            trebleDurationMultiplier: s.trebleDurationMultiplier,
            skipPattern: s.skipPattern,
            bassSkipPattern: s.bassSkipPattern,
            trebleSkipPattern: s.trebleSkipPattern,
            patternMode: s.patternMode,
            bassPatternMode: s.bassPatternMode,
            bassVelocity: s.bassVelocity ?? CC_DEFAULT_BASS_VELOCITY,
            trebleVelocity: s.trebleVelocity ?? CC_DEFAULT_TREBLE_VELOCITY,
            octaveShift: s.octaveShift,
            voicing: s.voicing,
            trebleOctaves: s.trebleOctaves,
            bassOctaves: s.bassOctaves,
            delayMod: s.delayMod,
            delayIntensity: s.delayIntensity,
            bassEveryBar: s.bassEveryBar,
            trebleEveryBar: s.trebleEveryBar,
            bassEveryBarIntensity: s.bassEveryBarIntensity,
            trebleEveryBarIntensity: s.trebleEveryBarIntensity,
            sustainPedal: s.sustainPedal
        };
    }

    function ensureRowSettingsLength(n) {
        while (rowSettings.length < n) rowSettings.push(Object.assign({}, getDefaultRowSettings(), rowSettings[rowSettings.length - 1] || {}));
        if (rowSettings.length > n) rowSettings.length = n;
    }

    function ensureRowSoundStateLength(n) {
        while (rowSoundState.length < n) rowSoundState.push(rowSoundState.length === 0 ? getDefaultSoundState(true) : copySoundState(rowSoundState[rowSoundState.length - 1]));
        if (rowSoundState.length > n) rowSoundState.length = n;
    }

    /** Show a debug overlay with this row's sound state (preset slots, volumes, etc.). */
    function showSoundDetailsForRow(rowIndex) {
        const rows = getChordRows();
        ensureRowSoundStateLength(rows.length);
        const idx = Math.max(0, Math.min(rowIndex, rowSoundState.length - 1));
        const state = rowSoundState[idx] || getDefaultSoundState();
        let overlay = document.getElementById('cc-sound-details-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'cc-sound-details-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
            const box = document.createElement('div');
            box.style.cssText = 'background:#fff;border-radius:10px;max-width:90vw;max-height:85vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:flex;flex-direction:column;';
            const title = document.createElement('div');
            title.style.cssText = 'padding:12px 16px;font-weight:600;border-bottom:1px solid #eee;';
            title.id = 'cc-sound-details-title';
            const pre = document.createElement('pre');
            pre.style.cssText = 'margin:0;padding:16px;font-size:12px;line-height:1.4;overflow:auto;flex:1;white-space:pre-wrap;word-break:break-word;';
            pre.id = 'cc-sound-details-body';
            const closeWrap = document.createElement('div');
            closeWrap.style.cssText = 'padding:12px 16px;border-top:1px solid #eee;';
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.textContent = 'Close';
            closeBtn.className = 'cc-btn cc-btn-primary';
            closeBtn.style.cssText = 'padding:6px 14px;cursor:pointer;';
            closeBtn.addEventListener('click', function () { overlay.style.display = 'none'; });
            closeWrap.appendChild(closeBtn);
            box.appendChild(title);
            box.appendChild(pre);
            box.appendChild(closeWrap);
            overlay.appendChild(box);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }
        const titleEl = overlay.querySelector('#cc-sound-details-title');
        const bodyEl = overlay.querySelector('#cc-sound-details-body');
        if (titleEl) titleEl.textContent = 'Row ' + (rowIndex + 1) + ' sound (debug)';
        if (bodyEl) bodyEl.textContent = JSON.stringify(state, null, 2);
        overlay.style.display = 'flex';
    }

    function getStateForRow(index) {
        const rows = getChordRows();
        const row = rows[index];
        const ta = row ? row.querySelector('.cc-chord-input') : null;
        const chordsText = (ta && ta.value) ? ta.value : '';
        const s = rowSettings[index] || getDefaultRowSettings();
        return {
            chordsText,
            bpm: s.bpm,
            bassDurationMultiplier: s.bassDurationMultiplier,
            trebleDurationMultiplier: s.trebleDurationMultiplier,
            skipPattern: s.skipPattern,
            bassSkipPattern: s.bassSkipPattern,
            trebleSkipPattern: s.trebleSkipPattern,
            patternMode: s.patternMode,
            bassPatternMode: s.bassPatternMode,
            bassVelocity: s.bassVelocity ?? s.velocity ?? CC_DEFAULT_BASS_VELOCITY,
            trebleVelocity: s.trebleVelocity ?? s.velocity ?? CC_DEFAULT_TREBLE_VELOCITY,
            octaveShift: s.octaveShift,
            voicing: s.voicing,
            trebleOctaves: s.trebleOctaves,
            bassOctaves: s.bassOctaves,
            delayMod: s.delayMod,
            delayIntensity: s.delayIntensity,
            bassEveryBar: s.bassEveryBar,
            trebleEveryBar: s.trebleEveryBar,
            bassEveryBarIntensity: s.bassEveryBarIntensity,
            trebleEveryBarIntensity: s.trebleEveryBarIntensity,
            sustainPedal: s.sustainPedal
        };
    }

    /** Stable JSON for credit rowHash (all rows + sound per row). */
    window.ccGetArrangementCreditString = function () {
        const rows = getChordRows();
        ensureRowSoundStateLength(rows.length);
        const rowStates = [];
        for (let i = 0; i < rows.length; i++) {
            rowStates.push(getStateForRow(i));
        }
        const sound = rowSoundState.map(function (st) {
            return {
                presets: st.presetSlots,
                vols: st.slotVolumes,
                reverb: st.reverb,
                stereoWidth: st.stereoWidth,
                nostalgia: st.nostalgia,
                rowVolume: st.rowVolume,
                soundBassEveryBar: st.soundBassEveryBar,
                soundTrebleEveryBar: st.soundTrebleEveryBar
            };
        });
        return JSON.stringify({ rows: rowStates, sound: sound });
    };

    /** Full UI snapshot for library / restore (same shape as readStateFromUi). */
    window.ccGetFullSnapshotJson = function () {
        try {
            return JSON.stringify(readStateFromUi());
        } catch (e) {
            return '{}';
        }
    };

    window.ccApplyFullState = function (state) {
        if (!state) return;
        try {
            applyStateToUi(state);
        } catch (e) {
            console.warn(e);
        }
    };

    function setChordRowsDisabled(disabled) {
        const container = getChordRowsContainer();
        if (!container) return;
        container.classList.toggle('cc-playing', !!disabled);
    }

    /** Call whenever the Stop button becomes the Play button: clears playing row style and updates label/icon. */
    function showPlayButton() {
        setPlayingRow(null);
        if (typeof window !== 'undefined') window._ccChordRowSoundModActive = false;
        const playBtn = document.getElementById('cc-play-btn');
        if (playBtn) playBtn.textContent = '▶';
    }

    function setPlayingRow(index) {
        getChordRows().forEach((r, i) => r.classList.toggle('cc-row-playing', i === index));
    }

    function applyStateToUi(state) {
        if (!state) return;
        const setIf = (id, value) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') el.value = value != null ? String(value) : '';
            if (el.tagName === 'SELECT') el.value = String(value);
        };
        if (state.chordsTextArray && Array.isArray(state.chordsTextArray) && state.chordsTextArray.length > 0) {
            const container = getChordRowsContainer();
            if (container) {
                container.innerHTML = '';
                const texts = state.chordsTextArray.slice(0, CC_CHORD_MAX_ROWS);
                texts.forEach((text, i) => {
                    const row = document.createElement('div');
                    row.className = 'cc-chord-row' + (i === (state.chordsLastFocusedIndex ?? 0) ? ' focused' : '');
                    row.setAttribute('data-index', String(i));
                    row.setAttribute('data-color-index', String(i % CC_CHORD_COLORS.length));
                    row.innerHTML = '<div class="cc-chord-row-drag" draggable="true" title="Tap: Add/Delete · Drag: reorder" aria-label="Tap for options or drag to reorder">⋮</div><div class="cc-chord-input-wrap"><textarea class="cc-chord-input" data-index="' + i + '" maxlength="120" placeholder="Enter chords separated by commas (e.g. F,C,G,E) or click imagine"></textarea></div>';
                    const ta = row.querySelector('.cc-chord-input');
                    if (ta) ta.value = String(text ?? '');
                    container.appendChild(row);
                });
                lastFocusedChordIndex = Math.min(Math.max(0, state.chordsLastFocusedIndex ?? 0), Math.max(0, getChordRows().length - 1));
                rowSettings = (state.settingsPerRow && state.settingsPerRow.length) ? state.settingsPerRow.slice(0, CC_CHORD_MAX_ROWS) : [];
                ensureRowSettingsLength(getChordRows().length);
                if (state.soundPerRow && Array.isArray(state.soundPerRow) && state.soundPerRow.length) {
                    rowSoundState = state.soundPerRow.slice(0, CC_CHORD_MAX_ROWS).map(copySoundState);
                } else {
                    rowSoundState = [];
                }
                ensureRowSoundStateLength(getChordRows().length);
                updateChordRowButtons();
                applyActiveColor(getFocusedRowColorIndex());
            }
        } else {
            const firstTa = getChordRows()[0] && getChordRows()[0].querySelector('.cc-chord-input');
            if (firstTa) firstTa.value = String(state.chordsText ?? '');
            if (!rowSettings.length) rowSettings = [state.settingsPerRow && state.settingsPerRow[0] ? state.settingsPerRow[0] : {
                bpm: state.bpm, bassDurationMultiplier: state.bassDurationMultiplier, trebleDurationMultiplier: state.trebleDurationMultiplier,
                skipPattern: state.skipPattern, patternMode: state.patternMode, bassPatternMode: state.bassPatternMode,
                bassVelocity: state.bassVelocity ?? state.velocity ?? CC_DEFAULT_BASS_VELOCITY,
                trebleVelocity: state.trebleVelocity ?? state.velocity ?? CC_DEFAULT_TREBLE_VELOCITY,
                octaveShift: state.octaveShift,
                voicing: state.voicing, trebleOctaves: state.trebleOctaves, bassOctaves: state.bassOctaves, delayMod: state.delayMod, delayIntensity: state.delayIntensity,
                bassEveryBar: state.bassEveryBar, trebleEveryBar: state.trebleEveryBar, bassEveryBarIntensity: state.bassEveryBarIntensity,
                trebleEveryBarIntensity: state.trebleEveryBarIntensity, sustainPedal: state.sustainPedal
            }];
            if (!rowSoundState.length) rowSoundState = state.soundPerRow && state.soundPerRow.length ? state.soundPerRow.slice().map(copySoundState) : [getDefaultSoundState(true)];
        }
        ensureRowSoundStateLength(getChordRows().length);
        const activeSettings = rowSettings[lastFocusedChordIndex] || getDefaultRowSettings();
        applyRowSettingsToUi(activeSettings);
        applyCurrentRowSoundToGlobalsAndPreload();
    }

    function applyCurrentRowSoundToGlobalsAndPreload() {
        ensureRowSoundStateLength(Math.max(1, getChordRows().length));
        const idx = rowSoundState.length ? Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1)) : 0;
        let soundState = rowSoundState[idx] || getDefaultSoundState();
        const hasValidPreset = soundState.presetSlots && soundState.presetSlots.some(function (s) { return s != null && String(s).trim() !== ''; });
        if (!hasValidPreset) soundState = getDefaultSoundState();
        applySoundStateToGlobals(soundState);
        if (typeof window.startBackgroundPreloadSlots === 'function') window.startBackgroundPreloadSlots();
    }

    /** Returns a Promise that resolves when the synth AudioContext is running (resumed if suspended). Mobile often keeps context suspended until user gesture; Play click is that gesture. Adapted from ChordCanvas ensureReady(). */
    function ensureSynthAudioReady() {
        const synth = typeof window !== 'undefined' && window.synth && window.synth.synth;
        if (!synth) return Promise.resolve();
        try {
            var ctx = synth.audioCtx;
            if (!ctx) return Promise.resolve();
            if (ctx.state === 'running') return Promise.resolve();
            return ctx.resume().then(function () { return undefined; }).catch(function () { return undefined; });
        } catch (e) {
            return Promise.resolve();
        }
    }

    /** Returns a Promise that resolves when presets for the given row are loaded (decode + cache). Used before Play so mobile can start with delay but no glitch. Adapted from ChordCanvas ensurePresetLoaded-before-play idea. */
    function ensureRowPresetsLoaded(rowIndex) {
        const handler = typeof window !== 'undefined' && window.InstrumentSampleHandler;
        const ctx = typeof window !== 'undefined' && window.synth && window.synth.synth && window.synth.synth.audioCtx;
        if (!handler || !ctx) return Promise.resolve();
        ensureRowSoundStateLength(Math.max(1, getChordRows().length));
        const idx = Math.max(0, Math.min(rowIndex, rowSoundState.length - 1));
        const soundState = rowSoundState[idx] || getDefaultSoundState();
        const slots = (soundState.presetSlots || []).filter(function (s) { return s != null && String(s).trim() !== ''; });
        if (!slots.length) return Promise.resolve();
        const baseUrl = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : '';
        const base = (baseUrl || '').replace(/\/[^/]*$/, '/');
        const loadPromises = slots.map(function (preset) { return handler.ensurePresetLoaded(ctx, preset, base); });
        const all = Promise.all(loadPromises);
        const timeoutMs = 4000;
        const timeout = new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error('Preload timeout')); }, timeoutMs);
        });
        return Promise.race([all, timeout]).catch(function () { /* continue to play even if preload fails or times out */ });
    }

    /** Preload presets for the next row (and one after) in background so when we chain to the next row, samples are ready. Adapted from ChordCanvas n-items-ahead prebake idea. */
    function startNextRowPresetPreload(currentRowIndex) {
        const rows = getChordRows();
        if (!rows.length) return;
        [currentRowIndex + 1, currentRowIndex + 2].forEach(function (nextIndex) {
            if (nextIndex < 0 || nextIndex >= rows.length) return;
            ensureRowPresetsLoaded(nextIndex).catch(function () {});
        });
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STATE);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function saveState(state) {
        // Persistence disabled: do not remember state across visits.
    }

    function playChordSequenceWithSettings(state, onEnd, chain, startOffsetSeconds, rowIndex) {
        if (typeof window.ChordEngine !== 'function') {
            alert('Chord engine not loaded yet.');
            return;
        }
        if (typeof window.handleMidiNoteOn !== 'function' || typeof window.handleMidiNoteOff !== 'function') {
            alert('Piano is not ready yet.');
            return;
        }
        if (!window.CHORD_INTERVALS || !window.NOTE_TO_INDEX) {
            alert('Chord intervals not loaded yet.');
            return;
        }
        if (typeof window.PrimidiSave === 'undefined' || typeof window.PrimidiSave.buildEvents !== 'function') {
            alert('Save library not loaded yet.');
            return;
        }

        const offsetSec = (startOffsetSeconds != null && Number(startOffsetSeconds) >= 0) ? Number(startOffsetSeconds) : 0;
        const delaySoundApplyMs = (chain && offsetSec > 0) ? Math.max(0, Math.round(offsetSec * 1000)) : 0;

        if (rowIndex != null && Number.isFinite(rowIndex)) {
            const rows = getChordRows();
            ensureRowSoundStateLength(rows.length);
            const idx = Math.max(0, Math.min(rowIndex, rowSoundState.length - 1));
            let soundState = rowSoundState[idx] || getDefaultSoundState();
            const hasValidPreset = soundState.presetSlots && soundState.presetSlots.some(function (s) { return s != null && String(s).trim() !== ''; });
            if (!hasValidPreset) soundState = getDefaultSoundState();
            function applyRowSound() {
                applySoundStateToGlobals(soundState);
                if (typeof window !== 'undefined') window._ccChordRowSoundModActive = true;
                if (typeof window.startBackgroundPreloadSlots === 'function') window.startBackgroundPreloadSlots();
            }
            if (delaySoundApplyMs > 0) {
                const soundTimeoutId = setTimeout(applyRowSound, delaySoundApplyMs);
                timeouts.add(soundTimeoutId);
            } else {
                applyRowSound();
            }
        }

        const compiled = buildCompiledState(state);
        if (!compiled) {
            if (!chain) {
                isPlaying = false;
                showPlayButton();
                setChordRowsDisabled(false);
                alert('Please enter at least one chord before playing.');
            } else if (typeof onEnd === 'function') {
                onEnd();
            }
            return;
        }

        if (!chain) {
            clearTimeouts();
            allNotesOff();
            setPlayingRow(lastFocusedChordIndex);
            if (typeof window.handleMidiControlChange === 'function') {
                window.handleMidiControlChange(64, 0);
            }
            if (typeof window !== 'undefined') {
                window.primidiGlobalTimeOrigin = performance.now() / 1000;
            }
        }

        const { bassEvents, trebleEvents, totalSeconds } = window.PrimidiSave.buildEvents(compiled);
        schedulePlaybackFromEvents(bassEvents, trebleEvents, totalSeconds, onEnd, compiled.bpm, offsetSec, compiled.chordCount);

        var playingRowIndex = (rowIndex != null && Number.isFinite(rowIndex)) ? rowIndex : lastFocusedChordIndex;
        var barSeconds = (compiled.bpm > 0) ? (60 / compiled.bpm) * CC_CHORD_BAR_BEATS : 0;
        var chordCount = (compiled.chordCount != null && compiled.chordCount > 0) ? compiled.chordCount : 0;
        var endAt = (barSeconds > 0 && chordCount >= 1)
            ? Math.max(0, (chordCount - 1) * barSeconds)
            : (barSeconds > 0 ? Math.max(0, totalSeconds - barSeconds) : totalSeconds);
        if (chordCount > 0 && barSeconds > 0) {
            window._ccPlayingChordRowIndex = playingRowIndex;
            window._ccPlayingChordTextClean = state.chordsText || '';
            var cleanForThisRow = state.chordsText || '';
            var ms = function (s) { return Math.max(0, Math.floor(s * 1000)); };
            for (var k = 0; k < chordCount; k += 1) {
                (function (idx) {
                    var id = setTimeout(function () {
                        setChordPlayingIndicatorForRow(idx, playingRowIndex, cleanForThisRow);
                    }, ms(offsetSec + idx * barSeconds));
                    timeouts.add(id);
                })(k);
            }
            var clearAt = offsetSec + endAt + barSeconds;
            var clearId = setTimeout(function () {
                var ta = getChordTextareaForRow(playingRowIndex);
                if (ta) ta.value = cleanForThisRow;
            }, ms(clearAt));
            timeouts.add(clearId);
        }

        if (state.sustainPedal && typeof window.PrimidiSave.buildSustainPedalEvents === 'function' && typeof window.handleMidiControlChange === 'function') {
            const pedalEvents = window.PrimidiSave.buildSustainPedalEvents(compiled);
            const ms = (s) => Math.max(0, Math.floor(s * 1000));
            pedalEvents.forEach((ev) => {
                const id = setTimeout(() => {
                    try { window.handleMidiControlChange(64, ev.down ? 127 : 0); } catch (e) {}
                }, ms(offsetSec + ev.time));
                timeouts.add(id);
            });
            const releaseAtEndId = setTimeout(() => {
                try { if (typeof window.handleMidiControlChange === 'function') window.handleMidiControlChange(64, 0); } catch (e) {}
            }, ms(offsetSec + totalSeconds));
            timeouts.add(releaseAtEndId);
        }
    }

    function stopPlayingAndEnableUi() {
        isPlaying = false;
        showPlayButton();
        setChordRowsDisabled(false);
        allNotesOff();
    }

    function playNextRowOrStop(barSeconds) {
        if (!isPlaying) return;
        const rows = getChordRows();
        const nextIndex = lastFocusedChordIndex + 1;
        if (nextIndex >= rows.length) {
            // Loop playback: after the last row, wrap back to row 0 and continue
            const loopIndex = 0;
            lastFocusedChordIndex = loopIndex;
            getChordRows().forEach((r, i) => { r.classList.toggle('focused', i === loopIndex); });
            applyRowSettingsToUi(rowSettings[loopIndex] || getDefaultRowSettings());
            if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
            const state = getStateForRow(loopIndex);
            const delaySecLoop = (barSeconds != null && barSeconds > 0) ? barSeconds : 0;
            playChordSequenceWithSettings(state, playNextRowOrStop, true, delaySecLoop, loopIndex);
            startNextRowPresetPreload(loopIndex);
            const ms = (s) => Math.max(0, Math.floor(s * 1000));
            const id = setTimeout(() => setPlayingRow(loopIndex), ms(delaySecLoop));
            timeouts.add(id);
            return;
        }
        lastFocusedChordIndex = nextIndex;
        getChordRows().forEach((r, i) => { r.classList.toggle('focused', i === nextIndex); });
        applyRowSettingsToUi(rowSettings[nextIndex] || getDefaultRowSettings());
        if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
        const state = getStateForRow(nextIndex);
        const delaySec = (barSeconds != null && barSeconds > 0) ? barSeconds : 0;
        playChordSequenceWithSettings(state, playNextRowOrStop, true, delaySec, nextIndex);
        startNextRowPresetPreload(nextIndex);
        const ms = (s) => Math.max(0, Math.floor(s * 1000));
        const id = setTimeout(() => setPlayingRow(nextIndex), ms(delaySec));
        timeouts.add(id);
    }

    /** Play the chord at cursor (the one being typed) as 1/16-note preview. Simple piano, no effects. */
    function previewChordOnInput() {
        if (typeof window.ChordEngine !== 'function' || !window.CHORD_INTERVALS || !window.NOTE_TO_INDEX ||
            typeof window.handleMidiNoteOn !== 'function' || typeof window.handleMidiNoteOff !== 'function') return;
        const rows = getChordRows();
        const idx = Math.max(0, Math.min(lastFocusedChordIndex, rows.length - 1));
        const ta = rows[idx] && rows[idx].querySelector('.cc-chord-input');
        if (!ta || !ta.value.trim()) return;
        const text = String(ta.value);
        const cursor = typeof ta.selectionStart === 'number' ? ta.selectionStart : text.length;
        const segments = text.split(/[,|]/);
        let pos = 0;
        let chordAtCursor = '';
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segLen = seg.length + (i < segments.length - 1 ? 1 : 0);
            if (cursor >= pos && cursor <= pos + segLen) {
                chordAtCursor = seg.replace(/\s+/g, ' ').trim();
                break;
            }
            pos += segLen;
        }
        if (!chordAtCursor) chordAtCursor = (segments[segments.length - 1] || '').replace(/\s+/g, ' ').trim();
        if (!chordAtCursor) return;
        const engine = new window.ChordEngine({ noteToIndex: window.NOTE_TO_INDEX, chordIntervals: window.CHORD_INTERVALS });
        const parsed = engine.parseChord(chordAtCursor);
        if (!parsed) return;
        const midiNotes = engine.chordToMIDINotes(parsed).map((n) => clampMidi(n));
        if (!midiNotes.length) return;
        const bpmEl = document.getElementById('cc-row-bpm');
        const bpm = clampBpm(bpmEl ? bpmEl.value : (typeof window.gslBpm === 'number' ? window.gslBpm : 120));
        const durationSec = 60 / (bpm * 4);
        const velocity = 40;
        midiNotes.forEach((midi) => { try { window.handleMidiNoteOn(midi, velocity); } catch (e) {} });
        setTimeout(function () {
            midiNotes.forEach((midi) => { try { window.handleMidiNoteOff(midi); } catch (e) {} });
        }, Math.max(50, Math.floor(durationSec * 1000)));
    }

    function previewChordOnInputDebounced() {
        if (chordPreviewDebounceId != null) clearTimeout(chordPreviewDebounceId);
        chordPreviewDebounceId = setTimeout(function () {
            chordPreviewDebounceId = null;
            previewChordOnInput();
        }, 340);
    }

    function init() {
        const playBtn = document.getElementById('cc-play-btn');
        if (!playBtn) return;

        const chordContainer = getChordRowsContainer();
        if (chordContainer) {
            if (!document.getElementById('cc-drag-row-menu')) {
                const menu = document.createElement('div');
                menu.id = 'cc-drag-row-menu';
                menu.className = 'cc-drag-row-menu';
                menu.setAttribute('role', 'menu');
                menu.innerHTML = '<button type="button" data-action="add" role="menuitem">Add row</button><button type="button" data-action="delete" role="menuitem">Delete row</button><button type="button" data-action="transpose-down" role="menuitem">− semitone</button><button type="button" data-action="transpose-up" role="menuitem">+ semitone</button>';
                document.body.appendChild(menu);
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const menu = document.getElementById('cc-drag-row-menu');
                    if (menu && menu.classList.contains('visible')) closeDragRowMenu();
                }
            });
            chordContainer.addEventListener('focusin', (e) => {
                const ta = e.target && e.target.closest && e.target.closest('.cc-chord-input');
                if (!ta) return;
                const row = ta.closest('.cc-chord-row');
                if (!row) return;
                const idx = parseInt(row.getAttribute('data-index'), 10);
                if (!Number.isFinite(idx)) return;
                ensureRowSettingsLength(getChordRows().length);
                rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                lastFocusedChordIndex = idx;
                getChordRows().forEach((r, i) => { r.classList.toggle('focused', i === idx); });
                applyRowSettingsToUi(rowSettings[idx] || getDefaultRowSettings());
                ensureRowSoundStateLength(getChordRows().length);
                applySoundStateToGlobals(rowSoundState[idx] || getDefaultSoundState());
                syncSoundPanelFromFocusedRow();
                if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
                applyActiveColor(getFocusedRowColorIndex());
            });
            function focusRowFromDragHandle(row) {
                const ta = row && row.querySelector('.cc-chord-input');
                if (!ta) return;
                const idx = parseInt(row.getAttribute('data-index'), 10);
                if (!Number.isFinite(idx)) return;
                ensureRowSettingsLength(getChordRows().length);
                rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                lastFocusedChordIndex = idx;
                getChordRows().forEach((r, i) => { r.classList.toggle('focused', i === idx); });
                applyRowSettingsToUi(rowSettings[idx] || getDefaultRowSettings());
                ensureRowSoundStateLength(getChordRows().length);
                applySoundStateToGlobals(rowSoundState[idx] || getDefaultSoundState());
                syncSoundPanelFromFocusedRow();
                if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
                ta.focus();
                applyActiveColor(getFocusedRowColorIndex());
            }
            const TAP_MS = 200;
            let dragHandleTapDownTime = 0;
            let dragHandleTapPending = false;
            let dragHandleTapRow = null;

            function closeDragRowMenu() {
                const menu = document.getElementById('cc-drag-row-menu');
                if (menu) menu.classList.remove('visible');
                document.removeEventListener('mousedown', dragRowMenuOutsideClick);
                document.removeEventListener('touchstart', dragRowMenuOutsideClick);
            }
            function dragRowMenuOutsideClick(e) {
                const menu = document.getElementById('cc-drag-row-menu');
                if (!menu || !menu.classList.contains('visible')) return;
                if (menu.contains(e.target)) return;
                closeDragRowMenu();
            }
            function showDragRowMenu(row) {
                const handle = row && row.querySelector('.cc-chord-row-drag');
                if (!handle) return;
                const menu = document.getElementById('cc-drag-row-menu');
                if (!menu) return;
                const idx = parseInt(row.getAttribute('data-index'), 10);
                if (!Number.isFinite(idx)) return;
                const rows = getChordRows();
                const atMax = rows.length >= CC_CHORD_MAX_ROWS;
                const canRemove = rows.length > 1;
                const addBtn = menu.querySelector('[data-action="add"]');
                const delBtn = menu.querySelector('[data-action="delete"]');
                const transposeDownBtn = menu.querySelector('[data-action="transpose-down"]');
                const transposeUpBtn = menu.querySelector('[data-action="transpose-up"]');
                if (addBtn) { addBtn.disabled = atMax; addBtn.onclick = () => { addChordRowAfter(idx, () => saveState(readStateFromUi())); closeDragRowMenu(); }; }
                if (delBtn) { delBtn.disabled = !canRemove; delBtn.onclick = () => { removeChordRow(idx, () => saveState(readStateFromUi())); closeDragRowMenu(); }; }
                if (transposeDownBtn) { transposeDownBtn.onclick = () => { const row = getChordRows()[idx]; const ta = row && row.querySelector('.cc-chord-input'); if (ta) { ta.value = transposeChordString(ta.value, -1); saveState(readStateFromUi()); } closeDragRowMenu(); }; }
                if (transposeUpBtn) { transposeUpBtn.onclick = () => { const row = getChordRows()[idx]; const ta = row && row.querySelector('.cc-chord-input'); if (ta) { ta.value = transposeChordString(ta.value, 1); saveState(readStateFromUi()); } closeDragRowMenu(); }; }
                const rect = handle.getBoundingClientRect();
                menu.style.left = rect.left + 'px';
                menu.style.top = (rect.top - 2) + 'px';
                menu.style.transform = 'translateY(-100%)';
                menu.classList.add('visible');
                setTimeout(() => {
                    document.addEventListener('mousedown', dragRowMenuOutsideClick);
                    document.addEventListener('touchstart', dragRowMenuOutsideClick);
                }, 0);
            }

            chordContainer.addEventListener('pointerdown', (e) => {
                const dragHandle = e.target && e.target.closest && e.target.closest('.cc-chord-row-drag');
                if (dragHandle) {
                    focusRowFromDragHandle(dragHandle.closest('.cc-chord-row'));
                    dragHandleTapDownTime = Date.now();
                    dragHandleTapPending = true;
                    dragHandleTapRow = dragHandle.closest('.cc-chord-row');
                }
            });
            chordContainer.addEventListener('pointerup', (e) => {
                const dragHandle = e.target && e.target.closest && e.target.closest('.cc-chord-row-drag');
                if (!dragHandle || !dragHandleTapPending || !dragHandleTapRow) return;
                const elapsed = Date.now() - dragHandleTapDownTime;
                if (elapsed < TAP_MS) showDragRowMenu(dragHandleTapRow);
                dragHandleTapPending = false;
                dragHandleTapRow = null;
            });
            chordContainer.addEventListener('pointercancel', () => {
                dragHandleTapPending = false;
                dragHandleTapRow = null;
            });
            chordContainer.addEventListener('touchstart', (e) => {
                const dragHandle = e.target && e.target.closest && e.target.closest('.cc-chord-row-drag');
                if (dragHandle) {
                    focusRowFromDragHandle(dragHandle.closest('.cc-chord-row'));
                }
            }, { passive: true });
            chordContainer.addEventListener('dragstart', (e) => {
                const handle = e.target && e.target.closest && e.target.closest('.cc-chord-row-drag');
                if (handle) dragHandleTapPending = false;
            });
            chordContainer.addEventListener('input', (e) => {
                saveState(readStateFromUi()); if (e.target && e.target.closest && e.target.closest('.cc-chord-input')) { previewChordOnInputDebounced(); }
            });
            chordContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('.cc-chord-input')) e.preventDefault();
            });
            chordContainer.addEventListener('dragstart', (e) => {
                const handle = e.target && e.target.closest && e.target.closest('.cc-chord-row-drag');
                if (!handle) return;
                const row = handle.closest('.cc-chord-row');
                if (!row) return;
                dragChordRow = row;
                e.dataTransfer.setData('text/plain', '0');
                e.dataTransfer.effectAllowed = 'move';
            });
            chordContainer.addEventListener('dragend', () => {
                dragChordRow = null;
            });
            chordContainer.addEventListener('dragover', (e) => {
                if (!(e.target && e.target.closest && (e.target.closest('.cc-chord-row') || e.target === chordContainer))) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!dragChordRow) return;
                const container = getChordRowsContainer();
                if (!container) return;
                const rows = getChordRows();
                const sourcePos = rows.indexOf(dragChordRow);
                if (sourcePos === -1) return;
                const y = (e.clientY != null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                let targetPos = -1;
                for (let i = 0; i < rows.length; i++) {
                    const rect = rows[i].getBoundingClientRect();
                    if (y >= rect.top && y <= rect.bottom) {
                        targetPos = i;
                        break;
                    }
                }
                if (targetPos === -1) {
                    if (rows.length > 0 && y < rows[0].getBoundingClientRect().top) targetPos = 0;
                    else if (rows.length > 0) targetPos = rows.length - 1;
                }
                if (targetPos === -1 || sourcePos === targetPos) return;
                const order = rows.slice();
                order[sourcePos] = order[targetPos];
                order[targetPos] = dragChordRow;
                order.forEach((r) => container.appendChild(r));
                const t = rowSettings[sourcePos];
                rowSettings[sourcePos] = rowSettings[targetPos];
                rowSettings[targetPos] = t;
                const ts = rowSoundState[sourcePos];
                rowSoundState[sourcePos] = rowSoundState[targetPos];
                rowSoundState[targetPos] = ts;
            });
            chordContainer.addEventListener('drop', (e) => {
                if (!(e.target && e.target.closest && e.target.closest('.cc-chord-row'))) return;
                e.preventDefault();
                dragChordRow = null;
                const container = getChordRowsContainer();
                if (!container) return;
                reindexChordRows();
                const focusedRow = container.querySelector('.cc-chord-row.focused');
                if (focusedRow) {
                    const newRows = getChordRows();
                    const newIdx = newRows.indexOf(focusedRow);
                    if (newIdx >= 0) lastFocusedChordIndex = newIdx;
                }
                updateChordRowButtons();
                applyActiveColor(getFocusedRowColorIndex());
                saveState(readStateFromUi());
            });
        }
        updateChordRowButtons();
        applyActiveColor(getFocusedRowColorIndex());

        // Build dropdown options like ChordCanvas (labels depend on BPM).
        const bpmEl = document.getElementById('cc-row-bpm');
        const bassSel = document.getElementById('cc-bass-rhythm');
        const trebleSel = document.getElementById('cc-treble-rhythm');
        const bassSkip1 = document.getElementById('cc-bass-skip1');
        const bassSkip2 = document.getElementById('cc-bass-skip2');
        const bassSkip3 = document.getElementById('cc-bass-skip3');
        const skip1 = document.getElementById('cc-skip1');
        const skip2 = document.getElementById('cc-skip2');
        const skip3 = document.getElementById('cc-skip3');

        const rebuildRhythmOptions = (clampInput) => {
            const bpm = clampBpm(bpmEl ? bpmEl.value : CC_DEFAULT_BPM);
            if (clampInput && bpmEl) bpmEl.value = String(bpm);
            const rhythmOpts = buildRhythmOptionsForBpm(bpm);
            const prevBass = bassSel ? bassSel.value : null;
            const prevTreble = trebleSel ? trebleSel.value : null;
            setSelectOptionsHtml(bassSel, rhythmOpts.map((o) => o.cloneNode(true)));
            setSelectOptionsHtml(trebleSel, rhythmOpts.map((o) => o.cloneNode(true)));
            if (bassSel) bassSel.value = prevBass && CC_DURATION_MULTIPLIERS.includes(parseInt(prevBass, 10)) ? prevBass : String(60);
            if (trebleSel) trebleSel.value = prevTreble && CC_DURATION_MULTIPLIERS.includes(parseInt(prevTreble, 10)) ? prevTreble : String(30);
        };
        rebuildRhythmOptionsRef = rebuildRhythmOptions;
        const skipOpts = buildSkipOptions();
        setSelectOptionsHtml(bassSkip1, skipOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(bassSkip2, skipOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(bassSkip3, skipOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(skip1, skipOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(skip2, skipOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(skip3, skipOpts.map((o) => o.cloneNode(true)));
        if (bassSkip1) bassSkip1.value = '0';
        if (bassSkip2) bassSkip2.value = '0';
        if (bassSkip3) bassSkip3.value = '0';
        if (skip1) skip1.value = '2';
        if (skip2) skip2.value = '8';
        if (skip3) skip3.value = '0';
        rebuildRhythmOptions();

        // Human tab selects (match getDefaultRowSettings)
        const bassEveryBarEl = document.getElementById('cc-bass-everybar');
        const trebleEveryBarEl = document.getElementById('cc-treble-everybar');
        const volOpts = buildVolumeModOptions();
        setSelectOptionsHtml(bassEveryBarEl, volOpts.map((o) => o.cloneNode(true)));
        setSelectOptionsHtml(trebleEveryBarEl, volOpts.map((o) => o.cloneNode(true)));
        if (bassEveryBarEl) bassEveryBarEl.value = '2valley';
        if (trebleEveryBarEl) trebleEveryBarEl.value = 'hill';

        // Do not restore saved state; start fresh each visit.
        ensureRowSettingsLength(getChordRows().length);
        ensureRowSoundStateLength(Math.max(1, getChordRows().length));
        applyRowSettingsToUi(rowSettings[lastFocusedChordIndex] || getDefaultRowSettings());
        updateChordRowButtons();
        applyActiveColor(getFocusedRowColorIndex());
        applyCurrentRowSoundToGlobalsAndPreload();

        const firstRow = getChordRows()[0];
        const firstTa = firstRow && firstRow.querySelector('.cc-chord-input');
        if (firstTa) {
            setTimeout(function () { firstTa.focus(); }, 0);
        }

        // Persist on edits (chord rows use delegated input on container)
        const persist = () => saveState(readStateFromUi());
        [
            'cc-row-bpm', 'cc-bass-rhythm', 'cc-treble-rhythm',
            'cc-bass-skip1', 'cc-bass-skip2', 'cc-bass-skip3',
            'cc-skip1', 'cc-skip2', 'cc-skip3',
            'cc-pattern-mode', 'cc-bass-pattern-mode', 'cc-bass-velocity', 'cc-treble-velocity', 'cc-octave-shift', 'cc-voicing', 'cc-double-treble', 'cc-double-bass'
            , 'cc-delay-mod', 'cc-bass-everybar', 'cc-bass-everybar-intensity', 'cc-treble-everybar', 'cc-treble-everybar-intensity', 'cc-sustain-pedal'
        ].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const evt = (el.tagName === 'SELECT') ? 'change' : (el.type === 'checkbox' ? 'change' : 'input');
            el.addEventListener(evt, persist);
        });
        var rowBpmEl = document.getElementById('cc-row-bpm');
        if (rowBpmEl) {
            rowBpmEl.addEventListener('input', function () {
                rebuildRhythmOptions(false);
                if (typeof window !== 'undefined') window.gslBpm = clampBpm(rowBpmEl.value);
            });
            rowBpmEl.addEventListener('change', function () {
                rebuildRhythmOptions(true);
                if (typeof window !== 'undefined') window.gslBpm = clampBpm(rowBpmEl.value);
            });
            rowBpmEl.addEventListener('blur', function () {
                var clamped = clampBpm(rowBpmEl.value);
                if (Number(rowBpmEl.value) !== clamped) rowBpmEl.value = String(clamped);
                rebuildRhythmOptions(true);
                if (typeof window !== 'undefined') window.gslBpm = clamped;
                saveState(readStateFromUi());
            });
        }

        function beginPlaybackAfterCredit() {
            const state = readStateFromUi();
            if (state.chordsTextArray && state.chordsTextArray.some(function (t) { return !String(t || '').trim(); })) {
                alert('Please enter at least one chord in every row before playing.');
                return;
            }
            playSessionId += 1;
            isPlaying = true;
            try { window.dispatchEvent(new CustomEvent('cc-chords-started')); } catch (e) {}
            playBtn.textContent = '⏹';
            setChordRowsDisabled(true);
            saveState(state);
            ensureSynthAudioReady().then(function () {
                return ensureRowPresetsLoaded(lastFocusedChordIndex);
            }).then(function () {
                if (!isPlaying) return;
                playChordSequenceWithSettings(state, playNextRowOrStop, undefined, CC_PRELOAD_DELAY_SECONDS, lastFocusedChordIndex);
                startNextRowPresetPreload(lastFocusedChordIndex);
            }).catch(function () {
                if (!isPlaying) return;
                playChordSequenceWithSettings(state, playNextRowOrStop, undefined, CC_PRELOAD_DELAY_SECONDS, lastFocusedChordIndex);
                startNextRowPresetPreload(lastFocusedChordIndex);
            });
        }

        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                playSessionId += 1;
                isPlaying = false;
                clearTimeouts();
                setChordPlayingIndicator(null);
                if (typeof window.releaseAllNotes === 'function') {
                    window.releaseAllNotes();
                    activeNotes.clear();
                } else {
                    if (typeof window.handleMidiControlChange === 'function') {
                        window.handleMidiControlChange(64, 0);
                    }
                    allNotesOff();
                }
                setChordRowsDisabled(false);
                showPlayButton();
                try { window.dispatchEvent(new CustomEvent('cc-chords-stopped')); } catch (e) {}
                return;
            }
            beginPlaybackAfterCredit();
        });
        window.ccStopChords = function () {
            playSessionId += 1;
            isPlaying = false;
            if (typeof window !== 'undefined') window._ccChordRowSoundModActive = false;
            clearTimeouts();
            setChordPlayingIndicator(null);
            /* Same as dock Stop: releaseAllNotes clears synth + key highlights/labels; allNotesOff alone leaves keys stuck. */
            if (typeof window.releaseAllNotes === 'function') {
                window.releaseAllNotes();
                activeNotes.clear();
            } else {
                allNotesOff();
            }
            setChordRowsDisabled(false);
            showPlayButton();
            try { window.dispatchEvent(new CustomEvent('cc-chords-stopped')); } catch (e) {}
        };

        window.ccIsChordPlaying = function () { return isPlaying; };

        /** Start chord playback programmatically (e.g. after ✦ imagine has filled in). Same as pressing Play when not playing. */
        window.ccStartChords = function () {
            const playBtn = document.getElementById('cc-play-btn');
            if (playBtn && !isPlaying) playBtn.click();
        };

        window.ccReadSoundStateFromGlobals = readSoundStateFromGlobals;
        window.ccApplySoundStateToGlobals = applySoundStateToGlobals;
        window.ccGetDefaultSoundState = getDefaultSoundState;

        /** Apply the last-focused chord row's sound to globals (call when opening Instrument/Sound tab or when globals need initialisation from row state). */
        window.ccApplyCurrentRowSoundToGlobals = function () {
            const rows = getChordRows();
            ensureRowSoundStateLength(Math.max(1, rows.length));
            const idx = rowSoundState.length ? Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1)) : 0;
            const state = rowSoundState[idx] || getDefaultSoundState();
            applySoundStateToGlobals(state);
        };

        /** Sync the dock Sound panel controls from the focused row's sound state (call when switching to Sound tab or when focused row changes). */
        function syncSoundPanelFromFocusedRow() {
            const revEl = document.getElementById('cc-sound-reverb');
            const stereoEl = document.getElementById('cc-sound-stereo');
            const rowVolEl = document.getElementById('cc-sound-row-volume');
            const bassEveryBarEl = document.getElementById('cc-sound-bass-everybar');
            const bassIntEl = document.getElementById('cc-sound-bass-intensity');
            const trebleEveryBarEl = document.getElementById('cc-sound-treble-everybar');
            const trebleIntEl = document.getElementById('cc-sound-treble-intensity');
            const rows = getChordRows();
            ensureRowSoundStateLength(Math.max(1, rows.length));
            ensureRowSettingsLength(Math.max(1, rows.length));
            const idx = rowSoundState.length ? Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1)) : 0;
            const state = rowSoundState[idx] || getDefaultSoundState();
            const r = state.reverb != null ? Math.max(0, Math.min(100, state.reverb)) : CC_DEFAULT_REVERB;
            const sw = state.stereoWidth != null ? Math.max(-100, Math.min(0, state.stereoWidth)) : CC_DEFAULT_STEREO_WIDTH;
            const rv = state.rowVolume != null ? Math.max(0, Math.min(2000, state.rowVolume)) : CC_DEFAULT_ROW_VOLUME;
            if (revEl) revEl.value = String(r);
            if (stereoEl) stereoEl.value = String(sw);
            var sm = (state.soundMode === 'nostalgia' || state.soundMode === 'tremolo') ? state.soundMode : (state.nostalgia ? 'nostalgia' : 'normal');
            var modeEl = document.getElementById('cc-sound-mode');
            if (modeEl) modeEl.value = sm;
            if (rowVolEl) rowVolEl.value = String(rv);
            const soundState = state;
            const soundBassBar = (soundState.soundBassEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(soundState.soundBassEveryBar)) ? soundState.soundBassEveryBar : 'none';
            const soundTrebleBar = (soundState.soundTrebleEveryBar != null && CC_VOLUME_MOD_OPTIONS.includes(soundState.soundTrebleEveryBar)) ? soundState.soundTrebleEveryBar : 'none';
            const soundBassIntPct = Math.round((soundState.soundBassEveryBarIntensity != null ? soundState.soundBassEveryBarIntensity : 0.2) * 100);
            const soundTrebleIntPct = Math.round((soundState.soundTrebleEveryBarIntensity != null ? soundState.soundTrebleEveryBarIntensity : 0.2) * 100);
            if (bassEveryBarEl) bassEveryBarEl.value = soundBassBar;
            if (bassIntEl) bassIntEl.value = String(Math.max(0, Math.min(100, soundBassIntPct)));
            if (trebleEveryBarEl) trebleEveryBarEl.value = soundTrebleBar;
            if (trebleIntEl) trebleIntEl.value = String(Math.max(0, Math.min(100, soundTrebleIntPct)));
        }
        window.ccSyncSoundPanelFromFocusedRow = syncSoundPanelFromFocusedRow;

        (function bindSoundPanelControls() {
            var volOpts = buildVolumeModOptions();
            var soundBassBar = document.getElementById('cc-sound-bass-everybar');
            var soundTrebleBar = document.getElementById('cc-sound-treble-everybar');
            if (soundBassBar) setSelectOptionsHtml(soundBassBar, volOpts.map(function (o) { return o.cloneNode(true); }));
            if (soundTrebleBar) setSelectOptionsHtml(soundTrebleBar, volOpts.map(function (o) { return o.cloneNode(true); }));

            function updateRowSoundFromPanel() {
                const rows = getChordRows();
                if (!rows.length) return;
                ensureRowSoundStateLength(rows.length);
                const idx = Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1));
                const state = copySoundState(rowSoundState[idx]);
                const revEl = document.getElementById('cc-sound-reverb');
                const stereoEl = document.getElementById('cc-sound-stereo');
                const modeEl = document.getElementById('cc-sound-mode');
                const rowVolEl = document.getElementById('cc-sound-row-volume');
                if (revEl) state.reverb = Math.max(0, Math.min(100, parseInt(revEl.value, 10) || CC_DEFAULT_REVERB));
                if (stereoEl) state.stereoWidth = Math.max(-100, Math.min(0, parseInt(stereoEl.value, 10) || CC_DEFAULT_STEREO_WIDTH));
                if (modeEl) {
                    state.soundMode = (modeEl.value === 'nostalgia' || modeEl.value === 'tremolo') ? modeEl.value : 'normal';
                    state.nostalgia = state.soundMode === 'nostalgia';
                }
                if (rowVolEl) state.rowVolume = Math.max(0, Math.min(2000, parseInt(rowVolEl.value, 10) || CC_DEFAULT_ROW_VOLUME));
                rowSoundState[idx] = state;
                applySoundStateToGlobals(state);
                saveState(readStateFromUi());
            }
            function updateRowSoundEveryBarFromPanel() {
                const rows = getChordRows();
                if (!rows.length) return;
                ensureRowSoundStateLength(rows.length);
                const idx = Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1));
                const state = copySoundState(rowSoundState[idx]);
                const bassBarEl = document.getElementById('cc-sound-bass-everybar');
                const bassIntEl = document.getElementById('cc-sound-bass-intensity');
                const trebleBarEl = document.getElementById('cc-sound-treble-everybar');
                const trebleIntEl = document.getElementById('cc-sound-treble-intensity');
                if (bassBarEl && CC_VOLUME_MOD_OPTIONS.includes(bassBarEl.value)) state.soundBassEveryBar = bassBarEl.value;
                if (bassIntEl) state.soundBassEveryBarIntensity = Math.max(0, Math.min(1, (parseInt(bassIntEl.value, 10) || 20) / 100));
                if (trebleBarEl && CC_VOLUME_MOD_OPTIONS.includes(trebleBarEl.value)) state.soundTrebleEveryBar = trebleBarEl.value;
                if (trebleIntEl) state.soundTrebleEveryBarIntensity = Math.max(0, Math.min(1, (parseInt(trebleIntEl.value, 10) || 20) / 100));
                rowSoundState[idx] = state;
                applySoundStateToGlobals(state);
                saveState(readStateFromUi());
            }
            ['cc-sound-reverb', 'cc-sound-stereo', 'cc-sound-mode', 'cc-sound-row-volume'].forEach(function (id) {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateRowSoundFromPanel);
            });
            ['cc-sound-bass-everybar', 'cc-sound-bass-intensity', 'cc-sound-treble-everybar', 'cc-sound-treble-intensity'].forEach(function (id) {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', updateRowSoundEveryBarFromPanel);
            });
            syncSoundPanelFromFocusedRow();
        })();

        /** Copy current globals into the last-focused row's sound and persist (call after any edit in Instrument/Sound/Human that changes gsl*). */
        window.ccSaveGlobalsToCurrentRowSound = function () {
            const rows = getChordRows();
            if (!rows.length) return;
            ensureRowSoundStateLength(rows.length);
            const idx = Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1));
            rowSoundState[idx] = readSoundStateFromGlobals();
            saveState(readStateFromUi());
        };

        /** Generate a random chord string (comma-separated, 4–8 chords) for e.g. tapmode tap-button field. */
        window.ccGenerateRandomChordString = function () {
            const result = generateRandomChordString();
            return result.chordString || '';
        };

        window.ccRandomize = function (opts) {
            opts = opts || {};

            // Randomize Chords: 4 random chord symbols (optionally locked to chosen key)
            if (opts.chords) {
                let overrideKeyIndex = null;
                const keySelect = document.getElementById('cc-key');
                const randKeyCheckbox = document.getElementById('cc-rand-key');
                const shouldRandomiseKey = !randKeyCheckbox || randKeyCheckbox.checked;
                if (!shouldRandomiseKey && keySelect && keySelect.value) {
                    const idx = CC_KEY_ROOTS.indexOf(keySelect.value);
                    if (idx >= 0) overrideKeyIndex = idx;
                }
                const result = generateRandomChordString(overrideKeyIndex);
                setElValue('cc-chord-input', result.chordString);
                if (keySelect && result.keyIndex != null && result.keyIndex >= 0 && result.keyIndex < CC_KEY_ROOTS.length) {
                    keySelect.value = CC_KEY_ROOTS[result.keyIndex];
                }
            }

            // Randomize Rhythm: rhythm dropdowns + skip. If BPM randomise is enabled, pick BPM 70–140 first.
            if (opts.rhythm) {
                if (opts.bpm) {
                    const bpm = randomInt(70, 140);
                    setElValue('cc-row-bpm', bpm);
                    ensureRowSettingsLength(Math.max(1, getChordRows().length));
                    rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                    if (typeof window !== 'undefined') window.gslBpm = clampBpm(bpm);
                    if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
                } else if (typeof rebuildRhythmOptionsRef === 'function') {
                    // Keep current BPM but refresh rhythm labels to match it.
                    rebuildRhythmOptionsRef();
                }
                setElValue('cc-bass-rhythm', pickRandom(CC_DURATION_MULTIPLIERS));
                setElValue('cc-treble-rhythm', pickRandom(CC_DURATION_MULTIPLIERS));
                setElValue('cc-skip1', pickRandom(CC_SKIP_OPTIONS));
                setElValue('cc-skip2', pickRandom(CC_SKIP_OPTIONS));
                setElValue('cc-skip3', pickRandom(CC_SKIP_OPTIONS));
                // Bass skip dropdowns are left unchanged (default none; do not randomise).
            }

            // Randomize Notes: treble pattern + voicing (bass pattern left unchanged, default normal)
            if (opts.notes) {
                setElValue('cc-pattern-mode', pickRandom(['normal', 'ascend', 'descend', 'ascend2', 'descend2']));
                setElValue('cc-voicing', 'full');
                // Octave shift, treble octaves, and bass octaves are left unchanged (not randomised).
            }

            // Randomize Sound: every-bar patterns only when Sound checkbox is checked (Human does not change intensity fields)
            if (opts.sound) {
                const everyBarOpts = CC_VOLUME_MOD_OPTIONS.filter((v) => v !== 'none');
                setElValue('cc-bass-everybar', pickRandom(everyBarOpts));
                setElValue('cc-treble-everybar', pickRandom(everyBarOpts));
                ensureRowSettingsLength(Math.max(1, getChordRows().length));
                rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                const rows = getChordRows();
                if (rows.length) {
                    ensureRowSoundStateLength(rows.length);
                    const idx = Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1));
                    const s = copySoundState(rowSoundState[idx]);
                    s.reverb = CC_DEFAULT_REVERB;
                    s.stereoWidth = CC_DEFAULT_STEREO_WIDTH;
                    s.soundBassEveryBar = pickRandom(CC_VOLUME_MOD_OPTIONS);
                    s.soundTrebleEveryBar = pickRandom(CC_VOLUME_MOD_OPTIONS);
                    rowSoundState[idx] = s;
                    syncSoundPanelFromFocusedRow();
                    applySoundStateToGlobals(s);
                }
            }

            const state = readStateFromUi();
            saveState(state);
        };

        /** Apply payload from POST /api/imagine (server-side ✦ imagine). */
        window.ccApplyImaginePayload = function (apply) {
            if (!apply) return;
            if (apply.chords) {
                setElValue('cc-chord-input', apply.chords.chordString);
                const keySelect = document.getElementById('cc-key');
                if (keySelect && apply.chords.keyRoot) keySelect.value = apply.chords.keyRoot;
            }
            if (apply.rhythm) {
                const r = apply.rhythm;
                if (r.bpm != null) {
                    setElValue('cc-row-bpm', r.bpm);
                    ensureRowSettingsLength(Math.max(1, getChordRows().length));
                    rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                    if (typeof window !== 'undefined') window.gslBpm = clampBpm(r.bpm);
                    if (typeof rebuildRhythmOptionsRef === 'function') rebuildRhythmOptionsRef();
                } else if (typeof rebuildRhythmOptionsRef === 'function') {
                    rebuildRhythmOptionsRef();
                }
                setElValue('cc-bass-rhythm', r.bassRhythm);
                setElValue('cc-treble-rhythm', r.trebleRhythm);
                setElValue('cc-skip1', r.skip1);
                setElValue('cc-skip2', r.skip2);
                setElValue('cc-skip3', r.skip3);
            }
            if (apply.notes) {
                setElValue('cc-pattern-mode', apply.notes.patternMode);
                setElValue('cc-voicing', apply.notes.voicing);
            }
            if (apply.sound) {
                const s = apply.sound;
                setElValue('cc-bass-everybar', s.bassEverybar);
                setElValue('cc-treble-everybar', s.trebleEverybar);
                ensureRowSettingsLength(Math.max(1, getChordRows().length));
                rowSettings[lastFocusedChordIndex] = readRowSettingsFromUi();
                const rows = getChordRows();
                if (rows.length) {
                    ensureRowSoundStateLength(rows.length);
                    const idx = Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1));
                    const st = copySoundState(rowSoundState[idx]);
                    st.reverb = s.reverb;
                    st.stereoWidth = s.stereoWidth;
                    st.soundBassEveryBar = s.soundBassEveryBar;
                    st.soundTrebleEveryBar = s.soundTrebleEveryBar;
                    rowSoundState[idx] = st;
                    syncSoundPanelFromFocusedRow();
                    applySoundStateToGlobals(st);
                }
            }
            if (apply.human && apply.human.delayMod) {
                setElValue('cc-delay-mod', apply.human.delayMod);
                ensureRowSettingsLength(Math.max(1, getChordRows().length));
                const rs = rowSettings[lastFocusedChordIndex] || readRowSettingsFromUi();
                rs.delayMod = apply.human.delayMod;
                rowSettings[lastFocusedChordIndex] = rs;
            }
            saveState(readStateFromUi());
        };

        window.ccGetSaveBillableRows = function () {
            var rows = getChordRows();
            var n = rows.length;
            if (n <= 1) return 1;
            var el = document.getElementById('cc-save-this-row-only');
            if (el && el.checked) return 1;
            return Math.max(1, n);
        };

        window.ccUpdateSaveCreditLabels = function () {
            var midi = document.getElementById('cc-save-midi-btn');
            var wav = document.getElementById('cc-save-wav-btn');
            if (midi) midi.textContent = '\u266C MIDI';
            if (wav) wav.textContent = '\u3030 WAV';
        };

        window.ccUpdateSaveModalOptions = function () {
            var wrap = document.getElementById('cc-save-row-only-wrap');
            var checkbox = document.getElementById('cc-save-this-row-only');
            var rows = getChordRows();
            if (wrap) wrap.style.display = rows.length > 1 ? 'block' : 'none';
            if (checkbox && rows.length > 1) checkbox.checked = false;
            if (typeof window.ccUpdateSaveCreditLabels === 'function') window.ccUpdateSaveCreditLabels();
        };

        function buildMergedEventsFromAllRows() {
            var rows = getChordRows();
            var allBass = [];
            var allTreble = [];
            var offset = 0;  // use content length only between rows so there's no 1.2s gap; add 1.2 tail once at end
            var firstCompiled = null;
            var firstState = null;
            for (var i = 0; i < rows.length; i += 1) {
                var state = getStateForRow(i);
                var compiled = buildCompiledState(state);
                if (!compiled) continue;
                if (firstCompiled === null) { firstCompiled = compiled; firstState = state; }
                var result = window.PrimidiSave.buildEvents(compiled);
                var contentSeconds = (compiled.chordCount && compiled.barSeconds) ? compiled.chordCount * compiled.barSeconds : (result.totalSeconds || 0) - 1.2;
                result.bassEvents.forEach(function (ev) {
                    allBass.push({ midi: ev.midi, velocity: ev.velocity, time: ev.time + offset, duration: ev.duration });
                });
                result.trebleEvents.forEach(function (ev) {
                    allTreble.push({ midi: ev.midi, velocity: ev.velocity, time: ev.time + offset, duration: ev.duration });
                });
                offset += contentSeconds;
            }
            var totalSeconds = offset + 1.2;  // single reverb tail at end of full piece
            return { bassEvents: allBass, trebleEvents: allTreble, totalSeconds: totalSeconds, firstCompiled: firstCompiled, firstState: firstState };
        }

        /** True if current Save UI would produce at least one chord (same rules as ccExport / Play). */
        window.ccHasChordsForSave = function () {
            if (typeof window.PrimidiSave === 'undefined' || typeof window.PrimidiSave.buildEvents !== 'function') {
                return false;
            }
            var rows = getChordRows();
            var saveThisRowOnlyEl = document.getElementById('cc-save-this-row-only');
            var saveThisRowOnly = rows.length > 1 && saveThisRowOnlyEl && saveThisRowOnlyEl.checked;
            if (saveThisRowOnly || rows.length <= 1) {
                return !!buildCompiledState(readStateFromUi());
            }
            return !!buildMergedEventsFromAllRows().firstCompiled;
        };

        window.ccExport = function (kind) {
            const state = readStateFromUi();
            saveState(state);

            if (typeof window.PrimidiSave === 'undefined' || typeof window.PrimidiSave.buildEvents !== 'function') {
                alert('Save library not loaded yet.');
                return;
            }
            var rows = getChordRows();
            var saveThisRowOnlyEl = document.getElementById('cc-save-this-row-only');
            var saveThisRowOnly = rows.length > 1 && saveThisRowOnlyEl && saveThisRowOnlyEl.checked;
            var compiled;
            var bassEvents;
            var trebleEvents;
            var totalSeconds;
            var stateForExport = state;
            if (saveThisRowOnly || rows.length <= 1) {
                compiled = buildCompiledState(state);
                if (!compiled) {
                    alert('Please enter at least one chord before saving.');
                    return;
                }
                var result = window.PrimidiSave.buildEvents(compiled);
                bassEvents = result.bassEvents;
                trebleEvents = result.trebleEvents;
                totalSeconds = result.totalSeconds;
            } else {
                var merged = buildMergedEventsFromAllRows();
                if (!merged.firstCompiled) {
                    alert('Please enter at least one chord before saving.');
                    return;
                }
                bassEvents = merged.bassEvents;
                trebleEvents = merged.trebleEvents;
                totalSeconds = merged.totalSeconds;
                compiled = merged.firstCompiled;
                stateForExport = merged.firstState;
            }
            let bassForWav = bassEvents;
            let trebleForWav = trebleEvents;
            var useSustain = stateForExport.sustainPedal && (saveThisRowOnly || rows.length <= 1);
            if (useSustain && typeof window.PrimidiSave.buildSustainPedalEvents === 'function' && typeof window.PrimidiSave.extendNoteEventsWithSustain === 'function') {
                const pedalEvents = window.PrimidiSave.buildSustainPedalEvents(compiled);
                bassForWav = window.PrimidiSave.extendNoteEventsWithSustain(bassEvents, pedalEvents, totalSeconds);
                trebleForWav = window.PrimidiSave.extendNoteEventsWithSustain(trebleEvents, pedalEvents, totalSeconds);
            }

            if (kind === 'midi') {
                try {
                    const blob = window.PrimidiSave.exportMidi(bassEvents, trebleEvents, compiled.bpm);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    var baseMid = (typeof window !== 'undefined' && window.ccExportBasename)
                        ? String(window.ccExportBasename).replace(/\.(mid|wav)$/i, '').trim().slice(0, 120)
                        : '';
                    a.download = baseMid ? baseMid + '.mid' : ('primidi-chords-' + Date.now() + '.mid');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (err) {
                    console.error(err);
                    alert((err && err.message) ? err.message : 'MIDI export failed.');
                }
                return;
            }

            if (kind === 'wav') {
                (async () => {
                    try {
                        ensureRowSoundStateLength(getChordRows().length);
                        var rowIndex = saveThisRowOnly || rows.length <= 1
                            ? Math.max(0, Math.min(lastFocusedChordIndex, rowSoundState.length - 1))
                            : 0;
                        const soundState = rowSoundState[rowIndex] || getDefaultSoundState();
                        const soundBpm = (typeof window !== 'undefined' && window.gslBpm != null && !isNaN(Number(window.gslBpm))) ? Math.max(40, Math.min(240, Number(window.gslBpm))) : compiled.bpm;
                        const liveReverb = (typeof window.gslSynth !== 'undefined' && typeof window.gslSynth.getReverbBufferForExport === 'function') ? window.gslSynth.getReverbBufferForExport() : null;
                        const wavOptions = {
                            presetSlots: soundState.presetSlots && soundState.presetSlots.length ? soundState.presetSlots : undefined,
                            slotVolumes: soundState.slotVolumes,
                            slotSemitones: soundState.slotSemitones,
                            slotMuted: soundState.slotMuted,
                            everyBarPattern: soundState.everyBarPattern,
                            everyBarIntensity: soundState.everyBarIntensity,
                            layerPlayStyle: soundState.layerPlayStyle,
                            layerPlayMode: (soundState.layerPlayMode === 'split' || soundState.layerPlayMode === 'scatter') ? soundState.layerPlayMode : 'leftRight',
                            delayIntensity: stateForExport.delayIntensity ?? 1,
                            bpm: compiled.bpm,
                            soundBpm: soundBpm,
                            reverbAmount: soundState.reverb != null ? Math.max(0, Math.min(100, soundState.reverb)) / 100 : CC_DEFAULT_REVERB / 100,
                            stereoWidthMidEq: soundState.stereoWidth != null ? Math.max(-100, Math.min(0, soundState.stereoWidth)) : CC_DEFAULT_STEREO_WIDTH,
                            rowVolume: soundState.rowVolume != null ? Math.max(0, Math.min(2000, soundState.rowVolume)) : CC_DEFAULT_ROW_VOLUME
                        };
                        if (liveReverb && liveReverb.reverbBuffer) {
                            wavOptions.sampleRate = liveReverb.sampleRate;
                            wavOptions.reverbBuffer = liveReverb.reverbBuffer;
                        }
                        wavOptions.nostalgiaMode = (window.gslSynth && typeof window.gslSynth.getSoundMode === 'function' && window.gslSynth.getSoundMode() === 'nostalgia');
                        const wavBlob = await window.PrimidiSave.exportWav(bassForWav, trebleForWav, totalSeconds, wavOptions);
                        const url = URL.createObjectURL(wavBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        var baseWav = (typeof window !== 'undefined' && window.ccExportBasename)
                            ? String(window.ccExportBasename).replace(/\.(mid|wav)$/i, '').trim().slice(0, 120)
                            : '';
                        a.download = baseWav ? baseWav + '.wav' : ('primidi-chords-' + Date.now() + '.wav');
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 2000);
                    } catch (err) {
                        console.error(err);
                        alert((err && err.message) ? err.message : 'WAV export failed.');
                    }
                })();
            }
        };

        (function applyPendingLibraryFromSession() {
            try {
                var raw = sessionStorage.getItem('cc_library_restore_v1');
                if (!raw) return;
                sessionStorage.removeItem('cc_library_restore_v1');
                var st = JSON.parse(raw);
                if (!st || typeof st !== 'object') return;
                if (!st.chordsTextArray || !st.chordsTextArray.length) {
                    var ct = st.chordsText != null ? String(st.chordsText).trim() : '';
                    if (ct) {
                        st.chordsTextArray = [ct];
                        st.chordsLastFocusedIndex = 0;
                    }
                }
                applyStateToUi(st);
                var exportKind = sessionStorage.getItem('cc_library_export_after_restore_v1');
                var exportBase = sessionStorage.getItem('cc_library_export_basename_v1') || 'ChordCanvas';
                if (exportKind === 'midi' || exportKind === 'wav') {
                    sessionStorage.removeItem('cc_library_export_after_restore_v1');
                    sessionStorage.removeItem('cc_library_export_basename_v1');
                    window.ccExportBasename = exportBase.replace(/\.(mid|wav)$/i, '').trim().slice(0, 120) || 'ChordCanvas';
                    var fnEl = document.getElementById('cc-save-filename');
                    if (fnEl) fnEl.value = window.ccExportBasename;
                    setTimeout(function () {
                        if (!window.chordcanvasAuth) return;
                        var run = exportKind === 'wav' ? window.chordcanvasAuth.ensureSaveWav : window.chordcanvasAuth.ensureSaveMidi;
                        if (!run) return;
                        run.call(window.chordcanvasAuth).then(function (ok) {
                            if (ok && window.ccExport) window.ccExport(exportKind);
                        });
                    }, 1400);
                }
            } catch (e) {
                console.warn('cc_library_restore_v1', e);
            }
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

