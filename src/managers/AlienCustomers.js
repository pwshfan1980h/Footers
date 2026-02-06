/**
 * AlienCustomers - NPCs that walk up to the bar and wait for orders
 */

export class AlienCustomers {
  constructor(scene) {
    this.scene = scene;
    this.aliens = [];
    this.gfx = null;
    this.maxAliens = 3; // Max visible at once
  }

  create() {
    this.gfx = this.scene.add.graphics().setDepth(12);
  }

  spawnAlien(tray) {
    // Spawn alien for this tray
    const alien = {
      tray: tray,
      x: -80, // Start off-screen left
      targetX: 100 + Math.random() * 150, // Walk to bar area
      y: 520 + Math.random() * 80, // Vary vertical position
      walkSpeed: 0.8 + Math.random() * 0.4,
      type: Math.floor(Math.random() * 4), // 4 alien types
      color: this.getAlienColor(Math.floor(Math.random() * 4)),
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.02 + Math.random() * 0.02,
      arrived: false,
      leaving: false,
      happiness: 0 // Will be set when order completes
    };

    this.aliens.push(alien);
  }

  getAlienColor(type) {
    const colors = [
      0x44ff88, // Green
      0xff44dd, // Pink
      0x44ddff, // Cyan
      0xffbb44  // Orange
    ];
    return colors[type % colors.length];
  }

  removeAlien(tray) {
    const alien = this.aliens.find(a => a.tray === tray);
    if (alien && alien.arrived) {
      alien.leaving = true;
    }
  }

  update(delta) {
    if (!this.gfx) return;

    // Update alien positions
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const alien = this.aliens[i];

      // Bob animation
      alien.bobPhase += alien.bobSpeed;

      if (alien.leaving) {
        // Walk off screen to the right
        alien.x += alien.walkSpeed * 2;
        if (alien.x > 1100) {
          this.aliens.splice(i, 1);
        }
      } else if (!alien.arrived) {
        // Walk toward bar
        alien.x += alien.walkSpeed;
        if (alien.x >= alien.targetX) {
          alien.arrived = true;
        }
      } else {
        // Idle at bar - small sway
        alien.x = alien.targetX + Math.sin(alien.bobPhase * 0.5) * 5;
      }

      // Check if associated tray is done
      if (alien.tray && (alien.tray.done || alien.tray.passedFinish)) {
        if (!alien.leaving) {
          alien.happiness = alien.tray.completed ? 1 : -1;
          alien.leaving = true;
        }
      }
    }

    this.render();
  }

  render() {
    const g = this.gfx;
    g.clear();

    for (const alien of this.aliens) {
      const bobOffset = Math.sin(alien.bobPhase) * 3;
      const x = alien.x;
      const y = alien.y + bobOffset;

      // Draw based on alien type
      if (alien.type === 0) {
        this.drawBlobAlien(g, x, y, alien.color, alien.arrived, alien.happiness);
      } else if (alien.type === 1) {
        this.drawTentacleAlien(g, x, y, alien.color, alien.arrived, alien.happiness);
      } else if (alien.type === 2) {
        this.drawEyeAlien(g, x, y, alien.color, alien.arrived, alien.happiness);
      } else {
        this.drawCrystalAlien(g, x, y, alien.color, alien.arrived, alien.happiness);
      }
    }
  }

  drawBlobAlien(g, x, y, color, arrived, happiness) {
    // Blob body
    g.fillStyle(color, 0.9);
    g.fillEllipse(x, y, 30, 40);

    // Eyes
    const eyeColor = happiness > 0 ? 0xffff00 : happiness < 0 ? 0xff0000 : 0xffffff;
    g.fillStyle(eyeColor, 1);
    g.fillCircle(x - 8, y - 8, 4);
    g.fillCircle(x + 8, y - 8, 4);

    // Pupils
    g.fillStyle(0x000000, 1);
    g.fillCircle(x - 8, y - 8, 2);
    g.fillCircle(x + 8, y - 8, 2);

    // Mouth
    if (happiness > 0) {
      // Happy smile
      g.lineStyle(2, 0x000000, 0.8);
      g.beginPath();
      g.arc(x, y + 5, 8, 0.2, Math.PI - 0.2);
      g.strokePath();
    } else if (happiness < 0) {
      // Sad frown
      g.lineStyle(2, 0x000000, 0.8);
      g.beginPath();
      g.arc(x, y + 15, 8, Math.PI + 0.2, Math.PI * 2 - 0.2);
      g.strokePath();
    }
  }

  drawTentacleAlien(g, x, y, color, arrived, happiness) {
    // Main body
    g.fillStyle(color, 0.9);
    g.fillCircle(x, y - 10, 25);

    // Tentacles
    g.lineStyle(6, color, 0.9);
    for (let i = 0; i < 3; i++) {
      const angle = -0.5 + i * 0.5;
      const wavePhase = Date.now() * 0.003 + i;
      const wave = Math.sin(wavePhase) * 5;
      const tx = x + Math.sin(angle) * 15 + wave;
      const ty = y + 10;
      g.lineBetween(x, y, tx, ty + 15);

      // Tentacle tip
      g.fillStyle(color, 1);
      g.fillCircle(tx, ty + 15, 3);
    }

    // Single eye
    const eyeColor = happiness > 0 ? 0xffff00 : happiness < 0 ? 0xff0000 : 0xffffff;
    g.fillStyle(eyeColor, 1);
    g.fillCircle(x, y - 10, 10);
    g.fillStyle(0x000000, 1);
    g.fillCircle(x, y - 10, 5);
  }

  drawEyeAlien(g, x, y, color, arrived, happiness) {
    // Hovering head
    g.fillStyle(color, 0.8);
    g.fillCircle(x, y - 5, 28);

    // Multiple eyes
    const eyePositions = [
      { x: -10, y: -8 },
      { x: 10, y: -8 },
      { x: 0, y: 5 }
    ];

    const eyeColor = happiness > 0 ? 0xffff00 : happiness < 0 ? 0xff0000 : 0xffffff;

    for (const pos of eyePositions) {
      g.fillStyle(eyeColor, 1);
      g.fillCircle(x + pos.x, y + pos.y, 6);
      g.fillStyle(0x000000, 1);
      g.fillCircle(x + pos.x, y + pos.y, 3);
    }

    // Floating particles under
    g.fillStyle(color, 0.3);
    for (let i = 0; i < 3; i++) {
      const py = y + 20 + i * 8 + Math.sin(Date.now() * 0.003 + i) * 3;
      g.fillCircle(x, py, 3 - i);
    }
  }

  drawCrystalAlien(g, x, y, color, arrived, happiness) {
    // Crystal body - angular geometric shape
    g.fillStyle(color, 0.85);
    g.beginPath();
    g.moveTo(x, y - 25);
    g.lineTo(x - 15, y - 5);
    g.lineTo(x - 10, y + 15);
    g.lineTo(x + 10, y + 15);
    g.lineTo(x + 15, y - 5);
    g.closePath();
    g.fillPath();

    // Crystal facets (highlights)
    g.fillStyle(0xffffff, 0.3);
    g.beginPath();
    g.moveTo(x, y - 25);
    g.lineTo(x - 5, y - 10);
    g.lineTo(x, y);
    g.closePath();
    g.fillPath();

    // Glowing core
    const coreColor = happiness > 0 ? 0xffff00 : happiness < 0 ? 0xff0000 : 0xffffff;
    const pulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
    g.fillStyle(coreColor, pulse);
    g.fillCircle(x, y - 5, 8);
  }
}
