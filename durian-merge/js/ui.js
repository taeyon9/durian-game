// UI Manager — bridges HTML screens with game state
const UI = (() => {
  // Screen elements
  let els = {};
  
  // State
  let currentScreen = 'menu'; // menu | playing | paused | gameover | leaderboard | settings
  let onPlayCallback = null;
  let onWatchAdCallback = null;
  let onContinueCallback = null;
  let onPauseCallback = null;
  let onResumeCallback = null;
  let onRestartFromPauseCallback = null;
  let onMenuFromPauseCallback = null;

  function init(callbacks) {
    onPlayCallback = callbacks.onPlay;
    onWatchAdCallback = callbacks.onWatchAd;
    onContinueCallback = callbacks.onContinue;
    onPauseCallback = callbacks.onPause;
    onResumeCallback = callbacks.onResume;
    onRestartFromPauseCallback = callbacks.onRestartFromPause;
    onMenuFromPauseCallback = callbacks.onMenuFromPause;

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
      goComboStats: document.getElementById('goComboStats'),
      goMaxCombo: document.getElementById('goMaxCombo'),
      goBestCombo: document.getElementById('goBestCombo'),

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
      goContinue: document.getElementById('goContinue'),
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
      toggleSfx: document.getElementById('toggleSfx'),
      toggleHaptic: document.getElementById('toggleHaptic'),

      // Skins
      skinsList: document.getElementById('settingsSkinsList'),

      // Share
      shareScore: document.getElementById('shareScore'),
      shareFruit: document.getElementById('shareFruit'),
      shareClose: document.getElementById('shareClose'),

      // Combo
      comboText: document.getElementById('comboText'),

      // Nickname modal
      nickModal: document.getElementById('nickModal'),
      nickModalInput: document.getElementById('nickModalInput'),
      nickModalCount: document.getElementById('nickModalCount'),
      nickModalConfirm: document.getElementById('nickModalConfirm'),
      nickModalCancel: document.getElementById('nickModalCancel'),

      // Help
      menuHelpBtn: document.getElementById('menuHelpBtn'),

      // Pause
      hudPauseBtn: document.getElementById('hudPauseBtn'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      pauseResumeBtn: document.getElementById('pauseResumeBtn'),
      pauseRestartBtn: document.getElementById('pauseRestartBtn'),
      pauseMenuBtn: document.getElementById('pauseMenuBtn'),
      pauseToggleSfx: document.getElementById('pauseToggleSfx'),
      pauseToggleHaptic: document.getElementById('pauseToggleHaptic'),
    };

    bindEvents();
    renderMenuFruits();
    loadSettings();

    // Tutorial: auto-show on first visit
    TutorialManager.init();
    if (!TutorialManager.isDone()) {
      TutorialManager.show();
    }
  }

  function bindEvents() {
    // Menu
    els.menuPlayBtn.addEventListener('click', handlePlay);
    els.menuRankingBtn.addEventListener('click', () => showScreen('leaderboard'));
    els.menuSettingsBtn.addEventListener('click', () => showModal('settings'));
    els.menuHelpBtn.addEventListener('click', () => TutorialManager.show());

    // HUD
    els.hudSettingsBtn.addEventListener('click', () => showModal('settings'));

    // Game Over
    els.goContinue.addEventListener('click', handleContinue);
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
    els.settingsClose.addEventListener('click', () => {
      if (currentScreen === 'settings') {
        goBack();
      } else {
        hideModal('settings');
      }
    });
    els.settingsNickEdit.addEventListener('click', handleNickEdit);
    // Toggle persistence
    [els.toggleSfx, els.toggleHaptic].forEach(t => {
      t.addEventListener('change', saveSettings);
    });
    // Close modals on backdrop click
    [els.settings, els.share].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal.id === 'settingsOverlay' && currentScreen === 'settings') {
            goBack();
          } else {
            hideModal(modal.id === 'settingsOverlay' ? 'settings' : 'share');
          }
        }
      });
    });

    // Nickname modal
    els.nickModalInput.addEventListener('input', updateNickCounter);
    els.nickModalConfirm.addEventListener('click', handleNickModalConfirm);
    els.nickModalCancel.addEventListener('click', () => hideModal('nickname'));
    els.nickModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleNickModalConfirm();
    });
    els.nickModal.addEventListener('click', (e) => {
      if (e.target === els.nickModal) hideModal('nickname');
    });

    // Menu player name tap to edit nickname
    els.menuPlayer.addEventListener('click', () => {
      if (NicknameManager.hasName()) handleNickEdit();
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

    // Pause
    els.hudPauseBtn.addEventListener('click', () => {
      if (onPauseCallback) onPauseCallback();
    });
    els.pauseResumeBtn.addEventListener('click', () => {
      if (onResumeCallback) onResumeCallback();
    });
    els.pauseRestartBtn.addEventListener('click', () => {
      if (onRestartFromPauseCallback) onRestartFromPauseCallback();
    });
    els.pauseMenuBtn.addEventListener('click', () => {
      if (onMenuFromPauseCallback) onMenuFromPauseCallback();
    });
    // Pause overlay quick toggles
    els.pauseToggleSfx.addEventListener('change', () => {
      els.toggleSfx.checked = els.pauseToggleSfx.checked;
      saveSettings();
    });
    els.pauseToggleHaptic.addEventListener('change', () => {
      els.toggleHaptic.checked = els.pauseToggleHaptic.checked;
      saveSettings();
    });

  }

  // ===== SCREEN MANAGEMENT =====

  let previousScreen = 'menu';

  function showScreen(name) {
    if (name === 'settings') {
      previousScreen = currentScreen;
    }
    currentScreen = name;
    els.menu.style.display = name === 'menu' ? '' : 'none';
    els.hud.style.display = (name === 'playing' || name === 'paused') ? '' : 'none';
    els.gameover.style.display = name === 'gameover' ? '' : 'none';
    els.leaderboard.style.display = name === 'leaderboard' ? '' : 'none';

    // Pause overlay
    els.pauseOverlay.style.display = name === 'paused' ? '' : 'none';
    if (name === 'paused') {
      // Sync quick toggles with current settings
      els.pauseToggleSfx.checked = els.toggleSfx.checked;
      els.pauseToggleHaptic.checked = els.toggleHaptic.checked;
    }

    // Settings overlay: show/hide
    if (name === 'settings') {
      updateSettingsPanel();
      els.settings.style.display = '';
    } else {
      els.settings.style.display = 'none';
    }

    // Canvas visibility
    const canvas = document.getElementById('gameCanvas');
    canvas.style.display = (name === 'playing' || name === 'paused') ? '' : 'none';

    if (name === 'menu') updateMenu();
    if (name === 'leaderboard') renderLeaderboardFull('alltime');
  }

  function showModal(name) {
    if (name === 'settings') {
      updateSettingsPanel();
      els.settings.style.display = '';
    }
    if (name === 'share') {
      const fruitName = FRUITS[lastMaxFruitLevel] ? FRUITS[lastMaxFruitLevel].name : '';
      els.shareFruit.textContent = fruitName ? `Merged up to ${fruitName}!` : '';
      els.share.style.display = '';
    }
    if (name === 'nickname') {
      els.nickModal.style.display = '';
      // Delay focus to avoid mobile keyboard scroll jump
      setTimeout(() => els.nickModalInput.focus(), 100);
    }
  }

  function hideModal(name) {
    if (name === 'settings') els.settings.style.display = 'none';
    if (name === 'share') els.share.style.display = 'none';
    if (name === 'nickname') {
      els.nickModal.style.display = 'none';
      els.nickModalInput.blur();
      nickModalResolve = null;
    }
  }

  function goBack() {
    if (currentScreen === 'settings') {
      showScreen(previousScreen);
    } else if (currentScreen === 'leaderboard') {
      showScreen('menu');
    }
  }

  function getScreen() { return currentScreen; }

  // ===== MENU =====

  function updateMenu() {
    const tickets = TicketManager.getTickets();
    const name = NicknameManager.getName();
    const best = parseInt(localStorage.getItem('durianMergeHighScore') || '0');

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
    // Show 3 hero fruits: Mango (4), Pineapple (8), Dragon Fruit (5)
    const levels = [4, 8, 5];
    const sizes = [70, 100, 70]; // center biggest
    els.menuFruits.innerHTML = '';
    levels.forEach((level, i) => {
      const size = sizes[i];
      const c = document.createElement('canvas');
      c.width = size * 2; c.height = size * 2;
      c.className = 'menu-hero-fruit';
      c.style.animationDelay = (i * 0.4) + 's';
      const fctx = c.getContext('2d');
      const fruit = FRUITS[level];
      const s = (size * 0.85) / fruit.radius;
      fctx.save();
      fctx.translate(size, size);
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

  let lastMaxFruitLevel = 0;

  function showGameOver(score, highScore, isNewBest, rank, maxFruitLevel, canContinue, maxCombo, bestCombo) {
    lastMaxFruitLevel = maxFruitLevel || 0;
    els.goScore.textContent = score;
    els.goNewBest.style.display = isNewBest ? '' : 'none';
    els.shareScore.textContent = score;

    // Combo stats
    if (maxCombo && maxCombo >= 2) {
      els.goComboStats.style.display = '';
      els.goMaxCombo.textContent = maxCombo + 'x';
      if (bestCombo && maxCombo >= bestCombo) {
        els.goBestCombo.textContent = ' BEST!';
        els.goBestCombo.style.display = '';
      } else {
        els.goBestCombo.textContent = bestCombo ? ' (Best: ' + bestCombo + 'x)' : '';
        els.goBestCombo.style.display = bestCombo ? '' : 'none';
      }
    } else {
      els.goComboStats.style.display = 'none';
    }

    const hasName = NicknameManager.hasName();

    if (hasName) {
      // Returning user → show neighbor ranks
      showReturningGameOver(score, rank);
    } else {
      // First time → blurred board + nickname prompt
      showFirstTimeGameOver(score);
    }

    // Continue button (rewarded ad to resume game)
    els.goContinue.style.display = canContinue ? '' : 'none';

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
    els.goNickOverlay.style.display = 'none';
    els.goBoardList.classList.remove('blurred');

    const score = parseInt(els.goScore.textContent);
    const name = NicknameManager.getName();
    const userId = NicknameManager.getUserId();
    const rank = RankingManager.addScore(name, score, userId);

    // Submit to Firebase
    if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
      FirebaseLeaderboard.submitScore(name, score, userId);
    }

    renderBoardList(true);

    setTimeout(() => {
      els.goRankReveal.style.display = '';
      els.goRankText.textContent = '🎉 You\'re #' + rank + '!';
    }, 400);
  }

  // Nickname modal state
  let nickModalResolve = null;

  function updateNickCounter() {
    const len = els.nickModalInput.value.length;
    els.nickModalCount.textContent = len;
    if (len >= 12) {
      els.nickModalCount.classList.add('limit-warn');
    } else {
      els.nickModalCount.classList.remove('limit-warn');
    }
  }

  function openNicknameModal(currentName) {
    els.nickModalInput.value = currentName || '';
    updateNickCounter();
    showModal('nickname');
  }

  function handleNickModalConfirm() {
    const val = els.nickModalInput.value.trim();
    const finalVal = val || 'Player';
    hideModal('nickname');
    if (nickModalResolve) nickModalResolve(finalVal);
  }

  function handleNickEdit() {
    if (!NicknameManager.canChangeName()) {
      const nextDate = NicknameManager.getNextChangeDate();
      const days = Math.ceil((nextDate - Date.now()) / (1000 * 60 * 60 * 24));
      alert('Nickname change available in ' + days + ' day' + (days !== 1 ? 's' : ''));
      return;
    }

    const current = NicknameManager.getName() || '';
    openNicknameModal(current);
    nickModalResolve = (name) => {
      if (name && name !== current) {
        const userId = NicknameManager.getUserId();
        const result = NicknameManager.setName(name);

        // Update local rankings (use truncated name from setName)
        RankingManager.updateNickname(userId, result.newName);

        // Update Firebase rankings
        if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
          FirebaseLeaderboard.updateNickname(userId, result.newName);
        }

        updateSettingsPanel();
        updateMenu();
      }
    };
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

      // Show change availability
      if (!NicknameManager.canChangeName()) {
        const nextDate = NicknameManager.getNextChangeDate();
        const days = Math.ceil((nextDate - Date.now()) / (1000 * 60 * 60 * 24));
        els.settingsNickEdit.textContent = '🔒';
        els.settingsNickEdit.title = days + ' day(s) until change';
      } else {
        els.settingsNickEdit.textContent = '✏️';
        els.settingsNickEdit.title = 'Edit nickname';
      }
    } else {
      els.settingsNickSection.style.display = 'none';
    }

    renderSkinSelector();
  }

  function renderSkinSelector() {
    if (!els.skinsList || typeof SkinManager === 'undefined') return;

    const skins = SkinManager.getAllSkins();
    const currentId = SkinManager.getCurrentSkinId();
    let html = '';

    skins.forEach(skin => {
      const unlocked = SkinManager.isUnlocked(skin.id);
      const isActive = skin.id === currentId;
      const cls = isActive ? 'skin-card active' : (unlocked ? 'skin-card' : 'skin-card locked');

      // Preview dots (first 4 fruit colors)
      let dots = '';
      for (let i = 0; i < 4; i++) {
        const d = skin.data[i];
        if (skin.type === 'emoji' && d.emoji) {
          dots += '<span class="skin-dot" style="font-size:12px;display:flex;align-items:center;justify-content:center;">' + d.emoji + '</span>';
        } else {
          dots += '<span class="skin-dot" style="background:' + d.color + ';"></span>';
        }
      }

      let extra = '';
      if (!unlocked) {
        const prog = SkinManager.getUnlockProgress(skin.id);
        if (prog) {
          const pct = Math.min(100, Math.round(prog.current / prog.target * 100));
          extra = '<div class="skin-progress"><div class="skin-progress-bar" style="width:' + pct + '%;"></div></div>';
        }
      }

      const check = isActive ? '<span class="skin-check">&#10003;</span>' : (unlocked ? '' : '<span class="skin-check">&#128274;</span>');

      html += '<div class="' + cls + '" data-skin="' + skin.id + '">'
        + '<div class="skin-preview">' + dots + '</div>'
        + '<div class="skin-info">'
        + '<div class="skin-name">' + escHtml(skin.name) + '</div>'
        + '<div class="skin-desc">' + escHtml(skin.description) + '</div>'
        + extra
        + '</div>'
        + check
        + '</div>';
    });

    els.skinsList.innerHTML = html;

    // Bind click events
    els.skinsList.querySelectorAll('.skin-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const skinId = card.dataset.skin;
        if (SkinManager.selectSkin(skinId)) {
          renderSkinSelector();
          renderMenuFruits();
        }
      });
    });
  }

  function saveSettings() {
    const settings = {
      sfx: els.toggleSfx.checked,
      haptic: els.toggleHaptic.checked,
    };
    localStorage.setItem('durianMergeSettings', JSON.stringify(settings));

    if (settings.sfx) {
      SoundManager.unmute();
    } else {
      SoundManager.mute();
    }
    Haptic.enabled = settings.haptic;
  }

  function loadSettings() {
    try {
      // Check dedicated sound key first, fall back to combined settings
      const soundEnabled = localStorage.getItem('durianMergeSoundEnabled');
      const raw = localStorage.getItem('durianMergeSettings');

      if (raw) {
        const s = JSON.parse(raw);
        els.toggleSfx.checked = s.sfx !== false;
        els.toggleHaptic.checked = s.haptic !== false;
      }

      // Override sfx toggle if dedicated key exists
      if (soundEnabled !== null) {
        els.toggleSfx.checked = soundEnabled !== 'false';
      }

      if (els.toggleSfx.checked) {
        SoundManager.unmute();
      } else {
        SoundManager.mute();
      }
      Haptic.enabled = els.toggleHaptic.checked;
    } catch {}
  }

  // ===== SHARE =====

  function handleShare(platform) {
    const score = els.shareScore.textContent;
    const fruitName = FRUITS[lastMaxFruitLevel] ? FRUITS[lastMaxFruitLevel].name : 'Lychee';
    const text = `🍉 I scored ${score} pts and merged up to ${fruitName} in Durian Merge! Can you beat me? 🔥`;
    
    if (platform === 'share' && navigator.share) {
      navigator.share({ title: 'Durian Merge', text }).catch(() => {});
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

  function handleContinue() {
    if (onContinueCallback) onContinueCallback();
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
  };
})();
