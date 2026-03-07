/**
 * GameSceneBins - Ingredient bins, treatments, sauces, veggie bowls, cheese, loaves
 */
import { INGREDIENTS, BIN_LAYOUT, TREATMENTS } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';

const HOTKEYS = {
  'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4', 'meat_prosciutto': 'Q',
  'bread_white': 'Z', 'bread_wheat': 'X', 'bread_sourdough': 'C',
  'top_lettuce': '5', 'top_tomato': '6', 'top_onion': '7',
  'top_pickles': '8', 'top_arugula': '9', 'top_olives': '0',
  'cheese_american': 'W', 'cheese_swiss': 'E',
  'sauce_mayo': 'A', 'sauce_mustard': 'S',
  'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V',
};


export class GameSceneBins {
  constructor(scene) {
    this.scene = scene;
    this.binYOffset = 60;
    this.binImageMap = {};   // ingredientKey → image object
    this.highlightGfx = null;
    this.highlightTween = null;
    this._currentHighlight = null;
  }

  highlightBin(ingredientKey) {
    if (this._currentHighlight === ingredientKey) return;
    this.clearBinHighlight();
    this._currentHighlight = ingredientKey;

    const img = this.binImageMap[ingredientKey];
    if (!img) return;

    const s = this.scene;
    if (!this.highlightGfx) {
      this.highlightGfx = s.add.graphics().setDepth(25);
    }

    // Draw a pulsing ring around the bin position using a graphics overlay
    const drawRing = (alpha) => {
      if (!this.highlightGfx || !img || !img.active) return;
      this.highlightGfx.clear();
      const r = Math.max(img.displayWidth, img.displayHeight) * 0.55;
      this.highlightGfx.lineStyle(3, 0xFFDD44, alpha);
      this.highlightGfx.strokeCircle(img.x, img.y, r);
      this.highlightGfx.fillStyle(0xFFDD44, alpha * 0.08);
      this.highlightGfx.fillCircle(img.x, img.y, r);
    };

    drawRing(0.8);
    this.highlightTween = s.tweens.addCounter({
      from: 0.4, to: 0.9,
      duration: 420, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      onUpdate: (tween) => drawRing(tween.getValue()),
    });
  }

  clearBinHighlight() {
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = null;
    }
    this._currentHighlight = null;
    if (this.highlightGfx) this.highlightGfx.clear();
  }

  addHotkeyBadge(x, y, key) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(22);
    g.fillStyle(0x1A1208, 0.92);
    g.fillRoundedRect(x - 13, y - 11, 26, 22, 5);
    g.lineStyle(1.5, 0xC8A060, 0.85);
    g.strokeRoundedRect(x - 13, y - 11, 26, 22, 5);
    s.add.text(x, y, key, {
      fontSize: '16px', color: '#FFD080', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(23);
  }

  create() {
    this.createBinZones();
    this.createBins();
    this.createTreatments();
    this.createVeggieBowls();
    this.createCheeseStacks();
    this.createLoaves();
  }

  createBinZones() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(9);

    const yOff = this.binYOffset;

    // Meats zone — warm reddish tint, stronger overlay
    g.fillStyle(s.BIN_MEAT, 0.25);
    g.fillRoundedRect(88, 535 + yOff, 410, 330, 12);
    g.lineStyle(2, 0xCC5050, 0.4);
    g.strokeRoundedRect(88, 535 + yOff, 410, 330, 12);
    // Left edge accent
    g.fillStyle(0xCC5050, 0.5);
    g.fillRect(88, 547 + yOff, 3, 306);

    // Toppings zone — earthy green
    g.fillStyle(s.BIN_TOPPING, 0.25);
    g.fillRoundedRect(520, 535 + yOff, 385, 230, 12);
    g.lineStyle(2, 0x50CC50, 0.4);
    g.strokeRoundedRect(520, 535 + yOff, 385, 230, 12);
    g.fillStyle(0x50CC50, 0.5);
    g.fillRect(520, 547 + yOff, 3, 206);

    // Cheese zone — warm amber
    g.fillStyle(s.BIN_CHEESE, 0.25);
    g.fillRoundedRect(1085, 535 + yOff, 190, 330, 12);
    g.lineStyle(2, 0xCCCC50, 0.4);
    g.strokeRoundedRect(1085, 535 + yOff, 190, 330, 12);
    g.fillStyle(0xCCCC50, 0.5);
    g.fillRect(1085, 547 + yOff, 3, 306);

    // Treatments zone — blue
    g.fillStyle(s.BIN_TREATMENT, 0.25);
    g.fillRoundedRect(520, 770 + yOff, 280, 95, 12);
    g.lineStyle(2, 0x5080CC, 0.4);
    g.strokeRoundedRect(520, 770 + yOff, 280, 95, 12);
    g.fillStyle(0x5080CC, 0.5);
    g.fillRect(520, 782 + yOff, 3, 71);

    // Sauces zone — light blue 
    g.fillStyle(0x50AACC, 0.25);
    g.fillRoundedRect(810, 770 + yOff, 260, 95, 12);
    g.lineStyle(2, 0x50AACC, 0.4);
    g.strokeRoundedRect(810, 770 + yOff, 260, 95, 12);
    g.fillStyle(0x50AACC, 0.5);
    g.fillRect(810, 782 + yOff, 3, 71);

    // Zone labels — larger and brighter, color-coded
    s.add.text(293, 540 + yOff, 'MEATS', {
      fontSize: '16px', color: '#DD8888', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    s.add.text(712, 540 + yOff, 'TOPPINGS', {
      fontSize: '16px', color: '#88DD88', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    s.add.text(1180, 540 + yOff, 'CHEESE', {
      fontSize: '16px', color: '#DDDD88', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    s.add.text(660, 775 + yOff, 'TREATMENTS', {
      fontSize: '16px', color: '#88AADD', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    s.add.text(940, 775 + yOff, 'SAUCES', {
      fontSize: '16px', color: '#88CCDD', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
  }

  getIsoPosition(col, row, baseX, baseY, spacingX, spacingY) {
    const x = baseX + col * spacingX + row * spacingY * this.scene.ISO_SKEW;
    const y = baseY + row * spacingY;
    return { x, y };
  }

  createBins() {
    const s = this.scene;
    const keys = BIN_LAYOUT[0];
    s.meatPileItems = [];

    const baseX = 178;
    const baseY = 590 + this.binYOffset;
    const spacingX = 188;
    const spacingY = 98;
    const day = s.day ?? 99;

    keys.forEach((key, i) => {
      const ing = INGREDIENTS[key];
      const isLocked = ing.unlockDay && day < ing.unlockDay;

      const row = Math.floor(i / 2);
      const col = i % 2;
      const pos = (i === 4)
        ? { x: baseX + spacingX * 0.5, y: baseY + spacingY * 2 }
        : this.getIsoPosition(col, row, baseX, baseY, spacingX, spacingY);
      const x = pos.x;
      const y = pos.y;

      const pileKey = key.replace('meat_', 'meat_pile_');
      const pile = s.add.image(x, y, pileKey).setDepth(20).setScale(1.08);

      if (!isLocked) this.binImageMap[key] = pile;

      if (isLocked) {
        pile.setAlpha(0.3).setTint(0x444444);
      } else {
        pile.setInteractive({ useHandCursor: true });
        pile.on('pointerover', () => pile.setTint(0xdddddd));
        pile.on('pointerout', () => pile.clearTint());
        pile.on('pointerdown', () => {
          if (s.isPaused || s.heldItem) return;
          this.createMeatPileLogic(key, x, y, pile);
        });
      }

      const label = s.add.text(x, y + 55, ing.name, {
        fontSize: '16px', color: isLocked ? '#666' : '#ddd', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(21);

      if (!isLocked && HOTKEYS[key]) {
        this.addHotkeyBadge(x + 30, y - 26, HOTKEYS[key]);
      }

      s.meatPileItems.push({ img: pile, label, key, isLocked });
    });
  }

  createMeatPileLogic(key, x, y, visual) {
    const s = this.scene;
    const ing = INGREDIENTS[key];
    soundManager.init();
    soundManager.robotPickup();
    const pointer = s.input.activePointer;
    const heldVisual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = {
      visual: heldVisual,
      ingredientKey: key,
      binX: x, binY: y
    };
    s.particleManager.ingredientPickup(x, y, ing.color);
  }

  createLoaves() {
    const s = this.scene;
    s.loafItems = [];
    const baseX = 1538;
    const baseY = 605 + this.binYOffset;
    const spacingY = 98;

    const breads = [
      { key: 'bread_white', label: 'White', asset: 'loaf_white' },
      { key: 'bread_wheat', label: 'Wheat', asset: 'loaf_wheat' },
      { key: 'bread_sourdough', label: 'Sourdough', asset: 'loaf_sourdough' }
    ];

    const shadowGfx = s.add.graphics().setDepth(11);

    breads.forEach((b, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      shadowGfx.fillStyle(0x000000, 0.15);
      shadowGfx.fillEllipse(x, y + 16, 35, 10);

      const loaf = s.add.image(x, y, b.asset).setDepth(20);
      loaf.setScale(0.85);
      this.binImageMap[b.key] = loaf;
      loaf.setInteractive({ useHandCursor: true });
      loaf.on('pointerover', () => loaf.setTint(0xdddddd));
      loaf.on('pointerout', () => loaf.clearTint());
      loaf.on('pointerdown', (pointer) => {
        if (s.isPaused || s.heldItem) return;
        this.clickLoaf(b.key, pointer);
      });

      s.add.text(x, y + 38, b.label, {
        fontSize: '16px', color: '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      if (HOTKEYS[b.key]) {
        this.addHotkeyBadge(x + 52, y - 22, HOTKEYS[b.key]);
      }

      s.loafItems.push({ img: loaf, key: b.key });
    });
  }

  clickLoaf(key, pointer) {
    const s = this.scene;
    const ing = INGREDIENTS[key];
    soundManager.robotPickup();
    const visual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = {
      visual,
      ingredientKey: key,
      binX: 0,
      binY: 0,
    };
    s.particleManager.ingredientPickup(pointer.x, pointer.y, ing.color);
  }

  createTreatments() {
    // Row 1: prep + sauces
    const yOff = this.binYOffset;

    // Treatments (Toasted, To-Go, Salt, Pepper)
    this.createTreatmentItem('toasted', 565, 815 + yOff);
    this.createTreatmentItem('togo', 635, 815 + yOff);
    this.createTreatmentItem('salt', 695, 815 + yOff);
    this.createTreatmentItem('pepper', 755, 815 + yOff);

    // Sauces below Toppings
    this.createSauceBottle('sauce_mayo', 855, 865 + yOff);
    this.createSauceBottle('sauce_mustard', 925, 865 + yOff);
    this.createTreatmentItem('oil_vinegar', 1010, 815 + yOff);
  }

  createCheeseStacks() {
    const s = this.scene;
    s.cheeseStackItems = [];
    const baseX = 1163;
    const baseY = 619 + this.binYOffset;
    const spacingY = 120;

    const cheeses = [
      { key: 'cheese_american', label: 'American' },
      { key: 'cheese_swiss', label: 'Swiss' }
    ];

    cheeses.forEach((c, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      const stack = s.add.image(x, y, `cheese_stack_${c.key.split('_')[1]}`).setDepth(20);
      this.binImageMap[c.key] = stack;
      stack.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(15, 45, 92, 50),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      stack.on('pointerover', () => stack.setTint(0xdddddd));
      stack.on('pointerout', () => stack.clearTint());
      stack.on('pointerdown', (pointer) => {
        if (s.isPaused || s.heldItem) return;
        this.clickCheeseStack(c.key, pointer);
      });

      const label = s.add.text(x, y + 52, c.label, {
        fontSize: '16px', color: '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      if (HOTKEYS[c.key]) {
        this.addHotkeyBadge(x + 38, y - 28, HOTKEYS[c.key]);
      }

      s.cheeseStackItems.push({ img: stack, key: c.key });
    });
  }

  clickCheeseStack(key, pointer) {
    const s = this.scene;
    soundManager.init();
    soundManager.robotPickup();
    const visual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
  }

  createVeggieBowls() {
    const s = this.scene;
    s.veggieBowlItems = [];
    const day = s.day ?? 99;

    const row1Y = 605 + this.binYOffset;
    const row1StartX = 580;
    const spacingX = 120;
    const row2Y = 695 + this.binYOffset;
    const row2StartX = 580;

    const row1Veggies = [
      { key: 'top_lettuce', label: 'Lettuce', asset: 'bowl_content_lettuce', hotkey: '5' },
      { key: 'top_tomato', label: 'Tomato', asset: 'bowl_content_tomato', hotkey: '6' },
      { key: 'top_onion', label: 'Onion', asset: 'bowl_content_onion', hotkey: '7' }
    ];

    const row2Veggies = [
      { key: 'top_pickles', label: 'Pickles', asset: 'bowl_content_pickles', hotkey: '8', unlockDay: 2 },
      { key: 'top_arugula', label: 'Arugula', asset: 'bowl_content_arugula', hotkey: '9', unlockDay: 2 },
      { key: 'top_olives', label: 'Olives', asset: 'bowl_content_olives', hotkey: '0', unlockDay: 4 }
    ];

    const allVeggies = [
      ...row1Veggies.map((v, i) => ({ ...v, x: row1StartX + i * spacingX, y: row1Y })),
      ...row2Veggies.map((v, i) => ({ ...v, x: row2StartX + i * spacingX, y: row2Y }))
    ];

    allVeggies.forEach((v) => {
      const isLocked = v.unlockDay && day < v.unlockDay;

      const vegImg = s.add.image(v.x, v.y, v.asset).setDepth(20).setScale(1.08);

      if (!isLocked) this.binImageMap[v.key] = vegImg;

      if (isLocked) {
        vegImg.setAlpha(0.3).setTint(0x444444);
      } else {
        vegImg.setInteractive({ useHandCursor: true });
        vegImg.on('pointerover', () => vegImg.setTint(0xdddddd));
        vegImg.on('pointerout', () => vegImg.clearTint());
        vegImg.on('pointerdown', (pointer) => {
          if (s.isPaused || s.heldItem) return;
          this.clickVeggieBowl(v.key, pointer);
        });
      }

      const label = s.add.text(v.x, v.y + 42, v.label, {
        fontSize: '16px', color: isLocked ? '#666' : '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      if (!isLocked && HOTKEYS[v.key]) {
        this.addHotkeyBadge(v.x + 32, v.y - 18, HOTKEYS[v.key]);
      }

      s.veggieBowlItems.push({ img: vegImg, label, ...v });
    });
  }

  clickVeggieBowl(key, pointer) {
    const s = this.scene;
    soundManager.init();
    soundManager.robotPickup();
    const visual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = { visual, ingredientKey: key, binX: 0, binY: 0 };
  }

  createSauceBottle(key, x, y) {
    const s = this.scene;
    if (!s.sauceBottleItems) s.sauceBottleItems = [];
    const ingredient = INGREDIENTS[key];
    const radius = 22;

    const container = s.add.container(x, y).setDepth(30);

    const bottleKey = key + '_bottle';
    const bottleImg = s.add.image(0, 0, bottleKey).setScale(0.25);
    container.add(bottleImg);

    const label = s.add.text(0, -radius - 14, ingredient.name, {
      fontSize: '16px', color: '#ccc', fontStyle: 'bold', fontFamily: GAME_FONT
    }).setOrigin(0.5);
    container.add(label);

    if (HOTKEYS[key]) {
      const badgeG = s.add.graphics();
      badgeG.fillStyle(0x1A1208, 0.92);
      badgeG.fillRoundedRect(13, -32, 26, 22, 5);
      badgeG.lineStyle(1.5, 0xC8A060, 0.85);
      badgeG.strokeRoundedRect(13, -32, 26, 22, 5);
      container.add(badgeG);
      const badgeTxt = s.add.text(26, -21, HOTKEYS[key], {
        fontSize: '16px', color: '#FFD080', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(badgeTxt);
    }

    const hitW = 60;
    const hitH = 90;
    const hitY = -50;
    container.setSize(hitW, hitH);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hitW / 2, hitY, hitW, hitH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerover', () => bottleImg.setAlpha(0.8));
    container.on('pointerout', () => bottleImg.setAlpha(1));
    container.on('pointerdown', () => {
      if (s.isPaused || s.heldItem) return;
      soundManager.init();
      this.pickupSauce(key);
    });

    s.sauceBottleItems.push({ container, key });
  }

  pickupSauce(key) {
    const s = this.scene;
    soundManager.robotPickup();
    const pointer = s.input.activePointer;
    const visual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = {
      visual,
      ingredientKey: key,
      isSauce: true,
    };
  }

  createTreatmentItem(tKey, x, y) {
    const s = this.scene;
    const treat = TREATMENTS[tKey];
    const c = s.add.container(x, y).setDepth(30);
    const g = s.add.graphics();

    const bounds = this.drawTreatmentGraphics(g, tKey);
    c.add(g);

    const zone = s.add.zone(0, 0, bounds.w + 10, bounds.h + 10);
    c.add(zone);

    zone.setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      s.tweens.add({ targets: c, scaleX: 1.08, scaleY: 1.08, duration: 100, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      s.tweens.add({ targets: c, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
    });
    zone.on('pointerdown', () => {
      if (s.isPaused || s.heldItem) return;
      soundManager.init();
      this.pickupTreatment(tKey);
    });

    const labelY = (tKey === 'togo') ? 40 : (tKey === 'toasted') ? 38 : 36;
    const label = s.add.text(0, labelY, treat.name, {
      fontSize: '16px', color: treat.label, fontFamily: GAME_FONT, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    c.add(label);

    if (HOTKEYS[tKey]) {
      const badgeG = s.add.graphics();
      const badgeW = 26; const badgeH = 22;
      badgeG.fillStyle(0x1A1208, 0.92);
      badgeG.fillRoundedRect(-badgeW / 2, labelY + 18, badgeW, badgeH, 5);
      badgeG.lineStyle(1.5, 0xC8A060, 0.85);
      badgeG.strokeRoundedRect(-badgeW / 2, labelY + 18, badgeW, badgeH, 5);
      c.add(badgeG);
      const badgeTxt = s.add.text(0, labelY + 29, HOTKEYS[tKey], {
        fontSize: '16px', color: '#FFD080', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add(badgeTxt);
    }

    s.treatmentItems[tKey] = c;
  }

  drawTreatmentGraphics(g, tKey) {
    const iso = 6;

    if (tKey === 'toasted') {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 50, 14);
      g.fillStyle(0x707078, 1);
      g.fillRect(-28, -8, 56, 36);
      g.fillStyle(0x909098, 1);
      g.beginPath();
      g.moveTo(-28, -8);
      g.lineTo(-28 + iso, -8 - iso);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28, -8);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x505058, 1);
      g.beginPath();
      g.moveTo(28, -8);
      g.lineTo(28 + iso, -8 - iso);
      g.lineTo(28 + iso, 28 - iso);
      g.lineTo(28, 28);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x222228, 1);
      for (let i = 0; i < 4; i++) {
        const slotX = -22 + i * 12;
        g.beginPath();
        g.moveTo(slotX, -8);
        g.lineTo(slotX + iso * 0.5, -8 - iso * 0.8);
        g.lineTo(slotX + 8 + iso * 0.5, -8 - iso * 0.8);
        g.lineTo(slotX + 8, -8);
        g.closePath();
        g.fillPath();
      }
      g.fillStyle(0x404048, 1);
      g.fillRect(30, 5, 6, 18);
      g.fillStyle(0x606068, 1);
      g.fillRect(30, 5, 6, 4);
      g.fillStyle(0x606068, 1);
      g.fillRect(-18, 16, 36, 8);
      return { w: 70, h: 50 };

    } else if (tKey === 'togo') {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 30, 48, 12);
      for (let b = 0; b < 3; b++) {
        const by = 20 - b * 14;
        const biso = 5;
        g.fillStyle(b === 0 ? 0xE8E8E8 : 0xF0F0F0, 1);
        g.fillRect(-26, by - 10, 52, 12);
        g.fillStyle(b === 0 ? 0xF5F5F5 : 0xFAFAFA, 1);
        g.beginPath();
        g.moveTo(-26, by - 10);
        g.lineTo(-26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26, by - 10);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xD0D0D0, 1);
        g.beginPath();
        g.moveTo(26, by - 10);
        g.lineTo(26 + biso, by - 10 - biso);
        g.lineTo(26 + biso, by + 2 - biso);
        g.lineTo(26, by + 2);
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0xBBBBBB, 0.6);
        g.lineBetween(-22, by - 6, 22, by - 6);
      }
      return { w: 65, h: 70 };

    } else if (tKey === 'salt') {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);
      g.fillStyle(0xF0F0F0, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      g.fillStyle(0xC0C0C0, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0xDDDDDD, 1);
      g.fillRect(-10, -18, 20, 4);
      g.fillStyle(0x666666, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillRect(-8, 8, 16, 16);
      g.fillStyle(0xFFBB44, 0.8);
      g.fillRect(-8, 2, 16, 8);
      return { w: 32, h: 54 };

    } else if (tKey === 'pepper') {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(0, 28, 28, 10);
      g.fillStyle(0x333333, 1);
      g.fillRoundedRect(-12, -8, 24, 36, 4);
      g.fillStyle(0x222222, 1);
      g.fillRect(-10, -18, 20, 12);
      g.fillStyle(0x444444, 1);
      g.fillRect(-10, -18, 20, 4);
      g.fillStyle(0x111111, 1);
      g.fillCircle(-4, -14, 1.5);
      g.fillCircle(0, -12, 1.5);
      g.fillCircle(4, -14, 1.5);
      g.fillStyle(0x1A1A1A, 0.6);
      g.fillRect(-8, 8, 16, 16);
      g.fillStyle(0xFF4444, 0.8);
      g.fillRect(-8, 2, 16, 8);
      return { w: 32, h: 54 };

    } else if (tKey === 'oil_vinegar') {
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(0, 26, 45, 10);
      g.fillStyle(0xCCCC44, 0.8);
      g.fillRoundedRect(-28, -2, 22, 32, 4);
      g.fillRect(-22, -18, 10, 18);
      g.fillStyle(0xAAAA22, 1);
      g.fillRect(-24, -22, 14, 6);
      g.fillStyle(0x884422, 0.8);
      g.fillRoundedRect(6, -2, 22, 32, 4);
      g.fillRect(12, -18, 10, 18);
      g.fillStyle(0x662200, 1);
      g.fillRect(10, -22, 14, 6);
      return { w: 60, h: 58 };
    }

    return { w: 50, h: 50 };
  }

  pickupTreatment(tKey) {
    const s = this.scene;
    soundManager.robotPickup();
    const pointer = s.input.activePointer;

    const c = s.add.container(pointer.x, pointer.y).setDepth(100);
    const g = s.add.graphics();
    const size = this.drawTreatmentGraphics(g, tKey);
    c.setSize(size.w, size.h);
    c.add(g);

    c.setAlpha(0.9);
    c.setScale(0.4);
    s.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    s.heldItem = {
      visual: c,
      treatmentKey: tKey,
    };

    soundManager.treatmentSound();
  }

  applyTreatmentToTray(tray, treatmentKey) {
    const s = this.scene;
    if (!tray.order.treatments || tray.order.treatments.length === 0) {
      soundManager.buzz();
      s.flashTray(tray, 0xff0000);
      return;
    }

    const needed = tray.order.treatments.includes(treatmentKey);
    const alreadyApplied = tray.appliedTreatments.includes(treatmentKey);

    if (!needed || alreadyApplied) {
      soundManager.buzz();
      s.flashTray(tray, 0xff0000);
      return;
    }

    tray.appliedTreatments.push(treatmentKey);
    soundManager.treatmentSound();

    s.ticketBar.updateTicketTreatment(tray.orderNum, treatmentKey);
    this.drawTreatmentEffect(tray, treatmentKey);
    s.updateTrayNextHint(tray);
    s.checkTrayCompletion(tray);
  }

  drawTreatmentEffect(tray, treatmentKey) {
    const s = this.scene;
    const g = s.add.graphics();
    const stackTop = -16 - (tray.stackHeight || 0);
    const stackBot = -16 + 9;
    const hw = 55;

    if (treatmentKey === 'toasted') {
      if (tray.breadLayers) {
        tray.breadLayers.forEach(bread => {
          const toastedKey = bread.key + '_toasted';
          if (s.textures.exists(toastedKey)) {
            bread.image.setTexture(toastedKey);
          } else {
            // Fallback tint if texture missing
            bread.image.setTint(0xC4943D);
          }
        });
      }
    } else if (treatmentKey === 'togo') {
      g.lineStyle(2, 0xD4C4A0, 0.7);
      g.strokeRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
      g.fillStyle(0xD4C4A0, 0.15);
      g.fillRoundedRect(-hw, stackTop - 5, hw * 2, stackBot - stackTop + 15, 3);
    } else if (treatmentKey === 'salt') {
      for (let i = 0; i < 8; i++) {
        const sx = (Math.random() - 0.5) * (hw * 2 - 10);
        const sy = stackTop + Math.random() * (stackBot - stackTop + 6);
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(sx, sy, 1.2);
      }
    } else if (treatmentKey === 'pepper') {
      for (let i = 0; i < 8; i++) {
        const sx = (Math.random() - 0.5) * (hw * 2 - 10);
        const sy = stackTop + Math.random() * (stackBot - stackTop + 6);
        g.fillStyle(0x222222, 0.8);
        g.fillCircle(sx, sy, 1.2);
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
}
