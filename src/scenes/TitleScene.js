import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, NEON_CYAN, GAME_FONT } from '../data/constants.js';
import { SettingsMenu } from '../managers/SettingsMenu.js';

const ACCENT_CSS = '#FFBB44';
const SUBTITLE_COLOR = '#FFE8CC';
const TITLE_Y = 250;
const SUBTITLE_Y = 340;
const MENU_Y = 620;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.transitionStarted = false;

    // Sky and horizon — simplified, no facade art
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0x0c1324);
    const sky = this.add.graphics().setDepth(0);
    sky.fillStyle(0x1c2b4a, 0.6);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.5);
    sky.fillStyle(0x5a2c24, 0.32);
    sky.fillEllipse(HALF_WIDTH, GAME_HEIGHT * 0.55, GAME_WIDTH * 1.3, 420);
    sky.fillStyle(0xFFCC88, 0.06);
    sky.fillEllipse(HALF_WIDTH, 560, GAME_WIDTH * 0.8, 90);
    sky.fillStyle(0x1f1a24, 1);
    sky.fillRect(0, 560, GAME_WIDTH, GAME_HEIGHT - 560);
    sky.fillStyle(0x2f3a52, 0.35);
    sky.fillRect(0, 560, GAME_WIDTH, 4);

    this.createStarfield();

    // Title and subtitle — larger type
    this.titleText = this.add.text(HALF_WIDTH, TITLE_Y, 'FOOTERS', {
      fontFamily: GAME_FONT,
      fontSize: '110px',
      color: ACCENT_CSS,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3).setAlpha(0);

    this.titleGlow = this.add.text(HALF_WIDTH, TITLE_Y, 'FOOTERS', {
      fontFamily: GAME_FONT,
      fontSize: '110px',
      color: '#FFE8CC',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2.5).setAlpha(0);

    if (this.titleText.preFX) {
      this.titleNeonFX = this.titleText.preFX.addGlow(NEON_CYAN, 0, 0, false);
    }

    this.subtitleText = this.add.text(HALF_WIDTH, SUBTITLE_Y, 'GALACTIC CANTINA', {
      fontFamily: GAME_FONT,
      fontSize: '32px',
      color: SUBTITLE_COLOR,
      fontStyle: '700',
    }).setOrigin(0.5).setDepth(3).setAlpha(0);

    this.settingsMenu = new SettingsMenu(this);
    this.settingsMenu.create();

    this.cameras.main.fadeIn(700);
    this.time.delayedCall(350, () => this.animateEntrance());
  }

  createStarfield() {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(20, 520);
      const size = Phaser.Math.FloatBetween(0.8, 2.2);
      const color = Math.random() > 0.5 ? 0xffcc88 : 0xffffff;
      const star = this.add.circle(x, y, size, color).setDepth(0.1);
      star.setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.25, 0.8) },
        duration: Phaser.Math.Between(800, 1800),
        delay: Phaser.Math.Between(0, 1200),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: star,
            alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.1, 0.4) },
            duration: Phaser.Math.Between(1400, 2600),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    }
  }

  animateEntrance() {
    soundManager.init();
    soundManager.hotkeySelect();

    this.titleText.setAlpha(1);
    this.titleText.setScale(0.9);
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1, scaleY: 1,
      duration: 420,
      ease: 'Back.easeOut',
    });

    if (this.titleNeonFX) {
      this.tweens.add({
        targets: this.titleNeonFX,
        outerStrength: 6,
        duration: 420,
        ease: 'Sine.easeOut',
      });
    }

    this.titleGlow.setAlpha(0);
    this.tweens.add({
      targets: this.titleGlow,
      alpha: 0.15,
      duration: 1600,
      delay: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(250, () => {
      this.subtitleText.setAlpha(1);
      this.subtitleText.y = SUBTITLE_Y + 18;
      this.tweens.add({
        targets: this.subtitleText,
        y: SUBTITLE_Y,
        duration: 420,
        ease: 'Sine.easeOut',
      });
    });

    this.time.delayedCall(550, () => this.showMenu());
  }

  showMenu() {
    const gap = 80;
    const menuItems = [
      { label: 'START GAME', w: 280, h: 60, fontSize: '32px', primary: true, action: () => this.transition() },
      { label: 'SETTINGS',   w: 200, h: 48, fontSize: '22px', primary: false, action: () => this.settingsMenu.open() },
    ];

    this.menuTexts = [];

    menuItems.forEach((item, i) => {
      const y = MENU_Y + i * gap;
      const container = this.add.container(HALF_WIDTH, y).setDepth(3).setAlpha(0);

      const bg = this.add.graphics();
      const accentColor = item.primary ? 0xC8862F : 0x7A5830;
      const fillColor = item.primary ? 0x2A1A08 : 0x1A1208;
      bg.fillStyle(fillColor, 0.9);
      bg.fillRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
      bg.lineStyle(item.primary ? 2.5 : 1.5, accentColor, 0.9);
      bg.strokeRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
      container.add(bg);

      const txt = this.add.text(0, 0, item.label, {
        fontFamily: GAME_FONT,
        fontSize: item.fontSize,
        fontStyle: 'bold',
        color: item.primary ? '#FFCF78' : '#C8A060',
      }).setOrigin(0.5);
      container.add(txt);

      const hitZone = this.add.zone(0, 0, item.w, item.h).setInteractive({ useHandCursor: true });
      container.add(hitZone);

      hitZone
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(item.primary ? 0x3A2A10 : 0x2A2010, 0.95);
          bg.fillRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
          bg.lineStyle(item.primary ? 2.5 : 1.5, item.primary ? 0xFFCC66 : 0xC8A060, 1);
          bg.strokeRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
          txt.setColor('#FFFFFF');
          this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Sine.easeOut' });
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(fillColor, 0.9);
          bg.fillRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
          bg.lineStyle(item.primary ? 2.5 : 1.5, accentColor, 0.9);
          bg.strokeRoundedRect(-item.w / 2, -item.h / 2, item.w, item.h, 10);
          txt.setColor(item.primary ? '#FFCF78' : '#C8A060');
          this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
        })
        .on('pointerdown', () => {
          if (this.settingsMenu.isOpen) return;
          soundManager.init();
          soundManager.hotkeySelect();
          item.action();
        });

      this.menuTexts.push(container);
      this.tweens.add({ targets: container, alpha: 1, duration: 420, delay: 80 * i, ease: 'Sine.easeOut' });
    });
  }

  transition() {
    if (this.transitionStarted) return;
    this.transitionStarted = true;

    soundManager.ding();
    this.cameras.main.flash(280, 255, 200, 120);
    this.cameras.main.fade(380, 0, 0, 0);

    this.time.delayedCall(320, () => {
      this.scene.start('Game');
    });
  }
}
