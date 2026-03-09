// Achievement/Badge System — 20 achievements across 5 tiers
const AchievementManager = (() => {
  const STORAGE_KEY = 'durianMergeAchievements';

  const TIERS = {
    bronze:   { name: 'Bronze',   color: '#CD7F32', order: 0 },
    silver:   { name: 'Silver',   color: '#C0C0C0', order: 1 },
    gold:     { name: 'Gold',     color: '#FFD700', order: 2 },
    platinum: { name: 'Platinum', color: '#B0E0E6', order: 3 },
    diamond:  { name: 'Diamond',  color: '#B9F2FF', order: 4 },
  };

  const ACHIEVEMENTS = [
    // Bronze (easy)
    { id: 'first_merge',     name: 'First Merge',       desc: 'Merge two fruits for the first time',       icon: '🔰', tier: 'bronze',   condition: { type: 'merge_any', target: 1 },     reward: { type: 'ticket', count: 1 } },
    { id: 'play_10',         name: 'Regular Player',     desc: 'Play 10 games',                              icon: '🎮', tier: 'bronze',   condition: { type: 'play_count', target: 10 },   reward: { type: 'ticket', count: 1 } },
    { id: 'score_100',       name: 'Getting Started',    desc: 'Score 100 points in a single game',          icon: '💯', tier: 'bronze',   condition: { type: 'score', target: 100 },       reward: { type: 'ticket', count: 1 } },
    { id: 'merge_10',        name: 'Merger',             desc: 'Merge 10 times total',                       icon: '🔄', tier: 'bronze',   condition: { type: 'merge_total', target: 10 },  reward: { type: 'ticket', count: 1 } },

    // Silver (medium)
    { id: 'score_500',       name: 'Rising Star',        desc: 'Score 500 points in a single game',          icon: '⭐', tier: 'silver',   condition: { type: 'score', target: 500 },       reward: { type: 'item', itemId: 'shake', count: 1 } },
    { id: 'combo_3',         name: 'Combo Starter',      desc: 'Get a 3x combo',                             icon: '💥', tier: 'silver',   condition: { type: 'combo', target: 3 },         reward: { type: 'item', itemId: 'shake', count: 1 } },
    { id: 'merge_mango',     name: 'Mango Master',       desc: 'Create a Mango (level 5)',                   icon: '🥭', tier: 'silver',   condition: { type: 'merge_level', target: 4 },   reward: { type: 'item', itemId: 'shake', count: 1 } },
    { id: 'play_50',         name: 'Dedicated Player',   desc: 'Play 50 games',                              icon: '🏅', tier: 'silver',   condition: { type: 'play_count', target: 50 },   reward: { type: 'item', itemId: 'shake', count: 2 } },

    // Gold (hard)
    { id: 'score_2000',      name: 'High Scorer',        desc: 'Score 2000 points in a single game',         icon: '🏆', tier: 'gold',     condition: { type: 'score', target: 2000 },      reward: { type: 'item', itemId: 'shake', count: 2 } },
    { id: 'combo_5',         name: 'Combo Expert',       desc: 'Get a 5x combo',                             icon: '🔥', tier: 'gold',     condition: { type: 'combo', target: 5 },         reward: { type: 'item', itemId: 'shake', count: 2 } },
    { id: 'merge_papaya',    name: 'Papaya Puncher',     desc: 'Create a Papaya (level 7)',                   icon: '🍈', tier: 'gold',     condition: { type: 'merge_level', target: 6 },   reward: { type: 'ticket', count: 3 } },
    { id: 'merge_100',       name: 'Merge Machine',      desc: 'Merge 100 times total',                      icon: '⚙️', tier: 'gold',     condition: { type: 'merge_total', target: 100 }, reward: { type: 'item', itemId: 'shake', count: 2 } },

    // Platinum (very hard) — bomb only from here
    { id: 'score_5000',      name: 'Score Legend',        desc: 'Score 5000 points in a single game',         icon: '👑', tier: 'platinum', condition: { type: 'score', target: 5000 },      reward: { type: 'skin', skinId: 'jewel' } },
    { id: 'merge_coconut',   name: 'Coconut Crusher',    desc: 'Create a Coconut (level 8)',                  icon: '🥥', tier: 'platinum', condition: { type: 'merge_level', target: 7 },   reward: { type: 'skin', skinId: 'jewel' } },
    { id: 'combo_7',         name: 'Combo Maniac',       desc: 'Get a 7x combo',                             icon: '💎', tier: 'platinum', condition: { type: 'combo', target: 7 },         reward: { type: 'item', itemId: 'bomb', count: 1 } },
    { id: 'challenge_clear', name: 'Challenger',         desc: 'Complete any challenge mode',                 icon: '🎯', tier: 'platinum', condition: { type: 'challenge_clear', target: 1 }, reward: { type: 'item', itemId: 'bomb', count: 1 } },

    // Diamond (legendary)
    { id: 'merge_durian',    name: 'Durian King',        desc: 'Create a Durian (level 10)',                  icon: '👑', tier: 'diamond',  condition: { type: 'merge_level', target: 9 },   reward: { type: 'skin', skinId: 'emoji' } },
    { id: 'score_10000',     name: 'Mythic Scorer',      desc: 'Score 10000 points in a single game',         icon: '🌟', tier: 'diamond',  condition: { type: 'score', target: 10000 },     reward: { type: 'item', itemId: 'bomb', count: 1 } },
    { id: 'combo_10',        name: 'Combo God',          desc: 'Get a 10x combo',                             icon: '⚡', tier: 'diamond',  condition: { type: 'combo', target: 10 },        reward: { type: 'item', itemId: 'bomb', count: 1 } },
    { id: 'all_achievements', name: 'Completionist',     desc: 'Unlock all other achievements',               icon: '🎖️', tier: 'diamond',  condition: { type: 'all_achievements', target: 19 }, reward: { type: 'ticket', count: 10 } },
  ];

  let _cache = null;

  // Persistent progress data
  function load() {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { _cache = { unlocked: {}, claimed: {}, progress: {} }; return _cache; }
      _cache = JSON.parse(raw);
      return _cache;
    } catch { _cache = { unlocked: {}, claimed: {}, progress: {} }; return _cache; }
  }

  function save(data) {
    _cache = data;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
  }

  // Check events against achievement conditions
  function check(eventType, value) {
    const data = load();
    let newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (data.unlocked[ach.id]) continue;

      const cond = ach.condition;
      let met = false;

      switch (cond.type) {
        case 'merge_any':
          if (eventType === 'merge') {
            data.progress[ach.id] = (data.progress[ach.id] || 0) + 1;
            met = data.progress[ach.id] >= cond.target;
          }
          break;
        case 'merge_total':
          if (eventType === 'merge') {
            data.progress[ach.id] = (data.progress[ach.id] || 0) + 1;
            met = data.progress[ach.id] >= cond.target;
          }
          break;
        case 'merge_level':
          if (eventType === 'merge' && value >= cond.target) met = true;
          break;
        case 'score':
          if (eventType === 'score' && value >= cond.target) met = true;
          break;
        case 'combo':
          if (eventType === 'combo' && value >= cond.target) met = true;
          break;
        case 'play_count':
          if (eventType === 'play') {
            data.progress[ach.id] = (data.progress[ach.id] || 0) + 1;
            met = data.progress[ach.id] >= cond.target;
          }
          break;
        case 'challenge_clear':
          if (eventType === 'challenge_clear') {
            data.progress[ach.id] = (data.progress[ach.id] || 0) + 1;
            met = data.progress[ach.id] >= cond.target;
          }
          break;
        case 'all_achievements': {
          const count = Object.keys(data.unlocked).length;
          met = count >= cond.target;
          break;
        }
      }

      if (met) {
        data.unlocked[ach.id] = Date.now();
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length > 0) {
      save(data);
      // Show toast for each new achievement
      for (const ach of newlyUnlocked) {
        showUnlockToast(ach);
      }
      // Check completionist after unlocking others
      if (!data.unlocked['all_achievements']) {
        const count = Object.keys(data.unlocked).length;
        if (count >= 19) {
          data.unlocked['all_achievements'] = Date.now();
          save(data);
          const compAch = ACHIEVEMENTS.find(a => a.id === 'all_achievements');
          if (compAch) showUnlockToast(compAch);
        }
      }
    } else if (Object.keys(data.progress).length > 0) {
      save(data); // save progress even without unlock
    }

    return newlyUnlocked;
  }

  function showUnlockToast(ach) {
    if (typeof UI !== 'undefined') {
      UI.showToast(ach.icon + ' ' + ach.name + ' unlocked!', 3000);
    }
    if (typeof SoundManager !== 'undefined') {
      SoundManager.playMerge(7); // reuse high-level merge sound
    }
    if (typeof Haptic !== 'undefined') {
      Haptic.combo(3);
    }
  }

  function claim(achievementId) {
    const data = load();
    if (!data.unlocked[achievementId] || data.claimed[achievementId]) return false;

    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return false;

    data.claimed[achievementId] = Date.now();
    save(data);

    // Grant reward
    grantReward(ach.reward);
    if (typeof SoundManager !== 'undefined') SoundManager.playMerge(5);
    if (typeof Haptic !== 'undefined') Haptic.combo(2);
    return true;
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
        if (typeof SkinManager !== 'undefined' && reward.skinId) {
          SkinManager.forceUnlock(reward.skinId);
        }
        break;
    }
  }

  function getAll() {
    const data = load();
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: !!data.unlocked[ach.id],
      claimed: !!data.claimed[ach.id],
      unlockedAt: data.unlocked[ach.id] || null,
      progress: data.progress[ach.id] || 0,
      tierInfo: TIERS[ach.tier],
    }));
  }

  function getUnlocked() {
    const data = load();
    return ACHIEVEMENTS.filter(a => data.unlocked[a.id]);
  }

  function getUnclaimedCount() {
    const data = load();
    return ACHIEVEMENTS.filter(a => data.unlocked[a.id] && !data.claimed[a.id]).length;
  }

  // ===== UI =====

  function showPanel() {
    renderUI();
    const overlay = document.getElementById('achievementOverlay');
    if (overlay) overlay.style.display = '';
  }

  function hidePanel() {
    const overlay = document.getElementById('achievementOverlay');
    if (!overlay) return;
    overlay.classList.add('hiding');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('hiding');
    }, 200);
  }

  function renderUI() {
    const list = document.getElementById('achievementList');
    if (!list) return;

    const achs = getAll();
    // Sort by tier order, then unlocked first
    achs.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return a.tierInfo.order - b.tierInfo.order;
    });

    list.innerHTML = '';
    for (const ach of achs) {
      const div = document.createElement('div');
      div.className = 'ach-item' + (ach.unlocked ? ' unlocked' : ' locked');

      const progressPct = ach.condition.type === 'score' || ach.condition.type === 'combo' || ach.condition.type === 'merge_level'
        ? (ach.unlocked ? 100 : 0)
        : Math.min(100, Math.floor((ach.progress / ach.condition.target) * 100));

      div.innerHTML =
        '<div class="ach-icon" style="border-color:' + ach.tierInfo.color + '">' + ach.icon + '</div>' +
        '<div class="ach-info">' +
          '<div class="ach-name">' + ach.name + '</div>' +
          '<div class="ach-desc">' + ach.desc + '</div>' +
          (ach.unlocked ? '' : '<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:' + progressPct + '%;background:' + ach.tierInfo.color + '"></div></div>') +
        '</div>' +
        '<div class="ach-reward">' +
          (ach.claimed ? '<span class="ach-claimed">Claimed</span>' :
           ach.unlocked ? '<button class="ach-claim-btn" data-id="' + ach.id + '">Claim</button>' :
           '<span class="ach-tier" style="color:' + ach.tierInfo.color + '">' + ach.tierInfo.name + '</span>') +
        '</div>';

      list.appendChild(div);
    }

    // Bind claim buttons
    list.querySelectorAll('.ach-claim-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (claim(btn.dataset.id)) {
          renderUI();
          if (typeof UI !== 'undefined') UI.updateMenu();
        }
      });
    });

    // Update badge
    const badge = document.getElementById('achievementBadge');
    if (badge) {
      const count = getUnclaimedCount();
      badge.style.display = count > 0 ? '' : 'none';
    }
  }

  function initUI() {
    const btn = document.getElementById('achievementBtn');
    if (btn) btn.addEventListener('click', showPanel);

    const close = document.getElementById('achievementClose');
    if (close) close.addEventListener('click', hidePanel);

    const overlay = document.getElementById('achievementOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hidePanel();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  return { check, claim, getAll, getUnlocked, getUnclaimedCount, showPanel, hidePanel, renderUI };
})();
