import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, DAY_NAMES, SPACE_BLACK, HULL_DARK, NEON_CYAN, GAME_FONT } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { createButton } from '../utils/uiHelpers.js';

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
      { x: 100, y: 100, s: 2 }, { x: 300, y: 150, s: 1.5 }, { x: 500, y: 80, s: 2 },
      { x: 700, y: 120, s: 1.5 }, { x: 900, y: 90, s: 2 }, { x: 150, y: 300, s: 1 },
      { x: 400, y: 400, s: 1.5 }, { x: 600, y: 350, s: 1 }, { x: 800, y: 450, s: 2 },
      { x: 200, y: 600, s: 1.5 }, { x: 450, y: 650, s: 1 }, { x: 750, y: 580, s: 2 },
    ];
    stars.forEach(star => {
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(star.x, star.y, star.s);
    });

    const dayNames = DAY_NAMES;

    // Title
    this.add.text(HALF_WIDTH, 100, 'SHIFT COMPLETE!', {
      fontSize: '52px', color: '#00ffcc', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 180, `${dayNames[this.day]} is done.`, {
      fontSize: '24px', color: '#8899aa', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Stats panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.8);
    panel.fillRoundedRect(312, 220, 400, 160, 12);
    panel.lineStyle(2, NEON_CYAN, 0.5);
    panel.strokeRoundedRect(312, 220, 400, 160, 12);

    this.add.text(HALF_WIDTH, 260, `Orders filled: ${this.ordersCompleted} / ${this.totalOrders}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 300, `Day score: +${this.dayScore}`, {
      fontSize: '22px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 350, `Total score: ${this.totalScore}`, {
      fontSize: '26px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    if (this.day < 5) {
      const previews = {
        1: 'Treatments unlocked tomorrow!',
        2: 'More treatments and orders ahead...',
        3: 'The rush is building...',
        4: 'Tomorrow the line moves faster...',
      };
      this.add.text(HALF_WIDTH, 420, previews[this.day] || '', {
        fontSize: '18px', color: '#ff8888', fontFamily: GAME_FONT,
      }).setOrigin(0.5);
    }

    // Action button (same for both paths -- only label differs)
    const label = this.day < 5 ? 'NEXT DAY' : 'CONTINUE';
    createButton(this, 387, 478, 250, 64, label, {
      accentColor: NEON_CYAN,
      onClick: () => {
        soundManager.ding();
        this.scene.start('SystemMap', { returnFromShift: true, shiftEarnings: this.dayScore });
      },
    });
  }
}
