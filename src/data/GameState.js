const STORAGE_KEY = 'footers_gamestate';

class GameState {
  constructor() {
    this.currentLocation = 'hub_central';
    this.truckshipWorldX = 1500;
    this.truckshipWorldY = 1000;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
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
      this.truckshipWorldY = data.truckshipWorldY ?? 1000;
      this.totalMoney = data.totalMoney || 0;
      this.shiftsCompleted = data.shiftsCompleted || 0;
      this.locationsVisited = new Set(data.locationsVisited || ['hub_central']);
    } catch (e) {
      // corrupted or unavailable
    }
  }

  updateAfterShift(locationId, earnings, ordersCompleted, ordersMissed) {
    this.totalMoney += earnings;
    this.shiftsCompleted++;
    if (locationId) {
      this.locationsVisited.add(locationId);
      this.currentLocation = locationId;
    }
    this.save();
  }

  reset() {
    this.currentLocation = 'hub_central';
    this.truckshipWorldX = 1500;
    this.truckshipWorldY = 1000;
    this.totalMoney = 0;
    this.shiftsCompleted = 0;
    this.locationsVisited = new Set(['hub_central']);
    this.save();
  }
}

export const gameState = new GameState();
