import Phaser from 'phaser';
import { INGREDIENTS, BIN_LAYOUT, TREATMENTS, DIFFICULTY_PROGRESSION } from '../data/ingredients.js';
import { gameState } from '../data/GameState.js';
import { soundManager } from '../SoundManager.js';
import { musicManager } from '../MusicManager.js';
import { DEBUG } from '../config.js';
import { BoidManager } from '../managers/BoidManager.js';
import { TutorialOverlay } from '../managers/TutorialOverlay.js';
import { WarningSystem } from '../managers/WarningSystem.js';
import { ParticleManager } from '../managers/ParticleManager.js';
import { RobotArm } from '../managers/RobotArm.js';
import { SettingsMenu } from '../managers/SettingsMenu.js';
import { PrepTrack } from '../managers/PrepTrack.js';
import { CustomerVessels } from '../managers/CustomerVessels.js';
import { RevenueChallenges } from '../managers/RevenueChallenges.js';

function darkenColor(color, factor) {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    // Endless mode - no days
    this.currentScore = 0;
    this.highScore = this.loadHighScore();
    this.gameTime = 0; // Track elapsed time for difficulty progression

    // Location modifiers from SystemMap
    this.locationData = data?.location || null;
    this.locationModifiers = data?.modifiers || { speedMult: 1.0, spawnMult: 1.0, tipMult: 1.0 };
  }

  loadHighScore() {
    try {
      const stored = localStorage.getItem('footers_highscore');
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      localStorage.setItem('footers_highscore', score.toString());
    } catch (e) {
      // localStorage not available
    }
  }

  create() {
    // Endless mode - start with easy difficulty
    const diff = DIFFICULTY_PROGRESSION;

    // --- isometric constants ---
    this.ISO_SKEW = 0.25;
    this.TABLE_SKEW = 50;

    // === RETRO-FUTURISTIC SPACE DINER COLOR PALETTE ===
    // Space colors (unchanged — windows still show space)
    this.SPACE_BLACK = 0x050510;
    this.SPACE_DEEP = 0x030308;
    this.STAR_WHITE = 0xdddddd;
    this.STAR_BLUE = 0x88bbdd;
    this.STAR_WARM = 0xddccbb;

    // Smoked glass overlay for window
    this.SMOKED_GLASS = 0x0f1520;
    this.SMOKED_GLASS_ALPHA = 0.45;

    // Diner interior — warm walnut wood tones
    this.HULL_DARK = 0x3A2218;      // Dark walnut
    this.HULL_MID = 0x5A3A28;       // Medium walnut
    this.HULL_LIGHT = 0x7A5A3A;     // Light walnut
    this.HULL_BRIGHT = 0x9A7A5A;    // Warm cream-wood
    this.HULL_WARM = 0x8B5A3A;      // Mahogany
    this.PANEL_SEAM = 0x2A1810;     // Dark wood seam

    // Chrome/polished metal accents (kept — fits diner aesthetic)
    this.CHROME_DARK = 0x3a3a48;
    this.CHROME_MID = 0x5a5a68;
    this.CHROME_LIGHT = 0x7a7a88;
    this.CHROME_HIGHLIGHT = 0x9a9aaa;

    // Beam colors (brushed aluminum)
    this.BEAM_DARK = 0x2a2a35;
    this.BEAM_MID = 0x3a3a45;
    this.BEAM_LIGHT = 0x4a4a55;
    this.BEAM_HIGHLIGHT = 0x5a5a65;

    // Neon accents — diner neon pink + warm cream-yellow
    this.NEON_CYAN = 0xFF6B8A;      // Neon pink (signature diner accent)
    this.NEON_ORANGE = 0xee9933;
    this.NEON_MAGENTA = 0xdd33cc;
    this.NEON_GREEN = 0xFFEE88;     // Warm cream-yellow

    // Glass colors — unchanged
    this.GLASS_TINT = 0x3a4a60;
    this.GLASS_HIGHLIGHT = 0x5a7090;
    this.GLASS_EDGE = 0x2a3550;
    this.FRAME_DARK = 0x2a2a35;
    this.FRAME_LIGHT = 0x3a3a45;

    // Walnut counter surface
    this.TABLE_TOP = 0x8B6A4A;      // Walnut counter
    this.TABLE_FRONT = 0x6B4A3A;    // Darker wood front
    this.TABLE_HIGHLIGHT = 0xC8A878; // Wood highlight
    this.TABLE_SHADOW = 0x3A2A1A;   // Deep wood shadow

    // Glass shelf
    this.SHELF_TOP = 0x6a8898;
    this.SHELF_FRONT = 0x4a6878;
    this.SHELF_GLASS = 0x5a7a8a;

    // --- layout constants ---
    this.BELT_Y = 400;
    this.BELT_TOP = 420;
    this.SPEED_BONUS_X = 300;
    this.LAND_Y = 385;
    this.COMPLETED_SPEED_MULT = 2;
    this.COMPLETED_FAST_MULT = 6;

    // --- window layout constants ---
    this.WINDOW_TOP = 145;
    this.WINDOW_BOTTOM = 390;
    this.WINDOW_HEIGHT = 245;
    this.BEAM_WIDTH = 45;
    this.BEAM_POSITIONS = [0, 230, 512 - 22, 794 - 45, 1024 - 45];

    // --- scoring (endless mode) ---
    // currentScore and highScore already set in init()
    this.gameMoney = 0;

    // --- orders (endless mode) ---
    this.trays = [];
    this.tickets = [];
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.orderNumber = 0;
    this.ordersSpawned = 0;

    // --- conveyor (starts easy, gets harder) ---
    this.conveyorSpeed = diff.initialSpeed;
    this.beltOffset = 0;
    this.finishLineX = 80;
    this.isPaused = false;

    // --- spawning (starts slow, speeds up) ---
    this.spawnInterval = diff.initialSpawnInterval;
    this.waitingForNext = true;
    this.sequentialDelay = 0;
    this.spawnTimer = 0;
    this.isStoreOpen = false;
    this._dayEnding = false;

    // --- drag & drop ---
    this.heldItem = null;
    this.isDragging = false;
    this.treatmentItems = {};
    this.glowGraphics = null; // initialized after scene builds

    // --- managers ---
    this.boidManager = new BoidManager(this);
    this.tutorialOverlay = new TutorialOverlay(this);
    this.warningSystem = new WarningSystem(this);
    this.particleManager = new ParticleManager(this);
    this.robotArm = new RobotArm(this);
    this.settingsMenu = new SettingsMenu(this);
    this.prepTrack = new PrepTrack(this);
    this.customerVessels = new CustomerVessels(this);
    this.revenueChallenges = new RevenueChallenges(this);

    // Space bar for speed boost, Shift for slow down
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // F1 for hotkey hints toggle (prevent browser default)
    this.f1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.hotkeyHints = []; // Store all hotkey hint elements
    this.labelHints = []; // Store all ingredient/item labels (toggled with F1)
    this.f1Key.on('down', (event) => {
      if (event && event.originalEvent) event.originalEvent.preventDefault();
      this.showHotkeyHints(true);
    });
    this.f1Key.on('up', () => this.showHotkeyHints(false));
    // Also prevent default at window level
    this.input.keyboard.on('keydown-F1', (event) => {
      event.preventDefault();
    });

    // --- background (space station interior) ---
    this.add.rectangle(512, 384, 1024, 768, this.HULL_DARK);

    // --- space background & windows ---
    this.createSpaceBackground();
    this.createSpaceWindows();

    // --- HUD ---
    this.createHUD();

    // --- ticket bar ---
    this.createTicketBar();

    // --- game area bg (space station interior - now only below belt) ---
    // The large window area (Y:145-390) now shows space, so we only need hull below that
    this.createMetalSurface();

    // --- isometric floor tiles (belt area Y 265-396) ---
    this.createFloor();

    // --- belt ---
    this.beltGfx = this.add.graphics().setDepth(2);
    this.drawBelt();

    // --- finish line ---
    this.createFinishLine();

    // separator between belt and bins (chrome + neon pink accent)
    const sep = this.add.graphics().setDepth(3);
    sep.fillStyle(this.CHROME_MID, 1);
    sep.fillRect(0, 434, 1024, 3);
    sep.fillStyle(this.NEON_CYAN, 0.4);
    sep.fillRect(0, 435, 1024, 1);


    // --- ingredient bins ---
    this.createBins();

    // --- TREATMENTS (on shelf) ---
    this.createTreatments();

    // --- VEGGIE BOWLS (Center Left) ---
    this.createVeggieBowls();

    // --- CHEESE STACKS (Center Right) ---
    this.createCheeseStacks();

    // --- speed indicators ---
    this.speedText = this.add.text(975, 142, '\u25b6\u25b6 FAST', {
      fontSize: '14px', color: '#ffee00', fontFamily: 'Bungee, Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    this.slowText = this.add.text(975, 142, '\u25c0\u25c0 SLOW', {
      fontSize: '14px', color: '#88aaff', fontFamily: 'Bungee, Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    // --- OPEN FOR BUSINESS BUTTON ---
    this.createStartButton();

    // --- LOAVES (Standalone bread sources) ---
    this.createLoaves();

    // --- glow graphics for drag ---
    this.glowGraphics = this.add.graphics().setDepth(99);

    // --- speed bonus indicator on belt ---
    this.createSpeedBonusIndicator();

    // --- SETUP INPUT (drag & drop) ---
    this.setupDragAndDrop();

    // --- KEYBOARD SHORTCUTS ---
    this.setupKeyboardShortcuts();

    // --- DEBUG HITBOXES ---
    if (DEBUG) {
      this.drawDebugHitboxes();
    }

    // --- BOIDS (passing vessels in space window) ---
    this.boidManager.create();

    // --- PARTICLE EFFECTS ---
    this.particleManager.create();

    // --- AMBIENT MUSIC (disabled — drone oscillators are unpleasant) ---
    // musicManager.start();
    // musicManager.setIntensity(0.15);

    // --- ROBOT ARM (follows cursor) ---
    this.robotArm.create();

    // --- SETTINGS MENU ---
    this.settingsMenu.create();

    // --- END SHIFT BUTTON ---
    this.createEndShiftButton();

    // --- PREP TRACK ---
    this.prepTrack.create();

    // --- CUSTOMER VESSELS ---
    this.customerVessels.create();

    // --- REVENUE CHALLENGES ---
    this.revenueChallenges.create();

    // No tutorial in endless mode
  }

  onTutorialDismissed() { /* tutorial complete */ }

  createSpeedBonusIndicator() {
    const x = this.SPEED_BONUS_X;
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, 0x00ff88, 0.3);
    for (let y = 395; y < 435; y += 8) g.lineBetween(x, y, x, y + 5);
    this.add.text(x, 390, 'BONUS', {
      fontSize: '10px', color: '#00ff88', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(5).setAlpha(0.5);
  }

  /* =========================================
     SPACE BACKGROUND (stars behind smoked glass)
     ========================================= */
  createSpaceBackground() {
    const g = this.add.graphics().setDepth(0);

    // Deep space background
    g.fillStyle(this.SPACE_DEEP, 1);
    g.fillRect(0, this.WINDOW_TOP, 1024, this.WINDOW_HEIGHT);
    g.fillRect(0, 0, 1024, 145);

    // Subtle nebula wisps (very faint, will be behind smoked glass)
    g.fillStyle(0x3a2255, 0.08);
    g.fillEllipse(200, 240, 300, 150);
    g.fillStyle(0x253555, 0.06);
    g.fillEllipse(700, 300, 350, 140);
    g.fillStyle(0x453355, 0.05);
    g.fillEllipse(500, 200, 250, 100);

    // Static stars (single pixels, will be dimmed by smoked glass)
    const stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Phaser.Math.Between(50, 974),
        y: Phaser.Math.Between(this.WINDOW_TOP + 15, this.WINDOW_BOTTOM - 15),
        size: Phaser.Math.FloatBetween(0.5, 1.5),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    stars.forEach(star => {
      const rand = Math.random();
      const color = rand > 0.8 ? this.STAR_BLUE : rand > 0.6 ? this.STAR_WARM : this.STAR_WHITE;
      g.fillStyle(color, star.alpha);
      g.fillCircle(star.x, star.y, star.size);
    });

    this.starPositions = stars;
  }

  /* =========================================
     SPACE WINDOWS (chrome frames with smoked glass)
     ========================================= */
  createSpaceWindows() {
    const winTop = this.WINDOW_TOP;
    const winBottom = this.WINDOW_BOTTOM;
    const winHeight = this.WINDOW_HEIGHT;

    // === SMOKED GLASS OVERLAY (goes over stars, under beams) ===
    const smokedGlass = this.add.graphics().setDepth(0.8);
    smokedGlass.fillStyle(this.SMOKED_GLASS, this.SMOKED_GLASS_ALPHA);
    smokedGlass.fillRect(0, winTop, 1024, winHeight);
    // Subtle gradient effect - darker at edges
    smokedGlass.fillStyle(0x101520, 0.15);
    smokedGlass.fillRect(0, winTop, 60, winHeight);
    smokedGlass.fillRect(964, winTop, 60, winHeight);
    smokedGlass.fillStyle(0x101520, 0.1);
    smokedGlass.fillRect(0, winTop, 1024, 30);
    smokedGlass.fillRect(0, winBottom - 30, 1024, 30);

    // Glass reflection highlight (subtle diagonal shine)
    smokedGlass.fillStyle(0x6688aa, 0.06);
    smokedGlass.beginPath();
    smokedGlass.moveTo(100, winTop);
    smokedGlass.lineTo(400, winTop);
    smokedGlass.lineTo(200, winBottom);
    smokedGlass.lineTo(0, winBottom);
    smokedGlass.closePath();
    smokedGlass.fillPath();

    const g = this.add.graphics().setDepth(1);

    // === CHROME FRAME BEAMS ===
    const beamW = 35; // Thinner, more elegant beams
    const beamPositions = [0, 250, 512 - beamW/2, 774 - beamW, 1024 - beamW];

    beamPositions.forEach((bx, i) => {
      // Main beam body (brushed chrome)
      g.fillStyle(this.CHROME_MID, 1);
      g.fillRect(bx, winTop, beamW, winHeight);

      // Left highlight (polished edge)
      g.fillStyle(this.CHROME_HIGHLIGHT, 0.7);
      g.fillRect(bx, winTop, 2, winHeight);
      g.fillStyle(this.CHROME_LIGHT, 0.5);
      g.fillRect(bx + 2, winTop, 4, winHeight);

      // Right shadow
      g.fillStyle(this.CHROME_DARK, 0.8);
      g.fillRect(bx + beamW - 4, winTop, 4, winHeight);

      // Subtle vertical brushed metal lines
      g.lineStyle(1, this.CHROME_LIGHT, 0.15);
      for (let lx = bx + 8; lx < bx + beamW - 8; lx += 4) {
        g.lineBetween(lx, winTop, lx, winBottom);
      }

      // Chrome rivets (polished)
      for (let ry = winTop + 25; ry < winBottom - 20; ry += 50) {
        g.fillStyle(this.CHROME_DARK, 1);
        g.fillCircle(bx + beamW/2, ry, 4);
        g.fillStyle(this.CHROME_HIGHLIGHT, 0.8);
        g.fillCircle(bx + beamW/2 - 1, ry - 1, 2);
      }
    });

    // Horizontal chrome rail at top
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, winTop, 1024, 10);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.6);
    g.fillRect(0, winTop, 1024, 2);
    g.fillStyle(this.CHROME_DARK, 0.6);
    g.fillRect(0, winTop + 8, 1024, 2);

    // Horizontal chrome rail at bottom
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, winBottom - 10, 1024, 12);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, winBottom - 10, 1024, 2);

    // Cyan neon accent strip
    g.fillStyle(this.NEON_CYAN, 0.6);
    g.fillRect(0, winBottom, 1024, 2);

    // Glass edge highlights between beams
    const glassEdge = this.add.graphics().setDepth(1);
    glassEdge.lineStyle(1, this.GLASS_HIGHLIGHT, 0.25);
    for (let i = 0; i < beamPositions.length - 1; i++) {
      const left = beamPositions[i] + beamW + 3;
      const right = beamPositions[i + 1] - 3;
      glassEdge.strokeRect(left, winTop + 14, right - left, winHeight - 28);
    }

    // === SMALL WINDOW PANELS AT TOP ===
    const smallWinY = 8;
    const smallWinH = 100;
    const frameThickness = 10;
    const numWindows = 4;
    const totalWidth = 1024 - 40;
    const windowWidth = (totalWidth - (numWindows + 1) * frameThickness) / numWindows;

    // Top chrome frame
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, 0, 1024, 8);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, 0, 1024, 2);

    // Frame below small windows
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, smallWinY + smallWinH, 1024, frameThickness + 28);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.4);
    g.fillRect(0, smallWinY + smallWinH, 1024, 2);

    // Vertical chrome dividers
    for (let i = 0; i <= numWindows; i++) {
      const frameX = 20 + i * (windowWidth + frameThickness);
      g.fillStyle(this.CHROME_MID, 1);
      g.fillRect(frameX - frameThickness, smallWinY, frameThickness, smallWinH);
      g.fillStyle(this.CHROME_HIGHLIGHT, 0.4);
      g.fillRect(frameX - frameThickness, smallWinY, 2, smallWinH);
    }

    // Glass panes with tint
    for (let i = 0; i < numWindows; i++) {
      const paneX = 20 + frameThickness + i * (windowWidth + frameThickness);
      g.fillStyle(this.GLASS_TINT, 0.2);
      g.fillRect(paneX, smallWinY, windowWidth, smallWinH);
      g.lineStyle(1, this.GLASS_HIGHLIGHT, 0.3);
      g.strokeRect(paneX + 2, smallWinY + 2, windowWidth - 4, smallWinH - 4);

      // Chrome rivets
      g.fillStyle(this.CHROME_DARK, 0.9);
      g.fillCircle(paneX - 5, smallWinY + 10, 3);
      g.fillCircle(paneX + windowWidth + 5, smallWinY + 10, 3);
      g.fillStyle(this.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(paneX - 6, smallWinY + 9, 1.5);
      g.fillCircle(paneX + windowWidth + 4, smallWinY + 9, 1.5);
    }

    // Cyan accent below small windows
    g.fillStyle(this.NEON_CYAN, 0.5);
    g.fillRect(20, smallWinY + smallWinH + 3, totalWidth, 2);

    this.createWallDecor();
  }


  createWallDecor() {
    // Wall decor removed for cleaner UI
  }

  /* =========================================
     HUD
     ========================================= */
  createHUD() {
    // Space station HUD background strip
    const hudBg = this.add.graphics().setDepth(4);
    hudBg.fillStyle(this.HULL_DARK, 0.85);
    hudBg.fillRect(0, 0, 1024, 50);
    // Neon accent line below HUD
    hudBg.fillStyle(this.NEON_CYAN, 0.4);
    hudBg.fillRect(0, 48, 1024, 2);

    // Endless mode HUD
    this.scoreText = this.add.text(12, 15,
      `Score: ${this.currentScore}`, {
      fontSize: '18px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.highScoreText = this.add.text(200, 15,
      `High Score: ${this.highScore}`, {
      fontSize: '16px', color: '#00ddff', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.ordersText = this.add.text(700, 17,
      this.ordersDisplay(), {
      fontSize: '12px', color: '#aaddff', fontFamily: 'Arial',
    }).setDepth(5);

    // Money Display
    this.moneyText = this.add.text(480, 15, '$0.00', {
      fontSize: '16px', color: '#44ff88', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    // F1=Hotkeys memo indicator
    this.createHotkeyMemo();

    // Hotkey legend panel (hidden until F1 pressed)
    this.createHotkeyLegend();
  }

  createHotkeyMemo() {
    const memoX = 600;
    const memoY = 22;

    // Space datapad style memo
    const memo = this.add.graphics().setDepth(5);
    // Dark panel background
    memo.fillStyle(this.HULL_LIGHT, 0.95);
    memo.fillRoundedRect(memoX, memoY - 12, 70, 24, 4);
    // Cyan border glow
    memo.lineStyle(1, this.NEON_CYAN, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 12, 70, 24, 4);

    // Text on memo
    this.add.text(memoX + 35, memoY, 'F1=Help', {
      fontSize: '11px',
      color: '#00ddff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);
  }

  showHotkeyHints(visible) {
    this.hotkeyHints.forEach(hint => {
      if (hint && hint.setVisible) {
        hint.setVisible(visible);
      }
    });

    // Also toggle ingredient/item labels
    this.labelHints.forEach(label => {
      if (label && label.setVisible) {
        label.setVisible(visible);
      }
    });

    // Show/hide the legend panel
    if (this.hotkeyLegend) {
      this.hotkeyLegend.setVisible(visible);
    }
  }

  createHotkeyLegend() {
    // Create a legend panel showing all controls
    const panelX = 60;
    const panelY = 300;
    const panelW = 160;
    const panelH = 200;

    const legend = this.add.container(panelX, panelY).setDepth(100);

    // Background - space datapad style
    const bg = this.add.graphics();
    bg.fillStyle(this.HULL_DARK, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, this.NEON_CYAN, 0.9);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    legend.add(bg);

    // Title
    const title = this.add.text(panelW / 2, 12, 'CONTROLS', {
      fontSize: '14px', color: '#00ffcc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    legend.add(title);

    // Control entries
    const controls = [
      { key: 'SPACE', desc: 'Speed up belt' },
      { key: 'SHIFT', desc: 'Slow down belt' },
      { key: 'ESC', desc: 'Cancel pickup' },
      { key: '1-4', desc: 'Meats' },
      { key: '5-7', desc: 'Veggies' },
      { key: '8-9', desc: 'Cheese' },
      { key: 'Q/E', desc: 'Sauces' },
      { key: 'R/F', desc: 'Toast/ToGo' },
      { key: 'G/H', desc: 'Salt/Pepper' },
      { key: 'V', desc: 'Oil & Vinegar' },
    ];

    controls.forEach((ctrl, i) => {
      const y = 34 + i * 16;
      const keyTxt = this.add.text(8, y, ctrl.key, {
        fontSize: '11px', color: '#00ddff', fontFamily: 'Arial', fontStyle: 'bold',
      });
      const descTxt = this.add.text(55, y, ctrl.desc, {
        fontSize: '11px', color: '#aaddff', fontFamily: 'Arial',
      });
      legend.add(keyTxt);
      legend.add(descTxt);
    });

    legend.setVisible(false);
    this.hotkeyLegend = legend;
  }

  createHotkeyHint(x, y, key, depth = 22) {
    // Create a highly visible hotkey hint with background - space style
    const container = this.add.container(x, y).setDepth(depth);

    // Background pill
    const bg = this.add.graphics();
    const textWidth = key.length > 1 ? 28 : 22;
    bg.fillStyle(this.HULL_DARK, 0.9);
    bg.fillRoundedRect(-textWidth / 2 - 4, -10, textWidth + 8, 20, 6);
    bg.lineStyle(2, this.NEON_CYAN, 1);
    bg.strokeRoundedRect(-textWidth / 2 - 4, -10, textWidth + 8, 20, 6);
    container.add(bg);

    // Key text
    const txt = this.add.text(0, 0, key, {
      fontSize: '14px',
      color: '#00ffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(txt);

    // Hidden by default
    container.setVisible(false);

    // Store reference for F1 toggle
    this.hotkeyHints.push(container);

    return container;
  }

  ordersDisplay() {
    return `Orders: ${this.ordersCompleted}`;
  }

  updateStrikeIndicators() {
    for (let i = 0; i < this.maxStrikes; i++) {
      if (i < this.strikes) {
        this.strikeIcons[i].setText('\u2717');
        this.strikeIcons[i].setColor('#ff4466');
      } else {
        this.strikeIcons[i].setText('\u25cb');
        this.strikeIcons[i].setColor('#44ffaa');
      }
    }
  }

  refreshHUD() {
    this.scoreText.setText(`Score: ${this.currentScore}`);
    this.highScoreText.setText(`High Score: ${this.highScore}`);
    this.ordersText.setText(this.ordersDisplay());
    this.moneyText.setText(`$${this.gameMoney.toFixed(2)}`);
  }

  createStartButton() {
    // Subtle title overlay - click anywhere to start
    const overlay = this.add.container(0, 0).setDepth(200);

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.5);
    overlay.add(backdrop);

    // Title text
    const title = this.add.text(512, 340, 'Footers', {
      fontSize: '64px',
      color: '#00ddff',
      fontFamily: 'Bungee, Arial',
      stroke: '#004455',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0.9);
    overlay.add(title);

    // Subtitle
    const subtitle = this.add.text(512, 410, 'Endless Mode', {
      fontSize: '24px',
      color: '#aaddff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.8);
    overlay.add(subtitle);

    // Click prompt
    const prompt = this.add.text(512, 480, 'click to start', {
      fontSize: '16px',
      color: '#88aacc',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.6);
    overlay.add(prompt);

    // Pulse the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Click anywhere to dismiss
    backdrop.setInteractive({ useHandCursor: true });
    backdrop.on('pointerdown', () => {
      this.isStoreOpen = true;
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 300,
        onComplete: () => overlay.destroy()
      });
      soundManager.init();
      soundManager.ding();
    });
  }

  /* =========================================
     TICKET BAR
     ========================================= */
  createTicketBar() {
    // Space station ticket display panel
    this.add.rectangle(512, 95, 1024, 88, this.HULL_MID).setDepth(35);
    this.add.rectangle(512, 52, 1024, 2, this.HULL_LIGHT).setDepth(35);
    this.add.rectangle(512, 138, 1024, 2, this.HULL_LIGHT).setDepth(35);

    // 3D bottom lip/shelf edge for ticket bar
    const ticketLip = this.add.graphics().setDepth(35);
    ticketLip.fillStyle(this.HULL_DARK, 1);
    ticketLip.fillRect(0, 139, 1024, 4);
    ticketLip.fillStyle(this.HULL_LIGHT, 1);
    ticketLip.beginPath();
    ticketLip.moveTo(0, 139);
    ticketLip.lineTo(1024, 139);
    ticketLip.lineTo(1024 + 3, 143);
    ticketLip.lineTo(3, 143);
    ticketLip.closePath();
    ticketLip.fillPath();
    // Neon accent on ticket bar edge
    ticketLip.fillStyle(this.NEON_CYAN, 0.3);
    ticketLip.fillRect(0, 139, 1024, 1);

    this.add.text(8, 55, 'ORDERS:', {
      fontSize: '10px', color: '#00bbdd', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(36);

    this.ticketContainer = this.add.container(0, 0).setDepth(36);
  }

  addTicket(order, orderNum) {
    const handFonts = ['Caveat, cursive', 'Permanent Marker, cursive', 'Nothing You Could Do, cursive', 'Grape Nuts, cursive'];
    const ticketFont = handFonts[Math.floor(Math.random() * handFonts.length)];
    const cardW = 140;
    const lineH = 13;
    const ingLines = order.ingredients.length;
    const treatLines = order.treatments ? order.treatments.length : 0;
    const footerLine = false ? 14 : 0;
    const contentH = 22 + footerLine + ingLines * lineH + (treatLines > 0 ? 10 + treatLines * lineH : 0);
    const cardH = Math.max(90, contentH + 8);
    // Overlap cards: each card shifts only partially so they stack
    const overlapStep = 100;
    const targetX = 65 + (orderNum - 1) * overlapStep;
    const targetY = 55;
    // Later cards render on top of earlier ones
    const cardDepth = 36 + orderNum;

    // Spawn large at center first
    const spawnX = 512;
    const spawnY = 384;

    const card = this.add.container(spawnX, spawnY).setDepth(400); // Above everything during pop-in

    // Background — footer tickets have a distinct tint
    const bg = this.add.graphics();
    bg.fillStyle(false ? 0xFFEEBB : 0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 5);
    bg.lineStyle(2, false ? 0xDDAA55 : 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 5);
    card.add(bg);

    // Order number
    const numText = this.add.text(cardW / 2, 4, `#${orderNum}`, {
      fontSize: '14px', color: '#333', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5, 0);
    card.add(numText);

    // Footer label
    let yOff = 20;
    if (false) {
      const footerLabel = this.add.text(cardW / 2, 19, '\u2b50 FOOTER', {
        fontSize: '10px', color: '#AA6600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      card.add(footerLabel);
      yOff = 32;
    }

    // Price Tag
    const priceTxt = this.add.text(cardW - 6, 5, `$${order.totalPrice.toFixed(2)}`, {
      fontSize: '11px', color: '#006600', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(1, 0);
    card.add(priceTxt);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xCCBB70, 1);
    div.lineBetween(4, yOff, cardW - 4, yOff);
    card.add(div);

    // Ingredient list — show build order
    const entries = [];
    order.ingredients.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isTopBread = (i === order.ingredients.length - 1 && key.startsWith('bread_'));
      const displayName = isTopBread ? `${ing.name} \u2191` : ing.name;
      const isNext = (i === 0);
      const txt = this.add.text(10, yOff + 3 + i * lineH, displayName, {
        fontSize: '13px',
        color: isNext ? '#111' : '#999',
        fontFamily: ticketFont,
      });
      card.add(txt);
      entries.push({ key, text: txt, done: false });
    });

    // Treatment requirements (shown in red below ingredients)
    const treatEntries = [];
    if (order.treatments && order.treatments.length > 0) {
      const treatStartY = yOff + 3 + ingLines * lineH + 3;
      const div2 = this.add.graphics();
      div2.lineStyle(1, 0xCC8800, 0.5);
      div2.lineBetween(4, treatStartY, cardW - 4, treatStartY);
      card.add(div2);

      order.treatments.forEach((tKey, i) => {
        const treat = TREATMENTS[tKey];
        const txt = this.add.text(10, treatStartY + 4 + i * lineH, `[${treat.name}]`, {
          fontSize: '13px',
          color: '#cc0000',
          fontFamily: ticketFont,
        });
        card.add(txt);
        treatEntries.push({ key: tKey, text: txt, done: false });
      });
    }

    this.ticketContainer.add(card);

    const ticket = { card, bg, orderNum, entries, treatEntries, cardH, cardW, status: 'active' };
    this.tickets.push(ticket);

    this.animateTicketPopIn(card, targetX, targetY, cardW, cardDepth);

    return ticket;
  }

  animateTicketPopIn(card, targetX, targetY, cardW, cardDepth) {
    soundManager.waiterGibberish();

    card.setScale(2.5);
    card.setAlpha(0);

    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 2.0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(600, () => {
          this.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            scale: 1,
            depth: cardDepth || 36,
            duration: 500,
            ease: 'Power2'
          });
        });
      }
    });

    const rightEdge = targetX + cardW + 10;
    if (rightEdge > 1020) {
      this.tweens.add({
        targets: this.ticketContainer, x: -(rightEdge - 1020),
        duration: 300, ease: 'Power2',
        delay: 1000
      });
    }
  }

  updateTicketIngredient(orderNum, ingredientKey) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.entries.find((e) => e.key === ingredientKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setFontStyle('bold');
      entry.text.setText('\u2713 ' + INGREDIENTS[ingredientKey].name);
    }
    // Highlight next expected ingredient
    this.highlightNextIngredient(orderNum);
  }

  highlightNextIngredient(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    let foundNext = false;
    for (const entry of ticket.entries) {
      if (entry.done) continue;
      if (!foundNext) {
        foundNext = true;
        entry.text.setColor('#111');
        entry.text.setFontStyle('bold');
      } else {
        entry.text.setColor('#999');
        entry.text.setFontStyle('normal');
      }
    }
  }

  updateTicketTreatment(orderNum, treatmentKey) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.treatEntries.find((e) => e.key === treatmentKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setText('\u2713 ' + TREATMENTS[treatmentKey].name);
    }
  }

  markTicketCompleted(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'completed';
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x00ff00, 0.15);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const check = this.add.text(w / 2, h / 2, '\u2713', {
      fontSize: '36px', color: '#0a0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(check);
  }

  markTicketMissed(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'missed';
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = this.add.graphics();
    overlay.fillStyle(0xff0000, 0.2);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const xMark = this.add.text(w / 2, h / 2, '\u2717', {
      fontSize: '36px', color: '#f33', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(xMark);
  }

  /* =========================================
     METAL SURFACE (brushed steel prep area below belt)
     ========================================= */
  createMetalSurface() {
    const g = this.add.graphics().setDepth(0);

    const surfaceY = 437;
    const surfaceH = 331; // To bottom of screen (768 - 437)
    const surfaceW = 1024;

    // Warm walnut wood base
    g.fillStyle(0x6B3A2A, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    // Horizontal wood grain lines
    g.lineStyle(1, 0x7A4A3A, 0.15);
    for (let y = surfaceY + 3; y < surfaceY + surfaceH; y += 5) {
      g.lineBetween(0, y, surfaceW, y);
    }

    // Chrome trim at top edge
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, surfaceY, surfaceW, 3);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, surfaceY, surfaceW, 1);

    // Warm wood highlight strip below chrome
    g.fillStyle(0xC8A878, 0.3);
    g.fillRect(0, surfaceY + 3, surfaceW, 2);

    // Subtle gradient darkening toward bottom
    for (let i = 0; i < 8; i++) {
      const alpha = 0.025 * i;
      const yPos = surfaceY + surfaceH - 80 + i * 10;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, yPos, surfaceW, 10);
    }

    // Chrome buttons along top edge (replacing rivets)
    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(this.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + 12, 4);
      g.fillStyle(this.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + 11, 1.5);
    }

    // Chrome buttons along bottom edge
    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(this.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + surfaceH - 12, 4);
      g.fillStyle(this.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + surfaceH - 13, 1.5);
    }

    // Subtle center warm highlight (wood sheen)
    g.fillStyle(0xC8A878, 0.04);
    g.fillRect(200, surfaceY + 60, 624, 200);
  }


  /* =========================================
     FLOOR (brushed chrome strip below window)
     ========================================= */
  createFloor() {
    const g = this.add.graphics().setDepth(1);
    const floorY = this.WINDOW_BOTTOM;
    const floorH = 28;

    // Warm wood baseboard
    g.fillStyle(0x5A3A2A, 1);
    g.fillRect(0, floorY, 1024, floorH);

    // Top chrome rail (kept — diner counter trim)
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, floorY, 1024, 3);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, floorY, 1024, 1);

    // Wood grain lines
    g.lineStyle(1, 0x6A4A3A, 0.15);
    for (let y = floorY + 6; y < floorY + floorH - 4; y += 4) {
      g.lineBetween(0, y, 1024, y);
    }

    // Bottom edge shadow
    g.fillStyle(0x2A1A10, 0.6);
    g.fillRect(0, floorY + floorH - 3, 1024, 3);

    // Warm cream edge accents
    g.fillStyle(0xFFEE88, 0.3);
    g.fillRect(0, floorY + 3, 3, floorH - 3);
    g.fillRect(1021, floorY + 3, 3, floorH - 3);
  }

  /* =========================================
     ISOMETRIC HELPERS
     ========================================= */
  getIsoPosition(col, row, baseX, baseY, spacingX, spacingY) {
    const x = baseX + col * spacingX + row * spacingY * this.ISO_SKEW;
    const y = baseY + row * spacingY;
    return { x, y };
  }

  drawIsoSurface(g, x, y, w, h, skew, topColor, frontColor) {
    // Front face (rectangle)
    g.fillStyle(frontColor, 1);
    g.fillRect(x, y, w, h);

    // Top face (parallelogram)
    g.fillStyle(topColor, 1);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + skew, y - skew * 0.6);
    g.lineTo(x + w + skew, y - skew * 0.6);
    g.lineTo(x + w, y);
    g.closePath();
    g.fillPath();

    // Right edge highlight
    g.lineStyle(1, 0x606068, 0.5);
    g.lineBetween(x + w, y, x + w + skew, y - skew * 0.6);
  }

  drawItemShadow(g, x, y, radiusX, radiusY) {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(x, y, radiusX, radiusY);
  }

  /* =========================================
     BELT (chrome rails with dark rubber belt)
     ========================================= */
  drawBelt() {
    const g = this.beltGfx;
    g.clear();

    const isoOff = 4;

    // Top chrome rail
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, 396, 1024, 5);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.6);
    g.fillRect(0, 396, 1024, 2);
    // Top face (parallelogram)
    g.fillStyle(this.CHROME_LIGHT, 1);
    g.beginPath();
    g.moveTo(0, 396);
    g.lineTo(isoOff, 396 - isoOff);
    g.lineTo(1024 + isoOff, 396 - isoOff);
    g.lineTo(1024, 396);
    g.closePath();
    g.fillPath();

    // Belt segments (dark rubber with subtle texture)
    g.fillStyle(0x3a3a42, 1);
    g.fillRect(0, 401, 1024, 26);
    let segIndex = 0;
    for (let x = this.beltOffset - 40; x < 1064; x += 40) {
      const tint = segIndex % 2 === 0 ? 0x3a3a42 : 0x424248;
      g.fillStyle(tint, 1);
      const sx = Math.max(0, x);
      const sw = Math.min(38, 1024 - sx);
      if (sw > 0) g.fillRect(sx, 401, sw, 26);
      g.lineStyle(1, 0x4a4a52, 0.3);
      g.strokeRect(x, 401, 38, 26);
      segIndex++;
    }

    // Belt housing front
    g.fillStyle(this.CHROME_DARK, 1);
    g.fillRect(0, 427, 1024, 5);

    // Bottom chrome rail
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, 430, 1024, 4);
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.4);
    g.fillRect(0, 430, 1024, 1);
  }

  /* =========================================
     FINISH LINE (iso cubes)
     ========================================= */
  createFinishLine() {
    const x = this.finishLineX;
    const g = this.add.graphics().setDepth(6);

    for (let y = 145; y < 435; y += 12) {
      g.fillStyle(0x00ff00, 0.5);
      g.fillRect(x - 1, y, 3, 8);
    }

    // Checkered flag with tiny iso cubes
    const s = 6;
    const iso = 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const isWhite = (row + col) % 2 === 0;
        const bx = x - 9 + col * s;
        const by = 140 + row * s;

        // Front face
        g.fillStyle(isWhite ? 0xffffff : 0x000000, 0.6);
        g.fillRect(bx, by, s, s);
        // Top face
        g.fillStyle(isWhite ? 0xeeeeee : 0x222222, 0.6);
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + iso, by - iso);
        g.lineTo(bx + s + iso, by - iso);
        g.lineTo(bx + s, by);
        g.closePath();
        g.fillPath();
        // Right face
        g.fillStyle(isWhite ? 0xcccccc : 0x111111, 0.6);
        g.beginPath();
        g.moveTo(bx + s, by);
        g.lineTo(bx + s + iso, by - iso);
        g.lineTo(bx + s + iso, by + s - iso);
        g.lineTo(bx + s, by + s);
        g.closePath();
        g.fillPath();
      }
    }
  }

  /* =========================================
     MEAT PILES (Left Side - Isometric Grid)
     ========================================= */
  createBins() {
    const keys = BIN_LAYOUT[0];
    this.meatPileItems = []; // Track for day-based unlocking

    // Isometric grid layout - tighter spacing for 5 meats
    const baseX = 95;
    const baseY = 480;
    const spacingX = 100;
    const spacingY = 70;

    const hints = { 'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4', 'meat_prosciutto': 'Q' };

    keys.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isLocked = ing.unlockDay && this.day < ing.unlockDay;

      const row = Math.floor(i / 2);
      const col = i % 2;
      // Center the odd item (prosciutto) if it's the 5th
      const pos = (i === 4)
        ? { x: baseX + spacingX * 0.5, y: baseY + spacingY * 2 }
        : this.getIsoPosition(col, row, baseX, baseY, spacingX, spacingY);
      const x = pos.x;
      const y = pos.y;

      const pileKey = key.replace('meat_', 'meat_pile_');
      const pile = this.add.image(x, y, pileKey).setDepth(20).setScale(0.9);

      if (isLocked) {
        pile.setAlpha(0.3).setTint(0x444444);
      } else {
        pile.setInteractive({ useHandCursor: true });
        pile.on('pointerover', () => pile.setTint(0xdddddd));
        pile.on('pointerout', () => pile.clearTint());
        pile.on('pointerdown', () => {
          if (this.isPaused || this.heldItem) return;
          this.createMeatPileLogic(key, x, y, pile);
        });
      }

      // Name label (always visible)
      const label = this.add.text(x, y + 44, ing.name, {
        fontSize: '13px', color: isLocked ? '#666' : '#ddd', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(21);

      // Keyboard hint (hidden by default, shown with F1)
      if (hints[key] && !isLocked) {
        this.createHotkeyHint(x + 34, y - 24, hints[key]);
      }

      this.meatPileItems.push({ img: pile, label, key, isLocked });
    });
  }

  createMeatPileLogic(key, x, y, visual) {
    soundManager.init();
    soundManager.robotPickup();
    const pointer = this.input.activePointer;
    const heldVisual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = {
      visual: heldVisual,
      ingredientKey: key,
      binX: x, binY: y
    };
    // Particle puff when picking up
    const ing = INGREDIENTS[key];
    this.particleManager.ingredientPickup(x, y, ing.color);
  }



  /* =========================================
     LOAVES (Standalone - Isometric Grid with Shadows)
     ========================================= */
  createLoaves() {
    const baseX = 820; // Moved left
    const baseY = 490;
    const spacingY = 70; // Tighter spacing

    const breads = [
      { key: 'bread_white', label: 'White', asset: 'loaf_white' },
      { key: 'bread_wheat', label: 'Wheat', asset: 'loaf_wheat' },
      { key: 'bread_sourdough', label: 'Sourdough', asset: 'loaf_sourdough' }
    ];

    // Draw shadows graphics
    const shadowGfx = this.add.graphics().setDepth(11);

    breads.forEach((b, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      // Draw shadow under the loaf (no bin)
      this.drawItemShadow(shadowGfx, x, y + 16, 35, 10);

      const loaf = this.add.image(x, y, b.asset).setDepth(20);
      loaf.setScale(0.85); // Make bread smaller
      loaf.setInteractive({ useHandCursor: true });
      loaf.on('pointerover', () => loaf.setTint(0xdddddd));
      loaf.on('pointerout', () => loaf.clearTint());
      loaf.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickLoaf(b.key, pointer);
      });

      // Label (always visible)
      const label = this.add.text(x, y + 38, b.label, {
        fontSize: '14px', color: '#ddd', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);
    });
  }

  clickLoaf(key, pointer) {
    soundManager.robotPickup();

    const visual = this.createHeldVisual(key, pointer.x, pointer.y);

    this.heldItem = {
      visual,
      ingredientKey: key,
      binX: 0, // Not applicable for loaves
      binY: 0,
    };
  }

  /* =========================================
     TREATMENTS (Bottom of screen) & SAUCES
     ========================================= */
  createTreatments() {
    // Position at bottom of screen, below all ingredients
    const shelfY = 695;
    const startX = 120;
    const spacing = 85;

    // Treatments - now with separate salt and pepper
    const treatKeys = ['toasted', 'togo', 'salt', 'pepper', 'oil_vinegar'];
    treatKeys.forEach((key, i) => {
      this.createTreatmentItem(key, startX + i * spacing, shelfY);
    });

    // Sauces to the right of treatments on same row
    this.createSauceBottle('sauce_mayo', startX + 5 * spacing + 15, shelfY);
    this.createSauceBottle('sauce_mustard', startX + 6 * spacing + 15, shelfY);
  }

  /* =========================================
     CHEESE STACKS - CENTER RIGHT (Isometric Grid)
     ========================================= */
  createCheeseStacks() {
    const baseX = 620;
    const baseY = 500;
    const spacingY = 85;

    const cheeses = [
      { key: 'cheese_american', label: 'American' },
      { key: 'cheese_swiss', label: 'Swiss' }
    ];

    cheeses.forEach((c, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      const stack = this.add.image(x, y, `cheese_stack_${c.key.split('_')[1]}`).setDepth(20);
      // Art lives in ~x:18-105, y:48-90 of the 128x128 frame
      stack.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(15, 45, 92, 50),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      stack.on('pointerover', () => stack.setTint(0xdddddd));
      stack.on('pointerout', () => stack.clearTint());
      stack.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickCheeseStack(c.key, pointer);
      });

      // Label (hidden by default, shown with F1)
      const label = this.add.text(x, y + 52, c.label, {
        fontSize: '16px', color: '#ddd', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);

      // Keyboard hint (hidden by default, shown with F1)
      const hints = { 'cheese_american': 'W', 'cheese_swiss': 'E' };
      if (hints[c.key]) {
        this.createHotkeyHint(x + 42, y - 26, hints[c.key]);
      }
    });
  }

  clickCheeseStack(key, pointer) {
    soundManager.init();
    soundManager.robotPickup();
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
  }

  /* =========================================
     VEGGIE BOWLS - CENTER (Two Rows)
     ========================================= */
  createVeggieBowls() {
    this.veggieBowlItems = []; // Track for day-based unlocking

    // Row 1: Always available (Lettuce, Tomato, Onion)
    const row1Y = 510;
    const row1StartX = 340;
    const spacingX = 75;

    const row1Veggies = [
      { key: 'top_lettuce', label: 'Lettuce', asset: 'bowl_content_lettuce', hotkey: '5' },
      { key: 'top_tomato', label: 'Tomato', asset: 'bowl_content_tomato', hotkey: '6' },
      { key: 'top_onion', label: 'Onion', asset: 'bowl_content_onion', hotkey: '7' }
    ];

    // Row 2: Unlockable (Pickles Day 2, Arugula Day 2, Olives Day 4)
    const row2Y = 575;
    const row2StartX = 340;

    const row2Veggies = [
      { key: 'top_pickles', label: 'Pickles', asset: 'bowl_content_pickles', hotkey: '8', unlockDay: 2 },
      { key: 'top_arugula', label: 'Arugula', asset: 'bowl_content_arugula', hotkey: '9', unlockDay: 2 },
      { key: 'top_olives', label: 'Olives', asset: 'bowl_content_olives', hotkey: '0', unlockDay: 4 }
    ];

    const allVeggies = [
      ...row1Veggies.map((v, i) => ({ ...v, x: row1StartX + i * spacingX, y: row1Y })),
      ...row2Veggies.map((v, i) => ({ ...v, x: row2StartX + i * spacingX, y: row2Y }))
    ];

    allVeggies.forEach((v) => {
      const isLocked = v.unlockDay && this.day < v.unlockDay;

      const vegImg = this.add.image(v.x, v.y, v.asset).setDepth(20).setScale(0.55);

      if (isLocked) {
        vegImg.setAlpha(0.3).setTint(0x444444);
      } else {
        vegImg.setInteractive({ useHandCursor: true });
        vegImg.on('pointerover', () => vegImg.setTint(0xdddddd));
        vegImg.on('pointerout', () => vegImg.clearTint());
        vegImg.on('pointerdown', (pointer) => {
          if (this.isPaused || this.heldItem) return;
          this.clickVeggieBowl(v.key, pointer);
        });
      }

      // Label (hidden by default, shown with F1)
      const label = this.add.text(v.x, v.y + 32, v.label, {
        fontSize: '14px', color: isLocked ? '#666' : '#ddd', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);

      // Keyboard hint
      if (!isLocked) {
        this.createHotkeyHint(v.x + 28, v.y - 20, v.hotkey);
      }

      this.veggieBowlItems.push({ img: vegImg, label, ...v });
    });
  }

  clickVeggieBowl(key, pointer) {
    soundManager.init();
    soundManager.robotPickup();
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
  }

  createSauceBottle(key, x, y) {
    const ingredient = INGREDIENTS[key];
    const radius = 22;

    // Create container for the sauce icon
    const container = this.add.container(x, y).setDepth(30);

    // Use bottle SVG instead of procedural circle
    const bottleKey = key + '_bottle';
    const bottleImg = this.add.image(0, 0, bottleKey).setScale(0.25);
    container.add(bottleImg);

    // Label text above
    const label = this.add.text(0, -radius - 12, ingredient.name, {
      fontSize: '12px',
      color: '#ccc',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    container.add(label);

    // Make interactive - generous hitbox covering label, bottle, and below
    const hitW = 60;
    const hitH = 90;
    const hitY = -50; // Start above the label
    container.setSize(hitW, hitH);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hitW / 2, hitY, hitW, hitH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerover', () => bottleImg.setAlpha(0.8));
    container.on('pointerout', () => bottleImg.setAlpha(1));
    container.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
      soundManager.init();
      this.pickupSauce(key);
    });

    // Keyboard hint (hidden by default, shown with F1)
    const sauceHints = { 'sauce_mayo': 'A', 'sauce_mustard': 'S' };
    if (sauceHints[key]) {
      this.createHotkeyHint(x + radius + 4, y - radius - 4, sauceHints[key], 31);
    }
  }

  pickupSauce(key) {
    soundManager.robotPickup();
    const pointer = this.input.activePointer;
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = {
      visual,
      ingredientKey: key,
      isSauce: true,
    };
  }

  createTreatmentItem(tKey, x, y) {
    const treat = TREATMENTS[tKey];
    const c = this.add.container(x, y).setDepth(30);
    const g = this.add.graphics();

    // Draw the treatment using shared function
    const bounds = this.drawTreatmentGraphics(g, tKey);
    c.add(g);

    // Endless mode: treatments are always available
    const isLocked = false;

    // Create an invisible interactive zone that covers the visual
    // Using a Phaser Zone for reliable hit detection
    const zone = this.add.zone(0, 0, bounds.w + 10, bounds.h + 10);
    c.add(zone);

    if (isLocked) {
      // Grey out treatment - not available on this day
      g.setAlpha(0.3);
      // Apply grey tint effect by drawing a grey overlay
      const overlay = this.add.graphics();
      overlay.fillStyle(0x444444, 0.5);
      overlay.fillRect(-bounds.w/2 - 5, -bounds.h/2 - 5, bounds.w + 10, bounds.h + 10);
      c.add(overlay);
    } else {
      // Only make interactive if not locked
      zone.setInteractive({ useHandCursor: true });

      // Forward zone events to container behavior
      zone.on('pointerover', () => {
        this.tweens.add({ targets: c, scaleX: 1.08, scaleY: 1.08, duration: 100, ease: 'Sine.easeOut' });
      });
      zone.on('pointerout', () => {
        this.tweens.add({ targets: c, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
      });
      zone.on('pointerdown', () => {
        if (this.isPaused || this.heldItem) return;
        soundManager.init();
        this.pickupTreatment(tKey);
      });
    }

    // Label below art (hidden by default, shown with F1)
    // Position label based on treatment type
    const labelY = (tKey === 'togo') ? 38 : (tKey === 'toasted') ? 36 : 34;
    const label = this.add.text(0, labelY, treat.name, {
      fontSize: '12px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    c.add(label);

    // Keyboard hints - hidden by default, shown with F1
    const treatHints = { 'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V' };
    const hintOffsets = {
      'toasted': { x: 32, y: -12 },
      'togo': { x: 28, y: -30 },
      'salt': { x: 12, y: -18 },
      'pepper': { x: 12, y: -18 },
      'oil_vinegar': { x: 26, y: -20 },
    };
    if (treatHints[tKey]) {
      const off = hintOffsets[tKey] || { x: 30, y: -30 };
      this.createHotkeyHint(x + off.x, y + off.y, treatHints[tKey], 32);
    }

    this.treatmentItems[tKey] = c;
  }

  /* =========================================
     TREATMENT PICKUP (works like ingredients)
     ========================================= */
  drawTreatmentGraphics(g, tKey) {
    // Shared drawing code for both station display and pickup
    // Returns the bounding size {w, h}
    const iso = 6;

    if (tKey === 'toasted') {
      // Isometric 4-slice deli toaster
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 50, 14);
      g.fillStyle(0x707078, 1);
      g.fillRect(-28, -8, 56, 36);
      g.fillStyle(0x909098, 1);
      g.beginPath();
      g.moveTo(-28, -8);
      g.lineTo(-28 + iso, -8 - iso);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28, -8);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x505058, 1);
      g.beginPath();
      g.moveTo(28, -8);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28 + iso, 28 - iso);
      g.lineTo(28, 28);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x222228, 1);
      for (let i = 0; i < 4; i++) {
        const slotX = -22 + i * 12;
        g.beginPath();
        g.moveTo(slotX, -8);
        g.lineTo(slotX + iso * 0.5, -8 - iso * 0.8);
        g.lineTo(slotX + 8 + iso * 0.5, -8 - iso * 0.8);
        g.lineTo(slotX + 8, -8);
        g.closePath();
        g.fillPath();
      }
      g.fillStyle(0x404048, 1);
      g.fillRect(30, 5, 6, 18);
      g.fillStyle(0x606068, 1);
      g.fillRect(30, 5, 6, 4);
      g.fillStyle(0x606068, 1);
      g.fillRect(-18, 16, 36, 8);
      return { w: 70, h: 50 };

    } else if (tKey === 'togo') {
      // Stack of to-go boxes isometric
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 30, 48, 12);
      for (let b = 0; b < 3; b++) {
        const by = 20 - b * 14;
        const biso = 5;
        g.fillStyle(b === 0 ? 0xE8E8E8 : 0xF0F0F0, 1);
        g.fillRect(-26, by - 10, 52, 12);
        g.fillStyle(b === 0 ? 0xF5F5F5 : 0xFAFAFA, 1);
        g.beginPath();
        g.moveTo(-26, by - 10);
        g.lineTo(-26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26, by - 10);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xD0D0D0, 1);
        g.beginPath();
        g.moveTo(26, by - 10);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by + 2 - biso);
        g.lineTo(26, by + 2);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0xBBBBBB, 0.6);
        g.lineBetween(-22, by - 6, 22, by - 6);
      }
      return { w: 65, h: 70 };

    } else if (tKey === 'salt') {
      // Salt shaker
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);
      g.fillStyle(0xF0F0F0, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      g.fillStyle(0xC0C0C0, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0xDDDDDD, 1);
      g.fillRect(-10, -18, 20, 4);
      g.fillStyle(0x666666, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillRect(-8, 8, 16, 16);
      g.fillStyle(0x4488FF, 0.8);
      g.fillRect(-8, 2, 16, 8);
      return { w: 32, h: 54 };

    } else if (tKey === 'pepper') {
      // Pepper shaker
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      g.fillStyle(0x222222, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0x444444, 1);
      g.fillRect(-10, -18, 20, 4);
      g.fillStyle(0x111111, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      g.fillStyle(0x1A1A1A, 0.6);
      g.fillRect(-8, 8, 16, 16);
      g.fillStyle(0xFF4444, 0.8);
      g.fillRect(-8, 2, 16, 8);
      return { w: 32, h: 54 };

    } else if (tKey === 'oil_vinegar') {
      // Oil & vinegar bottles
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(0, 26, 45, 10);
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-28, -2, 22, 32, 4);
      g.fillRect(-22, -18, 10, 18);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-24, -22, 14, 6);
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(6, -2, 22, 32, 4);
      g.fillRect(12, -18, 10, 18);
      g.fillStyle(0x662200, 1);
      g.fillRect(10, -22, 14, 6);
      return { w: 60, h: 58 };
    }

    return { w: 50, h: 50 };
  }

  pickupTreatment(tKey) {
    soundManager.robotPickup();
    const pointer = this.input.activePointer;

    // Create a held visual using the same art as station display
    const c = this.add.container(pointer.x, pointer.y).setDepth(100);
    const g = this.add.graphics();
    const size = this.drawTreatmentGraphics(g, tKey);
    c.setSize(size.w, size.h);
    c.add(g);

    c.setAlpha(0.9);
    c.setScale(0.4);
    this.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    this.heldItem = {
      visual: c,
      treatmentKey: tKey,
    };

    soundManager.treatmentSound();
  }

  applyTreatmentToTray(tray, treatmentKey) {
    if (!tray.order.treatments || tray.order.treatments.length === 0) {
      soundManager.buzz();
      this.flashTray(tray, 0xff0000);
      return;
    }

    const needed = tray.order.treatments.includes(treatmentKey);
    const alreadyApplied = tray.appliedTreatments.includes(treatmentKey);

    if (!needed || alreadyApplied) {
      soundManager.buzz();
      this.flashTray(tray, 0xff0000);
      return;
    }

    tray.appliedTreatments.push(treatmentKey);
    soundManager.treatmentSound();

    this.updateTicketTreatment(tray.orderNum, treatmentKey);
    this.drawTreatmentEffect(tray, treatmentKey);
    this.updateTrayNextHint(tray);
    this.checkTrayCompletion(tray);
  }

  drawTreatmentEffect(tray, treatmentKey) {
    const g = this.add.graphics();
    // Top of the topmost layer and bottom of the stack
    const stackTop = -16 - (tray.stackHeight || 0);
    const stackBot = -16 + 9;
    const hw = false ? 80 : 55;

    if (treatmentKey === 'toasted') {
      // Redraw bread layers with toasted colors and grill marks
      if (tray.breadLayers) {
        tray.breadLayers.forEach(bread => {
          const ing = INGREDIENTS[bread.key];
          const toastedColor = ing.toastedColor || 0xC4943D;
          const toastedBorder = ing.toastedBorder || 0x8B6914;

          // Clear and redraw the bread graphics
          bread.graphics.clear();
          bread.graphics.fillStyle(toastedColor, 1);
          bread.graphics.lineStyle(1.5, toastedBorder, 0.8);

          if (bread.isBottom) {
            bread.graphics.fillRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 4, bread.w, 10, 3);
            bread.graphics.strokeRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 4, bread.w, 10, 3);
            // Grill marks on bottom bread
            bread.graphics.lineStyle(2, 0x6B4010, 0.5);
            for (let i = 0; i < 3; i++) {
              const markX = bread.rX - bread.hw + 8 + i * (bread.w - 16) / 2;
              bread.graphics.lineBetween(markX, bread.ly + bread.rY - 3, markX + 4, bread.ly + bread.rY + 4);
            }
          } else {
            // Top bread dome
            bread.graphics.fillRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 3, bread.w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
            bread.graphics.strokeRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 3, bread.w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
            // Grill marks on top bread
            bread.graphics.lineStyle(2, 0x6B4010, 0.5);
            for (let i = 0; i < 3; i++) {
              const markX = bread.rX - bread.hw + 10 + i * (bread.w - 20) / 2;
              bread.graphics.lineBetween(markX, bread.ly + bread.rY - 2, markX + 3, bread.ly + bread.rY + 3);
            }
          }
        });
      }
      // No additional overlay needed - bread is now toasted
    } else if (treatmentKey === 'togo') {
      g.lineStyle(2, 0xD4C4A0, 0.7);
      g.strokeRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
      g.fillStyle(0xD4C4A0, 0.15);
      g.fillRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
    } else if (treatmentKey === 'salt') {
      // Salt specks (white only)
      for (let i = 0; i < 8; i++) {
        const sx = (Math.random() - 0.5) * (hw * 2 - 10);
        const sy = stackTop + Math.random() * (stackBot - stackTop + 6);
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(sx, sy, 1.2);
      }
    } else if (treatmentKey === 'pepper') {
      // Pepper specks (black only)
      for (let i = 0; i < 8; i++) {
        const sx = (Math.random() - 0.5) * (hw * 2 - 10);
        const sy = stackTop + Math.random() * (stackBot - stackTop + 6);
        g.fillStyle(0x222222, 0.8);
        g.fillCircle(sx, sy, 1.2);
      }
    } else if (treatmentKey === 'oil_vinegar') {
      const midY = (stackTop + stackBot) / 2;
      g.lineStyle(1.5, 0xAAAA22, 0.5);
      g.beginPath();
      g.moveTo(-hw + 20, midY - 2);
      for (let sx = -hw + 20; sx <= hw - 20; sx += 6) {
        g.lineTo(sx, midY - 2 + ((Math.floor(sx / 6) % 2 === 0) ? -2 : 2));
      }
      g.strokePath();
      g.lineStyle(1, 0x884422, 0.4);
      g.beginPath();
      g.moveTo(-hw + 25, midY + 2);
      for (let sx = -hw + 25; sx <= hw - 25; sx += 7) {
        g.lineTo(sx, midY + 2 + ((Math.floor(sx / 7) % 2 === 0) ? 2 : -1));
      }
      g.strokePath();
    }

    tray.container.add(g);
  }

  /* =========================================
     CLICK TO PLACE (replaces drag & drop)
     ========================================= */
  setupDragAndDrop() {
    this.trayHighlight = this.add.graphics().setDepth(9);

    this.input.on('pointermove', (pointer) => {
      // Update robot arm to follow cursor
      this.robotArm.setTarget(pointer.x, pointer.y);
      this.robotArm.setGripping(!!this.heldItem);

      if (!this.heldItem) {
        this.trayHighlight.clear();
        this.glowGraphics.clear();
        this.magnetActive = false;
        return;
      }

      // INGREDIENT MAGNETISM - snap toward target tray
      let targetX = pointer.x;
      let targetY = pointer.y;
      let magnetStrength = 0;
      let targetTray = null;

      if (pointer.y < this.BELT_TOP) {
        const tray = this.findTrayAtX(pointer.x);
        if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
          targetTray = tray;
          const trayX = tray.container.x;
          const trayY = this.LAND_Y;
          const distX = Math.abs(pointer.x - trayX);
          const distY = Math.abs(pointer.y - trayY);
          const magnetRadius = false ? 120 : 100;

          if (distX < magnetRadius && distY < 80) {
            // Calculate magnet pull (stronger when closer)
            const dist = Math.sqrt(distX * distX + distY * distY);
            magnetStrength = Math.max(0, 1 - dist / magnetRadius);

            // Apply magnetic pull
            targetX = pointer.x + (trayX - pointer.x) * magnetStrength * 0.4;
            targetY = pointer.y + (trayY - pointer.y) * magnetStrength * 0.3;

            // Play magnet sound on first engagement
            if (!this.magnetActive && magnetStrength > 0.3) {
              soundManager.magnetSlide();
              this.magnetActive = true;
            }
          } else {
            this.magnetActive = false;
          }
        }
      }

      this.heldItem.visual.x = targetX;
      this.heldItem.visual.y = targetY;

      // Draw glow effect around dragged item (enhanced when magnetized)
      this.glowGraphics.clear();
      const glowSize = 70 + magnetStrength * 30;
      const glowAlpha = (0.15 + Math.sin(Date.now() * 0.008) * 0.1) * (1 + magnetStrength);
      const glowColor = magnetStrength > 0.3 ? 0x44ff88 : 0x00ddff;
      this.glowGraphics.fillStyle(glowColor, glowAlpha);
      this.glowGraphics.fillCircle(targetX, targetY, glowSize);
      this.glowGraphics.fillStyle(glowColor, glowAlpha * 0.5);
      this.glowGraphics.fillCircle(targetX, targetY, glowSize * 1.4);

      // Drag trail particles
      if (this.heldItem.ingredientKey) {
        const ing = INGREDIENTS[this.heldItem.ingredientKey];
        this.particleManager.dragTrail(targetX, targetY, ing.color);
      }

      // Highlight target tray
      this.trayHighlight.clear();
      if (targetTray) {
        const hw = targetTray.isFooter ? 105 : 72;
        const pulseAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15 + magnetStrength * 0.3;
        this.trayHighlight.lineStyle(3 + magnetStrength * 2, 0x44ff88, pulseAlpha);
        this.trayHighlight.strokeRoundedRect(
          targetTray.container.x - hw, 270, hw * 2, 155, 8,
        );
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isPaused || !this.heldItem) return;
      this.placeHeldItem(pointer);
      this.glowGraphics.clear();
    });

    this.escKey.on('down', () => {
      // Toggle settings menu, or cancel held item
      if (this.settingsMenu.isOpen) {
        this.settingsMenu.close();
      } else if (this.heldItem) {
        this.cancelHeldItem();
        this.glowGraphics.clear();
      } else {
        this.settingsMenu.open();
      }
    });

    // === TRAY DRAGGING ===
    this.draggedTray = null;
    this.trayDragStartPos = { x: 0, y: 0 };

    this.input.on('dragstart', (pointer, gameObject) => {
      // Find tray associated with this container
      const tray = this.trays.find(t => t.container === gameObject);
      if (tray && tray.draggable) {
        this.draggedTray = tray;
        this.trayDragStartPos.x = tray.container.x;
        this.trayDragStartPos.y = tray.container.y;
        soundManager.robotPickup();
      }
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (this.draggedTray && this.draggedTray.container === gameObject) {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    });

    this.input.on('dragend', (pointer, gameObject) => {
      const tray = this.draggedTray;
      if (!tray || tray.container !== gameObject) return;

      const x = gameObject.x;
      const y = gameObject.y;

      // Try to place on belt
      if (tray.onPrepTrack && tray.completed) {
        // Check if near belt area
        if (y < 450 && x > 200 && x < 900) {
          // Remove from prep track
          if (tray.prepSlot) {
            this.prepTrack.removeTray(tray.prepSlot);
          }
          tray.onBelt = true;
          tray.onPrepTrack = false;
          tray.draggable = false;
          gameObject.x = x;
          gameObject.y = this.BELT_Y;
          gameObject.disableInteractive();
          soundManager.whoosh();
          this.particleManager.trayPlaced(x, this.BELT_Y);
          this.draggedTray = null;
          return;
        }
      }

      // Invalid drop - return to start position
      soundManager.cancelSound();
      this.tweens.add({
        targets: gameObject,
        x: this.trayDragStartPos.x,
        y: this.trayDragStartPos.y,
        duration: 200,
        ease: 'Back.easeOut'
      });

      this.draggedTray = null;
    });
  }

  drawDebugHitboxes() {
    const g = this.add.graphics().setDepth(999);

    this.children.list.forEach((obj) => {
      if (!obj.input || !obj.input.hitArea) return;
      const ha = obj.input.hitArea;
      if (!(ha instanceof Phaser.Geom.Rectangle)) return;

      if (obj instanceof Phaser.GameObjects.Image) {
        // Image hitAreas are in frame-space (0,0 = top-left of texture)
        const ox = obj.x - obj.displayWidth * obj.originX;
        const oy = obj.y - obj.displayHeight * obj.originY;
        const sx = obj.displayWidth / obj.width;
        const sy = obj.displayHeight / obj.height;
        g.lineStyle(1, 0x00ff00, 0.7);
        g.strokeRect(ox + ha.x * sx, oy + ha.y * sy, ha.width * sx, ha.height * sy);
      } else if (obj instanceof Phaser.GameObjects.Container) {
        // Container hitAreas use centered coordinates
        g.lineStyle(1, 0x00ffff, 0.7);
        g.strokeRect(obj.x + ha.x, obj.y + ha.y, ha.width, ha.height);
      }
    });
  }

  /* =========================================
     KEYBOARD SHORTCUTS
     ========================================= */
  setupKeyboardShortcuts() {
    // Map of keyboard shortcut key -> ingredient/action
    // Meats: 1-4 + Q for prosciutto
    // Veggies: 5-7 (base) + 8-0 (unlockable)
    // Cheeses: W, E
    // Sauces: A, S
    // Treatments: R, F, G, H, V
    this.shortcutMap = {
      'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4', 'meat_prosciutto': 'Q',
      'top_lettuce': '5', 'top_tomato': '6', 'top_onion': '7',
      'top_pickles': '8', 'top_arugula': '9', 'top_olives': '0',
      'cheese_american': 'W', 'cheese_swiss': 'E',
      'sauce_mayo': 'A', 'sauce_mustard': 'S',
      'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V',
    };

    const KC = Phaser.Input.Keyboard.KeyCodes;

    const bindings = [
      // Meats
      { code: KC.ONE,   ingredient: 'meat_ham' },
      { code: KC.TWO,   ingredient: 'meat_turkey' },
      { code: KC.THREE, ingredient: 'meat_roastbeef' },
      { code: KC.FOUR,  ingredient: 'meat_bacon' },
      { code: KC.Q,     ingredient: 'meat_prosciutto' },
      // Veggies
      { code: KC.FIVE,  ingredient: 'top_lettuce' },
      { code: KC.SIX,   ingredient: 'top_tomato' },
      { code: KC.SEVEN, ingredient: 'top_onion' },
      { code: KC.EIGHT, ingredient: 'top_pickles' },
      { code: KC.NINE,  ingredient: 'top_arugula' },
      { code: KC.ZERO,  ingredient: 'top_olives' },
      // Cheeses
      { code: KC.W,     ingredient: 'cheese_american' },
      { code: KC.E,     ingredient: 'cheese_swiss' },
      // Sauces
      { code: KC.A,     ingredient: 'sauce_mayo' },
      { code: KC.S,     ingredient: 'sauce_mustard' },
      // Treatments
      { code: KC.R,     treatment: 'toasted' },
      { code: KC.F,     treatment: 'togo' },
      { code: KC.G,     treatment: 'salt' },
      { code: KC.H,     treatment: 'pepper' },
      { code: KC.V,     treatment: 'oil_vinegar' },
    ];

    bindings.forEach(({ code, ingredient, treatment }) => {
      const key = this.input.keyboard.addKey(code);
      key.on('down', () => {
        if (this.isPaused || this.heldItem || !this.isStoreOpen) return;

        // Check if ingredient is unlocked
        if (ingredient) {
          const ing = INGREDIENTS[ingredient];
          if (ing && ing.unlockDay && this.day < ing.unlockDay) {
            return; // Ingredient not unlocked yet
          }
        }

        soundManager.init();
        if (treatment) {
          this.pickupTreatment(treatment);
        } else if (ingredient) {
          const pointer = this.input.activePointer;
          if (ingredient.startsWith('sauce_')) {
            this.pickupSauce(ingredient);
          } else {
            soundManager.robotPickup();
            const visual = this.createHeldVisual(ingredient, pointer.x, pointer.y);
            this.heldItem = { visual, ingredientKey: ingredient, binX: 0, binY: 0 };
                  }
        }
      });
    });
  }

  getShortcutKey(ingredientOrTreatment) {
    return this.shortcutMap ? this.shortcutMap[ingredientOrTreatment] || '' : '';
  }

  updateTrayNextHint(tray) {
    if (!tray.hintText || tray.completed || tray.done) return;

    const nextIndex = tray.placed.length;
    if (nextIndex < tray.order.ingredients.length) {
      // Show shortcut for next ingredient
      const nextKey = tray.order.ingredients[nextIndex];
      const shortcut = this.getShortcutKey(nextKey);
      const ingName = INGREDIENTS[nextKey] ? INGREDIENTS[nextKey].name : '';
      if (shortcut) {
        tray.hintText.setText(`[${shortcut}] ${ingName}`);
      } else {
        // Bread has no shortcut — show name only
        tray.hintText.setText(ingName);
      }
    } else {
      // All ingredients placed — show treatment hints if any remain
      const remainingTreats = (tray.order.treatments || []).filter(
        (t) => !tray.appliedTreatments.includes(t)
      );
      if (remainingTreats.length > 0) {
        const hints = remainingTreats.map((t) => {
          const shortcut = this.getShortcutKey(t);
          const name = TREATMENTS[t] ? TREATMENTS[t].name : t;
          return shortcut ? `[${shortcut}] ${name}` : name;
        });
        tray.hintText.setText(hints.join(' '));
      } else {
        tray.hintText.setText('');
      }
    }
  }

  createHeldVisual(key, x, y) {
    const ing = INGREDIENTS[key];
    const c = this.add.container(x, y).setDepth(100);
    c.setSize(130, 56);

    // Sauces use _bottle textures since no standalone sauce texture exists
    const textureKey = key.includes('sauce') ? key + '_bottle' : key;
    const img = this.add.image(0, 0, textureKey).setOrigin(0.5);
    // Adjust scale for held view
    if (key.includes('meat') || key.includes('cheese')) img.setScale(0.65);
    else if (key.includes('top')) img.setScale(0.7);
    else if (key.includes('bread')) img.setScale(0.75); // Pita bread is already smaller
    else if (key.includes('sauce')) img.setScale(0.4);

    c.add(img);

    const label = this.add.text(0, 17, ing.name, {
      fontSize: '13px', color: ing.textColor || '#000',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.setAlpha(0.85);

    c.setScale(0.4);
    this.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    return c;
  }

  placeHeldItem(pointer) {
    const obj = this.heldItem.visual;
    const tray = this.findTrayAtX(pointer.x);
    const landY = this.LAND_Y;
    const isTreatment = !!this.heldItem.treatmentKey;
    const savedTreatmentKey = this.heldItem.treatmentKey;
    const savedIngredientKey = this.heldItem.ingredientKey;

    // Only allow placing on trays that are on prep track
    if (tray && tray.onPrepTrack && !tray.completed && !tray.done && !tray.passedFinish && pointer.y < landY + 40) {
      soundManager.robotRelease();
      const fallDist = Math.max(0, landY - obj.y);
      const duration = Math.max(80, Math.min(400, fallDist * 1.8));

      this.tweens.add({
        targets: obj,
        y: landY,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          if (tray && !tray.done) {
            obj.x += (tray.container.x - obj.x) * 0.15;
          }
        },
        onComplete: () => {
          if (isTreatment) {
            this.applyTreatmentToTray(tray, savedTreatmentKey);
          } else {
            const key = savedIngredientKey;
            const result = this.tryPlace(tray, key);
            if (result === 'valid') {
              const ing = INGREDIENTS[key];
              soundManager.plopCategory(ing.category);
              // Particle effect for successful placement
              this.particleManager.ingredientPlaced(tray.container.x, landY, ing.color);
            } else if (result === 'wrong') {
              soundManager.buzz();
              this.currentScore = Math.max(0, this.currentScore - 25);
              this.refreshHUD();
              this.flashTray(tray, 0xff0000);
              // Particle effect for error
              this.particleManager.errorSparks(tray.container.x, landY);

              // Show what ingredient is expected
              const expectedKey = tray.order.ingredients[tray.placed.length];
              const expectedName = expectedKey ? INGREDIENTS[expectedKey].name : '?';
              const needTxt = this.add.text(tray.container.x, tray.container.y - 60,
                `Need ${expectedName}!\n-25`, {
                fontSize: '16px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold',
                align: 'center',
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({
                targets: needTxt, y: needTxt.y - 40, alpha: 0, duration: 1200,
                onComplete: () => needTxt.destroy(),
              });
            }
          }
          obj.destroy();
        },
      });

      this.heldItem = null;
      this.trayHighlight.clear();
    } else {
      this.cancelHeldItem();
    }
  }

  cancelHeldItem() {
    if (!this.heldItem) return;
    soundManager.robotRelease();
    soundManager.cancelSound();
    const obj = this.heldItem.visual;

    this.tweens.add({
      targets: obj,
      y: obj.y + 60,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => obj.destroy(),
    });

    this.heldItem = null;
    this.trayHighlight.clear();
  }

  findTrayAtX(x) {
    let closest = null;
    let closestDist = Infinity;

    for (const tray of this.trays) {
      if (tray.done || tray.passedFinish || tray.completed) continue;
      const tolerance = false ? 110 : 80;
      const dist = Math.abs(tray.container.x - x);
      if (dist < tolerance && dist < closestDist) {
        closest = tray;
        closestDist = dist;
      }
    }
    return closest;
  }

  /* =========================================
     TRAY SPAWNING
     ========================================= */
  spawnTray() {
    // Check if store is open
    if (!this.isStoreOpen) {
      return;
    }

    // Max 4 unfulfilled orders at once
    const activeOrders = this.trays.filter(t => !t.done && !t.completed).length;
    if (activeOrders >= 4) return;

    // Only spawn if there's an empty prep slot
    const slot = this.prepTrack.findEmptySlot();
    if (!slot) return;

    const order = this.generateOrder();
    this.orderNumber++;
    const orderNum = this.orderNumber;

    // Tray container — spawn directly at prep slot position (hidden until customer arrives)
    const container = this.add.container(slot.x, slot.y).setDepth(10);
    container.setAlpha(0);
    container.setScale(0.85);

    // Use thin tray sprite (thinner profile)
    const traySprite = this.add.image(0, 0, 'tray_thin');
    traySprite.setScale(0.8);
    container.add(traySprite);

    // Order number badge (adjusted Y for thinner tray)
    const numBg = this.add.graphics();
    numBg.fillStyle(0xFFFFC0, 1);
    numBg.fillCircle(0, -22, 16);
    numBg.lineStyle(2, 0xDDCC80, 1);
    numBg.strokeCircle(0, -22, 16);
    container.add(numBg);

    const numText = this.add.text(0, -22, `${orderNum}`, {
      fontSize: '15px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    // Next-ingredient shortcut hint
    const hintText = this.add.text(0, -50, '', {
      fontSize: '12px', color: '#ff0', fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(11);
    container.add(hintText);

    const tray = {
      container,
      order,
      orderNum,
      placed: [],
      stackLayers: [],
      stackHeight: 0,
      appliedTreatments: [],
      completed: false,
      done: false,
      passedFinish: false,
      scored: false,
      hintText,
      inHolding: false,
      onPrepTrack: true,
      onBelt: false,
      prepSlot: slot,
      draggable: true,
      waitingForCustomer: true,
    };

    // Register tray in the prep slot
    slot.occupied = true;
    slot.tray = tray;

    this.trays.push(tray);

    // Size the container for later interactivity
    container.setSize(traySprite.width * traySprite.scaleX, traySprite.height * traySprite.scaleY);
    this.ordersSpawned++;

    // Dock a customer vessel — order appears when the customer arrives at the window
    this.customerVessels.dockVessel(tray, () => {
      tray.waitingForCustomer = false;

      // Now add the ticket to the slider
      this.addTicket(order, orderNum);

      // Make tray interactive for dragging
      container.setInteractive({ draggable: true, useHandCursor: true });
      this.updateTrayNextHint(tray);

      // Entrance animation: fade in + scale bounce
      this.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      this.prepTrack.render();
      this.refreshHUD();
    });

    if (this.ordersSpawned === 3) {
      this.spawnTimer = this.spawnInterval * 0.5;
    }

    this.prepTrack.render();
    this.refreshHUD();
  }

  generateOrder() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickN = (arr, n) => {
      const copy = [...arr];
      const out = [];
      for (let i = 0; i < n && copy.length; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    };

    // All ingredients available from start
    const breads = ['bread_white', 'bread_wheat', 'bread_sourdough'];
    const meats = ['meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon', 'meat_prosciutto'];
    const cheeses = ['cheese_american', 'cheese_swiss'];
    const toppings = ['top_lettuce', 'top_tomato', 'top_onion', 'top_pickles', 'top_arugula', 'top_olives'];
    const sauces = ['sauce_mayo', 'sauce_mustard'];

    // Calculate difficulty based on game time
    const minutesPlayed = this.gameTime / 60;
    const diff = DIFFICULTY_PROGRESSION;
    const maxToppings = Math.min(
      diff.maxMaxToppings,
      Math.floor(diff.initialMaxToppings + minutesPlayed * diff.maxToppingsIncrease)
    );
    const treatmentChance = Math.min(
      diff.maxTreatmentChance,
      diff.initialTreatmentChance + minutesPlayed * diff.treatmentChanceIncrease
    );

    const list = [];
    const bread = pick(breads);

    // Build sandwich (no footer concept)
    list.push(bread);
    list.push(pick(meats));

    // 70% chance of cheese (starts at 70%, doesn't change)
    if (Math.random() < 0.7) {
      list.push(pick(cheeses));
    }

    // Toppings based on difficulty (starts with 0-1, eventually 0-4)
    const topCount = Math.floor(Math.random() * (maxToppings + 1));
    if (topCount > 0) {
      pickN(toppings, topCount).forEach((t) => list.push(t));
    }

    // 60% chance of sauce
    if (Math.random() < 0.6) {
      list.push(pick(sauces));
    }

    list.push(bread);

    // Treatments based on difficulty
    const treatments = [];
    if (Math.random() < treatmentChance) {
      const allTreatments = Object.keys(TREATMENTS);
      const count = Math.random() < 0.3 ? 2 : 1; // 30% chance of 2 treatments
      const chosen = pickN(allTreatments, count);
      chosen.forEach((t) => treatments.push(t));
    }

    const totalPrice = this.calculateOrderPrice(list, treatments);
    return { ingredients: list, treatments, totalPrice };
  }

  calculateOrderPrice(ingredients, treatments) {
    let price = 1.50; // Base price
    ingredients.forEach(key => {
      const ing = INGREDIENTS[key];
      price += (ing.price || 0.50);
    });
    treatments.forEach(() => price += 0.25);
    return price;
  }

  /* =========================================
     PLACING INGREDIENTS (strict order)
     ========================================= */
  tryPlace(tray, ingredientKey) {
    const nextIndex = tray.placed.length;
    if (nextIndex >= tray.order.ingredients.length) return 'wrong';

    const expected = tray.order.ingredients[nextIndex];
    if (ingredientKey !== expected) return 'wrong';

    tray.placed.push(ingredientKey);

    this.updateTicketIngredient(tray.orderNum, ingredientKey);

    this.addStackLayer(tray, ingredientKey);

    this.updateTrayNextHint(tray);

    this.checkTrayCompletion(tray);

    return 'valid';
  }

  /* =========================================
     STACK VISUALS (recognizable layers)
     ========================================= */
  getLayerHeight(ingredientKey) {
    const cat = INGREDIENTS[ingredientKey].category;
    if (cat === 'sauce') return 2;
    if (cat === 'topping') return 4;
    if (cat === 'cheese') return 4;
    if (cat === 'meat') return 5;
    return 6; // bread
  }

  addStackLayer(tray, ingredientKey) {
    const ing = INGREDIENTS[ingredientKey];
    const cat = ing.category;

    const layerH = this.getLayerHeight(ingredientKey);
    const ly = -2 - tray.stackHeight;
    tray.stackHeight += layerH;

    const rX = (Math.random() - 0.5) * 4;
    const rY = (Math.random() - 0.5) * 2;
    const w = false ? 80 : 55;
    const hw = w / 2;

    const g = this.add.graphics();

    if (cat === 'bread') {
      // Bottom bread = flat base + dome top; top bread = dome
      const isBottom = tray.stackLayers.length === 0;
      g.fillStyle(ing.color, 1);
      g.lineStyle(1.5, ing.border, 0.8);
      if (isBottom) {
        g.fillRoundedRect(rX - hw, ly + rY - 4, w, 10, 3);
        g.strokeRoundedRect(rX - hw, ly + rY - 4, w, 10, 3);
      } else {
        // Top bread dome
        g.fillRoundedRect(rX - hw, ly + rY - 3, w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
        g.strokeRoundedRect(rX - hw, ly + rY - 3, w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
      }
      // Store bread layer info for toasting
      if (!tray.breadLayers) tray.breadLayers = [];
      tray.breadLayers.push({ graphics: g, key: ingredientKey, isBottom, rX, rY, ly, w, hw });
    } else if (cat === 'meat') {
      // Folded deli meat — wavy oval
      const mw = hw - 2;
      g.fillStyle(ing.color, 0.95);
      g.lineStyle(1, ing.border, 0.7);
      g.fillEllipse(rX, ly + rY, mw * 2, 8);
      g.strokeEllipse(rX, ly + rY, mw * 2, 8);
      // Fold highlight
      g.fillStyle(darkenColor(ing.color, 0.85), 0.4);
      g.fillEllipse(rX + 4, ly + rY - 1, mw, 4);
    } else if (cat === 'cheese') {
      // Thin rectangle, slightly wider than meat, droopy edges
      const cw = hw - 1;
      g.fillStyle(ing.color, 1);
      g.lineStyle(1, ing.border, 0.8);
      g.fillRect(rX - cw, ly + rY - 2, cw * 2, 5);
      g.strokeRect(rX - cw, ly + rY - 2, cw * 2, 5);
      // Droopy edges
      g.fillTriangle(rX - cw, ly + rY + 3, rX - cw - 3, ly + rY + 7, rX - cw + 5, ly + rY + 3);
      g.fillTriangle(rX + cw, ly + rY + 3, rX + cw + 3, ly + rY + 7, rX + cw - 5, ly + rY + 3);
      if (ingredientKey === 'cheese_swiss') {
        // Swiss cheese holes
        g.fillStyle(darkenColor(ing.color, 0.8), 0.6);
        g.fillCircle(rX - 8, ly + rY, 2);
        g.fillCircle(rX + 6, ly + rY + 1, 1.5);
      }
    } else if (ingredientKey === 'top_lettuce') {
      // Wavy green leaf
      g.fillStyle(ing.color, 0.9);
      g.lineStyle(1, ing.border, 0.7);
      g.beginPath();
      g.moveTo(rX - hw + 4, ly + rY);
      for (let i = 0; i <= 8; i++) {
        const px = rX - hw + 4 + (i / 8) * (w - 8);
        const py = ly + rY + Math.sin(i * 1.8) * 3;
        g.lineTo(px, py - 3);
      }
      for (let i = 8; i >= 0; i--) {
        const px = rX - hw + 4 + (i / 8) * (w - 8);
        const py = ly + rY + Math.sin(i * 1.8 + 1) * 2;
        g.lineTo(px, py + 3);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (ingredientKey === 'top_tomato') {
      // Two-three tomato slices
      g.fillStyle(ing.color, 0.9);
      g.lineStyle(1, ing.border, 0.7);
      const sliceW = 12;
      for (let i = -1; i <= 1; i++) {
        g.fillEllipse(rX + i * (sliceW + 2), ly + rY, sliceW, 6);
        g.strokeEllipse(rX + i * (sliceW + 2), ly + rY, sliceW, 6);
        // Seed pattern
        g.fillStyle(0xFFAAAA, 0.5);
        g.fillCircle(rX + i * (sliceW + 2), ly + rY, 1.5);
        g.fillStyle(ing.color, 0.9);
      }
    } else if (ingredientKey === 'top_onion') {
      // Onion rings
      g.lineStyle(2, ing.border, 0.8);
      g.strokeEllipse(rX - 10, ly + rY, 14, 6);
      g.strokeEllipse(rX + 8, ly + rY, 16, 7);
      g.fillStyle(ing.color, 0.5);
      g.fillEllipse(rX - 10, ly + rY, 14, 6);
      g.fillEllipse(rX + 8, ly + rY, 16, 7);
    } else if (cat === 'sauce') {
      // Zigzag drizzle across the width
      g.lineStyle(2.5, ing.color, 0.9);
      g.beginPath();
      const steps = 7;
      g.moveTo(rX - hw + 6, ly + rY);
      for (let i = 1; i <= steps; i++) {
        const px = rX - hw + 6 + (i / steps) * (w - 12);
        const py = ly + rY + (i % 2 === 0 ? -3 : 3);
        g.lineTo(px, py);
      }
      g.strokePath();
    }

    tray.container.add(g);
    tray.stackLayers.push(g);
  }

  checkTrayCompletion(tray) {
    const ingredientsDone = tray.placed.length === tray.order.ingredients.length;
    const treatmentsDone = !tray.order.treatments || tray.order.treatments.length === 0
      || tray.order.treatments.every((t) => tray.appliedTreatments.includes(t));

    if (ingredientsDone && treatmentsDone) {
      this.completeTray(tray);
    }
  }

  completeTray(tray) {
    tray.completed = true;
    tray.completedAtX = tray.container.x;
    if (tray.hintText) tray.hintText.setText('');
    this.flashTray(tray, 0x00ff00);

    // Success sound
    soundManager.successChime();

    // Particle burst for completion
    this.particleManager.orderCompleted(tray.container.x, tray.container.y - 20);

    const c = tray.container;
    this.animateCompletionHop(c, c.y);
    this.animateCompletionDance(c);
    this.animateChefPress(c);
  }

  animateCompletionHop(container, baseY) {
    this.tweens.add({
      targets: container, y: baseY - 18, scaleX: 0.9, scaleY: 1.2,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container, y: baseY, scaleX: 1.15, scaleY: 0.85,
          duration: 100, ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: container, scaleX: 1.0, scaleY: 1.0,
              duration: 200, ease: 'Bounce.easeOut',
            });
          },
        });
      },
    });
  }

  animateCompletionDance(container) {
    this.tweens.chain({
      targets: container,
      tweens: [
        { angle: -10, duration: 80, ease: 'Sine.easeOut', delay: 100 },
        { angle: 10, duration: 100, ease: 'Sine.easeInOut' },
        { angle: -8, duration: 90, ease: 'Sine.easeInOut' },
        { angle: 8, duration: 85, ease: 'Sine.easeInOut' },
        { angle: -4, duration: 75, ease: 'Sine.easeInOut' },
        { angle: 3, duration: 70, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 80, ease: 'Sine.easeOut' },
      ],
    });
  }

  animateChefPress(container) {
    // Animate sandwich squish
    this.time.delayedCall(700, () => {
      if (!container || !container.scene) return;
      this.tweens.add({
        targets: container,
        scaleY: 0.82,
        scaleX: 1.06,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.tweens.add({
            targets: container,
            scaleY: 0.88,
            scaleX: 1.02,
            duration: 200,
            ease: 'Bounce.easeOut',
          });
        },
      });
    });

  }

  flashTray(tray, color) {
    const flash = this.add.graphics();
    const hw = false ? 105 : 70;
    flash.fillStyle(color, 0.25);
    flash.fillRoundedRect(-hw, -130, hw * 2, 145, 8);
    tray.container.add(flash);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });
  }

  /* =========================================
     SCORING (at finish line)
     ========================================= */
  handleScore(tray) {
    tray.scored = true;
    this.ordersCompleted++;

    // Score based on price (apply location tip multiplier)
    const orderValue = (tray.order.totalPrice || 5.00) * this.locationModifiers.tipMult;
    this.gameMoney += orderValue;

    const baseScore = Math.floor(orderValue * 10);
    const speedBonus = (tray.completedAtX || 0) > this.SPEED_BONUS_X ? 50 : 0;
    const scoreGain = baseScore + speedBonus;
    this.currentScore += scoreGain;

    // Check for new high score!
    const wasHighScore = this.currentScore > this.highScore;
    if (wasHighScore) {
      this.highScore = this.currentScore;
      this.saveHighScore(this.highScore);
      // Fanfare for new high score!
      soundManager.fanfare();
      this.showHighScoreFanfare();
    } else {
      soundManager.score();
    }

    this.refreshHUD();
    this.markTicketCompleted(tray.orderNum);

    const popupText = speedBonus > 0
      ? `$${orderValue.toFixed(2)}\n+SPEED BONUS!`
      : `$${orderValue.toFixed(2)}`;
    const popup = this.add.text(tray.container.x, tray.container.y - 70,
      popupText, {
      fontSize: '26px', color: '#0f0', fontFamily: 'Arial', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: popup, y: popup.y - 50, alpha: 0, duration: 1200,
      onComplete: () => popup.destroy(),
    });

    const check = this.add.text(0, -90, '\u2713', {
      fontSize: '30px', color: '#0f0', fontStyle: 'bold',
    }).setOrigin(0.5);
    tray.container.add(check);

    // Vessel departs on completed order
    this.customerVessels.undockVessel(tray);

    this.resolveSequential();
  }

  showHighScoreFanfare() {
    // Big celebration for new high score!
    const fanfare = this.add.text(512, 200, 'NEW HIGH SCORE!', {
      fontSize: '48px',
      color: '#FFD700',
      fontFamily: 'Bungee, Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(150);

    // Pulsing animation
    this.tweens.add({
      targets: fanfare,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: fanfare.y - 100,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => fanfare.destroy()
    });

    // Particle burst
    this.particleManager.orderCompleted(512, 200);
  }

  /* =========================================
     MISSES (no more strikes/game over)
     ========================================= */
  handleMiss(tray) {
    if (this.isPaused) return;
    this.ordersMissed++;
    this.refreshHUD();
    soundManager.buzz();

    this.markTicketMissed(tray.orderNum);

    // Screen shake
    this.cameras.main.shake(200, 0.005);

    // Red flash overlay
    const flash = this.add.rectangle(512, 384, 1024, 768, 0xff0000, 0.18).setDepth(200);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => flash.destroy(),
    });

    // "MISSED!" text at tray position
    const miss = this.add.text(tray.container.x, tray.container.y - 40, '\u2717 MISSED!', {
      fontSize: '36px', color: '#ff3333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: miss, alpha: 0, y: miss.y - 60, duration: 1200,
      onComplete: () => miss.destroy(),
    });

    // Vessel departs on missed order
    this.customerVessels.undockVessel(tray);

    this.resolveSequential();
    // No game over in endless mode!
  }

  resolveSequential() {
    if (this.ordersSpawned < 3) {
      this.waitingForNext = true;
      this.sequentialDelay = 0;
    }
  }

  /* =========================================
     CLEANUP
     ========================================= */
  destroyTray(tray) {
    tray.container.destroy();
  }

  createEndShiftButton() {
    const btnX = 920;
    const btnY = 6;
    const btnW = 95;
    const btnH = 26;

    const btnG = this.add.graphics().setDepth(5);
    btnG.fillStyle(0x3a1a1a, 0.9);
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
    btnG.lineStyle(1.5, 0xff6666, 0.6);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);

    const btnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'END SHIFT', {
      fontSize: '11px', color: '#ff8888', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setDepth(5);

    const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(5);

    btnHit.on('pointerover', () => {
      btnG.clear();
      btnG.fillStyle(0x4a2a2a, 1);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnG.lineStyle(1.5, 0xff8888, 1);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnText.setColor('#ffaaaa');
    });
    btnHit.on('pointerout', () => {
      btnG.clear();
      btnG.fillStyle(0x3a1a1a, 0.9);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnG.lineStyle(1.5, 0xff6666, 0.6);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnText.setColor('#ff8888');
    });
    btnHit.on('pointerdown', () => this.endShift());
  }

  endShift() {
    if (this.isPaused) return;
    this.isPaused = true;

    const earnings = this.gameMoney;
    const locationId = this.locationData?.id || null;

    // Update persistent game state
    gameState.updateAfterShift(locationId, earnings, this.ordersCompleted, this.ordersMissed);

    // Save high score
    if (this.currentScore > this.highScore) {
      this.saveHighScore(this.currentScore);
    }

    soundManager.fanfare();

    this.time.delayedCall(600, () => {
      this.scene.start('SystemMap', {
        returnFromShift: true,
        shiftEarnings: earnings,
      });
    });
  }

  endDay() {
    this.isPaused = true;
    const finalTotal = this.totalScore + this.dayScore;
    this.time.delayedCall(600, () => {
      this.scene.start('DayEnd', {
        day: this.day,
        dayScore: this.dayScore,
        totalScore: finalTotal,
        ordersCompleted: this.ordersCompleted,
        totalOrders: this.totalOrders,
      });
    });
  }

  /* =========================================
     GAME LOOP
     ========================================= */
  update(time, delta) {
    if (this.isPaused) {
      if (this.heldItem) this.cancelHeldItem();
      return;
    }

    // Track game time for difficulty progression (delta is in ms, convert to seconds)
    this.gameTime += (delta / 1000);

    // Update managers
    this.warningSystem.update();
    this.particleManager.update(delta);
    this.robotArm.update();
    this.prepTrack.update();

    // Count active (non-completed, non-done) tickets for dynamic speed
    const activeTickets = this.trays.filter(t => !t.done && !t.completed).length;

    // Base speed modifier based on ticket count:
    // 0-1 tickets = 1.3x speed (pressure when you're caught up)
    // 2 tickets = 1.0x normal speed
    // 3 tickets = 0.85x (slight mercy)
    // 4+ tickets = 0.7x (more mercy when overwhelmed)
    let ticketSpeedMult = 1.0;
    if (activeTickets <= 1) {
      ticketSpeedMult = 1.3;
    } else if (activeTickets === 2) {
      ticketSpeedMult = 1.0;
    } else if (activeTickets === 3) {
      ticketSpeedMult = 0.85;
    } else {
      ticketSpeedMult = 0.7;
    }

    // Player controls: SPACE speeds up, SHIFT slows down
    let playerMult = 1;
    if (this.spaceKey.isDown && !this.shiftKey.isDown) {
      playerMult = 2.0;
    } else if (this.shiftKey.isDown && !this.spaceKey.isDown) {
      playerMult = 0.4;
    }

    const speedMult = ticketSpeedMult * playerMult;

    // Update speed indicators
    this.speedText.setAlpha(this.spaceKey.isDown && !this.shiftKey.isDown ? 0.8 : 0);
    this.slowText.setAlpha(this.shiftKey.isDown && !this.spaceKey.isDown ? 0.8 : 0);

    // Belt animation
    this.beltOffset -= this.conveyorSpeed * (delta / 16) * speedMult;
    if (this.beltOffset < -40) this.beltOffset += 40;
    this.drawBelt();

    // Boids animation (vessels drifting across window)
    this.boidManager.update(delta);

    // Customer vessels
    this.customerVessels.update(delta);

    // Revenue challenges
    this.revenueChallenges.update(delta);

    // --- spawn logic ---
    if (this.isStoreOpen && this.prepTrack.findEmptySlot()) {
      if (this.ordersSpawned < 3) {
        if (this.waitingForNext) {
          this.sequentialDelay += delta * speedMult;
          const delay = this.ordersSpawned === 0 ? 800 : 1500;
          if (this.sequentialDelay >= delay) {
            this.spawnTray();
            this.waitingForNext = false;
            this.sequentialDelay = 0;
          }
        }
      } else {
        this.spawnTimer += delta * speedMult;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTray();
          this.spawnTimer = 0;
        }
      }
    }

    // --- move trays ---
    const speed = this.conveyorSpeed * (delta / 16) * speedMult;
    for (const tray of this.trays) {
      if (tray.done) continue;

      // Only move trays that are on the belt
      if (!tray.onBelt) continue;

      let moveSpeed = speed;
      if (tray.completed) moveSpeed *= this.spaceKey.isDown ? this.COMPLETED_FAST_MULT : this.COMPLETED_SPEED_MULT;
      if (tray.passedFinish) moveSpeed *= 2;

      tray.container.x -= moveSpeed;

      // Finish line check
      if (!tray.passedFinish && tray.container.x <= this.finishLineX) {
        tray.passedFinish = true;
        if (tray.completed) {
          this.handleScore(tray);
        } else {
          this.handleMiss(tray);
        }
      }

      // Off-screen cleanup
      if (tray.container.x < -120) {
        tray.done = true;
        this.destroyTray(tray);
      }
    }

    // Prune done trays
    this.trays = this.trays.filter((t) => !t.done);

    // Endless mode - never ends!
    // Update difficulty based on game time
    this.updateDifficulty();
  }

  updateDifficulty() {
    // Adjust difficulty based on game time
    const minutesPlayed = this.gameTime / 60;
    const diff = DIFFICULTY_PROGRESSION;
    const mods = this.locationModifiers;

    // Increase belt speed (apply location speedMult)
    this.conveyorSpeed = Math.min(
      diff.maxSpeed * mods.speedMult,
      (diff.initialSpeed + minutesPlayed * diff.speedIncrease) * mods.speedMult
    );

    // Decrease spawn interval (apply location spawnMult — higher mult = faster spawns)
    this.spawnInterval = Math.max(
      diff.minSpawnInterval / mods.spawnMult,
      (diff.initialSpawnInterval - minutesPlayed * diff.spawnIntervalDecrease) / mods.spawnMult
    );

    // Music disabled (drone was unpleasant)
    // const intensity = Math.min(1, minutesPlayed * 0.1);
    // musicManager.setIntensity(intensity);
  }
}
