/**
 * Shared constants used across the game.
 * Centralizes magic numbers for layout, scoring, gameplay, and map dimensions.
 */

// --- Screen / Canvas ---
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const HALF_WIDTH = GAME_WIDTH / 2;   // 512
export const HALF_HEIGHT = GAME_HEIGHT / 2; // 384

// --- System Map World ---
export const WORLD_W = 3000;
export const WORLD_H = 2000;

// --- Scoring & Penalties ---
export const MAX_MISSES = 3;           // missed orders before game over
export const GAME_OVER_DELAY = 800;    // ms before switching to GameOver scene
export const PENALTY_RATE = 0.5;       // fraction of earnings lost on termination
export const SCORE_MULTIPLIER = 10;    // orderValue * this = score gained
export const DEFAULT_ORDER_VALUE = 5.00;

// --- Order Generation ---
export const MAX_ACTIVE_ORDERS = 4;
export const CHEESE_CHANCE = 0.7;
export const SAUCE_CHANCE = 0.6;
export const DOUBLE_TREATMENT_CHANCE = 0.3;
export const BASE_PRICE = 1.50;
export const DEFAULT_INGREDIENT_PRICE = 0.50;
export const TREATMENT_PRICE = 0.25;

// --- Shared Color Palette ---
export const SPACE_BLACK = 0x0a0a12;
export const HULL_DARK = 0x1a1a25;
export const NEON_CYAN = 0x00ddff;
export const NEON_PINK = 0xFF6B8A;

// --- Day Names ---
export const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// --- Stack Layer Heights (pixels) ---
export const LAYER_HEIGHT_SAUCE = 2;
export const LAYER_HEIGHT_TOPPING = 4;
export const LAYER_HEIGHT_CHEESE = 4;
export const LAYER_HEIGHT_MEAT = 5;
export const LAYER_HEIGHT_BREAD = 6;
