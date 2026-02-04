import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.finalScore = data.totalScore || 0;
    this.day = data.day || 1;
  }

  create() {
    // Space theme colors with red alert
    const SPACE_BLACK = 0x0a0a12;
    const HULL_DARK = 0x1a1a25;
    const ALERT_RED = 0xff2244;

    soundManager.fired();

    // Dark background with red tint
    this.add.rectangle(512, 384, 1024, 768, 0x150505);

    // Red alert glow
    const glow = this.add.graphics();
    glow.fillStyle(0x440000, 0.3);
    glow.fillEllipse(512, 200, 800, 400);

    // Starfield (dimmer for alert)
    const g = this.add.graphics();
    const stars = [
      { x: 100, y: 100, s: 1.5 }, { x: 300, y: 150, s: 1 }, { x: 500, y: 80, s: 1.5 },
      { x: 700, y: 120, s: 1 }, { x: 900, y: 90, s: 1.5 }, { x: 150, y: 300, s: 1 },
      { x: 400, y: 500, s: 1 }, { x: 600, y: 450, s: 1.5 }, { x: 800, y: 550, s: 1 },
    ];
    stars.forEach(star => {
      g.fillStyle(0xff8888, 0.4);
      g.fillCircle(star.x, star.y, star.s);
    });

    // Alert panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.9);
    panel.fillRoundedRect(212, 100, 600, 120, 12);
    panel.lineStyle(3, ALERT_RED, 0.8);
    panel.strokeRoundedRect(212, 100, 600, 120, 12);

    // Title
    this.add.text(512, 140, "YOU'RE FIRED!", {
      fontSize: '68px', color: '#ff2244', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    // Pulsing alert effect
    const alertFlash = this.add.rectangle(512, 140, 500, 80, ALERT_RED, 0);
    this.tweens.add({
      targets: alertFlash,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(512, 230, 'Too many orders missed!', {
      fontSize: '24px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Stats panel
    const statsPanel = this.add.graphics();
    statsPanel.fillStyle(HULL_DARK, 0.8);
    statsPanel.fillRoundedRect(312, 280, 400, 120, 12);
    statsPanel.lineStyle(2, 0x442233, 0.6);
    statsPanel.strokeRoundedRect(312, 280, 400, 120, 12);

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.add.text(512, 320, `Lasted until: ${dayNames[this.day]}`, {
      fontSize: '20px', color: '#aaaacc', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 360, `Final score: ${this.finalScore}`, {
      fontSize: '28px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    // Try again button
    const btn = this.add.graphics();
    btn.fillStyle(0x3a1a1a, 1);
    btn.fillRoundedRect(382, 448, 260, 64, 12);
    btn.lineStyle(3, ALERT_RED, 0.8);
    btn.strokeRoundedRect(382, 448, 260, 64, 12);

    const btnHit = this.add.rectangle(512, 480, 260, 64)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(512, 480, 'TRY AGAIN', {
      fontSize: '26px', color: '#ff6666', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    btnHit.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x4a2a2a, 1);
      btn.fillRoundedRect(382, 448, 260, 64, 12);
      btn.lineStyle(3, 0xff4466, 1);
      btn.strokeRoundedRect(382, 448, 260, 64, 12);
      btnText.setColor('#ff8888');
    });
    btnHit.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x3a1a1a, 1);
      btn.fillRoundedRect(382, 448, 260, 64, 12);
      btn.lineStyle(3, ALERT_RED, 0.8);
      btn.strokeRoundedRect(382, 448, 260, 64, 12);
      btnText.setColor('#ff6666');
    });
    btnHit.on('pointerdown', () => {
      this.scene.start('Game');
    });
  }
}
