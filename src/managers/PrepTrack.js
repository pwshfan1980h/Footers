/**
 * PrepTrack - Static preparation area where players build sandwiches
 * before moving them to the delivery belt
 */

export class PrepTrack {
  constructor(scene) {
    this.scene = scene;
    this.gfx = null;
    this.slots = [];
    this.numSlots = 1;

    // Prep track position (above veggie bowls, centered)
    this.trackY = 440;
    this.trackX = 400;
    this.slotWidth = 140;
    this.slotHeight = 90;
  }

  create() {
    this.gfx = this.scene.add.graphics().setDepth(5);

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
    const g = this.gfx;
    g.clear();

    // Draw single prep slot
    const slot = this.slots[0];
    if (!slot) return;

    // Wood cutting board colors
    const color = slot.occupied ? 0xB89868 : 0xC8A878;
    const borderColor = slot.occupied ? 0x44ff88 : 0x8B6A4A;

    g.fillStyle(color, 0.9);
    g.fillRoundedRect(
      slot.x - this.slotWidth / 2,
      slot.y - this.slotHeight / 2,
      this.slotWidth,
      this.slotHeight,
      6
    );

    // Wood grain lines inside
    const slotLeft = slot.x - this.slotWidth / 2;
    const slotTop = slot.y - this.slotHeight / 2;
    g.lineStyle(1, 0x9A7A58, 0.12);
    for (let y = slotTop + 4; y < slotTop + this.slotHeight - 4; y += 5) {
      g.lineBetween(slotLeft + 4, y, slotLeft + this.slotWidth - 4, y);
    }

    // Border
    g.lineStyle(2, borderColor, slot.occupied ? 0.8 : 0.5);
    g.strokeRoundedRect(
      slot.x - this.slotWidth / 2,
      slot.y - this.slotHeight / 2,
      this.slotWidth,
      this.slotHeight,
      6
    );

    // Label when empty
    if (!slot.occupied) {
      g.fillStyle(0x8B6A4A, 0.3);
      g.fillCircle(slot.x, slot.y, 18);
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
          fontFamily: 'Arial',
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
