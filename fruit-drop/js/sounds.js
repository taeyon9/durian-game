// Sound Manager — SFX + BGM, all synthesized via Web Audio API
const SoundManager = (() => {
  let audioCtx = null;
  let _sfxMuted = false;
  let _bgmMuted = false;
  let bgmInterval = null;
  let bgmGain = null;

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

  // ===== BGM — tropical lo-fi arpeggio loop =====

  let bgmNodes = [];
  let bgmTimeout = null;

  // Chord progression: Fmaj7 → Dm7 → Am7 → Cmaj7 (tropical feel)
  const BGM_CHORDS = [
    [349.23, 440.00, 523.25, 659.25],  // Fmaj7: F4 A4 C5 E5
    [293.66, 349.23, 440.00, 523.25],  // Dm7:   D4 F4 A4 C5
    [440.00, 523.25, 659.25, 783.99],  // Am7:   A4 C5 E5 G5
    [523.25, 659.25, 783.99, 987.77],  // Cmaj7: C5 E5 G5 B5
  ];
  const BGM_BPM = 75;
  const BGM_BEAT = 60 / BGM_BPM;

  function startBGM() {
    if (_bgmMuted) return;
    stopBGM();
    const ctx = getCtx();

    bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5);
    bgmGain.connect(ctx.destination);

    // Sub bass pad (quiet, warm)
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(87.31, ctx.currentTime); // F2
    bassGain.gain.setValueAtTime(0.06, ctx.currentTime);
    bass.connect(bassGain);
    bassGain.connect(bgmGain);
    bass.start(ctx.currentTime);
    bgmNodes.push(bass);

    let chordIdx = 0;
    let beatInChord = 0;

    function scheduleNote() {
      if (_bgmMuted || !bgmGain) return;
      const ctx = getCtx();
      const t = ctx.currentTime;

      const chord = BGM_CHORDS[chordIdx];
      // Arpeggio: cycle through chord notes
      const noteIdx = beatInChord % chord.length;
      const freq = chord[noteIdx];

      // Main arp note (soft pluck feel)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      // Slight pitch drift for lo-fi warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + BGM_BEAT * 0.9);
      osc.connect(g);
      g.connect(bgmGain);
      osc.start(t);
      osc.stop(t + BGM_BEAT);

      // Octave-down ghost note on beats 0 and 2
      if (noteIdx === 0 || noteIdx === 2) {
        const sub = ctx.createOscillator();
        const sg = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq / 2, t);
        sg.gain.setValueAtTime(0.07, t);
        sg.gain.exponentialRampToValueAtTime(0.01, t + BGM_BEAT * 1.5);
        sub.connect(sg);
        sg.connect(bgmGain);
        sub.start(t);
        sub.stop(t + BGM_BEAT * 1.5);
      }

      // Update bass note on chord change
      if (beatInChord === 0) {
        bass.frequency.setValueAtTime(chord[0] / 4, t); // Root note, 2 octaves down
      }

      beatInChord++;
      if (beatInChord >= 8) {
        beatInChord = 0;
        chordIdx = (chordIdx + 1) % BGM_CHORDS.length;
      }

      bgmTimeout = setTimeout(scheduleNote, BGM_BEAT * 1000);
    }

    scheduleNote();
  }

  function stopBGM() {
    bgmNodes.forEach(n => { try { n.stop(); } catch {} });
    bgmNodes = [];
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    if (bgmTimeout) { clearTimeout(bgmTimeout); bgmTimeout = null; }
    bgmGain = null;
  }

  return {
    resume, playDrop, playMerge, playCombo, playGameOver, playBounce,
    startBGM, stopBGM,
    get sfxMuted() { return _sfxMuted; },
    set sfxMuted(v) { _sfxMuted = v; },
    get bgmMuted() { return _bgmMuted; },
    set bgmMuted(v) {
      _bgmMuted = v;
      if (v) stopBGM();
    },
  };
})();
