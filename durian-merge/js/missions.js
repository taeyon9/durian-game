// Daily Mission System — 3 random daily challenges with ticket rewards
const MissionManager = (() => {
  const STORAGE_KEY = 'durianMergeMissions';

  // Mission pool definitions
  const MISSION_POOL = [
    { id: 'score_300',    type: 'score',    target: 300,  label: 'Score 300 points',         icon: '🎯' },
    { id: 'score_500',    type: 'score',    target: 500,  label: 'Score 500 points',         icon: '🎯' },
    { id: 'score_1000',   type: 'score',    target: 1000, label: 'Score 1000 points',        icon: '🔥' },
    { id: 'merge_mango',  type: 'merge',    fruitLevel: 4, target: 1, label: 'Create a Mango',     icon: '🥭' },
    { id: 'merge_mango3', type: 'merge',    fruitLevel: 4, target: 3, label: 'Create 3 Mangos',    icon: '🥭' },
    { id: 'merge_dragon', type: 'merge',    fruitLevel: 5, target: 1, label: 'Create a Dragon Fruit', icon: '🐉' },
    { id: 'merge_papaya', type: 'merge',    fruitLevel: 6, target: 1, label: 'Create a Papaya',    icon: '🍈' },
    { id: 'merge_durian', type: 'durian',   target: 1,    label: 'Create a Durian',          icon: '🍈' },
    { id: 'combo_3',      type: 'combo',    target: 3,    label: 'Get a 3x Combo',           icon: '💥' },
    { id: 'combo_5',      type: 'combo',    target: 5,    label: 'Get a 5x Combo',           icon: '💥' },
    { id: 'play_3',       type: 'play',     target: 3,    label: 'Play 3 games',             icon: '🎮' },
    { id: 'merge_total5', type: 'merge_any', target: 5,   label: 'Merge 5 times',            icon: '🔄' },
    { id: 'merge_total15',type: 'merge_any', target: 15,  label: 'Merge 15 times',           icon: '🔄' },
  ];

  const DAILY_MISSION_COUNT = 3;
  let _uiPending = false;

  // Seed-based random for deterministic daily selection
  function seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getDaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function selectDailyMissions() {
    const rng = seededRandom(getDaySeed());
    const pool = [...MISSION_POOL];
    const selected = [];
    for (let i = 0; i < DAILY_MISSION_COUNT && pool.length > 0; i++) {
      const idx = Math.floor(rng() * pool.length);
      selected.push(pool.splice(idx, 1)[0]);
    }
    return selected;
  }

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
  }

  function getOrCreateToday() {
    const today = getTodayStr();
    let data = getData();
    if (!data || data.date !== today) {
      const missions = selectDailyMissions();
      data = {
        date: today,
        missions: missions.map(m => ({
          ...m,
          progress: 0,
          completed: false,
          rewarded: false,
        })),
      };
      save(data);
    }
    return data;
  }

  // Track game events toward mission progress
  function track(eventType, value) {
    const data = getOrCreateToday();
    let changed = false;

    for (const mission of data.missions) {
      if (mission.completed) continue;

      let shouldIncrement = false;

      switch (mission.type) {
        case 'score':
          if (eventType === 'score' && typeof value === 'number') {
            mission.progress = Math.max(mission.progress, value);
            shouldIncrement = false; // progress is set directly (high-water mark)
            changed = true;
          }
          break;
        case 'merge':
          if (eventType === 'merge' && value === mission.fruitLevel) {
            shouldIncrement = true;
          }
          break;
        case 'durian':
          // Durian is level 9
          if (eventType === 'merge' && value === 9) {
            shouldIncrement = true;
          }
          break;
        case 'combo':
          if (eventType === 'combo' && typeof value === 'number') {
            mission.progress = Math.max(mission.progress, value);
            changed = true;
          }
          break;
        case 'play':
          if (eventType === 'play') {
            shouldIncrement = true;
          }
          break;
        case 'merge_any':
          if (eventType === 'merge') {
            shouldIncrement = true;
          }
          break;
      }

      if (shouldIncrement) {
        mission.progress++;
        changed = true;
      }

      if (mission.progress >= mission.target && !mission.completed) {
        mission.completed = true;
        changed = true;
      }
    }

    if (changed) {
      save(data);
      if (!_uiPending) {
        _uiPending = true;
        requestAnimationFrame(() => { _uiPending = false; updateUI(); });
      }
    }
  }

  // Claim reward for completed mission
  function claimReward(missionId) {
    const data = getOrCreateToday();
    const mission = data.missions.find(m => m.id === missionId);
    if (!mission || !mission.completed || mission.rewarded) return false;

    mission.rewarded = true;
    save(data);

    // Grant ticket reward
    if (typeof TicketManager !== 'undefined') {
      TicketManager.addTicket();
    }
    if (typeof SoundManager !== 'undefined') SoundManager.playDrop();

    updateUI();
    return true;
  }

  function getMissions() {
    return getOrCreateToday().missions;
  }

  function hasUnclaimedRewards() {
    const missions = getMissions();
    return missions.some(m => m.completed && !m.rewarded);
  }

  // ===== UI =====

  function updateUI() {
    const missions = getMissions();
    const list = document.getElementById('missionList');
    if (!list) return;

    list.innerHTML = '';
    missions.forEach(m => {
      const item = document.createElement('div');
      item.className = 'mission-item' + (m.completed ? ' completed' : '');

      const progressPct = Math.min(100, Math.floor((m.progress / m.target) * 100));

      item.innerHTML = `
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-info">
          <div class="mission-label">${m.label}</div>
          <div class="mission-progress-bar">
            <div class="mission-progress-fill" style="width:${progressPct}%"></div>
          </div>
          <div class="mission-progress-text">${m.progress}/${m.target}</div>
        </div>
        <div class="mission-reward">
          ${m.rewarded ? '<span class="mission-claimed">Claimed</span>' :
            m.completed ? '<button class="mission-claim-btn" data-id="' + m.id + '">+1 🎟️</button>' :
            '<span class="mission-pending">+1 🎟️</span>'}
        </div>
      `;
      list.appendChild(item);
    });

    // Bind claim buttons
    list.querySelectorAll('.mission-claim-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (claimReward(id)) {
          // Update ticket display if on menu
          if (typeof UI !== 'undefined') UI.updateMenu();
        }
      });
    });

    // Update badge
    const badge = document.getElementById('missionBadge');
    if (badge) {
      const unclaimed = missions.filter(m => m.completed && !m.rewarded).length;
      badge.style.display = unclaimed > 0 ? '' : 'none';
    }
  }

  function showPanel() {
    updateUI();
    const overlay = document.getElementById('missionOverlay');
    if (overlay) overlay.style.display = '';
  }

  function hidePanel() {
    const overlay = document.getElementById('missionOverlay');
    if (!overlay) return;
    overlay.classList.add('hiding');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('hiding');
    }, 200);
  }

  function initUI() {
    const btn = document.getElementById('missionBtn');
    if (btn) btn.addEventListener('click', showPanel);

    const close = document.getElementById('missionClose');
    if (close) close.addEventListener('click', hidePanel);

    const overlay = document.getElementById('missionOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hidePanel();
      });
    }

    updateUI();
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  return { track, getMissions, claimReward, hasUnclaimedRewards, showPanel, hidePanel, updateUI };
})();

/*
 * ===== INTEGRATION POINTS (game.js) =====
 *
 * 1. On game start (startGame function):
 *    MissionManager.track('play');
 *
 * 2. On merge/collision (handleCollision function, after score update):
 *    MissionManager.track('merge', level + 1);  // level+1 = the new fruit level created
 *
 * 3. On combo (handleCollision function, inside comboCount >= 2 block):
 *    MissionManager.track('combo', comboCount);
 *
 * 4. On game over (triggerGameOver function):
 *    MissionManager.track('score', score);
 *
 * These calls should be added to game.js by the game logic agent.
 */
