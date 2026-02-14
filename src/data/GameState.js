const STORAGE_KEY = 'footers_gamestate';

class GameState {
  constructor() {
    this.gamesPlayed = 0;
    this.stats = {
      totalOrdersCompleted: 0,
      totalOrdersMissed: 0,
      fastestOrder: null,
      totalSandwiches: 0,
    };
    this.load();
  }

  save() {
    try {
      const data = {
        gamesPlayed: this.gamesPlayed,
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
      this.gamesPlayed = data.gamesPlayed || 0;
      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (e) {
      // corrupted or unavailable
    }
  }

  updateAfterShift(ordersCompleted, ordersMissed, fastestOrder) {
    this.gamesPlayed++;

    this.stats.totalOrdersCompleted += ordersCompleted || 0;
    this.stats.totalOrdersMissed += ordersMissed || 0;
    this.stats.totalSandwiches += ordersCompleted || 0;
    if (fastestOrder != null && (this.stats.fastestOrder == null || fastestOrder < this.stats.fastestOrder)) {
      this.stats.fastestOrder = fastestOrder;
    }

    this.save();
  }

  reset() {
    this.gamesPlayed = 0;
    this.stats = {
      totalOrdersCompleted: 0,
      totalOrdersMissed: 0,
      fastestOrder: null,
      totalSandwiches: 0,
    };
    this.save();
  }
}

export const gameState = new GameState();
