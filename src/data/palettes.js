// ---------------------------------------------------------------------------
// Palette Definitions
// ---------------------------------------------------------------------------
// Each palette is an array of hex color values (0xRRGGBB).
// The PalettePostFX shader snaps every rendered pixel to the nearest color
// in the active palette using Euclidean RGB distance.
//
// HOW TO ADD A NEW PALETTE
// ------------------------
// 1. Add a new key to the PALETTES object below.
// 2. Provide an array of up to 32 hex colors (0xRRGGBB).
//    - Minimum 2, maximum 32 (shader hard limit).
//    - Order does not matter; nearest-match is used.
// 3. Add a matching entry to PALETTE_NAMES for the settings UI.
// 4. That's it. The new palette is immediately available.
//
// Good sources for palettes: https://lospec.com/palette-list
// ---------------------------------------------------------------------------

export const PALETTES = {

  // --- RETRO CONSOLE ---

  gameboy: [
    0x0f380f, 0x306230, 0x8bac0f, 0x9bbc0f,
  ],

  pico8: [
    0x000000, 0x1D2B53, 0x7E2553, 0x008751,
    0xAB5236, 0x5F574F, 0xC2C3C7, 0xFFF1E8,
    0xFF004D, 0xFFA300, 0xFFEC27, 0x00E436,
    0x29ADFF, 0x83769C, 0xFF77A8, 0xFFCCAA,
  ],

  cgaHigh: [
    0x000000, 0xFF55FF, 0x55FFFF, 0xFFFFFF,
  ],

  // --- ATMOSPHERIC / MOODY ---

  dullAquatic: [
    0x372f3a, 0x464459, 0x545e72, 0x5d7680, 0x6a9395,
    0x7bad9f, 0x8eb29a, 0xb3c6b4, 0xc5d2ce, 0xd3d8d9,
  ],

  slso8: [
    0x0D2B45, 0x203C56, 0x544E68, 0x8D697A,
    0xD08159, 0xFFAA5E, 0xFFD4A3, 0xFFECD6,
  ],

  galaxyFlame: [
    0x699FAD, 0x3A708E, 0x2B454F, 0x111215,
    0x151D1A, 0x1D3230, 0x314E3F, 0x4F5D42,
    0x9A9F87, 0xEDE6CB, 0xF5D893, 0xE8B26F,
    0xB6834C, 0x704D2B, 0x40231E, 0x151015,
  ],

  gothicBit: [
    0x0E0E12, 0x1A1A24, 0x333346, 0x535373,
    0x8080A4, 0xA6A6BF, 0xC1C1D2, 0xE6E6EC,
  ],

  oil6: [
    0xFBF5EF, 0xF2D3AB, 0xC69FA5, 0x8B6D9C,
    0x494D7E, 0x272744,
  ],

  // --- NEON / CYBERPUNK ---

  neonSpace: [
    0xDF0772, 0xFE546F, 0xFF9E7D, 0xFFD080,
    0xFFFDFF, 0x0BFFE6, 0x01CBCF, 0x0188A5,
    0x3E3264, 0x352A55,
  ],

  cyberpunkNeons: [
    0x53EBE4, 0x0F9595, 0x084F64, 0x03274C,
    0x08173D, 0x0B001B, 0x4D004F, 0xC1115A,
    0xE13A6A, 0xE46A87, 0xECA6C0,
  ],

  neonCyber: [
    0x2EFEDD, 0xAA2BFD, 0x700AFF, 0x2C06A3,
  ],

  tealCity: [
    0x3D2C3A, 0x5F4147, 0x92706A, 0x935B50,
    0xD89F87, 0xE0C09A, 0xFFE38F, 0xF0E2C7,
    0x1D162A, 0x211F3A, 0x282439, 0x352F47,
    0x393252, 0x453C66, 0x4A4958, 0x575D70,
    0x17131B, 0x202C38, 0x284349, 0x2E5352,
    0x366964, 0x49837A, 0x8FD7CE, 0xB1FAF1,
  ],

  // --- WARM / EARTHY ---

  nostalgia15: [
    0xEFD0AE, 0xF6D937, 0xF8A153, 0xEF6361,
    0xC7555E, 0x501733, 0x71323C, 0x975E5E,
    0x755B6C, 0x808FAA, 0xC4BBB8, 0x74A8A2,
    0x186F5E, 0x46A45F, 0x88AF92,
  ],

  iceCreamGB: [
    0x7C3F58, 0xEB6B6F, 0xF9A875, 0xFFF6D3,
  ],

  coldfireGB: [
    0x46425E, 0x5B768D, 0xD17C7C, 0xF6C6A8,
  ],

  // --- MONOCHROME VARIANTS ---

  oneBitGlow: [
    0x222323, 0xF0F6F0,
  ],

  amberCRT: [
    0x0D0405, 0x5E1210, 0xD35600, 0xFED018,
  ],

  hollow: [
    0x0F0F1B, 0x565A75, 0xC6B7BE, 0xFAFBF6,
  ],

  demichrome: [
    0x211E20, 0x555568, 0xA0A08B, 0xE9EFEC,
  ],

  spaceHaze: [
    0xF8E3C4, 0xCC3495, 0x6B1FB1, 0x0B0630,
  ],

  rusticGB: [
    0x2C2137, 0x764462, 0xEDB4A1, 0xA96868,
  ],

  // --- LARGE / GENERAL PURPOSE ---

  endesga32: [
    0xBE4A2F, 0xD77643, 0xEAD4AA, 0xE4A672,
    0xB86F50, 0x733E39, 0x3E2731, 0xA22633,
    0xE43B44, 0xF77622, 0xFEAE34, 0xFEE761,
    0x63C74D, 0x3E8948, 0x265C42, 0x193C3E,
    0x124E89, 0x0099DB, 0x2CE8F5, 0xFFFFFF,
    0xC0CBDC, 0x8B9BB4, 0x5A6988, 0x3A4466,
    0x262B44, 0x181425, 0xFF0044, 0x68386C,
    0xB55088, 0xF6757A, 0xE8B796, 0xC28569,
  ],
};

// Display names for the settings menu. Order here = order in the selector.
export const PALETTE_LIST = [
  { key: 'off',             name: 'Off' },
  { key: 'gameboy',         name: 'Game Boy' },
  { key: 'pico8',           name: 'PICO-8' },
  { key: 'cgaHigh',         name: 'CGA' },
  { key: 'dullAquatic',     name: 'Dull Aquatic' },
  { key: 'slso8',           name: 'SLSO8' },
  { key: 'galaxyFlame',     name: 'Galaxy Flame' },
  { key: 'gothicBit',       name: 'Gothic Bit' },
  { key: 'oil6',            name: 'Oil 6' },
  { key: 'neonSpace',       name: 'Neon Space' },
  { key: 'cyberpunkNeons',  name: 'Cyberpunk Neons' },
  { key: 'neonCyber',       name: 'Neon Cyber' },
  { key: 'tealCity',        name: 'Teal City' },
  { key: 'nostalgia15',     name: 'Nostalgia' },
  { key: 'iceCreamGB',      name: 'Ice Cream GB' },
  { key: 'coldfireGB',      name: 'Coldfire GB' },
  { key: 'oneBitGlow',      name: '1-Bit Glow' },
  { key: 'amberCRT',        name: 'Amber CRT' },
  { key: 'hollow',          name: 'Hollow' },
  { key: 'demichrome',      name: 'Demichrome' },
  { key: 'spaceHaze',       name: 'Space Haze' },
  { key: 'rusticGB',        name: 'Rustic GB' },
  { key: 'endesga32',       name: 'Endesga 32' },
];

// The default palette key applied when the shader is enabled.
export const DEFAULT_PALETTE = 'dullAquatic';
