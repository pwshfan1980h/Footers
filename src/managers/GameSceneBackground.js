/**
 * GameSceneBackground - Hull plating with oval portholes, service counter, kitchen surface
 */
import Phaser from 'phaser';
import { darkenColor, lightenColor } from '../utils/colorUtils.js';

export class GameSceneBackground {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    this.createSpaceBackground();
    this.createHullWithPortholes();
  }

  createMetalSurface() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(4);

    const surfaceY = 360;
    const surfaceH = 408;
    const surfaceW = 1024;

    g.fillStyle(0x4A5868, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    g.lineStyle(1, 0x5A6878, 0.15);
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

  createServiceCounter() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(3);
    const counterY = s.COUNTER_Y - 10;
    const counterH = 20;

    // Counter top surface
    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, counterY, 1024, counterH);

    // Top highlight
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.7);
    g.fillRect(0, counterY, 1024, 2);

    // Counter face
    g.fillStyle(s.CHROME_DARK, 1);
    g.fillRect(0, counterY + 2, 1024, counterH - 2);

    // Brushed metal lines
    g.lineStyle(1, s.CHROME_LIGHT, 0.1);
    for (let y = counterY + 4; y < counterY + counterH - 2; y += 3) {
      g.lineBetween(0, y, 1024, y);
    }

    // Bottom shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, counterY + counterH, 1024, 3);

    // "ORDER HERE" neon sign
    const signX = 512;
    const signY = counterY + 6;

    // Neon glow behind text
    g.fillStyle(s.NEON_PINK, 0.15);
    g.fillEllipse(signX, signY + 3, 120, 14);

    // Neon line
    g.fillStyle(s.NEON_PINK, 0.6);
    g.fillRect(signX - 55, counterY + counterH - 2, 110, 2);

    // Yellow-black safety chevrons
    const chevY = counterY - 5;
    g.fillStyle(0x222222, 0.8);
    g.fillRect(0, chevY, 1024, 5);
    for (let x = 0; x < 1024; x += 20) {
      g.fillStyle(0xCCAA00, 0.6);
      g.beginPath();
      g.moveTo(x, chevY);
      g.lineTo(x + 10, chevY);
      g.lineTo(x + 15, chevY + 5);
      g.lineTo(x + 5, chevY + 5);
      g.closePath();
      g.fillPath();
    }

    // Rivets along counter
    for (let x = 30; x < 1024; x += 60) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, counterY + counterH / 2 + 1, 3);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, counterY + counterH / 2, 1.2);
    }
  }

  createSpaceBackground() {
    const s = this.scene;
    const loc = s.locationData;
    const locColor = loc?.color || 0x442266;
    const locType = loc?.type || 'station';
    const g = s.add.graphics().setDepth(0);

    // Deep space fill behind portholes
    g.fillStyle(s.SPACE_DEEP, 1);
    g.fillRect(0, s.WINDOW_TOP, 1024, s.WINDOW_HEIGHT);

    // Location-tinted ambient haze (scaled to porthole area)
    const midY = (s.WINDOW_TOP + s.WINDOW_BOTTOM) / 2;
    g.fillStyle(locColor, 0.08);
    g.fillEllipse(512, midY, 900, s.WINDOW_HEIGHT);
    g.fillStyle(locColor, 0.05);
    g.fillEllipse(300, midY, 500, s.WINDOW_HEIGHT * 0.8);
    g.fillStyle(locColor, 0.05);
    g.fillEllipse(750, midY, 450, s.WINDOW_HEIGHT * 0.7);

    // Type-specific environmental elements
    this._drawSpaceEnvironment(g, locType, locColor, s);

    // Stars — fewer, constrained to porthole strip
    const stars = [];
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Phaser.Math.Between(50, 974),
        y: Phaser.Math.Between(s.WINDOW_TOP + 5, s.WINDOW_BOTTOM - 5),
        size: Phaser.Math.FloatBetween(0.4, 1.2),
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

    // Twinkle
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
    for (let i = 0; i < 4; i++) {
      const cx = 150 + rand() * 700;
      const cy = midY - 15 + rand() * 30;
      const len = 15 + rand() * 30;
      const angle = rand() * Math.PI * 2;
      g.lineStyle(1, color, 0.08 + rand() * 0.06);
      g.lineBetween(
        cx - Math.cos(angle) * len,
        cy - Math.sin(angle) * len,
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len,
      );
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle(color, 0.25 + rand() * 0.15);
      g.fillCircle(100 + rand() * 824, midY - 20 + rand() * 40, 1 + rand());
    }
  }

  _drawSpaceAsteroids(g, color, winTop, winBot, rand) {
    for (let i = 0; i < 6; i++) {
      const rx = 60 + rand() * 904;
      const ry = winTop + 8 + rand() * (winBot - winTop - 16);
      const size = 1.5 + rand() * 4;
      g.fillStyle(color, 0.08 + rand() * 0.07);
      g.fillCircle(rx, ry, size);
    }
    g.fillStyle(color, 0.03);
    g.fillEllipse(512, (winTop + winBot) / 2, 600, 30);
  }

  _drawSpaceNebula(g, color, winTop, winBot, rand) {
    for (let i = 0; i < 4; i++) {
      const cx = 100 + rand() * 824;
      const cy = winTop + 10 + rand() * (winBot - winTop - 20);
      const w = 80 + rand() * 150;
      const h = 20 + rand() * 30;
      g.fillStyle(color, 0.04 + rand() * 0.04);
      g.fillEllipse(cx, cy, w, h);
    }
  }

  _drawSpacePlanet(g, color, winTop, winBot) {
    const planetX = 750;
    const planetY = winBot + 60;
    const planetR = 80;
    g.fillStyle(color, 0.08);
    g.fillCircle(planetX, planetY, planetR + 15);
    g.fillStyle(0x0a1510, 0.7);
    g.fillCircle(planetX, planetY, planetR);
  }

  _drawSpacePort(g, color, midY, rand) {
    const beams = [[200, -0.1], [500, 0], [800, 0.1]];
    beams.forEach(([bx, slope]) => {
      g.lineStyle(1, color, 0.07);
      g.lineBetween(bx, midY - 25, bx + slope * 50, midY + 25);
      g.fillStyle(color, 0.15 + rand() * 0.1);
      g.fillCircle(bx, midY, 1.5);
    });
    g.fillStyle(color, 0.04);
    g.fillEllipse(512, midY, 300, 40);
  }

  _drawSpaceDebris(g, color, winTop, winBot, rand) {
    for (let i = 0; i < 6; i++) {
      const dx = 60 + rand() * 904;
      const dy = winTop + 8 + rand() * (winBot - winTop - 16);
      const size = 2 + rand() * 4;
      const rot = rand() * Math.PI;
      g.fillStyle(color, 0.07 + rand() * 0.07);
      g.beginPath();
      g.moveTo(dx + Math.cos(rot) * size, dy + Math.sin(rot) * size);
      g.lineTo(dx + Math.cos(rot + 1.5) * size * 0.6, dy + Math.sin(rot + 1.5) * size * 0.6);
      g.lineTo(dx + Math.cos(rot + Math.PI) * size * 0.8, dy + Math.sin(rot + Math.PI) * size * 0.8);
      g.closePath();
      g.fillPath();
    }
  }

  createHullWithPortholes() {
    const s = this.scene;
    const winTop = s.WINDOW_TOP;
    const winBot = s.WINDOW_BOTTOM;
    const winH = s.WINDOW_HEIGHT;

    // Hull plating background (covers the full porthole strip)
    const hull = s.add.graphics().setDepth(0.5);
    hull.fillStyle(s.HULL_MID, 1);
    hull.fillRect(0, winTop, 1024, winH);

    // Panel seams (horizontal)
    hull.lineStyle(1, s.PANEL_SEAM, 0.4);
    hull.lineBetween(0, winTop + 25, 1024, winTop + 25);
    hull.lineBetween(0, winBot - 20, 1024, winBot - 20);

    // Panel seams (vertical)
    for (let x = 128; x < 1024; x += 256) {
      hull.lineStyle(1, s.PANEL_SEAM, 0.3);
      hull.lineBetween(x, winTop, x, winBot);
    }

    // Rivet rows along top and bottom
    const rivetDark = darkenColor(s.HULL_MID, 0.65);
    const rivetLight = lightenColor(s.HULL_MID, 0.25);
    for (let x = 30; x < 1024; x += 50) {
      hull.fillStyle(rivetDark, 1);
      hull.fillCircle(x, winTop + 8, 2.5);
      hull.fillStyle(rivetLight, 0.6);
      hull.fillCircle(x - 0.5, winTop + 7.5, 1);

      hull.fillStyle(rivetDark, 1);
      hull.fillCircle(x, winBot - 8, 2.5);
      hull.fillStyle(rivetLight, 0.6);
      hull.fillCircle(x - 0.5, winBot - 8.5, 1);
    }

    // 4 oval portholes
    const portholePositions = [160, 390, 634, 864];
    const portW = 120;
    const portH = 60;
    const midY = (winTop + winBot) / 2;

    const portGlass = s.add.graphics().setDepth(0.6);
    const portFrame = s.add.graphics().setDepth(0.7);

    portholePositions.forEach(px => {
      // Cut-out: dark space visible through glass
      portGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
      portGlass.fillEllipse(px, midY, portW, portH);

      // Glass tint
      const locColor = s.locationData?.color || 0x6688aa;
      portGlass.fillStyle(locColor, 0.06);
      portGlass.fillEllipse(px, midY, portW - 4, portH - 4);

      // Glass highlight reflection
      portGlass.fillStyle(0xffffff, 0.08);
      portGlass.fillEllipse(px - 10, midY - 6, portW * 0.5, portH * 0.3);

      // Chrome frame — outer ring
      portFrame.lineStyle(4, s.CHROME_MID, 1);
      portFrame.strokeEllipse(px, midY, portW + 4, portH + 4);
      // Inner rim highlight
      portFrame.lineStyle(1, s.CHROME_HIGHLIGHT, 0.6);
      portFrame.strokeEllipse(px, midY, portW, portH);
      // Outer rim shadow
      portFrame.lineStyle(1, s.CHROME_DARK, 0.5);
      portFrame.strokeEllipse(px, midY, portW + 8, portH + 8);

      // Bolts at 4 cardinal points
      const boltPositions = [
        [px - portW / 2 - 8, midY],
        [px + portW / 2 + 8, midY],
        [px, midY - portH / 2 - 7],
        [px, midY + portH / 2 + 7],
      ];
      boltPositions.forEach(([bx, by]) => {
        portFrame.fillStyle(s.CHROME_DARK, 1);
        portFrame.fillCircle(bx, by, 3);
        portFrame.fillStyle(s.CHROME_HIGHLIGHT, 0.7);
        portFrame.fillCircle(bx - 0.5, by - 0.5, 1.2);
      });
    });

    // Porthole stars — twinkling stars drawn on top of glass, inside each ellipse
    const locColor = s.locationData?.color || 0x6688aa;
    const starColors = [0xffffff, s.STAR_WARM, s.STAR_BLUE, locColor];
    portholePositions.forEach(px => {
      const halfW = portW / 2 - 4;
      const halfH = portH / 2 - 4;
      const numStars = Phaser.Math.Between(5, 7);
      for (let i = 0; i < numStars; i++) {
        // Random point inside ellipse
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const sx = px + Math.cos(angle) * halfW * r;
        const sy = midY + Math.sin(angle) * halfH * r;
        const starSize = Phaser.Math.FloatBetween(0.5, 1.5);
        const starColor = Phaser.Utils.Array.GetRandom(starColors);
        const sg = s.add.graphics().setDepth(0.65);
        sg.fillStyle(starColor, 1);
        sg.fillCircle(0, 0, starSize);
        sg.setPosition(sx, sy);
        sg.setAlpha(Phaser.Math.FloatBetween(0.4, 0.9));
        // Twinkle tween
        s.tweens.add({
          targets: sg,
          alpha: Phaser.Math.FloatBetween(0.1, 0.3),
          duration: Phaser.Math.Between(1500, 4000),
          delay: Phaser.Math.Between(0, 3000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    });

    // Store porthole positions
    s.portholePositions = portholePositions;
    s.portholeMidY = midY;

    // Top chrome trim (above hull)
    const trim = s.add.graphics().setDepth(0.8);
    trim.fillStyle(s.CHROME_MID, 1);
    trim.fillRect(0, winTop, 1024, 4);
    trim.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
    trim.fillRect(0, winTop, 1024, 1);

    // Bottom chrome trim (below hull, above customer deck)
    trim.fillStyle(s.CHROME_MID, 1);
    trim.fillRect(0, winBot - 3, 1024, 3);
    trim.fillStyle(s.CHROME_HIGHLIGHT, 0.4);
    trim.fillRect(0, winBot - 3, 1024, 1);
  }
}
