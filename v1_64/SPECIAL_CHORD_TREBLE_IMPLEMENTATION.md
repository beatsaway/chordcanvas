# Custom treble notes (“special chord”) — implementation guide

This doc describes how to implement: long-press on a chord pill → popup to edit treble notes (add any note ≥ chord’s highest bass note, or pick from recommendations) → save as `chord.trebleNotes` and use everywhere for playback/export.

---

## 1. Resolver: use custom treble when present

**Where:** `app.js` (near other chord/engine helpers, e.g. after `midiToNoteName`).

Add a single function that every other part of the app uses instead of `engine.chordToMIDINotes(chord)` when you need bass + high for playback or display:

```js
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
```

**Replace all uses of `engine.chordToMIDINotes(chord)` when the result is used for playback or “current high notes” display** with `getResolvedChordNotes(chord)` in:

| Location (app.js) | What to change |
|-------------------|-----------------|
| `ChordPreviewItem.updateFromGroup` (line ~251) | `this.chordNotes = getResolvedChordNotes(this.chord);` |
| `playChordOnce` (line ~1410) | `const chordNotes = getResolvedChordNotes(chord);` |
| `updateCurrentHighNotes` (line ~1706) | `const chordNotes = getResolvedChordNotes(group.chordSequence[index]);` |
| Segment preview loop (line ~495) | `const chordNotes = getResolvedChordNotes(chord);` |
| Full sequence preview (line ~1201) | `const chordNotes = getResolvedChordNotes(chord);` |
| MIDI export loop (line ~1538) | `const chordNotes = getResolvedChordNotes(chord);` |

Do **not** replace `chordToMIDINotes` when you need the **default** chord notes for other purposes (e.g. “recommended notes” in the modal = chord tones from the engine). There, keep using `engine.chordToMIDINotes(chord)`.

---

## 2. Note name ↔ MIDI

**Where:** `app.js` (next to `midiToNoteName`).

You need to parse user input (e.g. `"C4"`, `"F#5"`) to a MIDI number for validation and saving. Use the engine’s `noteToIndex` (from `ChordEngine`’s note names / `noteToIndex`). Example:

```js
/** Parse "C4", "F#5", "Bb3" etc. to MIDI number, or null if invalid. */
function noteNameToMidi(text) {
    if (!engine || typeof text !== 'string') return null;
    const m = text.trim().match(/^([A-Ga-g]#?|b?)[b#]?\s*(\d+)$/);
    if (!m) return null;
    let name = m[1].toUpperCase();
    const octave = parseInt(m[2], 10);
    if (!Number.isFinite(octave)) return null;
    const sharp = text.includes('#');
    const flat = text.includes('b') && !/^[Bb]/.test(name);
    if (flat && name.length === 1) {
        const flatToSharp = { 'D': 'C#', 'E': 'D#', 'G': 'F#', 'A': 'G#', 'B': 'A#' };
        name = flatToSharp[name] || name;
    }
    const noteIndex = engine.noteToIndex[name];
    if (noteIndex === undefined) return null;
    return (octave + 1) * 12 + noteIndex;
}
```

(Adjust the regex if your engine uses different naming, e.g. `Bb` vs `A#`. The important part is: one place that returns a number or `null`.)

**Treble rule:** A note is allowed as treble iff its MIDI value is **≥** the highest default bass note for that chord:

```js
function getTrebleMinMidi(chord) {
    const def = engine.chordToMIDINotes(chord);
    if (!def.bass.length) return 0;
    return Math.max(...def.bass);
}
```

When the user adds a note (by recommendation or by typing), check `noteNameToMidi(input) >= getTrebleMinMidi(chord)` before adding to the list.

---

## 3. Long-press on chord pill

**Where:** `ChordPreviewItem` in `app.js`.

- **Desktop:** listen for `contextmenu` on the chord pill; `preventDefault()` and open the treble modal (no browser context menu).
- **Touch:** on `touchstart`, set a timer (e.g. 500–600 ms). On `touchend` or `touchmove` (or touch cancel), clear the timer. When the timer fires, open the treble modal and prevent the click (so you don’t trigger play). You can set a small flag like `this._longPressHandled = true` and in the `click` handler, if the flag is set, ignore the click and clear the flag.

Store on the modal state which chord is being edited: `group`, `index`, and a copy of the current treble list (e.g. from `getResolvedChordNotes(chord).high` or `chord.trebleNotes` if present). So when the pill is long-pressed you call something like `openTrebleModal({ group, chord, index })`.

---

## 4. Treble customiser modal

**HTML (index.html):** Add a new modal, same pattern as `addOptionsModal` / `randomByKeyModal`:

```html
<div id="trebleNotesModal" class="options-modal" aria-hidden="true">
    <div class="options-card treble-notes-card">
        <h3 id="trebleNotesModalTitle">Customise treble — Cmaj7</h3>
        <p class="options-desc">Treble notes play in the high part. Add notes with + or type below (e.g. C5). Notes must not be lower than the chord’s bass.</p>
        <div class="treble-notes-list" id="trebleNotesList"></div>
        <div class="treble-notes-add-row">
            <button type="button" id="trebleNotesAddBtn" class="treble-add-note-btn">+ Add note</button>
            <input type="text" id="trebleNotesInput" placeholder="e.g. G4, Bb5" class="treble-notes-input" />
        </div>
        <div id="trebleNotesRecommendations" class="treble-recommendations" hidden></div>
        <div class="options-actions">
            <button type="button" id="trebleNotesUseDefaultBtn" class="options-cancel">Use default</button>
            <button type="button" id="trebleNotesCancelBtn" class="options-cancel">Cancel</button>
            <button type="button" id="trebleNotesApplyBtn">Apply</button>
        </div>
    </div>
</div>
```

**CSS:** Style `.treble-notes-list` (list of pills or rows with note name + remove button), `.treble-notes-add-row`, `.treble-add-note-btn`, `.treble-notes-input`, and `.treble-recommendations` (e.g. a row of suggested note buttons). Match existing modal styles (e.g. `.options-card`, `.options-actions`).

**Behaviour:**

1. **Open:** `openTrebleModal({ group, chord, index })`  
   - Set modal title to e.g. “Customise treble — {engine.getChordDisplayName(chord.rootNote, chord.chordType)}”.  
   - Compute `resolved = getResolvedChordNotes(chord)` and show `resolved.high` as the current list (each with a remove control).  
   - Store `group`, `index`, and a **working copy** of treble (e.g. `currentTreble = [...resolved.high]`). Do not mutate `chord.trebleNotes` until Apply.

2. **Remove:** Clicking remove on a note removes it from `currentTreble` and re-renders the list.

3. **+ Add note:**  
   - Show the recommendations block (see below). Optionally focus the text input.  
   - Recommendations: chord tones from `engine.chordToMIDINotes(chord)` that are **≥** `getTrebleMinMidi(chord)` and not already in `currentTreble`; optionally also same chord tones one octave higher. Each recommendation is a button: on click, add that MIDI note to `currentTreble` (and dedupe), then re-render.

4. **Text input:** On Enter or “Add” (if you add a separate button), parse with `noteNameToMidi(input)`. If invalid, show a short message. If valid but &lt; `getTrebleMinMidi(chord)`, show “Treble notes must not be lower than the chord’s bass.” If valid and ≥ min, add to `currentTreble`, clear input, re-render.

5. **Use default:** Set `currentTreble` to `engine.chordToMIDINotes(chord).high` (or clear it and treat “no override” as default when applying). Re-render the list.

6. **Apply:**  
   - If `currentTreble` is equal to the default high (same set), delete `chord.trebleNotes` (so the chord is no longer “special”).  
   - Otherwise set `chord.trebleNotes = [...currentTreble].sort((a,b) => a - b)`.  
   - Update the chord in place: `group.chordSequence[index]` is the same object as `chord`, so it’s already updated.  
   - Refresh chord preview (e.g. call `updateChordPreview(group)` or refresh that pill’s display) and `updateCurrentHighNotes(group, index)` if that panel is visible.  
   - Close the modal.

7. **Cancel:** Close modal without saving; no changes to `chord.trebleNotes`.

Use a single “edit state” object for the open modal, e.g. `trebleModalState = { group, chord, index, currentTreble }`, and re-render the list and recommendations whenever `currentTreble` changes.

---

## 5. Recommendations content

- **Chord tones not yet in treble:** From `engine.chordToMIDINotes(chord)`, take `bass.concat(high)`, filter to notes with MIDI ≥ `getTrebleMinMidi(chord)`, then exclude any already in `currentTreble`. Show as buttons (e.g. “C4”, “E5”).
- **Optional:** Add chord tones one octave higher (each chord tone + 12) that are not already in the list; same “not in currentTreble” filter.

No need to store “special” separately: if `chord.trebleNotes` exists and is used, the chord is effectively special for playback and export.

---

## 6. Optional: visual hint for custom treble

In `ChordPreviewItem`, when you set `this.element.textContent`, you can append a small indicator if `getResolvedChordNotes(this.chord).high !== engine.chordToMIDINotes(this.chord).high` (e.g. a dot or “custom”). Keep it subtle so the pill doesn’t get crowded.

---

## 7. Order of work

1. Add `getResolvedChordNotes` and replace all playback/display usages of `chordToMIDINotes` as in the table.  
2. Add `noteNameToMidi` and `getTrebleMinMidi`.  
3. Add the modal HTML and CSS.  
4. Implement open/close, list render, remove, recommendations, text input, Use default, Apply/Cancel.  
5. Wire long-press (contextmenu + touch timer) on `ChordPreviewItem` to open the modal with the right `group`, `chord`, `index`.  
6. Optionally add the “custom” indicator on the chord pill.

After that, custom treble is fully applied in preview, full sequence play, and MIDI export, with the rule that treble notes must be ≥ the chord’s highest bass note.
