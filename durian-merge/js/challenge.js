// Challenge/Game Mode System — 5 modes total
const ChallengeManager = (() => {
  const STORAGE_KEY = 'durianMergeChallenges';

  const MODES = {
    normal: {
      id: 'normal',
      name: 'Normal',
      icon: '🎮',
      desc: 'Classic Durian Merge',
      difficulty: 1,
      reward: null,
      settings: {},
    },
    timeattack: {
      id: 'timeattack',
      name: 'Time Attack',
      icon: '⏱️',
      desc: '60 seconds — score as high as you can!',
      difficulty: 2,
      reward: { type: 'item', itemId: 'shake', count: 1 },
      settings: { timeLimit: 60000, dangerEnabled: true },
    },
    tinyfruit: {
      id: 'tinyfruit',
      name: 'Tiny Fruit',
      icon: '🔬',
      desc: 'All fruits are 70% smaller',
      difficulty: 3,
      reward: { type: 'item', itemId: 'shake', count: 1 },
      settings: { radiusScale: 0.7 },
    },
    hard: {
      id: 'hard',
      name: 'Hard Mode',
      icon: '🔥',
      desc: 'Gravity x1.5, faster pace, 1s danger timeout',
      difficulty: 4,
      reward: { type: 'ticket', count: 3 },
      settings: { gravityScale: 1.5, dropCooldown: 200, dangerTimeout: 1000 },
    },
    speedrun: {
      id: 'speedrun',
      name: 'Speed Run',
      icon: '🏁',
      desc: 'Reach 1000 points as fast as possible!',
      difficulty: 3,
      reward: { type: 'item', itemId: 'shake', count: 2 },
      settings: { targetScore: 1000 },
    },
    zen: {
      id: 'zen',
      name: 'Zen Mode',
      icon: '🧘',
      desc: 'No danger line, no score — just relax',
      difficulty: 1,
      reward: null,
      settings: { dangerEnabled: false, scoreEnabled: false },
    },
  };

  let currentMode = 'normal';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completed: {}, bestTimes: {} };
      return JSON.parse(raw);
    } catch { return { completed: {}, bestTimes: {} }; }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
  }

  function setMode(modeId) {
    if (!MODES[modeId]) return false;
    currentMode = modeId;
    return true;
  }

  function getMode() {
    return currentMode;
  }

  function getModeSettings() {
    return MODES[currentMode].settings;
  }

  function getModeDef(modeId) {
    return MODES[modeId || currentMode];
  }

  function getAllModes() {
    return Object.values(MODES);
  }

  function isNormal() {
    return currentMode === 'normal';
  }

  function completeMode(modeId, score, timeMs) {
    const data = load();
    if (!data.completed[modeId]) data.completed[modeId] = 0;
    data.completed[modeId]++;

    // Track best time for speedrun
    if (modeId === 'speedrun' && timeMs) {
      if (!data.bestTimes[modeId] || timeMs < data.bestTimes[modeId]) {
        data.bestTimes[modeId] = timeMs;
      }
    }

    save(data);

    // Grant reward
    const mode = MODES[modeId];
    if (mode && mode.reward) {
      grantReward(mode.reward);
    }
  }

  function grantReward(reward) {
    if (!reward) return;
    if (reward.type === 'item' && typeof ItemManager !== 'undefined') {
      ItemManager.addItem(reward.itemId, reward.count);
    } else if (reward.type === 'ticket' && typeof TicketManager !== 'undefined') {
      for (let i = 0; i < (reward.count || 1); i++) {
        TicketManager.addTicket();
      }
    }
  }

  function getCompletionCount(modeId) {
    return load().completed[modeId] || 0;
  }

  function getBestTime(modeId) {
    return load().bestTimes[modeId] || null;
  }

  function resetMode() {
    currentMode = 'normal';
  }

  return {
    setMode, getMode, getModeSettings, getModeDef, getAllModes,
    isNormal, completeMode, getCompletionCount, getBestTime, resetMode,
  };
})();
