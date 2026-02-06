/**
 * RobotArm - Multi-segment articulated arm that follows cursor
 * Positioned at top center of screen near Time UI
 * 7 segments × 62px = 434px total reach
 */

export class RobotArm {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.numSegments = 7;
    this.segmentLength = 62;
    this.gfx = null;

    // Base position (top center near Time UI)
    this.baseX = 512; // Center of 1024 width
    this.baseY = 80;  // Top area near UI

    // Target position (cursor)
    this.targetX = 512;
    this.targetY = 300;

    // Smoothing
    this.smoothingFactor = 0.15;

    // Grip state
    this.isGripping = false;
  }

  create() {
    this.gfx = this.scene.add.graphics().setDepth(105);

    // Initialize segments
    for (let i = 0; i < this.numSegments; i++) {
      this.segments.push({
        x: this.baseX,
        y: this.baseY + i * this.segmentLength,
        angle: Math.PI / 2, // Start pointing down
      });
    }
  }

  setTarget(x, y) {
    // Smooth target movement
    this.targetX += (x - this.targetX) * this.smoothingFactor;
    this.targetY += (y - this.targetY) * this.smoothingFactor;
  }

  setGripping(bool) {
    this.isGripping = bool;
  }

  update() {
    if (!this.gfx) return;

    // FABRIK (Forward And Backward Reaching Inverse Kinematics)
    this.forwardReach();
    this.backwardReach();
    this.render();
  }

  forwardReach() {
    // Start from the end and work backwards
    const lastSegment = this.segments[this.numSegments - 1];

    // Set end effector to target
    const dx = this.targetX - lastSegment.x;
    const dy = this.targetY - lastSegment.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const ratio = Math.min(1, this.segmentLength / dist);
      lastSegment.x = this.targetX - dx * ratio;
      lastSegment.y = this.targetY - dy * ratio;
    }

    // Update rest of segments backward from end
    for (let i = this.numSegments - 2; i >= 0; i--) {
      const segment = this.segments[i];
      const nextSegment = this.segments[i + 1];

      const dx = segment.x - nextSegment.x;
      const dy = segment.y - nextSegment.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const ratio = this.segmentLength / dist;
        segment.x = nextSegment.x + dx * ratio;
        segment.y = nextSegment.y + dy * ratio;
      }
    }
  }

  backwardReach() {
    // Fix base to original position
    const baseSegment = this.segments[0];
    baseSegment.x = this.baseX;
    baseSegment.y = this.baseY;

    // Update rest of segments forward from base
    for (let i = 1; i < this.numSegments; i++) {
      const prevSegment = this.segments[i - 1];
      const segment = this.segments[i];

      const dx = segment.x - prevSegment.x;
      const dy = segment.y - prevSegment.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const ratio = this.segmentLength / dist;
        segment.x = prevSegment.x + dx * ratio;
        segment.y = prevSegment.y + dy * ratio;
      }

      // Calculate angle for rendering
      segment.angle = Math.atan2(dy, dx);
    }

    // Calculate angle for first segment
    if (this.segments.length > 1) {
      const dx = this.segments[1].x - this.segments[0].x;
      const dy = this.segments[1].y - this.segments[0].y;
      this.segments[0].angle = Math.atan2(dy, dx);
    }
  }

  render() {
    const g = this.gfx;
    g.clear();

    // Color scheme - match chrome/metallic aesthetic
    const metalDark = 0x3a3a48;
    const metalMid = 0x5a5a68;
    const metalLight = 0x7a7a88;
    const accentCyan = 0x00ddee;
    const accentOrange = 0xee9933;

    // Draw base mount
    g.fillStyle(metalDark, 1);
    g.fillCircle(this.baseX, this.baseY, 18);
    g.fillStyle(metalMid, 1);
    g.fillCircle(this.baseX, this.baseY, 14);

    // Base bolts
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const bx = this.baseX + Math.cos(angle) * 10;
      const by = this.baseY + Math.sin(angle) * 10;
      g.fillStyle(metalDark, 1);
      g.fillCircle(bx, by, 2.5);
      g.fillStyle(accentCyan, 0.7);
      g.fillCircle(bx, by, 1.2);
    }

    // Draw segments
    for (let i = 0; i < this.numSegments; i++) {
      const segment = this.segments[i];
      const nextSegment = this.segments[i + 1];

      if (nextSegment) {
        const width = 14 - i * 1.5; // Taper toward end (safe for 7 segments)

        // Draw segment body
        this.drawSegment(
          g,
          segment.x, segment.y,
          nextSegment.x, nextSegment.y,
          width,
          metalMid,
          metalLight
        );

        // Draw joint
        g.fillStyle(metalDark, 1);
        g.fillCircle(nextSegment.x, nextSegment.y, Math.max(3, 9 - i * 0.8));

        // Joint accent
        const accentColor = i % 2 === 0 ? accentOrange : accentCyan;
        g.fillStyle(accentColor, 0.8);
        g.fillCircle(nextSegment.x, nextSegment.y, Math.max(1.5, 4.5 - i * 0.4));
      }
    }

    // Draw end effector (gripper)
    const endSegment = this.segments[this.numSegments - 1];
    g.fillStyle(metalDark, 1);
    g.fillCircle(endSegment.x, endSegment.y, 10);

    // Gripper prongs — spread changes based on grip state
    const prongAngle = endSegment.angle + Math.PI / 2;
    const prongLen = 16;
    const spread = this.isGripping ? 0.12 : 0.35;

    g.lineStyle(4, metalMid, 1);
    g.lineBetween(
      endSegment.x, endSegment.y,
      endSegment.x + Math.cos(prongAngle - spread) * prongLen,
      endSegment.y + Math.sin(prongAngle - spread) * prongLen
    );
    g.lineBetween(
      endSegment.x, endSegment.y,
      endSegment.x + Math.cos(prongAngle + spread) * prongLen,
      endSegment.y + Math.sin(prongAngle + spread) * prongLen
    );

    // Prong tips
    g.fillStyle(accentOrange, 1);
    const tip1X = endSegment.x + Math.cos(prongAngle - spread) * prongLen;
    const tip1Y = endSegment.y + Math.sin(prongAngle - spread) * prongLen;
    const tip2X = endSegment.x + Math.cos(prongAngle + spread) * prongLen;
    const tip2Y = endSegment.y + Math.sin(prongAngle + spread) * prongLen;
    g.fillCircle(tip1X, tip1Y, 3);
    g.fillCircle(tip2X, tip2Y, 3);
  }

  drawSegment(g, x1, y1, x2, y2, width, colorMain, colorHighlight) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpX = Math.cos(angle + Math.PI / 2) * width / 2;
    const perpY = Math.sin(angle + Math.PI / 2) * width / 2;

    g.fillStyle(colorMain, 1);
    g.beginPath();
    g.moveTo(x1 + perpX, y1 + perpY);
    g.lineTo(x2 + perpX, y2 + perpY);
    g.lineTo(x2 - perpX, y2 - perpY);
    g.lineTo(x1 - perpX, y1 - perpY);
    g.closePath();
    g.fillPath();

    // Highlight edge
    g.lineStyle(1.5, colorHighlight, 0.6);
    g.lineBetween(x1 + perpX, y1 + perpY, x2 + perpX, y2 + perpY);
  }
}
