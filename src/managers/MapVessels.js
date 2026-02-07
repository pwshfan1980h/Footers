import Phaser from 'phaser';
import { LOCATIONS, TRADE_ROUTES } from '../data/locations.js';
import { WORLD_W, WORLD_H } from '../data/constants.js';

export class MapVessels {
  constructor(scene) {
    this.scene = scene;
    this.vessels = [];
  }

  create() {
    const scene = this.scene;
    scene.vesselContainer = scene.add.container(0, 0).setDepth(1);
    this.spawnMapVessels();
  }

  spawnMapVessels() {
    const vesselColors = [0x88aaff, 0x888888, 0x446688, 0xffffaa, 0xff6666, 0x4444ff];
    const shipShapes = ['diamond', 'box', 'triangle', 'dot', 'arrow', 'cross'];

    const locArr = Object.values(LOCATIONS);
    for (let i = 0; i < 60; i++) {
      const loc = Phaser.Utils.Array.GetRandom(locArr);
      const density = loc.vesselDensity || 0.5;
      if (Math.random() > density + 0.2) continue;

      const spread = 200 + Math.random() * 300;
      const angle = Math.random() * Math.PI * 2;
      const vx = loc.x + Math.cos(angle) * spread * (0.5 + Math.random());
      const vy = loc.y + Math.sin(angle) * spread * (0.5 + Math.random());

      let moveAngle = Math.random() * Math.PI * 2;
      const onRoute = Math.random() < 0.3;
      if (onRoute && TRADE_ROUTES.length > 0) {
        const route = Phaser.Utils.Array.GetRandom(TRADE_ROUTES);
        const la = LOCATIONS[route[0]];
        const lb = LOCATIONS[route[1]];
        if (la && lb) {
          moveAngle = Math.atan2(lb.y - la.y, lb.x - la.x);
          if (Math.random() < 0.5) moveAngle += Math.PI;
        }
      }

      const speed = 5 + Math.random() * 20;
      const size = 3 + Math.random() * 5;
      const colorIdx = Math.floor(Math.random() * vesselColors.length);

      this.vessels.push({
        x: Phaser.Math.Clamp(vx, 20, WORLD_W - 20),
        y: Phaser.Math.Clamp(vy, 20, WORLD_H - 20),
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        size,
        color: vesselColors[colorIdx],
        shape: shipShapes[colorIdx],
        baseX: vx,
        baseY: vy,
        driftRange: spread,
      });
    }
  }

  update(delta, shipX, shipY) {
    this.updateVessels(delta);
    this.drawVessels(shipX, shipY);
  }

  updateVessels(delta) {
    const dt = delta / 1000;
    this.vessels.forEach(v => {
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (v.x < -50) v.x = WORLD_W + 30;
      if (v.x > WORLD_W + 50) v.x = -30;
      if (v.y < -50) v.y = WORLD_H + 30;
      if (v.y > WORLD_H + 50) v.y = -30;
    });
  }

  drawVessels(shipX, shipY) {
    const scene = this.scene;
    const g = scene.add.graphics();
    scene.vesselContainer.removeAll(true);
    scene.vesselContainer.add(g);

    const cam = scene.cameras.main;
    const camX = cam.scrollX;
    const camY = cam.scrollY;
    const viewW = 1024 / cam.zoom + 200;
    const viewH = 768 / cam.zoom + 200;

    this.vessels.forEach(v => {
      if (v.x < camX - 100 || v.x > camX + viewW || v.y < camY - 100 || v.y > camY + viewH) return;

      const distToShip = Phaser.Math.Distance.Between(v.x, v.y, shipX, shipY);
      const sizeMult = distToShip < 200 ? 1.5 : 1;
      const s = v.size * sizeMult;
      const alpha = distToShip < 200 ? 0.7 : 0.4;

      g.fillStyle(v.color, alpha);
      switch (v.shape) {
        case 'diamond':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x, v.y - s * 0.6);
          g.lineTo(v.x - s, v.y);
          g.lineTo(v.x, v.y + s * 0.6);
          g.closePath();
          g.fillPath();
          break;
        case 'box':
          g.fillRect(v.x - s * 0.5, v.y - s * 0.4, s, s * 0.8);
          break;
        case 'triangle':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x - s * 0.5, v.y - s * 0.6);
          g.lineTo(v.x - s * 0.5, v.y + s * 0.6);
          g.closePath();
          g.fillPath();
          break;
        case 'arrow':
          g.beginPath();
          g.moveTo(v.x + s, v.y);
          g.lineTo(v.x - s * 0.4, v.y - s * 0.5);
          g.lineTo(v.x - s * 0.2, v.y);
          g.lineTo(v.x - s * 0.4, v.y + s * 0.5);
          g.closePath();
          g.fillPath();
          break;
        case 'cross':
          g.fillRect(v.x - s * 0.15, v.y - s * 0.5, s * 0.3, s);
          g.fillRect(v.x - s * 0.5, v.y - s * 0.15, s, s * 0.3);
          break;
        default: // dot
          g.fillCircle(v.x, v.y, s * 0.5);
      }

      // Engine dot
      g.fillStyle(0xFFEE88, alpha * 0.6);
      g.fillCircle(v.x - s * 0.8, v.y, s * 0.2);
    });
  }
}
