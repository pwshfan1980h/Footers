class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  _output() {
    return this.masterGain || this.ctx.destination;
  }

  _osc(type, freq, startTime, duration, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  _noise(duration, volume = 0.15) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    source.connect(gain);
    gain.connect(this._output());
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.start(t);
    source.stop(t + duration);
  }

  plop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  plopBread() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 150, t, 0.12, 0.25);
    this._osc('sine', 120, t + 0.02, 0.1, 0.15);
  }

  plopMeat() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._noise(0.06, 0.12);
    // Low sweep underneath
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  plopCheese() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  plopTopping() {
    if (!this.ctx) return;
    this._noise(0.04, 0.1);
    const t = this.ctx.currentTime;
    this._osc('sine', 600, t, 0.06, 0.1);
  }

  plopSauce() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  treatmentSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 1200, t, 0.08, 0.15);
    this._osc('sine', 1600, t + 0.06, 0.1, 0.12);
    this._osc('sine', 2000, t + 0.12, 0.15, 0.1);
  }

  plopCategory(category) {
    if (!this.ctx) return;
    switch (category) {
      case 'bread': this.plopBread(); break;
      case 'meat': this.plopMeat(); break;
      case 'cheese': this.plopCheese(); break;
      case 'topping': this.plopTopping(); break;
      case 'sauce': this.plopSauce(); break;
      default: this.plop(); break;
    }
  }

  ding() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 800, t, 0.3, 0.2);
    this._osc('sine', 1200, t + 0.12, 0.3, 0.2);
  }

  buzz() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 120, t, 0.25, 0.15);
  }

  cancelSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 500, t, 0.08, 0.12);
    this._osc('sine', 350, t + 0.06, 0.1, 0.1);
  }

  fanfare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this._osc('sine', freq, t + i * 0.15, 0.35, 0.18);
    });
  }

  fired() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [400, 300, 200, 120].forEach((freq, i) => {
      this._osc('sawtooth', freq, t + i * 0.25, 0.3, 0.12);
    });
  }

  score() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 587, t, 0.1, 0.2);
    this._osc('sine', 784, t + 0.06, 0.12, 0.2);
    this._osc('sine', 988, t + 0.12, 0.15, 0.22);
    this._osc('sine', 1175, t + 0.18, 0.3, 0.25);
    this._osc('sine', 2349, t + 0.25, 0.2, 0.1);
  }

  chaChing() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Cash register: bright metallic ring + drawer slide
    this._osc('sine', 1400, t, 0.06, 0.15);
    this._osc('sine', 2100, t + 0.03, 0.08, 0.12);
    this._osc('triangle', 2800, t + 0.06, 0.12, 0.1);
    this._noise(0.04, 0.08);
  }

  hotkeySelect() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Short crisp UI tick - ascending pair
    this._osc('sine', 880, t, 0.03, 0.1);
    this._osc('sine', 1320, t + 0.02, 0.04, 0.08);
  }

  robotPickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Pneumatic grip sound - ascending
    this._osc('square', 150, t, 0.04, 0.08);
    this._osc('sine', 300, t + 0.02, 0.06, 0.1);
    this._osc('sine', 500, t + 0.05, 0.08, 0.08);
    // Mechanical click
    this._noise(0.02, 0.15);
  }

  robotRelease() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Pneumatic release - descending
    this._osc('sine', 400, t, 0.05, 0.1);
    this._osc('sine', 200, t + 0.03, 0.08, 0.08);
    this._osc('square', 100, t + 0.06, 0.05, 0.06);
    // Air release hiss
    this._noise(0.08, 0.1);
  }

  waiterGibberish() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Higher pitched female-ish variants
    // Chain 3-5 syllables
    const syllables = 3 + Math.floor(Math.random() * 3);
    let now = t;

    for (let i = 0; i < syllables; i++) {
      const dur = 0.05 + Math.random() * 0.08;
      // High pitch range: 600 - 1200 Hz
      const freq = 600 + Math.random() * 600;
      const type = Math.random() > 0.5 ? 'triangle' : 'sine';

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this._output());

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      // Slide pitch slightly
      osc.frequency.linearRampToValueAtTime(freq + (Math.random() - 0.5) * 200, now + dur);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + dur);

      osc.start(now);
      osc.stop(now + dur);

      now += dur + 0.02; // slight pause between syllables
    }
  }

  // Whoosh sound for tray movements
  whoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Sweep from high to low with noise
    this._noise(0.15, 0.08);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this._output());
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Success chime for completed orders
  successChime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Ascending cheerful notes
    this._osc('sine', 523, t, 0.12, 0.18);      // C5
    this._osc('sine', 659, t + 0.08, 0.12, 0.18);  // E5
    this._osc('sine', 784, t + 0.16, 0.2, 0.2);   // G5
  }

  // Soft slide sound for magnetism
  magnetSlide() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Smooth ascending tone
    this._osc('sine', 400, t, 0.1, 0.08);
    this._osc('sine', 600, t + 0.05, 0.12, 0.06);
  }
}

export const soundManager = new SoundManager();
