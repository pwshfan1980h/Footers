/**
 * ParticleManager - Handles all particle effects in the game
 */

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.particles = [];
  }

  create() {
    this.graphics = this.scene.add.graphics().setDepth(100);
  }

  update(delta) {
    // Update all active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update physics
      p.x += p.vx * (delta / 16);
      p.y += p.vy * (delta / 16);
      p.vy += p.gravity * (delta / 16);
      p.vx *= p.friction;
      p.vy *= p.friction;

      // Update life
      p.life -= delta;
      p.alpha = Math.min(1, p.life / p.maxLife);

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.render();
  }

  render() {
    const g = this.graphics;
    g.clear();

    for (const p of this.particles) {
      g.fillStyle(p.color, p.alpha * 0.8);

      if (p.shape === 'circle') {
        g.fillCircle(p.x, p.y, p.size * p.alpha);
      } else if (p.shape === 'rect') {
        const s = p.size * p.alpha;
        g.fillRect(p.x - s/2, p.y - s/2, s, s);
      } else if (p.shape === 'star') {
        this.drawStar(g, p.x, p.y, p.size * p.alpha, p.alpha);
      }
    }
  }

  drawStar(g, x, y, size, alpha) {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      if (i === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.closePath();
    g.fillPath();
  }

  // Sparkles when placing ingredients correctly
  ingredientPlaced(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        gravity: 0.1,
        friction: 0.96,
        color: color || 0xffdd88,
        size: 2 + Math.random() * 2,
        shape: 'star',
        life: 400 + Math.random() * 300,
        maxLife: 700,
        alpha: 1
      });
    }
  }

  // Error sparks when placing wrong ingredient
  errorSparks(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.15,
        friction: 0.94,
        color: 0xff3333,
        size: 2 + Math.random() * 2,
        shape: 'circle',
        life: 300 + Math.random() * 200,
        maxLife: 500,
        alpha: 1
      });
    }
  }

  // Success burst when completing order
  orderCompleted(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const color = [0xFFCC66, 0xFFBB44, 0xffdd44][Math.floor(Math.random() * 3)];

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        gravity: 0.12,
        friction: 0.95,
        color,
        size: 3 + Math.random() * 3,
        shape: Math.random() > 0.5 ? 'star' : 'circle',
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        alpha: 1
      });
    }
  }

  // Warm puff when top bread caps the sandwich
  breadCapPuff(x, y) {
    const colors = [0xDDB88C, 0xC8A070, 0xE8C89A, 0xFFDDAA];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 2;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.06,
        friction: 0.96,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
        shape: 'circle',
        life: 350 + Math.random() * 150,
        maxLife: 500,
        alpha: 0.8
      });
    }
  }

  // Gentle puff when picking up ingredient
  ingredientPickup(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        gravity: 0.05,
        friction: 0.98,
        color: color || 0xffffff,
        size: 2 + Math.random(),
        shape: 'circle',
        life: 300 + Math.random() * 200,
        maxLife: 500,
        alpha: 0.6
      });
    }
  }

  // Whoosh trail when dragging items
  dragTrail(x, y, color) {
    if (Math.random() > 0.7) { // Don't spawn every frame
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        gravity: 0,
        friction: 0.97,
        color: color || 0xFFBB44,
        size: 1 + Math.random() * 2,
        shape: 'circle',
        life: 200 + Math.random() * 150,
        maxLife: 350,
        alpha: 0.4
      });
    }
  }

}
