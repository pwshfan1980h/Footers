import Phaser from 'phaser';
import { INGREDIENTS, BIN_LAYOUT, BIN_COLORS, TREATMENTS, DAY_CONFIG } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';

function darkenColor(color, factor) {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

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

    // Space bar for speed boost
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- background (dark steel) ---
    this.add.rectangle(512, 384, 1024, 768, 0x2A2A30);

    // --- wall ---
    this.createWall();

    // --- HUD ---
    this.createHUD(cfg);

    // --- ticket bar ---
    this.createTicketBar();

    // --- game area bg (steel) ---
    this.add.rectangle(512, 290, 1024, 290, 0x303038).setDepth(0);

    // --- isometric floor tiles (belt area Y 265-396) ---
    this.createFloor();

    // --- belt ---
    this.beltGfx = this.add.graphics().setDepth(2);
    this.drawBelt();

    // --- finish line ---
    this.createFinishLine();

    // separator between belt and bins
    this.add.rectangle(512, 435, 1024, 2, 0x606068).setDepth(3);

    // --- bin area background ---
    this.add.rectangle(512, 590, 1024, 300, 0x282830).setDepth(0);

    // --- ingredient bins ---
    this.createBins();

    // --- sauces + treatments (free-floating) ---
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
     WALL (kitchen backsplash)
     ========================================= */
  createWall() {
    // Wall background (steel)
    this.add.rectangle(512, 25, 1024, 50, 0x484850).setDepth(0);
    this.add.rectangle(512, 50, 1024, 2, 0x383840).setDepth(1);

    // Subtle horizontal lines for kitchen tile backsplash
    const wallTiles = this.add.graphics().setDepth(1);
    wallTiles.lineStyle(1, 0x555560, 0.15);
    for (let y = 4; y < 50; y += 8) {
      wallTiles.lineBetween(0, y, 1024, y);
    }
  }

  /* =========================================
     HUD
     ========================================= */
  createHUD(cfg) {
    // Subtle HUD background strip
    this.add.rectangle(512, 25, 1024, 50, 0x383840).setDepth(4).setAlpha(0.5);

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
    this.add.rectangle(512, 95, 1024, 88, 0x383840).setDepth(8);
    this.add.rectangle(512, 52, 1024, 2, 0x505058).setDepth(9);
    this.add.rectangle(512, 138, 1024, 2, 0x505058).setDepth(9);

    // 3D bottom lip/shelf edge for ticket bar
    const ticketLip = this.add.graphics().setDepth(9);
    ticketLip.fillStyle(0x303038, 1);
    ticketLip.fillRect(0, 139, 1024, 4);
    ticketLip.fillStyle(0x505058, 1);
    ticketLip.beginPath();
    ticketLip.moveTo(0, 139);
    ticketLip.lineTo(1024, 139);
    ticketLip.lineTo(1024 + 3, 143);
    ticketLip.lineTo(3, 143);
    ticketLip.closePath();
    ticketLip.fillPath();

    this.add.text(8, 55, 'ORDERS:', {
      fontSize: '10px', color: '#777', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(10);

    this.ticketContainer = this.add.container(0, 0).setDepth(10);
  }

  addTicket(order, orderNum) {
    const cardW = 110;
    const ingLines = order.ingredients.length;
    const treatLines = order.treatments ? order.treatments.length : 0;
    const footerLine = order.isFooter ? 10 : 0;
    const contentH = 18 + footerLine + ingLines * 9 + (treatLines > 0 ? 8 + treatLines * 9 : 0);
    const cardH = Math.max(80, contentH + 5);
    const gap = 5;
    const baseX = 65 + (orderNum - 1) * (cardW + gap);
    const baseY = 55;

    const card = this.add.container(baseX + 40, baseY).setDepth(10);

    // Background — footer tickets have a distinct tint
    const bg = this.add.graphics();
    bg.fillStyle(order.isFooter ? 0xFFEEBB : 0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 4);
    bg.lineStyle(2, order.isFooter ? 0xDDAA55 : 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 4);
    card.add(bg);

    // Order number
    const numText = this.add.text(cardW / 2, 3, `#${orderNum}`, {
      fontSize: '12px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    card.add(numText);

    // Footer label
    let yOff = 16;
    if (order.isFooter) {
      const footerLabel = this.add.text(cardW / 2, 15, '\u2b50 FOOTER', {
        fontSize: '8px', color: '#AA6600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      card.add(footerLabel);
      yOff = 26;
    }

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xCCBB70, 1);
    div.lineBetween(4, yOff, cardW - 4, yOff);
    card.add(div);

    // Ingredient list — show build order
    const entries = [];
    order.ingredients.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isTopBread = (i === order.ingredients.length - 1 && key.startsWith('bread_'));
      const displayName = isTopBread ? `${ing.name} \u2191` : ing.name;
      const isNext = (i === 0);
      const txt = this.add.text(14, yOff + 2 + i * 9, displayName, {
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
      const treatStartY = yOff + 2 + ingLines * 9 + 2;
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
     FLOOR (isometric checkerboard tiles)
     ========================================= */
  createFloor() {
    const g = this.add.graphics().setDepth(1);
    const tileW = 32;
    const tileH = 32;
    const iso = 2;
    const startY = 270;
    const endY = 396;
    const cols = Math.ceil(1024 / tileW) + 1;
    const rows = Math.ceil((endY - startY) / tileH) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tx = c * tileW;
        const ty = startY + r * tileH;
        const isLight = (r + c) % 2 === 0;
        const color = isLight ? 0x363640 : 0x323238;

        // Top face (parallelogram)
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(tx, ty + iso);
        g.lineTo(tx + iso, ty);
        g.lineTo(tx + tileW + iso, ty);
        g.lineTo(tx + tileW, ty + iso);
        g.closePath();
        g.fillPath();

        // Main face
        g.fillStyle(darkenColor(color, 0.9), 1);
        g.fillRect(tx, ty + iso, tileW, tileH);

        // Bottom edge
        g.lineStyle(1, darkenColor(color, 0.7), 0.3);
        g.lineBetween(tx, ty + iso + tileH, tx + tileW, ty + iso + tileH);
      }
    }
  }

  /* =========================================
     BELT (isometric with 3D rails)
     ========================================= */
  drawBelt() {
    const g = this.beltGfx;
    g.clear();

    const isoOff = 4; // iso offset for top face

    // Top rail — 3D extruded metal
    // Front face
    g.fillStyle(0x505058, 1);
    g.fillRect(0, 396, 1024, 6);
    // Top face (parallelogram)
    g.fillStyle(0x808088, 1);
    g.beginPath();
    g.moveTo(0, 396);
    g.lineTo(isoOff, 396 - isoOff);
    g.lineTo(1024 + isoOff, 396 - isoOff);
    g.lineTo(1024, 396);
    g.closePath();
    g.fillPath();

    // Belt segments
    g.fillStyle(0x606068, 1);
    g.fillRect(0, 402, 1024, 28);
    let segIndex = 0;
    for (let x = this.beltOffset - 40; x < 1064; x += 40) {
      const tint = segIndex % 2 === 0 ? 0x606068 : 0x686870;
      g.fillStyle(tint, 1);
      const sx = Math.max(0, x);
      const sw = Math.min(38, 1024 - sx);
      if (sw > 0) g.fillRect(sx, 402, sw, 28);
      g.lineStyle(1, 0x7A7A84, 0.4);
      g.strokeRect(x, 402, 38, 28);
      segIndex++;
    }

    // Front face of belt housing below segments
    g.fillStyle(0x3A3840, 1);
    g.fillRect(0, 430, 1024, 6);

    // Bottom rail — polished edge
    g.fillStyle(0x808088, 1);
    g.fillRect(0, 432, 1024, 4);
    // Bottom highlight
    g.lineStyle(1, 0xA0A0A8, 0.3);
    g.lineBetween(0, 432, 1024, 432);
  }

  /* =========================================
     FINISH LINE (iso cubes)
     ========================================= */
  createFinishLine() {
    const x = this.finishLineX;
    const g = this.add.graphics().setDepth(6);

    for (let y = 145; y < 435; y += 12) {
      g.fillStyle(0x00ff00, 0.5);
      g.fillRect(x - 1, y, 3, 8);
    }

    // Checkered flag with tiny iso cubes
    const s = 6;
    const iso = 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const isWhite = (row + col) % 2 === 0;
        const bx = x - 9 + col * s;
        const by = 140 + row * s;

        // Front face
        g.fillStyle(isWhite ? 0xffffff : 0x000000, 0.6);
        g.fillRect(bx, by, s, s);
        // Top face
        g.fillStyle(isWhite ? 0xeeeeee : 0x222222, 0.6);
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + iso, by - iso);
        g.lineTo(bx + s + iso, by - iso);
        g.lineTo(bx + s, by);
        g.closePath();
        g.fillPath();
        // Right face
        g.fillStyle(isWhite ? 0xcccccc : 0x111111, 0.6);
        g.beginPath();
        g.moveTo(bx + s, by);
        g.lineTo(bx + s + iso, by - iso);
        g.lineTo(bx + s + iso, by + s - iso);
        g.lineTo(bx + s, by + s);
        g.closePath();
        g.fillPath();
      }
    }
  }

  /* =========================================
     INGREDIENT BINS (dynamic per-row sizing)
     ========================================= */
  createBins() {
    const rows = [500, 635];
    const availW = 680; // usable width before counter

    BIN_LAYOUT.forEach((row, ri) => {
      const count = row.length;
      const binW = count > 5 ? 108 : 128;
      const spacing = (availW - binW) / (count - 1);
      const startX = binW / 2 + 10;

      row.forEach((key, ci) => {
        this.createBin(key, startX + ci * spacing, rows[ri], binW);
      });
    });
  }

  createBin(ingredientKey, x, y, binWidth) {
    const ing = INGREDIENTS[ingredientKey];
    const colors = BIN_COLORS[ingredientKey] || { fill: 0x3a3a4e, border: 0x5a5a6e };
    const bg = this.add.graphics().setDepth(20);

    const bw = binWidth || 128;
    const bh = 88;
    const isoOff = 6;
    const bx = x - bw / 2;
    const by = y - 44;

    // Front face
    bg.fillStyle(colors.fill, 1);
    bg.fillRect(bx, by + isoOff, bw, bh);
    bg.lineStyle(1, colors.border, 0.6);
    bg.strokeRect(bx, by + isoOff, bw, bh);

    // Top rim (parallelogram)
    bg.fillStyle(colors.border, 1);
    bg.beginPath();
    bg.moveTo(bx, by + isoOff);
    bg.lineTo(bx + isoOff, by);
    bg.lineTo(bx + bw + isoOff, by);
    bg.lineTo(bx + bw, by + isoOff);
    bg.closePath();
    bg.fillPath();

    // Right side (darkened parallelogram)
    bg.fillStyle(darkenColor(colors.fill, 0.7), 1);
    bg.beginPath();
    bg.moveTo(bx + bw, by + isoOff);
    bg.lineTo(bx + bw + isoOff, by);
    bg.lineTo(bx + bw + isoOff, by + bh);
    bg.lineTo(bx + bw, by + isoOff + bh);
    bg.closePath();
    bg.fillPath();

    // Inner shadow
    bg.fillStyle(0x000000, 0.15);
    bg.fillRect(bx + 2, by + isoOff + 2, bw - 4, 12);

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
    // Free-floating treatment items (top row, aligned with bin row 1)
    const treatKeys = ['toasted', 'togo', 'salt_pepper', 'oil_vinegar'];
    const treatX = [750, 820, 890, 960];
    treatKeys.forEach((tKey, i) => {
      this.createTreatmentItem(tKey, treatX[i], 500);
    });

    // Free-floating sauce bottles (bottom row, aligned with bin row 2)
    this.createSauceBottle('sauce_mayo', 810, 635);
    this.createSauceBottle('sauce_mustard', 940, 635);
  }

  createSauceBottle(key, x, y) {
    const ing = INGREDIENTS[key];
    const c = this.add.container(x, y).setDepth(30);
    c.setSize(70, 105);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-35, -45, 70, 105),
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

    // Name label — below bottle with dark backing
    const labelBg = this.add.graphics();
    labelBg.fillStyle(0x000000, 0.5);
    labelBg.fillRoundedRect(-28, 40, 56, 18, 4);
    c.add(labelBg);
    const label = this.add.text(0, 49, ing.name, {
      fontSize: '12px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold',
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
    const c = this.add.container(x, y).setDepth(30);
    c.setSize(56, 78);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-28, -31, 56, 78),
      Phaser.Geom.Rectangle.Contains,
    );

    const g = this.add.graphics();

    if (tKey === 'toasted') {
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
      g.fillStyle(0xD4C4A0, 1);
      g.fillRoundedRect(-18, -12, 36, 32, 3);
      g.lineStyle(1, 0xB0A080, 1);
      g.strokeRoundedRect(-18, -12, 36, 32, 3);
      g.lineStyle(0.8, 0xB0A080, 0.5);
      g.lineBetween(-12, -2, 12, -2);
      g.lineBetween(-10, 8, 10, 8);
    } else if (tKey === 'salt_pepper') {
      g.fillStyle(0xEEEEEE, 1);
      g.fillRoundedRect(-18, -8, 14, 24, 4);
      g.fillStyle(0xCCCCCC, 1);
      g.fillRect(-16, -12, 10, 6);
      g.fillStyle(0x444444, 1);
      g.fillRoundedRect(4, -8, 14, 24, 4);
      g.fillStyle(0x333333, 1);
      g.fillRect(6, -12, 10, 6);
    } else if (tKey === 'oil_vinegar') {
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-18, -4, 14, 22, 4);
      g.fillRect(-14, -14, 6, 12);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-15, -17, 8, 5);
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(4, -4, 14, 22, 4);
      g.fillRect(8, -14, 6, 12);
      g.fillStyle(0x662200, 1);
      g.fillRect(7, -17, 8, 5);
    }

    c.add(g);

    // Label below art with dark backing
    const labelBg = this.add.graphics();
    labelBg.fillStyle(0x000000, 0.5);
    labelBg.fillRoundedRect(-24, 26, 48, 18, 4);
    c.add(labelBg);
    const label = this.add.text(0, 35, treat.name, {
      fontSize: '11px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
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

    const item = this.treatmentItems[key];
    if (item) {
      this.treatmentGlow = this.add.graphics().setDepth(24);
      const bx = item.x - 28;
      const by = item.y - 32;
      this.treatmentGlow.lineStyle(3, 0xFFAA00, 0.8);
      this.treatmentGlow.strokeRoundedRect(bx, by, 56, 78, 6);
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
    const layerCount = tray.stackLayers.length;
    // Top of the topmost layer and bottom of the stack
    const stackTop = -16 - (layerCount - 1) * 9;
    const stackBot = -16 + 9;
    const hw = tray.isFooter ? 80 : 55;

    if (treatmentKey === 'toasted') {
      // Toast marks across the whole sandwich body
      const midY = (stackTop + stackBot) / 2;
      const halfH = (stackBot - stackTop) / 2 + 4;
      g.lineStyle(2, 0x8B4513, 0.6);
      for (let sx = -(hw - 15); sx <= (hw - 15); sx += 12) {
        g.lineBetween(sx, midY - halfH, sx + 6, midY + halfH);
      }
      g.lineStyle(1.5, 0xFF8C00, 0.4);
      for (let sx = -(hw - 21); sx <= (hw - 21); sx += 12) {
        g.lineBetween(sx, midY - halfH + 2, sx + 4, midY + halfH - 2);
      }
    } else if (treatmentKey === 'togo') {
      g.lineStyle(2, 0xD4C4A0, 0.7);
      g.strokeRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
      g.fillStyle(0xD4C4A0, 0.15);
      g.fillRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
    } else if (treatmentKey === 'salt_pepper') {
      for (let i = 0; i < 12; i++) {
        const sx = (Math.random() - 0.5) * (hw * 2 - 10);
        const sy = stackTop + Math.random() * (stackBot - stackTop + 6);
        g.fillStyle(i % 2 === 0 ? 0xFFFFFF : 0x333333, 0.7);
        g.fillCircle(sx, sy, 1);
      }
    } else if (treatmentKey === 'oil_vinegar') {
      const midY = (stackTop + stackBot) / 2;
      g.lineStyle(1.5, 0xAAAA22, 0.5);
      g.beginPath();
      g.moveTo(-hw + 20, midY - 2);
      for (let sx = -hw + 20; sx <= hw - 20; sx += 6) {
        g.lineTo(sx, midY - 2 + ((Math.floor(sx / 6) % 2 === 0) ? -2 : 2));
      }
      g.strokePath();
      g.lineStyle(1, 0x884422, 0.4);
      g.beginPath();
      g.moveTo(-hw + 25, midY + 2);
      for (let sx = -hw + 25; sx <= hw - 25; sx += 7) {
        g.lineTo(sx, midY + 2 + ((Math.floor(sx / 7) % 2 === 0) ? 2 : -1));
      }
      g.strokePath();
    }

    tray.container.add(g);
  }

  spawnBinItem(key, binX, binY, slotIndex) {
    const ITEM_SCALE = 0.45;

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

    const g = this.add.graphics();
    this.drawBinIngredient(g, key);
    c.add(g);

    c.setData('ingredientKey', key);
    c.setData('binX', binX);
    c.setData('binY', binY);
    c.setData('isBinItem', true);
    c.setData('slotIndex', slot);

    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem || this.activeTreatment) return;
      soundManager.init();
      this.pickupItem(c);
    });

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
      if (key === 'meat_bacon') {
        // Bacon — 3 distinct wavy strips stacked
        const stripYs = [-14, -3, 8];
        const stripH = 8;
        for (let si = 0; si < 3; si++) {
          const sy = stripYs[si];
          // Meat strip body
          g.fillStyle(0xCC3322, 1);
          g.beginPath();
          g.moveTo(-36, sy);
          for (let sx = -36; sx <= 36; sx += 6) {
            const wave = ((Math.floor((sx + 36) / 6) + si) % 2 === 0) ? -1.5 : 1.5;
            g.lineTo(sx, sy + wave);
          }
          g.lineTo(36, sy + stripH);
          for (let sx = 36; sx >= -36; sx -= 6) {
            const wave = ((Math.floor((sx + 36) / 6) + si) % 2 === 0) ? 1.5 : -1.5;
            g.lineTo(sx, sy + stripH + wave);
          }
          g.closePath();
          g.fillPath();
          // Fat marbling streaks
          g.fillStyle(0xFFDDCC, 0.7);
          g.fillRect(-28 + si * 5, sy + 2, 10, 3);
          g.fillRect(2 - si * 3, sy + 3, 12, 3);
          g.fillRect(20 + si * 2, sy + 1, 8, 3);
          // Strip outline
          g.lineStyle(0.8, 0x991A11, 0.5);
          g.beginPath();
          g.moveTo(-36, sy);
          for (let sx = -36; sx <= 36; sx += 6) {
            const wave = ((Math.floor((sx + 36) / 6) + si) % 2 === 0) ? -1.5 : 1.5;
            g.lineTo(sx, sy + wave);
          }
          g.lineTo(36, sy + stripH);
          for (let sx = 36; sx >= -36; sx -= 6) {
            const wave = ((Math.floor((sx + 36) / 6) + si) % 2 === 0) ? 1.5 : -1.5;
            g.lineTo(sx, sy + stripH + wave);
          }
          g.closePath();
          g.strokePath();
        }
      } else {
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
      }
    } else if (cat === 'cheese') {
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
        // Head of lettuce — round leafy ball
        g.fillStyle(0x228B22, 1);
        g.fillCircle(0, -2, 16);
        // Overlapping leaf layers
        g.fillStyle(0x32CD32, 0.8);
        g.fillEllipse(-6, -8, 18, 12);
        g.fillEllipse(7, -5, 16, 14);
        g.fillEllipse(-3, 3, 20, 12);
        g.fillStyle(0x44DD44, 0.6);
        g.fillEllipse(2, -3, 12, 10);
        // Dark center
        g.fillStyle(0x1A6B1A, 0.5);
        g.fillCircle(0, -1, 4);
        // Outline
        g.lineStyle(1.5, 0x1A6B1A, 0.8);
        g.strokeCircle(0, -2, 16);
        // Leaf veins
        g.lineStyle(0.5, 0x28A428, 0.4);
        g.lineBetween(-8, -10, -2, 4);
        g.lineBetween(8, -8, 2, 5);
        g.lineBetween(0, -14, 0, 2);
      } else if (key === 'top_tomato') {
        // Tomato cross-section slice
        g.fillStyle(0xFF6347, 1);
        g.fillCircle(0, -2, 16);
        // Flesh ring
        g.fillStyle(0xFF8B70, 0.6);
        g.fillCircle(0, -2, 12);
        // Center core
        g.fillStyle(0xFF6347, 0.8);
        g.fillCircle(0, -2, 5);
        // Seed chambers (4 segments)
        g.fillStyle(0xFFAA88, 0.7);
        g.fillEllipse(-6, -6, 6, 4);
        g.fillEllipse(6, -6, 6, 4);
        g.fillEllipse(-6, 2, 6, 4);
        g.fillEllipse(6, 2, 6, 4);
        // Seeds in chambers
        g.fillStyle(0xFFDD99, 0.8);
        g.fillEllipse(-6, -6, 2, 1);
        g.fillEllipse(6, -6, 2, 1);
        g.fillEllipse(-6, 2, 2, 1);
        g.fillEllipse(6, 2, 2, 1);
        // Membrane lines
        g.lineStyle(0.8, 0xFF5030, 0.4);
        g.lineBetween(0, -14, 0, 10);
        g.lineBetween(-12, -2, 12, -2);
        // Outer skin
        g.lineStyle(1.5, 0xDD4030, 0.9);
        g.strokeCircle(0, -2, 16);
      } else if (key === 'top_onion') {
        // Onion slice with visible concentric rings
        g.fillStyle(0xF0E0F8, 1);
        g.fillCircle(0, -2, 16);
        // Concentric rings (alternating light/dark)
        g.lineStyle(2.5, 0xD8C0E8, 0.7);
        g.strokeCircle(0, -2, 13);
        g.lineStyle(2, 0xE8D4F0, 0.5);
        g.strokeCircle(0, -2, 10);
        g.lineStyle(2.5, 0xD0B8E0, 0.7);
        g.strokeCircle(0, -2, 7);
        g.lineStyle(2, 0xE8D4F0, 0.5);
        g.strokeCircle(0, -2, 4);
        // Center dot
        g.fillStyle(0xC8A8D8, 0.8);
        g.fillCircle(0, -2, 2);
        // Outer skin
        g.lineStyle(1.5, 0xC8B0D0, 0.9);
        g.strokeCircle(0, -2, 16);
      }
    } else if (cat === 'sauce') {
      g.fillStyle(ing.color, 1);
      g.fillRoundedRect(-16, -2, 32, 18, 5);
      g.fillRect(-5, -12, 10, 12);
      g.fillStyle(ing.border || 0x888888, 1);
      g.fillRoundedRect(-7, -16, 14, 6, 2);
      g.fillStyle(ing.border, 0.3);
      g.fillRect(-12, 1, 24, 10);
      g.lineStyle(1, ing.border, 0.6);
      g.strokeRoundedRect(-16, -2, 32, 18, 5);
    }
  }

  /* =========================================
     CLICK TO PLACE (replaces drag & drop)
     ========================================= */
  setupClickToPlace() {
    this.trayHighlight = this.add.graphics().setDepth(9);

    this.input.on('pointermove', (pointer) => {
      if (this.activeTreatment) {
        this.trayHighlight.clear();
        if (pointer.y < 435) {
          const tray = this.findTrayAtX(pointer.x);
          if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
            const hw = tray.isFooter ? 105 : 72;
            this.trayHighlight.lineStyle(2, 0xFFAA00, 0.5);
            this.trayHighlight.strokeRoundedRect(
              tray.container.x - hw, 270, hw * 2, 155, 8,
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

      this.trayHighlight.clear();
      if (pointer.y < 435) {
        const tray = this.findTrayAtX(pointer.x);
        if (tray && !tray.completed && !tray.done && !tray.passedFinish) {
          const hw = tray.isFooter ? 105 : 72;
          this.trayHighlight.lineStyle(2, 0x44ff44, 0.35);
          this.trayHighlight.strokeRoundedRect(
            tray.container.x - hw, 270, hw * 2, 155, 8,
          );
        }
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isPaused) return;

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

      if (this._justPickedUp) {
        this._justPickedUp = false;
        return;
      }

      this.placeHeldItem(pointer);
    });

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

    if (this.binData[key]) {
      this.binData[key].items = this.binData[key].items.filter((i) => i !== binItemContainer);
    }

    binItemContainer.destroy();

    const pointer = this.input.activePointer;
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);

    this.heldItem = {
      visual,
      ingredientKey: key,
      binX,
      binY,
    };
    this._justPickedUp = true;

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
      this.cancelHeldItem();
    }
  }

  cancelHeldItem() {
    if (!this.heldItem) return;
    const obj = this.heldItem.visual;

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

    for (const tray of this.trays) {
      if (tray.done || tray.passedFinish || tray.completed) continue;
      const tolerance = tray.isFooter ? 110 : 80;
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
    const startX = order.isFooter ? 1200 : 1120;
    const baseY = 400;

    // Add ticket to the slider
    this.addTicket(order, orderNum);

    // Tray container
    const container = this.add.container(startX, baseY).setDepth(10);

    // Isometric tray base — wider for footers
    const base = this.add.graphics();
    const tw = order.isFooter ? 200 : 130;
    const tFront = 14;
    const tIso = 4;

    // Front face (darker wood)
    base.fillStyle(0x6B4030, 1);
    base.fillRect(-tw / 2, -10 + tIso, tw, tFront);

    // Top face (lighter wood parallelogram)
    base.fillStyle(0x8B7355, 1);
    base.beginPath();
    base.moveTo(-tw / 2, -10 + tIso);
    base.lineTo(-tw / 2 + tIso, -10);
    base.lineTo(tw / 2 + tIso, -10);
    base.lineTo(tw / 2, -10 + tIso);
    base.closePath();
    base.fillPath();

    // Right side (darkest)
    base.fillStyle(0x5A3020, 1);
    base.beginPath();
    base.moveTo(tw / 2, -10 + tIso);
    base.lineTo(tw / 2 + tIso, -10);
    base.lineTo(tw / 2 + tIso, -10 + tFront);
    base.lineTo(tw / 2, -10 + tIso + tFront);
    base.closePath();
    base.fillPath();

    // Edge highlight along top
    base.lineStyle(1, 0xA08A68, 0.5);
    base.lineBetween(-tw / 2 + tIso, -10, tw / 2 + tIso, -10);

    container.add(base);

    // Order number badge
    const numBg = this.add.graphics();
    numBg.fillStyle(order.isFooter ? 0xFFEEBB : 0xFFFFC0, 1);
    numBg.fillCircle(0, -28, 18);
    numBg.lineStyle(2, order.isFooter ? 0xDDAA55 : 0xCCCC80, 1);
    numBg.strokeCircle(0, -28, 18);
    container.add(numBg);

    const numText = this.add.text(0, -28, `${orderNum}`, {
      fontSize: '17px', color: '#333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    // Footer label on tray
    if (order.isFooter) {
      const ftLabel = this.add.text(0, -45, 'FOOTER', {
        fontSize: '9px', color: '#AA6600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(ftLabel);
    }

    const tray = {
      container,
      order,
      orderNum,
      isFooter: order.isFooter || false,
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
    const meats = ['meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon'];
    const cheeses = ['cheese_american', 'cheese_swiss'];
    const toppings = ['top_lettuce', 'top_tomato', 'top_onion'];
    const sauces = ['sauce_mayo', 'sauce_mustard'];

    const cfg = DAY_CONFIG[this.day];
    const isFooter = Math.random() < (cfg.footerChance || 0);

    const list = [];
    const bread = pick(breads);

    if (isFooter) {
      // FOOTER: ~2x ingredients
      list.push(bread);
      // 2 meats
      list.push(pick(meats));
      list.push(pick(meats));
      // Always 1 cheese, 50% chance of 2nd
      list.push(pick(cheeses));
      if (Math.random() > 0.5) {
        list.push(pick(cheeses));
      }
      // 2-3 toppings
      const topCount = 2 + (Math.random() < 0.5 ? 1 : 0);
      pickN(toppings, topCount).forEach((t) => list.push(t));
      // Always 1 sauce, 50% chance of 2nd
      list.push(pick(sauces));
      if (Math.random() > 0.5) {
        list.push(pick(sauces));
      }
      // Top bread
      list.push(bread);
    } else {
      // Normal order
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

      list.push(bread);
    }

    // Treatments based on day config
    const treatments = [];
    if (cfg.treatmentChance > 0 && Math.random() < cfg.treatmentChance) {
      const allTreatments = Object.keys(TREATMENTS);
      if (this.day <= 2) {
        const simple = ['toasted', 'salt_pepper'];
        treatments.push(pick(simple));
      } else {
        const count = Math.random() < 0.4 ? 2 : 1;
        const chosen = pickN(allTreatments, count);
        chosen.forEach((t) => treatments.push(t));
      }
    }

    return { ingredients: list, treatments, isFooter };
  }

  /* =========================================
     PLACING INGREDIENTS (strict order)
     ========================================= */
  tryPlace(tray, ingredientKey) {
    const nextIndex = tray.placed.length;
    if (nextIndex >= tray.order.ingredients.length) return 'wrong';

    const expected = tray.order.ingredients[nextIndex];
    if (ingredientKey !== expected) return 'wrong';

    tray.placed.push(ingredientKey);

    this.updateTicketIngredient(tray.orderNum, ingredientKey);

    this.addStackLayer(tray, ingredientKey);

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
    const wide = tray.isFooter;
    // Half-widths for stack layers
    const hw = wide ? 76 : 52;
    const mhw = wide ? 72 : 48; // meat/cheese half-width

    const g = this.add.graphics();
    const cat = ing.category;

    if (cat === 'bread') {
      g.fillStyle(ing.color, 1);
      if (idx === 0) {
        // Bottom bread — flat top, curved bottom
        g.beginPath();
        g.moveTo(-hw, ly);
        g.lineTo(hw, ly);
        g.lineTo(hw, ly + 5);
        g.lineTo(hw - 8, ly + 8);
        g.lineTo(hw - 22, ly + 10);
        g.lineTo(hw * 0.56, ly + 11);
        g.lineTo(0, ly + 12);
        g.lineTo(-hw * 0.56, ly + 11);
        g.lineTo(-hw + 22, ly + 10);
        g.lineTo(-hw + 8, ly + 8);
        g.lineTo(-hw, ly + 5);
        g.closePath();
        g.fillPath();
        g.lineStyle(0.8, ing.border, 0.6);
        g.beginPath();
        g.moveTo(-hw, ly);
        g.lineTo(hw, ly);
        g.lineTo(hw, ly + 5);
        g.lineTo(hw - 8, ly + 8);
        g.lineTo(hw - 22, ly + 10);
        g.lineTo(hw * 0.56, ly + 11);
        g.lineTo(0, ly + 12);
        g.lineTo(-hw * 0.56, ly + 11);
        g.lineTo(-hw + 22, ly + 10);
        g.lineTo(-hw + 8, ly + 8);
        g.lineTo(-hw, ly + 5);
        g.closePath();
        g.strokePath();
      } else {
        // Top bread — domed top
        g.beginPath();
        g.moveTo(-hw, ly + 9);
        g.lineTo(-hw, ly + 3);
        g.lineTo(-hw + 8, ly);
        g.lineTo(-hw + 22, ly - 3);
        g.lineTo(-hw * 0.56, ly - 4);
        g.lineTo(0, ly - 5);
        g.lineTo(hw * 0.56, ly - 4);
        g.lineTo(hw - 22, ly - 3);
        g.lineTo(hw - 8, ly);
        g.lineTo(hw, ly + 3);
        g.lineTo(hw, ly + 9);
        g.closePath();
        g.fillPath();
        g.lineStyle(0.8, ing.border, 0.6);
        g.beginPath();
        g.moveTo(-hw, ly + 9);
        g.lineTo(-hw, ly + 3);
        g.lineTo(-hw + 8, ly);
        g.lineTo(-hw + 22, ly - 3);
        g.lineTo(-hw * 0.56, ly - 4);
        g.lineTo(0, ly - 5);
        g.lineTo(hw * 0.56, ly - 4);
        g.lineTo(hw - 22, ly - 3);
        g.lineTo(hw - 8, ly);
        g.lineTo(hw, ly + 3);
        g.lineTo(hw, ly + 9);
        g.closePath();
        g.strokePath();
      }
    } else if (cat === 'sauce') {
      g.lineStyle(2, ing.color, 0.9);
      g.beginPath();
      g.moveTo(-mhw + 8, ly + 4);
      for (let sx = -mhw + 8; sx <= mhw - 8; sx += 5) {
        g.lineTo(sx, ly + 4 + ((Math.floor(sx / 5) % 2 === 0) ? -1.5 : 1.5));
      }
      g.strokePath();
    } else if (cat === 'cheese') {
      g.fillStyle(ing.color, 1);
      g.fillRect(-mhw, ly, mhw * 2, 7);
      if (ingredientKey === 'cheese_swiss') {
        g.fillStyle(ing.border, 0.5);
        g.fillCircle(-mhw * 0.4, ly + 3, 2);
        g.fillCircle(mhw * 0.2, ly + 4, 1.5);
        g.fillCircle(mhw * 0.6, ly + 2, 2);
      }
      g.lineStyle(0.5, ing.border, 0.5);
      g.strokeRect(-mhw, ly, mhw * 2, 7);
    } else if (ingredientKey === 'meat_bacon') {
      // Bacon — 2 distinct wavy strips on sandwich
      const stripOffsets = [0, 4];
      for (let si = 0; si < 2; si++) {
        const sy = ly + stripOffsets[si];
        const stripH = 4;
        g.fillStyle(0xCC3322, 1);
        g.beginPath();
        g.moveTo(-mhw + 4, sy);
        for (let sx = -mhw + 4; sx <= mhw - 4; sx += 8) {
          const wave = ((Math.floor((sx + mhw) / 8) + si) % 2 === 0) ? -1 : 1;
          g.lineTo(sx, sy + wave);
        }
        g.lineTo(mhw - 4, sy + stripH);
        for (let sx = mhw - 4; sx >= -mhw + 4; sx -= 8) {
          const wave = ((Math.floor((sx + mhw) / 8) + si) % 2 === 0) ? 1 : -1;
          g.lineTo(sx, sy + stripH + wave);
        }
        g.closePath();
        g.fillPath();
        // Fat marbling
        g.fillStyle(0xFFDDCC, 0.6);
        g.fillRect(-mhw + 10 + si * 6, sy + 1, 7, 2);
        g.fillRect(si * 4, sy + 1, 8, 2);
        g.fillRect(mhw - 18 - si * 4, sy + 1, 7, 2);
        // Strip outline
        g.lineStyle(0.4, 0x991A11, 0.4);
        g.beginPath();
        g.moveTo(-mhw + 4, sy);
        for (let sx = -mhw + 4; sx <= mhw - 4; sx += 8) {
          const wave = ((Math.floor((sx + mhw) / 8) + si) % 2 === 0) ? -1 : 1;
          g.lineTo(sx, sy + wave);
        }
        g.lineTo(mhw - 4, sy + stripH);
        for (let sx = mhw - 4; sx >= -mhw + 4; sx -= 8) {
          const wave = ((Math.floor((sx + mhw) / 8) + si) % 2 === 0) ? 1 : -1;
          g.lineTo(sx, sy + stripH + wave);
        }
        g.closePath();
        g.strokePath();
      }
    } else if (ingredientKey === 'top_lettuce') {
      // Leafy layer with ruffled edges
      g.fillStyle(0x32CD32, 1);
      g.beginPath();
      g.moveTo(-mhw, ly + 8);
      g.lineTo(-mhw, ly + 3);
      for (let sx = -mhw; sx <= mhw; sx += 8) {
        g.lineTo(sx, (Math.floor((sx + mhw) / 8) % 2 === 0) ? ly - 1 : ly + 3);
      }
      g.lineTo(mhw, ly + 8);
      g.closePath();
      g.fillPath();
      // Darker leaf layer
      g.fillStyle(0x28A428, 0.5);
      g.beginPath();
      g.moveTo(-mhw + 4, ly + 8);
      for (let sx = -mhw + 4; sx <= mhw - 4; sx += 10) {
        g.lineTo(sx, (Math.floor((sx + mhw) / 10) % 2 === 0) ? ly + 2 : ly + 6);
      }
      g.lineTo(mhw - 4, ly + 8);
      g.closePath();
      g.fillPath();
    } else if (ingredientKey === 'top_tomato') {
      // Tomato slices from the side — thin wide curved shapes
      const sliceCount = wide ? 5 : 3;
      const sliceSpacing = (mhw * 2 - 10) / sliceCount;
      for (let si = 0; si < sliceCount; si++) {
        const sx = -mhw + 5 + si * sliceSpacing;
        const sw = sliceSpacing - 2;
        // Red slice body (rounded rect, thin and wide)
        g.fillStyle(0xFF6347, 1);
        g.fillRoundedRect(sx, ly + 1, sw, 7, 2);
        // Lighter flesh interior
        g.fillStyle(0xFF8B70, 0.5);
        g.fillRoundedRect(sx + 2, ly + 2, sw - 4, 4, 1);
        // Seed dots
        g.fillStyle(0xFFDD99, 0.7);
        g.fillCircle(sx + sw * 0.3, ly + 4, 0.8);
        g.fillCircle(sx + sw * 0.7, ly + 5, 0.8);
        // Skin edge along top
        g.lineStyle(1, 0xDD3020, 0.7);
        g.lineBetween(sx + 2, ly + 1, sx + sw - 2, ly + 1);
        // Outline
        g.lineStyle(0.5, 0xDD4030, 0.5);
        g.strokeRoundedRect(sx, ly + 1, sw, 7, 2);
      }
    } else if (ingredientKey === 'top_onion') {
      // Onion slices from the side — thin arched shapes with rings visible
      const sliceCount = wide ? 4 : 3;
      const sliceSpacing = (mhw * 2 - 10) / sliceCount;
      for (let ri = 0; ri < sliceCount; ri++) {
        const rx = -mhw + 5 + ri * sliceSpacing;
        const rw = sliceSpacing - 2;
        // Translucent onion slice body
        g.fillStyle(0xE8D0F0, 0.7);
        g.fillRoundedRect(rx, ly + 1, rw, 7, 2);
        // Inner ring arcs (concentric U-shapes from the side)
        g.lineStyle(1, 0xD0B0E0, 0.6);
        g.beginPath();
        g.arc(rx + rw / 2, ly + 8, rw * 0.35, Math.PI, 0, false);
        g.strokePath();
        g.lineStyle(0.7, 0xC8A0D8, 0.5);
        g.beginPath();
        g.arc(rx + rw / 2, ly + 8, rw * 0.2, Math.PI, 0, false);
        g.strokePath();
        // Outline
        g.lineStyle(0.5, 0xC8B0D0, 0.6);
        g.strokeRoundedRect(rx, ly + 1, rw, 7, 2);
      }
    } else {
      // Default meat — slight oval
      g.fillStyle(ing.color, 1);
      g.fillEllipse(0, ly + 4, mhw * 2, 8);
      if (ing.border) {
        g.lineStyle(0.5, ing.border, 0.4);
        g.strokeEllipse(0, ly + 4, mhw * 2, 8);
      }
    }

    tray.container.add(g);
    tray.stackLayers.push(g);

    if (cat === 'meat') {
      this.tweens.add({
        targets: g,
        rotation: 0.05,
        duration: 400,
        ease: 'Elastic.easeOut',
        yoyo: true,
      });
    }

    // Compress the whole sandwich when the top bread is placed
    if (cat === 'bread' && idx > 0) {
      this.compressStack(tray);
    }
  }

  compressStack(tray) {
    const layers = tray.stackLayers;
    const count = layers.length;
    if (count < 2) return;

    // Original spacing is 9px per layer from y = -16
    // Compress to ~6px spacing
    const compressedSpacing = 6;
    for (let i = 0; i < count; i++) {
      const targetY = -16 - i * compressedSpacing;
      const currentY = -16 - i * 9;
      const dy = targetY - currentY;
      this.tweens.add({
        targets: layers[i],
        y: layers[i].y + dy,
        duration: 250,
        ease: 'Back.easeOut',
        delay: i * 15,
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
    this.flashTray(tray, 0x00ff00);
  }

  flashTray(tray, color) {
    const flash = this.add.graphics();
    const hw = tray.isFooter ? 105 : 70;
    flash.fillStyle(color, 0.25);
    flash.fillRoundedRect(-hw, -130, hw * 2, 145, 8);
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

    const baseScore = tray.isFooter ? 200 : 100;
    const speedBonus = tray.container.x > 300 ? (tray.isFooter ? 100 : 50) : 0;
    this.dayScore += baseScore + speedBonus;
    this.refreshHUD();

    soundManager.score();
    this.markTicketCompleted(tray.orderNum);

    const pts = baseScore + speedBonus;
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
      if (tray.completed) moveSpeed *= this.spaceKey.isDown ? 6 : 2;
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
