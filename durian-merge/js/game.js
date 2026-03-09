// Main Game Logic — Canvas renders gameplay only, HTML handles all UI
const Game = (() => {
  let canvas, ctx;
  let gameWidth, gameHeight;
  let score = 0;
  let highScore = 0;
  let highScoreAtStart = 0;
  let currentLevel = 0;
  let nextLevel = 0;
  let gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameoverAnim', 'gameover'
  let dropX = 0;
  let canDrop = true;
  let dropCooldown = 0;
  let lastDropTime = 0;
  let DROP_COOLDOWN_MS = 350;
  const DANGER_LINE_Y = 100; // Slightly less since HUD is now HTML overlay
  let dangerTimer = 0;
  let DANGER_TIMEOUT = 2000;
  let fruitBodies = [];
  let mergeEffects = [];
  let scorePopups = [];
  let shakeIntensity = 0;
  let comboBorderAlpha = 0;
  let maxMergedLevel = 0;
  let gameOverAnimTimer = 0;
  const GAMEOVER_ANIM_DURATION = 1500; // 1.5초
  let gameOverAnimData = null; // 애니메이션 중 저장할 데이터
  let lastTime = 0;
  let pointerDown = false;
  let bgGrad = null;

  // ===== PARTICLE OBJECT POOL =====
  const PARTICLE_POOL_SIZE = 300;
  const particlePool = [];

  function initPool() {
    particlePool.length = 0;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      particlePool.push({
        _active: false,
        // merge particle fields
        angle: 0, dist: 0, speed: 0, size: 0,
        isStar: false, color: '', rotSpeed: 0, rot: 0,
        // trail / landing fields
        x: 0, y: 0, vx: 0, vy: 0, alpha: 0,
      });
    }
  }

  function acquireParticle() {
    for (let i = 0; i < particlePool.length; i++) {
      if (!particlePool[i]._active) {
        particlePool[i]._active = true;
        return particlePool[i];
      }
    }
    return null; // pool exhausted — drop this particle
  }

  function releaseParticle(p) {
    p._active = false;
  }

  function releaseAllParticles() {
    for (let i = 0; i < particlePool.length; i++) {
      particlePool[i]._active = false;
    }
  }

  // ===== DIRTY-TRACKING BATCH SAVE =====
  let _pendingSave = {};

  function markDirty(key, value) {
    _pendingSave[key] = value;
  }

  function flushSaves() {
    for (const [k, v] of Object.entries(_pendingSave)) {
      try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* QuotaExceededError — silent fail */ }
    }
    _pendingSave = {};
  }

  // Frame throttling for 120Hz displays
  const TARGET_FPS = 60;
  const FRAME_DURATION = 1000 / TARGET_FPS; // ~16.67ms
  let accumulator = 0;

  // Combo tracking
  let comboCount = 0;
  let comboTimer = 0;
  const COMBO_WINDOW_MS = 1200;
  let maxCombo = 0;
  let bestCombo = parseInt(localStorage.getItem('durianMergeBestCombo') || '0');

  // Canvas combo display
  let comboDisplay = null; // { text, alpha, scale, x, y }

  // Game over rank
  let gameOverRank = -1;

  // Ad optimization: time tracking
  let gameStartTime = 0;

  // Challenge mode state
  let challengeTimer = 0; // remaining ms for time attack
  let challengeStartTime = 0;
  let dangerEnabled = true;
  let scoreEnabled = true;
  let radiusScale = 1;
  let targetScore = 0; // for speed run

  // Cached DOM refs for per-frame access
  let _hudTimerValue = null;
  let _hudTimerWrap = null;

  // Scale
  let scale = 1;
  const BASE_WIDTH = 390;
  const BASE_HEIGHT = 700;

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    initPool();
    highScore = parseInt(localStorage.getItem('durianMergeHighScore') || '0');
    if (typeof SkinManager !== 'undefined') SkinManager.init();
    NicknameManager.init();
    Haptic.init();

    // Init UI
    UI.init({
      onPlay: startGame,
      onWatchAd: watchAdForTicket,

      onPause: pauseGame,
      onResume: resumeGame,
      onRestartFromPause: restartFromPause,
      onMenuFromPause: menuFromPause,
    });

    // Firebase init
    if (typeof FirebaseLeaderboard !== 'undefined') {
      FirebaseLeaderboard.init({
        // TODO: 실제 Firebase config로 교체
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      });
    }

    resize();
    window.addEventListener('resize', resize);

    // Input — only on canvas for gameplay
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // Global audio resume — touch anywhere (menu, gameover, etc.) unlocks AudioContext
    document.addEventListener('pointerdown', () => SoundManager.resume(), { passive: true });

    // Load fruit images
    if (typeof loadFruitImages === 'function') loadFruitImages();

    // Init physics
    Physics.init(BASE_WIDTH, BASE_HEIGHT);
    Physics.onCollision(handleCollision);

    // Cache DOM refs for game loop
    _hudTimerValue = document.getElementById('hudTimerValue');
    _hudTimerWrap = document.getElementById('hudTimer');

    // Item buttons
    document.querySelectorAll('.hud-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.item;
        if (itemId) useItem(itemId);
      });
    });

    // Mode select UI
    initModeSelectUI();

    // Initial fruits
    currentLevel = randomDropLevel();
    nextLevel = randomDropLevel();
    dropX = BASE_WIDTH / 2;

    // Show menu
    UI.showScreen('menu');

    // Start render loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - 50; // Reserve for banner ad

    const scaleX = maxW / BASE_WIDTH;
    const scaleY = maxH / BASE_HEIGHT;
    scale = Math.min(scaleX, scaleY);

    const displayW = BASE_WIDTH * scale;
    const displayH = BASE_HEIGHT * scale;

    canvas.width = BASE_WIDTH * dpr;
    canvas.height = BASE_HEIGHT * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';

    // Center canvas
    canvas.style.marginTop = Math.max(0, (maxH - displayH) / 2) + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgGrad = null; // Invalidate cached gradient on resize
  }

  function screenToGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }

  // ===== INPUT (canvas only, for gameplay) =====

  function onPointerDown(e) {
    if (gameState !== 'playing') return;
    SoundManager.resume();
    pointerDown = true;
    dropX = clampX(screenToGame(e.clientX, e.clientY).x);
  }

  function onPointerMove(e) {
    if (gameState !== 'playing' || !pointerDown) return;
    dropX = clampX(screenToGame(e.clientX, e.clientY).x);
  }

  function onPointerUp(e) {
    if (gameState !== 'playing') return;
    if (!pointerDown) return;
    pointerDown = false;
    if (canDrop) dropFruit();
  }

  function clampX(x) {
    const r = FRUITS[currentLevel].radius;
    return Math.max(r + 6, Math.min(BASE_WIDTH - r - 6, x));
  }

  // ===== GAME FLOW =====

  function startGame() {
    if (!TicketManager.hasTickets()) return;
    TicketManager.useTicket();
    resetGame();
    applyChallengeSettings();
    highScoreAtStart = highScore;
    gameState = 'playing';
    gameStartTime = performance.now();
    challengeStartTime = performance.now();
    UI.showScreen('playing');
    UI.updateHUD(scoreEnabled ? 0 : '-', highScore);
    UI.updateNextFruit(nextLevel);
    updateItemHUD();

    // Show mode label
    if (typeof ChallengeManager !== 'undefined' && !ChallengeManager.isNormal()) {
      const mode = ChallengeManager.getModeDef();
      const label = document.getElementById('hudModeLabel');
      if (label) { label.textContent = mode.icon + ' ' + mode.name; label.style.display = ''; }
      const timer = document.getElementById('hudTimer');
      if (timer && challengeTimer > 0) timer.style.display = '';
    }

    MissionManager.track('play');
    AnalyticsManager.track('game_start');
    if (typeof SeasonManager !== 'undefined') SeasonManager.trackSeasonMission('play');
    if (typeof AchievementManager !== 'undefined') AchievementManager.check('play');
  }

  function applyChallengeSettings() {
    if (typeof ChallengeManager === 'undefined') return;
    const settings = ChallengeManager.getModeSettings();

    // Reset to defaults
    DROP_COOLDOWN_MS = 350;
    DANGER_TIMEOUT = 2000;
    dangerEnabled = true;
    scoreEnabled = true;
    radiusScale = 1;
    challengeTimer = 0;
    targetScore = 0;

    // Apply mode-specific
    if (settings.timeLimit) challengeTimer = settings.timeLimit;
    if (settings.radiusScale) radiusScale = settings.radiusScale;
    if (settings.gravityScale) {
      const engine = Physics.getEngine();
      engine.gravity.y = 1.8 * settings.gravityScale;
    }
    if (settings.dropCooldown) DROP_COOLDOWN_MS = settings.dropCooldown;
    if (settings.dangerTimeout) DANGER_TIMEOUT = settings.dangerTimeout;
    if (settings.dangerEnabled === false) dangerEnabled = false;
    if (settings.scoreEnabled === false) scoreEnabled = false;
    if (settings.targetScore) targetScore = settings.targetScore;
  }

  function resetGame() {
    for (const body of fruitBodies) Physics.removeFruit(body);
    fruitBodies = [];
    mergeEffects = [];
    scorePopups = [];
    shakeIntensity = 0;
    releaseAllParticles();
    comboBorderAlpha = 0;
    score = 0;
    dangerTimer = 0;
    comboCount = 0;
    comboTimer = 0;
    maxCombo = 0;
    comboDisplay = null;
    canDrop = true;
    dropCooldown = 0;
    lastDropTime = 0;
    currentLevel = randomDropLevel();
    nextLevel = randomDropLevel();
    dropX = BASE_WIDTH / 2;
    gameOverRank = -1;
    maxMergedLevel = 0;
    gameOverAnimTimer = 0;
    gameOverAnimData = null;

    // Reset challenge state
    challengeTimer = 0;
    targetScore = 0;
    dangerEnabled = true;
    scoreEnabled = true;
    radiusScale = 1;
    // Reset physics gravity
    const engine = Physics.getEngine();
    if (engine) engine.gravity.y = 1.8;
  }

  // ===== ITEM USAGE =====

  const ITEM_DESCRIPTIONS = {
    bomb: '💣 Bomb — Removes the smallest fruit',
    shake: '🌊 Shake — Shuffles all fruits around',
  };

  function useItem(itemId) {
    if (gameState !== 'playing') return;
    if (typeof ItemManager === 'undefined') return;
    if (!ItemManager.hasItem(itemId)) {
      // Show description toast when no items
      if (ITEM_DESCRIPTIONS[itemId] && typeof UI !== 'undefined') {
        UI.showToast(ITEM_DESCRIPTIONS[itemId], 2000);
      }
      return;
    }

    let success = false;
    switch (itemId) {
      case 'bomb': success = useBomb(); break;
      case 'shake': success = useShake(); break;
      default: return;
    }

    if (!success) return; // Don't consume item if effect failed
    ItemManager.useItem(itemId);
    updateItemHUD();
    SoundManager.playMerge(5);
    Haptic.merge(5);
  }

  function useBomb() {
    if (fruitBodies.length === 0) return false;
    // Find smallest fruit
    let smallest = null;
    let smallestLevel = Infinity;
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      if (body.fruitLevel < smallestLevel) {
        smallestLevel = body.fruitLevel;
        smallest = body;
      }
    }
    if (!smallest) return false;

    // Visual effect
    const mx = smallest.position.x;
    const my = smallest.position.y;
    mergeEffects.push({
      x: mx, y: my,
      radius: FRUITS[smallest.fruitLevel].radius,
      alpha: 1,
      color: '#FF4500',
      glowRadius: 0,
      particles: [],
      level: smallest.fruitLevel,
    });
    shakeIntensity = 4;

    Physics.removeFruit(smallest);
    const idx = fruitBodies.indexOf(smallest);
    if (idx >= 0) fruitBodies.splice(idx, 1);
    return true;
  }

  function useShake() {
    if (fruitBodies.length === 0) return false;
    // Shuffle all fruits with random impulse
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      const vx = (Math.random() - 0.5) * 8;
      const vy = -Math.random() * 5 - 2;
      Matter.Body.setVelocity(body, { x: vx, y: vy });
      Matter.Sleeping.set(body, false);
    }
    shakeIntensity = 6;
    return true;
  }

  function useUpgrade() {
    if (fruitBodies.length === 0) return false;
    // Find smallest fruit and upgrade it
    let smallest = null;
    let smallestLevel = Infinity;
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      if (body.fruitLevel < smallestLevel && body.fruitLevel < FRUITS.length - 1) {
        smallestLevel = body.fruitLevel;
        smallest = body;
      }
    }
    if (!smallest) return false;

    const mx = smallest.position.x;
    const my = smallest.position.y;
    const newLevel = smallest.fruitLevel + 1;

    Physics.removeFruit(smallest);
    const idx = fruitBodies.indexOf(smallest);
    if (idx >= 0) fruitBodies.splice(idx, 1);

    const newBody = Physics.createFruit(mx, my, newLevel);
    newBody.droppedAt = 0;
    newBody.mergedAt = performance.now();
    fruitBodies.push(newBody);

    FruitAlbum.unlock(newLevel);

    mergeEffects.push({
      x: mx, y: my,
      radius: FRUITS[newLevel].radius,
      alpha: 1,
      color: '#00FF88',
      glowRadius: 0,
      particles: [],
      level: newLevel,
    });
    return true;
  }

  function updateItemHUD() {
    if (typeof ItemManager === 'undefined') return;
    const counts = ItemManager.getAll();
    const bombEl = document.getElementById('hudBombCount');
    const shakeEl = document.getElementById('hudShakeCount');
    if (bombEl) bombEl.textContent = counts.bomb || 0;
    if (shakeEl) shakeEl.textContent = counts.shake || 0;

    const bombBtn = document.getElementById('hudItemBomb');
    const shakeBtn = document.getElementById('hudItemShake');
    if (bombBtn) bombBtn.disabled = !counts.bomb;
    if (shakeBtn) shakeBtn.disabled = !counts.shake;
  }

  async function watchAdForTicket() {
    if (typeof AdMobManager !== 'undefined') {
      const rewarded = await AdMobManager.showRewarded();
      if (rewarded) {
        TicketManager.addTicket();
        startGame();
      }
    }
  }

  // ===== PAUSE / RESUME =====

  function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    SoundManager.suspendCtx();
    UI.showScreen('paused');
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    // Reset lastTime and accumulator to prevent delta explosion after long pause
    lastTime = performance.now();
    accumulator = 0;
    SoundManager.resumeCtx();
    UI.showScreen('playing');
  }

  function restartFromPause() {
    if (gameState !== 'paused') return;
    if (!TicketManager.hasTickets()) { UI.showToast('No tickets left!', 2000); return; }
    SoundManager.resumeCtx();
    // Reset state so startGame can proceed
    gameState = 'menu';
    startGame();
  }

  function menuFromPause() {
    if (gameState !== 'paused') return;
    gameState = 'menu';
    // Reset challenge mode when leaving to menu
    if (typeof ChallengeManager !== 'undefined') ChallengeManager.resetMode();
    SoundManager.resumeCtx();
    UI.showScreen('menu');
  }

  // Auto-pause on background (visibility change) + flush pending saves
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (gameState === 'playing') pauseGame();
      flushSaves();
    }
  });
  // iOS Safari fallback
  window.addEventListener('pagehide', () => {
    if (gameState === 'playing') pauseGame();
    flushSaves();
  });
  // Chrome freeze event
  document.addEventListener('freeze', () => {
    if (gameState === 'playing') pauseGame();
    flushSaves();
  });
  window.addEventListener('beforeunload', flushSaves);

  // ===== GAME LOGIC =====

  function randomDropLevel() {
    return Math.floor(Math.random() * (MAX_DROP_LEVEL + 1));
  }

  function dropFruit() {
    if (!canDrop) return;
    const body = Physics.createFruit(dropX, DANGER_LINE_Y - 20, currentLevel);
    if (!body) return;

    body.droppedAt = performance.now();
    fruitBodies.push(body);
    FruitAlbum.unlock(currentLevel);
    SoundManager.playDrop();
    Haptic.drop();
    canDrop = false;
    lastDropTime = performance.now();
    dropCooldown = DROP_COOLDOWN_MS;

    currentLevel = nextLevel;
    nextLevel = randomDropLevel();
    UI.updateNextFruit(nextLevel);
  }

  function handleCollision(event) {
    if (gameState !== 'playing') return;

    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
      if (bodyA.isMerging || bodyB.isMerging) continue;
      if (bodyA.fruitLevel !== bodyB.fruitLevel) continue;

      const level = bodyA.fruitLevel;
      if (level >= FRUITS.length - 1) continue;

      bodyA.isMerging = true;
      bodyB.isMerging = true;

      const mx = (bodyA.position.x + bodyB.position.x) / 2;
      const my = (bodyA.position.y + bodyB.position.y) / 2;

      Physics.removeFruit(bodyA);
      Physics.removeFruit(bodyB);
      const idxA = fruitBodies.indexOf(bodyA);
      if (idxA >= 0) fruitBodies.splice(idxA, 1);
      const idxB = fruitBodies.indexOf(bodyB);
      if (idxB >= 0) fruitBodies.splice(idxB, 1);

      const newBody = Physics.createFruit(mx, my, level + 1);
      newBody.droppedAt = 0;
      newBody.mergedAt = performance.now();
      fruitBodies.push(newBody);

      // Album unlock
      FruitAlbum.unlock(level + 1);
      if (level + 1 > maxMergedLevel) maxMergedLevel = level + 1;

      MissionManager.track('merge', level + 1);
      AnalyticsManager.track('merge', { fruitLevel: level + 1 });
      if (typeof AchievementManager !== 'undefined') AchievementManager.check('merge', level + 1);
      if (typeof SeasonManager !== 'undefined') SeasonManager.trackSeasonMission('merge', level + 1);

      // Score + Combo
      const points = scoreEnabled ? FRUITS[level + 1].score : 0;
      comboCount++;
      comboTimer = COMBO_WINDOW_MS;

      if (comboCount >= 2) {
        // Multiplier: x1.5, x2, x2.5, x3, x3.5, x4.0 (capped)
        const multiplier = Math.min(1 + comboCount * 0.5, 4);
        const totalPoints = Math.floor(points * multiplier);
        score += totalPoints;

        if (comboCount > maxCombo) maxCombo = comboCount;

        // Tiered combo text and color
        let comboText, comboColor;
        if (comboCount >= 6) {
          comboText = 'MAX!!';
          comboColor = null; // rainbow — handled in render
        } else if (comboCount === 5) {
          comboText = 'FEVER!';
          comboColor = '#9B30FF';
        } else if (comboCount === 4) {
          comboText = 'GREAT!';
          comboColor = '#FF4500';
        } else if (comboCount === 3) {
          comboText = 'NICE!!';
          comboColor = '#FF8C00';
        } else {
          comboText = 'COMBO!';
          comboColor = '#FFD700';
        }

        // Canvas combo text animation
        comboDisplay = {
          text: comboCount + 'x ' + comboText,
          subText: 'x' + multiplier.toFixed(1),
          alpha: 1,
          scale: 2.0,
          x: mx,
          y: Math.max(my - 40, DANGER_LINE_Y + 40),
          color: comboColor, // null = rainbow
        };

        MissionManager.track('combo', comboCount);
        AnalyticsManager.track('combo', { count: comboCount });
        if (typeof AchievementManager !== 'undefined') AchievementManager.check('combo', comboCount);
        if (typeof SeasonManager !== 'undefined') SeasonManager.trackSeasonMission('combo', comboCount);

        // UI.showCombo(comboCount); // removed: Canvas comboDisplay already shows combo at merge location
        SoundManager.playCombo(comboCount);
        Haptic.combo(comboCount);
        comboBorderAlpha = 0.3;

        // Larger score popup for combo
        scorePopups.push({
          x: mx, y: my,
          text: '+' + totalPoints + ' (x' + multiplier.toFixed(1) + ')',
          alpha: 1,
          dy: 0,
        });
      } else {
        score += points;
        Haptic.merge(level + 1);

        scorePopups.push({
          x: mx, y: my,
          text: '+' + points,
          alpha: 1,
          dy: 0,
        });
      }

      // Merge effect — enhanced particles
      const newLevel = level + 1;
      const fruitColor = FRUITS[newLevel].color;
      const fruitRadius = FRUITS[newLevel].radius;
      const isHighLevel = newLevel >= 7; // Coconut+
      const particleCount = isHighLevel ? 14 : 10;
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        const p = acquireParticle();
        if (!p) break;
        const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 0.06 + Math.random() * 0.08;
        p.angle = angle;
        p.dist = 0;
        p.speed = isHighLevel ? speed * 1.5 : speed;
        p.size = 2 + Math.random() * 3;
        p.isStar = i % 3 === 0;
        p.color = i % 2 === 0 ? fruitColor : '#FFFFC8';
        p.rotSpeed = (Math.random() - 0.5) * 0.1;
        p.rot = Math.random() * Math.PI * 2;
        p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.alpha = 0;
        particles.push(p);
      }
      // Inner burst particles (small fast fragments)
      for (let i = 0; i < 4; i++) {
        const p = acquireParticle();
        if (!p) break;
        p.angle = Math.random() * Math.PI * 2;
        p.dist = 0;
        p.speed = 0.15 + Math.random() * 0.1;
        p.size = 1 + Math.random() * 1.5;
        p.isStar = false;
        p.color = fruitColor;
        p.rotSpeed = 0;
        p.rot = 0;
        p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.alpha = 0;
        particles.push(p);
      }
      mergeEffects.push({
        x: mx, y: my,
        radius: fruitRadius,
        alpha: 1,
        color: fruitColor,
        glowRadius: 0,
        particles,
        level: newLevel,
      });

      // Screen shake — level-proportional, capped at 5
      if (level >= 3) {
        shakeIntensity = Math.min(5, (level - 2) * 1.2);
      }

      // Durian merge special effects (level 9 = Durian)
      if (newLevel === 9) {
        shakeIntensity = 12;

        // Override score popup with special style
        const lastPop = scorePopups[scorePopups.length - 1];
        if (lastPop) {
          lastPop.fontSize = 28;
          lastPop.color = '#FFD700';
        }
      }

      SoundManager.playMerge(level);
      if (score > highScore) highScore = score;
      UI.updateHUD(score, highScore);
    }
  }

  function checkGameOver(delta) {
    let anyAbove = false;
    let hasExemptAbove = false;
    const now = performance.now();
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      if (body.position.y - FRUITS[body.fruitLevel].radius < DANGER_LINE_Y) {
        if (body.droppedAt && now - body.droppedAt < 1500) { hasExemptAbove = true; continue; }
        if (body.mergedAt && now - body.mergedAt < 2000) { hasExemptAbove = true; continue; }
        anyAbove = true;
        break;
      }
    }

    if (anyAbove) {
      dangerTimer += delta;
      if (dangerTimer > 1000) Haptic.dangerWarning();
      if (dangerTimer >= DANGER_TIMEOUT) triggerGameOver();
    } else if (hasExemptAbove && dangerTimer > 0) {
      // Exempted fruits only in danger zone: hold timer (no increase, no decrease)
    } else {
      // No fruits above danger line: decrease timer
      dangerTimer = Math.max(0, dangerTimer - delta);
    }
  }

  function triggerGameOver() {
    // 애니메이션 상태로 전환 (즉시 게임오버 화면으로 가지 않음)
    gameState = 'gameoverAnim';
    gameOverAnimTimer = 0;

    const gameDurationMs = performance.now() - gameStartTime;

    MissionManager.track('score', score);
    AnalyticsManager.track('game_over', { score, playTimeMs: gameDurationMs });
    if (typeof AchievementManager !== 'undefined') AchievementManager.check('score', score);
    if (typeof SeasonManager !== 'undefined') SeasonManager.trackSeasonMission('score', score);

    // Challenge mode completion
    if (typeof ChallengeManager !== 'undefined' && !ChallengeManager.isNormal()) {
      const modeId = ChallengeManager.getMode();
      ChallengeManager.completeMode(modeId, score, performance.now() - challengeStartTime);
      if (typeof AchievementManager !== 'undefined') AchievementManager.check('challenge_clear');
      ChallengeManager.resetMode();
    }

    const isNewBest = score > highScoreAtStart;

    if (isNewBest) {
      highScore = score;
      markDirty('durianMergeHighScore', highScore.toString());
    }

    // Save best combo
    if (maxCombo > bestCombo) {
      bestCombo = maxCombo;
      markDirty('durianMergeBestCombo', bestCombo.toString());
    }

    // Save to leaderboard (only if has name already)
    const name = NicknameManager.getName();
    if (name) {
      const userId = NicknameManager.getUserId();
      gameOverRank = RankingManager.addScore(name, score, userId);
      // Submit to Firebase
      if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
        FirebaseLeaderboard.submitScore(name, score, userId);
      }
    } else {
      gameOverRank = RankingManager.getRank(score);
    }

    if (typeof SkinManager !== 'undefined') SkinManager.recordGameEnd(score);

    // 사운드/진동은 애니메이션 시작 시 즉시 재생
    SoundManager.playGameOver();
    Haptic.gameOver();

    // BGM fade out during animation
    if (typeof SoundManager.fadeOutBGM === 'function') {
      SoundManager.fadeOutBGM(1200);
    }

    // 애니메이션 종료 후 사용할 데이터 저장
    gameOverAnimData = {
      gameDurationMs,
      isNewBest,
    };
  }

  function finishGameOver() {
    gameState = 'gameover';

    // Hide challenge HUD elements
    const timer = document.getElementById('hudTimer');
    if (timer) { timer.style.display = 'none'; timer.classList.remove('danger'); }
    const modeLabel = document.getElementById('hudModeLabel');
    if (modeLabel) modeLabel.style.display = 'none';

    const { gameDurationMs, isNewBest } = gameOverAnimData;

    // Show interstitial (with frequency cap + duration filter)
    if (typeof AdMobManager !== 'undefined') {
      AdMobManager.showInterstitial(gameDurationMs);
    }

    // Flush pending saves (game over is low-frequency, safe to write now)
    flushSaves();

    UI.showGameOver(score, highScore, isNewBest, gameOverRank, maxMergedLevel, maxCombo, bestCombo);
    gameOverAnimData = null;
  }

  // ===== GAME LOOP =====

  function gameLoop(timestamp) {
    const rawDelta = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState === 'playing') {
      accumulator += rawDelta;

      // Frame throttling: skip update if not enough time has passed (120Hz → 60fps)
      if (accumulator < FRAME_DURATION) {
        requestAnimationFrame(gameLoop);
        return;
      }

      // Cap delta to prevent spiral of death (e.g., after tab switch)
      const delta = Math.min(accumulator, 33);
      accumulator = 0;

      Physics.update(16.67); // Fixed timestep (60fps) for consistent physics

      if (!canDrop) {
        if (performance.now() - lastDropTime >= DROP_COOLDOWN_MS) {
          canDrop = true;
          dropCooldown = 0;
        }
      }

      // Combo timer
      if (comboTimer > 0) {
        comboTimer -= delta;
        if (comboTimer <= 0) {
          if (comboCount >= 2) SoundManager.playComboBreak();
          comboCount = 0;
        }
      }

      // Challenge timer (time attack)
      if (challengeTimer > 0) {
        challengeTimer -= delta;
        if (_hudTimerValue) _hudTimerValue.textContent = Math.max(0, Math.ceil(challengeTimer / 1000));
        if (_hudTimerWrap) {
          if (challengeTimer <= 10000) _hudTimerWrap.classList.add('danger');
          else _hudTimerWrap.classList.remove('danger');
        }
        if (challengeTimer <= 0) {
          challengeTimer = 0;
          triggerGameOver();
        }
      }

      // Speed run check
      if (targetScore > 0 && score >= targetScore) {
        triggerGameOver();
      }

      if (dangerEnabled) checkGameOver(delta);

      // Merge effects decay
      for (let i = mergeEffects.length - 1; i >= 0; i--) {
        const e = mergeEffects[i];
        e.alpha -= delta / 500;
        e.radius += delta * 0.1;
        e.glowRadius += delta * 0.15;
        for (const p of e.particles) {
          p.dist += p.speed * delta;
          if (p.rotSpeed) p.rot += p.rotSpeed * delta;
        }
        if (e.alpha <= 0) {
          for (const p of e.particles) releaseParticle(p);
          mergeEffects.splice(i, 1);
        }
      }

      // Shake decay
      if (shakeIntensity > 0) {
        shakeIntensity -= delta * 0.02;
        if (shakeIntensity < 0) shakeIntensity = 0;
      }

      // Score popup decay
      for (let i = scorePopups.length - 1; i >= 0; i--) {
        scorePopups[i].dy -= delta * 0.05;
        scorePopups[i].alpha -= delta / 800;
        if (scorePopups[i].alpha <= 0) scorePopups.splice(i, 1);
      }

      // Combo border decay
      if (comboBorderAlpha > 0) {
        comboBorderAlpha -= delta / 300;
        if (comboBorderAlpha < 0) comboBorderAlpha = 0;
      }

      // Combo display animation
      if (comboDisplay) {
        comboDisplay.alpha -= delta / 800;
        comboDisplay.scale += (1.0 - comboDisplay.scale) * 0.15; // ease toward 1.0
        if (comboDisplay.alpha <= 0) comboDisplay = null;
      }

      render();
    }

    // ===== GAME OVER ANIMATION STATE =====
    if (gameState === 'gameoverAnim') {
      const delta = Math.min(rawDelta, 33);
      gameOverAnimTimer += delta;
      Physics.update(16.67); // 물리는 계속 (과일이 자연스럽게 정지)
      renderGameOverAnim();
      if (gameOverAnimTimer >= GAMEOVER_ANIM_DURATION) {
        finishGameOver();
      }
    }

    requestAnimationFrame(gameLoop);
  }

  // ===== GAME OVER ANIMATION RENDERING =====

  function renderGameOverAnim() {
    // 1. 기존 씬 렌더 (과일, 벽, 바닥 등)
    render();

    // 2. 진행도 계산
    const progress = Math.min(gameOverAnimTimer / GAMEOVER_ANIM_DURATION, 1);

    // 3. 과일에 붉은 틴트 오버레이
    const tintAlpha = Math.min(progress * 0.3, 0.15);
    ctx.fillStyle = `rgba(180, 0, 0, ${tintAlpha})`;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 4. 빨간 비네팅 (가장자리 — 단순 border)
    const vignetteAlpha = Math.min(progress * 0.6, 0.4);
    ctx.strokeStyle = `rgba(120, 0, 0, ${vignetteAlpha})`;
    ctx.lineWidth = 30;
    ctx.strokeRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 5. 상단에서 내려오는 빨간 바
    const barHeight = progress * (BASE_HEIGHT * 0.15);
    ctx.fillStyle = `rgba(200, 30, 30, ${Math.min(progress * 0.5, 0.3)})`;
    ctx.fillRect(0, 0, BASE_WIDTH, barHeight);

    // 6. 어둡게 (progress > 0.5 이후)
    if (progress > 0.5) {
      const darkProgress = (progress - 0.5) / 0.5; // 0~1
      const darkAlpha = darkProgress * 0.7;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(darkAlpha, 0.7)})`;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    // 7. "GAME OVER" 텍스트 (progress > 0.3 이후)
    if (progress > 0.3) {
      const textProgress = (progress - 0.3) / 0.7; // 0~1
      const scaleVal = 1 + (1 - Math.min(textProgress * 2, 1)) * 2; // 3x -> 1x
      const alpha = Math.min(textProgress * 2, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(BASE_WIDTH / 2, BASE_HEIGHT * 0.4);
      ctx.scale(scaleVal, scaleVal);

      // Text shadow/glow
      ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
      ctx.shadowBlur = 20;

      ctx.font = 'bold 42px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 6;
      ctx.strokeText('GAME OVER', 0, 0);

      // Fill
      ctx.fillStyle = '#FF3333';
      ctx.fillText('GAME OVER', 0, 0);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ===== RENDERING (gameplay only — no UI) =====

  // roundRect polyfill for older Android WebView
  function _roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
    }
  }

  function render() {
    // Screen shake
    if (shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      ctx.save();
      ctx.translate(sx, sy);
    }

    // Background
    ctx.fillStyle = '#041E1A';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Subtle gradient (cached)
    if (!bgGrad) {
      bgGrad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
      bgGrad.addColorStop(0, 'rgba(13,80,70,0.3)');
      bgGrad.addColorStop(1, 'rgba(4,30,26,0)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Walls + Floor (same color, batched)
    ctx.fillStyle = '#0D6B5E';
    ctx.fillRect(0, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);
    ctx.fillRect(BASE_WIDTH - 4, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);
    ctx.fillRect(0, BASE_HEIGHT - 4, BASE_WIDTH, 4);

    // Danger line
    const flash = dangerTimer > 0 ? Math.sin(dangerTimer / 100) * 0.3 + 0.5 : 0.30;
    ctx.strokeStyle = `rgba(255, 80, 80, ${flash})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(4, DANGER_LINE_Y);
    ctx.lineTo(BASE_WIDTH - 4, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fruits
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      const vel = body.velocity;
      const speed = Math.abs(vel.y);
      const squashX = speed > 3 ? 1 + Math.min(speed * 0.01, 0.12) : 1;
      const squashY = speed > 3 ? 1 - Math.min(speed * 0.01, 0.12) : 1;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.scale(squashX, squashY);
      drawFruit(ctx, 0, 0, body.fruitLevel, 0);
      ctx.restore();
    }

    // Merge effects
    for (const effect of mergeEffects) {
      // Merge flash (brief white flash at merge point)
      renderMergeFlash(effect);
      // Glow — single circle
      const glowMult = effect.level >= 7 ? 0.6 : 0.4;
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = effect.alpha * glowMult * 0.3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Ring — thicker for high level
      ctx.globalAlpha = effect.alpha * 0.6;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.level >= 7 ? 3 : 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Particles — batched by type: circular first, then stars
      // Set alpha once for all particles in this effect
      ctx.globalAlpha = effect.alpha;

      // Batch circular particles by color
      const circlesByColor = {};
      const starParticles = [];
      for (let i = 0; i < effect.particles.length; i++) {
        const p = effect.particles[i];
        const sz = p.size * effect.alpha;
        if (sz < 0.5) continue;
        if (p.isStar) {
          starParticles.push(p);
        } else {
          if (!circlesByColor[p.color]) circlesByColor[p.color] = [];
          circlesByColor[p.color].push(p);
        }
      }

      // Draw circular particles — one path per color
      for (const color in circlesByColor) {
        const particles = circlesByColor[color];
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const px = effect.x + Math.cos(p.angle) * p.dist;
          const py = effect.y + Math.sin(p.angle) * p.dist;
          const sz = p.size * effect.alpha;
          ctx.moveTo(px + sz, py);
          ctx.arc(px, py, sz, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Draw star particles — translate/rotate with manual inverse
      for (let i = 0; i < starParticles.length; i++) {
        const p = starParticles[i];
        const px = effect.x + Math.cos(p.angle) * p.dist;
        const py = effect.y + Math.sin(p.angle) * p.dist;
        const sz = p.size * effect.alpha;

        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = (s / 5) * Math.PI * 2 - Math.PI / 2;
          const outerX = Math.cos(a) * sz;
          const outerY = Math.sin(a) * sz;
          if (s === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          const innerA = a + Math.PI / 5;
          ctx.lineTo(Math.cos(innerA) * sz * 0.4, Math.sin(innerA) * sz * 0.4);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.rotate(-p.rot);
        ctx.translate(-px, -py);
      }
    }
    ctx.globalAlpha = 1;

    // Score popups — reduced save/restore
    if (scorePopups.length > 0) {
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      for (const pop of scorePopups) {
        ctx.globalAlpha = pop.alpha;
        const size = pop.fontSize || 16;
        ctx.font = `bold ${size}px "Fredoka", sans-serif`;
        ctx.strokeText(pop.text, pop.x, pop.y + pop.dy);
        ctx.fillStyle = pop.color || '#FFD700';
        ctx.fillText(pop.text, pop.x, pop.y + pop.dy);
      }
      ctx.globalAlpha = 1;
    }

    // Danger zone pulse overlay
    if (dangerTimer > 800 && dangerEnabled) {
      const pulseAlpha = Math.sin(dangerTimer / 150) * 0.08 + 0.08;
      ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
      ctx.fillRect(0, 0, BASE_WIDTH, DANGER_LINE_Y + 20);
    }

    // Drop guide
    if (canDrop) {
      // Guideline
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(dropX, DANGER_LINE_Y);
      ctx.lineTo(dropX, BASE_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Preview fruit
      ctx.globalAlpha = 0.65;
      drawFruit(ctx, dropX, DANGER_LINE_Y - 20, currentLevel, 0);
      ctx.globalAlpha = 1.0;
    } else {
      // Cooldown: show dimmed preview fruit
      ctx.globalAlpha = 0.25;
      drawFruit(ctx, dropX, DANGER_LINE_Y - 20, currentLevel, 0);
      ctx.globalAlpha = 1.0;
    }

    // Combo border pulse — no save/restore needed
    if (comboBorderAlpha > 0) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${comboBorderAlpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, DANGER_LINE_Y, BASE_WIDTH - 4, BASE_HEIGHT - DANGER_LINE_Y - 2);
    }


    // Canvas combo text animation
    if (comboDisplay && comboDisplay.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = comboDisplay.alpha;
      ctx.translate(BASE_WIDTH / 2, comboDisplay.y);
      ctx.scale(comboDisplay.scale, comboDisplay.scale);

      // Main combo text
      ctx.font = 'bold 32px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 4;
      ctx.strokeText(comboDisplay.text, 0, 0);

      // Tiered color — rainbow hsl cycle for MAX (color === null)
      if (comboDisplay.color === null) {
        const hue = (performance.now() * 0.3) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      } else {
        ctx.fillStyle = comboDisplay.color;
      }
      ctx.fillText(comboDisplay.text, 0, 0);

      // Multiplier sub-text
      ctx.font = 'bold 18px "Fredoka", sans-serif';
      if (comboDisplay.color === null) {
        const hue = ((performance.now() * 0.3) + 180) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
      } else {
        ctx.fillStyle = '#FFA500';
      }
      ctx.fillText(comboDisplay.subText, 0, 24);

      ctx.restore();
    }

    // End screen shake
    if (shakeIntensity > 0) {
      ctx.restore();
    }
  }

  // ===== MODE SELECT UI =====

  function initModeSelectUI() {
    const modesBtn = document.getElementById('menuModesBtn');
    if (modesBtn) {
      modesBtn.addEventListener('click', () => {
        renderModeSelect();
        const overlay = document.getElementById('modeSelectOverlay');
        if (overlay) overlay.style.display = '';
      });
    }

    const closeBtn = document.getElementById('modeSelectClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const overlay = document.getElementById('modeSelectOverlay');
        if (overlay) overlay.style.display = 'none';
      });
    }

    const overlay = document.getElementById('modeSelectOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }
  }

  function renderModeSelect() {
    if (typeof ChallengeManager === 'undefined') return;
    const list = document.getElementById('modeSelectList');
    if (!list) return;

    const modes = ChallengeManager.getAllModes();
    const currentMode = ChallengeManager.getMode();

    list.innerHTML = '';
    for (const mode of modes) {
      const div = document.createElement('div');
      div.className = 'mode-card' + (mode.id === currentMode ? ' active' : '');

      const stars = '★'.repeat(mode.difficulty) + '☆'.repeat(Math.max(0, 5 - mode.difficulty));
      const rewardText = mode.reward
        ? (mode.reward.type === 'ticket' ? '🎟️ x' + mode.reward.count
          : mode.reward.itemId ? mode.reward.itemId + ' x' + mode.reward.count
          : '')
        : 'No reward';

      div.innerHTML =
        '<div class="mode-icon">' + mode.icon + '</div>' +
        '<div class="mode-info">' +
          '<div class="mode-name">' + mode.name + '</div>' +
          '<div class="mode-desc">' + mode.desc + '</div>' +
          '<div class="mode-reward">' + rewardText + '</div>' +
        '</div>' +
        '<div class="mode-difficulty">' + stars + '</div>';

      div.addEventListener('click', () => {
        if (typeof SoundManager !== 'undefined') SoundManager.playDrop();
        ChallengeManager.setMode(mode.id);
        const overlay = document.getElementById('modeSelectOverlay');
        if (overlay) overlay.style.display = 'none';
        if (typeof UI !== 'undefined') {
          UI.showToast(mode.icon + ' ' + mode.name + ' selected', 1500);
        }
      });

      list.appendChild(div);
    }
  }

  // ===== VISUAL EFFECTS (Phase 3) =====

  // Merge flash (brief white overlay at merge point)
  function renderMergeFlash(effect) {
    if (effect.alpha > 0.7) {
      const flashAlpha = (effect.alpha - 0.7) / 0.3;
      ctx.globalAlpha = flashAlpha * 0.4;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // DEBUG: fill screen with fruits for quick testing
  function debugFill(count) {
    if (gameState !== 'playing') return;
    const n = count || 15;
    for (let i = 0; i < n; i++) {
      const lvl = Math.floor(Math.random() * 5);
      const x = FRUITS[lvl].radius + Math.random() * (BASE_WIDTH - FRUITS[lvl].radius * 2);
      const y = DANGER_LINE_Y + 50 + Math.random() * (BASE_HEIGHT - DANGER_LINE_Y - 150);
      const body = Physics.createFruit(x, y, lvl);
      if (body) { body.droppedAt = 0; fruitBodies.push(body); }
    }
  }

  return { init, triggerGameOver, useItem, debugFill };
})();

window.addEventListener('load', () => Game.init());
