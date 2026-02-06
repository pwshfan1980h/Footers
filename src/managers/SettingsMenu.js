/**
 * SettingsMenu - Overlay with volume controls and game options
 */

import { musicManager } from '../MusicManager.js';
import { soundManager } from '../SoundManager.js';

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

    this.buildUI();
  }

  buildUI() {
    const centerX = 512;
    const centerY = 384;
    const panelWidth = 500;
    const panelHeight = 400;

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
    const title = this.scene.add.text(centerX, centerY - 160, 'SETTINGS', {
      fontSize: '36px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#00ddee'
    }).setOrigin(0.5);
    this.container.add(title);

    // Music Volume Section
    const musicLabel = this.scene.add.text(centerX - 180, centerY - 80, 'Music Volume', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.container.add(musicLabel);

    // Music slider
    this.musicSlider = this.createSlider(centerX, centerY - 40, this.musicVolume, (value) => {
      this.musicVolume = value;
      musicManager.setVolume(value);
    });

    // SFX Volume Section
    const sfxLabel = this.scene.add.text(centerX - 180, centerY + 20, 'SFX Volume', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    this.container.add(sfxLabel);

    // SFX slider
    this.sfxSlider = this.createSlider(centerX, centerY + 60, this.sfxVolume, (value) => {
      this.sfxVolume = value;
      // Test sound when adjusting
      if (soundManager.ctx) {
        soundManager.plop();
      }
    });

    // Close button
    const closeBtn = this.scene.add.text(centerX, centerY + 140, 'CLOSE (ESC)', {
      fontSize: '24px',
      fontFamily: 'Arial',
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
    const instructions = this.scene.add.text(centerX, centerY + 180, 'Press ESC to toggle settings', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888'
    }).setOrigin(0.5);
    this.container.add(instructions);
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
      fontFamily: 'Arial',
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

    // Draw overlay
    this.overlay.clear();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, 1024, 768);
    this.overlay.setVisible(true);

    this.container.setVisible(true);

    // Play open sound
    soundManager.init();
    soundManager.ding();
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.scene.isPaused = false;

    this.overlay.setVisible(false);
    this.container.setVisible(false);

    // Play close sound
    soundManager.cancelSound();
  }

  getSFXVolume() {
    return this.sfxVolume;
  }
}
