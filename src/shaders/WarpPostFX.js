import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
    vec2 uv = outTexCoord;
    vec2 center = vec2(0.5, 0.5);

    if (uIntensity <= 0.0) {
        gl_FragColor = texture2D(uMainSampler, uv);
        return;
    }

    // Radial direction from center
    vec2 dir = uv - center;
    float dist = length(dir);

    // Radial blur: sample along the radial direction
    float blurStrength = uIntensity * 0.05;
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;

    for (float i = 0.0; i < 10.0; i++) {
        float t = i / 10.0;
        float weight = 1.0 - t * 0.5;
        vec2 offset = dir * t * blurStrength * dist;
        color += texture2D(uMainSampler, uv - offset) * weight;
        totalWeight += weight;
    }
    color /= totalWeight;

    // Chromatic aberration along radial direction
    float aberration = uIntensity * 0.008 * dist;
    float r = texture2D(uMainSampler, uv + dir * aberration).r;
    float b = texture2D(uMainSampler, uv - dir * aberration).b;
    color.r = mix(color.r, r, 0.5);
    color.b = mix(color.b, b, 0.5);

    // Blue-white tint shift during warp
    color.b += uIntensity * 0.1 * dist;
    color.g += uIntensity * 0.04 * dist;

    // Brightness boost at center (tunnel effect)
    float centerBright = 1.0 + uIntensity * 0.25 * (1.0 - dist);
    color.rgb *= centerBright;

    // Streaky time-based shimmer
    float shimmer = sin(dist * 30.0 - uTime * 8.0) * 0.03 * uIntensity;
    color.rgb += shimmer;

    gl_FragColor = color;
}
`;

export class WarpPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader,
      name: 'WarpPostFX',
    });

    this._intensity = 0;
  }

  onPreRender() {
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uIntensity', this._intensity);
  }

  setIntensity(value) {
    this._intensity = value;
  }
}
