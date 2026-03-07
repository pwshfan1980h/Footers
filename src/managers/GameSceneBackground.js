/**
 * GameSceneBackground - Cantina walls with arched windows showing alien desert,
 * dark slate counter surface, ceiling lighting
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HALF_WIDTH } from '../data/constants.js';

export class GameSceneBackground {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    this.createDesertBackground();
    this.createWallWithWindows();
    this.createCeilingLighting();
  }

  createMetalSurface() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(4);

    const surfaceY = 506;
    const surfaceH = 574;
    const surfaceW = GAME_WIDTH;

    // Warm adobe prep surface (matches cantina theme)
    g.fillStyle(0x2A1E14, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    // Subtle wood grain horizontal lines
    g.lineStyle(1, 0x3A2A1A, 0.35);
    for (let y = surfaceY + 4; y < surfaceY + surfaceH; y += 8) {
      g.lineBetween(0, y, surfaceW, y);
    }

    // Counter edge — warm brass trim
    g.fillStyle(0x7A5830, 1);
    g.fillRect(0, surfaceY, surfaceW, 3);
    g.fillStyle(0xC8A060, 0.5);
    g.fillRect(0, surfaceY, surfaceW, 1);

    // Warm amber light reflection
    g.fillStyle(0xFFCC88, 0.03);
    g.fillRect(0, surfaceY + 3, surfaceW, 2);

    // Bottom shadow gradient
    for (let i = 0; i < 6; i++) {
      const alpha = 0.03 * i;
      const yPos = surfaceY + surfaceH - 60 + i * 10;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, yPos, surfaceW, 10);
    }

    // Vignette — dark corners to focus attention on center
    this.createVignette(s);
  }

  createVignette(s) {
    const g = s.add.graphics().setDepth(220);
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Corner darkening (radial-ish via rectangles)
    for (let i = 0; i < 8; i++) {
      const alpha = 0.06 * (8 - i) / 8;
      const inset = i * 60;
      g.fillStyle(0x000000, alpha);
      // Top
      g.fillRect(0, 0, w, Math.max(1, 40 - i * 5));
      // Bottom
      g.fillRect(0, h - Math.max(1, 30 - i * 4), w, Math.max(1, 30 - i * 4));
      // Left
      g.fillRect(0, 0, Math.max(1, 80 - i * 10), h);
      // Right
      g.fillRect(w - Math.max(1, 80 - i * 10), 0, Math.max(1, 80 - i * 10), h);
    }
  }

  createServiceCounter() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(3);
    const counterY = s.COUNTER_Y - 10;
    const counterH = 20;

    // Counter top — dark slate with steel edge
    g.fillStyle(s.COUNTER_DARK, 1);
    g.fillRect(0, counterY, GAME_WIDTH, counterH);

    // Top highlight (steel inlay)
    g.fillStyle(s.COUNTER_HIGHLIGHT, 0.5);
    g.fillRect(0, counterY, GAME_WIDTH, 2);

    // Counter face (darker slate)
    g.fillStyle(0x1A2028, 1);
    g.fillRect(0, counterY + 2, GAME_WIDTH, counterH - 2);

    // Subtle grain lines
    g.lineStyle(1, s.COUNTER_LIGHT, 0.08);
    for (let y = counterY + 4; y < counterY + counterH - 2; y += 3) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Bottom shadow
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, counterY + counterH, GAME_WIDTH, 3);

    // "ORDER HERE" neon sign — boosted visibility
    const signX = HALF_WIDTH;
    const signY = counterY + 6;

    g.fillStyle(s.NEON_PINK, 0.4);
    g.fillEllipse(signX, signY + 3, 140, 18);

    // Neon line
    g.fillStyle(s.NEON_PINK, 0.7);
    g.fillRect(signX - 60, counterY + counterH - 2, 120, 2);
  }

  createDesertBackground() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(0);

    // Deep desert sky fill behind windows
    g.fillStyle(s.SPACE_DEEP, 1);
    g.fillRect(0, s.WINDOW_TOP, GAME_WIDTH, s.WINDOW_HEIGHT);

    // Gradient sky: dark at top → warm orange at horizon
    g.fillStyle(0x1a1030, 0.6);
    g.fillRect(0, s.WINDOW_TOP, GAME_WIDTH, s.WINDOW_HEIGHT * 0.4);

    // Horizon glow — warm amber/orange
    g.fillStyle(0x442200, 0.3);
    g.fillEllipse(HALF_WIDTH, s.WINDOW_BOTTOM - 10, GAME_WIDTH * 1.2, 60);
    g.fillStyle(0x663300, 0.15);
    g.fillEllipse(HALF_WIDTH, s.WINDOW_BOTTOM, GAME_WIDTH, 40);

    // Single amber moon
    g.fillStyle(0xDD8844, 0.12);
    g.fillCircle(1550, s.WINDOW_TOP + 20, 30);
    g.fillStyle(0xDD8844, 0.3);
    g.fillCircle(1550, s.WINDOW_TOP + 20, 16);
    g.fillStyle(0xEEAA66, 0.2);
    g.fillCircle(1546, s.WINDOW_TOP + 17, 11);

    // Desert mesa silhouettes at horizon
    g.fillStyle(0x1a1008, 0.8);
    g.beginPath();
    g.moveTo(0, s.WINDOW_BOTTOM);
    g.lineTo(0, s.WINDOW_BOTTOM - 30);
    g.lineTo(80, s.WINDOW_BOTTOM - 35);
    g.lineTo(150, s.WINDOW_BOTTOM - 50);
    g.lineTo(200, s.WINDOW_BOTTOM - 48);
    g.lineTo(280, s.WINDOW_BOTTOM - 25);
    g.lineTo(350, s.WINDOW_BOTTOM - 15);
    g.lineTo(400, s.WINDOW_BOTTOM);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x1a1008, 0.6);
    g.beginPath();
    g.moveTo(600, s.WINDOW_BOTTOM);
    g.lineTo(650, s.WINDOW_BOTTOM - 20);
    g.lineTo(750, s.WINDOW_BOTTOM - 40);
    g.lineTo(850, s.WINDOW_BOTTOM - 45);
    g.lineTo(950, s.WINDOW_BOTTOM - 35);
    g.lineTo(1050, s.WINDOW_BOTTOM - 42);
    g.lineTo(1150, s.WINDOW_BOTTOM - 30);
    g.lineTo(1250, s.WINDOW_BOTTOM - 15);
    g.lineTo(1300, s.WINDOW_BOTTOM);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x1a1008, 0.7);
    g.beginPath();
    g.moveTo(1450, s.WINDOW_BOTTOM);
    g.lineTo(1500, s.WINDOW_BOTTOM - 25);
    g.lineTo(1600, s.WINDOW_BOTTOM - 55);
    g.lineTo(1700, s.WINDOW_BOTTOM - 50);
    g.lineTo(1800, s.WINDOW_BOTTOM - 30);
    g.lineTo(1920, s.WINDOW_BOTTOM - 20);
    g.lineTo(1920, s.WINDOW_BOTTOM);
    g.closePath();
    g.fillPath();

    // Stars in the desert sky (reduced count)
    const stars = [];
    for (let i = 0; i < 18; i++) {
      stars.push({
        x: Phaser.Math.Between(50, GAME_WIDTH - 50),
        y: Phaser.Math.Between(s.WINDOW_TOP + 5, s.WINDOW_BOTTOM - 30),
        size: Phaser.Math.FloatBetween(0.4, 1.2),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    stars.forEach(star => {
      const rand = Math.random();
      const color = rand > 0.7 ? 0xffcc88
        : rand > 0.4 ? s.STAR_WARM
        : s.STAR_WHITE;
      const sg = s.add.graphics().setDepth(0.1);
      sg.fillStyle(color, 1);
      sg.fillCircle(0, 0, star.size);
      sg.setPosition(star.x, star.y);
      sg.setAlpha(star.alpha);

      if (Math.random() < 0.3) {
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

  createWallWithWindows() {
    const s = this.scene;
    const winTop = s.WINDOW_TOP;
    const winBot = s.WINDOW_BOTTOM;
    const winH = s.WINDOW_HEIGHT;

    // Adobe/sandstone wall background
    const hull = s.add.graphics().setDepth(0.5);
    hull.fillStyle(s.HULL_MID, 1);
    hull.fillRect(0, winTop, GAME_WIDTH, winH);

    // Stucco texture — subtle horizontal cracks
    hull.lineStyle(1, s.PANEL_SEAM, 0.25);
    hull.lineBetween(0, winTop + 20, GAME_WIDTH, winTop + 22);
    hull.lineBetween(0, winBot - 18, GAME_WIDTH, winBot - 16);

    // Vertical mortar lines
    for (let x = 160; x < GAME_WIDTH; x += 320) {
      hull.lineStyle(1, s.PANEL_SEAM, 0.2);
      hull.lineBetween(x, winTop, x, winBot);
    }

    // 4 arched windows (simplified — no keystones, no window-specific stars)
    const windowPositions = [300, 731, 1189, 1620];
    const windowW = 110;
    const windowH = 70;
    const archH = 25;
    const midY = (winTop + winBot) / 2;

    const winGlass = s.add.graphics().setDepth(0.6);
    const winFrame = s.add.graphics().setDepth(0.7);

    windowPositions.forEach(px => {
      const left = px - windowW / 2;
      const right = px + windowW / 2;
      const top = midY - windowH / 2;
      const bot = midY + windowH / 2;

      // Window opening — dark desert visible
      winGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
      winGlass.fillRect(left, top + archH, windowW, windowH - archH);
      winGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
      winGlass.beginPath();
      winGlass.moveTo(left, top + archH);
      winGlass.arc(px, top + archH, windowW / 2, Math.PI, 0, false);
      winGlass.closePath();
      winGlass.fillPath();

      // Warm amber glass tint
      winGlass.fillStyle(0x664422, 0.08);
      winGlass.fillRect(left + 2, top + archH, windowW - 4, windowH - archH - 2);

      // Glass highlight
      winGlass.fillStyle(0xffffff, 0.06);
      winGlass.fillEllipse(px - 10, top + archH + 10, windowW * 0.4, 20);

      // Wooden frame — outer
      winFrame.lineStyle(5, s.BEAM_MID, 1);
      winFrame.lineBetween(left, top + archH, left, bot);
      winFrame.lineBetween(right, top + archH, right, bot);
      winFrame.lineBetween(left, bot, right, bot);
      winFrame.beginPath();
      winFrame.arc(px, top + archH, windowW / 2, Math.PI, 0, false);
      winFrame.strokePath();

      // Inner frame highlight
      winFrame.lineStyle(1, s.BEAM_HIGHLIGHT, 0.5);
      winFrame.lineBetween(left + 3, top + archH, left + 3, bot - 2);
      winFrame.lineBetween(right - 3, top + archH, right - 3, bot - 2);

      // Windowsill
      winFrame.fillStyle(s.BEAM_LIGHT, 1);
      winFrame.fillRect(left - 4, bot, windowW + 8, 4);
      winFrame.fillStyle(s.BEAM_HIGHLIGHT, 0.4);
      winFrame.fillRect(left - 4, bot, windowW + 8, 1);
    });

    s.portholePositions = windowPositions;
    s.portholeMidY = midY;

    // Top wood trim
    const trim = s.add.graphics().setDepth(0.8);
    trim.fillStyle(s.BEAM_MID, 1);
    trim.fillRect(0, winTop, GAME_WIDTH, 4);
    trim.fillStyle(s.BEAM_HIGHLIGHT, 0.4);
    trim.fillRect(0, winTop, GAME_WIDTH, 1);

    // Bottom wood trim
    trim.fillStyle(s.BEAM_MID, 1);
    trim.fillRect(0, winBot - 3, GAME_WIDTH, 3);
    trim.fillStyle(s.BEAM_HIGHLIGHT, 0.3);
    trim.fillRect(0, winBot - 3, GAME_WIDTH, 1);
  }

  createCeilingLighting() {
    const s = this.scene;
    const ceilDepth = 8;

    // Reduced ceiling gradient (8 strips instead of 22)
    const shadow = s.add.graphics().setDepth(ceilDepth);
    const gradientH = 180;
    const strips = 8;
    const stripH = gradientH / strips;

    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);
      const alpha = 0.50 * Math.pow(1 - t, 2);
      shadow.fillStyle(0x0a0600, alpha);
      shadow.fillRect(0, i * stripH, GAME_WIDTH, stripH + 1);
    }

    // Wooden beam at gradient edge
    const beamY = gradientH - 6;
    shadow.fillStyle(0x2A1A10, 0.5);
    shadow.fillRect(0, beamY, GAME_WIDTH, 6);
    shadow.fillStyle(0x3A2A18, 0.25);
    shadow.fillRect(0, beamY, GAME_WIDTH, 1);

    // Simplified warm light cones (2 layers instead of 6)
    const lanterns = [
      { x: 250,  spread: 160, reach: 280 },
      { x: 620,  spread: 140, reach: 250 },
      { x: 960,  spread: 180, reach: 300 },
      { x: 1300, spread: 140, reach: 250 },
      { x: 1680, spread: 160, reach: 280 },
    ];

    lanterns.forEach(lamp => {
      const coneG = s.add.graphics().setDepth(ceilDepth + 0.1);

      const topW = 12;
      const botW = lamp.spread;
      const coneTop = 4;
      const coneBot = lamp.reach;

      // 2-layer cone: outer glow + inner core
      // Outer
      coneG.fillStyle(0xFFCC88, 0.03);
      coneG.beginPath();
      coneG.moveTo(lamp.x - topW, coneTop);
      coneG.lineTo(lamp.x + topW, coneTop);
      coneG.lineTo(lamp.x + botW, coneBot);
      coneG.lineTo(lamp.x - botW, coneBot);
      coneG.closePath();
      coneG.fillPath();

      // Inner core
      coneG.fillStyle(0xFFCC88, 0.05);
      coneG.beginPath();
      coneG.moveTo(lamp.x - topW * 0.5, coneTop);
      coneG.lineTo(lamp.x + topW * 0.5, coneTop);
      coneG.lineTo(lamp.x + botW * 0.5, coneBot);
      coneG.lineTo(lamp.x - botW * 0.5, coneBot);
      coneG.closePath();
      coneG.fillPath();

      // Hotspot at source
      coneG.fillStyle(0xFFDD99, 0.12);
      coneG.fillCircle(lamp.x, 10, 18);

      // Pool of light
      coneG.fillStyle(0xFFCC88, 0.03);
      coneG.fillEllipse(lamp.x, coneBot + 20, botW * 1.4, 60);

      // Subtle flicker
      coneG.setAlpha(0.9);
      s.tweens.add({
        targets: coneG,
        alpha: { from: 0.75, to: 1.0 },
        duration: Phaser.Math.Between(800, 1600),
        delay: Phaser.Math.Between(0, 500),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });

    // Lantern fixtures (compact)
    const fixtures = s.add.graphics().setDepth(ceilDepth + 0.2);
    lanterns.forEach(lamp => {
      fixtures.fillStyle(0x5A4020, 0.9);
      fixtures.fillRect(lamp.x - 8, 0, 16, 5);
      fixtures.lineStyle(1.5, 0x7A5830, 0.7);
      fixtures.lineBetween(lamp.x, 5, lamp.x, 16);
      fixtures.fillStyle(0x5A4020, 0.9);
      fixtures.fillRect(lamp.x - 6, 14, 12, 10);
      fixtures.fillStyle(0xFFCC44, 0.5);
      fixtures.fillRect(lamp.x - 4, 16, 8, 6);
      fixtures.fillStyle(0x4A3018, 0.9);
      fixtures.fillRect(lamp.x - 5, 24, 10, 2);
      fixtures.fillStyle(0xFFEE88, 0.8);
      fixtures.fillCircle(lamp.x, 19, 2);
    });
  }
}
