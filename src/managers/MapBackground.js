import Phaser from 'phaser';
import { LOCATIONS, TRADE_ROUTES } from '../data/locations.js';
import { WORLD_W, WORLD_H } from '../data/constants.js';

export class MapBackground {
  constructor(scene) {
    this.scene = scene;
    this.nebulaBlobs = [];
  }

  create() {
    const scene = this.scene;

    // Background
    scene.bgContainer = scene.add.container(0, 0).setDepth(0);
    this.drawBackground();

    // Nebula parallax layers
    scene.nebulaContainer = scene.add.container(0, 0).setDepth(0.2);
    this.drawNebulaLayers();

    // Grid
    scene.gridContainer = scene.add.container(0, 0).setDepth(0.5);
    this.drawPerspectiveGrid();

    // Trade routes
    scene.routeContainer = scene.add.container(0, 0).setDepth(0.8);
    this.drawTradeRoutes();
  }

  drawBackground() {
    const scene = this.scene;
    const bg = scene.add.graphics();
    bg.fillStyle(scene.SPACE_BLACK, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    scene.bgContainer.add(bg);

    // Starfield
    const starG = scene.add.graphics();
    let seed = 99;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 300; i++) {
      const sx = rand() * WORLD_W;
      const sy = rand() * WORLD_H;
      const size = 0.5 + rand() * 2;
      const alpha = 0.3 + rand() * 0.6;
      const color = rand() > 0.75 ? 0xaaddff : 0xffffff;
      starG.fillStyle(color, alpha);
      starG.fillCircle(sx, sy, size);
    }
    scene.bgContainer.add(starG);

    // Twinkling
    scene.tweens.add({
      targets: starG,
      alpha: 0.7,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  drawNebulaLayers() {
    const scene = this.scene;
    this.nebulaBlobs = [];
    const configs = [
      { x: 600, y: 500, w: 800, h: 400, color: 0x442266, alpha: 0.08, parallax: 0.3 },
      { x: 2200, y: 1200, w: 600, h: 350, color: 0x663344, alpha: 0.06, parallax: 0.5 },
      { x: 1400, y: 300, w: 500, h: 300, color: 0x224466, alpha: 0.07, parallax: 0.4 },
    ];
    configs.forEach(cfg => {
      const g = scene.add.graphics();
      g.fillStyle(cfg.color, cfg.alpha);
      g.fillEllipse(cfg.x, cfg.y, cfg.w, cfg.h);
      g.fillStyle(cfg.color, cfg.alpha * 1.5);
      g.fillEllipse(cfg.x, cfg.y, cfg.w * 0.6, cfg.h * 0.6);
      scene.nebulaContainer.add(g);
      this.nebulaBlobs.push({ g, parallax: cfg.parallax, baseX: cfg.x, baseY: cfg.y });
    });
  }

  drawPerspectiveGrid() {
    const scene = this.scene;
    const g = scene.add.graphics();
    g.lineStyle(1, 0x223344, 0.15);

    for (let y = 0; y <= WORLD_H; y += 100) {
      g.lineBetween(0, y, WORLD_W, y);
    }
    for (let x = 0; x <= WORLD_W; x += 100) {
      g.lineBetween(x, 0, x, WORLD_H);
    }

    scene.gridContainer.add(g);
  }

  drawTradeRoutes() {
    const scene = this.scene;
    const g = scene.add.graphics();
    g.lineStyle(2.5, 0x445566, 0.3);
    TRADE_ROUTES.forEach(([a, b]) => {
      const la = LOCATIONS[a];
      const lb = LOCATIONS[b];
      if (la && lb) {
        const dx = lb.x - la.x;
        const dy = lb.y - la.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(dist / 20);
        for (let i = 0; i < steps; i += 2) {
          const t1 = i / steps;
          const t2 = Math.min((i + 1) / steps, 1);
          g.lineBetween(
            la.x + dx * t1, la.y + dy * t1,
            la.x + dx * t2, la.y + dy * t2
          );
        }
      }
    });
    scene.routeContainer.add(g);
  }

  updateParallax(camScrollX, camScrollY) {
    this.nebulaBlobs.forEach(blob => {
      const ox = camScrollX * blob.parallax * 0.1;
      const oy = camScrollY * blob.parallax * 0.1;
      blob.g.setPosition(-ox, -oy);
    });
  }
}
