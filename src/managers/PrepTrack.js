/**
 * PrepTrack - Static preparation area where players build sandwiches
 */
import { GAME_FONT } from '../data/constants.js';

export class PrepTrack {
  constructor(scene) {
    this.scene = scene;
    this.gfx = null;
    this.slots = [];
    this.numSlots = 1;

    // Prep track position (above veggie bowls, centered)
    this.trackY = 380;
    this.trackX = 400;
    this.slotWidth = 140;
    this.slotHeight = 90;
  }

  create() {
    this.glowGfx = this.scene.add.graphics().setDepth(4);
    this.gfx = this.scene.add.graphics().setDepth(5);
    this.pulseTween = null;

    // Initialize prep slots
    for (let i = 0; i < this.numSlots; i++) {
      this.slots.push({
        x: this.trackX + i * (this.slotWidth + 20),
        y: this.trackY,
        tray: null, // Reference to tray in this slot
        occupied: false
      });
    }

    this.render();
  }

  render() {
    const s = this.scene;
    const g = this.gfx;
    const glow = this.glowGfx;
    g.clear();
    glow.clear();

    // Draw single prep slot
    const slot = this.slots[0];
    if (!slot) return;

    const slotLeft = slot.x - this.slotWidth / 2;
    const slotTop = slot.y - this.slotHeight / 2;

    // Glow ellipse behind the board
    const glowColor = slot.occupied ? 0x44ff88 : 0x4488ff;
    glow.fillStyle(glowColor, 0.18);
    glow.fillEllipse(slot.x, slot.y, this.slotWidth + 30, this.slotHeight + 20);
    glow.fillStyle(glowColor, 0.08);
    glow.fillEllipse(slot.x, slot.y, this.slotWidth + 55, this.slotHeight + 40);

    // Drop shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(slotLeft + 3, slotTop + 3, this.slotWidth, this.slotHeight, 8);

    // Wood cutting board
    const color = slot.occupied ? 0xB89868 : 0xC8A878;
    const borderColor = slot.occupied ? 0x44ff88 : 0x8B6A4A;

    g.fillStyle(color, 0.9);
    g.fillRoundedRect(slotLeft, slotTop, this.slotWidth, this.slotHeight, 8);

    // Wood grain lines inside
    g.lineStyle(1, 0x9A7A58, 0.12);
    for (let y = slotTop + 4; y < slotTop + this.slotHeight - 4; y += 5) {
      g.lineBetween(slotLeft + 4, y, slotLeft + this.slotWidth - 4, y);
    }

    // Knife-mark scratches
    g.lineStyle(1, 0x8A6A48, 0.15);
    g.lineBetween(slotLeft + 20, slotTop + 12, slotLeft + 24, slotTop + 28);
    g.lineBetween(slotLeft + 55, slotTop + 18, slotLeft + 58, slotTop + 38);
    g.lineBetween(slotLeft + 90, slotTop + 8, slotLeft + 94, slotTop + 30);
    g.lineBetween(slotLeft + 110, slotTop + 22, slotLeft + 113, slotTop + 42);
    g.lineBetween(slotLeft + 35, slotTop + 50, slotLeft + 40, slotTop + 72);

    // Border
    g.lineStyle(3, borderColor, slot.occupied ? 0.8 : 0.5);
    g.strokeRoundedRect(slotLeft, slotTop, this.slotWidth, this.slotHeight, 8);

    // Corner brackets
    const bracketLen = 12;
    const bracketInset = 4;
    const bracketColor = slot.occupied ? 0x44ff88 : 0x8B6A4A;
    const bracketAlpha = slot.occupied ? 0.9 : 0.4;
    g.lineStyle(2, bracketColor, bracketAlpha);
    // Top-left
    g.lineBetween(slotLeft + bracketInset, slotTop + bracketInset, slotLeft + bracketInset + bracketLen, slotTop + bracketInset);
    g.lineBetween(slotLeft + bracketInset, slotTop + bracketInset, slotLeft + bracketInset, slotTop + bracketInset + bracketLen);
    // Top-right
    g.lineBetween(slotLeft + this.slotWidth - bracketInset, slotTop + bracketInset, slotLeft + this.slotWidth - bracketInset - bracketLen, slotTop + bracketInset);
    g.lineBetween(slotLeft + this.slotWidth - bracketInset, slotTop + bracketInset, slotLeft + this.slotWidth - bracketInset, slotTop + bracketInset + bracketLen);
    // Bottom-left
    g.lineBetween(slotLeft + bracketInset, slotTop + this.slotHeight - bracketInset, slotLeft + bracketInset + bracketLen, slotTop + this.slotHeight - bracketInset);
    g.lineBetween(slotLeft + bracketInset, slotTop + this.slotHeight - bracketInset, slotLeft + bracketInset, slotTop + this.slotHeight - bracketInset - bracketLen);
    // Bottom-right
    g.lineBetween(slotLeft + this.slotWidth - bracketInset, slotTop + this.slotHeight - bracketInset, slotLeft + this.slotWidth - bracketInset - bracketLen, slotTop + this.slotHeight - bracketInset);
    g.lineBetween(slotLeft + this.slotWidth - bracketInset, slotTop + this.slotHeight - bracketInset, slotLeft + this.slotWidth - bracketInset, slotTop + this.slotHeight - bracketInset - bracketLen);

    // Label when empty
    if (!slot.occupied) {
      g.fillStyle(0x8B6A4A, 0.3);
      g.fillCircle(slot.x, slot.y, 18);
    }

    // Pulse tween on glow when empty, stop when occupied
    if (!slot.occupied) {
      if (!this.pulseTween || !this.pulseTween.isPlaying()) {
        this.pulseTween = s.tweens.add({
          targets: glow,
          alpha: { from: 1.0, to: 0.4 },
          duration: 1200,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      if (this.pulseTween) {
        this.pulseTween.destroy();
        this.pulseTween = null;
      }
      glow.setAlpha(1.0);
    }

    // Draw slot label text
    this.drawSlotLabels();
  }

  drawSlotLabels() {
    // Clean up old labels
    if (this.slotLabels) {
      this.slotLabels.forEach(label => label.destroy());
    }
    this.slotLabels = [];

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.occupied) {
        const label = this.scene.add.text(slot.x, slot.y, `${i + 1}`, {
          fontSize: '24px',
          fontFamily: GAME_FONT,
          color: '#666666'
        }).setOrigin(0.5).setDepth(6);
        this.slotLabels.push(label);
      }
    }
  }

  // Find empty slot for tray
  findEmptySlot() {
    return this.slots.find(s => !s.occupied);
  }

  // Remove tray from slot
  removeTray(slot) {
    if (!slot.occupied) return;

    if (slot.tray) {
      slot.tray.prepSlot = null;
      slot.tray.onPrepTrack = false;
    }

    slot.occupied = false;
    slot.tray = null;

    this.render();
  }

}
