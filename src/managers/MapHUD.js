import Phaser from 'phaser';
import { LOCATIONS } from '../data/locations.js';
import { GAME_FONT, MAX_STOCK_PER_INGREDIENT, RESTOCK_BUNDLE_SIZE, WORLD_W, WORLD_H } from '../data/constants.js';
import { INGREDIENTS, INGREDIENTS_BY_CATEGORY } from '../data/ingredients.js';
import { gameState } from '../data/GameState.js';
import { soundManager } from '../SoundManager.js';

export class MapHUD {
  constructor(scene) {
    this.scene = scene;
    this.popupContainer = null;
    this.infoPanelVisible = false;
    this.selectedLocation = null;
    this.openShopBtn = null;
    this.statusText = null;
    this.moneyText = null;
    this.helpOverlay = null;
    this.statsPanel = null;
    this.statsPanelVisible = false;
    this.probeStatusText = null;
  }

  create() {
    const scene = this.scene;

    // UI layer
    scene.uiContainer = scene.add.container(0, 0).setDepth(10);
    this.createUI();
    this.createHelpOverlay();
    this.createStatsPanel();
  }

  createUI() {
    const scene = this.scene;

    // Top bar
    const bar = scene.add.graphics();
    bar.fillStyle(0x0a0a15, 0.85);
    bar.fillRect(0, 0, 1024, 44);
    bar.fillStyle(scene.NEON_PINK, 0.3);
    bar.fillRect(0, 42, 1024, 2);
    // Stock strip background
    bar.fillStyle(0x0a0a15, 0.7);
    bar.fillRect(0, 44, 1024, 22);
    bar.fillStyle(0x334455, 0.15);
    bar.fillRect(0, 64, 1024, 1);
    scene.uiContainer.add(bar);

    // Money display
    this.moneyText = scene.add.text(12, 12, `$${gameState.totalMoney.toFixed(2)}`, {
      fontSize: '18px', color: '#44ff88', fontFamily: GAME_FONT,
    });
    scene.uiContainer.add(this.moneyText);

    // Shifts completed
    this.shiftsText = scene.add.text(200, 14, `Shifts: ${gameState.shiftsCompleted}`, {
      fontSize: '14px', color: '#aabbcc', fontFamily: GAME_FONT,
    });
    scene.uiContainer.add(this.shiftsText);

    // Stats button
    this.statsBtn = this.createButton(320, 8, 70, 28, 'STATS', 0x1a1a3a, 0x88aaff, () => {
      this.toggleStatsPanel();
    });
    scene.uiContainer.add(this.statsBtn.container);

    // Probe button
    this.probeBtn = this.createButton(400, 8, 110, 28, 'PROBE $5', 0x1a2a3a, 0x00ddff, () => {
      if (scene.tradeProbe) {
        scene.tradeProbe.launch();
      }
    });
    scene.uiContainer.add(this.probeBtn.container);

    // Probe status text
    this.probeStatusText = scene.add.text(520, 14, '', {
      fontSize: '11px', color: '#00ddff', fontFamily: GAME_FONT,
    });
    scene.uiContainer.add(this.probeStatusText);

    // Current status
    this.statusText = scene.add.text(750, 14, '', {
      fontSize: '14px', color: '#FFE8CC', fontFamily: GAME_FONT,
    }).setOrigin(0.5, 0);
    scene.uiContainer.add(this.statusText);
    this.updateStatusText();

    // Always-visible stock strip (below top bar)
    this.stockTexts = {};
    const stockCategories = [
      { key: 'bread', label: 'BRD', color: '#F5DEB3' },
      { key: 'meat', label: 'MEA', color: '#FFB6C1' },
      { key: 'cheese', label: 'CHS', color: '#FFD700' },
      { key: 'topping', label: 'TOP', color: '#32CD32' },
      { key: 'sauce', label: 'SAU', color: '#FFDB58' },
    ];
    const stripY = 48;
    const stripStartX = 12;
    const stripSpacing = 110;
    stockCategories.forEach((cat, i) => {
      const x = stripStartX + i * stripSpacing;
      const labelTxt = scene.add.text(x, stripY, cat.label, {
        fontSize: '11px', color: cat.color, fontFamily: GAME_FONT, fontStyle: 'bold',
      });
      scene.uiContainer.add(labelTxt);
      const countTxt = scene.add.text(x + 32, stripY, '', {
        fontSize: '11px', color: '#aabbcc', fontFamily: GAME_FONT,
      });
      scene.uiContainer.add(countTxt);
      this.stockTexts[cat.key] = countTxt;
    });
    this.refreshStockStrip();

    // Depot hint in stock strip
    this.depotHintText = scene.add.text(stripStartX + 5 * stripSpacing + 20, stripY, '', {
      fontSize: '10px', color: '#44ddaa', fontFamily: GAME_FONT,
    });
    scene.uiContainer.add(this.depotHintText);

    // F1=Help memo indicator
    const memoX = 910;
    const memoY = 22;
    const memo = scene.add.graphics();
    memo.fillStyle(0x5A3A28, 0.95);
    memo.fillRoundedRect(memoX, memoY - 12, 70, 24, 4);
    memo.lineStyle(1, scene.NEON_PINK, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 12, 70, 24, 4);
    scene.uiContainer.add(memo);
    const memoText = scene.add.text(memoX + 35, memoY, 'F1=Help', {
      fontSize: '13px', color: '#FF6B8A', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
    scene.uiContainer.add(memoText);

    // "Open Shop" button (only visible when docked)
    this.openShopBtn = this.createButton(910, 8, 100, 28, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, () => {
      if (scene.dockedAt) {
        soundManager.ding();
        scene.scene.start('Game', {
          location: scene.dockedAt,
          modifiers: scene.dockedAt.modifiers,
        });
      }
    });
    scene.uiContainer.add(this.openShopBtn.container);
    const dockedAtShop = scene.dockedAt && !(scene.dockedAt.isDepot || scene.dockedAt.type === 'depot');
    this.openShopBtn.container.setVisible(dockedAtShop);
  }

  createButton(x, y, w, h, label, bgColor, textColor, callback) {
    const scene = this.scene;
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(0, 0, w, h, 6);
    bg.lineStyle(2, textColor, 0.8);
    bg.strokeRoundedRect(0, 0, w, h, 6);
    container.add(bg);

    const text = scene.add.text(w / 2, h / 2, label, {
      fontSize: '12px', color: Phaser.Display.Color.IntegerToColor(textColor).rgba,
      fontFamily: GAME_FONT,
    }).setOrigin(0.5);
    container.add(text);

    const hit = scene.add.rectangle(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(hit);

    hit.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-2, -2, w + 4, h + 4, 6);
      bg.lineStyle(2, textColor, 1);
      bg.strokeRoundedRect(-2, -2, w + 4, h + 4, 6);
    });
    hit.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, textColor, 0.8);
      bg.strokeRoundedRect(0, 0, w, h, 6);
    });
    hit.on('pointerdown', callback);

    return { container, bg, text, hit };
  }

  updateStatusText() {
    const scene = this.scene;
    const travelState = scene.travel.travelState;

    if (travelState === 'warping') {
      this.statusText.setText('WARPING...');
      this.statusText.setColor('#ff88aa');
    } else if (travelState === 'departing') {
      this.statusText.setText('Departing...');
      this.statusText.setColor('#ffcc88');
    } else if (travelState === 'arriving') {
      const name = scene.travel.travelTarget ? LOCATIONS[scene.travel.travelTarget]?.name : '';
      this.statusText.setText(`Arriving at ${name}...`);
      this.statusText.setColor('#88ffaa');
    } else if (scene.dockedAt) {
      this.statusText.setText(`Docked: ${scene.dockedAt.name}`);
      this.statusText.setColor('#88ddff');
    } else if (travelState === 'moving') {
      this.statusText.setText('In transit...');
      this.statusText.setColor('#FFE8CC');
    } else {
      this.statusText.setText('Click a location or anywhere to navigate');
      this.statusText.setColor('#667788');
    }
  }

  createHelpOverlay() {
    const scene = this.scene;
    const panelW = 280;
    const panelH = 260;
    const panelX = 372;
    const panelY = 200;

    this.helpOverlay = scene.add.container(panelX, panelY).setDepth(100);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a15, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 10);
    bg.lineStyle(2, scene.NEON_PINK, 0.8);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 10);
    bg.lineStyle(1, scene.NEON_PINK, 0.2);
    bg.strokeRoundedRect(4, 4, panelW - 8, panelH - 8, 8);
    this.helpOverlay.add(bg);

    const title = scene.add.text(panelW / 2, 16, 'SYSTEM MAP', {
      fontSize: '18px', color: '#FF6B8A', fontFamily: GAME_FONT,
    }).setOrigin(0.5, 0);
    this.helpOverlay.add(title);

    const divider = scene.add.graphics();
    divider.lineStyle(1, scene.NEON_PINK, 0.3);
    divider.lineBetween(16, 40, panelW - 16, 40);
    this.helpOverlay.add(divider);

    const controls = [
      { key: 'Click map', desc: 'Move truckship' },
      { key: 'Click location', desc: 'View info panel' },
      { key: 'Set Course', desc: 'Warp to location' },
      { key: 'Open Shop', desc: 'Start serving orders' },
      { key: 'ESC', desc: 'Close info panel' },
      { key: 'F1 (hold)', desc: 'Show this help' },
    ];

    const ctrlTitle = scene.add.text(16, 50, 'CONTROLS', {
      fontSize: '13px', color: '#FF6B8A', fontFamily: GAME_FONT, fontStyle: 'bold',
    });
    this.helpOverlay.add(ctrlTitle);

    controls.forEach((ctrl, i) => {
      const y = 68 + i * 17;
      const keyTxt = scene.add.text(16, y, ctrl.key, {
        fontSize: '13px', color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
      });
      const descTxt = scene.add.text(120, y, ctrl.desc, {
        fontSize: '13px', color: '#8899aa', fontFamily: GAME_FONT,
      });
      this.helpOverlay.add(keyTxt);
      this.helpOverlay.add(descTxt);
    });

    const tipsY = 178;
    const tipDivider = scene.add.graphics();
    tipDivider.lineStyle(1, scene.NEON_PINK, 0.3);
    tipDivider.lineBetween(16, tipsY - 6, panelW - 16, tipsY - 6);
    this.helpOverlay.add(tipDivider);

    const tipTitle = scene.add.text(16, tipsY, 'TIPS', {
      fontSize: '13px', color: '#FF6B8A', fontFamily: GAME_FONT, fontStyle: 'bold',
    });
    this.helpOverlay.add(tipTitle);

    const tips = [
      'Each location has different difficulty.',
      'Big tips at slow locations, fast cash at busy ones.',
      'End your shift anytime to keep earnings.',
    ];

    tips.forEach((tip, i) => {
      const t = scene.add.text(16, tipsY + 18 + i * 16, tip, {
        fontSize: '10px', color: '#667788', fontFamily: GAME_FONT,
      });
      this.helpOverlay.add(t);
    });

    this.helpOverlay.setVisible(false);
    scene.uiContainer.add(this.helpOverlay);
  }

  createStatsPanel() {
    const scene = this.scene;
    const panelW = 280;
    const panelH = 240;
    const panelX = 372;
    const panelY = 60;

    this.statsPanel = scene.add.container(panelX, panelY).setDepth(100);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a18, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 10);
    bg.lineStyle(2, 0x88aaff, 0.8);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 10);
    this.statsPanel.add(bg);

    const title = scene.add.text(panelW / 2, 14, 'CAREER STATS', {
      fontSize: '18px', color: '#88aaff', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.statsPanel.add(title);

    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x88aaff, 0.3);
    divider.lineBetween(16, 38, panelW - 16, 38);
    this.statsPanel.add(divider);

    this.statsLines = [];
    const statDefs = [
      { label: 'Shifts Completed', key: 'shifts' },
      { label: 'Sandwiches Made', key: 'totalSandwiches' },
      { label: 'Orders Missed', key: 'totalOrdersMissed' },
      { label: 'Total Earnings', key: 'totalMoney' },
      { label: 'Best Shift', key: 'bestShiftEarnings' },
      { label: 'Fastest Order', key: 'fastestOrder' },
      { label: 'Locations Visited', key: 'locationsVisited' },
    ];

    statDefs.forEach((def, i) => {
      const y = 48 + i * 24;
      const labelTxt = scene.add.text(16, y, def.label, {
        fontSize: '13px', color: '#8899aa', fontFamily: GAME_FONT,
      });
      const valueTxt = scene.add.text(panelW - 16, y, '', {
        fontSize: '13px', color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(1, 0);
      this.statsPanel.add(labelTxt);
      this.statsPanel.add(valueTxt);
      this.statsLines.push({ key: def.key, text: valueTxt });
    });

    this.statsPanel.setVisible(false);
    scene.uiContainer.add(this.statsPanel);
  }

  toggleStatsPanel() {
    this.statsPanelVisible = !this.statsPanelVisible;
    if (this.statsPanelVisible) {
      this.refreshStats();
    }
    this.statsPanel.setVisible(this.statsPanelVisible);
  }

  refreshStockStrip() {
    const categories = ['bread', 'meat', 'cheese', 'topping', 'sauce'];
    let anyLow = false;
    categories.forEach(cat => {
      const count = gameState.getCategoryStock(cat);
      const txt = this.stockTexts[cat];
      if (!txt) return;
      txt.setText(count.toString());
      if (count > 5) {
        txt.setColor('#44ff88');
      } else if (count >= 2) {
        txt.setColor('#ffaa44');
        anyLow = true;
      } else {
        txt.setColor('#ff4444');
        anyLow = true;
      }
    });

    // Show depot hint when low on stock
    if (this.depotHintText) {
      if (anyLow) {
        this.depotHintText.setText('Dock at Produce Titan to restock');
      } else {
        this.depotHintText.setText('');
      }
    }
  }

  refreshStats() {
    const s = gameState.stats;
    this.statsLines.forEach(line => {
      switch (line.key) {
        case 'shifts':
          line.text.setText(gameState.shiftsCompleted.toString());
          break;
        case 'totalSandwiches':
          line.text.setText(s.totalSandwiches.toString());
          break;
        case 'totalOrdersMissed':
          line.text.setText(s.totalOrdersMissed.toString());
          break;
        case 'totalMoney':
          line.text.setText(`$${gameState.totalMoney.toFixed(2)}`);
          break;
        case 'bestShiftEarnings':
          line.text.setText(`$${s.bestShiftEarnings.toFixed(2)}`);
          break;
        case 'fastestOrder':
          line.text.setText(s.fastestOrder != null ? `${s.fastestOrder.toFixed(1)}s` : '--');
          break;
        case 'locationsVisited':
          line.text.setText(`${gameState.locationsVisited.size} / 8`);
          break;
      }
    });
  }

  showHelp(visible) {
    if (this.helpOverlay) {
      this.helpOverlay.setVisible(visible);
    }
  }

  showInfoPanel(loc) {
    const scene = this.scene;

    this.hideInfoPanel();

    this.selectedLocation = loc;
    this.infoPanelVisible = true;

    const zoom = scene.cameras.main.zoom || 0.4;
    const s = 1 / zoom;
    const pad = 16 * s;
    const isDepotLoc = loc.isDepot || loc.type === 'depot';
    const isDockedHere = scene.dockedAt && scene.dockedAt.id === loc.id;
    const panelW = (isDockedHere && isDepotLoc ? 420 : 380) * s;
    const contentW = panelW - pad * 2;

    // Build content top-down, tracking cursor y
    const popup = scene.add.container(0, 0).setDepth(50);
    const bg = scene.add.graphics();
    popup.add(bg);

    let cy = pad;

    // Location name
    const nameText = scene.add.text(pad, cy, loc.name, {
      fontSize: `${22 * s}px`, color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
    });
    popup.add(nameText);
    cy += nameText.height + 6 * s;

    // Modifier hints line
    const isDocked = scene.dockedAt && scene.dockedAt.id === loc.id;
    const isDepot = loc.isDepot || loc.type === 'depot';
    const m = loc.modifiers;
    const hints = [];
    if (isDepot) {
      hints.push('Supply Depot');
    } else {
      if (m.speedMult > 1.1) hints.push('Impatient crowd');
      else if (m.speedMult < 0.9) hints.push('Patient crowd');
      if (m.spawnMult > 1.1) hints.push('Many orders');
      else if (m.spawnMult < 0.9) hints.push('Few orders');
      if (m.tipMult > 1.3) hints.push('Big tips!');
      else if (m.tipMult < 0.9) hints.push('Low tips');
    }
    const modText = scene.add.text(pad, cy, hints.join(' · ') || 'Standard crowd', {
      fontSize: `${12 * s}px`, color: '#aabbcc', fontFamily: GAME_FONT,
      wordWrap: { width: contentW },
    });
    popup.add(modText);
    cy += modText.height + 8 * s;

    // Divider
    const divider = scene.add.graphics();
    divider.lineStyle(1 * s, 0x334455, 0.5);
    divider.lineBetween(pad, cy, panelW - pad, cy);
    popup.add(divider);
    cy += 8 * s;

    // Description
    const descText = scene.add.text(pad, cy, loc.description || '', {
      fontSize: `${13 * s}px`, color: '#99aabb', fontFamily: GAME_FONT,
      wordWrap: { width: contentW },
    });
    popup.add(descText);
    cy += descText.height + 8 * s;

    // Flavor lore
    if (loc.flavor) {
      const flavorText = scene.add.text(pad, cy, `"${loc.flavor}"`, {
        fontSize: `${11 * s}px`, color: '#667788', fontFamily: GAME_FONT,
        fontStyle: 'italic',
        wordWrap: { width: contentW },
        lineSpacing: 2 * s,
      });
      popup.add(flavorText);
      cy += flavorText.height + 10 * s;
    }

    // Depot: per-ingredient stock list + buy buttons
    const btnW = 140 * s;
    const btnH = 34 * s;

    if (isDocked && isDepot) {
      const divider2 = scene.add.graphics();
      divider2.lineStyle(1 * s, 0x44ddaa, 0.3);
      divider2.lineBetween(pad, cy, panelW - pad, cy);
      popup.add(divider2);
      cy += 8 * s;

      const cargoTitle = scene.add.text(pad, cy, 'CARGO HOLD', {
        fontSize: `${14 * s}px`, color: '#44ddaa', fontFamily: GAME_FONT, fontStyle: 'bold',
      });
      popup.add(cargoTitle);
      cy += cargoTitle.height + 8 * s;

      const categoryOrder = [
        { key: 'bread', label: 'BREAD' },
        { key: 'meat', label: 'MEAT' },
        { key: 'cheese', label: 'CHEESE' },
        { key: 'topping', label: 'TOPPINGS' },
        { key: 'sauce', label: 'SAUCE' },
      ];

      categoryOrder.forEach(cat => {
        const catTitle = scene.add.text(pad, cy, cat.label, {
          fontSize: `${11 * s}px`, color: '#667788', fontFamily: GAME_FONT, fontStyle: 'bold',
        });
        popup.add(catTitle);
        cy += catTitle.height + 4 * s;

        const keys = INGREDIENTS_BY_CATEGORY[cat.key] || [];
        keys.forEach(ingKey => {
          const ing = INGREDIENTS[ingKey];
          const count = gameState.getIngredientCount(ingKey);
          const countColor = count >= 10 ? '#44ff88' : count >= 3 ? '#ffaa44' : '#ff4444';
          const isFull = count >= MAX_STOCK_PER_INGREDIENT;

          // Ingredient name
          const nameText = scene.add.text(pad + 8 * s, cy, ing.name, {
            fontSize: `${12 * s}px`, color: '#ccddee', fontFamily: GAME_FONT,
          });
          popup.add(nameText);

          // Count / max
          const countText = scene.add.text(pad + 110 * s, cy, `${count}/${MAX_STOCK_PER_INGREDIENT}`, {
            fontSize: `${12 * s}px`, color: countColor, fontFamily: GAME_FONT, fontStyle: 'bold',
          });
          popup.add(countText);

          // Buy button
          const buyCost = Math.min(RESTOCK_BUNDLE_SIZE, MAX_STOCK_PER_INGREDIENT - count) * ing.wholesalePrice;
          const canBuy = !isFull && gameState.totalMoney >= buyCost && buyCost > 0;
          const buyLabel = isFull ? 'FULL' : `+${RESTOCK_BUNDLE_SIZE} $${buyCost.toFixed(2)}`;
          const buyBtnW = 90 * s;
          const buyBtnH = 18 * s;
          const buyBtnX = panelW - pad - buyBtnW;

          const buyBg = scene.add.graphics();
          const buyBgColor = isFull ? 0x1a1a1a : canBuy ? 0x1a3a2a : 0x2a1a1a;
          const buyTextColor = isFull ? 0x667788 : canBuy ? 0x44ff88 : 0x664444;
          buyBg.fillStyle(buyBgColor, 1);
          buyBg.fillRoundedRect(buyBtnX, cy - 1 * s, buyBtnW, buyBtnH, 3 * s);
          buyBg.lineStyle(1 * s, buyTextColor, 0.6);
          buyBg.strokeRoundedRect(buyBtnX, cy - 1 * s, buyBtnW, buyBtnH, 3 * s);
          popup.add(buyBg);

          const buyText = scene.add.text(buyBtnX + buyBtnW / 2, cy + buyBtnH / 2 - 1 * s, buyLabel, {
            fontSize: `${10 * s}px`,
            color: Phaser.Display.Color.IntegerToColor(buyTextColor).rgba,
            fontFamily: GAME_FONT, fontStyle: 'bold',
          }).setOrigin(0.5);
          popup.add(buyText);

          if (canBuy) {
            const hitArea = scene.add.rectangle(buyBtnX + buyBtnW / 2, cy + buyBtnH / 2 - 1 * s, buyBtnW, buyBtnH)
              .setInteractive({ useHandCursor: true }).setAlpha(0.001);
            popup.add(hitArea);
            hitArea.on('pointerdown', () => {
              const result = gameState.buyIngredient(ingKey, RESTOCK_BUNDLE_SIZE);
              if (result) {
                soundManager.chaChing();
                this.hideInfoPanel();
                this.showInfoPanel(loc);
              } else {
                soundManager.buzz();
              }
            });
          }

          cy += buyBtnH + 4 * s;
        });
        cy += 4 * s;
      });

      // Restock All button
      const restockCost = gameState.getRestockAllCost();
      const full = gameState.isFullyStocked();
      const canAffordAll = gameState.totalMoney >= restockCost && restockCost > 0;
      const restockLabel = full ? 'FULLY STOCKED' : `RESTOCK ALL $${restockCost.toFixed(2)}`;
      const restockColor = full ? 0x667788 : canAffordAll ? 0x44ff88 : 0x664444;
      const restockBgColor = full ? 0x1a1a1a : canAffordAll ? 0x1a3a2a : 0x2a1a1a;

      this._addPopupButton(popup, pad, cy, btnW + 30 * s, btnH, restockLabel, restockBgColor, restockColor, s, () => {
        if (full || !canAffordAll) {
          soundManager.buzz();
          return;
        }
        if (gameState.restockAll()) {
          soundManager.chaChing();
          this.hideInfoPanel();
          this.showInfoPanel(loc);
        }
      });
      this._addPopupButton(popup, pad + btnW + 50 * s, cy, 80 * s, btnH, 'CLOSE', 0x2a1a1a, 0xff6666, s, () => {
        this.hideInfoPanel();
      });
      cy += btnH + pad;
    } else if (isDocked) {
      this._addPopupButton(popup, pad, cy, btnW, btnH, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, s, () => {
        soundManager.ding();
        scene.scene.start('Game', {
          location: scene.dockedAt,
          modifiers: scene.dockedAt.modifiers,
        });
      });
      this._addPopupButton(popup, pad + btnW + 10 * s, cy, 80 * s, btnH, 'CLOSE', 0x2a1a1a, 0xff6666, s, () => {
        this.hideInfoPanel();
      });
      cy += btnH + pad;
    } else {
      this._addPopupButton(popup, pad, cy, btnW, btnH, 'SET COURSE', 0x1a2a3a, 0x44aaff, s, () => {
        scene.travel.startTravelTo(loc.id);
        this.hideInfoPanel();
      });
      this._addPopupButton(popup, pad + btnW + 10 * s, cy, 80 * s, btnH, 'CLOSE', 0x2a1a1a, 0xff6666, s, () => {
        this.hideInfoPanel();
      });
      cy += btnH + pad;
    }

    // Now draw background to fit content
    const panelH = cy;
    const borderColor = isDepot ? 0x44ddaa : scene.NEON_PINK;
    bg.fillStyle(0x0a0a1a, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 10 * s);
    bg.lineStyle(2 * s, borderColor, 0.7);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 10 * s);

    // Position popup relative to location, clamped to world bounds
    const margin = 20 * s;

    // X: try right of location, fall back to left if it would exceed world
    let popupX = loc.x + 80 * s;
    if (popupX + panelW > WORLD_W - margin) {
      popupX = loc.x - panelW - 40 * s;
    }
    if (popupX < margin) {
      popupX = margin;
    }

    // Y: vertically near location, clamped to world bounds
    let popupY = loc.y - panelH * 0.3;
    if (popupY < margin) {
      popupY = margin;
    }
    if (popupY + panelH > WORLD_H - margin) {
      popupY = WORLD_H - panelH - margin;
    }

    popup.setPosition(popupX, popupY);

    this.popupContainer = popup;
  }

  _addPopupButton(popup, x, y, w, h, label, bgColor, textColor, s, callback) {
    const scene = this.scene;

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(bgColor, 1);
    btnBg.fillRoundedRect(x, y, w, h, 6 * s);
    btnBg.lineStyle(2 * s, textColor, 0.8);
    btnBg.strokeRoundedRect(x, y, w, h, 6 * s);
    popup.add(btnBg);

    const btnText = scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: `${12 * s}px`, color: '#ffffff', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
    popup.add(btnText);

    const hitArea = scene.add.rectangle(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);
    popup.add(hitArea);

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(bgColor, 1);
      btnBg.fillRoundedRect(x - 2 * s, y - 2 * s, w + 4 * s, h + 4 * s, 6 * s);
      btnBg.lineStyle(2 * s, textColor, 1);
      btnBg.strokeRoundedRect(x - 2 * s, y - 2 * s, w + 4 * s, h + 4 * s, 6 * s);
    });
    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(bgColor, 1);
      btnBg.fillRoundedRect(x, y, w, h, 6 * s);
      btnBg.lineStyle(2 * s, textColor, 0.8);
      btnBg.strokeRoundedRect(x, y, w, h, 6 * s);
    });
    hitArea.on('pointerdown', callback);
  }

  hideInfoPanel() {
    if (this.popupContainer) {
      this.popupContainer.destroy(true);
      this.popupContainer = null;
    }
    this.infoPanelVisible = false;
    this.selectedLocation = null;
  }

  selectLocation(loc) {
    if (this.statusText) {
      this.statusText.setText(`Selected: ${loc.name}`);
      this.statusText.setColor('#ff88cc');
    }
    this.showInfoPanel(loc);
  }

  showEarningsNotification(amount) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const centerWorldX = cam.scrollX + 512 / cam.zoom;
    const centerWorldY = cam.scrollY + 120 / cam.zoom;
    const text = scene.add.text(centerWorldX, centerWorldY, `+$${amount.toFixed(2)} earned!`, {
      fontSize: '44px', color: '#44ff88', fontFamily: GAME_FONT,
    }).setOrigin(0.5).setDepth(20);

    scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  updateProbeStatus(text) {
    if (this.probeStatusText) {
      this.probeStatusText.setText(text);
    }
  }

  update(cam) {
    const uiScale = 1 / cam.zoom;
    this.scene.uiContainer.setPosition(cam.scrollX, cam.scrollY);
    this.scene.uiContainer.setScale(uiScale);
    this.moneyText.setText(`$${gameState.totalMoney.toFixed(2)}`);

    // Always refresh stock strip
    this.refreshStockStrip();
  }
}
