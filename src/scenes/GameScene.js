import Phaser from 'phaser';
import { DIFFICULTY_PROGRESSION } from '../data/ingredients.js';
import { gameState } from '../data/GameState.js';
import { DEBUG } from '../config.js';
import { BoidManager } from '../managers/BoidManager.js';
import { TutorialOverlay } from '../managers/TutorialOverlay.js';
import { WarningSystem } from '../managers/WarningSystem.js';
import { ParticleManager } from '../managers/ParticleManager.js';
import { SettingsMenu } from '../managers/SettingsMenu.js';
import { PrepTrack } from '../managers/PrepTrack.js';
import { CustomerVessels } from '../managers/CustomerVessels.js';
import { RevenueChallenges } from '../managers/RevenueChallenges.js';
import { GameSceneBackground } from '../managers/GameSceneBackground.js';
import { GameSceneHUD } from '../managers/GameSceneHUD.js';
import { GameSceneTicketBar } from '../managers/GameSceneTicketBar.js';
import { GameSceneBins } from '../managers/GameSceneBins.js';
import { GameSceneInteraction } from '../managers/GameSceneInteraction.js';
import { GameSceneTray } from '../managers/GameSceneTray.js';
import { GameSceneScoring } from '../managers/GameSceneScoring.js';
import { soundManager } from '../SoundManager.js';
import { musicManager } from '../MusicManager.js';
import { HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, NEON_PINK } from '../data/constants.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { WarningPulsePostFX } from '../shaders/WarningPulsePostFX.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.currentScore = 0;
    this.highScore = this.loadHighScore();
    this.gameTime = 0;

    this.locationData = data?.location || null;
    this.locationModifiers = data?.modifiers || { speedMult: 1.0, spawnMult: 1.0, tipMult: 1.0 };
  }

  loadHighScore() {
    try {
      const stored = localStorage.getItem('footers_highscore');
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      localStorage.setItem('footers_highscore', score.toString());
    } catch (e) {}
  }

  create() {
    const diff = DIFFICULTY_PROGRESSION;

    // --- constants ---
    this.ISO_SKEW = 0.25;
    this.TABLE_SKEW = 50;
    this.SPACE_BLACK = 0x050510;
    this.SPACE_DEEP = 0x030308;
    this.STAR_WHITE = 0xdddddd;
    this.STAR_BLUE = 0x88bbdd;
    this.STAR_WARM = 0xddccbb;
    this.SMOKED_GLASS = 0x0f1520;
    this.SMOKED_GLASS_ALPHA = 0.45;
    this.HULL_DARK = 0x3A2218;
    this.HULL_MID = 0x5A3A28;
    this.HULL_LIGHT = 0x7A5A3A;
    this.HULL_BRIGHT = 0x9A7A5A;
    this.HULL_WARM = 0x8B5A3A;
    this.PANEL_SEAM = 0x2A1810;
    this.CHROME_DARK = 0x3a3a48;
    this.CHROME_MID = 0x5a5a68;
    this.CHROME_LIGHT = 0x7a7a88;
    this.CHROME_HIGHLIGHT = 0x9a9aaa;
    this.BEAM_DARK = 0x2a2a35;
    this.BEAM_MID = 0x3a3a45;
    this.BEAM_LIGHT = 0x4a4a55;
    this.BEAM_HIGHLIGHT = 0x5a5a65;
    this.NEON_PINK = NEON_PINK;
    this.NEON_ORANGE = 0xee9933;
    this.NEON_MAGENTA = 0xdd33cc;
    this.NEON_GOLD = 0xFFEE88;
    this.GLASS_TINT = 0x3a4a60;
    this.GLASS_HIGHLIGHT = 0x5a7090;
    this.GLASS_EDGE = 0x2a3550;
    this.FRAME_DARK = 0x2a2a35;
    this.FRAME_LIGHT = 0x3a3a45;
    this.TABLE_TOP = 0x8B6A4A;
    this.TABLE_FRONT = 0x6B4A3A;
    this.TABLE_HIGHLIGHT = 0xC8A878;
    this.TABLE_SHADOW = 0x3A2A1A;
    this.SHELF_TOP = 0x6a8898;
    this.SHELF_FRONT = 0x4a6878;
    this.SHELF_GLASS = 0x5a7a8a;
    this.LAND_Y = 385;
    this.WINDOW_TOP = 145;
    this.WINDOW_BOTTOM = 390;
    this.WINDOW_HEIGHT = 245;
    this.BEAM_WIDTH = 45;
    this.BEAM_POSITIONS = [0, 230, 512 - 22, 794 - 45, 1024 - 45];

    this.gameMoney = 0;
    this.trays = [];
    this.tickets = [];
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.orderNumber = 0;
    this.ordersSpawned = 0;
    this.isPaused = false;
    this.spawnInterval = diff.initialSpawnInterval;
    this.waitingForNext = true;
    this.sequentialDelay = 0;
    this.spawnTimer = 0;
    this.isStoreOpen = true;
    this._dayEnding = false;
    this.heldItem = null;
    this.isDragging = false;
    this.treatmentItems = {};
    this.glowGraphics = null;
    this.magnetActive = false;

    this.boidManager = new BoidManager(this);
    this.tutorialOverlay = new TutorialOverlay(this);
    this.warningSystem = new WarningSystem(this);
    this.particleManager = new ParticleManager(this);
    this.settingsMenu = new SettingsMenu(this);
    this.prepTrack = new PrepTrack(this);
    this.customerVessels = new CustomerVessels(this);
    this.revenueChallenges = new RevenueChallenges(this);

    this.backgroundManager = new GameSceneBackground(this);
    this.hudManager = new GameSceneHUD(this);
    this.ticketBar = new GameSceneTicketBar(this);
    this.binsManager = new GameSceneBins(this);
    this.interactionManager = new GameSceneInteraction(this);
    this.trayManager = new GameSceneTray(this);
    this.scoringManager = new GameSceneScoring(this);

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.f1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.hotkeyHints = [];
    this.labelHints = [];
    this.f1Key.on('down', (event) => {
      if (event?.originalEvent) event.originalEvent.preventDefault();
      this.hudManager.showHotkeyHints(true);
    });
    this.f1Key.on('up', () => this.hudManager.showHotkeyHints(false));
    this.input.keyboard.on('keydown-F1', (event) => event.preventDefault());

    // --- build scene ---
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, this.HULL_DARK);

    this.backgroundManager.create();
    this.backgroundManager.createMetalSurface();
    this.backgroundManager.createFloor();

    this.hudManager.create();

    this.ticketBar.create();

    this.binsManager.create();

    this.glowGraphics = this.add.graphics().setDepth(99);

    this.interactionManager.setup();

    if (DEBUG) this.drawDebugHitboxes();

    this.boidManager.create();
    this.particleManager.create();
    this.settingsMenu.create();

    this.createEndShiftButton();

    this.prepTrack.create();
    this.customerVessels.create();
    this.revenueChallenges.create();

    // Apply post-processing shaders (WebGL only)
    if (this.renderer.pipelines) {
      this.cameras.main.setPostPipeline(WarningPulsePostFX);
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) {
        this.cameras.main.setPostPipeline(CRTPostFX);
      }
    }

    // Start ambient music (no-op if already playing)
    musicManager.start();
  }

  ordersDisplay() {
    return `Orders: ${this.ordersCompleted}`;
  }

  createHotkeyHint(x, y, key, depth = 22) {
    return this.hudManager.createHotkeyHint(x, y, key, depth);
  }

  createHeldVisual(key, x, y) {
    return this.interactionManager.createHeldVisual(key, x, y);
  }

  refreshHUD() {
    this.hudManager.refreshHUD();
  }

  updateTrayNextHint(tray) {
    this.interactionManager.updateTrayNextHint(tray);
  }

  flashTray(tray, color) {
    const flash = this.add.graphics();
    const hw = 70;
    flash.fillStyle(color, 0.25);
    flash.fillRoundedRect(-hw, -130, hw * 2, 145, 8);
    tray.container.add(flash);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });
  }

  checkTrayCompletion(tray) {
    this.trayManager.checkTrayCompletion(tray);
  }

  drawDebugHitboxes() {
    const g = this.add.graphics().setDepth(999);

    this.children.list.forEach((obj) => {
      if (!obj.input?.hitArea) return;
      const ha = obj.input.hitArea;
      if (!(ha instanceof Phaser.Geom.Rectangle)) return;

      if (obj instanceof Phaser.GameObjects.Image) {
        const ox = obj.x - obj.displayWidth * obj.originX;
        const oy = obj.y - obj.displayHeight * obj.originY;
        const sx = obj.displayWidth / obj.width;
        const sy = obj.displayHeight / obj.height;
        g.lineStyle(1, 0x00ff00, 0.7);
        g.strokeRect(ox + ha.x * sx, oy + ha.y * sy, ha.width * sx, ha.height * sy);
      } else if (obj instanceof Phaser.GameObjects.Container) {
        g.lineStyle(1, 0x00ffff, 0.7);
        g.strokeRect(obj.x + ha.x, obj.y + ha.y, ha.width, ha.height);
      }
    });
  }

  createEndShiftButton() {
    const btnX = 920;
    const btnY = 6;
    const btnW = 95;
    const btnH = 26;

    const btnG = this.add.graphics().setDepth(5);
    btnG.fillStyle(0x3a1a1a, 0.9);
    btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
    btnG.lineStyle(1.5, 0xff6666, 0.6);
    btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);

    const btnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'END SHIFT', {
      fontSize: '11px', color: '#ff8888', fontFamily: 'Bungee, Arial',
    }).setOrigin(0.5).setDepth(5);

    const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
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
    btnHit.on('pointerdown', () => this.endShift());
  }

  endShift() {
    if (this.isPaused) return;
    this.isPaused = true;

    const earnings = this.gameMoney;
    const locationId = this.locationData?.id || null;

    gameState.updateAfterShift(locationId, earnings, this.ordersCompleted, this.ordersMissed);

    if (this.currentScore > this.highScore) {
      this.saveHighScore(this.currentScore);
    }

    soundManager.fanfare();

    this.time.delayedCall(600, () => {
      this.scene.start('SystemMap', {
        returnFromShift: true,
        shiftEarnings: earnings,
      });
    });
  }

  destroyTray(tray) {
    this.trayManager.destroyTray(tray);
  }

  update(time, delta) {
    if (this.isPaused) {
      if (this.heldItem) this.interactionManager.cancelHeldItem();
      return;
    }

    this.gameTime += (delta / 1000);

    this.warningSystem.update();
    this.particleManager.update(delta);

    // Drive warning pulse shader from urgency + strikes
    const wp = this.cameras.main.getPostPipeline(WarningPulsePostFX);
    const warningPipeline = Array.isArray(wp) ? wp[0] : wp;
    if (warningPipeline) {
      const strikeUrgency = this.ordersMissed >= 2 ? 0.4 : this.ordersMissed >= 1 ? 0.1 : 0;
      const intensity = Math.min(1, Math.max(this.warningSystem.screenUrgency || 0, strikeUrgency));
      warningPipeline.setIntensity(intensity);
    }

    this.boidManager.update(delta);
    this.customerVessels.update(delta);
    this.revenueChallenges.update(delta);

    if (this.isStoreOpen && this.prepTrack.findEmptySlot()) {
      if (this.ordersSpawned < 3) {
        if (this.waitingForNext) {
          this.sequentialDelay += delta;
          const delay = this.ordersSpawned === 0 ? 800 : 1500;
          if (this.sequentialDelay >= delay) {
            this.trayManager.spawnTray();
            this.waitingForNext = false;
            this.sequentialDelay = 0;
          }
        }
      } else {
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
          this.trayManager.spawnTray();
          this.spawnTimer = 0;
        }
      }
    }

    this.trays = this.trays.filter((t) => !t.done);

    this.updateDifficulty();
  }

  updateDifficulty() {
    const minutesPlayed = this.gameTime / 60;
    const diff = DIFFICULTY_PROGRESSION;
    const mods = this.locationModifiers;

    this.spawnInterval = Math.max(
      diff.minSpawnInterval / mods.spawnMult,
      (diff.initialSpawnInterval - minutesPlayed * diff.spawnIntervalDecrease) / mods.spawnMult
    );
  }
}
