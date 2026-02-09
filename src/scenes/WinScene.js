import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK, HULL_DARK, NEON_CYAN, GAME_FONT } from '../data/constants.js';
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

    // Apply post-processing shaders (WebGL only)
    if (this.renderer.pipelines) {
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) this.cameras.main.setPostPipeline(CRTPostFX);
    }

    // Background
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK);

    // Starfield
    const g = this.add.graphics();
    const stars = [
      { x: 94, y: 112, s: 2.5 }, { x: 375, y: 211, s: 2 }, { x: 750, y: 141, s: 2.5 },
      { x: 1125, y: 183, s: 2 }, { x: 1500, y: 98, s: 2.5 }, { x: 1781, y: 169, s: 2 },
      { x: 188, y: 351, s: 1.5 }, { x: 656, y: 422, s: 2 }, { x: 1031, y: 394, s: 1.5 },
      { x: 1406, y: 450, s: 2 }, { x: 1688, y: 366, s: 1.5 }, { x: 281, y: 633, s: 2 },
      { x: 563, y: 703, s: 1.5 }, { x: 938, y: 661, s: 2 }, { x: 1313, y: 717, s: 1.5 },
      { x: 1594, y: 675, s: 2 }, { x: 188, y: 844, s: 1.5 }, { x: 750, y: 914, s: 2 },
      { x: 1125, y: 872, s: 1.5 }, { x: 1594, y: 942, s: 2 }, { x: 1781, y: 773, s: 1.5 },
    ];
    stars.forEach(star => {
      const color = Math.random() > 0.5 ? 0xffffff : 0xaaddff;
      g.fillStyle(color, 0.8);
      g.fillCircle(star.x, star.y, star.s);
    });

    // Nebula glow behind title
    g.fillStyle(0x442266, 0.2);
    g.fillEllipse(HALF_WIDTH, 183, 938, 211);
    g.fillStyle(0x224466, 0.15);
    g.fillEllipse(HALF_WIDTH, 183, 750, 141);

    // Title
    this.add.text(HALF_WIDTH, 141, 'EMPLOYEE OF', {
      fontSize: '40px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 218, 'THE WEEK!', {
      fontSize: '56px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Title glow animation
    const titleGlow = this.add.text(HALF_WIDTH, 218, 'THE WEEK!', {
      fontSize: '56px', color: '#ffff00', fontFamily: GAME_FONT,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: titleGlow,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(HALF_WIDTH, 323, 'You survived the whole week at the station!', {
      fontSize: '22px', color: '#8899bb', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Score panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.8);
    panel.fillRoundedRect(HALF_WIDTH - 200, 380, 400, 141, 12);
    panel.lineStyle(2, NEON_CYAN, 0.6);
    panel.strokeRoundedRect(HALF_WIDTH - 200, 380, 400, 141, 12);

    this.add.text(HALF_WIDTH, 450, `Final Score: ${this.totalScore}`, {
      fontSize: '36px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Rating (find first matching tier)
    const tier = RATINGS.find(r => this.totalScore >= r.min) || RATINGS[RATINGS.length - 1];

    this.add.text(HALF_WIDTH, 569, `Rating: ${tier.label}`, {
      fontSize: '26px', color: tier.color, fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Play again button
    createButton(this, HALF_WIDTH - 130, 658, 260, 64, 'PLAY AGAIN', {
      accentColor: NEON_CYAN,
      onClick: () => this.scene.start('SystemMap'),
    });
  }
}
