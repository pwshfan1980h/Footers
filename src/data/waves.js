/**
 * Wave definitions for the difficulty ramp system.
 *
 * Each wave specifies:
 *   customerCount  — how many orders must be completed/missed to end this wave
 *   maxConcurrent  — max customers at counter simultaneously
 *   spawnInterval  — ms between spawns (after sequential cap)
 *   maxPatience    — seconds before a customer walks out
 *   maxToppings    — max random toppings per order
 *   treatmentChance — probability [0,1] of any treatment on an order
 *   cheeseChance   — probability of cheese on an order
 *   sauceChance    — probability of sauce on an order
 *   unlock         — ingredient categories newly available this wave (shown as notification)
 *   challenge      — optional per-wave objective { type, target, label }
 *
 * Challenge types:
 *   'speed'      — complete N orders with >= Xm speed multiplier
 *   'combo'      — reach a combo streak of N
 *   'perfect'    — complete N orders with zero wrong placements
 *   'count'      — complete N orders within the wave
 *   'no_miss'    — complete the wave with zero misses
 */

export const WAVES = [
  // Wave 1 — Tutorial: bread + meat only, one customer at a time
  {
    wave: 1,
    customerCount: 3,
    maxConcurrent: 1,
    spawnInterval: 10000,
    maxPatience: 60,
    maxToppings: 0,
    treatmentChance: 0,
    cheeseChance: 0,
    sauceChance: 0,
    unlock: ['bread', 'meat'],
    challenge: null,
  },
  // Wave 2 — Still easy, slightly faster
  {
    wave: 2,
    customerCount: 4,
    maxConcurrent: 1,
    spawnInterval: 9000,
    maxPatience: 55,
    maxToppings: 0,
    treatmentChance: 0,
    cheeseChance: 0,
    sauceChance: 0,
    unlock: null,
    challenge: { type: 'speed', target: 2, minMult: 2.0, label: 'Serve 2 orders with 2x speed' },
  },
  // Wave 3 — Introduce overlap: 2 customers, still bread+meat
  {
    wave: 3,
    customerCount: 5,
    maxConcurrent: 2,
    spawnInterval: 8000,
    maxPatience: 50,
    maxToppings: 0,
    treatmentChance: 0,
    cheeseChance: 0,
    sauceChance: 0,
    unlock: null,
    challenge: { type: 'combo', target: 4, label: 'Get a 4x combo streak' },
  },
  // Wave 4 — Cheese unlocks
  {
    wave: 4,
    customerCount: 5,
    maxConcurrent: 2,
    spawnInterval: 7500,
    maxPatience: 48,
    maxToppings: 0,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0,
    unlock: ['cheese'],
    challenge: { type: 'perfect', target: 3, label: 'Complete 3 perfect orders' },
  },
  // Wave 5 — Faster, still 2 concurrent
  {
    wave: 5,
    customerCount: 6,
    maxConcurrent: 2,
    spawnInterval: 7000,
    maxPatience: 45,
    maxToppings: 1,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0,
    unlock: null,
    challenge: { type: 'no_miss', target: 0, label: 'No missed orders this wave' },
  },
  // Wave 6 — Toppings unlock
  {
    wave: 6,
    customerCount: 6,
    maxConcurrent: 2,
    spawnInterval: 6500,
    maxPatience: 42,
    maxToppings: 2,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0,
    unlock: ['topping'],
    challenge: { type: 'speed', target: 3, minMult: 2.5, label: 'Serve 3 orders at 2.5x speed' },
  },
  // Wave 7 — 3 concurrent customers!
  {
    wave: 7,
    customerCount: 7,
    maxConcurrent: 3,
    spawnInterval: 6000,
    maxPatience: 40,
    maxToppings: 2,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0,
    unlock: null,
    challenge: { type: 'combo', target: 6, label: 'Get a 6x combo streak' },
  },
  // Wave 8 — Sauces unlock
  {
    wave: 8,
    customerCount: 7,
    maxConcurrent: 3,
    spawnInterval: 5500,
    maxPatience: 38,
    maxToppings: 3,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: ['sauce'],
    challenge: { type: 'count', target: 6, label: 'Complete 6 orders' },
  },
  // Wave 9 — Pressure builds
  {
    wave: 9,
    customerCount: 8,
    maxConcurrent: 3,
    spawnInterval: 5000,
    maxPatience: 35,
    maxToppings: 3,
    treatmentChance: 0,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: null,
    challenge: { type: 'perfect', target: 4, label: 'Complete 4 perfect orders' },
  },
  // Wave 10 — Treatments unlock
  {
    wave: 10,
    customerCount: 8,
    maxConcurrent: 3,
    spawnInterval: 4500,
    maxPatience: 32,
    maxToppings: 3,
    treatmentChance: 0.3,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: ['treatment'],
    challenge: { type: 'no_miss', target: 0, label: 'No missed orders this wave' },
  },
  // Wave 11 — Full menu, faster
  {
    wave: 11,
    customerCount: 9,
    maxConcurrent: 3,
    spawnInterval: 4000,
    maxPatience: 30,
    maxToppings: 4,
    treatmentChance: 0.4,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: null,
    challenge: { type: 'combo', target: 8, label: 'Get an 8x combo streak' },
  },
  // Wave 12 — Endurance
  {
    wave: 12,
    customerCount: 10,
    maxConcurrent: 3,
    spawnInterval: 3500,
    maxPatience: 28,
    maxToppings: 4,
    treatmentChance: 0.5,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: null,
    challenge: { type: 'speed', target: 5, minMult: 3.0, label: 'Serve 5 orders at 3x speed' },
  },
  // Wave 13+ — Repeating endurance with shrinking patience
  {
    wave: 13,
    customerCount: 12,
    maxConcurrent: 3,
    spawnInterval: 3000,
    maxPatience: 25,
    maxToppings: 4,
    treatmentChance: 0.6,
    cheeseChance: 0.7,
    sauceChance: 0.6,
    unlock: null,
    challenge: { type: 'count', target: 10, label: 'Complete 10 orders' },
  },
];

/**
 * Get wave config for a given wave number.
 * Waves beyond the defined list repeat the last wave with shrinking patience.
 */
export function getWaveConfig(waveNum) {
  if (waveNum <= WAVES.length) {
    return WAVES[waveNum - 1];
  }
  const last = WAVES[WAVES.length - 1];
  const extra = waveNum - WAVES.length;
  return {
    ...last,
    wave: waveNum,
    customerCount: last.customerCount + extra,
    maxPatience: Math.max(18, last.maxPatience - extra * 2),
    spawnInterval: Math.max(2500, last.spawnInterval - extra * 200),
    treatmentChance: Math.min(0.8, last.treatmentChance + extra * 0.05),
    challenge: { type: 'count', target: last.customerCount + extra - 2, label: `Complete ${last.customerCount + extra - 2} orders` },
  };
}
