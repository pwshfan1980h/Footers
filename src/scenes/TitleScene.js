import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK, NEON_CYAN, GAME_FONT } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { WarpPostFX } from '../shaders/WarpPostFX.js';
import { createButton } from '../utils/uiHelpers.js';

const NEON_CYAN_CSS = '#00ddff';
const SUBTITLE_COLOR = '#FFE8CC';
const LETTER_DELAY = 120;
const TITLE_FONT_SIZE = 72;
const TITLE_Y = 260;
const SUBTITLE_Y = 340;
const MENU_Y = 440;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.transitionStarted = false;

    // Background
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, SPACE_BLACK);

    // Starfield (drawn first, behind everything)
    this.createStarfield();

    // Speed lines graphics layer
    this.speedLinesGfx = this.add.graphics().setDepth(0);
    this.speedLines = [];
    this.warpActive = false;

    // Apply shaders
    if (this.renderer.pipelines) {
      this.cameras.main.setPostPipeline(WarpPostFX);
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) this.cameras.main.setPostPipeline(CRTPostFX);
    }

    // Start warp shader at 0
    this.setWarpIntensity(0);

    // Camera fade in
    this.cameras.main.fadeIn(1500);

    // Prepare title letters (hidden, off-screen left)
    this.letters = [];
    this.glows = [];
    this.letterTargets = [];
    this.createTitleLetters();

    // After 1s delay, begin warp entrance
    this.time.delayedCall(1000, () => this.startWarpEntrance());
  }

  setWarpIntensity(value) {
    if (!this.renderer.pipelines) return;
    const result = this.cameras.main.getPostPipeline(WarpPostFX);
    const pipeline = Array.isArray(result) ? result[0] : result;
    if (pipeline) pipeline.setIntensity(value);
  }

  createStarfield() {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(20, GAME_HEIGHT - 20);
      const size = Phaser.Math.FloatBetween(1, 3);
      const star = this.add.circle(x, y, size, 0xffffff);
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

  createTitleLetters() {
    const title = 'FOOTERS';
    const style = {
      fontFamily: GAME_FONT,
      fontSize: `${TITLE_FONT_SIZE}px`,
      color: NEON_CYAN_CSS,
      fontStyle: 'bold',
    };

    // Measure total width to center the title
    const temp = this.add.text(0, 0, title, style);
    const totalWidth = temp.width;
    temp.destroy();

    // Measure individual letter widths for proper spacing
    const letterWidths = [];
    for (const char of title) {
      const t = this.add.text(0, 0, char, style);
      letterWidths.push(t.width);
      t.destroy();
    }

    const spacing = totalWidth / title.length;
    const startX = HALF_WIDTH - totalWidth / 2;

    // Pre-calculate tomato display width so we can account for it in spacing
    const tomatoSize = TITLE_FONT_SIZE * 1.35;
    const tomatoScale = tomatoSize / 64; // top_tomato is loaded at 64x64
    const tomatoDisplayW = 64 * tomatoScale;

    let xCursor = startX;
    for (let i = 0; i < title.length; i++) {
      const char = title[i];

      let letterObj;
      let glow = null;

      if (char === 'O') {
        // Center tomato within the letter slot
        const targetX = xCursor + (spacing - tomatoDisplayW) / 2;

        letterObj = this.add.image(-100 - i * 40, TITLE_Y, 'top_tomato')
          .setScale(tomatoScale)
          .setAlpha(0)
          .setOrigin(0, 0.5)
          .setDepth(1);

        if (letterObj.preFX) {
          glow = letterObj.preFX.addGlow(NEON_CYAN, 0, 0, false);
        }

        this.letterTargets.push(targetX);
      } else {
        const targetX = xCursor + (spacing - letterWidths[i]) / 2;

        letterObj = this.add.text(-100 - i * 40, TITLE_Y, char, style)
          .setAlpha(0)
          .setOrigin(0, 0.5)
          .setDepth(1);

        if (letterObj.preFX) {
          glow = letterObj.preFX.addGlow(NEON_CYAN, 0, 0, false);
        }

        this.letterTargets.push(targetX);
      }

      this.letters.push(letterObj);
      this.glows.push(glow);
      xCursor += spacing;
    }
  }

  startWarpEntrance() {
    // Ramp up warp shader
    this.warpActive = true;
    const warpObj = { intensity: 0 };
    this.tweens.add({
      targets: warpObj,
      intensity: 0.8,
      duration: 400,
      ease: 'Quad.easeIn',
      onUpdate: () => this.setWarpIntensity(warpObj.intensity),
    });

    // Spawn horizontal speed lines
    for (let i = 0; i < 60; i++) {
      this.speedLines.push({
        x: Phaser.Math.Between(-200, GAME_WIDTH + 200),
        y: Phaser.Math.Between(0, GAME_HEIGHT),
        length: Phaser.Math.Between(40, 200),
        speed: Phaser.Math.Between(800, 2000),
        alpha: Phaser.Math.FloatBetween(0.15, 0.5),
      });
    }

    // Play warp start sound
    if (soundManager.ctx) {
      const t = soundManager.ctx.currentTime;
      soundManager._osc('sine', 100, t, 0.5, 0.12);
      soundManager._osc('sine', 200, t + 0.1, 0.4, 0.1);
      soundManager._osc('sine', 400, t + 0.2, 0.3, 0.08);
      soundManager._noise(0.4, 0.06);
    }

    // Letters fly in one at a time
    this.letters.forEach((letter, i) => {
      this.time.delayedCall(i * LETTER_DELAY, () => {
        // Make visible and streak across
        letter.setAlpha(1);

        // Fly from left to target position
        this.tweens.add({
          targets: letter,
          x: this.letterTargets[i],
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            // Camera shake on landing
            this.cameras.main.shake(60, 0.004);
            soundManager.hotkeySelect();

            // Ramp glow up on landing
            if (this.glows[i]) {
              this.tweens.add({
                targets: this.glows[i],
                outerStrength: 4,
                duration: 250,
                ease: 'Sine.easeOut',
              });
            }
          },
        });
      });
    });

    // After all letters have landed, ease to idle warp and show menu
    const totalDelay = this.letters.length * LETTER_DELAY + 500;
    this.time.delayedCall(totalDelay, () => {
      // Ease down to a gentle idle intensity
      const warpDown = { intensity: 0.8 };
      this.tweens.add({
        targets: warpDown,
        intensity: 0.3,
        duration: 800,
        ease: 'Quad.easeOut',
        onUpdate: () => this.setWarpIntensity(warpDown.intensity),
      });

      this.startFlickerLoop();
      this.showSubtitle();
      this.showMenu();
    });
  }

  update(_time, delta) {
    if (!this.warpActive || this.speedLines.length === 0) return;

    const dt = delta / 1000;
    this.speedLinesGfx.clear();

    for (const line of this.speedLines) {
      line.x += line.speed * dt;

      // Wrap around when off-screen right
      if (line.x > GAME_WIDTH + 300) {
        line.x = -line.length - Phaser.Math.Between(0, 200);
        line.y = Phaser.Math.Between(0, GAME_HEIGHT);
      }

      this.speedLinesGfx.lineStyle(1.5, 0xaaddff, line.alpha);
      this.speedLinesGfx.lineBetween(line.x, line.y, line.x + line.length, line.y);
    }
  }

  startFlickerLoop() {
    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const idx = Phaser.Math.Between(0, this.letters.length - 1);
        const letter = this.letters[idx];
        const glow = this.glows[idx];

        this.tweens.chain({
          tweens: [
            { targets: letter, alpha: 0.2, duration: 50 },
            { targets: letter, alpha: 0, duration: 30 },
            { targets: letter, alpha: 0.7, duration: 40 },
            { targets: letter, alpha: 1, duration: 80 },
          ],
        });

        if (glow) {
          this.tweens.add({
            targets: glow,
            outerStrength: 0,
            duration: 50,
            onComplete: () => {
              this.tweens.add({
                targets: glow,
                outerStrength: 4,
                duration: 200,
              });
            },
          });
        }
      },
    });
  }

  showSubtitle() {
    const subtitle = this.add.text(HALF_WIDTH, SUBTITLE_Y + 40, 'SPACE FOOD TRUCK', {
      fontFamily: GAME_FONT,
      fontSize: '22px',
      color: SUBTITLE_COLOR,
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      y: SUBTITLE_Y,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  showMenu() {
    const btnW = 260;
    const btnH = 50;
    const btnX = HALF_WIDTH - btnW / 2;
    const gap = 16;

    // Campaign button (placeholder — disabled)
    const campaign = createButton(this, btnX, MENU_Y, btnW, btnH, 'Campaign', {
      baseFill: 0x111118,
      hoverFill: 0x111118,
      accentColor: 0x444455,
      hoverAccent: 0x444455,
      textColor: '#555566',
      hoverTextColor: '#555566',
      fontSize: '22px',
    });
    campaign.btnHit.disableInteractive();
    [campaign.btn, campaign.btnHit, campaign.btnText].forEach(o => o.setAlpha(0));

    const comingSoon = this.add.text(HALF_WIDTH, MENU_Y + btnH + 6, 'Coming Soon', {
      fontFamily: GAME_FONT,
      fontSize: '13px',
      color: '#444455',
    }).setOrigin(0.5, 0).setAlpha(0);

    // Freeplay button — bread loaf with text
    const freeplayY = MENU_Y + btnH + gap + 20 + 25;

    // Bread loaf textures cycle with W/S
    const breadKeys = ['loaf_white', 'loaf_wheat', 'loaf_sourdough'];
    this.breadIndex = 0;

    const loaf = this.add.image(HALF_WIDTH, freeplayY, breadKeys[0])
      .setDepth(1)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    this.menuLoaf = loaf;

    const freeplayText = this.add.text(HALF_WIDTH, freeplayY, 'Freeplay', {
      fontFamily: GAME_FONT,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#4a2810',
    }).setOrigin(0.5).setDepth(2).setAlpha(0);

    loaf.on('pointerover', () => {
      this.tweens.add({ targets: loaf, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Sine.easeOut' });
      loaf.setTint(0xffeedd);
    });
    loaf.on('pointerout', () => {
      this.tweens.add({ targets: loaf, scaleX: 1, scaleY: 1, duration: 100, ease: 'Sine.easeOut' });
      loaf.clearTint();
    });
    loaf.on('pointerdown', () => this.transition());

    // W/S keys cycle bread texture
    const wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    wKey.on('down', () => {
      this.breadIndex = (this.breadIndex - 1 + breadKeys.length) % breadKeys.length;
      loaf.setTexture(breadKeys[this.breadIndex]);
      soundManager.init();
      soundManager.hotkeySelect();
    });
    sKey.on('down', () => {
      this.breadIndex = (this.breadIndex + 1) % breadKeys.length;
      loaf.setTexture(breadKeys[this.breadIndex]);
      soundManager.init();
      soundManager.hotkeySelect();
    });

    const allTargets = [
      campaign.btn, campaign.btnHit, campaign.btnText,
      comingSoon,
      loaf, freeplayText,
    ];
    this.tweens.add({
      targets: allTargets,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  transition() {
    if (this.transitionStarted) return;
    this.transitionStarted = true;

    this.cameras.main.flash(400, 255, 255, 255);
    soundManager.ding();

    // Ramp warp up briefly then kill it before scene switch
    const warpOut = { intensity: 0.3 };
    this.tweens.add({
      targets: warpOut,
      intensity: 1,
      duration: 300,
      ease: 'Quad.easeIn',
      onUpdate: () => this.setWarpIntensity(warpOut.intensity),
    });

    this.time.delayedCall(500, () => {
      this.warpActive = false;
      this.scene.start('SystemMap');
    });
  }
}
