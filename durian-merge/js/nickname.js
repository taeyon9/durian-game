// Nickname System — UUID identification + weekly change limit
const NicknameManager = (() => {
  const STORAGE_KEY = 'durianMergeNickname';
  const USER_ID_KEY = 'durianMergeUserId';
  const CHANGED_AT_KEY = 'durianMergeNickChangedAt';
  const CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  let currentName = '';
  let userId = '';

  function init() {
    currentName = localStorage.getItem(STORAGE_KEY) || '';

    // Generate UUID on first run
    userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, userId);
    }
  }

  function getName() { return currentName; }
  function hasName() { return currentName.length > 0; }
  function getUserId() { return userId; }

  function canChangeName() {
    // First-time setup is always allowed
    if (!currentName) return true;

    const lastChanged = localStorage.getItem(CHANGED_AT_KEY);
    if (!lastChanged) return true;

    const elapsed = Date.now() - new Date(lastChanged).getTime();
    return elapsed >= CHANGE_COOLDOWN_MS;
  }

  function getNextChangeDate() {
    const lastChanged = localStorage.getItem(CHANGED_AT_KEY);
    if (!lastChanged) return null;
    return new Date(new Date(lastChanged).getTime() + CHANGE_COOLDOWN_MS);
  }

  function setName(name) {
    const isFirstTime = !currentName;
    const oldName = currentName;

    currentName = name.trim().substring(0, 12);
    localStorage.setItem(STORAGE_KEY, currentName);

    // Record change timestamp (skip for first-time setup)
    if (!isFirstTime) {
      localStorage.setItem(CHANGED_AT_KEY, new Date().toISOString());
    }

    return { oldName, newName: currentName, isFirstTime };
  }

  return { init, getName, hasName, getUserId, canChangeName, getNextChangeDate, setName };
})();
