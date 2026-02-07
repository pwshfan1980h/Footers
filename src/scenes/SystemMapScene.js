import Phaser from 'phaser';
import { LOCATIONS, TRADE_ROUTES } from '../data/locations.js';
import { gameState } from '../data/GameState.js';
import { drawFoodTruckship, drawLocationIcon } from '../utils/ShipDrawing.js';
import { soundManager } from '../SoundManager.js';

const WORLD_W = 3000;
const WORLD_H = 2000;
const SHIP_SPEED = 120; // px/s
const DOCK_RANGE = 60;
const CAMERA_LERP = 0.08;

export class SystemMapScene extends Phaser.Scene {
  constructor() {
    super('SystemMap');
  }

  init(data) {
    this.returnFromShift = data?.returnFromShift || false;
    this.shiftEarnings = data?.shiftEarnings || 0;
  }

  create() {
    // === COLOR PALETTE ===
    this.SPACE_BLACK = 0x0a0a12;
    this.NEON_PINK = 0xFF6B8A;
    this.WARM_CREAM = 0xFFE8CC;
    this.HULL_DARK = 0x1a1a25;

    // Info panel Y offset (tweened for slide animation, combined with camera in update)
    this._panelOffsetY = 768; // starts offscreen

    // === STATE MACHINE ===
    // idle | moving | departing | warping | arriving | docked
    this.travelState = 'idle';
    this.travelTarget = null;
    this.travelTimer = 0;
    this.travelDuration = 0;
    this.warpLines = [];

    // Ship position from gameState
    this.shipX = gameState.truckshipWorldX;
    this.shipY = gameState.truckshipWorldY;
    this.shipAngle = 0;
    this.targetAngle = 0;
    this.moveTargetX = this.shipX;
    this.moveTargetY = this.shipY;

    // Docking
    this.dockedAt = null;
    this.checkInitialDocking();

    // === CAMERA & WORLD ===
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // === LAYERS ===
    // Background
    this.bgContainer = this.add.container(0, 0).setDepth(0);
    this.drawBackground();

    // Nebula parallax layers
    this.nebulaContainer = this.add.container(0, 0).setDepth(0.2);
    this.drawNebulaLayers();

    // Grid
    this.gridContainer = this.add.container(0, 0).setDepth(0.5);
    this.drawPerspectiveGrid();

    // Trade routes
    this.routeContainer = this.add.container(0, 0).setDepth(0.8);
    this.drawTradeRoutes();

    // Vessels (map boids)
    this.vesselContainer = this.add.container(0, 0).setDepth(1);
    this.vessels = [];
    this.spawnMapVessels();

    // Location markers
    this.locationContainer = this.add.container(0, 0).setDepth(2);
    this.locationMarkers = {};
    this.drawLocations();

    // Ship layer
    this.shipContainer = this.add.container(0, 0).setDepth(3);
    this.shipGraphics = this.add.graphics();
    this.shipContainer.add(this.shipGraphics);
    this.drawShip();

    // Path line
    this.pathGraphics = this.add.graphics().setDepth(2.5);

    // Warp effect layer
    this.warpContainer = this.add.container(0, 0).setDepth(5);
    this.warpGraphics = this.add.graphics();
    this.warpContainer.add(this.warpGraphics);

    // UI layer (positioned to follow camera each frame — NOT using scrollFactor
    // because Phaser hit testing breaks for interactive objects inside scrollFactor(0) containers)
    this.uiContainer = this.add.container(0, 0).setDepth(10);
    this.createUI();

    // Info panel (slide-up from bottom, positioned via _panelOffsetY in update)
    this.infoPanelContainer = this.add.container(0, 0).setDepth(11);
    this.infoPanelVisible = false;
    this.selectedLocation = null;
    this.createInfoPanel();

    // === CAMERA FOLLOW ===
    this.cameras.main.scrollX = this.shipX - 512;
    this.cameras.main.scrollY = this.shipY - 384;

    // === INPUT ===
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver && currentlyOver.length > 0) return; // a game object handled it
      this.handleClick(pointer);
    });

    // Esc to close panel
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.infoPanelVisible) this.hideInfoPanel();
    });

    // F1 for help overlay
    this.f1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', (event) => {
      if (event && event.originalEvent) event.originalEvent.preventDefault();
      this.showHelp(true);
    });
    this.f1Key.on('up', () => this.showHelp(false));
    this.input.keyboard.on('keydown-F1', (event) => {
      if (event && event.originalEvent) event.originalEvent.preventDefault();
    });
    this.createHelpOverlay();

    // Show return notification
    if (this.returnFromShift && this.shiftEarnings > 0) {
      this.showEarningsNotification(this.shiftEarnings);
    }

    // Location marker pulse timer
    this.markerPulseTimer = 0;
  }

  // =========================================
  // BACKGROUND
  // =========================================
  drawBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(this.SPACE_BLACK, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    this.bgContainer.add(bg);

    // Starfield
    const starG = this.add.graphics();
    let seed = 99;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 300; i++) {
      const sx = rand() * WORLD_W;
      const sy = rand() * WORLD_H;
      const size = 0.5 + rand() * 2;
      const alpha = 0.3 + rand() * 0.6;
      const color = rand() > 0.75 ? 0xaaddff : 0xffffff;
      starG.fillStyle(color, alpha);
      starG.fillCircle(sx, sy, size);
    }
    this.bgContainer.add(starG);
    this.starGraphics = starG;

    // Twinkling
    this.tweens.add({
      targets: starG,
      alpha: 0.7,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  drawNebulaLayers() {
    // 2-3 nebula blobs at different parallax rates
    this.nebulaBlobs = [];
    const configs = [
      { x: 600, y: 500, w: 800, h: 400, color: 0x442266, alpha: 0.08, parallax: 0.3 },
      { x: 2200, y: 1200, w: 600, h: 350, color: 0x663344, alpha: 0.06, parallax: 0.5 },
      { x: 1400, y: 300, w: 500, h: 300, color: 0x224466, alpha: 0.07, parallax: 0.4 },
    ];
    configs.forEach(cfg => {
      const g = this.add.graphics();
      g.fillStyle(cfg.color, cfg.alpha);
      g.fillEllipse(cfg.x, cfg.y, cfg.w, cfg.h);
      g.fillStyle(cfg.color, cfg.alpha * 1.5);
      g.fillEllipse(cfg.x, cfg.y, cfg.w * 0.6, cfg.h * 0.6);
      this.nebulaContainer.add(g);
      this.nebulaBlobs.push({ g, parallax: cfg.parallax, baseX: cfg.x, baseY: cfg.y });
    });
  }

  drawPerspectiveGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x223344, 0.15);

    // Horizontal lines
    for (let y = 0; y <= WORLD_H; y += 100) {
      g.lineBetween(0, y, WORLD_W, y);
    }
    // Vertical lines
    for (let x = 0; x <= WORLD_W; x += 100) {
      g.lineBetween(x, 0, x, WORLD_H);
    }

    this.gridContainer.add(g);
  }

  drawTradeRoutes() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x334455, 0.2);
    TRADE_ROUTES.forEach(([a, b]) => {
      const la = LOCATIONS[a];
      const lb = LOCATIONS[b];
      if (la && lb) {
        // Dashed line effect
        const dx = lb.x - la.x;
        const dy = lb.y - la.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(dist / 20);
        for (let i = 0; i < steps; i += 2) {
          const t1 = i / steps;
          const t2 = Math.min((i + 1) / steps, 1);
          g.lineBetween(
            la.x + dx * t1, la.y + dy * t1,
            la.x + dx * t2, la.y + dy * t2
          );
        }
      }
    });
    this.routeContainer.add(g);
  }

  // =========================================
  // MAP VESSELS (BOIDS)
  // =========================================
  spawnMapVessels() {
    const vesselColors = [0x88aaff, 0x888888, 0x446688, 0xffffaa, 0xff6666, 0x4444ff];
    const shipShapes = ['diamond', 'box', 'triangle', 'dot', 'arrow', 'cross'];

    // Cluster vessels near locations
    const locArr = Object.values(LOCATIONS);
    for (let i = 0; i < 60; i++) {
      // Pick a base location weighted by vesselDensity
      const loc = Phaser.Utils.Array.GetRandom(locArr);
      const density = loc.vesselDensity || 0.5;
      if (Math.random() > density + 0.2) continue; // skip based on density

      const spread = 200 + Math.random() * 300;
      const angle = Math.random() * Math.PI * 2;
      const vx = loc.x + Math.cos(angle) * spread * (0.5 + Math.random());
      const vy = loc.y + Math.sin(angle) * spread * (0.5 + Math.random());

      // Some follow trade routes
      let moveAngle = Math.random() * Math.PI * 2;
      const onRoute = Math.random() < 0.3;
      if (onRoute && TRADE_ROUTES.length > 0) {
        const route = Phaser.Utils.Array.GetRandom(TRADE_ROUTES);
        const la = LOCATIONS[route[0]];
        const lb = LOCATIONS[route[1]];
        if (la && lb) {
          moveAngle = Math.atan2(lb.y - la.y, lb.x - la.x);
          if (Math.random() < 0.5) moveAngle += Math.PI; // some go reverse
        }
      }

      const speed = 5 + Math.random() * 20;
      const size = 3 + Math.random() * 5;
      const colorIdx = Math.floor(Math.random() * vesselColors.length);

      this.vessels.push({
        x: Phaser.Math.Clamp(vx, 20, WORLD_W - 20),
        y: Phaser.Math.Clamp(vy, 20, WORLD_H - 20),
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        size,
        color: vesselColors[colorIdx],
        shape: shipShapes[colorIdx],
        baseX: vx,
        baseY: vy,
        driftRange: spread,
      });
    }
  }

  drawVessels() {
    const g = this.add.graphics();
    this.vesselContainer.removeAll(true);
    this.vesselContainer.add(g);

    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;

    this.vessels.forEach(v => {
      // Only draw if on-screen (with margin)
      if (v.x < camX - 100 || v.x > camX + 1124 || v.y < camY - 100 || v.y > camY + 868) return;

      // Near truckship? Draw bigger
      const distToShip = Phaser.Math.Distance.Between(v.x, v.y, this.shipX, this.shipY);
      const sizeMult = distToShip < 200 ? 1.5 : 1;
      const s = v.size * sizeMult;
      const alpha = distToShip < 200 ? 0.7 : 0.4;

      g.fillStyle(v.color, alpha);
      switch (v.shape) {
        case 'diamond':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x, v.y - s * 0.6);
          g.lineTo(v.x - s, v.y);
          g.lineTo(v.x, v.y + s * 0.6);
          g.closePath();
          g.fillPath();
          break;
        case 'box':
          g.fillRect(v.x - s * 0.5, v.y - s * 0.4, s, s * 0.8);
          break;
        case 'triangle':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x - s * 0.5, v.y - s * 0.6);
          g.lineTo(v.x - s * 0.5, v.y + s * 0.6);
          g.closePath();
          g.fillPath();
          break;
        case 'arrow':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x - s * 0.4, v.y - s * 0.5);
          g.lineTo(v.x - s * 0.2, v.y);
          g.lineTo(v.x - s * 0.4, v.y + s * 0.5);
          g.closePath();
          g.fillPath();
          break;
        case 'cross':
          g.fillRect(v.x - s * 0.15, v.y - s * 0.5, s * 0.3, s);
          g.fillRect(v.x - s * 0.5, v.y - s * 0.15, s, s * 0.3);
          break;
        default: // dot
          g.fillCircle(v.x, v.y, s * 0.5);
      }

      // Engine dot
      g.fillStyle(0xFFEE88, alpha * 0.6);
      g.fillCircle(v.x - s * 0.8, v.y, s * 0.2);
    });
  }

  updateVessels(delta) {
    const dt = delta / 1000;
    this.vessels.forEach(v => {
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      // Wrap around or drift back
      if (v.x < -50) v.x = WORLD_W + 30;
      if (v.x > WORLD_W + 50) v.x = -30;
      if (v.y < -50) v.y = WORLD_H + 30;
      if (v.y > WORLD_H + 50) v.y = -30;
    });
  }

  // =========================================
  // LOCATIONS
  // =========================================
  drawLocations() {
    Object.values(LOCATIONS).forEach(loc => {
      const g = this.add.graphics();
      drawLocationIcon(g, loc.x, loc.y, loc.type, 1.5, loc.color);
      this.locationContainer.add(g);

      // Label
      const label = this.add.text(loc.x, loc.y + 28, loc.name, {
        fontSize: '12px', color: '#aabbcc', fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5);
      this.locationContainer.add(label);

      // Pulse glow ring
      const glow = this.add.graphics();
      glow.lineStyle(2, loc.color, 0.3);
      glow.strokeCircle(loc.x, loc.y, 22);
      this.locationContainer.add(glow);

      // Interactive hit area
      const hit = this.add.circle(loc.x, loc.y, 30).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      this.locationContainer.add(hit);

      hit.on('pointerdown', () => {
        this.selectLocation(loc);
      });

      this.locationMarkers[loc.id] = { g, label, glow, hit };
    });
  }

  updateLocationPulse(time) {
    const pulse = 0.3 + Math.sin(time * 0.003) * 0.2;
    Object.values(LOCATIONS).forEach(loc => {
      const marker = this.locationMarkers[loc.id];
      if (marker && marker.glow) {
        marker.glow.clear();
        marker.glow.lineStyle(2, loc.color, pulse);
        marker.glow.strokeCircle(loc.x, loc.y, 22 + Math.sin(time * 0.002) * 3);
      }
    });
  }

  // =========================================
  // SHIP
  // =========================================
  drawShip() {
    this.shipGraphics.clear();
    drawFoodTruckship(this, this.shipGraphics, this.shipX, this.shipY, 0.8, this.shipContainer);
  }

  checkInitialDocking() {
    const locs = Object.values(LOCATIONS);
    for (const loc of locs) {
      const dist = Phaser.Math.Distance.Between(this.shipX, this.shipY, loc.x, loc.y);
      if (dist < DOCK_RANGE) {
        this.dockedAt = loc;
        this.shipX = loc.x;
        this.shipY = loc.y;
        break;
      }
    }
  }

  // =========================================
  // UI
  // =========================================
  createUI() {
    // Top bar
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a15, 0.85);
    bar.fillRect(0, 0, 1024, 44);
    bar.fillStyle(this.NEON_PINK, 0.3);
    bar.fillRect(0, 42, 1024, 2);
    this.uiContainer.add(bar);

    // Money display
    this.moneyText = this.add.text(12, 12, `$${gameState.totalMoney.toFixed(2)}`, {
      fontSize: '18px', color: '#44ff88', fontFamily: 'Bungee, Arial',
    });
    this.uiContainer.add(this.moneyText);

    // Shifts completed
    this.shiftsText = this.add.text(200, 14, `Shifts: ${gameState.shiftsCompleted}`, {
      fontSize: '14px', color: '#aabbcc', fontFamily: 'Arial',
    });
    this.uiContainer.add(this.shiftsText);

    // Current status
    this.statusText = this.add.text(512, 14, '', {
      fontSize: '14px', color: '#FFE8CC', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(this.statusText);
    this.updateStatusText();

    // F1=Help memo indicator
    const memoX = 380;
    const memoY = 22;
    const memo = this.add.graphics();
    memo.fillStyle(0x5A3A28, 0.95);
    memo.fillRoundedRect(memoX, memoY - 12, 70, 24, 4);
    memo.lineStyle(1, this.NEON_PINK, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 12, 70, 24, 4);
    this.uiContainer.add(memo);
    const memoText = this.add.text(memoX + 35, memoY, 'F1=Help', {
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.uiContainer.add(memoText);

    // "Open Shop" button (only visible when docked)
    this.openShopBtn = this.createButton(880, 12, 120, 28, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, () => {
      if (this.dockedAt) {
        soundManager.ding();
        this.scene.start('Game', {
          location: this.dockedAt,
          modifiers: this.dockedAt.modifiers,
        });
      }
    });
    this.uiContainer.add(this.openShopBtn.container);
    this.openShopBtn.container.setVisible(!!this.dockedAt);
  }

  createButton(x, y, w, h, label, bgColor, textColor, callback) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(2, textColor, 0.8);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    container.add(bg);

    const text = this.add.text(w / 2, h / 2, label, {
      fontSize: '12px', color: Phaser.Display.Color.IntegerToColor(textColor).rgba,
      fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);
    container.add(text);

    const hit = this.add.rectangle(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(hit);

    hit.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-2, -2, w + 4, h + 4, 6);
      bg.lineStyle(2, textColor, 1);
      bg.strokeRoundedRect(-2, -2, w + 4, h + 4, 6);
    });
    hit.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, textColor, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 6);
    });
    hit.on('pointerdown', callback);

    return { container, bg, text, hit };
  }

  updateStatusText() {
    if (this.travelState === 'warping') {
      this.statusText.setText('WARPING...');
      this.statusText.setColor('#ff88aa');
    } else if (this.travelState === 'departing') {
      this.statusText.setText('Departing...');
      this.statusText.setColor('#ffcc88');
    } else if (this.travelState === 'arriving') {
      const name = this.travelTarget ? LOCATIONS[this.travelTarget]?.name : '';
      this.statusText.setText(`Arriving at ${name}...`);
      this.statusText.setColor('#88ffaa');
    } else if (this.dockedAt) {
      this.statusText.setText(`Docked: ${this.dockedAt.name}`);
      this.statusText.setColor('#88ddff');
    } else if (this.travelState === 'moving') {
      this.statusText.setText('In transit...');
      this.statusText.setColor('#FFE8CC');
    } else {
      this.statusText.setText('Click a location or anywhere to navigate');
      this.statusText.setColor('#667788');
    }
  }

  createHelpOverlay() {
    const panelW = 280;
    const panelH = 260;
    const panelX = 372;
    const panelY = 200;

    this.helpOverlay = this.add.container(panelX, panelY).setDepth(100);

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a15, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 10);
    bg.lineStyle(2, this.NEON_PINK, 0.8);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 10);
    bg.lineStyle(1, this.NEON_PINK, 0.2);
    bg.strokeRoundedRect(4, 4, panelW - 8, panelH - 8, 8);
    this.helpOverlay.add(bg);

    // Title
    const title = this.add.text(panelW / 2, 16, 'SYSTEM MAP', {
      fontSize: '16px', color: '#FF6B8A', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5, 0);
    this.helpOverlay.add(title);

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, this.NEON_PINK, 0.3);
    divider.lineBetween(16, 40, panelW - 16, 40);
    this.helpOverlay.add(divider);

    // Controls section
    const controls = [
      { key: 'Click map', desc: 'Move truckship' },
      { key: 'Click location', desc: 'View info panel' },
      { key: 'Set Course', desc: 'Warp to location' },
      { key: 'Open Shop', desc: 'Start serving orders' },
      { key: 'ESC', desc: 'Close info panel' },
      { key: 'F1 (hold)', desc: 'Show this help' },
    ];

    const ctrlTitle = this.add.text(16, 50, 'CONTROLS', {
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    });
    this.helpOverlay.add(ctrlTitle);

    controls.forEach((ctrl, i) => {
      const y = 68 + i * 17;
      const keyTxt = this.add.text(16, y, ctrl.key, {
        fontSize: '11px', color: '#FFE8CC', fontFamily: 'Arial', fontStyle: 'bold',
      });
      const descTxt = this.add.text(120, y, ctrl.desc, {
        fontSize: '11px', color: '#8899aa', fontFamily: 'Arial',
      });
      this.helpOverlay.add(keyTxt);
      this.helpOverlay.add(descTxt);
    });

    // Tips section
    const tipsY = 178;
    const tipDivider = this.add.graphics();
    tipDivider.lineStyle(1, this.NEON_PINK, 0.3);
    tipDivider.lineBetween(16, tipsY - 6, panelW - 16, tipsY - 6);
    this.helpOverlay.add(tipDivider);

    const tipTitle = this.add.text(16, tipsY, 'TIPS', {
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    });
    this.helpOverlay.add(tipTitle);

    const tips = [
      'Each location has different difficulty.',
      'Big tips at slow locations, fast cash at busy ones.',
      'End your shift anytime to keep earnings.',
    ];

    tips.forEach((tip, i) => {
      const t = this.add.text(16, tipsY + 18 + i * 16, tip, {
        fontSize: '10px', color: '#667788', fontFamily: 'Arial', fontStyle: 'italic',
      });
      this.helpOverlay.add(t);
    });

    this.helpOverlay.setVisible(false);
    this.uiContainer.add(this.helpOverlay);
  }

  showHelp(visible) {
    if (this.helpOverlay) {
      this.helpOverlay.setVisible(visible);
    }
  }

  // =========================================
  // INFO PANEL
  // =========================================
  createInfoPanel() {
    const panelH = 160;
    const bg = this.add.graphics();
    bg.fillStyle(0x0f1020, 0.92);
    bg.fillRoundedRect(0, 0, 1024, panelH, { tl: 12, tr: 12, bl: 0, br: 0 });
    bg.lineStyle(2, this.NEON_PINK, 0.4);
    bg.strokeRoundedRect(0, 0, 1024, panelH, { tl: 12, tr: 12, bl: 0, br: 0 });
    this.infoPanelContainer.add(bg);

    this.infoPanelName = this.add.text(24, 16, '', {
      fontSize: '22px', color: '#FFE8CC', fontFamily: 'Bungee, Arial',
    });
    this.infoPanelContainer.add(this.infoPanelName);

    this.infoPanelDesc = this.add.text(24, 48, '', {
      fontSize: '14px', color: '#8899aa', fontFamily: 'Arial',
      wordWrap: { width: 600 },
    });
    this.infoPanelContainer.add(this.infoPanelDesc);

    this.infoPanelFlavor = this.add.text(24, 80, '', {
      fontSize: '12px', color: '#667788', fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    this.infoPanelContainer.add(this.infoPanelFlavor);

    // Difficulty hints
    this.infoPanelMods = this.add.text(24, 110, '', {
      fontSize: '12px', color: '#aabbcc', fontFamily: 'Arial',
    });
    this.infoPanelContainer.add(this.infoPanelMods);

    // "Set Course" button
    this.setCourseBtn = this.createButton(780, 20, 180, 36, 'SET COURSE', 0x1a2a3a, 0x44aaff, () => {
      if (this.selectedLocation) {
        this.startTravelTo(this.selectedLocation.id);
        this.hideInfoPanel();
      }
    });
    this.infoPanelContainer.add(this.setCourseBtn.container);

    // "Open Shop" button in panel
    this.panelShopBtn = this.createButton(780, 70, 180, 36, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, () => {
      if (this.selectedLocation && this.dockedAt && this.dockedAt.id === this.selectedLocation.id) {
        soundManager.ding();
        this.scene.start('Game', {
          location: this.dockedAt,
          modifiers: this.dockedAt.modifiers,
        });
      }
    });
    this.infoPanelContainer.add(this.panelShopBtn.container);
    this.panelShopBtn.container.setVisible(false);
  }

  showInfoPanel(loc) {
    this.selectedLocation = loc;
    this.infoPanelName.setText(loc.name);
    this.infoPanelDesc.setText(loc.description);
    this.infoPanelFlavor.setText(`"${loc.flavor}"`);

    const m = loc.modifiers;
    const hints = [];
    if (m.speedMult > 1.1) hints.push('Fast belt');
    else if (m.speedMult < 0.9) hints.push('Slow belt');
    if (m.spawnMult > 1.1) hints.push('Many orders');
    else if (m.spawnMult < 0.9) hints.push('Few orders');
    if (m.tipMult > 1.3) hints.push('Big tips!');
    else if (m.tipMult < 0.9) hints.push('Low tips');
    this.infoPanelMods.setText(hints.join(' · ') || 'Standard difficulty');

    const isDocked = this.dockedAt && this.dockedAt.id === loc.id;
    this.setCourseBtn.container.setVisible(!isDocked);
    this.panelShopBtn.container.setVisible(isDocked);

    if (!this.infoPanelVisible) {
      this.infoPanelVisible = true;
      this.tweens.add({
        targets: this,
        _panelOffsetY: 768 - 160,
        duration: 250,
        ease: 'Power2',
      });
    }
  }

  hideInfoPanel() {
    if (!this.infoPanelVisible) return;
    this.infoPanelVisible = false;
    this.selectedLocation = null;
    this.tweens.add({
      targets: this,
      _panelOffsetY: 768,
      duration: 200,
      ease: 'Power2',
    });
  }

  selectLocation(loc) {
    this.showInfoPanel(loc);
  }

  // =========================================
  // INPUT
  // =========================================
  handleClick(pointer) {
    // Ignore clicks on the top UI bar area
    if (pointer.y < 50) return;

    // If in a travel cutscene, ignore
    if (['departing', 'warping', 'arriving'].includes(this.travelState)) return;

    // Ignore clicks on the info panel area
    if (this.infoPanelVisible && pointer.y >= 768 - 160) return;

    // Convert to world coords and move
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    this.moveToward(wx, wy);
    this.hideInfoPanel();
  }

  moveToward(wx, wy) {
    if (['departing', 'warping', 'arriving'].includes(this.travelState)) return;

    this.moveTargetX = Phaser.Math.Clamp(wx, 50, WORLD_W - 50);
    this.moveTargetY = Phaser.Math.Clamp(wy, 50, WORLD_H - 50);
    this.travelState = 'moving';
    this.dockedAt = null;
    this.openShopBtn.container.setVisible(false);
    this.updateStatusText();
  }

  // =========================================
  // TRAVEL CUTSCENE
  // =========================================
  startTravelTo(locationId) {
    const loc = LOCATIONS[locationId];
    if (!loc) return;

    this.travelTarget = locationId;
    this.dockedAt = null;
    this.openShopBtn.container.setVisible(false);

    // Calculate distance for warp duration
    const dist = Phaser.Math.Distance.Between(this.shipX, this.shipY, loc.x, loc.y);
    this.travelWarpDuration = Phaser.Math.Clamp(dist / 400, 2, 5) * 1000; // 2-5s

    // Start departing
    this.travelState = 'departing';
    this.travelTimer = 0;
    this.travelDuration = 500; // 0.5s depart
    this.updateStatusText();

    // Sound
    soundManager.init();
    this.playWarpStart();
  }

  updateTravel(delta) {
    if (this.travelState === 'idle' || this.travelState === 'moving' || this.travelState === 'docked') return;

    this.travelTimer += delta;

    if (this.travelState === 'departing') {
      // Camera zooms in slightly
      const t = Math.min(this.travelTimer / this.travelDuration, 1);
      this.cameras.main.setZoom(1 + t * 0.3);

      if (this.travelTimer >= this.travelDuration) {
        // Transition to warping
        this.travelState = 'warping';
        this.travelTimer = 0;
        this.travelDuration = this.travelWarpDuration;

        // Generate warp lines
        this.warpLines = [];
        for (let i = 0; i < 80; i++) {
          this.warpLines.push({
            x: (Math.random() - 0.5) * 1200,
            y: (Math.random() - 0.5) * 900,
            speed: 200 + Math.random() * 600,
            length: 20 + Math.random() * 80,
            alpha: 0.3 + Math.random() * 0.5,
          });
        }
        this.updateStatusText();
      }
    } else if (this.travelState === 'warping') {
      const t = Math.min(this.travelTimer / this.travelDuration, 1);

      // Interpolate ship position
      const loc = LOCATIONS[this.travelTarget];
      if (loc) {
        const startX = this.shipX;
        const startY = this.shipY;
        // Use smooth step for position interpolation
        const st = t * t * (3 - 2 * t);
        this.shipX = Phaser.Math.Linear(this._warpStartX || startX, loc.x, st);
        this.shipY = Phaser.Math.Linear(this._warpStartY || startY, loc.y, st);

        if (t === 0) {
          this._warpStartX = this.shipX;
          this._warpStartY = this.shipY;
        }
      }

      // Distance countdown
      if (loc) {
        const remaining = Phaser.Math.Distance.Between(this.shipX, this.shipY, loc.x, loc.y);
        this.statusText.setText(`WARPING... ${Math.round(remaining)} units`);
      }

      if (this.travelTimer >= this.travelDuration) {
        // Transition to arriving
        this.travelState = 'arriving';
        this.travelTimer = 0;
        this.travelDuration = 500;
        this.warpLines = [];
        this.playWarpEnd();
        this.updateStatusText();
      }
    } else if (this.travelState === 'arriving') {
      const t = Math.min(this.travelTimer / this.travelDuration, 1);
      // Zoom back out
      this.cameras.main.setZoom(1.3 - t * 0.3);

      if (this.travelTimer >= this.travelDuration) {
        // Dock at location
        const loc = LOCATIONS[this.travelTarget];
        if (loc) {
          this.shipX = loc.x;
          this.shipY = loc.y;
          this.dockedAt = loc;
          gameState.truckshipWorldX = loc.x;
          gameState.truckshipWorldY = loc.y;
          gameState.currentLocation = loc.id;
          gameState.locationsVisited.add(loc.id);
          gameState.save();
        }

        this.travelState = 'docked';
        this.travelTarget = null;
        this.cameras.main.setZoom(1);
        this.openShopBtn.container.setVisible(true);
        this.playDocking();
        this.updateStatusText();

        // Auto-show info panel for destination
        if (loc) this.showInfoPanel(loc);

        delete this._warpStartX;
        delete this._warpStartY;
      }
    }
  }

  drawWarpEffect() {
    this.warpGraphics.clear();
    if (this.travelState !== 'warping' || this.warpLines.length === 0) return;

    const cx = this.shipX;
    const cy = this.shipY;

    // Star streak lines relative to ship
    this.warpGraphics.lineStyle(1.5, 0xaaddff, 0.6);
    this.warpLines.forEach(line => {
      const angle = Math.atan2(line.y, line.x);
      const dist = Math.sqrt(line.x * line.x + line.y * line.y);
      const x1 = cx + Math.cos(angle) * dist;
      const y1 = cy + Math.sin(angle) * dist;
      const x2 = x1 + Math.cos(angle) * line.length;
      const y2 = y1 + Math.sin(angle) * line.length;
      this.warpGraphics.lineStyle(1, 0xaaddff, line.alpha);
      this.warpGraphics.lineBetween(x1, y1, x2, y2);
    });

    // Engine glow behind ship
    this.warpGraphics.fillStyle(0x4488FF, 0.4);
    this.warpGraphics.fillCircle(cx - 50, cy, 15);
    this.warpGraphics.fillStyle(0x88CCFF, 0.6);
    this.warpGraphics.fillCircle(cx - 50, cy, 8);

    // Update warp line positions (stream outward)
    const dt = 1 / 60;
    this.warpLines.forEach(line => {
      const angle = Math.atan2(line.y, line.x);
      const dist = Math.sqrt(line.x * line.x + line.y * line.y);
      const newDist = dist + line.speed * dt;
      line.x = Math.cos(angle) * newDist;
      line.y = Math.sin(angle) * newDist;

      // Reset if too far
      if (newDist > 800) {
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 100;
        line.x = Math.cos(a) * d;
        line.y = Math.sin(a) * d;
      }
    });
  }

  drawPathLine() {
    this.pathGraphics.clear();
    if (this.travelState !== 'moving') return;

    const dx = this.moveTargetX - this.shipX;
    const dy = this.moveTargetY - this.shipY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    // Dotted line from ship to target
    const steps = Math.floor(dist / 15);
    this.pathGraphics.lineStyle(1, 0xFFE8CC, 0.25);
    for (let i = 0; i < steps; i += 2) {
      const t1 = i / steps;
      const t2 = Math.min((i + 1) / steps, 1);
      this.pathGraphics.lineBetween(
        this.shipX + dx * t1, this.shipY + dy * t1,
        this.shipX + dx * t2, this.shipY + dy * t2
      );
    }

    // Target circle
    this.pathGraphics.lineStyle(1, 0xFFE8CC, 0.15);
    this.pathGraphics.strokeCircle(this.moveTargetX, this.moveTargetY, 8);
  }

  // =========================================
  // SOUNDS
  // =========================================
  playWarpStart() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    // Rising sweep
    soundManager._osc('sine', 100, t, 0.5, 0.15);
    soundManager._osc('sine', 200, t + 0.1, 0.4, 0.12);
    soundManager._osc('sine', 400, t + 0.2, 0.3, 0.1);
    soundManager._osc('sine', 800, t + 0.3, 0.3, 0.08);
    soundManager._noise(0.5, 0.08);
  }

  playWarpEnd() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    // Descending sweep
    soundManager._osc('sine', 800, t, 0.3, 0.12);
    soundManager._osc('sine', 400, t + 0.1, 0.3, 0.1);
    soundManager._osc('sine', 200, t + 0.2, 0.4, 0.1);
    soundManager._osc('sine', 100, t + 0.3, 0.5, 0.08);
  }

  playDocking() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    // Mechanical clunk + hiss
    soundManager._osc('square', 80, t, 0.1, 0.15);
    soundManager._osc('sine', 200, t + 0.05, 0.15, 0.1);
    soundManager._noise(0.2, 0.1);
    // Confirmation chime
    soundManager._osc('sine', 523, t + 0.25, 0.15, 0.12);
    soundManager._osc('sine', 659, t + 0.35, 0.15, 0.12);
  }

  // =========================================
  // NOTIFICATIONS
  // =========================================
  showEarningsNotification(amount) {
    const cam = this.cameras.main;
    const text = this.add.text(cam.scrollX + 512, cam.scrollY + 100, `+$${amount.toFixed(2)} earned!`, {
      fontSize: '24px', color: '#44ff88', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // =========================================
  // GAME LOOP
  // =========================================
  update(time, delta) {
    // Update travel cutscene
    this.updateTravel(delta);

    // Ship movement (non-cutscene)
    if (this.travelState === 'moving') {
      const dx = this.moveTargetX - this.shipX;
      const dy = this.moveTargetY - this.shipY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        const step = Math.min(SHIP_SPEED * (delta / 1000), dist);
        this.shipX += (dx / dist) * step;
        this.shipY += (dy / dist) * step;

        // Rotate toward target
        this.targetAngle = Math.atan2(dy, dx);
        this.shipAngle = Phaser.Math.Angle.RotateTo(this.shipAngle, this.targetAngle, 0.05);

        // Update gameState
        gameState.truckshipWorldX = this.shipX;
        gameState.truckshipWorldY = this.shipY;

        // Check docking
        this.checkDocking();
      } else {
        this.travelState = 'idle';
        this.updateStatusText();
      }
    }

    // Redraw ship
    this.shipContainer.removeAll(true);
    this.shipGraphics = this.add.graphics();
    this.shipContainer.add(this.shipGraphics);
    drawFoodTruckship(this, this.shipGraphics, this.shipX, this.shipY, 0.8, this.shipContainer);

    // Camera follow (smooth lerp)
    const cam = this.cameras.main;
    const targetCX = this.shipX - 512 / cam.zoom;
    const targetCY = this.shipY - 384 / cam.zoom;
    cam.scrollX += (targetCX - cam.scrollX) * CAMERA_LERP;
    cam.scrollY += (targetCY - cam.scrollY) * CAMERA_LERP;

    // Nebula parallax
    this.nebulaBlobs.forEach(blob => {
      const ox = cam.scrollX * blob.parallax * 0.1;
      const oy = cam.scrollY * blob.parallax * 0.1;
      blob.g.setPosition(-ox, -oy);
    });

    // Update vessels
    this.updateVessels(delta);
    this.drawVessels();

    // Draw path line
    this.drawPathLine();

    // Draw warp effect
    this.drawWarpEffect();

    // Location marker pulse
    this.updateLocationPulse(time);

    // Position UI containers to follow camera (world-space, not scrollFactor)
    this.uiContainer.setPosition(cam.scrollX, cam.scrollY);
    this.infoPanelContainer.setPosition(cam.scrollX, cam.scrollY + this._panelOffsetY);

    // Update UI
    this.moneyText.setText(`$${gameState.totalMoney.toFixed(2)}`);
  }

  checkDocking() {
    const locs = Object.values(LOCATIONS);
    for (const loc of locs) {
      const dist = Phaser.Math.Distance.Between(this.shipX, this.shipY, loc.x, loc.y);
      if (dist < DOCK_RANGE) {
        // Snap to dock
        this.shipX = loc.x;
        this.shipY = loc.y;
        this.moveTargetX = loc.x;
        this.moveTargetY = loc.y;
        this.dockedAt = loc;
        this.travelState = 'docked';
        this.openShopBtn.container.setVisible(true);

        gameState.truckshipWorldX = loc.x;
        gameState.truckshipWorldY = loc.y;
        gameState.currentLocation = loc.id;
        gameState.save();

        this.playDocking();
        this.updateStatusText();
        this.showInfoPanel(loc);
        return;
      }
    }
  }
}
