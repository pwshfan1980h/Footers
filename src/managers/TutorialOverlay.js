import { soundManager } from '../SoundManager.js';
import { GAME_FONT, HALF_WIDTH, GAME_WIDTH, GAME_HEIGHT, HALF_HEIGHT } from '../data/constants.js';

export class TutorialOverlay {
  constructor(scene) {
    this.scene = scene;
    this.overlay = null;
    this.step = 0;
  }

  show(day) {
    if (day !== 1) return;

    const overlay = this.scene.add.container(0, 0).setDepth(250);
    this.overlay = overlay;

    const backdrop = this.scene.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    overlay.add(backdrop);

    const steps = [
      {
        title: 'Welcome to Footers!',
        lines: [
          'You run a sandwich station on a space deli.',
          'Orders come in on tickets at the top.',
          'Build each sandwich in the exact order shown.',
        ],
        icon: '\u{1F6F8}',
      },
      {
        title: 'How to Build',
        lines: [
          'CLICK an ingredient in the bins below to pick it up.',
          'CLICK the prep tray to place it on the sandwich.',
          'Ingredients must go in ticket order! ESC cancels.',
        ],
        icon: '\u{1F96A}',
      },
      {
        title: 'Watch the Clock!',
        lines: [
          'Customers lose patience \u2014 finish before they leave!',
          'Press F1 to see keyboard shortcuts.',
          '3 missed orders = Game Over. Good luck!',
        ],
        icon: '\u26A0',
      },
    ];

    this.steps = steps;
    this.step = 0;
    this.showStep(overlay);

    backdrop.setInteractive();
    backdrop.on('pointerdown', () => {
      soundManager.init();
      soundManager.plop();
      this.step++;
      if (this.step >= steps.length) {
        this.dismiss();
      } else {
        this.clearStepContent();
        this.showStep(overlay);
      }
    });
  }

  showStep(overlay) {
    const s = this.steps[this.step];
    const y = 260;

    const title = this.scene.add.text(HALF_WIDTH, y, s.title, {
      fontSize: '36px', color: '#00ddff', fontFamily: GAME_FONT,
      stroke: '#003344', strokeThickness: 3,
    }).setOrigin(0.5);
    title.setData('tutStep', true);
    overlay.add(title);

    s.lines.forEach((line, i) => {
      const txt = this.scene.add.text(HALF_WIDTH, y + 55 + i * 36, line, {
        fontSize: '20px', color: '#ddeeff', fontFamily: GAME_FONT,
      }).setOrigin(0.5);
      txt.setData('tutStep', true);
      overlay.add(txt);
    });

    const pageNum = `${this.step + 1} / ${this.steps.length}`;
    const page = this.scene.add.text(HALF_WIDTH, y + 200, pageNum, {
      fontSize: '14px', color: '#668899', fontFamily: GAME_FONT,
    }).setOrigin(0.5);
    page.setData('tutStep', true);
    overlay.add(page);

    const prompt = this.scene.add.text(HALF_WIDTH, y + 230, 'click to continue', {
      fontSize: '18px', color: '#88aacc', fontFamily: GAME_FONT,
    }).setOrigin(0.5).setAlpha(0.6);
    prompt.setData('tutStep', true);
    overlay.add(prompt);
    this.scene.tweens.add({ targets: prompt, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
  }

  clearStepContent() {
    if (!this.overlay) return;
    const toRemove = [];
    this.overlay.each(child => {
      if (child.getData && child.getData('tutStep')) toRemove.push(child);
    });
    toRemove.forEach(c => c.destroy());
  }

  dismiss() {
    if (!this.overlay) return;
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.overlay.destroy();
        this.overlay = null;
        if (typeof this.scene.onTutorialDismissed === 'function') {
          this.scene.onTutorialDismissed();
        }
      }
    });
  }
}
