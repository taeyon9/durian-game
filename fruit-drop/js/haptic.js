// Haptic Feedback — Capacitor Haptics plugin with web fallback
const Haptic = (() => {
  let _enabled = true;
  let _plugin = null;

  function init() {
    // Check for Capacitor Haptics plugin
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      _plugin = window.Capacitor.Plugins.Haptics;
    }
  }

  function _vibrate(ms) {
    if (!_enabled) return;
    if (_plugin) {
      _plugin.vibrate({ duration: ms }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  function _impact(style) {
    if (!_enabled) return;
    if (_plugin) {
      _plugin.impact({ style: style || 'LIGHT' }).catch(() => {});
    } else if (navigator.vibrate) {
      const ms = style === 'HEAVY' ? 30 : style === 'MEDIUM' ? 20 : 10;
      navigator.vibrate(ms);
    }
  }

  // Game events
  function drop()    { _impact('LIGHT'); }
  function merge()   { _impact('MEDIUM'); }
  function combo()   { _impact('HEAVY'); }
  function gameOver() { _vibrate(100); }

  return {
    init, drop, merge, combo, gameOver,
    get enabled() { return _enabled; },
    set enabled(v) { _enabled = v; },
  };
})();
