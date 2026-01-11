// Chord Wiki Module
// Displays a guide showing all chord types the system understands

class ChordWiki {
    constructor() {
        this.modal = null;
        this.currentCategory = 'triads';
        this.pianoVisualizer = null;
        this.pianoInitialized = false;
        this.chordCategories = {
            triads: {
                name: 'Triads',
                chords: [
                    {
                        name: 'Major',
                        type: 'major-triad',
                        examples: ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
                    },
                    {
                        name: 'Minor',
                        type: 'minor-triad',
                        examples: ['Cm', 'Cmin', 'C-', 'Am', 'Amin', 'A-']
                    },
                    {
                        name: 'Diminished',
                        type: 'diminished-triad',
                        examples: ['Cdim', 'C°', 'Bbdim', 'Bb°']
                    },
                    {
                        name: 'Augmented',
                        type: 'augmented-triad',
                        examples: ['Caug', 'C+', 'Faug', 'F+']
                    }
                ]
            },
            sevenths: {
                name: '7th Chords',
                chords: [
                    {
                        name: 'Dominant 7th',
                        type: 'dominant-7th',
                        examples: ['C7', 'Cdom', 'Cdom7', 'G7', 'F7']
                    },
                    {
                        name: 'Minor 7th',
                        type: 'minor-7th',
                        examples: ['Cm7', 'Cmin7', 'Am7', 'Amin7']
                    },
                    {
                        name: 'Major 7th',
                        type: 'major-7th',
                        examples: ['Cmaj7', 'Cmajor7', 'CM7', 'Cma7', 'Fmaj7']
                    },
                    {
                        name: 'Diminished 7th',
                        type: 'diminished-7th',
                        examples: ['Cdim7', 'C°7', 'Bbdim7']
                    }
                ]
            },
            sixths: {
                name: '6th Chords',
                chords: [
                    {
                        name: 'Major 6th',
                        type: 'major-6th',
                        examples: ['C6', 'F6', 'G6']
                    },
                    {
                        name: 'Minor 6th',
                        type: 'minor-6th',
                        examples: ['Cm6', 'Cmin6', 'C-6', 'Am6']
                    }
                ]
            },
            ninths: {
                name: '9th Chords',
                chords: [
                    {
                        name: 'Dominant 9th',
                        type: 'dominant-9th',
                        examples: ['C9', 'G9', 'F9']
                    },
                    {
                        name: 'Major 9th',
                        type: 'major-9th',
                        examples: ['Cmaj9', 'Cmajor9', 'CM9', 'Fmaj9']
                    },
                    {
                        name: 'Minor 9th',
                        type: 'minor-9th',
                        examples: ['Cm9', 'Cmin9', 'C-9', 'Am9']
                    }
                ]
            },
            adds: {
                name: 'Add Chords',
                chords: [
                    {
                        name: 'Add 9',
                        type: 'add9',
                        examples: ['Cadd9', 'Fadd9', 'Gadd9']
                    },
                    {
                        name: 'Add 11',
                        type: 'add11',
                        examples: ['Cadd11', 'Fadd11', 'Gadd11']
                    },
                    {
                        name: 'Add 13',
                        type: 'add13',
                        examples: ['Cadd13', 'Fadd13', 'Gadd13']
                    }
                ]
            },
            altered: {
                name: 'Altered Chords',
                chords: [
                    {
                        name: '7♯11',
                        type: '7sharp11',
                        examples: ['C7#11', 'C7(#11)', 'C7+11', 'F7#11']
                    },
                    {
                        name: '9♯11',
                        type: '9sharp11',
                        examples: ['C9#11', 'C9(#11)', 'C9+11', 'F9#11']
                    }
                ]
            },
            suspended: {
                name: 'Suspended Chords',
                chords: [
                    {
                        name: 'Sus2',
                        type: 'sus2',
                        examples: ['Csus2', 'Fsus2', 'Gsus2']
                    },
                    {
                        name: 'Sus4',
                        type: 'sus4',
                        examples: ['Csus4', 'Csus', 'Fsus4', 'Gsus']
                    }
                ]
            }
        };
    }

    createModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'chordWikiModal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #ffffff;
            border-radius: 4px;
            width: 100%;
            max-width: 800px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px;
            border-bottom: 1px solid #e5e5e5;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Chord Guide';
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = '#f0f0f0';
        closeBtn.onmouseout = () => closeBtn.style.background = 'none';
        closeBtn.onclick = () => this.hide();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Create navbar
        const navbar = document.createElement('div');
        navbar.id = 'chordWikiNavbar';
        navbar.style.cssText = `
            display: flex;
            gap: 4px;
            padding: 12px 20px;
            border-bottom: 1px solid #e5e5e5;
            background: #fafafa;
            overflow-x: auto;
            flex-wrap: wrap;
        `;

        // Create piano container
        const pianoContainer = document.createElement('div');
        pianoContainer.id = 'chordWikiPiano';
        pianoContainer.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #e5e5e5;
            background: #fafafa;
            display: none;
            max-height: 300px;
            overflow-x: auto;
            overflow-y: hidden;
        `;

        // Create content area
        const content = document.createElement('div');
        content.id = 'chordWikiContent';
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;

        // Build navbar
        Object.keys(this.chordCategories).forEach(categoryKey => {
            const category = this.chordCategories[categoryKey];
            const navItem = document.createElement('button');
            navItem.textContent = category.name;
            navItem.dataset.category = categoryKey;
            navItem.style.cssText = `
                padding: 6px 12px;
                font-size: 12px;
                background: #ffffff;
                border: 1px solid #e5e5e5;
                border-radius: 2px;
                color: #666;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
            `;
            
            navItem.onmouseover = () => {
                if (!navItem.classList.contains('active')) {
                    navItem.style.background = '#f8f8f8';
                }
            };
            navItem.onmouseout = () => {
                if (!navItem.classList.contains('active')) {
                    navItem.style.background = '#ffffff';
                }
            };
            
            navItem.onclick = () => this.showCategory(categoryKey);
            
            navbar.appendChild(navItem);
        });

        modalContent.appendChild(header);
        modalContent.appendChild(navbar);
        modalContent.appendChild(pianoContainer);
        modalContent.appendChild(content);
        overlay.appendChild(modalContent);
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        };

        document.body.appendChild(overlay);
        this.modal = overlay;
    }

    showCategory(categoryKey) {
        this.currentCategory = categoryKey;
        const category = this.chordCategories[categoryKey];
        const content = document.getElementById('chordWikiContent');
        
        // Update navbar active state
        document.querySelectorAll('#chordWikiNavbar button').forEach(btn => {
            if (btn.dataset.category === categoryKey) {
                btn.classList.add('active');
                btn.style.background = '#1a1a1a';
                btn.style.borderColor = '#1a1a1a';
                btn.style.color = '#ffffff';
            } else {
                btn.classList.remove('active');
                btn.style.background = '#ffffff';
                btn.style.borderColor = '#e5e5e5';
                btn.style.color = '#666';
            }
        });

        // Build content
        content.innerHTML = '';

        category.chords.forEach(chordInfo => {
            const chordCard = document.createElement('div');
            chordCard.style.cssText = `
                margin-bottom: 20px;
                padding: 16px;
                background: #fafafa;
                border: 1px solid #e5e5e5;
                border-radius: 2px;
            `;

            const chordName = document.createElement('div');
            chordName.textContent = chordInfo.name;
            chordName.style.cssText = `
                font-size: 14px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 8px;
            `;

            const examplesLabel = document.createElement('div');
            examplesLabel.textContent = 'Examples:';
            examplesLabel.style.cssText = `
                font-size: 11px;
                color: #666;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;

            const examplesContainer = document.createElement('div');
            examplesContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            `;

            chordInfo.examples.forEach(example => {
                const exampleBadge = document.createElement('span');
                exampleBadge.textContent = example;
                exampleBadge.style.cssText = `
                    padding: 4px 8px;
                    background: #ffffff;
                    border: 1px solid #d0d0d0;
                    border-radius: 2px;
                    font-size: 12px;
                    font-family: 'Courier New', monospace;
                    color: #1a1a1a;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                exampleBadge.onmouseover = () => {
                    exampleBadge.style.background = '#f0f0f0';
                    exampleBadge.style.borderColor = '#1a1a1a';
                };
                exampleBadge.onmouseout = () => {
                    exampleBadge.style.background = '#ffffff';
                    exampleBadge.style.borderColor = '#d0d0d0';
                };
                exampleBadge.onclick = (e) => {
                    e.stopPropagation();
                    // Use ChordCortex popup instead of inline piano
                    if (window.ChordCortex) {
                        const parsed = window.ChordCortex.parseChord(example);
                        if (parsed) {
                            window.ChordCortex.showChordPopup(parsed.rootNote, chordInfo.type || parsed.chordType, example);
                        } else {
                            // Fallback to old method if parsing fails
                            this.showChordOnPiano(example, chordInfo.type);
                        }
                    } else {
                        // Fallback to old method if ChordCortex not available
                        this.showChordOnPiano(example, chordInfo.type);
                    }
                };
                examplesContainer.appendChild(exampleBadge);
            });

            chordCard.appendChild(chordName);
            chordCard.appendChild(examplesLabel);
            chordCard.appendChild(examplesContainer);
            content.appendChild(chordCard);
        });

        // Add info note
        const infoNote = document.createElement('div');
        infoNote.style.cssText = `
            margin-top: 20px;
            padding: 12px;
            background: #f0f0f0;
            border-left: 3px solid #1a1a1a;
            border-radius: 2px;
            font-size: 12px;
            color: #666;
            line-height: 1.5;
        `;
        infoNote.innerHTML = `
            <strong>Note:</strong> You can use any root note (C, C#, Db, D, D#, Eb, E, F, F#, Gb, G, G#, Ab, A, A#, Bb, B) 
            with these chord types. Separate multiple chords with commas: <code style="background: #ffffff; padding: 2px 4px; border-radius: 2px;">Am, D7, G, C</code>
        `;
        content.appendChild(infoNote);
    }

    show() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.style.display = 'flex';
        this.showCategory(this.currentCategory);
        
        // Initialize piano if not already done
        if (!this.pianoInitialized && window.PianoVisualizer) {
            this.initPiano();
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    initPiano() {
        const pianoContainer = document.getElementById('chordWikiPiano');
        if (!pianoContainer || !window.PianoVisualizer) return;

        // Check if Config exists, if not create a minimal one
        if (typeof window.Config === 'undefined') {
            this.createMinimalConfig();
        }

        try {
            window.PianoVisualizer.init('chordWikiPiano');
            this.pianoInitialized = true;
        } catch (e) {
            console.error('Failed to initialize piano visualizer:', e);
        }
    }

    createMinimalConfig() {
        // Create minimal Config object for piano visualizer
        const BASE_FREQUENCIES = {
            'C': 16.35, 'C#': 17.32, 'Db': 17.32, 'D': 18.35, 'D#': 19.45, 'Eb': 19.45,
            'E': 20.60, 'F': 21.83, 'F#': 23.12, 'Gb': 23.12, 'G': 24.50, 'G#': 25.96,
            'Ab': 25.96, 'A': 27.50, 'A#': 29.14, 'Bb': 29.14, 'B': 30.87
        };

        window.Config = {
            BASE_FREQUENCIES: BASE_FREQUENCIES,
            NOTE_TO_INDEX: window.NOTE_TO_INDEX || {},
            CHORD_INTERVALS: window.CHORD_INTERVALS || {},
            TRANSITION_COLORS: {},

            getFrequency: function(note, octave) {
                const baseFreq = BASE_FREQUENCIES[note];
                if (!baseFreq) return 0;
                return baseFreq * Math.pow(2, octave);
            },

            normalizeNote: function(note) {
                const enharmonicMap = {
                    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
                };
                return enharmonicMap[note] || note;
            },

            indexToNote: function(index) {
                const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                return notes[index % 12];
            },

            getAllNoteFrequencies: function() {
                const allNotes = [];
                for (let octave = 0; octave <= 8; octave++) {
                    Object.keys(BASE_FREQUENCIES).forEach(note => {
                        allNotes.push({
                            name: note,
                            octave: octave,
                            freq: this.getFrequency(note, octave)
                        });
                    });
                }
                return allNotes;
            }
        };
    }

    parseChordExample(chordExample) {
        // Use the parseChord function from the main page if available
        if (typeof window.parseChord === 'function') {
            return window.parseChord(chordExample);
        }

        // Fallback: simple parsing
        const trimmed = chordExample.trim();
        const match = trimmed.match(/^([A-Ga-g])([#b]?)(.*)$/i);
        if (!match) return null;

        const rootLetter = match[1].toUpperCase();
        const accidental = match[2] || '';
        const suffix = match[3].toLowerCase();
        const noteName = rootLetter + accidental;

        const NOTE_TO_INDEX = window.NOTE_TO_INDEX || {};
        if (!NOTE_TO_INDEX.hasOwnProperty(noteName)) return null;

        let chordType = 'major-triad';
        let processedSuffix = suffix;

        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            processedSuffix = suffix.substring(0, slashIndex);
        }

        if (processedSuffix === 'm' || processedSuffix === 'min' || processedSuffix === '-') {
            chordType = 'minor-triad';
        } else if (processedSuffix === '7' || processedSuffix === 'dom' || processedSuffix === 'dom7') {
            chordType = 'dominant-7th';
        } else if (processedSuffix === 'm7' || processedSuffix === 'min7') {
            chordType = 'minor-7th';
        } else if (processedSuffix.includes('dim')) {
            chordType = processedSuffix.includes('7') ? 'diminished-7th' : 'diminished-triad';
        } else if (processedSuffix.includes('aug') || processedSuffix === '+') {
            chordType = 'augmented-triad';
        } else if (processedSuffix === 'maj9' || processedSuffix === 'major9' || processedSuffix === 'M9') {
            chordType = 'major-9th';
        } else if (processedSuffix === 'm9' || processedSuffix === 'min9' || processedSuffix === '-9') {
            chordType = 'minor-9th';
        } else if (processedSuffix === '9') {
            chordType = 'dominant-9th';
        } else if (processedSuffix === 'maj7' || processedSuffix === 'major7' || processedSuffix === 'M7' || processedSuffix === 'ma7') {
            chordType = 'major-7th';
        } else if (processedSuffix === '6') {
            chordType = 'major-6th';
        } else if (processedSuffix === 'm6' || processedSuffix === 'min6' || processedSuffix === '-6') {
            chordType = 'minor-6th';
        } else if (processedSuffix.includes('add9')) {
            chordType = 'add9';
        } else if (processedSuffix.includes('add11')) {
            chordType = 'add11';
        } else if (processedSuffix.includes('add13')) {
            chordType = 'add13';
        } else if (processedSuffix.includes('7#11') || processedSuffix.includes('7(#11)') || processedSuffix.includes('7+11')) {
            chordType = '7sharp11';
        } else if (processedSuffix.includes('9#11') || processedSuffix.includes('9(#11)') || processedSuffix.includes('9+11')) {
            chordType = '9sharp11';
        } else if (processedSuffix.includes('sus2') || processedSuffix === 'sus2') {
            chordType = 'sus2';
        } else if (processedSuffix.includes('sus4') || processedSuffix === 'sus' || processedSuffix === 'sus4') {
            chordType = 'sus4';
        }

        return { rootNote: noteName, chordType, original: trimmed };
    }

    showChordOnPiano(chordExample, chordTypeOverride = null) {
        if (!window.PianoVisualizer || !this.pianoInitialized) {
            this.initPiano();
            if (!this.pianoInitialized) return;
        }

        const pianoContainer = document.getElementById('chordWikiPiano');
        if (!pianoContainer) return;

        // Parse the chord
        const parsed = this.parseChordExample(chordExample);
        if (!parsed) {
            console.warn('Could not parse chord:', chordExample);
            return;
        }

        const rootNote = parsed.rootNote;
        const chordType = chordTypeOverride || parsed.chordType;

        // Show piano container
        pianoContainer.style.display = 'block';

        // Update piano to show chord
        try {
            window.PianoVisualizer.updateChordPaletteFromChord(rootNote, chordType, 'none');
            
            // Scroll piano into view
            pianoContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            console.error('Failed to update piano:', e);
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    init() {
        // Create modal but don't show it yet
        this.createModal();
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.ChordWiki = ChordWiki;
}

