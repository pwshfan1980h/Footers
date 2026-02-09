/**
 * GameSceneTray - Tray spawning, order generation, stack layers, completion
 */
import { INGREDIENTS, INGREDIENTS_BY_CATEGORY, TREATMENTS, DIFFICULTY_PROGRESSION } from '../data/ingredients.js';
import { soundManager } from '../SoundManager.js';
import { gameState } from '../data/GameState.js';
import {
  MAX_ACTIVE_ORDERS, CHEESE_CHANCE, SAUCE_CHANCE, DOUBLE_TREATMENT_CHANCE,
  BASE_PRICE, DEFAULT_INGREDIENT_PRICE, TREATMENT_PRICE,
  LAYER_HEIGHT_SAUCE, LAYER_HEIGHT_TOPPING, LAYER_HEIGHT_CHEESE,
  LAYER_HEIGHT_MEAT, LAYER_HEIGHT_BREAD,
  GAME_FONT, SEQUENTIAL_ORDER_CAP,
} from '../data/constants.js';

export class GameSceneTray {
  constructor(scene) {
    this.scene = scene;
  }

  spawnTray() {
    const s = this.scene;
    if (!s.isStoreOpen) return;

    const activeOrders = s.trays.filter(t => !t.done && !t.completed).length;
    if (activeOrders >= MAX_ACTIVE_ORDERS) return;

    const slot = s.prepTrack.findEmptySlot();
    if (!slot) return;

    const order = this.generateOrder();
    if (!order) return; // insufficient stock for any order
    s.orderNumber++;
    const orderNum = s.orderNumber;

    const container = s.add.container(slot.x, slot.y).setDepth(10);
    container.setAlpha(0);
    container.setScale(0.85);

    const hintText = s.add.text(0, -50, '', {
      fontSize: '12px', color: '#ff0', fontFamily: GAME_FONT, fontStyle: 'bold',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(11);
    container.add(hintText);

    const tray = {
      container,
      order,
      orderNum,
      placed: [],
      stackLayers: [],
      stackHeight: 0,
      appliedTreatments: [],
      completed: false,
      done: false,
      scored: false,
      hintText,
      inHolding: false,
      onPrepTrack: true,
      prepSlot: slot,
      draggable: true,
      waitingForCustomer: true,
    };

    slot.occupied = true;
    slot.tray = tray;

    s.trays.push(tray);

    container.setSize(140, 120);
    s.ordersSpawned++;

    s.customerVessels.dockVessel(tray, () => {
      tray.waitingForCustomer = false;
      tray.spawnedAt = Date.now();

      s.ticketBar.addTicket(order, orderNum);

      s.updateTrayNextHint(tray);

      s.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });

      s.prepTrack.render();
      s.refreshHUD();
    });

    if (s.ordersSpawned === SEQUENTIAL_ORDER_CAP) {
      s.spawnTimer = s.spawnInterval * 0.5;
    }

    s.prepTrack.render();
    s.refreshHUD();
  }

  generateOrder() {
    const s = this.scene;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickN = (arr, n) => {
      const copy = [...arr];
      const out = [];
      for (let i = 0; i < n && copy.length; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    };

    const breads = gameState.getAvailableIngredients('bread')
      .filter(k => gameState.getIngredientCount(k) >= 2); // need 2 for top+bottom
    const meats = gameState.getAvailableIngredients('meat');
    const cheeses = gameState.getAvailableIngredients('cheese');
    const toppings = gameState.getAvailableIngredients('topping');
    const sauces = INGREDIENTS_BY_CATEGORY['sauce'] || [];

    // Must have at least bread and meat to make an order
    if (breads.length === 0 || meats.length === 0) {
      return null;
    }

    const minutesPlayed = s.gameTime / 60;
    const diff = DIFFICULTY_PROGRESSION;
    const maxToppings = Math.min(
      diff.maxMaxToppings,
      Math.floor(diff.initialMaxToppings + minutesPlayed * diff.maxToppingsIncrease)
    );
    const treatmentChance = Math.min(
      diff.maxTreatmentChance,
      diff.initialTreatmentChance + minutesPlayed * diff.treatmentChanceIncrease
    );

    const list = [];
    const bread = pick(breads);

    list.push(bread);
    list.push(pick(meats));

    if (cheeses.length > 0 && Math.random() < CHEESE_CHANCE) {
      list.push(pick(cheeses));
    }

    if (toppings.length > 0) {
      const topCount = Math.floor(Math.random() * (maxToppings + 1));
      if (topCount > 0) {
        pickN(toppings, topCount).forEach((t) => list.push(t));
      }
    }

    if (sauces.length > 0 && Math.random() < SAUCE_CHANCE) {
      list.push(pick(sauces));
    }

    list.push(bread);

    const treatments = [];
    if (Math.random() < treatmentChance) {
      const allTreatments = Object.keys(TREATMENTS);
      const count = Math.random() < DOUBLE_TREATMENT_CHANCE ? 2 : 1;
      const chosen = pickN(allTreatments, count);
      chosen.forEach((t) => treatments.push(t));
    }

    const totalPrice = this.calculateOrderPrice(list, treatments);
    return { ingredients: list, treatments, totalPrice };
  }

  calculateOrderPrice(ingredients, treatments) {
    let price = BASE_PRICE;
    ingredients.forEach(key => {
      const ing = INGREDIENTS[key];
      price += (ing.price || DEFAULT_INGREDIENT_PRICE);
    });
    treatments.forEach(() => price += TREATMENT_PRICE);
    return price;
  }

  tryPlace(tray, ingredientKey) {
    const s = this.scene;
    const nextIndex = tray.placed.length;
    if (nextIndex >= tray.order.ingredients.length) return 'wrong';

    const expected = tray.order.ingredients[nextIndex];
    if (ingredientKey !== expected) return 'wrong';

    tray.placed.push(ingredientKey);

    s.ticketBar.updateTicketIngredient(tray.orderNum, ingredientKey);

    this.addStackLayer(tray, ingredientKey);

    s.updateTrayNextHint(tray);

    this.checkTrayCompletion(tray);

    return 'valid';
  }

  getLayerHeight(ingredientKey) {
    const cat = INGREDIENTS[ingredientKey].category;
    if (cat === 'sauce') return LAYER_HEIGHT_SAUCE;
    if (cat === 'topping') return LAYER_HEIGHT_TOPPING;
    if (cat === 'cheese') return LAYER_HEIGHT_CHEESE;
    if (cat === 'meat') return LAYER_HEIGHT_MEAT;
    return LAYER_HEIGHT_BREAD;
  }

  addStackLayer(tray, ingredientKey) {
    const s = this.scene;
    const ing = INGREDIENTS[ingredientKey];
    const cat = ing.category;

    const layerH = this.getLayerHeight(ingredientKey);
    const ly = -2 - tray.stackHeight;
    tray.stackHeight += layerH;

    const rX = (Math.random() - 0.5) * 4;
    const rY = (Math.random() - 0.5) * 2;
    const w = 55;
    const hw = w / 2;

    if (cat === 'sauce') {
      // Sauce stays as Graphics zigzag
      const g = s.add.graphics();
      g.lineStyle(2.5, ing.color, 0.9);
      g.beginPath();
      const steps = 7;
      g.moveTo(rX - hw + 6, ly + rY);
      for (let i = 1; i <= steps; i++) {
        const px = rX - hw + 6 + (i / steps) * (w - 12);
        const py = ly + rY + (i % 2 === 0 ? -3 : 3);
        g.lineTo(px, py);
      }
      g.strokePath();
      // Sauce uses the old animation pattern (baked coords, tween y from -15 to 0)
      g.y = -15;
      tray.container.add(g);
      tray.stackLayers.push(g);

      const isTopBread = false;
      s.tweens.add({
        targets: g,
        y: 0,
        duration: 120,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.squashLayer(g, tray, ingredientKey, isTopBread);
        },
      });
      this.settleStack(tray, g);
      return;
    }

    // All non-sauce ingredients use SVG images
    const img = s.add.image(rX, ly + rY, ingredientKey);

    if (cat === 'bread') {
      const isBottom = tray.stackLayers.length === 0;
      img.setScale(0.85, isBottom ? 0.33 : 0.28);
      if (!tray.breadLayers) tray.breadLayers = [];
      tray.breadLayers.push({ image: img, key: ingredientKey, isBottom, rX, rY, ly });
    } else if (cat === 'meat') {
      img.setScale(0.43, 0.22);
    } else if (cat === 'cheese') {
      img.setScale(0.43, 0.18);
    } else if (cat === 'topping') {
      img.setScale(0.45, 0.22);
    }

    tray.container.add(img);
    tray.stackLayers.push(img);

    // --- Stacking animation: drop, squash, settle ---
    const isTopBread = cat === 'bread' && tray.stackLayers.length > 1;
    const targetY = ly + rY;

    // Drop in from above
    img.y = targetY - 15;
    s.tweens.add({
      targets: img,
      y: targetY,
      duration: 120,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.squashLayer(img, tray, ingredientKey, isTopBread);
      },
    });

    // Settle existing layers
    this.settleStack(tray, img);
  }

  squashLayer(g, tray, ingredientKey, isTopBread) {
    const s = this.scene;
    const squashY = isTopBread ? 0.5 : 0.6;
    const squashX = isTopBread ? 1.3 : 1.2;
    const squashDuration = isTopBread ? 120 : 80;

    g.scaleY = squashY;
    g.scaleX = squashX;

    s.tweens.add({
      targets: g,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: squashDuration,
      ease: 'Back.easeOut',
    });

    // Top bread triggers a bread-cap particle puff
    if (isTopBread) {
      const worldX = tray.container.x;
      const worldY = tray.container.y - tray.stackHeight;
      s.particleManager.breadCapPuff(worldX, worldY);
    }
  }

  settleStack(tray, newLayer) {
    const s = this.scene;
    for (const layer of tray.stackLayers) {
      if (layer === newLayer) continue;
      const origY = layer.y;
      layer.y = origY + 1.5;
      s.tweens.add({
        targets: layer,
        y: origY,
        duration: 100,
        ease: 'Sine.easeOut',
      });
    }
  }

  checkTrayCompletion(tray) {
    const s = this.scene;
    const ingredientsDone = tray.placed.length === tray.order.ingredients.length;
    const treatmentsDone = !tray.order.treatments || tray.order.treatments.length === 0
      || tray.order.treatments.every((t) => tray.appliedTreatments.includes(t));

    if (ingredientsDone && treatmentsDone) {
      this.completeTray(tray);
    }
  }

  completeTray(tray) {
    const s = this.scene;
    tray.completed = true;
    if (tray.hintText) tray.hintText.setText('');

    // Enable dragging now that the sandwich is complete
    tray.container.setInteractive({ draggable: true, useHandCursor: true });

    s.flashTray(tray, 0x00ff00);

    soundManager.successChime();

    s.particleManager.orderCompleted(tray.container.x, tray.container.y - 20);

    const c = tray.container;
    this.animateCompletionHop(c, c.y);
    this.animateCompletionDance(c);
    this.animateChefPress(c);
  }

  animateCompletionHop(container, baseY) {
    const s = this.scene;
    s.tweens.add({
      targets: container, y: baseY - 18, scaleX: 0.9, scaleY: 1.2,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        s.tweens.add({
          targets: container, y: baseY, scaleX: 1.15, scaleY: 0.85,
          duration: 100, ease: 'Quad.easeIn',
          onComplete: () => {
            s.tweens.add({
              targets: container, scaleX: 1.0, scaleY: 1.0,
              duration: 200, ease: 'Bounce.easeOut',
            });
          },
        });
      },
    });
  }

  animateCompletionDance(container) {
    const s = this.scene;
    s.tweens.chain({
      targets: container,
      tweens: [
        { angle: -10, duration: 80, ease: 'Sine.easeOut', delay: 100 },
        { angle: 10, duration: 100, ease: 'Sine.easeInOut' },
        { angle: -8, duration: 90, ease: 'Sine.easeInOut' },
        { angle: 8, duration: 85, ease: 'Sine.easeInOut' },
        { angle: -4, duration: 75, ease: 'Sine.easeInOut' },
        { angle: 3, duration: 70, ease: 'Sine.easeInOut' },
        { angle: 0, duration: 80, ease: 'Sine.easeOut' },
      ],
    });
  }

  animateChefPress(container) {
    const s = this.scene;
    s.time.delayedCall(700, () => {
      if (!container || !container.scene) return;
      s.tweens.add({
        targets: container,
        scaleY: 0.82,
        scaleX: 1.06,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          s.tweens.add({
            targets: container,
            scaleY: 0.88,
            scaleX: 1.02,
            duration: 200,
            ease: 'Bounce.easeOut',
          });
        },
      });
    });
  }

  destroyTray(tray) {
    if (tray.prepSlot) {
      this.scene.prepTrack.removeTray(tray.prepSlot);
    }
    tray.container.destroy();
  }
}
