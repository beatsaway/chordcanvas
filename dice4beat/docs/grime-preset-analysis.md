# Why the Grime preset works so well (and how others can mimic it)

## What makes Grime special

### 1. **Bar-by-bar variation (`barSteps`)**

Grime uses **`barSteps`** instead of a single flat **`steps`** array. So each of the 8 bars has its own kick/snare/clap/tom pattern. The beat has a built-in **phrase shape**:

| Bar | Role        | Kick pattern           | Snare / feel        |
|-----|-------------|------------------------|----------------------|
| 1   | Sparse      | 0, 12                  | 8, 14 (half-time)    |
| 2   | Variation   | 0, 6, 12 (triplet)     | 8, 12, 14            |
| 3   | Busier      | 0, 4, 8, 12            | 8, 12 + tom         |
| 4   | Syncopated  | 0, 6, 10, 14           | 6, 8, 12, 14         |
| 5–6 | Sparse again| Same as 1–2            | Tension release      |
| 7   | Busier      | Same as 3              | Build                |
| 8   | **Fill**    | Dense (0,4,6,8,10,12,14)| Snare roll           |

So you get: **sparse → build → drop → repeat → fill**. That’s a full 8-bar arc with tension and release, not a single loop.

### 2. **Contrast and narrative**

- **Odd bars (1, 2, 5, 6):** fewer kicks, simpler snare → verse / groove.
- **Even bars (3, 4, 7, 8):** more kicks and snares, offbeats (6, 10, 14) → energy and syncopation.
- **Bar 8:** full bar of fill (kick and snare density maxed), so it works as an end fill or transition.

Most other presets use one pattern for the whole phrase, so there’s no bar-to-bar story.

### 3. **Shuffle Bar Order**

In `drum-maker.js`, **“Shuffle bar order”** only applies when the preset has **`barSteps`**. So:

- **Grime (and Reggae, Jersey Club, Pop, Gospel):** bars can be reordered randomly → same 8 “building blocks” create new phrases.
- **All `steps` presets:** no shuffle; the same pattern repeats every bar.

Grime benefits twice: structured 8-bar phrase **and** optional randomization.

### 4. **Genre-accurate and syncopated**

Kicks on 0, 6, 10, 12, 14 and snares on 6, 8, 12, 14 match grime’s 140 BPM half-time, eskibeat-style groove. So it’s both **varied** and **on-style**.

---

## How other presets can mimic this

### Option A: Add `barSteps` variants

Keep existing **`steps`** presets as the “straight” version, and add a second preset that uses **`barSteps`** with a clear arc:

- **Sparse bars** (e.g. 1, 2, 5, 6): fewer kicks/snares, verse feel.
- **Build bars** (e.g. 3, 4, 7): more hits, syncopation or busier pattern.
- **Fill bar** (e.g. 8): one full bar of dense kick + snare (and optionally toms).

**Added barSteps presets (same sparse → build → fill idea):**

- **Trap (Bar Build)** – sparse (1,2,5,6) → busier (3,4,7) → full-bar fill (8). Works with Shuffle bar order.
- **House (Bar Build)** – kick 1&3 only on sparse bars, four-on-floor on build bars, bar 8 = dense fill.
- **Breakbeat (Bar Build)** – broken kick/snare slices per bar; bar 4 syncopated, bar 8 = roll + toms.
- **Drum & Bass (Bar Build)** – halftime snare on 8; sparse = few kicks, bar 4 = rolling kicks, bar 8 = fill + toms.

**Restructured existing presets to barSteps (8 bars, sparse → build → fill):**

- **Four on the Floor** – sparse 1&3, then four-on-floor, bar 8 fill.
- **Basic Rock** – sparse kick, rock build with offbeats, bar 8 fill.
- **Boom Bap** – sparse boom-bap, syncopated build, bar 8 fill.
- **Techno** – sparse kick + offbeat snare, build with toms, bar 8 fill.
- **Dubstep** – half-time sparse, build with toms, bar 8 fill.
- **Disco** – sparse then four-on-floor + clap, bar 8 fill.
- **Afrobeat** – sparse then four-on-floor + toms, bar 8 fill.
- **Lo-fi Hip-Hop** – half-time sparse, build with clap/toms, bar 8 fill.

All use 8 distinct bars and work with **Shuffle bar order**.

### Option B: Document the “Grime formula”

When adding new **`barSteps`** presets:

1. Use **8 bars** (or 4), each bar **different**.
2. **Bars 1–2:** sparse / verse.
3. **Bars 3–4:** busier or syncopated.
4. **Bars 5–6:** repeat or slight variation of 1–2.
5. **Bar 7:** build (denser).
6. **Bar 8:** **full-bar fill** (dense kick + snare, optional toms).

That gives a clear phrase and makes “Shuffle bar order” useful.

### Option C: No code change

Use Grime, Reggae, Jersey Club, Pop, and Gospel (6/8) when you want **bar-by-bar variation** and optional shuffle; use **`steps`** presets when you want a **single, repeating pattern**.

---

## Summary

| Feature              | Grime (barSteps)     | Typical preset (steps)   |
|----------------------|----------------------|---------------------------|
| Phrase shape         | Sparse → build → fill| Same pattern every bar    |
| Bar identity         | 8 distinct bars     | One pattern repeated      |
| Shuffle bar order    | Yes                 | No                        |
| Fill                 | Full bar 8           | Last few steps only       |
| Feels like           | A full 8-bar phrase  | A loop                    |

**Mimicking Grime’s success** = use **`barSteps`** with a clear **sparse → dense → fill** design and (where it fits) a **full-bar fill** on the last bar.
