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

**Footers** is a browser-based time-management arcade game built with Phaser 3 and Vite. Players run a galactic cantina on a desert planet, picking ingredients from bins and assembling sandwiches on a prep station to fill customer orders. Customers enter through saloon doors, walk to the counter, and wait while you build. 3 missed orders = game over. The game plays like a rhythm game — hotkeys auto-place ingredients directly, with a combo system rewarding speed.

## Architecture

**Entry:** `index.html` loads `src/main.js`, which initializes a 1920x1080 Phaser game with FIT scaling.

**Scene flow:** `BootScene` → `TitleScene` → `GameScene` → `GameOverScene`. `DayEndScene` and `WinScene` are registered but not yet wired into the current loop (reserved for campaign).

**Key files:**

- `src/scenes/GameScene.js` — Core gameplay scene. Most logic is delegated to manager classes.
- `src/managers/` — Gameplay managers: `GameSceneBackground`, `GameSceneBins`, `GameSceneHUD`, `GameSceneTicketBar`, `GameSceneInteraction`, `GameSceneScoring`, `GameSceneTray`, `PrepTrack`, `ParticleManager`, `WarningSystem`, `TutorialOverlay`, `SettingsMenu`, `CustomerManager`, `CustomerDeck`, `NotificationManager`.
- `src/data/theme.js` — Cantina visual theme (warm adobe/sandstone/brass palette) and layout constants.
- `src/data/ingredients.js` — Ingredient definitions (colors, categories), bin layout, treatment definitions, and `DIFFICULTY_PROGRESSION` (spawn intervals).
- `src/data/constants.js` — Shared constants: layout dimensions, scoring values, order generation parameters, fonts.
- `src/data/GameState.js` — Persistent game state across scenes. Uses `localStorage`.
- `src/data/customerPersonality.js` — Customer personality data.
- `src/SoundManager.js` — Singleton (`soundManager`) using Web Audio API to procedurally generate all SFX. No audio files.
- `src/MusicManager.js` — Procedural ambient music using Web Audio API.
- `src/utils/colorUtils.js` — Shared color utilities (`darkenColor`, `lightenColor`).
- `src/utils/uiHelpers.js` — Reusable button factory for menu scenes.

**Graphics:** SVG assets in `public/assets/` for ingredients, trays, and bin contents (breads, meats, cheeses, toppings, sauces). Scene chrome (cantina walls, windows, bins, prep station) drawn with Phaser Graphics primitives. No sprite sheets or image atlas.

**Visual theme:** Warm cantina palette throughout — adobe walls, dark wood beams, brass/copper trim, warm amber lighting. Desert landscape visible through arched windows. Ceiling lighting system with dark gradient and warm lantern light cones. No cold blue/cyan anywhere in the UI.

**Interaction model:** Hotkey-driven auto-place (primary). Press a hotkey to instantly place an ingredient on the active tray. Click-to-place also supported (click bin item to pick up, click tray to place). ESC cancels held item. Combo system tracks consecutive correct placements with rising audio pitch and visual counter.

**Prep station model:** One static `PrepTrack` slot (cutting board, 210x140px). A tray spawns there, a customer walks through saloon doors to the counter, the ticket appears in the ticket bar, and the player assembles the sandwich. On completion, the customer departs back through the doors.

**Order system:** Orders are randomly generated: bread → meat → optional cheese → optional toppings → optional sauce → top bread. Ingredients must be placed in exact ticket order. Treatments (toasted, to-go, salt & pepper, oil & vinegar) can be applied after ingredients.

**Scoring:** Score = `orderValue * SCORE_MULTIPLIER * speedMultiplier`. Speed bonus ranges from 1x (slow) to 4x (instant) based on fraction of customer patience used. Combo system increments on consecutive correct placements with audio escalation. Penalty of -25 score for wrong ingredient.

**Fonts:** Oxanium (general UI), Orbitron (order tickets and ingredient hints — sci-fi style).

## Campaign System (Planned — "The Golden Spatula Tour")

The game is being extended with a 7-chapter linear campaign and supporting systems.

**Campaign chapters (7):** Each chapter targets a location with specific objectives, ingredient/treatment unlocks, difficulty overrides, and story. Chapters: (1) Hub — basics, (2) Cygnus — lunch rush, (3) Pickaxe Rock — cheese unlock, (4) Violet Nebula — sauces + zero-tolerance, (5) New Geneva — treatments + speed, (6) Diamond Berth — full treatments + VIP, (7) Rust Belt — finale for the Golden Spatula.

**Planned new files:**
- `src/data/campaign.js` — Chapter definitions (objectives, unlocks, difficulty, story text).
- `src/data/encounters.js` — Random encounter pool (~15-20 events with choices/effects).
