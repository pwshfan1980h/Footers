import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { gameState } from '../data/GameState.js';
import { PENALTY_RATE, HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, DAY_NAMES, HULL_DARK, GAME_FONT } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { createButton } from '../utils/uiHelpers.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.finalScore = data.totalScore || 0;
    this.day = data.day || 1;
    this.locationId = data.locationId || null;
    this.ordersCompleted = data.ordersCompleted || 0;
    this.ordersMissed = data.ordersMissed || 0;

    // Termination penalty: lose a fraction of shift earnings
    this.rawEarnings = data.earnings || 0;
    this.penaltyAmount = this.rawEarnings * PENALTY_RATE;
    this.earnings = this.rawEarnings - this.penaltyAmount;
  }

  create() {
    const ALERT_RED = 0xff2244;

    // Update game state with partial earnings
    if (this.earnings > 0) {
      gameState.updateAfterShift(this.locationId, this.earnings, this.ordersCompleted, this.ordersMissed);
    }

    soundManager.init();
    soundManager.fired();

    // Apply post-processing shaders (WebGL only)
    if (this.renderer.pipelines) {
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) this.cameras.main.setPostPipeline(CRTPostFX);
    }

    // Dark background with red tint
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0x150505);

    // Red alert glow
    const glow = this.add.graphics();
    glow.fillStyle(0x440000, 0.3);
    glow.fillEllipse(HALF_WIDTH, 281, 1500, 562);

    // Starfield (dimmer for alert)
    const g = this.add.graphics();
    const stars = [
      { x: 188, y: 141, s: 1.5 }, { x: 563, y: 211, s: 1 }, { x: 938, y: 112, s: 1.5 },
      { x: 1313, y: 169, s: 1 }, { x: 1688, y: 127, s: 1.5 }, { x: 281, y: 422, s: 1 },
      { x: 750, y: 703, s: 1 }, { x: 1125, y: 633, s: 1.5 }, { x: 1500, y: 773, s: 1 },
    ];
    stars.forEach(star => {
      g.fillStyle(0xff8888, 0.4);
      g.fillCircle(star.x, star.y, star.s);
    });

    // Alert panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.9);
    panel.fillRoundedRect(HALF_WIDTH - 300, 141, 600, 169, 12);
    panel.lineStyle(3, ALERT_RED, 0.8);
    panel.strokeRoundedRect(HALF_WIDTH - 300, 141, 600, 169, 12);

    // Title
    this.add.text(HALF_WIDTH, 197, "YOU'RE FIRED!", {
      fontSize: '68px', color: '#ff2244', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Pulsing alert effect
    const alertFlash = this.add.rectangle(HALF_WIDTH, 197, 500, 80, ALERT_RED, 0);
    this.tweens.add({
      targets: alertFlash,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(HALF_WIDTH, 323, 'Too many orders missed!', {
      fontSize: '24px', color: '#ff8888', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Stats panel — expanded with penalty breakdown
    const statsPanel = this.add.graphics();
    statsPanel.fillStyle(HULL_DARK, 0.8);
    statsPanel.fillRoundedRect(HALF_WIDTH - 250, 380, 500, 253, 12);
    statsPanel.lineStyle(2, 0x442233, 0.6);
    statsPanel.strokeRoundedRect(HALF_WIDTH - 250, 380, 500, 253, 12);

    const dayNames = DAY_NAMES;
    this.add.text(HALF_WIDTH, 408, `Lasted until: ${dayNames[this.day]}`, {
      fontSize: '18px', color: '#aaaacc', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 444, `Orders completed: ${this.ordersCompleted}`, {
      fontSize: '18px', color: '#aaaacc', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 487, `Shift earnings: $${this.rawEarnings.toFixed(2)}`, {
      fontSize: '18px', color: '#44ff88', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 523, `Termination penalty: -$${this.penaltyAmount.toFixed(2)}`, {
      fontSize: '18px', color: '#ff4444', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 568, `Amount kept: $${this.earnings.toFixed(2)}`, {
      fontSize: '22px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 610, `Final score: ${this.finalScore}`, {
      fontSize: '18px', color: '#aaaacc', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Try again button
    createButton(this, HALF_WIDTH - 230, 686, 220, 64, 'TRY AGAIN', {
      baseFill: 0x3a1a1a,
      hoverFill: 0x4a2a2a,
      accentColor: ALERT_RED,
      hoverAccent: 0xff4466,
      textColor: '#ff6666',
      hoverTextColor: '#ff8888',
      fontSize: '24px',
      onClick: () => this.scene.start('Game'),
    });

    // Return to Map button
    createButton(this, HALF_WIDTH + 10, 686, 220, 64, 'RETURN TO MAP', {
      baseFill: 0x1a1a3a,
      hoverFill: 0x2a2a4a,
      accentColor: 0x4488ff,
      hoverAccent: 0x6699ff,
      textColor: '#6688ff',
      hoverTextColor: '#88aaff',
      fontSize: '18px',
      onClick: () => this.scene.start('SystemMap', { returnFromShift: true, shiftEarnings: this.earnings }),
    });
  }
}
