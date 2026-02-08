import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';

const CHATTER = [
  '[STATIC] ...requesting docking clearance at Gate 7...',
  'Dispatch: all units, solar flare advisory in Sector 12.',
  '...anyone copy? My hyperdrive smells like burnt toast...',
  'Station Alpha, we have a Code Mustard in Bay 3.',
  '[GARBLED] ...told him the sourdough was load-bearing...',
  'Attention: unauthorized sandwich detected in quarantine zone.',
  'Relay 9: fuel prices up 12% at Nebula Post. Again.',
  '...copy that, rerouting through the asteroid belt...',
  '[STATIC] ...best pastrami this side of the Kuiper Belt...',
  'Control, we have visual on the Golden Spatula. It\'s real.',
  '...my co-pilot quit. Says he can\'t handle the onions anymore.',
  'Frontier outpost requesting emergency cheese resupply.',
  'Warning: do NOT engage the space raccoons. I repeat, do NOT.',
  '[GARBLED] ...three pickles and a dream...',
  'Luxury Port traffic advisory: yacht parade until 0800.',
  '...look, I\'m just saying, zero-gravity mayo is a bad idea.',
  'Dispatch: who left a sandwich in the airlock? Again?',
  'Relay 4: meteor shower in 20. Secure all condiments.',
  '[STATIC] ...she ordered extra everything. EVERYTHING...',
  'Planet Market customs: please declare all artisanal breads.',
  '...and that\'s why we don\'t toast in hyperspace.',
  'Control: we lost contact with Truck 47. Last seen near a buffet.',
  '[GARBLED] ...the lettuce is sentient, I swear...',
  'Advisory: space whales migrating through shipping lanes.',
  '...told dispatch I need a vacation. They sent me more orders.',
  'Attention all ships: competitive sandwich-making is NOT a sport.',
  'Relay 12: black hole forming near the deli counter. Standard stuff.',
  '...my sandwich press has achieved consciousness...',
  '[STATIC] ...requesting backup. The lunch rush is real...',
  'Control to all units: tip your delivery bots, people.',
];

export class RadioChatter {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.msgText = null;
    this.timer = 0;
    this.interval = 18000; // ms between messages
    this.showing = false;
    this.usedIndices = new Set();
  }

  create() {
    const s = this.scene;
    const panelX = 12;
    const panelY = 740;

    this.container = s.add.container(panelX, panelY).setDepth(90).setAlpha(0);

    const bg = s.add.graphics();
    bg.fillStyle(0x0a0a18, 0.75);
    bg.fillRoundedRect(0, 0, 420, 24, 4);
    bg.lineStyle(1, 0x00ddff, 0.3);
    bg.strokeRoundedRect(0, 0, 420, 24, 4);
    this.container.add(bg);

    const icon = s.add.text(8, 12, '\u{1F4E1}', {
      fontSize: '13px',
    }).setOrigin(0, 0.5);
    this.container.add(icon);

    this.msgText = s.add.text(28, 12, '', {
      fontSize: '10px', color: '#66aacc', fontFamily: GAME_FONT,
    }).setOrigin(0, 0.5);
    this.container.add(this.msgText);

    // First message after a short delay
    this.timer = this.interval - 5000;
  }

  update(delta) {
    this.timer += delta;
    if (this.timer >= this.interval && !this.showing) {
      this.showMessage();
      this.timer = 0;
    }
  }

  showMessage() {
    const msg = this.pickMessage();
    if (!msg) return;

    this.showing = true;
    this.msgText.setText(msg);

    // Static blip sound
    soundManager.hotkeySelect();

    const s = this.scene;
    s.tweens.add({
      targets: this.container,
      alpha: 0.9,
      duration: 300,
      onComplete: () => {
        s.tweens.add({
          targets: this.container,
          alpha: 0,
          duration: 500,
          delay: 5000,
          onComplete: () => {
            this.showing = false;
          },
        });
      },
    });
  }

  pickMessage() {
    if (this.usedIndices.size >= CHATTER.length) {
      this.usedIndices.clear();
    }
    const available = CHATTER.map((m, i) => i).filter(i => !this.usedIndices.has(i));
    const idx = available[Math.floor(Math.random() * available.length)];
    this.usedIndices.add(idx);
    return CHATTER[idx];
  }
}
