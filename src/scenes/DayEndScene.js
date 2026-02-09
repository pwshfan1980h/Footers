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
      { x: 188, y: 141, s: 2 }, { x: 563, y: 211, s: 1.5 }, { x: 938, y: 112, s: 2 },
      { x: 1313, y: 169, s: 1.5 }, { x: 1688, y: 127, s: 2 }, { x: 281, y: 422, s: 1 },
      { x: 750, y: 562, s: 1.5 }, { x: 1125, y: 492, s: 1 }, { x: 1500, y: 633, s: 2 },
      { x: 375, y: 844, s: 1.5 }, { x: 844, y: 914, s: 1 }, { x: 1406, y: 815, s: 2 },
    ];
    stars.forEach(star => {
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(star.x, star.y, star.s);
    });

    const dayNames = DAY_NAMES;

    // Title
    this.add.text(HALF_WIDTH, 141, 'SHIFT COMPLETE!', {
      fontSize: '52px', color: '#00ffcc', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 253, `${dayNames[this.day]} is done.`, {
      fontSize: '24px', color: '#8899aa', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    // Stats panel
    const panel = this.add.graphics();
    panel.fillStyle(HULL_DARK, 0.8);
    panel.fillRoundedRect(HALF_WIDTH - 200, 309, 400, 225, 12);
    panel.lineStyle(2, NEON_CYAN, 0.5);
    panel.strokeRoundedRect(HALF_WIDTH - 200, 309, 400, 225, 12);

    this.add.text(HALF_WIDTH, 366, `Orders filled: ${this.ordersCompleted} / ${this.totalOrders}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 422, `Day score: +${this.dayScore}`, {
      fontSize: '22px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    this.add.text(HALF_WIDTH, 492, `Total score: ${this.totalScore}`, {
      fontSize: '26px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setOrigin(0.5);

    if (this.day < 5) {
      const previews = {
        1: 'Treatments unlocked tomorrow!',
        2: 'More treatments and orders ahead...',
        3: 'The rush is building...',
        4: 'Tomorrow the line moves faster...',
      };
      this.add.text(HALF_WIDTH, 590, previews[this.day] || '', {
        fontSize: '18px', color: '#ff8888', fontFamily: GAME_FONT,
      }).setOrigin(0.5);
    }

    // Action button (same for both paths -- only label differs)
    const label = this.day < 5 ? 'NEXT DAY' : 'CONTINUE';
    createButton(this, HALF_WIDTH - 125, 672, 250, 64, label, {
      accentColor: NEON_CYAN,
      onClick: () => {
        soundManager.ding();
        this.scene.start('SystemMap', { returnFromShift: true, shiftEarnings: this.dayScore });
      },
    });
  }
}
