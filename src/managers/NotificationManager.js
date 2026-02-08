import { GAME_FONT } from '../data/constants.js';

/**
 * NotificationManager — top-of-screen notification queue.
 * Replaces speech bubbles; also available for encounters, tutorials, campaign.
 */
export class NotificationManager {
  constructor(scene) {
    this.scene = scene;
    this.notifications = [];
    this.maxVisible = 3;
    this.baseY = 55;
    this.spacing = 50;
    this.width = 400;
    this.centerX = 512;
    this.depth = 90;
  }

  create() {
    // nothing needed at init
  }

  /**
   * Show a notification at the top of the screen.
   * @param {string} text
   * @param {object} [options]
   * @param {number} [options.borderColor=0x6688cc]
   * @param {number} [options.duration=4000]
   */
  show(text, options = {}) {
    const { borderColor = 0x6688cc, duration = 4000 } = options;
    const s = this.scene;

    // Dismiss oldest if at max
    if (this.notifications.length >= this.maxVisible) {
      this.dismiss(this.notifications[0]);
    }

    // Shift existing notifications down
    const targetIndex = this.notifications.length;
    const targetY = this.baseY + targetIndex * this.spacing;

    const container = s.add.container(this.centerX, targetY - 30).setDepth(this.depth);

    // Measure text to size the panel
    const txt = s.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: GAME_FONT,
      wordWrap: { width: this.width - 24 },
      align: 'center',
    }).setOrigin(0.5);

    const padX = 16;
    const padY = 10;
    const panelW = Math.max(this.width, txt.width + padX * 2);
    const panelH = txt.height + padY * 2;

    const bg = s.add.graphics();
    bg.fillStyle(0x1a1a30, 0.88);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
    bg.lineStyle(1.5, borderColor, 0.7);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);

    container.add(bg);
    container.add(txt);

    // Make clickable to dismiss
    const hitArea = s.add.rectangle(0, 0, panelW, panelH)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);
    container.add(hitArea);

    const notification = {
      container,
      targetY,
      timer: null,
    };

    hitArea.on('pointerdown', () => {
      this.dismiss(notification);
    });

    this.notifications.push(notification);

    // Slide in from above
    container.setAlpha(0);
    s.tweens.add({
      targets: container,
      y: targetY,
      alpha: 1,
      duration: 250,
      ease: 'Sine.easeOut',
    });

    // Auto-dismiss after duration
    notification.timer = s.time.delayedCall(duration, () => {
      this.dismiss(notification);
    });
  }

  dismiss(notification) {
    if (!notification) return;

    const idx = this.notifications.indexOf(notification);
    if (idx === -1) return;

    this.notifications.splice(idx, 1);

    // Cancel auto-dismiss timer
    if (notification.timer) {
      notification.timer.remove(false);
      notification.timer = null;
    }

    const s = this.scene;
    const container = notification.container;

    if (!container || !container.scene) return;

    // Fade out
    s.tweens.add({
      targets: container,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (container && container.scene) container.destroy();
      },
    });

    // Reposition remaining notifications upward
    this.notifications.forEach((n, i) => {
      n.targetY = this.baseY + i * this.spacing;
      if (n.container && n.container.scene) {
        s.tweens.add({
          targets: n.container,
          y: n.targetY,
          duration: 200,
          ease: 'Sine.easeOut',
        });
      }
    });
  }

  destroy() {
    for (const n of this.notifications) {
      if (n.timer) n.timer.remove(false);
      if (n.container && n.container.scene) n.container.destroy();
    }
    this.notifications = [];
  }
}
