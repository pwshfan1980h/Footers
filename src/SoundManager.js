class SoundManager {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _osc(type, freq, startTime, duration, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
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
    gain.connect(this.ctx.destination);
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
    gain.connect(this.ctx.destination);
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
    gain.connect(this.ctx.destination);
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
    gain.connect(this.ctx.destination);
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
    gain.connect(this.ctx.destination);
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
      case 'bread':   this.plopBread(); break;
      case 'meat':    this.plopMeat(); break;
      case 'cheese':  this.plopCheese(); break;
      case 'topping': this.plopTopping(); break;
      case 'sauce':   this.plopSauce(); break;
      default:        this.plop(); break;
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
}

export const soundManager = new SoundManager();
