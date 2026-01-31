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

    // Store State
    this.isStoreOpen = false;
    this.gameMoney = 0; // Total money earned

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

    // --- OPEN FOR BUSINESS BUTTON ---
    this.createStartButton();

    // --- LOAVES (Standalone bread sources) ---
    this.createLoaves();
  }

  /* =========================================
     WALL (kitchen backsplash)
     ========================================= */
  createWall() {
    // Tiled wall texture
    this.add.tileSprite(512, 25, 1024, 150, 'wall_texture').setDepth(0).setAlpha(0.8);
    // Shelf/divider
    this.add.rectangle(512, 50, 1024, 2, 0x383840).setDepth(1);
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

    // Money Display
    this.moneyText = this.add.text(450, 15, '$0.00', {
      fontSize: '16px', color: '#88ff88', fontFamily: 'Arial', fontStyle: 'bold'
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
    this.moneyText.setText(`$${this.gameMoney.toFixed(2)}`);
    this.updateStrikeIndicators();
  }

  createStartButton() {
    const btn = this.add.container(512, 400).setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x44aa44, 1);
    bg.fillRoundedRect(-100, -30, 200, 60, 16);
    bg.lineStyle(4, 0xffffff, 1);
    bg.strokeRoundedRect(-100, -30, 200, 60, 16);
    btn.add(bg);

    const txt = this.add.text(0, 0, 'OPEN FOR BUSINESS', {
      fontSize: '18px', color: '#fff', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5);
    btn.add(txt);

    btn.setSize(200, 60);
    btn.setInteractive(new Phaser.Geom.Rectangle(-100, -30, 200, 60), Phaser.Geom.Rectangle.Contains);

    btn.on('pointerdown', () => {
      this.isStoreOpen = true;
      this.tweens.add({
        targets: btn, scale: 1.1, alpha: 0, duration: 200,
        onComplete: () => btn.destroy()
      });
      soundManager.ding();
    });

    // Pulse animation
    this.tweens.add({
      targets: btn, scale: 1.05, duration: 600, yoyo: true, repeat: -1
    });
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
    // Determine target position on bar
    const barGap = 5;
    const targetX = 65 + (orderNum - 1) * (cardW + barGap);
    const targetY = 55;

    // Spawn large at center first
    const spawnX = 512;
    const spawnY = 384;

    const card = this.add.container(spawnX, spawnY).setDepth(100); // High depth for pop-in

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

    // Price Tag
    const priceTxt = this.add.text(cardW - 6, 4, `$${order.totalPrice.toFixed(2)}`, {
      fontSize: '10px', color: '#006600', fontFamily: 'Arial', fontStyle: 'bold'
    }).setOrigin(1, 0);
    card.add(priceTxt);

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

    // Pop-in Animation
    soundManager.waiterGibberish();

    card.setScale(2.5);
    card.setAlpha(0);

    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 2.0, // briefly stay huge
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Then shrink and move to bar
        this.time.delayedCall(600, () => {
          this.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            scale: 1,
            depth: 10,
            duration: 500,
            ease: 'Power2'
          });
        });
      }
    });

    // Auto-scroll if needed (calculated for target position)
    const rightEdge = targetX + cardW + 10;
    if (rightEdge > 1020) {
      this.tweens.add({
        targets: this.ticketContainer, x: -(rightEdge - 1020),
        duration: 300, ease: 'Power2',
        delay: 1000 // wait for animation
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
    // Tiled floor texture
    const floor = this.add.tileSprite(512, 333, 1024, 126, 'floor_tile');
    floor.setDepth(1);
    floor.setTileScale(0.5);
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



  /* =========================================
     LOAVES (Standalone sources)
     ========================================= */
  createLoaves() {
    // Place them to the right of the bins
    const startX = 850;

    // White Loaf
    const wLoaf = this.add.image(startX, 530, 'loaf_white').setDepth(20);
    wLoaf.setInteractive({ cursor: 'pointer' });
    wLoaf.on('pointerdown', (pointer) => {
      if (this.isPaused || this.heldItem || this.activeTreatment) return;
      this.clickLoaf('bread_white', pointer);
    });

    // Label
    this.add.text(startX, 530 + 40, 'White', {
      fontSize: '14px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(20);

    // Wheat Loaf
    const whLoaf = this.add.image(startX, 650, 'loaf_wheat').setDepth(20);
    whLoaf.setInteractive({ cursor: 'pointer' });
    whLoaf.on('pointerdown', (pointer) => {
      if (this.isPaused || this.heldItem || this.activeTreatment) return;
      this.clickLoaf('bread_wheat', pointer);
    });

    // Label
    this.add.text(startX, 650 + 40, 'Wheat', {
      fontSize: '14px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(20);
  }

  clickLoaf(key, pointer) {
    soundManager.plopBread();

    const visual = this.createHeldVisual(key, pointer.x, pointer.y);

    this.heldItem = {
      visual,
      ingredientKey: key,
      binX: 0, // Not applicable for loaves
      binY: 0,
    };
    this._justPickedUp = true;
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

    // Icon on bin front
    const icon = this.add.image(x, y + 10, ingredientKey).setDepth(21).setScale(0.25);

    // Category label at bottom
    this.add.text(x, y + 42, ing.category.toUpperCase(), {
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

    const assetKey = key === 'sauce_mayo' ? 'sauce_mayo_bottle' : 'sauce_mustard_bottle';
    const bottle = this.add.image(0, 0, assetKey).setOrigin(0.5, 0.5).setScale(0.8);
    c.add(bottle);

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
    // Top of the topmost layer and bottom of the stack
    const stackTop = -16 - (tray.stackHeight || 0);
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
    const scale = ITEM_SCALE * (key.includes('bread') ? 0.6 : 1.0);
    c.setScale(scale);
    c.setRotation(rot);
    c.setSize(130, 56);
    c.setInteractive(
      new Phaser.Geom.Rectangle(-65, -28, 130, 56),
      Phaser.Geom.Rectangle.Contains,
    );

    const img = this.add.image(0, 0, key);
    // Adjust scale based on ingredient type for bin view
    if (key.includes('meat') || key.includes('cheese')) img.setScale(0.5);
    else if (key.includes('top')) img.setScale(0.8);
    else if (key.includes('bread')) img.setScale(0.35);

    c.add(img);

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
     INGREDIENT VISUALS
     ========================================= */
  // Formerly drawBinIngredient - removed in favor of sprites

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

    const img = this.add.image(0, 0, key).setOrigin(0.5);
    // Adjust scale for held view
    if (key.includes('meat') || key.includes('cheese')) img.setScale(0.65);
    else if (key.includes('top')) img.setScale(0.7);
    else if (key.includes('bread')) img.setScale(0.45);
    else if (key.includes('sauce')) img.setScale(0.4);

    c.add(img);

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
    // Check if store is open
    if (!this.isStoreOpen) {
      return;
    }

    const order = this.generateOrder();
    this.orderNumber++;
    const orderNum = this.orderNumber;
    const startX = order.isFooter ? 1200 : 1120;
    const baseY = 400;

    // Add ticket to the slider
    this.addTicket(order, orderNum);

    // Tray container
    const container = this.add.container(startX, baseY).setDepth(10);

    // Use tray sprite
    const traySprite = this.add.image(0, 0, 'tray');
    // Scale for footer/normal
    traySprite.setScale(order.isFooter ? 0.9 : 0.7);
    container.add(traySprite);

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
      stackHeight: 0,
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

    // Calculate Dynamic Price
    let totalPrice = 0;
    // Base markup
    totalPrice += isFooter ? 3.00 : 1.50;

    list.forEach(key => {
      const ing = INGREDIENTS[key];
      totalPrice += (ing.price || 0.50);
    });

    treatments.forEach(() => totalPrice += 0.25);

    return { ingredients: list, treatments, isFooter, totalPrice };
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
  getLayerHeight(ingredientKey) {
    const cat = INGREDIENTS[ingredientKey].category;
    if (cat === 'sauce') return 4;
    if (ingredientKey === 'top_tomato' || ingredientKey === 'top_onion') return 5;
    return 9;
  }

  addStackLayer(tray, ingredientKey) {
    const ing = INGREDIENTS[ingredientKey];
    const cat = ing.category;

    // Stack logic
    const layerH = this.getLayerHeight(ingredientKey);
    // Stack grows upwards (-y)
    const ly = -20 - tray.stackHeight;
    tray.stackHeight += layerH;

    // Add random slight offset for natural look
    const rX = (Math.random() - 0.5) * 6;
    const rY = (Math.random() - 0.5) * 4;

    // Create sprite for the layer
    // Note: 'sauce' might need special handling if we don't have a "splat" sprite
    if (cat === 'sauce') {
      const sauceG = this.add.graphics();
      sauceG.fillStyle(ing.color, 0.9);
      sauceG.fillCircle(rX, ly + rY, 14);
      sauceG.lineStyle(2, ing.border || 0x888888, 0.5);
      sauceG.strokeCircle(rX, ly + rY, 14);
      tray.container.add(sauceG);
      tray.stackLayers.push(sauceG);
      return;
    }

    const topSprite = this.add.image(rX, ly + rY, ingredientKey);

    // Scaling on tray - dynamic based on footer and type
    if (cat === 'bread') {
      const isFooterBread = tray.isFooter;
      // If footer, stretch texture significantly. 
      // 0.35 is good for 128px bread on normal tray.
      // Footer tray is longer? Actually tray.svg is 200px wide.
      // We need bread to cover the whole sub.
      // Let's stretch X more for footer.
      if (isFooterBread) {
        topSprite.setScale(0.65, 0.35); // Double length-ish
      } else {
        topSprite.setScale(0.35);
      }
    }
    else if (cat === 'meat' || cat === 'cheese') {
      topSprite.setScale(tray.isFooter ? 0.6 : 0.5);
    }
    else if (cat === 'topping') topSprite.setScale(0.55);

    tray.container.add(topSprite);
    tray.stackLayers.push(topSprite);
  }

  compressStack(tray) {
    const layers = tray.stackLayers;
    const count = layers.length;
    if (count < 2) return;

    const placed = tray.placed;
    // Compute current and compressed y for each layer
    const compressRatio = 0.7;
    let currentY = 0;
    let compressedY = 0;
    for (let i = 0; i < count; i++) {
      const h = this.getLayerHeight(placed[i]);
      const dy = (compressedY - currentY) * compressRatio;
      if (dy !== 0) {
        this.tweens.add({
          targets: layers[i],
          y: layers[i].y + dy,
          duration: 250,
          ease: 'Back.easeOut',
          delay: i * 15,
        });
      }
      currentY += h;
      compressedY += h * compressRatio;
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

    // Score based on price
    const orderValue = tray.order.totalPrice || 5.00;
    this.gameMoney += orderValue;

    const baseScore = Math.floor(orderValue * 10);
    const speedBonus = tray.container.x > 300 ? (tray.isFooter ? 100 : 50) : 0;
    this.dayScore += baseScore + speedBonus;
    this.refreshHUD();

    soundManager.score();
    this.markTicketCompleted(tray.orderNum);

    const pts = baseScore + speedBonus;
    const popup = this.add.text(tray.container.x, tray.container.y - 70,
      `$${orderValue.toFixed(2)}`, {
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
    if (this.isStoreOpen && this.ordersSpawned < this.totalOrders) {
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
