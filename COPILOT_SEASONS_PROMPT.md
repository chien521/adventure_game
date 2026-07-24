# FEATURE REQUEST — retheme "UNDERTOW" as a four-seasons journey
### For GitHub Copilot (agent mode) — read fully before writing code

## 0. Context and why

The game currently ships as 4 industrial/dystopian chapters (Outskirts → Works → Floodline → Core) with no narrative frame beyond mood. Playtesting found two real problems this pass should fix along the way:

1. **Some solid-looking objects have no collider.** `Crusher` and the conveyor-belt meshes in `ChapterLoader.js`'s `loadWorks()` render as opaque rectangular blocks but were built as visual-only (hazard-trigger or velocity-nudge only, no entry in `dynamicColliders()`). The player walks straight through them, which reads as broken, not intentional. Fix this as part of the re-theme (see §4).
2. **No narrative shape.** Four samey-toned industrial chapters in a row don't build toward anything. A season cycle gives the whole game a shape — a traveler moving through a year, searching for / returning to something — without adding a single line of dialogue or caption, matching the "environment teaches, no text ever" constraint from the original spec.

**Decision already made:** reorder to follow the actual calendar (Spring → Summer → Autumn → Winter), reusing and reskinning the existing chapters rather than building new mechanics from scratch. This is a remap + reskin + narrative-motif pass, not a rewrite of physics, interactables, or the audio system.

---

## 1. The remap (existing content → new season slots)

Rename the chapter data files to match their season, and reorder how `main.js` chains them. The **mechanic archetypes stay exactly where they are in `ChapterLoader.js`** (`loadOutskirts`, `loadWorks`, `loadFloodline`, `loadCore` keep their names and logic) — only which *chapter data file* uses which archetype, and the order they play in, changes.

| New order | Season | File | Reuses mechanic archetype | Reuses current content of |
|---|---|---|---|---|
| 1 | **Spring** | `src/chapters/spring.js` | `loadFloodline` (kind: `'floodline'`) | current `ch3.js` (green murk, water, the presence, air-pocket tunnel, floating box) |
| 2 | **Summer** | `src/chapters/summer.js` | `loadOutskirts` (no `kind`, the default) | current `ch1.js` (box push, lever/door, searchlight) |
| 3 | **Autumn** | `src/chapters/autumn.js` | `loadWorks` (kind: `'works'`) | current `ch2.js` (conveyors, crushers, weighted-plate door, relatch timer) |
| 4 | **Winter** | `src/chapters/winter.js` | `loadCore` (kind: `'core'`) | current `ch4.js` (rotating machine, master switch, blackout ending) |

Delete `ch1.js`–`ch4.js` once their content is migrated. Update `main.js`'s imports and the chapter-chaining logic (`if (chapterData === ch1) loadChapter(ch2)...`) to import `spring`, `summer`, `autumn`, `winter` in that order. Update the `keyLight`/`lamp` initial setup in `main.js` (currently seeded from `ch1.palette.accent` and `ch1.spawn`) to use `spring` instead.

**Why Spring reuses the water chapter, not a new one:** thaw/growth/water is already there in the green palette — this is the smallest-diff, highest-narrative-payoff swap in the whole plan.

**Why Summer reuses the searchlight/box chapter:** its current cold blue-grey rain palette doesn't say "summer" at all, so this one needs the most re-skinning (see §2) — but the *mechanics* (push a box, throw a lever, avoid a sweeping light) work fine relabeled as a sun-scorched field with a harsh watchtower light instead of a prison searchlight.

---

## 2. Per-season re-skin (palette, dressing, hazard framing — not new systems)

Keep every hazard/interactable *class* as-is (`KillVolume`, `Searchlight`, `Crusher`, `WaterVolume`, `Box`, `Lever`, `Door`, `PressurePlate`). Only change: palette values in each chapter file, the `Ambient.js` structure geometry per chapter (already parameterized per `chapter.backgrounds`/`chapter.palette.structure`), and light colors/label meshes if any.

- **Spring** (`spring.js`, floodline archetype): keep the green-murk water palette roughly as-is — it already reads as thaw. Consider warming the accent slightly (`#8bad72` → something with a touch more yellow-green, budding-leaf coded) rather than sickly.
- **Summer** (`summer.js`, outskirts archetype): re-palette from cold blue-grey/rain to warm gold/wheat-field tones (background/fog around a dusty amber, ground a sun-baked tan, structure a dry-grass olive, accent a hot white-gold). Swap `buildOutskirtsAmbient`'s rain-particle system (`Ambient.js`) for a heat-haze / drifting-pollen particle effect instead — reuse the same `THREE.Points` pattern, just change color/motion (particles should drift and shimmer upward slowly, not fall like rain). The searchlight becomes a watchtower's heat-shimmer beam; same mechanic (stand in it > 0.5s = death), reskinned only.
- **Autumn** (`autumn.js`, works archetype): re-palette from sodium-orange industrial toward richer rust/amber/dead-leaf tones. Reframe the crushers and conveyors as harvest/threshing machinery — same collision boxes and timing, new color story (rust `#8a5a2e`-ish rather than industrial brown). This is also where the collider fix in §4 matters most, since this chapter has the most crusher/conveyor surfaces.
- **Winter** (`winter.js`, core archetype): keep the pale white void almost as-is — it's already a blizzard-whiteout waiting to happen. Optionally add a sparse falling-snow particle layer (same `THREE.Points` pattern as Spring's/Summer's, white, slow fall, sparse count for performance).

Each season keeps its own `palette.accent` distinct enough that the existing lamp/beacon/echo-light recoloring (already driven by `chapter.palette.accent` in `ChapterLoader.js` and `main.js`) continues to work without changes.

---

## 3. A recurring visual motif (the "narrative," entirely without text)

Add one small, consistent visual anchor that appears in all four chapters and pays off in the Winter ending — this is what makes "a traveler seeking / returning to something" actually legible without a single caption.

- Pick ONE simple silhouette (a small distant house with one lit window, OR a single leafless tree that changes with the season, OR a small figure standing still in the far background) and place it as a background prop near each chapter's `exitX`, reusing the existing parallax-layer system in `Ambient.js` (the deepest layer, `factor: .1`).
- It should be barely noticeable in Spring/Summer/Autumn — just a consistent shape in the far background the player walks toward and past each time, unexplained.
- In **Winter**, place it much closer to the player's path (not just background dressing) so it's unmistakably the same shape seen three times before — and have the existing blackout/heartbeat/dawn-walk ending sequence in `main.js`'s `beginEnding()` end with the player arriving at it, rather than just walking into empty grey. The existing 20s dark walk + fade-to-dawn is the right shape for this already; it just needs this destination placed at the end of it instead of nothing.
- The 4 existing "echo" collectibles (`createEcho` in `ChapterLoader.js`) can be retroactively framed as fragments/memories of this same destination — no code change needed there beyond maybe warming their color to match whichever season's palette, since the mechanic already works.

Keep this restrained — one motif, four sightings, one payoff. Do not add narration, captions, or additional lore objects beyond this.

---

## 4. Fix: give solid-looking objects real colliders (or make clearly-non-solid ones read as such)

**Where:** `Hazards.js` (`Crusher`), `ChapterLoader.js`'s `loadWorks()`/`loadAutumn` (conveyor mesh construction).

- **Crushers:** they're meant to be hazards that crush the player when descended low — that's correct and should stay a hazard, not a walkable platform. But right now the player can also just walk *through* the crusher horizontally at any height, including when it's fully retracted and clearly occupying space. Give `Crusher` a real collider when it's in its "up"/retracted position it still shouldn't block (that's the safe gap you walk through) — the fix is specifically for when it's part-way down and just sitting there looking solid: make sure `hits()`'s crush zone and a real solid-body check aren't just visually implying solidity while never blocking. Concretely: add the crusher's current body rect to the chapter's `dynamicColliders()` return whenever it's not actively in its hazard-triggering window, so it behaves like a solid obstacle you must time around, not a hologram.
- **Conveyors:** the belt mesh currently sits visually on top of the ground collider with no collider of its own (the player is actually always standing on the ground beneath it). That's fine *if* it reads as a thin decal on the floor — but if it currently renders as a raised block, either flatten its visual height so it clearly reads as a floor marking, or (preferred, more tactile) give it a thin real collider matching its rendered height so standing on the belt is a genuine tiny step up, consistent with how boxes/ledges work everywhere else in the game.
- Audit the rest of `Interactables.js`/`Hazards.js` for any other mesh that looks like a solid brick but has no `collider()` entry reachable from a chapter's `dynamicColliders()`, and fix the same way. When in doubt: if it looks like a solid block, it should either block, or visibly not look solid (transparency/glow/particle treatment) — no plain opaque rectangle should ever be walk-through-able.

---

## 5. Chapter length / pacing

Playtesting felt each chapter was too short and too linear (one straight corridor, 2-3 gated interactions). For this pass, pick the **one** season chapter you have the most schedule room for (recommend Autumn, since it already has the most moving parts) and add one genuine non-linear beat:

- A short optional side-detour (a dead-end alcove, doesn't have to loop back into the main path) that rewards exploration — a natural home for that season's echo collectible, rather than having it sit directly on the critical path.
- Or a brief vertical section (climb up and back down) that isn't strictly gating progress but changes the framing/silhouette for a beat (a "look how far you've come" moment via the camera zones system already in `Camera.js`).

Don't do this to all four chapters in one pass — one well-executed detour beats four rushed ones. If time allows after everything else in this doc, extend to a second chapter.

---

## Constraints (carry over — don't relitigate)

- No new npm dependencies.
- Vanilla Three.js primitives/procedural geometry only — no downloaded assets, no textures.
- Procedural WebAudio only (`Audio.js`) — if a season needs a new ambience flavor (e.g. Summer's heat-haze vs. the old rain), extend the existing `AMBIENCE_PROFILES` pattern in `Audio.js` rather than building a new system.
- Keep `vite.config.js`'s `base: './'`, the canvas-focus fix in `main.js`, and the VIVERSE publish workflow untouched.
- Keep chapter disposal leak-free — anything new must be cleaned up by `ChapterLoader.dispose()`'s existing traversal, so build it the same way existing chapter content is built (added to `this.group`).
- No TypeScript, no test framework — verify by playing it in `vite dev`, chapter by chapter, in the new Spring → Summer → Autumn → Winter order.
