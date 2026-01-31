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
    soundManager.fanfare();
    this.add.rectangle(512, 384, 1024, 768, 0x1a1a2e);

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    this.add.text(512, 100, 'SHIFT COMPLETE!', {
      fontSize: '52px', color: '#33ff33', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    this.add.text(512, 180, `${dayNames[this.day]} is done.`, {
      fontSize: '24px', color: '#aaa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 260, `Orders filled: ${this.ordersCompleted} / ${this.totalOrders}`, {
      fontSize: '22px', color: '#fff', fontFamily: 'Arial',
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

      const btn = this.add.rectangle(512, 510, 250, 64, 0x4a9e4a)
        .setInteractive({ useHandCursor: true });
      this.add.text(512, 510, 'NEXT DAY', {
        fontSize: '26px', color: '#fff', fontFamily: 'Bungee, Arial',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x5cb85c));
      btn.on('pointerout', () => btn.setFillStyle(0x4a9e4a));
      btn.on('pointerdown', () => {
        soundManager.ding();
        this.scene.start('Game', { day: this.day + 1, totalScore: this.totalScore });
      });
    } else {
      // Beat all 5 days! Show CONTINUE button so player can read stats
      const btn5 = this.add.rectangle(512, 510, 250, 64, 0x4a9e4a)
        .setInteractive({ useHandCursor: true });
      this.add.text(512, 510, 'CONTINUE', {
        fontSize: '26px', color: '#fff', fontFamily: 'Bungee, Arial',
      }).setOrigin(0.5);

      btn5.on('pointerover', () => btn5.setFillStyle(0x5cb85c));
      btn5.on('pointerout', () => btn5.setFillStyle(0x4a9e4a));
      btn5.on('pointerdown', () => {
        soundManager.ding();
        this.scene.start('Win', { totalScore: this.totalScore });
      });
    }
  }
}
