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
  }

  refreshHUD() {
    const s = this.scene;
    s.scoreText.setText(`${s.currentScore}`);
    s.highScoreText.setText(`Best: ${s.highScore}`);

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
        fontSize: '14px', color: '#FFE8CC', fontFamily: GAME_FONT,
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
    const baseX = GAME_WIDTH - 340;
    const baseY = this.footerY + 26;
    const spacing = 30;

    for (let i = 0; i < MAX_MISSES; i++) {
      const cx = baseX + i * spacing;
      if (i < missed) {
        // Red X for missed
        g.lineStyle(4, 0xff4444, 1);
        g.lineBetween(cx - 8, baseY - 8, cx + 8, baseY + 8);
        g.lineBetween(cx + 8, baseY - 8, cx - 8, baseY + 8);
      } else {
        // Open circle for remaining
        g.lineStyle(3, 0xFFBB44, 0.8);
        g.strokeCircle(cx, baseY, 9);
        g.fillStyle(0xFFBB44, 0.2);
        g.fillCircle(cx, baseY, 4);
      }
    }
  }
}
