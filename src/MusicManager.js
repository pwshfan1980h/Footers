/**
 * MusicManager - Procedural ambient engine drone
 * Deep, warm starship engine hum inspired by the Enterprise
 */

class MusicManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.layers = [];
    this.isPlaying = false;
  }

  init() {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.18;
    this.masterGain.connect(this.audioContext.destination);

    this.createAmbientLayers();
  }

  createAmbientLayers() {
    // Layer 1: Sub-bass rumble — felt more than heard
    this.createDronePad(32, 0.12, 0, 'sine', 80);

    // Layer 2: Main engine hum fundamental
    this.createDronePad(60, 0.10, 0, 'sine', 120);

    // Layer 3: Warm harmonic (perfect fifth above sub-bass)
    this.createDronePad(96, 0.04, -0.2, 'sine', 150);

    // Layer 4: Slight grit/texture from triangle wave
    this.createDronePad(60, 0.03, 0.2, 'triangle', 100);

    // Layer 5: Slow amplitude throb on the whole mix
    this.createThrob();
  }

  createDronePad(frequency, volume, pan, waveType, filterCutoff) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = waveType;
    osc.frequency.value = frequency;

    filter.type = 'lowpass';
    filter.frequency.value = filterCutoff;
    filter.Q.value = 0.7;

    gain.gain.value = 0;
    panner.pan.value = pan;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    osc.start();

    this.layers.push({ osc, gain, targetVolume: volume, filter, frequency });

    // Slow fade in
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 6);
  }

  createThrob() {
    // Slow LFO modulating the master gain for that engine pulse feel
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // ~6.7 second cycle — slow throb

    // Modulates master gain by ±0.015 (very subtle)
    lfoGain.gain.value = 0.015;

    lfo.connect(lfoGain);
    lfoGain.connect(this.masterGain.gain);

    lfo.start();

    this.layers.push({ osc: lfo, gain: lfoGain, targetVolume: 0.015 });
  }

  start() {
    if (this.isPlaying) return;

    this.init();
    this.isPlaying = true;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop() {
    if (!this.isPlaying) return;

    const now = this.audioContext.currentTime;

    this.layers.forEach(layer => {
      layer.gain.gain.linearRampToValueAtTime(0, now + 3);
    });

    setTimeout(() => {
      this.layers.forEach(layer => {
        layer.osc.stop();
        if (layer.osc2) layer.osc2.stop();
      });
      this.layers = [];
      this.isPlaying = false;
    }, 3000);
  }

  setVolume(volume) {
    if (!this.masterGain) return;

    const now = this.audioContext.currentTime;
    this.masterGain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.5);
  }

  mute() {
    this.setVolume(0);
  }

  unmute() {
    this.setVolume(1);
  }
}

// Singleton instance
export const musicManager = new MusicManager();
