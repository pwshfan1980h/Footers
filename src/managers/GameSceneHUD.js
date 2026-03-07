/**
 * GameSceneHUD - Score, strikes, combo — displayed in a footer bar at the bottom
 */
import { GAME_FONT, MAX_MISSES, GAME_WIDTH, GAME_HEIGHT } from '../data/constants.js';

export class GameSceneHUD {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const s = this.scene;
    const footerH = 52;
    const footerY = GAME_HEIGHT - footerH;

    // Footer background
    const hudBg = s.add.graphics().setDepth(210);
    hudBg.fillStyle(s.HULL_DARK, 0.9);
    hudBg.fillRect(0, footerY, GAME_WIDTH, footerH);
    hudBg.fillStyle(s.NEON_PINK, 0.4);
    hudBg.fillRect(0, footerY, GAME_WIDTH, 2);

    // Background panels behind HUD groups
    const panels = s.add.graphics().setDepth(210.5);
    panels.fillStyle(0xffffff, 0.06);
    panels.fillRoundedRect(12, footerY + 8, 260, 36, 6);
    panels.fillRoundedRect(290, footerY + 8, 300, 36, 6);

    // Star icon next to score
    const starY = footerY + 26;
    const icons = s.add.graphics().setDepth(211);
    icons.fillStyle(0xffd700, 0.9);
    icons.fillTriangle(28, starY - 5, 23, starY + 1, 33, starY + 1);
    icons.fillTriangle(28, starY + 7, 23, starY + 1, 33, starY + 1);

    s.scoreText = s.add.text(42, footerY + 14, `${s.currentScore}`, {
      fontSize: '28px', color: '#ffd700', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setDepth(211);

    s.highScoreText = s.add.text(300, footerY + 16, `Best: ${s.highScore}`, {
      fontSize: '22px', color: '#FFBB44', fontFamily: GAME_FONT,
    }).setDepth(211);

    // Strike indicators
    this.strikeGraphics = null;
    this.footerY = footerY;

    // Wave display (left side, above footer)
    this.waveText = s.add.text(20, footerY - 36, 'Wave 1', {
      fontSize: '20px', color: '#88AACC', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setDepth(211);

    // Challenge display (center-left, above footer)
    this.challengeContainer = s.add.container(GAME_WIDTH / 2, footerY - 36).setDepth(212);
    this.challengeBg = s.add.graphics();
    this.challengeBarBg = s.add.graphics();
    this.challengeBarFill = s.add.graphics();

    this.challengeHeader = s.add.text(0, -26, 'CHALLENGE', {
      fontSize: '14px', color: '#FFBB44', fontFamily: GAME_FONT, fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.challengeText = s.add.text(0, -6, '', {
      fontSize: '18px', color: '#FFE8CC', fontFamily: GAME_FONT,
      wordWrap: { width: 360, useAdvancedWrap: true },
      align: 'center',
    }).setOrigin(0.5);
    this.challengeProgressText = s.add.text(0, 12, '', {
      fontSize: '16px', color: '#AABBCC', fontFamily: GAME_FONT,
      align: 'center',
    }).setOrigin(0.5);

    this.challengeBarWidth = 320;
    this.challengeBarHeight = 8;
    this.challengeBarY = 26;
    this.challengeTarget = 0;
    this.challengeProgressValue = 0;
    this.currentChallenge = null;

    this.challengeContainer.add([
      this.challengeBg,
      this.challengeHeader,
      this.challengeText,
      this.challengeProgressText,
      this.challengeBarBg,
      this.challengeBarFill,
    ]);
    this.challengeContainer.setVisible(false);
  }

  updateWaveDisplay(wave, challenge) {
    this.waveText.setText(`Wave ${wave}`);

    if (challenge && challenge.label) {
      this.challengeContainer.setVisible(true);
      this.challengeText.setText(challenge.label);
      this.challengeProgressText.setText('');
      this.currentChallenge = challenge;
      this.challengeTarget = challenge.target || 0;
      this.challengeProgressValue = 0;

      this.challengeBg.clear();
      const w = Math.max(300, challenge.label.length * 10 + 30);
      const h = 64;
      this.challengeBg.fillStyle(0x1A2030, 0.9);
      this.challengeBg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      this.challengeBg.lineStyle(1, 0x3A5068, 0.6);
      this.challengeBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

      this.challengeBarWidth = Math.max(260, Math.min(w - 40, 420));
      this.renderChallengeBar(0, this.challengeTarget, false, false);

      // Show the starting target immediately
      if (challenge.type === 'no_miss') {
        this.challengeProgressText.setText('No missed orders').setColor('#AABBCC');
        this.renderChallengeBar(1, 1, false, false);
      } else if (this.challengeTarget > 0) {
        this.challengeProgressText.setText(`0 / ${this.challengeTarget}`).setColor('#AABBCC');
      }
    } else {
      this.challengeContainer.setVisible(false);
      this.currentChallenge = null;
    }
  }

  updateChallengeProgress(progress, target, complete) {
    if (!this.challengeContainer.visible) return;
    const s = this.scene;

    if (typeof target === 'number') {
      this.challengeTarget = target;
    }
    this.challengeProgressValue = progress;
    const tgt = this.challengeTarget || 0;
    const type = this.currentChallenge ? this.currentChallenge.type : null;

    let progressLabel = '';
    if (complete) {
      progressLabel = 'COMPLETE!';
      this.challengeProgressText.setColor('#44FF88');
    } else if (type === 'no_miss') {
      progressLabel = progress > 0 ? 'Missed — bonus lost' : 'No missed orders';
      this.challengeProgressText.setColor(progress > 0 ? '#FF6677' : '#AABBCC');
    } else if (tgt > 0) {
      progressLabel = `${progress} / ${tgt}`;
      this.challengeProgressText.setColor('#AABBCC');
    }

    this.challengeProgressText.setText(progressLabel);
    this.renderChallengeBar(progress, tgt, complete, progressLabel.includes('lost'));

    // Subtle pop when progress changes
    this.challengeContainer.setScale(1.05);
    s.tweens.add({
      targets: this.challengeContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  setChallengeFailed(message) {
    if (!this.challengeContainer.visible) return;
    const label = message || 'Challenge failed';
    this.challengeProgressText.setText(label).setColor('#FF6677');
    this.renderChallengeBar(0, 1, false, true);
  }

  renderChallengeBar(progress, target, complete, failed) {
    const barW = this.challengeBarWidth || 300;
    const barH = this.challengeBarHeight || 8;
    const barY = this.challengeBarY || 26;

    this.challengeBarBg.clear();
    this.challengeBarBg.fillStyle(0x0F1824, 0.85);
    this.challengeBarBg.fillRoundedRect(-barW / 2, barY, barW, barH, 4);
    this.challengeBarBg.lineStyle(1, 0x3A5068, 0.8);
    this.challengeBarBg.strokeRoundedRect(-barW / 2, barY, barW, barH, 4);

    this.challengeBarFill.clear();
    const type = this.currentChallenge ? this.currentChallenge.type : null;
    let pct = target > 0 ? Math.min(1, progress / target) : (complete ? 1 : progress > 0 ? 0 : 1);
    if (type === 'no_miss' && !complete && !failed) {
      pct = 1;
    }
    const fillW = Math.max(0, barW * pct);
    const color = failed ? 0xFF6677 : complete ? 0x44FF88 : 0x66C2FF;
    const alpha = failed ? 0.7 : 0.9;
    this.challengeBarFill.fillStyle(color, alpha);
    this.challengeBarFill.fillRoundedRect(-barW / 2, barY, fillW, barH, 4);
  }

  refreshHUD() {
    const s = this.scene;
    const prevScore = this._lastScore || 0;
    s.scoreText.setText(`${s.currentScore}`);
    s.highScoreText.setText(`Best: ${s.highScore}`);

    if (s.currentScore > prevScore) {
      s.tweens.add({
        targets: s.scoreText,
        scaleX: 1.5, scaleY: 1.5,
        duration: 110,
        ease: 'Back.easeOut',
        onComplete: () => {
          s.tweens.add({ targets: s.scoreText, scaleX: 1, scaleY: 1, duration: 180, ease: 'Sine.easeOut' });
        },
      });
    }
    this._lastScore = s.currentScore;

    const missed = s.ordersMissed || 0;
    this.drawStrikeIndicators(missed);
  }

  updateComboDisplay(combo) {
    const s = this.scene;

    if (!this.comboContainer) {
      this.comboContainer = s.add.container(GAME_WIDTH - 140, this.footerY + 26).setDepth(212);
      this.comboBg = s.add.graphics();
      this.comboText = s.add.text(0, 0, '', {
        fontSize: '36px', color: '#FFBB44', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.comboLabel = s.add.text(0, 24, 'COMBO', {
        fontSize: '18px', color: '#FFE8CC', fontFamily: GAME_FONT,
      }).setOrigin(0.5);
      this.comboContainer.add([this.comboBg, this.comboText, this.comboLabel]);
    }

    if (combo < 2) {
      this.comboContainer.setVisible(false);
      return;
    }

    this.comboContainer.setVisible(true);
    this.comboText.setText(`${combo}x`);

    // Color and size escalation
    if (combo >= 15) {
      this.comboText.setColor('#FFD700');
      this.comboText.setFontSize('48px');
    } else if (combo >= 10) {
      this.comboText.setColor('#FF8844');
      this.comboText.setFontSize('42px');
    } else if (combo >= 5) {
      this.comboText.setColor('#FFBB44');
      this.comboText.setFontSize('36px');
    } else {
      this.comboText.setColor('#FFE8CC');
      this.comboText.setFontSize('32px');
    }

    // Pop animation
    this.comboContainer.setScale(1.3);
    s.tweens.add({
      targets: this.comboContainer,
      scaleX: 1, scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  drawStrikeIndicators(missed) {
    const s = this.scene;
    if (this.strikeGraphics) {
      this.strikeGraphics.destroy();
    }
    this.strikeGraphics = s.add.graphics().setDepth(211);
    const g = this.strikeGraphics;
    const baseX = GAME_WIDTH - 400;
    const baseY = this.footerY + 26;
    const spacing = 40;

    for (let i = 0; i < MAX_MISSES; i++) {
      const cx = baseX + i * spacing;
      if (i < missed) {
        // Red X for missed — larger and more alarming
        g.fillStyle(0x440000, 0.5);
        g.fillCircle(cx, baseY, 14);
        g.lineStyle(1, 0xff3333, 0.4);
        g.strokeCircle(cx, baseY, 14);
        g.lineStyle(4, 0xff2222, 1);
        g.lineBetween(cx - 9, baseY - 9, cx + 9, baseY + 9);
        g.lineBetween(cx + 9, baseY - 9, cx - 9, baseY + 9);
      } else {
        // Heart / life icon for remaining lives
        g.lineStyle(2.5, 0xFFBB44, 0.85);
        g.strokeCircle(cx, baseY, 12);
        g.fillStyle(0xFFBB44, 0.15);
        g.fillCircle(cx, baseY, 12);
        // Inner dot
        g.fillStyle(0xFFBB44, 0.7);
        g.fillCircle(cx, baseY, 5);
      }
    }
  }
}
