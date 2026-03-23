# Plan: Host on Cloudflare and Hide Source / Protect IP

## Reality check

- **Frontend code (HTML/JS/CSS) that runs in the browser can always be viewed and copied.** You cannot fully “hide” it. What you *can* do is:
  1. Move **sensitive logic and data** to the server (API).
  2. Serve **assets and exports** through the API so URLs and file layout aren’t exposed.
  3. Use the API for **auth and feature flags** so the app only does what you allow.

Below is a plan using **Cloudflare (Hono Worker + R2 + D1 + KV)** and **which parts to move to the API** to protect your project and make copying less useful.

---

## Cloudflare stack (overview)

| Part | Role |
|------|------|
| **Hono Worker** | Single API: auth, project CRUD, export, samples, feature flags. Your “backend” runs here; source stays on CF, not in the client. |
| **R2** | Store project JSON blobs, WAV/MIDI exports, and **instrument samples** (e.g. piano WAVs). No egress fees; good for binary and large files. |
| **D1** | SQL DB for: users/sessions, project metadata (id, user_id, name, R2 key, created_at), and optionally license/entitlements. |
| **KV** | Fast key-value: API keys, feature flags, rate limits, or “allow list” by key so the client only gets tokens/features you grant. |

---

## What to move to the API (to hide / protect)

### 1. **Project save & load** (high value)

- **Current:** `localStorage` in the browser (`primidi_ccState_v1`); state is only on the user’s device.
- **Move to API:**
  - **Save:** `POST /api/projects` — body = project state JSON; Worker stores in **R2** (and optionally metadata in **D1**). Require auth (e.g. API key or session).
  - **Load:** `GET /api/projects/:id` — Worker checks auth, fetches JSON from R2, returns it. List: `GET /api/projects` from D1.
- **Why:** Your app logic stays in the frontend, but **project data** and **who can access what** live on your infra; copying the frontend doesn’t give others your DB or R2.

### 2. **MIDI export** (hides your export algorithm)

- **Current:** `primidi-save.js` + `jsmidgen.js` run in the browser: event list → MIDI bytes → blob download.
- **Move to API:**
  - Client sends **project/state JSON** (or the same event list you already use) to `POST /api/export/midi`.
  - Worker runs **only the MIDI-building part** (e.g. jsmidgen or a port of it) in the Worker; returns binary MIDI.
  - Client receives the blob and triggers download (or you stream it).
- **Why:** The **event-generation and humanization logic** in `primidi-save.js` can stay **only on the server** (you’d have a Worker-side version or a small Node bundle run in a Worker-compatible way). That way the “secret sauce” (curves, timing, velocity) isn’t in the shipped JS.

**Note:** Workers don’t have Web Audio. So:
- **MIDI export:** Easy to do in Worker (pure JS → .mid bytes).
- **WAV export:** Needs either (a) stay in browser, or (b) a separate service (e.g. Node with `wavefile` or similar) that receives events and returns WAV. For “hide source,” moving MIDI to the API already protects the core export pipeline; WAV can follow later if you add a server that can run audio.

### 3. **Instrument samples** (hide paths and control access)

- **Current:** `instruhandle.js` fetches from relative URLs (`instruments/GSL/...`, etc.); anyone can see URLs and copy sample files.
- **Move to API:**
  - Put **all sample files** (and `zones.json` / manifest) in **R2**.
  - Client never sees R2 keys. It calls e.g. `GET /api/samples/:presetId/:file` or `GET /api/samples/stream?preset=...&file=...` with an **auth header** (API key or session).
  - Worker checks auth (and optionally KV/D1 for “this key can use these presets”), then **streams from R2** (or returns a short-lived signed URL if you prefer).
- **Why:** Copying your frontend doesn’t give working sample URLs; they must go through your API and auth.

### 4. **Feature flags / license / API keys** (control who can do what)

- **Current:** All features are in the client; anyone with the code can use everything.
- **Move to API:**
  - **KV:** Store e.g. `key:<apiKey>` → `{ "plan": "pro", "exports": true, "samples": ["soft-piano","epiano"] }`.
  - On app load (or before export/save/load), client calls `POST /api/validate` with key (or cookie). Worker checks KV (and optionally D1), returns **allowed features** and maybe a short-lived JWT.
  - Frontend only enables “Save project,” “Export MIDI,” “Load project,” or certain instruments if the API says so.
- **Why:** Even if someone copies the app, they can’t get exports or cloud save without a valid key you control.

### 5. **What stays in the client (and will stay visible)**

- **UI, 3D, playback, chord grid:** All of this has to run in the browser. You can minify/obfuscate to make copying harder, but it’s still visible.
- **Minimal “orchestration” only:** The client should only do: send state to API, receive MIDI blob, request samples from API, show/hide features based on API response. The **actual export algorithm** and **sample storage** live on the server.

---

## Suggested API surface (Hono Worker)

```text
# Auth / entitlement
POST   /api/validate          # body: { apiKey } → { features, token? }
GET    /api/me                # optional: session or token → user + features

# Projects (state in R2, metadata in D1)
GET    /api/projects          # list projects for user
GET    /api/projects/:id      # get one project (JSON from R2)
POST   /api/projects          # create/overwrite (body: state JSON)
DELETE /api/projects/:id      # delete

# Export (algorithm on server)
POST   /api/export/midi       # body: events + bpm etc. → binary .mid

# Samples (R2 behind auth)
GET    /api/samples/manifest  # list presets (e.g. gsl-manifest equivalent)
GET    /api/samples/:preset/:file  # stream WAV (or zones.json) from R2
```

Use **D1** for: `users`, `projects` (id, user_id, name, r2_key, created_at), and optionally `licenses` or `api_keys`.  
Use **KV** for: `key:<apiKey>` → feature object, and optionally rate limits.  
Use **R2** for: project JSON objects, MIDI files if you cache them, and all sample files + manifest.

---

## Implementation order

1. **Set up Cloudflare project:** Hono Worker, bind R2, D1, KV in `wrangler.toml`.
2. **Auth + KV:** Implement `POST /api/validate` and feature flags; frontend calls it and gates “Save,” “Export,” “Load,” instruments.
3. **Projects:** Implement save/load (R2 + D1); switch frontend from `localStorage` to API (keep localStorage as optional offline cache if you want).
4. **MIDI export:** Port or reuse MIDI generation (e.g. jsmidgen) in the Worker; add `POST /api/export/midi`; frontend sends state/events, receives blob.
5. **Samples:** Upload samples to R2; add `/api/samples/*` routes; change `instruhandle.js` (or a thin wrapper) to fetch from API instead of relative URLs.
6. **Static frontend:** Deploy the current `v1_67` (HTML/JS/CSS) to **Cloudflare Pages** (or static assets from same Worker). So the app is “hosted on Cloudflare” and all sensitive operations go through your Hono API.

---

## Summary: what goes to the API to “hide” source / protect IP

## Build order (phrase by phrase)

Build in this order so each step has what it needs.

| # | Phrase | What to build | Why first |
|---|--------|----------------|-----------|
| **1** | **Project setup** | Hono Worker, `wrangler.toml` with D1, KV, R2 bindings, `GET /health` (or `/`). Deploy with `wrangler deploy`. | You need a running Worker before any API. No auth yet. |
| **2** | **Anonymous identity** | Endpoint that gives or accepts a stable "who" for free users: e.g. `GET /api/me` returns `{ anonymousId }` (set cookie or ask client to send `X-Anonymous-Id`). Store nothing yet; just so you can use this id in KV keys for 10/day. | Free tier needs *some* identity to count Imagine/Save (10/day). No login UI yet. |
| **3** | **Login / signup** | D1 table `users` (id, email, password_hash, created_at). `POST /api/signup`, `POST /api/login`; issue JWT or session cookie. `GET /api/me` returns user + plan when logged in, or anonymous id when not. | Pro/Pro+ need an account; usage is per user_id. |
| **4** | **Plans and tiers** | D1: `subscriptions` (user_id, plan: free \| pro \| pro+), and which presets each plan gets. When user is logged in, plan comes from D1; when anonymous, plan = free. | Needed before you can enforce limits and instrument lists. |
| **5** | **Usage limits (KV)** | On Imagine/Save: resolve identity (anon or user_id), look up plan, check KV (10/day for free, 1000 or 10000/month for Pro/Pro+), increment if under limit, return success or limit reached. | This is the core of Free vs Pro vs Pro+. |
| **6** | **Imagine/Save endpoint** | `POST /api/imagine` or `POST /api/save`: check usage (step 5), then do the actual save/export logic (e.g. write to R2 for save). Return remaining count. | Ties identity + limits to the button. |
| **7** | **Samples (R2)** | Upload piano (and later other) samples to R2. `GET /api/samples/:preset/:file`: check auth + plan allows preset, stream from R2. | So server gives piano, user cooks WAV; paid instruments gated. |
| **8** | **Projects save/load** | Save: store project JSON in R2, metadata in D1. Load: by id, check ownership, return JSON. | Cloud save for logged-in users. |

**First thing to build:** **Phrase 1 — Project setup** (Worker + wrangler + bindings + health route). Not login yet; get the app running. Then Phrase 2 (anonymous identity), then Phrase 3 (login).

---

## Summary: what goes to the API to "hide" source / protect IP

| Part | Move to API? | Where | Purpose |
|------|----------------|--------|---------|
| Project save/load | ✅ Yes | R2 + D1 + Hono | Data and access control on your side; no raw storage in client. |
| MIDI export logic | ✅ Yes | Hono Worker | Algorithm and constants stay server-side; client only sends input, gets .mid. |
| WAV export | ⚠️ Optional | Separate service or keep client | Workers can’t do Web Audio; either keep in browser or add a Node/service later. |
| Instrument samples | ✅ Yes | R2 + Hono | URLs and files not exposed; auth-gated streaming. |
| Feature flags / keys | ✅ Yes | KV (or D1) + Hono | Control who can save, export, use which instruments. |
| UI / 3D / playback | ❌ No (stays client) | Frontend | Must run in browser; minify/obfuscate if you want. |

After this, “copying the project” only gives someone the UI and playback; they won’t have your export algorithm, sample files, or cloud save—and they can’t use paid features without a valid key from your API.

---

## Family discussion: what's worth hiding vs. minimising cost

### Sister's point: "How we run the piano sample is valuable"

She's right. The valuable part isn't the visible settings—it's **how you use the WAVs to get so many lively chords**: zone mapping, which sample for which note, layering, timing, humanization, and how that plugs into playback. That "recipe" lives in:

- **`instruhandle.js`** — which sample (zone) for each MIDI note, how buffers are used.
- **`primidi-save.js`** (and chord-player) — event list, humanization, curves that make chords sound alive.
- The way the **event list** drives **sample playback** (when to start/stop, overlap, sustain).

To **really hide** that recipe you'd have to run it on the server: client sends high-level "play this" (e.g. chord progression + settings), server runs the full pipeline (event gen + sample playback) and **streams back audio**. Then the user never sees the WAVs, zones, or playback code—they only hear the result.

- **Catch:** That means a server doing real-time (or pre-rendered) audio. Cloudflare Workers can't do Web Audio. You'd need a Node (or similar) service, CPU per play, and bandwidth for streaming. So **hiding "how we use WAV" properly = ongoing server cost**.

So: sister is correct that the playback pipeline is the valuable IP; hiding it properly and minimising server cost pull in opposite directions.

### Sister's variant: server gives piano (samples), user cooks WAV in their own browser

Sister's idea: **server only delivers the piano samples** to the user; the **user's browser** does all the "cooking" (playback + WAV export) locally.

- **Server (Worker + R2):** Stores piano WAVs (and zones/manifest). Serves them on demand via e.g. `GET /api/samples/:preset/:file` with auth. No audio rendering on the server—just file delivery.
- **Client:** Keeps your current logic: fetch samples from the API (instead of relative URLs), decode in Web Audio, run event list → playback and WAV export entirely in the browser.

**What you get:**

- **Low server cost:** No streaming audio, no server-side Web Audio. You only pay for Worker invocations + R2 storage and egress when someone actually loads samples. Much cheaper than "server renders and streams audio."
- **Samples are protected:** Copying the app doesn't give working sample URLs; they come from your API and can be gated by auth.
- **Recipe still in the client:** The "how we use WAV" (humanization, timing, zone mapping, layering) stays in the frontend and is still visible to a determined user. So you're hiding the **piano assets**, not the **playback recipe**.

**Summary:** Server = piano delivery only. User = cooks WAV in their own browser. Good balance between Mum's cost concern and Sister's wish to not give away the piano for free.

### Future: tiers, usage limits, and paid instruments (Sister's direction)

Three tiers: **Free**, **Pro**, and **Pro+**.

| Tier  | Imagine/Save limit | Instruments |
|-------|--------------------|--------------|
| **Free**  | 10 per day | Piano only. Nostalgia option can be used but cannot be saved. |
| **Pro**   | 1000 per month | More (not just piano). |
| **Pro+**  | 10000 per month | Even more instruments. |

- **Free:** 10 clicks per day on "Imagine" or "Save". Piano-only. Nostalgia can be used in the UI but saving (e.g. export/save project) is not allowed for nostalgia, or counts toward the 10/day. Track with **KV**.
- **Pro:** 1000 clicks per month on Imagine/Save. More instruments to choose from (not just piano). Track with **KV**; plan + instrument list in **D1** or KV.
- **Pro+:** 10000 clicks per month. Even more instruments. Same pattern.

**How it fits Hono + Worker + D1 + R2 + KV:**

| Tier   | Imagine/Save limit | Where to check | Instruments |
|--------|--------------------|----------------|-------------|
| Free   | 10 per day         | KV             | Piano only (e.g. soft-piano, epiano). Nostalgia: usable, not saveable. |
| Pro    | 1000 per month     | KV             | More (e.g. + grand, strings, etc.).   |
| Pro+   | 10000 per month    | KV             | Even more presets.                   |

**KV for usage (click count):**

- **Free (per day):** Key e.g. `usage:free:{userIdOrFingerprint}:{YYYY-MM-DD}`. Value = number of Imagine/Save clicks today. On each click: Worker reads count; if count >= 10, return 429 or "limit reached"; else increment and allow. KV supports atomic read + write or put with metadata; you can use a single key per user per day and increment (Cloudflare KV doesn't have atomic increment; you do read in Worker, check, then put count+1—for 10/day this is fine; for higher concurrency you could use D1 with a single row per user/day and `UPDATE ... SET count = count + 1` for atomicity if needed).
- **Pro / Pro+ (per month):** Key e.g. `usage:sub:{userId}:{YYYY-MM}`. Same idea: read count, if under 1000 (Pro) or 10000 (Pro+), increment and allow; else reject. Plan type (free vs pro vs pro+) comes from **D1** (e.g. `subscriptions` table: user_id, plan, period_start, period_end) so the Worker knows which limit to apply.

**D1 for plans and instruments:**

- Table e.g. `subscriptions`: user_id, plan (free | pro | pro+), period_start, period_end.
- Table or config: which presets each plan gets (e.g. `plan_presets`: plan, preset_id). Free = piano only; Pro = piano + list A; Pro+ = piano + list A + list B.
- On `POST /api/validate` or on each Imagine/Save, Worker: (1) gets user (or anonymous id), (2) looks up plan in D1, (3) checks KV for usage for this day/month, (4) returns allowed presets + remaining count; or for the Imagine/Save action, increments usage in KV and returns success/limit.

**R2:** Still used for sample files; `GET /api/samples/:preset/:file` only serves if the user's plan allows that preset (and usage/entitlement already checked).

**Conclusion:** Yes—**Hono on Worker + D1 + R2 + KV can have this sorted.** KV for daily/monthly click limits, D1 for subscription tier and which instruments each tier gets, R2 for serving samples, Worker to tie it all together (validate, check limit, increment, serve samples). **Free** = 10/day + piano (nostalgia usable, not saveable); **Pro** = 1000/month + more instruments; **Pro+** = 10000/month + even more instruments.

### Mum's point: "Just go no API, minimise server cost"

Also valid. If the goal is **low or zero server cost**:

- **No API for hiding source** → no Worker/R2/D1/KV for auth, projects, samples, or export. Host the app as **static** (e.g. Cloudflare Pages, or even open the HTML). Cost stays at zero (or near zero).
- Many products are client-only; the code is visible but the value is the experience, the sound, and the brand. You can still minify/obfuscate to make copying a bit harder, without any server.

### My take

- **Sister:** Right that the **way you use WAVs for lively chords** is the distinctive bit. Protecting it properly = server-side playback + streaming audio = **recurring cost**.
- **Mum:** Right that **minimising server cost** is a good goal. No API (or only a tiny one for something you really need) keeps cost minimal.

**Trade-off:**

| Goal | Implication |
|------|-------------|
| Hide "how we play WAV" | Run playback on server, stream audio → **ongoing server cost**. |
| Minimise server cost | No (or minimal) API; playback stays in the browser → **code is visible**, but **cost stays low**. |

**Recommendation:**

1. **If minimising cost comes first (Mum's priority):**  
   - **Skip** the big "hide source" API for now.  
   - Host the app as **static** (e.g. Cloudflare Pages).  
   - Optionally: **minify + light obfuscation** so the code is harder to read; it doesn't truly hide it but can deter casual copying.  
   - The "lively chord" recipe stays in the client; you accept that and optimise for $0 server.

2. **If protecting the playback recipe comes first (Sister's priority) and you're okay with some cost:**  
   - You'd add a **backend that does audio** (not just Workers): e.g. a small Node service that has the same event + sample logic, renders or streams audio, and the client only sends "what to play" and plays the stream.  
   - That's a bigger step and has ongoing cost (compute + egress).

3. **Middle ground:**  
   - Use the **API only for things that need a server anyway** (e.g. cloud save, paid export, or login), and **keep playback in the client**.  
   - You don't hide "how we use WAV," but you keep server cost low and still get backup/paid features if you want them later.

So: sister is right about *what* is valuable (the WAV→lively-chord pipeline); mum is right that going "no API" minimises cost. Choosing between them is about whether you value **zero cost** more or **hiding the playback recipe** more—and the rest of this doc is the plan if you later decide to prioritise hiding and accept some cost.
