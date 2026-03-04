// Haptic Feedback — Capacitor Haptics plugin with web fallback
const Haptic = (() => {
  let _enabled = true;
  let _plugin = null;
  let _lastVibrateTime = 0;
  let _lastDangerTime = 0;
  const MIN_INTERVAL = 100;       // General cooldown between vibrations
  const DANGER_COOLDOWN = 500;    // Danger warning minimum interval

  function init() {
    // Check for Capacitor Haptics plugin
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      _plugin = window.Capacitor.Plugins.Haptics;
    }
  }

  function _canVibrate() {
    const now = performance.now();
    if (now - _lastVibrateTime < MIN_INTERVAL) return false;
    _lastVibrateTime = now;
    return true;
  }

  function _vibrate(ms) {
    if (!_enabled || !_canVibrate()) return;
    if (_plugin) {
      _plugin.vibrate({ duration: ms }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  function _vibratePattern(pattern) {
    if (!_enabled || !_canVibrate()) return;
    // Capacitor doesn't support patterns — use total duration as single vibration
    if (_plugin) {
      const totalOn = pattern.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
      _plugin.vibrate({ duration: totalOn }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function _impact(style) {
    if (!_enabled || !_canVibrate()) return;
    if (_plugin) {
      _plugin.impact({ style: style || 'LIGHT' }).catch(() => {});
    } else if (navigator.vibrate) {
      const ms = style === 'HEAVY' ? 30 : style === 'MEDIUM' ? 20 : 10;
      navigator.vibrate(ms);
    }
  }

  // Game events
  function drop() { _impact('LIGHT'); }

  function merge(level) {
    if (level === undefined) level = 0;
    if (level <= 3) {
      _impact('LIGHT');
    } else if (level <= 7) {
      _impact('MEDIUM');
    } else if (level <= 9) {
      _impact('HEAVY');
    } else {
      // level 10 (Durian): HEAVY + extra pattern
      if (!_enabled) return;
      if (_plugin) {
        if (!_canVibrate()) return;
        _plugin.impact({ style: 'HEAVY' }).catch(() => {});
        // Schedule additional vibration after short delay
        setTimeout(() => {
          if (_enabled && _plugin) {
            _plugin.vibrate({ duration: 50 }).catch(() => {});
          }
        }, 80);
      } else if (navigator.vibrate) {
        if (!_canVibrate()) return;
        navigator.vibrate([30, 50, 50]);
      }
    }
  }

  function combo(count) {
    if (count === undefined) count = 2;
    if (count <= 1) return;
    if (count === 2) {
      _vibratePattern([15]);
    } else if (count === 3) {
      _vibratePattern([15, 30, 20]);
    } else if (count === 4) {
      _vibratePattern([20, 20, 20, 20, 30]);
    } else {
      // 5+
      _vibratePattern([30, 15, 30, 15, 60]);
    }
  }

  function dangerWarning() {
    if (!_enabled) return;
    const now = performance.now();
    if (now - _lastDangerTime < DANGER_COOLDOWN) return;
    _lastDangerTime = now;
    _vibratePattern([40, 200, 40]);
  }

  function gameOver() { _vibrate(100); }

  return {
    init, drop, merge, combo, dangerWarning, gameOver,
    get enabled() { return _enabled; },
    set enabled(v) { _enabled = v; },
  };
})();
