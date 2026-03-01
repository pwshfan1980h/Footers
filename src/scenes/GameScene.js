import Phaser from 'phaser';
import { DIFFICULTY_PROGRESSION } from '../data/ingredients.js';
import { getWaveConfig } from '../data/waves.js';
import { DEBUG } from '../config.js';
import { TutorialOverlay } from '../managers/TutorialOverlay.js';
import { WarningSystem } from '../managers/WarningSystem.js';
import { ParticleManager } from '../managers/ParticleManager.js';
import { SettingsMenu } from '../managers/SettingsMenu.js';
import { PrepTrack } from '../managers/PrepTrack.js';
import { CustomerManager } from '../managers/CustomerManager.js';
import { CustomerDeck } from '../managers/CustomerDeck.js';
import { GameSceneBackground } from '../managers/GameSceneBackground.js';
import { GameSceneHUD } from '../managers/GameSceneHUD.js';
import { GameSceneTicketBar } from '../managers/GameSceneTicketBar.js';
import { GameSceneBins } from '../managers/GameSceneBins.js';
import { GameSceneInteraction } from '../managers/GameSceneInteraction.js';
import { GameSceneTray } from '../managers/GameSceneTray.js';
import { GameSceneScoring } from '../managers/GameSceneScoring.js';
import { NotificationManager } from '../managers/NotificationManager.js';
import { soundManager } from '../SoundManager.js';
import { musicManager } from '../MusicManager.js';
import {
  HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, NEON_PINK,
  FIRST_ORDER_DELAY, NEXT_ORDER_DELAY, SEQUENTIAL_ORDER_CAP,
} from '../data/constants.js';
import { THEME, LAYOUT } from '../data/theme.js';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { WarningPulsePostFX } from '../shaders/WarningPulsePostFX.js';


export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init() {
    this.currentScore = 0;
    this.highScore = this.loadHighScore();
    this.gameTime = 0;
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
    // --- constants ---
    Object.assign(this, THEME, LAYOUT);
    this.NEON_PINK = NEON_PINK;

    this.trays = [];
    this.tickets = [];
    this.ordersCompleted = 0;
    this.ordersMissed = 0;
    this.orderNumber = 0;
    this.ordersSpawned = 0;
    this.isPaused = false;
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
    this.fastestOrderThisShift = null;

    // Wave system
    this.currentWave = 1;
    this.waveOrdersHandled = 0;
    this.waveMissesThisWave = 0;
    this.waveScoreStart = 0;
    this.waveTransitioning = false;
    this.waveConfig = getWaveConfig(1);
    this.spawnInterval = this.waveConfig.spawnInterval;

    // Challenge tracking
    this.challengeProgress = 0;
    this.challengeComplete = false;

    // Combo system
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.comboTimeout = 5000;

    // Input buffer
    this.inputBuffer = null;
    this.isPlacing = false;

    this.tutorialOverlay = new TutorialOverlay(this);
    this.warningSystem = new WarningSystem(this);
    this.particleManager = new ParticleManager(this);
    this.settingsMenu = new SettingsMenu(this);
    this.prepTrack = new PrepTrack(this);
    this.customerManager = new CustomerManager(this);
    this.customerDeck = new CustomerDeck(this);
    this.backgroundManager = new GameSceneBackground(this);
    this.hudManager = new GameSceneHUD(this);
    this.ticketBar = new GameSceneTicketBar(this);
    this.binsManager = new GameSceneBins(this);
    this.interactionManager = new GameSceneInteraction(this);
    this.trayManager = new GameSceneTray(this);
    this.scoringManager = new GameSceneScoring(this);
    this.notificationManager = new NotificationManager(this);

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- build scene ---
    this.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, this.HULL_DARK);

    this.backgroundManager.create();
    this.customerDeck.create();
    this.backgroundManager.createMetalSurface();
    this.backgroundManager.createServiceCounter();

    this.hudManager.create();

    this.ticketBar.create();

    this.binsManager.create();

    this.glowGraphics = this.add.graphics().setDepth(99);

    this.interactionManager.setup();

    if (DEBUG) this.drawDebugHitboxes();

    this.particleManager.create();
    this.settingsMenu.create();

    this.prepTrack.create();
    this.customerManager.create();
    this.notificationManager.create();

    // Apply post-processing shaders (WebGL only)
    if (this.renderer.pipelines) {
      this.cameras.main.setPostPipeline(WarningPulsePostFX);
      const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
      if (crtEnabled) {
        this.cameras.main.setPostPipeline(CRTPostFX);
      }
    }

    // Initialize wave display
    if (this.hudManager.updateWaveDisplay) {
      this.hudManager.updateWaveDisplay(this.currentWave, this.waveConfig.challenge);
    }

    // Show first wave unlock notification
    if (this.waveConfig.unlock) {
      const names = this.waveConfig.unlock.map(u => u.charAt(0).toUpperCase() + u.slice(1));
      this.time.delayedCall(500, () => {
        this.notificationManager.show(`Wave 1: ${names.join(' & ')} available`);
      });
    }

    // Start ambient music (no-op if already playing)
    musicManager.start();
  }

  createHotkeyHint() {
    // No-op — hotkey hints removed (next-key prompt replaces F1 overlay)
    return null;
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
    const hw = 110;
    flash.fillStyle(color, 0.25);
    flash.fillRoundedRect(-hw, -170, hw * 2, 200, 8);
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
      const rawIntensity = Math.min(1, Math.max(this.warningSystem.screenUrgency || 0, strikeUrgency));
      warningPipeline.setIntensity(rawIntensity * 0.5);
    }

    this.customerDeck.update(delta);
    this.customerManager.update(delta);

    // Spawning governed by wave config
    if (this.isStoreOpen && !this.waveTransitioning && this.prepTrack.findEmptySlot()) {
      const activeCustomers = this.customerManager.customers.filter(
        c => c.personState !== 'gone' && c.personState !== 'departed'
      ).length;
      const maxC = this.waveConfig.maxConcurrent || 1;

      if (activeCustomers < maxC) {
        if (this.ordersSpawned < SEQUENTIAL_ORDER_CAP) {
          if (this.waitingForNext) {
            this.sequentialDelay += delta;
            const delay = this.ordersSpawned === 0 ? FIRST_ORDER_DELAY : NEXT_ORDER_DELAY;
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
    }

    this.trays = this.trays.filter((t) => !t.done);

    // Combo timeout
    if (this.combo > 0) {
      this.comboTimer += delta;
      if (this.comboTimer >= this.comboTimeout) {
        this.combo = 0;
        this.comboTimer = 0;
        this.hudManager.updateComboDisplay(0);
      }
    }
  }

  // Called by scoring/miss handlers to advance wave tracking
  onOrderHandled(completed, tray, speedMult) {
    this.waveOrdersHandled++;
    if (!completed) this.waveMissesThisWave++;

    // Challenge tracking
    this.updateChallengeTracking(completed, tray, speedMult);

    if (this.waveOrdersHandled >= this.waveConfig.customerCount && !this.waveTransitioning) {
      // Check no_miss challenge at wave end
      const ch = this.waveConfig.challenge;
      if (ch && ch.type === 'no_miss' && this.waveMissesThisWave === 0 && !this.challengeComplete) {
        this.challengeComplete = true;
        this.hudManager.updateChallengeProgress(0, 0, true);
      }
      this.triggerWaveTransition();
    }
  }

  updateChallengeTracking(completed, tray, speedMult) {
    if (this.challengeComplete) return;
    const ch = this.waveConfig.challenge;
    if (!ch) return;

    if (ch.type === 'speed' && completed && speedMult >= (ch.minMult || 2)) {
      this.challengeProgress++;
    } else if (ch.type === 'perfect' && completed && tray && tray.wrongPlacements === 0) {
      this.challengeProgress++;
    } else if (ch.type === 'count' && completed) {
      this.challengeProgress++;
    }

    if (ch.type !== 'combo' && ch.type !== 'no_miss' && this.challengeProgress >= ch.target) {
      this.challengeComplete = true;
      this.hudManager.updateChallengeProgress(this.challengeProgress, ch.target, true);
    } else if (ch.target > 0) {
      this.hudManager.updateChallengeProgress(this.challengeProgress, ch.target, false);
    }
  }

  // Called by interaction manager on combo change
  onComboUpdate(combo) {
    if (this.challengeComplete) return;
    const ch = this.waveConfig.challenge;
    if (!ch || ch.type !== 'combo') return;

    if (combo >= ch.target) {
      this.challengeComplete = true;
      this.challengeProgress = combo;
      this.hudManager.updateChallengeProgress(combo, ch.target, true);
    } else {
      this.challengeProgress = combo;
      this.hudManager.updateChallengeProgress(combo, ch.target, false);
    }
  }

  triggerWaveTransition() {
    this.waveTransitioning = true;
    const waveScore = this.currentScore - this.waveScoreStart;
    const challengeBonus = this.challengeComplete ? 1000 : 0;
    const waveBonus = 500 + this.currentWave * 100;
    this.currentScore += waveBonus + challengeBonus;
    this.refreshHUD();

    this.showWaveCompleteOverlay(waveScore, waveBonus, challengeBonus, () => {
      this.currentWave++;
      this.waveConfig = getWaveConfig(this.currentWave);
      this.spawnInterval = this.waveConfig.spawnInterval;
      this.waveOrdersHandled = 0;
      this.waveMissesThisWave = 0;
      this.waveScoreStart = this.currentScore;
      this.challengeProgress = 0;
      this.challengeComplete = false;
      this.waveTransitioning = false;

      // Reset sequential spawning for new wave
      this.ordersSpawned = 0;
      this.waitingForNext = true;
      this.sequentialDelay = 0;
      this.spawnTimer = 0;

      // Show unlock notification if any
      if (this.waveConfig.unlock) {
        const names = this.waveConfig.unlock.map(u => u.charAt(0).toUpperCase() + u.slice(1));
        this.notificationManager.show(`NEW: ${names.join(' & ')} unlocked!`);
      }

      // Update wave display in HUD
      if (this.hudManager.updateWaveDisplay) {
        this.hudManager.updateWaveDisplay(this.currentWave, this.waveConfig.challenge);
      }
    });
  }

  showWaveCompleteOverlay(waveScore, waveBonus, challengeBonus, onDone) {
    const s = this;
    const overlay = s.add.graphics().setDepth(300);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const titleText = s.add.text(HALF_WIDTH, 360, `Wave ${this.currentWave} Complete!`, {
      fontSize: '52px', color: '#FFBB44', fontFamily: 'Oxanium', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(301);

    const scoreText = s.add.text(HALF_WIDTH, 430, `Score: +${waveScore}   Wave Bonus: +${waveBonus}`, {
      fontSize: '24px', color: '#FFE8CC', fontFamily: 'Oxanium',
    }).setOrigin(0.5).setDepth(301);

    let challengeText = null;
    if (challengeBonus > 0) {
      challengeText = s.add.text(HALF_WIDTH, 470, `Challenge Bonus: +${challengeBonus}`, {
        fontSize: '22px', color: '#44FF88', fontFamily: 'Oxanium', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(301);
    }

    const nextConfig = getWaveConfig(this.currentWave + 1);
    const nextText = s.add.text(HALF_WIDTH, 530, `Next: Wave ${this.currentWave + 1}`, {
      fontSize: '20px', color: '#AABBCC', fontFamily: 'Oxanium',
    }).setOrigin(0.5).setDepth(301);

    // Auto-dismiss after 3 seconds
    s.time.delayedCall(3000, () => {
      overlay.destroy();
      titleText.destroy();
      scoreText.destroy();
      if (challengeText) challengeText.destroy();
      nextText.destroy();
      onDone();
    });
  }
}
