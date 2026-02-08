import { PalettePostFX } from '../shaders/PalettePostFX.js';
import { PALETTES, DEFAULT_PALETTE } from '../data/palettes.js';

/**
 * Apply the PalettePostFX to a scene's main camera.
 * Should be called FIRST, before other post-pipelines, so it processes
 * raw rendered colors before CRT / warp / warning effects.
 *
 * Reads the palette preference from localStorage:
 *   footers_palette = 'off'       → shader disabled
 *   footers_palette = 'gameboy'   → uses that palette key
 *   footers_palette = undefined   → uses DEFAULT_PALETTE
 */
export function applyPalette(scene) {
  if (!scene.renderer.pipelines) return;

  const pref = localStorage.getItem('footers_palette');

  if (pref === 'off') return;

  const key = pref || DEFAULT_PALETTE;
  const colors = PALETTES[key];
  if (!colors) return;

  scene.cameras.main.setPostPipeline(PalettePostFX);

  const pp = scene.cameras.main.getPostPipeline(PalettePostFX);
  const pipeline = Array.isArray(pp) ? pp[0] : pp;
  if (pipeline) {
    pipeline.setPalette(colors);
  }
}
