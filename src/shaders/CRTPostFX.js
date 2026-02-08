import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uResolution;

varying vec2 outTexCoord;

vec2 barrelDistortion(vec2 coord, float amt) {
    vec2 cc = coord - 0.5;
    float dist = dot(cc, cc);
    return coord + cc * dist * amt;
}

void main() {
    vec2 uv = barrelDistortion(outTexCoord, 0.08);

    // Black outside barrel bounds
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Chromatic aberration (stronger at edges)
    vec2 cc = uv - 0.5;
    float edgeDist = dot(cc, cc);
    float aberration = edgeDist * 0.008;

    float r = texture2D(uMainSampler, vec2(uv.x + aberration, uv.y)).r;
    float g = texture2D(uMainSampler, uv).g;
    float b = texture2D(uMainSampler, vec2(uv.x - aberration, uv.y)).b;
    vec4 color = vec4(r, g, b, 1.0);

    // Scanlines
    float scanline = sin(uv.y * uResolution.y * 1.5) * 0.04;
    color.rgb -= scanline;

    // Vignette
    vec2 vigUV = uv * (1.0 - uv);
    float vig = vigUV.x * vigUV.y * 15.0;
    vig = pow(vig, 0.25);
    color.rgb *= vig;

    // Subtle flicker
    float flicker = 1.0 - sin(uTime * 3.0) * 0.003;
    color.rgb *= flicker;

    gl_FragColor = color;
}
`;

export class CRTPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader,
      name: 'CRTPostFX',
    });
  }

  onPreRender() {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
