import Phaser from 'phaser';
import { HUMAN_NAMES, ALIEN_NAME_PARTS, QUIPS } from '../data/customerPersonality.js';
import { DIFFICULTY_PROGRESSION } from '../data/ingredients.js';
import { GAME_FONT } from '../data/constants.js';

/**
 * CustomerVessels — Customers enter through an airlock into an interior customer deck,
 * walk to the service counter, wait for their order, then walk back through the
 * airlock and depart.
 *
 * Person states: entering_airlock | walking_to_counter | at_counter |
 *                walking_to_airlock | exiting_airlock | boarded
 */
export class CustomerVessels {
  constructor(scene) {
    this.scene = scene;
    this.customers = [];

    // 4 docking slots — customers stand at counter (Y~310)
    this.slots = [
      { counterX: 160, counterY: 310, occupied: false },
      { counterX: 390, counterY: 310, occupied: false },
      { counterX: 634, counterY: 310, occupied: false },
      { counterX: 864, counterY: 310, occupied: false },
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

    // Alien variants
    this.alienVariants = [
      { name: 'blob', type: 'blob', color: 0x44ff88 },
      { name: 'tentacle', type: 'tentacle', color: 0xff44dd },
      { name: 'eye', type: 'eye', color: 0x44ddff },
      { name: 'crystal', type: 'crystal', color: 0xffbb44 }
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

    // ~25% chance of alien customer
    const isAlien = Math.random() < 0.25;
    let suitDef = null;
    let alienDef = null;

    if (isAlien) {
      alienDef = Phaser.Utils.Array.GetRandom(this.alienVariants);
    } else {
      const suitBase = Phaser.Utils.Array.GetRandom(this.suitVariants);
      const suitColors = [0x5577AA, 0x887766, 0xAA6677, 0x669966, 0xAA8844];
      const suitTint = Phaser.Utils.Array.GetRandom(suitColors);
      suitDef = { ...suitBase, suitColor: this.darkenColor(suitTint, 0.85) };
    }

    const name = this.generateName(isAlien);
    const quip = this.generateQuip(isAlien);

    const customer = {
      tray,
      slot,
      suitDef,
      alienDef,
      isAlien,
      onArrive,
      name,
      quip,

      // Person (walks through interior deck)
      personX: this.scene.AIRLOCK_X,
      personY: this.scene.AIRLOCK_Y + this.scene.AIRLOCK_HEIGHT,
      personTargetX: slot.counterX,
      personTargetY: slot.counterY,
      personScale: 0.5,
      personTargetScale: 1.2,
      personState: 'entering_airlock',
      personBob: Math.random() * Math.PI * 2,
      walkPhase: Math.random() * Math.PI * 2,
      personFacing: 1,
      personGfx: this.scene.add.graphics().setDepth(2.0),
      numText: null,

      // Patience timer
      patienceMax: 0,
      patience: 0,
      patienceBarGfx: this.scene.add.graphics().setDepth(2.5),

      // Idle animation
      idleTimer: 0,
      idleAction: 'none',
      idleActionTimer: 0,
      headTurn: 0,

      // Arrival delay (brief pause before airlock opens)
      arrivalDelay: 600,
    };

    // Request airlock open after brief delay
    this.scene.time.delayedCall(customer.arrivalDelay, () => {
      this.scene.customerDeck.requestAirlockOpen();
    });

    this.customers.push(customer);
  }

  undockVessel(tray) {
    const c = this.customers.find(v => v.tray === tray);
    if (!c) return;

    // Clear patience bar immediately
    if (c.patienceBarGfx) c.patienceBarGfx.clear();

    if (c.personState === 'at_counter') {
      // Walk back to airlock
      c.personState = 'walking_to_airlock';
      c.personFacing = -1;
      c.personTargetX = this.scene.AIRLOCK_X;
      c.personTargetY = this.scene.AIRLOCK_Y + this.scene.AIRLOCK_HEIGHT;
      c.personTargetScale = 0.5;
    } else if (c.personState === 'walking_to_counter' || c.personState === 'entering_airlock') {
      c.personState = 'walking_to_airlock';
      c.personFacing = -1;
      c.personTargetX = this.scene.AIRLOCK_X;
      c.personTargetY = this.scene.AIRLOCK_Y + this.scene.AIRLOCK_HEIGHT;
      c.personTargetScale = 0.5;
    } else {
      c.personState = 'boarded';
    }
  }

  update(delta) {
    const dt = delta / 16;
    const dtSec = delta / 1000;

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];

      this.updatePerson(c, dt);
      this.updateIdle(c, dt);

      // Patience countdown for customers at counter
      if (c.personState === 'at_counter' && c.patienceMax > 0) {
        c.patience -= dtSec;
        this.drawPatienceBar(c);

        if (c.patience <= 0) {
          c.patience = 0;
          // Timeout — miss this order
          const tray = c.tray;
          if (tray && !tray.done && !tray.scored) {
            this.scene.scoringManager.handleMiss(tray);
            tray.done = true;
            this.scene.destroyTray(tray);
          }
        }
      }

      this.drawPerson(c);

      if (c.personState === 'boarded') {
        c.personGfx.destroy();
        if (c.patienceBarGfx) c.patienceBarGfx.destroy();
        if (c.numText) c.numText.destroy();
        if (c.slot) c.slot.occupied = false;
        this.customers.splice(i, 1);
      }
    }
  }

  drawPatienceBar(c) {
    const g = c.patienceBarGfx;
    g.clear();
    if (c.personState !== 'at_counter' || c.patienceMax <= 0) return;

    const ratio = Math.max(0, c.patience / c.patienceMax);
    const barW = 50;
    const barH = 5;
    const x = c.personX - barW / 2;
    const y = c.personY - 50;

    // Background
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x, y, barW, barH);

    // Fill — green → yellow → red
    let color;
    if (ratio > 0.5) color = 0x44ff44;
    else if (ratio > 0.25) color = 0xffff44;
    else color = 0xff4444;

    // Pulse when low
    let alpha = 0.9;
    if (ratio < 0.25) {
      alpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
    }

    g.fillStyle(color, alpha);
    g.fillRect(x, y, barW * ratio, barH);

    // Border
    g.lineStyle(1, 0xffffff, 0.3);
    g.strokeRect(x, y, barW, barH);
  }

  // ======================== PERSON UPDATE ========================

  updatePerson(c, dt) {
    const airlockX = this.scene.AIRLOCK_X;
    const airlockBottomY = this.scene.AIRLOCK_Y + this.scene.AIRLOCK_HEIGHT;

    if (c.personState === 'entering_airlock') {
      // Wait for airlock to open, then start walking
      const deck = this.scene.customerDeck;
      if (deck.airlockState === 'open' || deck.airlockProgress > 0.7) {
        c.personState = 'walking_to_counter';
        c.personTargetX = c.slot.counterX;
        c.personTargetY = c.slot.counterY;
        c.personTargetScale = 1.2;
        c.personFacing = 1;
      }
    } else if (c.personState === 'walking_to_counter') {
      // Walk from airlock to standing position, scale grows
      c.personX += (c.personTargetX - c.personX) * 0.04 * dt;
      c.personY += (c.personTargetY - c.personY) * 0.04 * dt;
      c.personScale += (c.personTargetScale - c.personScale) * 0.04 * dt;
      c.walkPhase += 0.08 * dt;

      if (Math.abs(c.personX - c.personTargetX) < 3 &&
          Math.abs(c.personY - c.personTargetY) < 3) {
        c.personX = c.personTargetX;
        c.personY = c.personTargetY;
        c.personScale = c.personTargetScale;
        c.personState = 'at_counter';
        // Close airlock behind them
        this.scene.customerDeck.requestAirlockClose();
        // Set patience timer
        const minutesPlayed = this.scene.gameTime / 60;
        const basePat = 40;
        const minPat = 20;
        const patDecrease = 3;
        c.patienceMax = Math.max(minPat, basePat - minutesPlayed * patDecrease);
        c.patience = c.patienceMax;
        // Fire arrival callback — reveals the order
        if (c.onArrive) c.onArrive();
        this.showSpeechBubble(c);
      }
    } else if (c.personState === 'at_counter') {
      // Subtle idle sway (grounded, not floating)
      c.personBob += 0.02 * dt;
      c.personY = c.slot.counterY + Math.sin(c.personBob) * 0.8;
    } else if (c.personState === 'walking_to_airlock') {
      // Walk back toward airlock
      c.personX += (c.personTargetX - c.personX) * 0.05 * dt;
      c.personY += (c.personTargetY - c.personY) * 0.05 * dt;
      c.personScale += (c.personTargetScale - c.personScale) * 0.05 * dt;
      c.walkPhase += 0.08 * dt;

      if (Math.abs(c.personX - airlockX) < 8 &&
          Math.abs(c.personY - airlockBottomY) < 8) {
        c.personState = 'exiting_airlock';
        c.personX = airlockX;
        c.personY = airlockBottomY;
        this.scene.customerDeck.requestAirlockOpen();
      }
    } else if (c.personState === 'exiting_airlock') {
      const deck = this.scene.customerDeck;
      if (deck.airlockState === 'open' || deck.airlockProgress > 0.7) {
        // Fade out through airlock
        c.personScale *= (1 - 0.03 * dt);
        if (c.personScale < 0.3) {
          c.personState = 'eva_to_ship';
          this.scene.customerDeck.requestAirlockClose();
        }
      }
    } else if (c.personState === 'eva_to_ship') {
      // Customer has exited — mark as boarded for cleanup
      c.personState = 'boarded';
    }
  }

  // ======================== IDLE ANIMATION ========================

  updateIdle(c, dt) {
    if (c.personState !== 'at_counter') {
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

  // ======================== PERSON DRAWING ========================

  drawPerson(c) {
    const g = c.personGfx;
    g.clear();
    if (c.personState === 'boarded' || c.personState === 'eva_to_ship') return;

    // --- ALIEN DRAWING ---
    if (c.isAlien) {
      this.drawAlien(c);

      // Order number badge for aliens
      const { personX: x, personY: y, personScale: sc } = c;

      if (c.tray && c.tray.orderNum !== undefined && c.personState === 'at_counter') {
        if (!c.numText) {
          c.numText = this.scene.add.text(x, y - 30 * sc, `#${c.tray.orderNum}`, {
            fontSize: '12px', color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
            backgroundColor: '#00000066', padding: { x: 3, y: 1 },
          }).setOrigin(0.5).setDepth(2.5);
        }
        c.numText.setPosition(x, y - 40 * sc);
        c.numText.setAlpha(1);
      } else if (c.numText) {
        c.numText.setAlpha(0);
      }
      return;
    }

    // --- HUMAN DRAWING ---
    const { personX: x, personY: baseY, personScale: sc, personFacing: face, suitDef: suit } = c;
    const suitCol = suit.suitColor;
    const visorCol = suit.visorColor;
    const isWalking = c.personState === 'walking_to_counter' || c.personState === 'walking_to_airlock';
    const isAtCounter = c.personState === 'at_counter';

    // Grounded idle sway (very subtle) or walk bob
    const bobOffset = isWalking ? Math.sin(c.walkPhase) * 1.5 * sc : Math.sin(c.personBob) * 0.8 * sc;
    const y = baseY + bobOffset;

    // Walk leg animation
    const legSwing = isWalking ? Math.sin(c.walkPhase) * 4 * sc : 0;

    // Shadow on floor when grounded
    if (isAtCounter || isWalking) {
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(x, y + 26 * sc, 16 * sc, 4 * sc);
    }

    // Legs (with walk animation)
    g.fillStyle(suitCol, 0.9);
    g.fillRect(x - 6 * sc, y + 12 * sc + legSwing, 5 * sc, 12 * sc);
    g.fillRect(x + 1 * sc, y + 12 * sc - legSwing, 5 * sc, 12 * sc);
    // Boots
    g.fillStyle(0x444444, 0.9);
    g.fillRoundedRect(x - 7 * sc, y + 22 * sc + legSwing, 6 * sc, 4 * sc, 1.5 * sc);
    g.fillRoundedRect(x + 1 * sc, y + 22 * sc - legSwing, 6 * sc, 4 * sc, 1.5 * sc);

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
    if (c.tray && c.tray.orderNum !== undefined && c.personState === 'at_counter') {
      if (!c.numText) {
        c.numText = this.scene.add.text(x, y - 30 * sc, `#${c.tray.orderNum}`, {
          fontSize: '12px', color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
          backgroundColor: '#00000066', padding: { x: 3, y: 1 },
        }).setOrigin(0.5).setDepth(2.5);
      }
      c.numText.setPosition(x + headTurnOff, y - 30 * sc);
      c.numText.setAlpha(1);
    } else if (c.numText) {
      c.numText.setAlpha(0);
    }
  }

  // ======================== ALIEN DRAWING ========================

  drawAlien(c) {
    const g = c.personGfx;
    const { personX: x, personY: baseY, personScale: sc, alienDef } = c;
    const color = alienDef.color;
    
    // Add visual bobbing scaled by distance/size, similar to humans
    const bobOffset = Math.sin(c.personBob) * 2 * sc;
    const y = baseY + bobOffset;
    
    let happiness = 0;
    if (c.tray && (c.tray.done || c.tray.scored)) {
        happiness = c.tray.completed ? 1 : -1;
    }

    switch (alienDef.type) {
        case 'blob': this.drawBlobAlien(g, x, y, sc, color, happiness); break;
        case 'tentacle': this.drawTentacleAlien(g, x, y, sc, color, happiness); break;
        case 'eye': this.drawEyeAlien(g, x, y, sc, color, happiness); break;
        case 'crystal': this.drawCrystalAlien(g, x, y, sc, color, happiness); break;
    }
  }

  drawBlobAlien(g, x, y, sc, color, happiness) {
    const t = Date.now();
    const dark = this.darkenColor(color, 0.6);
    const light = this.lightenColor(color, 0.4);
    const breathe = Math.sin(t * 0.002) * 0.04;

    // Outer glow / aura
    g.fillStyle(color, 0.15);
    g.fillEllipse(x, y + 2 * sc, 38 * sc, 48 * sc);

    // Main body (wider at bottom, breathing)
    const bw = (32 + breathe * 30) * sc;
    const bh = (42 - breathe * 20) * sc;
    g.fillStyle(color, 0.9);
    g.fillEllipse(x, y + 2 * sc, bw, bh);

    // Upper head bulge
    g.fillStyle(color, 0.95);
    g.fillEllipse(x, y - 8 * sc, 24 * sc, 22 * sc);

    // Surface spots
    g.fillStyle(dark, 0.3);
    g.fillCircle(x - 8 * sc, y + 8 * sc, 3 * sc);
    g.fillCircle(x + 10 * sc, y + 3 * sc, 2.5 * sc);
    g.fillCircle(x - 3 * sc, y + 14 * sc, 2 * sc);

    // Belly highlight
    g.fillStyle(light, 0.25);
    g.fillEllipse(x + 3 * sc, y + 4 * sc, 14 * sc, 18 * sc);

    // Animated bubbles rising inside
    for (let i = 0; i < 3; i++) {
      const phase = t * 0.0015 + i * 2.1;
      const bub = ((phase % 3) / 3); // 0 to 1 rising
      const bx = x + Math.sin(phase * 1.3) * 6 * sc + (i - 1) * 5 * sc;
      const by = y + (12 - bub * 28) * sc;
      const br = (1.5 + Math.sin(phase) * 0.5) * sc;
      g.fillStyle(light, 0.3 + (1 - bub) * 0.2);
      g.fillCircle(bx, by, br);
    }

    // Pseudopod arms (chain of circles waving)
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 0; j < 3; j++) {
        const wave = Math.sin(t * 0.003 + j * 0.8 + side) * 3 * sc;
        const ax = x + side * (14 + j * 5) * sc + wave;
        const ay = y + (2 + j * 4) * sc;
        const ar = (3.5 - j * 0.7) * sc;
        g.fillStyle(color, 0.8 - j * 0.1);
        g.fillCircle(ax, ay, ar);
      }
    }

    // Eyes — sclera
    const lex = x - 7 * sc;
    const rex = x + 7 * sc;
    const ey = y - 10 * sc;
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(lex, ey, 10 * sc, 9 * sc);
    g.fillEllipse(rex, ey, 10 * sc, 9 * sc);

    // Iris
    const irisCol = happiness > 0 ? 0x44dd44 : happiness < 0 ? 0xdd4444 : 0x228855;
    const pupilDrift = Math.sin(t * 0.001) * 1.5 * sc;
    g.fillStyle(irisCol, 0.9);
    g.fillCircle(lex + pupilDrift, ey, 3.5 * sc);
    g.fillCircle(rex + pupilDrift, ey, 3.5 * sc);

    // Pupils
    g.fillStyle(0x000000, 1);
    g.fillCircle(lex + pupilDrift, ey, 1.8 * sc);
    g.fillCircle(rex + pupilDrift, ey, 1.8 * sc);

    // Eye shine
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(lex + pupilDrift - 1.5 * sc, ey - 1.5 * sc, 1.2 * sc);
    g.fillCircle(rex + pupilDrift - 1.5 * sc, ey - 1.5 * sc, 1.2 * sc);

    // Brow lines
    const browAngle = happiness > 0 ? -0.15 : happiness < 0 ? 0.3 : 0;
    g.lineStyle(1.5 * sc, dark, 0.6);
    g.lineBetween(lex - 5 * sc, ey - 6 * sc + browAngle * 5 * sc, lex + 5 * sc, ey - 6 * sc - browAngle * 5 * sc);
    g.lineBetween(rex - 5 * sc, ey - 6 * sc - browAngle * 5 * sc, rex + 5 * sc, ey - 6 * sc + browAngle * 5 * sc);

    // Mouth
    if (happiness > 0) {
      // Open smile with tongue
      g.lineStyle(2 * sc, 0x000000, 0.8);
      g.beginPath();
      g.arc(x, y + 2 * sc, 7 * sc, 0.3, Math.PI - 0.3);
      g.strokePath();
      g.fillStyle(0xff6688, 0.7);
      g.fillEllipse(x, y + 5 * sc, 5 * sc, 3 * sc);
    } else if (happiness < 0) {
      // Frown
      g.lineStyle(2 * sc, 0x000000, 0.8);
      g.beginPath();
      g.arc(x, y + 10 * sc, 6 * sc, Math.PI + 0.3, Math.PI * 2 - 0.3);
      g.strokePath();
      // Animated tear drops
      const tearPhase = (t * 0.003) % 2;
      const tearY = ey + 5 * sc + tearPhase * 10 * sc;
      g.fillStyle(0x88ccff, 0.7 - tearPhase * 0.3);
      g.fillCircle(lex + 4 * sc, tearY, 1.5 * sc);
      g.fillCircle(rex - 4 * sc, tearY + 3 * sc, 1.5 * sc);
    } else {
      // Neutral gentle curve
      g.lineStyle(1.5 * sc, 0x000000, 0.6);
      g.beginPath();
      g.arc(x, y + 3 * sc, 5 * sc, 0.4, Math.PI - 0.4);
      g.strokePath();
    }
  }

  drawTentacleAlien(g, x, y, sc, color, happiness) {
    const t = Date.now();
    const dark = this.darkenColor(color, 0.5);
    const light = this.lightenColor(color, 0.35);

    // 5 organic tentacles (drawn behind body)
    for (let i = 0; i < 5; i++) {
      const baseAngle = -0.6 + i * 0.3;
      const phase = t * 0.0025 + i * 1.3;
      for (let j = 0; j < 6; j++) {
        const progress = j / 5;
        const wave = Math.sin(phase + j * 0.6) * (4 + j * 2) * sc;
        const tx = x + Math.sin(baseAngle) * (8 + j * 6) * sc + wave;
        const ty = y + 5 * sc + j * 5 * sc;
        const radius = (4 - j * 0.5) * sc;
        g.fillStyle(color, 0.85 - progress * 0.15);
        g.fillCircle(tx, ty, radius);
        // Suction cups on alternating segments
        if (j % 2 === 1 && j < 5) {
          g.fillStyle(dark, 0.5);
          g.fillCircle(tx + 2 * sc, ty, 1.2 * sc);
        }
      }
    }

    // Ink cloud when unhappy
    if (happiness < 0) {
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.002 + i * 1.5) % 4;
        const ix = x + Math.sin(t * 0.001 + i * 2) * 8 * sc;
        const iy = y + 25 * sc + phase * 5 * sc;
        g.fillStyle(dark, 0.35 - phase * 0.08);
        g.fillCircle(ix, iy, (3 - phase * 0.5) * sc);
      }
    }

    // Teardrop mantle (squid head) — layered ellipses
    g.fillStyle(color, 0.92);
    g.fillEllipse(x, y - 8 * sc, 30 * sc, 34 * sc);
    // Upper dome bulge
    g.fillStyle(color, 0.95);
    g.fillEllipse(x, y - 16 * sc, 24 * sc, 20 * sc);
    // Darker underside ridge
    g.fillStyle(dark, 0.3);
    g.fillEllipse(x, y + 2 * sc, 28 * sc, 10 * sc);
    // Highlight sheen
    g.fillStyle(light, 0.2);
    g.fillEllipse(x + 4 * sc, y - 14 * sc, 10 * sc, 14 * sc);
    // Surface spots
    g.fillStyle(dark, 0.25);
    g.fillCircle(x - 7 * sc, y - 6 * sc, 2.5 * sc);
    g.fillCircle(x + 9 * sc, y - 12 * sc, 2 * sc);
    g.fillCircle(x - 4 * sc, y - 18 * sc, 1.8 * sc);

    // Ear fins (fluttering)
    const finFlutter = Math.sin(t * 0.004) * 0.2;
    for (let side = -1; side <= 1; side += 2) {
      g.fillStyle(color, 0.7);
      g.beginPath();
      g.moveTo(x + side * 14 * sc, y - 12 * sc);
      g.lineTo(x + side * (22 + finFlutter * 8) * sc, y - 18 * sc);
      g.lineTo(x + side * 14 * sc, y - 4 * sc);
      g.closePath();
      g.fillPath();
    }

    // Enhanced cyclops eye
    const eyeX = x;
    const eyeY = y - 10 * sc;
    // Dark socket ring
    g.fillStyle(dark, 0.4);
    g.fillCircle(eyeX, eyeY, 12 * sc);
    // Sclera
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(eyeX, eyeY, 10 * sc);
    // Iris
    const irisCol = happiness > 0 ? 0xdd44bb : happiness < 0 ? 0xaa1155 : 0xcc33aa;
    const lookDrift = Math.sin(t * 0.0008) * 2 * sc;
    g.fillStyle(irisCol, 0.9);
    g.fillCircle(eyeX + lookDrift, eyeY, 6 * sc);
    // Pupil
    g.fillStyle(0x000000, 1);
    g.fillCircle(eyeX + lookDrift, eyeY, 3.5 * sc);
    // Eye shine highlights
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(eyeX + lookDrift - 2.5 * sc, eyeY - 2.5 * sc, 1.8 * sc);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(eyeX + lookDrift + 2 * sc, eyeY + 1.5 * sc, 1 * sc);

    // Eyelid (slides down when unhappy)
    if (happiness < 0) {
      const lidDrop = 0.6;
      g.fillStyle(color, 0.95);
      g.beginPath();
      g.arc(eyeX, eyeY, 10.5 * sc, -Math.PI, 0);
      g.lineTo(eyeX + 10.5 * sc, eyeY - 10.5 * sc + 21 * sc * lidDrop);
      g.lineTo(eyeX - 10.5 * sc, eyeY - 10.5 * sc + 21 * sc * lidDrop);
      g.closePath();
      g.fillPath();
    } else if (happiness === 0) {
      // Slight squint for neutral
      g.fillStyle(color, 0.9);
      g.beginPath();
      g.arc(eyeX, eyeY, 10.5 * sc, -Math.PI, 0);
      g.lineTo(eyeX + 10.5 * sc, eyeY - 6 * sc);
      g.lineTo(eyeX - 10.5 * sc, eyeY - 6 * sc);
      g.closePath();
      g.fillPath();
    }

    // Beak mouth
    const beakY = eyeY + 13 * sc;
    if (happiness > 0) {
      // Open beak
      g.fillStyle(dark, 0.8);
      g.beginPath();
      g.moveTo(x - 3 * sc, beakY);
      g.lineTo(x, beakY + 4 * sc);
      g.lineTo(x + 3 * sc, beakY);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(x - 2.5 * sc, beakY + 1 * sc);
      g.lineTo(x, beakY - 2 * sc);
      g.lineTo(x + 2.5 * sc, beakY + 1 * sc);
      g.closePath();
      g.fillPath();
    } else {
      // Closed / inverted beak
      g.fillStyle(dark, 0.7);
      g.beginPath();
      g.moveTo(x - 2.5 * sc, beakY);
      g.lineTo(x, beakY + (happiness < 0 ? -3 : 2) * sc);
      g.lineTo(x + 2.5 * sc, beakY);
      g.closePath();
      g.fillPath();
    }
  }

  drawEyeAlien(g, x, y, sc, color, happiness) {
    const t = Date.now();
    const dark = this.darkenColor(color, 0.5);
    const light = this.lightenColor(color, 0.4);

    // Energy trail particles (below body)
    for (let i = 0; i < 5; i++) {
      const phase = (t * 0.002 + i * 1.2) % 3;
      const py = y + 18 * sc + phase * 10 * sc;
      const px = x + Math.sin(t * 0.0015 + i * 1.8) * 4 * sc;
      const pr = (2.5 - phase * 0.6) * sc;
      g.fillStyle(color, 0.4 - phase * 0.12);
      g.fillCircle(px, py, pr);
    }

    // Psychic ring (equatorial, oscillating tilt)
    const ringTilt = Math.sin(t * 0.0015) * 8;
    g.lineStyle(1.5 * sc, light, 0.4);
    g.strokeEllipse(x, y - 3 * sc, 36 * sc, (6 + ringTilt) * sc);

    // Outer pulsing aura
    const auraPulse = 0.12 + Math.sin(t * 0.003) * 0.06;
    g.fillStyle(color, auraPulse);
    g.fillCircle(x, y - 3 * sc, 22 * sc);

    // Translucent mid shell
    g.fillStyle(color, 0.5);
    g.fillCircle(x, y - 3 * sc, 18 * sc);

    // Inner core
    g.fillStyle(light, 0.6);
    g.fillCircle(x, y - 3 * sc, 13 * sc);

    // Internal swirling energy
    const swirl = t * 0.002;
    g.fillStyle(color, 0.3);
    g.fillEllipse(
      x + Math.cos(swirl) * 4 * sc,
      y - 3 * sc + Math.sin(swirl) * 2 * sc,
      14 * sc, 6 * sc
    );

    // Highlight crescent
    g.fillStyle(0xffffff, 0.15);
    g.fillEllipse(x - 5 * sc, y - 8 * sc, 10 * sc, 14 * sc);

    // Central dominant eye
    const eyeX = x;
    const eyeY = y - 3 * sc;
    // Socket ring
    g.fillStyle(dark, 0.4);
    g.fillCircle(eyeX, eyeY, 10 * sc);
    // Sclera
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(eyeX, eyeY, 18 * sc, 16 * sc);
    // Deep cyan iris
    const irisCol = happiness > 0 ? 0x44ffee : happiness < 0 ? 0x2266aa : 0x33bbdd;
    g.fillStyle(irisCol, 0.9);
    g.fillCircle(eyeX, eyeY, 6 * sc);
    // Vertical slit pupil
    g.fillStyle(0x000000, 1);
    g.fillEllipse(eyeX, eyeY, 2.5 * sc, 7 * sc);
    // Eye shine
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(eyeX - 2.5 * sc, eyeY - 2 * sc, 1.5 * sc);

    // Blink animation (~every 5 seconds)
    const blinkCycle = (t % 5000) / 5000;
    if (blinkCycle > 0.96) {
      const blinkProgress = (blinkCycle - 0.96) / 0.04;
      const lidClose = blinkProgress < 0.5 ? blinkProgress * 2 : (1 - blinkProgress) * 2;
      g.fillStyle(color, 0.9);
      g.fillEllipse(eyeX, eyeY, 18 * sc, 16 * sc * lidClose);
    }

    // 4 orbiting satellite eyes
    for (let i = 0; i < 4; i++) {
      const orbitAngle = t * 0.0018 + i * (Math.PI / 2);
      const orbitX = x + Math.cos(orbitAngle) * 16 * sc;
      const orbitY = y - 3 * sc + Math.sin(orbitAngle) * 8 * sc;
      // Depth-based alpha: front is bright, back is dim
      const depthAlpha = 0.4 + Math.sin(orbitAngle) * 0.35;
      const satR = 3.5 * sc;
      // Sclera
      g.fillStyle(0xffffff, depthAlpha);
      g.fillCircle(orbitX, orbitY, satR);
      // Pupil
      g.fillStyle(0x000000, depthAlpha);
      g.fillCircle(orbitX, orbitY, 1.5 * sc);
    }
  }

  drawCrystalAlien(g, x, y, sc, color, happiness) {
    const t = Date.now();
    const dark = this.darkenColor(color, 0.5);
    const light = this.lightenColor(color, 0.45);

    // Base glow (golden glow beneath)
    const glowPulse = 0.15 + Math.sin(t * 0.003) * 0.05;
    g.fillStyle(color, glowPulse);
    g.fillEllipse(x, y + 16 * sc, 28 * sc, 8 * sc);

    // 4 orbiting crystal fragments (behind body)
    for (let i = 0; i < 4; i++) {
      const orbitAngle = t * 0.002 + i * (Math.PI / 2);
      const orbitX = x + Math.cos(orbitAngle) * 18 * sc;
      const orbitY = y - 3 * sc + Math.sin(orbitAngle) * 7 * sc;
      const depthAlpha = 0.35 + Math.sin(orbitAngle) * 0.3;
      const fragSc = 2.5 * sc;
      g.fillStyle(color, depthAlpha);
      g.beginPath();
      g.moveTo(orbitX, orbitY - fragSc);
      g.lineTo(orbitX - fragSc * 0.7, orbitY + fragSc * 0.5);
      g.lineTo(orbitX + fragSc * 0.7, orbitY + fragSc * 0.5);
      g.closePath();
      g.fillPath();
    }

    // Main crystal body — 7-point hexagonal prism
    g.fillStyle(color, 0.88);
    g.beginPath();
    g.moveTo(x, y - 26 * sc);           // top point
    g.lineTo(x + 8 * sc, y - 20 * sc);  // upper right
    g.lineTo(x + 15 * sc, y - 4 * sc);  // mid right
    g.lineTo(x + 12 * sc, y + 12 * sc); // lower right
    g.lineTo(x, y + 17 * sc);           // bottom point
    g.lineTo(x - 12 * sc, y + 12 * sc); // lower left
    g.lineTo(x - 15 * sc, y - 4 * sc);  // mid left
    g.lineTo(x - 8 * sc, y - 20 * sc);  // upper left
    g.closePath();
    g.fillPath();

    // Left dark facet
    g.fillStyle(dark, 0.3);
    g.beginPath();
    g.moveTo(x, y - 26 * sc);
    g.lineTo(x - 8 * sc, y - 20 * sc);
    g.lineTo(x - 15 * sc, y - 4 * sc);
    g.lineTo(x - 12 * sc, y + 12 * sc);
    g.lineTo(x, y + 17 * sc);
    g.lineTo(x, y - 5 * sc);
    g.closePath();
    g.fillPath();

    // Right highlight facet
    g.fillStyle(light, 0.2);
    g.beginPath();
    g.moveTo(x, y - 26 * sc);
    g.lineTo(x + 8 * sc, y - 20 * sc);
    g.lineTo(x + 15 * sc, y - 4 * sc);
    g.lineTo(x + 5 * sc, y - 5 * sc);
    g.closePath();
    g.fillPath();

    // Internal edge lines (crystal structure)
    g.lineStyle(1 * sc, dark, 0.25);
    g.lineBetween(x, y - 26 * sc, x, y + 17 * sc);
    g.lineBetween(x, y - 5 * sc, x + 15 * sc, y - 4 * sc);
    g.lineBetween(x, y - 5 * sc, x - 15 * sc, y - 4 * sc);
    g.lineBetween(x, y - 5 * sc, x + 12 * sc, y + 12 * sc);
    g.lineBetween(x, y - 5 * sc, x - 12 * sc, y + 12 * sc);

    // Crystal outline stroke
    g.lineStyle(1.5 * sc, light, 0.4);
    g.beginPath();
    g.moveTo(x, y - 26 * sc);
    g.lineTo(x + 8 * sc, y - 20 * sc);
    g.lineTo(x + 15 * sc, y - 4 * sc);
    g.lineTo(x + 12 * sc, y + 12 * sc);
    g.lineTo(x, y + 17 * sc);
    g.lineTo(x - 12 * sc, y + 12 * sc);
    g.lineTo(x - 15 * sc, y - 4 * sc);
    g.lineTo(x - 8 * sc, y - 20 * sc);
    g.closePath();
    g.strokePath();

    // 2 satellite crystal shards
    for (let side = -1; side <= 1; side += 2) {
      const shardX = x + side * 13 * sc;
      const shardY = y + 5 * sc;
      g.fillStyle(color, 0.75);
      g.beginPath();
      g.moveTo(shardX, shardY - 8 * sc);
      g.lineTo(shardX + side * 5 * sc, shardY);
      g.lineTo(shardX + side * 3 * sc, shardY + 6 * sc);
      g.lineTo(shardX - side * 1 * sc, shardY + 4 * sc);
      g.closePath();
      g.fillPath();
      // Shard highlight
      g.fillStyle(light, 0.25);
      g.beginPath();
      g.moveTo(shardX, shardY - 8 * sc);
      g.lineTo(shardX + side * 5 * sc, shardY);
      g.lineTo(shardX + side * 2 * sc, shardY - 2 * sc);
      g.closePath();
      g.fillPath();
    }

    // Expressive runic core (shape changes with happiness)
    const coreX = x;
    const coreY = y - 5 * sc;
    const corePulse = 0.6 + Math.sin(t * 0.004) * 0.25;
    const coreColor = happiness > 0 ? 0xffee44 : happiness < 0 ? 0xff4422 : 0xffffcc;

    if (happiness > 0) {
      // 4-pointed star
      g.fillStyle(coreColor, corePulse);
      g.beginPath();
      g.moveTo(coreX, coreY - 8 * sc);
      g.lineTo(coreX + 2.5 * sc, coreY - 2.5 * sc);
      g.lineTo(coreX + 8 * sc, coreY);
      g.lineTo(coreX + 2.5 * sc, coreY + 2.5 * sc);
      g.lineTo(coreX, coreY + 8 * sc);
      g.lineTo(coreX - 2.5 * sc, coreY + 2.5 * sc);
      g.lineTo(coreX - 8 * sc, coreY);
      g.lineTo(coreX - 2.5 * sc, coreY - 2.5 * sc);
      g.closePath();
      g.fillPath();
    } else if (happiness < 0) {
      // Jagged cracked shape
      g.fillStyle(coreColor, corePulse);
      g.beginPath();
      g.moveTo(coreX - 2 * sc, coreY - 6 * sc);
      g.lineTo(coreX + 3 * sc, coreY - 5 * sc);
      g.lineTo(coreX + 6 * sc, coreY - 1 * sc);
      g.lineTo(coreX + 3 * sc, coreY + 2 * sc);
      g.lineTo(coreX + 5 * sc, coreY + 6 * sc);
      g.lineTo(coreX - 1 * sc, coreY + 4 * sc);
      g.lineTo(coreX - 6 * sc, coreY + 2 * sc);
      g.lineTo(coreX - 4 * sc, coreY - 2 * sc);
      g.closePath();
      g.fillPath();
      // Crack lines radiating from core
      g.lineStyle(1 * sc, coreColor, corePulse * 0.6);
      g.lineBetween(coreX + 6 * sc, coreY - 1 * sc, coreX + 10 * sc, coreY - 3 * sc);
      g.lineBetween(coreX - 6 * sc, coreY + 2 * sc, coreX - 10 * sc, coreY + 4 * sc);
      g.lineBetween(coreX + 5 * sc, coreY + 6 * sc, coreX + 7 * sc, coreY + 10 * sc);
    } else {
      // Diamond (neutral)
      g.fillStyle(coreColor, corePulse);
      g.beginPath();
      g.moveTo(coreX, coreY - 7 * sc);
      g.lineTo(coreX + 6 * sc, coreY);
      g.lineTo(coreX, coreY + 7 * sc);
      g.lineTo(coreX - 6 * sc, coreY);
      g.closePath();
      g.fillPath();
    }

    // Surface sparkles (sequential flashing around facet edges)
    const sparkleIndex = Math.floor(t / 300) % 6;
    const sparklePositions = [
      { sx: 0, sy: -26 }, { sx: 8, sy: -20 }, { sx: 15, sy: -4 },
      { sx: 12, sy: 12 }, { sx: -12, sy: 12 }, { sx: -15, sy: -4 },
    ];
    const sp = sparklePositions[sparkleIndex];
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(x + sp.sx * sc, y + sp.sy * sc, 2 * sc);
    // Secondary sparkle offset by 3
    const sp2 = sparklePositions[(sparkleIndex + 3) % 6];
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(x + sp2.sx * sc, y + sp2.sy * sc, 1.5 * sc);
  }

  generateName(isAlien) {
    if (isAlien) {
      const p = ALIEN_NAME_PARTS;
      const prefix = Phaser.Utils.Array.GetRandom(p.prefix);
      const middle = Phaser.Utils.Array.GetRandom(p.middle);
      const suffix = Phaser.Utils.Array.GetRandom(p.suffix);
      return prefix + middle + suffix;
    }
    return Phaser.Utils.Array.GetRandom(HUMAN_NAMES);
  }

  generateQuip(isAlien) {
    if (isAlien) {
      return Phaser.Utils.Array.GetRandom(QUIPS.alien);
    }
    const pools = ['friendly', 'impatient', 'weird'];
    const pool = Phaser.Utils.Array.GetRandom(pools);
    return Phaser.Utils.Array.GetRandom(QUIPS[pool]);
  }

  showSpeechBubble(c) {
    this.scene.notificationManager.show(`${c.name}: "${c.quip}"`, {
      borderColor: c.isAlien ? 0x44ff88 : 0x6688cc,
    });
  }

  darkenColor(color, factor) {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  lightenColor(color, factor) {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) + (255 - ((color >> 16) & 0xFF)) * factor));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) + (255 - ((color >> 8) & 0xFF)) * factor));
    const b = Math.min(255, Math.floor((color & 0xFF) + (255 - (color & 0xFF)) * factor));
    return (r << 16) | (g << 8) | b;
  }

  destroy() {
    for (const c of this.customers) {
      c.personGfx.destroy();
      if (c.patienceBarGfx) c.patienceBarGfx.destroy();
      if (c.numText) c.numText.destroy();
    }
    this.customers = [];
  }
}
