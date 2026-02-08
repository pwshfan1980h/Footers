import { GAME_FONT } from '../data/constants.js';

/**
 * Draw the food truckship at a given position and scale.
 * @param {Phaser.Scene} scene - The Phaser scene (needed for text at large scales)
 * @param {Phaser.GameObjects.Graphics} g - Graphics object to draw on
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} scale - Scale factor
 * @param {Phaser.GameObjects.Container} [container] - Optional container to add text into
 * @param {number} [angle=0] - Rotation angle in radians (0 = facing right)
 */
export function drawFoodTruckship(scene, g, cx, cy, scale, container, angle) {
  const s = scale;

  // Hull — rounded rectangle shape
  g.fillStyle(0x7A5A3A, 1);
  g.fillRoundedRect(cx - 60 * s, cy - 20 * s, 120 * s, 40 * s, 8 * s);

  // Awning — striped trapezoid on top
  g.fillStyle(0xCC3333, 0.9);
  g.beginPath();
  g.moveTo(cx - 30 * s, cy - 20 * s);
  g.lineTo(cx - 20 * s, cy - 35 * s);
  g.lineTo(cx + 40 * s, cy - 35 * s);
  g.lineTo(cx + 50 * s, cy - 20 * s);
  g.closePath();
  g.fillPath();
  // White stripes on awning
  g.fillStyle(0xFFFFFF, 0.3);
  for (let x = -25; x < 45; x += 12) {
    g.fillRect(cx + x * s, cy - 34 * s, 4 * s, 14 * s);
  }

  // Service window — warm yellow glow
  g.fillStyle(0xFFDD88, 0.9);
  g.fillRoundedRect(cx + 5 * s, cy - 14 * s, 35 * s, 20 * s, 3 * s);
  // Window glow halo
  g.fillStyle(0xFFDD88, 0.2);
  g.fillRoundedRect(cx + 2 * s, cy - 17 * s, 41 * s, 26 * s, 5 * s);

  // "FOOTERS" text on hull (only at larger scales)
  if (scale >= 1.5 && scene) {
    const nameText = scene.add.text(cx - 25 * s, cy + 5 * s, 'FOOTERS', {
      fontSize: `${8 * s}px`, color: '#FFE8CC', fontFamily: GAME_FONT, fontStyle: 'bold',
    });
    if (container) {
      container.add(nameText);
    }
  }

  // Engine — glowing circle at back
  g.fillStyle(0x4488FF, 0.6);
  g.fillCircle(cx - 60 * s, cy, 8 * s);
  g.fillStyle(0x88CCFF, 0.8);
  g.fillCircle(cx - 60 * s, cy, 4 * s);

  // Landing gear — small circles underneath
  g.fillStyle(0x555566, 0.8);
  g.fillCircle(cx - 30 * s, cy + 22 * s, 4 * s);
  g.fillCircle(cx + 30 * s, cy + 22 * s, 4 * s);
}

/**
 * Draw a procedural location icon based on location type.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} x
 * @param {number} y
 * @param {string} type - 'station','asteroid','nebula','planet','port','frontier'
 * @param {number} scale
 * @param {number} color - Hex color
 */
export function drawLocationIcon(g, x, y, type, scale, color) {
  const s = scale;
  const alpha = 0.9;

  switch (type) {
    case 'station': {
      // Ring with spokes
      g.lineStyle(2 * s, color, alpha);
      g.strokeCircle(x, y, 14 * s);
      g.lineStyle(1.5 * s, color, 0.6);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        g.lineBetween(
          x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s,
          x + Math.cos(a) * 14 * s, y + Math.sin(a) * 14 * s
        );
      }
      g.fillStyle(color, 0.3);
      g.fillCircle(x, y, 5 * s);
      break;
    }
    case 'asteroid': {
      // Irregular polygon with craters
      g.fillStyle(color, alpha);
      g.beginPath();
      const pts = 7;
      for (let i = 0; i < pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const r = (10 + Math.sin(i * 3.7) * 4) * s;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      // Craters
      g.fillStyle(0x000000, 0.2);
      g.fillCircle(x - 3 * s, y - 2 * s, 3 * s);
      g.fillCircle(x + 4 * s, y + 3 * s, 2 * s);
      break;
    }
    case 'nebula': {
      // Soft cloud
      g.fillStyle(color, 0.25);
      g.fillEllipse(x, y, 30 * s, 20 * s);
      g.fillStyle(color, 0.4);
      g.fillEllipse(x - 2 * s, y + 1 * s, 18 * s, 12 * s);
      g.fillStyle(color, 0.6);
      g.fillCircle(x, y, 5 * s);
      break;
    }
    case 'planet': {
      // Circle with surface bands
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, 12 * s);
      // Surface bands
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(x - 10 * s, y - 3 * s, 20 * s, 2 * s);
      g.fillRect(x - 8 * s, y + 3 * s, 16 * s, 1.5 * s);
      // Atmosphere glow
      g.lineStyle(2 * s, color, 0.3);
      g.strokeCircle(x, y, 15 * s);
      break;
    }
    case 'port': {
      // Rectangle with dock lights
      g.fillStyle(color, alpha);
      g.fillRect(x - 12 * s, y - 8 * s, 24 * s, 16 * s);
      g.lineStyle(1.5 * s, color, 0.6);
      g.strokeRect(x - 14 * s, y - 10 * s, 28 * s, 20 * s);
      // Dock lights
      g.fillStyle(0xffff44, 0.8);
      g.fillCircle(x - 10 * s, y - 10 * s, 2 * s);
      g.fillCircle(x + 10 * s, y - 10 * s, 2 * s);
      g.fillCircle(x - 10 * s, y + 10 * s, 2 * s);
      g.fillCircle(x + 10 * s, y + 10 * s, 2 * s);
      break;
    }
    case 'frontier': {
      // Jagged structure with warning lights
      g.fillStyle(color, alpha);
      g.beginPath();
      g.moveTo(x - 10 * s, y + 8 * s);
      g.lineTo(x - 8 * s, y - 4 * s);
      g.lineTo(x - 3 * s, y - 10 * s);
      g.lineTo(x + 2 * s, y - 6 * s);
      g.lineTo(x + 8 * s, y - 12 * s);
      g.lineTo(x + 10 * s, y - 2 * s);
      g.lineTo(x + 12 * s, y + 8 * s);
      g.closePath();
      g.fillPath();
      // Warning lights (blinking handled in scene)
      g.fillStyle(0xff4444, 0.8);
      g.fillCircle(x - 3 * s, y - 10 * s, 2 * s);
      g.fillCircle(x + 8 * s, y - 12 * s, 2 * s);
      break;
    }
    default: {
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, 10 * s);
    }
  }
}
