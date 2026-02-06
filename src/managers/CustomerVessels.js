import Phaser from 'phaser';

/**
 * CustomerVessels — Large ships park in the deep window background.
 * Each ship dispatches an EVA-suited customer who floats to the pickup window,
 * waits for their order, then jetpacks back to their ship and departs.
 *
 * The tray/order is hidden until the customer reaches the window.
 * onArrive callback reveals the order.
 *
 * Ship states:  arriving → parked → (customer EVAs) → departing → gone
 * Customer states: waiting_ship | eva_to_window | at_window | eva_to_ship | boarded
 */
export class CustomerVessels {
  constructor(scene) {
    this.scene = scene;
    this.customers = [];

    // 4 docking slots — ships far back (y:165-230), customers float to window (y:350-380)
    this.slots = [
      { shipX: 180, shipY: 185, windowX: 140, windowY: 365, occupied: false },
      { shipX: 400, shipY: 175, windowX: 370, windowY: 370, occupied: false },
      { shipX: 620, shipY: 190, windowX: 600, windowY: 362, occupied: false },
      { shipX: 840, shipY: 180, windowX: 830, windowY: 368, occupied: false },
    ];

    // Ship visual definitions — 5 types
    this.shipDefs = [
      { name: 'corvette',  color: 0x6688CC, accent: 0x88AAEE },
      { name: 'hauler',    color: 0x99887A, accent: 0xBBAA99 },
      { name: 'yacht',     color: 0xCC7788, accent: 0xEE99AA },
      { name: 'runabout',  color: 0x77AA77, accent: 0x99CC99 },
      { name: 'interceptor', color: 0xCC9944, accent: 0xEEBB66 },
    ];

    // Suit variants — each has distinct visual traits
    this.suitVariants = [
      { name: 'standard',  suitColor: null, visorColor: 0x88DDFF, visorShape: 'round',
        hasToolBelt: false, hasShoulder: false, hasStripes: false, hasAntenna: true, helmetDeco: null },
      { name: 'heavy',     suitColor: null, visorColor: 0xAADDFF, visorShape: 'wide',
        hasToolBelt: false, hasShoulder: true,  hasStripes: false, hasAntenna: true, helmetDeco: null },
      { name: 'engineer',  suitColor: null, visorColor: 0xFFDD88, visorShape: 'round',
        hasToolBelt: true,  hasShoulder: false, hasStripes: false, hasAntenna: false, helmetDeco: 'lamp' },
      { name: 'slim',      suitColor: null, visorColor: 0x88FFCC, visorShape: 'narrow',
        hasToolBelt: false, hasShoulder: false, hasStripes: true,  hasAntenna: true, helmetDeco: null },
      { name: 'vip',       suitColor: null, visorColor: 0xFFBB88, visorShape: 'round',
        hasToolBelt: false, hasShoulder: false, hasStripes: false, hasAntenna: true, helmetDeco: 'crest' },
      { name: 'military',  suitColor: null, visorColor: 0xFF8888, visorShape: 'slit',
        hasToolBelt: true,  hasShoulder: true,  hasStripes: false, hasAntenna: false, helmetDeco: null },
      { name: 'explorer',  suitColor: null, visorColor: 0xBBFFFF, visorShape: 'bubble',
        hasToolBelt: false, hasShoulder: false, hasStripes: true,  hasAntenna: true, helmetDeco: 'cam' },
    ];
  }

  create() {
    // nothing — per-customer graphics
  }

  /**
   * @param {object} tray
   * @param {function} onArrive — called when customer reaches the window
   */
  dockVessel(tray, onArrive) {
    const slot = this.slots.find(s => !s.occupied);
    if (!slot) return;
    slot.occupied = true;

    const shipDef = Phaser.Utils.Array.GetRandom(this.shipDefs);

    // Pick suit variant and tint it to ship color
    const suitBase = Phaser.Utils.Array.GetRandom(this.suitVariants);
    const suitDef = { ...suitBase, suitColor: this.darkenColor(shipDef.color, 0.85) };

    const customer = {
      tray,
      slot,
      shipDef,
      suitDef,
      onArrive,

      // Ship
      shipX: -120,
      shipY: slot.shipY + Phaser.Math.Between(-8, 8),
      shipTargetX: slot.shipX,
      shipTargetY: slot.shipY + Phaser.Math.Between(-8, 8),
      shipState: 'arriving',
      shipBob: Math.random() * Math.PI * 2,
      shipGfx: this.scene.add.graphics().setDepth(0.4),

      // Person
      personX: 0,
      personY: 0,
      personTargetX: slot.windowX,
      personTargetY: slot.windowY,
      personScale: 0.35,
      personTargetScale: 1.6, // much bigger at window
      personState: 'waiting_ship',
      personBob: Math.random() * Math.PI * 2,
      personFacing: 1,
      personGfx: this.scene.add.graphics().setDepth(0.6),
      numText: null,

      // Idle animation
      idleTimer: 0,
      idleAction: 'none', // none | look_left | look_right
      idleActionTimer: 0,
      headTurn: 0, // -1 left, 0 center, 1 right
    };

    this.customers.push(customer);
  }

  undockVessel(tray) {
    const c = this.customers.find(v => v.tray === tray);
    if (!c) return;

    if (c.personState === 'at_window' || c.personState === 'eva_to_window') {
      c.personState = 'eva_to_ship';
      c.personFacing = -1;
      c.personTargetX = c.shipX;
      c.personTargetY = c.shipY;
      c.personTargetScale = 0.35;
    } else {
      c.shipState = 'departing';
    }
  }

  update(delta) {
    const dt = delta / 16;

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];

      this.updateShip(c, dt);
      this.updatePerson(c, dt);
      this.updateIdle(c, dt);

      this.drawShip(c);
      this.drawPerson(c);

      if (c.shipState === 'gone') {
        c.shipGfx.destroy();
        c.personGfx.destroy();
        if (c.numText) c.numText.destroy();
        if (c.slot) c.slot.occupied = false;
        this.customers.splice(i, 1);
      }
    }
  }

  // ======================== SHIP UPDATE ========================

  updateShip(c, dt) {
    if (c.shipState === 'arriving') {
      c.shipX += (c.shipTargetX - c.shipX) * 0.025 * dt;
      c.shipY += (c.shipTargetY - c.shipY) * 0.025 * dt;

      if (Math.abs(c.shipX - c.shipTargetX) < 3) {
        c.shipX = c.shipTargetX;
        c.shipY = c.shipTargetY;
        c.shipState = 'parked';
        c.personX = c.shipX;
        c.personY = c.shipY;
        c.personScale = 0.35;
        c.personState = 'eva_to_window';
        c.personFacing = 1;
      }
    } else if (c.shipState === 'parked') {
      c.shipBob += 0.015 * dt;
      c.shipY = c.shipTargetY + Math.sin(c.shipBob) * 2;
    } else if (c.shipState === 'departing') {
      c.shipX += 3.0 * dt;
      if (c.shipX > 1150) c.shipState = 'gone';
    }
  }

  // ======================== PERSON UPDATE ========================

  updatePerson(c, dt) {
    if (c.personState === 'eva_to_window') {
      c.personX += (c.personTargetX - c.personX) * 0.04 * dt;
      c.personY += (c.personTargetY - c.personY) * 0.04 * dt;
      c.personScale += (c.personTargetScale - c.personScale) * 0.04 * dt;
      c.personBob += 0.04 * dt;

      if (Math.abs(c.personX - c.personTargetX) < 3 &&
          Math.abs(c.personY - c.personTargetY) < 3) {
        c.personX = c.personTargetX;
        c.personY = c.personTargetY;
        c.personScale = c.personTargetScale;
        c.personState = 'at_window';
        // Fire arrival callback — this reveals the order
        if (c.onArrive) c.onArrive();
      }
    } else if (c.personState === 'at_window') {
      c.personBob += 0.03 * dt;
      c.personY = c.slot.windowY + Math.sin(c.personBob) * 2;
    } else if (c.personState === 'eva_to_ship') {
      c.personTargetX = c.shipX;
      c.personTargetY = c.shipY;
      c.personX += (c.personTargetX - c.personX) * 0.05 * dt;
      c.personY += (c.personTargetY - c.personY) * 0.05 * dt;
      c.personScale += (c.personTargetScale - c.personScale) * 0.05 * dt;
      c.personBob += 0.04 * dt;

      if (Math.abs(c.personX - c.personTargetX) < 5 && c.personScale < 0.4) {
        c.personState = 'boarded';
        c.shipState = 'departing';
      }
    }
  }

  // ======================== IDLE ANIMATION ========================

  updateIdle(c, dt) {
    if (c.personState !== 'at_window') {
      c.headTurn = 0;
      return;
    }

    // Rare idle triggers
    c.idleTimer += dt;
    if (c.idleAction === 'none') {
      // ~2% chance per frame at 60fps ≈ triggers every ~1-2s on average
      if (c.idleTimer > 60 && Math.random() < 0.008) {
        c.idleAction = Math.random() < 0.5 ? 'look_left' : 'look_right';
        c.idleActionTimer = 40 + Math.random() * 60; // hold for 0.7-1.7s
        c.idleTimer = 0;
      }
    } else {
      // Execute the look
      const targetTurn = c.idleAction === 'look_left' ? -1 : 1;
      c.headTurn += (targetTurn - c.headTurn) * 0.1 * dt;

      c.idleActionTimer -= dt;
      if (c.idleActionTimer <= 0) {
        c.idleAction = 'none';
      }
    }

    // Return head to center when idle
    if (c.idleAction === 'none') {
      c.headTurn += (0 - c.headTurn) * 0.08 * dt;
    }
  }

  // ======================== SHIP DRAWING ========================

  drawShip(c) {
    const g = c.shipGfx;
    g.clear();
    if (c.shipState === 'gone') return;

    const { shipX: x, shipY: y, shipDef: def } = c;
    const col = def.color;
    const acc = def.accent;

    if (def.name === 'corvette') {
      g.fillStyle(col, 0.85);
      g.beginPath();
      g.moveTo(x + 50, y);
      g.lineTo(x + 15, y - 18);
      g.lineTo(x - 35, y - 22);
      g.lineTo(x - 45, y - 12);
      g.lineTo(x - 35, y);
      g.lineTo(x - 45, y + 12);
      g.lineTo(x - 35, y + 22);
      g.lineTo(x + 15, y + 18);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x88DDFF, 0.7);
      g.fillEllipse(x + 30, y, 14, 8);
      g.fillStyle(0x4488FF, 0.6);
      g.fillCircle(x - 40, y - 8, 5);
      g.fillCircle(x - 40, y + 8, 5);
      g.lineStyle(1, acc, 0.4);
      g.lineBetween(x - 20, y - 15, x + 20, y - 10);
      g.lineBetween(x - 20, y + 15, x + 20, y + 10);
    } else if (def.name === 'hauler') {
      g.fillStyle(col, 0.85);
      g.fillRect(x - 40, y - 15, 80, 30);
      g.fillStyle(acc, 0.7);
      g.fillRect(x + 20, y - 22, 20, 10);
      g.fillStyle(0x88DDFF, 0.6);
      g.fillRect(x + 28, y - 20, 10, 6);
      g.fillStyle(0x776655, 0.8);
      g.fillRect(x - 35, y - 12, 18, 10);
      g.fillRect(x - 35, y + 2, 18, 10);
      g.fillRect(x - 12, y - 12, 18, 10);
      g.fillRect(x - 12, y + 2, 18, 10);
      g.fillStyle(0xFFAA44, 0.5);
      g.fillRect(x - 44, y - 8, 6, 16);
    } else if (def.name === 'yacht') {
      g.fillStyle(col, 0.85);
      g.beginPath();
      g.moveTo(x + 45, y);
      g.lineTo(x + 20, y - 14);
      g.lineTo(x - 25, y - 16);
      g.lineTo(x - 40, y - 8);
      g.lineTo(x - 40, y + 8);
      g.lineTo(x - 25, y + 16);
      g.lineTo(x + 20, y + 14);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x88DDFF, 0.6);
      g.fillEllipse(x + 10, y - 8, 20, 5);
      g.fillEllipse(x + 10, y + 8, 20, 5);
      g.lineStyle(1, 0xCCCCDD, 0.5);
      g.strokeEllipse(x, y, 70, 28);
      g.fillStyle(0xFF88AA, 0.5);
      g.fillCircle(x - 38, y, 6);
    } else if (def.name === 'runabout') {
      g.fillStyle(col, 0.85);
      g.fillEllipse(x, y, 60, 24);
      g.fillStyle(acc, 0.6);
      g.fillEllipse(x + 15, y, 22, 14);
      g.fillStyle(0x88DDFF, 0.7);
      g.fillEllipse(x + 18, y, 14, 9);
      g.fillStyle(col, 0.7);
      g.beginPath();
      g.moveTo(x - 10, y - 12); g.lineTo(x - 25, y - 20); g.lineTo(x - 20, y - 12);
      g.closePath(); g.fillPath();
      g.beginPath();
      g.moveTo(x - 10, y + 12); g.lineTo(x - 25, y + 20); g.lineTo(x - 20, y + 12);
      g.closePath(); g.fillPath();
      g.fillStyle(0x44FF88, 0.5);
      g.fillCircle(x - 30, y, 5);
    } else if (def.name === 'interceptor') {
      g.fillStyle(col, 0.85);
      g.beginPath();
      g.moveTo(x + 55, y);
      g.lineTo(x + 10, y - 8);
      g.lineTo(x - 15, y - 25);
      g.lineTo(x - 35, y - 20);
      g.lineTo(x - 30, y);
      g.lineTo(x - 35, y + 20);
      g.lineTo(x - 15, y + 25);
      g.lineTo(x + 10, y + 8);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xFFDD44, 0.7);
      g.fillRect(x + 15, y - 3, 20, 6);
      g.fillStyle(0x555555, 0.8);
      g.fillRect(x + 40, y - 3, 8, 2);
      g.fillRect(x + 40, y + 1, 8, 2);
      g.fillStyle(0xFF8844, 0.6);
      g.fillCircle(x - 33, y - 14, 5);
      g.fillCircle(x - 33, y + 14, 5);
    }

    g.fillStyle(acc, 0.08);
    g.fillCircle(x, y, 50);
  }

  // ======================== PERSON DRAWING ========================

  drawPerson(c) {
    const g = c.personGfx;
    g.clear();
    if (c.personState === 'waiting_ship' || c.personState === 'boarded') return;
    if (c.shipState === 'gone') return;

    const { personX: x, personY: baseY, personScale: sc, personFacing: face, suitDef: suit } = c;
    const suitCol = suit.suitColor;
    const visorCol = suit.visorColor;
    const bobOffset = Math.sin(c.personBob) * 2 * sc;
    const y = baseY + bobOffset;

    // Jetpack flame (when moving)
    if (c.personState === 'eva_to_window' || c.personState === 'eva_to_ship') {
      const flameX = x - face * 7 * sc;
      const flameY = y + 10 * sc;
      g.fillStyle(0xFF8844, 0.6);
      g.fillCircle(flameX, flameY, 5 * sc);
      g.fillStyle(0xFFDD88, 0.4);
      g.fillCircle(flameX - face * 4 * sc, flameY + 3 * sc, 3.5 * sc);
    }

    // Legs
    g.fillStyle(suitCol, 0.9);
    g.fillRect(x - 6 * sc, y + 12 * sc, 5 * sc, 12 * sc);
    g.fillRect(x + 1 * sc, y + 12 * sc, 5 * sc, 12 * sc);
    // Boots
    g.fillStyle(0x444444, 0.9);
    g.fillRoundedRect(x - 7 * sc, y + 22 * sc, 6 * sc, 4 * sc, 1.5 * sc);
    g.fillRoundedRect(x + 1 * sc, y + 22 * sc, 6 * sc, 4 * sc, 1.5 * sc);

    // Body / torso
    g.fillStyle(suitCol, 0.95);
    g.fillRoundedRect(x - 8 * sc, y - 5 * sc, 16 * sc, 19 * sc, 3 * sc);

    // Suit variant: stripes
    if (suit.hasStripes) {
      g.fillStyle(0xFFFFFF, 0.15);
      g.fillRect(x - 7 * sc, y + 2 * sc, 14 * sc, 2 * sc);
      g.fillRect(x - 7 * sc, y + 7 * sc, 14 * sc, 2 * sc);
    }

    // Chest panel
    g.fillStyle(0xDDDDDD, 0.25);
    g.fillRect(x - 4 * sc, y + 1 * sc, 8 * sc, 8 * sc);

    // Suit variant: tool belt
    if (suit.hasToolBelt) {
      g.fillStyle(0x554433, 0.8);
      g.fillRect(x - 9 * sc, y + 10 * sc, 18 * sc, 3 * sc);
      // Small tools
      g.fillStyle(0x888888, 0.7);
      g.fillRect(x - 7 * sc, y + 10 * sc, 2 * sc, 5 * sc);
      g.fillRect(x + 3 * sc, y + 10 * sc, 2 * sc, 4 * sc);
    }

    // Suit variant: shoulder pads
    if (suit.hasShoulder) {
      g.fillStyle(suitCol, 1);
      g.fillEllipse(x - 10 * sc, y - 2 * sc, 8 * sc, 6 * sc);
      g.fillEllipse(x + 10 * sc, y - 2 * sc, 8 * sc, 6 * sc);
      g.lineStyle(1 * sc, 0xFFFFFF, 0.15);
      g.strokeEllipse(x - 10 * sc, y - 2 * sc, 8 * sc, 6 * sc);
      g.strokeEllipse(x + 10 * sc, y - 2 * sc, 8 * sc, 6 * sc);
    }

    // Backpack / jetpack
    g.fillStyle(0x555566, 0.85);
    g.fillRoundedRect(x - 10 * sc - face * 2 * sc, y - 3 * sc, 6 * sc, 14 * sc, 2 * sc);
    // Jetpack nozzle
    g.fillStyle(0x777788, 0.7);
    g.fillCircle(x - 7 * sc - face * 2 * sc, y + 12 * sc, 2 * sc);

    // Arms (wave gently)
    const armWave = Math.sin(c.personBob * 1.3) * 3 * sc;
    g.fillStyle(suitCol, 0.9);
    g.fillRect(x - 12 * sc, y + armWave, 5 * sc, 12 * sc);
    g.fillRect(x + 7 * sc, y - armWave, 5 * sc, 12 * sc);
    // Gloves
    g.fillStyle(0xDDDDDD, 0.8);
    g.fillCircle(x - 10 * sc, y + 12 * sc + armWave, 3 * sc);
    g.fillCircle(x + 10 * sc, y + 12 * sc - armWave, 3 * sc);

    // === HELMET (the dominant feature) ===
    const helmetR = 13 * sc;
    const headTurnOff = c.headTurn * 4 * sc; // lateral offset for look animation

    // Helmet shell
    g.fillStyle(suitCol, 1);
    g.fillCircle(x + headTurnOff, y - 12 * sc, helmetR);

    // Visor (shape varies by variant)
    const vx = x + headTurnOff + face * 2 * sc;
    const vy = y - 12 * sc;

    if (suit.visorShape === 'round') {
      g.fillStyle(visorCol, 0.8);
      g.fillEllipse(vx, vy, helmetR * 1.3, helmetR * 1.2);
    } else if (suit.visorShape === 'wide') {
      g.fillStyle(visorCol, 0.8);
      g.fillRoundedRect(vx - helmetR * 0.9, vy - helmetR * 0.4, helmetR * 1.8, helmetR * 0.9, 3 * sc);
    } else if (suit.visorShape === 'narrow') {
      g.fillStyle(visorCol, 0.8);
      g.fillRoundedRect(vx - helmetR * 0.7, vy - helmetR * 0.25, helmetR * 1.4, helmetR * 0.5, 2 * sc);
    } else if (suit.visorShape === 'slit') {
      g.fillStyle(visorCol, 0.85);
      g.fillRoundedRect(vx - helmetR * 0.8, vy - 2 * sc, helmetR * 1.6, 5 * sc, 2 * sc);
    } else if (suit.visorShape === 'bubble') {
      g.fillStyle(visorCol, 0.6);
      g.fillCircle(vx, vy, helmetR * 0.95);
      g.lineStyle(1 * sc, visorCol, 0.3);
      g.strokeCircle(vx, vy, helmetR * 1.05);
    }

    // Visor reflection
    g.fillStyle(0xFFFFFF, 0.3);
    g.fillEllipse(vx - 3 * sc, vy - 3 * sc, 4 * sc, 3 * sc);

    // Helmet rim
    g.lineStyle(1.5 * sc, suitCol, 0.8);
    g.strokeCircle(x + headTurnOff, y - 12 * sc, helmetR);

    // Helmet decorations
    if (suit.helmetDeco === 'lamp') {
      // Headlamp
      g.fillStyle(0xFFFF88, 0.9);
      g.fillCircle(x + headTurnOff, y - 12 * sc - helmetR + 2 * sc, 3 * sc);
      g.fillStyle(0xFFFF88, 0.2);
      g.fillCircle(x + headTurnOff, y - 12 * sc - helmetR + 2 * sc, 6 * sc);
    } else if (suit.helmetDeco === 'crest') {
      // VIP crest / mohawk
      g.fillStyle(0xFFDD44, 0.8);
      g.beginPath();
      g.moveTo(x + headTurnOff - 3 * sc, y - 12 * sc - helmetR);
      g.lineTo(x + headTurnOff, y - 12 * sc - helmetR - 6 * sc);
      g.lineTo(x + headTurnOff + 3 * sc, y - 12 * sc - helmetR);
      g.closePath();
      g.fillPath();
    } else if (suit.helmetDeco === 'cam') {
      // Camera mount
      g.fillStyle(0x666666, 0.9);
      g.fillRect(x + headTurnOff + helmetR * 0.5, y - 16 * sc, 4 * sc, 4 * sc);
      g.fillStyle(0xFF4444, 0.8);
      g.fillCircle(x + headTurnOff + helmetR * 0.5 + 2 * sc, y - 17 * sc, 1.5 * sc);
    } else if (suit.hasAntenna) {
      // Standard antenna nub
      g.fillStyle(0xDDDDDD, 0.9);
      g.fillCircle(x + headTurnOff + 3 * sc, y - 12 * sc - helmetR, 1.5 * sc);
      g.lineStyle(1 * sc, 0xDDDDDD, 0.7);
      g.lineBetween(
        x + headTurnOff + 3 * sc, y - 12 * sc - helmetR + 1.5 * sc,
        x + headTurnOff + 3 * sc, y - 12 * sc - helmetR + 6 * sc
      );
    }

    // Order number badge
    if (c.tray && c.tray.orderNum !== undefined && c.personState === 'at_window') {
      if (!c.numText) {
        c.numText = this.scene.add.text(x, y - 30 * sc, `#${c.tray.orderNum}`, {
          fontSize: '12px', color: '#FFE8CC', fontFamily: 'Arial', fontStyle: 'bold',
          backgroundColor: '#00000066', padding: { x: 3, y: 1 },
        }).setOrigin(0.5).setDepth(1);
      }
      c.numText.setPosition(x + headTurnOff, y - 30 * sc);
      c.numText.setAlpha(1);
    } else if (c.numText) {
      c.numText.setAlpha(0);
    }
  }

  darkenColor(color, factor) {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  destroy() {
    for (const c of this.customers) {
      c.shipGfx.destroy();
      c.personGfx.destroy();
      if (c.numText) c.numText.destroy();
    }
    this.customers = [];
  }
}
