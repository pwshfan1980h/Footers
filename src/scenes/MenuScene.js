import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // --- Warm diner background ---
    this.add.rectangle(512, 384, 1024, 768, 0x1C1008);

    // Subtle radial warm glow behind title area
    const glow = this.add.graphics();
    glow.fillStyle(0x442200, 0.3);
    glow.fillEllipse(512, 200, 700, 400);
    glow.fillStyle(0x663300, 0.15);
    glow.fillEllipse(512, 200, 450, 280);

    // --- Decorative top stripe (diner awning feel) ---
    const stripeColors = [0xCC3333, 0xFFFFFF];
    for (let i = 0; i < 32; i++) {
      const sx = i * 34;
      this.add.rectangle(sx + 17, 18, 34, 36, stripeColors[i % 2]).setAlpha(0.12);
    }
    this.add.rectangle(512, 36, 1024, 2, 0x883322).setAlpha(0.4);

    // --- Service bell icon ---
    const bell = this.add.graphics();
    bell.fillStyle(0xDAA520, 1);
    // Bell dome
    bell.beginPath();
    bell.moveTo(480, 95);
    bell.lineTo(484, 72);
    bell.lineTo(496, 60);
    bell.lineTo(512, 56);
    bell.lineTo(528, 60);
    bell.lineTo(540, 72);
    bell.lineTo(544, 95);
    bell.closePath();
    bell.fillPath();
    // Bell base
    bell.fillStyle(0xB8860B, 1);
    bell.fillRoundedRect(472, 93, 80, 10, 3);
    // Bell button on top
    bell.fillStyle(0xFFD700, 1);
    bell.fillCircle(512, 54, 5);
    // Highlight
    bell.fillStyle(0xFFE866, 0.4);
    bell.fillEllipse(500, 74, 20, 16);

    // --- Main title: ORDER UP! ---
    const titleShadow = this.add.text(514, 137, 'ORDER UP!', {
      fontSize: '78px', color: '#000000', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.3);

    const title = this.add.text(512, 135, 'ORDER UP!', {
      fontSize: '78px', color: '#FF6B35', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Warm glow on title text
    const titleGlow = this.add.text(512, 135, 'ORDER UP!', {
      fontSize: '78px', color: '#FFD700', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Pulsing glow on title
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Subtitle ---
    this.add.text(512, 210, 'A Sandwich Shop Scramble', {
      fontSize: '22px', color: '#D4A76A', fontFamily: 'Georgia, serif', fontStyle: 'italic',
    }).setOrigin(0.5);

    // --- Decorative divider ---
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x885522, 0.5);
    divider.lineBetween(320, 245, 704, 245);
    divider.fillStyle(0xDAA520, 0.8);
    divider.fillCircle(512, 245, 3);
    divider.fillCircle(340, 245, 2);
    divider.fillCircle(684, 245, 2);

    // --- Instructions on ticket-style card ---
    const card = this.add.graphics();
    card.fillStyle(0xFFFDD0, 0.08);
    card.fillRoundedRect(270, 265, 484, 150, 8);
    card.lineStyle(1, 0x665533, 0.2);
    card.strokeRoundedRect(270, 265, 484, 150, 8);

    const lines = [
      'Click ingredients from the bins, then click trays to place.',
      'Match each order ticket before the tray slides away!',
      '',
      'Survive 5 days (Mon\u2013Fri) to become Employee of the Week.',
      '3 missed orders in a day = YOU\'RE FIRED!',
    ];
    this.add.text(512, 340, lines.join('\n'), {
      fontSize: '14px', color: '#AA9977', fontFamily: 'Arial',
      align: 'center', lineSpacing: 7,
    }).setOrigin(0.5);

    // --- Start button ---
    const btnW = 260;
    const btnH = 64;
    const btnX = 512;
    const btnY = 490;

    const btnShadow = this.add.graphics();
    btnShadow.fillStyle(0x000000, 0.3);
    btnShadow.fillRoundedRect(btnX - btnW / 2 + 2, btnY - btnH / 2 + 3, btnW, btnH, 10);

    const btn = this.add.graphics();
    btn.fillStyle(0xCC3333, 1);
    btn.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    btn.lineStyle(2, 0xFF5544, 0.6);
    btn.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

    const btnHitArea = this.add.rectangle(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);

    const btnText = this.add.text(btnX, btnY, 'START SHIFT', {
      fontSize: '28px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Button hover/press effects
    const btnHighlight = this.add.graphics().setAlpha(0);
    btnHighlight.fillStyle(0xFFFFFF, 0.12);
    btnHighlight.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

    btnHitArea.on('pointerover', () => {
      btnHighlight.setAlpha(1);
      btnText.setScale(1.03);
    });
    btnHitArea.on('pointerout', () => {
      btnHighlight.setAlpha(0);
      btnText.setScale(1);
    });
    btnHitArea.on('pointerdown', () => {
      soundManager.init();
      soundManager.ding();
      this.scene.start('Game', { day: 1, totalScore: 0 });
    });

    // --- Keyboard hint ---
    this.add.text(512, 545, 'Hold SPACE during gameplay to speed up the belt', {
      fontSize: '12px', color: '#665544', fontFamily: 'Arial', fontStyle: 'italic',
    }).setOrigin(0.5);

    // --- Bottom diner decor ---
    const bottomStripe = this.add.graphics();
    bottomStripe.fillStyle(0x331A0A, 1);
    bottomStripe.fillRect(0, 700, 1024, 68);
    bottomStripe.lineStyle(2, 0x553322, 0.4);
    bottomStripe.lineBetween(0, 700, 1024, 700);

    // Checkered floor pattern (subtle)
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 2; j++) {
        const tileColor = (i + j) % 2 === 0 ? 0x2A1A0E : 0x221508;
        this.add.rectangle(i * 34 + 17, 718 + j * 34, 34, 34, tileColor).setAlpha(0.6);
      }
    }

    // --- Version ---
    this.add.text(512, 748, 'v0.2', {
      fontSize: '11px', color: '#443322', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
