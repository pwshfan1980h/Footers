import Phaser from 'phaser';
import { LOCATIONS, TRADE_ROUTES } from '../data/locations.js';
import { gameState } from '../data/GameState.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT, HALF_WIDTH } from '../data/constants.js';
import { ALL_INGREDIENT_KEYS, INGREDIENTS } from '../data/ingredients.js';

const PROBE_COST = 5;
const PROBE_TRAVEL_TIME = 15; // seconds

export class TradeProbe {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle'; // idle | launching | traveling | returning | complete
    this.graphics = null;
    this.timer = 0;
    this.totalTime = PROBE_TRAVEL_TIME;
    this.routeIndex = -1;
    this.progress = 0;
    this.direction = 1;
    this.returnProgress = 0;
    this.reward = null;
    this.probeX = 0;
    this.probeY = 0;
    this.pulseTime = 0;
  }

  create() {
    this.graphics = this.scene.add.graphics().setDepth(4);
  }

  launch() {
    if (this.state !== 'idle') {
      soundManager.buzz();
      return;
    }
    if (gameState.totalMoney < PROBE_COST) {
      soundManager.buzz();
      return;
    }

    soundManager.init();
    gameState.totalMoney -= PROBE_COST;
    gameState.save();

    // Pick a random route
    this.routeIndex = Math.floor(Math.random() * TRADE_ROUTES.length);
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.progress = this.direction === 1 ? 0 : 1;
    this.timer = 0;
    this.totalTime = PROBE_TRAVEL_TIME;
    this.returnProgress = 0;

    // Determine reward — random individual ingredient
    const rewardKey = ALL_INGREDIENT_KEYS[Math.floor(Math.random() * ALL_INGREDIENT_KEYS.length)];
    const cashBonus = 2 + Math.random() * 3;
    this.reward = { ingredientKey: rewardKey, stockAmount: 3, cash: cashBonus };

    this.state = 'launching';
    this.probeX = this.scene.shipX;
    this.probeY = this.scene.shipY;

    // Launch sound: ascending tone sweep
    this._playLaunchSound();

    this.scene.hud.updateProbeStatus('Probe launching...');
  }

  _playLaunchSound() {
    soundManager.init();
    if (!soundManager.ctx) return;
    const t = soundManager.ctx.currentTime;
    soundManager._osc('sine', 400, t, 0.15, 0.12);
    soundManager._osc('sine', 600, t + 0.08, 0.15, 0.1);
    soundManager._osc('sine', 900, t + 0.16, 0.2, 0.08);
  }

  _playReturnSound() {
    soundManager.init();
    soundManager.successChime();
  }

  update(delta) {
    if (this.state === 'idle' || this.state === 'complete') return;

    const dt = delta / 1000;
    this.pulseTime += dt;

    if (this.state === 'launching') {
      // Brief launch animation (0.5s) — probe moves from ship to route start
      this.timer += dt;
      const launchDur = 0.5;
      const t = Math.min(this.timer / launchDur, 1);

      const [aId, bId] = TRADE_ROUTES[this.routeIndex];
      const la = LOCATIONS[aId];
      const lb = LOCATIONS[bId];
      const startX = this.direction === 1 ? la.x : lb.x;
      const startY = this.direction === 1 ? la.y : lb.y;

      this.probeX = this.scene.shipX + (startX - this.scene.shipX) * t;
      this.probeY = this.scene.shipY + (startY - this.scene.shipY) * t;

      if (t >= 1) {
        this.state = 'traveling';
        this.timer = 0;
        this.progress = this.direction === 1 ? 0 : 1;
      }
    } else if (this.state === 'traveling') {
      this.timer += dt;
      const travelFraction = Math.min(this.timer / this.totalTime, 1);

      // Move along route
      if (this.direction === 1) {
        this.progress = travelFraction;
      } else {
        this.progress = 1 - travelFraction;
      }

      const [aId, bId] = TRADE_ROUTES[this.routeIndex];
      const la = LOCATIONS[aId];
      const lb = LOCATIONS[bId];
      this.probeX = la.x + (lb.x - la.x) * this.progress;
      this.probeY = la.y + (lb.y - la.y) * this.progress;

      const remaining = Math.ceil(this.totalTime - this.timer);
      this.scene.hud.updateProbeStatus(`Probe en route... ${remaining}s`);

      if (travelFraction >= 1) {
        this.state = 'returning';
        this.timer = 0;
        this.returnStartX = this.probeX;
        this.returnStartY = this.probeY;
      }
    } else if (this.state === 'returning') {
      this.timer += dt;
      const returnDur = 1.0;
      const t = Math.min(this.timer / returnDur, 1);

      this.probeX = this.returnStartX + (this.scene.shipX - this.returnStartX) * t;
      this.probeY = this.returnStartY + (this.scene.shipY - this.returnStartY) * t;

      this.scene.hud.updateProbeStatus('Probe returning...');

      if (t >= 1) {
        this._completeProbe();
      }
    }

    this._draw();
  }

  _completeProbe() {
    this.state = 'idle';

    // Apply rewards
    gameState.addIngredientStock(this.reward.ingredientKey, this.reward.stockAmount);
    gameState.totalMoney += this.reward.cash;
    gameState.save();

    this._playReturnSound();

    // Show notification
    const ingName = INGREDIENTS[this.reward.ingredientKey].name;
    const msg = `Probe returned! +${this.reward.stockAmount} ${ingName}, +$${this.reward.cash.toFixed(2)}`;
    this.scene.hud.updateProbeStatus('');
    this._showNotification(msg);

    this.graphics.clear();
    this.reward = null;
  }

  _showNotification(msg) {
    const scene = this.scene;
    const text = scene.add.text(HALF_WIDTH, 160, msg, {
      fontSize: '32px', color: '#00ddff', fontFamily: GAME_FONT,
    }).setOrigin(0.5).setDepth(20);

    scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  _draw() {
    const g = this.graphics;
    g.clear();

    if (this.state === 'idle' || this.state === 'complete') return;

    const pulse = 0.6 + Math.sin(this.pulseTime * 8) * 0.4;
    const size = 6;

    // Draw pulsing cyan triangle
    g.fillStyle(0x00ddff, pulse);
    g.beginPath();
    g.moveTo(this.probeX + size, this.probeY);
    g.lineTo(this.probeX - size * 0.5, this.probeY - size * 0.6);
    g.lineTo(this.probeX - size * 0.5, this.probeY + size * 0.6);
    g.closePath();
    g.fillPath();

    // Glow ring
    g.lineStyle(1.5, 0x00ddff, pulse * 0.4);
    g.strokeCircle(this.probeX, this.probeY, size + 4 + Math.sin(this.pulseTime * 4) * 2);

    // Thrust trail (when launching or traveling)
    if (this.state === 'launching' || this.state === 'traveling') {
      g.fillStyle(0x00ddff, pulse * 0.3);
      g.fillCircle(this.probeX - size, this.probeY, 3);
      g.fillStyle(0x00ddff, pulse * 0.15);
      g.fillCircle(this.probeX - size * 2, this.probeY, 2);
    }
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}
