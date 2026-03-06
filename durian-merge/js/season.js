// Weekly Season System — date-based theme rotation with special missions
const SeasonManager = (() => {
  const STORAGE_KEY = 'durianMergeSeason';

  const THEMES = [
    {
      id: 'tropical_summer',
      name: 'Tropical Summer',
      bgColors: ['#041E1A', '#0A3D35'],
      accentColor: '#FFD700',
      specialMissions: [
        { id: 'season_score_800', type: 'score', target: 800, label: 'Score 800 in Tropical Summer', icon: '☀️' },
        { id: 'season_merge_5', type: 'merge_any', target: 5, label: 'Merge 5 times this week', icon: '🌴' },
      ],
    },
    {
      id: 'midnight_neon',
      name: 'Midnight Neon',
      bgColors: ['#0A0020', '#1A0040'],
      accentColor: '#FF00FF',
      specialMissions: [
        { id: 'season_combo_4', type: 'combo', target: 4, label: 'Get a 4x combo in Neon Night', icon: '🌙' },
        { id: 'season_play_5', type: 'play', target: 5, label: 'Play 5 games this week', icon: '🎮' },
      ],
    },
    {
      id: 'sakura_spring',
      name: 'Sakura Spring',
      bgColors: ['#1A0A10', '#2A1020'],
      accentColor: '#FFB7C5',
      specialMissions: [
        { id: 'season_merge_dragon', type: 'merge', fruitLevel: 5, target: 1, label: 'Create a Dragon Fruit', icon: '🌸' },
        { id: 'season_score_1200', type: 'score', target: 1200, label: 'Score 1200 in Sakura Spring', icon: '🎋' },
      ],
    },
    {
      id: 'ocean_deep',
      name: 'Ocean Deep',
      bgColors: ['#001A2A', '#003050'],
      accentColor: '#00CED1',
      specialMissions: [
        { id: 'season_merge_10', type: 'merge_any', target: 10, label: 'Merge 10 times this week', icon: '🐚' },
        { id: 'season_combo_3', type: 'combo', target: 3, label: 'Get a 3x combo in Ocean Deep', icon: '🌊' },
      ],
    },
    {
      id: 'golden_harvest',
      name: 'Golden Harvest',
      bgColors: ['#1A1000', '#2A1A00'],
      accentColor: '#DAA520',
      specialMissions: [
        { id: 'season_score_1500', type: 'score', target: 1500, label: 'Score 1500 in Golden Harvest', icon: '🌾' },
        { id: 'season_merge_papaya', type: 'merge', fruitLevel: 6, target: 1, label: 'Create a Papaya', icon: '🍂' },
      ],
    },
    {
      id: 'aurora_night',
      name: 'Aurora Night',
      bgColors: ['#000A1A', '#001030'],
      accentColor: '#7DF9FF',
      specialMissions: [
        { id: 'season_combo_5', type: 'combo', target: 5, label: 'Get a 5x combo in Aurora Night', icon: '🌌' },
        { id: 'season_play_8', type: 'play', target: 8, label: 'Play 8 games this week', icon: '✨' },
      ],
    },
  ];

  function getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  }

  function getCurrentTheme() {
    const weekNum = getWeekNumber();
    const index = weekNum % THEMES.length;
    return THEMES[index];
  }

  function getSeasonMissions() {
    return getCurrentTheme().specialMissions;
  }

  function applyTheme() {
    const theme = getCurrentTheme();

    // Update CSS custom properties
    document.documentElement.style.setProperty('--season-bg1', theme.bgColors[0]);
    document.documentElement.style.setProperty('--season-bg2', theme.bgColors[1]);
    document.documentElement.style.setProperty('--season-accent', theme.accentColor);

    // Update season label
    const label = document.getElementById('seasonLabel');
    if (label) label.textContent = theme.name;

    return theme;
  }

  function getThemeBgColors() {
    return getCurrentTheme().bgColors;
  }

  function getAccentColor() {
    return getCurrentTheme().accentColor;
  }

  // Season mission progress (separate from daily missions)
  function getSeasonProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const weekNum = getWeekNumber();
      if (data.weekNum !== weekNum) return {};
      return data.progress || {};
    } catch { return {}; }
  }

  function trackSeasonMission(eventType, value) {
    const theme = getCurrentTheme();
    const weekNum = getWeekNumber();

    let data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      data = raw ? JSON.parse(raw) : {};
    } catch { data = {}; }

    if (data.weekNum !== weekNum) {
      data = { weekNum, progress: {}, completed: {} };
    }

    let changed = false;
    for (const mission of theme.specialMissions) {
      if (data.completed[mission.id]) continue;

      let shouldIncrement = false;
      switch (mission.type) {
        case 'score':
          if (eventType === 'score' && typeof value === 'number') {
            data.progress[mission.id] = Math.max(data.progress[mission.id] || 0, value);
            changed = true;
          }
          break;
        case 'merge':
          if (eventType === 'merge' && value === mission.fruitLevel) shouldIncrement = true;
          break;
        case 'merge_any':
          if (eventType === 'merge') shouldIncrement = true;
          break;
        case 'combo':
          if (eventType === 'combo' && typeof value === 'number') {
            data.progress[mission.id] = Math.max(data.progress[mission.id] || 0, value);
            changed = true;
          }
          break;
        case 'play':
          if (eventType === 'play') shouldIncrement = true;
          break;
      }

      if (shouldIncrement) {
        data.progress[mission.id] = (data.progress[mission.id] || 0) + 1;
        changed = true;
      }

      if ((data.progress[mission.id] || 0) >= mission.target && !data.completed[mission.id]) {
        data.completed[mission.id] = true;
        changed = true;
      }
    }

    if (changed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
    }
  }

  // Init: apply theme on load
  function init() {
    applyTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getCurrentTheme, getSeasonMissions, applyTheme,
    getThemeBgColors, getAccentColor, getSeasonProgress,
    trackSeasonMission,
  };
})();
