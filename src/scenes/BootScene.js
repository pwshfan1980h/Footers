import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('floor_tile', 'src/assets/floor_tile.png');
    this.load.image('wall_texture', 'src/assets/wall_texture.png');
    this.load.svg('tray', 'src/assets/tray.svg', { width: 200, height: 140 });

    this.load.svg('bread_white', 'src/assets/bread_white.svg', { width: 128, height: 128 });
    this.load.svg('bread_wheat', 'src/assets/bread_wheat.svg', { width: 128, height: 128 });

    // Loaves (Counter objects)
    this.load.svg('loaf_white', 'src/assets/loaf_white.svg', { width: 200, height: 100 });
    this.load.svg('loaf_wheat', 'src/assets/loaf_wheat.svg', { width: 200, height: 100 });

    this.load.svg('meat_ham', 'src/assets/meat_ham.svg', { width: 128, height: 128 });
    this.load.svg('meat_turkey', 'src/assets/meat_turkey.svg', { width: 128, height: 128 });
    this.load.svg('meat_roastbeef', 'src/assets/meat_roastbeef.svg', { width: 128, height: 128 });
    this.load.svg('meat_bacon', 'src/assets/meat_bacon.svg', { width: 128, height: 128 });

    this.load.svg('cheese_american', 'src/assets/cheese_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_swiss', 'src/assets/cheese_swiss.svg', { width: 128, height: 128 });

    this.load.svg('top_lettuce', 'src/assets/top_lettuce.svg', { width: 64, height: 64 });
    this.load.svg('top_tomato', 'src/assets/top_tomato.svg', { width: 64, height: 64 });
    this.load.svg('top_onion', 'src/assets/top_onion.svg', { width: 64, height: 64 });

    this.load.svg('sauce_mayo_bottle', 'src/assets/sauce_mayo_bottle.svg', { width: 64, height: 128 });
    this.load.svg('sauce_mustard_bottle', 'src/assets/sauce_mustard_bottle.svg', { width: 64, height: 128 });
  }

  create() {
    this.scene.start('Menu');
  }
}
