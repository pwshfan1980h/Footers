/**
 * GameSceneInteraction - Drag/drop, placement, keyboard shortcuts, held item visuals
 */
import { INGREDIENTS, TREATMENTS } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import {
  GAME_FONT, TICKET_FONT, WRONG_INGREDIENT_PENALTY,
  HELD_ITEM_WIDTH, HELD_ITEM_HEIGHT,
  SCALE_MEAT_CHEESE, SCALE_TOPPING, SCALE_BREAD, SCALE_SAUCE,
  TRAY_MAGNET_RADIUS
} from '../data/constants.js';

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
    c.setSize(HELD_ITEM_WIDTH, HELD_ITEM_HEIGHT);

    const textureKey = key.includes('sauce') ? key + '_bottle' : key;
    const img = s.add.image(0, 0, textureKey).setOrigin(0.5);
    if (key.includes('meat') || key.includes('cheese')) img.setScale(SCALE_MEAT_CHEESE);
    else if (key.includes('top')) img.setScale(SCALE_TOPPING);
    else if (key.includes('bread')) img.setScale(SCALE_BREAD);
    else if (key.includes('sauce')) img.setScale(SCALE_SAUCE);

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
          const magnetRadius = TRAY_MAGNET_RADIUS;

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
      const glowColor = magnetStrength > 0.3 ? 0xFFCC66 : 0xFFBB44;
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
        const hw = 110;
        const highlightTop = targetTray.container.y - 160;
        const highlightH = 240;
        const pulseAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.15 + magnetStrength * 0.3;
        s.trayHighlight.lineStyle(3 + magnetStrength * 2, 0xFFBB44, pulseAlpha);
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
    this.deliveryArrow = null;

    s.input.on('dragstart', (pointer, gameObject) => {
      const tray = s.trays.find(t => t.container === gameObject);
      if (tray && tray.draggable) {
        s.draggedTray = tray;
        s.trayDragStartPos.x = tray.container.x;
        s.trayDragStartPos.y = tray.container.y;
        soundManager.robotPickup();

        // Show delivery arrow over the linked customer
        if (tray.completed) {
          this.showDeliveryArrow(tray);
        }
      }
    });

    s.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (s.draggedTray && s.draggedTray.container === gameObject) {
        gameObject.x = dragX;
        gameObject.y = dragY;

        // Keep arrow tracking the customer (they sway)
        this.updateDeliveryArrow(s.draggedTray);
      }
    });

    s.input.on('dragend', (pointer, gameObject) => {
      const tray = s.draggedTray;
      if (!tray || tray.container !== gameObject) return;

      // Immediately remove the arrow
      this.hideDeliveryArrow();

      const y = gameObject.y;

      // Deliver completed tray by dragging upward into customer/window area
      if (tray.onPrepTrack && tray.completed && y < 500) {
        // Find the linked customer for this tray
        const customer = s.customerManager.customers.find(c => c.tray === tray);
        if (customer && customer.personState === 'at_counter') {
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
              this.updateSellPrompt();
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
              s.currentScore = Math.max(0, s.currentScore - WRONG_INGREDIENT_PENALTY);
              s.refreshHUD();
              s.flashTray(tray, 0xff0000);
              s.particleManager.errorSparks(tray.container.x, landY);

              const expectedKey = tray.order.ingredients[tray.placed.length];
              const expectedName = expectedKey ? INGREDIENTS[expectedKey].name : '?';
              const needTxt = s.add.text(tray.container.x, tray.container.y - 60,
                `Need ${expectedName}!\n-${WRONG_INGREDIENT_PENALTY}`, {
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

  // Find the active tray (first non-completed tray on prep track with a customer)
  findActiveTray() {
    const s = this.scene;
    for (const tray of s.trays) {
      if (!tray.done && !tray.completed && tray.onPrepTrack && !tray.waitingForCustomer) {
        return tray;
      }
    }
    return null;
  }

  // Auto-place ingredient directly onto active tray (no held item state)
  autoPlace(ingredientKey) {
    const s = this.scene;
    const tray = this.findActiveTray();
    if (!tray) return;

    const ing = INGREDIENTS[ingredientKey];
    const result = s.trayManager.tryPlace(tray, ingredientKey);

    if (result === 'valid') {
      // Combo increment
      s.combo++;
      s.comboTimer = 0;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;

      // Audio escalation — rising pitch with combo
      soundManager.comboPlop(s.combo - 1);
      s.particleManager.ingredientPlaced(tray.container.x, s.LAND_Y, ing.color);

      // Combo display
      s.hudManager.updateComboDisplay(s.combo);

      // Small combo bonus points
      if (s.combo > 1) {
        const bonus = s.combo * 2;
        s.currentScore += bonus;
        s.refreshHUD();
      }
    } else if (result === 'wrong') {
      // Reset combo
      s.combo = 0;
      s.comboTimer = 0;
      s.hudManager.updateComboDisplay(0);

      soundManager.buzz();
      s.currentScore = Math.max(0, s.currentScore - WRONG_INGREDIENT_PENALTY);
      s.refreshHUD();
      s.flashTray(tray, 0xff0000);
      s.particleManager.errorSparks(tray.container.x, s.LAND_Y);

      const expectedKey = tray.order.ingredients[tray.placed.length];
      const expectedName = expectedKey ? INGREDIENTS[expectedKey].name : '?';
      const needTxt = s.add.text(tray.container.x, tray.container.y - 60,
        `Need ${expectedName}!\n-${WRONG_INGREDIENT_PENALTY}`, {
        fontSize: '18px', color: '#ff4444', fontFamily: GAME_FONT, fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setDepth(100);
      s.tweens.add({
        targets: needTxt, y: needTxt.y - 40, alpha: 0, duration: 1200,
        onComplete: () => needTxt.destroy(),
      });
    }

    // Update next-key prompt
    this.updateNextKeyPrompt();
  }

  // Auto-apply treatment to active tray
  autoTreat(treatmentKey) {
    const s = this.scene;
    const tray = this.findActiveTray();
    if (!tray) return;

    // Check if tray needs treatments and all ingredients are done
    const ingredientsDone = tray.placed.length === tray.order.ingredients.length;
    if (!ingredientsDone) {
      soundManager.buzz();
      return;
    }

    s.binsManager.applyTreatmentToTray(tray, treatmentKey);

    // Combo on valid treatment
    if (tray.appliedTreatments.includes(treatmentKey)) {
      s.combo++;
      s.comboTimer = 0;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      soundManager.comboPlop(s.combo - 1);
      s.hudManager.updateComboDisplay(s.combo);
    }

    this.updateNextKeyPrompt();
  }

  // === FULL KEY SEQUENCE STRIP ===

  updateNextKeyPrompt() {
    this.updateKeySequenceStrip();
    this.updateSellPrompt();
  }

  updateKeySequenceStrip() {
    const s = this.scene;
    const tray = this.findActiveTray();

    if (!tray || tray.completed || tray.done) {
      if (this.seqContainer) this.seqContainer.setVisible(false);
      return;
    }

    const order = tray.order;

    // Build step list: ingredients then treatments
    const steps = [];
    order.ingredients.forEach((key) => {
      steps.push({ key, shortcut: this.getShortcutKey(key) || '?', type: 'ingredient' });
    });
    (order.treatments || []).forEach((key) => {
      steps.push({ key, shortcut: this.getShortcutKey(key) || '?', type: 'treatment' });
    });

    // Rebuild container when tray changes
    if (!this.seqContainer || this.seqTray !== tray) {
      this.destroyKeySequenceStrip();
      this.seqTray = tray;

      this.seqContainer = s.add.container(0, 0).setDepth(48);
      this.seqBadges = [];

      // Name label for current step
      this.seqNameLabel = s.add.text(0, 20, '', {
        fontSize: '12px', color: '#FFE8CC', fontFamily: TICKET_FONT,
      }).setOrigin(0.5);
      this.seqContainer.add(this.seqNameLabel);

      const badgeW = 30;
      const badgeH = 24;
      const gap = 5;
      const totalW = steps.length * (badgeW + gap) - gap;
      const startX = -totalW / 2;

      steps.forEach((step, i) => {
        const cx = startX + i * (badgeW + gap) + badgeW / 2;
        const bg = s.add.graphics();
        const txt = s.add.text(cx, 0, step.shortcut, {
          fontSize: '14px', color: '#999', fontFamily: GAME_FONT, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.seqContainer.add([bg, txt]);
        this.seqBadges.push({ bg, txt, cx, badgeW, badgeH, step });
      });
    }

    // Position above tray
    this.seqContainer.setPosition(tray.container.x, tray.container.y - 135);
    this.seqContainer.setVisible(true);

    // Determine progress
    const placedCount = tray.placed.length;
    const ingCount = order.ingredients.length;
    const ingredientsDone = placedCount >= ingCount;
    const applied = tray.appliedTreatments || [];
    let foundCurrent = false;
    let currentName = '';
    let currentCx = 0;

    this.seqBadges.forEach((badge, i) => {
      const { bg, txt, cx, badgeW, badgeH, step } = badge;
      bg.clear();

      let state = 'future';

      if (step.type === 'ingredient') {
        if (i < placedCount) {
          state = 'done';
        } else if (i === placedCount && !foundCurrent) {
          state = 'current';
          foundCurrent = true;
          currentName = INGREDIENTS[step.key] ? INGREDIENTS[step.key].name : '';
          currentCx = cx;
        }
      } else if (step.type === 'treatment') {
        if (applied.includes(step.key)) {
          state = 'done';
        } else if (ingredientsDone && !foundCurrent) {
          state = 'current';
          foundCurrent = true;
          currentName = TREATMENTS[step.key] ? TREATMENTS[step.key].name : '';
          currentCx = cx;
        }
      }

      const hw = badgeW / 2;
      const hh = badgeH / 2;

      if (state === 'done') {
        bg.fillStyle(0x0a200a, 0.85);
        bg.fillRoundedRect(cx - hw, -hh, badgeW, badgeH, 5);
        bg.lineStyle(1.5, 0x22AA44, 0.6);
        bg.strokeRoundedRect(cx - hw, -hh, badgeW, badgeH, 5);
        txt.setColor('#22CC44');
        txt.setAlpha(0.5);
        txt.setScale(1);
      } else if (state === 'current') {
        bg.fillStyle(0x1a1510, 0.95);
        bg.fillRoundedRect(cx - hw - 3, -hh - 3, badgeW + 6, badgeH + 6, 6);
        bg.lineStyle(2, 0xFFBB44, 0.95);
        bg.strokeRoundedRect(cx - hw - 3, -hh - 3, badgeW + 6, badgeH + 6, 6);
        txt.setColor('#FFCC66');
        txt.setAlpha(1);
        txt.setScale(1.15);
      } else {
        bg.fillStyle(0x111111, 0.6);
        bg.fillRoundedRect(cx - hw, -hh, badgeW, badgeH, 5);
        bg.lineStyle(1, 0x444444, 0.4);
        bg.strokeRoundedRect(cx - hw, -hh, badgeW, badgeH, 5);
        txt.setColor('#777777');
        txt.setAlpha(0.6);
        txt.setScale(1);
      }
    });

    // Position name label under the current badge
    this.seqNameLabel.setText(currentName);
    this.seqNameLabel.setPosition(currentCx, 20);
  }

  destroyKeySequenceStrip() {
    if (this.seqContainer) {
      this.scene.tweens.killTweensOf(this.seqContainer);
      this.seqContainer.destroy();
      this.seqContainer = null;
      this.seqBadges = null;
      this.seqTray = null;
      this.seqNameLabel = null;
    }
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
        if (s.isPaused || !s.isStoreOpen) return;

        // If already holding an item (from mouse click), ignore hotkey
        if (s.heldItem) return;

        if (ingredient) {
          const ing = INGREDIENTS[ingredient];
          if (ing && ing.unlockDay && day < ing.unlockDay) {
            return;
          }
        }

        soundManager.init();

        // Auto-place directly onto active tray (no held item)
        if (treatment) {
          this.autoTreat(treatment);
        } else if (ingredient) {
          this.autoPlace(ingredient);
        }
      });
    });

    // SPACE key — sell completed sandwich
    const spaceKey = s.input.keyboard.addKey(KC.SPACE);
    spaceKey.emitOnRepeat = false;
    spaceKey.on('down', () => {
      if (s.isPaused || !s.isStoreOpen) return;
      if (s.heldItem) return;
      soundManager.init();
      this.sellFirstCompleted();
    });
  }

  // ======================== SELL PROMPT ========================

  findCompletedTray() {
    const s = this.scene;
    return s.trays.find(t => t.completed && !t.done && !t.scored && t.onPrepTrack);
  }

  updateSellPrompt() {
    const s = this.scene;
    const tray = this.findCompletedTray();

    if (!this.sellContainer) {
      this.sellContainer = s.add.container(0, 0).setDepth(50);
      this.sellBg = s.add.graphics();
      this.sellKeyText = s.add.text(0, 0, '', {
        fontSize: '24px', color: '#44FF88', fontFamily: GAME_FONT, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.sellLabel = s.add.text(0, 24, '', {
        fontSize: '14px', color: '#BBDDCC', fontFamily: TICKET_FONT,
      }).setOrigin(0.5);
      this.sellContainer.add([this.sellBg, this.sellKeyText, this.sellLabel]);
    }

    if (!tray) {
      this.sellContainer.setVisible(false);
      return;
    }

    const customer = s.customerManager.customers.find(c => c.tray === tray);
    if (!customer || customer.personState !== 'at_counter') {
      this.sellContainer.setVisible(false);
      return;
    }

    const name = customer.name || 'Customer';

    this.sellContainer.setPosition(tray.container.x, tray.container.y - 120);
    this.sellContainer.setVisible(true);

    this.sellBg.clear();
    const label = `Sell to ${name}`;
    const w = Math.max(180, label.length * 9 + 40);
    this.sellBg.fillStyle(0x0a1a0a, 0.9);
    this.sellBg.fillRoundedRect(-w / 2, -18, w, 56, 8);
    this.sellBg.lineStyle(2, 0x44FF88, 0.9);
    this.sellBg.strokeRoundedRect(-w / 2, -18, w, 56, 8);

    this.sellKeyText.setText('SPACE');
    this.sellLabel.setText(label);

    // Pulse animation (only start once)
    if (!this.sellPulsing) {
      this.sellPulsing = true;
      s.tweens.add({
        targets: this.sellContainer,
        scaleX: 1.06, scaleY: 1.06,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  sellFirstCompleted() {
    const s = this.scene;
    const tray = this.findCompletedTray();
    if (!tray) return;

    const customer = s.customerManager.customers.find(c => c.tray === tray);
    if (!customer || customer.personState !== 'at_counter') return;

    // Remove from prep track
    if (tray.prepSlot) {
      s.prepTrack.removeTray(tray.prepSlot);
    }
    tray.onPrepTrack = false;
    tray.draggable = false;
    tray.container.disableInteractive();
    soundManager.whoosh();

    // Animate tray flying to customer
    s.tweens.add({
      targets: tray.container,
      x: customer.personX,
      y: customer.personY,
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

    // Update prompts
    this.updateSellPrompt();
    this.updateNextKeyPrompt();
  }

  // ======================== DELIVERY ARROW ========================

  showDeliveryArrow(tray) {
    this.hideDeliveryArrow();

    const s = this.scene;
    const customer = s.customerManager.customers.find(c => c.tray === tray);
    if (!customer || customer.personState !== 'at_counter') return;

    const container = s.add.container(customer.personX, customer.personY - 55).setDepth(50);

    // Draw arrow using graphics
    const g = s.add.graphics();
    // Arrow shaft
    g.fillStyle(0xFFBB44, 0.9);
    g.fillRect(-3, -18, 6, 18);
    // Arrow head (triangle pointing down)
    g.fillStyle(0xFFBB44, 0.9);
    g.beginPath();
    g.moveTo(-10, 0);
    g.lineTo(10, 0);
    g.lineTo(0, 14);
    g.closePath();
    g.fillPath();
    // Bright edge highlight
    g.lineStyle(1, 0xFFCC66, 0.6);
    g.beginPath();
    g.moveTo(-10, 0);
    g.lineTo(0, 14);
    g.lineTo(10, 0);
    g.closePath();
    g.strokePath();
    container.add(g);

    // Glow behind arrow
    const glow = s.add.graphics();
    glow.fillStyle(0xFFBB44, 0.15);
    glow.fillCircle(0, 0, 20);
    container.addAt(glow, 0);

    // Bouncing animation
    s.tweens.add({
      targets: container,
      y: container.y - 8,
      duration: 400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Pulsing glow
    s.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Fade in
    container.setAlpha(0);
    container.setScale(0.5);
    s.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    this.deliveryArrow = { container, glow, customer };
  }

  updateDeliveryArrow(tray) {
    if (!this.deliveryArrow) return;

    const { container, customer } = this.deliveryArrow;
    if (!customer || customer.personState !== 'at_counter') {
      this.hideDeliveryArrow();
      return;
    }

    // Track customer X (they may sway); keep base Y offset
    container.x = customer.personX;
  }

  hideDeliveryArrow() {
    if (!this.deliveryArrow) return;

    const { container, glow } = this.deliveryArrow;
    // Stop all tweens and destroy immediately
    this.scene.tweens.killTweensOf(container);
    this.scene.tweens.killTweensOf(glow);
    container.destroy();
    this.deliveryArrow = null;
  }
}
