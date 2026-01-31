import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('floor_tile', 'assets/floor_tile.png');
    this.load.image('wall_texture', 'assets/wall_texture.png');
    this.load.svg('tray', 'assets/tray.svg', { width: 200, height: 140 });

    this.load.svg('bread_white', 'assets/bread_white.svg', { width: 128, height: 128 });
    this.load.svg('bread_wheat', 'assets/bread_wheat.svg', { width: 128, height: 128 });
    this.load.svg('bread_sourdough', 'assets/bread_sourdough.svg', { width: 128, height: 128 });

    // Loaves (Counter objects)
    this.load.svg('loaf_white', 'assets/loaf_white.svg', { width: 200, height: 100 });
    this.load.svg('loaf_wheat', 'assets/loaf_wheat.svg', { width: 200, height: 100 });
    this.load.svg('loaf_sourdough', 'assets/loaf_sourdough.svg', { width: 200, height: 100 });

    // Cheese Stacks
    this.load.svg('cheese_stack_american', 'assets/cheese_stack_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_stack_swiss', 'assets/cheese_stack_swiss.svg', { width: 128, height: 128 });

    // Veggie Bowl
    this.load.svg('bowl_veggie', 'assets/bowl_veggie.svg', { width: 128, height: 80 });
    this.load.svg('bowl_content_lettuce', 'assets/bowl_content_lettuce.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_tomato', 'assets/bowl_content_tomato.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_onion', 'assets/bowl_content_onion.svg', { width: 100, height: 60 });

    this.load.svg('sign_footers', 'assets/sign_footers.svg', { width: 256, height: 128 });
    this.load.svg('sign_86_list', 'assets/sign_86_list.svg', { width: 140, height: 170 });

    this.load.svg('meat_pile_ham', 'assets/meat_pile_ham.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_turkey', 'assets/meat_pile_turkey.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_roastbeef', 'assets/meat_pile_roastbeef.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_bacon', 'assets/meat_pile_bacon.svg', { width: 128, height: 88 });

    this.load.svg('meat_ham', 'assets/meat_ham.svg', { width: 128, height: 128 });
    this.load.svg('meat_turkey', 'assets/meat_turkey.svg', { width: 128, height: 128 });
    this.load.svg('meat_roastbeef', 'assets/meat_roastbeef.svg', { width: 128, height: 128 });
    this.load.svg('meat_bacon', 'assets/meat_bacon.svg', { width: 128, height: 128 });

    this.load.svg('cheese_american', 'assets/cheese_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_swiss', 'assets/cheese_swiss.svg', { width: 128, height: 128 });

    this.load.svg('top_lettuce', 'assets/top_lettuce.svg', { width: 64, height: 64 });
    this.load.svg('top_tomato', 'assets/top_tomato.svg', { width: 64, height: 64 });
    this.load.svg('top_onion', 'assets/top_onion.svg', { width: 64, height: 64 });

    this.load.svg('sauce_mayo_bottle', 'assets/sauce_mayo_bottle.svg', { width: 64, height: 128 });
    this.load.svg('sauce_mustard_bottle', 'assets/sauce_mustard_bottle.svg', { width: 64, height: 128 });
  }

  create() {
    this.scene.start('Menu');
  }
}
