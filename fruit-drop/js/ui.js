// UI Manager — bridges HTML screens with game state
const UI = (() => {
  // Screen elements
  let els = {};
  
  // State
  let currentScreen = 'menu'; // menu | playing | gameover | leaderboard
  let onPlayCallback = null;
  let onWatchAdCallback = null;

  function init(callbacks) {
    onPlayCallback = callbacks.onPlay;
    onWatchAdCallback = callbacks.onWatchAd;

    // Cache all elements
    els = {
      // Screens
      hud: document.getElementById('hud'),
      menu: document.getElementById('menuScreen'),
      gameover: document.getElementById('gameoverScreen'),
      leaderboard: document.getElementById('leaderboardScreen'),
      settings: document.getElementById('settingsOverlay'),
      share: document.getElementById('shareOverlay'),
      combo: document.getElementById('comboPopup'),

      // HUD
      hudScore: document.getElementById('hudScore'),
      hudBest: document.getElementById('hudBest'),
      hudNextCanvas: document.getElementById('hudNextCanvas'),
      hudSettingsBtn: document.getElementById('hudSettingsBtn'),

      // Menu
      menuPlayBtn: document.getElementById('menuPlayBtn'),
      menuRankingBtn: document.getElementById('menuRankingBtn'),
      menuSettingsBtn: document.getElementById('menuSettingsBtn'),
      menuTickets: document.getElementById('menuTickets'),
      menuPlayer: document.getElementById('menuPlayer'),
      menuPlayerName: document.getElementById('menuPlayerName'),
      menuBestScore: document.getElementById('menuBestScore'),
      menuFruits: document.getElementById('menuFruits'),

      // Game Over
      goScore: document.getElementById('goScore'),
      goNewBest: document.getElementById('goNewBest'),
      goBoardWrap: document.getElementById('goBoardWrap'),
      goBoardList: document.getElementById('goBoardList'),
      goNickOverlay: document.getElementById('goNickOverlay'),
      goNickInput: document.getElementById('goNickInput'),
      goNickSubmit: document.getElementById('goNickSubmit'),
      goNickSkip: document.getElementById('goNickSkip'),
      goNeighbors: document.getElementById('goNeighbors'),
      goNeighborList: document.getElementById('goNeighborList'),
      goNeighborGoal: document.getElementById('goNeighborGoal'),
      goViewAll: document.getElementById('goViewAll'),
      goRankReveal: document.getElementById('goRankReveal'),
      goRankText: document.getElementById('goRankText'),
      goPlayAgain: document.getElementById('goPlayAgain'),
      goShareBtn: document.getElementById('goShareBtn'),
      goWatchAd: document.getElementById('goWatchAd'),
      goBackMenu: document.getElementById('goBackMenu'),

      // Leaderboard
      lbBack: document.getElementById('lbBack'),
      lbList: document.getElementById('lbList'),
      lbMe: document.getElementById('lbMe'),

      // Settings
      settingsClose: document.getElementById('settingsClose'),
      settingsNickSection: document.getElementById('settingsNickSection'),
      settingsNickName: document.getElementById('settingsNickName'),
      settingsNickEdit: document.getElementById('settingsNickEdit'),
      toggleBgm: document.getElementById('toggleBgm'),
      toggleSfx: document.getElementById('toggleSfx'),
      toggleHaptic: document.getElementById('toggleHaptic'),

      // Share
      shareScore: document.getElementById('shareScore'),
      shareClose: document.getElementById('shareClose'),

      // Combo
      comboText: document.getElementById('comboText'),

      // Tutorial
      tutorial: document.getElementById('tutorialOverlay'),
      tutorialMsg: document.getElementById('tutorialMsg'),
      tutorialHand: document.getElementById('tutorialHand'),
    };

    bindEvents();
    renderMenuFruits();
    loadSettings();
  }

  function bindEvents() {
    // Menu
    els.menuPlayBtn.addEventListener('click', handlePlay);
    els.menuRankingBtn.addEventListener('click', () => showScreen('leaderboard'));
    els.menuSettingsBtn.addEventListener('click', () => showModal('settings'));

    // HUD
    els.hudSettingsBtn.addEventListener('click', () => showModal('settings'));

    // Game Over
    els.goPlayAgain.addEventListener('click', handlePlay);
    els.goShareBtn.addEventListener('click', () => showModal('share'));
    els.goWatchAd.addEventListener('click', handleWatchAd);
    els.goBackMenu.addEventListener('click', () => showScreen('menu'));
    els.goNickSubmit.addEventListener('click', handleNickSubmit);
    els.goNickSkip.addEventListener('click', handleNickSkip);
    els.goViewAll.addEventListener('click', () => showScreen('leaderboard'));

    // Leaderboard
    els.lbBack.addEventListener('click', goBack);
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboardFull(tab.dataset.tab);
      });
    });

    // Settings
    els.settingsClose.addEventListener('click', () => hideModal('settings'));
    els.settingsNickEdit.addEventListener('click', handleNickEdit);
    // Toggle persistence
    [els.toggleBgm, els.toggleSfx, els.toggleHaptic].forEach(t => {
      t.addEventListener('change', saveSettings);
    });
    // Close modals on backdrop click
    [els.settings, els.share].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal(modal.id === 'settingsOverlay' ? 'settings' : 'share');
      });
    });

    // Share
    els.shareClose.addEventListener('click', () => hideModal('share'));
    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => handleShare(btn.dataset.platform));
    });

    // Prevent keyboard from breaking layout
    els.goNickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleNickSubmit();
    });
  }

  // ===== SCREEN MANAGEMENT =====

  function showScreen(name) {
    currentScreen = name;
    els.menu.style.display = name === 'menu' ? '' : 'none';
    els.hud.style.display = name === 'playing' ? '' : 'none';
    els.gameover.style.display = name === 'gameover' ? '' : 'none';
    els.leaderboard.style.display = name === 'leaderboard' ? '' : 'none';
    
    // Canvas visibility
    const canvas = document.getElementById('gameCanvas');
    canvas.style.display = (name === 'playing') ? '' : 'none';

    if (name === 'menu') updateMenu();
    if (name === 'leaderboard') renderLeaderboardFull('alltime');
  }

  function showModal(name) {
    if (name === 'settings') {
      updateSettingsPanel();
      els.settings.style.display = '';
    }
    if (name === 'share') {
      els.share.style.display = '';
    }
  }

  function hideModal(name) {
    if (name === 'settings') els.settings.style.display = 'none';
    if (name === 'share') els.share.style.display = 'none';
  }

  function goBack() {
    if (currentScreen === 'leaderboard') {
      showScreen('menu');
    }
  }

  function getScreen() { return currentScreen; }

  // ===== MENU =====

  function updateMenu() {
    const tickets = TicketManager.getTickets();
    const name = NicknameManager.getName();
    const best = parseInt(localStorage.getItem('fruitDropHighScore') || '0');

    els.menuTickets.textContent = tickets;
    els.menuBestScore.textContent = best;

    if (name) {
      els.menuPlayer.style.display = '';
      els.menuPlayerName.textContent = name;
    } else {
      els.menuPlayer.style.display = 'none';
    }

    // Button state
    if (tickets > 0) {
      els.menuPlayBtn.innerHTML = '<span class="btn-icon">▶</span> PLAY';
    } else {
      els.menuPlayBtn.innerHTML = '<span class="btn-icon">📺</span> WATCH AD TO PLAY';
    }
  }

  function renderMenuFruits() {
    // Render sample fruits on small canvases
    const levels = [0, 2, 4, 6, 9];
    els.menuFruits.innerHTML = '';
    levels.forEach(level => {
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      const fctx = c.getContext('2d');
      const fruit = FRUITS[level];
      const s = 35 / fruit.radius;
      fctx.save();
      fctx.translate(40, 40);
      fctx.scale(s, s);
      drawFruit(fctx, 0, 0, level, 0);
      fctx.restore();
      els.menuFruits.appendChild(c);
    });
  }

  // ===== HUD (during gameplay) =====

  function updateHUD(score, highScore) {
    els.hudScore.textContent = score;
    els.hudBest.textContent = highScore;
  }

  function updateNextFruit(level) {
    const c = els.hudNextCanvas;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const fruit = FRUITS[level];
    const s = 18 / fruit.radius;
    ctx.save();
    ctx.translate(25, 25);
    ctx.scale(s, s);
    drawFruit(ctx, 0, 0, level, 0);
    ctx.restore();
  }

  // ===== COMBO =====

  function showCombo(count) {
    els.comboText.textContent = count + 'x COMBO!';
    els.combo.style.display = '';
    els.combo.classList.remove('show');
    // Force reflow
    void els.combo.offsetWidth;
    els.combo.classList.add('show');
    setTimeout(() => {
      els.combo.style.display = 'none';
      els.combo.classList.remove('show');
    }, 700);
  }

  // ===== GAME OVER =====

  function showGameOver(score, highScore, isNewBest, rank) {
    els.goScore.textContent = score;
    els.goNewBest.style.display = isNewBest ? '' : 'none';
    els.shareScore.textContent = score;

    const hasName = NicknameManager.hasName();

    if (hasName) {
      // Returning user → show neighbor ranks
      showReturningGameOver(score, rank);
    } else {
      // First time → blurred board + nickname prompt
      showFirstTimeGameOver(score);
    }

    // Ticket display on play again button
    const tickets = TicketManager.getTickets();
    if (tickets > 0) {
      els.goPlayAgain.innerHTML = '▶ PLAY AGAIN';
      els.goWatchAd.style.display = '';
    } else {
      els.goPlayAgain.innerHTML = '📺 WATCH AD TO PLAY';
      els.goWatchAd.style.display = 'none';
    }

    showScreen('gameover');
  }

  function showFirstTimeGameOver(score) {
    // Show blurred leaderboard with nickname overlay
    els.goBoardWrap.style.display = '';
    els.goNeighbors.style.display = 'none';
    els.goRankReveal.style.display = 'none';
    els.goNickOverlay.style.display = '';
    els.goNickInput.value = '';

    // Render blurred board
    renderBoardList(true);
    els.goBoardList.classList.add('blurred');
  }

  function showReturningGameOver(score, rank) {
    // Show clear neighbor ranks
    els.goBoardWrap.style.display = 'none';
    els.goNeighbors.style.display = '';
    els.goRankReveal.style.display = 'none';

    renderNeighborList(score, rank);
  }

  function renderBoardList(includeFake) {
    const board = RankingManager.getTopScores(6);
    let html = '';

    // If board is too small, add some fake entries for visual appeal
    const entries = [...board];
    if (includeFake && entries.length < 5) {
      const fakeNames = ['MangoKing', 'DurianFan', 'CoconutJr', 'PapayaPro', 'RambutanX'];
      const fakeScores = [1240, 980, 756, 520, 340];
      while (entries.length < 5) {
        const i = entries.length;
        entries.push({ name: fakeNames[i] || 'Player', score: fakeScores[i] || 100, date: '' });
      }
    }

    entries.forEach((entry, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
      html += `
        <div class="go-board-row">
          <div class="go-rank ${rankClass}">${rankLabel}</div>
          <div class="go-name">${escHtml(entry.name)}</div>
          <div class="go-pts">${entry.score}</div>
        </div>`;
    });
    els.goBoardList.innerHTML = html;
  }

  function renderNeighborList(score, rank) {
    const board = RankingManager.getTopScores(20);
    const name = NicknameManager.getName();
    const myIdx = rank - 1;
    
    // Get neighbors: rank above, me, rank below
    const start = Math.max(0, myIdx - 1);
    const end = Math.min(board.length, myIdx + 2);
    const neighbors = board.slice(start, end);

    let html = '';
    neighbors.forEach((entry, i) => {
      const actualRank = start + i + 1;
      const isMe = (actualRank === rank);
      const rankLabel = actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : actualRank === 3 ? '🥉' : '#' + actualRank;
      html += `
        <div class="go-board-row ${isMe ? 'me' : ''}">
          <div class="go-rank">${rankLabel}</div>
          <div class="go-name">${escHtml(entry.name)}${isMe ? ' (You)' : ''}</div>
          <div class="go-pts">${entry.score}</div>
        </div>`;
    });
    els.goNeighborList.innerHTML = html;

    // Goal text
    if (myIdx > 0 && board[myIdx - 1]) {
      const above = board[myIdx - 1];
      const diff = above.score - score;
      els.goNeighborGoal.textContent = `${diff} pts to beat ${above.name} 💪`;
      els.goNeighborGoal.style.display = '';
    } else if (rank === 1) {
      els.goNeighborGoal.textContent = '👑 You\'re #1!';
      els.goNeighborGoal.style.display = '';
    } else {
      els.goNeighborGoal.style.display = 'none';
    }
  }

  // ===== NICKNAME FLOW =====

  function handleNickSubmit() {
    const val = els.goNickInput.value.trim();
    if (!val) {
      els.goNickInput.focus();
      return;
    }
    NicknameManager.setName(val);
    unlockRanking();
  }

  function handleNickSkip() {
    els.goNickOverlay.style.display = 'none';
    els.goBoardList.classList.remove('blurred');
  }

  function unlockRanking() {
    // Hide nickname overlay
    els.goNickOverlay.style.display = 'none';

    // Unblur with transition
    els.goBoardList.classList.remove('blurred');

    // Re-render board with real name
    const score = parseInt(els.goScore.textContent);
    const name = NicknameManager.getName();
    const rank = RankingManager.addScore(name, score);

    renderBoardList(true);

    // Show rank reveal
    setTimeout(() => {
      els.goRankReveal.style.display = '';
      els.goRankText.textContent = '🎉 You\'re #' + rank + '!';
    }, 400);
  }

  function handleNickEdit() {
    const current = NicknameManager.getName() || '';
    const name = prompt('Edit nickname (max 12 chars):', current);
    if (name && name.trim()) {
      NicknameManager.setName(name.trim());
      updateSettingsPanel();
    }
  }

  // ===== LEADERBOARD FULL =====

  async function renderLeaderboardFull(tab) {
    const name = NicknameManager.getName();
    let board = [];

    // Try Firebase first, fallback to local
    if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
      els.lbList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">Loading...</div>';
      board = await FirebaseLeaderboard.getScores(tab === 'alltime' ? 'alltime' : tab, 50);
    }

    // Fallback to local
    if (board.length === 0 && tab === 'alltime') {
      board = RankingManager.getTopScores(20);
    }

    let html = '';
    if (board.length === 0) {
      html = '<div style="text-align:center;padding:40px;color:var(--text-dim);">No scores yet. Play a game!</div>';
    } else {
      board.forEach((entry, i) => {
        const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
        const isMe = entry.name === name;
        const flag = entry.country && typeof FirebaseLeaderboard !== 'undefined'
          ? FirebaseLeaderboard.countryFlag(entry.country) + ' '
          : '';
        html += `
          <div class="lb-row ${isMe ? 'me' : ''}">
            <div class="lb-rank">${rankLabel}</div>
            <div class="lb-name">${flag}${escHtml(entry.name)}${isMe ? ' ⭐' : ''}</div>
            <div class="lb-pts">${entry.score}</div>
          </div>`;
      });
    }
    els.lbList.innerHTML = html;
  }

  // ===== SETTINGS =====

  function updateSettingsPanel() {
    const name = NicknameManager.getName();
    if (name) {
      els.settingsNickSection.style.display = '';
      els.settingsNickName.textContent = name;
    } else {
      els.settingsNickSection.style.display = 'none';
    }
  }

  function saveSettings() {
    const settings = {
      bgm: els.toggleBgm.checked,
      sfx: els.toggleSfx.checked,
      haptic: els.toggleHaptic.checked,
    };
    localStorage.setItem('fruitDropSettings', JSON.stringify(settings));
    
    SoundManager.sfxMuted = !settings.sfx;
    SoundManager.bgmMuted = !settings.bgm;
    Haptic.enabled = settings.haptic;
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem('fruitDropSettings');
      if (!raw) return;
      const s = JSON.parse(raw);
      els.toggleBgm.checked = s.bgm !== false;
      els.toggleSfx.checked = s.sfx !== false;
      els.toggleHaptic.checked = s.haptic !== false;
      SoundManager.sfxMuted = !els.toggleSfx.checked;
      SoundManager.bgmMuted = !els.toggleBgm.checked;
      Haptic.enabled = els.toggleHaptic.checked;
    } catch {}
  }

  // ===== SHARE =====

  function handleShare(platform) {
    const score = els.shareScore.textContent;
    const text = `🍉 I scored ${score} in Fruit Drop! Can you beat me? 🔥`;
    
    if (platform === 'share' && navigator.share) {
      navigator.share({ title: 'Fruit Drop', text }).catch(() => {});
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(text).catch(() => {});
    }
    hideModal('share');
  }

  // ===== HANDLERS =====

  function handlePlay() {
    SoundManager.resume();
    const tickets = TicketManager.getTickets();
    if (tickets > 0) {
      if (onPlayCallback) onPlayCallback();
    } else {
      handleWatchAd();
    }
  }

  function handleWatchAd() {
    if (onWatchAdCallback) onWatchAdCallback();
  }

  // ===== TUTORIAL =====
  let tutorialStep = 0;

  function showTutorial() {
    if (localStorage.getItem('fruitDropTutorialDone')) return;
    tutorialStep = 1;
    els.tutorialMsg.textContent = '좌우로 드래그해서 위치를 정하세요!';
    els.tutorial.style.display = '';
  }

  function advanceTutorial() {
    if (tutorialStep === 1) {
      tutorialStep = 2;
      els.tutorialHand.style.display = 'none';
      els.tutorialMsg.textContent = '같은 과일끼리 합치면 진화! 🎯';
      setTimeout(() => {
        els.tutorial.style.display = 'none';
        localStorage.setItem('fruitDropTutorialDone', 'true');
        tutorialStep = 0;
      }, 2000);
    }
  }

  // ===== UTILS =====

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return {
    init,
    showScreen,
    getScreen,
    updateHUD,
    updateNextFruit,
    showCombo,
    showGameOver,
    updateMenu,
    showModal,
    hideModal,
    showTutorial,
    advanceTutorial,
  };
})();
