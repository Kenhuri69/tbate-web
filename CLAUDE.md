# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TBATE RPG — a 2D action-RPG built on **Phaser 3** (loaded via CDN). The project is a static site: there is **no build step, no bundler, no `package.json`, and no `node_modules`**. All source is hand-written ES6 classes that run directly in the browser.

Comments and in-game UI strings are in French. Keep that convention when editing existing files.

## Run / deploy

- **Local dev**: open `index.html` directly (`file://` works) or serve the repo root with any static HTTP server (`python3 -m http.server`, `npx serve`, etc.). There is nothing to install.
- **Audio debug**: open `audio-test.html` to verify `AudioContext` works on the target device.
- **Deploy**: `.github/workflows/static.yml` deploys the entire repo to GitHub Pages on every push to `main`.
- **Tests / lint**: none configured. Validation is purely manual in-browser.

## Module loading model — read before editing

Every JS file declares classes/constants on the global scope. **There are no `import`/`export` statements**, no `window.X = X` registration in most files. Modules are loaded by `<script>` tags in `index.html` in **strict dependency order**:

1. `src/config/*.js` — pure-data constants (`SPELLS`, `MANA_CORE_LEVELS`, `STAT_*`, `DUNGEON_CONFIG`, `AUDIO_CONFIG`, `TILE`, `ROOM_TYPES`, `playerState`).
2. `src/data/roomContent.js` — narrative hooks (depends on `ROOM_TYPES`).
3. `src/generators/*.js` — `TextureGenerator`, `DungeonGenerator`, `DungeonRenderer`.
4. `src/systems/*.js` — `StatsSystem`, `ManaCoreSystem`, `SpellSystem`, `AudioSystem`.
5. `src/objects/*.js` — `Aura`, `Projectile`, `Enemy`, `Player`.
6. `src/ui/*.js` + `src/managers/StoryManager.js`.
7. `src/scenes/*.js` — `Level1Scene`, `DialogueScene`, `GameScene`.
8. `src/main.js` — entry point that constructs `new Phaser.Game(config)`.

**When you add a new file, you must add a matching `<script>` tag in `index.html`** in the correct dependency tier, otherwise the global will be `undefined` at use time. The `index.html` comments document each tier.

## Stale / duplicate files — do not edit by mistake

Several leftover files exist outside the loaded module graph. None of them are referenced by `index.html`; they look like recovery stubs from prior tools. **Treat them as junk** unless explicitly asked to clean them up:

- `/SpellBar.js` (root) — bogus React/JSX fragment.
- `/path/to/SpellBar.js`, `/path/to/DungeonGenerator.js` — placeholder stubs with broken `export default`.
- `/src/src/managers/StoryManager.js` — older alternate that calls `scene.load.json` at runtime.
- `/src/systems/StoryManager.js` — ES-module variant (uses `export`); incompatible with the load model.

The **active** `StoryManager` is `/src/managers/StoryManager.js` (the one referenced by `index.html`). When tweaking story flow, edit only that file.

## Architecture

### Scenes
The Phaser scene list in `src/main.js` is `[Level1Scene, GameScene, DialogueScene]`. The first scene starts on launch.

- **`Level1Scene`** — scripted prologue. Loads a fixed map from `assets/maps/level1_leywin.json` (Maison Leywin), spawns NPCs (Alice, Reynolds), gates progression by accumulated meditation **essence thresholds** defined in the JSON, spawns rat enemy waves, and unlocks the Mana Core at essence ≥ 100.
- **`GameScene`** — procedural BSP dungeon. `DungeonGenerator` produces a tile grid + room metadata; `DungeonRenderer` paints it and emits enemy spawns and trigger zones. Story dialogue triggers via `room:entered`.
- **`DialogueScene`** — overlay launched via `scene.launch('DialogueScene', { conversations, onComplete })`. Pauses physics in the parent scene while active.

To switch the initial scene (e.g., skip the prologue), reorder the `scene` array in `src/main.js`.

### Event bus

Cross-system communication goes through `scene.events.emit/on`. The important channels:

| Event | Emitter → Listener | Purpose |
|---|---|---|
| `room:entered` | `DungeonRenderer` trigger zones / Level1 → `StoryManager` | Fire dialogue for a hookId |
| `manacore:levelup` | `ManaCoreSystem` → `StatsSystem`, `Player` | Apply tier passives + flash |
| `manacore:meditation:start/stop` | `ManaCoreSystem` → `HUD` | Show/hide meditation indicator |
| `stats:changed` | `StatsSystem` → `HUD`, `StatsPanel`, `ManaCoreSystem` | Refresh HUD; interrupts meditation if HP dropped |
| `player:levelup` | `StatsSystem` → `Player`, `HUD` | Floating text + free stat points |
| `enemy:died` | `Enemy` → `GameScene` | Award XP + roll resource drop |
| `spell:cast`, `spell:changed` | `SpellSystem` → `SpellBar`, audio | UI sync |
| `mobile:cast`, `mobile:nextspell`, `mobile:meditate`, `mobile:menu` | `MobileControls` → `SpellSystem`, `ManaCoreSystem`, `StatsPanel` | Touch input |

When adding a feature, prefer wiring through this bus instead of cross-module direct calls.

### Story / dialogue pipeline

1. Each dialogue is a JSON file in `assets/data/story/<hookId>.json` with shape `{ conversations: [{name, text, side}, ...] }`.
2. Scenes preload the JSONs by key `dialogue_<hookId>` (`StoryManager.preloadDialogues` for the BSP scene, hardcoded list in `Level1Scene.preload()` for the prologue).
3. `StoryManager` listens for `room:entered`, looks up the cache by `dialogue_${hookId}`, and launches `DialogueScene` once per hookId per run (deduped via a `Set`).
4. Hook IDs are assigned to BSP rooms by `DungeonGenerator._assignHooks` (e.g., `start_zone`, `floor_1_boss`, `floor_1_exit`, `floor_1_story_<n>`).

To add a new dialogue: create the JSON, add the hookId to the appropriate `preloadDialogues`/preload list, and ensure something emits `room:entered` with that hookId.

### Mana Core / stats / spells progression

- `playerState` (in `manaCore.js`) is a **shared global mutable singleton** holding `manaCoreLevel`, `manaEssence`, `inventory`. Both scenes mutate it directly. Reset it explicitly (`playerState.manaEssence = 0; playerState.manaCoreLevel = 0`) when starting a fresh run — `Level1Scene.create()` does this; new scenes should too.
- Mana Core levels up **only** by accumulated essence (meditation tick = 1 essence per 3 s, plus consumable resources). Essence is **never** awarded by combat.
- `StatsSystem` distinguishes `base` (player-allocated, capped per Mana Core tier in `STAT_TIERS`) from `passive` (Mana Core tier bonuses from `CORE_PASSIVES`). `total(key)` sums them.
- Combat XP feeds the **player level** (separate from Mana Core), which grants 3 free stat points per level.
- All gameplay tuning lives in `src/config/*.js`. **Do not hardcode balance numbers in systems.**

### Mobile vs desktop

Both inputs run simultaneously. Detection is by viewport orientation in `src/main.js` (initial sizing) and `_setupCamera`/`MobileControls.resize` (zoom and button reflow on rotate). The player joystick uses pointer IDs to coexist with the cast-pointer; when adding new touch listeners, check `pointer.id !== mobileControls._joyPointerId` to avoid stealing joystick input.

### Audio

`AudioSystem` builds everything via Web Audio API (no audio assets). All frequencies, envelopes, and the procedural pentatonic music live in `src/config/audio.js`. The system requires a user gesture to unlock — it is instantiated **after** `MobileControls` in `GameScene.create()` so the existing `pointerdown` listeners survive the audio init.

## Conventions

- New gameplay constants → add to `src/config/*.js`. New narrative content → JSON in `assets/data/story/`. Avoid putting tuning numbers inside system classes.
- Each file has a header doc-comment listing the globals it exposes and depends on. Maintain that pattern.
- Scenes use `_camelCase` for private methods, public API is bare `camelCase`.
- Phaser physics uses `arcade` with no gravity. Add colliders/overlaps in scene `create()`, not in object constructors.

## Workflow rules (project-specific)

### Plan file for every change

**For every change**, write a plan file before editing code, then execute strictly from that file. The plan is the source of truth — no out-of-plan edits.

- Location: `plans/<short-slug>.md` (create the `plans/` directory if missing).
- Required sections:
  - **Goal** — one sentence, in user terms.
  - **Success criteria** — checkable conditions (test passes, screenshot matches, no console error, etc.).
  - **Steps** — numbered, each with a verify check (`Step → verify: …`).
  - **Out of scope** — explicit list of things you will NOT touch.
- Update the plan file as you progress (check off steps, note deviations). If reality forces a change, edit the plan first, then resume.
- Keep the plan file in the commit so the rationale is reviewable.

### Regression check via headless Chrome

After each meaningful change, run a headless-Chrome smoke check against the live page (loaded as `file://index.html` or via a local static server) to confirm:

1. The page loads with **zero console errors and zero unhandled promise rejections**.
2. The Phaser canvas mounts (`document.querySelector('canvas')` exists and has non-zero size).
3. The scene flagged by the change behaves as intended (capture a screenshot or read DOM/canvas pixel data for the assertion).

A minimal recipe (Puppeteer or Playwright via `npx --yes`, no install required):

```bash
npx --yes puppeteer-core --version  # or use playwright
# Or, with Chrome's headless mode directly:
google-chrome --headless --disable-gpu --virtual-time-budget=5000 \
  --screenshot=/tmp/tbate.png --window-size=1280,720 \
  "file://$PWD/index.html"
```

Any new feature or fix must be accompanied by a check that:
- **Reproduces** the bug / demonstrates the missing behavior **before** the fix.
- **Passes** after the fix.
- **Re-runs** existing scenarios (load `index.html`, switch to `GameScene`, fire one spell, enter one room) to guard against regression.

If headless Chrome is unavailable in the environment, state that explicitly and document the manual steps you executed in the browser instead — never claim success without verification.

## Behavioral guidelines

These bias toward caution over speed. For trivial tasks (one-line typo fixes, obvious renames), use judgment.

### 1. Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Test: would a senior engineer call this overcomplicated? If yes, simplify.

### 3. Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code (e.g. the stale files listed above), mention it — don't delete it without being asked.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Test: every changed line should trace directly to the user's request.

### 4. Goal-driven execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan in the plan file:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") force constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions arrive before implementation rather than after mistakes.
