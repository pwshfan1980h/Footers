import Phaser from 'phaser';
import { LOCATIONS, TRADE_ROUTES } from '../data/locations.js';
import { WORLD_W, WORLD_H } from '../data/constants.js';

export class MapVessels {
  constructor(scene) {
    this.scene = scene;
    this.vessels = [];
    this.graphics = null;
  }

  create() {
    const scene = this.scene;
    scene.vesselContainer = scene.add.container(0, 0).setDepth(1);
    this.graphics = scene.add.graphics();
    scene.vesselContainer.add(this.graphics);
    this.spawnMapVessels();
  }

  spawnMapVessels() {
    const vesselColors = [0x88aaff, 0x888888, 0x446688, 0xffffaa, 0xff6666, 0x4444ff];
    const shipShapes = ['diamond', 'box', 'triangle', 'dot', 'arrow', 'cross'];

    // Build adjacency: for each location, which route indices connect to it
    this.routeAdjacency = {};
    Object.keys(LOCATIONS).forEach(id => { this.routeAdjacency[id] = []; });
    TRADE_ROUTES.forEach((route, ri) => {
      this.routeAdjacency[route[0]].push(ri);
      this.routeAdjacency[route[1]].push(ri);
    });

    // Compute density weight per route (average vesselDensity of both endpoints)
    const routeWeights = TRADE_ROUTES.map(([a, b]) => {
      const da = LOCATIONS[a]?.vesselDensity || 0.5;
      const db = LOCATIONS[b]?.vesselDensity || 0.5;
      return (da + db) / 2;
    });
    const totalWeight = routeWeights.reduce((s, w) => s + w, 0);

    const TOTAL_VESSELS = 60;

    for (let ri = 0; ri < TRADE_ROUTES.length; ri++) {
      const count = Math.max(2, Math.round((routeWeights[ri] / totalWeight) * TOTAL_VESSELS));
      const [aId, bId] = TRADE_ROUTES[ri];
      const la = LOCATIONS[aId];
      const lb = LOCATIONS[bId];
      if (!la || !lb) continue;

      for (let i = 0; i < count; i++) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const progress = Math.random();
        const speed = 0.02 + Math.random() * 0.04; // progress per second
        const laneOffset = (direction === 1 ? -1 : 1) * (8 + Math.random() * 12);
        const size = 3 + Math.random() * 5;
        const colorIdx = Math.floor(Math.random() * vesselColors.length);

        this.vessels.push({
          routeIndex: ri,
          progress,
          speed,
          direction,
          laneOffset,
          size,
          color: vesselColors[colorIdx],
          shape: shipShapes[colorIdx],
          x: 0,
          y: 0,
        });
      }
    }
  }

  update(delta, shipX, shipY) {
    this.updateVessels(delta);
    this.drawVessels(shipX, shipY);
  }

  updateVessels(delta) {
    const dt = delta / 1000;

    this.vessels.forEach(v => {
      v.progress += v.speed * v.direction * dt;

      // Reached an endpoint — pick a connecting route at that node
      if (v.progress >= 1 || v.progress <= 0) {
        const [aId, bId] = TRADE_ROUTES[v.routeIndex];
        // Which endpoint did we reach?
        const nodeId = v.progress >= 1 ? bId : aId;
        v.progress = Phaser.Math.Clamp(v.progress, 0, 1);

        // Find connecting routes at this node (excluding current)
        const candidates = this.routeAdjacency[nodeId].filter(ri => ri !== v.routeIndex);
        if (candidates.length > 0) {
          const newRoute = candidates[Math.floor(Math.random() * candidates.length)];
          const [na, nb] = TRADE_ROUTES[newRoute];
          // Determine direction: if nodeId is endpoint A, go forward (0->1); else go backward (1->0)
          if (na === nodeId) {
            v.direction = 1;
            v.progress = 0;
          } else {
            v.direction = -1;
            v.progress = 1;
          }
          v.routeIndex = newRoute;
          v.laneOffset = (v.direction === 1 ? -1 : 1) * (8 + Math.random() * 12);
        } else {
          // Dead end — reverse
          v.direction *= -1;
          v.progress = Phaser.Math.Clamp(v.progress, 0, 1);
          v.laneOffset = (v.direction === 1 ? -1 : 1) * (8 + Math.random() * 12);
        }
      }

      // Compute world position from route + progress
      const [aId, bId] = TRADE_ROUTES[v.routeIndex];
      const la = LOCATIONS[aId];
      const lb = LOCATIONS[bId];
      if (!la || !lb) return;

      const baseX = la.x + (lb.x - la.x) * v.progress;
      const baseY = la.y + (lb.y - la.y) * v.progress;

      // Perpendicular offset for lane separation
      const dx = lb.x - la.x;
      const dy = lb.y - la.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      v.x = baseX + nx * v.laneOffset;
      v.y = baseY + ny * v.laneOffset;
    });
  }

  drawVessels(shipX, shipY) {
    const g = this.graphics;
    g.clear();

    const cam = this.scene.cameras.main;
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
