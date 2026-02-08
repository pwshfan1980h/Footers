import { GAME_FONT } from '../data/constants.js';

export class WarningSystem {
  constructor(scene) {
    this.scene = scene;
    this.warningGraphics = {};
    this.screenUrgency = 0;
  }

  update() {
    const customers = this.scene.customerVessels?.customers || [];

    // Track which orders are still active
    const activeIds = new Set();
    let maxUrgency = 0;

    for (const c of customers) {
      if (c.personState !== 'at_counter' || !c.tray || c.tray.done) continue;
      const id = c.tray.orderNum;
      activeIds.add(id);

      const ratio = c.patienceMax > 0 ? c.patience / c.patienceMax : 1;
      if (ratio < 0.25) {
        const urgency = 1 - ratio * 4;
        this.showWarning(c.tray, urgency);
        if (urgency > maxUrgency) maxUrgency = urgency;
      } else {
        this.removeWarning(id);
      }
    }

    this.screenUrgency = maxUrgency;

    // Clean up warnings for departed customers
    for (const id of Object.keys(this.warningGraphics)) {
      if (!activeIds.has(Number(id))) {
        this.removeWarning(id);
      }
    }
  }

  showWarning(tray, urgency) {
    const id = tray.orderNum;

    if (!this.warningGraphics[id]) {
      const g = this.scene.add.graphics().setDepth(15);
      this.warningGraphics[id] = { graphics: g, text: null };

      const txt = this.scene.add.text(0, 0, '!', {
        fontSize: '28px', color: '#ff4444', fontFamily: GAME_FONT,
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(16);
      this.warningGraphics[id].text = txt;
    }

    const warn = this.warningGraphics[id];
    const g = warn.graphics;
    g.clear();

    const hw = 72;
    const pulseAlpha = 0.15 + Math.sin(Date.now() * 0.008) * 0.1;
    const borderAlpha = (0.3 + urgency * 0.5) * (0.7 + Math.sin(Date.now() * 0.01) * 0.3);

    g.fillStyle(0xff0000, pulseAlpha * urgency);
    g.fillRoundedRect(tray.container.x - hw, tray.container.y - 60, hw * 2, 120, 8);
    g.lineStyle(3, 0xff4444, borderAlpha);
    g.strokeRoundedRect(tray.container.x - hw, tray.container.y - 60, hw * 2, 120, 8);

    warn.text.setPosition(tray.container.x, tray.container.y - 70);
    warn.text.setAlpha(0.6 + urgency * 0.4);
    const scale = 0.8 + Math.sin(Date.now() * 0.01) * 0.15;
    warn.text.setScale(scale);
  }

  removeWarning(id) {
    if (this.warningGraphics[id]) {
      this.warningGraphics[id].graphics.destroy();
      if (this.warningGraphics[id].text) this.warningGraphics[id].text.destroy();
      delete this.warningGraphics[id];
    }
  }

  cleanup() {
    for (const id of Object.keys(this.warningGraphics)) {
      this.removeWarning(id);
    }
  }
}
