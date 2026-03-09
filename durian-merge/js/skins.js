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
      description: 'Unlock: 50,000 total pts',
      unlockCondition: 'totalScore',
      unlockValue: 50000,
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
      description: 'Unlock: 30 games played',
      unlockCondition: 'gamesPlayed',
      unlockValue: 30,
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
    neon: {
      id: 'neon', name: 'Neon', description: 'Score 10,000 in one game',
      unlockCondition: 'singleGameScore', unlockValue: 10000, type: 'neon',
      data: [
        { color: '#FF0040', glow: '#FF0040' },
        { color: '#00FF41', glow: '#00FF41' },
        { color: '#FF6600', glow: '#FF6600' },
        { color: '#BF00FF', glow: '#BF00FF' },
        { color: '#00D4FF', glow: '#00D4FF' },
        { color: '#FFFF00', glow: '#FFFF00' },
        { color: '#FF0080', glow: '#FF0080' },
        { color: '#00FF80', glow: '#00FF80' },
        { color: '#FF4400', glow: '#FF4400' },
        { color: '#4400FF', glow: '#4400FF' },
        { color: '#FFFFFF', glow: '#FFFFFF' },
      ],
    },
    pastel: {
      id: 'pastel', name: 'Pastel', description: '7-day login streak',
      unlockCondition: 'loginStreak', unlockValue: 7, type: 'pastel',
      data: [
        { color: '#FFB3BA' },
        { color: '#BAFFC9' },
        { color: '#BAE1FF' },
        { color: '#E8BAFF' },
        { color: '#FFFFBA' },
        { color: '#FFD4BA' },
        { color: '#BAFFF5' },
        { color: '#D4BAFF' },
        { color: '#FFF0BA' },
        { color: '#BAFFBA' },
        { color: '#FFDDF4' },
      ],
    },
    mono: {
      id: 'mono', name: 'Monochrome', description: 'Discover 8 fruits',
      unlockCondition: 'albumCount', unlockValue: 8, type: 'mono',
      data: [
        { color: '#D4C5A9' },
        { color: '#C4B599' },
        { color: '#B4A589' },
        { color: '#A49579' },
        { color: '#948569' },
        { color: '#847559' },
        { color: '#746549' },
        { color: '#645539' },
        { color: '#544529' },
        { color: '#443519' },
        { color: '#F5E6C8' },
      ],
    },
    galaxy: {
      id: 'galaxy', name: 'Galaxy', description: 'Score 30,000 in one game',
      unlockCondition: 'singleGameScore', unlockValue: 30000, type: 'galaxy',
      data: [
        { color: '#1A0533', highlight: '#FF6BFF' },
        { color: '#0A1628', highlight: '#6BB5FF' },
        { color: '#1A0A28', highlight: '#FF6B9D' },
        { color: '#0A2818', highlight: '#6BFFC0' },
        { color: '#28180A', highlight: '#FFD46B' },
        { color: '#0A1A28', highlight: '#6BFFF2' },
        { color: '#280A1A', highlight: '#FF6BDB' },
        { color: '#0A280A', highlight: '#6BFF6B' },
        { color: '#28280A', highlight: '#FFFF6B' },
        { color: '#1A0A33', highlight: '#B36BFF' },
        { color: '#0A0A28', highlight: '#FFFFFF' },
      ],
    },
    pixel: {
      id: 'pixel', name: 'Pixel', description: 'Complete 30 missions',
      unlockCondition: 'missionsCompleted', unlockValue: 30, type: 'pixel',
      data: [
        { color: '#FF6B6B', dark: '#CC5555' },
        { color: '#6BCB77', dark: '#55A25F' },
        { color: '#4D96FF', dark: '#3D78CC' },
        { color: '#9B59B6', dark: '#7C4792' },
        { color: '#F39C12', dark: '#C27D0E' },
        { color: '#E74C8B', dark: '#B93D6F' },
        { color: '#1ABC9C', dark: '#15967D' },
        { color: '#95A5A6', dark: '#778485' },
        { color: '#F1C40F', dark: '#C19D0C' },
        { color: '#2ECC71', dark: '#25A25A' },
        { color: '#E8D44D', dark: '#B9A93E' },
      ],
    },
    candy: {
      id: 'candy', name: 'Candy', description: '100 combos in one game',
      unlockCondition: 'singleGameCombos', unlockValue: 100, type: 'candy',
      data: [
        { color: '#FF6B8A', stripe: '#FFFFFF' },
        { color: '#FFE066', stripe: '#FF9F43' },
        { color: '#7BED9F', stripe: '#FFFFFF' },
        { color: '#70A1FF', stripe: '#FFFFFF' },
        { color: '#FF6348', stripe: '#FFC312' },
        { color: '#A29BFE', stripe: '#DFE6E9' },
        { color: '#FD79A8', stripe: '#FDCB6E' },
        { color: '#55E6C1', stripe: '#FFFFFF' },
        { color: '#FECA57', stripe: '#FF6B6B' },
        { color: '#FF9FF3', stripe: '#F368E0' },
        { color: '#FFFFFF', stripe: '#FF6B8A' },
      ],
    },
    desserts: {
      id: 'desserts', name: 'Desserts', description: 'Earn 200,000 total pts',
      unlockCondition: 'totalScore', unlockValue: 200000, type: 'placeholder',
      theme: ['Macaron', 'Cookie', 'Cupcake', 'Donut', 'Eclair', 'Cake Slice', 'Ice Cream', 'Pudding', 'Candy Apple', 'Wedding Cake', 'Star Cookie'],
      data: [
        { color: '#FFB6C1', emoji: '🧁' }, { color: '#DEB887', emoji: '🍪' },
        { color: '#FFD700', emoji: '🧁' }, { color: '#FF69B4', emoji: '🍩' },
        { color: '#D2691E', emoji: '🥐' }, { color: '#FFC0CB', emoji: '🍰' },
        { color: '#87CEEB', emoji: '🍦' }, { color: '#FFDAB9', emoji: '🍮' },
        { color: '#FF4500', emoji: '🍎' }, { color: '#FFFFF0', emoji: '🎂' },
        { color: '#FFD700', emoji: '⭐' },
      ],
    },
    sea: {
      id: 'sea', name: 'Sea Creatures', description: 'Play 100 games',
      unlockCondition: 'gamesPlayed', unlockValue: 100, type: 'placeholder',
      theme: ['Shell', 'Seahorse', 'Starfish', 'Jellyfish', 'Clownfish', 'Pufferfish', 'Turtle', 'Octopus', 'Dolphin', 'Whale', 'Trident'],
      data: [
        { color: '#FFB6C1', emoji: '🐚' }, { color: '#FFA07A', emoji: '🦑' },
        { color: '#FFD700', emoji: '⭐' }, { color: '#DDA0DD', emoji: '🪼' },
        { color: '#FF6347', emoji: '🐠' }, { color: '#98FB98', emoji: '🐡' },
        { color: '#20B2AA', emoji: '🐢' }, { color: '#9370DB', emoji: '🐙' },
        { color: '#87CEEB', emoji: '🐬' }, { color: '#4682B4', emoji: '🐋' },
        { color: '#00CED1', emoji: '🔱' },
      ],
    },
    space: {
      id: 'space', name: 'Space', description: 'Score 50,000 in one game',
      unlockCondition: 'singleGameScore', unlockValue: 50000, type: 'placeholder',
      theme: ['Asteroid', 'Moon', 'Mars', 'Comet', 'Saturn', 'Jupiter', 'Nebula', 'Supernova', 'Galaxy', 'Black Hole', 'Star'],
      data: [
        { color: '#808080', emoji: '☄️' }, { color: '#C0C0C0', emoji: '🌙' },
        { color: '#FF4500', emoji: '🔴' }, { color: '#00BFFF', emoji: '💫' },
        { color: '#DAA520', emoji: '🪐' }, { color: '#FF8C00', emoji: '🟠' },
        { color: '#8A2BE2', emoji: '🌌' }, { color: '#FF6347', emoji: '💥' },
        { color: '#4B0082', emoji: '🌀' }, { color: '#1C1C1C', emoji: '⚫' },
        { color: '#FFFFFF', emoji: '✨' },
      ],
    },
    halloween: {
      id: 'halloween', name: 'Halloween', description: 'Season: October',
      unlockCondition: 'season', unlockValue: { month: 10, subCondition: 'gamesPlayed', subValue: 30 },
      type: 'placeholder',
      theme: ['Candy Corn', 'Bat', 'Spider', 'Ghost', 'Witch Hat', 'Skull', 'Cauldron', 'Coffin', 'Vampire', 'Pumpkin King', 'Jack-o-Lantern'],
      data: [
        { color: '#FF8C00', emoji: '🍬' }, { color: '#2C2C2C', emoji: '🦇' },
        { color: '#1C1C1C', emoji: '🕷️' }, { color: '#F5F5F5', emoji: '👻' },
        { color: '#6A0DAD', emoji: '🧙' }, { color: '#F5F5DC', emoji: '💀' },
        { color: '#228B22', emoji: '🫕' }, { color: '#4A3728', emoji: '⚰️' },
        { color: '#8B0000', emoji: '🧛' }, { color: '#FF6600', emoji: '🎃' },
        { color: '#FFD700', emoji: '🌟' },
      ],
    },
    christmas: {
      id: 'christmas', name: 'Christmas', description: 'Season: December',
      unlockCondition: 'season', unlockValue: { month: 12, subCondition: 'loginStreak', subValue: 7 },
      type: 'placeholder',
      theme: ['Snowflake', 'Gingerbread', 'Ornament', 'Candy Cane', 'Bell', 'Stocking', 'Wreath', 'Reindeer', 'Sleigh', 'Christmas Tree', 'Star'],
      data: [
        { color: '#ADD8E6', emoji: '❄️' }, { color: '#D2691E', emoji: '🍪' },
        { color: '#FF0000', emoji: '🔴' }, { color: '#FF4040', emoji: '🍭' },
        { color: '#FFD700', emoji: '🔔' }, { color: '#FF0000', emoji: '🧦' },
        { color: '#228B22', emoji: '🎄' }, { color: '#8B4513', emoji: '🦌' },
        { color: '#C0C0C0', emoji: '🛷' }, { color: '#006400', emoji: '🎄' },
        { color: '#FFD700', emoji: '⭐' },
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

  function forceUnlock(skinId) {
    if (!SKINS[skinId]) return false;
    let unlocks = getUnlocks();
    if (!unlocks.includes(skinId)) {
      unlocks.push(skinId);
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
    }
    return true;
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
    forceUnlock,
  };
})();
