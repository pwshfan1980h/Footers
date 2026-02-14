/**
 * MusicManager - Procedural cantina/saloon music
 * D mixolydian oom-pah piano, walking bass, drums, sparse melody
 */

class MusicManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.timerID = null;

    this.bpm = 125;
    this.step = 0; // 0-63 (4 bars x 16 sixteenth notes)
    this.nextStepTime = 0;

    // Pre-created noise buffers (reused for percussion)
    this.hatBuffer = null;
    this.snareBuffer = null;

    // D mixolydian chord progression: I - IV - bVII - I
    this.progression = [
      { bass: 73.42, fifth: 110.00, chord: [293.66, 369.99, 440.00] },  // D
      { bass: 98.00, fifth: 146.83, chord: [392.00, 493.88, 587.33] },  // G
      { bass: 65.41, fifth: 98.00,  chord: [261.63, 329.63, 392.00] },  // C
      { bass: 73.42, fifth: 110.00, chord: [293.66, 369.99, 440.00] },  // D
    ];

    // Melody: D5 through C6 (D mixolydian)
    this.melodyNotes = [587.33, 659.26, 739.99, 783.99, 880.00, 987.77, 1046.50];
    this.melodyIdx = 3;

    // Drone layer refs
    this.droneLayers = [];
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    this.hatBuffer = this._noiseBuffer(0.04);
    this.snareBuffer = this._noiseBuffer(0.1);
  }

  _noiseBuffer(duration) {
    const size = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _createDrone() {
    // Subtle sub-bass pad for atmosphere
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = 36.71; // D1
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 6);
    this.droneLayers.push({ osc, gain });

    // Slow LFO throb
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(this.masterGain.gain);
    lfo.start();
    this.droneLayers.push({ osc: lfo, gain: lfoGain });
  }

  start() {
    if (this.isPlaying) return;
    this.init();
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') this.ctx.resume();

    this._createDrone();

    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.18, now + 4);

    this.step = 0;
    this.nextStepTime = now + 0.3;
    this._schedule();
  }

  _schedule() {
    if (!this.isPlaying) return;

    while (this.nextStepTime < this.ctx.currentTime + 0.1) {
      this._playStep(this.step, this.nextStepTime);
      this.nextStepTime += (60 / this.bpm) / 4; // 16th note duration
      this.step = (this.step + 1) % 64;
    }

    this.timerID = setTimeout(() => this._schedule(), 25);
  }

  _playStep(step, time) {
    const bar = Math.floor(step / 16);
    const pos = step % 16;
    const beat = Math.floor(pos / 4); // 0-3
    const sub = pos % 4;

    const prog = this.progression[bar];

    // === BASS: oom-pah pattern ===
    // Beat 1: root, Beat 3: fifth
    if (sub === 0 && beat === 0) this._bass(prog.bass, time);
    if (sub === 0 && beat === 2) this._bass(prog.fifth, time);
    // Walking approach note on beat 4 "and"
    if (sub === 2 && beat === 3) {
      const nextBar = (bar + 1) % 4;
      const nextRoot = this.progression[nextBar].bass;
      const approach = nextRoot * (Math.random() > 0.5 ? 1.059 : 0.944); // half step above/below
      this._bass(approach, time, 0.6);
    }

    // === PIANO CHORDS: beats 2 and 4 (pah) ===
    if (sub === 0 && (beat === 1 || beat === 3)) {
      this._chord(prog.chord, time, 1.0);
    }
    // Ghost chord on "and" of 2 and 4
    if (sub === 2 && (beat === 1 || beat === 3)) {
      this._chord(prog.chord, time, 0.4);
    }

    // === DRUMS ===
    // Kick: beats 1 and 3
    if (sub === 0 && (beat === 0 || beat === 2)) this._kick(time);
    // Snare: beats 2 and 4
    if (sub === 0 && (beat === 1 || beat === 3)) this._snare(time);
    // Hi-hat: every 8th note (downbeats louder)
    if (sub === 0 || sub === 2) this._hat(time, sub === 0 ? 1.0 : 0.5);

    // === MELODY: sparse notes from D mixolydian ===
    if ((sub === 0 || sub === 2) && Math.random() < 0.12) {
      this._melody(time);
    }
  }

  // --- Instruments ---

  _bass(freq, time, volMult = 1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    const v = 0.18 * volMult;
    gain.gain.setValueAtTime(v, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  _chord(freqs, time, volMult = 1) {
    // Honky-tonk piano: two slightly detuned oscillators per note
    freqs.forEach(freq => {
      for (const detune of [-4, 4]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime(detune, time);
        const v = 0.03 * volMult;
        gain.gain.setValueAtTime(v, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        osc.start(time);
        osc.stop(time + 0.12);
      }
    });
  }

  _kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  _snare(time) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.snareBuffer;
    const gain = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    src.start(time);
    src.stop(time + 0.07);
    // Tonal body
    const osc = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc.connect(g2);
    g2.connect(this.masterGain);
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);
    g2.gain.setValueAtTime(0.05, time);
    g2.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  _hat(time, volMult = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.hatBuffer;
    const gain = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    const v = 0.025 * volMult;
    gain.gain.setValueAtTime(v, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.start(time);
    src.stop(time + 0.03);
  }

  _melody(time) {
    // Contour-based: step by -1, 0, or +1
    const step = Math.floor(Math.random() * 3) - 1;
    this.melodyIdx = Math.max(0, Math.min(this.melodyNotes.length - 1, this.melodyIdx + step));
    const freq = this.melodyNotes[this.melodyIdx];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // --- Lifecycle ---

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }

    // Stop drone layers
    this.droneLayers.forEach(l => { try { l.osc.stop(); } catch (e) {} });
    this.droneLayers = [];

    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
  }

  setVolume(volume) {
    if (!this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(volume * 0.18, this.ctx.currentTime + 0.5);
  }

  mute() { this.setVolume(0); }
  unmute() { this.setVolume(1); }
}

export const musicManager = new MusicManager();
