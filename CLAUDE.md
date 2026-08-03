# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

*What the Snow Remembers* — a browser-based 3D puzzle-platform adventure (Three.js + Vite, vanilla JS ES modules, no framework). Four chapters (spring/summer/autumn/winter), each a self-contained puzzle built from a small shared vocabulary of interactables (blocks, levers, doors, pressure plates, lifts) and hazards. Runs entirely client-side; ships to GitHub Pages. Live at https://chien521.github.io/adventure_game/.

## Commands

```bash
npm install
npm run dev        # vite dev server, usually http://127.0.0.1:5173/
npm run build      # production build to dist/
npm run preview    # serve the dist/ build locally
npm run watch:autocommit  # scripts/auto-commit-watch.js: watches the repo and auto-commits+pushes to origin/main after a 5s quiet period — only run this if you actually want that behavior
```

There is no test framework and no TypeScript in this project. Verify changes by playing the game in `vite dev` — for gameplay/puzzle changes, actually play through the affected chapter, including a full-speed running jump against any new gate, before considering it done.

Deployment is automatic: pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Architecture

### The game is a 2D platformer rendered in 3D

Physics and collision (`src/core/Physics2D.js`) are pure 2D AABB — bodies have `x/y/hw/hh` and everything moves on a single Z plane. `moveAndCollide()` resolves Y before X per substep (diagonal landings must settle onto a platform top before horizontal resolution reads them as a wall hit) and uses an epsilon (`EPS = 1e-6`) to avoid floating-point ULP misses at exact boundary contact — read the comments in that file before touching collision math, they explain two specific historical bugs (falling through platforms, being shoved sideways while standing still). Three.js is only the renderer/scene graph; it does not drive gameplay physics.

### Chapters are data, not code

Each `src/chapters/{spring,summer,autumn,winter}.js` file is a plain object: palette, spawn point, `colliders[]`, `checkpoints[]`, and per-chapter fields for whatever interactables that chapter uses (levers, doors, plates, keys, box positions, etc.) — there is no shared schema beyond what each chapter's `kind` needs. `chapter.kind` selects which loader function in `src/world/ChapterLoader.js` builds the runtime mechanics from that data:

- `kind: 'floodline'` → `loadFloodline()` (spring)
- no `kind` (default) → `loadOutskirts()` (summer)
- `kind: 'works'` → `loadWorks()` (autumn)
- `kind: 'core'` → `loadCore()` (winter)

To add or change chapter content, edit the data file; to add a new mechanic archetype, add a new loader function following the existing ones. `ChapterLoader.dispose()` traverses `this.group` and disposes every geometry/material before a chapter unloads — anything a loader adds to the scene must go through `this.group` (or a child of it) so it gets cleaned up automatically; this is a hard rule, not a suggestion (leaking a chapter's geometry on every reload/restart is a real regression class here).

Reusable interactable/hazard classes live in `src/world/Interactables.js` (`Box`, `Door`, `Lever`, `PressurePlate`) and `src/world/Hazards.js` (`KillVolume`, `Searchlight`, `Crusher`). Background dressing/particles are in `src/world/Ambient.js` (`buildOutskirtsAmbient`, `buildWorksAmbient`, etc.) — parameterized per chapter's `palette`/`backgrounds`.

### Core runtime pieces

- `src/main.js` — entry point: builds the DOM shell (start screen, guide, HUD, pause, ending) inline via `innerHTML`, owns the game loop wiring, chapter-transition logic (which season follows which), pause flow, checkpoint/respawn handling, the ending sequence, and VIVERSE avatar/leaderboard wiring. This file is long and imperative by design — read it top-to-bottom rather than expecting sub-modules for menu/HUD state.
- `src/core/Game.js` — minimal `requestAnimationFrame` loop, clamps `dt` to 0.1s, pauses when the tab is hidden.
- `src/core/Input.js` — keyboard + on-screen touch controls, unified into one polled state.
- `src/player/Player.js` / `src/player/PlayerRig.js` — physics body + visual rig. `PlayerRig` supports both a built-in default traveler model and a swapped-in VRM avatar (see below); `setAvatar(url)`/`useDefaultTraveler()` is the swap boundary.
- `src/core/Camera.js` — side-view follow camera with "zones" (`setZones`) for chapter-specific framing and scripted portal/route pans.
- `src/core/Checkpoint.js` — tracks the active respawn point per chapter; chapters can also define custom fall-recovery via `chapter.recoverFall`/`recoverCanyonFall` hooks read by `main.js`.
- `src/core/Audio.js` — procedural WebAudio only (no audio files). Ambience presets live in `AMBIENCE_PROFILES`; add a new ambience flavor by extending that map, not by building a parallel system.
- `src/core/AssetLoader.js` — shared GLTF/VRM loading helpers used by `PlayerRig`.

### VIVERSE integration (auth, avatar, leaderboard)

`src/viverse/ViverseSession.js` is the single entry point for all VIVERSE platform interaction — real account login (`viverse-auth`), fetching the logged-in account's own equipped avatar, and the two global leaderboards (`viverse-leaderboard`). The game itself requires no login and never calls VIVERSE on page load; login is triggered only by explicit user action (the "use my VIVERSE avatar" button, or "submit to VIVERSE leaderboard" on the ending screen). Do not add a second auth path or a picker-style "browse any avatar" widget — see the `viverse-auth`/`viverse-leaderboard` skills under `.claude/skills/` for the integration contract (auth domain, token field requirements, profile fallback chain, leaderboard rank-is-0-based gotcha, etc.) before touching this code.

## Constraints carried over from prior feature passes (still apply)

These came from actual playtesting/schedule decisions and remain the working rules for this codebase unless a task explicitly says otherwise:

- No new npm dependencies without a clear reason — this is a deliberately small dependency footprint (`three`, `@pixiv/three-vrm`, `vite`).
- Vanilla Three.js primitives/procedural geometry for chapter content — no downloaded assets/textures for the puzzle/environment art (VRM avatar loading is the one deliberate exception, and only via the VIVERSE flows above).
- Procedural WebAudio only — reuse existing SFX (`leverClunk`, `splash`, etc.) and the `AMBIENCE_PROFILES` pattern rather than inventing a new sound system.
- Keep `vite.config.js`'s `base: './'` and the canvas-focus fix in `main.js` (`renderer.domElement` gets `tabindex`/`focus()` wiring so keyboard input works after any UI interaction) intact.
- For any new gate (door, plate, timer), verify a full-speed running jump can't skip it — this exact class of bug has shipped before.
- Add checkpoints near any new gate so a failed attempt costs seconds, not a full chapter replay.
