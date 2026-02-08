/**
 * Shared UI helpers — reusable button factory for menu scenes
 */

/**
 * Creates a styled, interactive button with hover effects.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x - Left edge of the button
 * @param {number} y - Top edge of the button
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {string} label - Button text
 * @param {object} options
 * @param {number}   options.baseFill     - Default fill color (default 0x1a3a4a)
 * @param {number}   options.hoverFill    - Fill on hover (default 0x2a4a5a)
 * @param {number}   options.accentColor  - Stroke color (default 0x00ddff)
 * @param {number}   options.hoverAccent  - Stroke on hover (default 0x44ffff)
 * @param {string}   options.textColor    - Label color (default '#00ffff')
 * @param {string}   options.hoverTextColor - Label color on hover (default '#44ffff')
 * @param {string}   options.fontSize     - Font size (default '26px')
 * @param {function} options.onClick      - Click handler
 * @returns {{ btn, btnHit, btnText }}
 */
export function createButton(scene, x, y, w, h, label, options = {}) {
  const {
    baseFill = 0x1a3a4a,
    hoverFill = 0x2a4a5a,
    accentColor = 0x00ddff,
    hoverAccent = 0x44ffff,
    textColor = '#00ffff',
    hoverTextColor = '#44ffff',
    fontSize = '26px',
    onClick,
  } = options;

  const cx = x + w / 2;
  const cy = y + h / 2;

  const btn = scene.add.graphics();
  const drawBtn = (fill, stroke, strokeAlpha = 1) => {
    btn.clear();
    btn.fillStyle(fill, 1);
    btn.fillRoundedRect(x, y, w, h, 12);
    btn.lineStyle(3, stroke, strokeAlpha);
    btn.strokeRoundedRect(x, y, w, h, 12);
  };
  drawBtn(baseFill, accentColor);

  const btnHit = scene.add.rectangle(cx, cy, w, h)
    .setInteractive({ useHandCursor: true });

  const btnText = scene.add.text(cx, cy, label, {
    fontSize, color: textColor, fontFamily: 'Bungee, Arial',
  }).setOrigin(0.5);

  btnHit.on('pointerover', () => {
    drawBtn(hoverFill, hoverAccent);
    btnText.setColor(hoverTextColor);
  });
  btnHit.on('pointerout', () => {
    drawBtn(baseFill, accentColor);
    btnText.setColor(textColor);
  });
  if (onClick) btnHit.on('pointerdown', onClick);

  return { btn, btnHit, btnText };
}
