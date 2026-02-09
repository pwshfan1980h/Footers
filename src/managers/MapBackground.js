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

    // Seeded RNG for deterministic placement
    let seed = 7331;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

    // Gaussian-ish distribution: sum of 3 uniform randoms, centered around 0
    const gaussRand = () => (rand() + rand() + rand()) / 3;

    const locs = Object.values(LOCATIONS);
    locs.forEach((loc, i) => {
      const g = scene.add.graphics();
      const parallax = 0.3 + (i % 3) * 0.1;
      const spread = 500 + rand() * 300;

      // 1-2 ultra-faint background wash ellipses (barely visible base glow)
      for (let w = 0; w < 2; w++) {
        const ox = (rand() - 0.5) * spread * 0.3;
        const oy = (rand() - 0.5) * spread * 0.3;
        g.fillStyle(loc.color, 0.012 + rand() * 0.008);
        g.fillEllipse(loc.x + ox, loc.y + oy, spread * 0.8 + rand() * 200, spread * 0.5 + rand() * 150);
      }

      // Main cloud: scattered points of light with gaussian falloff
      const pointCount = 180 + Math.floor(rand() * 80);
      for (let p = 0; p < pointCount; p++) {
        // Gaussian-ish radial distribution (denser near center)
        const r = gaussRand() * spread;
        const angle = rand() * Math.PI * 2;
        const px = loc.x + Math.cos(angle) * r;
        const py = loc.y + Math.sin(angle) * r;
        const size = 0.8 + rand() * 2;
        // Closer to center = brighter
        const distRatio = r / spread;
        const alpha = (0.08 + rand() * 0.12) * (1 - distRatio * 0.7);
        g.fillStyle(loc.color, alpha);
        g.fillCircle(px, py, size);
      }

      // Bright knots: small tight clusters of brighter points
      const knotCount = 3 + Math.floor(rand() * 3);
      for (let k = 0; k < knotCount; k++) {
        const kAngle = rand() * Math.PI * 2;
        const kDist = rand() * spread * 0.5;
        const kx = loc.x + Math.cos(kAngle) * kDist;
        const ky = loc.y + Math.sin(kAngle) * kDist;
        const clusterSize = 20 + rand() * 40;
        const dotCount = 12 + Math.floor(rand() * 10);
        for (let d = 0; d < dotCount; d++) {
          const da = rand() * Math.PI * 2;
          const dd = rand() * clusterSize;
          const size = 1 + rand() * 2.5;
          g.fillStyle(loc.color, 0.12 + rand() * 0.15);
          g.fillCircle(kx + Math.cos(da) * dd, ky + Math.sin(da) * dd, size);
        }
      }

      // A few hot spots: slightly larger brighter points
      const hotCount = 5 + Math.floor(rand() * 4);
      for (let h = 0; h < hotCount; h++) {
        const ha = rand() * Math.PI * 2;
        const hd = gaussRand() * spread * 0.6;
        const hx = loc.x + Math.cos(ha) * hd;
        const hy = loc.y + Math.sin(ha) * hd;
        g.fillStyle(loc.color, 0.2 + rand() * 0.15);
        g.fillCircle(hx, hy, 2.5 + rand() * 2.5);
      }

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
        case 'depot':
          this._drawDepot(g, x, y, color, rand);
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

  _drawDepot(g, x, y, color, rand) {
    // Supply depot — cargo containers and loading zone
    g.fillStyle(color, 0.04);
    g.fillCircle(x, y, 180);

    // Scattered cargo containers
    for (let i = 0; i < 8; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 60 + rand() * 140;
      const cx = x + Math.cos(angle) * dist;
      const cy = y + Math.sin(angle) * dist;
      const w = 12 + rand() * 16;
      const h = 8 + rand() * 10;
      g.fillStyle(color, 0.08 + rand() * 0.06);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      g.lineStyle(1, color, 0.12);
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
    }

    // Loading dock beams
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      g.lineStyle(1.5, color, 0.08);
      g.lineBetween(
        x + Math.cos(angle) * 40,
        y + Math.sin(angle) * 40,
        x + Math.cos(angle) * 180,
        y + Math.sin(angle) * 180,
      );
    }
  }

  drawPerspectiveGrid() {
    const scene = this.scene;
    const g = scene.add.graphics();
    g.lineStyle(1, 0x223344, 0.06);

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
