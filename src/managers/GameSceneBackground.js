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
    const loc = s.locationData;
    const locColor = loc?.color || 0x442266;
    const locType = loc?.type || 'station';
    const g = s.add.graphics().setDepth(0);

    // Deep space fill
    g.fillStyle(s.SPACE_DEEP, 1);
    g.fillRect(0, s.WINDOW_TOP, 1024, s.WINDOW_HEIGHT);
    g.fillRect(0, 0, 1024, 145);

    // Location-tinted ambient haze (large soft glow across the window)
    g.fillStyle(locColor, 0.06);
    g.fillEllipse(512, 270, 900, 300);
    g.fillStyle(locColor, 0.04);
    g.fillEllipse(300, 250, 500, 200);
    g.fillStyle(locColor, 0.04);
    g.fillEllipse(750, 290, 450, 180);

    // Type-specific environmental elements
    this._drawSpaceEnvironment(g, locType, locColor, s);

    // Stars — bias color toward location tint, each as its own Graphics for twinkle
    const stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Phaser.Math.Between(50, 974),
        y: Phaser.Math.Between(s.WINDOW_TOP + 15, s.WINDOW_BOTTOM - 15),
        size: Phaser.Math.FloatBetween(0.5, 1.5),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    const starGraphics = [];
    stars.forEach(star => {
      const rand = Math.random();
      const color = rand > 0.85 ? locColor
        : rand > 0.7 ? s.STAR_BLUE
        : rand > 0.55 ? s.STAR_WARM
        : s.STAR_WHITE;
      const sg = s.add.graphics().setDepth(0.1);
      sg.fillStyle(color, 1);
      sg.fillCircle(0, 0, star.size);
      sg.setPosition(star.x, star.y);
      sg.setAlpha(star.alpha);
      starGraphics.push(sg);
    });

    // Add twinkle tweens to ~35% of stars
    starGraphics.forEach(sg => {
      if (Math.random() < 0.35) {
        s.tweens.add({
          targets: sg,
          alpha: Phaser.Math.FloatBetween(0.15, 0.35),
          duration: Phaser.Math.Between(1500, 4000),
          delay: Phaser.Math.Between(0, 3000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    });

    s.starPositions = stars;
  }

  _drawSpaceEnvironment(g, type, color, s) {
    const winTop = s.WINDOW_TOP;
    const winBot = s.WINDOW_BOTTOM;
    const midY = (winTop + winBot) / 2;

    // Seeded RNG for deterministic placement
    let seed = 77;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    switch (type) {
      case 'station':
        this._drawSpaceStation(g, color, midY, rand);
        break;
      case 'asteroid':
        this._drawSpaceAsteroids(g, color, winTop, winBot, rand);
        break;
      case 'nebula':
        this._drawSpaceNebula(g, color, winTop, winBot, rand);
        break;
      case 'planet':
        this._drawSpacePlanet(g, color, winTop, winBot);
        break;
      case 'port':
        this._drawSpacePort(g, color, midY, rand);
        break;
      case 'frontier':
        this._drawSpaceDebris(g, color, winTop, winBot, rand);
        break;
    }
  }

  _drawSpaceStation(g, color, midY, rand) {
    // Distant comm-array structure lines visible through window
    for (let i = 0; i < 6; i++) {
      const cx = 150 + rand() * 700;
      const cy = midY - 40 + rand() * 80;
      const len = 30 + rand() * 60;
      const angle = rand() * Math.PI * 2;
      g.lineStyle(1, color, 0.08 + rand() * 0.06);
      g.lineBetween(
        cx - Math.cos(angle) * len,
        cy - Math.sin(angle) * len,
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len,
      );
    }
    // Blinking nav lights (small bright dots)
    for (let i = 0; i < 4; i++) {
      g.fillStyle(color, 0.25 + rand() * 0.15);
      g.fillCircle(100 + rand() * 824, midY - 60 + rand() * 120, 1 + rand());
    }
  }

  _drawSpaceAsteroids(g, color, winTop, winBot, rand) {
    // Scattered rock silhouettes drifting past
    for (let i = 0; i < 12; i++) {
      const rx = 60 + rand() * 904;
      const ry = winTop + 20 + rand() * (winBot - winTop - 40);
      const size = 2 + rand() * 6;
      g.fillStyle(color, 0.08 + rand() * 0.07);
      g.fillCircle(rx, ry, size);
      g.fillCircle(rx + size * 0.3, ry - size * 0.25, size * 0.65);
    }
    // Amber dust band across window
    g.fillStyle(color, 0.03);
    g.fillEllipse(512, (winTop + winBot) / 2 + 20, 800, 80);
  }

  _drawSpaceNebula(g, color, winTop, winBot, rand) {
    // Dense layered gas clouds filling the view
    for (let i = 0; i < 6; i++) {
      const cx = 100 + rand() * 824;
      const cy = winTop + 30 + rand() * (winBot - winTop - 60);
      const w = 120 + rand() * 250;
      const h = 60 + rand() * 100;
      g.fillStyle(color, 0.03 + rand() * 0.04);
      g.fillEllipse(cx, cy, w, h);
    }
    // Brighter wisp streaks
    for (let i = 0; i < 3; i++) {
      const y = winTop + 40 + rand() * (winBot - winTop - 80);
      const x1 = rand() * 300;
      const x2 = x1 + 200 + rand() * 400;
      g.lineStyle(2 + rand() * 3, color, 0.04 + rand() * 0.03);
      g.lineBetween(x1, y, x2, y + (rand() - 0.5) * 40);
    }
  }

  _drawSpacePlanet(g, color, winTop, winBot) {
    // Large planetary body partially visible at bottom-right of window
    const planetX = 820;
    const planetY = winBot + 80;
    const planetR = 200;

    // Atmospheric glow arc visible above the planet edge
    g.fillStyle(color, 0.08);
    g.fillCircle(planetX, planetY, planetR + 30);
    g.fillStyle(color, 0.05);
    g.fillCircle(planetX, planetY, planetR + 60);

    // The planet body itself (dark, just slightly lighter than space)
    g.fillStyle(0x0a1510, 0.7);
    g.fillCircle(planetX, planetY, planetR);

    // Thin atmospheric rim highlight
    g.lineStyle(2, color, 0.20);
    g.beginPath();
    for (let a = -1.8; a < -0.2; a += 0.04) {
      const px = planetX + Math.cos(a) * planetR;
      const py = planetY + Math.sin(a) * planetR;
      if (py < winBot && py > winTop) {
        if (a === -1.8) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
    }
    g.strokePath();

    // Faint green haze across entire window from atmospheric scatter
    g.fillStyle(color, 0.02);
    g.fillRect(0, winBot - 60, 1024, 60);
  }

  _drawSpacePort(g, color, midY, rand) {
    // Docking beam lights — structured lines converging toward center
    const beams = [[150, -0.15], [350, -0.08], [650, 0.08], [870, 0.15]];
    beams.forEach(([bx, slope]) => {
      g.lineStyle(1.5, color, 0.07);
      g.lineBetween(bx, midY - 100, bx + slope * 200, midY + 100);
      // Running lights along beam
      for (let d = -80; d < 80; d += 30) {
        g.fillStyle(color, 0.12 + rand() * 0.12);
        g.fillCircle(bx + slope * (d + 100), midY + d, 1.5);
      }
    });
    // Warm golden ambient glow at center
    g.fillStyle(color, 0.04);
    g.fillEllipse(512, midY, 400, 160);
  }

  _drawSpaceDebris(g, color, winTop, winBot, rand) {
    // Wreckage chunks floating past
    for (let i = 0; i < 10; i++) {
      const dx = 60 + rand() * 904;
      const dy = winTop + 20 + rand() * (winBot - winTop - 40);
      const size = 3 + rand() * 7;
      const rot = rand() * Math.PI;

      g.fillStyle(color, 0.07 + rand() * 0.07);
      g.beginPath();
      g.moveTo(dx + Math.cos(rot) * size, dy + Math.sin(rot) * size);
      g.lineTo(dx + Math.cos(rot + 1.5) * size * 0.6, dy + Math.sin(rot + 1.5) * size * 0.6);
      g.lineTo(dx + Math.cos(rot + Math.PI) * size * 0.8, dy + Math.sin(rot + Math.PI) * size * 0.8);
      g.lineTo(dx + Math.cos(rot + 4.5) * size * 0.5, dy + Math.sin(rot + 4.5) * size * 0.5);
      g.closePath();
      g.fillPath();
    }
    // Hazard haze band
    g.fillStyle(color, 0.04);
    g.fillEllipse(512, (winTop + winBot) / 2, 700, 100);
  }

  createSpaceWindows() {
    const s = this.scene;
    const winTop = s.WINDOW_TOP;
    const winBottom = s.WINDOW_BOTTOM;
    const winHeight = s.WINDOW_HEIGHT;

    const locColor = s.locationData?.color || 0x6688aa;

    const smokedGlass = s.add.graphics().setDepth(0.8);
    smokedGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
    smokedGlass.fillRect(0, winTop, 1024, winHeight);
    smokedGlass.fillStyle(0x101520, 0.15);
    smokedGlass.fillRect(0, winTop, 60, winHeight);
    smokedGlass.fillRect(964, winTop, 60, winHeight);
    smokedGlass.fillStyle(0x101520, 0.1);
    smokedGlass.fillRect(0, winTop, 1024, 30);
    smokedGlass.fillRect(0, winBottom - 30, 1024, 30);

    // Location-tinted light refraction on glass
    smokedGlass.fillStyle(locColor, 0.06);
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
