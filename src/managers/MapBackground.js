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

    // Nebula parallax layers (location-anchored haze)
    scene.nebulaContainer = scene.add.container(0, 0).setDepth(0.2);
    this.drawNebulaLayers();

    // Location environment decorations
    scene.envContainer = scene.add.container(0, 0).setDepth(0.3);
    this.drawLocationEnvironments();

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

    // Draw a color haze ellipse anchored to each location
    const locs = Object.values(LOCATIONS);
    locs.forEach((loc, i) => {
      const g = scene.add.graphics();
      const w = 650 + (i % 3) * 80;
      const h = 400 + (i % 4) * 60;
      const alpha = 0.07 + (i % 3) * 0.01;
      const parallax = 0.3 + (i % 3) * 0.1;

      // Outer haze
      g.fillStyle(loc.color, alpha);
      g.fillEllipse(loc.x, loc.y, w, h);
      // Inner brighter core
      g.fillStyle(loc.color, alpha * 1.6);
      g.fillEllipse(loc.x, loc.y, w * 0.5, h * 0.5);

      scene.nebulaContainer.add(g);
      this.nebulaBlobs.push({ g, parallax, baseX: loc.x, baseY: loc.y });
    });
  }

  drawLocationEnvironments() {
    const scene = this.scene;
    // Seeded RNG for deterministic placement
    let seed = 42;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    Object.values(LOCATIONS).forEach(loc => {
      const g = scene.add.graphics();
      const { x, y, color, type } = loc;

      switch (type) {
        case 'station':
          this._drawStation(g, x, y, color, loc.id === 'station_alpha');
          break;
        case 'asteroid':
          this._drawAsteroidField(g, x, y, color, rand);
          break;
        case 'nebula':
          this._drawNebulaWisps(g, x, y, color, rand);
          break;
        case 'planet':
          this._drawPlanetAtmosphere(g, x, y, color);
          break;
        case 'port':
          this._drawDockingPort(g, x, y, color, rand);
          break;
        case 'frontier':
          this._drawDebrisField(g, x, y, color, rand);
          break;
      }

      scene.envContainer.add(g);
    });
  }

  _drawStation(g, x, y, color, dense) {
    // Radial comm-array lines
    const count = dense ? 10 : 7;
    const len = dense ? 220 : 180;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const inner = 40;
      g.lineStyle(1, color, 0.12);
      g.lineBetween(
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len,
      );
    }
    // Soft haze ring
    g.fillStyle(color, 0.04);
    g.fillCircle(x, y, dense ? 160 : 120);
  }

  _drawAsteroidField(g, x, y, color, rand) {
    // Amber dust haze
    g.fillStyle(color, 0.05);
    g.fillEllipse(x, y, 500, 350);

    // Scattered rock debris
    for (let i = 0; i < 18; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 60 + rand() * 240;
      const rx = x + Math.cos(angle) * dist;
      const ry = y + Math.sin(angle) * dist;
      const size = 3 + rand() * 8;
      // Slightly irregular — draw 2 overlapping circles
      g.fillStyle(color, 0.10 + rand() * 0.08);
      g.fillCircle(rx, ry, size);
      g.fillCircle(rx + size * 0.3, ry - size * 0.2, size * 0.7);
    }
  }

  _drawNebulaWisps(g, x, y, color, rand) {
    // Multi-layered purple gas wisps
    for (let i = 0; i < 5; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 30 + rand() * 100;
      const cx = x + Math.cos(angle) * dist;
      const cy = y + Math.sin(angle) * dist;
      const w = 180 + rand() * 250;
      const h = 100 + rand() * 150;
      const rotation = rand() * Math.PI;

      // Approximate rotated ellipse with a stretched ellipse
      // Use offset and varying dimensions to suggest rotation
      const offX = Math.cos(rotation) * w * 0.15;
      const offY = Math.sin(rotation) * h * 0.15;
      g.fillStyle(color, 0.04 + rand() * 0.03);
      g.fillEllipse(cx + offX, cy + offY, w, h);
      g.fillStyle(color, 0.03);
      g.fillEllipse(cx - offX, cy - offY, w * 0.7, h * 0.8);
    }
  }

  _drawPlanetAtmosphere(g, x, y, color) {
    // Atmospheric glow ring
    g.fillStyle(color, 0.04);
    g.fillCircle(x, y, 200);
    g.fillStyle(color, 0.06);
    g.fillCircle(x, y, 120);

    // Orbital arc
    g.lineStyle(1.5, color, 0.12);
    g.beginPath();
    for (let a = -0.8; a < 2.3; a += 0.05) {
      const ox = x + Math.cos(a) * 250;
      const oy = y + Math.sin(a) * 100;
      if (a === -0.8) {
        g.moveTo(ox, oy);
      } else {
        g.lineTo(ox, oy);
      }
    }
    g.strokePath();

    // Second thinner orbital arc
    g.lineStyle(1, color, 0.07);
    g.beginPath();
    for (let a = 0.5; a < 3.6; a += 0.05) {
      const ox = x + Math.cos(a) * 300;
      const oy = y + Math.sin(a) * 80;
      if (a === 0.5) {
        g.moveTo(ox, oy);
      } else {
        g.lineTo(ox, oy);
      }
    }
    g.strokePath();
  }

  _drawDockingPort(g, x, y, color, rand) {
    // Golden ambient glow
    g.fillStyle(color, 0.05);
    g.fillCircle(x, y, 150);

    // Docking beam lines
    const beamAngles = [0.3, 1.2, 2.8, 4.5];
    beamAngles.forEach(angle => {
      g.lineStyle(1.5, color, 0.10);
      g.lineBetween(
        x + Math.cos(angle) * 50,
        y + Math.sin(angle) * 50,
        x + Math.cos(angle) * 250,
        y + Math.sin(angle) * 250,
      );
    });

    // Small dock-light dots along beams
    beamAngles.forEach(angle => {
      for (let d = 80; d < 240; d += 50) {
        g.fillStyle(color, 0.15 + rand() * 0.10);
        g.fillCircle(
          x + Math.cos(angle) * d,
          y + Math.sin(angle) * d,
          2,
        );
      }
    });
  }

  _drawDebrisField(g, x, y, color, rand) {
    // Red-orange hazard haze
    g.fillStyle(color, 0.05);
    g.fillEllipse(x, y, 550, 400);

    // Scattered wreckage chunks (angular debris)
    for (let i = 0; i < 13; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 70 + rand() * 280;
      const dx = x + Math.cos(angle) * dist;
      const dy = y + Math.sin(angle) * dist;
      const size = 4 + rand() * 10;
      const rot = rand() * Math.PI;

      // Draw angular chunk as a small diamond/rhombus
      g.fillStyle(color, 0.08 + rand() * 0.08);
      g.beginPath();
      g.moveTo(dx + Math.cos(rot) * size, dy + Math.sin(rot) * size);
      g.lineTo(dx + Math.cos(rot + 1.5) * size * 0.6, dy + Math.sin(rot + 1.5) * size * 0.6);
      g.lineTo(dx + Math.cos(rot + Math.PI) * size * 0.8, dy + Math.sin(rot + Math.PI) * size * 0.8);
      g.lineTo(dx + Math.cos(rot + 4.5) * size * 0.5, dy + Math.sin(rot + 4.5) * size * 0.5);
      g.closePath();
      g.fillPath();
    }
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
