/**
 * MusicManager - Procedural ambient music generator
 * Creates low-tempo, atmospheric space station background music
 */

class MusicManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.layers = [];
    this.isPlaying = false;
    this.currentIntensity = 0; // 0-1, affects density and brightness
  }

  init() {
    if (this.audioContext) return;

    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain (low volume for ambient music)
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.12;
    this.masterGain.connect(this.audioContext.destination);

    // Create ambient layers
    this.createAmbientLayers();
  }

  createAmbientLayers() {
    // Layer 1: Deep bass drone (foundation)
    this.createDronePad(55, 0.08, 0, 'sine'); // A1

    // Layer 2: Mid pad (warmth)
    this.createDronePad(220, 0.04, 0.3, 'sine'); // A3

    // Layer 3: High shimmer (space texture)
    this.createShimmerPad(880, 0.03, 0.6); // A5

    // Layer 4: Subtle detuned pad (width)
    this.createDronePad(165, 0.03, 0.2, 'triangle'); // E3
  }

  createDronePad(frequency, volume, pan, waveType = 'sine') {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = waveType;
    osc.frequency.value = frequency;

    // Gentle low-pass filter for smoothness
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    gain.gain.value = 0; // Start silent
    panner.pan.value = pan;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    osc.start();

    this.layers.push({ osc, gain, targetVolume: volume, filter, frequency });

    // Slow fade in over 8 seconds
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 8);
  }

  createShimmerPad(baseFreq, volume, pan) {
    // Two slightly detuned oscillators for shimmer effect
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();
    const filter = this.audioContext.createBiquadFilter();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = baseFreq;
    osc2.frequency.value = baseFreq * 1.003; // Slight detune for shimmer

    // High-pass filter for airiness
    filter.type = 'highpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.5;

    gain.gain.value = 0;
    panner.pan.value = pan;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.layers.push({ osc: osc1, osc2, gain, targetVolume: volume, filter });

    // Very slow fade in
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 12);

    // Add subtle LFO modulation to shimmer frequency
    this.addShimmerModulation(osc1, osc2, baseFreq);
  }

  addShimmerModulation(osc1, osc2, baseFreq) {
    // Create LFO (Low Frequency Oscillator) for subtle pitch wobble
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 0.08; // Very slow modulation (12.5 second cycle)
    lfoGain.gain.value = 2; // ±2 Hz wobble

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    lfo.start();
  }

  setIntensity(intensity) {
    // intensity 0-1: affects filter brightness and subtle volume changes
    this.currentIntensity = Math.max(0, Math.min(1, intensity));

    const now = this.audioContext.currentTime;

    this.layers.forEach((layer, i) => {
      if (layer.filter) {
        // Increase filter cutoff slightly with intensity
        const baseCutoff = layer.filter.type === 'lowpass' ? 800 : 600;
        const newCutoff = baseCutoff + (intensity * 400);
        layer.filter.frequency.linearRampToValueAtTime(newCutoff, now + 2);
      }

      // Slight volume boost with intensity (very subtle)
      const volumeBoost = 1 + (intensity * 0.15);
      const newVolume = layer.targetVolume * volumeBoost;
      layer.gain.gain.linearRampToValueAtTime(newVolume, now + 2);
    });
  }

  start() {
    if (this.isPlaying) return;

    this.init();
    this.isPlaying = true;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop() {
    if (!this.isPlaying) return;

    const now = this.audioContext.currentTime;

    // Fade out all layers
    this.layers.forEach(layer => {
      layer.gain.gain.linearRampToValueAtTime(0, now + 3);
    });

    // Stop and cleanup after fade
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
    // volume 0-1
    if (!this.masterGain) return;

    const now = this.audioContext.currentTime;
    this.masterGain.gain.linearRampToValueAtTime(volume * 0.12, now + 0.5);
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
