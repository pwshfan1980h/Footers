import Phaser from 'phaser';

export class BoidManager {
  constructor(scene) {
    this.scene = scene;
    this.boids = [];
    this.explosions = [];
    this.laserShots = [];
    this.battleCooldown = 0;
    this.activeBattles = [];
  }

  create() {
    this.boidsContainer = this.scene.add.container(0, 0).setDepth(0.3);

    this.shipTypes = [
      { name: 'fighter', sizeRange: [2, 4], speedRange: [0.15, 0.35], colors: [0x88aaff, 0x99bbff, 0xaaccff], energyColors: [0xff4444, 0xff6644] },
      { name: 'freighter', sizeRange: [5, 8], speedRange: [0.03, 0.08], colors: [0x888888, 0x666666, 0x777799], energyColors: [0xffaa00, 0xffcc44] },
      { name: 'cruiser', sizeRange: [6, 10], speedRange: [0.05, 0.12], colors: [0x446688, 0x335577, 0x557799], energyColors: [0x44ffff, 0x88ffff] },
      { name: 'shuttle', sizeRange: [1.5, 3], speedRange: [0.1, 0.25], colors: [0xffffaa, 0xffeeaa, 0xffeedd], energyColors: [0xffff44, 0xffffaa] },
      { name: 'racer', sizeRange: [2, 3], speedRange: [0.3, 0.5], colors: [0xff6666, 0xff8844, 0xffaa44], energyColors: [0x44ff44, 0x88ff44] },
      { name: 'police', sizeRange: [4, 6], speedRange: [0.4, 0.6], colors: [0x4444ff, 0x0044ff], energyColors: [0x4444ff, 0x8888ff], isPolice: true },
    ];

    for (let i = 0; i < 25; i++) {
      this.spawnBoid(true);
    }
  }

  spawnBoid(initialSpawn = false, forceType = null, forceProps = null) {
    let shipType;
    if (forceType) {
      shipType = this.shipTypes.find(t => t.name === forceType) || this.shipTypes[0];
    } else {
      const roll = Math.random();
      if (roll < 0.05) {
        shipType = this.shipTypes.find(t => t.name === 'police');
      } else {
        const regularTypes = this.shipTypes.filter(t => !t.isPolice);
        shipType = Phaser.Utils.Array.GetRandom(regularTypes);
      }
    }

    const distanceLayer = forceProps?.distance || Phaser.Math.FloatBetween(0, 1);
    const distanceMult = 0.3 + distanceLayer * 0.7;
    const baseSize = Phaser.Math.FloatBetween(shipType.sizeRange[0], shipType.sizeRange[1]);
    const baseSpeed = Phaser.Math.FloatBetween(shipType.speedRange[0], shipType.speedRange[1]);
    const WINDOW_TOP = this.scene.WINDOW_TOP;
    const WINDOW_BOTTOM = this.scene.WINDOW_BOTTOM;

    const boid = {
      x: forceProps?.x ?? (initialSpawn ? Phaser.Math.Between(0, 1024) : Phaser.Math.Between(-50, -10)),
      y: forceProps?.y ?? Phaser.Math.Between(WINDOW_TOP + 20, WINDOW_BOTTOM - 20),
      vx: forceProps?.vx ?? baseSpeed * distanceMult,
      vy: forceProps?.vy ?? 0,
      speed: baseSpeed * distanceMult,
      size: baseSize * distanceMult,
      baseSize: baseSize,
      color: Phaser.Utils.Array.GetRandom(shipType.colors),
      energyColor: Phaser.Utils.Array.GetRandom(shipType.energyColors),
      alpha: 0.25 + distanceLayer * 0.5,
      distance: distanceLayer,
      shipType: shipType.name,
      isPolice: shipType.isPolice || false,
      inBattle: false,
      target: null,
      arrested: false,
      escorting: null,
      wobbleOffset: Math.random() * Math.PI * 2,
    };

    const g = this.scene.add.graphics();
    this.drawBoid(g, boid);
    boid.graphics = g;
    this.boidsContainer.add(g);
    this.boids.push(boid);
    return boid;
  }

  drawBoid(g, boid) {
    g.clear();
    const { x, y, size: s, alpha, shipType } = boid;

    if (shipType === 'fighter') {
      g.fillStyle(boid.color, alpha);
      g.beginPath();
      g.moveTo(x + s * 2, y);
      g.lineTo(x - s, y - s);
      g.lineTo(x - s * 0.5, y);
      g.lineTo(x - s, y + s);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xff6600, alpha * 0.7);
      g.fillCircle(x - s, y, s * 0.4);
    } else if (shipType === 'freighter') {
      g.fillStyle(boid.color, alpha);
      g.fillRect(x - s, y - s * 0.6, s * 2.5, s * 1.2);
      g.fillStyle(boid.color, alpha * 0.7);
      g.fillRect(x - s * 0.8, y - s, s * 0.5, s * 0.4);
      g.fillRect(x - s * 0.8, y + s * 0.6, s * 0.5, s * 0.4);
      g.fillStyle(0xffaa44, alpha * 0.5);
      g.fillCircle(x - s, y, s * 0.3);
    } else if (shipType === 'cruiser') {
      g.fillStyle(boid.color, alpha);
      g.beginPath();
      g.moveTo(x + s * 2, y);
      g.lineTo(x + s, y - s * 0.5);
      g.lineTo(x - s * 1.5, y - s * 0.4);
      g.lineTo(x - s * 1.5, y + s * 0.4);
      g.lineTo(x + s, y + s * 0.5);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x88ccff, alpha * 0.6);
      g.fillRect(x + s * 0.5, y - s * 0.2, s * 0.4, s * 0.4);
      g.fillStyle(0x44aaff, alpha * 0.6);
      g.fillCircle(x - s * 1.5, y - s * 0.2, s * 0.25);
      g.fillCircle(x - s * 1.5, y + s * 0.2, s * 0.25);
    } else if (shipType === 'shuttle') {
      g.fillStyle(boid.color, alpha);
      g.fillEllipse(x, y, s * 1.5, s * 0.8);
      g.fillStyle(0x88ddff, alpha * 0.7);
      g.fillCircle(x + s * 0.5, y, s * 0.3);
    } else if (shipType === 'racer') {
      g.fillStyle(boid.color, alpha);
      g.beginPath();
      g.moveTo(x + s * 2.5, y);
      g.lineTo(x, y - s * 0.4);
      g.lineTo(x - s, y);
      g.lineTo(x, y + s * 0.4);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xff4400, alpha * 0.8);
      g.fillEllipse(x - s * 1.5, y, s * 0.8, s * 0.2);
      g.fillStyle(0xffff00, alpha * 0.5);
      g.fillEllipse(x - s * 1.2, y, s * 0.4, s * 0.15);
    } else if (shipType === 'police') {
      g.fillStyle(boid.color, alpha);
      g.beginPath();
      g.moveTo(x + s * 1.8, y);
      g.lineTo(x + s * 0.5, y - s * 0.6);
      g.lineTo(x - s * 1.2, y - s * 0.5);
      g.lineTo(x - s * 1.2, y + s * 0.5);
      g.lineTo(x + s * 0.5, y + s * 0.6);
      g.closePath();
      g.fillPath();
      const flashPhase = (Date.now() / 150) % 2 < 1;
      g.fillStyle(flashPhase ? 0xff0000 : 0x0000ff, alpha);
      g.fillCircle(x + s * 0.2, y - s * 0.5, s * 0.25);
      g.fillStyle(flashPhase ? 0x0000ff : 0xff0000, alpha);
      g.fillCircle(x + s * 0.2, y + s * 0.5, s * 0.25);
    }

    if (boid.arrested && boid.escortedBy) {
      g.lineStyle(1, 0x44aaff, alpha * 0.5);
      g.lineBetween(x, y, boid.escortedBy.x, boid.escortedBy.y);
    }
  }

  spawnExplosion(x, y, size, distance) {
    const palettes = [
      { core: 0xffff44, mid: 0xff6600, outer: 0xff2200, particle: 0xffaa00 },
      { core: 0x44ffff, mid: 0x0088ff, outer: 0x0044aa, particle: 0x44aaff },
      { core: 0xff44ff, mid: 0xaa00ff, outer: 0x6600aa, particle: 0xdd44ff },
      { core: 0x44ff44, mid: 0x00cc00, outer: 0x008800, particle: 0x88ff44 },
      { core: 0xffffff, mid: 0xaaddff, outer: 0x4488ff, particle: 0xccffff },
    ];
    const palette = Phaser.Utils.Array.GetRandom(palettes);
    const explosion = { x, y, size, alpha: 0.6 + distance * 0.3, frame: 0, maxFrames: 30, particles: [], palette };
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      explosion.particles.push({ x: 0, y: 0, vx: Math.cos(angle) * size * 0.15, vy: Math.sin(angle) * size * 0.15 });
    }
    const g = this.scene.add.graphics();
    explosion.graphics = g;
    this.boidsContainer.add(g);
    this.explosions.push(explosion);
  }

  spawnLaser(fromBoid, toBoid) {
    const laser = { x1: fromBoid.x, y1: fromBoid.y, x2: toBoid.x, y2: toBoid.y, alpha: 0.8, life: 8, color: fromBoid.energyColor };
    const g = this.scene.add.graphics();
    laser.graphics = g;
    this.boidsContainer.add(g);
    this.laserShots.push(laser);
  }

  startBattle() {
    const available = this.boids.filter(b =>
      !b.inBattle && !b.arrested && !b.isPolice &&
      (b.shipType === 'fighter' || b.shipType === 'racer') &&
      b.x > 100 && b.x < 900
    );
    if (available.length < 2) return;
    const shuffled = Phaser.Utils.Array.Shuffle([...available]);
    const ship1 = shuffled[0];
    const ship2 = shuffled[1];
    ship1.inBattle = true;
    ship2.inBattle = true;
    ship1.target = ship2;
    ship2.target = ship1;
    this.activeBattles.push({ ships: [ship1, ship2], duration: 0, maxDuration: Phaser.Math.Between(600, 1200), laserCooldown: 0 });
  }

  update(delta) {
    if (!this.boids) return;
    const dt = delta / 16;
    const WINDOW_TOP = this.scene.WINDOW_TOP;
    const WINDOW_BOTTOM = this.scene.WINDOW_BOTTOM;

    this.battleCooldown -= dt;
    if (this.battleCooldown <= 0 && this.activeBattles.length < 1) {
      if (Math.random() < 0.00002) {
        this.startBattle();
        this.battleCooldown = 54000;
      }
    }

    for (let i = this.activeBattles.length - 1; i >= 0; i--) {
      const battle = this.activeBattles[i];
      battle.duration += dt;
      battle.laserCooldown -= dt;
      const [ship1, ship2] = battle.ships;
      if (ship1 && ship2 && !ship1.arrested && !ship2.arrested) {
        const dx = ship2.x - ship1.x;
        const dy = ship2.y - ship1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 40) {
          ship1.vx += (dx / dist) * 0.003 * dt;
          ship1.vy += (dy / dist) * 0.003 * dt;
          ship2.vx -= (dx / dist) * 0.003 * dt;
          ship2.vy -= (dy / dist) * 0.003 * dt;
        }
        if (battle.laserCooldown <= 0) {
          this.spawnLaser(ship1, ship2);
          this.spawnLaser(ship2, ship1);
          battle.laserCooldown = 45;
        }
      }
      if (battle.duration >= battle.maxDuration) {
        const loser = Math.random() < 0.5 ? ship1 : ship2;
        const winner = loser === ship1 ? ship2 : ship1;
        if (loser && !loser.arrested) {
          this.spawnExplosion(loser.x, loser.y, loser.size * 3, loser.distance);
          const idx = this.boids.indexOf(loser);
          if (idx > -1) { loser.graphics.destroy(); this.boids.splice(idx, 1); }
        }
        if (winner && !winner.arrested) {
          winner.inBattle = false;
          winner.target = null;
          winner.vx = 0.4;
          this.scene.time.delayedCall(500, () => {
            if (winner && !winner.arrested && this.boids.includes(winner)) {
              const police = this.spawnBoid(false, 'police', {
                x: -30, y: winner.y + Phaser.Math.Between(-50, 50), vx: 0.5, vy: 0, distance: winner.distance,
              });
              police.chasing = winner;
            }
          });
        }
        this.activeBattles.splice(i, 1);
      }
    }

    for (const boid of this.boids) {
      if (boid.isPolice && boid.chasing) {
        const target = boid.chasing;
        if (!this.boids.includes(target) || target.arrested) {
          boid.chasing = null;
          boid.escorting = null;
        } else {
          const dx = target.x - boid.x;
          const dy = target.y - boid.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 20 && !target.arrested) {
            target.arrested = true;
            target.escortedBy = boid;
            target.inBattle = false;
            boid.escorting = target;
            boid.vx = -0.3;
            this.spawnExplosion(target.x, target.y, target.size, target.distance);
          } else if (!target.arrested) {
            boid.vx += (dx / dist) * 0.02;
            boid.vy += (dy / dist) * 0.02;
            const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
            if (speed > 0.6) { boid.vx = (boid.vx / speed) * 0.6; boid.vy = (boid.vy / speed) * 0.6; }
          }
        }
      }
      if (boid.arrested && boid.escortedBy) {
        boid.x = boid.escortedBy.x - 25;
        boid.y = boid.escortedBy.y;
        boid.vx = boid.escortedBy.vx;
        boid.vy = boid.escortedBy.vy;
      } else if (!boid.inBattle) {
        boid.x += boid.vx * dt;
        boid.y += boid.vy * dt;
        boid.y += Math.sin(boid.x * 0.015 + boid.wobbleOffset) * 0.03 * dt;
        boid.vx = Phaser.Math.Linear(boid.vx, boid.speed, 0.002);
        boid.vy = Phaser.Math.Linear(boid.vy, 0, 0.01);
      } else {
        boid.x += boid.vx * dt;
        boid.y += boid.vy * dt;
        boid.y = Phaser.Math.Clamp(boid.y, WINDOW_TOP + 30, WINDOW_BOTTOM - 30);
      }
      this.drawBoid(boid.graphics, boid);
      if (boid.x > 1080 || boid.x < -80) {
        boid.x = Phaser.Math.Between(-50, -10);
        boid.y = Phaser.Math.Between(WINDOW_TOP + 20, WINDOW_BOTTOM - 20);
        boid.vx = boid.speed;
        boid.vy = 0;
        boid.inBattle = false;
        boid.arrested = false;
        boid.escortedBy = null;
        boid.escorting = null;
        boid.chasing = null;
        boid.target = null;
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.frame++;
      const progress = exp.frame / exp.maxFrames;
      const g = exp.graphics;
      g.clear();
      const radius = exp.size * (1 + progress * 2);
      const alpha = exp.alpha * (1 - progress);
      const pal = exp.palette;
      g.fillStyle(pal.core, alpha);
      g.fillCircle(exp.x, exp.y, radius * 0.5);
      g.fillStyle(pal.mid, alpha * 0.7);
      g.fillCircle(exp.x, exp.y, radius * 0.8);
      g.fillStyle(pal.outer, alpha * 0.4);
      g.fillCircle(exp.x, exp.y, radius);
      for (const p of exp.particles) {
        p.x += p.vx; p.y += p.vy;
        g.fillStyle(pal.particle, alpha * 0.8);
        g.fillCircle(exp.x + p.x, exp.y + p.y, exp.size * 0.2 * (1 - progress));
      }
      if (exp.frame >= exp.maxFrames) { exp.graphics.destroy(); this.explosions.splice(i, 1); }
    }

    for (let i = this.laserShots.length - 1; i >= 0; i--) {
      const laser = this.laserShots[i];
      laser.life--;
      laser.alpha *= 0.85;
      const g = laser.graphics;
      g.clear();
      g.lineStyle(2, laser.color, laser.alpha);
      g.lineBetween(laser.x1, laser.y1, laser.x2, laser.y2);
      g.lineStyle(4, laser.color, laser.alpha * 0.3);
      g.lineBetween(laser.x1, laser.y1, laser.x2, laser.y2);
      if (laser.life <= 0) { laser.graphics.destroy(); this.laserShots.splice(i, 1); }
    }
  }
}
