/**
 * GameSceneBins - Ingredient bins, treatments, sauces, veggie bowls, cheese, loaves
 */
import { INGREDIENTS, BIN_LAYOUT, TREATMENTS } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';
import { darkenColor } from '../utils/colorUtils.js';

export class GameSceneBins {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    this.createBins();
    this.createTreatments();
    this.createVeggieBowls();
    this.createCheeseStacks();
    this.createLoaves();
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

    const baseX = 95;
    const baseY = 480;
    const spacingX = 100;
    const spacingY = 70;
    const day = s.day ?? 99;

    const hints = { 'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4', 'meat_prosciutto': 'Q' };

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
      const pile = s.add.image(x, y, pileKey).setDepth(20).setScale(0.9);

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

      const label = s.add.text(x, y + 44, ing.name, {
        fontSize: '13px', color: isLocked ? '#666' : '#ddd', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(21);

      if (hints[key] && !isLocked) {
        s.createHotkeyHint(x + 34, y - 24, hints[key]);
      }

      s.meatPileItems.push({ img: pile, label, key, isLocked });
    });
  }

  createMeatPileLogic(key, x, y, visual) {
    const s = this.scene;
    soundManager.init();
    soundManager.robotPickup();
    const pointer = s.input.activePointer;
    const heldVisual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = {
      visual: heldVisual,
      ingredientKey: key,
      binX: x, binY: y
    };
    const ing = INGREDIENTS[key];
    s.particleManager.ingredientPickup(x, y, ing.color);
  }

  createLoaves() {
    const s = this.scene;
    const baseX = 820;
    const baseY = 490;
    const spacingY = 70;

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
      loaf.setInteractive({ useHandCursor: true });
      loaf.on('pointerover', () => loaf.setTint(0xdddddd));
      loaf.on('pointerout', () => loaf.clearTint());
      loaf.on('pointerdown', (pointer) => {
        if (s.isPaused || s.heldItem) return;
        this.clickLoaf(b.key, pointer);
      });

      s.add.text(x, y + 38, b.label, {
        fontSize: '14px', color: '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      const breadHints = { 'bread_white': 'Z', 'bread_wheat': 'X', 'bread_sourdough': 'C' };
      s.createHotkeyHint(x + 34, y - 24, breadHints[b.key]);
    });
  }

  clickLoaf(key, pointer) {
    const s = this.scene;
    soundManager.robotPickup();
    const visual = s.createHeldVisual(key, pointer.x, pointer.y);
    s.heldItem = {
      visual,
      ingredientKey: key,
      binX: 0,
      binY: 0,
    };
    const ing = INGREDIENTS[key];
    s.particleManager.ingredientPickup(pointer.x, pointer.y, ing.color);
  }

  createTreatments() {
    const s = this.scene;
    const shelfY = 695;
    const startX = 120;
    const spacing = 85;

    const treatKeys = ['toasted', 'togo', 'salt', 'pepper', 'oil_vinegar'];
    treatKeys.forEach((key, i) => {
      this.createTreatmentItem(key, startX + i * spacing, shelfY);
    });

    this.createSauceBottle('sauce_mayo', startX + 5 * spacing + 15, shelfY);
    this.createSauceBottle('sauce_mustard', startX + 6 * spacing + 15, shelfY);
  }

  createCheeseStacks() {
    const s = this.scene;
    const baseX = 620;
    const baseY = 500;
    const spacingY = 85;

    const cheeses = [
      { key: 'cheese_american', label: 'American' },
      { key: 'cheese_swiss', label: 'Swiss' }
    ];

    cheeses.forEach((c, i) => {
      const pos = this.getIsoPosition(0, i, baseX, baseY, 0, spacingY);
      const x = pos.x;
      const y = pos.y;

      const stack = s.add.image(x, y, `cheese_stack_${c.key.split('_')[1]}`).setDepth(20);
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
        fontSize: '18px', color: '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      const hints = { 'cheese_american': 'W', 'cheese_swiss': 'E' };
      if (hints[c.key]) {
        s.createHotkeyHint(x + 42, y - 26, hints[c.key]);
      }
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

    const row1Y = 510;
    const row1StartX = 340;
    const spacingX = 75;
    const row2Y = 575;
    const row2StartX = 340;

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

      const vegImg = s.add.image(v.x, v.y, v.asset).setDepth(20).setScale(0.55);

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

      const label = s.add.text(v.x, v.y + 32, v.label, {
        fontSize: '14px', color: isLocked ? '#666' : '#ddd', fontStyle: 'bold', fontFamily: GAME_FONT
      }).setOrigin(0.5).setDepth(21);

      if (!isLocked) {
        s.createHotkeyHint(v.x + 28, v.y - 20, v.hotkey);
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
    const ingredient = INGREDIENTS[key];
    const radius = 22;

    const container = s.add.container(x, y).setDepth(30);

    const bottleKey = key + '_bottle';
    const bottleImg = s.add.image(0, 0, bottleKey).setScale(0.25);
    container.add(bottleImg);

    const label = s.add.text(0, -radius - 12, ingredient.name, {
      fontSize: '12px', color: '#ccc', fontStyle: 'bold', fontFamily: GAME_FONT
    }).setOrigin(0.5);
    container.add(label);

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

    const sauceHints = { 'sauce_mayo': 'A', 'sauce_mustard': 'S' };
    if (sauceHints[key]) {
      s.createHotkeyHint(x + radius + 4, y - radius - 4, sauceHints[key], 31);
    }
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

    const labelY = (tKey === 'togo') ? 38 : (tKey === 'toasted') ? 36 : 34;
    const label = s.add.text(0, labelY, treat.name, {
      fontSize: '12px', color: treat.label, fontFamily: GAME_FONT, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    c.add(label);

    const treatHints = { 'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V' };
    const hintOffsets = {
      'toasted': { x: 32, y: -12 },
      'togo': { x: 28, y: -30 },
      'salt': { x: 12, y: -18 },
      'pepper': { x: 12, y: -18 },
      'oil_vinegar': { x: 26, y: -20 },
    };
    if (treatHints[tKey]) {
      const off = hintOffsets[tKey] || { x: 30, y: -30 };
      s.createHotkeyHint(x + off.x, y + off.y, treatHints[tKey], 32);
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
      g.fillStyle(0x4488FF, 0.8);
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
          const ing = INGREDIENTS[bread.key];
          const toastedColor = ing.toastedColor || 0xC4943D;
          const toastedBorder = ing.toastedBorder || 0x8B6914;

          bread.graphics.clear();
          bread.graphics.fillStyle(toastedColor, 1);
          bread.graphics.lineStyle(1.5, toastedBorder, 0.8);

          if (bread.isBottom) {
            bread.graphics.fillRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 4, bread.w, 10, 3);
            bread.graphics.strokeRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 4, bread.w, 10, 3);
            bread.graphics.lineStyle(2, 0x6B4010, 0.5);
            for (let i = 0; i < 3; i++) {
              const markX = bread.rX - bread.hw + 8 + i * (bread.w - 16) / 2;
              bread.graphics.lineBetween(markX, bread.ly + bread.rY - 3, markX + 4, bread.ly + bread.rY + 4);
            }
          } else {
            bread.graphics.fillRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 3, bread.w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
            bread.graphics.strokeRoundedRect(bread.rX - bread.hw, bread.ly + bread.rY - 3, bread.w, 8, { tl: 8, tr: 8, bl: 2, br: 2 });
            bread.graphics.lineStyle(2, 0x6B4010, 0.5);
            for (let i = 0; i < 3; i++) {
              const markX = bread.rX - bread.hw + 10 + i * (bread.w - 20) / 2;
              bread.graphics.lineBetween(markX, bread.ly + bread.rY - 2, markX + 3, bread.ly + bread.rY + 3);
            }
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
