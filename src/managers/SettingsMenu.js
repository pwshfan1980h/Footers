/**
 * SettingsMenu - Overlay with volume controls and game options
 */

import { musicManager } from '../MusicManager.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';
import { PALETTES, PALETTE_LIST, DEFAULT_PALETTE } from '../data/palettes.js';
import { PalettePostFX } from '../shaders/PalettePostFX.js';

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
    const panelHeight = 560;

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

    // Palette Selector
    this.buildPaletteSelector(centerX, centerY + 100);

    // Close button
    const closeBtn = this.scene.add.text(centerX, centerY + 210, 'CLOSE (ESC)', {
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
    const instructions = this.scene.add.text(centerX, centerY + 250, 'Press ESC to toggle settings', {
      fontSize: '14px',
      fontFamily: GAME_FONT,
      color: '#888888'
    }).setOrigin(0.5);
    this.container.add(instructions);
  }

  buildPaletteSelector(centerX, y) {
    const label = this.scene.add.text(centerX - 180, y, 'Palette', {
      fontSize: '20px',
      fontFamily: GAME_FONT,
      color: '#ffffff'
    });
    this.container.add(label);

    // Determine current selection index
    const stored = localStorage.getItem('footers_palette') || DEFAULT_PALETTE;
    this.paletteIndex = PALETTE_LIST.findIndex(p => p.key === stored);
    if (this.paletteIndex < 0) this.paletteIndex = 0;

    // Name text (centered between arrows)
    const nameX = centerX + 60;
    this.paletteNameText = this.scene.add.text(nameX, y + 2, PALETTE_LIST[this.paletteIndex].name, {
      fontSize: '18px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#00ddee',
    }).setOrigin(0.5, 0);
    this.container.add(this.paletteNameText);

    // Left arrow
    const leftBtn = this.scene.add.text(nameX - 100, y, '<', {
      fontSize: '24px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#00ddee',
      padding: { x: 8, y: 2 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.container.add(leftBtn);

    leftBtn.on('pointerover', () => leftBtn.setColor('#88ffee'));
    leftBtn.on('pointerout', () => leftBtn.setColor('#00ddee'));
    leftBtn.on('pointerdown', () => this.cyclePalette(-1));

    // Right arrow
    const rightBtn = this.scene.add.text(nameX + 100, y, '>', {
      fontSize: '24px',
      fontFamily: GAME_FONT,
      fontStyle: 'bold',
      color: '#00ddee',
      padding: { x: 8, y: 2 },
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.container.add(rightBtn);

    rightBtn.on('pointerover', () => rightBtn.setColor('#88ffee'));
    rightBtn.on('pointerout', () => rightBtn.setColor('#00ddee'));
    rightBtn.on('pointerdown', () => this.cyclePalette(1));

    // Color swatch row
    this.swatchGraphics = this.scene.add.graphics();
    this.container.add(this.swatchGraphics);
    this.swatchY = y + 35;
    this.swatchCenterX = centerX;
    this.drawSwatches();
  }

  cyclePalette(dir) {
    this.paletteIndex = (this.paletteIndex + dir + PALETTE_LIST.length) % PALETTE_LIST.length;
    const entry = PALETTE_LIST[this.paletteIndex];

    this.paletteNameText.setText(entry.name);
    localStorage.setItem('footers_palette', entry.key);
    this.drawSwatches();
    this.showRestartNote();

    soundManager.init();
    soundManager.plop();
  }

  drawSwatches() {
    this.swatchGraphics.clear();
    const entry = PALETTE_LIST[this.paletteIndex];
    if (entry.key === 'off') return;

    const colors = PALETTES[entry.key];
    if (!colors) return;

    const swatchSize = 14;
    const gap = 2;
    const totalW = colors.length * (swatchSize + gap) - gap;
    const startX = this.swatchCenterX - totalW / 2;

    for (let i = 0; i < colors.length; i++) {
      const sx = startX + i * (swatchSize + gap);
      this.swatchGraphics.fillStyle(colors[i], 1);
      this.swatchGraphics.fillRect(sx, this.swatchY, swatchSize, swatchSize);
    }
  }

  showRestartNote() {
    if (!this.restartNote) {
      this.restartNote = this.scene.add.text(512, 384 + 175, 'Change takes effect on next scene load.', {
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
