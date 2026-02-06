export class WarningSystem {
  constructor(scene) {
    this.scene = scene;
    this.warningGraphics = {};
  }

  update() {
    const finishX = this.scene.finishLineX;
    const warningZone = finishX + 200;

    for (const tray of this.scene.trays) {
      if (tray.done || tray.completed || tray.passedFinish) {
        this.removeWarning(tray.orderNum);
        continue;
      }

      const x = tray.container.x;
      if (x < warningZone && x > finishX) {
        const urgency = 1 - (x - finishX) / (warningZone - finishX);
        this.showWarning(tray, urgency);
      } else {
        this.removeWarning(tray.orderNum);
      }
    }
  }

  showWarning(tray, urgency) {
    const id = tray.orderNum;

    if (!this.warningGraphics[id]) {
      const g = this.scene.add.graphics().setDepth(15);
      this.warningGraphics[id] = { graphics: g, text: null };

      const txt = this.scene.add.text(0, 0, '!', {
        fontSize: '28px', color: '#ff4444', fontFamily: 'Bungee, Arial',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(16);
      this.warningGraphics[id].text = txt;
    }

    const warn = this.warningGraphics[id];
    const g = warn.graphics;
    g.clear();

    // Pulsing red border around tray
    const hw = tray.isFooter ? 105 : 72;
    const pulseAlpha = 0.15 + Math.sin(Date.now() * 0.008) * 0.1;
    const borderAlpha = (0.3 + urgency * 0.5) * (0.7 + Math.sin(Date.now() * 0.01) * 0.3);

    g.fillStyle(0xff0000, pulseAlpha * urgency);
    g.fillRoundedRect(tray.container.x - hw, 270, hw * 2, 155, 8);
    g.lineStyle(3, 0xff4444, borderAlpha);
    g.strokeRoundedRect(tray.container.x - hw, 270, hw * 2, 155, 8);

    // Position warning exclamation
    warn.text.setPosition(tray.container.x, 260);
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
