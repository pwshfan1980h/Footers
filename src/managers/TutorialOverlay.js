import { soundManager } from '../SoundManager.js';

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

    const backdrop = this.scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.7);
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
          'DRAG ingredients from the bins below.',
          'DROP them onto the matching tray on the belt.',
          'Ingredients must go in ticket order!',
        ],
        icon: '\u{1F96A}',
      },
      {
        title: 'Watch the Belt!',
        lines: [
          'Trays move left \u2014 finish before they pass the line!',
          'SPACE speeds up the belt, SHIFT slows it.',
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

    const title = this.scene.add.text(512, y, s.title, {
      fontSize: '36px', color: '#00ddff', fontFamily: 'Bungee, Arial',
      stroke: '#003344', strokeThickness: 3,
    }).setOrigin(0.5);
    title.setData('tutStep', true);
    overlay.add(title);

    s.lines.forEach((line, i) => {
      const txt = this.scene.add.text(512, y + 55 + i * 36, line, {
        fontSize: '20px', color: '#ddeeff', fontFamily: 'Arial',
      }).setOrigin(0.5);
      txt.setData('tutStep', true);
      overlay.add(txt);
    });

    const pageNum = `${this.step + 1} / ${this.steps.length}`;
    const page = this.scene.add.text(512, y + 200, pageNum, {
      fontSize: '14px', color: '#668899', fontFamily: 'Arial',
    }).setOrigin(0.5);
    page.setData('tutStep', true);
    overlay.add(page);

    const prompt = this.scene.add.text(512, y + 230, 'click to continue', {
      fontSize: '16px', color: '#88aacc', fontFamily: 'Arial', fontStyle: 'italic',
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
        this.scene.onTutorialDismissed();
      }
    });
  }
}
