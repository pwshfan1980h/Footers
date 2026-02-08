import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK, HULL_DARK, NEON_CYAN } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { createButton } from '../utils/uiHelpers.js';

// Score-based performance ratings (checked in descending order)
const RATINGS = [
  { min: 5000, label: 'Legendary Station Chef', color: '#ffd700' },
  { min: 3500, label: 'Master Food Technician', color: '#ff44aa' },
  { min: 2000, label: 'Seasoned Space Cook',    color: '#00ffcc' },
  { min: 1000, label: 'Orbital Apprentice',     color: '#88ddff' },
  { min: 0,    label: 'Adequate Worker',         color: '#aaddff' },
];

export class WinScene extends Phaser.Scene {
  constructor() {
    super('Win');
  }

  init(data) {
    this.totalScore = data.totalScore || 0;
  }

  create() {
    soundManager.init();
    soundManager.fanfare();

    // Apply CRT shader (WebGL only)
    if (this.renderer.pipelines) {
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) this.cameras.main.setPostPipeline(CRTPostFX);
    }

    // Background
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK);

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

    // Rating (find first matching tier)
    const tier = RATINGS.find(r => this.totalScore >= r.min) || RATINGS[RATINGS.length - 1];

    this.add.text(HALF_WIDTH, 405, `Rating: ${tier.label}`, {
      fontSize: '26px', color: tier.color, fontFamily: 'Arial', fontStyle: 'italic',
    }).setOrigin(0.5);

    // Play again button
    createButton(this, 382, 468, 260, 64, 'PLAY AGAIN', {
      accentColor: NEON_CYAN,
      onClick: () => this.scene.start('SystemMap'),
    });
  }
}
