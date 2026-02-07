/**
 * GameSceneBelt - Conveyor belt, finish line, isometric helpers
 */
export class GameSceneBelt {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const s = this.scene;
    s.beltGfx = s.add.graphics().setDepth(2);
    this.draw();
    this.createFinishLine();
  }

  draw() {
    const s = this.scene;
    const g = s.beltGfx;
    g.clear();

    const isoOff = 4;

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, 396, 1024, 5);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
    g.fillRect(0, 396, 1024, 2);
    g.fillStyle(s.CHROME_LIGHT, 1);
    g.beginPath();
    g.moveTo(0, 396);
    g.lineTo(isoOff, 396 - isoOff);
    g.lineTo(1024 + isoOff, 396 - isoOff);
    g.lineTo(1024, 396);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x3a3a42, 1);
    g.fillRect(0, 401, 1024, 26);
    let segIndex = 0;
    for (let x = s.beltOffset - 40; x < 1064; x += 40) {
      const tint = segIndex % 2 === 0 ? 0x3a3a42 : 0x424248;
      g.fillStyle(tint, 1);
      const sx = Math.max(0, x);
      const sw = Math.min(38, 1024 - sx);
      if (sw > 0) g.fillRect(sx, 401, sw, 26);
      g.lineStyle(1, 0x4a4a52, 0.3);
      g.strokeRect(x, 401, 38, 26);
      segIndex++;
    }

    g.fillStyle(s.CHROME_DARK, 1);
    g.fillRect(0, 427, 1024, 5);

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, 430, 1024, 4);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.4);
    g.fillRect(0, 430, 1024, 1);
  }

  createFinishLine() {
    const s = this.scene;
    const x = s.finishLineX;
    const g = s.add.graphics().setDepth(6);

    for (let y = 145; y < 435; y += 12) {
      g.fillStyle(0x00ff00, 0.5);
      g.fillRect(x - 1, y, 3, 8);
    }

    const s2 = 6;
    const iso = 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const isWhite = (row + col) % 2 === 0;
        const bx = x - 9 + col * s2;
        const by = 140 + row * s2;

        g.fillStyle(isWhite ? 0xffffff : 0x000000, 0.6);
        g.fillRect(bx, by, s2, s2);
        g.fillStyle(isWhite ? 0xeeeeee : 0x222222, 0.6);
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + iso, by - iso);
        g.lineTo(bx + s2 + iso, by - iso);
        g.lineTo(bx + s2, by);
        g.closePath();
        g.fillPath();
        g.fillStyle(isWhite ? 0xcccccc : 0x111111, 0.6);
        g.beginPath();
        g.moveTo(bx + s2, by);
        g.lineTo(bx + s2 + iso, by - iso);
        g.lineTo(bx + s2 + iso, by + s2 - iso);
        g.lineTo(bx + s2, by + s2);
        g.closePath();
        g.fillPath();
      }
    }
  }

  getIsoPosition(col, row, baseX, baseY, spacingX, spacingY) {
    const s = this.scene;
    const x = baseX + col * spacingX + row * spacingY * s.ISO_SKEW;
    const y = baseY + row * spacingY;
    return { x, y };
  }

  drawIsoSurface(g, x, y, w, h, skew, topColor, frontColor) {
    g.fillStyle(frontColor, 1);
    g.fillRect(x, y, w, h);

    g.fillStyle(topColor, 1);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + skew, y - skew * 0.6);
    g.lineTo(x + w + skew, y - skew * 0.6);
    g.lineTo(x + w, y);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, 0x606068, 0.5);
    g.lineBetween(x + w, y, x + w + skew, y - skew * 0.6);
  }

  drawItemShadow(g, x, y, radiusX, radiusY) {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(x, y, radiusX, radiusY);
  }
}
