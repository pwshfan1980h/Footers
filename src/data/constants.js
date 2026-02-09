/**
 * Shared constants used across the game.
 * Centralizes magic numbers for layout, scoring, gameplay, and map dimensions.
 */

// --- Screen / Canvas ---
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const HALF_WIDTH = GAME_WIDTH / 2;   // 960
export const HALF_HEIGHT = GAME_HEIGHT / 2; // 540

// --- Scoring & Penalties ---
export const MAX_MISSES = 3;           // missed orders before game over
export const GAME_OVER_DELAY = 800;    // ms before switching to GameOver scene
export const PENALTY_RATE = 0.5;       // fraction of earnings lost on termination
export const SCORE_MULTIPLIER = 10;    // orderValue * this = score gained
export const DEFAULT_ORDER_VALUE = 5.00;
export const WRONG_INGREDIENT_PENALTY = 25; // score deducted for wrong placement

// --- Customer Patience ---
export const BASE_PATIENCE = 40;       // seconds — starting patience
export const MIN_PATIENCE = 20;        // seconds — patience floor
export const PATIENCE_DECREASE = 3;    // seconds lost per minute of game time

// --- Sequential Order Delays (ms) ---
export const FIRST_ORDER_DELAY = 800;  // delay before first order spawns
export const NEXT_ORDER_DELAY = 1500;  // delay between early sequential orders
export const SEQUENTIAL_ORDER_CAP = 3; // orders before switching to interval timer

// --- Order Generation ---
export const MAX_ACTIVE_ORDERS = 4;
export const CHEESE_CHANCE = 0.7;
export const SAUCE_CHANCE = 0.6;
export const DOUBLE_TREATMENT_CHANCE = 0.3;
export const BASE_PRICE = 1.50;
export const DEFAULT_INGREDIENT_PRICE = 0.50;
export const TREATMENT_PRICE = 0.25;

// --- Interaction & Visuals ---
export const HELD_ITEM_WIDTH = 130;
export const HELD_ITEM_HEIGHT = 56;
export const SCALE_MEAT_CHEESE = 0.65;
export const SCALE_TOPPING = 0.5;
export const SCALE_BREAD = 0.75;
export const SCALE_SAUCE = 0.4;
export const TRAY_MAGNET_RADIUS = 100;

// --- Shared Color Palette ---
export const SPACE_BLACK = 0x0a0a12;
export const HULL_DARK = 0x1a1a25;
export const NEON_CYAN = 0x00ddff;
export const NEON_PINK = 0xFF6B8A;

// --- Day Names ---
export const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// --- Stack Layer Heights (pixels) ---
export const LAYER_HEIGHT_SAUCE = 2;
export const LAYER_HEIGHT_TOPPING = 6;
export const LAYER_HEIGHT_CHEESE = 4;
export const LAYER_HEIGHT_MEAT = 5;
export const LAYER_HEIGHT_BREAD = 6;

// --- Stock / Inventory ---
export const MAX_STOCK_PER_INGREDIENT = 15;
export const DEFAULT_STOCK_PER_INGREDIENT = 5;
export const RESTOCK_BUNDLE_SIZE = 5;

// --- Font ---
export const GAME_FONT = 'Oxanium';
