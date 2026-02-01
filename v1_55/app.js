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
const CHORD_BAR_BEATS = 4;
const VOLUME_MOD_MIN = 0.4;
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
let previewTimers = [];

const DEFAULT_BASS_DURATION = 240;
const DEFAULT_HIGH_DURATION = 30;
const DEFAULT_VOLUME_MOD = 'uphill';
const DEFAULT_DELAY_MOD = 'drunk';
const DEFAULT_PATTERN_MODE = 'normal';

const panelGroups = [];
let activeGroup = null;

const previewToggle = document.getElementById('previewToggle');
const exportBtn = document.getElementById('exportBtn');
const aboutModal = document.getElementById('aboutModal');
const aboutClose = document.getElementById('aboutClose');
const presetsBtn = document.getElementById('presetsBtn');
const presetsModal = document.getElementById('presetsModal');
const presetsList = document.getElementById('presetsList');
const presetsClose = document.getElementById('presetsClose');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpText = document.getElementById('helpText');
const helpPrev = document.getElementById('helpPrev');
const helpNext = document.getElementById('helpNext');
const helpClose = document.getElementById('helpClose');
const contactBtn = document.getElementById('contactBtn');
const contactModal = document.getElementById('contactModal');
const contactClose = document.getElementById('contactClose');
const title = document.querySelector('h1');
const panelGroup = document.getElementById('panelGroup');
const actionButtons = document.getElementById('actionButtons');
const addButton = document.getElementById('addButton');

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
        volumeModSelect: getGroupRole(groupEl, 'volumeModSelect'),
        bassVolumeSlider: getGroupRole(groupEl, 'bassVolumeSlider'),
        highVolumeSlider: getGroupRole(groupEl, 'highVolumeSlider'),
        delayModSelect: getGroupRole(groupEl, 'delayModSelect'),
        patternSelect: getGroupRole(groupEl, 'patternSelect'),
        skipSelect: getGroupRole(groupEl, 'skipSelect'),
        skipSelect2: getGroupRole(groupEl, 'skipSelect2'),
        skipSelect3: getGroupRole(groupEl, 'skipSelect3'),
        doubleHighNotes: getGroupRole(groupEl, 'doubleHighNotes'),
        chordSequence: [],
        bassDurationMultiplier: DEFAULT_BASS_DURATION,
        highDurationMultiplier: DEFAULT_HIGH_DURATION,
        volumeModPattern: DEFAULT_VOLUME_MOD,
        delayModPattern: DEFAULT_DELAY_MOD,
        patternMode: DEFAULT_PATTERN_MODE,
        skipPattern: [],
        doubleHighEnabled: false,
        bassPlaybackVolume: 1,
        highPlaybackVolume: 1,
        currentChordIndex: 0
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
        state.doubleHighEnabled = !!state.doubleHighNotes.checked;
    }

    return state;
}

function getActiveGroup() {
    return activeGroup || panelGroups[0] || null;
}

function updateChordPreview(group) {
    if (!group?.chordPreview) return;
    group.chordPreview.innerHTML = '';

    if (group.chordSequence.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'chord-preview-empty';
        empty.textContent = 'No valid chords yet.';
        group.chordPreview.appendChild(empty);
        return;
    }

    group.chordSequence.forEach((chord, index) => {
        const item = document.createElement('div');
        item.className = 'chord-preview-item';
        item.dataset.index = String(index);
        item.textContent = engine.getChordDisplayName(chord.rootNote, chord.chordType);
        item.addEventListener('click', (event) => {
            event.stopPropagation();
            playSingleChord(group, chord, index);
        });
        group.chordPreview.appendChild(item);
    });
}

function setChordPreviewPlaying(group, index) {
    if (!group?.chordPreview) return;
    const items = group.chordPreview.querySelectorAll('.chord-preview-item');
    items.forEach(item => item.classList.remove('playing'));
    if (index === null || index === undefined) {
        updateCurrentHighNotes(group, null);
        return;
    }
    group.currentChordIndex = index;
    const current = group.chordPreview.querySelector(`.chord-preview-item[data-index="${index}"]`);
    if (current) {
        current.classList.add('playing');
    }
    updateCurrentHighNotes(group, index);
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

function updateChordSequenceFromInput(group, { playOnChange = false, stopOnEmpty = true } = {}) {
    if (!group?.chordInput) return;
    const previousKeys = group.chordSequence.map(chord => engine.getChordKey(chord));
    group.chordSequence = engine.parseChordSequence(group.chordInput.value);
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

function getBpmValue(group) {
    const bpm = parseInt(group?.bpmInput?.value ?? '', 10);
    return isFinite(bpm) && bpm > 0 ? bpm : DEFAULT_BPM;
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
    const delayMs = Math.max(0, (atTime - player.getCurrentTime()) * 1000);
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
        case '4hill': {
            const phase = (pos * 8) % 2;
            if (phase <= 1) {
                return dbToLinear(minDb + (applyVolumeCurve(phase) * (maxDb - minDb)));
            }
            return dbToLinear(maxDb - (applyVolumeCurve(phase - 1) * (maxDb - minDb)));
        }
        default:
            return 1.0;
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

function schedulePreviewNotes(notes, startTime, endTime, cycleSeconds, barSeconds, gainValue, options = {}) {
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
            player.playChordAtTime([note], t + delayOffset, noteDuration, gainValue * volumeMultiplier);
        });
        cycleIndex += 1;
    }
}

function schedulePreviewArpeggio(notes, startTime, endTime, cycleSeconds, barSeconds, gainValue, direction, options = {}) {
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
        player.playChordAtTime(notesForCycle, t + delayOffset, noteDuration, gainValue * volumeMultiplier);
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

function schedulePreviewTimer(fn, delayMs) {
    const timerId = setTimeout(fn, delayMs);
    previewTimers.push(timerId);
    return timerId;
}

function clearAllHighlights() {
    panelGroups.forEach((group) => setChordPreviewPlaying(group, null));
}

function collectSegments() {
    return panelGroups.map((group) => {
        if (!group?.chordInput) {
            return null;
        }
        syncGroupFromInputs(group, { stopOnEmpty: false });
        group.chordSequence = engine.parseChordSequence(group.chordInput.value);
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
            highPlaybackVolume: group.highPlaybackVolume
        };
    }).filter(segment => segment && segment.chordSequence.length > 0);
}

async function startPreview({ fromLoop = false } = {}) {
    if (!fromLoop) {
        stopPreview();
    } else {
        clearPreviewTimers();
    }

    const segments = collectSegments();
    if (segments.length === 0) {
        alert('Please enter at least one valid chord.');
        return;
    }

    await player.ensureReady();
    isPreviewing = true;
    isSequencePreviewing = true;
    updatePreviewToggleLabel();

    let startTime = player.getCurrentTime() + 0.05;
    const loopStartTime = startTime;

    segments.forEach((segment) => {
        const barSeconds = (60 / segment.bpm) * CHORD_BAR_BEATS;
        const bassCycleSeconds = segment.bassDurationMultiplier / segment.bpm;
        const highCycleSeconds = segment.highDurationMultiplier / segment.bpm;
        const delayState = { counter: 0 };
        const skipState = buildSkipStateFromPattern(segment.skipPattern);

        segment.chordSequence.forEach((chord, index) => {
            const chordStart = startTime + (index * barSeconds);
            const chordEnd = chordStart + barSeconds;
            const chordNotes = engine.chordToMIDINotes(chord);
            const highNotes = getHighNotesForPattern(chordNotes, segment.doubleHighEnabled);

            schedulePreviewNotes(
                chordNotes.bass,
                chordStart,
                chordEnd,
                bassCycleSeconds,
                barSeconds,
                0.4 * segment.bassPlaybackVolume,
                {
                    applySkip: false,
                    volumeModPattern: segment.volumeModPattern,
                    delayModPattern: segment.delayModPattern,
                    delayState,
                    skipState
                }
            );

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
                        volumeModPattern: segment.volumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    }
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
                        volumeModPattern: segment.volumeModPattern,
                        delayModPattern: segment.delayModPattern,
                        delayState,
                        skipState
                    }
                );
            }

            schedulePreviewTimer(() => {
                if (isSequencePreviewing) {
                    if (index === 0) {
                        clearAllHighlights();
                    }
                    setChordPreviewPlaying(segment.group, index);
                }
            }, Math.max(0, (chordStart - player.getCurrentTime()) * 1000));
        });

        startTime += segment.chordSequence.length * barSeconds;
    });

    const loopDurationMs = Math.max(0, (startTime - loopStartTime) * 1000);
    schedulePreviewTimer(() => {
        if (isSequencePreviewing) {
            clearAllHighlights();
            startPreview({ fromLoop: true });
        }
    }, loopDurationMs);
}

function stopPreview() {
    if (!isPreviewing && !isSequencePreviewing) {
        clearAllHighlights();
        return;
    }
    clearPreviewTimers();
    player.stopAll();
    isPreviewing = false;
    isSequencePreviewing = false;
    clearAllHighlights();
    updatePreviewToggleLabel();
}

function playChordOnce(group, chord, index) {
    if (!group || !chord) return;
    if (isSequencePreviewing) {
        stopPreview();
    }
    const bpm = getBpmValue(group);
    const durationSeconds = 60 / bpm;
    const chordNotes = engine.chordToMIDINotes(chord);
    const bassNotes = chordNotes.bass;
    const highNotes = getHighNotesForPattern(chordNotes, group.doubleHighEnabled);
    const volumeMultiplier = getVolumeModMultiplier(group.volumeModPattern, 0.5);
    setChordPreviewPlaying(group, index);
    isPreviewing = true;
    const delayState = { counter: 0 };
    const baseTime = player.getCurrentTime() + 0.01;
    bassNotes.forEach((note) => {
        const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
        player.playChordAtTime([note], baseTime + delayOffset, durationSeconds, 0.3 * volumeMultiplier * group.bassPlaybackVolume);
    });
    highNotes.forEach((note) => {
        const delayOffset = getDelayOffsetSeconds(durationSeconds, group.delayModPattern, delayState);
        player.playChordAtTime([note], baseTime + delayOffset, durationSeconds, 0.3 * volumeMultiplier * group.highPlaybackVolume);
    });
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
            const chordNotes = engine.chordToMIDINotes(chord);
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

function updateCurrentHighNotes(group, index) {
    if (!group?.currentHighNotes) return;
    if (index === null || index === undefined || !group.chordSequence[index]) {
        group.currentHighNotes.textContent = '';
        return;
    }
    const chordNotes = engine.chordToMIDINotes(group.chordSequence[index]);
    const lowNames = chordNotes.bass.map(midiToNoteName);
    const highNotes = getHighNotesForPattern(chordNotes, group.doubleHighEnabled);
    const highNames = highNotes.map(midiToNoteName);
    group.currentHighNotes.textContent = `Low notes: ${lowNames.join(', ')} | High notes: ${highNames.join(', ')}`;
}

function updatePreviewToggleLabel() {
    previewToggle.textContent = isSequencePreviewing ? 'Tap to stop' : 'Tap to listen';
}

function setupPanelGroup(groupEl) {
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
        });
    });
}

function updatePlaybackVolumeFromSliders(group) {
    const bassValue = parseInt(group?.bassVolumeSlider?.value ?? '100', 10);
    const highValue = parseInt(group?.highVolumeSlider?.value ?? '100', 10);
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
        group.doubleHighEnabled = !!group.doubleHighNotes.checked;
    }
    buildSkipPatternFromGroup(group);
    updatePlaybackVolumeFromSliders(group);
    updateChordSequenceFromInput(group, { stopOnEmpty });
}

function registerPanelGroup(groupEl) {
    if (!groupEl) return null;
    const group = buildPanelGroupState(groupEl);
    panelGroups.push(group);
    if (!activeGroup) {
        activeGroup = group;
    }

    setupPanelGroup(groupEl);
    updateRhythmSelectOptions(group);
    buildSkipPatternFromGroup(group);
    updatePlaybackVolumeFromSliders(group);
    updateChordSequenceFromInput(group);

    if (group.chordInput) {
        group.chordInput.addEventListener('focus', () => {
            activeGroup = group;
        });
        group.chordInput.addEventListener('input', () => {
            autoResizeTextarea(group.chordInput);
            updateChordSequenceFromInput(group, { playOnChange: true });
        });
    }

    if (group.bassRhythmSelect) {
        group.bassRhythmSelect.addEventListener('change', (event) => {
            group.bassDurationMultiplier = parseInt(event.target.value, 10) || DEFAULT_BASS_DURATION;
        });
    }

    if (group.highRhythmSelect) {
        group.highRhythmSelect.addEventListener('change', (event) => {
            group.highDurationMultiplier = parseInt(event.target.value, 10) || DEFAULT_HIGH_DURATION;
        });
    }

    if (group.bpmInput) {
        group.bpmInput.addEventListener('input', () => {
            updateRhythmSelectOptions(group);
        });
    }

    if (group.volumeModSelect) {
        group.volumeModSelect.addEventListener('change', (event) => {
            group.volumeModPattern = event.target.value;
        });
    }

    if (group.delayModSelect) {
        group.delayModSelect.addEventListener('change', (event) => {
            group.delayModPattern = event.target.value;
        });
    }

    if (group.patternSelect) {
        group.patternSelect.addEventListener('change', (event) => {
            group.patternMode = event.target.value;
        });
    }

    if (group.doubleHighNotes) {
        group.doubleHighNotes.addEventListener('change', (event) => {
            group.doubleHighEnabled = event.target.checked;
            updateCurrentHighNotes(group, group.currentChordIndex);
        });
    }

    const updateSkipPattern = () => {
        buildSkipPatternFromGroup(group);
    };

    if (group.skipSelect) {
        group.skipSelect.addEventListener('change', updateSkipPattern);
    }
    if (group.skipSelect2) {
        group.skipSelect2.addEventListener('change', updateSkipPattern);
    }
    if (group.skipSelect3) {
        group.skipSelect3.addEventListener('change', updateSkipPattern);
    }

    if (group.bassVolumeSlider) {
        group.bassVolumeSlider.addEventListener('input', () => updatePlaybackVolumeFromSliders(group));
    }
    if (group.highVolumeSlider) {
        group.highVolumeSlider.addEventListener('input', () => updatePlaybackVolumeFromSliders(group));
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
        activeGroup = newGroup;
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
                if (preset.bpm && group.bpmInput) {
                    group.bpmInput.value = String(preset.bpm);
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
        text: 'Use chord presets for quick starts.',
        selector: '#presetsBtn'
    },
    {
        text: "Tap to listen to what you wrote.",
        selector: '#previewToggle'
    },
    {
        text: 'Tap + to add a new section if you want.',
        selector: '#addButton'
    },
    {
        text: "Tap to export MIDI and download it.",
        selector: '#exportBtn'
    },
    {
        text: 'Customise your MIDI with layered rhythms, note choices, and more if you want!',
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
    if (helpBtn && typeof helpBtn.focus === 'function') {
        helpBtn.focus();
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

exportBtn.addEventListener('click', () => {
    exportMidiFile().catch(() => {});
});

if (presetsBtn && presetsModal && presetsList && presetsClose) {
    presetsBtn.addEventListener('click', openPresets);
    presetsClose.addEventListener('click', closePresets);
    presetsModal.addEventListener('click', (event) => {
        if (event.target === presetsModal) {
            closePresets();
        }
    });
}

if (contactBtn && contactModal && contactClose) {
    contactBtn.addEventListener('click', openContact);
    contactClose.addEventListener('click', closeContact);
    contactModal.addEventListener('click', (event) => {
        if (event.target === contactModal) {
            closeContact();
        }
    });
}

if (helpBtn && helpModal && helpText && helpPrev && helpNext && helpClose) {
    helpBtn.addEventListener('click', openHelp);
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

window.addEventListener('load', () => {
    if (helpBtn && helpModal && helpText && helpPrev && helpNext && helpClose) {
        openHelp();
    }
});

registerPanelGroup(panelGroup);
updatePreviewToggleLabel();

if (title && aboutModal && aboutClose) {
    title.addEventListener('click', () => {
        aboutModal.setAttribute('aria-hidden', 'false');
    });
    aboutClose.addEventListener('click', () => {
        aboutModal.setAttribute('aria-hidden', 'true');
    });
    aboutModal.addEventListener('click', (event) => {
        if (event.target === aboutModal) {
            aboutModal.setAttribute('aria-hidden', 'true');
        }
    });
}

if (addButton) {
    addButton.addEventListener('click', clonePanelGroup);
}
