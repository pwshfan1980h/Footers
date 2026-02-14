/**
 * CustomerDeck - Cantina interior customer area with swinging saloon doors,
 * standing positions, and warm decorative elements between the windows and counter.
 */
import { GAME_WIDTH } from '../data/constants.js';
import { soundManager } from '../SoundManager.js';

export class CustomerDeck {
  constructor(scene) {
    this.scene = scene;
    this.doorState = 'closed'; // closed | opening | open | closing
    this.doorProgress = 0; // 0 = closed, 1 = fully open
    this.doorQueue = []; // callbacks waiting for door open/close
    this.gfx = null;
    this.doorGfx = null;
  }

  create() {
    const s = this.scene;
    const deckTop = s.CUSTOMER_DECK_TOP;
    const deckBot = s.CUSTOMER_DECK_BOTTOM;
    const deckH = deckBot - deckTop;

    this.gfx = s.add.graphics().setDepth(1.0);
    this.doorGfx = s.add.graphics().setDepth(1.5);

    const g = this.gfx;

    // === WALLS (warm adobe interior) ===
    g.fillStyle(0x5A4530, 1);
    g.fillRect(0, deckTop, GAME_WIDTH, deckH);

    // Stucco texture (horizontal cracks)
    g.lineStyle(1, 0x4A3520, 0.2);
    g.lineBetween(0, deckTop + 25, GAME_WIDTH, deckTop + 25);
    g.lineBetween(0, deckTop + deckH * 0.55, GAME_WIDTH, deckTop + deckH * 0.55);

    // Vertical mortar lines
    for (let x = 200; x < GAME_WIDTH; x += 250) {
      g.lineStyle(1, 0x4A3520, 0.15);
      g.lineBetween(x, deckTop, x, deckBot);
    }

    // Warm wear patches on walls
    g.fillStyle(0x6A5538, 0.15);
    g.fillEllipse(400, deckTop + 40, 120, 30);
    g.fillStyle(0x4A3520, 0.1);
    g.fillEllipse(1400, deckTop + 50, 80, 25);

    // === FLOOR (warm stone/tile) ===
    const floorY = deckTop + deckH * 0.45;
    g.fillStyle(0x3A2A18, 1);
    g.fillRect(0, floorY, GAME_WIDTH, deckBot - floorY);

    // Stone floor tile lines
    g.lineStyle(1, 0x2A1A10, 0.2);
    for (let y = floorY + 12; y < deckBot; y += 18) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
    for (let x = 60; x < GAME_WIDTH; x += 140) {
      g.lineStyle(1, 0x2A1A10, 0.15);
      g.lineBetween(x, floorY, x, deckBot);
    }

    // === OVERHEAD LIGHTING (warm lanterns) ===
    const lightY = deckTop + 6;

    // Warm lantern glow strips
    g.fillStyle(0xFFCC88, 0.15);
    g.fillRect(180, lightY, 300, 4);
    g.fillRect(800, lightY, 350, 4);
    g.fillRect(1450, lightY, 300, 4);

    // Lantern halos
    g.fillStyle(0xFFCC88, 0.08);
    g.fillEllipse(330, lightY + 25, 400, 50);
    g.fillEllipse(975, lightY + 25, 500, 50);
    g.fillEllipse(1600, lightY + 25, 400, 50);

    // Small hanging lantern fixtures
    const lanternX = [250, 500, 900, 1100, 1500, 1750];
    lanternX.forEach(lx => {
      // Chain
      g.lineStyle(1, 0x7A5830, 0.6);
      g.lineBetween(lx, deckTop, lx, deckTop + 12);
      // Lantern body
      g.fillStyle(0x7A5830, 0.8);
      g.fillRect(lx - 4, deckTop + 10, 8, 8);
      // Warm glow
      g.fillStyle(0xFFCC44, 0.25);
      g.fillCircle(lx, deckTop + 14, 6);
      g.fillStyle(0xFFCC44, 0.1);
      g.fillCircle(lx, deckTop + 18, 12);
    });

    // === DOOR FRAME ===
    const alX = s.DOOR_X;
    const alY = s.DOOR_Y;
    const alR = s.DOOR_RADIUS;
    const doorW = alR * 2 + 6;
    const doorH = alR * 2 + 20;
    const doorTop = alY - alR - 10;

    // Wooden door frame
    g.fillStyle(0x3A2A18, 1);
    g.fillRect(alX - doorW / 2 - 6, doorTop - 8, doorW + 12, doorH + 16);

    // Frame inner beveled edge
    g.fillStyle(0x4A3A28, 1);
    g.fillRect(alX - doorW / 2 - 3, doorTop - 4, doorW + 6, doorH + 8);

    // Opening behind doors (dark interior)
    g.fillStyle(0x120a05, 1);
    g.fillRect(alX - doorW / 2, doorTop, doorW, doorH);

    // Frame highlight
    g.lineStyle(2, 0x5A4A30, 0.6);
    g.strokeRect(alX - doorW / 2 - 4, doorTop - 6, doorW + 8, doorH + 12);

    // "ENTRANCE" sign (brass plate above door)
    const labelGfx = s.add.graphics().setDepth(1.2);
    labelGfx.fillStyle(0x7A5830, 0.8);
    labelGfx.fillRoundedRect(alX - 55, doorTop - 24, 110, 18, 4);
    labelGfx.fillStyle(0xC8A060, 0.6);
    labelGfx.fillRoundedRect(alX - 52, doorTop - 21, 104, 13, 3);

    // === BAR RAILING (replaces handrails) ===
    const railY = deckTop + 55;
    const railGap = doorW / 2 + 16; // gap around door frame
    const railLeftEnd = alX - railGap;
    const railRightStart = alX + railGap;
    // Dark wood railing
    g.fillStyle(0x5A4020, 0.8);
    g.fillRect(112, railY, railLeftEnd - 112, 4);
    g.fillRect(railRightStart, railY, 1808 - railRightStart, 4);
    // Rail highlight
    g.fillStyle(0x7A6040, 0.4);
    g.fillRect(112, railY, railLeftEnd - 112, 1);
    g.fillRect(railRightStart, railY, 1808 - railRightStart, 1);
    // Rail supports (turned wood posts)
    for (let x = 112; x <= railLeftEnd - 20; x += 160) {
      g.fillStyle(0x4A3020, 0.9);
      g.fillRect(x, railY, 5, 14);
      g.fillStyle(0x6A5040, 0.5);
      g.fillCircle(x + 2, railY + 7, 3);
    }
    for (let x = railRightStart + 20; x <= 1808; x += 160) {
      g.fillStyle(0x4A3020, 0.9);
      g.fillRect(x, railY, 5, 14);
      g.fillStyle(0x6A5040, 0.5);
      g.fillCircle(x + 2, railY + 7, 3);
    }

    // === DECORATIVE ELEMENTS ===

    // Wanted poster (left wall)
    g.fillStyle(0xD4C4A0, 0.5);
    g.fillRect(130, deckTop + 12, 24, 30);
    g.lineStyle(1, 0x8A7A5A, 0.4);
    g.strokeRect(130, deckTop + 12, 24, 30);

    // Neon "OPEN" sign (right wall)
    g.fillStyle(0xFF8844, 0.25);
    g.fillRoundedRect(1740, deckTop + 12, 40, 18, 4);
    g.fillStyle(0xFF8844, 0.1);
    g.fillCircle(1760, deckTop + 21, 16);

    // Standing position markers (subtle floor marks)
    const positions = this.getStandingPositions();
    positions.forEach(pos => {
      g.fillStyle(0x4A3A20, 0.3);
      g.fillEllipse(pos.x, deckBot - 12, 30, 6);
    });

    // Draw initial saloon doors (closed)
    this.drawDoors();
  }

  getStandingPositions() {
    return [
      { x: 300, y: 395 },
      { x: 731, y: 395 },
      { x: 1189, y: 395 },
      { x: 1620, y: 395 },
    ];
  }

  drawDoors() {
    const s = this.scene;
    const g = this.doorGfx;
    g.clear();

    const cx = s.DOOR_X;
    const cy = s.DOOR_Y;
    const R = s.DOOR_RADIUS;
    const progress = this.doorProgress;

    if (progress >= 1) return; // fully open

    // Swinging saloon doors (two panels that swing outward)
    const doorW = R;
    const doorH = R * 2 + 10;
    const doorTop = cy - R - 5;

    // Swing angle: 0 (closed) to PI/2.5 (open)
    const swingAngle = progress * (Math.PI / 2.5);

    // Door panel apparent width shrinks as it swings open (perspective)
    const apparentW = doorW * Math.cos(swingAngle);

    // Left door
    const leftDoorX = cx - apparentW;
    if (apparentW > 1) {
      // Door panel (dark wood)
      g.fillStyle(0x4A3020, 1);
      g.fillRect(leftDoorX, doorTop, apparentW, doorH);

      // Panel detail (raised rectangle)
      const panelInset = Math.max(2, apparentW * 0.15);
      g.fillStyle(0x5A4030, 0.8);
      g.fillRect(leftDoorX + panelInset, doorTop + 8, apparentW - panelInset * 2, doorH * 0.35);
      g.fillRect(leftDoorX + panelInset, doorTop + doorH * 0.5, apparentW - panelInset * 2, doorH * 0.35);

      // Hinge (top and bottom)
      g.fillStyle(0x7A5830, 0.9);
      g.fillCircle(leftDoorX, doorTop + 10, 3);
      g.fillCircle(leftDoorX, doorTop + doorH - 10, 3);

      // Edge highlight
      g.fillStyle(0x6A5040, 0.5);
      g.fillRect(leftDoorX + apparentW - 1, doorTop, 1, doorH);
    }

    // Right door
    const rightDoorX = cx;
    if (apparentW > 1) {
      g.fillStyle(0x4A3020, 1);
      g.fillRect(rightDoorX, doorTop, apparentW, doorH);

      const panelInset = Math.max(2, apparentW * 0.15);
      g.fillStyle(0x5A4030, 0.8);
      g.fillRect(rightDoorX + panelInset, doorTop + 8, apparentW - panelInset * 2, doorH * 0.35);
      g.fillRect(rightDoorX + panelInset, doorTop + doorH * 0.5, apparentW - panelInset * 2, doorH * 0.35);

      // Hinge
      g.fillStyle(0x7A5830, 0.9);
      g.fillCircle(rightDoorX + apparentW, doorTop + 10, 3);
      g.fillCircle(rightDoorX + apparentW, doorTop + doorH - 10, 3);

      // Edge highlight
      g.fillStyle(0x6A5040, 0.5);
      g.fillRect(rightDoorX, doorTop, 1, doorH);
    }

    // Warm light spill when doors are partially open
    if (progress > 0.1 && progress < 1) {
      const gapW = (doorW - apparentW) * 2;
      g.fillStyle(0xFFCC88, 0.08 + progress * 0.12);
      g.fillRect(cx - gapW / 2, doorTop, gapW, doorH);
    }
  }

  requestDoorOpen(callback) {
    if (this.doorState === 'open') {
      if (callback) callback();
      return;
    }
    if (callback) this.doorQueue.push({ type: 'open', cb: callback });
    if (this.doorState === 'closed' || this.doorState === 'closing') {
      this.doorState = 'opening';
      soundManager.doorCreak();
    }
  }

  requestDoorClose(callback) {
    if (this.doorState === 'closed') {
      if (callback) callback();
      return;
    }
    if (callback) this.doorQueue.push({ type: 'close', cb: callback });
    if (this.doorState === 'open' || this.doorState === 'opening') {
      this.doorState = 'closing';
    }
  }

  update(delta) {
    const speed = delta / 400;

    if (this.doorState === 'opening') {
      this.doorProgress = Math.min(1, this.doorProgress + speed);
      if (this.doorProgress >= 1) {
        this.doorProgress = 1;
        this.doorState = 'open';
        this._flushQueue('open');
      }
      this.drawDoors();
    } else if (this.doorState === 'closing') {
      this.doorProgress = Math.max(0, this.doorProgress - speed);
      if (this.doorProgress <= 0) {
        this.doorProgress = 0;
        this.doorState = 'closed';
        this._flushQueue('close');
      }
      this.drawDoors();
    }
  }

  _flushQueue(type) {
    const remaining = [];
    for (const item of this.doorQueue) {
      if (item.type === type) {
        item.cb();
      } else {
        remaining.push(item);
      }
    }
    this.doorQueue = remaining;
  }
}
