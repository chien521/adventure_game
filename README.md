# What the Snow Remembers

**[Play the game](https://chien521.github.io/adventure_game/)**

*What the Snow Remembers* is a browser-based 3D puzzle-platform adventure about crossing four changing landscapes and recovering fragments of a life that has been forgotten. Each season is a compact, hand-built challenge where blocks, triggers, doors, lifts, levers, and routes must be read as one connected machine.

The game is built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). It runs entirely in the browser with no account, download, or backend required.

## At A Glance

- Four playable chapters: spring, summer, autumn, and winter.
- Optional memory keys that change the final ending text.
- Physics-based block carrying, placement, falling, and lift support.
- Route-switching puzzles with doors, levers, floor triggers, bridges, and moving platforms.
- Checkpoint and route-aware recovery designed to return the player to a useful puzzle state.
- A built-in two-page how-to-play guide with live gameplay examples.
- A live run timer, and optional VIVERSE integration: play as your own VIVERSE avatar, browse global speedrun records with no login required, and submit your own time once you connect an account.

## Screenshots

| Spring: Home Falls Behind | Summer: Two Shadows Linger |
| --- | --- |
| ![Spring chapter](public/chapter-spring.png) | ![Summer chapter](public/chapter-summer.png) |
| Autumn: One Shadow Remains | Winter: Snow Remembers Home |
| ![Autumn chapter](public/chapter-autumn.png) | ![Winter chapter](public/chapter-winter.png) |

## Story And Goal

The Traveler wakes in a landscape of snow with only one certainty: something has been left unfinished. His path moves through spring, summer, autumn, and winter, but the journey is not simply across four places. It is a walk backward through a life, from childhood departure to companionship, loss, and the quiet approach to home.

Nothing is explained during play. Instead, the story lives in recurring thresholds, distant silhouettes, changing routes, and the house that gradually comes into view. Snow marks the present moment; the locket records the Traveler's willingness to remember. Reaching each chapter's portal advances the journey, while the optional memory keys restore fragments of what he has spent a lifetime trying not to face.

### A Life In Four Seasons

- **Spring — Beginning:** A child leaves the small world that first held him and steps into something larger alone.
- **Summer — Bloom:** Warmth, companionship, and a memory of being seen by someone who made the world feel shared.
- **Autumn — Falling:** The familiar world changes through absence, and the Traveler learns the shape of a goodbye.
- **Winter — Stillness:** With the journey nearing its end, the house becomes clearer: a place that may be home, rest, or both.

The keys never gate progress. They change only what the Traveler can understand at the end, making remembrance a choice rather than a requirement.

## How To Play

| Input | Action |
| --- | --- |
| `A` / `D` or Left / Right Arrow | Move |
| `W` or Space | Jump |
| `E` | Carry or place a block; use a nearby lever |
| `Q` | Use a nearby visible portal |
| Escape | Pause |

### Puzzle Vocabulary

**Blocks** are the primary movable tools. Carry one with `E`, then press `E` again to release it onto a supported surface. A block can activate floor triggers, hold a route open, or provide a launch point: standing on a block before jumping grants one additional jump.

**Numbered triggers** have limited uses. Once their remaining activations are spent, they lock. **Green infinity triggers** can be reused by moving the block off the plate and placing it back again.

**Levers** can open a route, reveal a hidden interaction, activate a lift, or expose a portal. Some are one-shot controls; others can be toggled. **Doors** do not merely disappear: in several puzzles they physically move between ground and upper routes, so changing one route can block or open another.

**Portals** are chapter exits and return points. A portal must be visible and approached before `Q` can activate it. **Checkpoints** and route-aware recovery keep failures short while preserving the puzzle's intended state.

## Chapters

### 01. Spring - The Floodline

A green, flooded threshold where the basic language of the game is introduced: carry a block, use it on plates, open doors, and chain route changes across a canyon. The optional key is behind its own block-and-trigger problem.

### 02. Summer - The Outskirts

A bright industrial landscape built around stacked climbable structures, distant banks, and a bridge over a canyon. The chapter layers levers, doors, platforms, and a high hidden-key route that requires careful block use and jumping.

### 03. Autumn - The Works

An orange mechanical ascent with moving crushers, alternating footholds, a vertical key route, and a lift that reconnects distant levels. The chapter emphasizes timing, safe staging points, and choosing the correct return route.

### 04. Winter - The Core

A white, two-level puzzle centered on a manual elevator and two coupled routes. The block can travel on the lift, reusable infinity triggers move blockers between ground and upper paths, and separate levers reveal the key and exit portal. Winter also has deliberate recovery rules: a fall from the right wall returns to the top route, while right-void falls restore the player and block to the appropriate route beside the relevant lever.

## VIVERSE Integration

The game is fully playable with no account, and never contacts VIVERSE unless you explicitly ask it to:

- **Use my VIVERSE avatar** (start screen) — logs into your VIVERSE account and replaces the default traveler with your own equipped avatar for the rest of the session.
- **See records** (start screen and ending screen) — opens a records window with two global leaderboards, fastest full run and fastest run with all 4 keys, viewable without logging in.
- **Submit my run** (ending screen, after finishing all four chapters) — only enabled once you've connected a VIVERSE account; uploads your run time to the full-run leaderboard, and to the all-keys leaderboard too if you collected all four memory keys.

## Technical Notes

The game uses vanilla ES modules with a small custom 2D gameplay layer rendered through Three.js:

- `src/main.js` owns the game loop, chapter transitions, UI, pause flow, and ending.
- `src/chapters/` holds data-driven positions and puzzle configuration for each season.
- `src/world/ChapterLoader.js` builds each chapter's runtime mechanics.
- `src/world/Interactables.js` contains blocks, levers, doors, and pressure plates.
- `src/core/` contains input, camera, audio, checkpoints, physics, and game-loop utilities.
- `src/viverse/ViverseSession.js` is the single entry point for VIVERSE login, avatar, and leaderboard calls.
- `public/` contains the chapter and guide screenshots used by the menu and documentation.

## Run Locally

Prerequisite: a current Node.js LTS installation.

```bash
npm install
npm run dev
```

Vite prints the local development URL, usually `http://127.0.0.1:5173/`.

VIVERSE login and leaderboard submission only work once the game is actually hosted on a VIVERSE World (see `.env.example` for the required `VITE_VIVERSE_*` variables); locally they show a graceful "unavailable" status instead.

### Production Build

```bash
npm run build
npm run preview
```

`npm run build` outputs the production site to `dist/`.

## Deployment

Pushes to `main` are automatically built and deployed to GitHub Pages through [the deployment workflow](.github/workflows/deploy.yml).
