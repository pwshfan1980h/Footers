export const INGREDIENTS = {
  bread_white: { key: 'bread_white', name: 'White', category: 'bread', color: 0xF5DEB3, border: 0xD4B896, textColor: '#543', price: 1.50, toastedColor: 0xD4A43D, toastedBorder: 0x8B6914 },
  bread_wheat: { key: 'bread_wheat', name: 'Wheat', category: 'bread', color: 0xC89B5E, border: 0xA07940, textColor: '#fff', price: 1.75, toastedColor: 0x8B5A2B, toastedBorder: 0x4A2511 },
  bread_sourdough: { key: 'bread_sourdough', name: 'Sourdough', category: 'bread', color: 0xFFEFD5, border: 0xB8860B, textColor: '#554', price: 1.75, toastedColor: 0xC4943D, toastedBorder: 0x7A5518 },
  meat_ham: { key: 'meat_ham', name: 'Ham', category: 'meat', color: 0xFFB6C1, border: 0xE89BA6, textColor: '#633', price: 1.25 },
  meat_turkey: { key: 'meat_turkey', name: 'Turkey', category: 'meat', color: 0xD2B48C, border: 0xB89A70, textColor: '#432', price: 1.25 },
  meat_roastbeef: { key: 'meat_roastbeef', name: 'R. Beef', category: 'meat', color: 0x8B4513, border: 0x6B3000, textColor: '#fff', price: 1.50 },
  meat_bacon: { key: 'meat_bacon', name: 'Bacon', category: 'meat', color: 0xCC3322, border: 0x991A11, textColor: '#fff', price: 0.75 },
  meat_prosciutto: { key: 'meat_prosciutto', name: 'Prosciutto', category: 'meat', color: 0xE8A0A0, border: 0xC07070, textColor: '#633', price: 1.75 },
  cheese_american: { key: 'cheese_american', name: 'American', category: 'cheese', color: 0xFFD700, border: 0xDDB600, textColor: '#543', price: 0.50 },
  cheese_swiss: { key: 'cheese_swiss', name: 'Swiss', category: 'cheese', color: 0xFFF8DC, border: 0xDDD8B0, textColor: '#553', price: 0.60 },
  top_lettuce: { key: 'top_lettuce', name: 'Lettuce', category: 'topping', color: 0x32CD32, border: 0x28A428, textColor: '#fff', price: 0.25 },
  top_tomato: { key: 'top_tomato', name: 'Tomato', category: 'topping', color: 0xFF6347, border: 0xDD4030, textColor: '#fff', price: 0.30 },
  top_onion: { key: 'top_onion', name: 'Onion', category: 'topping', color: 0xE8D0F0, border: 0xC8B0D0, textColor: '#426', price: 0.20 },
  top_pickles: { key: 'top_pickles', name: 'Pickles', category: 'topping', color: 0x6B8E23, border: 0x556B2F, textColor: '#fff', price: 0.25 },
  top_olives: { key: 'top_olives', name: 'Olives', category: 'topping', color: 0x2F2F2F, border: 0x1a1a1a, textColor: '#fff', price: 0.30 },
  top_arugula: { key: 'top_arugula', name: 'Arugula', category: 'topping', color: 0x228B22, border: 0x006400, textColor: '#fff', price: 0.35 },
  sauce_mayo: { key: 'sauce_mayo', name: 'Mayo', category: 'sauce', color: 0xFFFFF0, border: 0xDDDDC0, textColor: '#554', price: 0.10 },
  sauce_mustard: { key: 'sauce_mustard', name: 'Mustard', category: 'sauce', color: 0xFFDB58, border: 0xDDB830, textColor: '#543', price: 0.10 },
};

// Bin layout: All meats available from start
export const BIN_LAYOUT = [
  ['meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon', 'meat_prosciutto'],
];

// Treatments - all available from start
export const TREATMENTS = {
  toasted: { name: 'Toasted', label: '#FFB040', description: 'Toast the sandwich' },
  togo: { name: 'To-Go', label: '#E8C555', description: 'Wrap for takeout' },
  salt: { name: 'Salt', label: '#FFFFFF', description: 'Add salt' },
  pepper: { name: 'Pepper', label: '#444444', description: 'Add pepper' },
  oil_vinegar: { name: 'O&V', label: '#B8D458', description: 'Oil & vinegar drizzle' },
};

// Progressive difficulty config for endless mode
// Difficulty increases based on game time (seconds)
export const DIFFICULTY_PROGRESSION = {
  // Starting values
  initialSpeed: 0.5,
  initialSpawnInterval: 8000,
  initialMaxToppings: 1,
  initialTreatmentChance: 0.1,

  // Progression rates (per 60 seconds of game time)
  speedIncrease: 0.08,           // Belt speed increases
  spawnIntervalDecrease: 500,    // Orders spawn faster
  maxToppingsIncrease: 0.15,     // More toppings per sandwich
  treatmentChanceIncrease: 0.08, // More treatment requests

  // Caps
  maxSpeed: 1.2,
  minSpawnInterval: 3000,
  maxMaxToppings: 4,
  maxTreatmentChance: 0.7,
};
