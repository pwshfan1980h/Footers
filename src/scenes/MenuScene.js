import Phaser from 'phaser';
import { soundManager } from '../SoundManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // === COLOR PALETTE (diner theme) ===
    this.SPACE_BLACK = 0x0a0a12;
    this.SPACE_DEEP = 0x050510;
    this.NEON_PINK = 0xFF6B8A;
    this.WARM_CREAM = 0xFFE8CC;
    this.WALNUT_DARK = 0x3A2218;
    this.WALNUT_MID = 0x5A3A28;
    this.CHROME_MID = 0x5a5a68;

    // --- Deep space background (shared across all phases) ---
    this.add.rectangle(512, 384, 1024, 768, this.SPACE_BLACK);
    this.starGfx = this.add.graphics().setDepth(0);
    this.drawStarfield(this.starGfx);

    // Twinkling starfield
    this.tweens.add({
      targets: this.starGfx,
      alpha: 0.7,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- State machine ---
    this.phase = 0;
    this.phaseTimer = 0;
    this.typewriterIndex = 0;
    this.typewriterText = '';
    this.phaseContainer = null;
    this.textObj = null;
    this.skipped = false;

    // Phase definitions
    this.phases = [
      {
        duration: 4000,
        text: 'In the aftermath of the singularity, an AI was born...',
        draw: (container) => this.drawPhase0(container),
      },
      {
        duration: 4000,
        text: 'It had one directive: make the perfect sandwich.',
        draw: (container) => this.drawPhase1(container),
      },
      {
        duration: 4000,
        text: 'Word spread fast across the galaxy...',
        draw: (container) => this.drawPhase2(container),
      },
    ];

    // Start first phase
    this.startPhase(0);

    // Click to skip montage
    this.input.on('pointerdown', () => {
      if (this.phase < 3) {
        this.skipToTitle();
      }
    });

    // Also allow Enter/Space to skip
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.phase < 3) this.skipToTitle();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.phase < 3) this.skipToTitle();
    });
  }

  startPhase(index) {
    if (index >= this.phases.length) {
      this.showTitleScreen();
      return;
    }

    this.phase = index;
    this.phaseTimer = 0;
    this.typewriterIndex = 0;
    this.typewriterText = this.phases[index].text;

    // Clean up previous phase
    if (this.phaseContainer) {
      this.phaseContainer.destroy();
    }

    this.phaseContainer = this.add.container(0, 0).setDepth(5).setAlpha(0);

    // Draw phase visuals
    this.phases[index].draw(this.phaseContainer);

    // Create text object for typewriter
    this.textObj = this.add.text(512, 650, '', {
      fontSize: '20px',
      color: '#FFE8CC',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.phaseContainer.add(this.textObj);

    // Fade in
    this.tweens.add({
      targets: this.phaseContainer,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });

    // Typewriter start (after 500ms fade)
    this.time.delayedCall(500, () => {
      if (this.phase !== index) return;
      this.textObj.setAlpha(1);
      this.typewriterTimer = this.time.addEvent({
        delay: 35,
        callback: () => {
          if (this.phase !== index) return;
          this.typewriterIndex++;
          if (this.typewriterIndex <= this.typewriterText.length) {
            this.textObj.setText(this.typewriterText.substring(0, this.typewriterIndex));
          }
        },
        repeat: this.typewriterText.length - 1,
      });
    });

    // Auto-advance after duration
    this.phaseAdvanceTimer = this.time.delayedCall(this.phases[index].duration, () => {
      if (this.phase !== index) return;
      // Fade out then next phase
      this.tweens.add({
        targets: this.phaseContainer,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          if (this.phase === index) {
            this.startPhase(index + 1);
          }
        },
      });
    });
  }

  skipToTitle() {
    if (this.skipped) return;
    this.skipped = true;

    // Cancel timers
    if (this.typewriterTimer) this.typewriterTimer.destroy();
    if (this.phaseAdvanceTimer) this.phaseAdvanceTimer.destroy();
    this.tweens.killAll();

    // Clean up phase container
    if (this.phaseContainer) {
      this.phaseContainer.destroy();
      this.phaseContainer = null;
    }

    // Re-add starfield tween (killed above)
    this.starGfx.setAlpha(1);
    this.tweens.add({
      targets: this.starGfx,
      alpha: 0.7,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.phase = 3;
    this.showTitleScreen();
  }

  showTitleScreen() {
    this.phase = 3;

    // Cancel timers
    if (this.typewriterTimer) this.typewriterTimer.destroy();
    if (this.phaseAdvanceTimer) this.phaseAdvanceTimer.destroy();

    if (this.phaseContainer) {
      this.phaseContainer.destroy();
    }

    const container = this.add.container(0, 0).setDepth(5).setAlpha(0);

    // Nebula wisps
    const nebG = this.add.graphics();
    nebG.fillStyle(0x442266, 0.1);
    nebG.fillEllipse(300, 200, 500, 250);
    nebG.fillStyle(0x663344, 0.08);
    nebG.fillEllipse(700, 300, 400, 200);
    container.add(nebG);

    // Draw a food truckship in the background
    const truckG = this.add.graphics();
    this.drawFoodTruckship(truckG, 512, 300, 1.5);
    container.add(truckG);

    // Title shadow
    const titleShadow = this.add.text(514, 402, 'FOOTERS', {
      fontSize: '72px', color: '#000000', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5).setAlpha(0.4);
    container.add(titleShadow);

    // Main title — neon pink
    const title = this.add.text(512, 400, 'FOOTERS', {
      fontSize: '72px', color: '#FF6B8A', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5);
    container.add(title);

    // Title glow pulse
    const titleGlow = this.add.text(512, 400, 'FOOTERS', {
      fontSize: '72px', color: '#FF8FA8', fontFamily: 'Bungee, Arial Black, Arial',
    }).setOrigin(0.5).setAlpha(0);
    container.add(titleGlow);

    this.tweens.add({
      targets: titleGlow,
      alpha: 0.35,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(512, 468, 'Space Truckship', {
      fontSize: '22px', color: '#FFE8CC', fontFamily: 'Georgia, serif', fontStyle: 'italic',
    }).setOrigin(0.5);
    container.add(subtitle);

    // --- Instructions panel (also the start button) ---
    const panelW = 484;
    const panelH = 100;
    const panelX = 270;
    const panelY = 520;

    const panelG = this.add.graphics();
    panelG.fillStyle(this.WALNUT_MID, 0.8);
    panelG.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelG.lineStyle(2, this.NEON_PINK, 0.6);
    panelG.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelG.lineStyle(1, this.NEON_PINK, 0.2);
    panelG.strokeRoundedRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 8);
    container.add(panelG);

    const instrLines = [
      'Click ingredients from bins, then click a tray to place.',
      'Drag completed trays onto the belt before time runs out!',
      'SPACE = speed up belt \u00b7 SHIFT = slow down',
      '',
      'Click here to start!'
    ];
    const instrText = this.add.text(512, panelY + panelH / 2, instrLines.join('\n'), {
      fontSize: '13px', color: '#FFE8CC', fontFamily: 'Arial',
      align: 'center', lineSpacing: 5,
    }).setOrigin(0.5);
    container.add(instrText);

    // Hit area covers the instruction panel
    const panelHit = this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(panelHit);

    // Hover highlight
    const panelHighlight = this.add.graphics().setAlpha(0);
    panelHighlight.fillStyle(this.NEON_PINK, 0.1);
    panelHighlight.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    container.add(panelHighlight);

    panelHit.on('pointerover', () => {
      panelHighlight.setAlpha(1);
      instrText.setColor('#FFFFFF');
    });
    panelHit.on('pointerout', () => {
      panelHighlight.setAlpha(0);
      instrText.setColor('#FFE8CC');
    });
    panelHit.on('pointerdown', () => {
      soundManager.init();
      soundManager.ding();
      this.scene.start('Game');
    });

    // Subtle pulse on the panel border
    this.tweens.add({
      targets: panelG,
      alpha: { from: 1, to: 0.85 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Version
    const ver = this.add.text(512, 738, 'v0.4', {
      fontSize: '11px', color: '#334455', fontFamily: 'Arial',
    }).setOrigin(0.5);
    container.add(ver);

    // Fade in
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });
  }

  // ============ PHASE DRAWING METHODS ============

  drawPhase0(container) {
    // "The Birth" — swirling vortex with small truckship rocketing out
    const g = this.add.graphics();

    // Vortex/singularity — concentric rings
    for (let r = 120; r > 5; r -= 8) {
      const intensity = 1 - r / 120;
      g.fillStyle(0xFF6B8A, intensity * 0.15);
      g.fillCircle(512, 320, r);
    }
    // Core glow
    g.fillStyle(0xFFEE88, 0.6);
    g.fillCircle(512, 320, 12);
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillCircle(512, 320, 5);

    // Outer halo
    g.lineStyle(2, 0xFF6B8A, 0.2);
    g.strokeCircle(512, 320, 130);
    g.lineStyle(1, 0xFF6B8A, 0.1);
    g.strokeCircle(512, 320, 160);

    container.add(g);

    // Small truckship silhouette rocketing away from the vortex
    const truckG = this.add.graphics();
    this.drawFoodTruckship(truckG, 580, 260, 0.4);
    container.add(truckG);

    // Engine trail from vortex to ship
    const trailG = this.add.graphics();
    for (let i = 0; i < 15; i++) {
      const t = i / 15;
      const tx = 520 + t * 55;
      const ty = 315 - t * 50;
      trailG.fillStyle(0xFFEE88, 0.4 * (1 - t));
      trailG.fillCircle(tx, ty, 3 - t * 2);
    }
    container.add(trailG);
  }

  drawPhase1(container) {
    // "The Truckship" — larger detailed ship at center with streak lines
    const g = this.add.graphics();

    // Motion streak lines
    g.lineStyle(1, 0x8888aa, 0.2);
    for (let i = 0; i < 20; i++) {
      const y = 100 + Math.random() * 400;
      const x = Math.random() * 400;
      g.lineBetween(x, y, x + 80 + Math.random() * 120, y);
    }
    container.add(g);

    // Large truckship at center
    const truckG = this.add.graphics();
    this.drawFoodTruckship(truckG, 512, 310, 2.5);
    container.add(truckG);

    // Engine glow trail
    const trailG = this.add.graphics();
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      trailG.fillStyle(0xFFEE88, 0.5 * (1 - t));
      trailG.fillCircle(512 - 155 - t * 80, 310 + (Math.random() - 0.5) * 10, 6 - t * 4);
    }
    container.add(trailG);
  }

  drawPhase2(container) {
    // "Open for Business" — asteroid/station + docked ship + queued vessels
    const g = this.add.graphics();

    // Large asteroid on right
    g.fillStyle(0x444455, 1);
    g.fillCircle(780, 300, 100);
    g.fillStyle(0x555566, 0.5);
    g.fillCircle(760, 280, 80);
    // Craters
    g.fillStyle(0x333344, 0.5);
    g.fillCircle(810, 320, 20);
    g.fillCircle(760, 260, 12);
    g.fillCircle(800, 280, 8);

    container.add(g);

    // Docked truckship with service window open
    const truckG = this.add.graphics();
    this.drawFoodTruckship(truckG, 640, 300, 1.8);
    container.add(truckG);

    // Queued vessel silhouettes
    const vesselG = this.add.graphics();
    const queuePositions = [
      { x: 480, y: 280, s: 0.5 },
      { x: 400, y: 310, s: 0.4 },
      { x: 330, y: 260, s: 0.35 },
      { x: 270, y: 300, s: 0.3 },
    ];
    queuePositions.forEach(({ x, y, s }) => {
      // Simple vessel shape
      vesselG.fillStyle(0x6688aa, 0.5);
      vesselG.beginPath();
      vesselG.moveTo(x + 15 * s, y);
      vesselG.lineTo(x - 10 * s, y - 8 * s);
      vesselG.lineTo(x - 15 * s, y);
      vesselG.lineTo(x - 10 * s, y + 8 * s);
      vesselG.closePath();
      vesselG.fillPath();
      // Engine dot
      vesselG.fillStyle(0xFFEE88, 0.4);
      vesselG.fillCircle(x - 15 * s, y, 2 * s);
    });
    container.add(vesselG);
  }

  // ============ SHARED DRAWING HELPERS ============

  drawStarfield(g) {
    const stars = [];
    // Generate deterministic starfield
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    for (let i = 0; i < 80; i++) {
      stars.push({
        x: rand() * 1024,
        y: rand() * 768,
        size: 0.5 + rand() * 2.5,
        alpha: 0.3 + rand() * 0.7,
      });
    }

    stars.forEach(star => {
      const color = rand() > 0.7 ? 0xaaddff : 0xffffff;
      g.fillStyle(color, star.alpha);
      g.fillCircle(star.x, star.y, star.size);
    });
  }

  drawFoodTruckship(g, cx, cy, scale) {
    const s = scale;

    // Hull — rounded rectangle shape
    g.fillStyle(0x7A5A3A, 1);
    g.fillRoundedRect(cx - 60 * s, cy - 20 * s, 120 * s, 40 * s, 8 * s);

    // Awning — striped trapezoid on top
    g.fillStyle(0xCC3333, 0.9);
    g.beginPath();
    g.moveTo(cx - 30 * s, cy - 20 * s);
    g.lineTo(cx - 20 * s, cy - 35 * s);
    g.lineTo(cx + 40 * s, cy - 35 * s);
    g.lineTo(cx + 50 * s, cy - 20 * s);
    g.closePath();
    g.fillPath();
    // White stripes on awning
    g.fillStyle(0xFFFFFF, 0.3);
    for (let x = -25; x < 45; x += 12) {
      g.fillRect(cx + x * s, cy - 34 * s, 4 * s, 14 * s);
    }

    // Service window — warm yellow glow
    g.fillStyle(0xFFDD88, 0.9);
    g.fillRoundedRect(cx + 5 * s, cy - 14 * s, 35 * s, 20 * s, 3 * s);
    // Window glow halo
    g.fillStyle(0xFFDD88, 0.2);
    g.fillRoundedRect(cx + 2 * s, cy - 17 * s, 41 * s, 26 * s, 5 * s);

    // "FOOTERS" text on hull (tiny)
    if (scale >= 1.5) {
      const nameText = this.add.text(cx - 25 * s, cy + 5 * s, 'FOOTERS', {
        fontSize: `${8 * s}px`, color: '#FFE8CC', fontFamily: 'Arial', fontStyle: 'bold',
      });
      // Can't add Phaser text to graphics, so we add it separately
      if (this.phaseContainer) {
        this.phaseContainer.add(nameText);
      }
    }

    // Engine — glowing circle at back
    g.fillStyle(0x4488FF, 0.6);
    g.fillCircle(cx - 60 * s, cy, 8 * s);
    g.fillStyle(0x88CCFF, 0.8);
    g.fillCircle(cx - 60 * s, cy, 4 * s);

    // Landing gear — small circles underneath
    g.fillStyle(0x555566, 0.8);
    g.fillCircle(cx - 30 * s, cy + 22 * s, 4 * s);
    g.fillCircle(cx + 30 * s, cy + 22 * s, 4 * s);
  }
}
