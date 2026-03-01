/**
 * PrepTrack - 3 preparation positions aligned with customer counter slots.
 * Each slot is a cutting board where a tray appears when a customer orders.
 */
import { GAME_FONT } from '../data/constants.js';

export class PrepTrack {
  constructor(scene) {
    this.scene = scene;
    this.gfx = null;
    this.slots = [];
    this.numSlots = 3;

    this.trackY = 550;
    this.slotWidth = 180;
    this.slotHeight = 120;

    // X positions aligned with customer counter slots
    this.slotPositions = [430, 960, 1490];
  }

  create() {
    this.glowGfx = this.scene.add.graphics().setDepth(4);
    this.gfx = this.scene.add.graphics().setDepth(5);
    this.pulseTweens = [];

    for (let i = 0; i < this.numSlots; i++) {
      this.slots.push({
        x: this.slotPositions[i],
        y: this.trackY,
        tray: null,
        occupied: false,
        index: i,
        selected: false,
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

    // Kill old pulse tweens
    this.pulseTweens.forEach(t => { if (t) t.destroy(); });
    this.pulseTweens = [];

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      this.renderSlot(g, glow, slot, i);
    }

    this.drawSlotLabels();
  }

  renderSlot(g, glow, slot, index) {
    const s = this.scene;
    const slotLeft = slot.x - this.slotWidth / 2;
    const slotTop = slot.y - this.slotHeight / 2;

    const isSelected = slot.selected;
    const isOccupied = slot.occupied;

    // Glow ellipse behind the board
    let glowColor, glowAlpha;
    if (isSelected) {
      glowColor = 0xFFBB44;
      glowAlpha = 0.25;
    } else if (isOccupied) {
      glowColor = 0xC8A878;
      glowAlpha = 0.12;
    } else {
      glowColor = 0x607888;
      glowAlpha = 0.08;
    }

    glow.fillStyle(glowColor, glowAlpha);
    glow.fillEllipse(slot.x, slot.y, this.slotWidth + 30, this.slotHeight + 20);
    if (isSelected) {
      glow.fillStyle(glowColor, glowAlpha * 0.5);
      glow.fillEllipse(slot.x, slot.y, this.slotWidth + 55, this.slotHeight + 40);
    }

    // Drop shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(slotLeft + 3, slotTop + 3, this.slotWidth, this.slotHeight, 8);

    // Wood cutting board
    const color = isOccupied ? 0xB89868 : 0xC8A878;
    const boardAlpha = isOccupied && !isSelected ? 0.6 : 0.9;

    g.fillStyle(color, boardAlpha);
    g.fillRoundedRect(slotLeft, slotTop, this.slotWidth, this.slotHeight, 8);

    // Wood grain
    g.lineStyle(1, 0x9A7A58, 0.12);
    for (let y = slotTop + 4; y < slotTop + this.slotHeight - 4; y += 5) {
      g.lineBetween(slotLeft + 4, y, slotLeft + this.slotWidth - 4, y);
    }

    // Border — selected gets bright gold, occupied gets dim, empty gets steel
    let borderColor, borderAlpha;
    if (isSelected) {
      borderColor = 0xFFBB44;
      borderAlpha = 0.95;
    } else if (isOccupied) {
      borderColor = 0x8B6A4A;
      borderAlpha = 0.4;
    } else {
      borderColor = 0x607888;
      borderAlpha = 0.3;
    }

    g.lineStyle(isSelected ? 3 : 2, borderColor, borderAlpha);
    g.strokeRoundedRect(slotLeft, slotTop, this.slotWidth, this.slotHeight, 8);

    // Corner brackets for selected slot only
    if (isSelected) {
      const bracketLen = 12;
      const bracketInset = 4;
      g.lineStyle(2, 0xFFBB44, 0.9);
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
    }

    // Slot number when empty
    if (!isOccupied) {
      g.fillStyle(0x607888, 0.2);
      g.fillCircle(slot.x, slot.y, 16);
    }
  }

  drawSlotLabels() {
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
          color: '#506070'
        }).setOrigin(0.5).setDepth(6);
        this.slotLabels.push(label);
      }
    }
  }

  findEmptySlot() {
    return this.slots.find(s => !s.occupied);
  }

  findSlotByIndex(index) {
    return this.slots[index] || null;
  }

  setSelectedSlot(slotIndex) {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].selected = (i === slotIndex);
    }
    this.render();
  }

  clearSelection() {
    for (const slot of this.slots) {
      slot.selected = false;
    }
    this.render();
  }

  removeTray(slot) {
    if (!slot || !slot.occupied) return;

    if (slot.tray) {
      slot.tray.prepSlot = null;
      slot.tray.onPrepTrack = false;
    }

    slot.occupied = false;
    slot.tray = null;
    slot.selected = false;

    this.render();
  }
}
