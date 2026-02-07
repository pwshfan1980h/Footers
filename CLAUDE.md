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

**Footers** is a browser-based time-management arcade game built with Phaser 3 and Vite. Players control a robot arm to pick up ingredients from bins and place them on moving conveyor belt trays in strict order, applying treatments to complete orders before trays slide past the finish line. The game spans 5 days (Monday-Friday) with increasing difficulty. 3 missed orders = game over.

## Architecture

**Entry:** `index.html` loads `src/main.js`, which initializes a 1024x768 Phaser game with FIT scaling.

**Scene flow:** `BootScene` → `SystemMapScene` → `GameScene` ↔ `DayEndScene` → `SystemMapScene`. `GameOverScene` triggers on 3 strikes. `WinScene` after completing all days.

**Key files:**

- `src/scenes/GameScene.js` (~450 lines) — Core gameplay scene. Most logic is delegated to manager classes.
- `src/managers/` — Extracted subsystems: `GameSceneBackground`, `GameSceneBelt`, `GameSceneBins`, `GameSceneHUD`, `GameSceneTicketBar`, `GameSceneInteraction`, `GameSceneScoring`, `GameSceneTray`, `RobotArm`, `PrepTrack`, `ParticleManager`, `WarningSystem`, `TutorialOverlay`, `SettingsMenu`, `RevenueChallenges`. Also `MapBackground`, `MapHUD`, `MapVessels`, `BoidManager`, `CustomerVessels`, `TravelManager` for the system map.
- `src/data/ingredients.js` — Ingredient definitions (colors, categories), bin layout, treatment definitions, and `DAY_CONFIG` (orders, speed, spawn intervals, treatment chance per day).
- `src/data/GameState.js` — Persistent game state across scenes (money, day, unlocks).
- `src/data/locations.js` — System map location data.
- `src/SoundManager.js` — Singleton (`soundManager`) using Web Audio API to procedurally generate all sounds. No audio files exist.
- `src/MusicManager.js` — Background music generation.
- `src/utils/colorUtils.js` — Shared color utilities.
- `src/utils/ShipDrawing.js` — Procedural ship rendering for the system map.

**Graphics:** SVG assets in `public/assets/` for ingredients, trays, and bin contents (breads, meats, cheeses, toppings, sauces). Scene chrome (walls, conveyor, windows, bins) drawn with Phaser Graphics primitives. No sprite sheets or image atlas.

**Interaction model:** Click-to-place (not drag-and-drop). Click a bin item to pick up, click a tray to place. ESC cancels. Treatments are toggled on, then clicked onto trays. SPACE key speeds up the belt 2.5x.

**Order system:** Orders are randomly generated with bread → meat → optional cheese → optional toppings → optional sauce → top bread. Ingredients must be placed in exact ticket order. Treatments (toasted, to-go, salt & pepper, oil & vinegar) are unlocked starting day 2.

**Scoring:** +100 per completed order, +50 speed bonus if scored before x=300. Penalty of -25 for wrong ingredient placement.
