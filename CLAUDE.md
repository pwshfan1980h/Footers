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

**ORDER UP!** is a browser-based time-management arcade game built with Phaser 3 and Vite. Players work as a sandwich artist: clicking ingredients from bins, placing them on moving conveyor belt trays in strict order, and applying treatments to complete orders before trays slide past the finish line. The game spans 5 days (Monday-Friday) with increasing difficulty. 3 missed orders = game over.

## Architecture

**Entry:** `index.html` loads `src/main.js`, which initializes a 1024x768 Phaser game with FIT scaling.

**Scene flow:** `BootScene` → `MenuScene` → `GameScene` ↔ `DayEndScene` → (after day 5) `WinScene`. `GameOverScene` triggers on 3 strikes.

**Key files:**

- `src/scenes/GameScene.js` (~1750 lines) — All core gameplay: conveyor belt, bins, click-to-place system, tray spawning, order generation, scoring, treatment system, and the game loop. This is by far the largest file.
- `src/data/ingredients.js` — Game data: ingredient definitions (colors, categories), bin layout, treatment definitions, and `DAY_CONFIG` (orders, speed, spawn intervals, treatment chance per day).
- `src/SoundManager.js` — Singleton (`soundManager`) using Web Audio API to procedurally generate all sounds. No audio files exist.

**Graphics:** All visuals are drawn with Phaser Graphics primitives (no sprite sheets or image assets). Ingredients have category-specific shapes (bread domes, meat ovals, cheese rectangles, wavy lettuce, tomato circles, sauce zigzags).

**Interaction model:** Click-to-place (not drag-and-drop). Click a bin item to pick up, click a tray to place. ESC cancels. Treatments are toggled on, then clicked onto trays. SPACE key speeds up the belt 2.5x.

**Order system:** Orders are randomly generated with bread → meat → optional cheese → optional toppings → optional sauce → top bread. Ingredients must be placed in exact ticket order. Treatments (toasted, to-go, salt & pepper, oil & vinegar) are unlocked starting day 2.

**Scoring:** +100 per completed order, +50 speed bonus if scored before x=300. Penalty of -25 for wrong ingredient placement.
