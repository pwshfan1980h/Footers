import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);

    if (uIntensity <= 0.0) {
        gl_FragColor = color;
        return;
    }

    // Distance from center (0 at center, ~0.7 at corners)
    vec2 cc = outTexCoord - 0.5;
    float edgeDist = length(cc) * 2.0;

    // Pulsing rate scales with intensity
    float pulse = 0.5 + 0.5 * sin(uTime * (4.0 + uIntensity * 4.0));

    // Red glow that strengthens toward edges
    float edgeGlow = smoothstep(0.3, 1.0, edgeDist);
    float redAmount = edgeGlow * uIntensity * (0.4 + 0.6 * pulse);

    color.r += redAmount * 0.5;
    color.g -= redAmount * 0.15;
    color.b -= redAmount * 0.15;

    // Subtle overall red tint
    color.r += uIntensity * 0.04 * pulse;

    // Slight desaturation at high intensity
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(gray), uIntensity * 0.15);

    gl_FragColor = color;
}
`;

export class WarningPulsePostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader,
      name: 'WarningPulsePostFX',
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
