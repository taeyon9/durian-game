// Item/Power-up System — bomb, shake, upgrade
const ItemManager = (() => {
  const STORAGE_KEY = 'durianMergeItems';

  const ITEM_DEFS = {
    bomb: {
      id: 'bomb',
      name: 'Bomb',
      icon: '💣',
      desc: 'Remove the smallest fruit on screen',
      maxStack: 5,
    },
    shake: {
      id: 'shake',
      name: 'Shake',
      icon: '🌊',
      desc: 'Shuffle all fruits to create new merge chances',
      maxStack: 10,
    },
  };

  let _cache = null;

  function load() {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { _cache = { bomb: 0, shake: 0 }; return _cache; }
      _cache = JSON.parse(raw);
      return _cache;
    } catch { _cache = { bomb: 0, shake: 0 }; return _cache; }
  }

  function save(data) {
    _cache = data;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* QuotaExceeded */ }
  }

  function getCount(itemId) {
    return load()[itemId] || 0;
  }

  function getAll() {
    return load();
  }

  function addItem(itemId, count) {
    count = count || 1;
    const data = load();
    const def = ITEM_DEFS[itemId];
    if (!def) return false;
    data[itemId] = Math.min((data[itemId] || 0) + count, def.maxStack);
    save(data);
    return true;
  }

  function useItem(itemId) {
    const data = load();
    if (!data[itemId] || data[itemId] <= 0) return false;
    data[itemId]--;
    save(data);
    return true;
  }

  function hasItem(itemId) {
    return getCount(itemId) > 0;
  }

  function getDef(itemId) {
    return ITEM_DEFS[itemId] || null;
  }

  function getAllDefs() {
    return Object.values(ITEM_DEFS);
  }

  return { getCount, getAll, addItem, useItem, hasItem, getDef, getAllDefs };
})();
