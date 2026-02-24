# Sample instruments (Piano, Guitar)

Piano and Guitar use WAV zones from the Chaos soundfont (same as `primid_v1_08` demos). Copy the WAV folders so they are available under this directory:

- **Piano:** copy `primid_v1_08/js/sound/0000_Chaos_sf2_file_wavs/` → `v1_64/instruments/piano/0000_Chaos_sf2_file_wavs/`
- **Guitar:** copy `primid_v1_08/js/sound/0250_Chaos_sf2_file_wavs/` → `v1_64/instruments/guitar/0250_Chaos_sf2_file_wavs/`

Zone definitions are in `piano/zones.json` and `guitar/zones.json`. Loading and playback are handled by `instruhandle.js` and `premiumsound.js`.
