// Sound Manager — SFX + BGM, all synthesized via Web Audio API
const SoundManager = (() => {
  let audioCtx = null;
  let _sfxMuted = false;

  const STORAGE_KEY = 'durianMergeSoundEnabled';

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function resume() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function loadSetting() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val !== null) {
        _sfxMuted = val === 'false';
      }
    } catch {}
  }

  function saveSetting() {
    try {
      localStorage.setItem(STORAGE_KEY, String(!_sfxMuted));
    } catch {}
  }

  function mute() {
    _sfxMuted = true;
    saveSetting();
  }

  function unmute() {
    _sfxMuted = false;
    saveSetting();
  }

  function toggleMute() {
    if (_sfxMuted) { unmute(); } else { mute(); }
    return !_sfxMuted;
  }

  // Load saved preference on init
  loadSetting();

  // ===== SFX =====

  function playDrop() {
    if (_sfxMuted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  function playMerge(level) {
    if (_sfxMuted) return;
    const ctx = getCtx();
    const baseFreq = 300 + level * 40;

    // Main tone
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);
    g1.gain.setValueAtTime(0.25, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.25);

    // Harmonic shimmer
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0.12, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc2.start(ctx.currentTime); osc2.stop(ctx.currentTime + 0.2);
  }

  function playCombo(count) {
    if (_sfxMuted) return;
    const ctx = getCtx();
    // Rising arpeggio — pitch goes up with combo count
    const baseFreq = 500 + count * 80;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.06;
      osc.frequency.setValueAtTime(baseFreq + i * 120, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    }
  }

  function playGameOver() {
    if (_sfxMuted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
  }

  function playBounce() {
    if (_sfxMuted) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
  }

  // ===== BGM =====

  let _bgmVolume = 0.07;
  let _bgmMuted = false;
  let _bgmCurrent = null;   // { type, gainNode, nodes[], timer }
  const FADE_MS = 500;

  // -- Helpers --

  function _bgmCreateGain() {
    const ctx = getCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
  }

  function _bgmFadeIn(gainNode) {
    const ctx = getCtx();
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      _bgmMuted ? 0 : _bgmVolume,
      ctx.currentTime + FADE_MS / 1000
    );
  }

  function _bgmFadeOut(gainNode, cb) {
    const ctx = getCtx();
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + FADE_MS / 1000);
    if (cb) setTimeout(cb, FADE_MS);
  }

  function _bgmStopCurrent() {
    if (!_bgmCurrent) return;
    const cur = _bgmCurrent;
    _bgmCurrent = null;
    if (cur.timer) clearInterval(cur.timer);
    _bgmFadeOut(cur.gainNode, () => {
      cur.nodes.forEach(n => { try { n.stop(); } catch (_) {} });
      try { cur.gainNode.disconnect(); } catch (_) {}
    });
  }

  // -- Menu BGM: tropical pentatonic loop --

  function _bgmMenuLoop(gainNode) {
    const ctx = getCtx();
    const nodes = [];
    // C major pentatonic melody in a relaxed calypso feel
    // Notes: C4 D4 E4 G4 A4 C5
    const freqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const melody = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 3, 4, 5, 4, 3, 2];
    const noteDur = 0.28;
    const loopLen = melody.length * noteDur;

    // Pad chord (sustained background harmony)
    const padOsc1 = ctx.createOscillator();
    const padOsc2 = ctx.createOscillator();
    const padGain = ctx.createGain();
    padOsc1.type = 'sine';
    padOsc2.type = 'triangle';
    padOsc1.frequency.value = freqs[0]; // C4
    padOsc2.frequency.value = freqs[2]; // E4
    padGain.gain.value = 0.3;
    padOsc1.connect(padGain);
    padOsc2.connect(padGain);
    padGain.connect(gainNode);
    padOsc1.start(ctx.currentTime);
    padOsc2.start(ctx.currentTime);
    nodes.push(padOsc1, padOsc2);

    // Schedule one loop of melody notes
    function scheduleMelody(startTime) {
      melody.forEach((noteIdx, i) => {
        const osc = ctx.createOscillator();
        const ng = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freqs[noteIdx];
        ng.gain.setValueAtTime(0.5, startTime + i * noteDur);
        ng.gain.exponentialRampToValueAtTime(0.01, startTime + i * noteDur + noteDur * 0.9);
        osc.connect(ng);
        ng.connect(gainNode);
        osc.start(startTime + i * noteDur);
        osc.stop(startTime + i * noteDur + noteDur);
        nodes.push(osc);
      });
    }

    // Schedule first iteration immediately
    scheduleMelody(ctx.currentTime);

    // Re-schedule on interval for looping
    const timer = setInterval(() => {
      if (!_bgmCurrent || _bgmCurrent.type !== 'menu') {
        clearInterval(timer);
        return;
      }
      const ctx2 = getCtx();
      scheduleMelody(ctx2.currentTime);
    }, loopLen * 1000);

    return { nodes, timer };
  }

  // -- Gameplay BGM: rhythmic pulse with tension --

  function _bgmGameplayLoop(gainNode) {
    const ctx = getCtx();
    const nodes = [];
    // Minor-key bass line with rhythmic pulse
    // A minor feel: A2, C3, D3, E3
    const bassFreqs = [110.00, 130.81, 146.83, 164.81];
    const bassPattern = [0, 0, 2, 1, 3, 2, 1, 0];
    const noteDur = 0.3;
    const loopLen = bassPattern.length * noteDur;

    // Rhythmic hi-hat-like noise pulse via high-frequency oscillator
    function scheduleRhythm(startTime) {
      for (let i = 0; i < bassPattern.length * 2; i++) {
        const osc = ctx.createOscillator();
        const ng = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 1800 + (i % 2) * 400;
        const t = startTime + i * (noteDur / 2);
        ng.gain.setValueAtTime(i % 2 === 0 ? 0.15 : 0.08, t);
        ng.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        osc.connect(ng);
        ng.connect(gainNode);
        osc.start(t);
        osc.stop(t + 0.05);
        nodes.push(osc);
      }
    }

    // Bass line
    function scheduleBass(startTime) {
      bassPattern.forEach((noteIdx, i) => {
        const osc = ctx.createOscillator();
        const ng = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = bassFreqs[noteIdx];
        const t = startTime + i * noteDur;
        ng.gain.setValueAtTime(0.4, t);
        ng.gain.exponentialRampToValueAtTime(0.01, t + noteDur * 0.85);
        osc.connect(ng);
        ng.connect(gainNode);
        osc.start(t);
        osc.stop(t + noteDur);
        nodes.push(osc);
      });
    }

    function scheduleAll(startTime) {
      scheduleBass(startTime);
      scheduleRhythm(startTime);
    }

    scheduleAll(ctx.currentTime);

    const timer = setInterval(() => {
      if (!_bgmCurrent || _bgmCurrent.type !== 'gameplay') {
        clearInterval(timer);
        return;
      }
      const ctx2 = getCtx();
      scheduleAll(ctx2.currentTime);
    }, loopLen * 1000);

    return { nodes, timer };
  }

  // -- Game Over BGM: short sad descending melody (plays once, no loop) --

  function _bgmGameoverPlay(gainNode) {
    const ctx = getCtx();
    const nodes = [];
    // Descending minor melody: D5, C5, Bb4, A4, F4, D4
    const freqs = [587.33, 523.25, 466.16, 440.00, 349.23, 293.66];
    const noteDur = 0.45;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const ng = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * noteDur;
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.setValueAtTime(0.5, t + noteDur * 0.5);
      ng.gain.exponentialRampToValueAtTime(0.01, t + noteDur * 0.95);
      osc.connect(ng);
      ng.connect(gainNode);
      osc.start(t);
      osc.stop(t + noteDur);
      nodes.push(osc);
    });

    // Sustained final chord: Dm (D4 + F4 + A4)
    const chordStart = ctx.currentTime + freqs.length * noteDur;
    const chordFreqs = [293.66, 349.23, 440.00];
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const ng = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      ng.gain.setValueAtTime(0.35, chordStart);
      ng.gain.exponentialRampToValueAtTime(0.01, chordStart + 1.5);
      osc.connect(ng);
      ng.connect(gainNode);
      osc.start(chordStart);
      osc.stop(chordStart + 1.5);
      nodes.push(osc);
    });

    return { nodes, timer: null };
  }

  // -- Public BGM API --

  function bgmPlay(type) {
    const ctx = getCtx();
    resume();

    // Already playing the requested type
    if (_bgmCurrent && _bgmCurrent.type === type) return;

    // Stop current BGM with fade
    _bgmStopCurrent();

    // Slight delay to let fadeout begin
    setTimeout(() => {
      const gainNode = _bgmCreateGain();
      let result;

      switch (type) {
        case 'menu':
          result = _bgmMenuLoop(gainNode);
          break;
        case 'gameplay':
          result = _bgmGameplayLoop(gainNode);
          break;
        case 'gameover':
          result = _bgmGameoverPlay(gainNode);
          break;
        default:
          return;
      }

      _bgmCurrent = {
        type,
        gainNode,
        nodes: result.nodes,
        timer: result.timer,
      };

      _bgmFadeIn(gainNode);
    }, _bgmCurrent === null ? 0 : FADE_MS);
  }

  function bgmStop() {
    _bgmStopCurrent();
  }

  function bgmSetVolume(v) {
    _bgmVolume = Math.max(0, Math.min(1, v));
    if (_bgmCurrent && _bgmCurrent.gainNode && !_bgmMuted) {
      const ctx = getCtx();
      _bgmCurrent.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      _bgmCurrent.gainNode.gain.setValueAtTime(
        _bgmCurrent.gainNode.gain.value, ctx.currentTime
      );
      _bgmCurrent.gainNode.gain.linearRampToValueAtTime(
        _bgmVolume, ctx.currentTime + 0.05
      );
    }
  }

  return {
    resume, playDrop, playMerge, playCombo, playGameOver, playBounce,
    mute, unmute, toggleMute,
    get sfxMuted() { return _sfxMuted; },
    set sfxMuted(v) {
      _sfxMuted = v;
      saveSetting();
    },
    bgmPlay, bgmStop, bgmSetVolume,
    get bgmMuted() { return _bgmMuted; },
    set bgmMuted(v) {
      _bgmMuted = v;
      if (_bgmCurrent && _bgmCurrent.gainNode) {
        const ctx = getCtx();
        _bgmCurrent.gainNode.gain.cancelScheduledValues(ctx.currentTime);
        _bgmCurrent.gainNode.gain.linearRampToValueAtTime(
          v ? 0 : _bgmVolume,
          ctx.currentTime + 0.05
        );
      }
    },
    get bgmVolume() { return _bgmVolume; },
  };
})();
