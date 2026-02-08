import Phaser from 'phaser';
import { CRTPostFX } from '../shaders/CRTPostFX.js';
import { WarningPulsePostFX } from '../shaders/WarningPulsePostFX.js';
import { WarpPostFX } from '../shaders/WarpPostFX.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Register post-processing shader pipelines (WebGL only)
    if (this.renderer.pipelines) {
      this.renderer.pipelines.addPostPipeline('CRTPostFX', CRTPostFX);
      this.renderer.pipelines.addPostPipeline('WarningPulsePostFX', WarningPulsePostFX);
      this.renderer.pipelines.addPostPipeline('WarpPostFX', WarpPostFX);
    }
    // Helper to batch-load SVGs sharing the same dimensions
    const loadSVGs = (keys, dims) =>
      keys.forEach(k => this.load.svg(k, `assets/${k}.svg`, dims));

    // Raster textures
    this.load.image('floor_tile', 'assets/floor_tile.png');
    this.load.image('wall_texture', 'assets/wall_texture.png');

    // Trays
    this.load.svg('tray_thin', 'assets/tray_thin.svg', { width: 200, height: 100 });

    // Bread slices (64x64)
    loadSVGs([
      'bread_white', 'bread_wheat', 'bread_sourdough',
    ], { width: 64, height: 64 });

    // Loaves -- counter display (200x100)
    loadSVGs(['loaf_white', 'loaf_wheat', 'loaf_sourdough'], { width: 200, height: 100 });

    // Cheese stacks (128x128)
    loadSVGs(['cheese_stack_american', 'cheese_stack_swiss'], { width: 128, height: 128 });

    // Veggie bowl contents (100x60)
    loadSVGs([
      'bowl_content_lettuce', 'bowl_content_tomato', 'bowl_content_onion',
      'bowl_content_pickles', 'bowl_content_olives', 'bowl_content_arugula',
    ], { width: 100, height: 60 });

    // Meat piles -- bin display (128x88)
    loadSVGs([
      'meat_pile_ham', 'meat_pile_turkey', 'meat_pile_roastbeef',
      'meat_pile_bacon', 'meat_pile_prosciutto',
    ], { width: 128, height: 88 });

    // Individual meats & cheeses (128x128)
    loadSVGs([
      'meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon', 'meat_prosciutto',
      'cheese_american', 'cheese_swiss',
    ], { width: 128, height: 128 });

    // Toppings (64x64)
    loadSVGs([
      'top_lettuce', 'top_tomato', 'top_onion',
      'top_pickles', 'top_olives', 'top_arugula',
    ], { width: 64, height: 64 });

    // Sauce bottles (128x256)
    loadSVGs(['sauce_mayo_bottle', 'sauce_mustard_bottle'], { width: 128, height: 256 });
  }

  create() {
    // Preload Google Fonts so they're ready before any text renders
    Promise.all([
      document.fonts.load('16px "Oxanium"'),
      document.fonts.load('bold 16px "Oxanium"'),
    ]).then(() => {
      this.scene.start('Title');
    }).catch(() => {
      // If font loading fails, proceed anyway with fallbacks
      this.scene.start('Title');
    });
  }
}
