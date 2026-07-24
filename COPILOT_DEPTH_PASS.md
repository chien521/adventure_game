# FEATURE REQUEST — deepen puzzle complexity and content
### For GitHub Copilot (agent mode) — read fully before writing code

## 0. Context

The four seasons are in place and playable (`spring.js`/`summer.js`/`autumn.js`/`winter.js`, routed through `ChapterLoader.js`'s `loadFloodline`/`loadOutskirts`/`loadWorks`/`loadCore`). Two serious puzzle-skip bugs were just found by actually playing the game and fixed: Spring's floating-box puzzle could be jumped over entirely (fixed with a low overhang collider in `spring.js`'s `tunnelCeilings` that caps jump height over the chasm), and Winter's ending lever used to auto-trigger by mere proximity instead of requiring an actual pull (fixed by removing the proximity check in `ChapterLoader.js`'s `loadCore`). Both are confirmed fixed by direct play-testing.

**This pass is different: it's not about bugs, it's about depth.** Even with the skips closed, the game is still mechanically thin — most "puzzles" are a single interactable behind a single door, solved once and forgotten. This request adds real complexity to the thinnest content and one genuine non-linear detour, without touching the physics engine, the audio system, or anything already working.

**Audit rule for everything you add in this pass:** for every new gate (door, plate, timer), ask "can a player just run-and-jump past this without solving it?" and verify by testing a full-speed running jump against it before considering it done. That's exactly the class of bug that slipped through last time — Spring's puzzle looked complete in the code but wasn't functionally gating anything.

---

## 1. Summer needs real work (highest priority)

**Current state:** `summer.js` is nearly identical to the very first version of this game (Ch1/"Outskirts") — box, lever, door, one searchlight, in a straight line. It's the least-evolved of the four seasons and the thinnest content in the game: push the box once, pull the lever once, dodge one searchlight sweep, done.

**What to build:** Turn the searchlight from a "wait for the gap" hazard into something the box interacts with.

- Add a second `Searchlight` later in the level (past the current one, before the door) with a different sweep pattern (different `range`/timing).
- Position a second, later `box` (or extend the bounds on the existing one — your call) so that the *intended* solution to the second searchlight is pushing a box into its beam path to create a standing shadow the player can shelter behind, rather than pure timing/memorization. This means: the box's collider should be able to occlude/block the searchlight's `hits()` check when positioned between the light and the player. Look at `Searchlight.update()` in `Hazards.js` — currently it only checks angle-to-player, not line-of-sight occlusion. Add a simple occlusion check: if a solid collider (the box) is between the light's origin and the player's x-position at the beam's current angle, `exposure` shouldn't accumulate.
- This makes "push the box" and "avoid the light" the same action instead of two unrelated beats, which is the kind of combinatorial puzzle the game is currently missing everywhere.

**Also add one genuine non-linear detour here** (see §3 for the general shape): a short dead-end alcove reachable only by pushing the *first* box in an unexpected direction (e.g., pushing it left into a gap instead of right toward the lever), leading to the chapter's echo collectible. Right now `summer.js`'s echo (`x: -6.8, y: 1.35`) just sits in the open on the critical path — move it into this detour instead, so finding it is optional and rewards experimentation rather than being unavoidable scenery.

---

## 2. Spring's box puzzle needs a "first attempt should fail, teaching you the real answer" beat

**Current state:** now that the jump-skip is closed, the floating-box puzzle is: walk up, hold grab, push right, it sinks at `grateX`, done. One obvious action, no discovery.

**What to build:** Reuse the two-step discovery pattern that already works well in `autumn.js` (the `powerLever` → `leverC` → relatch chain in `ChapterLoader.js`'s `loadWorks`) — a player should be able to try the "obvious" thing first and have it not quite work, revealing what's actually needed.

- Concretely: make the box need to be positioned at the grate while something else is also true — e.g., the water level in `tunnelWater` needs to be *raised* first (by throwing a submerged lever inside the safe pool or tunnel) so the box actually floats high enough to reach the grate's lip; pushing it there before that raises it will just leave it short/beached. This is a smaller-scope version of the "drain sequence" puzzle that was cut from the original build spec for schedule reasons — you don't need the full drain/raise world-transform system, just one lever that changes `floatWater`'s effective height enough to matter for whether the box clears the grate.
- Keep this scoped: one new lever, one conditional on the existing `FloatingBox.update()` sink check in `Interactables.js`. Don't build a full water-level world-transform system.

---

## 3. One genuine non-linear detour (general shape, if not already covered by §1)

If you built the Summer detour in §1, you can skip this section. Otherwise, pick Autumn (it already has the richest mechanical vocabulary to remix) and add:

- A short dead-end branch off the main corridor — doesn't need to loop back, just needs to feel like the player left the critical path on purpose.
- Reachable only via a beat that isn't required for the main route (e.g., sinking the FloatingBox-style box **from the wrong side** to make a step down into a lower area rather than across).
- House the chapter's echo there, same reasoning as §1: exploration should be rewarded, not free.

---

## 4. General chapter pacing

Don't pad chapters with empty walking distance. Instead, wherever you add new content above, let the chapter's actual footprint grow to match (extend `colliders`/`backgrounds`/`checkpoints` as needed, same pattern already used in every chapter file) rather than cramming new interactables into the existing length. Add checkpoints near any new gate so a failed attempt costs seconds, not a full chapter replay — same principle already followed everywhere else in these files.

---

## Constraints (carry over — don't relitigate)

- No new npm dependencies.
- Vanilla Three.js primitives/procedural geometry only.
- Procedural WebAudio only (`Audio.js`) — reuse existing SFX (`leverClunk`, `splash`, etc.) for any new interactables rather than inventing new sound systems.
- Don't touch `Physics2D.js`, the audio profile system, the camera-zone system, or the ending sequence in `main.js` — all working, out of scope for this pass.
- Test every new gate against a full-speed running jump before considering it done (see the audit rule in §0). This is the one thing that broke trust last time — don't skip it.
- No TypeScript, no test framework — verify by playing it in `vite dev`.
