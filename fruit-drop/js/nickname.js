// Nickname System — no more browser prompt, HTML input handles it
const NicknameManager = (() => {
  const STORAGE_KEY = 'fruitDropNickname';
  let currentName = '';

  function init() {
    currentName = localStorage.getItem(STORAGE_KEY) || '';
  }

  function getName() { return currentName; }
  function hasName() { return currentName.length > 0; }

  function setName(name) {
    currentName = name.trim().substring(0, 12);
    localStorage.setItem(STORAGE_KEY, currentName);
  }

  return { init, getName, hasName, setName };
})();
