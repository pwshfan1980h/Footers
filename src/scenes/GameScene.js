import Phaser from 'phaser';
import { INGREDIENTS, BIN_LAYOUT, TREATMENTS, DAY_CONFIG } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { DEBUG } from '../config.js';

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
    this.day = data.day || 1;
    this.totalScore = data.totalScore || 0;
  }

  create() {
    const cfg = DAY_CONFIG[this.day];

    // --- isometric constants ---
    this.ISO_SKEW = 0.25;
    this.TABLE_SKEW = 50;

    // === SPACE STATION COLOR PALETTE - LIGHT METALS & GLASS ===
    // Space colors
    this.SPACE_BLACK = 0x0a0a18;
    this.SPACE_DEEP = 0x080814;
    this.STAR_WHITE = 0xffffff;
    this.STAR_BLUE = 0xaaddff;
    this.STAR_WARM = 0xffeedd;

    // Smoked glass overlay for window
    this.SMOKED_GLASS = 0x1a2030;
    this.SMOKED_GLASS_ALPHA = 0.35;

    // Station interior - WARM LIGHT METALS (no flat gray!)
    this.HULL_DARK = 0x4a4a58;      // Warm dark steel
    this.HULL_MID = 0x6a6a78;       // Mid brushed metal
    this.HULL_LIGHT = 0x8a8a98;     // Light steel
    this.HULL_BRIGHT = 0xa8a8b8;    // Bright highlight
    this.HULL_WARM = 0x7a7068;      // Warm bronze accent
    this.PANEL_SEAM = 0x3a3a48;

    // Chrome/polished metal accents
    this.CHROME_DARK = 0x5a5a6a;
    this.CHROME_MID = 0x8a8a9a;
    this.CHROME_LIGHT = 0xb8b8c8;
    this.CHROME_HIGHLIGHT = 0xd8d8e8;

    // Beam colors (brushed aluminum)
    this.BEAM_DARK = 0x3a3a4a;
    this.BEAM_MID = 0x5a5a6a;
    this.BEAM_LIGHT = 0x7a7a8a;
    this.BEAM_HIGHLIGHT = 0x9a9aaa;

    // Neon accents
    this.NEON_CYAN = 0x00ddff;
    this.NEON_ORANGE = 0xff9955;
    this.NEON_MAGENTA = 0xff66bb;
    this.NEON_GREEN = 0x66ff99;

    // Glass colors
    this.GLASS_TINT = 0x4a6080;
    this.GLASS_HIGHLIGHT = 0x8ab0d0;
    this.GLASS_EDGE = 0x2a4060;
    this.FRAME_DARK = 0x3a3a4a;
    this.FRAME_LIGHT = 0x6a6a7a;

    // Brushed steel prep table
    this.TABLE_TOP = 0x7a7a8a;
    this.TABLE_FRONT = 0x5a5a6a;
    this.TABLE_HIGHLIGHT = 0x9a9aaa;
    this.TABLE_SHADOW = 0x2a2a3a;

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

    // --- scoring ---
    this.dayScore = 0;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.gameMoney = 0;

    // --- orders ---
    this.trays = [];
    this.tickets = [];
    this.totalOrders = cfg.orders;
    this.ordersSpawned = 0;
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.orderNumber = 0;

    // --- conveyor ---
    this.conveyorSpeed = cfg.speed;
    this.beltOffset = 0;
    this.finishLineX = 80;
    this.isPaused = false;

    // --- spawning ---
    this.spawnInterval = cfg.spawnInterval;
    this.waitingForNext = true;
    this.sequentialDelay = 0;
    this.spawnTimer = 0;
    this.isStoreOpen = false;
    this._dayEnding = false;

    // --- interaction ---
    this.heldItem = null;
    this._justPickedUp = false;
    this.treatmentItems = {};

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
    this.createHUD(cfg);

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

    // separator between belt and bins (neon accent)
    const sep = this.add.graphics().setDepth(3);
    sep.fillStyle(this.HULL_LIGHT, 1);
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
      fontSize: '11px', color: '#ff0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    this.slowText = this.add.text(975, 142, '\u25c0\u25c0 SLOW', {
      fontSize: '11px', color: '#88f', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    // --- OPEN FOR BUSINESS BUTTON ---
    this.createStartButton();

    // --- LOAVES (Standalone bread sources) ---
    this.createLoaves();

    // --- SETUP INPUT ---
    this.setupClickToPlace();

    // --- KEYBOARD SHORTCUTS ---
    this.setupKeyboardShortcuts();

    // --- DEBUG HITBOXES ---
    if (DEBUG) {
      this.drawDebugHitboxes();
    }

    // --- BOIDS (passing vessels in space window) ---
    this.createBoids();

    // --- ROBOT ARM ---
    this.createRobotArm();
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

  /* =========================================
     BOIDS (single pixels drifting slowly - distant ships/debris)
     ========================================= */
  createBoids() {
    this.boids = [];
    this.boidsContainer = this.add.container(0, 0).setDepth(0.3); // Behind smoked glass

    // Spawn 12 single-pixel boids spread across
    for (let i = 0; i < 12; i++) {
      this.spawnBoid(true);
    }
  }

  spawnBoid(initialSpawn = false) {
    const boid = {
      x: initialSpawn ? Phaser.Math.Between(0, 1024) : Phaser.Math.Between(-30, -5),
      y: Phaser.Math.Between(this.WINDOW_TOP + 25, this.WINDOW_BOTTOM - 25),
      speed: Phaser.Math.FloatBetween(0.05, 0.2), // Very slow drift
      size: 1, // Single pixel
      color: Phaser.Utils.Array.GetRandom([0xffffff, 0xccddff, 0xffeedd, 0xaaccee]),
      alpha: Phaser.Math.FloatBetween(0.3, 0.6), // Dim, distant
    };

    const g = this.add.graphics();
    this.drawBoid(g, boid);
    boid.graphics = g;
    this.boidsContainer.add(g);
    this.boids.push(boid);
  }

  drawBoid(g, boid) {
    g.clear();
    g.fillStyle(boid.color, boid.alpha);
    g.fillCircle(boid.x, boid.y, boid.size);
  }

  updateBoids(delta) {
    if (!this.boids) return;

    for (const boid of this.boids) {
      // Very slow rightward drift
      boid.x += boid.speed * (delta / 16);

      // Slight vertical wobble for realism
      boid.y += Math.sin(boid.x * 0.02) * 0.02;

      this.drawBoid(boid.graphics, boid);

      // Respawn when off-screen
      if (boid.x > 1030) {
        boid.x = Phaser.Math.Between(-30, -5);
        boid.y = Phaser.Math.Between(this.WINDOW_TOP + 25, this.WINDOW_BOTTOM - 25);
        boid.speed = Phaser.Math.FloatBetween(0.05, 0.2);
        boid.color = Phaser.Utils.Array.GetRandom([0xffffff, 0xccddff, 0xffeedd, 0xaaccee]);
        boid.alpha = Phaser.Math.FloatBetween(0.3, 0.6);
      }
    }
  }

  createWallDecor() {
    // Wall decor removed for cleaner UI
  }

  /* =========================================
     HUD
     ========================================= */
  createHUD(cfg) {
    // Space station HUD background strip
    const hudBg = this.add.graphics().setDepth(4);
    hudBg.fillStyle(this.HULL_DARK, 0.85);
    hudBg.fillRect(0, 0, 1024, 50);
    // Neon accent line below HUD
    hudBg.fillStyle(this.NEON_CYAN, 0.4);
    hudBg.fillRect(0, 48, 1024, 2);

    this.dayText = this.add.text(12, 15,
      `Day ${this.day}: ${cfg.name}`, {
      fontSize: '16px', color: '#00ddff', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.scoreText = this.add.text(260, 15,
      `Score: ${this.totalScore}`, {
      fontSize: '16px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.ordersText = this.add.text(700, 17,
      this.ordersDisplay(), {
      fontSize: '12px', color: '#aaddff', fontFamily: 'Arial',
    }).setDepth(5);

    // Money Display
    this.moneyText = this.add.text(450, 15, '$0.00', {
      fontSize: '16px', color: '#44ff88', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    // Colored strike indicators
    this.strikeContainer = this.add.container(920, 15).setDepth(5);
    this.strikeIcons = [];
    for (let i = 0; i < this.maxStrikes; i++) {
      const icon = this.add.text(i * 24, 2, '\u25cb', {
        fontSize: '16px', color: '#44ffaa', fontFamily: 'Arial', fontStyle: 'bold',
      });
      this.strikeContainer.add(icon);
      this.strikeIcons.push(icon);
    }

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
    return `Orders: ${this.ordersCompleted}/${this.totalOrders}`;
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
    this.scoreText.setText(`Score: ${this.totalScore + this.dayScore}`);
    this.ordersText.setText(this.ordersDisplay());
    this.moneyText.setText(`$${this.gameMoney.toFixed(2)}`);
    this.updateStrikeIndicators();
  }

  createStartButton() {
    // Subtle title overlay - click anywhere to start
    const overlay = this.add.container(0, 0).setDepth(200);

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.5);
    overlay.add(backdrop);

    // Title text
    const title = this.add.text(512, 340, 'SammyBot', {
      fontSize: '64px',
      color: '#00ddff',
      fontFamily: 'Bungee, Arial',
      stroke: '#004455',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0.9);
    overlay.add(title);

    // Subtitle
    const subtitle = this.add.text(512, 410, `Day ${this.day}`, {
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
    const footerLine = order.isFooter ? 14 : 0;
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
    bg.fillStyle(order.isFooter ? 0xFFEEBB : 0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 5);
    bg.lineStyle(2, order.isFooter ? 0xDDAA55 : 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 5);
    card.add(bg);

    // Order number
    const numText = this.add.text(cardW / 2, 4, `#${orderNum}`, {
      fontSize: '14px', color: '#333', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5, 0);
    card.add(numText);

    // Footer label
    let yOff = 20;
    if (order.isFooter) {
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

    // Lighter brushed steel base
    const baseColor = 0x8a8a9a;
    g.fillStyle(baseColor, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    // Brushed metal horizontal lines (fine texture)
    g.lineStyle(1, 0x9a9aaa, 0.12);
    for (let y = surfaceY + 4; y < surfaceY + surfaceH; y += 6) {
      g.lineBetween(0, y, surfaceW, y);
    }

    // Top edge highlight (light source from above)
    g.fillStyle(0xb0b0c0, 0.6);
    g.fillRect(0, surfaceY, surfaceW, 2);

    // Subtle gradient darkening toward bottom
    for (let i = 0; i < 8; i++) {
      const alpha = 0.02 * i;
      const yPos = surfaceY + surfaceH - 80 + i * 10;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, yPos, surfaceW, 10);
    }

    // Panel sections (vertical dividers)
    const panelWidth = surfaceW / 5;
    g.lineStyle(1, 0x6a6a7a, 0.4);
    for (let i = 1; i < 5; i++) {
      const px = i * panelWidth;
      g.lineBetween(px, surfaceY + 10, px, surfaceY + surfaceH - 10);
    }

    // Panel section highlights (left edge of each panel)
    g.lineStyle(1, 0xaaaabc, 0.2);
    for (let i = 1; i < 5; i++) {
      const px = i * panelWidth + 1;
      g.lineBetween(px, surfaceY + 10, px, surfaceY + surfaceH - 10);
    }

    // Rivet details along top edge
    const rivetColor = 0x7a7a8a;
    const rivetHighlight = 0xb8b8c8;
    for (let x = 30; x < surfaceW; x += 80) {
      // Rivet base
      g.fillStyle(rivetColor, 1);
      g.fillCircle(x, surfaceY + 15, 4);
      // Rivet highlight
      g.fillStyle(rivetHighlight, 0.6);
      g.fillCircle(x - 1, surfaceY + 14, 1.5);
    }

    // Rivet details along bottom edge
    for (let x = 30; x < surfaceW; x += 80) {
      g.fillStyle(rivetColor, 1);
      g.fillCircle(x, surfaceY + surfaceH - 15, 4);
      g.fillStyle(rivetHighlight, 0.6);
      g.fillCircle(x - 1, surfaceY + surfaceH - 16, 1.5);
    }

    // Corner bracket details (top-left, top-right)
    this.drawCornerBracket(g, 8, surfaceY + 8, false);
    this.drawCornerBracket(g, surfaceW - 8, surfaceY + 8, true);

    // Subtle center highlight (reflection)
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(200, surfaceY + 60, 624, 200);

    // Robot arm base slot (center bottom)
    const slotX = 512;
    const slotY = surfaceY + surfaceH - 40;
    const slotW = 100;
    const slotH = 50;

    // Dark recessed area for arm
    g.fillStyle(0x2a2a3a, 1);
    g.fillRoundedRect(slotX - slotW / 2, slotY, slotW, slotH, 8);

    // Inner shadow
    g.fillStyle(0x1a1a2a, 1);
    g.fillRoundedRect(slotX - slotW / 2 + 4, slotY + 4, slotW - 8, slotH - 4, 6);

    // Edge highlights
    g.lineStyle(1, 0x5a5a6a, 0.6);
    g.strokeRoundedRect(slotX - slotW / 2, slotY, slotW, slotH, 8);

    // Warning chevrons around slot
    g.fillStyle(0xffaa00, 0.4);
    g.fillTriangle(slotX - slotW / 2 - 15, slotY + 10, slotX - slotW / 2 - 5, slotY + 5, slotX - slotW / 2 - 5, slotY + 15);
    g.fillTriangle(slotX + slotW / 2 + 15, slotY + 10, slotX + slotW / 2 + 5, slotY + 5, slotX + slotW / 2 + 5, slotY + 15);
  }

  drawCornerBracket(g, x, y, flipX) {
    const dir = flipX ? -1 : 1;
    g.lineStyle(2, 0x6a6a7a, 0.5);
    g.beginPath();
    g.moveTo(x, y + 20);
    g.lineTo(x, y);
    g.lineTo(x + dir * 20, y);
    g.strokePath();
    g.lineStyle(1, 0xaaaabc, 0.3);
    g.beginPath();
    g.moveTo(x + dir * 1, y + 19);
    g.lineTo(x + dir * 1, y + 1);
    g.lineTo(x + dir * 19, y + 1);
    g.strokePath();
  }

  /* =========================================
     FLOOR (brushed chrome strip below window)
     ========================================= */
  createFloor() {
    const g = this.add.graphics().setDepth(1);
    const floorY = this.WINDOW_BOTTOM;
    const floorH = 28;

    // Brushed chrome base
    g.fillStyle(this.CHROME_MID, 1);
    g.fillRect(0, floorY, 1024, floorH);

    // Top highlight
    g.fillStyle(this.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, floorY, 1024, 3);

    // Brushed metal horizontal lines
    g.lineStyle(1, this.CHROME_LIGHT, 0.2);
    for (let y = floorY + 6; y < floorY + floorH - 4; y += 4) {
      g.lineBetween(0, y, 1024, y);
    }

    // Bottom edge shadow
    g.fillStyle(this.CHROME_DARK, 0.6);
    g.fillRect(0, floorY + floorH - 3, 1024, 3);

    // Diamond plate texture (subtle)
    g.fillStyle(this.CHROME_LIGHT, 0.15);
    for (let x = 20; x < 1024; x += 40) {
      for (let row = 0; row < 2; row++) {
        const yOff = floorY + 8 + row * 10;
        g.beginPath();
        g.moveTo(x, yOff);
        g.lineTo(x + 8, yOff - 4);
        g.lineTo(x + 16, yOff);
        g.lineTo(x + 8, yOff + 4);
        g.closePath();
        g.fillPath();
      }
    }

    // Neon accent strips at edges
    g.fillStyle(this.NEON_ORANGE, 0.35);
    g.fillRect(0, floorY, 3, floorH);
    g.fillRect(1021, floorY, 3, floorH);
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

    // Isometric grid layout - tighter spacing
    const baseX = 100;
    const baseY = 495;
    const spacingX = 110;
    const spacingY = 80;

    keys.forEach((key, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const pos = this.getIsoPosition(col, row, baseX, baseY, spacingX, spacingY);
      const x = pos.x;
      const y = pos.y;

      const pileKey = key.replace('meat_', 'meat_pile_');
      const pile = this.add.image(x, y, pileKey).setDepth(20);

      pile.setInteractive({ useHandCursor: true });
      pile.on('pointerover', () => pile.setTint(0xdddddd));
      pile.on('pointerout', () => pile.clearTint());
      pile.on('pointerdown', () => {
        if (this.isPaused || this.heldItem) return;
        this.createMeatPileLogic(key, x, y, pile);
      });

      // Name label (hidden by default, shown with F1)
      const ing = INGREDIENTS[key];
      const label = this.add.text(x, y + 48, ing.name, {
        fontSize: '11px', color: '#ccc', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(21).setVisible(false);
      this.labelHints.push(label);

      // Keyboard hint (hidden by default, shown with F1)
      const hints = { 'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4' };
      if (hints[key]) {
        this.createHotkeyHint(x + 38, y - 28, hints[key]);
      }
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
    this._justPickedUp = true;
  }



  /* =========================================
     LOAVES (Standalone - Isometric Grid with Shadows)
     ========================================= */
  createLoaves() {
    const baseX = 850;
    const baseY = 490;
    const spacingY = 78;

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
      this.drawItemShadow(shadowGfx, x, y + 18, 40, 12);

      const loaf = this.add.image(x, y, b.asset).setDepth(20);
      loaf.setInteractive({ useHandCursor: true });
      loaf.on('pointerover', () => loaf.setTint(0xdddddd));
      loaf.on('pointerout', () => loaf.clearTint());
      loaf.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickLoaf(b.key, pointer);
      });

      // Label (hidden by default, shown with F1)
      const label = this.add.text(x, y + 42, b.label, {
        fontSize: '13px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21).setVisible(false);
      this.labelHints.push(label);
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
    this._justPickedUp = true;
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
        fontSize: '14px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21).setVisible(false);
      this.labelHints.push(label);

      // Keyboard hint (hidden by default, shown with F1)
      const hints = { 'cheese_american': '8', 'cheese_swiss': '9' };
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
    this._justPickedUp = true;
  }

  /* =========================================
     VEGGIE BOWLS - CENTER (Isometric Grid)
     ========================================= */
  createVeggieBowls() {
    const baseX = 420;
    const baseY = 495;
    const spacingY = 75;

    const veggies = [
      { key: 'top_lettuce', label: 'Lettuce', asset: 'bowl_content_lettuce' },
      { key: 'top_tomato', label: 'Tomato', asset: 'bowl_content_tomato' },
      { key: 'top_onion', label: 'Onion', asset: 'bowl_content_onion' }
    ];

    veggies.forEach((v, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      const vegImg = this.add.image(x, y, v.asset).setDepth(20).setScale(0.75);
      vegImg.setInteractive({ useHandCursor: true });
      vegImg.on('pointerover', () => vegImg.setTint(0xdddddd));
      vegImg.on('pointerout', () => vegImg.clearTint());
      vegImg.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickVeggieBowl(v.key, pointer);
      });

      // Label (hidden by default, shown with F1)
      const label = this.add.text(x, y + 42, v.label, {
        fontSize: '13px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21).setVisible(false);
      this.labelHints.push(label);

      // Keyboard hint (hidden by default, shown with F1)
      const hints = { 'top_lettuce': '5', 'top_tomato': '6', 'top_onion': '7' };
      if (hints[v.key]) {
        this.createHotkeyHint(x + 36, y - 20, hints[v.key]);
      }
    });
  }

  clickVeggieBowl(key, pointer) {
    soundManager.init();
    soundManager.robotPickup();
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
    this._justPickedUp = true;
  }

  createSauceBottle(key, x, y) {
    const ingredient = INGREDIENTS[key];
    const radius = 22;

    // Create container for the sauce icon
    const container = this.add.container(x, y).setDepth(30);

    const g = this.add.graphics();

    // Shadow underneath
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(0, radius + 6, radius * 1.2, 6);

    // Colored circle with border
    g.fillStyle(ingredient.color, 1);
    g.fillCircle(0, 0, radius);
    g.lineStyle(3, ingredient.border, 1);
    g.strokeCircle(0, 0, radius);

    // Highlight
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(-6, -8, radius * 0.4, radius * 0.25);

    container.add(g);

    // Label text above
    const label = this.add.text(0, -radius - 12, ingredient.name, {
      fontSize: '12px',
      color: '#ccc',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    container.add(label);

    // Make interactive - generous hitbox covering label, circle, and shadow
    const hitW = 60;
    const hitH = 90;
    const hitY = -50; // Start above the label
    container.setSize(hitW, hitH);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hitW / 2, hitY, hitW, hitH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerover', () => g.setAlpha(0.8));
    container.on('pointerout', () => g.setAlpha(1));
    container.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
      soundManager.init();
      this.pickupSauce(key);
    });

    // Keyboard hint (hidden by default, shown with F1)
    const sauceHints = { 'sauce_mayo': 'Q', 'sauce_mustard': 'E' };
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
    this._justPickedUp = true;
  }

  createTreatmentItem(tKey, x, y) {
    const treat = TREATMENTS[tKey];
    const hw = 38;
    const hh = 40;
    const c = this.add.container(x, y).setDepth(30);
    c.setSize(hw * 2, hh * 2);
    c.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    const g = this.add.graphics();

    // Isometric offset for 3D effect
    const iso = 6;

    if (tKey === 'toasted') {
      // Isometric 4-slice deli toaster (no box)
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 50, 14);

      // Main body - front face
      g.fillStyle(0x707078, 1);
      g.fillRect(-28, -8, 56, 36);
      // Top face (parallelogram)
      g.fillStyle(0x909098, 1);
      g.beginPath();
      g.moveTo(-28, -8);
      g.lineTo(-28 + iso, -8 - iso);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28, -8);
      g.closePath();
      g.fillPath();
      // Right face
      g.fillStyle(0x505058, 1);
      g.beginPath();
      g.moveTo(28, -8);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28 + iso, 28 - iso);
      g.lineTo(28, 28);
      g.closePath();
      g.fillPath();

      // 4 toast slots on top
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

      // Lever on right side
      g.fillStyle(0x404048, 1);
      g.fillRect(30, 5, 6, 18);
      g.fillStyle(0x606068, 1);
      g.fillRect(30, 5, 6, 4);

      // Front detail - brand plate
      g.fillStyle(0x606068, 1);
      g.fillRect(-18, 16, 36, 8);

    } else if (tKey === 'togo') {
      // Stack of to-go boxes isometric (no box)
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 30, 48, 12);

      // Draw 3 stacked boxes
      for (let b = 0; b < 3; b++) {
        const by = 20 - b * 14;
        const biso = 5;

        // Front face (styrofoam white)
        g.fillStyle(b === 0 ? 0xE8E8E8 : 0xF0F0F0, 1);
        g.fillRect(-26, by - 10, 52, 12);
        // Top face
        g.fillStyle(b === 0 ? 0xF5F5F5 : 0xFAFAFA, 1);
        g.beginPath();
        g.moveTo(-26, by - 10);
        g.lineTo(-26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26, by - 10);
        g.closePath();
        g.fillPath();
        // Right face
        g.fillStyle(0xD0D0D0, 1);
        g.beginPath();
        g.moveTo(26, by - 10);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by + 2 - biso);
        g.lineTo(26, by + 2);
        g.closePath();
        g.fillPath();

        // Lid line detail
        g.lineStyle(1, 0xBBBBBB, 0.6);
        g.lineBetween(-22, by - 6, 22, by - 6);
      }

    } else if (tKey === 'salt') {
      // Individual salt shaker (no box)
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);

      // Body - white/clear glass
      g.fillStyle(0xF0F0F0, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      // Cap
      g.fillStyle(0xC0C0C0, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0xDDDDDD, 1);
      g.fillRect(-10, -18, 20, 4);
      // Holes on cap
      g.fillStyle(0x666666, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      // Salt inside
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillRect(-8, 8, 16, 16);
      // Label
      g.fillStyle(0x4488FF, 0.8);
      g.fillRect(-8, 2, 16, 8);

    } else if (tKey === 'pepper') {
      // Individual pepper shaker (no box)
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);

      // Body - dark glass
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      // Cap
      g.fillStyle(0x222222, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0x444444, 1);
      g.fillRect(-10, -18, 20, 4);
      // Holes on cap
      g.fillStyle(0x111111, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      // Pepper inside visible
      g.fillStyle(0x1A1A1A, 0.6);
      g.fillRect(-8, 8, 16, 16);
      // Label
      g.fillStyle(0xFF4444, 0.8);
      g.fillRect(-8, 2, 16, 8);

    } else if (tKey === 'oil_vinegar') {
      // Oil & vinegar bottles (keep card background for this one)
      const bg = this.add.graphics();
      bg.fillStyle(0x333344, 0.7);
      bg.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 6);
      c.add(bg);

      // Shadow
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(0, 26, 45, 10);

      // Oil bottle (left)
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-28, -2, 22, 32, 4);
      g.fillRect(-22, -18, 10, 18);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-24, -22, 14, 6);

      // Vinegar bottle (right)
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(6, -2, 22, 32, 4);
      g.fillRect(12, -18, 10, 18);
      g.fillStyle(0x662200, 1);
      g.fillRect(10, -22, 14, 6);
    }

    c.add(g);

    // Label below art (hidden by default, shown with F1)
    const label = this.add.text(0, hh - 6, treat.name, {
      fontSize: '12px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setVisible(false);
    c.add(label);
    this.labelHints.push(label);

    // Keyboard hints - hidden by default, shown with F1
    const treatHints = { 'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V' };
    if (treatHints[tKey]) {
      // Create hint outside container at absolute position
      this.createHotkeyHint(x + hw - 8, y - hh + 8, treatHints[tKey], 32);
    }

    c.on('pointerover', () => {
      this.tweens.add({ targets: c, scaleX: 1.08, scaleY: 1.08, duration: 100, ease: 'Sine.easeOut' });
    });
    c.on('pointerout', () => {
      this.tweens.add({ targets: c, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
    });
    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
      soundManager.init();
      this.pickupTreatment(tKey);
    });

    this.treatmentItems[tKey] = c;
  }

  /* =========================================
     TREATMENT PICKUP (works like ingredients)
     ========================================= */
  pickupTreatment(tKey) {
    soundManager.robotPickup();
    const treat = TREATMENTS[tKey];
    const pointer = this.input.activePointer;

    // Create a held visual for the treatment
    const c = this.add.container(pointer.x, pointer.y).setDepth(100);
    c.setSize(80, 40);

    const bg = this.add.graphics();
    bg.fillStyle(0x333344, 0.9);
    bg.fillRoundedRect(-40, -20, 80, 40, 8);
    bg.lineStyle(2, 0xFFAA00, 1);
    bg.strokeRoundedRect(-40, -20, 80, 40, 8);
    c.add(bg);

    const label = this.add.text(0, 0, treat.name, {
      fontSize: '14px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

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
    this._justPickedUp = true;

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
    const hw = tray.isFooter ? 80 : 55;

    if (treatmentKey === 'toasted') {
      // Toast marks across the whole sandwich body
      const midY = (stackTop + stackBot) / 2;
      const halfH = (stackBot - stackTop) / 2 + 4;
      g.lineStyle(2, 0x8B4513, 0.6);
      for (let sx = -(hw - 15); sx <= (hw - 15); sx += 12) {
        g.lineBetween(sx, midY - halfH, sx + 6, midY + halfH);
      }
      g.lineStyle(1.5, 0xFF8C00, 0.4);
      for (let sx = -(hw - 21); sx <= (hw - 21); sx += 12) {
        g.lineBetween(sx, midY - halfH + 2, sx + 4, midY + halfH - 2);
      }
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
  setupClickToPlace() {
    this.trayHighlight = this.add.graphics().setDepth(9);

    this.input.on('pointermove', (pointer) => {
      if (!this.heldItem) {
        this.trayHighlight.clear();
        return;
      }
      this.heldItem.visual.x = pointer.x;
      this.heldItem.visual.y = pointer.y;

      this.trayHighlight.clear();
      if (pointer.y < this.BELT_TOP) {
        const tray = this.findTrayAtX(pointer.x);
        if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
          const hw = tray.isFooter ? 105 : 72;
          this.trayHighlight.lineStyle(2, 0x44ff44, 0.35);
          this.trayHighlight.strokeRoundedRect(
            tray.container.x - hw, 270, hw * 2, 155, 8,
          );
        }
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isPaused) return;

      if (!this.heldItem) return;

      if (this._justPickedUp) {
        this._justPickedUp = false;
        return;
      }

      this.placeHeldItem(pointer);
    });

    this.escKey.on('down', () => {
      if (this.heldItem) {
        this.cancelHeldItem();
      }
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
    this.shortcutMap = {
      'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4',
      'top_lettuce': '5', 'top_tomato': '6', 'top_onion': '7',
      'cheese_american': '8', 'cheese_swiss': '9',
      'sauce_mayo': 'Q', 'sauce_mustard': 'E',
      'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V',
    };

    const KC = Phaser.Input.Keyboard.KeyCodes;

    const bindings = [
      { code: KC.ONE,   ingredient: 'meat_ham' },
      { code: KC.TWO,   ingredient: 'meat_turkey' },
      { code: KC.THREE, ingredient: 'meat_roastbeef' },
      { code: KC.FOUR,  ingredient: 'meat_bacon' },
      { code: KC.FIVE,  ingredient: 'top_lettuce' },
      { code: KC.SIX,   ingredient: 'top_tomato' },
      { code: KC.SEVEN, ingredient: 'top_onion' },
      { code: KC.EIGHT, ingredient: 'cheese_american' },
      { code: KC.NINE,  ingredient: 'cheese_swiss' },
      { code: KC.Q,     ingredient: 'sauce_mayo' },
      { code: KC.E,     ingredient: 'sauce_mustard' },
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
            this._justPickedUp = true;
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

    if (tray && !tray.completed && !tray.done && !tray.passedFinish && pointer.y < landY + 40) {
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
            } else if (result === 'wrong') {
              soundManager.buzz();
              this.dayScore = Math.max(0, this.dayScore - 25);
              this.refreshHUD();
              this.flashTray(tray, 0xff0000);

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
      const tolerance = tray.isFooter ? 110 : 80;
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

    // Anti-bunching: don't spawn if the rightmost tray is still too close
    const minGap = 200;
    for (const tray of this.trays) {
      if (tray.done) continue;
      if (tray.container.x > 1024 - minGap) return;
    }

    // Trigger tray delivery arm animation
    this.animateTrayDelivery();

    const order = this.generateOrder();
    this.orderNumber++;
    const orderNum = this.orderNumber;
    const startX = order.isFooter ? 1200 : 1120;
    const baseY = this.BELT_Y;

    // Add ticket to the slider
    this.addTicket(order, orderNum);

    // Tray container
    const container = this.add.container(startX, baseY).setDepth(10);

    // Use thin tray sprite (thinner profile)
    const traySprite = this.add.image(0, 0, 'tray_thin');
    // Scale for footer/normal - slightly larger scale since asset is thinner
    traySprite.setScale(order.isFooter ? 1.0 : 0.8);
    container.add(traySprite);

    // Order number badge (adjusted Y for thinner tray)
    const numBg = this.add.graphics();
    numBg.fillStyle(order.isFooter ? 0xFFEEBB : 0xFFFFC0, 1);
    numBg.fillCircle(0, -22, 16);
    numBg.lineStyle(2, order.isFooter ? 0xDDAA55 : 0xCCCC80, 1);
    numBg.strokeCircle(0, -22, 16);
    container.add(numBg);

    const numText = this.add.text(0, -22, `${orderNum}`, {
      fontSize: '15px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    // Footer label on tray (adjusted Y for thinner tray)
    if (order.isFooter) {
      const ftLabel = this.add.text(0, -38, 'FOOTER', {
        fontSize: '9px', color: '#AA6600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(ftLabel);
    }

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
      isFooter: order.isFooter || false,
      placed: [],
      stackLayers: [],
      stackHeight: 0,
      appliedTreatments: [],
      completed: false,
      done: false,
      passedFinish: false,
      scored: false,
      hintText,
    };

    this.trays.push(tray);
    this.updateTrayNextHint(tray);
    this.ordersSpawned++;

    if (this.ordersSpawned === 3) {
      this.spawnTimer = this.spawnInterval * 0.5;
    }

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

    const breads = ['bread_white', 'bread_wheat', 'bread_sourdough'];
    const meats = ['meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon'];
    const cheeses = ['cheese_american', 'cheese_swiss'];
    const toppings = ['top_lettuce', 'top_tomato', 'top_onion'];
    const sauces = ['sauce_mayo', 'sauce_mustard'];

    const cfg = DAY_CONFIG[this.day];
    const isFooter = Math.random() < (cfg.footerChance || 0);

    const list = [];
    const bread = pick(breads);

    if (isFooter) {
      // FOOTER: ~2x ingredients
      list.push(bread);
      // 2 meats
      list.push(pick(meats));
      list.push(pick(meats));
      // Always 1 cheese, 50% chance of 2nd
      list.push(pick(cheeses));
      if (Math.random() > 0.5) {
        list.push(pick(cheeses));
      }
      // 2-3 toppings
      const topCount = 2 + (Math.random() < 0.5 ? 1 : 0);
      pickN(toppings, topCount).forEach((t) => list.push(t));
      // Always 1 sauce, 50% chance of 2nd
      list.push(pick(sauces));
      if (Math.random() > 0.5) {
        list.push(pick(sauces));
      }
      // Top bread
      list.push(bread);
    } else {
      // Normal order
      list.push(bread);
      list.push(pick(meats));

      if (this.day >= 2 || Math.random() > 0.5) {
        list.push(pick(cheeses));
      }

      const topCount = Math.min(
        Math.floor(Math.random() * (1 + Math.min(this.day, 3))),
        2,
      );
      if (topCount > 0) {
        pickN(toppings, topCount).forEach((t) => list.push(t));
      }

      if (this.day >= 2 || Math.random() > 0.4) {
        list.push(pick(sauces));
      }

      list.push(bread);
    }

    // Treatments based on day config (salt and pepper are now separate)
    const treatments = [];
    if (cfg.treatmentChance > 0 && Math.random() < cfg.treatmentChance) {
      const allTreatments = Object.keys(TREATMENTS);
      if (this.day <= 2) {
        // Early days: simple treatments - toasted, salt, or pepper
        const simple = ['toasted', 'salt', 'pepper'];
        treatments.push(pick(simple));
        // 30% chance to add the other seasoning if we picked salt or pepper
        if ((treatments[0] === 'salt' || treatments[0] === 'pepper') && Math.random() < 0.3) {
          treatments.push(treatments[0] === 'salt' ? 'pepper' : 'salt');
        }
      } else {
        // Later days: more variety, can have multiple treatments
        const count = Math.random() < 0.4 ? 2 : 1;
        const chosen = pickN(allTreatments, count);
        chosen.forEach((t) => treatments.push(t));
      }
    }

    const totalPrice = this.calculateOrderPrice(list, treatments, isFooter);
    return { ingredients: list, treatments, isFooter, totalPrice };
  }

  calculateOrderPrice(ingredients, treatments, isFooter) {
    let price = isFooter ? 3.00 : 1.50;
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
    const w = tray.isFooter ? 80 : 55;
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
    const hw = tray.isFooter ? 105 : 70;
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

    // Score based on price
    const orderValue = tray.order.totalPrice || 5.00;
    this.gameMoney += orderValue;

    const baseScore = Math.floor(orderValue * 10);
    const speedBonus = (tray.completedAtX || 0) > this.SPEED_BONUS_X ? (tray.isFooter ? 100 : 50) : 0;
    this.dayScore += baseScore + speedBonus;
    this.refreshHUD();

    soundManager.score();
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

    this.resolveSequential();
  }

  /* =========================================
     MISSES / STRIKES
     ========================================= */
  handleMiss(tray) {
    if (this.isPaused) return;
    this.strikes++;
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

    this.resolveSequential();

    if (this.strikes >= this.maxStrikes) {
      this.isPaused = true;
      this.time.delayedCall(800, () => {
        this.scene.start('GameOver', {
          day: this.day,
          totalScore: this.totalScore + this.dayScore,
        });
      });
    }
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
     ROBOT ARM (articulated arm from bottom center)
     ========================================= */
  createRobotArm() {
    // Arm mounted at bottom center of screen
    this.armBaseX = 512;  // Center of screen
    this.armBaseY = 740;  // Top of turret column
    this.armSegment1Length = 180; // Upper arm
    this.armSegment2Length = 180; // Forearm (longer to reach far)
    this.armSegment3Length = 100; // Wrist/hand (longer for precision)

    // Work area constraints
    this.armMinY = 280;  // Above belt for placing ingredients
    this.armMaxY = 730;  // Above the arm base

    // Current angles (will be updated via IK)
    // Starting pointed upward
    this.armAngle1 = -Math.PI / 2; // Point up
    this.armAngle2 = 0;
    this.armAngle3 = 0;

    // Base rotation (the turret/body rotation)
    this.armBaseRotation = 0;

    // Target position (mouse)
    this.armTargetX = 512;
    this.armTargetY = 500;

    // Sound throttling
    this.lastArmSoundTime = 0;
    this.armSoundInterval = 80;

    // Create graphics layers
    this.robotArmBaseGfx = this.add.graphics().setDepth(145); // Base platform
    this.robotArmGfx = this.add.graphics().setDepth(150);     // Arm segments

    // Claw state
    this.clawOpen = true;

    // Draw the static base platform
    this.drawArmBase();

    // Draw initial arm
    this.drawRobotArm();

    // Create tray delivery arm (separate decorative arm)
    this.createTrayDeliveryArm();
  }

  drawArmBase() {
    const g = this.robotArmBaseGfx;
    g.clear();

    const baseX = this.armBaseX;
    const baseY = 768; // At screen bottom

    // Platform shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(baseX, baseY - 5, 140, 30);

    // Main platform base (wide ellipse)
    g.fillStyle(0x3a3a4a, 1);
    g.fillEllipse(baseX, baseY, 130, 35);

    // Platform top surface
    g.fillStyle(0x5a5a6a, 1);
    g.fillEllipse(baseX, baseY - 8, 120, 28);

    // Inner ring
    g.fillStyle(0x4a4a5a, 1);
    g.fillEllipse(baseX, baseY - 10, 80, 20);

    // Center turret base
    g.fillStyle(0x6a6a7a, 1);
    g.fillEllipse(baseX, baseY - 14, 50, 14);

    // Highlight
    g.fillStyle(0x8a8a9a, 0.6);
    g.fillEllipse(baseX - 15, baseY - 18, 20, 6);

    // Cyan accent ring
    g.lineStyle(2, 0x00ddff, 0.5);
    g.strokeEllipse(baseX, baseY - 10, 90, 22);

    // Warning stripes on edges
    g.fillStyle(0xffaa00, 0.6);
    g.fillRect(baseX - 60, baseY - 4, 8, 8);
    g.fillRect(baseX + 52, baseY - 4, 8, 8);
  }

  updateRobotArm(delta) {
    const pointer = this.input.activePointer;

    // Constrain target to work area
    this.armTargetX = Phaser.Math.Clamp(pointer.x, 60, 964);
    this.armTargetY = Phaser.Math.Clamp(pointer.y, this.armMinY, this.armMaxY);

    const dx = this.armTargetX - this.armBaseX;
    const dy = this.armTargetY - this.armBaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Limit reach
    const maxReach = this.armSegment1Length + this.armSegment2Length + this.armSegment3Length - 40;
    const minReach = 100;
    const clampedDist = Phaser.Math.Clamp(dist, minReach, maxReach);

    // Base rotation - the whole arm rotates to face the target
    const targetBaseRotation = Math.atan2(dx, -dy); // Note: -dy because Y is inverted
    const lerpSpeed = 0.12;
    this.armBaseRotation = Phaser.Math.Linear(this.armBaseRotation, targetBaseRotation, lerpSpeed);

    // Clamp base rotation to reasonable range (-70 to +70 degrees)
    this.armBaseRotation = Phaser.Math.Clamp(this.armBaseRotation, -1.22, 1.22);

    // Calculate arm angles relative to the rotated base
    // The arm always reaches "forward" from its rotated position
    const reachRatio = clampedDist / maxReach;

    // Segment 1 angle (relative to base rotation, pointing "up" in arm's frame)
    // When close, bend more; when far, straighter
    const bendAmount = (1 - reachRatio) * 0.8;
    const targetAngle1 = -Math.PI / 2 + this.armBaseRotation * 0.3 + bendAmount * 0.3;
    this.armAngle1 = Phaser.Math.Linear(this.armAngle1, targetAngle1, lerpSpeed);

    // Segment 2 bends based on distance and direction
    const targetAngle2 = -bendAmount * Math.PI * 0.6 + this.armBaseRotation * 0.4;
    this.armAngle2 = Phaser.Math.Linear(this.armAngle2, targetAngle2, lerpSpeed);

    // Calculate intermediate positions for segment 3 aiming
    const joint2X = this.armBaseX + Math.cos(this.armAngle1) * this.armSegment1Length;
    const joint2Y = this.armBaseY + Math.sin(this.armAngle1) * this.armSegment1Length;
    const angle12 = this.armAngle1 + this.armAngle2;
    const joint3X = joint2X + Math.cos(angle12) * this.armSegment2Length;
    const joint3Y = joint2Y + Math.sin(angle12) * this.armSegment2Length;

    // Segment 3 (wrist) aims toward target
    const wristToTarget = Math.atan2(this.armTargetY - joint3Y, this.armTargetX - joint3X);
    const targetAngle3 = wristToTarget - angle12;
    this.armAngle3 = Phaser.Math.Linear(this.armAngle3, targetAngle3, lerpSpeed * 1.5);

    // Play movement sound occasionally
    const now = this.time.now;
    if (now - this.lastArmSoundTime > this.armSoundInterval) {
      const movement = Math.abs(targetBaseRotation - this.armBaseRotation) +
                       Math.abs(targetAngle1 - this.armAngle1);
      if (movement > 0.015) {
        soundManager.robotMove();
        this.lastArmSoundTime = now;
      }
    }

    // Update claw state
    this.clawOpen = !this.heldItem;

    this.drawRobotArm();
  }

  /* =========================================
     TRAY DELIVERY ARM (decorative arm that places trays)
     ========================================= */
  createTrayDeliveryArm() {
    // This arm comes from off-screen right to place trays on the belt
    this.trayArmGfx = this.add.graphics().setDepth(8); // Below trays but above belt

    // Arm base position (off-screen right, at belt level)
    this.trayArmBaseX = 1080;
    this.trayArmBaseY = 380;
    this.trayArmSegment1 = 100;
    this.trayArmSegment2 = 80;

    // Animation state
    this.trayArmProgress = 0; // 0 = retracted, 1 = extended
    this.trayArmAnimating = false;
    this.trayArmTargetProgress = 0;
  }

  animateTrayDelivery() {
    // Called when spawning a new tray
    if (this.trayArmAnimating) return;

    this.trayArmAnimating = true;

    // Extend arm
    this.tweens.add({
      targets: this,
      trayArmProgress: 1,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Hold briefly then retract
        this.time.delayedCall(150, () => {
          this.tweens.add({
            targets: this,
            trayArmProgress: 0,
            duration: 400,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.trayArmAnimating = false;
            }
          });
        });
      }
    });
  }

  updateTrayArm() {
    const g = this.trayArmGfx;
    g.clear();

    if (this.trayArmProgress <= 0.01) return; // Don't draw if fully retracted

    const metalDark = 0x4a4a5a;
    const metalMid = 0x6a6a7a;
    const metalLight = 0x8a8a9a;
    const accentOrange = 0xff9955;

    // Calculate arm position based on progress
    // When extended, the claw reaches to about x=950 (where trays spawn)
    const extendAngle = Math.PI + this.trayArmProgress * 0.4; // Swing left
    const bendAngle = -this.trayArmProgress * 0.5;

    const joint1X = this.trayArmBaseX;
    const joint1Y = this.trayArmBaseY;

    const joint2X = joint1X + Math.cos(extendAngle) * this.trayArmSegment1;
    const joint2Y = joint1Y + Math.sin(extendAngle) * this.trayArmSegment1;

    const angle2 = extendAngle + bendAngle;
    const endX = joint2X + Math.cos(angle2) * this.trayArmSegment2;
    const endY = joint2Y + Math.sin(angle2) * this.trayArmSegment2;

    // Draw base (partially visible)
    g.fillStyle(metalDark, 1);
    g.fillCircle(joint1X, joint1Y, 18);
    g.fillStyle(metalMid, 1);
    g.fillCircle(joint1X, joint1Y, 14);

    // Draw segment 1
    this.drawArmSegment(g, joint1X, joint1Y, joint2X, joint2Y, 12, metalMid, metalLight);

    // Draw joint
    g.fillStyle(metalDark, 1);
    g.fillCircle(joint2X, joint2Y, 8);
    g.fillStyle(accentOrange, 0.6);
    g.fillCircle(joint2X, joint2Y, 4);

    // Draw segment 2
    this.drawArmSegment(g, joint2X, joint2Y, endX, endY, 10, metalMid, metalLight);

    // Draw simple gripper (holding tray shape)
    g.fillStyle(metalDark, 1);
    g.fillCircle(endX, endY, 6);

    // Gripper prongs
    const prongAngle = angle2;
    const prongLen = 20;
    const spread = 0.3;

    g.lineStyle(4, metalMid, 1);
    g.lineBetween(endX, endY,
      endX + Math.cos(prongAngle - spread) * prongLen,
      endY + Math.sin(prongAngle - spread) * prongLen);
    g.lineBetween(endX, endY,
      endX + Math.cos(prongAngle + spread) * prongLen,
      endY + Math.sin(prongAngle + spread) * prongLen);

    g.fillStyle(accentOrange, 0.8);
    g.fillCircle(endX + Math.cos(prongAngle - spread) * prongLen,
      endY + Math.sin(prongAngle - spread) * prongLen, 3);
    g.fillCircle(endX + Math.cos(prongAngle + spread) * prongLen,
      endY + Math.sin(prongAngle + spread) * prongLen, 3);
  }

  drawRobotArm() {
    const g = this.robotArmGfx;
    g.clear();

    // Colors
    const metalDark = 0x4a4a5a;
    const metalMid = 0x6a6a7a;
    const metalLight = 0x8a8a9a;
    const metalHighlight = 0xaaaabc;
    const jointColor = 0x3a3a4a;
    const accentCyan = 0x00ddff;

    // Calculate joint positions
    const joint1X = this.armBaseX;
    const joint1Y = this.armBaseY;

    const joint2X = joint1X + Math.cos(this.armAngle1) * this.armSegment1Length;
    const joint2Y = joint1Y + Math.sin(this.armAngle1) * this.armSegment1Length;

    const angle12 = this.armAngle1 + this.armAngle2;
    const joint3X = joint2X + Math.cos(angle12) * this.armSegment2Length;
    const joint3Y = joint2Y + Math.sin(angle12) * this.armSegment2Length;

    const angle123 = angle12 + this.armAngle3;
    const endX = joint3X + Math.cos(angle123) * this.armSegment3Length;
    const endY = joint3Y + Math.sin(angle123) * this.armSegment3Length;

    // Draw rotating turret column (shows base rotation)
    const turretHeight = 40;
    const turretWidth = 24;
    const turretX = this.armBaseX + Math.sin(this.armBaseRotation) * 5;
    const turretTopY = 748;

    // Turret body (rotates with arm)
    g.fillStyle(metalMid, 1);
    g.beginPath();
    g.moveTo(turretX - turretWidth / 2, turretTopY + turretHeight);
    g.lineTo(turretX - turretWidth / 2 + 4, turretTopY);
    g.lineTo(turretX + turretWidth / 2 - 4, turretTopY);
    g.lineTo(turretX + turretWidth / 2, turretTopY + turretHeight);
    g.closePath();
    g.fillPath();

    // Turret highlight (shows rotation direction)
    const highlightSide = this.armBaseRotation > 0 ? -1 : 1;
    g.fillStyle(metalLight, 0.6);
    g.beginPath();
    g.moveTo(turretX + highlightSide * turretWidth / 2, turretTopY + turretHeight);
    g.lineTo(turretX + highlightSide * (turretWidth / 2 - 4), turretTopY);
    g.lineTo(turretX + highlightSide * (turretWidth / 2 - 8), turretTopY);
    g.lineTo(turretX + highlightSide * (turretWidth / 2 - 4), turretTopY + turretHeight);
    g.closePath();
    g.fillPath();

    // Turret top cap
    g.fillStyle(metalDark, 1);
    g.fillEllipse(turretX, turretTopY, turretWidth / 2 + 2, 8);
    g.fillStyle(accentCyan, 0.4);
    g.fillEllipse(turretX, turretTopY, turretWidth / 2 - 4, 4);

    // Shoulder joint (where arm attaches to turret)
    g.fillStyle(jointColor, 1);
    g.fillCircle(joint1X, joint1Y, 16);
    g.fillStyle(metalMid, 1);
    g.fillCircle(joint1X, joint1Y, 12);
    g.fillStyle(accentCyan, 0.6);
    g.fillCircle(joint1X, joint1Y, 6);

    // Draw segment 1 (upper arm)
    this.drawArmSegment(g, joint1X, joint1Y, joint2X, joint2Y, 16, metalMid, metalLight);

    // Draw joint 2 (elbow)
    g.fillStyle(jointColor, 1);
    g.fillCircle(joint2X, joint2Y, 12);
    g.fillStyle(metalMid, 1);
    g.fillCircle(joint2X, joint2Y, 9);
    g.fillStyle(accentCyan, 0.6);
    g.fillCircle(joint2X, joint2Y, 5);

    // Draw segment 2 (forearm)
    this.drawArmSegment(g, joint2X, joint2Y, joint3X, joint3Y, 12, metalMid, metalLight);

    // Draw joint 3 (wrist)
    g.fillStyle(jointColor, 1);
    g.fillCircle(joint3X, joint3Y, 9);
    g.fillStyle(metalMid, 1);
    g.fillCircle(joint3X, joint3Y, 6);
    g.fillStyle(accentCyan, 0.5);
    g.fillCircle(joint3X, joint3Y, 3);

    // Draw segment 3 (hand)
    this.drawArmSegment(g, joint3X, joint3Y, endX, endY, 8, metalMid, metalLight);

    // Draw claw/gripper
    this.drawClaw(g, endX, endY, angle123);
  }

  drawArmSegment(g, x1, y1, x2, y2, width, colorMain, colorHighlight) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpX = Math.cos(angle + Math.PI / 2) * width / 2;
    const perpY = Math.sin(angle + Math.PI / 2) * width / 2;

    // Main segment body
    g.fillStyle(colorMain, 1);
    g.beginPath();
    g.moveTo(x1 + perpX, y1 + perpY);
    g.lineTo(x2 + perpX, y2 + perpY);
    g.lineTo(x2 - perpX, y2 - perpY);
    g.lineTo(x1 - perpX, y1 - perpY);
    g.closePath();
    g.fillPath();

    // Highlight edge
    g.lineStyle(2, colorHighlight, 0.6);
    g.lineBetween(x1 + perpX, y1 + perpY, x2 + perpX, y2 + perpY);
  }

  drawClaw(g, x, y, angle) {
    const clawLength = 25;
    const clawSpread = this.clawOpen ? 0.4 : 0.15; // Radians

    const metalDark = 0x4a4a5a;
    const metalLight = 0x8a8a9a;
    const accentCyan = 0x00ddff;

    // Two claw fingers
    const finger1Angle = angle - clawSpread;
    const finger2Angle = angle + clawSpread;

    const f1EndX = x + Math.cos(finger1Angle) * clawLength;
    const f1EndY = y + Math.sin(finger1Angle) * clawLength;
    const f2EndX = x + Math.cos(finger2Angle) * clawLength;
    const f2EndY = y + Math.sin(finger2Angle) * clawLength;

    // Draw fingers
    g.lineStyle(6, metalDark, 1);
    g.lineBetween(x, y, f1EndX, f1EndY);
    g.lineBetween(x, y, f2EndX, f2EndY);

    g.lineStyle(3, metalLight, 1);
    g.lineBetween(x, y, f1EndX, f1EndY);
    g.lineBetween(x, y, f2EndX, f2EndY);

    // Finger tips
    g.fillStyle(accentCyan, 0.8);
    g.fillCircle(f1EndX, f1EndY, 4);
    g.fillCircle(f2EndX, f2EndY, 4);

    // Wrist joint
    g.fillStyle(metalDark, 1);
    g.fillCircle(x, y, 6);
  }

  /* =========================================
     GAME LOOP
     ========================================= */
  update(time, delta) {
    if (this.isPaused) {
      if (this.heldItem) this.cancelHeldItem();
      return;
    }

    // Update robot arms
    this.updateRobotArm(delta);
    this.updateTrayArm();

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
    this.updateBoids(delta);

    // --- spawn logic ---
    if (this.isStoreOpen && this.ordersSpawned < this.totalOrders) {
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

    // Day complete?
    if (
      this.ordersSpawned >= this.totalOrders
      && this.trays.length === 0
      && !this._dayEnding
    ) {
      this._dayEnding = true;
      this.endDay();
    }
  }
}
