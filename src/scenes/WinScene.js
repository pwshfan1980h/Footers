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
    soundManager.fanfare();
    this.add.rectangle(512, 384, 1024, 768, 0x0a1a2e);

    this.add.text(512, 100, 'EMPLOYEE OF', {
      fontSize: '40px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(512, 155, 'THE WEEK!', {
      fontSize: '56px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(512, 250, 'You survived the whole week!', {
      fontSize: '22px', color: '#aaaacc', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(512, 320, `Final Score: ${this.totalScore}`, {
      fontSize: '36px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Rating
    let rating = 'Adequate';
    if (this.totalScore >= 5000) rating = 'Legendary Sandwich Artist';
    else if (this.totalScore >= 3500) rating = 'Master Sub Slinger';
    else if (this.totalScore >= 2000) rating = 'Seasoned Pro';
    else if (this.totalScore >= 1000) rating = 'Getting There';

    this.add.text(512, 385, `Rating: ${rating}`, {
      fontSize: '26px', color: '#88ccff', fontFamily: 'Arial', fontStyle: 'italic',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(512, 500, 260, 64, 0x4a9e4a)
      .setInteractive({ useHandCursor: true });
    this.add.text(512, 500, 'PLAY AGAIN', {
      fontSize: '26px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x5cb85c));
    btn.on('pointerout', () => btn.setFillStyle(0x4a9e4a));
    btn.on('pointerdown', () => {
      this.scene.start('Menu');
    });
  }
}
