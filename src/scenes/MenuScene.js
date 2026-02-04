import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // === SPACE COLOR PALETTE ===
    this.SPACE_BLACK = 0x0a0a12;
    this.SPACE_DEEP = 0x050510;
    this.HULL_DARK = 0x1a1a25;
    this.HULL_MID = 0x2a2a38;
    this.HULL_LIGHT = 0x3a3a4a;
    this.NEON_CYAN = 0x00ddff;
    this.NEON_MAGENTA = 0xff44aa;
    this.WINDOW_GLOW = 0xffdd88;

    // --- Deep space background ---
    this.add.rectangle(512, 384, 1024, 768, this.SPACE_BLACK);

    // --- Starfield ---
    this.createStarfield();

    // --- Nebula wisps ---
    this.createNebula();

    // --- Station ring visualization ---
    this.createStationRing();

    // --- Title: GYRO STATION ---
    this.createTitle();

    // --- Instructions panel ---
    this.createInstructions();

    // --- Start button ---
    this.createStartButton();

    // --- Keyboard hint ---
    this.add.text(512, 545, 'Hold SPACE during gameplay to speed up the belt', {
      fontSize: '12px', color: '#6688aa', fontFamily: 'Arial', fontStyle: 'italic',
    }).setOrigin(0.5);

    // --- Wall decor (signs) ---
    this.createWallDecor();

    // --- Bottom panel ---
    this.createBottomPanel();

    // --- Version ---
    this.add.text(512, 748, 'v0.3', {
      fontSize: '11px', color: '#334455', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  createStarfield() {
    const g = this.add.graphics();

    // Star data - scattered across the screen
    const stars = [
      // Bright stars
      { x: 50, y: 60, size: 2.5, alpha: 1 },
      { x: 180, y: 120, size: 2, alpha: 0.9 },
      { x: 320, y: 45, size: 2.5, alpha: 1 },
      { x: 480, y: 150, size: 2, alpha: 0.85 },
      { x: 620, y: 80, size: 3, alpha: 1 },
      { x: 750, y: 130, size: 2, alpha: 0.9 },
      { x: 890, y: 55, size: 2.5, alpha: 1 },
      { x: 970, y: 100, size: 2, alpha: 0.85 },
      { x: 100, y: 200, size: 2, alpha: 0.9 },
      { x: 400, y: 180, size: 2.5, alpha: 1 },
      { x: 700, y: 200, size: 2, alpha: 0.85 },
      { x: 850, y: 170, size: 2, alpha: 0.9 },
      // Medium stars
      { x: 130, y: 90, size: 1.5, alpha: 0.7 },
      { x: 250, y: 160, size: 1.5, alpha: 0.75 },
      { x: 380, y: 100, size: 1.5, alpha: 0.7 },
      { x: 550, y: 70, size: 1.5, alpha: 0.8 },
      { x: 680, y: 140, size: 1.5, alpha: 0.7 },
      { x: 820, y: 90, size: 1.5, alpha: 0.75 },
      { x: 950, y: 160, size: 1.5, alpha: 0.7 },
      // Small dim stars
      { x: 70, y: 140, size: 1, alpha: 0.5 },
      { x: 160, y: 40, size: 1, alpha: 0.4 },
      { x: 230, y: 110, size: 1, alpha: 0.5 },
      { x: 300, y: 180, size: 1, alpha: 0.45 },
      { x: 360, y: 30, size: 1, alpha: 0.5 },
      { x: 430, y: 130, size: 1, alpha: 0.4 },
      { x: 510, y: 50, size: 1, alpha: 0.5 },
      { x: 590, y: 170, size: 1, alpha: 0.45 },
      { x: 660, y: 40, size: 1, alpha: 0.5 },
      { x: 730, y: 180, size: 1, alpha: 0.4 },
      { x: 800, y: 60, size: 1, alpha: 0.5 },
      { x: 870, y: 130, size: 1, alpha: 0.45 },
      { x: 940, y: 80, size: 1, alpha: 0.5 },
      { x: 990, y: 140, size: 1, alpha: 0.4 },
      // Additional stars for density
      { x: 45, y: 180, size: 1, alpha: 0.35 },
      { x: 195, y: 195, size: 1.2, alpha: 0.5 },
      { x: 275, y: 75, size: 1, alpha: 0.4 },
      { x: 445, y: 95, size: 1.2, alpha: 0.45 },
      { x: 575, y: 115, size: 1, alpha: 0.4 },
      { x: 765, y: 45, size: 1, alpha: 0.35 },
      { x: 915, y: 185, size: 1.2, alpha: 0.5 },
    ];

    stars.forEach(star => {
      // Mix of white and blue-tinted stars
      const color = Math.random() > 0.7 ? 0xaaddff : 0xffffff;
      g.fillStyle(color, star.alpha);
      g.fillCircle(star.x, star.y, star.size);
    });

    // Twinkling animation for a few bright stars
    this.tweens.add({
      targets: g,
      alpha: 0.7,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createNebula() {
    const g = this.add.graphics();

    // Purple/blue nebula wisps at low alpha
    g.fillStyle(0x442266, 0.12);
    g.fillEllipse(200, 150, 400, 200);

    g.fillStyle(0x224466, 0.1);
    g.fillEllipse(700, 120, 500, 180);

    g.fillStyle(0x663366, 0.08);
    g.fillEllipse(500, 180, 350, 150);

    g.fillStyle(0x334488, 0.06);
    g.fillEllipse(150, 100, 300, 120);

    g.fillStyle(0x553377, 0.07);
    g.fillEllipse(850, 160, 280, 140);
  }

  createStationRing() {
    const g = this.add.graphics();
    const centerX = 512;
    const centerY = 320;

    // Outer ring structure (isometric donut shape)
    // Bottom arc shadow
    g.fillStyle(0x111118, 0.8);
    g.fillEllipse(centerX, centerY + 20, 600, 140);

    // Main ring body
    g.fillStyle(this.HULL_MID, 1);
    g.fillEllipse(centerX, centerY, 580, 130);

    // Inner darker area (the hole)
    g.fillStyle(this.SPACE_DEEP, 1);
    g.fillEllipse(centerX, centerY, 400, 90);

    // Ring surface highlight
    g.fillStyle(this.HULL_LIGHT, 0.6);
    g.fillEllipse(centerX, centerY - 15, 560, 100);

    // Panel lines on ring
    g.lineStyle(1, 0x15151f, 0.7);
    for (let angle = 0; angle < 360; angle += 20) {
      const rad = angle * Math.PI / 180;
      const innerX = centerX + Math.cos(rad) * 200;
      const innerY = centerY + Math.sin(rad) * 45;
      const outerX = centerX + Math.cos(rad) * 285;
      const outerY = centerY + Math.sin(rad) * 63;
      g.lineBetween(innerX, innerY, outerX, outerY);
    }

    // Illuminated windows on the ring (warm glow)
    const windowPositions = [
      { angle: -160, glow: true },
      { angle: -130, glow: true },
      { angle: -100, glow: false },
      { angle: -70, glow: true },
      { angle: -40, glow: true },
      { angle: -10, glow: false },
      { angle: 20, glow: true },
      { angle: 50, glow: true },
      { angle: 80, glow: false },
      { angle: 110, glow: true },
      { angle: 140, glow: true },
      { angle: 170, glow: false },
    ];

    windowPositions.forEach(win => {
      const rad = win.angle * Math.PI / 180;
      const wx = centerX + Math.cos(rad) * 242;
      const wy = centerY + Math.sin(rad) * 54;

      if (win.glow) {
        // Warm window glow
        g.fillStyle(this.WINDOW_GLOW, 0.8);
        g.fillRect(wx - 12, wy - 4, 24, 8);
        // Glow effect
        g.fillStyle(this.WINDOW_GLOW, 0.3);
        g.fillRect(wx - 14, wy - 6, 28, 12);
      } else {
        // Dark window
        g.fillStyle(0x222233, 0.9);
        g.fillRect(wx - 12, wy - 4, 24, 8);
      }
    });

    // Docking port indicators (neon accents)
    g.fillStyle(this.NEON_CYAN, 0.8);
    g.fillCircle(centerX - 250, centerY + 10, 4);
    g.fillCircle(centerX + 250, centerY + 10, 4);
    g.fillCircle(centerX, centerY - 60, 4);

    // Ring edge highlight
    g.lineStyle(2, this.HULL_LIGHT, 0.4);
    g.strokeEllipse(centerX, centerY, 582, 132);
  }

  createTitle() {
    // Title shadow
    this.add.text(514, 422, 'GYRO STATION', {
      fontSize: '68px', color: '#000000', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5).setAlpha(0.4);

    // Main title
    const title = this.add.text(512, 420, 'GYRO STATION', {
      fontSize: '68px', color: '#00ffcc', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5);

    // Title glow effect
    const titleGlow = this.add.text(512, 420, 'GYRO STATION', {
      fontSize: '68px', color: '#00ddff', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5).setAlpha(0);

    // Pulsing glow on title
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.35,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(512, 485, 'A Space Food Court', {
      fontSize: '20px', color: '#6688aa', fontFamily: 'Georgia, serif', fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  createInstructions() {
    // Instruction panel with subtle border
    const g = this.add.graphics();
    g.fillStyle(this.HULL_DARK, 0.7);
    g.fillRoundedRect(270, 510, 484, 85, 8);
    g.lineStyle(1, this.NEON_CYAN, 0.3);
    g.strokeRoundedRect(270, 510, 484, 85, 8);

    const lines = [
      'Click ingredients from the bins, then click trays to place.',
      'Match each order ticket before the tray slides away!',
      'Survive 5 days (Mon–Fri) to become Employee of the Week.'
    ];
    this.add.text(512, 552, lines.join('\n'), {
      fontSize: '13px', color: '#8899aa', fontFamily: 'Arial',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
  }

  createStartButton() {
    const btnW = 260;
    const btnH = 64;
    const btnX = 512;
    const btnY = 650;

    // Button shadow
    const btnShadow = this.add.graphics();
    btnShadow.fillStyle(0x000000, 0.4);
    btnShadow.fillRoundedRect(btnX - btnW / 2 + 3, btnY - btnH / 2 + 4, btnW, btnH, 12);

    // Button background
    const btn = this.add.graphics();
    btn.fillStyle(0x1a3a4a, 1);
    btn.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    btn.lineStyle(3, this.NEON_CYAN, 1);
    btn.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    // Inner glow
    btn.lineStyle(1, this.NEON_CYAN, 0.3);
    btn.strokeRoundedRect(btnX - btnW / 2 + 4, btnY - btnH / 2 + 4, btnW - 8, btnH - 8, 10);

    const btnHitArea = this.add.rectangle(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);

    const btnText = this.add.text(btnX, btnY, 'START SHIFT', {
      fontSize: '28px', color: '#00ffff', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5);

    // Highlight for hover
    const btnHighlight = this.add.graphics().setAlpha(0);
    btnHighlight.fillStyle(this.NEON_CYAN, 0.15);
    btnHighlight.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    btnHitArea.on('pointerover', () => {
      btnHighlight.setAlpha(1);
      btnText.setScale(1.03);
      btnText.setColor('#44ffff');
    });
    btnHitArea.on('pointerout', () => {
      btnHighlight.setAlpha(0);
      btnText.setScale(1);
      btnText.setColor('#00ffff');
    });
    btnHitArea.on('pointerdown', () => {
      soundManager.init();
      soundManager.ding();
      this.scene.start('Game', { day: 1, totalScore: 0 });
    });

    // Subtle pulse animation
    this.tweens.add({
      targets: btnText,
      scale: 1.02,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createWallDecor() {
    // Gyro Station logo — left side
    const signLogo = this.add.image(90, 350, 'sign_gyro_station');
    signLogo.setScale(0.55);
    signLogo.setAngle(-5);
    signLogo.setAlpha(0.8);

    // 86 list (holographic) — right side
    const sign86 = this.add.image(935, 350, 'sign_86_space');
    sign86.setScale(1.4);
    sign86.setAngle(3);
    sign86.setAlpha(0.8);
  }

  createBottomPanel() {
    const g = this.add.graphics();

    // Dark metallic bottom panel
    g.fillStyle(this.HULL_DARK, 1);
    g.fillRect(0, 700, 1024, 68);

    // Neon accent line
    g.fillStyle(this.NEON_CYAN, 0.4);
    g.fillRect(0, 700, 1024, 2);

    // Metallic floor grating pattern
    g.lineStyle(1, 0x15151f, 0.5);
    for (let x = 32; x < 1024; x += 32) {
      g.lineBetween(x, 702, x, 768);
    }
    for (let y = 720; y < 768; y += 18) {
      g.lineBetween(0, y, 1024, y);
    }
  }
}
