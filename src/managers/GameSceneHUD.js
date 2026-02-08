/**
 * GameSceneHUD - Score display, hotkey hints, speed indicators
 */
import { GAME_FONT } from '../data/constants.js';

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
    hudBg.fillRect(0, 0, 1024, 50);
    hudBg.fillStyle(s.NEON_PINK, 0.4);
    hudBg.fillRect(0, 48, 1024, 2);

    s.scoreText = s.add.text(12, 15, `Score: ${s.currentScore}`, {
      fontSize: '18px', color: '#ffd700', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.highScoreText = s.add.text(200, 15, `High Score: ${s.highScore}`, {
      fontSize: '18px', color: '#00ddff', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.ordersText = s.add.text(780, 17, s.ordersDisplay(), {
      fontSize: '12px', color: '#aaddff', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.moneyText = s.add.text(480, 15, '$0.00', {
      fontSize: '18px', color: '#44ff88', fontFamily: GAME_FONT,
    }).setDepth(5);

    s.strikesText = s.add.text(700, 5, '', {
      fontSize: '14px', color: '#ff6666', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setDepth(5);

    s.riskText = s.add.text(700, 30, '', {
      fontSize: '13px', color: '#ff4444', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setDepth(5).setAlpha(0);

    this.createHotkeyMemo();
    this.createHotkeyLegend();
  }

  createHotkeyMemo() {
    const s = this.scene;
    const memoX = 600;
    const memoY = 22;

    const memo = s.add.graphics().setDepth(5);
    memo.fillStyle(s.HULL_LIGHT, 0.95);
    memo.fillRoundedRect(memoX, memoY - 12, 70, 24, 4);
    memo.lineStyle(1, s.NEON_PINK, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 12, 70, 24, 4);

    s.add.text(memoX + 35, memoY, 'F1=Help', {
      fontSize: '13px', color: '#00ddff', fontFamily: GAME_FONT, fontStyle: 'bold',
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
      { key: '1-4', desc: 'Meats' },
      { key: '5-7', desc: 'Veggies' },
      { key: '8-9', desc: 'Cheese' },
      { key: 'Q/E', desc: 'Sauces' },
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

    // Strike indicators: filled X for misses, empty circles for remaining
    const maxStrikes = 3;
    const missed = s.ordersMissed || 0;
    let strikesStr = '';
    for (let i = 0; i < maxStrikes; i++) {
      strikesStr += i < missed ? '\u2717' : '\u25CB';
    }
    s.strikesText.setText(strikesStr);

    // Risk warning after first miss
    if (missed > 0 && missed < maxStrikes) {
      const penaltyAmount = s.gameMoney * 0.5;
      s.riskText.setText(`AT RISK: -$${penaltyAmount.toFixed(2)}`);
      s.riskText.setAlpha(1);
    } else {
      s.riskText.setAlpha(0);
    }
  }
}
