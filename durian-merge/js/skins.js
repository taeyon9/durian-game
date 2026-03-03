// Skin Manager — fruit skin system with unlock conditions
const SkinManager = (() => {
  const SKIN_KEY = 'durianMergeSkin';
  const UNLOCK_KEY = 'durianMergeSkinUnlocks';
  const STATS_KEY = 'durianMergeSkinStats';

  // Skin definitions: each has 11 entries matching FRUITS order
  const SKINS = {
    tropical: {
      id: 'tropical',
      name: 'Tropical',
      description: 'Classic tropical fruits',
      locked: false,
      type: 'default',
      data: [
        { color: '#F2A0B0' },  // Lychee
        { color: '#7EC850' },  // Lime
        { color: '#E03030' },  // Rambutan
        { color: '#7B2D8B' },  // Passion Fruit
        { color: '#FFB831' },  // Mango
        { color: '#E84B8A' },  // Dragon Fruit
        { color: '#F49030' },  // Papaya
        { color: '#6B3E1F' },  // Coconut
        { color: '#E8C520' },  // Pineapple
        { color: '#8BAE2F' },  // Durian
        { color: '#C890FF' },  // Mangosteen
      ],
    },
    jewels: {
      id: 'jewels',
      name: 'Jewels',
      description: 'Unlock: 5,000 total pts',
      unlockCondition: 'totalScore',
      unlockValue: 5000,
      type: 'recolor',
      data: [
        { color: '#E0115F', accent: '#FF6B8A' },  // Ruby
        { color: '#0F52BA', accent: '#5B9BD5' },  // Sapphire
        { color: '#50C878', accent: '#98FB98' },  // Emerald
        { color: '#E6E200', accent: '#FFFF99' },  // Topaz
        { color: '#9966CC', accent: '#D8B2FF' },  // Amethyst
        { color: '#00FFFF', accent: '#99FFFF' },  // Aquamarine
        { color: '#FF6600', accent: '#FFB380' },  // Fire Opal
        { color: '#1C1C1C', accent: '#666666' },  // Obsidian
        { color: '#FFD700', accent: '#FFF8DC' },  // Gold
        { color: '#FFFFFF', accent: '#E0E0E0' },  // Diamond
        { color: '#FF69B4', accent: '#FFB6C1' },  // Pink Diamond
      ],
    },
    emoji: {
      id: 'emoji',
      name: 'Emoji',
      description: 'Unlock: 10 games played',
      unlockCondition: 'gamesPlayed',
      unlockValue: 10,
      type: 'emoji',
      data: [
        { emoji: '\uD83C\uDF52', color: '#FF6B6B' },  // cherry
        { emoji: '\uD83C\uDF4B', color: '#FFE066' },  // lemon
        { emoji: '\uD83C\uDF53', color: '#FF4757' },  // strawberry
        { emoji: '\uD83C\uDF47', color: '#8B5CF6' },  // grape
        { emoji: '\uD83C\uDF4A', color: '#FF9F43' },  // orange
        { emoji: '\uD83C\uDF51', color: '#FF6B81' },  // peach
        { emoji: '\uD83C\uDF4E', color: '#EE5A24' },  // apple
        { emoji: '\uD83E\uDD65', color: '#7B6F4C' },  // coconut
        { emoji: '\uD83C\uDF4D', color: '#F6E58D' },  // pineapple
        { emoji: '\uD83C\uDF49', color: '#6AB04C' },  // watermelon
        { emoji: '\u2B50', color: '#FFD700' },  // star
      ],
    },
  };

  let currentSkinId = 'tropical';

  function init() {
    currentSkinId = localStorage.getItem(SKIN_KEY) || 'tropical';
    if (!SKINS[currentSkinId]) currentSkinId = 'tropical';
    checkUnlocks();
  }

  function getStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    } catch { return {}; }
  }

  function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function recordGameEnd(score) {
    const stats = getStats();
    stats.totalScore = (stats.totalScore || 0) + score;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    saveStats(stats);
    checkUnlocks();
  }

  function checkUnlocks() {
    const stats = getStats();
    let unlocks = getUnlocks();
    let changed = false;

    Object.values(SKINS).forEach(skin => {
      if (skin.locked === false) return;
      if (unlocks.includes(skin.id)) return;

      let met = false;
      if (skin.unlockCondition === 'totalScore') {
        met = (stats.totalScore || 0) >= skin.unlockValue;
      } else if (skin.unlockCondition === 'gamesPlayed') {
        met = (stats.gamesPlayed || 0) >= skin.unlockValue;
      }
      if (met) {
        unlocks.push(skin.id);
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
    }
  }

  function getUnlocks() {
    try {
      return JSON.parse(localStorage.getItem(UNLOCK_KEY) || '["tropical"]');
    } catch { return ['tropical']; }
  }

  function isUnlocked(skinId) {
    if (skinId === 'tropical') return true;
    return getUnlocks().includes(skinId);
  }

  function selectSkin(skinId) {
    if (!isUnlocked(skinId)) return false;
    currentSkinId = skinId;
    localStorage.setItem(SKIN_KEY, skinId);
    return true;
  }

  function getCurrentSkinId() {
    return currentSkinId;
  }

  function getCurrentSkin() {
    return SKINS[currentSkinId] || SKINS.tropical;
  }

  function getSkinData(level) {
    const skin = getCurrentSkin();
    return skin.data[level] || skin.data[0];
  }

  function getAllSkins() {
    return Object.values(SKINS);
  }

  function getUnlockProgress(skinId) {
    const skin = SKINS[skinId];
    if (!skin || !skin.unlockCondition) return null;
    const stats = getStats();

    if (skin.unlockCondition === 'totalScore') {
      return { current: stats.totalScore || 0, target: skin.unlockValue };
    }
    if (skin.unlockCondition === 'gamesPlayed') {
      return { current: stats.gamesPlayed || 0, target: skin.unlockValue };
    }
    return null;
  }

  return {
    init,
    recordGameEnd,
    isUnlocked,
    selectSkin,
    getCurrentSkinId,
    getCurrentSkin,
    getSkinData,
    getAllSkins,
    getUnlockProgress,
    checkUnlocks,
  };
})();
