/**
 * GameSceneInteraction - Drag/drop, placement, keyboard shortcuts, held item visuals
 */
import { INGREDIENTS, TREATMENTS } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { GAME_FONT } from '../data/constants.js';

export class GameSceneInteraction {
  constructor(scene) {
    this.scene = scene;
  }

  setup() {
    this.setupDragAndDrop();
    this.setupKeyboardShortcuts();
  }

  createHeldVisual(key, x, y) {
    const s = this.scene;
    const ing = INGREDIENTS[key];
    const c = s.add.container(x, y).setDepth(100);
    c.setSize(130, 56);

    const textureKey = key.includes('sauce') ? key + '_bottle' : key;
    const img = s.add.image(0, 0, textureKey).setOrigin(0.5);
    if (key.includes('meat') || key.includes('cheese')) img.setScale(0.65);
    else if (key.includes('top')) img.setScale(0.7);
    else if (key.includes('bread')) img.setScale(0.75);
    else if (key.includes('sauce')) img.setScale(0.4);

    c.add(img);

    const label = s.add.text(0, 17, ing.name, {
      fontSize: '13px', color: ing.textColor || '#000',
      fontFamily: GAME_FONT, fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(label);

    c.setAlpha(0.85);

    c.setScale(0.4);
    s.tweens.add({
      targets: c, scaleX: 1, scaleY: 1,
      duration: 120, ease: 'Back.easeOut',
    });

    return c;
  }

  findTrayAtX(x) {
    const s = this.scene;
    let closest = null;
    let closestDist = Infinity;

    for (const tray of s.trays) {
      if (tray.done || tray.completed) continue;
      const tolerance = 80;
      const dist = Math.abs(tray.container.x - x);
      if (dist < tolerance && dist < closestDist) {
        closest = tray;
        closestDist = dist;
      }
    }
    return closest;
  }

  updateTrayNextHint(tray) {
    const s = this.scene;
    if (!tray.hintText || tray.completed || tray.done) return;

    const nextIndex = tray.placed.length;
    if (nextIndex < tray.order.ingredients.length) {
      const nextKey = tray.order.ingredients[nextIndex];
      const shortcut = this.getShortcutKey(nextKey);
      const ingName = INGREDIENTS[nextKey] ? INGREDIENTS[nextKey].name : '';
      if (shortcut) {
        tray.hintText.setText(`[${shortcut}] ${ingName}`);
      } else {
        tray.hintText.setText(ingName);
      }
    } else {
      const remainingTreats = (tray.order.treatments || []).filter(
        (t) => !tray.appliedTreatments.includes(t)
      );
      if (remainingTreats.length > 0) {
        const hints = remainingTreats.map((t) => {
          const shortcut = this.getShortcutKey(t);
          const name = TREATMENTS[t] ? TREATMENTS[t].name : t;
          return shortcut ? `[${shortcut}] ${name}` : name;
        });
        tray.hintText.setText(hints.join(' '));
      } else {
        tray.hintText.setText('');
      }
    }
  }

  getShortcutKey(ingredientOrTreatment) {
    return this.shortcutMap ? this.shortcutMap[ingredientOrTreatment] || '' : '';
  }

  setupDragAndDrop() {
    const s = this.scene;
    s.trayHighlight = s.add.graphics().setDepth(9);

    s.input.on('pointermove', (pointer) => {
      if (!s.heldItem) {
        s.trayHighlight.clear();
        s.glowGraphics.clear();
        s.magnetActive = false;
        return;
      }

      let targetX = pointer.x;
      let targetY = pointer.y;
      let magnetStrength = 0;
      let targetTray = null;

      {
        const tray = this.findTrayAtX(pointer.x);
        if (tray && !tray.completed && !tray.done) {
          targetTray = tray;
          const trayX = tray.container.x;
          const trayY = tray.container.y - 20;
          const distX = Math.abs(pointer.x - trayX);
          const distY = Math.abs(pointer.y - trayY);
          const magnetRadius = 100;

          if (distX < magnetRadius && distY < 120) {
            const dist = Math.sqrt(distX * distX + distY * distY);
            magnetStrength = Math.max(0, 1 - dist / magnetRadius);

            targetX = pointer.x + (trayX - pointer.x) * magnetStrength * 0.4;
            targetY = pointer.y + (trayY - pointer.y) * magnetStrength * 0.3;

            if (!s.magnetActive && magnetStrength > 0.3) {
              soundManager.magnetSlide();
              s.magnetActive = true;
            }
          } else {
            s.magnetActive = false;
          }
        }
      }

      s.heldItem.visual.x = targetX;
      s.heldItem.visual.y = targetY;

      s.glowGraphics.clear();
      const glowSize = 70 + magnetStrength * 30;
      const glowAlpha = (0.15 + Math.sin(Date.now() * 0.008) * 0.1) * (1 + magnetStrength);
      const glowColor = magnetStrength > 0.3 ? 0x44ff88 : 0x00ddff;
      s.glowGraphics.fillStyle(glowColor, glowAlpha);
      s.glowGraphics.fillCircle(targetX, targetY, glowSize);
      s.glowGraphics.fillStyle(glowColor, glowAlpha * 0.5);
      s.glowGraphics.fillCircle(targetX, targetY, glowSize * 1.4);

      if (s.heldItem.ingredientKey) {
        const ing = INGREDIENTS[s.heldItem.ingredientKey];
        s.particleManager.dragTrail(targetX, targetY, ing.color);
      }

      s.trayHighlight.clear();
      if (targetTray) {
        const hw = 72;
        const highlightTop = targetTray.container.y - 120;
        const highlightH = 175;
        const pulseAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15 + magnetStrength * 0.3;
        s.trayHighlight.lineStyle(3 + magnetStrength * 2, 0x44ff88, pulseAlpha);
        s.trayHighlight.strokeRoundedRect(
          targetTray.container.x - hw, highlightTop, hw * 2, highlightH, 8,
        );
      }
    });

    s.input.on('pointerup', (pointer) => {
      if (s.isPaused || !s.heldItem) return;
      this.placeHeldItem(pointer);
      s.glowGraphics.clear();
    });

    s.escKey.on('down', () => {
      if (s.settingsMenu.isOpen) {
        s.settingsMenu.close();
      } else if (s.heldItem) {
        this.cancelHeldItem();
        s.glowGraphics.clear();
      } else {
        s.settingsMenu.open();
      }
    });

    s.draggedTray = null;
    s.trayDragStartPos = { x: 0, y: 0 };

    s.input.on('dragstart', (pointer, gameObject) => {
      const tray = s.trays.find(t => t.container === gameObject);
      if (tray && tray.draggable) {
        s.draggedTray = tray;
        s.trayDragStartPos.x = tray.container.x;
        s.trayDragStartPos.y = tray.container.y;
        soundManager.robotPickup();
      }
    });

    s.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (s.draggedTray && s.draggedTray.container === gameObject) {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    });

    s.input.on('dragend', (pointer, gameObject) => {
      const tray = s.draggedTray;
      if (!tray || tray.container !== gameObject) return;

      const y = gameObject.y;

      // Deliver completed tray by dragging upward into customer/window area
      if (tray.onPrepTrack && tray.completed && y < 400) {
        // Find the linked customer for this tray
        const customer = s.customerVessels.customers.find(c => c.tray === tray);
        if (customer && customer.personState === 'at_window') {
          // Remove from prep track
          if (tray.prepSlot) {
            s.prepTrack.removeTray(tray.prepSlot);
          }
          tray.onPrepTrack = false;
          tray.draggable = false;
          gameObject.disableInteractive();
          soundManager.whoosh();

          // Animate tray flying to the customer's window position
          const targetX = customer.personX;
          const targetY = customer.personY;
          s.tweens.add({
            targets: gameObject,
            x: targetX,
            y: targetY,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 350,
            ease: 'Quad.easeIn',
            onComplete: () => {
              s.scoringManager.handleScore(tray);
              tray.done = true;
              s.destroyTray(tray);
            },
          });

          s.draggedTray = null;
          return;
        }
      }

      // Snap back if not delivered
      soundManager.cancelSound();
      s.tweens.add({
        targets: gameObject,
        x: s.trayDragStartPos.x,
        y: s.trayDragStartPos.y,
        duration: 200,
        ease: 'Back.easeOut'
      });

      s.draggedTray = null;
    });
  }

  placeHeldItem(pointer) {
    const s = this.scene;
    const obj = s.heldItem.visual;
    const tray = this.findTrayAtX(pointer.x);
    const landY = s.LAND_Y;
    const isTreatment = !!s.heldItem.treatmentKey;
    const savedTreatmentKey = s.heldItem.treatmentKey;
    const savedIngredientKey = s.heldItem.ingredientKey;

    if (tray && tray.onPrepTrack && !tray.completed && !tray.done && pointer.y < tray.container.y + 50) {
      soundManager.robotRelease();
      const fallDist = Math.max(0, landY - obj.y);
      const duration = Math.max(80, Math.min(400, fallDist * 1.8));

      s.tweens.add({
        targets: obj,
        y: landY,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          if (tray && !tray.done) {
            obj.x += (tray.container.x - obj.x) * 0.15;
          }
        },
        onComplete: () => {
          if (isTreatment) {
            s.binsManager.applyTreatmentToTray(tray, savedTreatmentKey);
          } else {
            const key = savedIngredientKey;
            const result = s.trayManager.tryPlace(tray, key);
            if (result === 'valid') {
              const ing = INGREDIENTS[key];
              soundManager.plopCategory(ing.category);
              s.particleManager.ingredientPlaced(tray.container.x, landY, ing.color);
            } else if (result === 'wrong') {
              soundManager.buzz();
              s.currentScore = Math.max(0, s.currentScore - 25);
              s.refreshHUD();
              s.flashTray(tray, 0xff0000);
              s.particleManager.errorSparks(tray.container.x, landY);

              const expectedKey = tray.order.ingredients[tray.placed.length];
              const expectedName = expectedKey ? INGREDIENTS[expectedKey].name : '?';
              const needTxt = s.add.text(tray.container.x, tray.container.y - 60,
                `Need ${expectedName}!\n-25`, {
                fontSize: '18px', color: '#ff4444', fontFamily: GAME_FONT, fontStyle: 'bold',
                align: 'center',
              }).setOrigin(0.5).setDepth(100);
              s.tweens.add({
                targets: needTxt, y: needTxt.y - 40, alpha: 0, duration: 1200,
                onComplete: () => needTxt.destroy(),
              });
            }
          }
          obj.destroy();
        },
      });

      s.heldItem = null;
      s.trayHighlight.clear();
    } else {
      this.cancelHeldItem();
    }
  }

  cancelHeldItem() {
    const s = this.scene;
    if (!s.heldItem) return;
    soundManager.robotRelease();
    soundManager.cancelSound();
    const obj = s.heldItem.visual;

    s.tweens.add({
      targets: obj,
      y: obj.y + 60,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => obj.destroy(),
    });

    s.heldItem = null;
    s.trayHighlight.clear();
  }

  setupKeyboardShortcuts() {
    const s = this.scene;
    const day = s.day ?? 99;

    this.shortcutMap = {
      'bread_white': 'Z', 'bread_wheat': 'X', 'bread_sourdough': 'C',
      'meat_ham': '1', 'meat_turkey': '2', 'meat_roastbeef': '3', 'meat_bacon': '4', 'meat_prosciutto': 'Q',
      'top_lettuce': '5', 'top_tomato': '6', 'top_onion': '7',
      'top_pickles': '8', 'top_arugula': '9', 'top_olives': '0',
      'cheese_american': 'W', 'cheese_swiss': 'E',
      'sauce_mayo': 'A', 'sauce_mustard': 'S',
      'toasted': 'R', 'togo': 'F', 'salt': 'G', 'pepper': 'H', 'oil_vinegar': 'V',
    };

    const KC = Phaser.Input.Keyboard.KeyCodes;

    const bindings = [
      { code: KC.Z,     ingredient: 'bread_white' },
      { code: KC.X,     ingredient: 'bread_wheat' },
      { code: KC.C,     ingredient: 'bread_sourdough' },
      { code: KC.ONE,   ingredient: 'meat_ham' },
      { code: KC.TWO,   ingredient: 'meat_turkey' },
      { code: KC.THREE, ingredient: 'meat_roastbeef' },
      { code: KC.FOUR,  ingredient: 'meat_bacon' },
      { code: KC.Q,     ingredient: 'meat_prosciutto' },
      { code: KC.FIVE,  ingredient: 'top_lettuce' },
      { code: KC.SIX,   ingredient: 'top_tomato' },
      { code: KC.SEVEN, ingredient: 'top_onion' },
      { code: KC.EIGHT, ingredient: 'top_pickles' },
      { code: KC.NINE,  ingredient: 'top_arugula' },
      { code: KC.ZERO,  ingredient: 'top_olives' },
      { code: KC.W,     ingredient: 'cheese_american' },
      { code: KC.E,     ingredient: 'cheese_swiss' },
      { code: KC.A,     ingredient: 'sauce_mayo' },
      { code: KC.S,     ingredient: 'sauce_mustard' },
      { code: KC.R,     treatment: 'toasted' },
      { code: KC.F,     treatment: 'togo' },
      { code: KC.G,     treatment: 'salt' },
      { code: KC.H,     treatment: 'pepper' },
      { code: KC.V,     treatment: 'oil_vinegar' },
    ];

    bindings.forEach(({ code, ingredient, treatment }) => {
      const key = s.input.keyboard.addKey(code);
      key.emitOnRepeat = false;
      key.on('down', () => {
        if (s.isPaused || s.heldItem || !s.isStoreOpen) return;

        if (ingredient) {
          const ing = INGREDIENTS[ingredient];
          if (ing && ing.unlockDay && day < ing.unlockDay) {
            return;
          }
        }

        soundManager.init();
        if (treatment) {
          s.binsManager.pickupTreatment(treatment);
        } else if (ingredient) {
          const pointer = s.input.activePointer;
          if (ingredient.startsWith('sauce_')) {
            s.binsManager.pickupSauce(ingredient);
          } else {
            soundManager.hotkeySelect();
            const visual = s.createHeldVisual(ingredient, pointer.x, pointer.y);
            s.heldItem = { visual, ingredientKey: ingredient, binX: 0, binY: 0 };
          }
        }
      });
    });
  }
}
