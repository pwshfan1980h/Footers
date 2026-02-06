import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('floor_tile', 'assets/floor_tile.png');
    this.load.image('wall_texture', 'assets/wall_texture.png');
    this.load.svg('tray', 'assets/tray.svg', { width: 200, height: 140 });
    this.load.svg('tray_thin', 'assets/tray_thin.svg', { width: 200, height: 100 });

    this.load.svg('bread_white', 'assets/bread_white.svg', { width: 64, height: 64 });
    this.load.svg('bread_wheat', 'assets/bread_wheat.svg', { width: 64, height: 64 });
    this.load.svg('bread_sourdough', 'assets/bread_sourdough.svg', { width: 64, height: 64 });
    this.load.svg('bread_white_toasted', 'assets/bread_white_toasted.svg', { width: 64, height: 64 });
    this.load.svg('bread_wheat_toasted', 'assets/bread_wheat_toasted.svg', { width: 64, height: 64 });
    this.load.svg('bread_sourdough_toasted', 'assets/bread_sourdough_toasted.svg', { width: 64, height: 64 });

    // Loaves (Counter objects)
    this.load.svg('loaf_white', 'assets/loaf_white.svg', { width: 200, height: 100 });
    this.load.svg('loaf_wheat', 'assets/loaf_wheat.svg', { width: 200, height: 100 });
    this.load.svg('loaf_sourdough', 'assets/loaf_sourdough.svg', { width: 200, height: 100 });

    // Cheese Stacks
    this.load.svg('cheese_stack_american', 'assets/cheese_stack_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_stack_swiss', 'assets/cheese_stack_swiss.svg', { width: 128, height: 128 });

    // Veggie Bowl Contents
    this.load.svg('bowl_content_lettuce', 'assets/bowl_content_lettuce.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_tomato', 'assets/bowl_content_tomato.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_onion', 'assets/bowl_content_onion.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_pickles', 'assets/bowl_content_pickles.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_olives', 'assets/bowl_content_olives.svg', { width: 100, height: 60 });
    this.load.svg('bowl_content_arugula', 'assets/bowl_content_arugula.svg', { width: 100, height: 60 });

    this.load.svg('meat_pile_ham', 'assets/meat_pile_ham.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_turkey', 'assets/meat_pile_turkey.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_roastbeef', 'assets/meat_pile_roastbeef.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_bacon', 'assets/meat_pile_bacon.svg', { width: 128, height: 88 });
    this.load.svg('meat_pile_prosciutto', 'assets/meat_pile_prosciutto.svg', { width: 128, height: 88 });

    this.load.svg('meat_ham', 'assets/meat_ham.svg', { width: 128, height: 128 });
    this.load.svg('meat_turkey', 'assets/meat_turkey.svg', { width: 128, height: 128 });
    this.load.svg('meat_roastbeef', 'assets/meat_roastbeef.svg', { width: 128, height: 128 });
    this.load.svg('meat_bacon', 'assets/meat_bacon.svg', { width: 128, height: 128 });

    this.load.svg('cheese_american', 'assets/cheese_american.svg', { width: 128, height: 128 });
    this.load.svg('cheese_swiss', 'assets/cheese_swiss.svg', { width: 128, height: 128 });

    this.load.svg('top_lettuce', 'assets/top_lettuce.svg', { width: 64, height: 64 });
    this.load.svg('top_tomato', 'assets/top_tomato.svg', { width: 64, height: 64 });
    this.load.svg('top_onion', 'assets/top_onion.svg', { width: 64, height: 64 });
    this.load.svg('top_pickles', 'assets/top_pickles.svg', { width: 64, height: 64 });
    this.load.svg('top_olives', 'assets/top_olives.svg', { width: 64, height: 64 });
    this.load.svg('top_arugula', 'assets/top_arugula.svg', { width: 64, height: 64 });

    this.load.svg('meat_prosciutto', 'assets/meat_prosciutto.svg', { width: 128, height: 128 });

    // Sauce bottles (shelf display)
    this.load.svg('sauce_mayo_bottle', 'assets/sauce_mayo_bottle.svg', { width: 128, height: 256 });
    this.load.svg('sauce_mustard_bottle', 'assets/sauce_mustard_bottle.svg', { width: 128, height: 256 });

  }

  create() {
    // Preload Google Fonts so they're ready before any text renders
    Promise.all([
      document.fonts.load('16px "Bungee"'),
      document.fonts.load('16px "Caveat"'),
      document.fonts.load('16px "Permanent Marker"'),
      document.fonts.load('16px "Nothing You Could Do"'),
      document.fonts.load('16px "Grape Nuts"'),
    ]).then(() => {
      this.scene.start('Menu');
    }).catch(() => {
      // If font loading fails, proceed anyway with fallbacks
      this.scene.start('Menu');
    });
  }
}
