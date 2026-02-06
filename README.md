# Footers

A browser-based time-management arcade game where you control a robot arm in a space station sandwich shop. Built with Phaser 3 and Vite.

## About

You control **Footers** - a robotic sandwich-making arm working in a bustling deli floating in the void of space. Customers place orders via tickets, and their trays roll in on a conveyor belt. Use the robot arm to pick up ingredients from bins, place them on trays in the correct order, apply treatments, and get those sandwiches out before they slide past the finish line!

The game spans 5 days (Monday-Friday) with increasing difficulty. Miss 3 orders and it's game over.

## Features

- **Articulated robot arm** - Control Footers's arm that follows your cursor
- **Click-to-place gameplay** - Pick up ingredients, click trays to place
- **Order ticket system** - Match ingredients to the ticket in exact order
- **Treatment system** - Toast, To-Go boxes, Salt & Pepper, Oil & Vinegar
- **Dynamic difficulty** - Belt speed adjusts based on active orders
- **5-day campaign** - Progressive unlocks and increasing challenge
- **Procedural audio** - All sounds generated via Web Audio API (robot servo sounds, placement sounds)
- **Space station aesthetic** - Large panoramic windows with stars, nebulae, and passing vessels

## Controls

| Key | Action |
|-----|--------|
| **Click** | Pick up ingredient / Place on tray |
| **SPACE** | Speed up conveyor belt (2x) |
| **SHIFT** | Slow down conveyor belt |
| **ESC** | Cancel held item |
| **F1** (hold) | Show all hotkeys and labels |
| **1-4** | Meats (Ham, Turkey, Roast Beef, Bacon) |
| **5-7** | Veggies (Lettuce, Tomato, Onion) |
| **8-9** | Cheese (American, Swiss) |
| **Q/E** | Sauces (Mayo, Mustard) |
| **R/F** | Treatments (Toast, To-Go) |
| **G/H** | Treatments (Salt, Pepper) |
| **V** | Treatment (Oil & Vinegar) |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Phaser 3** - Game framework
- **Vite** - Build tool and dev server
- **Web Audio API** - Procedural sound generation
- **SVG Assets** - Scalable ingredient and UI graphics

## Project Structure

```
src/
  main.js              # Game initialization
  config.js            # Debug flags
  SoundManager.js      # Procedural audio singleton
  data/
    ingredients.js     # Ingredient definitions, day configs
  scenes/
    BootScene.js       # Asset loading
    GameScene.js       # Core gameplay (robot arm, conveyor belt)
    DayEndScene.js     # Day summary
    WinScene.js        # Victory screen
    GameOverScene.js   # Game over screen
public/
  assets/              # SVG graphics
```

---

## Patch Notes

### v0.3.0 - Chrome & Glass Update

**Complete Visual Rewrite**
- Eliminated all flat gray colors from the scene
- New warm, light metallic color palette throughout
- Chrome/polished metal accents on all surfaces

**Smoked Glass Window Effect**
- Large panoramic window now has smoked glass overlay
- Creates depth and realism for the space view
- Subtle gradient darkening at edges
- Diagonal glass reflection highlights

**Improved Boids (Distant Vessels)**
- Changed from blocky pixel groups to single-pixel points
- Much slower drift speed (0.05-0.2 vs 0.3-0.9)
- More boids (12 vs 5) for a starfield-like effect
- Subtle vertical wobble for organic movement
- Dimmer appearance (behind smoked glass)

**Chrome Structural Elements**
- Window beams now polished chrome with highlights
- Brushed metal texture on vertical lines
- Polished chrome rivets with highlight spots
- Thinner, more elegant beam profiles (35px vs 45px)

**Brushed Steel Surfaces**
- Prep table has brushed steel texture with horizontal lines
- Polished highlight areas on table surface
- Chrome trim along table edge
- Section dividers for industrial look

**Glass Treatment Shelf**
- Shelf now rendered as translucent glass
- Chrome support brackets
- Glass edge highlights

**Stainless Steel Bins**
- Updated bin colors for stainless steel look
- Interior highlights for depth
- Polished rim with chrome highlight

**Chrome Conveyor Belt**
- Chrome rails with polished highlights
- Dark rubber belt segments
- Diamond plate floor texture below window

**Chrome Porthole Windows**
- Polished chrome rims with highlight arcs
- Smoked glass tint visible through portholes
- Reduced rivets (4 vs 8) for cleaner look
- Glass reflection effect

**Tighter Ingredient Layout**
- All ingredient areas moved closer together
- Meat bins: spacing reduced (130->110, 95->80)
- Bread loaves: spacing reduced (95->78)
- Cheese stacks: spacing reduced (100->85)
- Veggie bowls: spacing reduced (90->75)

---

### v0.2.0 - Visual Overhaul Update

**Space Station Window Expansion**
- Expanded panoramic space window from 100px to 245px tall (Y:145-390)
- Large structural beams frame the window with rivets and neon accents
- 70+ stars visible through the window (up from ~30)
- Larger, more atmospheric nebula wisps
- Added 3 circular porthole windows in the work surface area

**Boids System (Passing Vessels)**
- 5 small pixel-art vessels drift across the panoramic window
- Three vessel shapes: arrow, bar, and diamond formations
- Vessels respawn with randomized properties (speed, size, color)
- Colors include white, cyan, and orange tints

**Lighter Color Palette**
- Hull colors lightened throughout for less drab appearance
- `HULL_DARK`: 0x1a1a25 -> 0x2a2a38
- `HULL_MID`: 0x2a2a38 -> 0x3a3a4a
- `HULL_LIGHT`: 0x3a3a4a -> 0x4a4a5a
- Added new `HULL_BRIGHT` highlight color

**Thinner Trays**
- New `tray_thin.svg` asset (200x100 instead of 200x140)
- Flatter profile with adjusted order number badge positioning
- Trays now have a sleeker, more modern look

**Pita-Style Bread**
- All bread types redesigned with oval/pita shape (was irregular loaf slice)
- Smaller asset size (64x64, down from 128x128)
- Bread types maintain distinct colors and textures:
  - White: Light tan crust, white interior
  - Wheat: Brown crust with wheat specks
  - Sourdough: Golden crust with score marks and flour dusting

**F1 Label Toggle**
- All ingredient/item labels now hidden by default
- Press and hold F1 to reveal all labels AND hotkey hints
- Cleaner visual appearance during normal gameplay
- Labels affected: Meats, Breads, Cheeses, Veggies, Treatments

**Floor Layout**
- Floor grating narrowed from 126px to 30px
- Positioned directly below the panoramic window
- Creates more visual space for the starfield view

---

### v0.1.0 - Initial Release

- Core gameplay loop with conveyor belt mechanics
- 5-day campaign (Monday-Friday)
- Click-to-place ingredient system
- Order ticket matching
- Treatment system (Toast, To-Go, Salt, Pepper, Oil & Vinegar)
- Keyboard shortcuts for all ingredients
- Procedural sound effects
- Space station themed UI
- Dynamic belt speed based on order count
- Scoring system with speed bonuses

---

## License

MIT
