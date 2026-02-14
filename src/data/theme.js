export const THEME = {
  ISO_SKEW: 0.25,

  // Desert sky (visible through cantina windows)
  SPACE_BLACK: 0x1a0e08,
  SPACE_DEEP: 0x120a05,
  STAR_WHITE: 0xdddddd,
  STAR_BLUE: 0xcc9966,
  STAR_WARM: 0xffcc88,

  // Cantina window glass
  SMOKED_GLASS: 0x1a1008,
  SMOKED_GLASS_ALPHA: 0.35,

  // Adobe / sandstone walls
  HULL_DARK: 0x3A2A1A,
  HULL_MID: 0x5A4530,
  HULL_LIGHT: 0x7A6548,
  HULL_BRIGHT: 0x9A8568,
  HULL_WARM: 0x6A5038,
  PANEL_SEAM: 0x2A1A0A,

  // Brass / copper trim (replacing chrome)
  CHROME_DARK: 0x5A4020,
  CHROME_MID: 0x7A5830,
  CHROME_LIGHT: 0x9A7848,
  CHROME_HIGHLIGHT: 0xC8A060,

  // Dark wood beams
  BEAM_DARK: 0x2A1A10,
  BEAM_MID: 0x3A2A18,
  BEAM_LIGHT: 0x4A3A20,
  BEAM_HIGHLIGHT: 0x5A4A28,

  // Neon accents (cantina neon signs)
  NEON_ORANGE: 0xee9933,
  NEON_MAGENTA: 0xdd33cc,
  NEON_GOLD: 0xFFEE88,

  // Warm window tint
  GLASS_TINT: 0x4a3520,
  GLASS_HIGHLIGHT: 0x7a6040,
  GLASS_EDGE: 0x3a2510,

  // Window frame (dark wood)
  FRAME_DARK: 0x2a1a10,
  FRAME_LIGHT: 0x3a2a18,

  // Counter / table (warm wood)
  TABLE_TOP: 0x8B6A4A,
  TABLE_FRONT: 0x6B4A3A,
  TABLE_HIGHLIGHT: 0xC8A878,
  TABLE_SHADOW: 0x3A2A1A,

  // Shelving (weathered wood)
  SHELF_TOP: 0x6a5838,
  SHELF_FRONT: 0x4a3828,
  SHELF_GLASS: 0x5a4838,
};

import { GAME_WIDTH, HALF_WIDTH } from './constants.js';

export const LAYOUT = {
  LAND_Y: 513,
  WINDOW_TOP: 141,
  WINDOW_BOTTOM: 260,
  WINDOW_HEIGHT: 119,
  BEAM_WIDTH: 45,
  BEAM_POSITIONS: [0, 431, HALF_WIDTH - 22, 1444, GAME_WIDTH - 45],
  CUSTOMER_DECK_TOP: 260,
  CUSTOMER_DECK_BOTTOM: 478,
  COUNTER_Y: 492,
  DOOR_X: HALF_WIDTH,
  DOOR_Y: 312,
  DOOR_RADIUS: 66,
};
