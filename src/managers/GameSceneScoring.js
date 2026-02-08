/**
 * GameSceneScoring - Score handling, misses, high score fanfare
 */
import { soundManager } from '../SoundManager.js';
import {
  HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT,
  MAX_MISSES, GAME_OVER_DELAY, DEFAULT_ORDER_VALUE, SCORE_MULTIPLIER,
  GAME_FONT,
} from '../data/constants.js';

export class GameSceneScoring {
  constructor(scene) {
    this.scene = scene;
  }

  handleScore(tray) {
    const s = this.scene;
    tray.scored = true;
    s.ordersCompleted++;

    const orderValue = (tray.order.totalPrice || DEFAULT_ORDER_VALUE) * s.locationModifiers.tipMult;
    s.gameMoney += orderValue;

    const scoreGain = Math.floor(orderValue * SCORE_MULTIPLIER);
    s.currentScore += scoreGain;

    const wasHighScore = s.currentScore > s.highScore;
    if (wasHighScore) {
      s.highScore = s.currentScore;
      s.saveHighScore(s.highScore);
      soundManager.fanfare();
      this.showHighScoreFanfare();
    } else {
      soundManager.score();
    }

    soundManager.chaChing();

    s.refreshHUD();
    s.ticketBar.markTicketCompleted(tray.orderNum);

    const popup = s.add.text(tray.container.x, tray.container.y - 70,
      `$${orderValue.toFixed(2)}`, {
      fontSize: '26px', color: '#0f0', fontFamily: GAME_FONT, fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    s.tweens.add({
      targets: popup, y: popup.y - 50, alpha: 0, duration: 1200,
      onComplete: () => popup.destroy(),
    });

    // Speed rating — WoW combat numbers style
    if (tray.spawnedAt) {
      const elapsed = (Date.now() - tray.spawnedAt) / 1000;
      if (s.fastestOrderThisShift == null || elapsed < s.fastestOrderThisShift) {
        s.fastestOrderThisShift = elapsed;
      }
      const rating = this.getSpeedRating(elapsed);
      if (rating) {
        const speedText = s.add.text(tray.container.x + 40, tray.container.y - 90,
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

    s.customerVessels.undockVessel(tray);

    this.resolveSequential();
  }

  getSpeedRating(seconds) {
    if (seconds <= 4) return { label: 'BLAZING!', color: '#FFD700', size: '28px' };
    if (seconds <= 8) return { label: 'SWIFT!', color: '#00FFCC', size: '24px' };
    if (seconds <= 14) return { label: 'STEADY', color: '#AADDFF', size: '18px' };
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
    s.refreshHUD();
    soundManager.buzz();

    s.ticketBar.markTicketMissed(tray.orderNum);

    s.cameras.main.shake(200, 0.005);

    const flash = s.add.rectangle(HALF_WIDTH, HALF_HEIGHT, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0.18).setDepth(200);
    s.tweens.add({
      targets: flash, alpha: 0, duration: 400,
      onComplete: () => flash.destroy(),
    });

    const miss = s.add.text(tray.container.x, tray.container.y - 40, '\u2717 MISSED!', {
      fontSize: '36px', color: '#ff3333', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    s.tweens.add({
      targets: miss, alpha: 0, y: miss.y - 60, duration: 1200,
      onComplete: () => miss.destroy(),
    });

    s.customerVessels.undockVessel(tray);

    // Game over: fired after too many missed orders
    if (s.ordersMissed >= MAX_MISSES) {
      s.isPaused = true;
      s.time.delayedCall(GAME_OVER_DELAY, () => {
        s.scene.start('GameOver', {
          totalScore: s.currentScore,
          day: s.day || 1,
          earnings: s.gameMoney,
          locationId: s.locationData?.id || null,
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
    if (s.ordersSpawned < 3) {
      s.waitingForNext = true;
      s.sequentialDelay = 0;
    }
  }
}
