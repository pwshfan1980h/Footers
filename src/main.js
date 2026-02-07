import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { SystemMapScene } from './scenes/SystemMapScene.js';
import { GameScene } from './scenes/GameScene.js';
import { DayEndScene } from './scenes/DayEndScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { WinScene } from './scenes/WinScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './data/constants.js';
import { soundManager } from './SoundManager.js';
import { musicManager } from './MusicManager.js';

// Resume audio contexts on first user interaction (browser autoplay policy)
const resumeAudio = () => {
  soundManager.init();
  if (musicManager.audioContext?.state === 'suspended') {
    musicManager.audioContext.resume();
  }
  document.removeEventListener('pointerdown', resumeAudio);
  document.removeEventListener('keydown', resumeAudio);
};
document.addEventListener('pointerdown', resumeAudio);
document.addEventListener('keydown', resumeAudio);

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  scene: [BootScene, SystemMapScene, GameScene, DayEndScene, GameOverScene, WinScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
