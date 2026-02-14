import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK, NEON_CYAN, GAME_FONT } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { SettingsMenu } from '../managers/SettingsMenu.js';

const ACCENT_CSS = '#FFBB44';
const SUBTITLE_COLOR = '#FFE8CC';
const TITLE_Y = 260;
const SUBTITLE_Y = 340;
const MENU_Y = 640;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.transitionStarted = false;

    // Desert sky background
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0x0a0610);

    // Sky gradient — purple-blue at top, warm at horizon
    const skyGfx = this.add.graphics().setDepth(0);
    skyGfx.fillStyle(0x1a1030, 0.4);
    skyGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.4);
    skyGfx.fillStyle(0x331a08, 0.3);
    skyGfx.fillEllipse(HALF_WIDTH, GAME_HEIGHT * 0.55, GAME_WIDTH * 1.3, 400);

    // Stars
    this.createStarfield();

    // Large amber moon (dominant)
    const moonGfx = this.add.graphics().setDepth(0.2);
    // Outer glow
    moonGfx.fillStyle(0xCC6622, 0.06);
    moonGfx.fillCircle(1480, 140, 120);
    moonGfx.fillStyle(0xDD7733, 0.1);
    moonGfx.fillCircle(1480, 140, 80);
    // Moon body
    moonGfx.fillStyle(0xDD8844, 0.5);
    moonGfx.fillCircle(1480, 140, 55);
    // Lighter face
    moonGfx.fillStyle(0xEEAA66, 0.3);
    moonGfx.fillCircle(1472, 132, 40);
    // Craters
    moonGfx.fillStyle(0xBB6633, 0.25);
    moonGfx.fillCircle(1465, 125, 8);
    moonGfx.fillCircle(1495, 145, 6);
    moonGfx.fillCircle(1475, 155, 5);
    moonGfx.fillCircle(1460, 148, 3);
    // Small distant moon
    moonGfx.fillStyle(0xccbbaa, 0.3);
    moonGfx.fillCircle(350, 100, 12);
    moonGfx.fillStyle(0xccbbaa, 0.12);
    moonGfx.fillCircle(350, 100, 18);

    // Ground / desert floor
    const groundY = 560;
    skyGfx.fillStyle(0x2A1A10, 1);
    skyGfx.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT - groundY);
    skyGfx.fillStyle(0x3A2A18, 0.3);
    skyGfx.fillRect(0, groundY, GAME_WIDTH, 3);

    // === CANTINA BUILDING FACADE (irregular desert architecture) ===
    const buildingGfx = this.add.graphics().setDepth(1);
    const bx = HALF_WIDTH;
    const bw = 600;
    const bh = 350;
    const buildTop = groundY - bh;
    const buildLeft = bx - bw / 2;
    const buildRight = bx + bw / 2;

    // Main wall with stepped roofline (not a rectangle)
    buildingGfx.fillStyle(0x5A4530, 1);
    buildingGfx.beginPath();
    buildingGfx.moveTo(buildLeft - 40, groundY);
    buildingGfx.lineTo(buildLeft - 40, buildTop + 60);       // left wing low
    buildingGfx.lineTo(buildLeft - 10, buildTop + 55);
    buildingGfx.lineTo(buildLeft - 10, buildTop + 10);       // step up
    buildingGfx.lineTo(buildLeft + 80, buildTop);             // left parapet
    buildingGfx.lineTo(bx - 40, buildTop - 20);               // center peak
    buildingGfx.lineTo(bx + 40, buildTop - 20);               // center peak
    buildingGfx.lineTo(buildRight - 80, buildTop);            // right parapet
    buildingGfx.lineTo(buildRight + 10, buildTop + 10);      // step down
    buildingGfx.lineTo(buildRight + 10, buildTop + 70);
    buildingGfx.lineTo(buildRight + 40, buildTop + 75);      // right wing low
    buildingGfx.lineTo(buildRight + 40, groundY);
    buildingGfx.closePath();
    buildingGfx.fillPath();

    // Stucco texture
    buildingGfx.fillStyle(0x6A5540, 0.15);
    buildingGfx.fillEllipse(bx - 100, buildTop + 80, 150, 40);
    buildingGfx.fillStyle(0x4A3520, 0.1);
    buildingGfx.fillEllipse(bx + 120, buildTop + 120, 100, 30);

    // Horizontal mortar lines
    buildingGfx.lineStyle(1, 0x4A3520, 0.2);
    buildingGfx.lineBetween(buildLeft, buildTop + 50, buildRight, buildTop + 50);
    buildingGfx.lineBetween(buildLeft, buildTop + 130, buildRight, buildTop + 130);
    buildingGfx.lineBetween(buildLeft, buildTop + 220, buildRight, buildTop + 220);

    // Roof overhang across main section
    buildingGfx.fillStyle(0x3A2A18, 1);
    buildingGfx.fillRect(buildLeft - 50, buildTop + 55, bw + 100, 8);
    buildingGfx.fillStyle(0x4A3A28, 0.6);
    buildingGfx.fillRect(buildLeft - 50, buildTop + 55, bw + 100, 2);

    // Chimneys / vents on roofline
    buildingGfx.fillStyle(0x4A3520, 0.9);
    buildingGfx.fillRect(buildLeft + 30, buildTop - 35, 14, 30);
    buildingGfx.fillRect(buildRight - 60, buildTop - 25, 10, 22);

    // Side pillars
    buildingGfx.fillStyle(0x4A3520, 1);
    buildingGfx.fillRect(buildLeft - 44, buildTop + 60, 12, bh - 60);
    buildingGfx.fillRect(buildRight + 32, buildTop + 75, 12, bh - 75);

    // Windows on each side of door
    const winY = buildTop + 80;
    const winW = 80;
    const winH = 100;
    [buildLeft + 50, buildRight - 50 - winW].forEach(wx => {
      buildingGfx.fillStyle(0x120a05, 0.8);
      buildingGfx.fillRect(wx, winY, winW, winH);
      buildingGfx.fillStyle(0xFFCC88, 0.12);
      buildingGfx.fillRect(wx + 4, winY + 4, winW - 8, winH - 8);
      buildingGfx.lineStyle(3, 0x3A2A18, 1);
      buildingGfx.strokeRect(wx, winY, winW, winH);
      buildingGfx.fillStyle(0x4A3A28, 1);
      buildingGfx.fillRect(wx - 4, winY + winH, winW + 8, 5);
    });

    // === PARKED SHIPS outside cantina ===
    // Small shuttle (left side)
    buildingGfx.fillStyle(0x3A3030, 0.7);
    buildingGfx.beginPath();
    buildingGfx.moveTo(200, groundY - 20);
    buildingGfx.lineTo(260, groundY - 35);
    buildingGfx.lineTo(310, groundY - 30);
    buildingGfx.lineTo(320, groundY - 22);
    buildingGfx.lineTo(310, groundY - 15);
    buildingGfx.lineTo(200, groundY - 12);
    buildingGfx.closePath();
    buildingGfx.fillPath();
    // Cockpit
    buildingGfx.fillStyle(0x556688, 0.4);
    buildingGfx.fillEllipse(300, groundY - 25, 16, 10);
    // Landing strut
    buildingGfx.fillStyle(0x3A3030, 0.5);
    buildingGfx.fillRect(230, groundY - 12, 3, 14);
    buildingGfx.fillRect(290, groundY - 12, 3, 14);

    // Cargo hauler (right side, larger)
    buildingGfx.fillStyle(0x4A3828, 0.6);
    buildingGfx.beginPath();
    buildingGfx.moveTo(1560, groundY - 15);
    buildingGfx.lineTo(1580, groundY - 40);
    buildingGfx.lineTo(1700, groundY - 45);
    buildingGfx.lineTo(1730, groundY - 35);
    buildingGfx.lineTo(1730, groundY - 18);
    buildingGfx.lineTo(1560, groundY - 10);
    buildingGfx.closePath();
    buildingGfx.fillPath();
    // Engine pods
    buildingGfx.fillStyle(0x3A2A18, 0.5);
    buildingGfx.fillEllipse(1570, groundY - 25, 14, 18);
    // Cargo markings
    buildingGfx.lineStyle(1, 0x5A4838, 0.3);
    buildingGfx.lineBetween(1620, groundY - 42, 1620, groundY - 18);
    buildingGfx.lineBetween(1660, groundY - 43, 1660, groundY - 17);
    // Landing gear
    buildingGfx.fillStyle(0x3A3030, 0.4);
    buildingGfx.fillRect(1610, groundY - 10, 3, 12);
    buildingGfx.fillRect(1690, groundY - 10, 3, 12);

    // === DOOR OPENING ===
    const doorW = 160;
    const doorH = 210;
    const doorTop = groundY - doorH;
    const doorLeft = bx - doorW / 2;

    // Door frame (dark wood)
    buildingGfx.fillStyle(0x3A2A18, 1);
    buildingGfx.fillRect(doorLeft - 10, doorTop - 10, doorW + 20, doorH + 10);
    buildingGfx.fillStyle(0x4A3A28, 0.8);
    buildingGfx.fillRect(doorLeft - 6, doorTop - 6, doorW + 12, doorH + 6);

    // Dark interior behind doors
    buildingGfx.fillStyle(0x0a0605, 1);
    buildingGfx.fillRect(doorLeft, doorTop, doorW, doorH);

    // Warm interior glow
    buildingGfx.fillStyle(0xFFCC88, 0.08);
    buildingGfx.fillRect(doorLeft + 5, doorTop + 5, doorW - 10, doorH - 5);

    // === SALOON DOORS (drawn on top, animated on start) ===
    this.doorLeft = doorLeft;
    this.doorTop = doorTop;
    this.doorW = doorW;
    this.doorH = doorH * 0.7; // saloon doors are shorter
    this.doorProgress = 0; // 0 = closed, 1 = open

    this.doorGfx = this.add.graphics().setDepth(2);
    this.drawSaloonDoors(0);

    // Warm light spilling from under doors
    const lightGfx = this.add.graphics().setDepth(0.5);
    lightGfx.fillStyle(0xFFCC88, 0.06);
    lightGfx.fillEllipse(bx, groundY, doorW * 2, 40);

    // === NEON SIGN ===
    this.neonGfx = this.add.graphics().setDepth(3);
    this.drawNeonSign();

    // Title text ("FOOTERS" as neon)
    this.titleText = this.add.text(HALF_WIDTH, TITLE_Y, 'FOOTERS', {
      fontFamily: GAME_FONT,
      fontSize: '80px',
      color: ACCENT_CSS,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    // Title glow (pulsing)
    this.titleGlow = this.add.text(HALF_WIDTH, TITLE_Y, 'FOOTERS', {
      fontFamily: GAME_FONT,
      fontSize: '80px',
      color: '#FFE8CC',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3.5).setAlpha(0);

    if (this.titleText.preFX) {
      this.titleNeonFX = this.titleText.preFX.addGlow(NEON_CYAN, 0, 0, false);
    }

    // Subtitle
    this.subtitleText = this.add.text(HALF_WIDTH, SUBTITLE_Y, 'GALACTIC CANTINA', {
      fontFamily: GAME_FONT,
      fontSize: '22px',
      color: SUBTITLE_COLOR,
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    // Apply CRT shader
    if (this.renderer.pipelines) {
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) this.cameras.main.setPostPipeline(CRTPostFX);
    }

    // Settings menu
    this.isPaused = false;
    this.settingsMenu = new SettingsMenu(this);
    this.settingsMenu.create();

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.settingsMenu.isOpen) {
        this.settingsMenu.close();
      } else {
        this.settingsMenu.open();
      }
    });

    // Camera fade in
    this.cameras.main.fadeIn(1500);

    // Animate entrance
    this.time.delayedCall(800, () => this.animateEntrance());
  }

  createStarfield() {
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(20, 500);
      const size = Phaser.Math.FloatBetween(0.8, 2.5);
      const color = Math.random() > 0.6 ? 0xffcc88 : 0xffffff;
      const star = this.add.circle(x, y, size, color);
      star.setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.3, 0.9) },
        duration: Phaser.Math.Between(800, 2000),
        delay: Phaser.Math.Between(0, 1500),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: star,
            alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.1, 0.5) },
            duration: Phaser.Math.Between(1500, 3000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    }
  }

  drawNeonSign() {
    const g = this.neonGfx;
    g.clear();

    const signX = HALF_WIDTH;
    const signY = this.doorTop - 40;
    const signW = 280;
    const signH = 50;

    // Sign board
    g.fillStyle(0x2A1A10, 0.9);
    g.fillRoundedRect(signX - signW / 2, signY - signH / 2, signW, signH, 6);

    // Neon border
    g.lineStyle(2, 0xFFBB44, 0.7);
    g.strokeRoundedRect(signX - signW / 2 + 4, signY - signH / 2 + 4, signW - 8, signH - 8, 4);

    // Neon glow
    g.fillStyle(0xFFBB44, 0.06);
    g.fillEllipse(signX, signY, signW + 40, signH + 30);
  }

  drawSaloonDoors(progress) {
    const g = this.doorGfx;
    g.clear();

    const cx = HALF_WIDTH;
    const halfW = this.doorW / 2;
    const doorH = this.doorH;
    const doorTop = this.doorTop + (this.doorH * 0.42 - this.doorH * 0.42 * 0); // doors hang from top

    const swingAngle = progress * (Math.PI / 2.2);
    const apparentW = halfW * Math.cos(swingAngle);

    if (apparentW < 1) return;

    // Left door
    const leftX = cx - apparentW;
    g.fillStyle(0x4A3020, 1);
    g.fillRect(leftX, doorTop, apparentW, doorH);

    // Panel details
    const inset = Math.max(3, apparentW * 0.12);
    if (apparentW > 10) {
      g.fillStyle(0x5A4030, 0.8);
      g.fillRect(leftX + inset, doorTop + 10, apparentW - inset * 2, doorH * 0.35);
      g.fillRect(leftX + inset, doorTop + doorH * 0.52, apparentW - inset * 2, doorH * 0.35);
    }
    // Hinge hardware
    g.fillStyle(0x7A5830, 0.9);
    g.fillCircle(leftX, doorTop + 12, 4);
    g.fillCircle(leftX, doorTop + doorH - 12, 4);

    // Right door
    const rightX = cx;
    g.fillRect(rightX, doorTop, apparentW, doorH);

    if (apparentW > 10) {
      g.fillStyle(0x5A4030, 0.8);
      g.fillRect(rightX + inset, doorTop + 10, apparentW - inset * 2, doorH * 0.35);
      g.fillRect(rightX + inset, doorTop + doorH * 0.52, apparentW - inset * 2, doorH * 0.35);
    }
    g.fillStyle(0x7A5830, 0.9);
    g.fillCircle(rightX + apparentW, doorTop + 12, 4);
    g.fillCircle(rightX + apparentW, doorTop + doorH - 12, 4);
  }

  animateEntrance() {
    // Fade in title with neon flicker
    this.titleText.setAlpha(1);
    this.titleText.setScale(0.8);
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1, scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    if (this.titleNeonFX) {
      this.tweens.add({
        targets: this.titleNeonFX,
        outerStrength: 6,
        duration: 400,
        ease: 'Sine.easeOut',
      });
    }

    // Neon flicker effect
    soundManager.init();
    soundManager.hotkeySelect();

    this.time.delayedCall(200, () => {
      this.titleText.setAlpha(0.3);
      this.time.delayedCall(50, () => {
        this.titleText.setAlpha(1);
        this.time.delayedCall(100, () => {
          this.titleText.setAlpha(0.5);
          this.time.delayedCall(40, () => {
            this.titleText.setAlpha(1);
          });
        });
      });
    });

    // Pulse glow loop
    this.titleGlow.setAlpha(0);
    this.tweens.add({
      targets: this.titleGlow,
      alpha: 0.15,
      duration: 1500,
      delay: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Fade in subtitle
    this.time.delayedCall(500, () => {
      this.subtitleText.setAlpha(1);
      this.subtitleText.y = SUBTITLE_Y + 20;
      this.tweens.add({
        targets: this.subtitleText,
        y: SUBTITLE_Y,
        duration: 400,
        ease: 'Sine.easeOut',
      });
    });

    // Show menu
    this.time.delayedCall(800, () => this.showMenu());

    // Start neon flicker loop
    this.time.delayedCall(1000, () => this.startFlickerLoop());
  }

  startFlickerLoop() {
    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        this.tweens.chain({
          tweens: [
            { targets: this.titleText, alpha: 0.3, duration: 40 },
            { targets: this.titleText, alpha: 0, duration: 30 },
            { targets: this.titleText, alpha: 0.8, duration: 40 },
            { targets: this.titleText, alpha: 1, duration: 60 },
          ],
        });
        if (this.titleNeonFX) {
          this.tweens.add({
            targets: this.titleNeonFX,
            outerStrength: 0,
            duration: 40,
            onComplete: () => {
              this.tweens.add({
                targets: this.titleNeonFX,
                outerStrength: 6,
                duration: 200,
              });
            },
          });
        }
      },
    });
  }

  showMenu() {
    const gap = 58;
    const menuItems = [
      { label: 'Start',     fontSize: '22px', enabled: true,  action: () => this.transition() },
      { label: 'Settings',  fontSize: '16px', enabled: true,  action: () => this.settingsMenu.open() },
    ];

    this.menuTexts = [];
    const fadeTargets = [];

    menuItems.forEach((item, i) => {
      const y = MENU_Y + i * gap;
      const txt = this.add.text(HALF_WIDTH, y, item.label, {
        fontFamily: GAME_FONT,
        fontSize: item.fontSize,
        fontStyle: 'bold',
        color: item.enabled ? '#FFE8CC' : '#555566',
      }).setOrigin(0.5).setDepth(5).setAlpha(0);
      this.menuTexts.push(txt);
      fadeTargets.push(txt);
    });

    // Bread loaf cursor
    this.menuIndex = 0;
    const loaf = this.add.image(HALF_WIDTH, MENU_Y, 'loaf_white')
      .setDepth(4).setAlpha(0);
    this.menuLoaf = loaf;
    fadeTargets.push(loaf);

    // W/S to navigate menu
    const wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    wKey.on('down', () => {
      if (this.settingsMenu.isOpen) return;
      this.menuIndex = (this.menuIndex - 1 + menuItems.length) % menuItems.length;
      this.updateMenuCursor(menuItems);
      soundManager.init();
      soundManager.hotkeySelect();
    });
    sKey.on('down', () => {
      if (this.settingsMenu.isOpen) return;
      this.menuIndex = (this.menuIndex + 1) % menuItems.length;
      this.updateMenuCursor(menuItems);
      soundManager.init();
      soundManager.hotkeySelect();
    });

    // Enter/Space to confirm
    const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const confirm = () => {
      if (this.settingsMenu.isOpen) return;
      const item = menuItems[this.menuIndex];
      if (item.enabled && item.action) item.action();
    };
    enterKey.on('down', confirm);
    spaceKey.on('down', confirm);

    // Fade in
    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => this.updateMenuCursor(menuItems),
    });

    this.updateMenuCursor(menuItems, true);
  }

  updateMenuCursor(menuItems, instant) {
    const targetY = MENU_Y + this.menuIndex * 58;

    this.menuTexts.forEach((txt, i) => {
      if (!menuItems[i].enabled) return;
      txt.setColor(i === this.menuIndex ? '#ffffff' : '#FFE8CC');
    });

    if (instant) {
      this.menuLoaf.y = targetY;
      return;
    }
    this.tweens.add({
      targets: this.menuLoaf,
      y: targetY,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  transition() {
    if (this.transitionStarted) return;
    this.transitionStarted = true;

    soundManager.ding();

    // Swing saloon doors open
    const doorAnim = { progress: 0 };
    this.tweens.add({
      targets: doorAnim,
      progress: 1,
      duration: 600,
      ease: 'Back.easeOut',
      onUpdate: () => {
        this.drawSaloonDoors(doorAnim.progress);
      },
    });

    // Flash warm light from the opening
    this.cameras.main.flash(400, 255, 200, 100);

    this.time.delayedCall(700, () => {
      this.scene.start('Game');
    });
  }
}
