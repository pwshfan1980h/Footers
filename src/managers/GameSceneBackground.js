/**
 * GameSceneBackground - Space station interior visuals: space, windows, metal surface, floor
 */
export class GameSceneBackground {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    this.createSpaceBackground();
    this.createSpaceWindows();
  }

  createMetalSurface() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(0);

    const surfaceY = 437;
    const surfaceH = 331;
    const surfaceW = 1024;

    g.fillStyle(0x6B3A2A, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    g.lineStyle(1, 0x7A4A3A, 0.15);
    for (let y = surfaceY + 3; y < surfaceY + surfaceH; y += 5) {
      g.lineBetween(0, y, surfaceW, y);
    }

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, surfaceY, surfaceW, 3);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, surfaceY, surfaceW, 1);

    g.fillStyle(0xC8A878, 0.3);
    g.fillRect(0, surfaceY + 3, surfaceW, 2);

    for (let i = 0; i < 8; i++) {
      const alpha = 0.025 * i;
      const yPos = surfaceY + surfaceH - 80 + i * 10;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, yPos, surfaceW, 10);
    }

    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + 12, 4);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + 11, 1.5);
    }

    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + surfaceH - 12, 4);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + surfaceH - 13, 1.5);
    }

    g.fillStyle(0xC8A878, 0.04);
    g.fillRect(200, surfaceY + 60, 624, 200);
  }

  createFloor() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(1);
    const floorY = s.WINDOW_BOTTOM;
    const floorH = 28;

    g.fillStyle(0x5A3A2A, 1);
    g.fillRect(0, floorY, 1024, floorH);

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, floorY, 1024, 3);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, floorY, 1024, 1);

    g.lineStyle(1, 0x6A4A3A, 0.15);
    for (let y = floorY + 6; y < floorY + floorH - 4; y += 4) {
      g.lineBetween(0, y, 1024, y);
    }

    g.fillStyle(0x2A1A10, 0.6);
    g.fillRect(0, floorY + floorH - 3, 1024, 3);

    g.fillStyle(0xFFEE88, 0.3);
    g.fillRect(0, floorY + 3, 3, floorH - 3);
    g.fillRect(1021, floorY + 3, 3, floorH - 3);
  }

  createSpaceBackground() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(0);

    g.fillStyle(s.SPACE_DEEP, 1);
    g.fillRect(0, s.WINDOW_TOP, 1024, s.WINDOW_HEIGHT);
    g.fillRect(0, 0, 1024, 145);

    g.fillStyle(0x3a2255, 0.08);
    g.fillEllipse(200, 240, 300, 150);
    g.fillStyle(0x253555, 0.06);
    g.fillEllipse(700, 300, 350, 140);
    g.fillStyle(0x453355, 0.05);
    g.fillEllipse(500, 200, 250, 100);

    const stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Phaser.Math.Between(50, 974),
        y: Phaser.Math.Between(s.WINDOW_TOP + 15, s.WINDOW_BOTTOM - 15),
        size: Phaser.Math.FloatBetween(0.5, 1.5),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    stars.forEach(star => {
      const rand = Math.random();
      const color = rand > 0.8 ? s.STAR_BLUE : rand > 0.6 ? s.STAR_WARM : s.STAR_WHITE;
      g.fillStyle(color, star.alpha);
      g.fillCircle(star.x, star.y, star.size);
    });

    s.starPositions = stars;
  }

  createSpaceWindows() {
    const s = this.scene;
    const winTop = s.WINDOW_TOP;
    const winBottom = s.WINDOW_BOTTOM;
    const winHeight = s.WINDOW_HEIGHT;

    const smokedGlass = s.add.graphics().setDepth(0.8);
    smokedGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
    smokedGlass.fillRect(0, winTop, 1024, winHeight);
    smokedGlass.fillStyle(0x101520, 0.15);
    smokedGlass.fillRect(0, winTop, 60, winHeight);
    smokedGlass.fillRect(964, winTop, 60, winHeight);
    smokedGlass.fillStyle(0x101520, 0.1);
    smokedGlass.fillRect(0, winTop, 1024, 30);
    smokedGlass.fillRect(0, winBottom - 30, 1024, 30);

    smokedGlass.fillStyle(0x6688aa, 0.06);
    smokedGlass.beginPath();
    smokedGlass.moveTo(100, winTop);
    smokedGlass.lineTo(400, winTop);
    smokedGlass.lineTo(200, winBottom);
    smokedGlass.lineTo(0, winBottom);
    smokedGlass.closePath();
    smokedGlass.fillPath();

    const g = s.add.graphics().setDepth(1);
    const beamW = 35;
    const beamPositions = [0, 250, 512 - beamW/2, 774 - beamW, 1024 - beamW];

    beamPositions.forEach((bx) => {
      g.fillStyle(s.CHROME_MID, 1);
      g.fillRect(bx, winTop, beamW, winHeight);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.7);
      g.fillRect(bx, winTop, 2, winHeight);
      g.fillStyle(s.CHROME_LIGHT, 0.5);
      g.fillRect(bx + 2, winTop, 4, winHeight);
      g.fillStyle(s.CHROME_DARK, 0.8);
      g.fillRect(bx + beamW - 4, winTop, 4, winHeight);
      g.lineStyle(1, s.CHROME_LIGHT, 0.15);
      for (let lx = bx + 8; lx < bx + beamW - 8; lx += 4) {
        g.lineBetween(lx, winTop, lx, winBottom);
      }
      for (let ry = winTop + 25; ry < winBottom - 20; ry += 50) {
        g.fillStyle(s.CHROME_DARK, 1);
        g.fillCircle(bx + beamW/2, ry, 4);
        g.fillStyle(s.CHROME_HIGHLIGHT, 0.8);
        g.fillCircle(bx + beamW/2 - 1, ry - 1, 2);
      }
    });

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, winTop, 1024, 10);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
    g.fillRect(0, winTop, 1024, 2);
    g.fillStyle(s.CHROME_DARK, 0.6);
    g.fillRect(0, winTop + 8, 1024, 2);

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, winBottom - 10, 1024, 12);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, winBottom - 10, 1024, 2);

    g.fillStyle(s.NEON_PINK, 0.6);
    g.fillRect(0, winBottom, 1024, 2);

    const glassEdge = s.add.graphics().setDepth(1);
    glassEdge.lineStyle(1, s.GLASS_HIGHLIGHT, 0.25);
    for (let i = 0; i < beamPositions.length - 1; i++) {
      const left = beamPositions[i] + beamW + 3;
      const right = beamPositions[i + 1] - 3;
      glassEdge.strokeRect(left, winTop + 14, right - left, winHeight - 28);
    }

    const smallWinY = 8;
    const smallWinH = 100;
    const frameThickness = 10;
    const numWindows = 4;
    const totalWidth = 1024 - 40;
    const windowWidth = (totalWidth - (numWindows + 1) * frameThickness) / numWindows;

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, 0, 1024, 8);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, 0, 1024, 2);

    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, smallWinY + smallWinH, 1024, frameThickness + 28);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.4);
    g.fillRect(0, smallWinY + smallWinH, 1024, 2);

    for (let i = 0; i <= numWindows; i++) {
      const frameX = 20 + i * (windowWidth + frameThickness);
      g.fillStyle(s.CHROME_MID, 1);
      g.fillRect(frameX - frameThickness, smallWinY, frameThickness, smallWinH);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.4);
      g.fillRect(frameX - frameThickness, smallWinY, 2, smallWinH);
    }

    for (let i = 0; i < numWindows; i++) {
      const paneX = 20 + frameThickness + i * (windowWidth + frameThickness);
      g.fillStyle(s.GLASS_TINT, 0.2);
      g.fillRect(paneX, smallWinY, windowWidth, smallWinH);
      g.lineStyle(1, s.GLASS_HIGHLIGHT, 0.3);
      g.strokeRect(paneX + 2, smallWinY + 2, windowWidth - 4, smallWinH - 4);
      g.fillStyle(s.CHROME_DARK, 0.9);
      g.fillCircle(paneX - 5, smallWinY + 10, 3);
      g.fillCircle(paneX + windowWidth + 5, smallWinY + 10, 3);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(paneX - 6, smallWinY + 9, 1.5);
      g.fillCircle(paneX + windowWidth + 4, smallWinY + 9, 1.5);
    }

    g.fillStyle(s.NEON_PINK, 0.5);
    g.fillRect(20, smallWinY + smallWinH + 3, totalWidth, 2);
  }
}
