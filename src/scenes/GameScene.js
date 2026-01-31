import Phaser from 'phaser';
import { INGREDIENTS, BIN_LAYOUT, TREATMENTS, DAY_CONFIG } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { DEBUG } from '../config.js';

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

    // --- layout constants ---
    this.BELT_Y = 400;
    this.BELT_TOP = 435;
    this.SPEED_BONUS_X = 300;
    this.LAND_Y = 385;
    this.COMPLETED_SPEED_MULT = 2;
    this.COMPLETED_FAST_MULT = 6;

    // --- scoring ---
    this.dayScore = 0;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.gameMoney = 0;

    // --- orders ---
    this.trays = [];
    this.tickets = [];
    this.totalOrders = cfg.orders;
    this.ordersSpawned = 0;
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.orderNumber = 0;

    // --- conveyor ---
    this.conveyorSpeed = cfg.speed;
    this.beltOffset = 0;
    this.finishLineX = 80;
    this.isPaused = false;

    // --- spawning ---
    this.spawnInterval = cfg.spawnInterval;
    this.waitingForNext = true;
    this.sequentialDelay = 0;
    this.spawnTimer = 0;
    this.isStoreOpen = false;
    this._dayEnding = false;

    // --- interaction ---
    this.heldItem = null;
    this._justPickedUp = false;
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

    // --- TREATMENTS (Top Center) ---
    this.createTreatments();

    // --- VEGGIE BOWLS (Center Left) ---
    this.createVeggieBowls();

    // --- CHEESE STACKS (Center Right) ---
    this.createCheeseStacks();

    // --- speed indicator ---
    this.speedText = this.add.text(975, 142, '\u25b6\u25b6 FAST', {
      fontSize: '11px', color: '#ff0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(50).setAlpha(0);

    // --- hints modal ---
    if (this.day === 1) {
      this.showHintsModal();
    }

    // --- OPEN FOR BUSINESS BUTTON ---
    this.createStartButton();

    // --- LOAVES (Standalone bread sources) ---
    this.createLoaves();

    // --- SETUP INPUT ---
    this.setupClickToPlace();

    // --- DEBUG HITBOXES ---
    if (DEBUG) {
      this.drawDebugHitboxes();
    }
  }

  /* =========================================
     WALL (kitchen backsplash)
     ========================================= */
  createWall() {
    // Tiled wall texture — extends above HUD to give signs a backdrop
    this.add.tileSprite(512, 25, 1024, 150, 'wall_texture').setDepth(0).setAlpha(0.8);
    // Shelf/divider
    this.add.rectangle(512, 50, 1024, 2, 0x383840).setDepth(1);

    // Wall Decor — sits between HUD and ticket bar
    this.createWallDecor();
  }

  createWallDecor() {
    // Signs sit on the wall above the ticket bar, behind the HUD text (depth 5)
    // but above the HUD background strip (depth 4). They poke up from behind
    // the ticket bar area so the full art is visible.

    // Footers Sign — left side of wall
    const sign = this.add.image(170, 28, 'sign_footers').setDepth(4.5);
    sign.setAngle(-2);
    sign.setScale(0.38);

    // 86 List — right side of wall, slightly taller so smiley face shows
    const list = this.add.image(880, 50, 'sign_86_list').setDepth(35.5);
    list.setAngle(1.5);
    list.setScale(0.35);
  }

  /* =========================================
     HUD
     ========================================= */
  createHUD(cfg) {
    // Subtle HUD background strip
    this.add.rectangle(512, 25, 1024, 50, 0x383840).setDepth(4).setAlpha(0.5);

    this.dayText = this.add.text(12, 15,
      `Day ${this.day}: ${cfg.name}`, {
      fontSize: '16px', color: '#ddd', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.scoreText = this.add.text(260, 15,
      `Score: ${this.totalScore}`, {
      fontSize: '16px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setDepth(5);

    this.ordersText = this.add.text(700, 17,
      this.ordersDisplay(), {
      fontSize: '12px', color: '#bbb', fontFamily: 'Arial',
    }).setDepth(5);

    // Money Display
    this.moneyText = this.add.text(450, 15, '$0.00', {
      fontSize: '16px', color: '#88ff88', fontFamily: 'Bungee, Arial',
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
      fontSize: '18px', color: '#fff', fontFamily: 'Bungee, Arial'
    }).setOrigin(0.5);
    btn.add(txt);

    btn.setSize(200, 60);
    btn.setInteractive(new Phaser.Geom.Rectangle(-100, -30, 200, 60), Phaser.Geom.Rectangle.Contains);

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x55cc55, 1);
      bg.fillRoundedRect(-100, -30, 200, 60, 16);
      bg.lineStyle(4, 0xffffff, 1);
      bg.strokeRoundedRect(-100, -30, 200, 60, 16);
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x44aa44, 1);
      bg.fillRoundedRect(-100, -30, 200, 60, 16);
      bg.lineStyle(4, 0xffffff, 1);
      bg.strokeRoundedRect(-100, -30, 200, 60, 16);
    });
    btn.on('pointerdown', () => {
      this.isStoreOpen = true;
      this.tweens.add({
        targets: btn, scale: 1.1, alpha: 0, duration: 200,
        onComplete: () => btn.destroy()
      });
      soundManager.init();
      soundManager.ding();
    });

    // Pulse animation
    this.tweens.add({
      targets: btn, scale: 1.05, duration: 600, yoyo: true, repeat: -1
    });
  }

  showHintsModal() {
    // Clickable overlay covers the full screen and blocks all input behind it
    const overlay = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.6)
      .setDepth(500)
      .setInteractive({ useHandCursor: true });

    // Visual elements on top of the overlay
    const box = this.add.graphics().setDepth(501);
    box.fillStyle(0x2A2A38, 1);
    box.fillRoundedRect(312, 264, 400, 240, 12);
    box.lineStyle(2, 0x6666aa, 1);
    box.strokeRoundedRect(312, 264, 400, 240, 12);

    const title = this.add.text(512, 294, 'HOW TO PLAY', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setDepth(501);

    const lines = [
      'Click ingredients to pick up',
      'Click a tray to place them',
      'Match the order # to the ticket above',
      'Hold SPACE to speed up the belt',
      'Press ESC to cancel a pickup',
    ];
    const lineTexts = lines.map((line, i) =>
      this.add.text(512, 334 + i * 24, line, {
        fontSize: '14px', color: '#ccccdd', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(501)
    );

    const btnBg = this.add.graphics().setDepth(501);
    btnBg.fillStyle(0x44aa44, 1);
    btnBg.fillRoundedRect(462, 459, 100, 36, 8);
    btnBg.lineStyle(2, 0xffffff, 0.8);
    btnBg.strokeRoundedRect(462, 459, 100, 36, 8);

    const btnTxt = this.add.text(512, 477, 'GOT IT', {
      fontSize: '16px', color: '#fff', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setDepth(501);

    // Click anywhere to dismiss
    overlay.on('pointerdown', () => {
      overlay.destroy();
      box.destroy();
      title.destroy();
      lineTexts.forEach((t) => t.destroy());
      btnBg.destroy();
      btnTxt.destroy();
    });
  }

  /* =========================================
     TICKET BAR
     ========================================= */
  createTicketBar() {
    this.add.rectangle(512, 95, 1024, 88, 0x383840).setDepth(35);
    this.add.rectangle(512, 52, 1024, 2, 0x505058).setDepth(35);
    this.add.rectangle(512, 138, 1024, 2, 0x505058).setDepth(35);

    // 3D bottom lip/shelf edge for ticket bar
    const ticketLip = this.add.graphics().setDepth(35);
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
    }).setDepth(36);

    this.ticketContainer = this.add.container(0, 0).setDepth(36);
  }

  addTicket(order, orderNum) {
    const handFonts = ['Caveat, cursive', 'Permanent Marker, cursive', 'Nothing You Could Do, cursive', 'Grape Nuts, cursive'];
    const ticketFont = handFonts[Math.floor(Math.random() * handFonts.length)];
    const cardW = 140;
    const lineH = 13;
    const ingLines = order.ingredients.length;
    const treatLines = order.treatments ? order.treatments.length : 0;
    const footerLine = order.isFooter ? 14 : 0;
    const contentH = 22 + footerLine + ingLines * lineH + (treatLines > 0 ? 10 + treatLines * lineH : 0);
    const cardH = Math.max(90, contentH + 8);
    // Overlap cards: each card shifts only partially so they stack
    const overlapStep = 100;
    const targetX = 65 + (orderNum - 1) * overlapStep;
    const targetY = 55;
    // Later cards render on top of earlier ones
    const cardDepth = 36 + orderNum;

    // Spawn large at center first
    const spawnX = 512;
    const spawnY = 384;

    const card = this.add.container(spawnX, spawnY).setDepth(400); // Above everything during pop-in

    // Background — footer tickets have a distinct tint
    const bg = this.add.graphics();
    bg.fillStyle(order.isFooter ? 0xFFEEBB : 0xFFFFC0, 1);
    bg.fillRoundedRect(0, 0, cardW, cardH, 5);
    bg.lineStyle(2, order.isFooter ? 0xDDAA55 : 0xDDCC80, 1);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 5);
    card.add(bg);

    // Order number
    const numText = this.add.text(cardW / 2, 4, `#${orderNum}`, {
      fontSize: '14px', color: '#333', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5, 0);
    card.add(numText);

    // Footer label
    let yOff = 20;
    if (order.isFooter) {
      const footerLabel = this.add.text(cardW / 2, 19, '\u2b50 FOOTER', {
        fontSize: '10px', color: '#AA6600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      card.add(footerLabel);
      yOff = 32;
    }

    // Price Tag
    const priceTxt = this.add.text(cardW - 6, 5, `$${order.totalPrice.toFixed(2)}`, {
      fontSize: '11px', color: '#006600', fontFamily: 'Arial', fontStyle: 'bold'
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
      const txt = this.add.text(10, yOff + 3 + i * lineH, displayName, {
        fontSize: '13px',
        color: isNext ? '#111' : '#999',
        fontFamily: ticketFont,
      });
      card.add(txt);
      entries.push({ key, text: txt, done: false });
    });

    // Treatment requirements (shown in red below ingredients)
    const treatEntries = [];
    if (order.treatments && order.treatments.length > 0) {
      const treatStartY = yOff + 3 + ingLines * lineH + 3;
      const div2 = this.add.graphics();
      div2.lineStyle(1, 0xCC8800, 0.5);
      div2.lineBetween(4, treatStartY, cardW - 4, treatStartY);
      card.add(div2);

      order.treatments.forEach((tKey, i) => {
        const treat = TREATMENTS[tKey];
        const txt = this.add.text(10, treatStartY + 4 + i * lineH, `[${treat.name}]`, {
          fontSize: '13px',
          color: '#cc0000',
          fontFamily: ticketFont,
        });
        card.add(txt);
        treatEntries.push({ key: tKey, text: txt, done: false });
      });
    }

    this.ticketContainer.add(card);

    const ticket = { card, bg, orderNum, entries, treatEntries, cardH, cardW, status: 'active' };
    this.tickets.push(ticket);

    this.animateTicketPopIn(card, targetX, targetY, cardW, cardDepth);

    return ticket;
  }

  animateTicketPopIn(card, targetX, targetY, cardW, cardDepth) {
    soundManager.waiterGibberish();

    card.setScale(2.5);
    card.setAlpha(0);

    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 2.0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(600, () => {
          this.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            scale: 1,
            depth: cardDepth || 36,
            duration: 500,
            ease: 'Power2'
          });
        });
      }
    });

    const rightEdge = targetX + cardW + 10;
    if (rightEdge > 1020) {
      this.tweens.add({
        targets: this.ticketContainer, x: -(rightEdge - 1020),
        duration: 300, ease: 'Power2',
        delay: 1000
      });
    }
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
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x00ff00, 0.15);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const check = this.add.text(w / 2, h / 2, '\u2713', {
      fontSize: '36px', color: '#0a0', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.6);
    ticket.card.add(check);
  }

  markTicketMissed(orderNum) {
    const ticket = this.tickets.find((t) => t.orderNum === orderNum);
    if (!ticket) return;
    ticket.status = 'missed';
    const w = ticket.cardW || 140;
    const h = ticket.cardH || 90;
    const overlay = this.add.graphics();
    overlay.fillStyle(0xff0000, 0.2);
    overlay.fillRoundedRect(0, 0, w, h, 5);
    ticket.card.add(overlay);
    const xMark = this.add.text(w / 2, h / 2, '\u2717', {
      fontSize: '36px', color: '#f33', fontFamily: 'Arial', fontStyle: 'bold',
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
     MEAT PILES (Left Side)
     ========================================= */
  createBins() {
    const keys = BIN_LAYOUT[0];

    const startX = 140;
    const startY = 480;
    const spacingX = 140;
    const spacingY = 100;

    keys.forEach((key, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const pileKey = key.replace('meat_', 'meat_pile_');
      const pile = this.add.image(x, y, pileKey).setDepth(20);

      pile.setInteractive({ useHandCursor: true });
      pile.on('pointerover', () => pile.setTint(0xdddddd));
      pile.on('pointerout', () => pile.clearTint());
      pile.on('pointerdown', () => {
        if (this.isPaused || this.heldItem) return;
        this.createMeatPileLogic(key, x, y, pile);
      });

      // Name label
      const ing = INGREDIENTS[key];
      this.add.text(x, y + 45, ing.name, {
        fontSize: '11px', color: '#ccc', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(21);
    });
  }

  createMeatPileLogic(key, x, y, visual) {
    soundManager.init();
    const pointer = this.input.activePointer;
    const heldVisual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = {
      visual: heldVisual,
      ingredientKey: key,
      binX: x, binY: y
    };
    this._justPickedUp = true;
  }



  /* =========================================
     LOAVES (Standalone sources)
     ========================================= */
  createLoaves() {
    // Place them to the right of the bins
    const startX = 940;
    const startY = 520;
    const spacingY = 100;

    const breads = [
      { key: 'bread_white', label: 'White', asset: 'loaf_white' },
      { key: 'bread_wheat', label: 'Wheat', asset: 'loaf_wheat' },
      { key: 'bread_sourdough', label: 'Sourdough', asset: 'loaf_sourdough' }
    ];

    breads.forEach((b, i) => {
      const y = startY + i * spacingY;
      const loaf = this.add.image(startX, y, b.asset).setDepth(20);
      loaf.setInteractive({ useHandCursor: true });
      loaf.on('pointerover', () => loaf.setTint(0xdddddd));
      loaf.on('pointerout', () => loaf.clearTint());
      loaf.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickLoaf(b.key, pointer);
      });

      this.add.text(startX, y + 40, b.label, {
        fontSize: '13px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);
    });
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

  /* =========================================
     TREATMENTS (Top Center) & SAUCES
     ========================================= */
  createTreatments() {
    const startX = 200;
    const startY = 200;
    const spacing = 110;

    // Treatments
    const treatKeys = ['toasted', 'togo', 'salt_pepper', 'oil_vinegar'];
    treatKeys.forEach((key, i) => {
      this.createTreatmentItem(key, startX + i * spacing, startY);
    });

    // Sauces to the right of treatments
    this.createSauceBottle('sauce_mayo', startX + 4 * spacing + 10, startY);
    this.createSauceBottle('sauce_mustard', startX + 5 * spacing + 10, startY);
  }

  /* =========================================
     CHEESE STACKS - CENTER RIGHT
     ========================================= */
  createCheeseStacks() {
    const baseX = 720;
    const spacingY = 110;
    const startY = 510;

    const cheeses = [
      { key: 'cheese_american', label: 'American' },
      { key: 'cheese_swiss', label: 'Swiss' }
    ];

    cheeses.forEach((c, i) => {
      const y = startY + i * spacingY;
      const stack = this.add.image(baseX, y, `cheese_stack_${c.key.split('_')[1]}`).setDepth(20);
      // Art lives in ~x:18-105, y:48-90 of the 128x128 frame
      stack.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(15, 45, 92, 50),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      stack.on('pointerover', () => stack.setTint(0xdddddd));
      stack.on('pointerout', () => stack.clearTint());
      stack.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickCheeseStack(c.key, pointer);
      });

      this.add.text(baseX, y + 50, c.label, {
        fontSize: '14px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);
    });
  }

  clickCheeseStack(key, pointer) {
    soundManager.init();
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
    this._justPickedUp = true;
  }

  /* =========================================
     VEGGIE BOWLS - CENTER LEFT
     ========================================= */
  createVeggieBowls() {
    const baseX = 480;
    const startY = 475;
    const spacingY = 90;

    const veggies = [
      { key: 'top_lettuce', label: 'Lettuce', asset: 'bowl_content_lettuce' },
      { key: 'top_tomato', label: 'Tomato', asset: 'bowl_content_tomato' },
      { key: 'top_onion', label: 'Onion', asset: 'bowl_content_onion' }
    ];

    veggies.forEach((v, i) => {
      const y = startY + i * spacingY;
      const vegImg = this.add.image(baseX, y, v.asset).setDepth(20).setScale(0.8);
      vegImg.setInteractive({ useHandCursor: true });
      vegImg.on('pointerover', () => vegImg.setTint(0xdddddd));
      vegImg.on('pointerout', () => vegImg.clearTint());
      vegImg.on('pointerdown', (pointer) => {
        if (this.isPaused || this.heldItem) return;
        this.clickVeggieBowl(v.key, pointer);
      });

      this.add.text(baseX, y + 40, v.label, {
        fontSize: '14px', color: '#ccc', fontStyle: 'bold', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(21);
    });
  }

  clickVeggieBowl(key, pointer) {
    soundManager.init();
    const visual = this.createHeldVisual(key, pointer.x, pointer.y);
    this.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
    this._justPickedUp = true;
  }

  createSauceBottle(key, x, y) {
    const assetKey = key === 'sauce_mayo' ? 'sauce_mayo_bottle' : 'sauce_mustard_bottle';
    const bottle = this.add.image(x, y, assetKey).setDepth(30).setScale(0.8);
    bottle.setInteractive({ useHandCursor: true });
    bottle.on('pointerover', () => bottle.setTint(0xdddddd));
    bottle.on('pointerout', () => bottle.clearTint());
    bottle.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
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
    const hw = 45;
    const hh = 50;
    const c = this.add.container(x, y).setDepth(30);
    c.setSize(hw * 2, hh * 2);
    c.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    // Background card
    const bg = this.add.graphics();
    bg.fillStyle(0x333344, 0.8);
    bg.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 10);
    bg.lineStyle(2, 0x555566, 1);
    bg.strokeRoundedRect(-hw, -hh, hw * 2, hh * 2, 10);
    c.add(bg);

    const g = this.add.graphics();

    if (tKey === 'toasted') {
      g.fillStyle(0x888888, 1);
      g.fillRoundedRect(-32, -18, 64, 52, 6);
      g.lineStyle(2, 0x666666, 1);
      g.strokeRoundedRect(-32, -18, 64, 52, 6);
      g.fillStyle(0x333333, 1);
      g.fillRect(-22, -14, 18, 7);
      g.fillRect(4, -14, 18, 7);
      g.fillStyle(0xAAAAAA, 1);
      g.fillRect(24, 2, 10, 20);
    } else if (tKey === 'togo') {
      g.fillStyle(0xD4C4A0, 1);
      g.fillRoundedRect(-32, -22, 64, 56, 5);
      g.lineStyle(2, 0xB0A080, 1);
      g.strokeRoundedRect(-32, -22, 64, 56, 5);
      g.lineStyle(1.5, 0xB0A080, 0.5);
      g.lineBetween(-22, -4, 22, -4);
      g.lineBetween(-18, 14, 18, 14);
    } else if (tKey === 'salt_pepper') {
      g.fillStyle(0xEEEEEE, 1);
      g.fillRoundedRect(-30, -14, 25, 42, 6);
      g.fillStyle(0xCCCCCC, 1);
      g.fillRect(-27, -22, 18, 10);
      g.fillStyle(0x444444, 1);
      g.fillRoundedRect(6, -14, 25, 42, 6);
      g.fillStyle(0x333333, 1);
      g.fillRect(9, -22, 18, 10);
    } else if (tKey === 'oil_vinegar') {
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-30, -6, 25, 38, 6);
      g.fillRect(-24, -24, 10, 20);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-26, -30, 14, 8);
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(6, -6, 25, 38, 6);
      g.fillRect(12, -24, 10, 20);
      g.fillStyle(0x662200, 1);
      g.fillRect(10, -30, 14, 8);
    }

    c.add(g);

    // Label below art
    const label = this.add.text(0, hh - 12, treat.name, {
      fontSize: '14px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.on('pointerover', () => {
      this.tweens.add({ targets: c, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Sine.easeOut' });
    });
    c.on('pointerout', () => {
      this.tweens.add({ targets: c, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
    });
    c.on('pointerdown', () => {
      if (this.isPaused || this.heldItem) return;
      soundManager.init();
      this.pickupTreatment(tKey);
    });

    this.treatmentItems[tKey] = c;
  }

  /* =========================================
     TREATMENT PICKUP (works like ingredients)
     ========================================= */
  pickupTreatment(tKey) {
    const treat = TREATMENTS[tKey];
    const pointer = this.input.activePointer;

    // Create a held visual for the treatment
    const c = this.add.container(pointer.x, pointer.y).setDepth(100);
    c.setSize(80, 40);

    const bg = this.add.graphics();
    bg.fillStyle(0x333344, 0.9);
    bg.fillRoundedRect(-40, -20, 80, 40, 8);
    bg.lineStyle(2, 0xFFAA00, 1);
    bg.strokeRoundedRect(-40, -20, 80, 40, 8);
    c.add(bg);

    const label = this.add.text(0, 0, treat.name, {
      fontSize: '14px', color: treat.label, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.setAlpha(0.9);
    c.setScale(0.4);
    this.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    this.heldItem = {
      visual: c,
      treatmentKey: tKey,
    };
    this._justPickedUp = true;

    soundManager.treatmentSound();
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

  /* =========================================
     CLICK TO PLACE (replaces drag & drop)
     ========================================= */
  setupClickToPlace() {
    this.trayHighlight = this.add.graphics().setDepth(9);

    this.input.on('pointermove', (pointer) => {
      if (!this.heldItem) {
        this.trayHighlight.clear();
        return;
      }
      this.heldItem.visual.x = pointer.x;
      this.heldItem.visual.y = pointer.y;

      this.trayHighlight.clear();
      if (pointer.y < this.BELT_TOP) {
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

      if (!this.heldItem) return;

      if (this._justPickedUp) {
        this._justPickedUp = false;
        return;
      }

      this.placeHeldItem(pointer);
    });

    this.escKey.on('down', () => {
      if (this.heldItem) {
        this.cancelHeldItem();
      }
    });
  }

  drawDebugHitboxes() {
    const g = this.add.graphics().setDepth(999);

    this.children.list.forEach((obj) => {
      if (!obj.input || !obj.input.hitArea) return;
      const ha = obj.input.hitArea;
      if (!(ha instanceof Phaser.Geom.Rectangle)) return;

      if (obj instanceof Phaser.GameObjects.Image) {
        // Image hitAreas are in frame-space (0,0 = top-left of texture)
        const ox = obj.x - obj.displayWidth * obj.originX;
        const oy = obj.y - obj.displayHeight * obj.originY;
        const sx = obj.displayWidth / obj.width;
        const sy = obj.displayHeight / obj.height;
        g.lineStyle(1, 0x00ff00, 0.7);
        g.strokeRect(ox + ha.x * sx, oy + ha.y * sy, ha.width * sx, ha.height * sy);
      } else if (obj instanceof Phaser.GameObjects.Container) {
        // Container hitAreas use centered coordinates
        g.lineStyle(1, 0x00ffff, 0.7);
        g.strokeRect(obj.x + ha.x, obj.y + ha.y, ha.width, ha.height);
      }
    });
  }

  createHeldVisual(key, x, y) {
    const ing = INGREDIENTS[key];
    const c = this.add.container(x, y).setDepth(100);
    c.setSize(130, 56);

    // Sauces use _bottle textures since no standalone sauce texture exists
    const textureKey = key.includes('sauce') ? key + '_bottle' : key;
    const img = this.add.image(0, 0, textureKey).setOrigin(0.5);
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
    const obj = this.heldItem.visual;
    const tray = this.findTrayAtX(pointer.x);
    const landY = this.LAND_Y;
    const isTreatment = !!this.heldItem.treatmentKey;
    const savedTreatmentKey = this.heldItem.treatmentKey;
    const savedIngredientKey = this.heldItem.ingredientKey;

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
          if (isTreatment) {
            this.applyTreatmentToTray(tray, savedTreatmentKey);
          } else {
            const key = savedIngredientKey;
            const result = this.tryPlace(tray, key);
            if (result === 'valid') {
              const ing = INGREDIENTS[key];
              soundManager.plopCategory(ing.category);
            } else if (result === 'wrong') {
              soundManager.buzz();
              this.dayScore = Math.max(0, this.dayScore - 25);
              this.refreshHUD();
              this.flashTray(tray, 0xff0000);

              // Show what ingredient is expected
              const expectedKey = tray.order.ingredients[tray.placed.length];
              const expectedName = expectedKey ? INGREDIENTS[expectedKey].name : '?';
              const needTxt = this.add.text(tray.container.x, tray.container.y - 60,
                `Need ${expectedName}!\n-25`, {
                fontSize: '16px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold',
                align: 'center',
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({
                targets: needTxt, y: needTxt.y - 40, alpha: 0, duration: 1200,
                onComplete: () => needTxt.destroy(),
              });
            }
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
    soundManager.cancelSound();
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
    const baseY = this.BELT_Y;

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

    const breads = ['bread_white', 'bread_wheat', 'bread_sourdough'];
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

    const totalPrice = this.calculateOrderPrice(list, treatments, isFooter);
    return { ingredients: list, treatments, isFooter, totalPrice };
  }

  calculateOrderPrice(ingredients, treatments, isFooter) {
    let price = isFooter ? 3.00 : 1.50;
    ingredients.forEach(key => {
      const ing = INGREDIENTS[key];
      price += (ing.price || 0.50);
    });
    treatments.forEach(() => price += 0.25);
    return price;
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
    if (cat === 'sauce') return 2;
    if (cat === 'topping') return 4;
    if (cat === 'cheese') return 4;
    if (cat === 'meat') return 5;
    return 6; // bread
  }

  addStackLayer(tray, ingredientKey) {
    const ing = INGREDIENTS[ingredientKey];
    const cat = ing.category;

    const layerH = this.getLayerHeight(ingredientKey);
    const ly = -2 - tray.stackHeight;
    tray.stackHeight += layerH;

    const rX = (Math.random() - 0.5) * 4;
    const rY = (Math.random() - 0.5) * 2;
    const w = tray.isFooter ? 80 : 55;
    const hw = w / 2;

    const g = this.add.graphics();

    if (cat === 'bread') {
      // Bottom bread = flat base + dome top; top bread = dome
      const isBottom = tray.stackLayers.length === 0;
      g.fillStyle(ing.color, 1);
      g.lineStyle(1.5, ing.border, 0.8);
      if (isBottom) {
        g.fillRoundedRect(rX - hw, ly + rY - 4, w, 10, 3);
        g.strokeRoundedRect(rX - hw, ly + rY - 4, w, 10, 3);
      } else {
        // Top bread dome
        g.fillRoundedRect(rX - hw, ly + rY - 3, w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
        g.strokeRoundedRect(rX - hw, ly + rY - 3, w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
      }
    } else if (cat === 'meat') {
      // Folded deli meat — wavy oval
      const mw = hw - 2;
      g.fillStyle(ing.color, 0.95);
      g.lineStyle(1, ing.border, 0.7);
      g.fillEllipse(rX, ly + rY, mw * 2, 8);
      g.strokeEllipse(rX, ly + rY, mw * 2, 8);
      // Fold highlight
      g.fillStyle(darkenColor(ing.color, 0.85), 0.4);
      g.fillEllipse(rX + 4, ly + rY - 1, mw, 4);
    } else if (cat === 'cheese') {
      // Thin rectangle, slightly wider than meat, droopy edges
      const cw = hw - 1;
      g.fillStyle(ing.color, 1);
      g.lineStyle(1, ing.border, 0.8);
      g.fillRect(rX - cw, ly + rY - 2, cw * 2, 5);
      g.strokeRect(rX - cw, ly + rY - 2, cw * 2, 5);
      // Droopy edges
      g.fillTriangle(rX - cw, ly + rY + 3, rX - cw - 3, ly + rY + 7, rX - cw + 5, ly + rY + 3);
      g.fillTriangle(rX + cw, ly + rY + 3, rX + cw + 3, ly + rY + 7, rX + cw - 5, ly + rY + 3);
      if (ingredientKey === 'cheese_swiss') {
        // Swiss cheese holes
        g.fillStyle(darkenColor(ing.color, 0.8), 0.6);
        g.fillCircle(rX - 8, ly + rY, 2);
        g.fillCircle(rX + 6, ly + rY + 1, 1.5);
      }
    } else if (ingredientKey === 'top_lettuce') {
      // Wavy green leaf
      g.fillStyle(ing.color, 0.9);
      g.lineStyle(1, ing.border, 0.7);
      g.beginPath();
      g.moveTo(rX - hw + 4, ly + rY);
      for (let i = 0; i <= 8; i++) {
        const px = rX - hw + 4 + (i / 8) * (w - 8);
        const py = ly + rY + Math.sin(i * 1.8) * 3;
        g.lineTo(px, py - 3);
      }
      for (let i = 8; i >= 0; i--) {
        const px = rX - hw + 4 + (i / 8) * (w - 8);
        const py = ly + rY + Math.sin(i * 1.8 + 1) * 2;
        g.lineTo(px, py + 3);
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    } else if (ingredientKey === 'top_tomato') {
      // Two-three tomato slices
      g.fillStyle(ing.color, 0.9);
      g.lineStyle(1, ing.border, 0.7);
      const sliceW = 12;
      for (let i = -1; i <= 1; i++) {
        g.fillEllipse(rX + i * (sliceW + 2), ly + rY, sliceW, 6);
        g.strokeEllipse(rX + i * (sliceW + 2), ly + rY, sliceW, 6);
        // Seed pattern
        g.fillStyle(0xFFAAAA, 0.5);
        g.fillCircle(rX + i * (sliceW + 2), ly + rY, 1.5);
        g.fillStyle(ing.color, 0.9);
      }
    } else if (ingredientKey === 'top_onion') {
      // Onion rings
      g.lineStyle(2, ing.border, 0.8);
      g.strokeEllipse(rX - 10, ly + rY, 14, 6);
      g.strokeEllipse(rX + 8, ly + rY, 16, 7);
      g.fillStyle(ing.color, 0.5);
      g.fillEllipse(rX - 10, ly + rY, 14, 6);
      g.fillEllipse(rX + 8, ly + rY, 16, 7);
    } else if (cat === 'sauce') {
      // Zigzag drizzle across the width
      g.lineStyle(2.5, ing.color, 0.9);
      g.beginPath();
      const steps = 7;
      g.moveTo(rX - hw + 6, ly + rY);
      for (let i = 1; i <= steps; i++) {
        const px = rX - hw + 6 + (i / steps) * (w - 12);
        const py = ly + rY + (i % 2 === 0 ? -3 : 3);
        g.lineTo(px, py);
      }
      g.strokePath();
    }

    tray.container.add(g);
    tray.stackLayers.push(g);
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
    tray.completedAtX = tray.container.x;
    this.flashTray(tray, 0x00ff00);

    const c = tray.container;
    this.animateCompletionHop(c, c.y);
    this.animateCompletionDance(c);
    this.animateChefPress(c);
  }

  animateCompletionHop(container, baseY) {
    this.tweens.add({
      targets: container, y: baseY - 18, scaleX: 0.9, scaleY: 1.2,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container, y: baseY, scaleX: 1.15, scaleY: 0.85,
          duration: 100, ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: container, scaleX: 1.0, scaleY: 1.0,
              duration: 200, ease: 'Bounce.easeOut',
            });
          },
        });
      },
    });
  }

  animateCompletionDance(container) {
    this.tweens.chain({
      targets: container,
      tweens: [
        { angle: -10, duration: 80, ease: 'Sine.easeOut', delay: 100 },
        { angle: 10, duration: 100, ease: 'Sine.easeInOut' },
        { angle: -8, duration: 90, ease: 'Sine.easeInOut' },
        { angle: 8, duration: 85, ease: 'Sine.easeInOut' },
        { angle: -4, duration: 75, ease: 'Sine.easeInOut' },
        { angle: 3, duration: 70, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 80, ease: 'Sine.easeOut' },
      ],
    });
  }

  animateChefPress(container) {
    this.time.delayedCall(700, () => {
      if (!container || !container.scene) return;
      this.tweens.add({
        targets: container,
        scaleY: 0.82,
        scaleX: 1.06,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.tweens.add({
            targets: container,
            scaleY: 0.88,
            scaleX: 1.02,
            duration: 200,
            ease: 'Bounce.easeOut',
          });
        },
      });
    });
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
    const speedBonus = (tray.completedAtX || 0) > this.SPEED_BONUS_X ? (tray.isFooter ? 100 : 50) : 0;
    this.dayScore += baseScore + speedBonus;
    this.refreshHUD();

    soundManager.score();
    this.markTicketCompleted(tray.orderNum);

    const popupText = speedBonus > 0
      ? `$${orderValue.toFixed(2)}\n+SPEED BONUS!`
      : `$${orderValue.toFixed(2)}`;
    const popup = this.add.text(tray.container.x, tray.container.y - 70,
      popupText, {
      fontSize: '26px', color: '#0f0', fontFamily: 'Arial', fontStyle: 'bold',
      align: 'center',
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
    if (this.isPaused) return;
    this.strikes++;
    this.ordersMissed++;
    this.refreshHUD();
    soundManager.buzz();

    this.markTicketMissed(tray.orderNum);

    // Screen shake
    this.cameras.main.shake(200, 0.005);

    // Red flash overlay
    const flash = this.add.rectangle(512, 384, 1024, 768, 0xff0000, 0.18).setDepth(200);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => flash.destroy(),
    });

    // "MISSED!" text at tray position
    const miss = this.add.text(tray.container.x, tray.container.y - 40, '\u2717 MISSED!', {
      fontSize: '36px', color: '#ff3333', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: miss, alpha: 0, y: miss.y - 60, duration: 1200,
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
      if (tray.completed) moveSpeed *= this.spaceKey.isDown ? this.COMPLETED_FAST_MULT : this.COMPLETED_SPEED_MULT;
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
