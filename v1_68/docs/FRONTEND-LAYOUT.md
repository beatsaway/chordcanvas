# ChordCanvas frontend — where things live

For developers navigating `v1_67/`.

## Pages

| File | Role |
|------|------|
| **`index.html`** | Main shell: header, 3D canvas (module `main.js`), chord **dock**, modals (✦ imagine, Save, **Recent Works**, auth). Keep **structure** here; avoid huge inline scripts where a `js/` file fits better. **Recent Works**: header → menu or URL **`index.html#cc-library`**. |

## Scripts (order matters on `index.html`)

1. **`js/chordcanvas-auth.js`** — Google sign-in modal, JWT, **`ensureSaveMidi` / `ensureSaveWav`**, ✦ imagine, credits display. Exposes **`window.chordcanvasAuth`**.
2. **Instruments / keyboard / MIDI mapping / `primidi-save.js` / `cc/*.js`** — Audio + chord engine.
3. **`cc/chord-player.js`** — Play/stop, **`ccApplyFullState`**, **`ccExport('midi'|'wav')`**, library restore-from-session (legacy).
4. **`js/cc-library-panel.js`** — **Recent Works** modal: `GET /api/library`, Reuse, Download again (in-page), Remove. Depends on auth + chord-player.
5. **`main.js`** (module) — Three.js / piano scene.

## Adding features

- **Credits / login / save API** → `chordcanvas-auth.js`
- **Playback or export behaviour** → `cc/chord-player.js` (or shared `cc/` / `lib/` as appropriate)
- **Library list UI only** → `cc-library-panel.js` + small HTML/CSS hooks in `index.html`

## Optional API base

Set **`window.CHORDCANVAS_API_URL`** before auth if not using the default Worker URL.
