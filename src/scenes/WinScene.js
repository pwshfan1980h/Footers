import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class WinScene extends Phaser.Scene {
  constructor() {
    super('Win');
  }

  init(data) {
    this.totalScore = data.totalScore || 0;
  }

  create() {
    // Space theme colors
    const SPACE_BLACK = 0x0a0a12;
    const HULL_DARK = 0x1a1a25;
    const NEON_CYAN = 0x00ddff;
    const NEON_MAGENTA = 0xff44aa;

    soundManager.fanfare();

    // Background
    this.add.rectangle(512, 384, 1024, 768, SPACE_BLACK);

    // Starfield
    const g = this.add.graphics();
    const stars = [
      { x: 50, y: 80, s: 2.5 }, { x: 200, y: 150, s: 2 }, { x: 400, y: 100, s: 2.5 },
      { x: 600, y: 130, s: 2 }, { x: 800, y: 70, s: 2.5 }, { x: 950, y: 120, s: 2 },
      { x: 100, y: 250, s: 1.5 }, { x: 350, y: 300, s: 2 }, { x: 550, y: 280, s: 1.5 },
      { x: 750, y: 320, s: 2 }, { x: 900, y: 260, s: 1.5 }, { x: 150, y: 450, s: 2 },
      { x: 300, y: 500, s: 1.5 }, { x: 500, y: 470, s: 2 }, { x: 700, y: 510, s: 1.5 },
      { x: 850, y: 480, s: 2 }, { x: 100, y: 600, s: 1.5 }, { x: 400, y: 650, s: 2 },
      { x: 600, y: 620, s: 1.5 }, { x: 850, y: 670, s: 2 }, { x: 950, y: 550, s: 1.5 },
    ];
    stars.forEach(star => {
      const color = Math.random() > 0.5 ? 0xffffff : 0xaaddff;
      g.fillStyle(color, 0.8);
      g.fillCircle(star.x, star.y, star.s);
    });

    // Nebula glow behind title
    g.fillStyle(0x442266, 0.2);
    g.fillEllipse(512, 130, 500, 150);
    g.fillStyle(0x224466, 0.15);
    g.fillEllipse(512, 130, 400, 100);

    // Title
    this.add.text(512, 100, 'EMPLOYEE OF', {
      fontSize: '40px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    this.add.text(512, 155, 'THE WEEK!', {
      fontSize: '56px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    // Title glow animation
    const titleGlow = this.add.text(512, 155, 'THE WEEK!', {
      fontSize: '56px', color: '#ffff00', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: titleGlow,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(512, 230, 'You survived the whole week at the station!', {
      fontSize: '22px', color: '#8899bb', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Score panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.8);
    panel.fillRoundedRect(312, 270, 400, 100, 12);
    panel.lineStyle(2, NEON_CYAN, 0.6);
    panel.strokeRoundedRect(312, 270, 400, 100, 12);

    this.add.text(512, 320, `Final Score: ${this.totalScore}`, {
      fontSize: '36px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    // Rating
    let rating = 'Adequate Worker';
    let ratingColor = '#aaddff';
    if (this.totalScore >= 5000) {
      rating = 'Legendary Station Chef';
      ratingColor = '#ffd700';
    } else if (this.totalScore >= 3500) {
      rating = 'Master Food Technician';
      ratingColor = '#ff44aa';
    } else if (this.totalScore >= 2000) {
      rating = 'Seasoned Space Cook';
      ratingColor = '#00ffcc';
    } else if (this.totalScore >= 1000) {
      rating = 'Orbital Apprentice';
      ratingColor = '#88ddff';
    }

    this.add.text(512, 405, `Rating: ${rating}`, {
      fontSize: '26px', color: ratingColor, fontFamily: 'Arial', fontStyle: 'italic',
    }).setOrigin(0.5);

    // Play again button
    const btn = this.add.graphics();
    btn.fillStyle(0x1a3a4a, 1);
    btn.fillRoundedRect(382, 468, 260, 64, 12);
    btn.lineStyle(3, NEON_CYAN, 1);
    btn.strokeRoundedRect(382, 468, 260, 64, 12);

    const btnHit = this.add.rectangle(512, 500, 260, 64)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(512, 500, 'PLAY AGAIN', {
      fontSize: '26px', color: '#00ffff', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    btnHit.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x2a4a5a, 1);
      btn.fillRoundedRect(382, 468, 260, 64, 12);
      btn.lineStyle(3, 0x44ffff, 1);
      btn.strokeRoundedRect(382, 468, 260, 64, 12);
      btnText.setColor('#44ffff');
    });
    btnHit.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x1a3a4a, 1);
      btn.fillRoundedRect(382, 468, 260, 64, 12);
      btn.lineStyle(3, NEON_CYAN, 1);
      btn.strokeRoundedRect(382, 468, 260, 64, 12);
      btnText.setColor('#00ffff');
    });
    btnHit.on('pointerdown', () => {
      this.scene.start('Game');
    });
  }
}
