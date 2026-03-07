// Daily Check-in Rewards — 7-day cycle with escalating rewards
const DailyRewardManager = (() => {
  const STORAGE_KEY = 'durianMergeDailyReward';

  // 7-day reward cycle (repeats)
  const REWARDS = [
    { day: 1, icon: '🎟️', label: 'Ticket x2',       reward: { type: 'ticket', count: 2 } },
    { day: 2, icon: '💣', label: 'Bomb x1',          reward: { type: 'item', itemId: 'bomb', count: 1 } },
    { day: 3, icon: '🎟️', label: 'Ticket x3',       reward: { type: 'ticket', count: 3 } },
    { day: 4, icon: '🌊', label: 'Shake x2',         reward: { type: 'item', itemId: 'shake', count: 2 } },
    { day: 5, icon: '⬆️', label: 'Upgrade x1',       reward: { type: 'item', itemId: 'upgrade', count: 1 } },
    { day: 6, icon: '🎟️', label: 'Ticket x5',       reward: { type: 'ticket', count: 5 } },
    { day: 7, icon: '🎨', label: 'Weekly Skin',       reward: { type: 'skin', skinId: 'weekly' } },
  ];

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { lastCheckIn: null, streak: 0, totalCheckIns: 0 };
      return JSON.parse(raw);
    } catch { return { lastCheckIn: null, streak: 0, totalCheckIns: 0 }; }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
  }

  function isConsecutiveDay(dateStr) {
    if (!dateStr) return false;
    const last = new Date(dateStr);
    const today = new Date(todayStr());
    const diffMs = today - last;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  function canCheckIn() {
    const data = load();
    return data.lastCheckIn !== todayStr();
  }

  function checkIn() {
    if (!canCheckIn()) return null;

    const data = load();
    const today = todayStr();

    // Calculate streak
    if (isConsecutiveDay(data.lastCheckIn)) {
      data.streak++;
    } else {
      data.streak = 1;
    }

    data.lastCheckIn = today;
    data.totalCheckIns++;
    save(data);

    // Determine reward (cycle through 7 days)
    const dayIndex = ((data.streak - 1) % 7);
    const rewardDef = REWARDS[dayIndex];

    // Grant reward
    grantReward(rewardDef.reward);

    return {
      day: dayIndex + 1,
      streak: data.streak,
      reward: rewardDef,
    };
  }

  function grantReward(reward) {
    if (!reward) return;
    switch (reward.type) {
      case 'ticket':
        if (typeof TicketManager !== 'undefined') {
          for (let i = 0; i < (reward.count || 1); i++) TicketManager.addTicket();
        }
        break;
      case 'item':
        if (typeof ItemManager !== 'undefined') {
          ItemManager.addItem(reward.itemId, reward.count);
        }
        break;
      case 'skin':
        // Weekly skin unlock via SkinManager
        if (typeof SkinManager !== 'undefined' && reward.skinId) {
          SkinManager.forceUnlock(reward.skinId);
        }
        break;
    }
  }

  function getStreak() {
    return load().streak;
  }

  function getCalendarData() {
    const data = load();
    const currentDay = data.lastCheckIn === todayStr()
      ? ((data.streak - 1) % 7) + 1
      : (data.streak % 7) + 1;
    const checkedToday = data.lastCheckIn === todayStr();

    return REWARDS.map((r, i) => ({
      ...r,
      isToday: (i + 1) === currentDay && !checkedToday,
      isClaimed: checkedToday ? (i + 1) <= currentDay : (i + 1) < currentDay,
      isFuture: checkedToday ? (i + 1) > currentDay : (i + 1) > currentDay,
    }));
  }

  // ===== UI =====

  function showPanel() {
    renderUI();
    const overlay = document.getElementById('dailyRewardOverlay');
    if (overlay) overlay.style.display = '';
  }

  function hidePanel() {
    const overlay = document.getElementById('dailyRewardOverlay');
    if (!overlay) return;
    overlay.classList.add('hiding');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('hiding');
    }, 200);
  }

  function renderUI() {
    const list = document.getElementById('dailyRewardList');
    if (!list) return;

    const calendar = getCalendarData();
    const streak = getStreak();

    list.innerHTML = '';
    for (const day of calendar) {
      const div = document.createElement('div');
      div.className = 'dr-day' +
        (day.isClaimed ? ' claimed' : '') +
        (day.isToday ? ' today' : '') +
        (day.isFuture ? ' future' : '');

      div.innerHTML =
        '<div class="dr-day-num">Day ' + day.day + '</div>' +
        '<div class="dr-day-icon">' + day.icon + '</div>' +
        '<div class="dr-day-label">' + day.label + '</div>' +
        (day.isClaimed ? '<div class="dr-day-check">✓</div>' : '') +
        (day.isToday ? '<div class="dr-day-arrow">→</div>' : '');

      list.appendChild(div);
    }

    // Streak display
    const streakEl = document.getElementById('dailyRewardStreak');
    if (streakEl) streakEl.textContent = streak + ' day streak';

    // Check-in button
    const checkInBtn = document.getElementById('dailyCheckInBtn');
    if (checkInBtn) {
      if (canCheckIn()) {
        checkInBtn.disabled = false;
        checkInBtn.textContent = 'Check In!';
        checkInBtn.onclick = () => {
          const result = checkIn();
          if (result) {
            if (typeof SoundManager !== 'undefined') SoundManager.playDrop();
            if (typeof Haptic !== 'undefined') Haptic.drop();
            if (typeof UI !== 'undefined') {
              UI.showToast(result.reward.icon + ' ' + result.reward.label + ' received!', 2500);
              UI.updateMenu();
            }
            renderUI();
            updateBadge();
          }
        };
      } else {
        checkInBtn.disabled = true;
        checkInBtn.textContent = 'Already checked in today!';
      }
    }
  }

  // Auto-show on app start if can check in (skip if tutorial is showing)
  function autoShow() {
    if (!canCheckIn()) return;
    // Don't show if tutorial is active
    if (typeof TutorialManager !== 'undefined' && !TutorialManager.isDone()) return;
    showPanel();
  }

  function updateBadge() {
    const badge = document.getElementById('dailyBadge');
    if (badge) {
      badge.style.display = canCheckIn() ? '' : 'none';
    }
  }

  function initUI() {
    const close = document.getElementById('dailyRewardClose');
    if (close) close.addEventListener('click', hidePanel);

    const overlay = document.getElementById('dailyRewardOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hidePanel();
      });
    }

    // Menu button
    const dailyBtn = document.getElementById('menuDailyBtn');
    if (dailyBtn) dailyBtn.addEventListener('click', showPanel);

    updateBadge();

    // Auto-show after delay (respects tutorial state)
    setTimeout(autoShow, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    setTimeout(initUI, 0);
  }

  return { checkIn, canCheckIn, getStreak, getCalendarData, showPanel, hidePanel };
})();
