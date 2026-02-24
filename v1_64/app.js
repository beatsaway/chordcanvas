const DURATION_MULTIPLIERS = [240, 120, 60, 40, 30, 20, 15];
const NOTE_SYMBOLS_HTML = [
    '&#119133;',
    '&#119134;',
    '&#119135;',
    '&#119135;&#8323;',
    '&#119136;',
    '&#119136;&#8323;',
    '&#119137;'
];

const MIDI_TICKS_PER_BEAT = 480;
const MIDI_NOTE_DURATION_FACTOR = 0.8;
const DEFAULT_BPM = 120;
const MIN_BPM = 33;
const MAX_BPM = 888;
const CHORD_BAR_BEATS = 4;
const SYNTH_PRELOAD_SECONDS = 0.25;
const VOLUME_MOD_MIN = 0.05;
const VOLUME_MOD_MAX = 1.3;
const VOLUME_MOD_CURVE = 2.0;
const DELAY_MOD_CHANCE = 0.618;
const DELAY_MOD_AMOUNT_HUMAN = 0.05;
const DELAY_MOD_AMOUNT_DRUNK = 0.128;

const engine = new window.ChordEngine({
    noteToIndex: window.NOTE_TO_INDEX,
    chordIntervals: window.CHORD_INTERVALS
});
const player = new window.WebAudioPlayer();

let isPreviewing = false;
let isSequencePreviewing = false;
let previewLoopOnlyActiveSequence = false;
let previewTimers = [];
let previewTimeline = [];
let resyncTimerId = null;
let isSynthMode = true;
let isSynthPreloading = false;
let synthPlayTimers = [];

const DEFAULT_BASS_DURATION = 240;
const DEFAULT_HIGH_DURATION = 30;
const DEFAULT_VOLUME_MOD = 'uphill';
const DEFAULT_SYNTH_VOLUME_MOD = 'none';
const DEFAULT_DELAY_MOD = 'drunk';
const DEFAULT_PATTERN_MODE = 'normal';

const panelGroups = [];
let activeGroup = null;
let trebleModalState = null;

const previewToggle = document.getElementById('previewToggle');
const downloadBtn = document.getElementById('downloadBtn');
const downloadMidiBtn = document.getElementById('downloadMidiBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const playOptionsTrigger = document.getElementById('playOptionsTrigger');
const playOptionsModal = document.getElementById('playOptionsModal');
const infoModal = document.querySelector('[data-role="info-modal"]');
const infoTabs = infoModal?.querySelectorAll('[data-role="info-tab"]') || [];
const infoPanels = infoModal?.querySelectorAll('.modal-panel') || [];
const infoBackdrop = infoModal?.querySelector('[data-role="modal-close"]');
const presetsModal = document.getElementById('presetsModal');
const presetsList = document.getElementById('presetsList');
const presetsClose = document.getElementById('presetsClose');
const quickMenuBtn = document.getElementById('quickMenuBtn');
const quickGuideBtn = document.getElementById('quickGuideBtn');
const quickHelpBtn = document.getElementById('quickHelpBtn');
const helpModal = document.getElementById('helpModal');
const helpText = document.getElementById('helpText');
const helpPrev = document.getElementById('helpPrev');
const helpNext = document.getElementById('helpNext');
const helpClose = document.getElementById('helpClose');
const contactModal = document.getElementById('contactModal');
const contactClose = document.getElementById('contactClose');
const chordTypesModal = document.getElementById('chordTypesModal');
const chordTypesList = document.getElementById('chordTypesList');
const quickChordTypesBtn = document.getElementById('quickChordTypesBtn');
const addOptionsModal = document.getElementById('addOptionsModal');
const addPresetsBtn = document.getElementById('addPresetsBtn');
const addRandomByKeyBtn = document.getElementById('addRandomByKeyBtn');
const addPanelBtn = document.getElementById('addPanelBtn');
const randomByKeyModal = document.getElementById('randomByKeyModal');
const randomByKeyStyleSelect = document.getElementById('randomByKeyStyleSelect');
const randomByKeySelect = document.getElementById('randomByKeySelect');
const randomByKeyCount = document.getElementById('randomByKeyCount');
const randomByKeyModulationSelect = document.getElementById('randomByKeyModulationSelect');
const randomByKeyApplyBtn = document.getElementById('randomByKeyApplyBtn');
const randomByKeyCancelBtn = document.getElementById('randomByKeyCancelBtn');
const randomByKeyPreview = document.getElementById('randomByKeyPreview');
const randomByKeyStyleIntro = document.getElementById('randomByKeyStyleIntro');
const randomByKeyPlayBtn = document.getElementById('randomByKeyPlayBtn');
const downloadOptionsModal = document.getElementById('downloadOptionsModal');
const helpOptionsModal = document.getElementById('helpOptionsModal');
const trebleNotesModal = document.getElementById('trebleNotesModal');
const trebleNotesModalTitle = document.getElementById('trebleNotesModalTitle');
const trebleNotesList = document.getElementById('trebleNotesList');
const trebleNotesAddBtn = document.getElementById('trebleNotesAddBtn');
const trebleNotesInput = document.getElementById('trebleNotesInput');
const trebleNotesRecommendations = document.getElementById('trebleNotesRecommendations');
const trebleNotesError = document.getElementById('trebleNotesError');
const trebleNotesUseDefaultBtn = document.getElementById('trebleNotesUseDefaultBtn');
const playOptionsLoopSelect = document.getElementById('playOptionsLoopSelect');
const playOptionsPlaybackSelect = document.getElementById('playOptionsPlaybackSelect');
const masterVolumeSlider = document.getElementById('masterVolume');
const globalBassVolumeSlider = document.getElementById('bassVolumeSlider');
const globalHighVolumeSlider = document.getElementById('highVolumeSlider');
const title = document.querySelector('h1');
const panelGroup = document.getElementById('panelGroup');
const actionButtons = document.getElementById('actionButtons');

let loopMode = 'all'; // default: play all sequences
// isSynthMode default is already true (synth playback)

function getGroupRole(groupEl, role) {
    return groupEl ? groupEl.querySelector(`[data-role="${role}"]`) : null;
}

function buildPanelGroupState(groupEl) {
    const state = {
        el: groupEl,
        chordInput: getGroupRole(groupEl, 'chordInput'),
        chordPreview: getGroupRole(groupEl, 'chordPreview'),
        currentHighNotes: getGroupRole(groupEl, 'currentHighNotes'),
        bassRhythmSelect: getGroupRole(groupEl, 'bassRhythmSelect'),
        highRhythmSelect: getGroupRole(groupEl, 'highRhythmSelect'),
        bpmInput: getGroupRole(groupEl, 'bpmInput'),
        bpmDownBtn: getGroupRole(groupEl, 'bpmDownBtn'),
        bpmUpBtn: getGroupRole(groupEl, 'bpmUpBtn'),
        volumeModSelect: getGroupRole(groupEl, 'volumeModSelect'),
        delayModSelect: getGroupRole(groupEl, 'delayModSelect'),
        patternSelect: getGroupRole(groupEl, 'patternSelect'),
        skipSelect: getGroupRole(groupEl, 'skipSelect'),
        skipSelect2: getGroupRole(groupEl, 'skipSelect2'),
        skipSelect3: getGroupRole(groupEl, 'skipSelect3'),
        doubleHighNotes: getGroupRole(groupEl, 'doubleHighNotes'),
        synthBassOutputSlider: getGroupRole(groupEl, 'synthBassOutput'),
        synthBassPresetSelect: getGroupRole(groupEl, 'synthBassPreset'),
        synthBassVolumeModSelect: getGroupRole(groupEl, 'synthBassVolumeMod'),
        synthBassDelay: getGroupRole(groupEl, 'synthBassDelay'),
        synthBassReverb: getGroupRole(groupEl, 'synthBassReverb'),
        synthBassMidEq: getGroupRole(groupEl, 'synthBassMidEq'),
        synthTrebleOutputSlider: getGroupRole(groupEl, 'synthTrebleOutput'),
        synthTreblePresetSelect: getGroupRole(groupEl, 'synthTreblePreset'),
        synthTrebleVolumeModSelect: getGroupRole(groupEl, 'synthTrebleVolumeMod'),
        synthTrebleDelay: getGroupRole(groupEl, 'synthTrebleDelay'),
        synthTrebleReverb: getGroupRole(groupEl, 'synthTrebleReverb'),
        synthTrebleMidEq: getGroupRole(groupEl, 'synthTrebleMidEq'),
        chordSequence: [],
        previewItems: [],
        bassDurationMultiplier: DEFAULT_BASS_DURATION,
        highDurationMultiplier: DEFAULT_HIGH_DURATION,
        volumeModPattern: DEFAULT_VOLUME_MOD,
        delayModPattern: DEFAULT_DELAY_MOD,
        patternMode: DEFAULT_PATTERN_MODE,
        skipPattern: [],
        doubleHighEnabled: false,
        bassPlaybackVolume: 1,
        highPlaybackVolume: 1,
        currentChordIndex: 0,
        synthBassPreset: 'bass',
        synthTreblePreset: 'pluck',
        synthBassVolumeModPattern: '2hill',
        synthTrebleVolumeModPattern: '3hill',
        synthBassOutputGain: 1,
        synthTrebleOutputGain: 1
    };

    if (state.volumeModSelect?.value) {
        state.volumeModPattern = state.volumeModSelect.value;
    }
    if (state.delayModSelect?.value) {
        state.delayModPattern = state.delayModSelect.value;
    }
    if (state.patternSelect?.value) {
        state.patternMode = state.patternSelect.value;
    }
    if (state.doubleHighNotes) {
        state.doubleHighEnabled = state.doubleHighNotes.value === '2';
    }
    if (state.synthBassPresetSelect?.value) {
        state.synthBassPreset = state.synthBassPresetSelect.value;
    }
    if (state.synthTreblePresetSelect?.value) {
        state.synthTreblePreset = state.synthTreblePresetSelect.value;
    }
    if (state.synthBassVolumeModSelect?.value) {
        state.synthBassVolumeModPattern = state.synthBassVolumeModSelect.value;
    }
    if (state.synthTrebleVolumeModSelect?.value) {
        state.synthTrebleVolumeModPattern = state.synthTrebleVolumeModSelect.value;
    }
    if (state.synthBassOutputSlider?.value) {
        state.synthBassOutputGain = Math.max(0, Math.min(100, parseInt(state.synthBassOutputSlider.value, 10))) / 100;
    }
    if (state.synthTrebleOutputSlider?.value) {
        state.synthTrebleOutputGain = Math.max(0, Math.min(100, parseInt(state.synthTrebleOutputSlider.value, 10))) / 100;
    }
    if (globalBassVolumeSlider) {
        const v = parseInt(globalBassVolumeSlider.value, 10);
        state.bassPlaybackVolume = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : 1;
    }
    if (globalHighVolumeSlider) {
        const v = parseInt(globalHighVolumeSlider.value, 10);
        state.highPlaybackVolume = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : 1;
    }

    return state;
}

function getActiveGroup() {
    return activeGroup || panelGroups[0] || null;
}

function setActiveGroup(group) {
    if (!group) return;
    activeGroup = group;
    panelGroups.forEach((panel) => {
        if (panel?.el) {
            panel.el.classList.toggle('is-active', panel === group);
        }
    });
}

class ChordPreviewItem {
    constructor({ chord, index, group }) {
        this.chord = chord;
        this.index = index;
        this.group = group;
        this._longPressTimer = null;
        this._longPressHandled = false;
        this.element = document.createElement('div');
        this.element.className = 'chord-preview-item';
        this.element.dataset.index = String(index);
        this.updateLabel();
        this.element.addEventListener('click', (event) => {
            event.stopPropagation();
            if (this._longPressHandled) {
                this._longPressHandled = false;
                return;
            }
            playSingleChord(this.group, this.chord, this.index);
        });
        this.element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            openTrebleModal({ group: this.group, chord: this.chord, index: this.index });
        });
        this.element.addEventListener('touchstart', (event) => {
            if (this._longPressTimer) return;
            this._longPressTimer = setTimeout(() => {
                this._longPressTimer = null;
                this._longPressHandled = true;
                openTrebleModal({ group: this.group, chord: this.chord, index: this.index });
            }, 550);
        }, { passive: true });
        this.element.addEventListener('touchend', () => {
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        }, { passive: true });
        this.element.addEventListener('touchmove', () => {
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        }, { passive: true });
        this.element.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            if (this._longPressTimer) return;
            this._longPressTimer = setTimeout(() => {
                this._longPressTimer = null;
                this._longPressHandled = true;
                openTrebleModal({ group: this.group, chord: this.chord, index: this.index });
            }, 550);
        });
        this.element.addEventListener('mouseup', () => {
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        });
        this.element.addEventListener('mouseleave', () => {
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        });
        this.updateFromGroup(group);
    }

    updateLabel() {
        const baseName = engine.getChordDisplayName(this.chord.rootNote, this.chord.chordType);
        const hasCustom = Array.isArray(this.chord.trebleNotes) && this.chord.trebleNotes.length > 0;
        this.element.textContent = hasCustom ? `${baseName} ·` : baseName;
    }

    updateFromGroup(group) {
        if (!group) return;
        this.group = group;
        this.settings = {
            bpm: getBpmValue(group),
            bassDurationMultiplier: group.bassDurationMultiplier,
            highDurationMultiplier: group.highDurationMultiplier,
            volumeModPattern: group.volumeModPattern,
            delayModPattern: group.delayModPattern,
            patternMode: group.patternMode,
            skipPattern: [...(group.skipPattern || [])],
            doubleHighEnabled: group.doubleHighEnabled,
            bassPlaybackVolume: group.bassPlaybackVolume,
            highPlaybackVolume: group.highPlaybackVolume,
            synthBassPreset: group.synthBassPreset,
            synthTreblePreset: group.synthTreblePreset,
            synthBassEffects: getSynthEffectsFromGroup(group, 'bass'),
            synthTrebleEffects: getSynthEffectsFromGroup(group, 'treble')
        };
        this.chordNotes = getResolvedChordNotes(this.chord);
        this.highNotes = getHighNotesForPattern(this.chordNotes, group.doubleHighEnabled);
        this.updateLabel();
    }
}

function isSynthEnabled() {
    return isSynthMode && (!!window.PremiumSoundBass || !!window.PremiumSoundTreble || !!window.PremiumSound);
}

function getSynthEngine(part = 'bass') {
    if (part === 'treble') {
        return window.PremiumSoundTreble || window.PremiumSoundBass || window.PremiumSound || null;
    }
    return window.PremiumSoundBass || window.PremiumSoundTreble || window.PremiumSound || null;
}

function getPreviewNowSeconds() {
    return isSynthEnabled() ? performance.now() / 1000 : player.getCurrentTime();
}

function getSynthEffectsFromControls(delayEl, reverbEl, midEqEl) {
    const delayValue = Number(delayEl?.value ?? 50) / 100;
    const reverbValue = Number(reverbEl?.value ?? 50) / 100;
    const midEqValue = Number(midEqEl?.value ?? -50);
    return {
        delay: Math.max(0, Math.min(1, delayValue)),
        reverb: Math.max(0, Math.min(1, reverbValue)),
        midEq: Math.max(-100, Math.min(0, midEqValue))
    };
}

function getSynthEffectsFromGroup(group, part = 'bass') {
    if (part === 'treble') {
        return getSynthEffectsFromControls(group?.synthTrebleDelay, group?.synthTrebleReverb, group?.synthTrebleMidEq);
    }
    return getSynthEffectsFromControls(group?.synthBassDelay, group?.synthBassReverb, group?.synthBassMidEq);
}

function getSynthVolumeModPattern(group, part = 'bass') {
    if (part === 'treble') {
        return group?.synthTrebleVolumeModPattern || '3hill';
    }
    return group?.synthBassVolumeModPattern || '2hill';
}

function updateSynthOutputGainFromSliders(group) {
    const bassValue = parseInt(group?.synthBassOutputSlider?.value ?? '100', 10);
    const trebleValue = parseInt(group?.synthTrebleOutputSlider?.value ?? '100', 10);
    group.synthBassOutputGain = Number.isFinite(bassValue) ? Math.max(0, Math.min(100, bassValue)) / 100 : 1;
    group.synthTrebleOutputGain = Number.isFinite(trebleValue) ? Math.max(0, Math.min(100, trebleValue)) / 100 : 1;
}

function applySynthSettingsFromGroup(group, part = 'bass') {
    const engine = getSynthEngine(part);
    if (!engine) return;
    const preset = part === 'treble'
        ? (group?.synthTreblePresetSelect?.value || group?.synthTreblePreset || 'pluck')
        : (group?.synthBassPresetSelect?.value || group?.synthBassPreset || 'bass');
    engine.setPreset(preset);
    engine.setEffects(getSynthEffectsFromGroup(group, part));
}

function gainToVelocity(gain) {
    return clampVelocity(gain * 127);
}

function pushSynthNoteEvents(events, note, startTime, durationSeconds, velocity) {
    events.push({ type: 'noteOn', note, velocity, channel: 0, timeSeconds: startTime });
    events.push({ type: 'noteOff', note, velocity, channel: 0, timeSeconds: startTime + durationSeconds });
}

function addSynthVolumeAutomation(events, barSeconds, barCount, volumeModPattern, outputGain = 1, trackLabel = 'synth', debugContext = null) {
    if (!events || !barSeconds || barCount <= 0) return;
    const clampedGain = Math.max(0, Math.min(2, Number.isFinite(outputGain) ? outputGain : 1));
    if (!volumeModPattern || volumeModPattern === 'none') {
        events.push({ type: 'volume', timeSeconds: 0, value: clampedGain, track: trackLabel });
        return;
    }
    const steps = 16;
    const bpm = barSeconds > 0 ? (240 / barSeconds) : 0;
    const tailSeconds = Math.max(0, Math.min(bpm / 80, barSeconds / 8));
    const startLevel = getLinearVolumeModMultiplier(volumeModPattern, 0) * clampedGain;
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
        const barStart = barIndex * barSeconds;
        const barEnd = barStart + barSeconds;
        const rampWindow = Math.min(tailSeconds, barSeconds);
        const rampStart = barEnd - rampWindow;
        const rampStartPos = barSeconds > 0
            ? Math.max(0, Math.min(1, (rampStart - barStart) / barSeconds))
            : 1;
        const rampStartLevel = getLinearVolumeModMultiplier(volumeModPattern, rampStartPos) * clampedGain;
        if (volumeModPattern === '4hill' && debugContext?.midiVolumeModPattern === 'none' && debugContext?.rhythmMultiplier === debugContext?.fastestMultiplier) {
            const peakPositions = [1 / 8, 3 / 8, 5 / 8, 7 / 8];
            const peakCount = peakPositions.filter(pos => pos <= rampStartPos + 1e-6).length;
            if (peakCount < 4) {
                console.log('[synth volume] 4hill peak count reduced', {
                    track: trackLabel,
                    peakCount,
                    rampStartPos,
                    barSeconds,
                    tailSeconds,
                    bpm
                });
            }
        }
        for (let step = 0; step <= steps; step += 1) {
            const position = step / steps;
            if (rampWindow > 0 && position > rampStartPos) {
                continue;
            }
            const multiplier = getLinearVolumeModMultiplier(volumeModPattern, position) * clampedGain;
            events.push({
                type: 'volume',
                timeSeconds: barStart + (position * barSeconds),
                value: multiplier,
                track: trackLabel
            });
        }
        if (rampWindow > 0) {
            events.push({ type: 'volume', timeSeconds: rampStart, value: rampStartLevel, track: trackLabel });
            events.push({ type: 'volume', timeSeconds: barEnd, value: startLevel, track: trackLabel });
        }
    }
}

async function ensureSynthReady() {
    if (!isSynthEnabled()) return;
    if (isSynthPreloading) return;
    isSynthPreloading = true;
    updatePreviewToggleLabel();
    try {
        const engines = [getSynthEngine('bass'), getSynthEngine('treble')].filter(Boolean);
        await Promise.all(
            engines.map((engine) => engine.prepare({ warmupSeconds: SYNTH_PRELOAD_SECONDS }))
        );
    } finally {
        isSynthPreloading = false;
        updatePreviewToggleLabel();
    }
}

function updateChordPreview(group) {
    if (!group?.chordPreview) return;
    group.chordPreview.innerHTML = '';
    group.previewItems = [];

    if (group.chordSequence.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'chord-preview-empty';
        empty.textContent = 'No valid chords yet.';
        group.chordPreview.appendChild(empty);
    }

    group.chordSequence.forEach((chord, index) => {
        const previewItem = new ChordPreviewItem({ chord, index, group });
        group.previewItems.push(previewItem);
        group.chordPreview.appendChild(previewItem.element);
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'chord-add-btn';
    addButton.textContent = '+';
    addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setActiveGroup(group);
        openModal(addOptionsModal);
    });
    group.chordPreview.appendChild(addButton);
}

function setChordPreviewPlaying(group, index) {
    if (!group?.chordPreview) return;
    const items = group.chordPreview.querySelectorAll('.chord-preview-item');
    items.forEach(item => item.classList.remove('playing'));
    if (index === null || index === undefined) {
        updateCurrentHighNotes(group, null);
        if (randomByKeyPreview) {
            randomByKeyPreview.querySelectorAll('.chord-preview-item').forEach((el) => el.classList.remove('playing'));
        }
        return;
    }
    group.currentChordIndex = index;
    const current = group.chordPreview.querySelector(`.chord-preview-item[data-index="${index}"]`);
    if (current) {
        current.classList.add('playing');
    }
    updateCurrentHighNotes(group, index);
    if (randomByKeyModal?.getAttribute('aria-hidden') === 'false' && group === getActiveGroup() && randomByKeyPreview) {
        randomByKeyPreview.querySelectorAll('.chord-preview-item').forEach((el) => {
            el.classList.toggle('playing', el.dataset.index === String(index));
        });
    }
}

function getFirstChangedIndex(previousKeys, nextKeys) {
    const minLength = Math.min(previousKeys.length, nextKeys.length);
    for (let i = 0; i < minLength; i += 1) {
        if (previousKeys[i] !== nextKeys[i]) {
            return i;
        }
    }
    if (nextKeys.length > previousKeys.length) {
        return minLength;
    }
    return -1;
}

/**
 * Copy custom trebleNotes from previous chord sequence to newly parsed sequence.
 * Preserves treble only when the chord at the same index has the same identity (getChordKey).
 */
function preserveTrebleNotes(previousChords, newChords) {
    if (!Array.isArray(previousChords) || !Array.isArray(newChords) || !engine || typeof engine.getChordKey !== 'function') return;
    for (let i = 0; i < newChords.length; i++) {
        const oldChord = previousChords[i];
        const newChord = newChords[i];
        if (!oldChord || !newChord) continue;
        if (Array.isArray(oldChord.trebleNotes) && oldChord.trebleNotes.length > 0 &&
            engine.getChordKey(oldChord) === engine.getChordKey(newChord)) {
            newChord.trebleNotes = [...oldChord.trebleNotes].sort((a, b) => a - b);
        }
    }
}

function updateChordSequenceFromInput(group, { playOnChange = false, stopOnEmpty = true } = {}) {
    if (!group?.chordInput) return;
    const previousChords = group.chordSequence;
    const previousKeys = previousChords.map(chord => engine.getChordKey(chord));
    group.chordSequence = engine.parseChordSequence(group.chordInput.value);
    preserveTrebleNotes(previousChords, group.chordSequence);
    updateChordPreview(group);
    if (group.chordSequence.length === 0) {
        if (stopOnEmpty) {
            stopPreview();
        }
        return;
    }
    const nextKeys = group.chordSequence.map(chord => engine.getChordKey(chord));
    const changedIndex = getFirstChangedIndex(previousKeys, nextKeys);
    if (playOnChange && changedIndex !== -1) {
        playChordOnce(group, group.chordSequence[changedIndex], changedIndex);
    }
}

function updateChordPreviewItemsSettings(group) {
    if (!group?.previewItems?.length) return;
    group.previewItems.forEach((item) => item.updateFromGroup(group));
}

function buildSynthRenderSegments(segments, part) {
    return segments.map((segment) => {
        const barSeconds = (60 / segment.bpm) * CHORD_BAR_BEATS;
        const bassCycleSeconds = segment.bassDurationMultiplier / segment.bpm;
        const highCycleSeconds = segment.highDurationMultiplier / segment.bpm;
        const delayState = { counter: 0 };
        const skipState = buildSkipStateFromPattern(segment.skipPattern);
        const events = [];
        const velocityVolumeModPattern = 'none';

        segment.chordSequence.forEach((chord, index) => {
            const chordStart = index * barSeconds;
            const chordEnd = chordStart + barSeconds;
            const chordNotes = getResolvedChordNotes(chord);
            const highNotes = getHighNotesForPattern(chordNotes, segment.doubleHighEnabled);

            if (part === 'bass') {
                schedulePreviewNotes(
                    chordNotes.bass,
                    chordStart,
                    chordEnd,
                    bassCycleSeconds,
                    barSeconds,
                    0.4 * segment.bassPlaybackVolume,
                    {
                        applySkip: false,
                        volumeModPattern: velocityVolumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    },
                    events
                );
                return;
            }

            if (segment.patternMode === 'normal') {
                schedulePreviewNotes(
                    highNotes,
                    chordStart,
                    chordEnd,
                    highCycleSeconds,
                    barSeconds,
                    0.24 * segment.highPlaybackVolume,
                    {
                        applySkip: true,
                        volumeModPattern: velocityVolumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    },
                    events
                );
            } else {
                schedulePreviewArpeggio(
                    highNotes,
                    chordStart,
                    chordEnd,
                    highCycleSeconds,
                    barSeconds,
                    0.24 * segment.highPlaybackVolume,
                    segment.patternMode,
                    {
                        applySkip: true,
                        volumeModPattern: velocityVolumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    },
                    events
                );
            }
        });

        const volumePattern = part === 'treble'
            ? segment.synthTrebleVolumeModPattern
            : segment.synthBassVolumeModPattern;
        const outputGain = part === 'treble'
            ? segment.synthTrebleOutputGain
            : segment.synthBassOutputGain;
        const fastestMultiplier = Math.min(...DURATION_MULTIPLIERS);
        addSynthVolumeAutomation(
            events,
            barSeconds,
            segment.chordSequence.length,
            volumePattern,
            outputGain,
            part,
            {
                midiVolumeModPattern: segment.volumeModPattern,
                rhythmMultiplier: part === 'treble' ? segment.highDurationMultiplier : segment.bassDurationMultiplier,
                fastestMultiplier
            }
        );

        return {
            events,
            durationSeconds: segment.chordSequence.length * barSeconds,
            preset: part === 'bass' ? segment.group.synthBassPreset : segment.group.synthTreblePreset,
            effects: getSynthEffectsFromGroup(segment.group, part),
            bpm: segment.bpm
        };
    }).filter((segment) => segment.events.length > 0);
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
        for (let i = 0; i < text.length; i += 1) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
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

    return new Blob([view], { type: 'audio/wav' });
}

function mixBuffersToWav(buffers, sampleRate = 44100) {
    const validBuffers = buffers.filter(Boolean);
    if (validBuffers.length === 0) return null;
    if (validBuffers.length === 1) {
        return encodeWavFromBuffer(validBuffers[0]);
    }
    const maxLength = Math.max(...validBuffers.map((buffer) => buffer.length));
    const offlineCtx = new OfflineAudioContext(2, maxLength, sampleRate);
    validBuffers.forEach((buffer) => {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        source.start(0);
    });
    return offlineCtx.startRendering().then((mixedBuffer) => encodeWavFromBuffer(mixedBuffer));
}

function getBpmValue(group) {
    const raw = parseInt(group?.bpmInput?.value ?? '', 10);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_BPM;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, raw));
}

function updateRhythmSelectOptions(group) {
    if (!group?.bassRhythmSelect || !group?.highRhythmSelect) return;
    const bpm = getBpmValue(group);
    const currentBass = parseInt(group.bassRhythmSelect.value || group.bassDurationMultiplier, 10) || group.bassDurationMultiplier;
    const currentHigh = parseInt(group.highRhythmSelect.value || group.highDurationMultiplier, 10) || group.highDurationMultiplier;

    group.bassRhythmSelect.innerHTML = '';
    group.highRhythmSelect.innerHTML = '';

    DURATION_MULTIPLIERS.forEach((value, index) => {
        const seconds = (value / bpm).toFixed(2);
        const labelHtml = `${NOTE_SYMBOLS_HTML[index]} ${seconds}s`;

        const bassOption = document.createElement('option');
        bassOption.value = String(value);
        bassOption.innerHTML = labelHtml;
        group.bassRhythmSelect.appendChild(bassOption);

        const highOption = document.createElement('option');
        highOption.value = String(value);
        highOption.innerHTML = labelHtml;
        group.highRhythmSelect.appendChild(highOption);
    });

    group.bassRhythmSelect.value = String(currentBass);
    group.highRhythmSelect.value = String(currentHigh);
    group.bassDurationMultiplier = parseInt(group.bassRhythmSelect.value, 10) || DEFAULT_BASS_DURATION;
    group.highDurationMultiplier = parseInt(group.highRhythmSelect.value, 10) || DEFAULT_HIGH_DURATION;
}

function secondsToTicks(seconds, bpm) {
    const ticks = Math.round((seconds * bpm * MIDI_TICKS_PER_BEAT) / 60);
    return Math.max(1, ticks);
}

function ticksToSeconds(ticks, bpm) {
    return (ticks * 60) / (bpm * MIDI_TICKS_PER_BEAT);
}

function clampVelocity(value) {
    return Math.max(1, Math.min(127, Math.round(value)));
}

function addMidiEvents(track, events) {
    const typeOrder = { tempo: 0, off: 1, on: 2 };
    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type !== b.type) {
            return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
        }
        return (a.note ?? 0) - (b.note ?? 0);
    });

    let lastTime = 0;
    events.forEach(event => {
        const delta = Math.max(0, event.time - lastTime);
        if (event.type === 'tempo') {
            track.setTempo(event.bpm, delta);
        } else if (event.type === 'on') {
            track.noteOn(0, event.note, delta, event.velocity);
        } else {
            track.noteOff(0, event.note, delta, event.velocity);
        }
        lastTime = event.time;
    });
}

function scheduleMidiNotes(events, notes, startTick, endTick, cycleTicks, velocity) {
    if (!notes || notes.length === 0) return;
    const noteDurationTicks = Math.max(1, Math.round(cycleTicks * MIDI_NOTE_DURATION_FACTOR));

    for (let offset = 0; offset < (endTick - startTick); offset += cycleTicks) {
        const onTime = startTick + offset;
        const offTime = Math.min(endTick, onTime + noteDurationTicks);
        notes.forEach(note => {
            events.push({ type: 'on', time: onTime, note, velocity });
            events.push({ type: 'off', time: offTime, note, velocity });
        });
    }
}

function scheduleMidiNotesWithMods(events, notes, startTick, endTick, cycleTicks, bpm, barStartSeconds, barSeconds, baseVelocity, pattern, delayState, applySkip, skipState, volumeModPattern, delayModPattern) {
    if (!notes || notes.length === 0) return;
    const cycleSeconds = ticksToSeconds(cycleTicks, bpm);
    const ordered = [...notes].sort((a, b) => a - b);
    for (let offset = 0; offset < (endTick - startTick); offset += cycleTicks) {
        const cycleIndex = Math.floor(offset / cycleTicks);
        if (applySkip && pattern !== 'normal' && shouldSkipNextFromState(skipState)) {
            continue;
        }
        const cycleStartTick = startTick + offset;
        const cycleStartSeconds = ticksToSeconds(cycleStartTick, bpm);
        if (pattern === 'normal') {
            if (applySkip && shouldSkipNextFromState(skipState)) {
                continue;
            }
            const noteDurationSeconds = cycleSeconds * MIDI_NOTE_DURATION_FACTOR;
            const cyclePosition = barSeconds > 0 ? (cycleStartSeconds - barStartSeconds) / barSeconds : 0;
            const volumeMultiplier = getVolumeModMultiplier(volumeModPattern, cyclePosition);
            const velocity = clampVelocity(baseVelocity * volumeMultiplier);
            ordered.forEach(note => {
                const delayOffsetSeconds = getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, delayState);
                const onTimeSeconds = cycleStartSeconds + delayOffsetSeconds;
                const onTime = startTick + secondsToTicks(onTimeSeconds - barStartSeconds, bpm);
                const offTime = Math.min(endTick, onTime + secondsToTicks(noteDurationSeconds, bpm));
                events.push({ type: 'on', time: onTime, note, velocity });
                events.push({ type: 'off', time: offTime, note, velocity });
            });
        } else {
            const noteDurationSeconds = cycleSeconds * MIDI_NOTE_DURATION_FACTOR;
            const notesForCycle = getPatternNotesForCycle(ordered, pattern, cycleIndex);
            const cyclePosition = barSeconds > 0 ? (cycleStartSeconds - barStartSeconds) / barSeconds : 0;
            const volumeMultiplier = getVolumeModMultiplier(volumeModPattern, cyclePosition);
            const delayOffsetSeconds = getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, delayState);
            const onTimeSeconds = cycleStartSeconds + delayOffsetSeconds;
            const onTime = startTick + secondsToTicks(onTimeSeconds - barStartSeconds, bpm);
            const offTime = Math.min(endTick, onTime + secondsToTicks(noteDurationSeconds, bpm));
            const velocity = clampVelocity(baseVelocity * volumeMultiplier);
            notesForCycle.forEach(note => {
                events.push({ type: 'on', time: onTime, note, velocity });
                events.push({ type: 'off', time: offTime, note, velocity });
            });
        }
    }
}

function scheduleUiHighlight(group, index, atTime) {
    const delayMs = Math.max(0, (atTime - getPreviewNowSeconds()) * 1000);
    const timerId = setTimeout(() => {
        if (isSequencePreviewing) {
            setChordPreviewPlaying(group, index);
        }
    }, delayMs);
    return timerId;
}

function getVolumeModMultiplier(volumeMod, cyclePosition) {
    if (!volumeMod || volumeMod === 'none') {
        return 1.0;
    }
    const pos = Math.max(0, Math.min(1, cyclePosition));
    const curvedPos = applyVolumeCurve(pos);
    const minDb = linearToDb(VOLUME_MOD_MIN);
    const maxDb = linearToDb(VOLUME_MOD_MAX);
    switch (volumeMod) {
        case 'uphill':
            return dbToLinear(minDb + (curvedPos * (maxDb - minDb)));
        case 'downhill':
            return dbToLinear(maxDb - (curvedPos * (maxDb - minDb)));
        case 'valley':
            if (pos <= 0.5) {
                return dbToLinear(maxDb - (applyVolumeCurve(pos * 2) * (maxDb - minDb)));
            }
            return dbToLinear(minDb + (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        case 'hill':
            if (pos <= 0.5) {
                return dbToLinear(minDb + (applyVolumeCurve(pos * 2) * (maxDb - minDb)));
            }
            return dbToLinear(maxDb - (applyVolumeCurve((pos - 0.5) * 2) * (maxDb - minDb)));
        case '2hill': {
            const phase = (pos * 4) % 2;
            if (phase <= 1) {
                return dbToLinear(minDb + (applyVolumeCurve(phase) * (maxDb - minDb)));
            }
            return dbToLinear(maxDb - (applyVolumeCurve(phase - 1) * (maxDb - minDb)));
        }
        default: {
            const nhillMatch = volumeMod && volumeMod.match(/^(\d+)hill$/);
            if (nhillMatch) {
                const n = Math.max(1, Math.min(99, parseInt(nhillMatch[1], 10)));
                const phase = (pos * 2 * n) % 2;
                if (phase <= 1) {
                    return dbToLinear(minDb + (applyVolumeCurve(phase) * (maxDb - minDb)));
                }
                return dbToLinear(maxDb - (applyVolumeCurve(phase - 1) * (maxDb - minDb)));
            }
            return 1.0;
        }
    }
}

function getLinearVolumeModMultiplier(volumeMod, cyclePosition) {
    if (!volumeMod || volumeMod === 'none') {
        return 1.0;
    }
    const pos = Math.max(0, Math.min(1, cyclePosition));
    const minDb = linearToDb(VOLUME_MOD_MIN);
    const maxDb = linearToDb(VOLUME_MOD_MAX);
    switch (volumeMod) {
        case 'uphill':
            return dbToLinear(minDb + (pos * (maxDb - minDb)));
        case 'downhill':
            return dbToLinear(maxDb - (pos * (maxDb - minDb)));
        case 'valley':
            if (pos <= 0.5) {
                return dbToLinear(maxDb - ((pos * 2) * (maxDb - minDb)));
            }
            return dbToLinear(minDb + (((pos - 0.5) * 2) * (maxDb - minDb)));
        case 'hill':
            if (pos <= 0.5) {
                return dbToLinear(minDb + ((pos * 2) * (maxDb - minDb)));
            }
            return dbToLinear(maxDb - (((pos - 0.5) * 2) * (maxDb - minDb)));
        case '2hill': {
            const phase = (pos * 4) % 2;
            if (phase <= 1) {
                return dbToLinear(minDb + (phase * (maxDb - minDb)));
            }
            return dbToLinear(maxDb - ((phase - 1) * (maxDb - minDb)));
        }
        default: {
            const nhillMatch = volumeMod && volumeMod.match(/^(\d+)hill$/);
            if (nhillMatch) {
                const n = Math.max(1, Math.min(99, parseInt(nhillMatch[1], 10)));
                const phase = (pos * 2 * n) % 2;
                if (phase <= 1) {
                    return dbToLinear(minDb + (phase * (maxDb - minDb)));
                }
                return dbToLinear(maxDb - ((phase - 1) * (maxDb - minDb)));
            }
            return 1.0;
        }
    }
}

function applyVolumeCurve(pos) {
    const clamped = Math.max(0, Math.min(1, pos));
    return Math.pow(clamped, VOLUME_MOD_CURVE);
}

function linearToDb(value) {
    return 20 * Math.log10(Math.max(value, 0.0001));
}

function dbToLinear(db) {
    return Math.pow(10, db / 20);
}

function getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, state) {
    if (!delayModPattern || delayModPattern === 'none') {
        return 0;
    }
    if (delayModPattern !== 'human' && delayModPattern !== 'drunk') {
        return 0;
    }
    if (!state) return 0;
    state.counter += 1;
    const remainder = (state.counter * 0.61803398875) % 1;
    if (remainder > DELAY_MOD_CHANCE) {
        return 0;
    }
    const amount = delayModPattern === 'drunk' ? DELAY_MOD_AMOUNT_DRUNK : DELAY_MOD_AMOUNT_HUMAN;
    return noteDurationSeconds * amount * remainder;
}

function buildSkipPatternFromGroup(group) {
    const values = [group.skipSelect, group.skipSelect2, group.skipSelect3]
        .filter(Boolean)
        .map(select => parseInt(select.value, 10) || 0)
        .filter(value => value > 0);
    group.skipPattern = values;
}

function buildSkipStateFromPattern(pattern) {
    return {
        pattern: [...(pattern || [])],
        counter: 0,
        index: 0
    };
}

function shouldSkipNextFromState(state) {
    if (!state || !state.pattern.length) {
        return false;
    }
    state.counter += 1;
    const target = state.pattern[state.index];
    if (state.counter >= target) {
        state.counter = 0;
        state.index = (state.index + 1) % state.pattern.length;
        return true;
    }
    return false;
}

function getHighNotesForPattern(chordNotes, doubleHighEnabled) {
    const baseHigh = chordNotes.high;
    if (!doubleHighEnabled) {
        return baseHigh;
    }
    return baseHigh.concat(baseHigh.map(note => note + 12));
}

function schedulePreviewNotes(notes, startTime, endTime, cycleSeconds, barSeconds, gainValue, options = {}, collector = null) {
    if (!notes || notes.length === 0) return;
    const noteDuration = Math.max(0.05, cycleSeconds * MIDI_NOTE_DURATION_FACTOR);
    let cycleIndex = 0;
    for (let t = startTime; t < endTime - 0.0001; t += cycleSeconds) {
        if (options.applySkip && options.skipState && shouldSkipNextFromState(options.skipState)) {
            cycleIndex += 1;
            continue;
        }
        const cyclePosition = barSeconds > 0 ? (t - startTime) / barSeconds : 0;
        const volumeMultiplier = getVolumeModMultiplier(options.volumeModPattern, cyclePosition);
        notes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(noteDuration, options.delayModPattern, options.delayState);
            const noteStart = t + delayOffset;
            const finalGain = gainValue * volumeMultiplier;
            if (collector) {
                const velocity = gainToVelocity(finalGain);
                pushSynthNoteEvents(collector, note, noteStart, noteDuration, velocity);
            } else {
                player.playChordAtTime([note], noteStart, noteDuration, finalGain);
            }
        });
        cycleIndex += 1;
    }
}

function schedulePreviewArpeggio(notes, startTime, endTime, cycleSeconds, barSeconds, gainValue, direction, options = {}, collector = null) {
    if (!notes || notes.length === 0) return;
    const ordered = [...notes].sort((a, b) => a - b);
    const noteDuration = Math.max(0.05, cycleSeconds * MIDI_NOTE_DURATION_FACTOR);
    let cycleIndex = 0;
    for (let t = startTime; t < endTime - 0.0001; t += cycleSeconds) {
        if (options.applySkip && options.skipState && shouldSkipNextFromState(options.skipState)) {
            cycleIndex += 1;
            continue;
        }
        const notesForCycle = getPatternNotesForCycle(ordered, direction, cycleIndex);
        const cyclePosition = barSeconds > 0 ? (t - startTime) / barSeconds : 0;
        const volumeMultiplier = getVolumeModMultiplier(options.volumeModPattern, cyclePosition);
        const delayOffset = getDelayOffsetSeconds(noteDuration, options.delayModPattern, options.delayState);
        const noteStart = t + delayOffset;
        const finalGain = gainValue * volumeMultiplier;
        if (collector) {
            const velocity = gainToVelocity(finalGain);
            notesForCycle.forEach((note) => {
                pushSynthNoteEvents(collector, note, noteStart, noteDuration, velocity);
            });
        } else {
            player.playChordAtTime(notesForCycle, noteStart, noteDuration, finalGain);
        }
        cycleIndex += 1;
    }
}

function getPatternNotesForCycle(ordered, direction, cycleIndex) {
    const length = ordered.length;
    if (length === 0) return [];
    if (direction === 'descend') {
        const idx = cycleIndex % length;
        return [ordered[length - 1 - idx]];
    }
    if (direction === 'ascend2') {
        if (length < 2) {
            return [ordered[0]];
        }
        const start = cycleIndex % (length - 1);
        return [ordered[start], ordered[start + 1]];
    }
    if (direction === 'descend2') {
        if (length < 2) {
            return [ordered[length - 1]];
        }
        const start = cycleIndex % (length - 1);
        const firstIndex = length - 1 - start;
        const secondIndex = length - 2 - start;
        return [ordered[firstIndex], ordered[secondIndex]];
    }
    const idx = cycleIndex % length;
    return [ordered[idx]];
}

function clearPreviewTimers() {
    previewTimers.forEach((timer) => clearTimeout(timer));
    previewTimers = [];
}

function clearResyncTimer() {
    if (resyncTimerId) {
        clearTimeout(resyncTimerId);
        resyncTimerId = null;
    }
}

function schedulePreviewTimer(fn, delayMs) {
    const timerId = setTimeout(fn, delayMs);
    previewTimers.push(timerId);
    return timerId;
}

function clearSynthPlayTimers() {
    synthPlayTimers.forEach((timer) => clearTimeout(timer));
    synthPlayTimers = [];
}

function scheduleSynthPlay(fn, delayMs) {
    const timerId = setTimeout(fn, delayMs);
    synthPlayTimers.push(timerId);
    return timerId;
}

function clearAllHighlights() {
    panelGroups.forEach((group) => setChordPreviewPlaying(group, null));
    if (randomByKeyPreview) {
        randomByKeyPreview.querySelectorAll('.chord-preview-item').forEach((el) => el.classList.remove('playing'));
    }
}

function collectSegments() {
    return panelGroups
        .map((group) => buildSegment(group))
        .filter((segment) => segment && segment.chordSequence.length > 0);
}

function buildSegment(group) {
    if (!group?.chordInput) {
        return null;
    }
    syncGroupFromInputs(group, { stopOnEmpty: false });
    const previousChords = group.chordSequence;
    group.chordSequence = engine.parseChordSequence(group.chordInput.value);
    preserveTrebleNotes(previousChords, group.chordSequence);
    updateChordPreview(group);
    return {
        group,
        chordSequence: group.chordSequence,
        bpm: getBpmValue(group),
        bassDurationMultiplier: group.bassDurationMultiplier,
        highDurationMultiplier: group.highDurationMultiplier,
        volumeModPattern: group.volumeModPattern,
        delayModPattern: group.delayModPattern,
        patternMode: group.patternMode,
        skipPattern: group.skipPattern,
        doubleHighEnabled: group.doubleHighEnabled,
        bassPlaybackVolume: group.bassPlaybackVolume,
        highPlaybackVolume: group.highPlaybackVolume,
        synthBassVolumeModPattern: group.synthBassVolumeModPattern,
        synthTrebleVolumeModPattern: group.synthTrebleVolumeModPattern,
        synthBassOutputGain: group.synthBassOutputGain,
        synthTrebleOutputGain: group.synthTrebleOutputGain
    };
}

function getPreviewSegments() {
    // Use dropdown as source of truth so "ALL sequences" is always respected when set in ⚙️
    if (playOptionsLoopSelect) {
        loopMode = playOptionsLoopSelect.value === 'this' ? 'this' : 'all';
    }
    if (loopMode === 'this') {
        const group = getActiveGroup();
        const segment = buildSegment(group);
        return segment && segment.chordSequence.length > 0 ? [segment] : [];
    }
    return collectSegments();
}

async function startPreview({ fromLoop = false, startAt = null, loopOnlyActiveSequence = false } = {}) {
    if (!fromLoop) {
        stopPreview();
    } else {
        clearPreviewTimers();
        clearSynthPlayTimers();
    }
    clearResyncTimer();
    previewTimeline = [];

    if (loopOnlyActiveSequence) {
        previewLoopOnlyActiveSequence = true;
    } else if (!fromLoop) {
        previewLoopOnlyActiveSequence = false;
    }
    const segments = (loopOnlyActiveSequence || previewLoopOnlyActiveSequence)
        ? (() => {
            const activeGroup = getActiveGroup();
            const segment = buildSegment(activeGroup);
            return segment && segment.chordSequence.length > 0 ? [segment] : [];
        })()
        : getPreviewSegments();
    if (segments.length === 0) {
        alert('Please enter at least one valid chord.');
        return;
    }

    const useSynth = isSynthEnabled();
    if (useSynth) {
        await ensureSynthReady();
    } else {
        await player.ensureReady();
    }
    isPreviewing = true;
    isSequencePreviewing = true;
    updatePreviewToggleLabel();

    const now = getPreviewNowSeconds();
    const uiStartTime = now + 0.05 + (useSynth ? SYNTH_PRELOAD_SECONDS : 0);
    const audioStartTime = useSynth ? 0 : now + 0.05;
    const loopStartTime = audioStartTime;
    const synthSegments = useSynth ? [] : null;
    // When looping, always start from the beginning so all panels play. When user first presses Play, start from active panel.
    let resolvedStartAt = startAt;
    if (!resolvedStartAt) {
        if (fromLoop) {
            resolvedStartAt = { segmentIndex: 0, chordIndex: 0 };
        } else {
            const activeGroup = getActiveGroup();
            const activeIndex = segments.findIndex((segment) => segment.group === activeGroup);
            resolvedStartAt = {
                segmentIndex: activeIndex >= 0 ? activeIndex : 0,
                chordIndex: 0
            };
        }
    }
    const startAtSegmentIndex = Math.max(0, Math.min((resolvedStartAt?.segmentIndex ?? 0), segments.length - 1));
    const startAtChordIndex = Math.max(0, resolvedStartAt?.chordIndex ?? 0);
    let audioCursor = audioStartTime;
    let uiCursor = uiStartTime;

    segments.forEach((segment, segmentIndex) => {
        if (segmentIndex < startAtSegmentIndex) {
            return;
        }
        const barSeconds = (60 / segment.bpm) * CHORD_BAR_BEATS;
        const bassCycleSeconds = segment.bassDurationMultiplier / segment.bpm;
        const highCycleSeconds = segment.highDurationMultiplier / segment.bpm;
        const delayState = { counter: 0 };
        const skipState = buildSkipStateFromPattern(segment.skipPattern);
        const chordStartIndex = segmentIndex === startAtSegmentIndex
            ? Math.min(startAtChordIndex, Math.max(0, segment.chordSequence.length - 1))
            : 0;

        const segmentBassEvents = useSynth ? [] : null;
        const segmentTrebleEvents = useSynth ? [] : null;
        const velocityVolumeModPattern = useSynth ? 'none' : segment.volumeModPattern;
        const barsToPlay = Math.max(0, segment.chordSequence.length - chordStartIndex);
        segment.chordSequence.forEach((chord, index) => {
            if (index < chordStartIndex) {
                return;
            }
            const relativeIndex = index - chordStartIndex;
            const chordStartAudio = useSynth
                ? (relativeIndex * barSeconds)
                : (audioCursor + (relativeIndex * barSeconds));
            const chordEndAudio = chordStartAudio + barSeconds;
            const chordStartUi = uiCursor + (relativeIndex * barSeconds);
            const chordNotes = getResolvedChordNotes(chord);
            const highNotes = getHighNotesForPattern(chordNotes, segment.doubleHighEnabled);

            previewTimeline.push({
                time: chordStartUi,
                segmentIndex,
                chordIndex: index
            });

            schedulePreviewNotes(
                chordNotes.bass,
                chordStartAudio,
                chordEndAudio,
                bassCycleSeconds,
                barSeconds,
                0.4 * segment.bassPlaybackVolume,
                {
                    applySkip: false,
                    volumeModPattern: velocityVolumeModPattern,
                    delayModPattern: segment.delayModPattern,
                    delayState,
                    skipState
                },
                segmentBassEvents
            );

            if (segment.patternMode === 'normal') {
                schedulePreviewNotes(
                    highNotes,
                    chordStartAudio,
                    chordEndAudio,
                    highCycleSeconds,
                    barSeconds,
                    0.24 * segment.highPlaybackVolume,
                    {
                        applySkip: true,
                        volumeModPattern: velocityVolumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    },
                    segmentTrebleEvents
                );
            } else {
                schedulePreviewArpeggio(
                    highNotes,
                    chordStartAudio,
                    chordEndAudio,
                    highCycleSeconds,
                    barSeconds,
                    0.24 * segment.highPlaybackVolume,
                    segment.patternMode,
                    {
                        applySkip: true,
                        volumeModPattern: velocityVolumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    },
                    segmentTrebleEvents
                );
            }

            schedulePreviewTimer(() => {
                if (isSequencePreviewing) {
                    clearAllHighlights();
                    setChordPreviewPlaying(segment.group, index);
                }
            }, Math.max(0, (chordStartUi - getPreviewNowSeconds()) * 1000));
        });

        if (useSynth && barsToPlay > 0) {
            const fastestMultiplier = Math.min(...DURATION_MULTIPLIERS);
            addSynthVolumeAutomation(
                segmentBassEvents,
                barSeconds,
                barsToPlay,
                getSynthVolumeModPattern(segment.group, 'bass'),
                segment.group.synthBassOutputGain,
                'bass',
                {
                    midiVolumeModPattern: segment.volumeModPattern,
                    rhythmMultiplier: segment.bassDurationMultiplier,
                    fastestMultiplier
                }
            );
            addSynthVolumeAutomation(
                segmentTrebleEvents,
                barSeconds,
                barsToPlay,
                getSynthVolumeModPattern(segment.group, 'treble'),
                segment.group.synthTrebleOutputGain,
                'treble',
                {
                    midiVolumeModPattern: segment.volumeModPattern,
                    rhythmMultiplier: segment.highDurationMultiplier,
                    fastestMultiplier
                }
            );
        }

        const segmentDuration = Math.max(0, segment.chordSequence.length - chordStartIndex) * barSeconds;
        if (useSynth && (segmentBassEvents?.length || segmentTrebleEvents?.length)) {
            const segmentStartDelaySeconds = Math.max(0, (uiCursor - now) - SYNTH_PRELOAD_SECONDS);
            synthSegments.push({
                group: segment.group,
                bassEvents: segmentBassEvents,
                trebleEvents: segmentTrebleEvents,
                durationSeconds: segmentDuration,
                startDelaySeconds: segmentStartDelaySeconds,
                bpm: segment.bpm
            });
        }
        audioCursor += segmentDuration;
        uiCursor += segmentDuration;
    });

    const totalDurationSeconds = Math.max(0, audioCursor - loopStartTime);
    if (useSynth && synthSegments && synthSegments.length) {
        synthSegments.forEach((segment) => {
            if (segment.bassEvents && segment.bassEvents.length) {
                scheduleSynthPlay(() => {
                    if (!isSequencePreviewing) return;
                    const engine = getSynthEngine('bass');
                    if (!engine) return;
                    applySynthSettingsFromGroup(segment.group, 'bass');
                    engine.play(
                        { events: segment.bassEvents, durationSeconds: segment.durationSeconds, bpm: segment.bpm },
                        null,
                        null,
                        { overlap: true, preloadSeconds: SYNTH_PRELOAD_SECONDS }
                    );
                }, segment.startDelaySeconds * 1000);
            }
            if (segment.trebleEvents && segment.trebleEvents.length) {
                scheduleSynthPlay(() => {
                    if (!isSequencePreviewing) return;
                    const engine = getSynthEngine('treble');
                    if (!engine) return;
                    applySynthSettingsFromGroup(segment.group, 'treble');
                    engine.play(
                        { events: segment.trebleEvents, durationSeconds: segment.durationSeconds, bpm: segment.bpm },
                        null,
                        null,
                        { overlap: true, preloadSeconds: SYNTH_PRELOAD_SECONDS }
                    );
                }, segment.startDelaySeconds * 1000);
            }
        });
    }

    const loopDurationMs = Math.max(0, totalDurationSeconds * 1000);
    schedulePreviewTimer(() => {
        if (isSequencePreviewing) {
            clearAllHighlights();
            startPreview({ fromLoop: true, loopOnlyActiveSequence: previewLoopOnlyActiveSequence });
        }
    }, loopDurationMs);
}

function stopPreview() {
    if (!isPreviewing && !isSequencePreviewing) {
        clearAllHighlights();
        return;
    }
    clearPreviewTimers();
    clearResyncTimer();
    clearSynthPlayTimers();
    const bassEngine = getSynthEngine('bass');
    const trebleEngine = getSynthEngine('treble');
    if (bassEngine) bassEngine.stop();
    if (trebleEngine && trebleEngine !== bassEngine) trebleEngine.stop();
    player.stopAll();
    isPreviewing = false;
    isSequencePreviewing = false;
    previewLoopOnlyActiveSequence = false;
    clearAllHighlights();
    updatePreviewToggleLabel();
}

function requestPreviewResync(group = null) {
    const targetGroup = group || getActiveGroup();
    updateChordPreviewItemsSettings(targetGroup);
    if (!isSequencePreviewing || !previewTimeline.length) {
        return;
    }
    if (resyncTimerId) {
        return;
    }
    const now = getPreviewNowSeconds();
    const nextItem = previewTimeline.find(item => item.time > now + 0.01) || previewTimeline[0];
    const delayMs = Math.max(0, (nextItem.time - now) * 1000);
    resyncTimerId = setTimeout(() => {
        resyncTimerId = null;
        if (!isSequencePreviewing) {
            return;
        }
        stopPreview();
        startPreview({ fromLoop: true, startAt: { segmentIndex: nextItem.segmentIndex, chordIndex: nextItem.chordIndex } }).catch(() => {});
    }, delayMs);
}

async function playChordOnce(group, chord, index) {
    if (!group || !chord) return;
    if (isSequencePreviewing) {
        stopPreview();
    }
    const bpm = getBpmValue(group);
    const durationSeconds = 60 / bpm;
    const chordNotes = getResolvedChordNotes(chord);
    const bassNotes = chordNotes.bass;
    const highNotes = getHighNotesForPattern(chordNotes, group.doubleHighEnabled);
    const volumeMultiplier = isSynthEnabled()
        ? 1
        : getVolumeModMultiplier(group.volumeModPattern, 0.5);
    setChordPreviewPlaying(group, index);
    isPreviewing = true;
    const delayState = { counter: 0 };

    if (isSynthEnabled()) {
        await ensureSynthReady();
        const bassEvents = [];
        const trebleEvents = [];
        const fastestMultiplier = Math.min(...DURATION_MULTIPLIERS);
        addSynthVolumeAutomation(
            bassEvents,
            durationSeconds,
            1,
            getSynthVolumeModPattern(group, 'bass'),
            group.synthBassOutputGain,
            'bass',
            {
                midiVolumeModPattern: group.volumeModPattern,
                rhythmMultiplier: group.bassDurationMultiplier,
                fastestMultiplier
            }
        );
        addSynthVolumeAutomation(
            trebleEvents,
            durationSeconds,
            1,
            getSynthVolumeModPattern(group, 'treble'),
            group.synthTrebleOutputGain,
            'treble',
            {
                midiVolumeModPattern: group.volumeModPattern,
                rhythmMultiplier: group.highDurationMultiplier,
                fastestMultiplier
            }
        );
        bassNotes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
            const velocity = gainToVelocity(0.3 * volumeMultiplier * group.bassPlaybackVolume);
            pushSynthNoteEvents(bassEvents, note, delayOffset, durationSeconds, velocity);
        });
        highNotes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
            const velocity = gainToVelocity(0.3 * volumeMultiplier * group.highPlaybackVolume);
            pushSynthNoteEvents(trebleEvents, note, delayOffset, durationSeconds, velocity);
        });
        if (bassEvents.length) {
            const engine = getSynthEngine('bass');
            if (engine) {
                applySynthSettingsFromGroup(group, 'bass');
                engine.play(
                { events: bassEvents, durationSeconds: durationSeconds + 0.05, bpm },
                null,
                null,
                { overlap: true, preloadSeconds: SYNTH_PRELOAD_SECONDS }
                );
            }
        }
        if (trebleEvents.length) {
            const engine = getSynthEngine('treble');
            if (engine) {
                applySynthSettingsFromGroup(group, 'treble');
                engine.play(
                { events: trebleEvents, durationSeconds: durationSeconds + 0.05, bpm },
                null,
                null,
                { overlap: true, preloadSeconds: SYNTH_PRELOAD_SECONDS }
                );
            }
        }
    } else {
        const baseTime = player.getCurrentTime() + 0.01;
        bassNotes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
            player.playChordAtTime([note], baseTime + delayOffset, durationSeconds, 0.3 * volumeMultiplier * group.bassPlaybackVolume);
        });
        highNotes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
            player.playChordAtTime([note], baseTime + delayOffset, durationSeconds, 0.3 * volumeMultiplier * group.highPlaybackVolume);
        });
    }

    setTimeout(() => {
        if (!isSequencePreviewing) {
            isPreviewing = false;
            setChordPreviewPlaying(group, null);
        }
    }, durationSeconds * 1000);
}

function playSingleChord(group, chord, index) {
    playChordOnce(group, chord, index);
}

const TREBLE_NOTE_PREVIEW_DURATION = 0.4;

async function playSingleTrebleNote(group, midiNote) {
    if (!group || midiNote == null) return;
    if (isSynthEnabled()) {
        await ensureSynthReady();
        const trebleEngine = getSynthEngine('treble');
        if (!trebleEngine) return;
        applySynthSettingsFromGroup(group, 'treble');
        const velocity = gainToVelocity(0.3 * (group.synthTrebleOutputGain ?? 1));
        const events = [];
        pushSynthNoteEvents(events, midiNote, 0, TREBLE_NOTE_PREVIEW_DURATION, velocity);
        trebleEngine.play(
            { events, durationSeconds: TREBLE_NOTE_PREVIEW_DURATION + 0.05, bpm: getBpmValue(group) },
            null,
            null,
            { overlap: true, preloadSeconds: SYNTH_PRELOAD_SECONDS }
        );
    } else {
        await player.ensureReady();
        const baseTime = player.getCurrentTime() + 0.01;
        player.playChordAtTime([midiNote], baseTime, TREBLE_NOTE_PREVIEW_DURATION, 0.3 * (group.highPlaybackVolume ?? 1));
    }
}

async function exportMidiFile() {
    const segments = collectSegments();
    if (!segments.length) {
        alert('Please enter at least one valid chord.');
        return;
    }
    if (!window.Midi) {
        alert('MIDI library not loaded yet.');
        return;
    }
    const file = new window.Midi.File({ ticks: MIDI_TICKS_PER_BEAT });
    const bassTrack = new window.Midi.Track();
    const highTrack = new window.Midi.Track();
    file.addTrack(bassTrack);
    file.addTrack(highTrack);
    const bassEvents = [];
    const highEvents = [];
    let currentTick = 0;

    segments.forEach((segment) => {
        const bpm = segment.bpm;
        const barSeconds = (60 / bpm) * CHORD_BAR_BEATS;
        const barTicks = secondsToTicks(barSeconds, bpm);
        const delayState = { counter: 0 };
        const skipState = buildSkipStateFromPattern(segment.skipPattern);

        bassEvents.push({ type: 'tempo', time: currentTick, bpm });

        segment.chordSequence.forEach((chord, index) => {
            const chordNotes = getResolvedChordNotes(chord);
            const highNotes = getHighNotesForPattern(chordNotes, segment.doubleHighEnabled);
            const startTick = currentTick + (index * barTicks);
            const endTick = startTick + barTicks;
            const bassCycleTicks = secondsToTicks(segment.bassDurationMultiplier / bpm, bpm);
            const highCycleTicks = secondsToTicks(segment.highDurationMultiplier / bpm, bpm);
            const barStartSeconds = ticksToSeconds(startTick, bpm);

            scheduleMidiNotesWithMods(
                bassEvents,
                chordNotes.bass,
                startTick,
                endTick,
                bassCycleTicks,
                bpm,
                barStartSeconds,
                barSeconds,
                96,
                'normal',
                delayState,
                false,
                skipState,
                segment.volumeModPattern,
                segment.delayModPattern
            );
            scheduleMidiNotesWithMods(
                highEvents,
                highNotes,
                startTick,
                endTick,
                highCycleTicks,
                bpm,
                barStartSeconds,
                barSeconds,
                80,
                segment.patternMode,
                delayState,
                true,
                skipState,
                segment.volumeModPattern,
                segment.delayModPattern
            );
        });

        currentTick += segment.chordSequence.length * barTicks;
    });

    addMidiEvents(bassTrack, bassEvents);
    addMidiEvents(highTrack, highEvents);

    const midiBytes = file.toBytes();
    const safSave = await saveMidiWithSaf(midiBytes);
    if (safSave) {
        alert('Saved MIDI to your selected location.');
        return;
    }

    const nativeSave = await saveMidiToFilesystem(midiBytes);
    if (nativeSave) {
        alert(`Saved MIDI to ${nativeSave}.`);
        return;
    }
    if (window.Capacitor?.isNativePlatform?.()) {
        alert('Unable to save MIDI to device storage. Check storage permissions or try again.');
        return;
    }

    const blob = new Blob([bytesToUint8Array(midiBytes)], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chord-canvas-${Date.now()}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bytesToUint8Array(data) {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
        out[i] = data.charCodeAt(i) & 0xff;
    }
    return out;
}

function uint8ToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

async function saveMidiToFilesystem(midiBytes) {
    const capacitor = window.Capacitor;
    const filesystem = capacitor?.Plugins?.Filesystem;
    if (!capacitor?.isNativePlatform?.() || !filesystem) {
        return null;
    }

    const fileName = `chord-canvas-${Date.now()}.mid`;
    const data = uint8ToBase64(bytesToUint8Array(midiBytes));
    const directories = ['DOCUMENTS', 'DATA'];
    for (const directory of directories) {
        try {
            await filesystem.writeFile({
                path: fileName,
                data,
                directory
            });
            return directory === 'DOCUMENTS'
                ? `Documents/${fileName}`
                : `App data/${fileName}`;
        } catch (error) {
            console.error(`Failed to write MIDI to ${directory}:`, error);
        }
    }

    return null;
}

async function saveMidiWithSaf(midiBytes) {
    const capacitor = window.Capacitor;
    const safSave = capacitor?.Plugins?.SafSave;
    if (!capacitor?.isNativePlatform?.() || !safSave?.saveFile) {
        return null;
    }

    const fileName = `chord-canvas-${Date.now()}.mid`;
    const data = uint8ToBase64(bytesToUint8Array(midiBytes));
    try {
        const result = await safSave.saveFile({
            data,
            fileName,
            mimeType: 'audio/midi'
        });
        if (result?.cancelled) {
            return null;
        }
        return result?.uri || null;
    } catch (error) {
        console.error('SAF save failed:', error);
        return null;
    }
}

function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}

function midiToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Returns { bass, high } for a chord. If the chord has custom treble (trebleNotes),
 * use that for high; otherwise use engine default. Bass is always from engine.
 */
function getResolvedChordNotes(chord) {
    if (!chord) return { bass: [], high: [] };
    const defaultNotes = engine.chordToMIDINotes(chord);
    if (Array.isArray(chord.trebleNotes) && chord.trebleNotes.length > 0) {
        return { bass: defaultNotes.bass, high: [...chord.trebleNotes].sort((a, b) => a - b) };
    }
    return defaultNotes;
}

/** Parse "C4", "F#5", "Bb3" etc. to MIDI number, or null if invalid. */
function noteNameToMidi(text) {
    if (!engine || typeof text !== 'string') return null;
    const t = text.trim();
    const m = t.match(/^([A-Ga-g](?:#|b)?)\s*(\d+)$/);
    if (!m) return null;
    const octave = parseInt(m[2], 10);
    if (!Number.isFinite(octave) || octave < 0 || octave > 9) return null;
    let name = m[1].length === 1 ? m[1].toUpperCase() : m[1].charAt(0).toUpperCase() + m[1].slice(1);
    if (name.length === 2 && name.charAt(1) === 'b') {
        const flatToSharp = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
        name = flatToSharp[name] || name;
    }
    const noteIndex = engine.noteToIndex[name];
    if (noteIndex === undefined) return null;
    return (octave + 1) * 12 + noteIndex;
}

/** Minimum MIDI value allowed for a treble note (highest bass note of chord). */
function getTrebleMinMidi(chord) {
    if (!chord) return 0;
    const def = engine.chordToMIDINotes(chord);
    if (!def.bass.length) return 0;
    return Math.max(...def.bass);
}

function updateCurrentHighNotes(group, index) {
    if (!group?.currentHighNotes) return;
    if (index === null || index === undefined || !group.chordSequence[index]) {
        group.currentHighNotes.textContent = '';
        return;
    }
    const chordNotes = getResolvedChordNotes(group.chordSequence[index]);
    const lowNames = chordNotes.bass.map(midiToNoteName);
    const highNotes = getHighNotesForPattern(chordNotes, group.doubleHighEnabled);
    const highNames = highNotes.map(midiToNoteName);
    group.currentHighNotes.textContent = `Low notes: ${lowNames.join(', ')} | High notes: ${highNames.join(', ')}`;
}

function updatePreviewToggleLabel() {
    const nextText = isSynthPreloading
        ? 'Preloading...'
        : (isSequencePreviewing ? 'Stop' : 'Play');
    const label = previewToggle?.querySelector('.play-label');
    if (label) {
        label.textContent = nextText;
    } else if (previewToggle) {
        previewToggle.textContent = nextText;
    }
    if (randomByKeyPlayBtn) randomByKeyPlayBtn.textContent = nextText;
}

function setupPanelGroup(groupEl, group) {
    if (!groupEl) return;
    const navButtons = groupEl.querySelectorAll('nav button[data-panel]');
    const sections = groupEl.querySelectorAll('section');
    if (!navButtons.length || !sections.length) return;

    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            navButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            const panelId = button.getAttribute('data-panel');
            sections.forEach((section) => {
                section.hidden = section.id !== panelId;
            });
            if (group) {
                setActiveGroup(group);
            }
        });
    });
}

function updatePlaybackVolumeFromSliders(group) {
    const bassValue = parseInt(globalBassVolumeSlider?.value ?? '100', 10);
    const highValue = parseInt(globalHighVolumeSlider?.value ?? '100', 10);
    group.bassPlaybackVolume = Number.isFinite(bassValue) ? Math.max(0, Math.min(100, bassValue)) / 100 : 1;
    group.highPlaybackVolume = Number.isFinite(highValue) ? Math.max(0, Math.min(100, highValue)) / 100 : 1;
}

function syncGroupFromInputs(group, { stopOnEmpty = true } = {}) {
    if (!group) return;
    if (group.bassRhythmSelect) {
        group.bassDurationMultiplier = parseInt(group.bassRhythmSelect.value, 10) || DEFAULT_BASS_DURATION;
    }
    if (group.highRhythmSelect) {
        group.highDurationMultiplier = parseInt(group.highRhythmSelect.value, 10) || DEFAULT_HIGH_DURATION;
    }
    if (group.bpmInput) {
        updateRhythmSelectOptions(group);
    }
    if (group.volumeModSelect) {
        group.volumeModPattern = group.volumeModSelect.value || DEFAULT_VOLUME_MOD;
    }
    if (group.delayModSelect) {
        group.delayModPattern = group.delayModSelect.value || DEFAULT_DELAY_MOD;
    }
    if (group.patternSelect) {
        group.patternMode = group.patternSelect.value || DEFAULT_PATTERN_MODE;
    }
    if (group.doubleHighNotes) {
        group.doubleHighEnabled = group.doubleHighNotes.value === '2';
    }
    if (group.synthBassPresetSelect) {
        group.synthBassPreset = group.synthBassPresetSelect.value || 'bass';
    }
    if (group.synthTreblePresetSelect) {
        group.synthTreblePreset = group.synthTreblePresetSelect.value || 'pluck';
    }
    if (group.synthBassVolumeModSelect) {
        group.synthBassVolumeModPattern = group.synthBassVolumeModSelect.value || '2hill';
    }
    if (group.synthTrebleVolumeModSelect) {
        group.synthTrebleVolumeModPattern = group.synthTrebleVolumeModSelect.value || '3hill';
    }
    updateSynthOutputGainFromSliders(group);
    buildSkipPatternFromGroup(group);
    updatePlaybackVolumeFromSliders(group);
    updateChordSequenceFromInput(group, { stopOnEmpty });
    updateChordPreviewItemsSettings(group);
}

function registerPanelGroup(groupEl) {
    if (!groupEl) return null;
    const group = buildPanelGroupState(groupEl);
    panelGroups.push(group);
    if (!activeGroup) {
        setActiveGroup(group);
    }

    setupPanelGroup(groupEl, group);
    updateRhythmSelectOptions(group);
    buildSkipPatternFromGroup(group);
    updatePlaybackVolumeFromSliders(group);
    updateChordSequenceFromInput(group);

    if (group.chordInput) {
        group.chordInput.addEventListener('focus', () => {
            setActiveGroup(group);
        });
        group.chordInput.addEventListener('input', () => {
            autoResizeTextarea(group.chordInput);
            updateChordSequenceFromInput(group, { playOnChange: true });
        });
    }
    const seqSection = group.el?.querySelector('.panel-sequence-section');
    if (seqSection) {
        seqSection.addEventListener('click', () => {
            if (activeGroup !== group) {
                setActiveGroup(group);
                group.chordInput?.focus();
            }
        });
    }

    if (group.bassRhythmSelect) {
        group.bassRhythmSelect.addEventListener('change', (event) => {
            group.bassDurationMultiplier = parseInt(event.target.value, 10) || DEFAULT_BASS_DURATION;
            requestPreviewResync();
        });
    }

    if (group.highRhythmSelect) {
        group.highRhythmSelect.addEventListener('change', (event) => {
            group.highDurationMultiplier = parseInt(event.target.value, 10) || DEFAULT_HIGH_DURATION;
            requestPreviewResync();
        });
    }

    if (group.bpmInput) {
        const clampBpmInput = () => {
            const raw = parseInt(group.bpmInput.value, 10);
            if (!Number.isFinite(raw) || raw < MIN_BPM || raw > MAX_BPM) {
                const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Number.isFinite(raw) ? raw : DEFAULT_BPM));
                group.bpmInput.value = String(clamped);
            }
        };
        const setBpmAndSync = (value) => {
            const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, value));
            group.bpmInput.value = String(clamped);
            updateRhythmSelectOptions(group);
            requestPreviewResync();
        };
        group.bpmInput.addEventListener('input', () => {
            updateRhythmSelectOptions(group);
            requestPreviewResync();
        });
        group.bpmInput.addEventListener('blur', clampBpmInput);
        if (group.bpmDownBtn) {
            group.bpmDownBtn.addEventListener('click', () => {
                const current = getBpmValue(group);
                setBpmAndSync(current - 1);
            });
        }
        if (group.bpmUpBtn) {
            group.bpmUpBtn.addEventListener('click', () => {
                const current = getBpmValue(group);
                setBpmAndSync(current + 1);
            });
        }
    }

    if (group.volumeModSelect) {
        group.volumeModSelect.addEventListener('change', (event) => {
            group.volumeModPattern = event.target.value;
            requestPreviewResync();
        });
    }

    if (group.delayModSelect) {
        group.delayModSelect.addEventListener('change', (event) => {
            group.delayModPattern = event.target.value;
            requestPreviewResync();
        });
    }

    if (group.patternSelect) {
        group.patternSelect.addEventListener('change', (event) => {
            group.patternMode = event.target.value;
            requestPreviewResync();
        });
    }

    if (group.doubleHighNotes) {
        group.doubleHighNotes.addEventListener('change', (event) => {
            group.doubleHighEnabled = event.target.value === '2';
            updateCurrentHighNotes(group, group.currentChordIndex);
            requestPreviewResync();
        });
    }

    const updateSkipPattern = () => {
        buildSkipPatternFromGroup(group);
    };

    if (group.skipSelect) {
        group.skipSelect.addEventListener('change', () => {
            updateSkipPattern();
            requestPreviewResync();
        });
    }
    if (group.skipSelect2) {
        group.skipSelect2.addEventListener('change', () => {
            updateSkipPattern();
            requestPreviewResync();
        });
    }
    if (group.skipSelect3) {
        group.skipSelect3.addEventListener('change', () => {
            updateSkipPattern();
            requestPreviewResync();
        });
    }

    // Global Bass/Treble playback sliders are in Audio settings (? > Audio); one listener updates all groups

    const handleSynthSettingsChange = () => {
        if (group.synthBassPresetSelect) {
            group.synthBassPreset = group.synthBassPresetSelect.value || 'bass';
        }
        if (group.synthTreblePresetSelect) {
            group.synthTreblePreset = group.synthTreblePresetSelect.value || 'pluck';
        }
        if (group.synthBassVolumeModSelect) {
            group.synthBassVolumeModPattern = group.synthBassVolumeModSelect.value || '2hill';
        }
        if (group.synthTrebleVolumeModSelect) {
            group.synthTrebleVolumeModPattern = group.synthTrebleVolumeModSelect.value || '3hill';
        }
        updateSynthOutputGainFromSliders(group);
        updateChordPreviewItemsSettings(group);
        if (isSequencePreviewing && isSynthEnabled()) {
            stopPreview();
            startPreview().catch(() => {});
        }
    };

    if (group.synthBassPresetSelect) {
        group.synthBassPresetSelect.addEventListener('change', handleSynthSettingsChange);
    }
    if (group.synthBassOutputSlider) {
        group.synthBassOutputSlider.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthBassVolumeModSelect) {
        group.synthBassVolumeModSelect.addEventListener('change', handleSynthSettingsChange);
    }
    if (group.synthBassDelay) {
        group.synthBassDelay.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthBassReverb) {
        group.synthBassReverb.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthBassMidEq) {
        group.synthBassMidEq.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthTreblePresetSelect) {
        group.synthTreblePresetSelect.addEventListener('change', handleSynthSettingsChange);
    }
    if (group.synthTrebleOutputSlider) {
        group.synthTrebleOutputSlider.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthTrebleVolumeModSelect) {
        group.synthTrebleVolumeModSelect.addEventListener('change', handleSynthSettingsChange);
    }
    if (group.synthTrebleDelay) {
        group.synthTrebleDelay.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthTrebleReverb) {
        group.synthTrebleReverb.addEventListener('input', handleSynthSettingsChange);
    }
    if (group.synthTrebleMidEq) {
        group.synthTrebleMidEq.addEventListener('input', handleSynthSettingsChange);
    }

    return group;
}

function clonePanelGroup() {
    if (!panelGroup || !panelGroup.parentElement || !actionButtons) return;
    const clone = panelGroup.cloneNode(true);
    const suffix = `-${Date.now()}`;

    clone.id = `${panelGroup.id}${suffix}`;

    const elementsWithId = clone.querySelectorAll('[id]');
    elementsWithId.forEach((el) => {
        const oldId = el.id;
        const newId = `${oldId}${suffix}`;
        el.id = newId;

        if (el.tagName === 'SECTION') {
            el.hidden = oldId !== 'panel-sequence';
        }

        if (el.tagName === 'LABEL') {
            const oldFor = el.getAttribute('for');
            if (oldFor) {
                el.setAttribute('for', `${oldFor}${suffix}`);
            }
        }
    });

    const navButtons = clone.querySelectorAll('nav button[data-panel]');
    navButtons.forEach((button) => {
        const oldPanelId = button.getAttribute('data-panel');
        if (oldPanelId) {
            button.setAttribute('data-panel', `${oldPanelId}${suffix}`);
        }
        const isSequence = oldPanelId === 'panel-sequence';
        button.classList.toggle('active', isSequence);
    });

    panelGroup.parentElement.insertBefore(clone, actionButtons);
    const newGroup = registerPanelGroup(clone);
    if (newGroup) {
        setActiveGroup(newGroup);
        if (newGroup.chordInput) {
            newGroup.chordInput.focus();
        }
    }
}

function renderPresets() {
    if (!presetsList) return;
    presetsList.innerHTML = '';
    const presets = window.CHORD_PRESETS ? Object.values(window.CHORD_PRESETS) : [];
    if (!presets.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No presets available.';
        presetsList.appendChild(empty);
        return;
    }
    presets
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((preset) => {
            const item = document.createElement('div');
            item.className = 'preset-item';

            const useButton = document.createElement('button');
            useButton.type = 'button';
            useButton.className = 'preset-use';
            useButton.textContent = 'Use';
            useButton.addEventListener('click', () => {
                const group = getActiveGroup();
                if (!group?.chordInput) return;
                group.chordInput.value = preset.chords;
                autoResizeTextarea(group.chordInput);
                if (preset.bpm != null && group.bpmInput) {
                    const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Number(preset.bpm) || DEFAULT_BPM));
                    group.bpmInput.value = String(clamped);
                    updateRhythmSelectOptions(group);
                }
                updateChordSequenceFromInput(group, { playOnChange: true });
                closePresets();
            });
            const header = document.createElement('div');
            header.className = 'preset-header';

            const title = document.createElement('div');
            title.className = 'preset-title';
            title.textContent = preset.name;

            const tag = document.createElement('div');
            tag.className = 'preset-tag';
            const bpmText = preset.bpm ? ` • ${preset.bpm} BPM` : '';
            tag.textContent = `${preset.style}${bpmText}`;

            const chords = document.createElement('div');
            chords.className = 'preset-chords';
            chords.textContent = preset.chords;

            header.appendChild(title);
            header.appendChild(useButton);
            item.appendChild(header);
            item.appendChild(tag);
            item.appendChild(chords);
            presetsList.appendChild(item);
        });
}

function openPresets() {
    if (!presetsModal) return;
    presetsModal.setAttribute('aria-hidden', 'false');
    renderPresets();
}

function closePresets() {
    if (!presetsModal) return;
    presetsModal.setAttribute('aria-hidden', 'true');
}

function openContact() {
    if (!contactModal) return;
    contactModal.setAttribute('aria-hidden', 'false');
}

function closeContact() {
    if (!contactModal) return;
    contactModal.setAttribute('aria-hidden', 'true');
}

function humanizeChordTypeKey(key) {
    return key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function openChordTypes() {
    if (!chordTypesModal || !chordTypesList || !engine) return;
    chordTypesList.innerHTML = '';
    const names = engine.chordTypeNames || {};
    Object.entries(names).forEach(([typeKey, suffix]) => {
        const name = humanizeChordTypeKey(typeKey);
        const example = suffix ? 'C' + suffix : 'C';
        const item = document.createElement('div');
        item.className = 'chord-type-item';
        const nameEl = document.createElement('span');
        nameEl.className = 'chord-type-name';
        nameEl.textContent = name;
        const exEl = document.createElement('span');
        exEl.className = 'chord-type-example';
        exEl.textContent = example;
        item.appendChild(nameEl);
        item.appendChild(exEl);
        chordTypesList.appendChild(item);
    });
    chordTypesModal.setAttribute('aria-hidden', 'false');
}

function closeChordTypes() {
    if (!chordTypesModal) return;
    chordTypesModal.setAttribute('aria-hidden', 'true');
}

const helpSteps = [
    {
        text: '<strong>Hate grinding out MIDI chords in your DAW?</strong> This app will speed up your MIDI chord arrangement workflow 10x and let you focus on the more fun parts of music production. You will enjoy making music again, finally!',
        selector: ''
    }, 
    {
        text: 'Chord Canvas recognises almost any chord symbols that you write, and <strong>exports them as MIDI chord progressions</strong>. All are ready to be imported into Pro Tools, Ableton Live, Logic Pro, FL Studio, MuseScore, Sibelius...etc.',
        selector: ''
    }, 
    {
        text: 'This app also goes the extra mile to enhance the MIDI notes it generates by <strong>mimicking human performance virtuosity</strong>, with subtle delay, volume fluctuations, and more!',
        selector: ''
    },
    {
        text: 'To get started, write any chords you like here.',
        selector: '#chordInput'
    },
    {
        text: 'Make sure to separate them with commas.',
        selector: '#chordInput'
    },
    {
        text: 'Tap the <strong>+</strong> button to open chord presets or add a new sequence panel.',
        selector: '.chord-add-btn'
    },
    {
        text: "Press Play to listen to what you wrote.",
        selector: '#previewToggle'
    },
    {
        text: "Tap ⚙️ to set loop (ALL / this sequence) and playback (Synth / MIDI) with the dropdowns.",
        selector: '#playOptionsTrigger'
    },
    {
        text: "Tap Download to choose MIDI or WAV.",
        selector: '#downloadBtn'
    },
    {
        text: 'Open Synth to choose instrument sounds and effects.',
        selector: 'button[data-panel="panel-synth"]'
    },
    {
        text: 'Customise your MIDI with rhythms, notes, volume, and delay settings.',
        selector: 'nav'
    },

];
let helpStepIndex = 0;
let helpHighlightEl = null;

function clearHelpHighlight() {
    if (helpHighlightEl) {
        helpHighlightEl.classList.remove('tour-highlight');
        helpHighlightEl = null;
    }
}

function setHelpStep(index) {
    if (!helpText || !helpPrev || !helpNext) return;
    helpStepIndex = index;
    helpText.innerHTML = helpSteps[index].text;
    helpPrev.disabled = index === 0;
    helpPrev.style.display = index === 0 ? 'none' : '';
    helpNext.textContent = index === helpSteps.length - 1 ? 'Done' : 'Next';
    clearHelpHighlight();
    const selector = helpSteps[index].selector;
    if (!selector) return;
    const target = document.querySelector(selector);
    if (!target) return;
    helpHighlightEl = target;
    helpHighlightEl.classList.add('tour-highlight');
    helpHighlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function openHelp() {
    if (!helpModal) return;
    helpModal.setAttribute('aria-hidden', 'false');
    setHelpStep(0);
}

function closeHelp() {
    if (!helpModal) return;
    if (quickMenuBtn && typeof quickMenuBtn.focus === 'function') {
        quickMenuBtn.focus();
    }
    helpModal.setAttribute('aria-hidden', 'true');
    clearHelpHighlight();
}


previewToggle.addEventListener('click', () => {
    if (isSequencePreviewing) {
        stopPreview();
    } else {
        startPreview().catch(() => {});
    }
});

if (playOptionsTrigger && playOptionsModal) {
    playOptionsTrigger.addEventListener('click', (event) => {
        event.stopPropagation();
        if (playOptionsLoopSelect) playOptionsLoopSelect.value = loopMode;
        if (playOptionsPlaybackSelect) playOptionsPlaybackSelect.value = isSynthMode ? 'synth' : 'midi';
        openModal(playOptionsModal);
    });
    playOptionsTrigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (playOptionsLoopSelect) playOptionsLoopSelect.value = loopMode;
            if (playOptionsPlaybackSelect) playOptionsPlaybackSelect.value = isSynthMode ? 'synth' : 'midi';
            openModal(playOptionsModal);
        }
    });
    playOptionsModal.addEventListener('click', (event) => {
        if (event.target === playOptionsModal) {
            closeModal(playOptionsModal);
        }
    });
}

if (playOptionsLoopSelect) {
    playOptionsLoopSelect.addEventListener('change', () => {
        loopMode = playOptionsLoopSelect.value === 'this' ? 'this' : 'all';
    });
}

if (playOptionsPlaybackSelect) {
    playOptionsPlaybackSelect.addEventListener('change', () => {
        const wasSynth = isSynthMode;
        isSynthMode = playOptionsPlaybackSelect.value === 'synth';
        if (isSynthMode && !wasSynth) {
            if (isPreviewing || isSequencePreviewing) stopPreview();
            ensureSynthReady().catch(() => {});
        }
    });
}

async function downloadWavFile(button) {
    const segments = collectSegments();
    if (!segments.length) {
        alert('Please enter at least one valid chord.');
        return;
    }
    const bassEngine = getSynthEngine('bass');
    const trebleEngine = getSynthEngine('treble');
    if (!bassEngine && !trebleEngine) {
        alert('Synth engine not available.');
        return;
    }

    const originalLabel = button?.textContent || 'Download';
    if (button) {
        button.disabled = true;
        button.textContent = 'Rendering...';
    }
    try {
        const bassSegments = buildSynthRenderSegments(segments, 'bass');
        const trebleSegments = buildSynthRenderSegments(segments, 'treble');
        const sampleRate = 44100;
        const bassBuffer = bassSegments.length && bassEngine
            ? await bassEngine.renderBuffer(bassSegments, { sampleRate })
            : null;
        const trebleBuffer = trebleSegments.length && trebleEngine
            ? await trebleEngine.renderBuffer(trebleSegments, { sampleRate })
            : null;

        const wavBlob = await mixBuffersToWav([bassBuffer, trebleBuffer], sampleRate);
        if (!wavBlob) {
            alert('WAV render failed. Please try again.');
            return;
        }

        const url = URL.createObjectURL(wavBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chord-canvas-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error('WAV render failed:', error);
        alert('WAV render failed. Please try again.');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalLabel;
        }
    }
}

function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
}

function openTrebleModal({ group, chord, index }) {
    if (!trebleNotesModal || !group || !chord) return;
    const resolved = getResolvedChordNotes(chord);
    trebleModalState = { group, chord, index, currentTreble: [...resolved.high] };
    if (trebleNotesModalTitle) {
        trebleNotesModalTitle.textContent = `Customise treble — ${engine.getChordDisplayName(chord.rootNote, chord.chordType)}`;
    }
    if (trebleNotesInput) {
        trebleNotesInput.value = '';
    }
    if (trebleNotesError) {
        trebleNotesError.hidden = true;
        trebleNotesError.textContent = '';
    }
    renderTrebleList();
    renderTrebleRecommendations();
    if (trebleNotesRecommendations) trebleNotesRecommendations.hidden = true;
    openModal(trebleNotesModal);
}

function closeTrebleModal() {
    trebleModalState = null;
    closeModal(trebleNotesModal);
}

function renderTrebleList() {
    if (!trebleNotesList || !trebleModalState) return;
    trebleNotesList.innerHTML = '';
    const { currentTreble } = trebleModalState;
    currentTreble.forEach((midi) => {
        const pill = document.createElement('span');
        pill.className = 'treble-note-pill';
        pill.textContent = midiToNoteName(midi);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            trebleModalState.currentTreble = trebleModalState.currentTreble.filter((n) => n !== midi);
            renderTrebleList();
            renderTrebleRecommendations();
            syncTrebleModalToChord();
        });
        pill.appendChild(removeBtn);
        pill.addEventListener('click', (e) => {
            if (e.target === removeBtn || removeBtn.contains(e.target)) return;
            playSingleTrebleNote(trebleModalState.group, midi);
        });
        trebleNotesList.appendChild(pill);
    });
}

function renderTrebleRecommendations() {
    if (!trebleNotesRecommendations || !trebleModalState) return;
    const { chord, currentTreble } = trebleModalState;
    const defaultNotes = engine.chordToMIDINotes(chord);
    const allChordTones = [...defaultNotes.bass, ...defaultNotes.high];
    const minMidi = getTrebleMinMidi(chord);
    const candidates = new Set();
    allChordTones.forEach((midi) => {
        if (midi >= minMidi) candidates.add(midi);
        candidates.add(midi + 12);
    });
    const currentSet = new Set(currentTreble);
    const suggested = [...candidates].filter((m) => !currentSet.has(m)).sort((a, b) => a - b);
    trebleNotesRecommendations.innerHTML = '';
    if (suggested.length === 0) {
        trebleNotesRecommendations.hidden = true;
        return;
    }
    trebleNotesRecommendations.hidden = false;
    suggested.forEach((midi) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = midiToNoteName(midi);
        btn.addEventListener('click', () => {
            playSingleTrebleNote(trebleModalState.group, midi);
            if (!trebleModalState.currentTreble.includes(midi)) {
                trebleModalState.currentTreble.push(midi);
                trebleModalState.currentTreble.sort((a, b) => a - b);
                renderTrebleList();
                renderTrebleRecommendations();
                syncTrebleModalToChord();
            }
        });
        trebleNotesRecommendations.appendChild(btn);
    });
}

function applyTrebleInput() {
    if (!trebleModalState || !trebleNotesInput) return;
    const raw = trebleNotesInput.value.trim();
    if (!raw) return;
    const midi = noteNameToMidi(raw);
    if (midi === null) {
        if (trebleNotesError) {
            trebleNotesError.textContent = 'Invalid note (e.g. C4, F#5, Bb3).';
            trebleNotesError.hidden = false;
        }
        return;
    }
    const minMidi = getTrebleMinMidi(trebleModalState.chord);
    if (midi < minMidi) {
        if (trebleNotesError) {
            trebleNotesError.textContent = 'Treble notes must not be lower than the chord\'s bass.';
            trebleNotesError.hidden = false;
        }
        return;
    }
    if (trebleNotesError) trebleNotesError.hidden = true;
    if (!trebleModalState.currentTreble.includes(midi)) {
        trebleModalState.currentTreble.push(midi);
        trebleModalState.currentTreble.sort((a, b) => a - b);
        renderTrebleList();
        renderTrebleRecommendations();
        syncTrebleModalToChord();
    }
    trebleNotesInput.value = '';
}

function syncTrebleModalToChord() {
    if (!trebleModalState) return;
    const { group, chord, index, currentTreble } = trebleModalState;
    const defaultHigh = engine.chordToMIDINotes(chord).high;
    const defaultSet = new Set(defaultHigh);
    const currentSet = new Set(currentTreble);
    const isSame = defaultSet.size === currentSet.size && [...defaultSet].every((n) => currentSet.has(n));
    if (isSame) {
        delete chord.trebleNotes;
    } else {
        chord.trebleNotes = [...currentTreble].sort((a, b) => a - b);
    }
    updateChordPreview(group);
    updateCurrentHighNotes(group, index);
}

if (downloadBtn && downloadOptionsModal) {
    downloadBtn.addEventListener('click', () => {
        openModal(downloadOptionsModal);
    });
    downloadOptionsModal.addEventListener('click', (event) => {
        if (event.target === downloadOptionsModal) {
            closeModal(downloadOptionsModal);
        }
    });
}

if (downloadMidiBtn) {
    downloadMidiBtn.addEventListener('click', () => {
        closeModal(downloadOptionsModal);
        exportMidiFile().catch(() => {});
    });
}

if (downloadWavBtn) {
    downloadWavBtn.addEventListener('click', () => {
        closeModal(downloadOptionsModal);
        downloadWavFile(downloadBtn).catch(() => {});
    });
}



if (quickMenuBtn && helpOptionsModal) {
    quickMenuBtn.addEventListener('click', () => {
        openModal(helpOptionsModal);
    });
    helpOptionsModal.addEventListener('click', (event) => {
        if (event.target === helpOptionsModal) {
            closeModal(helpOptionsModal);
        }
    });
}

if (trebleNotesModal) {
    trebleNotesModal.addEventListener('click', (event) => {
        if (event.target === trebleNotesModal) closeTrebleModal();
    });
}
if (trebleNotesUseDefaultBtn) {
    trebleNotesUseDefaultBtn.addEventListener('click', () => {
        if (!trebleModalState) return;
        const defaultHigh = engine.chordToMIDINotes(trebleModalState.chord).high;
        trebleModalState.currentTreble = [...defaultHigh];
        renderTrebleList();
        renderTrebleRecommendations();
        if (trebleNotesError) { trebleNotesError.hidden = true; trebleNotesError.textContent = ''; }
        syncTrebleModalToChord();
    });
}
if (trebleNotesAddBtn) {
    trebleNotesAddBtn.addEventListener('click', () => {
        if (trebleNotesInput && trebleNotesInput.value.trim()) {
            applyTrebleInput();
        }
        if (trebleNotesRecommendations) trebleNotesRecommendations.hidden = false;
        renderTrebleRecommendations();
        if (trebleNotesInput) trebleNotesInput.focus();
    });
}
if (trebleNotesInput) {
    trebleNotesInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyTrebleInput();
        }
    });
}

if (quickGuideBtn && helpModal && helpText && helpPrev && helpNext && helpClose) {
    quickGuideBtn.addEventListener('click', () => {
        closeModal(helpOptionsModal);
        openHelp();
    });
    helpPrev.addEventListener('click', () => {
        if (helpStepIndex > 0) {
            setHelpStep(helpStepIndex - 1);
        }
    });
    helpNext.addEventListener('click', () => {
        if (helpStepIndex >= helpSteps.length - 1) {
            closeHelp();
        } else {
            setHelpStep(helpStepIndex + 1);
        }
    });
    helpClose.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            closeHelp();
        }
    });
}

if (quickChordTypesBtn && chordTypesModal && chordTypesList) {
    quickChordTypesBtn.addEventListener('click', () => {
        closeModal(helpOptionsModal);
        openChordTypes();
    });
}
if (chordTypesModal) {
    chordTypesModal.addEventListener('click', (event) => {
        if (event.target === chordTypesModal) closeChordTypes();
    });
}
if (quickHelpBtn && contactModal && contactClose) {
    quickHelpBtn.addEventListener('click', () => {
        closeModal(helpOptionsModal);
        openContact();
    });
    contactClose.addEventListener('click', closeContact);
    contactModal.addEventListener('click', (event) => {
        if (event.target === contactModal) {
            closeContact();
        }
    });
}

window.addEventListener('load', () => {
    if (helpModal && helpText && helpPrev && helpNext && helpClose) {
        openHelp();
    }
});


if (addOptionsModal) {
    addOptionsModal.addEventListener('click', (event) => {
        if (event.target === addOptionsModal) {
            closeModal(addOptionsModal);
        }
    });
}

if (addPresetsBtn) {
    addPresetsBtn.addEventListener('click', () => {
        closeModal(addOptionsModal);
        openPresets();
    });
}

let randomByKeySavedChordState = null;

function restoreRandomByKeyChordState() {
    if (!randomByKeySavedChordState?.group?.chordInput) return;
    const { group, value } = randomByKeySavedChordState;
    group.chordInput.value = value;
    autoResizeTextarea(group.chordInput);
    updateChordSequenceFromInput(group, { playOnChange: false });
    updateChordPreviewItemsSettings(group);
    randomByKeySavedChordState = null;
}

if (addRandomByKeyBtn && randomByKeyModal) {
    addRandomByKeyBtn.addEventListener('click', () => {
        closeModal(addOptionsModal);
        const group = getActiveGroup();
        randomByKeySavedChordState = group?.chordInput
            ? { group, value: group.chordInput.value }
            : null;
        if (randomByKeyPreview) randomByKeyPreview.innerHTML = '';
        openModal(randomByKeyModal);
    });
}
if (addPanelBtn) {
    addPanelBtn.addEventListener('click', () => {
        closeModal(addOptionsModal);
        clonePanelGroup();
    });
}
if (randomByKeyModal) {
    randomByKeyModal.addEventListener('click', (event) => {
        if (event.target === randomByKeyModal) {
            closeModal(randomByKeyModal);
        }
    });
}
if (randomByKeyCancelBtn) {
    randomByKeyCancelBtn.addEventListener('click', () => {
        restoreRandomByKeyChordState();
        closeModal(randomByKeyModal);
    });
}
function updateRandomByKeyStyleIntro() {
    if (!randomByKeyStyleIntro || typeof window.ByKeyStyles === 'undefined') return;
    const styleId = randomByKeyStyleSelect ? randomByKeyStyleSelect.value : '';
    const s = styleId ? window.ByKeyStyles.get(styleId) : null;
    randomByKeyStyleIntro.textContent = s && s.intro ? s.intro : '';
}
function applyRandomByKeyGenerate() {
    if (!randomByKeySelect || !randomByKeyCount || typeof window.ChordRan === 'undefined' || !window.ChordRan.generateChordString) return;
    const keyName = randomByKeySelect.value || 'C';
    const count = parseInt(randomByKeyCount.value, 10) || 4;
    const styleId = randomByKeyStyleSelect ? randomByKeyStyleSelect.value : '';
    const modulationType = randomByKeyModulationSelect ? randomByKeyModulationSelect.value : 'none';
    const chordString = typeof window.ChordRanModulation !== 'undefined' && window.ChordRanModulation.generateChordStringWithModulation
        ? window.ChordRanModulation.generateChordStringWithModulation(keyName, count, styleId, modulationType)
        : window.ChordRan.generateChordString(keyName, count, styleId);
    const group = getActiveGroup();
    if (group?.chordInput) {
        group.chordInput.value = chordString;
        autoResizeTextarea(group.chordInput);
        updateChordSequenceFromInput(group, { playOnChange: false });
        updateChordPreviewItemsSettings(group);
    }
    if (randomByKeyPreview && group?.chordSequence?.length) {
        randomByKeyPreview.innerHTML = '';
        group.chordSequence.forEach((chord, index) => {
            const item = document.createElement('div');
            item.className = 'chord-preview-item';
            item.dataset.index = String(index);
            item.textContent = engine.getChordDisplayName(chord.rootNote, chord.chordType);
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                playSingleChord(group, chord, index);
            });
            randomByKeyPreview.appendChild(item);
        });
    }
}
if (randomByKeyStyleSelect && typeof window.ByKeyStyles !== 'undefined' && window.ByKeyStyles.list) {
    window.ByKeyStyles.list.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        randomByKeyStyleSelect.appendChild(opt);
    });
    updateRandomByKeyStyleIntro();
    randomByKeyStyleSelect.addEventListener('change', () => {
        updateRandomByKeyStyleIntro();
        applyRandomByKeyGenerate();
    });
}
if (randomByKeyModulationSelect) {
    randomByKeyModulationSelect.addEventListener('change', () => {
        applyRandomByKeyGenerate();
    });
}
if (randomByKeyPlayBtn) {
    randomByKeyPlayBtn.addEventListener('click', () => {
        if (isSequencePreviewing) {
            stopPreview();
        } else {
            startPreview({ loopOnlyActiveSequence: true }).catch(() => {});
        }
    });
}
if (randomByKeyApplyBtn) {
    randomByKeyApplyBtn.addEventListener('click', applyRandomByKeyGenerate);
}

if (masterVolumeSlider) {
    const applyMasterVolume = () => {
        const value = Number(masterVolumeSlider.value ?? 90) / 100;
        if (window.PremiumSoundBass?.setMasterVolume) {
            window.PremiumSoundBass.setMasterVolume(value);
        }
        if (window.PremiumSoundTreble?.setMasterVolume) {
            window.PremiumSoundTreble.setMasterVolume(value);
        }
        if (window.PremiumSound?.setMasterVolume) {
            window.PremiumSound.setMasterVolume(value);
        }
        if (player?.setMasterVolume) {
            player.setMasterVolume(value);
        }
    };
    masterVolumeSlider.addEventListener('input', applyMasterVolume);
    applyMasterVolume();
}

function applyGlobalPlaybackVolumeSliders() {
    panelGroups.forEach((group) => {
        updatePlaybackVolumeFromSliders(group);
    });
    requestPreviewResync();
}
if (globalBassVolumeSlider) {
    globalBassVolumeSlider.addEventListener('input', applyGlobalPlaybackVolumeSliders);
}
if (globalHighVolumeSlider) {
    globalHighVolumeSlider.addEventListener('input', applyGlobalPlaybackVolumeSliders);
}

if (presetsModal && presetsClose) {
    presetsClose.addEventListener('click', closePresets);
    presetsModal.addEventListener('click', (event) => {
        if (event.target === presetsModal) {
            closePresets();
        }
    });
}

registerPanelGroup(panelGroup);
updatePreviewToggleLabel();

if (title && infoModal) {
    const setInfoTab = (panelId) => {
        infoTabs.forEach((tab) => {
            tab.classList.toggle('active', tab.getAttribute('data-panel') === panelId);
        });
        infoPanels.forEach((panel) => {
            panel.hidden = panel.getAttribute('data-panel') !== panelId;
        });
    };

    infoTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const panelId = tab.getAttribute('data-panel');
            if (panelId) {
                setInfoTab(panelId);
            }
        });
    });

    title.addEventListener('click', () => {
        infoModal.hidden = false;
        setInfoTab('about');
    });

    if (infoBackdrop) {
        infoBackdrop.addEventListener('click', () => {
            infoModal.hidden = true;
        });
    }
}

