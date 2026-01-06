/**
 * Chord Cortex Module
 * Flexible, adaptable module for chord visualization and piano popup
 * Can be used in test.html, index.html, or any other page
 */

(function() {
    'use strict';

    // ========== CONFIG SETUP ==========
    // Create minimal Config object for piano visualizer (if not already exists)
    if (!window.Config) {
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

    // ========== CHORD CATEGORIES ==========
    const chordCategories = {
        triads: {
            name: 'Triads',
            chords: [
                { name: 'Major', type: 'major-triad', formats: [''] },
                { name: 'Minor', type: 'minor-triad', formats: ['m', 'min', '-'] },
                { name: 'Diminished', type: 'diminished-triad', formats: ['dim', '°'] },
                { name: 'Augmented', type: 'augmented-triad', formats: ['aug', '+'] }
            ]
        },
        sevenths: {
            name: '7th Chords',
            chords: [
                { name: 'Dominant 7th', type: 'dominant-7th', formats: ['7', 'dom', 'dom7'] },
                { name: 'Minor 7th', type: 'minor-7th', formats: ['m7', 'min7'] },
                { name: 'Major 7th', type: 'major-7th', formats: ['maj7', 'major7', 'M7', 'ma7'] },
                { name: 'Diminished 7th', type: 'diminished-7th', formats: ['dim7', '°7'] }
            ]
        },
        sixths: {
            name: '6th Chords',
            chords: [
                { name: 'Major 6th', type: 'major-6th', formats: ['6'] },
                { name: 'Minor 6th', type: 'minor-6th', formats: ['m6', 'min6', '-6'] }
            ]
        },
        ninths: {
            name: '9th Chords',
            chords: [
                { name: 'Dominant 9th', type: 'dominant-9th', formats: ['9'] },
                { name: 'Major 9th', type: 'major-9th', formats: ['maj9', 'major9', 'M9'] },
                { name: 'Minor 9th', type: 'minor-9th', formats: ['m9', 'min9', '-9'] }
            ]
        },
        elevenths: {
            name: '11th Chords',
            chords: [
                { name: 'Dominant 11th', type: 'dominant-11th', formats: ['11'] },
                { name: 'Minor 11th', type: 'minor-11th', formats: ['m11', 'min11', '-11'] },
                { name: 'Major 11th', type: 'major-11th', formats: ['maj11', 'major11', 'M11'] }
            ]
        },
        adds: {
            name: 'Add Chords',
            chords: [
                { name: 'Add 9', type: 'add9', formats: ['add9'] },
                { name: 'Add 11', type: 'add11', formats: ['add11'] },
                { name: 'Add 13', type: 'add13', formats: ['add13'] }
            ]
        },
        altered: {
            name: 'Altered Chords',
            chords: [
                { name: '7♯11', type: '7sharp11', formats: ['7#11', '7(#11)', '7+11'] },
                { name: '9♯11', type: '9sharp11', formats: ['9#11', '9(#11)', '9+11'] }
            ]
        },
        suspended: {
            name: 'Suspended Chords',
            chords: [
                { name: 'Sus2', type: 'sus2', formats: ['sus2'] },
                { name: 'Sus4', type: 'sus4', formats: ['sus4', 'sus'] }
            ]
        }
    };

    // ========== MODULE STATE ==========
    let popupContainer = null;
    let backdrop = null;
    let pianoInitialized = false;
    let dropdownsInitialized = false;

    // ========== POPUP CREATION ==========
    
    /**
     * Create the piano popup HTML structure dynamically
     */
    function createPopupHTML() {
        // Create backdrop
        backdrop = document.createElement('div');
        backdrop.id = 'chordCortexBackdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); z-index: 9999;';
        backdrop.onclick = closePopup;
        document.body.appendChild(backdrop);

        // Create popup container
        popupContainer = document.createElement('div');
        popupContainer.id = 'chordCortexPopup';
        // Set base desktop styles - mobile media queries will override with !important
        popupContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            z-index: 10000;
            box-sizing: border-box;
            overflow-x: hidden;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            width: 90%;
            max-width: 1200px;
            padding: 20px;
            max-height: 90vh;
        `;
        // #region agent log
        const popupComputed = window.getComputedStyle(popupContainer);
        fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:157',message:'Popup container created with inline styles',data:{windowWidth:window.innerWidth,isMobile:window.innerWidth<=768,inlineWidth:popupContainer.style.width,computedWidth:popupComputed.width,computedMaxWidth:popupComputed.maxWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'chord-cortex-close';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background: transparent;
            border: none;
            font-size: 28px;
            line-height: 1;
            color: #666;
            cursor: pointer;
            z-index: 10001;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: color 0.2s, background 0.2s;
        `;
        closeBtn.onclick = closePopup;
        closeBtn.onmouseover = () => { closeBtn.style.color = '#1a1a1a'; closeBtn.style.background = '#f0f0f0'; };
        closeBtn.onmouseout = () => { closeBtn.style.color = '#666'; closeBtn.style.background = 'transparent'; };
        popupContainer.appendChild(closeBtn);

        // Piano wrapper
        const pianoWrapper = document.createElement('div');
        pianoWrapper.className = 'piano-wrapper';
        pianoWrapper.id = 'chordCortexPianoKeys'; // Give it an ID so we can initialize directly into it
        // Note: Base styles are handled by piano-visualizer.js injected CSS
        // Only set desktop-specific styles here, mobile styles come from CSS media queries
        pianoWrapper.style.cssText = `
            width: 100%;
            max-width: 100%;
        `;
        popupContainer.appendChild(pianoWrapper);

        // Piano header with controls
        const pianoHeader = document.createElement('div');
        pianoHeader.className = 'piano-header';
        pianoHeader.style.cssText = `
            padding: 8px 12px;
            border-top: 1px solid #e5e5e5;
            background: #fafafa;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        `;

        // Search bar
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1; min-width: 200px;';
        const searchLabel = document.createElement('label');
        searchLabel.innerHTML = '🔍 ';
        searchLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: #1a1a1a; white-space: nowrap;';
        const searchInput = document.createElement('input');
        searchInput.id = 'chordCortexSearch';
        searchInput.type = 'text';
        searchInput.placeholder = 'Enter chord (e.g. F#maj9)';
        searchInput.style.cssText = `
            padding: 4px 8px;
            font-size: 12px;
            border: 1px solid #d0d0d0;
            border-radius: 2px;
            background: #ffffff;
            color: #1a1a1a;
            flex: 1;
            min-width: 150px;
        `;
        searchContainer.appendChild(searchLabel);
        searchContainer.appendChild(searchInput);
        pianoHeader.appendChild(searchContainer);

        // Handle search input - update dropdowns in real-time as user types
        searchInput.addEventListener('input', () => {
            handleChordSearch(searchInput.value);
        });

        // Category select
        const categoryLabel = document.createElement('label');
        categoryLabel.innerHTML = 'Category: ';
        categoryLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #1a1a1a;';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'chordCortexCategory';
        categorySelect.style.cssText = 'padding: 4px 8px; font-size: 12px; border: 1px solid #d0d0d0; border-radius: 2px; background: #ffffff; color: #1a1a1a; cursor: pointer; min-width: 110px;';
        Object.keys(chordCategories).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = chordCategories[key].name;
            categorySelect.appendChild(option);
        });
        categoryLabel.appendChild(categorySelect);
        pianoHeader.appendChild(categoryLabel);

        // Root note select
        const rootNoteLabel = document.createElement('label');
        rootNoteLabel.innerHTML = 'Root Note: ';
        rootNoteLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #1a1a1a;';
        const rootNoteSelect = document.createElement('select');
        rootNoteSelect.id = 'chordCortexRootNote';
        rootNoteSelect.style.cssText = 'padding: 4px 8px; font-size: 12px; border: 1px solid #d0d0d0; border-radius: 2px; background: #ffffff; color: #1a1a1a; cursor: pointer; min-width: 110px;';
        ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            option.textContent = note;
            rootNoteSelect.appendChild(option);
        });
        rootNoteLabel.appendChild(rootNoteSelect);
        pianoHeader.appendChild(rootNoteLabel);

        // Chord type select
        const typeLabel = document.createElement('label');
        typeLabel.innerHTML = 'Chord Type: ';
        typeLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #1a1a1a;';
        const typeSelect = document.createElement('select');
        typeSelect.id = 'chordCortexType';
        typeSelect.style.cssText = 'padding: 4px 8px; font-size: 12px; border: 1px solid #d0d0d0; border-radius: 2px; background: #ffffff; color: #1a1a1a; cursor: pointer; min-width: 110px;';
        typeLabel.appendChild(typeSelect);
        pianoHeader.appendChild(typeLabel);

        popupContainer.appendChild(pianoHeader);

        // Chord formats display
        const formatsDisplay = document.createElement('div');
        formatsDisplay.id = 'chordCortexFormats';
        formatsDisplay.className = 'chord-formats-display';
        formatsDisplay.style.cssText = `
            padding: 8px 12px;
            background: #f0f0f0;
            border-top: 1px solid #e5e5e5;
            font-size: 12px;
            color: #1a1a1a;
            line-height: 1.4;
        `;
        popupContainer.appendChild(formatsDisplay);

        document.body.appendChild(popupContainer);
    }

    // ========== UI FUNCTIONS ==========
    
    function updateChordTypeDropdown() {
        const categorySelect = document.getElementById('chordCortexCategory');
        const typeSelect = document.getElementById('chordCortexType');
        
        if (!categorySelect || !typeSelect) return;
        
        const categoryKey = categorySelect.value;
        const category = chordCategories[categoryKey];
        
        typeSelect.innerHTML = '';
        
        if (category && category.chords) {
            category.chords.forEach(chord => {
                const option = document.createElement('option');
                option.value = chord.type;
                option.textContent = chord.name;
                typeSelect.appendChild(option);
            });
        }
        
        updatePianoFromDropdowns();
    }

    function generateChordFormats(rootNote, chordType) {
        let chordDef = null;
        for (const category of Object.values(chordCategories)) {
            const found = category.chords.find(chord => chord.type === chordType);
            if (found) {
                chordDef = found;
                break;
            }
        }
        
        if (!chordDef || !chordDef.formats) {
            return [rootNote];
        }
        
        const formats = [];
        chordDef.formats.forEach(format => {
            if (format === '') {
                formats.push(rootNote);
            } else {
                formats.push(rootNote + format);
            }
        });
        
        return formats;
    }

    function updateChordFormatsDisplay() {
        const display = document.getElementById('chordCortexFormats');
        const rootNoteSelect = document.getElementById('chordCortexRootNote');
        const chordTypeSelect = document.getElementById('chordCortexType');
        
        if (!display || !rootNoteSelect || !chordTypeSelect) return;
        
        const rootNote = rootNoteSelect.value;
        const chordType = chordTypeSelect.value;
        
        if (!rootNote || !chordType) {
            display.innerHTML = '';
            return;
        }
        
        const formats = generateChordFormats(rootNote, chordType);
        
        if (formats.length > 0) {
            const formatItems = formats.map(format => 
                `<span style="display: inline-block; margin: 0 4px; padding: 2px 6px; background: #ffffff; border: 1px solid #d0d0d0; border-radius: 2px; font-family: 'Courier New', monospace; font-size: 12px;">${format}</span>`
            ).join('');
            
            display.innerHTML = `You can write this chord as <span class="format-list">${formatItems}</span>`;
        } else {
            display.innerHTML = '';
        }
    }

    function updatePianoFromDropdowns() {
        if (!window.PianoVisualizer) return;
        
        const rootNoteSelect = document.getElementById('chordCortexRootNote');
        const chordTypeSelect = document.getElementById('chordCortexType');
        
        if (!rootNoteSelect || !chordTypeSelect) return;
        
        const rootNote = rootNoteSelect.value;
        const chordType = chordTypeSelect.value;
        
        if (rootNote && chordType) {
            try {
                window.PianoVisualizer.updateChordPaletteFromChord(rootNote, chordType, 'none');
            } catch (e) {
                console.error('Failed to update piano:', e);
            }
        }
        
        updateChordFormatsDisplay();
    }

    function findCategoryForChordType(chordType) {
        for (const [categoryKey, category] of Object.entries(chordCategories)) {
            if (category.chords.some(chord => chord.type === chordType)) {
                return categoryKey;
            }
        }
        return 'triads';
    }

    function setDropdownsForChord(rootNote, chordType) {
        const rootNoteSelect = document.getElementById('chordCortexRootNote');
        const categorySelect = document.getElementById('chordCortexCategory');
        const chordTypeSelect = document.getElementById('chordCortexType');
        
        if (!rootNoteSelect || !categorySelect || !chordTypeSelect) return;
        
        if (rootNoteSelect.querySelector(`option[value="${rootNote}"]`)) {
            rootNoteSelect.value = rootNote;
        }
        
        const categoryKey = findCategoryForChordType(chordType);
        categorySelect.value = categoryKey;
        
        updateChordTypeDropdown();
        
        if (chordTypeSelect.querySelector(`option[value="${chordType}"]`)) {
            chordTypeSelect.value = chordType;
        }
        
        updatePianoFromDropdowns();
    }

    function handleChordSearch(searchValue) {
        const searchInput = document.getElementById('chordCortexSearch');
        if (!searchInput) return;
        
        const trimmed = searchValue.trim();
        if (!trimmed) {
            searchInput.style.borderColor = '#d0d0d0';
            return;
        }
        
        // Use the parseChord function from index.html if available, otherwise use local one
        const parseChordFn = window.parseChord || parseChord;
        const parsed = parseChordFn(trimmed);
        if (!parsed || !parsed.rootNote || !parsed.chordType) {
            // Invalid chord - show error state
            searchInput.style.borderColor = '#ff4444';
            return;
        }
        
        // Valid chord found - update the piano visualizer and dropdowns
        searchInput.style.borderColor = '#4CAF50';
        setDropdownsForChord(parsed.rootNote, parsed.chordType);
    }

    function initializePianoDropdowns() {
        if (dropdownsInitialized) return;
        
        const categorySelect = document.getElementById('chordCortexCategory');
        const rootNoteSelect = document.getElementById('chordCortexRootNote');
        const chordTypeSelect = document.getElementById('chordCortexType');
        
        if (!categorySelect || !rootNoteSelect || !chordTypeSelect) return;
        
        categorySelect.addEventListener('change', updateChordTypeDropdown);
        rootNoteSelect.addEventListener('change', updatePianoFromDropdowns);
        chordTypeSelect.addEventListener('change', updatePianoFromDropdowns);
        
        updateChordTypeDropdown();
        
        dropdownsInitialized = true;
    }

    // ========== CHORD PARSING ==========
    
    function parseChord(input) {
        const trimmed = input.trim();
        if (!trimmed) return null;
        
        const match = trimmed.match(/^([A-Ga-g])([#b]?)(.*)$/i);
        if (!match) return null;
        
        const rootLetter = match[1].toUpperCase();
        const accidental = match[2] || '';
        const suffix = match[3]; // Keep case-sensitive for M vs m distinction
        const noteName = rootLetter + accidental;
        
        const NOTE_TO_INDEX = window.NOTE_TO_INDEX || {};
        if (!NOTE_TO_INDEX.hasOwnProperty(noteName)) return null;
        
        let chordType = 'major-triad';
        let processedSuffix = suffix;
        
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            processedSuffix = suffix.substring(0, slashIndex);
        }
        
        // Check uppercase M patterns first (before lowercase m patterns)
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
        } else if (suffixLower === 'm7' || suffixLower === 'min7') {
            chordType = 'minor-7th';
        } else if (suffixLower.includes('dim') || processedSuffix.includes('°')) {
            // Check for diminished 7th first (dim7 or °7)
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
        } else if (suffixLower === 'm11' || suffixLower === 'min11' || processedSuffix === '-11') {
            chordType = 'minor-11th';
        } else if (processedSuffix === '11') {
            chordType = 'dominant-11th'; // Standard notation: no prefix = dominant
        } else if (processedSuffix === '6') {
            chordType = 'major-6th';
        } else if (suffixLower === 'm6' || suffixLower === 'min6' || processedSuffix === '-6') {
            chordType = 'minor-6th';
        } else if (suffixLower.includes('add9')) {
            chordType = 'add9';
        } else if (suffixLower.includes('add11')) {
            chordType = 'add11';
        } else if (suffixLower.includes('add13')) {
            chordType = 'add13';
        } else if (suffixLower.includes('7#11') || suffixLower.includes('7(#11)') || suffixLower.includes('7+11')) {
            chordType = '7sharp11';
        } else if (suffixLower.includes('9#11') || suffixLower.includes('9(#11)') || suffixLower.includes('9+11')) {
            chordType = '9sharp11';
        } else if (suffixLower.includes('sus2') || suffixLower === 'sus2') {
            chordType = 'sus2';
        } else if (suffixLower.includes('sus4') || suffixLower === 'sus' || suffixLower === 'sus4') {
            chordType = 'sus4';
        }
        
        return { rootNote: noteName, chordType, original: trimmed };
    }

    // ========== PIANO ORGANIZATION ==========
    
    function organizePianoIntoRows() {
        const pianoKeys = document.querySelector('.piano-keys');
        if (!pianoKeys) return;
        
        const isMobile = window.innerWidth <= 768;
        // #region agent log
        const keysComputedBefore = window.getComputedStyle(pianoKeys);
        fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:496',message:'organizePianoIntoRows called',data:{windowWidth:window.innerWidth,isMobile:isMobile,flexDirection:keysComputedBefore.flexDirection,width:keysComputedBefore.width,keysCount:pianoKeys.children.length,hasRows:pianoKeys.querySelectorAll('.piano-row').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
        if (!isMobile) {
            // Don't set inline style - let CSS handle it via media queries
            // pianoKeys.style.flexDirection = 'row';
            const rows = pianoKeys.querySelectorAll('.piano-row');
            if (rows.length > 0) {
                const allKeys = [];
                rows.forEach(row => {
                    allKeys.push(...Array.from(row.children));
                });
                rows.forEach(row => row.remove());
                // Clear any left positioning from row-based layout
                allKeys.forEach(key => {
                    if (key.classList.contains('black-key')) {
                        key.style.left = '';
                    }
                    pianoKeys.appendChild(key);
                });
            }
            // Reposition black keys for desktop view after flattening rows
            setTimeout(() => {
                if (window.PianoVisualizer && window.PianoVisualizer.positionBlackKeys) {
                    window.PianoVisualizer.positionBlackKeys(pianoKeys);
                }
            }, 150);
            return;
        }
        
        const existingRows = pianoKeys.querySelectorAll('.piano-row');
        if (existingRows.length > 0) {
            const allKeys = [];
            existingRows.forEach(row => {
                allKeys.push(...Array.from(row.querySelectorAll('.piano-key')));
            });
            existingRows.forEach(row => row.remove());
            allKeys.forEach(key => pianoKeys.appendChild(key));
        }
        
        const allKeys = Array.from(pianoKeys.querySelectorAll('.piano-key'));
        if (allKeys.length === 0) return;
        
        const keysByOctave = {};
        const octaveOrder = [];
        
        allKeys.forEach(key => {
            const noteName = key.getAttribute('data-note') || '';
            const octaveMatch = noteName.match(/(\d+)$/);
            if (octaveMatch) {
                const octave = parseInt(octaveMatch[1]);
                if (!keysByOctave[octave]) {
                    keysByOctave[octave] = { white: [], black: [] };
                    if (!octaveOrder.includes(octave)) {
                        octaveOrder.push(octave);
                    }
                }
                if (key.classList.contains('black-key')) {
                    keysByOctave[octave].black.push(key);
                } else {
                    keysByOctave[octave].white.push(key);
                }
            }
        });
        
        octaveOrder.sort((a, b) => a - b);
        
        pianoKeys.innerHTML = '';
        // Don't set inline style - let CSS handle it via media queries
        // pianoKeys.style.flexDirection = 'column';
        
        // Calculate total keys and determine optimal row distribution
        const totalKeys = allKeys.length;
        const isSmallMobile = window.innerWidth <= 480;
        const targetRows = isSmallMobile ? 4 : 3; // 4 rows for small mobile, 3 rows for larger mobile
        
        // Calculate key counts per octave
        const octaveKeyCounts = {};
        octaveOrder.forEach(octave => {
            const whiteCount = keysByOctave[octave].white.length;
            const blackCount = keysByOctave[octave].black.length;
            octaveKeyCounts[octave] = whiteCount + blackCount;
        });
        
        // Calculate target keys per row (more even distribution)
        const targetKeysPerRow = totalKeys / targetRows;
        
        // Pre-calculate which octaves go in which row for better balance
        const rowOctaves = [];
        let currentRowOctaves = [];
        let currentRowKeyCount = 0;
        let remainingRows = targetRows;
        let totalKeysAssigned = 0;
        
        for (let i = 0; i < octaveOrder.length; i++) {
            const octave = octaveOrder[i];
            const octaveKeyCount = octaveKeyCounts[octave];
            const remainingOctaves = octaveOrder.length - i;
            
            // Add octave to current row
            currentRowOctaves.push(octave);
            currentRowKeyCount += octaveKeyCount;
            totalKeysAssigned += octaveKeyCount;
            
            // Calculate average keys per remaining row
            const remainingKeys = totalKeys - totalKeysAssigned;
            const avgRemainingKeysPerRow = remainingRows > 1 ? remainingKeys / (remainingRows - 1) : remainingKeys;
            
            // For 4 rows on small mobile, we want row 4 to start from C7 (octave 7)
            // So when we have 4 rows and we've just added octave 6 to the current row, finish row 3
            const isSmallMobile4Rows = isSmallMobile && targetRows === 4;
            const isOnOctave6 = octave === 6;
            // After adding octave 6, if we have 2 rows remaining (row 3 and row 4), finish row 3
            const shouldForceFinishForRow4 = isSmallMobile4Rows && isOnOctave6 && remainingRows === 2;
            
            // Special check: if we're on the second-to-last row, make sure we don't leave too few keys for the last row
            // But allow it if we're specifically targeting row 4 starting from C7
            const isSecondToLastRow = remainingRows === 2;
            const minKeysForLastRow = targetKeysPerRow * 0.3;
            const wouldLeaveTooFewForLastRow = isSecondToLastRow && remainingKeys < minKeysForLastRow && !shouldForceFinishForRow4;
            
            // Also check: if we're on the third-to-last row (when there are 4 rows), be careful too
            const isThirdToLastRow = remainingRows === 3;
            const wouldLeaveUnbalanced = isThirdToLastRow && remainingKeys < targetKeysPerRow * 1.5;
            
            // Decide if we should finish this row
            // Finish if: we're at or above target AND we have remaining rows AND 
            // the remaining keys can be distributed reasonably across remaining rows
            // OR if we need to force finish for row 4 starting from C7
            const shouldFinishRow = 
                (remainingRows > 1 && // Don't finish if this is the last row
                !wouldLeaveTooFewForLastRow && // Don't finish if it would leave too few for last row (unless forcing)
                !wouldLeaveUnbalanced && // Don't finish if it would leave unbalanced distribution
                currentRowKeyCount >= targetKeysPerRow * 0.85 && // At least 85% of target
                (remainingOctaves <= remainingRows || // If remaining octaves <= remaining rows, we can distribute evenly
                 avgRemainingKeysPerRow >= targetKeysPerRow * 0.7)) || // Or if remaining rows can get reasonable amount
                shouldForceFinishForRow4; // Or if we need to force finish for row 4
            
            if (shouldFinishRow) {
                rowOctaves.push([...currentRowOctaves]);
                currentRowOctaves = [];
                currentRowKeyCount = 0;
                remainingRows--;
            }
        }
        
        // Add remaining octaves to last row (always create the last row, don't merge)
        if (currentRowOctaves.length > 0) {
            rowOctaves.push(currentRowOctaves);
        }
        
        // Now create rows with the calculated octave distribution
        rowOctaves.forEach(rowOctaveList => {
            const row = document.createElement('div');
            row.className = 'piano-row';
            
            rowOctaveList.forEach(octave => {
                // Add white keys first, then black keys for this octave
                keysByOctave[octave].white.forEach(key => {
                    row.appendChild(key);
                });
                
                keysByOctave[octave].black.forEach(key => {
                    row.appendChild(key);
                });
            });
            
            pianoKeys.appendChild(row);
        });
        // #region agent log
        const keysComputedAfter = window.getComputedStyle(pianoKeys);
        fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:590',message:'organizePianoIntoRows completed (mobile)',data:{windowWidth:window.innerWidth,isMobile:isMobile,flexDirection:keysComputedAfter.flexDirection,width:keysComputedAfter.width,rowsCount:pianoKeys.children.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
        setTimeout(() => {
            if (window.PianoVisualizer && window.PianoVisualizer.positionBlackKeys) {
                const rows = pianoKeys.querySelectorAll('.piano-row');
                rows.forEach(row => {
                    window.PianoVisualizer.positionBlackKeys(row);
                });
            }
        }, 100);
    }

    // ========== MAIN API ==========
    
    /**
     * Show chord popup with piano visualizer
     * @param {string} rootNote - Root note (e.g., 'C', 'C#')
     * @param {string} chordType - Chord type (e.g., 'major-triad', 'minor-7th')
     * @param {string} chordString - Optional chord string (e.g., 'Cm7') for parsing
     */
    function showChordPopup(rootNote, chordType, chordString = null) {
        // Parse chord string if provided, otherwise use rootNote and chordType
        // Use the parseChord function from index.html if available, otherwise use local one
        const parseChordFn = window.parseChord || parseChord;
        let parsed = null;
        if (chordString) {
            parsed = parseChordFn(chordString);
        }
        
        const finalRootNote = parsed ? parsed.rootNote : rootNote;
        const finalChordType = parsed ? parsed.chordType : chordType;
        
        if (!finalRootNote || !finalChordType) {
            console.error('ChordCortex: Invalid rootNote or chordType');
            return;
        }
        
        // Create popup if it doesn't exist
        if (!popupContainer) {
            createPopupHTML();
        }
        
        // Show popup
        backdrop.style.display = 'block';
        popupContainer.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // #region agent log
        const popupComputedAfterShow = window.getComputedStyle(popupContainer);
        fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:631',message:'Popup shown',data:{windowWidth:window.innerWidth,isMobile:window.innerWidth<=768,computedWidth:popupComputedAfterShow.width,computedMaxWidth:popupComputedAfterShow.maxWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3,H4'})}).catch(()=>{});
        // #endregion
        
        // Initialize piano if needed
        const pianoWrapper = popupContainer.querySelector('#chordCortexPianoKeys');
        if (pianoWrapper && window.PianoVisualizer) {
            // Ensure styles are injected first
            if (window.PianoVisualizer.injectStyles) {
                window.PianoVisualizer.injectStyles();
            }
            
            if (!pianoInitialized || !window.PianoVisualizer.pianoContainer) {
                window.PianoVisualizer.init('chordCortexPianoKeys');
                pianoInitialized = true;
                // #region agent log
                const pianoKeysEl = document.querySelector('.piano-keys');
                const keysComputed = pianoKeysEl ? window.getComputedStyle(pianoKeysEl) : null;
                fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:665',message:'Piano initialized, before organizePianoIntoRows',data:{windowWidth:window.innerWidth,isMobile:window.innerWidth<=768,keysFound:!!pianoKeysEl,flexDirection:keysComputed?.flexDirection,width:keysComputed?.width},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H1,H2,H5'})}).catch(()=>{});
                // #endregion
                
                // On mobile, organize immediately to prevent stretched view; on desktop, delay for black key positioning
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:659',message:'Scheduling immediate organizePianoIntoRows for mobile',data:{windowWidth:window.innerWidth,isMobile:isMobile},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H2'})}).catch(()=>{});
                    // #endregion
                    // Use requestAnimationFrame to ensure DOM is ready, then organize immediately
                    requestAnimationFrame(() => {
                        organizePianoIntoRows();
                    });
                } else {
                    setTimeout(() => {
                        organizePianoIntoRows();
                    }, 200);
                }
            } else {
                // For existing piano, check if mobile and organize immediately
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    requestAnimationFrame(() => {
                        organizePianoIntoRows();
                    });
                } else {
                    setTimeout(() => {
                        organizePianoIntoRows();
                    }, 100);
                }
            }
        }
        
        // Initialize dropdowns
        initializePianoDropdowns();
        
        // Set dropdowns to match the chord
        setDropdownsForChord(finalRootNote, finalChordType);
        
        // Organize piano again after dropdowns are set
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // On mobile, organize immediately after dropdowns
            requestAnimationFrame(() => {
                organizePianoIntoRows();
            });
        } else {
            // On desktop, use delays for black key positioning
            setTimeout(() => {
                organizePianoIntoRows();
                // Also organize after black keys are positioned (additional delay)
                setTimeout(() => {
                    organizePianoIntoRows();
                }, 200);
            }, 300);
        }
    }
    
    function closePopup() {
        if (popupContainer) {
            popupContainer.style.display = 'none';
        }
        if (backdrop) {
            backdrop.style.display = 'none';
        }
        document.body.style.overflow = '';
    }

    // ========== EXPORT API ==========
    window.ChordCortex = {
        showChordPopup: showChordPopup,
        closePopup: closePopup,
        parseChord: parseChord
    };

    // Handle window resize for piano organization
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        const isMobile = window.innerWidth <= 768;
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/2c518386-4cae-4798-b4dc-31a4611b15b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chordcortex.js:742',message:'Resize event detected',data:{windowWidth:window.innerWidth,isMobile:isMobile,popupVisible:popupContainer && popupContainer.style.display !== 'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        if (isMobile) {
            // On mobile, organize immediately to prevent stretched view
            if (popupContainer && popupContainer.style.display !== 'none') {
                requestAnimationFrame(() => {
                    organizePianoIntoRows();
                });
            }
        } else {
            // On desktop, use delay for smoother transitions
            resizeTimeout = setTimeout(() => {
                if (popupContainer && popupContainer.style.display !== 'none') {
                    organizePianoIntoRows();
                }
            }, 250);
        }
    });
})();

