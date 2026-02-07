import Phaser from 'phaser';
import { LOCATIONS } from '../data/locations.js';
import { gameState } from '../data/GameState.js';
import { drawFoodTruckship, drawLocationIcon } from '../utils/ShipDrawing.js';
import { MapBackground } from '../managers/MapBackground.js';
import { MapVessels } from '../managers/MapVessels.js';
import { TravelManager } from '../managers/TravelManager.js';
import { MapHUD } from '../managers/MapHUD.js';
import { musicManager } from '../MusicManager.js';
import { WORLD_W, WORLD_H } from '../data/constants.js';
const SHIP_SPEED = 120; // px/s
const DOCK_RANGE = 80;
const CAMERA_LERP = 0.08;
const BASE_ZOOM = 0.4;   // zoomed out so all locations are visible
const SHIP_SCALE = 0.3;  // small ship icon on the map

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

    // === MANAGERS ===
    this.background = new MapBackground(this);
    this.vessels = new MapVessels(this);
    this.travel = new TravelManager(this);
    this.hud = new MapHUD(this);

    // === CAMERA & WORLD ===
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // === LAYERS (created by managers) ===
    this.background.create();
    this.vessels.create();

    // Location markers
    this.locationContainer = this.add.container(0, 0).setDepth(2);
    this.locationMarkers = {};
    this.drawLocations();

    // Ship layer
    this.shipContainer = this.add.container(0, 0).setDepth(3);
    this.shipGraphics = this.add.graphics();
    this.shipContainer.add(this.shipGraphics);
    this.drawShip();

    // Travel (path line + warp effects)
    this.travel.create();

    // HUD (UI container, top bar, help overlay)
    this.hud.create();

    // === CAMERA FOLLOW ===
    this.cameras.main.setZoom(BASE_ZOOM);
    const initViewW = 1024 / BASE_ZOOM;
    const initViewH = 768 / BASE_ZOOM;
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.shipX - 512 / BASE_ZOOM, 0, Math.max(0, WORLD_W - initViewW));
    this.cameras.main.scrollY = Phaser.Math.Clamp(this.shipY - 384 / BASE_ZOOM, 0, Math.max(0, WORLD_H - initViewH));

    // === INPUT ===
    this.setupClickCatcher();

    // Esc to close panel
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.hud.infoPanelVisible) this.hud.hideInfoPanel();
    });

    // F1 for help overlay
    this.f1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', (event) => {
      if (event && event.originalEvent) event.originalEvent.preventDefault();
      this.hud.showHelp(true);
    });
    this.f1Key.on('up', () => this.hud.showHelp(false));
    this.input.keyboard.on('keydown-F1', (event) => {
      if (event && event.originalEvent) event.originalEvent.preventDefault();
    });

    // Show return notification
    if (this.returnFromShift && this.shiftEarnings > 0) {
      this.hud.showEarningsNotification(this.shiftEarnings);
    }

    // Location marker pulse timer
    this.markerPulseTimer = 0;

    // Start ambient music (no-op if already playing)
    musicManager.start();
  }

  // =========================================
  // LOCATIONS
  // =========================================
  drawLocations() {
    Object.values(LOCATIONS).forEach(loc => {
      const g = this.add.graphics();
      drawLocationIcon(g, loc.x, loc.y, loc.type, 3.0, loc.color);
      this.locationContainer.add(g);

      const label = this.add.text(loc.x, loc.y + 50, loc.name, {
        fontSize: '22px', color: '#ccddee', fontFamily: 'Arial',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5);
      this.locationContainer.add(label);

      const hint = this.getLocationHint(loc);
      const hintText = this.add.text(loc.x, loc.y + 74, hint, {
        fontSize: '15px', color: '#778899', fontFamily: 'Arial',
        align: 'center',
      }).setOrigin(0.5);
      this.locationContainer.add(hintText);

      const glow = this.add.graphics();
      glow.lineStyle(3, loc.color, 0.35);
      glow.strokeCircle(loc.x, loc.y, 44);
      this.locationContainer.add(glow);

      const hit = this.add.circle(loc.x, loc.y + 20, 120).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      this.locationContainer.add(hit);

      const hoverRing = this.add.graphics();
      this.locationContainer.add(hoverRing);

      hit.on('pointerover', () => {
        hoverRing.clear();
        hoverRing.lineStyle(4, loc.color, 0.7);
        hoverRing.strokeCircle(loc.x, loc.y, 55);
        label.setColor('#ffffff');
      });
      hit.on('pointerout', () => {
        hoverRing.clear();
        label.setColor('#ccddee');
      });
      hit.on('pointerdown', () => {
        this.hud.selectLocation(loc);
      });

      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => this.hud.selectLocation(loc));
      label.on('pointerover', () => {
        hoverRing.clear();
        hoverRing.lineStyle(4, loc.color, 0.7);
        hoverRing.strokeCircle(loc.x, loc.y, 55);
        label.setColor('#ffffff');
      });
      label.on('pointerout', () => {
        hoverRing.clear();
        label.setColor('#ccddee');
      });
      hintText.setInteractive({ useHandCursor: true });
      hintText.on('pointerdown', () => this.hud.selectLocation(loc));

      this.locationMarkers[loc.id] = { g, label, glow, hit, hoverRing };
    });
  }

  getLocationHint(loc) {
    const m = loc.modifiers;
    const hints = [];
    if (m.speedMult > 1.1) hints.push('Fast');
    else if (m.speedMult < 0.9) hints.push('Slow');
    if (m.tipMult > 1.3) hints.push('Big tips');
    else if (m.tipMult < 0.9) hints.push('Low tips');
    if (m.spawnMult > 1.1) hints.push('Busy');
    else if (m.spawnMult < 0.9) hints.push('Quiet');
    return hints.join(' · ') || 'Balanced';
  }

  updateLocationPulse(time) {
    const pulse = 0.3 + Math.sin(time * 0.003) * 0.2;
    Object.values(LOCATIONS).forEach(loc => {
      const marker = this.locationMarkers[loc.id];
      if (marker && marker.glow) {
        marker.glow.clear();
        marker.glow.lineStyle(3, loc.color, pulse);
        marker.glow.strokeCircle(loc.x, loc.y, 44 + Math.sin(time * 0.002) * 5);
      }
    });
  }

  // =========================================
  // SHIP
  // =========================================
  drawShip() {
    this.shipGraphics.clear();
    drawFoodTruckship(this, this.shipGraphics, this.shipX, this.shipY, SHIP_SCALE, this.shipContainer);
  }

  checkInitialDocking() {
    if (gameState.currentLocation && LOCATIONS[gameState.currentLocation]) {
      const loc = LOCATIONS[gameState.currentLocation];
      this.dockedAt = loc;
      this.shipX = loc.x;
      this.shipY = loc.y;
      gameState.truckshipWorldX = loc.x;
      gameState.truckshipWorldY = loc.y;
      return;
    }

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
  // INPUT
  // =========================================
  setupClickCatcher() {
    const catcher = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H)
      .setInteractive()
      .setAlpha(0.001)
      .setDepth(0);

    catcher.on('pointerdown', (pointer) => {
      this.handleClick(pointer);
    });
  }

  handleClick(pointer) {
    if (pointer.y < 55) return;

    if (['departing', 'warping', 'arriving'].includes(this.travel.travelState)) return;

    const cam = this.cameras.main;
    const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);
    const wx = worldPoint.x;
    const wy = worldPoint.y;

    const CLICK_RANGE = 160;
    const locs = Object.values(LOCATIONS);
    let closestLoc = null;
    let closestDist = CLICK_RANGE;
    for (const loc of locs) {
      const dist = Phaser.Math.Distance.Between(wx, wy, loc.x, loc.y + 20);
      if (dist < closestDist) {
        closestDist = dist;
        closestLoc = loc;
      }
    }

    if (closestLoc) {
      this.hud.selectLocation(closestLoc);
      return;
    }

    this.moveToward(wx, wy);
    this.hud.hideInfoPanel();
  }

  moveToward(wx, wy) {
    if (['departing', 'warping', 'arriving'].includes(this.travel.travelState)) return;

    this.moveTargetX = Phaser.Math.Clamp(wx, 50, WORLD_W - 50);
    this.moveTargetY = Phaser.Math.Clamp(wy, 50, WORLD_H - 50);
    this.travel.travelState = 'moving';
    this.dockedAt = null;
    this.hud.openShopBtn.container.setVisible(false);
    this.hud.updateStatusText();
  }

  // =========================================
  // GAME LOOP
  // =========================================
  update(time, delta) {
    // Update travel cutscene
    this.travel.update(delta);

    // Ship movement (non-cutscene)
    if (this.travel.travelState === 'moving') {
      const dx = this.moveTargetX - this.shipX;
      const dy = this.moveTargetY - this.shipY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        const step = Math.min(SHIP_SPEED * (delta / 1000), dist);
        this.shipX += (dx / dist) * step;
        this.shipY += (dy / dist) * step;

        this.targetAngle = Math.atan2(dy, dx);
        this.shipAngle = Phaser.Math.Angle.RotateTo(this.shipAngle, this.targetAngle, 0.05);

        gameState.truckshipWorldX = this.shipX;
        gameState.truckshipWorldY = this.shipY;

        this.checkDocking();
      } else {
        this.travel.travelState = 'idle';
        this.hud.updateStatusText();
      }
    }

    // Redraw ship
    this.shipContainer.removeAll(true);
    this.shipGraphics = this.add.graphics();
    this.shipContainer.add(this.shipGraphics);
    drawFoodTruckship(this, this.shipGraphics, this.shipX, this.shipY, SHIP_SCALE, this.shipContainer);

    // Camera follow (smooth lerp)
    const cam = this.cameras.main;
    const targetCX = this.shipX - 512 / cam.zoom;
    const targetCY = this.shipY - 384 / cam.zoom;
    cam.scrollX += (targetCX - cam.scrollX) * CAMERA_LERP;
    cam.scrollY += (targetCY - cam.scrollY) * CAMERA_LERP;

    // Clamp to world bounds
    const viewW = 1024 / cam.zoom;
    const viewH = 768 / cam.zoom;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, Math.max(0, WORLD_W - viewW));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, WORLD_H - viewH));

    // Nebula parallax
    this.background.updateParallax(cam.scrollX, cam.scrollY);

    // Update vessels
    this.vessels.update(delta, this.shipX, this.shipY);

    // Location marker pulse
    this.updateLocationPulse(time);

    // Update HUD
    this.hud.update(cam);
  }

  checkDocking() {
    const locs = Object.values(LOCATIONS);
    for (const loc of locs) {
      const dist = Phaser.Math.Distance.Between(this.shipX, this.shipY, loc.x, loc.y);
      if (dist < DOCK_RANGE) {
        this.shipX = loc.x;
        this.shipY = loc.y;
        this.moveTargetX = loc.x;
        this.moveTargetY = loc.y;
        this.dockedAt = loc;
        this.travel.travelState = 'docked';
        this.hud.openShopBtn.container.setVisible(true);

        gameState.truckshipWorldX = loc.x;
        gameState.truckshipWorldY = loc.y;
        gameState.currentLocation = loc.id;
        gameState.save();

        this.travel.playDocking();
        this.hud.updateStatusText();
        this.hud.showInfoPanel(loc);
        return;
      }
    }
  }
}
