export const INGREDIENTS = {
  bread_white: { key: 'bread_white', name: 'White', category: 'bread', color: 0xF5DEB3, border: 0xD4B896, textColor: '#543', price: 1.50 },
  bread_wheat: { key: 'bread_wheat', name: 'Wheat', category: 'bread', color: 0xC89B5E, border: 0xA07940, textColor: '#fff', price: 1.75 },
  bread_sourdough: { key: 'bread_sourdough', name: 'Sourdough', category: 'bread', color: 0xFFEFD5, border: 0xB8860B, textColor: '#554', price: 1.75 },
  meat_ham: { key: 'meat_ham', name: 'Ham', category: 'meat', color: 0xFFB6C1, border: 0xE89BA6, textColor: '#633', price: 1.25 },
  meat_turkey: { key: 'meat_turkey', name: 'Turkey', category: 'meat', color: 0xD2B48C, border: 0xB89A70, textColor: '#432', price: 1.25 },
  meat_roastbeef: { key: 'meat_roastbeef', name: 'R. Beef', category: 'meat', color: 0x8B4513, border: 0x6B3000, textColor: '#fff', price: 1.50 },
  meat_bacon: { key: 'meat_bacon', name: 'Bacon', category: 'meat', color: 0xCC3322, border: 0x991A11, textColor: '#fff', price: 0.75 },
  cheese_american: { key: 'cheese_american', name: 'American', category: 'cheese', color: 0xFFD700, border: 0xDDB600, textColor: '#543', price: 0.50 },
  cheese_swiss: { key: 'cheese_swiss', name: 'Swiss', category: 'cheese', color: 0xFFF8DC, border: 0xDDD8B0, textColor: '#553', price: 0.60 },
  top_lettuce: { key: 'top_lettuce', name: 'Lettuce', category: 'topping', color: 0x32CD32, border: 0x28A428, textColor: '#fff', price: 0.25 },
  top_tomato: { key: 'top_tomato', name: 'Tomato', category: 'topping', color: 0xFF6347, border: 0xDD4030, textColor: '#fff', price: 0.30 },
  top_onion: { key: 'top_onion', name: 'Onion', category: 'topping', color: 0xE8D0F0, border: 0xC8B0D0, textColor: '#426', price: 0.20 },
  sauce_mayo: { key: 'sauce_mayo', name: 'Mayo', category: 'sauce', color: 0xFFFFF0, border: 0xDDDDC0, textColor: '#554', price: 0.10 },
  sauce_mustard: { key: 'sauce_mustard', name: 'Mustard', category: 'sauce', color: 0xFFDB58, border: 0xDDB830, textColor: '#543', price: 0.10 },
};

// Bin layout: Only meats remain in bins
export const BIN_LAYOUT = [
  ['meat_ham', 'meat_turkey', 'meat_roastbeef', 'meat_bacon'],
];

// Treatments that can be applied to sandwiches
export const TREATMENTS = {
  toasted: { name: 'Toasted', label: '#FFB040', description: 'Toast the sandwich' },
  togo: { name: 'To-Go', label: '#E8C555', description: 'Wrap for takeout' },
  salt_pepper: { name: 'S&P', label: '#CCCCCC', description: 'Salt & pepper' },
  oil_vinegar: { name: 'O&V', label: '#B8D458', description: 'Oil & vinegar drizzle' },
};

export const DAY_CONFIG = [
  null, // index 0 unused
  { name: 'Monday', orders: 5, speed: 0.55, spawnInterval: 7500, treatmentChance: 0, footerChance: 0.3 },
  { name: 'Tuesday', orders: 7, speed: 0.65, spawnInterval: 6500, treatmentChance: 0.3, footerChance: 0.4 },
  { name: 'Wednesday', orders: 9, speed: 0.75, spawnInterval: 5500, treatmentChance: 0.5, footerChance: 0.5 },
  { name: 'Thursday', orders: 11, speed: 0.85, spawnInterval: 4500, treatmentChance: 0.6, footerChance: 0.5 },
  { name: 'Friday', orders: 14, speed: 1.00, spawnInterval: 3800, treatmentChance: 0.6, footerChance: 0.6 },
];
