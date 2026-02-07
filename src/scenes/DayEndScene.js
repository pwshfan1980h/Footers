import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class DayEndScene extends Phaser.Scene {
  constructor() {
    super('DayEnd');
  }

  init(data) {
    this.day = data.day;
    this.dayScore = data.dayScore;
    this.totalScore = data.totalScore;
    this.ordersCompleted = data.ordersCompleted;
    this.totalOrders = data.totalOrders;
  }

  create() {
    // Space theme colors
    const SPACE_BLACK = 0x0a0a12;
    const HULL_DARK = 0x1a1a25;
    const NEON_CYAN = 0x00ddff;

    soundManager.fanfare();

    // Background
    this.add.rectangle(512, 384, 1024, 768, SPACE_BLACK);

    // Starfield
    const g = this.add.graphics();
    const stars = [
      { x: 100, y: 100, s: 2 }, { x: 300, y: 150, s: 1.5 }, { x: 500, y: 80, s: 2 },
      { x: 700, y: 120, s: 1.5 }, { x: 900, y: 90, s: 2 }, { x: 150, y: 300, s: 1 },
      { x: 400, y: 400, s: 1.5 }, { x: 600, y: 350, s: 1 }, { x: 800, y: 450, s: 2 },
      { x: 200, y: 600, s: 1.5 }, { x: 450, y: 650, s: 1 }, { x: 750, y: 580, s: 2 },
    ];
    stars.forEach(star => {
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(star.x, star.y, star.s);
    });

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Title
    this.add.text(512, 100, 'SHIFT COMPLETE!', {
      fontSize: '52px', color: '#00ffcc', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    this.add.text(512, 180, `${dayNames[this.day]} is done.`, {
      fontSize: '24px', color: '#8899aa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Stats panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.8);
    panel.fillRoundedRect(312, 220, 400, 160, 12);
    panel.lineStyle(2, NEON_CYAN, 0.5);
    panel.strokeRoundedRect(312, 220, 400, 160, 12);

    this.add.text(512, 260, `Orders filled: ${this.ordersCompleted} / ${this.totalOrders}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 300, `Day score: +${this.dayScore}`, {
      fontSize: '22px', color: '#ffd700', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 350, `Total score: ${this.totalScore}`, {
      fontSize: '26px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    if (this.day < 5) {
      const previews = {
        1: 'Treatments unlocked tomorrow!',
        2: 'More treatments and orders ahead...',
        3: 'The rush is building...',
        4: 'Tomorrow the line moves faster...',
      };
      this.add.text(512, 420, previews[this.day] || '', {
        fontSize: '16px', color: '#ff8888', fontFamily: 'Arial', fontStyle: 'italic',
      }).setOrigin(0.5);

      // Next day button
      const btn = this.add.graphics();
      btn.fillStyle(0x1a3a4a, 1);
      btn.fillRoundedRect(387, 478, 250, 64, 12);
      btn.lineStyle(3, NEON_CYAN, 1);
      btn.strokeRoundedRect(387, 478, 250, 64, 12);

      const btnHit = this.add.rectangle(512, 510, 250, 64)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(512, 510, 'NEXT DAY', {
        fontSize: '26px', color: '#00ffff', fontFamily: 'Bungee, Arial',
      }).setOrigin(0.5);

      btnHit.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(0x2a4a5a, 1);
        btn.fillRoundedRect(387, 478, 250, 64, 12);
        btn.lineStyle(3, 0x44ffff, 1);
        btn.strokeRoundedRect(387, 478, 250, 64, 12);
        btnText.setColor('#44ffff');
      });
      btnHit.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(0x1a3a4a, 1);
        btn.fillRoundedRect(387, 478, 250, 64, 12);
        btn.lineStyle(3, NEON_CYAN, 1);
        btn.strokeRoundedRect(387, 478, 250, 64, 12);
        btnText.setColor('#00ffff');
      });
      btnHit.on('pointerdown', () => {
        soundManager.ding();
        this.scene.start('SystemMap', { returnFromShift: true, shiftEarnings: this.dayScore });
      });
    } else {
      // Continue button for day 5
      const btn = this.add.graphics();
      btn.fillStyle(0x1a3a4a, 1);
      btn.fillRoundedRect(387, 478, 250, 64, 12);
      btn.lineStyle(3, NEON_CYAN, 1);
      btn.strokeRoundedRect(387, 478, 250, 64, 12);

      const btnHit = this.add.rectangle(512, 510, 250, 64)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(512, 510, 'CONTINUE', {
        fontSize: '26px', color: '#00ffff', fontFamily: 'Bungee, Arial',
      }).setOrigin(0.5);

      btnHit.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(0x2a4a5a, 1);
        btn.fillRoundedRect(387, 478, 250, 64, 12);
        btn.lineStyle(3, 0x44ffff, 1);
        btn.strokeRoundedRect(387, 478, 250, 64, 12);
        btnText.setColor('#44ffff');
      });
      btnHit.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(0x1a3a4a, 1);
        btn.fillRoundedRect(387, 478, 250, 64, 12);
        btn.lineStyle(3, NEON_CYAN, 1);
        btn.strokeRoundedRect(387, 478, 250, 64, 12);
        btnText.setColor('#00ffff');
      });
      btnHit.on('pointerdown', () => {
        soundManager.ding();
        this.scene.start('SystemMap', { returnFromShift: true, shiftEarnings: this.dayScore });
      });
    }
  }
}
