# Primidi for Producers

Producer-only build: chord grid, piano preview, and **export to MIDI (.mid) or WAV (.wav)** for your DAW.

## What’s included
- **Arrange view only** — chord grid, play/stop, tempo, rhythm, humanization
- **Piano only** — Soft Piano and E-Piano (no other instruments)
- **Export** — Save as MIDI or WAV from the chord dock
- **3D keyboard** — preview with computer keyboard; key highlight, labels, camera control
- MIDI hardware input supported (Web MIDI API); no MIDI monitor

## How to run
Open `index.html` in a modern browser (or use a local server if you hit CORS with assets).

## Compared to full Primidi
- Removed: live.html, MIDI input, MIDI debug, all non-piano instruments (GSL + other JS synths)
- GSL manifest is empty; playback uses the two JS piano presets only
