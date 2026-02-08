// ---------------------------------------------------------------------------
// PalettePostFX — Color-palette restriction post-processing shader
// ---------------------------------------------------------------------------
// Snaps every rendered pixel to the nearest color in a user-supplied palette.
// Supports up to 32 colors. Distance is Euclidean in RGB space.
//
// USAGE
// -----
//   // In any scene's create():
//   this.cameras.main.setPostPipeline(PalettePostFX);
//
//   // Swap palette at runtime (instant, no recompilation):
//   const pp = this.cameras.main.getPostPipeline(PalettePostFX);
//   const pipeline = Array.isArray(pp) ? pp[0] : pp;
//   pipeline.setPalette(PALETTES.gameboy);
//
//   // Disable without removing from the chain:
//   pipeline.setEnabled(false);
//
// TECHNICAL NOTES
// ---------------
// - The shader uses a fixed loop of MAX_COLORS (32) iterations.
//   WebGL1 requires loop bounds to be compile-time constants.
// - Colors are passed as a vec3 uniform array (RGB, 0-1 range).
// - An int uniform uPaletteSize controls how many entries are active.
// - The shader early-exits when uPaletteSize <= 0, passing through
//   the original color with zero overhead.
// ---------------------------------------------------------------------------

import Phaser from 'phaser';

const MAX_COLORS = 32;

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec3 uPalette[${MAX_COLORS}];
uniform int uPaletteSize;
uniform bool uEnabled;

varying vec2 outTexCoord;

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);

    if (!uEnabled || uPaletteSize <= 0) {
        gl_FragColor = color;
        return;
    }

    float minDist = 99999.0;
    vec3 closest = uPalette[0];

    for (int i = 0; i < ${MAX_COLORS}; i++) {
        if (i >= uPaletteSize) break;
        float d = distance(color.rgb, uPalette[i]);
        if (d < minDist) {
            minDist = d;
            closest = uPalette[i];
        }
    }

    gl_FragColor = vec4(closest, color.a);
}
`;

export class PalettePostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader,
      name: 'PalettePostFX',
    });

    this._enabled = true;
    this._palette = [];       // array of [r, g, b] in 0-1 range
    this._paletteSize = 0;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Set the active palette from an array of hex colors.
   * @param {number[]} hexColors — e.g. [0x0f380f, 0x306230, 0x8bac0f, 0x9bbc0f]
   */
  setPalette(hexColors) {
    const clamped = hexColors.slice(0, MAX_COLORS);
    this._palette = clamped.map((hex) => [
      ((hex >> 16) & 0xff) / 255,
      ((hex >> 8) & 0xff) / 255,
      (hex & 0xff) / 255,
    ]);
    this._paletteSize = this._palette.length;
  }

  /**
   * Enable or disable the palette effect without removing the pipeline.
   * When disabled the shader passes through the original color.
   */
  setEnabled(on) {
    this._enabled = !!on;
  }

  // -------------------------------------------------------------------
  // Phaser pipeline hooks
  // -------------------------------------------------------------------

  onPreRender() {
    this.set1i('uEnabled', this._enabled ? 1 : 0);
    this.set1i('uPaletteSize', this._paletteSize);

    // Upload palette as flat vec3 array
    if (this._paletteSize > 0) {
      const flat = new Float32Array(MAX_COLORS * 3);
      for (let i = 0; i < this._paletteSize; i++) {
        flat[i * 3] = this._palette[i][0];
        flat[i * 3 + 1] = this._palette[i][1];
        flat[i * 3 + 2] = this._palette[i][2];
      }
      this.set3fv('uPalette', flat);
    }
  }
}
