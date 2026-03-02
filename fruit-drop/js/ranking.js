// Ranking/Leaderboard System - Local storage based
const RankingManager = (() => {
  const STORAGE_KEY = 'fruitDropLeaderboard';
  const MAX_ENTRIES = 20;

  function getLeaderboard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  }

  function save(board) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }

  function addScore(nickname, score, userId) {
    if (score <= 0) return -1;

    const board = getLeaderboard();
    const entry = {
      name: nickname || 'Player',
      score: score,
      date: new Date().toISOString().split('T')[0],
      userId: userId || '',
    };

    board.push(entry);
    board.sort((a, b) => b.score - a.score);

    if (board.length > MAX_ENTRIES) {
      board.length = MAX_ENTRIES;
    }

    save(board);

    return board.findIndex(e => e === entry) + 1;
  }

  function getTopScores(count) {
    return getLeaderboard().slice(0, count || 10);
  }

  function getRank(score) {
    const board = getLeaderboard();
    let rank = 1;
    for (const entry of board) {
      if (entry.score > score) rank++;
      else break;
    }
    return rank;
  }

  function updateNickname(userId, newName) {
    if (!userId) return;
    const board = getLeaderboard();
    let changed = false;
    for (const entry of board) {
      if (entry.userId === userId) {
        entry.name = newName;
        changed = true;
      }
    }
    if (changed) save(board);
  }

  return { addScore, getTopScores, getRank, updateNickname };
})();
