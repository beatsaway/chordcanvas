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
const VOLUME_MOD_MIN = 0.1;
const VOLUME_MOD_MAX = 1.0;
const VOLUME_MOD_CURVE = 2.0;
const DELAY_MOD_CHANCE = 0.618;
const DELAY_MOD_AMOUNT_HUMAN = 0.05;
const DELAY_MOD_AMOUNT_DRUNK = 0.128;

const engine = new window.ChordEngine({
    noteToIndex: window.NOTE_TO_INDEX,
    chordIntervals: window.CHORD_INTERVALS
});
const player = new window.WebAudioPlayer();

let bassDurationMultiplier = 240;
let highDurationMultiplier = 30;
let chordSequence = [];
let isPreviewing = false;
let isSequencePreviewing = false;
let volumeModPattern = 'uphill';
let currentChordIndex = 0;
let nextChordTimer = null;
let highlightTimer = null;
let delayModPattern = 'drunk';
let delayModCounter = 0;
let patternMode = 'normal';
let skipEvery = 0;
let skipPattern = [];
let skipCounter = 0;
let skipPatternIndex = 0;
let doubleHighEnabled = false;

const chordInput = document.getElementById('chordInput');
const chordPreview = document.getElementById('chordPreview');
const currentHighNotes = document.getElementById('currentHighNotes');
const previewToggle = document.getElementById('previewToggle');
const exportBtn = document.getElementById('exportBtn');
const bassRhythmSelect = document.getElementById('bassRhythmSelect');
const highRhythmSelect = document.getElementById('highRhythmSelect');
const bpmInput = document.getElementById('bpmInput');
const volumeModSelect = document.getElementById('volumeModSelect');
const delayModSelect = document.getElementById('delayModSelect');
const patternSelect = document.getElementById('patternSelect');
const skipSelect = document.getElementById('skipSelect');
const skipSelect2 = document.getElementById('skipSelect2');
const skipSelect3 = document.getElementById('skipSelect3');
const doubleHighNotes = document.getElementById('doubleHighNotes');
const aboutModal = document.getElementById('aboutModal');
const aboutClose = document.getElementById('aboutClose');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpText = document.getElementById('helpText');
const helpPrev = document.getElementById('helpPrev');
const helpNext = document.getElementById('helpNext');
const helpClose = document.getElementById('helpClose');
const title = document.querySelector('h1');
const navButtons = document.querySelectorAll('nav button[data-panel]');

function updateChordPreview() {
    chordPreview.innerHTML = '';

    if (chordSequence.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'chord-preview-empty';
        empty.textContent = 'No valid chords yet.';
        chordPreview.appendChild(empty);
        return;
    }

    chordSequence.forEach((chord, index) => {
        const item = document.createElement('div');
        item.className = 'chord-preview-item';
        item.dataset.index = String(index);
        item.textContent = engine.getChordDisplayName(chord.rootNote, chord.chordType);
        item.addEventListener('click', (event) => {
            event.stopPropagation();
            playSingleChord(chord, index);
        });
        chordPreview.appendChild(item);
    });
}

function setChordPreviewPlaying(index) {
    const items = document.querySelectorAll('.chord-preview-item');
    items.forEach(item => item.classList.remove('playing'));
    if (index === null || index === undefined) {
        updateCurrentHighNotes(null);
        return;
    }
    const current = document.querySelector(`.chord-preview-item[data-index="${index}"]`);
    if (current) {
        current.classList.add('playing');
    }
    updateCurrentHighNotes(index);
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

function updateChordSequenceFromInput() {
    const previousKeys = chordSequence.map(chord => engine.getChordKey(chord));
    chordSequence = engine.parseChordSequence(chordInput.value);
    updateChordPreview();
    if (chordSequence.length === 0) {
        stopPreview();
        return;
    }
    const nextKeys = chordSequence.map(chord => engine.getChordKey(chord));
    const changedIndex = getFirstChangedIndex(previousKeys, nextKeys);
    if (changedIndex !== -1) {
        playChordOnce(chordSequence[changedIndex], changedIndex);
    }
}

function getBpmValue() {
    const bpm = parseInt(bpmInput.value, 10);
    return isFinite(bpm) && bpm > 0 ? bpm : DEFAULT_BPM;
}

function updateRhythmSelectOptions() {
    const bpm = getBpmValue();
    const currentBass = bassDurationMultiplier;
    const currentHigh = highDurationMultiplier;

    bassRhythmSelect.innerHTML = '';
    highRhythmSelect.innerHTML = '';

    DURATION_MULTIPLIERS.forEach((value, index) => {
        const seconds = (value / bpm).toFixed(2);
        const labelHtml = `${NOTE_SYMBOLS_HTML[index]} ${seconds}s`;

        const bassOption = document.createElement('option');
        bassOption.value = String(value);
        bassOption.innerHTML = labelHtml;
        bassRhythmSelect.appendChild(bassOption);

        const highOption = document.createElement('option');
        highOption.value = String(value);
        highOption.innerHTML = labelHtml;
        highRhythmSelect.appendChild(highOption);
    });

    bassRhythmSelect.value = String(currentBass);
    highRhythmSelect.value = String(currentHigh);
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
    events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
        return a.note - b.note;
    });

    let lastTime = 0;
    events.forEach(event => {
        const delta = Math.max(0, event.time - lastTime);
        if (event.type === 'on') {
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

function scheduleMidiNotesWithMods(events, notes, startTick, endTick, cycleTicks, bpm, barStartSeconds, barSeconds, baseVelocity, pattern, delayState, applySkip, skipState) {
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
                const delayOffsetSeconds = getDelayOffsetSeconds(noteDurationSeconds, delayState);
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
            const delayOffsetSeconds = getDelayOffsetSeconds(noteDurationSeconds, delayState);
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

function scheduleUiHighlight(index, atTime) {
    const delayMs = Math.max(0, (atTime - player.getCurrentTime()) * 1000);
    const timerId = setTimeout(() => {
        if (isSequencePreviewing) {
            setChordPreviewPlaying(index);
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

function resetDelayModCounter() {
    delayModCounter = 0;
}

function getDelayOffsetSeconds(noteDurationSeconds, state) {
    if (!delayModPattern || delayModPattern === 'none') {
        return 0;
    }
    if (delayModPattern !== 'human' && delayModPattern !== 'drunk') {
        return 0;
    }
    const counterState = state || { counter: delayModCounter };
    counterState.counter += 1;
    const remainder = (counterState.counter * 0.61803398875) % 1;
    if (remainder > DELAY_MOD_CHANCE) {
        if (!state) delayModCounter = counterState.counter;
        return 0;
    }
    const amount = delayModPattern === 'drunk' ? DELAY_MOD_AMOUNT_DRUNK : DELAY_MOD_AMOUNT_HUMAN;
    if (!state) delayModCounter = counterState.counter;
    return noteDurationSeconds * amount * remainder;
}

function shouldSkipCycle(cycleIndex) {
    if (!skipEvery || skipEvery <= 0) {
        return false;
    }
    return (cycleIndex + 1) % skipEvery === 0;
}

function buildSkipPattern() {
    const values = [skipSelect, skipSelect2, skipSelect3]
        .filter(Boolean)
        .map(select => parseInt(select.value, 10) || 0)
        .filter(value => value > 0);
    skipPattern = values;
    skipCounter = 0;
    skipPatternIndex = 0;
}

function shouldSkipNext() {
    if (!skipPattern.length) {
        return false;
    }
    skipCounter += 1;
    const target = skipPattern[skipPatternIndex];
    if (skipCounter >= target) {
        skipCounter = 0;
        skipPatternIndex = (skipPatternIndex + 1) % skipPattern.length;
        return true;
    }
    return false;
}

function buildSkipState() {
    return {
        pattern: [...skipPattern],
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

function getHighNotesForPattern(chordNotes) {
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
        if (options.applySkip && shouldSkipNext()) {
            cycleIndex += 1;
            continue;
        }
        const cyclePosition = barSeconds > 0 ? (t - startTime) / barSeconds : 0;
        const volumeMultiplier = getVolumeModMultiplier(volumeModPattern, cyclePosition);
        notes.forEach((note) => {
            const delayOffset = getDelayOffsetSeconds(noteDuration);
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
        if (options.applySkip && shouldSkipNext()) {
            cycleIndex += 1;
            continue;
        }
        const notesForCycle = getPatternNotesForCycle(ordered, direction, cycleIndex);
        const cyclePosition = barSeconds > 0 ? (t - startTime) / barSeconds : 0;
        const volumeMultiplier = getVolumeModMultiplier(volumeModPattern, cyclePosition);
        const delayOffset = getDelayOffsetSeconds(noteDuration);
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

function scheduleNextChord(forcedStartTime = null) {
    if (!isSequencePreviewing || chordSequence.length === 0) {
        return;
    }

    const bpm = getBpmValue();
    const barSeconds = (60 / bpm) * CHORD_BAR_BEATS;
    const chord = chordSequence[currentChordIndex];
    const chordNotes = engine.chordToMIDINotes(chord);
    const highNotes = getHighNotesForPattern(chordNotes);
    const startTime = forcedStartTime !== null ? forcedStartTime : player.getCurrentTime() + 0.05;
    const endTime = startTime + barSeconds;
    const bassCycleSeconds = bassDurationMultiplier / bpm;
    const highCycleSeconds = highDurationMultiplier / bpm;

    schedulePreviewNotes(chordNotes.bass, startTime, endTime, bassCycleSeconds, barSeconds, 0.18);
    if (patternMode === 'normal') {
        schedulePreviewNotes(highNotes, startTime, endTime, highCycleSeconds, barSeconds, 0.24, { applySkip: true });
    } else {
        schedulePreviewArpeggio(highNotes, startTime, endTime, highCycleSeconds, barSeconds, 0.24, patternMode, { applySkip: true });
    }

    if (highlightTimer) {
        clearTimeout(highlightTimer);
    }
    highlightTimer = scheduleUiHighlight(currentChordIndex, startTime);

    if (nextChordTimer) {
        clearTimeout(nextChordTimer);
    }
    nextChordTimer = setTimeout(() => {
        currentChordIndex = (currentChordIndex + 1) % chordSequence.length;
        scheduleNextChord();
    }, barSeconds * 1000);
}

async function startPreview() {
    stopPreview();
    updateChordSequenceFromInput();

    if (chordSequence.length === 0) {
        alert('Please enter at least one valid chord.');
        return;
    }

    await player.ensureReady();
    resetDelayModCounter();
    buildSkipPattern();
    isPreviewing = true;
    isSequencePreviewing = true;
    currentChordIndex = 0;
    scheduleNextChord();
    updatePreviewToggleLabel();
}

function stopPreview() {
    if (!isPreviewing && !isSequencePreviewing) {
        setChordPreviewPlaying(null);
        return;
    }
    if (nextChordTimer) {
        clearTimeout(nextChordTimer);
        nextChordTimer = null;
    }
    if (highlightTimer) {
        clearTimeout(highlightTimer);
        highlightTimer = null;
    }
    isPreviewing = false;
    isSequencePreviewing = false;
    setChordPreviewPlaying(null);
    updatePreviewToggleLabel();
}

function playChordOnce(chord, index) {
    if (!chord) return;
    if (isSequencePreviewing) {
        stopPreview();
    }
    const bpm = getBpmValue();
    const durationSeconds = 60 / bpm;
    const chordNotes = engine.chordToMIDINotes(chord);
    const notes = [...chordNotes.bass, ...getHighNotesForPattern(chordNotes)];
    const volumeMultiplier = getVolumeModMultiplier(volumeModPattern, 0.5);
    setChordPreviewPlaying(index);
    isPreviewing = true;
    const baseTime = player.getCurrentTime() + 0.01;
    notes.forEach((note) => {
        const delayOffset = getDelayOffsetSeconds(durationSeconds);
        player.playChordAtTime([note], baseTime + delayOffset, durationSeconds, 0.3 * volumeMultiplier);
    });
    setTimeout(() => {
        if (!isSequencePreviewing) {
            isPreviewing = false;
            setChordPreviewPlaying(null);
        }
    }, durationSeconds * 1000);
}

function playSingleChord(chord, index) {
    playChordOnce(chord, index);
}

async function exportMidiFile() {
    updateChordSequenceFromInput();

    if (!chordSequence || chordSequence.length === 0) {
        alert('Please enter at least one valid chord.');
        return;
    }

    if (!window.Midi) {
        alert('MIDI library not loaded yet.');
        return;
    }

    const bpm = getBpmValue();
    const barSeconds = (60 / bpm) * CHORD_BAR_BEATS;
    const barTicks = secondsToTicks(barSeconds, bpm);

    const file = new window.Midi.File({ ticks: MIDI_TICKS_PER_BEAT });
    const bassTrack = new window.Midi.Track();
    const highTrack = new window.Midi.Track();
    file.addTrack(bassTrack);
    file.addTrack(highTrack);
    bassTrack.setTempo(bpm);

    const bassEvents = [];
    const highEvents = [];
    const delayState = { counter: 0 };
    const skipState = buildSkipState();

    chordSequence.forEach((chord, index) => {
        const chordNotes = engine.chordToMIDINotes(chord);
        const highNotes = getHighNotesForPattern(chordNotes);
        const startTick = index * barTicks;
        const endTick = startTick + barTicks;
        const bassCycleTicks = secondsToTicks(bassDurationMultiplier / bpm, bpm);
        const highCycleTicks = secondsToTicks(highDurationMultiplier / bpm, bpm);
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
            80,
            'normal',
            delayState,
            false,
            skipState
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
            96,
            patternMode,
            delayState,
            true,
            skipState
        );
    });

    addMidiEvents(bassTrack, bassEvents);
    addMidiEvents(highTrack, highEvents);

    const midiBytes = file.toBytes();
    const nativeSave = await saveMidiToFilesystem(midiBytes);
    if (nativeSave) {
        alert(`Saved MIDI to ${nativeSave}.`);
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
    await filesystem.writeFile({
        path: fileName,
        data,
        directory: 'DOCUMENTS'
    });

    return `Documents/${fileName}`;
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

function updateCurrentHighNotes(index) {
    if (!currentHighNotes) return;
    if (index === null || index === undefined || !chordSequence[index]) {
        currentHighNotes.textContent = '';
        return;
    }
    const chordNotes = engine.chordToMIDINotes(chordSequence[index]);
    const lowNames = chordNotes.bass.map(midiToNoteName);
    const highNotes = getHighNotesForPattern(chordNotes);
    const highNames = highNotes.map(midiToNoteName);
    currentHighNotes.textContent = `Low notes: ${lowNames.join(', ')} | High notes: ${highNames.join(', ')}`;
}

function updatePreviewToggleLabel() {
    previewToggle.textContent = isSequencePreviewing ? 'Tap to stop' : 'Tap to listen';
}

const helpSteps = [
    {
        text: 'Write any chords here.',
        selector: '#chordInput'
    },
    {
        text: 'Make sure to separate them with commas.',
        selector: '#chordInput'
    },

    {
        text: "Tap to listen to what you wrote.",
        selector: '#previewToggle'
    },
    {
        text: "Tap to export MIDI and download it.",
        selector: '#exportBtn'
    },
    {
        text: 'Customise their rhythms, notes, and more!',
        selector: 'nav'
    }
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
    helpText.textContent = helpSteps[index].text;
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

chordInput.addEventListener('input', () => {
    autoResizeTextarea(chordInput);
    updateChordSequenceFromInput();
});

bassRhythmSelect.addEventListener('change', (event) => {
    bassDurationMultiplier = parseInt(event.target.value, 10);
});

highRhythmSelect.addEventListener('change', (event) => {
    highDurationMultiplier = parseInt(event.target.value, 10);
});

bpmInput.addEventListener('input', () => {
    updateRhythmSelectOptions();
});

volumeModSelect.addEventListener('change', (event) => {
    volumeModPattern = event.target.value;
});

if (delayModSelect) {
    delayModSelect.addEventListener('change', (event) => {
        delayModPattern = event.target.value;
    });
}

if (patternSelect) {
    patternSelect.addEventListener('change', (event) => {
        patternMode = event.target.value;
    });
}

if (doubleHighNotes) {
    doubleHighNotes.addEventListener('change', (event) => {
        doubleHighEnabled = event.target.checked;
        updateCurrentHighNotes(currentChordIndex);
    });
}

const updateSkipPattern = () => {
    skipEvery = parseInt(skipSelect?.value || '0', 10) || 0;
    buildSkipPattern();
};

if (skipSelect) {
    skipSelect.addEventListener('change', updateSkipPattern);
}
if (skipSelect2) {
    skipSelect2.addEventListener('change', updateSkipPattern);
}
if (skipSelect3) {
    skipSelect3.addEventListener('change', updateSkipPattern);
}

autoResizeTextarea(chordInput);
updateRhythmSelectOptions();
updateChordSequenceFromInput();
volumeModPattern = volumeModSelect.value || 'uphill';
delayModPattern = delayModSelect ? delayModSelect.value || 'drunk' : 'drunk';
patternMode = patternSelect ? patternSelect.value || 'normal' : 'normal';
updateSkipPattern();
updatePreviewToggleLabel();
doubleHighEnabled = !!(doubleHighNotes && doubleHighNotes.checked);

navButtons.forEach((button) => {
    button.addEventListener('click', () => {
        navButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        const panelId = button.getAttribute('data-panel');
        document.querySelectorAll('main section').forEach((section) => {
            section.hidden = section.id !== panelId;
        });
    });
});

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
