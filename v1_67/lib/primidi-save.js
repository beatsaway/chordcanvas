/**
 * Primidi Save — shared event generator so MIDI and WAV match live playback.
 * Live playback, MIDI export, and WAV export all use the same event list.
 */
(function (global) {
    'use strict';

    const CC_CHORD_BAR_BEATS = 4;
    const CC_DELAY_MOD_CHANCE = 0.618;
    const CC_DELAY_MOD_AMOUNT_HUMAN = 0.05;
    const CC_DELAY_MOD_AMOUNT_DRUNK = 0.128;
    const CC_VOLUME_MOD_MIN = 0.05;
    const CC_VOLUME_MOD_MAX = 1.3;

    function buildSkipStateFromPattern(pattern) {
        return { pattern: (pattern || []).slice(), counter: 0, index: 0 };
    }

    function shouldSkipNextFromState(state) {
        if (!state || !state.pattern || state.pattern.length === 0) return false;
        state.counter += 1;
        const target = state.pattern[state.index];
        if (state.counter >= target) {
            state.counter = 0;
            state.index = (state.index + 1) % state.pattern.length;
            return true;
        }
        return false;
    }

    function getPatternNotesForCycle(ordered, direction, cycleIndex) {
        const length = ordered.length;
        if (length === 0) return [];
        if (direction === 'descend') {
            const idx = cycleIndex % length;
            return [ordered[length - 1 - idx]];
        }
        if (direction === 'ascend2') {
            if (length < 2) return [ordered[0]];
            const start = cycleIndex % (length - 1);
            return [ordered[start], ordered[start + 1]];
        }
        if (direction === 'descend2') {
            if (length < 2) return [ordered[length - 1]];
            const start = cycleIndex % (length - 1);
            return [ordered[length - 1 - start], ordered[length - 2 - start]];
        }
        const idx = cycleIndex % length;
        return [ordered[idx]];
    }

    function linearToDb(value) {
        return 20 * Math.log10(Math.max(value, 0.0001));
    }
    function dbToLinear(db) {
        return Math.pow(10, db / 20);
    }
    function applyVolumeModIntensity(multiplier, intensity) {
        if (intensity <= 0) return 0;
        if (intensity >= 1) return multiplier;
        return intensity * (multiplier - 1) + 1;
    }
    function getLinearVolumeModMultiplier(volumeMod, cyclePosition, intensity) {
        if (!volumeMod || volumeMod === 'none') return 1.0;
        intensity = intensity != null && !isNaN(intensity) ? Math.max(0, Math.min(1, intensity)) : 1;
        const pos = Math.max(0, Math.min(1, cyclePosition));
        const minDb = linearToDb(CC_VOLUME_MOD_MIN);
        const maxDb = linearToDb(CC_VOLUME_MOD_MAX);
        let raw = 1.0;
        switch (volumeMod) {
            case 'uphill':
                raw = dbToLinear(minDb + (pos * (maxDb - minDb)));
                break;
            case 'downhill':
                raw = dbToLinear(maxDb - (pos * (maxDb - minDb)));
                break;
            case 'valley':
                raw = pos <= 0.5
                    ? dbToLinear(maxDb - ((pos * 2) * (maxDb - minDb)))
                    : dbToLinear(minDb + (((pos - 0.5) * 2) * (maxDb - minDb)));
                break;
            case 'hill':
                raw = pos <= 0.5
                    ? dbToLinear(minDb + ((pos * 2) * (maxDb - minDb)))
                    : dbToLinear(maxDb - (((pos - 0.5) * 2) * (maxDb - minDb)));
                break;
            default: {
                const nvalleyMatch = volumeMod && String(volumeMod).match(/^(\d+)valley$/);
                if (nvalleyMatch) {
                    const n = Math.max(1, Math.min(99, parseInt(nvalleyMatch[1], 10)));
                    const phase = (pos * n) % 1;
                    raw = phase <= 0.5
                        ? dbToLinear(maxDb - ((phase * 2) * (maxDb - minDb)))
                        : dbToLinear(minDb + (((phase - 0.5) * 2) * (maxDb - minDb)));
                } else {
                    const nhillMatch = volumeMod && String(volumeMod).match(/^(\d+)hill$/);
                    if (nhillMatch) {
                        const n = Math.max(1, Math.min(99, parseInt(nhillMatch[1], 10)));
                        const phase = (pos * 2 * n) % 2;
                        raw = phase <= 1
                            ? dbToLinear(minDb + (phase * (maxDb - minDb)))
                            : dbToLinear(maxDb - ((phase - 1) * (maxDb - minDb)));
                    }
                }
                break;
            }
        }
        return applyVolumeModIntensity(raw, intensity);
    }

    function getDelayOffsetSeconds(noteDurationSeconds, delayModPattern, state) {
        if (!delayModPattern || delayModPattern === 'none') return 0;
        if (delayModPattern !== 'human' && delayModPattern !== 'drunk') return 0;
        if (!state) return 0;
        state.counter += 1;
        const remainder = (state.counter * 0.61803398875) % 1;
        if (remainder > CC_DELAY_MOD_CHANCE) return 0;
        const amount = delayModPattern === 'drunk' ? CC_DELAY_MOD_AMOUNT_DRUNK : CC_DELAY_MOD_AMOUNT_HUMAN;
        return noteDurationSeconds * amount * remainder;
    }

    function buildEventsForPart(params) {
        const {
            chordCount,
            barSeconds,
            baseVelocity,
            cycleSeconds,
            notesByChordIndex,
            patternMode,
            applySkip,
            skipState,
            delayMod,
            delayIntensity,
            delayRefSeconds,
            delayState,
            everyBarPattern,
            everyBarIntensity
        } = params;

        const delayBaseSeconds = (delayRefSeconds != null && delayRefSeconds > 0) ? delayRefSeconds : Math.max(0.05, cycleSeconds * 0.8);
        const events = [];
        const noteDurationSeconds = Math.max(0.05, cycleSeconds * 0.8);
        for (let chordIndex = 0; chordIndex < chordCount; chordIndex += 1) {
            const chordStart = chordIndex * barSeconds;
            const chordNotes = notesByChordIndex[chordIndex] || [];
            if (!chordNotes.length) continue;
            const ordered = chordNotes.slice().sort((a, b) => a - b);
            let cycleIndex = 0;
            for (let t = 0; t < barSeconds - 1e-6; t += cycleSeconds) {
                if (applySkip && skipState && shouldSkipNextFromState(skipState)) {
                    cycleIndex += 1;
                    continue;
                }
                const cyclePos = barSeconds > 0 ? (t / barSeconds) : 0;
                const volMult = getLinearVolumeModMultiplier(everyBarPattern, cyclePos, everyBarIntensity);
                const vel = Math.max(1, Math.min(127, Math.round(baseVelocity * volMult)));
                const delayOffsetSeconds = getDelayOffsetSeconds(delayBaseSeconds, delayMod, delayState) * delayIntensity;
                const at = chordStart + t + delayOffsetSeconds;
                const chosen = (patternMode === 'normal') ? ordered : getPatternNotesForCycle(ordered, patternMode, cycleIndex);
                for (let i = 0; i < chosen.length; i += 1) {
                    events.push({ time: at, midi: chosen[i], duration: noteDurationSeconds, velocity: vel });
                }
                cycleIndex += 1;
            }
        }
        return events;
    }

    /**
     * Build the single shared event list from compiled state (same as live playback).
     * @param {Object} compiledState - chordCount, barSeconds, bpm, bassNotesByChord, trebleNotesByChord,
     *   bassDurationMultiplier, trebleDurationMultiplier, patternMode, skipPattern,
     *   delayMod, delayIntensity, bassEveryBar, trebleEveryBar, bassEveryBarIntensity, trebleEveryBarIntensity, voicing
     * @returns {{ bassEvents: Array, trebleEvents: Array, totalSeconds: number }}
     */
    function buildEvents(compiledState) {
        const chordCount = compiledState.chordCount || 0;
        const barSeconds = compiledState.barSeconds || 2;
        const bpm = compiledState.bpm || 120;
        const voicing = compiledState.voicing || 'full';
        const bassNotesByChord = compiledState.bassNotesByChord || [];
        const trebleNotesByChord = compiledState.trebleNotesByChord || [];
        const bassCycleSeconds = (Number(compiledState.bassDurationMultiplier) || 30) / bpm;
        const trebleCycleSeconds = (Number(compiledState.trebleDurationMultiplier) || 30) / bpm;
        const trebleSkipPattern = Array.isArray(compiledState.skipPattern) ? compiledState.skipPattern : [];
        const bassSkipPattern = Array.isArray(compiledState.bassSkipPattern) ? compiledState.bassSkipPattern : trebleSkipPattern;
        const bassSkipState = buildSkipStateFromPattern(bassSkipPattern);
        const trebleSkipState = buildSkipStateFromPattern(trebleSkipPattern);
        const bassDelayState = { counter: 0 };
        const trebleDelayState = { counter: 0 };
        const delayMod = compiledState.delayMod || 'none';
        const delayIntensity = compiledState.delayIntensity != null ? compiledState.delayIntensity : 1;

        const baseVel = compiledState.velocity != null ? Math.max(1, Math.min(127, compiledState.velocity)) : 74;
        const bassEvents = (voicing === 'full' || voicing === 'bass') ? buildEventsForPart({
            chordCount,
            barSeconds,
            baseVelocity: baseVel,
            cycleSeconds: bassCycleSeconds,
            notesByChordIndex: bassNotesByChord,
            patternMode: compiledState.bassPatternMode || 'normal',
            applySkip: true,
            skipState: bassSkipState,
            delayMod,
            delayIntensity,
            delayRefSeconds: 5 / bpm,
            delayState: bassDelayState,
            everyBarPattern: compiledState.bassEveryBar || 'none',
            everyBarIntensity: compiledState.bassEveryBarIntensity != null ? compiledState.bassEveryBarIntensity : 1
        }) : [];

        let trebleEvents = (voicing === 'full' || voicing === 'treble') ? buildEventsForPart({
            chordCount,
            barSeconds,
            baseVelocity: baseVel,
            cycleSeconds: trebleCycleSeconds,
            notesByChordIndex: trebleNotesByChord,
            patternMode: compiledState.patternMode || 'normal',
            applySkip: true,
            skipState: trebleSkipState,
            delayMod,
            delayIntensity,
            delayRefSeconds: 5 / bpm,
            delayState: trebleDelayState,
            everyBarPattern: compiledState.trebleEveryBar || 'none',
            everyBarIntensity: compiledState.trebleEveryBarIntensity != null ? compiledState.trebleEveryBarIntensity : 1
        }) : [];

        // Treble 2-octaves: duplicate each treble note one octave up (after pattern has chosen the note)
        const trebleOctaves = compiledState.trebleOctaves === 2 ? 2 : 1;
        if (trebleOctaves === 2 && trebleEvents.length > 0) {
            const MIDI_MAX = 108;
            const extra = [];
            trebleEvents.forEach(function (e) {
                const up = e.midi + 12;
                if (up <= MIDI_MAX) {
                    extra.push({ time: e.time, midi: up, duration: e.duration, velocity: e.velocity });
                }
            });
            trebleEvents = trebleEvents.concat(extra);
        }

        const totalSeconds = chordCount * barSeconds + 1.2;
        return { bassEvents, trebleEvents, totalSeconds };
    }

    /**
     * Build sustain pedal down/up events per bar for chord-dock playback.
     * Pedal down at barStart + 0.01s, pedal up at barEnd - 0.3s; human/drunk delay applies to each.
     * @param {Object} compiledState - chordCount, barSeconds, delayMod, delayIntensity
     * @returns {Array<{ time: number, down: boolean }>}
     */
    function buildSustainPedalEvents(compiledState) {
        const chordCount = compiledState.chordCount || 0;
        const barSeconds = compiledState.barSeconds || 2;
        const bpm = compiledState.bpm || 120;
        const delayMod = compiledState.delayMod || 'none';
        const delayIntensity = compiledState.delayIntensity != null ? compiledState.delayIntensity : 1;
        const PEDAL_DOWN_OFFSET = 0.01;
        const PEDAL_UP_BEFORE_END = 0.3;
        const delayRefSeconds = 5 / bpm;
        const pedalDelayState = { counter: 0 };
        const out = [];
        for (let i = 0; i < chordCount; i += 1) {
            const barStart = i * barSeconds;
            const barEnd = barStart + barSeconds;
            const downDelay = getDelayOffsetSeconds(delayRefSeconds, delayMod, pedalDelayState) * delayIntensity;
            const upDelay = getDelayOffsetSeconds(delayRefSeconds, delayMod, pedalDelayState) * delayIntensity;
            out.push({ time: barStart + PEDAL_DOWN_OFFSET + downDelay, down: true });
            out.push({ time: barEnd - PEDAL_UP_BEFORE_END + upDelay, down: false });
        }
        return out.sort(function (a, b) { return a.time - b.time; });
    }

    /**
     * Whether the sustain pedal is down at time t (from pedal event list sorted by time).
     */
    function isPedalDownAt(pedalEvents, t) {
        let down = false;
        for (let i = 0; i < pedalEvents.length; i += 1) {
            if (pedalEvents[i].time > t) break;
            down = pedalEvents[i].down;
        }
        return down;
    }

    /**
     * Time of the next pedal-up at or after t, or null if none.
     */
    function nextPedalUpAtOrAfter(pedalEvents, t) {
        for (let i = 0; i < pedalEvents.length; i += 1) {
            if (!pedalEvents[i].down && pedalEvents[i].time >= t) return pedalEvents[i].time;
        }
        return null;
    }

    /**
     * Extend note durations so notes that would end while the pedal is down
     * are held until the next pedal-up (so WAV matches live sustain effect).
     * @param {Array<{ time, midi, duration, velocity }>} noteEvents
     * @param {Array<{ time, down }>} pedalEvents - sorted by time
     * @param {number} maxEnd - cap end time (e.g. totalSeconds)
     * @returns {Array} new events with extended duration where pedal was down
     */
    function extendNoteEventsWithSustain(noteEvents, pedalEvents, maxEnd) {
        if (!pedalEvents || pedalEvents.length === 0) return noteEvents;
        const out = [];
        for (let i = 0; i < noteEvents.length; i += 1) {
            const e = noteEvents[i];
            let duration = e.duration;
            const naturalEnd = e.time + duration;
            if (isPedalDownAt(pedalEvents, naturalEnd - 1e-6)) {
                const upTime = nextPedalUpAtOrAfter(pedalEvents, naturalEnd);
                if (upTime != null) {
                    const effectiveEnd = Math.min(upTime, maxEnd);
                    duration = Math.max(duration, effectiveEnd - e.time);
                }
            }
            out.push({ time: e.time, midi: e.midi, duration: duration, velocity: e.velocity });
        }
        return out;
    }

    // --- MIDI export: events -> .mid file (delta times in ticks) ---
    const TICKS_PER_BEAT = 480;

    function secondsToTicks(seconds, bpm) {
        const beats = seconds * (bpm / 60);
        return Math.round(beats * TICKS_PER_BEAT);
    }

    function eventsToMidiTracks(bassEvents, trebleEvents, bpm) {
        const channel = 0;
        const eventsByTrack = [
            bassEvents.map(function (e) {
                return { tick: secondsToTicks(e.time, bpm), type: 'on', midi: e.midi, velocity: e.velocity };
            }).concat(bassEvents.map(function (e) {
                return { tick: secondsToTicks(e.time + e.duration, bpm), type: 'off', midi: e.midi };
            })),
            trebleEvents.map(function (e) {
                return { tick: secondsToTicks(e.time, bpm), type: 'on', midi: e.midi, velocity: e.velocity };
            }).concat(trebleEvents.map(function (e) {
                return { tick: secondsToTicks(e.time + e.duration, bpm), type: 'off', midi: e.midi };
            }))
        ];

        const Midi = global.Midi;
        if (!Midi || !Midi.Track || !Midi.File) {
            throw new Error('MIDI library (jsmidgen) not loaded.');
        }
        const bassTrack = new Midi.Track();
        const highTrack = new Midi.Track();
        bassTrack.setTempo(bpm, 0);

        [bassTrack, highTrack].forEach(function (track, idx) {
            const list = eventsByTrack[idx];
            list.sort(function (a, b) {
                if (a.tick !== b.tick) return a.tick - b.tick;
                return (a.type === 'off' ? 1 : 0) - (b.type === 'off' ? 1 : 0);
            });
            let prevTick = 0;
            for (let i = 0; i < list.length; i += 1) {
                const ev = list[i];
                const delta = Math.max(0, ev.tick - prevTick);
                prevTick = ev.tick;
                if (ev.type === 'on') {
                    track.addNoteOn(channel, ev.midi, delta, ev.velocity);
                } else {
                    track.addNoteOff(channel, ev.midi, delta, 0);
                }
            }
        });

        return { bassTrack, highTrack };
    }

    function exportMidi(bassEvents, trebleEvents, bpm) {
        const Midi = global.Midi;
        if (!Midi || !Midi.File) throw new Error('MIDI library not loaded.');
        const bpmNum = Number(bpm) || 120;
        const { bassTrack, highTrack } = eventsToMidiTracks(bassEvents, trebleEvents, bpmNum);
        const file = new Midi.File({ ticks: TICKS_PER_BEAT });
        file.addTrack(bassTrack);
        file.addTrack(highTrack);
        const bytes = file.toBytes();
        const data = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i += 1) {
            data[i] = bytes.charCodeAt(i) & 0xff;
        }
        return new Blob([data], { type: 'audio/midi' });
    }

    // --- WAV export: events -> OfflineAudioContext -> WAV blob ---
    const WAV_EXPORT_TARGET_PEAK = 0.99;
    const WAV_ENCODE_CHUNK_FRAMES = 44100;

    function normalizeBufferToPeak(buffer, targetPeak) {
        targetPeak = targetPeak != null ? targetPeak : WAV_EXPORT_TARGET_PEAK;
        const numChannels = buffer.numberOfChannels;
        const numFrames = buffer.length;
        let peak = 0;
        for (let c = 0; c < numChannels; c += 1) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < numFrames; i += 1) {
                const abs = Math.abs(data[i]);
                if (abs > peak) peak = abs;
            }
        }
        if (peak <= 0) return;
        const gain = targetPeak / peak;
        if (Math.abs(gain - 1) < 1e-6) return;
        for (let c = 0; c < numChannels; c += 1) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < numFrames; i += 1) {
                const s = data[i] * gain;
                data[i] = Math.max(-1, Math.min(1, s));
            }
        }
    }

    function encodeWavFromBufferAsync(buffer, onProgress) {
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
        const channelData = Array.from({ length: numChannels }, (_, c) => buffer.getChannelData(c));
        function doChunk(startFrame, endFrame) {
            for (let i = startFrame; i < endFrame; i += 1) {
                for (let channel = 0; channel < numChannels; channel += 1) {
                    let sample = channelData[channel][i];
                    sample = Math.max(-1, Math.min(1, sample));
                    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
                    offset += 2;
                }
            }
        }
        return new Promise(function (resolve) {
            let frame = 0;
            function nextChunk() {
                const chunkEnd = Math.min(frame + WAV_ENCODE_CHUNK_FRAMES, numFrames);
                doChunk(frame, chunkEnd);
                frame = chunkEnd;
                if (onProgress && numFrames > 0) onProgress(Math.round((frame / numFrames) * 100));
                if (frame < numFrames) {
                    setTimeout(nextChunk, 0);
                } else {
                    resolve(new Blob([view], { type: 'audio/wav' }));
                }
            }
            nextChunk();
        });
    }

    function midiToPlaybackRate(midi, originalPitchCents, semitoneOffset) {
        const originalPitchSemis = (originalPitchCents || 0) / 100;
        return Math.pow(2, (midi + (semitoneOffset || 0) - originalPitchSemis) / 12);
    }

    /**
     * Velocity → gain for WAV. Uses the same curve as live playback when available,
     * so WAV is exactly what you hear in the browser.
     */
    function velocityToGain(velocity, midiNote, globalScope) {
        const g = globalScope || (typeof window !== 'undefined' ? window : global);
        if (typeof g.getVelocityAmplitudeForExport === 'function') {
            return g.getVelocityAmplitudeForExport(velocity, midiNote != null ? midiNote : 60);
        }
        const v = Math.max(1, Math.min(127, velocity || 74)) / 127;
        const curve = Math.pow(v, 0.65);
        return 0.28 * Math.max(0.06, curve);
    }

    /** Same IR as gsl-synth so WAV reverb matches live. */
    function createImpulseResponse(ctx, seconds, decay) {
        const length = Math.floor(ctx.sampleRate * seconds);
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let ch = 0; ch < impulse.numberOfChannels; ch += 1) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i += 1) {
                const t = i / length;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
            }
        }
        return impulse;
    }

    /**
     * Build dry + reverb + stereo chain matching gsl-synth so WAV sounds like live playback.
     * Returns { inputGain } — connect each note to inputGain.
     */
    function buildSynthStyleChain(ctx, reverbAmount, stereoWidthMidEq) {
        const dryGain = ctx.createGain();
        dryGain.gain.setValueAtTime(1, ctx.currentTime);
        const reverbSend = ctx.createGain();
        reverbSend.gain.setValueAtTime(reverbAmount, ctx.currentTime);
        const reverbNode = ctx.createConvolver();
        reverbNode.buffer = createImpulseResponse(ctx, 2.2, 2.4);
        const reverbWet = ctx.createGain();
        reverbWet.gain.setValueAtTime(reverbAmount, ctx.currentTime);
        const sumGain = ctx.createGain();
        sumGain.gain.setValueAtTime(1, ctx.currentTime);
        dryGain.connect(sumGain);
        reverbSend.connect(reverbNode);
        reverbNode.connect(reverbWet);
        reverbWet.connect(sumGain);

        const widthSplit = ctx.createChannelSplitter(2);
        sumGain.connect(widthSplit);
        const midSum = ctx.createGain();
        const sideSum = ctx.createGain();
        const invGain = ctx.createGain();
        invGain.gain.setValueAtTime(-1, ctx.currentTime);
        widthSplit.connect(midSum, 0);
        widthSplit.connect(midSum, 1);
        widthSplit.connect(sideSum, 0);
        widthSplit.connect(invGain, 1);
        invGain.connect(sideSum);
        const midGain = ctx.createGain();
        const sideGain = ctx.createGain();
        const sideGainInv = ctx.createGain();
        sideGainInv.gain.setValueAtTime(-1, ctx.currentTime);
        const midEq = Math.max(-100, Math.min(0, stereoWidthMidEq));
        const db = -36 + ((midEq + 100) / 100) * 24;
        midGain.gain.setValueAtTime(Math.pow(10, db / 20), ctx.currentTime);
        sideGain.gain.setValueAtTime(1, ctx.currentTime);
        midSum.connect(midGain);
        sideSum.connect(sideGain);
        sideGain.connect(sideGainInv);
        const widthMerge = ctx.createChannelMerger(2);
        midGain.connect(widthMerge, 0, 0);
        sideGain.connect(widthMerge, 0, 0);
        midGain.connect(widthMerge, 0, 1);
        sideGainInv.connect(widthMerge, 0, 1);
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1, ctx.currentTime);
        widthMerge.connect(masterGain);
        masterGain.connect(ctx.destination);

        const inputGain = ctx.createGain();
        inputGain.gain.setValueAtTime(1, ctx.currentTime);
        inputGain.connect(dryGain);
        inputGain.connect(reverbSend);
        return { inputGain: inputGain };
    }

    function getDelayOffsetSecondsWav(noteDurationSeconds, delayModPattern, state) {
        if (!delayModPattern || delayModPattern === 'none') return 0;
        if (delayModPattern !== 'human' && delayModPattern !== 'drunk') return 0;
        if (!state) return 0;
        state.counter = (state.counter || 0) + 1;
        const remainder = (state.counter * 0.61803398875) % 1;
        if (remainder > CC_DELAY_MOD_CHANCE) return 0;
        const amount = delayModPattern === 'drunk' ? CC_DELAY_MOD_AMOUNT_DRUNK : CC_DELAY_MOD_AMOUNT_HUMAN;
        return noteDurationSeconds * amount * remainder;
    }

    /**
     * Render WAV from the same event list. Uses same reverb + stereo chain as gsl-synth so it matches what you hear.
     * If options.presetSlots is provided (multi-layer), renders each note through each slot (preset, volume, semitone, delay) like live playback.
     */
    async function exportWav(bassEvents, trebleEvents, totalSeconds, options) {
        options = options || {};
        if (typeof global.OfflineAudioContext !== 'function') {
            throw new Error('OfflineAudioContext not supported in this browser.');
        }
        const handler = options.handler || global.InstrumentSampleHandler;
        if (!handler || typeof handler.getZoneForMidi !== 'function' || typeof handler.getZoneBuffer !== 'function') {
            throw new Error('Instrument sample handler not ready.');
        }
        if (typeof handler.ensurePresetLoaded !== 'function') {
            throw new Error('Instrument sample handler cannot load preset for offline context.');
        }
        const presetSlots = options.presetSlots && Array.isArray(options.presetSlots) ? options.presetSlots : null;
        const slotVolumes = options.slotVolumes && Array.isArray(options.slotVolumes) ? options.slotVolumes : [33, 33, 33, 33, 33, 33];
        const slotSemitones = options.slotSemitones && Array.isArray(options.slotSemitones) ? options.slotSemitones : [0, 0, 0, 0, 0, 0];
        const slotMuted = options.slotMuted && Array.isArray(options.slotMuted) ? options.slotMuted : [false, false, false, false, false, false];
        const layerPlayStyle = (options.layerPlayStyle === 'human' || options.layerPlayStyle === 'drunk') ? options.layerPlayStyle : 'none';
        const delayIntensity = options.delayIntensity != null && !isNaN(options.delayIntensity) ? Math.max(0, options.delayIntensity) : 1;
        const bpm = options.bpm != null && options.bpm > 0 ? options.bpm : 120;
        const soundBpm = options.soundBpm != null && options.soundBpm > 0 ? Math.max(40, Math.min(240, options.soundBpm)) : bpm;
        const everyBarPattern = options.everyBarPattern && Array.isArray(options.everyBarPattern) ? options.everyBarPattern : ['none', 'none', 'none', 'none', 'none', 'none'];
        const everyBarIntensity = options.everyBarIntensity && Array.isArray(options.everyBarIntensity) ? options.everyBarIntensity : [0.20, 0.20, 0.20, 0.20, 0.20, 0.20];
        const delayRefSeconds = 5 / bpm;
        const barDurationEveryBar = 60 / soundBpm;
        const EVERY_BAR_GAIN_STEP = 0.0125;

        const singlePreset = options.presetName || (presetSlots && presetSlots[0]) || (global.gslPresetSlots && global.gslPresetSlots[0]) || global.currentGslPreset || 'gsl_piano';
        const hasValidSlots = presetSlots && presetSlots.length > 0 && presetSlots.some(function (p) { return p != null && String(p).trim() !== ''; });
        const presetsToLoad = hasValidSlots
            ? presetSlots.filter(function (p) { return p != null && String(p).trim() !== ''; })
            : [singlePreset];
        const slotsForRender = hasValidSlots ? presetSlots : [singlePreset];

        const sampleRate = options.sampleRate || 44100;
        const totalFrames = Math.ceil((totalSeconds || 10) * sampleRate);
        const offlineCtx = new global.OfflineAudioContext(2, totalFrames, sampleRate);

        const baseUrl = options.baseUrl != null ? options.baseUrl : (typeof global.document !== 'undefined' && global.document.baseURI ? global.document.baseURI.replace(/\/[^/]*$/, '/') : '');
        for (let p = 0; p < presetsToLoad.length; p += 1) {
            await handler.ensurePresetLoaded(offlineCtx, presetsToLoad[p], baseUrl);
        }

        const reverbAmount = options.reverbAmount != null ? Math.max(0, Math.min(1, options.reverbAmount)) * 0.6 : 0.3;
        const stereoWidthMidEq = options.stereoWidthMidEq != null ? options.stereoWidthMidEq : -75;
        const chain = buildSynthStyleChain(offlineCtx, reverbAmount, stereoWidthMidEq);

        const allEvents = bassEvents.concat(trebleEvents).sort(function (a, b) { return a.time - b.time; });
        const attack = 0.01;
        const release = 0.08;
        const delayStateBySlot = [];

        for (let i = 0; i < allEvents.length; i += 1) {
            const ev = allEvents[i];
            const midi = ev.midi;
            const dur = Math.max(0.03, ev.duration || 0.2);
            const baseWhen = Math.max(0, ev.time);
            const velocityPeak = velocityToGain(ev.velocity, ev.midi, global);

            for (let slotIdx = 0; slotIdx < slotsForRender.length; slotIdx += 1) {
                const presetName = slotsForRender[slotIdx];
                if (!presetName || (slotMuted[slotIdx])) continue;
                const preset = handler.getPreset && handler.getPreset(presetName) ? handler.getPreset(presetName) : null;
                if (!preset || !preset.zones) continue;

                const zone = handler.getZoneForMidi(presetName, midi);
                const buf = handler.getZoneBuffer(zone, offlineCtx);
                if (!zone || !buf) continue;

                const delayState = delayStateBySlot[slotIdx] || (delayStateBySlot[slotIdx] = { counter: 0 });
                const delayOffset = getDelayOffsetSecondsWav(delayRefSeconds, layerPlayStyle, delayState) * delayIntensity;
                const when = baseWhen + delayOffset;

                const volRaw = (slotVolumes[slotIdx] != null && !isNaN(slotVolumes[slotIdx])) ? slotVolumes[slotIdx] : 33;
                const slotVol = Math.max(0, Math.min(100, volRaw)) / 100;
                const semitone = (slotSemitones[slotIdx] != null && !isNaN(slotSemitones[slotIdx])) ? slotSemitones[slotIdx] : 0;
                const peak = velocityPeak * slotVol;
                const pattern = everyBarPattern[slotIdx] || 'none';
                const intensity = (everyBarIntensity[slotIdx] != null && !isNaN(everyBarIntensity[slotIdx])) ? Math.max(0, Math.min(1, everyBarIntensity[slotIdx])) : 0.20;

                const gain = offlineCtx.createGain();
                gain.gain.setValueAtTime(0.0001, when);
                (function () {
                    const sustainStart = when + attack;
                    const sustainEnd = when + Math.max(attack, dur - 0.001);
                    const phaseAt = function (t) {
                        if (barDurationEveryBar <= 0) return 0;
                        return ((t % barDurationEveryBar) + barDurationEveryBar) % barDurationEveryBar / barDurationEveryBar;
                    };
                    const multAt = function (t) { return getLinearVolumeModMultiplier(pattern, phaseAt(t), intensity); };
                    gain.gain.setValueAtTime(peak * multAt(sustainStart), sustainStart);
                    for (let t = sustainStart + EVERY_BAR_GAIN_STEP; t < sustainEnd - 1e-6; t += EVERY_BAR_GAIN_STEP) {
                        gain.gain.setValueAtTime(peak * multAt(t), t);
                    }
                    gain.gain.setValueAtTime(peak * multAt(sustainEnd), sustainEnd);
                })();
                gain.gain.linearRampToValueAtTime(0.0001, when + dur + release);
                gain.connect(chain.inputGain);

                const playbackRate = midiToPlaybackRate(midi, zone.originalPitchCents, semitone);
                const src = offlineCtx.createBufferSource();
                src.buffer = buf;
                src.loop = true;
                src.loopStart = zone.loopStart != null ? zone.loopStart : 0.1;
                src.loopEnd = zone.loopEnd != null ? zone.loopEnd : Math.max(0.11, buf.duration - 0.1);
                src.playbackRate.setValueAtTime(playbackRate, when);
                src.connect(gain);
                try { src.start(when); } catch (e) {}
                try { src.stop(Math.min(totalSeconds - 0.01, when + dur + release + 0.05)); } catch (e) {}
            }
        }

        const rendered = await offlineCtx.startRendering();
        normalizeBufferToPeak(rendered, WAV_EXPORT_TARGET_PEAK);
        return encodeWavFromBufferAsync(rendered, options.onProgress);
    }

    const PrimidiSave = {
        buildEvents: buildEvents,
        buildSustainPedalEvents: buildSustainPedalEvents,
        extendNoteEventsWithSustain: extendNoteEventsWithSustain,
        exportMidi: exportMidi,
        exportWav: exportWav,
        CC_CHORD_BAR_BEATS: CC_CHORD_BAR_BEATS
    };

    if (typeof global !== 'undefined') {
        global.PrimidiSave = PrimidiSave;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PrimidiSave;
    }
})(typeof window !== 'undefined' ? window : this);
