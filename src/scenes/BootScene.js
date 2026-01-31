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
    this.load.svg('loaf_sourdough', 'src/assets/loaf_sourdough.svg', { width: 140, height: 80 });

    // Cheese Stacks
    this.load.svg('cheese_stack_american', 'src/assets/cheese_stack_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_stack_swiss', 'src/assets/cheese_stack_swiss.svg', { width: 128, height: 128 });

    // Veggie Bowl
    this.load.svg('bowl_veggie', 'src/assets/bowl_veggie.svg', { width: 128, height: 80 });
    this.load.svg('bowl_content_lettuce', 'src/assets/bowl_content_lettuce.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_tomato', 'src/assets/bowl_content_tomato.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_onion', 'src/assets/bowl_content_onion.svg', { width: 100, height: 60 });

    this.load.svg('sign_footers', 'src/assets/sign_footers.svg', { width: 256, height: 128 });
    this.load.svg('sign_86_list', 'src/assets/sign_86_list.svg', { width: 140, height: 170 });

    this.load.svg('meat_pile_ham', 'src/assets/meat_pile_ham.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_turkey', 'src/assets/meat_pile_turkey.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_roastbeef', 'src/assets/meat_pile_roastbeef.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_bacon', 'src/assets/meat_pile_bacon.svg', { width: 128, height: 88 });

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
