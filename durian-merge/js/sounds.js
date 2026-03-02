// Sound Manager — SFX + BGM, all synthesized via Web Audio API
const SoundManager = (() => {
  let audioCtx = null;
  let _sfxMuted = false;

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

  return {
    resume, playDrop, playMerge, playCombo, playGameOver, playBounce,
    get sfxMuted() { return _sfxMuted; },
    set sfxMuted(v) { _sfxMuted = v; },
  };
})();
