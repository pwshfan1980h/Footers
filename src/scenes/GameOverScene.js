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
    soundManager.fired();
    this.add.rectangle(512, 384, 1024, 768, 0x2a0a0a);

    this.add.text(512, 130, "YOU'RE FIRED!", {
      fontSize: '68px', color: '#ff2222', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    this.add.text(512, 230, 'Too many orders missed!', {
      fontSize: '24px', color: '#ffaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.add.text(512, 300, `Lasted until: ${dayNames[this.day]}`, {
      fontSize: '20px', color: '#ccc', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 350, `Final score: ${this.finalScore}`, {
      fontSize: '28px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(512, 480, 260, 64, 0x993333)
      .setInteractive({ useHandCursor: true });
    this.add.text(512, 480, 'TRY AGAIN', {
      fontSize: '26px', color: '#fff', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xbb4444));
    btn.on('pointerout', () => btn.setFillStyle(0x993333));
    btn.on('pointerdown', () => {
      this.scene.start('Menu');
    });
  }
}
