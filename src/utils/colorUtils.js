/**
 * Shared color manipulation utilities.
 * Consolidates darken/lighten helpers previously duplicated across
 * GameSceneBackground, CustomerVessels, and this file.
 */

/**
 * Darken a hex color by a factor (0 = black, 1 = unchanged).
 * @param {number} color - Hex color (e.g. 0xFF8800)
 * @param {number} factor - Multiplier in [0, 1]
 * @returns {number} Darkened hex color
 */
export function darkenColor(color, factor) {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

/**
 * Lighten a hex color by blending toward white.
 * @param {number} color - Hex color (e.g. 0xFF8800)
 * @param {number} factor - Blend amount in [0, 1] (0 = unchanged, 1 = white)
 * @returns {number} Lightened hex color
 */
export function lightenColor(color, factor) {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) + (255 - ((color >> 16) & 0xFF)) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) + (255 - ((color >> 8) & 0xFF)) * factor));
  const b = Math.min(255, Math.floor((color & 0xFF) + (255 - (color & 0xFF)) * factor));
  return (r << 16) | (g << 8) | b;
}
