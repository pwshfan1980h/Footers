const STORAGE_KEY = 'footers_gamestate';

class GameState {
  constructor() {
    this.currentLocation = 'hub_central';
    this.truckshipWorldX = 1500;
    this.truckshipWorldY = 900;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
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
      this.truckshipWorldX = data.truckshipWorldX ?? 1500;
      this.truckshipWorldY = data.truckshipWorldY ?? 900;
      this.totalMoney = data.totalMoney || 0;
      this.shiftsCompleted = data.shiftsCompleted || 0;
      this.locationsVisited = new Set(data.locationsVisited || ['hub_central']);
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
    this.truckshipWorldX = 1500;
    this.truckshipWorldY = 900;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
    this.stats = {
      totalOrdersCompleted: 0,
      totalOrdersMissed: 0,
      bestShiftEarnings: 0,
      fastestOrder: null,
      totalSandwiches: 0,
    };
    this.save();
  }
}

export const gameState = new GameState();
