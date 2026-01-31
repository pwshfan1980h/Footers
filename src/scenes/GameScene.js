import Phaser from 'phaser';
import { INGREDIENTS, BIN_LAYOUT, BIN_COLORS, TREATMENTS, DAY_CONFIG } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.day = data.day || 1;
    this.totalScore = data.totalScore || 0;
  }

  create() {
    const cfg = DAY_CONFIG[this.day];

    // --- state ---
    this.dayScore = 0;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.trays = [];
    this.tickets = [];
    this.totalOrders = cfg.orders;
    this.ordersSpawned = 0;
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.conveyorSpeed = cfg.speed;
    this.spawnInterval = cfg.spawnInterval;
    this.isPaused = false;
    this.beltOffset = 0;
    this.orderNumber = 0;
    this.finishLineX = 80;

    // Sequential spawn (first 3 orders one at a time)
    this.waitingForNext = true;
    this.sequentialDelay = 0;
    this.spawnTimer = 0;

    // Click-to-place state
    this.heldItem = null;
    this._justPickedUp = false;
    this.binData = {};

    // Treatment state
    this.activeTreatment = null;
    this._justActivatedTreatment = false;
    this.treatmentGlow = null;
    this.treatmentItems = {};

    // Shift time (for clock)
    this.shiftElapsed = 0;
    this.shiftDuration = this.totalOrders * this.spawnInterval * 1.8;

    // Space bar for speed boost
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- background (warm dark brown) ---
    this.add.rectangle(512, 384, 1024, 768, 0x2A1F14);

    // --- wall with clock ---
    this.createWall();

    // --- HUD ---
    this.createHUD(cfg);

    // --- ticket bar ---
    this.createTicketBar();

    // --- game area bg (warm) ---
    this.add.rectangle(512, 290, 1024, 290, 0x2E2820).setDepth(0);

    // --- window behind belt area ---
    this.createWindow();

    // --- belt ---
    this.beltGfx = this.add.graphics().setDepth(2);
    this.drawBelt();

    // --- finish line ---
    this.createFinishLine();

    // separator between belt and bins (warm)
    this.add.rectangle(512, 435, 1024, 2, 0x554433).setDepth(3);

    // --- bin area background (warm brown) ---
    this.add.rectangle(370, 590, 740, 300, 0x2A2218).setDepth(0);

    // --- ingredient bins (2x5 layout) ---
    this.createBins();

    // --- prep counter with sauces + treatments ---
    this.createPrepCounter();

    // --- click to place (replaces drag & drop) ---
    this.setupClickToPlace();

    // --- speed indicator ---
    this.speedText = this.add.text(975, 142, '\u25b6\u25b6 FAST', {
      fontSize: '11px', color: '#ff0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    // --- hints ---
    if (this.day === 1) {
      const hint = this.add.text(512, 280,
        'Click ingredients to pick up, click trays to place!\nMatch the # to the ticket above\nHold SPACE to speed up belt', {
          fontSize: '14px', color: '#8888aa', fontFamily: 'Arial',
          fontStyle: 'italic', align: 'center',
        }).setOrigin(0.5).setDepth(5).setAlpha(0.9);
      this.tweens.add({
        targets: hint, alpha: 0, delay: 7000, duration: 1500,
        onComplete: () => hint.destroy(),
      });
    }
  }

  /* =========================================
     WALL WITH DIGITAL CLOCK
     ========================================= */
  createWall() {
    // Wall background (warm)
    this.add.rectangle(512, 25, 1024, 50, 0x4A3A2A).setDepth(0);
    this.add.rectangle(512, 50, 1024, 2, 0x3A2A1A).setDepth(1);

    // Clock housing
    this.add.rectangle(512, 25, 140, 38, 0x111111).setDepth(2);
    this.add.rectangle(512, 25, 136, 34, 0x0a0a0a).setDepth(3);
    // Green glow
    this.add.rectangle(512, 25, 134, 32, 0x001100).setDepth(3);

    // Clock text
    this.clockText = this.add.text(512, 25, '11:00 AM', {
      fontSize: '17px', color: '#00ff00',
      fontFamily: 'Courier New', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);
  }

  updateClock() {
    const p = this.getShiftProgress();
    const totalMinutes = Math.floor(p * 600); // 11 AM to 9 PM = 10 hours
    let hours = 11 + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    this.clockText.setText(`${h12}:${String(minutes).padStart(2, '0')} ${ampm}`);
  }

  getShiftProgress() {
    return Math.min(1, this.shiftElapsed / this.shiftDuration);
  }

  /* =========================================
     HUD
     ========================================= */
  createHUD(cfg) {
    // Subtle warm HUD background strip
    this.add.rectangle(512, 25, 1024, 50, 0x3A2A1A).setDepth(4).setAlpha(0.5);

    this.dayText = this.add.text(12, 15,
      `Day ${this.day}: ${cfg.name}`, {
        fontSize: '16px', color: '#ddd', fontFamily: 'Arial', fontStyle: 'bold',
      }).setDepth(5);

    this.scoreText = this.add.text(260, 15,
      `Score: ${this.totalScore}`, {
        fontSize: '16px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
      }).setDepth(5);

    this.ordersText = this.add.text(700, 17,
      this.ordersDisplay(), {
        fontSize: '12px', color: '#bbb', fontFamily: 'Arial',
      }).setDepth(5);

    // Colored strike indicators
    this.strikeContainer = this.add.container(920, 15).setDepth(5);
    this.strikeIcons = [];
    for (let i = 0; i < this.maxStrikes; i++) {
      const icon = this.add.text(i * 24, 2, '\u25cb', {
        fontSize: '16px', color: '#44aa44', fontFamily: 'Arial', fontStyle: 'bold',
      });
      this.strikeContainer.add(icon);
      this.strikeIcons.push(icon);
    }
  }

  ordersDisplay() {
    return `Orders: ${this.ordersCompleted}/${this.totalOrders}`;
  }

  updateStrikeIndicators() {
    for (let i = 0; i < this.maxStrikes; i++) {
      if (i < this.strikes) {
        this.strikeIcons[i].setText('\u2717');
        this.strikeIcons[i].setColor('#ff3333');
      } else {
        this.strikeIcons[i].setText('\u25cb');
        this.strikeIcons[i].setColor('#44aa44');
      }
    }
  }

  refreshHUD() {
    this.scoreText.setText(`Score: ${this.totalScore + this.dayScore}`);
    this.ordersText.setText(this.ordersDisplay());
    this.updateStrikeIndicators();
  }

  /* =========================================
     TICKET BAR
     ========================================= */
  createTicketBar() {
    this.add.rectangle(512, 95, 1024, 88, 0x3A3028).setDepth(8);
    this.add.rectangle(512, 52, 1024, 2, 0x5A4A3A).setDepth(9);
    this.add.rectangle(512, 138, 1024, 2, 0x5A4A3A).setDepth(9);

    this.add.text(8, 55, 'ORDERS:', {
      fontSize: '10px', color: '#777', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(10);

    this.ticketContainer = this.add.container(0, 0).setDepth(10);
  }

  addTicket(order, orderNum) {
    const cardW = 110;
    const ingLines = order.ingredients.length;
    const treatLines = order.treatments ? order.treatments.length : 0;
    const contentH = 18 + ingLines * 9 + (treatLines > 0 ? 8 + treatLines * 9 : 0);
    const cardH = Math.max(80, contentH + 5);
    const gap = 5;
    const baseX = 65 + (orderNum - 1) * (cardW + gap);
    const baseY = 55;

    const card = this.add.container(baseX + 40, baseY).setDepth(10);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 4);
    bg.lineStyle(2, 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 4);
    card.add(bg);

    // Order number
    const numText = this.add.text(cardW / 2, 3, `#${orderNum}`, {
      fontSize: '12px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    card.add(numText);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xCCBB70, 1);
    div.lineBetween(4, 16, cardW - 4, 16);
    card.add(div);

    // Ingredient list — show build order
    const entries = [];
    order.ingredients.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isTopBread = (i === order.ingredients.length - 1 && key.startsWith('bread_'));
      const displayName = isTopBread ? `${ing.name} \u2191` : ing.name;
      const isNext = (i === 0);
      const txt = this.add.text(14, 18 + i * 9, displayName, {
        fontSize: '8px',
        color: isNext ? '#111' : '#999',
        fontFamily: 'Arial',
        fontStyle: isNext ? 'bold' : 'normal',
      });
      card.add(txt);
      entries.push({ key, text: txt, done: false });
    });

    // Treatment requirements (shown in red below ingredients)
    const treatEntries = [];
    if (order.treatments && order.treatments.length > 0) {
      const treatStartY = 18 + ingLines * 9 + 2;
      const div2 = this.add.graphics();
      div2.lineStyle(1, 0xCC8800, 0.5);
      div2.lineBetween(4, treatStartY, cardW - 4, treatStartY);
      card.add(div2);

      order.treatments.forEach((tKey, i) => {
        const treat = TREATMENTS[tKey];
        const txt = this.add.text(14, treatStartY + 3 + i * 9, `[${treat.name}]`, {
          fontSize: '8px',
          color: '#cc0000',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        });
        card.add(txt);
        treatEntries.push({ key: tKey, text: txt, done: false });
      });
    }

    this.ticketContainer.add(card);

    const ticket = { card, bg, orderNum, entries, treatEntries, cardH, status: 'active' };
    this.tickets.push(ticket);

    // Slide-in animation
    card.setAlpha(0);
    this.tweens.add({
      targets: card, x: baseX, alpha: 1,
      duration: 350, ease: 'Power2',
    });

    // Auto-scroll if needed
    const rightEdge = baseX + cardW + 10;
    if (rightEdge > 1020) {
      this.tweens.add({
        targets: this.ticketContainer, x: -(rightEdge - 1020),
        duration: 300, ease: 'Power2',
      });
    }

    return ticket;
  }

  updateTicketIngredient(orderNum, ingredientKey) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.entries.find((e) => e.key === ingredientKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setFontStyle('bold');
      entry.text.setText('\u2713 ' + INGREDIENTS[ingredientKey].name);
    }
    // Highlight next expected ingredient
    this.highlightNextIngredient(orderNum);
  }

  highlightNextIngredient(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    let foundNext = false;
    for (const entry of ticket.entries) {
      if (entry.done) continue;
      if (!foundNext) {
        foundNext = true;
        entry.text.setColor('#111');
        entry.text.setFontStyle('bold');
      } else {
        entry.text.setColor('#999');
        entry.text.setFontStyle('normal');
      }
    }
  }

  updateTicketTreatment(orderNum, treatmentKey) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    const entry = ticket.treatEntries.find((e) => e.key === treatmentKey && !e.done);
    if (entry) {
      entry.done = true;
      entry.text.setColor('#0a0');
      entry.text.setText('\u2713 ' + TREATMENTS[treatmentKey].name);
    }
  }

  markTicketCompleted(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'completed';
    const h = ticket.cardH || 80;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x00ff00, 0.15);
    overlay.fillRoundedRect(0, 0, 110, h, 4);
    ticket.card.add(overlay);
    const check = this.add.text(55, h / 2, '\u2713', {
      fontSize: '32px', color: '#0a0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(check);
  }

  markTicketMissed(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'missed';
    const h = ticket.cardH || 80;
    const overlay = this.add.graphics();
    overlay.fillStyle(0xff0000, 0.2);
    overlay.fillRoundedRect(0, 0, 110, h, 4);
    ticket.card.add(overlay);
    const xMark = this.add.text(55, h / 2, '\u2717', {
      fontSize: '32px', color: '#f33', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(xMark);
  }

  /* =========================================
     WINDOW WITH REFLECTION
     ========================================= */
  createWindow() {
    const cx = 512;
    const wy = 155;
    const wh = 110;
    const ww = 600;

    // Wood frame
    const frame = this.add.graphics().setDepth(1);
    frame.fillStyle(0x8B6914, 1);
    frame.fillRoundedRect(cx - ww / 2 - 6, wy - 6, ww + 12, wh + 12, 4);

    // 3 panes
    const paneW = (ww - 20) / 3;
    for (let i = 0; i < 3; i++) {
      const px = cx - ww / 2 + 5 + i * (paneW + 5);
      const sky = this.add.graphics().setDepth(1);

      // Sky blue
      sky.fillStyle(0x87CEEB, 1);
      sky.fillRect(px, wy, paneW, wh);

      // Lighter top gradient
      sky.fillStyle(0xB0E0FF, 0.5);
      sky.fillRect(px, wy, paneW, wh * 0.3);

      // Abstract clouds
      sky.fillStyle(0xFFFFFF, 0.6);
      sky.fillEllipse(px + paneW * 0.3, wy + 25, 40, 15);
      sky.fillEllipse(px + paneW * 0.3 + 15, wy + 20, 30, 12);
      sky.fillStyle(0xDDDDDD, 0.4);
      sky.fillEllipse(px + paneW * 0.7, wy + 45, 35, 12);
    }

    // Wood dividers between panes
    frame.fillStyle(0x8B6914, 1);
    for (let i = 1; i < 3; i++) {
      const dx = cx - ww / 2 + i * (ww / 3);
      frame.fillRect(dx - 3, wy - 6, 6, wh + 12);
    }

    // Sill at bottom
    frame.fillStyle(0x7A5A10, 1);
    frame.fillRect(cx - ww / 2 - 8, wy + wh + 4, ww + 16, 6);

    // Glare overlay (animated)
    this.windowGlare = this.add.graphics().setDepth(1);
    this.glareOffset = 0;
    this._windowBounds = { cx, wy, wh, ww };
  }

  updateWindowGlare() {
    if (!this.windowGlare) return;
    const { cx, wy, wh, ww } = this._windowBounds;
    this.windowGlare.clear();

    const stripeW = 30;
    const totalTravel = ww + stripeW * 2;
    const xPos = cx - ww / 2 - stripeW + this.glareOffset * totalTravel;
    const alpha = 0.06 + Math.sin(this.glareOffset * Math.PI * 2) * 0.03;

    this.windowGlare.fillStyle(0xFFFFFF, alpha);
    this.windowGlare.beginPath();
    this.windowGlare.moveTo(xPos, wy);
    this.windowGlare.lineTo(xPos + stripeW, wy);
    this.windowGlare.lineTo(xPos + stripeW + 20, wy + wh);
    this.windowGlare.lineTo(xPos + 20, wy + wh);
    this.windowGlare.closePath();
    this.windowGlare.fillPath();
  }

  /* =========================================
     BELT (visual only)
     ========================================= */
  drawBelt() {
    const g = this.beltGfx;
    g.clear();
    g.fillStyle(0x555060, 1);
    g.fillRect(0, 398, 1024, 34);
    let segIndex = 0;
    for (let x = this.beltOffset - 40; x < 1064; x += 40) {
      const tint = segIndex % 2 === 0 ? 0x555060 : 0x5A5565;
      g.fillStyle(tint, 1);
      const sx = Math.max(0, x);
      const sw = Math.min(38, 1024 - sx);
      if (sw > 0) g.fillRect(sx, 400, sw, 30);
      g.lineStyle(1, 0x777788, 0.5);
      g.strokeRect(x, 400, 38, 30);
      segIndex++;
    }
    // Rails
    g.fillStyle(0x44404A, 1);
    g.fillRect(0, 396, 1024, 4);
    g.fillRect(0, 432, 1024, 4);
  }

  /* =========================================
     FINISH LINE
     ========================================= */
  createFinishLine() {
    const x = this.finishLineX;
    const g = this.add.graphics().setDepth(6);

    for (let y = 145; y < 435; y += 12) {
      g.fillStyle(0x00ff00, 0.5);
      g.fillRect(x - 1, y, 3, 8);
    }

    const flagSize = 6;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const color = (row + col) % 2 === 0 ? 0xffffff : 0x000000;
        g.fillStyle(color, 0.6);
        g.fillRect(x - 9 + col * flagSize, 140 + row * flagSize, flagSize, flagSize);
      }
    }
  }

  /* =========================================
     INGREDIENT BINS (physical bins with items)
     ========================================= */
  createBins() {
    const startX = 70;
    const spacing = 135;
    const rows = [500, 635];

    BIN_LAYOUT.forEach((row, ri) => {
      row.forEach((key, ci) => {
        this.createBin(key, startX + ci * spacing, rows[ri]);
      });
    });
  }

  createBin(ingredientKey, x, y) {
    const ing = INGREDIENTS[ingredientKey];
    const colors = BIN_COLORS[ingredientKey] || { fill: 0x3a3a4e, border: 0x5a5a6e };
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(colors.fill, 1);
    bg.fillRoundedRect(x - 64, y - 50, 128, 100, 8);
    bg.lineStyle(2, colors.border, 1);
    bg.strokeRoundedRect(x - 64, y - 50, 128, 100, 8);

    // Ingredient name label at top of bin
    this.add.text(x, y - 41, ing.name, {
      fontSize: '11px', color: '#ccc', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    // Category label at bottom
    this.add.text(x, y + 40, ing.category.toUpperCase(), {
      fontSize: '9px', color: '#666', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(21);

    // Initialize bin data
    this.binData[ingredientKey] = { x, y, items: [] };

    // Spawn multiple items in the bin
    const itemCount = 6;
    for (let i = 0; i < itemCount; i++) {
      this.spawnBinItem(ingredientKey, x, y, i);
    }
  }

  /* =========================================
     PREP COUNTER (sauces + treatments)
     ========================================= */
  createPrepCounter() {
    const cx = 865;

    // Wooden counter background
    const counter = this.add.graphics().setDepth(20);
    counter.fillStyle(0x6B4A28, 1);
    counter.fillRoundedRect(720, 452, 295, 285, 8);
    counter.lineStyle(2, 0x8B6A38, 1);
    counter.strokeRoundedRect(720, 452, 295, 285, 8);

    // Top edge
    counter.fillStyle(0x7B5A30, 1);
    counter.fillRect(730, 455, 275, 4);

    // Shelf divider
    counter.fillStyle(0x5A3A18, 1);
    counter.fillRect(728, 568, 280, 4);

    // Shelf label: treatments
    this.add.text(cx, 462, 'PREP STATION', {
      fontSize: '9px', color: '#aa8855', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    // Treatment items on top shelf
    const treatKeys = ['toasted', 'togo', 'salt_pepper', 'oil_vinegar'];
    const treatX = [765, 825, 895, 965];
    treatKeys.forEach((tKey, i) => {
      this.createTreatmentItem(tKey, treatX[i], 515);
    });

    // Shelf label: sauces
    this.add.text(cx, 578, 'SAUCES', {
      fontSize: '9px', color: '#aa8855', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    // Sauce bottles (single permanent bottles)
    this.createSauceBottle('sauce_mayo', 800, 650);
    this.createSauceBottle('sauce_mustard', 930, 650);
  }

  createSauceBottle(key, x, y) {
    const ing = INGREDIENTS[key];
    const c = this.add.container(x, y).setDepth(25);
    c.setSize(60, 80);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-30, -40, 60, 80),
      Phaser.Geom.Rectangle.Contains,
    );

    const g = this.add.graphics();
    // Large standing bottle
    g.fillStyle(ing.color, 1);
    g.fillRoundedRect(-20, -8, 40, 45, 8);
    g.fillRect(-7, -28, 14, 22);
    g.fillStyle(ing.border || 0x888888, 1);
    g.fillRoundedRect(-9, -35, 18, 9, 3);
    // Label stripe
    g.fillStyle(ing.border, 0.3);
    g.fillRect(-16, 5, 32, 16);
    g.lineStyle(1.5, ing.border, 0.6);
    g.strokeRoundedRect(-20, -8, 40, 45, 8);
    c.add(g);

    // Name label
    const label = this.add.text(0, 28, ing.name, {
      fontSize: '11px', color: '#ddd', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem || this.activeTreatment) return;
      soundManager.init();
      this.pickupSauce(key);
    });
  }

  pickupSauce(key) {
    const pointer = this.input.activePointer;
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = {
      visual,
      ingredientKey: key,
      isSauce: true,
    };
    this._justPickedUp = true;
  }

  createTreatmentItem(tKey, x, y) {
    const treat = TREATMENTS[tKey];
    const c = this.add.container(x, y).setDepth(25);
    c.setSize(50, 55);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-25, -28, 50, 55),
      Phaser.Geom.Rectangle.Contains,
    );

    const g = this.add.graphics();

    if (tKey === 'toasted') {
      // Toaster
      g.fillStyle(0x888888, 1);
      g.fillRoundedRect(-18, -10, 36, 30, 4);
      g.lineStyle(1, 0x666666, 1);
      g.strokeRoundedRect(-18, -10, 36, 30, 4);
      g.fillStyle(0x333333, 1);
      g.fillRect(-12, -8, 10, 4);
      g.fillRect(2, -8, 10, 4);
      g.fillStyle(0xAAAAAA, 1);
      g.fillRect(14, 2, 6, 12);
    } else if (tKey === 'togo') {
      // Paper wrap
      g.fillStyle(0xD4C4A0, 1);
      g.fillRoundedRect(-18, -12, 36, 32, 3);
      g.lineStyle(1, 0xB0A080, 1);
      g.strokeRoundedRect(-18, -12, 36, 32, 3);
      g.lineStyle(0.8, 0xB0A080, 0.5);
      g.lineBetween(-12, -2, 12, -2);
      g.lineBetween(-10, 8, 10, 8);
    } else if (tKey === 'salt_pepper') {
      // Salt shaker (left)
      g.fillStyle(0xEEEEEE, 1);
      g.fillRoundedRect(-18, -8, 14, 24, 4);
      g.fillStyle(0xCCCCCC, 1);
      g.fillRect(-16, -12, 10, 6);
      // Pepper shaker (right)
      g.fillStyle(0x444444, 1);
      g.fillRoundedRect(4, -8, 14, 24, 4);
      g.fillStyle(0x333333, 1);
      g.fillRect(6, -12, 10, 6);
    } else if (tKey === 'oil_vinegar') {
      // Oil bottle (left)
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-18, -4, 14, 22, 4);
      g.fillRect(-14, -14, 6, 12);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-15, -17, 8, 5);
      // Vinegar bottle (right)
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(4, -4, 14, 22, 4);
      g.fillRect(8, -14, 6, 12);
      g.fillStyle(0x662200, 1);
      g.fillRect(7, -17, 8, 5);
    }

    c.add(g);

    const label = this.add.text(0, 22, treat.name, {
      fontSize: '9px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
      soundManager.init();
      this.toggleTreatment(tKey);
    });

    this.treatmentItems[tKey] = c;
  }

  /* =========================================
     TREATMENT MODE
     ========================================= */
  toggleTreatment(key) {
    if (this.activeTreatment === key) {
      this.deactivateTreatment();
      return;
    }
    this.deactivateTreatment();
    this.activeTreatment = key;
    this._justActivatedTreatment = true;

    // Highlight active treatment item with glow
    const item = this.treatmentItems[key];
    if (item) {
      this.treatmentGlow = this.add.graphics().setDepth(24);
      const bx = item.x - 28;
      const by = item.y - 32;
      this.treatmentGlow.lineStyle(3, 0xFFAA00, 0.8);
      this.treatmentGlow.strokeRoundedRect(bx, by, 56, 62, 6);
      this.tweens.add({
        targets: this.treatmentGlow,
        alpha: 0.4,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    soundManager.treatmentSound();
  }

  deactivateTreatment() {
    this.activeTreatment = null;
    if (this.treatmentGlow) {
      this.tweens.killTweensOf(this.treatmentGlow);
      this.treatmentGlow.destroy();
      this.treatmentGlow = null;
    }
  }

  applyTreatmentToTray(tray, treatmentKey) {
    if (!tray.order.treatments || tray.order.treatments.length === 0) {
      soundManager.buzz();
      this.flashTray(tray, 0xff0000);
      return;
    }

    const needed = tray.order.treatments.includes(treatmentKey);
    const alreadyApplied = tray.appliedTreatments.includes(treatmentKey);

    if (!needed || alreadyApplied) {
      soundManager.buzz();
      this.flashTray(tray, 0xff0000);
      return;
    }

    tray.appliedTreatments.push(treatmentKey);
    soundManager.treatmentSound();

    this.updateTicketTreatment(tray.orderNum, treatmentKey);
    this.drawTreatmentEffect(tray, treatmentKey);
    this.checkTrayCompletion(tray);
  }

  drawTreatmentEffect(tray, treatmentKey) {
    const g = this.add.graphics();
    const topY = -16 - tray.stackLayers.length * 9;

    if (treatmentKey === 'toasted') {
      g.lineStyle(2, 0x8B4513, 0.6);
      for (let sx = -40; sx <= 40; sx += 12) {
        g.lineBetween(sx, topY - 2, sx + 6, topY + 6);
      }
      g.lineStyle(1.5, 0xFF8C00, 0.4);
      for (let sx = -34; sx <= 34; sx += 12) {
        g.lineBetween(sx, topY, sx + 4, topY + 5);
      }
    } else if (treatmentKey === 'togo') {
      g.lineStyle(2, 0xD4C4A0, 0.7);
      g.strokeRoundedRect(-55, topY - 5, 110, (-topY) + 10, 3);
      g.fillStyle(0xD4C4A0, 0.15);
      g.fillRoundedRect(-55, topY - 5, 110, (-topY) + 10, 3);
    } else if (treatmentKey === 'salt_pepper') {
      for (let i = 0; i < 12; i++) {
        const sx = (Math.random() - 0.5) * 80;
        const sy = topY + Math.random() * 8;
        g.fillStyle(i % 2 === 0 ? 0xFFFFFF : 0x333333, 0.7);
        g.fillCircle(sx, sy, 1);
      }
    } else if (treatmentKey === 'oil_vinegar') {
      g.lineStyle(1.5, 0xAAAA22, 0.5);
      g.beginPath();
      g.moveTo(-35, topY + 2);
      for (let sx = -35; sx <= 35; sx += 6) {
        g.lineTo(sx, topY + 2 + ((Math.floor(sx / 6) % 2 === 0) ? -2 : 2));
      }
      g.strokePath();
      g.lineStyle(1, 0x884422, 0.4);
      g.beginPath();
      g.moveTo(-30, topY + 5);
      for (let sx = -30; sx <= 30; sx += 7) {
        g.lineTo(sx, topY + 5 + ((Math.floor(sx / 7) % 2 === 0) ? 2 : -1));
      }
      g.strokePath();
    }

    tray.container.add(g);
  }

  spawnBinItem(key, binX, binY, slotIndex) {
    const ITEM_SCALE = 0.45;

    // Scattered positions within the bin (relative to bin center)
    const positions = [
      { dx: -30, dy: -16 },
      { dx: 2, dy: -18 },
      { dx: 32, dy: -14 },
      { dx: -22, dy: 4 },
      { dx: 10, dy: 2 },
      { dx: 35, dy: 6 },
      { dx: -8, dy: 16 },
      { dx: 24, dy: 18 },
    ];

    const slot = slotIndex !== undefined ? slotIndex % positions.length : 0;
    const pos = positions[slot];

    // Slight random offset for natural look
    const rx = pos.dx + (Math.random() - 0.5) * 6;
    const ry = pos.dy + (Math.random() - 0.5) * 4;
    const rot = (Math.random() - 0.5) * 0.15;

    const ix = binX + rx;
    const iy = binY + ry;

    const c = this.add.container(ix, iy).setDepth(25);
    c.setScale(ITEM_SCALE);
    c.setRotation(rot);
    c.setSize(130, 56);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-65, -28, 130, 56),
      Phaser.Geom.Rectangle.Contains,
    );

    // Draw recognizable shape
    const g = this.add.graphics();
    this.drawBinIngredient(g, key);
    c.add(g);

    c.setData('ingredientKey', key);
    c.setData('binX', binX);
    c.setData('binY', binY);
    c.setData('isBinItem', true);
    c.setData('slotIndex', slot);

    // Click handler for pickup
    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem || this.activeTreatment) return;
      soundManager.init();
      this.pickupItem(c);
    });

    // Track in bin data
    if (this.binData[key]) {
      this.binData[key].items.push(c);
    }

    return c;
  }

  /* =========================================
     INGREDIENT VISUALS (bin items)
     ========================================= */
  drawBinIngredient(g, key) {
    const ing = INGREDIENTS[key];
    const cat = ing.category;

    if (cat === 'bread') {
      // Bread slice with dome top
      g.fillStyle(ing.color, 1);
      g.beginPath();
      g.moveTo(-44, 8);
      g.lineTo(-44, 0);
      g.lineTo(-38, -5);
      g.lineTo(-28, -10);
      g.lineTo(-15, -13);
      g.lineTo(0, -14);
      g.lineTo(15, -13);
      g.lineTo(28, -10);
      g.lineTo(38, -5);
      g.lineTo(44, 0);
      g.lineTo(44, 8);
      g.closePath();
      g.fillPath();
      g.lineStyle(1.5, ing.border, 0.9);
      g.beginPath();
      g.moveTo(-44, 8);
      g.lineTo(-44, 0);
      g.lineTo(-38, -5);
      g.lineTo(-28, -10);
      g.lineTo(-15, -13);
      g.lineTo(0, -14);
      g.lineTo(15, -13);
      g.lineTo(28, -10);
      g.lineTo(38, -5);
      g.lineTo(44, 0);
      g.lineTo(44, 8);
      g.closePath();
      g.strokePath();
      if (key === 'bread_wheat') {
        g.fillStyle(0xB08840, 0.4);
        g.fillCircle(-15, -2, 2);
        g.fillCircle(10, 1, 1.5);
        g.fillCircle(-5, -8, 1.5);
        g.fillCircle(20, -4, 2);
      }
    } else if (cat === 'meat') {
      // Deli slice — folded oval
      g.fillStyle(ing.color, 1);
      g.fillEllipse(0, -2, 80, 26);
      g.lineStyle(1, ing.border, 0.8);
      g.strokeEllipse(0, -2, 80, 26);
      if (key === 'meat_ham') {
        g.lineStyle(0.8, 0xE89BA6, 0.3);
        g.strokeEllipse(0, -2, 50, 14);
      } else if (key === 'meat_roastbeef') {
        g.lineStyle(0.8, 0x6B3000, 0.3);
        g.lineBetween(-15, -6, -8, 3);
        g.lineBetween(12, -5, 18, 4);
      } else {
        g.lineStyle(0.8, 0xB89A70, 0.3);
        g.strokeEllipse(0, -2, 48, 12);
      }
    } else if (cat === 'cheese') {
      // Square cheese slice
      g.fillStyle(ing.color, 1);
      g.fillRoundedRect(-40, -14, 80, 26, 3);
      g.lineStyle(1.5, ing.border, 0.8);
      g.strokeRoundedRect(-40, -14, 80, 26, 3);
      if (key === 'cheese_swiss') {
        g.fillStyle(ing.border, 0.5);
        g.fillCircle(-16, -3, 5);
        g.fillCircle(8, 3, 4);
        g.fillCircle(22, -6, 3);
        g.fillCircle(-4, 5, 3);
      }
    } else if (cat === 'topping') {
      if (key === 'top_lettuce') {
        // Wavy leaf shape
        g.fillStyle(ing.color, 1);
        g.beginPath();
        g.moveTo(-38, 2);
        g.lineTo(-35, -6);
        g.lineTo(-22, -10);
        g.lineTo(-12, -5);
        g.lineTo(-2, -11);
        g.lineTo(10, -6);
        g.lineTo(20, -10);
        g.lineTo(32, -5);
        g.lineTo(38, -7);
        g.lineTo(38, 4);
        g.lineTo(30, 9);
        g.lineTo(18, 5);
        g.lineTo(6, 10);
        g.lineTo(-6, 4);
        g.lineTo(-18, 9);
        g.lineTo(-32, 5);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, ing.border, 0.7);
        g.beginPath();
        g.moveTo(-38, 2);
        g.lineTo(-35, -6);
        g.lineTo(-22, -10);
        g.lineTo(-12, -5);
        g.lineTo(-2, -11);
        g.lineTo(10, -6);
        g.lineTo(20, -10);
        g.lineTo(32, -5);
        g.lineTo(38, -7);
        g.lineTo(38, 4);
        g.lineTo(30, 9);
        g.lineTo(18, 5);
        g.lineTo(6, 10);
        g.lineTo(-6, 4);
        g.lineTo(-18, 9);
        g.lineTo(-32, 5);
        g.closePath();
        g.strokePath();
        // Leaf veins
        g.lineStyle(0.5, 0x28A428, 0.3);
        g.lineBetween(0, -8, 0, 6);
        g.lineBetween(-14, -5, -10, 5);
        g.lineBetween(14, -6, 10, 5);
      } else if (key === 'top_tomato') {
        // Tomato slice circle
        g.fillStyle(ing.color, 1);
        g.fillCircle(0, -2, 14);
        g.fillStyle(0xFF8060, 0.5);
        g.fillCircle(0, -2, 9);
        // Seeds
        g.fillStyle(0xFFCCBB, 0.6);
        g.fillEllipse(-3, -5, 3, 1.5);
        g.fillEllipse(3, -4, 3, 1.5);
        g.fillEllipse(-2, 2, 3, 1.5);
        g.fillEllipse(4, 1, 3, 1.5);
        g.lineStyle(1, ing.border, 0.8);
        g.strokeCircle(0, -2, 14);
      } else if (key === 'top_onion') {
        // Onion ring
        g.fillStyle(ing.color, 1);
        g.fillCircle(0, -2, 14);
        g.lineStyle(1.5, 0xD0B8E0, 0.5);
        g.strokeCircle(0, -2, 11);
        g.strokeCircle(0, -2, 7);
        g.strokeCircle(0, -2, 3);
        g.lineStyle(1, ing.border, 0.7);
        g.strokeCircle(0, -2, 14);
      }
    } else if (cat === 'sauce') {
      // Bottle shape
      g.fillStyle(ing.color, 1);
      g.fillRoundedRect(-16, -2, 32, 18, 5); // body
      g.fillRect(-5, -12, 10, 12); // neck
      g.fillStyle(ing.border || 0x888888, 1);
      g.fillRoundedRect(-7, -16, 14, 6, 2); // cap
      g.fillStyle(ing.border, 0.3);
      g.fillRect(-12, 1, 24, 10); // label area
      g.lineStyle(1, ing.border, 0.6);
      g.strokeRoundedRect(-16, -2, 32, 18, 5);
    }
  }

  /* =========================================
     CLICK TO PLACE (replaces drag & drop)
     ========================================= */
  setupClickToPlace() {
    this.trayHighlight = this.add.graphics().setDepth(9);

    // Pointer tracking — move held item with cursor, or highlight for treatment mode
    this.input.on('pointermove', (pointer) => {
      // Treatment mode highlight
      if (this.activeTreatment) {
        this.trayHighlight.clear();
        if (pointer.y < 435) {
          const tray = this.findTrayAtX(pointer.x);
          if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
            this.trayHighlight.lineStyle(2, 0xFFAA00, 0.5);
            this.trayHighlight.strokeRoundedRect(
              tray.container.x - 72, 270, 144, 155, 8,
            );
          }
        }
        return;
      }

      if (!this.heldItem) {
        this.trayHighlight.clear();
        return;
      }
      this.heldItem.visual.x = pointer.x;
      this.heldItem.visual.y = pointer.y;

      // Highlight nearest valid tray
      this.trayHighlight.clear();
      if (pointer.y < 435) {
        const tray = this.findTrayAtX(pointer.x);
        if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
          this.trayHighlight.lineStyle(2, 0x44ff44, 0.35);
          this.trayHighlight.strokeRoundedRect(
            tray.container.x - 72, 270, 144, 155, 8,
          );
        }
      }
    });

    // Click to place held item or apply treatment
    this.input.on('pointerdown', (pointer) => {
      if (this.isPaused) return;

      // Treatment mode — apply to tray
      if (this.activeTreatment) {
        if (this._justActivatedTreatment) {
          this._justActivatedTreatment = false;
          return;
        }
        if (pointer.y < 435) {
          const tray = this.findTrayAtX(pointer.x);
          if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
            this.applyTreatmentToTray(tray, this.activeTreatment);
          }
        }
        return;
      }

      if (!this.heldItem) return;

      // Skip the same click that picked up the item
      if (this._justPickedUp) {
        this._justPickedUp = false;
        return;
      }

      this.placeHeldItem(pointer);
    });

    // ESC to cancel held item or deselect treatment
    this.escKey.on('down', () => {
      if (this.activeTreatment) {
        this.deactivateTreatment();
      } else if (this.heldItem) {
        this.cancelHeldItem();
      }
    });
  }

  pickupItem(binItemContainer) {
    const key = binItemContainer.getData('ingredientKey');
    const binX = binItemContainer.getData('binX');
    const binY = binItemContainer.getData('binY');

    // Remove from bin tracking
    if (this.binData[key]) {
      this.binData[key].items = this.binData[key].items.filter((i) => i !== binItemContainer);
    }

    binItemContainer.destroy();

    // Create full-size visual that follows the cursor
    const pointer = this.input.activePointer;
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);

    this.heldItem = {
      visual,
      ingredientKey: key,
      binX,
      binY,
    };
    this._justPickedUp = true;

    // Respawn a replacement in the bin after a short delay
    this.time.delayedCall(600, () => {
      if (this.binData[key]) {
        const slot = this.binData[key].items.length;
        this.spawnBinItem(key, binX, binY, slot);
      }
    });
  }

  createHeldVisual(key, x, y) {
    const ing = INGREDIENTS[key];
    const c = this.add.container(x, y).setDepth(100);
    c.setSize(130, 56);

    const g = this.add.graphics();
    this.drawBinIngredient(g, key);
    c.add(g);

    const label = this.add.text(0, 17, ing.name, {
      fontSize: '13px', color: ing.textColor || '#000',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.setAlpha(0.85);

    // Small pop-in scale animation
    c.setScale(0.4);
    this.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    return c;
  }

  placeHeldItem(pointer) {
    const key = this.heldItem.ingredientKey;
    const obj = this.heldItem.visual;
    const tray = this.findTrayAtX(pointer.x);
    const landY = 385;

    if (tray && !tray.completed && !tray.done && !tray.passedFinish && pointer.y < landY + 40) {
      // Gravity fall toward tray
      const fallDist = Math.max(0, landY - obj.y);
      const duration = Math.max(80, Math.min(400, fallDist * 1.8));

      this.tweens.add({
        targets: obj,
        y: landY,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          if (tray && !tray.done) {
            obj.x += (tray.container.x - obj.x) * 0.15;
          }
        },
        onComplete: () => {
          const result = this.tryPlace(tray, key);
          if (result === 'valid') {
            const ing = INGREDIENTS[key];
            soundManager.plopCategory(ing.category);
          } else if (result === 'wrong') {
            soundManager.buzz();
            this.dayScore = Math.max(0, this.dayScore - 25);
            this.refreshHUD();
            this.flashTray(tray, 0xff0000);
          }
          obj.destroy();
        },
      });

      this.heldItem = null;
      this.trayHighlight.clear();
    } else {
      // Not near a tray — cancel, return item to bin
      this.cancelHeldItem();
    }
  }

  cancelHeldItem() {
    if (!this.heldItem) return;
    const obj = this.heldItem.visual;

    // Fade out and destroy
    this.tweens.add({
      targets: obj,
      y: obj.y + 60,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => obj.destroy(),
    });

    this.heldItem = null;
    this.trayHighlight.clear();
  }

  findTrayAtX(x) {
    let closest = null;
    let closestDist = Infinity;
    const tolerance = 80;

    for (const tray of this.trays) {
      if (tray.done || tray.passedFinish || tray.completed) continue;
      const dist = Math.abs(tray.container.x - x);
      if (dist < tolerance && dist < closestDist) {
        closest = tray;
        closestDist = dist;
      }
    }
    return closest;
  }

  /* =========================================
     TRAY SPAWNING
     ========================================= */
  spawnTray() {
    const order = this.generateOrder();
    this.orderNumber++;
    const orderNum = this.orderNumber;
    const startX = 1120;
    const baseY = 400;

    // Add ticket to the slider
    this.addTicket(order, orderNum);

    // Tray container
    const container = this.add.container(startX, baseY).setDepth(10);

    // Tray base (larger)
    const base = this.add.graphics();
    base.fillStyle(0x8B7355, 1);
    base.fillRoundedRect(-65, -10, 130, 24, 5);
    base.lineStyle(2, 0x6B5335, 1);
    base.strokeRoundedRect(-65, -10, 130, 24, 5);
    container.add(base);

    // Order number badge
    const numBg = this.add.graphics();
    numBg.fillStyle(0xFFFFC0, 1);
    numBg.fillCircle(0, -28, 18);
    numBg.lineStyle(2, 0xCCCC80, 1);
    numBg.strokeCircle(0, -28, 18);
    container.add(numBg);

    const numText = this.add.text(0, -28, `${orderNum}`, {
      fontSize: '17px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    const tray = {
      container,
      order,
      orderNum,
      placed: [],
      stackLayers: [],
      appliedTreatments: [],
      completed: false,
      done: false,
      passedFinish: false,
      scored: false,
    };

    this.trays.push(tray);
    this.ordersSpawned++;

    // Transition to normal timer after 3rd sequential order
    if (this.ordersSpawned === 3) {
      this.spawnTimer = this.spawnInterval * 0.5;
    }

    this.refreshHUD();
  }

  generateOrder() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickN = (arr, n) => {
      const copy = [...arr];
      const out = [];
      for (let i = 0; i < n && copy.length; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    };

    const breads = ['bread_white', 'bread_wheat'];
    const meats = ['meat_ham', 'meat_turkey', 'meat_roastbeef'];
    const cheeses = ['cheese_american', 'cheese_swiss'];
    const toppings = ['top_lettuce', 'top_tomato', 'top_onion'];
    const sauces = ['sauce_mayo', 'sauce_mustard'];

    const list = [];
    const bread = pick(breads);

    // Bottom bread first
    list.push(bread);
    list.push(pick(meats));

    if (this.day >= 2 || Math.random() > 0.5) {
      list.push(pick(cheeses));
    }

    const topCount = Math.min(
      Math.floor(Math.random() * (1 + Math.min(this.day, 3))),
      2,
    );
    if (topCount > 0) {
      pickN(toppings, topCount).forEach((t) => list.push(t));
    }

    if (this.day >= 2 || Math.random() > 0.4) {
      list.push(pick(sauces));
    }

    // Top bread last — player must close the sandwich
    list.push(bread);

    // Treatments based on day config
    const treatments = [];
    const cfg = DAY_CONFIG[this.day];
    if (cfg.treatmentChance > 0 && Math.random() < cfg.treatmentChance) {
      const allTreatments = Object.keys(TREATMENTS);
      if (this.day <= 2) {
        // Day 2: only toasted or salt_pepper
        const simple = ['toasted', 'salt_pepper'];
        treatments.push(pick(simple));
      } else {
        // Day 3+: up to 2 treatments, any type
        const count = Math.random() < 0.4 ? 2 : 1;
        const chosen = pickN(allTreatments, count);
        chosen.forEach((t) => treatments.push(t));
      }
    }

    return { ingredients: list, treatments };
  }

  /* =========================================
     PLACING INGREDIENTS (strict order)
     ========================================= */
  tryPlace(tray, ingredientKey) {
    const nextIndex = tray.placed.length;
    if (nextIndex >= tray.order.ingredients.length) return 'wrong';

    // Must place in exact order shown on ticket
    const expected = tray.order.ingredients[nextIndex];
    if (ingredientKey !== expected) return 'wrong';

    tray.placed.push(ingredientKey);

    // Update ticket in slider
    this.updateTicketIngredient(tray.orderNum, ingredientKey);

    // Stack visual on tray
    this.addStackLayer(tray, ingredientKey);

    // Check completion — all ingredients AND all treatments
    this.checkTrayCompletion(tray);

    return 'valid';
  }

  /* =========================================
     STACK VISUALS (recognizable layers)
     ========================================= */
  addStackLayer(tray, ingredientKey) {
    const ing = INGREDIENTS[ingredientKey];
    const idx = tray.stackLayers.length;
    const ly = -16 - idx * 9;

    const g = this.add.graphics();
    const cat = ing.category;

    if (cat === 'bread') {
      // Dome shape for bread
      g.fillStyle(ing.color, 1);
      g.beginPath();
      g.moveTo(-52, ly + 9);
      g.lineTo(-52, ly + 3);
      g.lineTo(-44, ly);
      g.lineTo(-30, ly - 3);
      g.lineTo(-15, ly - 4);
      g.lineTo(0, ly - 5);
      g.lineTo(15, ly - 4);
      g.lineTo(30, ly - 3);
      g.lineTo(44, ly);
      g.lineTo(52, ly + 3);
      g.lineTo(52, ly + 9);
      g.closePath();
      g.fillPath();
      g.lineStyle(0.8, ing.border, 0.6);
      g.beginPath();
      g.moveTo(-52, ly + 9);
      g.lineTo(-52, ly + 3);
      g.lineTo(-44, ly);
      g.lineTo(-30, ly - 3);
      g.lineTo(-15, ly - 4);
      g.lineTo(0, ly - 5);
      g.lineTo(15, ly - 4);
      g.lineTo(30, ly - 3);
      g.lineTo(44, ly);
      g.lineTo(52, ly + 3);
      g.lineTo(52, ly + 9);
      g.closePath();
      g.strokePath();
    } else if (cat === 'sauce') {
      // Zigzag squirt of sauce
      g.lineStyle(3, ing.color, 0.9);
      g.beginPath();
      g.moveTo(-35, ly + 4);
      for (let sx = -35; sx <= 35; sx += 8) {
        g.lineTo(sx, ly + 4 + ((Math.floor(sx / 8) % 2 === 0) ? -2 : 2));
      }
      g.strokePath();
    } else if (cat === 'cheese') {
      g.fillStyle(ing.color, 1);
      g.fillRect(-48, ly, 96, 7);
      if (ingredientKey === 'cheese_swiss') {
        g.fillStyle(ing.border, 0.5);
        g.fillCircle(-20, ly + 3, 2);
        g.fillCircle(10, ly + 4, 1.5);
        g.fillCircle(30, ly + 2, 2);
      }
      g.lineStyle(0.5, ing.border, 0.5);
      g.strokeRect(-48, ly, 96, 7);
    } else if (ingredientKey === 'top_lettuce') {
      // Wavy green strip
      g.fillStyle(ing.color, 1);
      g.beginPath();
      g.moveTo(-48, ly + 7);
      g.lineTo(-48, ly + 3);
      for (let sx = -48; sx <= 48; sx += 12) {
        g.lineTo(sx, (Math.floor((sx + 48) / 12) % 2 === 0) ? ly : ly + 4);
      }
      g.lineTo(48, ly + 7);
      g.closePath();
      g.fillPath();
    } else if (ingredientKey === 'top_tomato') {
      g.fillStyle(ing.color, 1);
      g.fillRect(-44, ly, 88, 7);
      // Seed dots
      g.fillStyle(0xFF8060, 0.4);
      g.fillCircle(-15, ly + 3, 2);
      g.fillCircle(0, ly + 4, 1.5);
      g.fillCircle(15, ly + 3, 2);
    } else if (ingredientKey === 'top_onion') {
      g.fillStyle(ing.color, 1);
      g.fillRect(-44, ly, 88, 7);
      g.lineStyle(0.5, 0xD0B8E0, 0.4);
      g.strokeCircle(-18, ly + 3, 5);
      g.strokeCircle(5, ly + 4, 4);
      g.strokeCircle(22, ly + 3, 5);
    } else {
      // Default meat — slight oval
      g.fillStyle(ing.color, 1);
      g.fillEllipse(0, ly + 4, 96, 8);
      if (ing.border) {
        g.lineStyle(0.5, ing.border, 0.4);
        g.strokeEllipse(0, ly + 4, 96, 8);
      }
    }

    tray.container.add(g);
    tray.stackLayers.push(g);

    // Meat wobble animation
    if (cat === 'meat') {
      this.tweens.add({
        targets: g,
        rotation: 0.05,
        duration: 400,
        ease: 'Elastic.easeOut',
        yoyo: true,
      });
    }
  }

  checkTrayCompletion(tray) {
    const ingredientsDone = tray.placed.length === tray.order.ingredients.length;
    const treatmentsDone = !tray.order.treatments || tray.order.treatments.length === 0
      || tray.order.treatments.every((t) => tray.appliedTreatments.includes(t));

    if (ingredientsDone && treatmentsDone) {
      this.completeTray(tray);
    }
  }

  completeTray(tray) {
    tray.completed = true;
    // No auto-top-bread — player placed it. Just green glow.
    this.flashTray(tray, 0x00ff00);
  }

  flashTray(tray, color) {
    const flash = this.add.graphics();
    flash.fillStyle(color, 0.25);
    flash.fillRoundedRect(-70, -130, 140, 145, 8);
    tray.container.add(flash);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });
  }

  /* =========================================
     SCORING (at finish line)
     ========================================= */
  handleScore(tray) {
    tray.scored = true;
    this.ordersCompleted++;

    const speedBonus = tray.container.x > 300 ? 50 : 0;
    this.dayScore += 100 + speedBonus;
    this.refreshHUD();

    soundManager.score();
    this.markTicketCompleted(tray.orderNum);

    const pts = 100 + speedBonus;
    const popup = this.add.text(tray.container.x, tray.container.y - 70,
      `+${pts}`, {
        fontSize: '26px', color: '#0f0', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: popup, y: popup.y - 50, alpha: 0, duration: 1200,
      onComplete: () => popup.destroy(),
    });

    const check = this.add.text(0, -90, '\u2713', {
      fontSize: '30px', color: '#0f0', fontStyle: 'bold',
    }).setOrigin(0.5);
    tray.container.add(check);

    this.resolveSequential();
  }

  /* =========================================
     MISSES / STRIKES
     ========================================= */
  handleMiss(tray) {
    this.strikes++;
    this.ordersMissed++;
    this.refreshHUD();
    soundManager.buzz();

    this.markTicketMissed(tray.orderNum);

    const miss = this.add.text(140, 340, '\u2717 MISSED!', {
      fontSize: '36px', color: '#ff3333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: miss, alpha: 0, y: 280, duration: 1200,
      onComplete: () => miss.destroy(),
    });

    this.resolveSequential();

    if (this.strikes >= this.maxStrikes) {
      this.isPaused = true;
      this.time.delayedCall(800, () => {
        this.scene.start('GameOver', {
          day: this.day,
          totalScore: this.totalScore + this.dayScore,
        });
      });
    }
  }

  resolveSequential() {
    if (this.ordersSpawned < 3) {
      this.waitingForNext = true;
      this.sequentialDelay = 0;
    }
  }

  /* =========================================
     CLEANUP
     ========================================= */
  destroyTray(tray) {
    tray.container.destroy();
  }

  endDay() {
    this.isPaused = true;
    const finalTotal = this.totalScore + this.dayScore;
    this.time.delayedCall(600, () => {
      this.scene.start('DayEnd', {
        day: this.day,
        dayScore: this.dayScore,
        totalScore: finalTotal,
        ordersCompleted: this.ordersCompleted,
        totalOrders: this.totalOrders,
      });
    });
  }

  /* =========================================
     GAME LOOP
     ========================================= */
  update(time, delta) {
    if (this.isPaused) {
      if (this.heldItem) this.cancelHeldItem();
      if (this.activeTreatment) this.deactivateTreatment();
      return;
    }

    // Speed boost from space bar
    const speedMult = this.spaceKey.isDown ? 2.5 : 1;
    this.speedText.setAlpha(this.spaceKey.isDown ? 0.8 : 0);

    // Shift time
    this.shiftElapsed += delta * speedMult;
    this.updateClock();

    // Window glare animation
    this.glareOffset = (this.glareOffset + delta * 0.00008) % 1;
    this.updateWindowGlare();

    // Belt animation
    this.beltOffset -= this.conveyorSpeed * (delta / 16) * speedMult;
    if (this.beltOffset < -40) this.beltOffset += 40;
    this.drawBelt();

    // --- spawn logic ---
    if (this.ordersSpawned < this.totalOrders) {
      if (this.ordersSpawned < 3) {
        if (this.waitingForNext) {
          this.sequentialDelay += delta * speedMult;
          const delay = this.ordersSpawned === 0 ? 800 : 1500;
          if (this.sequentialDelay >= delay) {
            this.spawnTray();
            this.waitingForNext = false;
            this.sequentialDelay = 0;
          }
        }
      } else {
        this.spawnTimer += delta * speedMult;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTray();
          this.spawnTimer = 0;
        }
      }
    }

    // --- move trays ---
    const speed = this.conveyorSpeed * (delta / 16) * speedMult;
    for (const tray of this.trays) {
      if (tray.done) continue;

      let moveSpeed = speed;
      if (tray.completed) moveSpeed *= 2;
      if (tray.passedFinish) moveSpeed *= 2;

      tray.container.x -= moveSpeed;

      // Finish line check
      if (!tray.passedFinish && tray.container.x <= this.finishLineX) {
        tray.passedFinish = true;
        if (tray.completed) {
          this.handleScore(tray);
        } else {
          this.handleMiss(tray);
        }
      }

      // Off-screen cleanup
      if (tray.container.x < -120) {
        tray.done = true;
        this.destroyTray(tray);
      }
    }

    // Prune done trays
    this.trays = this.trays.filter((t) => !t.done);

    // Day complete?
    if (
      this.ordersSpawned >= this.totalOrders
      && this.trays.length === 0
      && !this._dayEnding
    ) {
      this._dayEnding = true;
      this.endDay();
    }
  }
}
