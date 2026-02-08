# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run dev      # Start Vite dev server with hot reload
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

No test runner, linter, or formatter is configured.

## Project Overview

**Footers** is a browser-based time-management arcade game built with Phaser 3 and Vite. Players run a space food truck, picking ingredients from bins and assembling sandwiches on a static prep station to fill customer orders. Customer vessels dock at the ship's window, place orders, and wait while you build. 3 missed orders = game over. Between shifts, players navigate a system map to travel between locations with different difficulty modifiers.

## Architecture

**Entry:** `index.html` loads `src/main.js`, which initializes a 1024x768 Phaser game with FIT scaling.

**Scene flow:** `BootScene` → `SystemMapScene` → `GameScene` ↔ `DayEndScene` → `SystemMapScene`. `GameOverScene` triggers on 3 strikes. `WinScene` after completing all days.

**Key files:**

- `src/scenes/GameScene.js` (~360 lines) — Core gameplay scene. Most logic is delegated to manager classes.
- `src/managers/` — Gameplay managers: `GameSceneBackground`, `GameSceneBins`, `GameSceneHUD`, `GameSceneTicketBar`, `GameSceneInteraction`, `GameSceneScoring`, `GameSceneTray`, `PrepTrack`, `ParticleManager`, `WarningSystem`, `TutorialOverlay`, `SettingsMenu`, `RevenueChallenges`, `CustomerVessels`, `BoidManager`. System map managers: `MapBackground`, `MapHUD`, `MapVessels`, `TravelManager`.
- `src/data/ingredients.js` — Ingredient definitions (colors, categories), bin layout, treatment definitions, and `DIFFICULTY_PROGRESSION` (spawn intervals).
- `src/data/constants.js` — Shared constants: layout dimensions, scoring values, order generation parameters.
- `src/data/GameState.js` — Persistent game state across scenes (money, day, unlocks). Uses `localStorage`.
- `src/data/locations.js` — System map location data with per-location modifiers (speed, spawn rate, tip multiplier).
- `src/data/customerPersonality.js` — Customer personality data.
- `src/SoundManager.js` — Singleton (`soundManager`) using Web Audio API to procedurally generate all SFX. No audio files.
- `src/MusicManager.js` — Procedural ambient engine drone using Web Audio API.
- `src/utils/colorUtils.js` — Shared color utilities.
- `src/utils/ShipDrawing.js` — Procedural ship rendering for the system map.

**Dead code:** `GameSceneBelt.js` exists but is not imported anywhere. `RobotArm.js` was deleted.

**Graphics:** SVG assets in `public/assets/` for ingredients, trays, and bin contents (breads, meats, cheeses, toppings, sauces). Scene chrome (walls, windows, bins, prep station) drawn with Phaser Graphics primitives. No sprite sheets or image atlas.

**Interaction model:** Click-to-place (not drag-and-drop). Click a bin item to pick up, click the prep tray to place. ESC cancels held item. Treatments are toggled on, then clicked onto trays. Hotkeys shown with F1. Bread hotkeys: Z/X/C for white/wheat/sourdough. Hotkey presses play a distinct `hotkeySelect()` sound (not the mouse-click `robotPickup` sound). Keys use `emitOnRepeat = false` to prevent key-repeat spam.

**Prep station model:** One static `PrepTrack` slot (cutting board). A tray spawns there, a `CustomerVessel` docks at the window, the ticket appears in the ticket bar, and the player assembles the sandwich in place. On completion, the customer vessel undocks and departs. No conveyor belt or moving trays.

**Order system:** Orders are randomly generated: bread → meat → optional cheese → optional toppings → optional sauce → top bread. Ingredients must be placed in exact ticket order. Treatments (toasted, to-go, salt & pepper, oil & vinegar) are unlocked on later days.

**Scoring:** Order value is based on ingredient prices (`BASE_PRICE` + per-ingredient + treatment prices) multiplied by location tip modifier. Score = `orderValue * SCORE_MULTIPLIER`. Penalty of -25 score for placing the wrong ingredient.

## Campaign System (Planned — "The Golden Spatula Tour")

The game is being extended with a 7-chapter linear campaign and supporting systems. The game name will likely change to match the campaign narrative.

**Modes:** BootScene routes based on save data — if `localStorage` has existing progress, skip the title screen and drop directly onto SystemMapScene. Fresh players see a mode-select: Campaign / Freeplay.

**Scene flow with campaign:** `BootScene` → (has save? → `SystemMapScene`) or (no save? → title screen → `SystemMapScene`). Campaign: `SystemMapScene` (signal) → travel (encounters) → `GameScene` (objectives) → `DayEndScene` (results + story) → `SystemMapScene` (next signal). `GameOverScene` offers "Retry Chapter". `WinScene` after chapter 7.

**Dispatch Signal system:** On each map load, the player spawns undocked at their last world position. A dispatch signal (pulsing radar-ping animation) appears at a target location with flavor text. The player must travel there to dock and open shop. After a shift, a new signal appears at a different location. This forces the travel system into every loop iteration. In campaign mode, signals are deterministic (next chapter). In freeplay, weighted random favoring unvisited locations.

**Travel Encounters:** ~40% chance per travel of an FTL-style random text encounter. A panel appears mid-warp with a scenario and 2-3 choices, each with different consequences. Effects modify the next shift via a `shiftModifiers` object (tip bonuses, disabled treatments, patience changes, bonus customers, immediate cash). Encounters are drawn from a pool without repeats. Campaign chapters can force specific story encounters. Recurring characters: GRILL-9000 (robot rival), Sal (veteran trucker), Zorp Mellindra (food critic), The Smuggler.

**Campaign chapters (7):** Each chapter targets one of the 7 locations, with specific objectives, ingredient/treatment unlocks, difficulty overrides, story intro/completion/failure text, and optional forced encounters. Ingredients and treatments are locked until their chapter unlocks them; order generation is constrained to match. Chapters: (1) Hub — basics, (2) Cygnus — lunch rush, (3) Pickaxe Rock — cheese unlock, (4) Violet Nebula — sauces + zero-tolerance, (5) New Geneva — treatments + speed, (6) Diamond Berth — full treatments + VIP, (7) Rust Belt — finale for the Golden Spatula.

**Campaign state** (planned fields for `GameState.js`): `campaignMode`, `campaignChapter`, `chaptersCompleted[]`, `pendingSignal`, `shiftModifiers`, `seenEncounters[]`, `campaignMoney`.

**Planned new files:**
- `src/data/campaign.js` — Chapter definitions (objectives, unlocks, difficulty, story text).
- `src/data/encounters.js` — Random encounter pool (~15-20 events with choices/effects).
- `src/managers/DispatchSignal.js` — Signal ping visuals + dispatch message on the map.
- `src/managers/EncounterOverlay.js` — Text panel UI for travel encounters.

**Reset data:** Settings menu (ESC) will include a "Reset All Data" button with confirmation prompt. Clears all `localStorage` keys and restarts at BootScene. Campaign-specific reset ("New Campaign") on the title screen clears campaign fields only, preserving freeplay stats and high scores.
