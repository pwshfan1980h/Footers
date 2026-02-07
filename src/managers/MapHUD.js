import Phaser from 'phaser';
import { LOCATIONS } from '../data/locations.js';
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
  }

  create() {
    const scene = this.scene;

    // UI layer
    scene.uiContainer = scene.add.container(0, 0).setDepth(10);
    this.createUI();
    this.createHelpOverlay();
  }

  createUI() {
    const scene = this.scene;

    // Top bar
    const bar = scene.add.graphics();
    bar.fillStyle(0x0a0a15, 0.85);
    bar.fillRect(0, 0, 1024, 44);
    bar.fillStyle(scene.NEON_PINK, 0.3);
    bar.fillRect(0, 42, 1024, 2);
    scene.uiContainer.add(bar);

    // Money display
    this.moneyText = scene.add.text(12, 12, `$${gameState.totalMoney.toFixed(2)}`, {
      fontSize: '18px', color: '#44ff88', fontFamily: 'Bungee, Arial',
    });
    scene.uiContainer.add(this.moneyText);

    // Shifts completed
    this.shiftsText = scene.add.text(200, 14, `Shifts: ${gameState.shiftsCompleted}`, {
      fontSize: '14px', color: '#aabbcc', fontFamily: 'Arial',
    });
    scene.uiContainer.add(this.shiftsText);

    // Current status
    this.statusText = scene.add.text(512, 14, '', {
      fontSize: '14px', color: '#FFE8CC', fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    scene.uiContainer.add(this.statusText);
    this.updateStatusText();

    // F1=Help memo indicator
    const memoX = 750;
    const memoY = 22;
    const memo = scene.add.graphics();
    memo.fillStyle(0x5A3A28, 0.95);
    memo.fillRoundedRect(memoX, memoY - 12, 70, 24, 4);
    memo.lineStyle(1, scene.NEON_PINK, 0.8);
    memo.strokeRoundedRect(memoX, memoY - 12, 70, 24, 4);
    scene.uiContainer.add(memo);
    const memoText = scene.add.text(memoX + 35, memoY, 'F1=Help', {
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    scene.uiContainer.add(memoText);

    // "Open Shop" button (only visible when docked)
    this.openShopBtn = this.createButton(880, 12, 120, 28, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, () => {
      if (scene.dockedAt) {
        soundManager.ding();
        scene.scene.start('Game', {
          location: scene.dockedAt,
          modifiers: scene.dockedAt.modifiers,
        });
      }
    });
    scene.uiContainer.add(this.openShopBtn.container);
    this.openShopBtn.container.setVisible(!!scene.dockedAt);
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
      fontFamily: 'Bungee, Arial',
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
      fontSize: '16px', color: '#FF6B8A', fontFamily: 'Bungee, Arial',
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
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    });
    this.helpOverlay.add(ctrlTitle);

    controls.forEach((ctrl, i) => {
      const y = 68 + i * 17;
      const keyTxt = scene.add.text(16, y, ctrl.key, {
        fontSize: '11px', color: '#FFE8CC', fontFamily: 'Arial', fontStyle: 'bold',
      });
      const descTxt = scene.add.text(120, y, ctrl.desc, {
        fontSize: '11px', color: '#8899aa', fontFamily: 'Arial',
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
      fontSize: '11px', color: '#FF6B8A', fontFamily: 'Arial', fontStyle: 'bold',
    });
    this.helpOverlay.add(tipTitle);

    const tips = [
      'Each location has different difficulty.',
      'Big tips at slow locations, fast cash at busy ones.',
      'End your shift anytime to keep earnings.',
    ];

    tips.forEach((tip, i) => {
      const t = scene.add.text(16, tipsY + 18 + i * 16, tip, {
        fontSize: '10px', color: '#667788', fontFamily: 'Arial', fontStyle: 'italic',
      });
      this.helpOverlay.add(t);
    });

    this.helpOverlay.setVisible(false);
    scene.uiContainer.add(this.helpOverlay);
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

    const popupX = loc.x > 2000 ? loc.x - 200 * s : loc.x + 80 * s;
    const popupY = loc.y - 40 * s;

    const popup = scene.add.container(popupX, popupY).setDepth(50);

    const panelW = 300 * s;
    const panelH = 180 * s;
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 10 * s);
    bg.lineStyle(2 * s, scene.NEON_PINK, 0.7);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 10 * s);
    popup.add(bg);

    const nameText = scene.add.text(14 * s, 10 * s, loc.name, {
      fontSize: `${18 * s}px`, color: '#FFE8CC', fontFamily: 'Bungee, Arial',
    });
    popup.add(nameText);

    const descText = scene.add.text(14 * s, 36 * s, loc.description || '', {
      fontSize: `${11 * s}px`, color: '#8899aa', fontFamily: 'Arial',
      wordWrap: { width: 270 * s },
    });
    popup.add(descText);

    const m = loc.modifiers;
    const hints = [];
    if (m.speedMult > 1.1) hints.push('Fast belt');
    else if (m.speedMult < 0.9) hints.push('Slow belt');
    if (m.spawnMult > 1.1) hints.push('Many orders');
    else if (m.spawnMult < 0.9) hints.push('Few orders');
    if (m.tipMult > 1.3) hints.push('Big tips!');
    else if (m.tipMult < 0.9) hints.push('Low tips');
    const modText = scene.add.text(14 * s, 80 * s, hints.join(' · ') || 'Standard difficulty', {
      fontSize: `${10 * s}px`, color: '#aabbcc', fontFamily: 'Arial',
    });
    popup.add(modText);

    const isDocked = scene.dockedAt && scene.dockedAt.id === loc.id;
    const btnY = 120 * s;
    const btnW = 130 * s;
    const btnH = 32 * s;

    if (isDocked) {
      this._addPopupButton(popup, 14 * s, btnY, btnW, btnH, 'OPEN SHOP', 0x1a3a2a, 0x44ff88, s, () => {
        soundManager.ding();
        scene.scene.start('Game', {
          location: scene.dockedAt,
          modifiers: scene.dockedAt.modifiers,
        });
      });
    } else {
      this._addPopupButton(popup, 14 * s, btnY, btnW, btnH, 'SET COURSE', 0x1a2a3a, 0x44aaff, s, () => {
        scene.travel.startTravelTo(loc.id);
        this.hideInfoPanel();
      });
    }

    this._addPopupButton(popup, 160 * s, btnY, 80 * s, btnH, 'CLOSE', 0x2a1a1a, 0xff6666, s, () => {
      this.hideInfoPanel();
    });

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
      fontSize: `${12 * s}px`, color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
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
      fontSize: '44px', color: '#44ff88', fontFamily: 'Bungee, Arial',
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

  update(cam) {
    const uiScale = 1 / cam.zoom;
    this.scene.uiContainer.setPosition(cam.scrollX, cam.scrollY);
    this.scene.uiContainer.setScale(uiScale);
    this.moneyText.setText(`$${gameState.totalMoney.toFixed(2)}`);
  }
}
