/**
 * GameSceneScoring - Score handling, misses, high score fanfare
 */
import { soundManager } from '../SoundManager.js';
import {
  HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT,
  MAX_MISSES, GAME_OVER_DELAY, DEFAULT_ORDER_VALUE, SCORE_MULTIPLIER,
  GAME_FONT, SEQUENTIAL_ORDER_CAP,
} from '../data/constants.js';

export class GameSceneScoring {
  constructor(scene) {
    this.scene = scene;
  }

  handleScore(tray) {
    const s = this.scene;
    tray.scored = true;
    s.ordersCompleted++;

    const orderValue = (tray.order.totalPrice || DEFAULT_ORDER_VALUE);
    const baseScore = Math.floor(orderValue * SCORE_MULTIPLIER);

    // Speed bonus: 1x (slow) to 4x (instant), based on fraction of patience used
    let speedMult = 1;
    let elapsed = null;
    const customer = s.customerManager.customers.find(c => c.tray === tray);
    if (tray.spawnedAt && customer && customer.patienceMax > 0) {
      elapsed = (Date.now() - tray.spawnedAt) / 1000;
      const fraction = Math.min(1, Math.max(0, elapsed / customer.patienceMax));
      // 4x at fraction=0, 1x at fraction=1, quadratic curve for generous mid-range
      speedMult = 1 + 3 * Math.pow(1 - fraction, 2);
    }

    const scoreGain = Math.floor(baseScore * speedMult);
    s.currentScore += scoreGain;

    if (elapsed != null && (s.fastestOrderThisShift == null || elapsed < s.fastestOrderThisShift)) {
      s.fastestOrderThisShift = elapsed;
    }

    const wasHighScore = s.currentScore > s.highScore;
    if (wasHighScore) {
      s.highScore = s.currentScore;
      s.saveHighScore(s.highScore);
      soundManager.fanfare();
      this.showHighScoreFanfare();
    } else if (speedMult >= 3.5) {
      soundManager.sellBlazing();
    } else if (speedMult >= 2.5) {
      soundManager.sellSwift();
    } else if (speedMult >= 1.5) {
      soundManager.sellSteady();
    } else {
      soundManager.score();
    }

    soundManager.chaChing();

    s.refreshHUD();
    s.ticketBar.markTicketCompleted(tray.orderNum);

    // Score popup with multiplier info
    const multLabel = speedMult >= 3.5 ? `x${speedMult.toFixed(1)}!!` : speedMult >= 2 ? `x${speedMult.toFixed(1)}!` : speedMult > 1.1 ? `x${speedMult.toFixed(1)}` : '';
    const popupText = multLabel ? `+${scoreGain} ${multLabel}` : `+${scoreGain}`;
    const popupColor = speedMult >= 3.5 ? '#FFD700' : speedMult >= 2 ? '#00FFCC' : '#0f0';
    const popupSize = speedMult >= 3.5 ? '32px' : speedMult >= 2 ? '28px' : '26px';

    const popup = s.add.text(tray.container.x, tray.container.y - 110,
      popupText, {
      fontSize: popupSize, color: popupColor, fontFamily: GAME_FONT, fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    s.tweens.add({
      targets: popup, y: popup.y - 50, alpha: 0, duration: 1200,
      onComplete: () => popup.destroy(),
    });

    // Speed rating — WoW combat numbers style
    if (elapsed != null) {
      const rating = this.getSpeedRating(speedMult);
      if (rating) {
        const speedText = s.add.text(tray.container.x + 60, tray.container.y - 130,
          rating.label, {
          fontSize: rating.size, color: rating.color, fontFamily: GAME_FONT, fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(101).setScale(0.3);

        s.tweens.add({
          targets: speedText,
          scaleX: 1.2, scaleY: 1.2,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            s.tweens.add({
              targets: speedText,
              scaleX: 1, scaleY: 1, y: speedText.y - 60, alpha: 0,
              duration: 1400,
              ease: 'Power2.easeOut',
              onComplete: () => speedText.destroy(),
            });
          },
        });
      }
    }

    s.customerManager.dismissCustomer(tray);

    // Update next-key prompt (may shift to next active tray)
    if (s.interactionManager && s.interactionManager.updateNextKeyPrompt) {
      s.interactionManager.updateNextKeyPrompt();
    }

    this.resolveSequential();
  }

  getSpeedRating(speedMult) {
    if (speedMult >= 3.5) return { label: 'BLAZING!', color: '#FFD700', size: '28px' };
    if (speedMult >= 2.5) return { label: 'SWIFT!', color: '#00FFCC', size: '24px' };
    if (speedMult >= 1.5) return { label: 'STEADY', color: '#AADDFF', size: '18px' };
    return null;
  }

  showHighScoreFanfare() {
    const s = this.scene;
    const fanfare = s.add.text(HALF_WIDTH, 200, 'NEW HIGH SCORE!', {
      fontSize: '48px',
      color: '#FFD700',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(150);

    s.tweens.add({
      targets: fanfare,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: fanfare.y - 100,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => fanfare.destroy()
    });

    s.particleManager.orderCompleted(HALF_WIDTH, 200);
  }

  handleMiss(tray) {
    const s = this.scene;
    if (s.isPaused) return;
    s.ordersMissed++;

    // Reset combo on miss
    s.combo = 0;
    s.comboTimer = 0;
    s.hudManager.updateComboDisplay(0);

    s.refreshHUD();
    soundManager.buzz();

    s.ticketBar.markTicketMissed(tray.orderNum);

    s.cameras.main.shake(200, 0.005);

    const flash = s.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0.18).setDepth(200);
    s.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => flash.destroy(),
    });

    const miss = s.add.text(tray.container.x, tray.container.y - 80, '\u2717 MISSED!', {
      fontSize: '36px', color: '#ff3333', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    s.tweens.add({
      targets: miss, alpha: 0, y: miss.y - 60, duration: 1200,
      onComplete: () => miss.destroy(),
    });

    s.customerManager.dismissCustomer(tray);

    // Update next-key prompt
    if (s.interactionManager && s.interactionManager.updateNextKeyPrompt) {
      s.interactionManager.updateNextKeyPrompt();
    }

    // Game over: fired after too many missed orders
    if (s.ordersMissed >= MAX_MISSES) {
      s.isPaused = true;
      s.time.delayedCall(GAME_OVER_DELAY, () => {
        s.scene.start('GameOver', {
          totalScore: s.currentScore,
          ordersCompleted: s.ordersCompleted,
          ordersMissed: s.ordersMissed,
        });
      });
      return;
    }

    this.resolveSequential();
  }

  resolveSequential() {
    const s = this.scene;
    if (s.ordersSpawned < SEQUENTIAL_ORDER_CAP) {
      s.waitingForNext = true;
      s.sequentialDelay = 0;
    }
  }
}
