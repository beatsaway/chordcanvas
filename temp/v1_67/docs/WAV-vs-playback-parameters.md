# WAV export vs browser playback: parameter comparison

## Why analyse playback first, then WAV?

**Correct order:**  
1. **Define the source of truth:** What parameters does **browser playback** use when you press Play?  
2. **Then compare:** Does WAV export receive and use the **same** parameters?  
Any parameter that affects playback but is missing or different in WAV is a bug: the file won’t match what you hear.

**Wrong order (what I did before):**  
Starting from “what does `exportWav` accept?” and then “what should we add?” assumes the WAV API is the source of truth. It isn’t. Playback is. If we only “fill in” options that exportWav already has, we never notice that (a) we’re not passing some playback parameters at all, or (b) exportWav doesn’t support them yet (e.g. row volume). So we must **first** list everything that affects the sound in the browser, **then** check WAV against that list.

---

## 1. Parameters used for browser playback

When you press Play, chord-player applies the **focused row’s sound state** (or the playing row’s) via `applySoundStateToGlobals(state)`. The synth (gsl-synth) and globals then use:

| # | Parameter | Where it lives | How playback uses it |
|---|-----------|----------------|------------------------|
| 1 | **presetSlots** | soundState.presetSlots | window.gslPresetSlots → which presets per slot |
| 2 | **slotVolumes** | soundState.slotVolumes | window.gslSlotVolumes → gsl-synth slot gains (0–100) |
| 3 | **slotSemitones** | soundState.slotSemitones | window.gslSlotSemitones → pitch offset per slot |
| 4 | **slotMuted** | soundState.slotMuted | window.gslSlotMuted → mute per slot |
| 5 | **everyBarPattern** | soundState.everyBarPattern | window.gslEveryBarPattern → per-slot volume shape (uphill, etc.) |
| 6 | **everyBarIntensity** | soundState.everyBarIntensity | window.gslEveryBarIntensity → strength of that shape |
| 7 | **layerPlayStyle** | soundState.layerPlayStyle | window.gslLayerPlayStyle → human/drunk delay |
| 8 | **layerPlayMode** | soundState.layerPlayMode | window.gslLayerPlayMode → split/scatter (UI only; gsl-synth may use for pan/voice spread) |
| 9 | **reverb** | soundState.reverb (0–100) | window.synth.setReverb(r/100) → reverb send/wet = (r/100)*0.6 |
| 10 | **stereoWidth** | soundState.stereoWidth (-100..0) | window.synth.setStereoWidth(sw) → mid/side balance |
| 11 | **nostalgia** | soundState.nostalgia | window.synth.setNostalgiaMode(!!state.nostalgia) → tape ramp |
| 12 | **rowVolume** | soundState.rowVolume (0–2000) | window.synth.setMasterVolume(rv) → master gain = rv/100 (1000 → 10×) |
| 13 | **soundBassEveryBar / soundTrebleEveryBar / intensities** | soundState | window.gslChordRowSoundBassEveryBar etc. (Human panel; can affect how Note row’s pattern is interpreted in some code paths) |
| 14 | **delayIntensity** | row settings (stateForExport) | Used in event timing (human/drunk); applied when building events |
| 15 | **bpm / soundBpm** | compiled.bpm, gslBpm | Tempo for bar duration and every-bar modulation |

So **reverb**, **stereoWidth**, **rowVolume**, and **nostalgia** are all part of playback. The same row’s **soundState** is what should drive WAV when exporting that row (or first row when exporting all).

---

## 2. What WAV download currently receives and uses

Built in chord-player when you click “WAV” (only for the chosen `rowIndex` sound state):

| # | Passed to exportWav? | exportWav option name | Used in exportWav? | Notes |
|---|----------------------|------------------------|---------------------|--------|
| 1 | Yes | presetSlots | Yes | OK |
| 2 | Yes | slotVolumes | Yes | OK |
| 3 | Yes | slotSemitones | Yes | OK |
| 4 | Yes | slotMuted | Yes | OK |
| 5 | Yes | everyBarPattern | Yes | OK |
| 6 | Yes | everyBarIntensity | Yes | OK |
| 7 | Yes | layerPlayStyle | Yes | OK (delay) |
| 8 | Yes | layerPlayMode | No | Passed but **not used** in primidi-save.js |
| 9 | **No** | reverbAmount | Yes (default 0.3) | **Missing:** soundState.reverb never passed. Playback uses (reverb/100)*0.6. |
| 10 | **No** | stereoWidthMidEq | Yes (default -75) | **Missing:** soundState.stereoWidth never passed. |
| 11 | Yes (from gslSynth at export time) | nostalgiaMode | Yes | OK (but read from live synth, not from soundState; usually same if that row was last applied). |
| 12 | **No** | (none) | No | **Missing:** rowVolume not passed; exportWav has **no** master/row volume. Playback uses masterGain = rowVolume/100. |
| 13 | **No** | (none) | No | **Missing:** soundBassEveryBar, soundTrebleEveryBar and their intensities are used in **playback** (gsl-synth) as a chord-row mod gain: `(bassMult + trebleMult) / 2` over the bar when chord dock is playing. WAV only has **per-slot** everyBarPattern (6 slots); it does not receive or apply this Sound-panel bass/treble every-bar, so WAV can differ from playback. |
| 14 | Yes | delayIntensity | Yes | OK |
| 15 | Yes | bpm, soundBpm | Yes | OK |
| - | Yes | sampleRate, reverbBuffer | Yes | From live reverb when available. OK. |

So WAV is **different from playback** in four ways:

1. **reverb** – Not passed; WAV always uses default reverb (0.3 after internal *0.6).  
2. **stereoWidth** – Not passed; WAV always uses default stereo width (-75).  
3. **rowVolume** – Not passed and **not implemented** in exportWav; WAV has no master gain, so it won’t match when row volume ≠ 1000%.  
4. **soundBassEveryBar / soundTrebleEveryBar** – Not passed; playback applies a chord-row bar-phase gain `(bassMult + trebleMult) / 2` in gsl-synth; WAV has no equivalent, only per-slot everyBarPattern.

---

## 3. Summary: what to fix

- **Playback = source of truth.** List everything that affects the sound when you press Play.  
- **Then** make WAV use the same parameters.

**Concrete gaps:**

1. **chord-player.js**  
   - Add to `wavOptions`:  
     - `reverbAmount`: `soundState.reverb != null ? soundState.reverb / 100 : 0.5` (or your default 0–1).  
     - `stereoWidthMidEq`: `soundState.stereoWidth != null ? soundState.stereoWidth : -75`.  
     - `rowVolume`: `soundState.rowVolume != null ? soundState.rowVolume : 1000`.

2. **primidi-save.js**  
   - In `exportWav`, read `options.rowVolume` (0–2000, default 1000).  
   - After the dry+reverb+stereo chain, apply a **master gain** of `rowVolume/100` (same as gsl-synth: 1000 → 10× linear) so WAV matches playback level when row volume is not 100%.

3. **layerPlayMode**  
   - Either implement it in exportWav (e.g. pan/spread per slot) or stop passing it so the contract is clear.

After these changes, WAV will use the same parameters as browser playback for reverb, stereo, and row volume.
