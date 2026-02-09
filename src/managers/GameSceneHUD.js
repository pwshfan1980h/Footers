/**
 * GameSceneHUD - Score display, hotkey hints, speed indicators
 */
import { GAME_FONT, MAX_MISSES } from '../data/constants.js';
import { gameState } from '../data/GameState.js';

export class GameSceneHUD {
  constructor(scene) {
    this.scene = scene;
    this.displayedMoney = 0;
    this.moneyTween = null;
  }

  create() {
    const s = this.scene;

    const hudBg = s.add.graphics().setDepth(4);
    hudBg.fillStyle(s.HULL_DARK, 0.85);
    hudBg.fillRect(0, 0, 1024, 40);
    hudBg.fillStyle(s.NEON_PINK, 0.4);
    hudBg.fillRect(0, 38, 1024, 2);

    // Background panels behind HUD groups
    const panels = s.add.graphics().setDepth(4.5);
    panels.fillStyle(0xffffff, 0.06);
    panels.fillRoundedRect(6, 4, 175, 32, 5);
    panels.fillRoundedRect(190, 4, 200, 32, 5);
    panels.fillRoundedRect(400, 4, 140, 32, 5);
    panels.fillRoundedRect(690, 3, 86, 34, 5);

    // Star icon next to score
    const icons = s.add.graphics().setDepth(5);
    icons.fillStyle(0xffd700, 0.9);
    icons.fillTriangle(18, 13, 14, 19, 22, 19);
    icons.fillTriangle(18, 23, 14, 17, 22, 17);

    // Coin icon next to money
    icons.lineStyle(2, 0x44ff88, 0.9);
    icons.strokeCircle(412, 20, 6);
    icons.fillStyle(0x44ff88, 0.3);
    icons.fillCircle(412, 20, 6);

    s.scoreText = s.add.text(30, 10, `Score: ${s.currentScore}`, {
      fontSize: '16px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.highScoreText = s.add.text(198, 10, `High Score: ${s.highScore}`, {
      fontSize: '16px', color: '#00ddff', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.ordersText = s.add.text(780, 12, s.ordersDisplay(), {
      fontSize: '11px', color: '#aaddff', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.moneyText = s.add.text(424, 10, '$0.00', {
      fontSize: '16px', color: '#44ff88', fontFamily: GAME_FONT,
    }).setDepth(5);

    // Strike indicators drawn as graphics instead of text
    this.strikeGraphics = null;

    s.riskText = s.add.text(700, 26, '', {
      fontSize: '11px', color: '#ff4444', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setDepth(5).setAlpha(0);

    this.createHotkeyMemo();
    this.createHotkeyLegend();
    this.createEndShiftButton();
    this.createStockDisplay();
  }

  createEndShiftButton() {
    const s = this.scene;
    const btnX = 920;
    const btnY = 4;
    const btnW = 95;
    const btnH = 24;

    const btnG = s.add.graphics().setDepth(5);
    btnG.fillStyle(0x3a1a1a, 0.9);
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
    btnG.lineStyle(1.5, 0xff6666, 0.6);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);

    const btnText = s.add.text(btnX + btnW / 2, btnY + btnH / 2, 'END SHIFT', {
      fontSize: '13px', color: '#ff8888', fontFamily: GAME_FONT,
    }).setOrigin(0.5).setDepth(5);

    const btnHit = s.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(5);

    btnHit.on('pointerover', () => {
      btnG.clear();
      btnG.fillStyle(0x4a2a2a, 1);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnG.lineStyle(1.5, 0xff8888, 1);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnText.setColor('#ffaaaa');
    });
    btnHit.on('pointerout', () => {
      btnG.clear();
      btnG.fillStyle(0x3a1a1a, 0.9);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnG.lineStyle(1.5, 0xff6666, 0.6);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnText.setColor('#ff8888');
    });
    btnHit.on('pointerdown', () => s.endShift());
  }

  createStockDisplay() {
    const s = this.scene;
    this.stockTexts = {};
    const categories = [
      { key: 'bread', label: 'B', color: '#F5DEB3' },
      { key: 'meat', label: 'M', color: '#FFB6C1' },
      { key: 'cheese', label: 'C', color: '#FFD700' },
      { key: 'topping', label: 'T', color: '#32CD32' },
      { key: 'sauce', label: 'S', color: '#FFDB58' },
    ];

    const startX = 550;
    const y = 28;

    // Background
    const stockBg = s.add.graphics().setDepth(4.5);
    stockBg.fillStyle(0xffffff, 0.06);
    stockBg.fillRoundedRect(startX - 6, y - 4, categories.length * 30 + 8, 16, 3);

    categories.forEach((cat, i) => {
      const x = startX + i * 30;
      const label = s.add.text(x, y, cat.label, {
        fontSize: '10px', color: cat.color, fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setDepth(5);
      const countTxt = s.add.text(x + 10, y, '', {
        fontSize: '10px', color: '#aabbcc', fontFamily: GAME_FONT,
      }).setDepth(5);
      this.stockTexts[cat.key] = countTxt;
    });

    this.refreshStock();
  }

  refreshStock() {
    const categories = ['bread', 'meat', 'cheese', 'topping', 'sauce'];
    categories.forEach(cat => {
      const txt = this.stockTexts[cat];
      if (!txt) return;
      const count = gameState.getCategoryStock(cat);
      txt.setText(count.toString());
      if (count > 5) {
        txt.setColor('#44ff88');
      } else if (count >= 2) {
        txt.setColor('#ffaa44');
      } else {
        txt.setColor('#ff4444');
      }
    });

    // Update per-bin stock labels
    this.refreshBinLabels();
  }

  refreshBinLabels() {
    const s = this.scene;
    const updateItems = (items) => {
      if (!items) return;
      items.forEach(item => {
        if (!item.stockLabel || !item.key) return;
        const count = gameState.getIngredientCount(item.key);
        item.stockLabel.setText(count.toString());
        if (count > 3) {
          item.stockLabel.setColor('#44ff88');
        } else if (count >= 1) {
          item.stockLabel.setColor('#ffaa44');
        } else {
          item.stockLabel.setColor('#ff4444');
        }
      });
    };
    updateItems(s.meatPileItems);
    updateItems(s.loafItems);
    updateItems(s.cheeseStackItems);
    updateItems(s.veggieBowlItems);
    updateItems(s.sauceBottleItems);
  }

  createHotkeyMemo() {
    const s = this.scene;
    const memoX = 600;
    const memoY = 18;

    const memo = s.add.graphics().setDepth(5);
    memo.fillStyle(s.HULL_LIGHT, 0.95);
    memo.fillRoundedRect(memoX, memoY - 10, 66, 22, 4);
    memo.lineStyle(1, s.NEON_PINK, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 10, 66, 22, 4);

    s.add.text(memoX + 33, memoY + 1, 'F1=Help', {
      fontSize: '12px', color: '#00ddff', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);
  }

  createHotkeyLegend() {
    const s = this.scene;
    const panelX = 60;
    const panelY = 300;
    const panelW = 160;
    const panelH = 216;

    const legend = s.add.container(panelX, panelY).setDepth(100);

    const bg = s.add.graphics();
    bg.fillStyle(s.HULL_DARK, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 8);
    bg.lineStyle(2, s.NEON_PINK, 0.9);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 8);
    legend.add(bg);

    const title = s.add.text(panelW / 2, 12, 'CONTROLS', {
      fontSize: '14px', color: '#00ffcc', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    legend.add(title);

    const controls = [
      { key: 'ESC', desc: 'Cancel pickup' },
      { key: 'Z/X/C', desc: 'Breads' },
      { key: '1-4/Q', desc: 'Meats' },
      { key: '5-0', desc: 'Veggies' },
      { key: 'W/E', desc: 'Cheese' },
      { key: 'A/S', desc: 'Sauces' },
      { key: 'R/F', desc: 'Toast/ToGo' },
      { key: 'G/H', desc: 'Salt/Pepper' },
      { key: 'V', desc: 'Oil & Vinegar' },
    ];

    controls.forEach((ctrl, i) => {
      const y = 34 + i * 16;
      const keyTxt = s.add.text(8, y, ctrl.key, {
        fontSize: '13px', color: '#00ddff', fontFamily: GAME_FONT, fontStyle: 'bold',
      });
      const descTxt = s.add.text(55, y, ctrl.desc, {
        fontSize: '13px', color: '#aaddff', fontFamily: GAME_FONT,
      });
      legend.add(keyTxt);
      legend.add(descTxt);
    });

    legend.setVisible(false);
    s.hotkeyLegend = legend;
  }

  createHotkeyHint(x, y, key, depth = 22) {
    const s = this.scene;
    const container = s.add.container(x, y).setDepth(depth);

    const bg = s.add.graphics();
    const textWidth = key.length > 1 ? 28 : 22;
    bg.fillStyle(s.HULL_DARK, 0.9);
    bg.fillRoundedRect(-textWidth / 2 - 4, -10, textWidth + 8, 20, 6);
    bg.lineStyle(2, s.NEON_PINK, 1);
    bg.strokeRoundedRect(-textWidth / 2 - 4, -10, textWidth + 8, 20, 6);
    container.add(bg);

    const txt = s.add.text(0, 0, key, {
      fontSize: '14px', color: '#00ffff', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(txt);

    container.setVisible(false);
    s.hotkeyHints.push(container);
    return container;
  }

  animateMoney(target) {
    const s = this.scene;
    if (this.displayedMoney === target) {
      s.moneyText.setText(`$${target.toFixed(2)}`);
      return;
    }

    if (this.moneyTween) this.moneyTween.destroy();

    const from = this.displayedMoney;
    const dummy = { value: from };

    this.moneyTween = s.tweens.add({
      targets: dummy,
      value: target,
      duration: 350,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        s.moneyText.setText(`$${dummy.value.toFixed(2)}`);
        // Flash green on increase
        s.moneyText.setColor(dummy.value > from ? '#88ffaa' : '#44ff88');
      },
      onComplete: () => {
        s.moneyText.setText(`$${target.toFixed(2)}`);
        s.moneyText.setColor('#44ff88');
        this.displayedMoney = target;
        this.moneyTween = null;
      },
    });
  }

  showHotkeyHints(visible) {
    const s = this.scene;
    s.hotkeyHints.forEach(hint => {
      if (hint?.setVisible) hint.setVisible(visible);
    });
    s.labelHints.forEach(label => {
      if (label?.setVisible) label.setVisible(visible);
    });
    if (s.hotkeyLegend) s.hotkeyLegend.setVisible(visible);
  }

  refreshHUD() {
    const s = this.scene;
    s.scoreText.setText(`Score: ${s.currentScore}`);
    s.highScoreText.setText(`High Score: ${s.highScore}`);
    s.ordersText.setText(s.ordersDisplay());
    this.animateMoney(s.gameMoney);
    this.refreshStock();

    // Draw graphical strike indicators
    const missed = s.ordersMissed || 0;
    this.drawStrikeIndicators(missed);

    // Risk warning after first miss
    if (missed > 0 && missed < MAX_MISSES) {
      const penaltyAmount = s.gameMoney * 0.5;
      s.riskText.setText(`AT RISK: -$${penaltyAmount.toFixed(2)}`);
      s.riskText.setAlpha(1);
    } else {
      s.riskText.setAlpha(0);
    }
  }

  drawStrikeIndicators(missed) {
    const s = this.scene;
    if (this.strikeGraphics) {
      this.strikeGraphics.destroy();
    }
    this.strikeGraphics = s.add.graphics().setDepth(5);
    const g = this.strikeGraphics;
    const baseX = 705;
    const baseY = 16;
    const spacing = 22;

    for (let i = 0; i < MAX_MISSES; i++) {
      const cx = baseX + i * spacing;
      if (i < missed) {
        // Red X for missed
        g.lineStyle(3, 0xff4444, 1);
        g.lineBetween(cx - 6, baseY - 6, cx + 6, baseY + 6);
        g.lineBetween(cx + 6, baseY - 6, cx - 6, baseY + 6);
      } else {
        // Green open circle for remaining
        g.lineStyle(2, 0x44ff88, 0.8);
        g.strokeCircle(cx, baseY, 7);
        g.fillStyle(0x44ff88, 0.2);
        g.fillCircle(cx, baseY, 3);
      }
    }
  }
}
