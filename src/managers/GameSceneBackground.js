/**
 * GameSceneBackground - Cantina walls with arched windows showing alien desert,
 * wooden service counter, kitchen surface
 */
import Phaser from 'phaser';
import { GAME_WIDTH, HALF_WIDTH } from '../data/constants.js';
import { darkenColor, lightenColor } from '../utils/colorUtils.js';

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

    // Warm wood counter surface
    g.fillStyle(0x5A4530, 1);
    g.fillRect(0, surfaceY, surfaceW, surfaceH);

    // Wood grain lines
    g.lineStyle(1, 0x6A5540, 0.15);
    for (let y = surfaceY + 3; y < surfaceY + surfaceH; y += 5) {
      g.lineBetween(0, y, surfaceW, y);
    }

    // Counter edge — brass trim
    g.fillStyle(s.CHROME_MID, 1);
    g.fillRect(0, surfaceY, surfaceW, 3);
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, surfaceY, surfaceW, 1);

    // Warm light reflection on surface
    g.fillStyle(0xC8A878, 0.06);
    g.fillRect(0, surfaceY + 3, surfaceW, 2);

    // Bottom shadow
    for (let i = 0; i < 8; i++) {
      const alpha = 0.025 * i;
      const yPos = surfaceY + surfaceH - 80 + i * 10;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, yPos, surfaceW, 10);
    }

    // Brass nail heads along top
    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + 12, 4);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + 11, 1.5);
    }

    // Bottom nail heads
    for (let x = 50; x < surfaceW; x += 100) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, surfaceY + surfaceH - 12, 4);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, surfaceY + surfaceH - 13, 1.5);
    }

    // Warm prep area glow
    g.fillStyle(0xC8A878, 0.04);
    g.fillRect(375, surfaceY + 60, 1170, 200);
  }

  createServiceCounter() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(3);
    const counterY = s.COUNTER_Y - 10;
    const counterH = 20;

    // Counter top — polished dark wood
    g.fillStyle(0x5A4020, 1);
    g.fillRect(0, counterY, GAME_WIDTH, counterH);

    // Top highlight (brass inlay)
    g.fillStyle(s.CHROME_HIGHLIGHT, 0.5);
    g.fillRect(0, counterY, GAME_WIDTH, 2);

    // Counter face (dark wood)
    g.fillStyle(0x3A2A18, 1);
    g.fillRect(0, counterY + 2, GAME_WIDTH, counterH - 2);

    // Wood grain lines
    g.lineStyle(1, 0x4A3A28, 0.15);
    for (let y = counterY + 4; y < counterY + counterH - 2; y += 3) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Bottom shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, counterY + counterH, GAME_WIDTH, 3);

    // "ORDER HERE" warm neon sign
    const signX = HALF_WIDTH;
    const signY = counterY + 6;

    // Neon glow behind text
    g.fillStyle(s.NEON_PINK, 0.15);
    g.fillEllipse(signX, signY + 3, 120, 14);

    // Neon line
    g.fillStyle(s.NEON_PINK, 0.6);
    g.fillRect(signX - 55, counterY + counterH - 2, 110, 2);

    // Warm chevron strip (wood + brass)
    const chevY = counterY - 5;
    g.fillStyle(0x2A1A10, 0.8);
    g.fillRect(0, chevY, GAME_WIDTH, 5);
    for (let x = 0; x < GAME_WIDTH; x += 20) {
      g.fillStyle(0xC8A060, 0.4);
      g.beginPath();
      g.moveTo(x, chevY);
      g.lineTo(x + 10, chevY);
      g.lineTo(x + 15, chevY + 5);
      g.lineTo(x + 5, chevY + 5);
      g.closePath();
      g.fillPath();
    }

    // Brass rivets along counter
    for (let x = 30; x < GAME_WIDTH; x += 60) {
      g.fillStyle(s.CHROME_DARK, 1);
      g.fillCircle(x, counterY + counterH / 2 + 1, 3);
      g.fillStyle(s.CHROME_HIGHLIGHT, 0.6);
      g.fillCircle(x - 0.5, counterY + counterH / 2, 1.2);
    }
  }

  createDesertBackground() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(0);

    // Deep desert sky fill behind windows
    g.fillStyle(s.SPACE_DEEP, 1);
    g.fillRect(0, s.WINDOW_TOP, GAME_WIDTH, s.WINDOW_HEIGHT);

    // Gradient sky: dark blue at top → warm orange at horizon
    const midY = (s.WINDOW_TOP + s.WINDOW_BOTTOM) / 2;

    // Upper sky — deep purple-blue
    g.fillStyle(0x1a1030, 0.6);
    g.fillRect(0, s.WINDOW_TOP, GAME_WIDTH, s.WINDOW_HEIGHT * 0.4);

    // Horizon glow — warm amber/orange
    g.fillStyle(0x442200, 0.3);
    g.fillEllipse(HALF_WIDTH, s.WINDOW_BOTTOM - 10, GAME_WIDTH * 1.2, 60);
    g.fillStyle(0x663300, 0.15);
    g.fillEllipse(HALF_WIDTH, s.WINDOW_BOTTOM, GAME_WIDTH, 40);

    // Large amber moon
    g.fillStyle(0xDD8844, 0.12);
    g.fillCircle(1550, s.WINDOW_TOP + 20, 30);
    g.fillStyle(0xDD8844, 0.3);
    g.fillCircle(1550, s.WINDOW_TOP + 20, 16);
    g.fillStyle(0xEEAA66, 0.2);
    g.fillCircle(1546, s.WINDOW_TOP + 17, 11);
    // Craters
    g.fillStyle(0xBB6633, 0.15);
    g.fillCircle(1545, s.WINDOW_TOP + 15, 3);
    g.fillCircle(1555, s.WINDOW_TOP + 23, 2);
    // Small distant moon
    g.fillStyle(0xccbbaa, 0.2);
    g.fillCircle(350, s.WINDOW_TOP + 28, 5);

    // Desert mesa silhouettes at horizon
    g.fillStyle(0x1a1008, 0.8);
    // Left mesa
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

    // Center mesa
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

    // Right mesa
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

    // Distant ships in the sky
    this.drawDistantShips(g, s);

    // Stars in the desert sky
    const stars = [];
    for (let i = 0; i < 25; i++) {
      stars.push({
        x: Phaser.Math.Between(50, GAME_WIDTH - 50),
        y: Phaser.Math.Between(s.WINDOW_TOP + 5, s.WINDOW_BOTTOM - 30),
        size: Phaser.Math.FloatBetween(0.4, 1.2),
        alpha: Phaser.Math.FloatBetween(0.3, 0.8),
      });
    }

    const starGraphics = [];
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

    // Vertical mortar lines (wider spacing — adobe blocks)
    for (let x = 160; x < GAME_WIDTH; x += 320) {
      hull.lineStyle(1, s.PANEL_SEAM, 0.2);
      hull.lineBetween(x, winTop, x, winBot);
    }

    // Stucco wear patches
    hull.fillStyle(s.HULL_LIGHT, 0.15);
    hull.fillEllipse(400, winTop + winH * 0.5, 100, 40);
    hull.fillStyle(s.HULL_DARK, 0.1);
    hull.fillEllipse(1200, winTop + winH * 0.3, 80, 30);

    // 4 arched windows
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
      // Rectangular base
      winGlass.fillRect(left, top + archH, windowW, windowH - archH);
      // Arch top
      winGlass.fillStyle(s.SMOKED_GLASS, s.SMOKED_GLASS_ALPHA);
      winGlass.beginPath();
      winGlass.moveTo(left, top + archH);
      winGlass.arc(px, top + archH, windowW / 2, Math.PI, 0, false);
      winGlass.closePath();
      winGlass.fillPath();

      // Warm amber glass tint
      winGlass.fillStyle(0x664422, 0.08);
      winGlass.fillRect(left + 2, top + archH, windowW - 4, windowH - archH - 2);

      // Glass highlight reflection
      winGlass.fillStyle(0xffffff, 0.06);
      winGlass.fillEllipse(px - 10, top + archH + 10, windowW * 0.4, 20);

      // Wooden frame — outer
      winFrame.lineStyle(5, s.BEAM_MID, 1);
      // Sides
      winFrame.lineBetween(left, top + archH, left, bot);
      winFrame.lineBetween(right, top + archH, right, bot);
      // Bottom
      winFrame.lineBetween(left, bot, right, bot);
      // Arch
      winFrame.beginPath();
      winFrame.arc(px, top + archH, windowW / 2, Math.PI, 0, false);
      winFrame.strokePath();

      // Inner frame highlight
      winFrame.lineStyle(1, s.BEAM_HIGHLIGHT, 0.5);
      winFrame.lineBetween(left + 3, top + archH, left + 3, bot - 2);
      winFrame.lineBetween(right - 3, top + archH, right - 3, bot - 2);

      // Keystone at arch top
      winFrame.fillStyle(s.CHROME_MID, 0.8);
      winFrame.beginPath();
      winFrame.moveTo(px - 8, top + 2);
      winFrame.lineTo(px + 8, top + 2);
      winFrame.lineTo(px + 6, top + 12);
      winFrame.lineTo(px - 6, top + 12);
      winFrame.closePath();
      winFrame.fillPath();

      // Windowsill
      winFrame.fillStyle(s.BEAM_LIGHT, 1);
      winFrame.fillRect(left - 4, bot, windowW + 8, 4);
      winFrame.fillStyle(s.BEAM_HIGHLIGHT, 0.4);
      winFrame.fillRect(left - 4, bot, windowW + 8, 1);
    });

    // Window stars — warm desert stars visible through glass
    const starColors = [0xffffff, 0xffcc88, 0xcc9966, 0xeeddcc];
    windowPositions.forEach(px => {
      const left = px - windowW / 2 + 6;
      const right = px + windowW / 2 - 6;
      const top = midY - windowH / 2 + 8;
      const bot = midY + windowH / 2 - 4;
      const numStars = Phaser.Math.Between(4, 6);
      for (let i = 0; i < numStars; i++) {
        const sx = Phaser.Math.Between(left, right);
        const sy = Phaser.Math.Between(top, bot - 15);
        const starSize = Phaser.Math.FloatBetween(0.5, 1.3);
        const starColor = Phaser.Utils.Array.GetRandom(starColors);
        const sg = s.add.graphics().setDepth(0.65);
        sg.fillStyle(starColor, 1);
        sg.fillCircle(0, 0, starSize);
        sg.setPosition(sx, sy);
        sg.setAlpha(Phaser.Math.FloatBetween(0.4, 0.9));
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

    s.portholePositions = windowPositions;
    s.portholeMidY = midY;

    // Top wood trim (above wall)
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

    // === DARK CEILING GRADIENT ===
    // Layered horizontal strips fading from opaque at top to transparent
    const shadow = s.add.graphics().setDepth(ceilDepth);
    const gradientH = 220;
    const strips = 22;
    const stripH = gradientH / strips;

    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);            // 0 = top, 1 = bottom
      const alpha = 0.55 * Math.pow(1 - t, 2); // quadratic falloff
      shadow.fillStyle(0x0a0600, alpha);
      shadow.fillRect(0, i * stripH, GAME_WIDTH, stripH + 1);
    }

    // Wooden beam across the ceiling edge (where shadow meets light)
    const beamY = gradientH - 6;
    shadow.fillStyle(0x2A1A10, 0.5);
    shadow.fillRect(0, beamY, GAME_WIDTH, 6);
    shadow.fillStyle(0x3A2A18, 0.25);
    shadow.fillRect(0, beamY, GAME_WIDTH, 1);

    // === WARM LIGHT CONES ===
    // Hanging lanterns cast trapezoidal warm pools downward
    const lanterns = [
      { x: 250,  spread: 160, reach: 280 },
      { x: 620,  spread: 140, reach: 250 },
      { x: 960,  spread: 180, reach: 300 },
      { x: 1300, spread: 140, reach: 250 },
      { x: 1680, spread: 160, reach: 280 },
    ];

    lanterns.forEach(lamp => {
      const coneG = s.add.graphics().setDepth(ceilDepth + 0.1);

      // Cone shape: narrow at ceiling, fans outward
      const topW = 12;
      const botW = lamp.spread;
      const coneTop = 4;
      const coneBot = lamp.reach;

      // Layered cone from bright core to faded edge
      const layers = 6;
      for (let i = layers - 1; i >= 0; i--) {
        const t = i / layers;
        const widthMult = 0.4 + t * 0.6;
        const tw = topW * widthMult;
        const bw = botW * widthMult;
        const alpha = 0.025 + (1 - t) * 0.04;

        coneG.fillStyle(0xFFCC88, alpha);
        coneG.beginPath();
        coneG.moveTo(lamp.x - tw, coneTop);
        coneG.lineTo(lamp.x + tw, coneTop);
        coneG.lineTo(lamp.x + bw, coneBot);
        coneG.lineTo(lamp.x - bw, coneBot);
        coneG.closePath();
        coneG.fillPath();
      }

      // Bright hotspot at the lantern source
      coneG.fillStyle(0xFFDD99, 0.12);
      coneG.fillCircle(lamp.x, 10, 18);
      coneG.fillStyle(0xFFEEBB, 0.06);
      coneG.fillCircle(lamp.x, 10, 30);

      // Pool of light on the floor/counter area
      coneG.fillStyle(0xFFCC88, 0.03);
      coneG.fillEllipse(lamp.x, coneBot + 20, botW * 1.4, 60);

      // Flicker animation — subtle alpha oscillation
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

    // === LANTERN FIXTURES (visible hardware at ceiling) ===
    const fixtures = s.add.graphics().setDepth(ceilDepth + 0.2);
    lanterns.forEach(lamp => {
      // Ceiling mount plate
      fixtures.fillStyle(0x5A4020, 0.9);
      fixtures.fillRect(lamp.x - 8, 0, 16, 5);

      // Chain
      fixtures.lineStyle(1.5, 0x7A5830, 0.7);
      fixtures.lineBetween(lamp.x, 5, lamp.x, 16);

      // Lantern housing
      fixtures.fillStyle(0x5A4020, 0.9);
      fixtures.fillRect(lamp.x - 6, 14, 12, 10);
      // Glass panel (glowing)
      fixtures.fillStyle(0xFFCC44, 0.5);
      fixtures.fillRect(lamp.x - 4, 16, 8, 6);
      // Bottom cap
      fixtures.fillStyle(0x4A3018, 0.9);
      fixtures.fillRect(lamp.x - 5, 24, 10, 2);
      // Bright filament
      fixtures.fillStyle(0xFFEE88, 0.8);
      fixtures.fillCircle(lamp.x, 19, 2);
    });
  }

  drawDistantShips(g, s) {
    const winTop = s.WINDOW_TOP;
    const winBot = s.WINDOW_BOTTOM;

    // Large freighter (far left, high altitude)
    g.fillStyle(0x2a1a10, 0.5);
    g.beginPath();
    g.moveTo(180, winTop + 18);
    g.lineTo(260, winTop + 14);
    g.lineTo(270, winTop + 20);
    g.lineTo(265, winTop + 24);
    g.lineTo(175, winTop + 24);
    g.closePath();
    g.fillPath();
    // Engine glow
    g.fillStyle(0xff8844, 0.25);
    g.fillCircle(175, winTop + 21, 3);

    // Small shuttle (mid-right, lower)
    g.fillStyle(0x2a1a10, 0.4);
    g.beginPath();
    g.moveTo(1300, winTop + 40);
    g.lineTo(1335, winTop + 36);
    g.lineTo(1340, winTop + 40);
    g.lineTo(1335, winTop + 44);
    g.lineTo(1300, winTop + 43);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff6633, 0.2);
    g.fillCircle(1298, winTop + 41, 2);

    // Large cruiser (right side, near horizon)
    g.fillStyle(0x1a1008, 0.5);
    g.beginPath();
    g.moveTo(1600, winBot - 55);
    g.lineTo(1700, winBot - 60);
    g.lineTo(1720, winBot - 56);
    g.lineTo(1715, winBot - 50);
    g.lineTo(1695, winBot - 48);
    g.lineTo(1600, winBot - 50);
    g.closePath();
    g.fillPath();
    // Bridge tower
    g.fillStyle(0x1a1008, 0.4);
    g.fillRect(1670, winBot - 66, 12, 8);
    // Engine trails
    g.fillStyle(0xff6633, 0.15);
    g.fillEllipse(1595, winBot - 52, 10, 3);

    // Tiny distant fighters (dot-sized, top area)
    g.fillStyle(0x3a2a18, 0.3);
    g.fillCircle(700, winTop + 12, 2);
    g.fillCircle(720, winTop + 15, 1.5);
    g.fillCircle(740, winTop + 11, 1.5);

    // Orbiting station (far right upper)
    g.fillStyle(0x2a1a10, 0.35);
    g.fillRect(1750, winTop + 22, 20, 4);
    g.fillRect(1756, winTop + 16, 8, 14);
    // Solar panels
    g.fillStyle(0x3a2a18, 0.25);
    g.fillRect(1745, winTop + 22, 6, 3);
    g.fillRect(1770, winTop + 22, 6, 3);
  }
}
