import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';

/**
 * RevenueChallenges — timed revenue goals that provide optional progression.
 * Reads scene.gameMoney each frame. Challenges escalate, track in localStorage.
 */
export class RevenueChallenges {
  constructor(scene) {
    this.scene = scene;
    this.gfx = null;
    this.labelText = null;
    this.goalText = null;
    this.timerText = null;

    // Challenge definitions
    this.challenges = [
      { name: 'Lunch Rush', target: 25, timeLimit: 120 },
      { name: 'Happy Hour', target: 50, timeLimit: 100 },
      { name: 'Dinner Service', target: 100, timeLimit: 90 },
      { name: 'Late Night', target: 200, timeLimit: 80 },
      { name: 'Festival Week', target: 350, timeLimit: 70 },
      { name: 'Grand Opening', target: 500, timeLimit: 60 },
    ];

    this.currentIndex = 0;
    this.startMoney = 0;
    this.elapsed = 0;
    this.state = 'active'; // active | celebrating | resetting | done
    this.stateTimer = 0;
    this.completedSet = this.loadCompleted();

    // UI position
    this.panelX = 850;
    this.panelY = 55;
    this.panelW = 160;
    this.panelH = 72;
  }

  loadCompleted() {
    try {
      const stored = localStorage.getItem('footers_challenges');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  saveCompleted() {
    try {
      localStorage.setItem('footers_challenges', JSON.stringify([...this.completedSet]));
    } catch (e) {
      // localStorage not available
    }
  }

  create() {
    this.gfx = this.scene.add.graphics().setDepth(120);

    this.labelText = this.scene.add.text(this.panelX, this.panelY - 8, '', {
      fontSize: '13px', color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(121);

    this.goalText = this.scene.add.text(this.panelX, this.panelY + 8, '', {
      fontSize: '10px', color: '#C8A878', fontFamily: GAME_FONT,
    }).setOrigin(0.5, 0.5).setDepth(121);

    this.timerText = this.scene.add.text(this.panelX, this.panelY + 24, '', {
      fontSize: '10px', color: '#FF6B8A', fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(121);

    // Skip already completed challenges
    while (this.currentIndex < this.challenges.length && this.completedSet.has(this.currentIndex)) {
      this.currentIndex++;
    }

    if (this.currentIndex >= this.challenges.length) {
      this.state = 'done';
    } else {
      this.startChallenge();
    }
  }

  startChallenge() {
    this.startMoney = this.scene.gameMoney;
    this.elapsed = 0;
    this.state = 'active';
  }

  update(delta) {
    if (this.state === 'done') {
      this.gfx.clear();
      this.labelText.setText('');
      this.goalText.setText('');
      this.timerText.setText('');
      return;
    }

    const dt = delta / 1000;

    if (this.state === 'celebrating') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.currentIndex++;
        // Skip already completed
        while (this.currentIndex < this.challenges.length && this.completedSet.has(this.currentIndex)) {
          this.currentIndex++;
        }
        if (this.currentIndex >= this.challenges.length) {
          this.state = 'done';
        } else {
          this.startChallenge();
        }
      }
      return;
    }

    if (this.state === 'resetting') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.startChallenge();
      }
      return;
    }

    // Active state
    const challenge = this.challenges[this.currentIndex];
    if (!challenge) return;

    this.elapsed += dt;
    const earned = this.scene.gameMoney - this.startMoney;
    const remaining = Math.max(0, challenge.timeLimit - this.elapsed);
    const progress = Math.min(1, earned / challenge.target);

    // Check completion
    if (earned >= challenge.target) {
      this.completedSet.add(this.currentIndex);
      this.saveCompleted();
      this.state = 'celebrating';
      this.stateTimer = 3;

      soundManager.fanfare();
      this.showCelebration(challenge.name);
      return;
    }

    // Check timeout
    if (remaining <= 0) {
      this.state = 'resetting';
      this.stateTimer = 2;
      this.showTimeout();
      return;
    }

    // Render UI
    this.renderPanel(challenge, progress, remaining, earned);
  }

  renderPanel(challenge, progress, remaining, earned) {
    const g = this.gfx;
    g.clear();

    const px = this.panelX - this.panelW / 2;
    const py = this.panelY - this.panelH / 2;

    // Panel background (warm wood + neon pink border)
    g.fillStyle(0x3A2218, 0.85);
    g.fillRoundedRect(px, py, this.panelW, this.panelH, 6);
    g.lineStyle(1, 0xFF6B8A, 0.6);
    g.strokeRoundedRect(px, py, this.panelW, this.panelH, 6);

    // Progress bar background
    const barX = px + 8;
    const barY = py + this.panelH - 16;
    const barW = this.panelW - 16;
    const barH = 6;

    g.fillStyle(0x2A1810, 0.8);
    g.fillRect(barX, barY, barW, barH);

    // Progress bar fill (neon pink)
    g.fillStyle(0xFF6B8A, 0.9);
    g.fillRect(barX, barY, barW * progress, barH);

    // Update text
    this.labelText.setText(challenge.name);
    this.goalText.setText(`$${earned.toFixed(0)} / $${challenge.target}`);
    this.timerText.setText(`${Math.ceil(remaining)}s`);
  }

  showCelebration(name) {
    this.gfx.clear();
    this.labelText.setText('');
    this.goalText.setText('');
    this.timerText.setText('');

    // Gold flash + floating text
    const celebText = this.scene.add.text(512, 200, `${name} Complete!`, {
      fontSize: '32px', color: '#FFD700', fontFamily: GAME_FONT,
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(150);

    this.scene.tweens.add({
      targets: celebText,
      scale: { from: 0.5, to: 1.1 },
      alpha: { from: 1, to: 0 },
      y: celebText.y - 80,
      duration: 2500,
      ease: 'Power2.easeOut',
      onComplete: () => celebText.destroy(),
    });

    // Particle burst
    if (this.scene.particleManager) {
      this.scene.particleManager.orderCompleted(512, 200);
    }
  }

  showTimeout() {
    this.gfx.clear();
    this.labelText.setText('');
    this.goalText.setText('');
    this.timerText.setText('');

    const timeoutText = this.scene.add.text(512, 200, "Time's up! Retrying...", {
      fontSize: '22px', color: '#C8A878', fontFamily: GAME_FONT,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(150);

    this.scene.tweens.add({
      targets: timeoutText,
      alpha: 0,
      y: timeoutText.y - 40,
      duration: 1800,
      onComplete: () => timeoutText.destroy(),
    });
  }
}
