/**
 * SettingsMenu - Overlay with volume controls and game options
 */

import { musicManager } from '../MusicManager.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT, GAME_WIDTH, GAME_HEIGHT, HALF_WIDTH, HALF_HEIGHT } from '../data/constants.js';
import { gameState } from '../data/GameState.js';

export class SettingsMenu {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.container = null;
    this.overlay = null;

    // Volume settings (0-1)
    this.musicVolume = 1.0;
    this.sfxVolume = 1.0;
  }

  create() {
    // Create overlay background
    this.overlay = this.scene.add.graphics().setDepth(200).setVisible(false);

    // Create container for all settings UI
    this.container = this.scene.add.container(0, 0).setDepth(201).setVisible(false);

    // Dedicated camera for settings UI — no post-processing shaders.
    this.settingsCamera = this.scene.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.settingsCamera.setVisible(false);

    // Main camera skips settings objects entirely
    this.scene.cameras.main.ignore([this.overlay, this.container]);

    this.buildUI();
  }

  buildUI() {
    const centerX = HALF_WIDTH;
    const centerY = HALF_HEIGHT;
    const panelWidth = 500;
    const panelHeight = 500;

    // Panel background
    const panel = this.scene.add.graphics();

    // Dark panel with border
    panel.fillStyle(0x1a1a25, 0.95);
    panel.fillRoundedRect(centerX - panelWidth/2, centerY - panelHeight/2, panelWidth, panelHeight, 12);

    // Border
    panel.lineStyle(3, 0x00ddee, 0.8);
    panel.strokeRoundedRect(centerX - panelWidth/2, centerY - panelHeight/2, panelWidth, panelHeight, 12);

    this.container.add(panel);

    // Title
    const title = this.scene.add.text(centerX, centerY - 220, 'SETTINGS', {
      fontSize: '36px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#00ddee'
    }).setOrigin(0.5);
    this.container.add(title);

    // Music Volume Section
    const musicLabel = this.scene.add.text(centerX - 180, centerY - 140, 'Music Volume', {
      fontSize: '20px',
      fontFamily: GAME_FONT,
      color: '#ffffff'
    });
    this.container.add(musicLabel);

    // Music slider
    this.musicSlider = this.createSlider(centerX, centerY - 100, this.musicVolume, (value) => {
      this.musicVolume = value;
      musicManager.setVolume(value);
    });

    // SFX Volume Section
    const sfxLabel = this.scene.add.text(centerX - 180, centerY - 40, 'SFX Volume', {
      fontSize: '20px',
      fontFamily: GAME_FONT,
      color: '#ffffff'
    });
    this.container.add(sfxLabel);

    // SFX slider
    this.sfxSlider = this.createSlider(centerX, centerY, this.sfxVolume, (value) => {
      this.sfxVolume = value;
      soundManager.setVolume(value);
      // Test sound when adjusting
      if (soundManager.ctx) {
        soundManager.plop();
      }
    });

    // CRT Shader Toggle
    const crtEnabled = localStorage.getItem('footers_crt') !== 'false';
    const crtLabel = this.scene.add.text(centerX - 180, centerY + 50, 'CRT Shader', {
      fontSize: '20px',
      fontFamily: GAME_FONT,
      color: '#ffffff'
    });
    this.container.add(crtLabel);

    this.crtToggle = this.scene.add.text(centerX + 80, centerY + 50, crtEnabled ? 'ON' : 'OFF', {
      fontSize: '20px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: crtEnabled ? '#44ff88' : '#ff6666',
      backgroundColor: crtEnabled ? '#1a3a2a' : '#3a1a1a',
      padding: { x: 16, y: 6 },
    }).setInteractive({ useHandCursor: true });
    this.container.add(this.crtToggle);

    this.crtToggle.on('pointerover', () => this.crtToggle.setScale(1.05));
    this.crtToggle.on('pointerout', () => this.crtToggle.setScale(1.0));

    this.crtToggle.on('pointerdown', () => {
      const nowEnabled = localStorage.getItem('footers_crt') !== 'false';
      const newVal = !nowEnabled;
      localStorage.setItem('footers_crt', newVal ? 'true' : 'false');
      this.crtToggle.setText(newVal ? 'ON' : 'OFF');
      this.crtToggle.setColor(newVal ? '#44ff88' : '#ff6666');
      this.crtToggle.setBackgroundColor(newVal ? '#1a3a2a' : '#3a1a1a');

      this.showRestartNote();

      soundManager.init();
      soundManager.plop();
    });

    // === RESET ALL DATA ===
    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x444455, 0.5);
    divider.lineBetween(centerX - 200, centerY + 95, centerX + 200, centerY + 95);
    this.container.add(divider);

    // Warning icon + label
    const resetLabel = this.scene.add.text(centerX - 180, centerY + 108, '\u26A0  Danger Zone', {
      fontSize: '16px',
      fontFamily: GAME_FONT,
      color: '#ff6666'
    });
    this.container.add(resetLabel);

    // Reset button
    this.resetBtn = this.scene.add.text(centerX, centerY + 145, 'RESET ALL DATA', {
      fontSize: '18px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#ff4444',
      backgroundColor: '#3a1a1a',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.container.add(this.resetBtn);

    this.resetConfirmPending = false;
    this.resetConfirmTimer = null;

    this.resetBtn.on('pointerover', () => this.resetBtn.setScale(1.05));
    this.resetBtn.on('pointerout', () => this.resetBtn.setScale(1.0));

    this.resetBtn.on('pointerdown', () => {
      soundManager.init();
      if (!this.resetConfirmPending) {
        // First click — ask for confirmation
        this.resetConfirmPending = true;
        this.resetBtn.setText('\u26A0 ARE YOU SURE? CLICK AGAIN \u26A0');
        this.resetBtn.setColor('#ffcc00');
        this.resetBtn.setBackgroundColor('#4a3a10');

        // Auto-revert after 4 seconds
        this.resetConfirmTimer = this.scene.time.delayedCall(4000, () => {
          this.cancelResetConfirm();
        });

        soundManager.ding();
      } else {
        // Second click — perform the reset
        this.resetConfirmPending = false;
        if (this.resetConfirmTimer) {
          this.resetConfirmTimer.remove();
          this.resetConfirmTimer = null;
        }

        // Clear all game localStorage keys
        localStorage.removeItem('footers_gamestate');
        localStorage.removeItem('footers_crt');
        localStorage.removeItem('footers_highscore');
        localStorage.removeItem('footers_challenges');

        // Reset in-memory state
        gameState.reset();

        // Visual feedback
        this.resetBtn.setText('\u2713 DATA CLEARED');
        this.resetBtn.setColor('#44ff88');
        this.resetBtn.setBackgroundColor('#1a3a2a');
        this.resetBtn.disableInteractive();

        soundManager.cancelSound();

        // Restart the game from BootScene after brief delay
        this.scene.time.delayedCall(1200, () => {
          musicManager.stop();
          this.scene.scene.start('Boot');
        });
      }
    });

    // Close button
    const closeBtn = this.scene.add.text(centerX, centerY + 195, 'CLOSE (ESC)', {
      fontSize: '24px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#44ff88'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      closeBtn.setColor('#88ffbb');
      closeBtn.setScale(1.05);
    });

    closeBtn.on('pointerout', () => {
      closeBtn.setColor('#44ff88');
      closeBtn.setScale(1.0);
    });

    closeBtn.on('pointerdown', () => {
      this.close();
    });

    this.container.add(closeBtn);

    // Instructions
    const instructions = this.scene.add.text(centerX, centerY + 235, 'Press ESC to toggle settings', {
      fontSize: '14px',
      fontFamily: GAME_FONT,
      color: '#888888'
    }).setOrigin(0.5);
    this.container.add(instructions);
  }

  cancelResetConfirm() {
    if (this.resetConfirmPending) {
      this.resetConfirmPending = false;
      if (this.resetConfirmTimer) {
        this.resetConfirmTimer.remove();
        this.resetConfirmTimer = null;
      }
      if (this.resetBtn) {
        this.resetBtn.setText('RESET ALL DATA');
        this.resetBtn.setColor('#ff4444');
        this.resetBtn.setBackgroundColor('#3a1a1a');
      }
    }
  }

  showRestartNote() {
    if (!this.restartNote) {
      this.restartNote = this.scene.add.text(HALF_WIDTH, HALF_HEIGHT + 175, 'Change takes effect on next scene load.', {
        fontSize: '14px',
        fontFamily: GAME_FONT,
        color: '#ffcc44'
      }).setOrigin(0.5);
      this.container.add(this.restartNote);
    }
  }

  createSlider(x, y, initialValue, onChange) {
    const sliderWidth = 300;
    const sliderHeight = 8;

    // Slider track
    const track = this.scene.add.graphics();
    track.fillStyle(0x3a3a4a, 1);
    track.fillRoundedRect(x - sliderWidth/2, y - sliderHeight/2, sliderWidth, sliderHeight, 4);
    this.container.add(track);

    // Slider fill (shows current value)
    const fill = this.scene.add.graphics();
    this.container.add(fill);

    // Slider handle
    const handle = this.scene.add.circle(
      x - sliderWidth/2 + sliderWidth * initialValue,
      y,
      14,
      0x00ddee
    ).setInteractive({ draggable: true, useHandCursor: true });

    this.container.add(handle);

    // Value text
    const valueText = this.scene.add.text(x + sliderWidth/2 + 30, y, Math.round(initialValue * 100) + '%', {
      fontSize: '18px',
      fontFamily: GAME_FONT,
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.container.add(valueText);

    const updateSlider = (handleX) => {
      const minX = x - sliderWidth/2;
      const maxX = x + sliderWidth/2;
      const clampedX = Math.max(minX, Math.min(maxX, handleX));

      handle.x = clampedX;

      const value = (clampedX - minX) / sliderWidth;

      // Update fill
      fill.clear();
      fill.fillStyle(0x00ddee, 0.6);
      fill.fillRoundedRect(minX, y - sliderHeight/2, (clampedX - minX), sliderHeight, 4);

      // Update value text
      valueText.setText(Math.round(value * 100) + '%');

      // Callback
      if (onChange) onChange(value);
    };

    handle.on('drag', (pointer) => {
      updateSlider(pointer.x);
    });

    // Click on track to jump
    track.setInteractive(
      new Phaser.Geom.Rectangle(x - sliderWidth/2, y - 15, sliderWidth, 30),
      Phaser.Geom.Rectangle.Contains
    );

    track.on('pointerdown', (pointer) => {
      updateSlider(pointer.x);
    });

    // Initial fill
    updateSlider(handle.x);

    return { track, fill, handle, valueText };
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.scene.isPaused = true;

    // Draw overlay (high opacity hides unprocessed scene on settings camera)
    this.overlay.clear();
    this.overlay.fillStyle(0x000000, 0.92);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setVisible(true);

    this.container.setVisible(true);
    this.settingsCamera.setVisible(true);

    // Play open sound
    soundManager.init();
    soundManager.ding();
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.scene.isPaused = false;

    // Reset any pending confirmation
    this.cancelResetConfirm();

    this.overlay.setVisible(false);
    this.container.setVisible(false);
    this.settingsCamera.setVisible(false);

    // Play close sound
    soundManager.cancelSound();
  }

  getSFXVolume() {
    return this.sfxVolume;
  }
}
