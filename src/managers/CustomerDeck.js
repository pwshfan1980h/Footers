/**
 * CustomerDeck - Interior customer reception area with airlock, standing positions,
 * and decorative elements drawn between the hull portholes and the service counter.
 */
import { GAME_WIDTH } from '../data/constants.js';

export class CustomerDeck {
  constructor(scene) {
    this.scene = scene;
    this.airlockState = 'closed'; // closed | opening | open | closing
    this.airlockProgress = 0; // 0 = closed, 1 = fully open
    this.airlockQueue = []; // callbacks waiting for airlock open/close
    this.gfx = null;
    this.airlockGfx = null;
  }

  create() {
    const s = this.scene;
    const deckTop = s.CUSTOMER_DECK_TOP;
    const deckBot = s.CUSTOMER_DECK_BOTTOM;
    const deckH = deckBot - deckTop;

    this.gfx = s.add.graphics().setDepth(1.0);
    this.airlockGfx = s.add.graphics().setDepth(1.5);

    const g = this.gfx;

    // === WALLS ===
    // Cool blue-gray interior walls
    g.fillStyle(0x3A4555, 1);
    g.fillRect(0, deckTop, GAME_WIDTH, deckH);

    // Wall panel seams (horizontal)
    g.lineStyle(1, 0x2A3545, 0.3);
    g.lineBetween(0, deckTop + 30, GAME_WIDTH, deckTop + 30);
    g.lineBetween(0, deckTop + deckH * 0.6, GAME_WIDTH, deckTop + deckH * 0.6);

    // Wall panel seams (vertical)
    for (let x = 170; x < GAME_WIDTH; x += 215) {
      g.lineStyle(1, 0x2A3545, 0.25);
      g.lineBetween(x, deckTop, x, deckBot);
    }

    // === FLOOR ===
    // Dark blue-gray deck plating at the bottom half
    const floorY = deckTop + deckH * 0.45;
    g.fillStyle(0x2A3545, 1);
    g.fillRect(0, floorY, GAME_WIDTH, deckBot - floorY);

    // Floor panel lines
    g.lineStyle(1, 0x1A2535, 0.25);
    for (let y = floorY + 10; y < deckBot; y += 15) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
    for (let x = 50; x < GAME_WIDTH; x += 128) {
      g.lineStyle(1, 0x1A2535, 0.2);
      g.lineBetween(x, floorY, x, deckBot);
    }

    // === OVERHEAD LIGHTING ===
    // Warm fluorescent glow strips
    const lightY = deckTop + 8;
    g.fillStyle(0xFFEECC, 0.12);
    g.fillRect(150, lightY, 375, 4);
    g.fillRect(750, lightY, 469, 4);
    g.fillRect(1406, lightY, 375, 4);

    // Light glow halos
    g.fillStyle(0xFFEECC, 0.06);
    g.fillEllipse(338, lightY + 20, 450, 40);
    g.fillEllipse(984, lightY + 20, 563, 40);
    g.fillEllipse(1594, lightY + 20, 450, 40);

    // === CIRCULAR AIRLOCK FRAME ===
    const alX = s.AIRLOCK_X;
    const alY = s.AIRLOCK_Y;
    const alR = s.AIRLOCK_RADIUS;

    // Outer warning ring
    g.lineStyle(3, 0xCCAA00, 0.3);
    g.strokeCircle(alX, alY, alR + 10);

    // Heavy chrome outer ring
    g.lineStyle(6, 0x606878, 1);
    g.strokeCircle(alX, alY, alR + 5);
    // Inner chrome ring
    g.lineStyle(3, 0x505060, 1);
    g.strokeCircle(alX, alY, alR + 1);

    // Highlight arc (top half — catches light)
    g.lineStyle(2, 0x707888, 0.6);
    g.beginPath();
    g.arc(alX, alY, alR + 6, -Math.PI * 0.85, -Math.PI * 0.15);
    g.strokePath();

    // Shadow arc (bottom half)
    g.lineStyle(2, 0x404858, 0.8);
    g.beginPath();
    g.arc(alX, alY, alR + 6, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();

    // Bolts at 8 positions around the frame
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const bx = alX + Math.cos(angle) * (alR + 6);
      const by = alY + Math.sin(angle) * (alR + 6);
      g.fillStyle(0x505060, 1);
      g.fillCircle(bx, by, 2.5);
      g.fillStyle(0x707888, 0.6);
      g.fillCircle(bx - 0.5, by - 0.5, 1);
    }

    // Inner rim (recessed edge visible when door is open)
    g.lineStyle(1, 0x2A3545, 0.6);
    g.strokeCircle(alX, alY, alR - 1);

    // "AIRLOCK" label above
    const labelGfx = s.add.graphics().setDepth(1.2);
    labelGfx.fillStyle(0x404050, 0.8);
    labelGfx.fillRoundedRect(alX - 30, alY - alR - 22, 60, 12, 3);

    // === HANDRAILS ===
    const railY = deckTop + 55;
    g.fillStyle(0x707888, 0.7);
    g.fillRect(112, railY, 713, 3);
    g.fillRect(1095, railY, 713, 3);
    // Rail highlight
    g.fillStyle(0x909AA8, 0.4);
    g.fillRect(112, railY, 713, 1);
    g.fillRect(1095, railY, 713, 1);
    // Rail supports
    for (let x = 112; x <= 825; x += 178) {
      g.fillStyle(0x606878, 0.8);
      g.fillRect(x, railY, 4, 12);
    }
    for (let x = 1095; x <= 1808; x += 178) {
      g.fillStyle(0x606878, 0.8);
      g.fillRect(x, railY, 4, 12);
    }

    // === DECORATIVE ELEMENTS ===

    // Ceiling camera dome (top left)
    g.fillStyle(0x333344, 0.9);
    g.fillCircle(150, deckTop + 14, 6);
    g.fillStyle(0x555566, 0.7);
    g.fillCircle(150, deckTop + 13, 3);
    g.fillStyle(0xFF4444, 0.6);
    g.fillCircle(152, deckTop + 12, 1.5);

    // "NO SMOKING" sign (tiny, right wall)
    g.fillStyle(0xCC2222, 0.5);
    g.fillCircle(1781, deckTop + 22, 5);
    g.lineStyle(1.5, 0xffffff, 0.5);
    g.lineBetween(1778, deckTop + 19, 1784, deckTop + 25);

    // Standing position markers (subtle floor dots)
    const positions = this.getStandingPositions();
    positions.forEach(pos => {
      g.fillStyle(0x555544, 0.3);
      g.fillEllipse(pos.x, deckBot - 12, 30, 6);
    });

    // Draw initial airlock doors (closed)
    this.drawAirlockDoors();
  }

  getStandingPositions() {
    return [
      { x: 300, y: this.scene.CUSTOMER_DECK_BOTTOM - 30 },
      { x: 731, y: this.scene.CUSTOMER_DECK_BOTTOM - 30 },
      { x: 1189, y: this.scene.CUSTOMER_DECK_BOTTOM - 30 },
      { x: 1620, y: this.scene.CUSTOMER_DECK_BOTTOM - 30 },
    ];
  }

  drawAirlockDoors() {
    const s = this.scene;
    const g = this.airlockGfx;
    g.clear();

    const cx = s.AIRLOCK_X;
    const cy = s.AIRLOCK_Y;
    const R = s.AIRLOCK_RADIUS;
    const progress = this.airlockProgress;

    if (progress >= 1) return; // fully open — nothing to draw

    // Iris aperture: 8 overlapping blades that rotate open
    const numBlades = 8;
    const bladeArc = (Math.PI * 2) / numBlades;
    // Inner tip retreats from center toward edge as door opens
    const innerR = R * progress * 0.95;

    for (let i = 0; i < numBlades; i++) {
      const baseAngle = i * bladeArc - Math.PI / 2;
      // Blades rotate outward as door opens
      const rotAngle = baseAngle + progress * bladeArc * 0.6;
      // Blade angular width (overlap when closed, shrinks slightly when opening)
      const halfArc = bladeArc * 0.7 * (1 - progress * 0.2);

      // Alternate blade shade for depth
      g.fillStyle(i % 2 === 0 ? 0x606878 : 0x586070, 1);
      g.beginPath();

      // Inner tip point
      const tipX = cx + Math.cos(rotAngle) * innerR;
      const tipY = cy + Math.sin(rotAngle) * innerR;
      g.moveTo(tipX, tipY);

      // Arc along the outer edge of the airlock
      const startAngle = rotAngle - halfArc;
      const endAngle = rotAngle + halfArc;
      const steps = 10;
      for (let j = 0; j <= steps; j++) {
        const a = startAngle + (endAngle - startAngle) * (j / steps);
        g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      }

      g.closePath();
      g.fillPath();

      // Blade edge line (structural detail)
      g.lineStyle(1, 0x707888, 0.35);
      g.lineBetween(
        tipX, tipY,
        cx + Math.cos(startAngle) * R,
        cy + Math.sin(startAngle) * R
      );
    }

    // Center hub (visible when partially open)
    if (progress > 0.05 && progress < 0.95) {
      const hubR = Math.max(2, innerR * 0.15);
      g.fillStyle(0x505060, 0.7);
      g.fillCircle(cx, cy, hubR);
    }

    // Glow ring around iris opening when animating
    if (progress > 0 && progress < 1) {
      const openR = R * progress;
      g.lineStyle(2, 0x88DDFF, 0.12 + progress * 0.18);
      g.strokeCircle(cx, cy, openR);
    }
  }

  requestAirlockOpen(callback) {
    if (this.airlockState === 'open') {
      if (callback) callback();
      return;
    }
    if (callback) this.airlockQueue.push({ type: 'open', cb: callback });
    if (this.airlockState === 'closed' || this.airlockState === 'closing') {
      this.airlockState = 'opening';
    }
  }

  requestAirlockClose(callback) {
    if (this.airlockState === 'closed') {
      if (callback) callback();
      return;
    }
    if (callback) this.airlockQueue.push({ type: 'close', cb: callback });
    if (this.airlockState === 'open' || this.airlockState === 'opening') {
      this.airlockState = 'closing';
    }
  }

  update(delta) {
    const speed = delta / 400; // ~400ms to fully open/close

    if (this.airlockState === 'opening') {
      this.airlockProgress = Math.min(1, this.airlockProgress + speed);
      if (this.airlockProgress >= 1) {
        this.airlockProgress = 1;
        this.airlockState = 'open';
        this._flushQueue('open');
      }
      this.drawAirlockDoors();
    } else if (this.airlockState === 'closing') {
      this.airlockProgress = Math.max(0, this.airlockProgress - speed);
      if (this.airlockProgress <= 0) {
        this.airlockProgress = 0;
        this.airlockState = 'closed';
        this._flushQueue('close');
      }
      this.drawAirlockDoors();
    }
  }

  _flushQueue(type) {
    const remaining = [];
    for (const item of this.airlockQueue) {
      if (item.type === type) {
        item.cb();
      } else {
        remaining.push(item);
      }
    }
    this.airlockQueue = remaining;
  }
}
