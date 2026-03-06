// Analytics Manager — Local statistics tracking
// IIFE pattern, stores data in localStorage

const AnalyticsManager = (() => {
  const STORAGE_KEY = 'durianMergeAnalytics';

  // Default stats structure
  function defaultStats() {
    return {
      totalPlays: 0,
      totalPlayTimeMs: 0,
      highScore: 0,
      lowestScore: Infinity,
      totalScore: 0,
      mergeCounts: new Array(11).fill(0), // index = fruit level (0~10)
      maxFruitLevel: 0,
      dailyRecords: {}, // { 'YYYY-MM-DD': { plays, totalScore, bestScore, playTimeMs } }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStats();
      const parsed = JSON.parse(raw);
      // Ensure mergeCounts has 11 entries
      if (!parsed.mergeCounts || parsed.mergeCounts.length < 11) {
        parsed.mergeCounts = new Array(11).fill(0);
      }
      if (!parsed.dailyRecords) parsed.dailyRecords = {};
      if (parsed.lowestScore === null) parsed.lowestScore = Infinity;
      return parsed;
    } catch {
      return defaultStats();
    }
  }

  function save(stats) {
    // Convert Infinity to null for JSON (restore on load)
    const toSave = Object.assign({}, stats);
    if (toSave.lowestScore === Infinity) toSave.lowestScore = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function pruneDaily(records) {
    // Keep only last 7 days
    const keys = Object.keys(records).sort().reverse();
    const pruned = {};
    for (let i = 0; i < Math.min(7, keys.length); i++) {
      pruned[keys[i]] = records[keys[i]];
    }
    return pruned;
  }

  // ===== PUBLIC METHODS =====

  function track(eventName, data) {
    const stats = load();
    const today = todayKey();

    if (!stats.dailyRecords[today]) {
      stats.dailyRecords[today] = { plays: 0, totalScore: 0, bestScore: 0, playTimeMs: 0 };
    }
    const daily = stats.dailyRecords[today];

    switch (eventName) {
      case 'game_start':
        stats.totalPlays++;
        daily.plays++;
        break;

      case 'game_over': {
        const score = (data && data.score) || 0;
        const playTimeMs = (data && data.playTimeMs) || 0;

        stats.totalPlayTimeMs += playTimeMs;
        stats.totalScore += score;
        daily.totalScore += score;
        daily.playTimeMs += playTimeMs;

        if (score > stats.highScore) stats.highScore = score;
        if (score < stats.lowestScore || stats.lowestScore === null) stats.lowestScore = score;
        if (score > daily.bestScore) daily.bestScore = score;
        break;
      }

      case 'merge': {
        const fruitLevel = (data && data.fruitLevel) || 0;
        if (fruitLevel >= 0 && fruitLevel < 11) {
          stats.mergeCounts[fruitLevel]++;
        }
        if (fruitLevel > stats.maxFruitLevel) stats.maxFruitLevel = fruitLevel;
        break;
      }

      case 'combo': {
        const comboCount = (data && data.count) || 0;
        if (!stats.comboStats) stats.comboStats = { total: 0, max: 0, distribution: {} };
        stats.comboStats.total++;
        if (comboCount > stats.comboStats.max) stats.comboStats.max = comboCount;
        const key = String(comboCount);
        stats.comboStats.distribution[key] = (stats.comboStats.distribution[key] || 0) + 1;
        break;
      }

      case 'ad_watched':
        // Track ad watches (extensible)
        break;
    }

    stats.dailyRecords = pruneDaily(stats.dailyRecords);
    save(stats);
  }

  function getStats() {
    const stats = load();
    const avgScore = stats.totalPlays > 0
      ? Math.round(stats.totalScore / stats.totalPlays)
      : 0;
    const lowestScore = (stats.lowestScore === Infinity || stats.lowestScore === null)
      ? 0
      : stats.lowestScore;

    // Format play time
    const totalSeconds = Math.floor(stats.totalPlayTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let playTimeFormatted;
    if (hours > 0) {
      playTimeFormatted = hours + 'h ' + minutes + 'm';
    } else if (minutes > 0) {
      playTimeFormatted = minutes + 'm ' + seconds + 's';
    } else {
      playTimeFormatted = seconds + 's';
    }

    // Daily records (last 7 days, sorted recent first)
    const dailyKeys = Object.keys(stats.dailyRecords).sort().reverse();
    const dailyList = dailyKeys.map(key => ({
      date: key,
      plays: stats.dailyRecords[key].plays,
      bestScore: stats.dailyRecords[key].bestScore,
      totalScore: stats.dailyRecords[key].totalScore,
      playTimeMs: stats.dailyRecords[key].playTimeMs,
    }));

    // Max fruit name
    const maxFruitName = (typeof FRUITS !== 'undefined' && FRUITS[stats.maxFruitLevel])
      ? FRUITS[stats.maxFruitLevel].name
      : 'None';

    // Combo stats
    const comboStats = stats.comboStats || { total: 0, max: 0, distribution: {} };

    return {
      totalPlays: stats.totalPlays,
      totalPlayTime: playTimeFormatted,
      totalPlayTimeMs: stats.totalPlayTimeMs,
      avgScore,
      highScore: stats.highScore,
      lowestScore,
      mergeCounts: stats.mergeCounts.slice(),
      maxFruitLevel: stats.maxFruitLevel,
      maxFruitName,
      dailyRecords: dailyList,
      comboStats,
    };
  }

  // ===== STATS UI =====

  function showStatsScreen() {
    const overlay = document.getElementById('statsOverlay');
    if (!overlay) return;

    const stats = getStats();
    renderStats(stats);
    overlay.style.display = 'flex';
  }

  function hideStatsScreen() {
    const overlay = document.getElementById('statsOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function renderStats(stats) {
    // Summary cards
    document.getElementById('statTotalPlays').textContent = stats.totalPlays;
    document.getElementById('statPlayTime').textContent = stats.totalPlayTime;
    document.getElementById('statAvgScore').textContent = stats.avgScore.toLocaleString();
    document.getElementById('statHighScore').textContent = stats.highScore.toLocaleString();
    document.getElementById('statLowestScore').textContent = stats.lowestScore.toLocaleString();
    document.getElementById('statMaxFruit').textContent = stats.maxFruitName;

    // Merge counts with bar chart
    const mergeList = document.getElementById('statMergeList');
    mergeList.innerHTML = '';
    const maxMerge = Math.max(1, ...stats.mergeCounts);
    for (let i = 0; i < stats.mergeCounts.length; i++) {
      const fruitName = (typeof FRUITS !== 'undefined' && FRUITS[i])
        ? FRUITS[i].name
        : ('Lv.' + i);
      const count = stats.mergeCounts[i];
      const pct = Math.round((count / maxMerge) * 100);
      const color = (typeof FRUITS !== 'undefined' && FRUITS[i]) ? FRUITS[i].color : '#888';
      const row = document.createElement('div');
      row.className = 'stat-merge-row';
      row.innerHTML =
        '<span class="stat-merge-name">' + fruitName + '</span>' +
        '<div class="stat-merge-bar"><div class="stat-merge-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<span class="stat-merge-count">' + count.toLocaleString() + '</span>';
      mergeList.appendChild(row);
    }

    // Combo stats
    const comboSection = document.getElementById('statComboSection');
    if (comboSection && stats.comboStats) {
      const cs = stats.comboStats;
      document.getElementById('statBestCombo').textContent = cs.max ? cs.max + 'x' : '-';
      document.getElementById('statTotalCombos').textContent = cs.total;

      // Combo distribution
      const distList = document.getElementById('statComboDistribution');
      if (distList) {
        distList.innerHTML = '';
        const entries = Object.entries(cs.distribution).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        const maxDist = Math.max(1, ...entries.map(e => e[1]));
        for (const [combo, count] of entries) {
          const pct = Math.round((count / maxDist) * 100);
          const row = document.createElement('div');
          row.className = 'stat-combo-row';
          row.innerHTML =
            '<span class="stat-combo-label">' + combo + 'x</span>' +
            '<div class="stat-merge-bar"><div class="stat-merge-bar-fill" style="width:' + pct + '%;background:var(--gold)"></div></div>' +
            '<span class="stat-merge-count">' + count + '</span>';
          distList.appendChild(row);
        }
      }
    }

    // Daily records
    const dailyList = document.getElementById('statDailyList');
    dailyList.innerHTML = '';
    if (stats.dailyRecords.length === 0) {
      dailyList.innerHTML = '<div class="stat-daily-empty">No records yet</div>';
    } else {
      for (const day of stats.dailyRecords) {
        const row = document.createElement('div');
        row.className = 'stat-daily-row';
        const parts = day.date.split('-');
        const dateStr = parts[1] + '/' + parts[2];
        row.innerHTML =
          '<span class="stat-daily-date">' + dateStr + '</span>' +
          '<span class="stat-daily-plays">' + day.plays + ' plays</span>' +
          '<span class="stat-daily-best">' + day.bestScore.toLocaleString() + '</span>';
        dailyList.appendChild(row);
      }
    }
  }

  // Init: bind close button and stats button
  function init() {
    const closeBtn = document.getElementById('statsClose');
    if (closeBtn) closeBtn.addEventListener('click', hideStatsScreen);

    const overlay = document.getElementById('statsOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideStatsScreen();
      });
    }

    const statsBtn = document.getElementById('menuStatsBtn');
    if (statsBtn) statsBtn.addEventListener('click', showStatsScreen);
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { track, getStats, showStatsScreen, hideStatsScreen };
})();

// ===== GAME.JS INTEGRATION POINTS =====
// The following calls should be added to game.js at the indicated locations:
//
// 1. In startGame() [line ~169, after gameStartTime = performance.now()]:
//    AnalyticsManager.track('game_start');
//
// 2. In triggerGameOver() [line ~366, after gameDurationMs calculation]:
//    AnalyticsManager.track('game_over', { score: score, playTimeMs: gameDurationMs });
//
// 3. In handleCollision() [line ~287, after maxMergedLevel update]:
//    AnalyticsManager.track('merge', { fruitLevel: level + 1 });
//
// 4. In watchAdForTicket() [line ~200, inside if(rewarded)]:
//    AnalyticsManager.track('ad_watched', { type: 'ticket' });
//
// 5. In watchAdToContinue() [line ~210, inside if(rewarded)]:
//    AnalyticsManager.track('ad_watched', { type: 'continue' });
