import Phaser from 'phaser';
import { LOCATIONS } from '../data/locations.js';
import { gameState } from '../data/GameState.js';
import { soundManager } from '../SoundManager.js';
import { WarpPostFX } from '../shaders/WarpPostFX.js';

export class TravelManager {
  constructor(scene) {
    this.scene = scene;

    // State machine: idle | moving | departing | warping | arriving | docked
    this.travelState = 'idle';
    this.travelTarget = null;
    this.travelTimer = 0;
    this.travelDuration = 0;
    this.travelWarpDuration = 0;
    this.warpLines = [];
    this._warpStartX = null;
    this._warpStartY = null;
  }

  create() {
    const scene = this.scene;

    // Path line graphics
    scene.pathGraphics = scene.add.graphics().setDepth(2.5);

    // Warp effect layer
    scene.warpContainer = scene.add.container(0, 0).setDepth(5);
    this.warpGraphics = scene.add.graphics();
    scene.warpContainer.add(this.warpGraphics);
  }

  startTravelTo(locationId) {
    const scene = this.scene;
    const loc = LOCATIONS[locationId];
    if (!loc) return;

    this.travelTarget = locationId;
    scene.dockedAt = null;
    scene.hud.openShopBtn.container.setVisible(false);

    // Calculate distance for warp duration
    const dist = Phaser.Math.Distance.Between(scene.shipX, scene.shipY, loc.x, loc.y);
    this.travelWarpDuration = Phaser.Math.Clamp(dist / 400, 2, 5) * 1000;

    // Start departing
    this.travelState = 'departing';
    this.travelTimer = 0;
    this.travelDuration = 500;
    scene.hud.updateStatusText();

    // Sound
    soundManager.init();
    this.playWarpStart();
  }

  update(delta) {
    this.updateTravel(delta);
    this.updateWarpShader();
    this.drawPathLine();
    this.drawWarpEffect();
  }

  updateWarpShader() {
    const result = this.scene.cameras.main.getPostPipeline(WarpPostFX);
    const pipeline = Array.isArray(result) ? result[0] : result;
    if (!pipeline) return;

    let intensity = 0;
    if (this.travelState === 'departing') {
      intensity = Math.min(this.travelTimer / this.travelDuration, 1);
    } else if (this.travelState === 'warping') {
      intensity = 0.8 + 0.2 * Math.sin(this.travelTimer * 0.003);
    } else if (this.travelState === 'arriving') {
      intensity = 1 - Math.min(this.travelTimer / this.travelDuration, 1);
    }
    pipeline.setIntensity(intensity);
  }

  updateTravel(delta) {
    if (this.travelState === 'idle' || this.travelState === 'moving' || this.travelState === 'docked') return;

    const scene = this.scene;
    this.travelTimer += delta;

    if (this.travelState === 'departing') {
      if (this.travelTimer >= this.travelDuration) {
        this.travelState = 'warping';
        this.travelTimer = 0;
        this.travelDuration = this.travelWarpDuration;

        this.warpLines = [];
        for (let i = 0; i < 80; i++) {
          this.warpLines.push({
            x: (Math.random() - 0.5) * 1920,
            y: (Math.random() - 0.5) * 1080,
            speed: 200 + Math.random() * 600,
            length: 20 + Math.random() * 80,
            alpha: 0.3 + Math.random() * 0.5,
          });
        }
        scene.hud.updateStatusText();
      }
    } else if (this.travelState === 'warping') {
      const t = Math.min(this.travelTimer / this.travelDuration, 1);

      const loc = LOCATIONS[this.travelTarget];
      if (loc) {
        const st = t * t * (3 - 2 * t);
        scene.shipX = Phaser.Math.Linear(this._warpStartX || scene.shipX, loc.x, st);
        scene.shipY = Phaser.Math.Linear(this._warpStartY || scene.shipY, loc.y, st);

        if (t === 0) {
          this._warpStartX = scene.shipX;
          this._warpStartY = scene.shipY;
        }
      }

      if (loc) {
        const remaining = Phaser.Math.Distance.Between(scene.shipX, scene.shipY, loc.x, loc.y);
        scene.hud.statusText.setText(`WARPING... ${Math.round(remaining)} units`);
      }

      if (this.travelTimer >= this.travelDuration) {
        this.travelState = 'arriving';
        this.travelTimer = 0;
        this.travelDuration = 500;
        this.warpLines = [];
        this.playWarpEnd();
        scene.hud.updateStatusText();
      }
    } else if (this.travelState === 'arriving') {
      if (this.travelTimer >= this.travelDuration) {
        const loc = LOCATIONS[this.travelTarget];
        if (loc) {
          scene.shipX = loc.x;
          scene.shipY = loc.y;
          scene.dockedAt = loc;
          gameState.truckshipWorldX = loc.x;
          gameState.truckshipWorldY = loc.y;
          gameState.currentLocation = loc.id;
          gameState.locationsVisited.add(loc.id);
          gameState.save();
        }

        this.travelState = 'docked';
        this.travelTarget = null;
        scene.hud.openShopBtn.container.setVisible(true);
        this.playDocking();
        scene.hud.updateStatusText();

        if (loc) scene.hud.showInfoPanel(loc);

        this._warpStartX = null;
        this._warpStartY = null;
      }
    }
  }

  drawWarpEffect() {
    this.warpGraphics.clear();
    if (this.travelState !== 'warping' || this.warpLines.length === 0) return;

    const scene = this.scene;
    const cx = scene.shipX;
    const cy = scene.shipY;

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

      if (newDist > 1100) {
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 100;
        line.x = Math.cos(a) * d;
        line.y = Math.sin(a) * d;
      }
    });
  }

  drawPathLine() {
    const scene = this.scene;
    scene.pathGraphics.clear();
    if (this.travelState !== 'moving') return;

    const dx = scene.moveTargetX - scene.shipX;
    const dy = scene.moveTargetY - scene.shipY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const steps = Math.floor(dist / 15);
    scene.pathGraphics.lineStyle(1, 0xFFE8CC, 0.25);
    for (let i = 0; i < steps; i += 2) {
      const t1 = i / steps;
      const t2 = Math.min((i + 1) / steps, 1);
      scene.pathGraphics.lineBetween(
        scene.shipX + dx * t1, scene.shipY + dy * t1,
        scene.shipX + dx * t2, scene.shipY + dy * t2
      );
    }

    scene.pathGraphics.lineStyle(1, 0xFFE8CC, 0.15);
    scene.pathGraphics.strokeCircle(scene.moveTargetX, scene.moveTargetY, 8);
  }

  // === SOUNDS ===
  playWarpStart() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    soundManager._osc('sine', 100, t, 0.5, 0.15);
    soundManager._osc('sine', 200, t + 0.1, 0.4, 0.12);
    soundManager._osc('sine', 400, t + 0.2, 0.3, 0.1);
    soundManager._osc('sine', 800, t + 0.3, 0.3, 0.08);
    soundManager._noise(0.5, 0.08);
  }

  playWarpEnd() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    soundManager._osc('sine', 800, t, 0.3, 0.12);
    soundManager._osc('sine', 400, t + 0.1, 0.3, 0.1);
    soundManager._osc('sine', 200, t + 0.2, 0.4, 0.1);
    soundManager._osc('sine', 100, t + 0.3, 0.5, 0.08);
  }

  playDocking() {
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    soundManager._osc('square', 80, t, 0.1, 0.15);
    soundManager._osc('sine', 200, t + 0.05, 0.15, 0.1);
    soundManager._noise(0.2, 0.1);
    soundManager._osc('sine', 523, t + 0.25, 0.15, 0.12);
    soundManager._osc('sine', 659, t + 0.35, 0.15, 0.12);
  }
}
