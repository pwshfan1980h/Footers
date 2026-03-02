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

    // Simplified wall block
    g.fillStyle(0x4b3a2c, 1);
    g.fillRect(0, deckTop, GAME_WIDTH, deckH);
    g.fillStyle(0x3a2d22, 0.4);
    g.fillRect(0, deckTop, GAME_WIDTH, 12);
    g.fillStyle(0x5c4534, 0.2);
    g.fillRect(0, deckBot - 20, GAME_WIDTH, 20);

    // Clean base strip above counter
    g.fillStyle(0x1f2430, 0.75);
    g.fillRect(0, deckBot - 6, GAME_WIDTH, 10);

    // Door frame aligned to counter start
    const doorBase = s.COUNTER_Y - 6;
    const doorH = 150;
    const doorTop = doorBase - doorH;
    const doorW = 140;
    const alX = s.DOOR_X;

    g.fillStyle(0x2e2620, 1);
    g.fillRect(alX - doorW / 2 - 6, doorTop - 8, doorW + 12, doorH + 16);

    g.fillStyle(0x3b2f28, 1);
    g.fillRect(alX - doorW / 2 - 3, doorTop - 4, doorW + 6, doorH + 8);

    g.fillStyle(0x0c0a0a, 1);
    g.fillRect(alX - doorW / 2, doorTop, doorW, doorH);

    g.lineStyle(2, 0x5A4A30, 0.6);
    g.strokeRect(alX - doorW / 2 - 4, doorTop - 6, doorW + 8, doorH + 12);

    // Subtle floor anchors for standing positions
    const positions = this.getStandingPositions();
    positions.forEach(pos => {
      g.fillStyle(0x000000, 0.12);
      g.fillEllipse(pos.x, doorBase + 4, 42, 10);
    });

    // Update derived door geometry for swing drawing
    this.doorHeight = doorH;
    this.doorTop = doorTop;
    this.doorBase = doorBase;

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
    const doorH = this.doorHeight || (s.DOOR_RADIUS * 2 + 10);
    const doorTop = this.doorTop || (s.DOOR_Y - s.DOOR_RADIUS - 5);
    const R = doorH / 2 - 5;
    const cy = doorTop + doorH / 2;
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
