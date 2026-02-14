/**
 * Shared UI helpers — reusable button factory for menu scenes
 */
import { GAME_FONT } from '../data/constants.js';

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
 * @param {number}   options.baseFill     - Default fill color (default 0x3A2A1A)
 * @param {number}   options.hoverFill    - Fill on hover (default 0x5A4530)
 * @param {number}   options.accentColor  - Stroke color (default 0xFFBB44)
 * @param {number}   options.hoverAccent  - Stroke on hover (default 0xFFCC66)
 * @param {string}   options.textColor    - Label color (default '#FFBB44')
 * @param {string}   options.hoverTextColor - Label color on hover (default '#FFCC66')
 * @param {string}   options.fontSize     - Font size (default '26px')
 * @param {function} options.onClick      - Click handler
 * @returns {{ btn, btnHit, btnText }}
 */
export function createButton(scene, x, y, w, h, label, options = {}) {
  const {
    baseFill = 0x3A2A1A,
    hoverFill = 0x5A4530,
    accentColor = 0xFFBB44,
    hoverAccent = 0xFFCC66,
    textColor = '#FFBB44',
    hoverTextColor = '#FFCC66',
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
    fontSize, color: textColor, fontFamily: GAME_FONT,
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
