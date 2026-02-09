import { MAX_STOCK_PER_INGREDIENT, DEFAULT_STOCK_PER_INGREDIENT } from './constants.js';
import { INGREDIENTS, ALL_INGREDIENT_KEYS, INGREDIENTS_BY_CATEGORY } from './ingredients.js';

const STORAGE_KEY = 'footers_gamestate';

function defaultInventory() {
  const inv = {};
  ALL_INGREDIENT_KEYS.forEach(k => { inv[k] = DEFAULT_STOCK_PER_INGREDIENT; });
  return inv;
}

function isOldInventoryFormat(inv) {
  // Old format used category keys like 'bread', 'meat', etc.
  // New format uses ingredient keys like 'bread_white', 'meat_ham', etc.
  return inv && ('bread' in inv || 'meat' in inv) && !('bread_white' in inv);
}

class GameState {
  constructor() {
    this.currentLocation = 'hub_central';
    this.truckshipWorldX = 960;
    this.truckshipWorldY = 560;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
    this.inventory = defaultInventory();
    this.stats = {
      totalOrdersCompleted: 0,
      totalOrdersMissed: 0,
      bestShiftEarnings: 0,
      fastestOrder: null,
      totalSandwiches: 0,
    };
    this.load();
  }

  save() {
    try {
      const data = {
        currentLocation: this.currentLocation,
        truckshipWorldX: this.truckshipWorldX,
        truckshipWorldY: this.truckshipWorldY,
        totalMoney: this.totalMoney,
        shiftsCompleted: this.shiftsCompleted,
        locationsVisited: [...this.locationsVisited],
        inventory: this.inventory,
        stats: this.stats,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.currentLocation = data.currentLocation || 'hub_central';
      this.truckshipWorldX = data.truckshipWorldX ?? 960;
      this.truckshipWorldY = data.truckshipWorldY ?? 560;
      this.totalMoney = data.totalMoney || 0;
      this.shiftsCompleted = data.shiftsCompleted || 0;
      this.locationsVisited = new Set(data.locationsVisited || ['hub_central']);
      if (data.inventory && !isOldInventoryFormat(data.inventory)) {
        this.inventory = { ...defaultInventory(), ...data.inventory };
      }
      // else: old format or missing — keep fresh defaults
      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (e) {
      // corrupted or unavailable
    }
  }

  updateAfterShift(locationId, earnings, ordersCompleted, ordersMissed, fastestOrder) {
    this.totalMoney += earnings;
    this.shiftsCompleted++;
    if (locationId) {
      this.locationsVisited.add(locationId);
      this.currentLocation = locationId;
    }

    this.stats.totalOrdersCompleted += ordersCompleted || 0;
    this.stats.totalOrdersMissed += ordersMissed || 0;
    this.stats.totalSandwiches += ordersCompleted || 0;
    if (earnings > this.stats.bestShiftEarnings) {
      this.stats.bestShiftEarnings = earnings;
    }
    if (fastestOrder != null && (this.stats.fastestOrder == null || fastestOrder < this.stats.fastestOrder)) {
      this.stats.fastestOrder = fastestOrder;
    }

    this.save();
  }

  reset() {
    this.currentLocation = 'hub_central';
    this.truckshipWorldX = 960;
    this.truckshipWorldY = 560;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
    this.inventory = defaultInventory();
    this.stats = {
      totalOrdersCompleted: 0,
      totalOrdersMissed: 0,
      bestShiftEarnings: 0,
      fastestOrder: null,
      totalSandwiches: 0,
    };
    this.save();
  }

  // --- Per-ingredient inventory methods ---

  hasIngredientStock(key) {
    return (this.inventory[key] || 0) > 0;
  }

  useIngredient(key) {
    if (!this.hasIngredientStock(key)) return false;
    this.inventory[key]--;
    return true;
  }

  getIngredientCount(key) {
    return this.inventory[key] || 0;
  }

  addIngredientStock(key, amount) {
    this.inventory[key] = Math.min(
      MAX_STOCK_PER_INGREDIENT,
      (this.inventory[key] || 0) + amount
    );
  }

  buyIngredient(key, amount) {
    const ing = INGREDIENTS[key];
    if (!ing) return false;
    const current = this.inventory[key] || 0;
    const canAdd = Math.min(amount, MAX_STOCK_PER_INGREDIENT - current);
    if (canAdd <= 0) return false;
    const cost = canAdd * ing.wholesalePrice;
    if (this.totalMoney < cost) return false;
    this.totalMoney -= cost;
    this.inventory[key] = current + canAdd;
    this.save();
    return { bought: canAdd, spent: cost };
  }

  // --- Category-level helpers ---

  getCategoryStock(category) {
    const keys = INGREDIENTS_BY_CATEGORY[category] || [];
    let total = 0;
    keys.forEach(k => { total += this.inventory[k] || 0; });
    return total;
  }

  getAvailableIngredients(category) {
    const keys = INGREDIENTS_BY_CATEGORY[category] || [];
    return keys.filter(k => (this.inventory[k] || 0) > 0);
  }

  hasCategoryStock(category) {
    const keys = INGREDIENTS_BY_CATEGORY[category] || [];
    return keys.some(k => (this.inventory[k] || 0) > 0);
  }

  getRestockAllCost() {
    let cost = 0;
    ALL_INGREDIENT_KEYS.forEach(k => {
      if (INGREDIENTS[k].category === 'sauce') return;
      const current = this.inventory[k] || 0;
      const needed = MAX_STOCK_PER_INGREDIENT - current;
      if (needed > 0) {
        cost += needed * INGREDIENTS[k].wholesalePrice;
      }
    });
    return cost;
  }

  restockAll() {
    const cost = this.getRestockAllCost();
    if (cost <= 0) return false;
    if (this.totalMoney < cost) return false;
    this.totalMoney -= cost;
    ALL_INGREDIENT_KEYS.forEach(k => {
      if (INGREDIENTS[k].category === 'sauce') return;
      this.inventory[k] = MAX_STOCK_PER_INGREDIENT;
    });
    this.save();
    return true;
  }

  isFullyStocked() {
    return ALL_INGREDIENT_KEYS.every(k =>
      INGREDIENTS[k].category === 'sauce' || (this.inventory[k] || 0) >= MAX_STOCK_PER_INGREDIENT
    );
  }
}

export const gameState = new GameState();
