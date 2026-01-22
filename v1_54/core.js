class ChordEngine {
    constructor({ noteToIndex, chordIntervals } = {}) {
        this.noteToIndex = noteToIndex || {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
        this.chordIntervals = chordIntervals || {};
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.chordTypeNames = {
            'major-triad': '',
            'minor-triad': 'm',
            'diminished-triad': 'dim',
            'augmented-triad': 'aug',
            'dominant-7th': '7',
            'minor-7th': 'm7',
            'major-7th': 'maj7',
            'diminished-7th': 'dim7',
            'major-6th': '6',
            'minor-6th': 'm6',
            'dominant-9th': '9',
            'major-9th': 'maj9',
            'minor-9th': 'm9',
            'dominant-11th': '11',
            'minor-11th': 'm11',
            'major-11th': 'maj11',
            'dominant-13th': '13',
            'major-13th': 'maj13',
            'minor-13th': 'm13',
            'add2': 'add2',
            'add4': 'add4',
            'add9': 'add9',
            'add11': 'add11',
            'add13': 'add13',
            'six-nine': '6/9',
            'dominant-7th-flat9': '7b9',
            'dominant-7th-sharp9': '7#9',
            'dominant-7th-flat5': '7b5',
            'dominant-7th-sharp5': '7#5',
            'dominant-7th-sus4': '7sus4',
            'dominant-9th-sus4': '9sus4',
            'minor-major-7th': 'mMaj7',
            'half-diminished-7th': 'm7b5',
            '7sharp11': '7#11',
            '9sharp11': '9#11',
            'sus2': 'sus2',
            'sus4': 'sus4'
        };
    }

    parseChord(input) {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const match = trimmed.match(/^([A-Ga-g])([#b]?)(.*)$/i);
        if (!match) return null;

        const rootLetter = match[1].toUpperCase();
        const accidental = match[2] || '';
        const suffix = match[3];
        const noteName = rootLetter + accidental;

        if (!this.noteToIndex.hasOwnProperty(noteName)) return null;

        let chordType = 'major-triad';
        let processedSuffix = suffix;
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            processedSuffix = suffix.substring(0, slashIndex);
        }
        processedSuffix = processedSuffix.replace(/\s+/g, '');

        const suffixLower = processedSuffix.toLowerCase();
        if (processedSuffix === 'M7' || processedSuffix === 'maj7' || processedSuffix === 'major7' || suffixLower === 'ma7') {
            chordType = 'major-7th';
        } else if (processedSuffix === 'M9' || processedSuffix === 'maj9' || processedSuffix === 'major9') {
            chordType = 'major-9th';
        } else if (processedSuffix === 'M11' || processedSuffix === 'maj11' || processedSuffix === 'major11') {
            chordType = 'major-11th';
        } else if (suffixLower === 'm' || suffixLower === 'min' || processedSuffix === '-') {
            chordType = 'minor-triad';
        } else if (suffixLower === '7' || suffixLower === 'dom' || suffixLower === 'dom7') {
            chordType = 'dominant-7th';
        } else if (suffixLower === 'm7' || suffixLower === 'min7' || suffixLower === '-7') {
            chordType = 'minor-7th';
        } else if (suffixLower.includes('dim') || processedSuffix.includes('°')) {
            if (suffixLower.includes('7') || processedSuffix.includes('°7') || processedSuffix === '°7') {
                chordType = 'diminished-7th';
            } else {
                chordType = 'diminished-triad';
            }
        } else if (suffixLower.includes('aug') || processedSuffix === '+') {
            chordType = 'augmented-triad';
        } else if (suffixLower === 'm9' || suffixLower === 'min9' || processedSuffix === '-9') {
            chordType = 'minor-9th';
        } else if (processedSuffix === '9') {
            chordType = 'dominant-9th';
        } else if (suffixLower === '9sus4' || suffixLower === '9sus') {
            chordType = 'dominant-9th-sus4';
        } else if (suffixLower === 'm11' || suffixLower === 'min11' || processedSuffix === '-11') {
            chordType = 'minor-11th';
        } else if (processedSuffix === '11') {
            chordType = 'dominant-11th';
        } else if (processedSuffix === '13' || suffixLower === '13') {
            chordType = 'dominant-13th';
        } else if (processedSuffix === '6') {
            chordType = 'major-6th';
        } else if (suffixLower === 'm6' || suffixLower === 'min6' || processedSuffix === '-6') {
            chordType = 'minor-6th';
        } else if (suffixLower === 'maj13' || processedSuffix === 'M13') {
            chordType = 'major-13th';
        } else if (suffixLower === 'm13' || suffixLower === 'min13') {
            chordType = 'minor-13th';
        } else if (suffixLower.includes('add9')) {
            chordType = 'add9';
        } else if (suffixLower.includes('add2')) {
            chordType = 'add2';
        } else if (suffixLower.includes('add4')) {
            chordType = 'add4';
        } else if (suffixLower.includes('add11')) {
            chordType = 'add11';
        } else if (suffixLower.includes('add13')) {
            chordType = 'add13';
        } else if (suffixLower === '6/9' || suffixLower === '69') {
            chordType = 'six-nine';
        } else if (suffixLower === 'm7b5' || suffixLower === 'min7b5') {
            chordType = 'half-diminished-7th';
        } else if (suffixLower === 'mmaj7' || suffixLower === 'minmaj7') {
            chordType = 'minor-major-7th';
        } else if (suffixLower === '7b9') {
            chordType = 'dominant-7th-flat9';
        } else if (suffixLower === '7#9') {
            chordType = 'dominant-7th-sharp9';
        } else if (suffixLower === '7b5') {
            chordType = 'dominant-7th-flat5';
        } else if (suffixLower === '7#5' || suffixLower === '7+5') {
            chordType = 'dominant-7th-sharp5';
        } else if (suffixLower === '7sus4') {
            chordType = 'dominant-7th-sus4';
        } else if (suffixLower.includes('7#11') || suffixLower.includes('7(#11)') || suffixLower.includes('7+11')) {
            chordType = '7sharp11';
        } else if (suffixLower.includes('9#11') || suffixLower.includes('9(#11)') || suffixLower.includes('9+11')) {
            chordType = '9sharp11';
        } else if (suffixLower.includes('sus2') || suffixLower === 'sus2') {
            chordType = 'sus2';
        } else if (suffixLower.includes('sus4') || suffixLower === 'sus4' || suffixLower === 'sus') {
            chordType = 'sus4';
        }

        return { rootNote: noteName, chordType, original: trimmed };
    }

    parseChordSequence(input) {
        return input.split(',').map(s => s.trim()).filter(Boolean)
            .map(str => this.parseChord(str)).filter(Boolean);
    }

    getChordDisplayName(rootNote, chordType) {
        const suffix = this.chordTypeNames[chordType] || '';
        return suffix ? `${rootNote}${suffix}` : rootNote;
    }

    getChordKey(chord) {
        if (!chord) return '';
        return this.getChordDisplayName(chord.rootNote, chord.chordType);
    }

    getChordNotesFromIntervals(rootNote, chordType, baseOctave = 4) {
        const rootIndex = this.noteToIndex[rootNote];
        if (rootIndex === undefined) return [];

        const intervals = this.chordIntervals[chordType];
        if (!intervals) return [];

        const notesWithOctaves = [];
        intervals.forEach((interval) => {
            const totalSemitones = rootIndex + interval;
            let noteIndex = totalSemitones % 12;
            if (noteIndex < 0) {
                noteIndex += 12;
            }
            const noteName = this.noteNames[noteIndex];
            const octaveOffset = Math.floor(totalSemitones / 12);
            const octave = baseOctave + octaveOffset;

            notesWithOctaves.push({
                note: noteName,
                octave: octave
            });
        });

        notesWithOctaves.sort((a, b) => {
            if (a.octave !== b.octave) {
                return a.octave - b.octave;
            }
            const aIndex = this.noteToIndex[a.note];
            const bIndex = this.noteToIndex[b.note];
            return aIndex - bIndex;
        });

        return notesWithOctaves;
    }

    chordToMIDINotes(chord) {
        if (!chord) return { bass: [], high: [] };
        const noteObjects = this.getChordNotesFromIntervals(chord.rootNote, chord.chordType, 4);
        if (noteObjects.length === 0) return { bass: [], high: [] };

        const midiNotes = noteObjects.map(noteObj => {
            const noteIndex = this.noteNames.indexOf(noteObj.note);
            return (noteObj.octave + 1) * 12 + noteIndex;
        });

        const sorted = [...midiNotes].sort((a, b) => a - b);
        return {
            bass: sorted.slice(0, 3),
            high: sorted.slice(3)
        };
    }
}

class WebAudioPlayer {
    constructor() {
        this.audioContext = null;
    }

    ensureContext() {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        return this.audioContext;
    }

    getCurrentTime() {
        return this.ensureContext().currentTime;
    }

    ensureReady() {
        const ctx = this.ensureContext();
        if (ctx.state === 'running') {
            return Promise.resolve();
        }
        return ctx.resume().catch(() => {}).then(() => {});
    }

    midiToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    playChordAtTime(midiNotes, startTime, durationSeconds, gainValue) {
        if (!midiNotes || midiNotes.length === 0) return;
        const ctx = this.ensureContext();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds);
        gain.connect(ctx.destination);

        midiNotes.forEach(note => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(this.midiToFrequency(note), startTime);
            osc.connect(gain);
            osc.start(startTime);
            osc.stop(startTime + durationSeconds + 0.05);
        });
    }
}

if (typeof window !== 'undefined') {
    window.ChordEngine = ChordEngine;
    window.WebAudioPlayer = WebAudioPlayer;
}
