// Main Game Logic — Canvas renders gameplay only, HTML handles all UI
const Game = (() => {
  let canvas, ctx;
  let gameWidth, gameHeight;
  let score = 0;
  let highScore = 0;
  let currentLevel = 0;
  let nextLevel = 0;
  let gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameoverAnim', 'gameover'
  let dropX = 0;
  let canDrop = true;
  let dropCooldown = 0;
  let lastDropTime = 0;
  const DROP_COOLDOWN_MS = 500;
  const DANGER_LINE_Y = 100; // Slightly less since HUD is now HTML overlay
  let dangerTimer = 0;
  const DANGER_TIMEOUT = 2000;
  let fruitBodies = [];
  let mergeEffects = [];
  let scorePopups = [];
  let shakeIntensity = 0;
  let dropTrails = [];
  let trailFrame = 0;
  let comboBorderAlpha = 0;
  let maxMergedLevel = 0;
  let landingEffects = [];
  let rainbowRings = [];
  let screenFlash = 0; // 0~1, 1이면 최대 밝기 (두리안 합성 플래시)
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
  const COMBO_WINDOW_MS = 2000;
  let maxCombo = 0;
  let bestCombo = parseInt(localStorage.getItem('durianMergeBestCombo') || '0');

  // Canvas combo display
  let comboDisplay = null; // { text, alpha, scale, x, y }

  // Game over rank
  let gameOverRank = -1;

  // Ad optimization: time tracking + continue
  let gameStartTime = 0;
  let continuedThisGame = false;

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
      onContinue: watchAdToContinue,
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
    gameState = 'playing';
    gameStartTime = performance.now();
    continuedThisGame = false;
    UI.showScreen('playing');
    UI.updateHUD(0, highScore);
    UI.updateNextFruit(nextLevel);
  }

  function resetGame() {
    for (const body of fruitBodies) Physics.removeFruit(body);
    fruitBodies = [];
    mergeEffects = [];
    scorePopups = [];
    shakeIntensity = 0;
    screenFlash = 0;
    dropTrails = [];
    landingEffects = [];
    rainbowRings = [];
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

  async function watchAdToContinue() {
    if (typeof AdMobManager !== 'undefined') {
      const rewarded = await AdMobManager.showRewarded();
      if (rewarded) continueGame();
    }
  }

  function continueGame() {
    continuedThisGame = true;
    // Push danger-zone fruits down to give breathing room
    const maxY = BASE_HEIGHT - 50;
    for (const body of fruitBodies) {
      if (body.position.y - FRUITS[body.fruitLevel].radius < DANGER_LINE_Y + 30) {
        const newY = Math.min(body.position.y + 60, maxY);
        Matter.Body.setPosition(body, { x: body.position.x, y: newY });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Sleeping.set(body, false);
      }
    }
    dangerTimer = 0;
    canDrop = true;
    dropCooldown = 0;
    lastDropTime = 0;
    accumulator = 0;
    gameState = 'playing';
    UI.showScreen('playing');
    UI.updateHUD(score, highScore);
    UI.updateNextFruit(nextLevel);
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
    SoundManager.resumeCtx();
    // Reset state so startGame can proceed
    gameState = 'menu';
    startGame();
  }

  function menuFromPause() {
    if (gameState !== 'paused') return;
    gameState = 'menu';
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
      fruitBodies = fruitBodies.filter(b => b !== bodyA && b !== bodyB);

      const newBody = Physics.createFruit(mx, my, level + 1);
      newBody.droppedAt = 0;
      newBody.mergedAt = performance.now();
      fruitBodies.push(newBody);

      // Album unlock
      FruitAlbum.unlock(level + 1);
      if (level + 1 > maxMergedLevel) maxMergedLevel = level + 1;

      // Score + Combo
      const points = FRUITS[level + 1].score;
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

        UI.showCombo(comboCount);
        SoundManager.playCombo(comboCount);
        Haptic.combo(comboCount);
        comboBorderAlpha = 0.6;

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
      const particleCount = isHighLevel ? 20 : 16;
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
      for (let i = 0; i < 6; i++) {
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

      // High-level special effect: rainbow ring + large explosion
      if (isHighLevel) {
        rainbowRings.push({
          x: mx, y: my,
          radius: fruitRadius * 0.5,
          maxRadius: fruitRadius * 4,
          alpha: 1,
          hue: 0,
        });
      }

      // Screen shake — enhanced, level-proportional
      if (level >= 3) {
        shakeIntensity = Math.min(8, (level - 2) * 1.5);
      }
      if (comboCount >= 3) {
        shakeIntensity = Math.max(shakeIntensity, Math.min(5, comboCount * 1.2));
      }
      // Extra shake for high combos (5x+)
      if (comboCount >= 5) {
        shakeIntensity = Math.max(shakeIntensity, Math.min(7, 4 + (comboCount - 5) * 0.8));
      }

      // Durian merge special effects (level 9 = Durian)
      if (newLevel === 9) {
        shakeIntensity = 12;
        screenFlash = 0.8;

        // Extra golden particles
        for (let i = 0; i < 10; i++) {
          const p = acquireParticle();
          if (!p) break;
          p.angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          p.dist = 0;
          p.speed = 0.1 + Math.random() * 0.12;
          p.size = 3 + Math.random() * 4;
          p.isStar = true;
          p.color = '#FFD700';
          p.rotSpeed = (Math.random() - 0.5) * 0.15;
          p.rot = Math.random() * Math.PI * 2;
          p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.alpha = 0;
          particles.push(p);
        }

        // Override score popup with special style
        const lastPop = scorePopups[scorePopups.length - 1];
        if (lastPop) {
          lastPop.fontSize = 28;
          lastPop.color = '#FFD700';
        }
      }

      SoundManager.playMerge(level);
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
    const isNewBest = score > highScore;

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

    const { gameDurationMs, isNewBest } = gameOverAnimData;

    // Show interstitial (with frequency cap + duration filter)
    if (typeof AdMobManager !== 'undefined') {
      AdMobManager.showInterstitial(gameDurationMs);
    }

    // Can continue if: not already continued this game + rewarded ad available
    const canContinue = !continuedThisGame &&
      (typeof AdMobManager !== 'undefined' && AdMobManager.isRewardedReady());

    // Flush pending saves (game over is low-frequency, safe to write now)
    flushSaves();

    UI.showGameOver(score, highScore, isNewBest, gameOverRank, maxMergedLevel, canContinue, maxCombo, bestCombo);
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

      // Drop trails — enhanced: speed-proportional size and frequency
      trailFrame++;
      const trailInterval = 2; // slightly more frequent
      if (trailFrame % trailInterval === 0) {
        for (const body of fruitBodies) {
          if (!body.droppedAt) continue;
          const age = performance.now() - body.droppedAt;
          if (age > 800) continue;
          const vel = body.velocity;
          const speed = Math.abs(vel.y);
          if (speed < 1) continue;
          const fruit = FRUITS[body.fruitLevel];
          // More trail particles at higher speed
          const trailCount = speed > 6 ? 2 : 1;
          for (let t = 0; t < trailCount; t++) {
            const p = acquireParticle();
            if (!p) break;
            p.x = body.position.x + (Math.random() - 0.5) * fruit.radius * 0.6;
            p.y = body.position.y + (Math.random() - 0.5) * fruit.radius * 0.3;
            p.alpha = Math.min(0.6, 0.3 + speed * 0.03);
            p.size = Math.min(5, 1.5 + speed * 0.3 + Math.random() * 1.5);
            p.color = fruit.color;
            p.vx = 0; p.vy = 0;
            p.angle = 0; p.dist = 0; p.speed = 0;
            p.isStar = false; p.rotSpeed = 0; p.rot = 0;
            dropTrails.push(p);
          }
        }
      }

      // Landing detection — generate dust particles when fruit settles
      for (const body of fruitBodies) {
        if (body.isMerging) continue;
        const vel = body.velocity;
        const speed = Math.abs(vel.y);
        const fruit = FRUITS[body.fruitLevel];
        const bottomY = body.position.y + fruit.radius;
        // Detect landing: was moving fast, now nearly stopped, near floor or resting
        if (!body._wasMoving && speed > 3) {
          body._wasMoving = true;
        }
        if (body._wasMoving && speed < 0.5 && bottomY > BASE_HEIGHT - 20) {
          body._wasMoving = false;
          // Create dust particles
          const dustCount = Math.min(8, 3 + Math.floor(fruit.radius / 15));
          for (let d = 0; d < dustCount; d++) {
            const p = acquireParticle();
            if (!p) break;
            const side = d < dustCount / 2 ? -1 : 1;
            p.x = body.position.x + side * (Math.random() * fruit.radius * 0.8);
            p.y = bottomY;
            p.vx = side * (0.5 + Math.random() * 1.5);
            p.vy = -(0.5 + Math.random() * 1.5);
            p.alpha = 0.5 + Math.random() * 0.3;
            p.size = 1.5 + Math.random() * 2;
            p.color = '';
            p.angle = 0; p.dist = 0; p.speed = 0;
            p.isStar = false; p.rotSpeed = 0; p.rot = 0;
            landingEffects.push(p);
          }
        }
      }

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

      checkGameOver(delta);

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

      // Rainbow ring decay
      for (let i = rainbowRings.length - 1; i >= 0; i--) {
        const r = rainbowRings[i];
        r.radius += delta * 0.2;
        r.hue += delta * 0.5;
        r.alpha -= delta / 600;
        if (r.alpha <= 0 || r.radius > r.maxRadius) rainbowRings.splice(i, 1);
      }

      // Landing effects decay
      for (let i = landingEffects.length - 1; i >= 0; i--) {
        const l = landingEffects[i];
        l.x += l.vx;
        l.y += l.vy;
        l.vy += 0.05; // gravity
        l.alpha -= delta / 400;
        if (l.alpha <= 0) {
          releaseParticle(l);
          landingEffects.splice(i, 1);
        }
      }

      // Shake decay
      if (shakeIntensity > 0) {
        shakeIntensity -= delta * 0.02;
        if (shakeIntensity < 0) shakeIntensity = 0;
      }

      // Screen flash decay (durian merge)
      if (screenFlash > 0) {
        screenFlash -= delta / 300;
        if (screenFlash < 0) screenFlash = 0;
      }

      // Score popup decay
      for (let i = scorePopups.length - 1; i >= 0; i--) {
        scorePopups[i].dy -= delta * 0.05;
        scorePopups[i].alpha -= delta / 800;
        if (scorePopups[i].alpha <= 0) scorePopups.splice(i, 1);
      }

      // Drop trail decay
      for (let i = dropTrails.length - 1; i >= 0; i--) {
        dropTrails[i].alpha -= delta / 300;
        if (dropTrails[i].alpha <= 0) {
          releaseParticle(dropTrails[i]);
          dropTrails.splice(i, 1);
        }
      }

      // Combo border decay
      if (comboBorderAlpha > 0) {
        comboBorderAlpha -= delta / 500;
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

    // 4. 빨간 비네팅 (가장자리)
    const vignetteAlpha = Math.min(progress * 0.6, 0.4);
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const vignetteGrad = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR);
    vignetteGrad.addColorStop(0, 'rgba(180, 0, 0, 0)');
    vignetteGrad.addColorStop(0.6, `rgba(140, 0, 0, ${vignetteAlpha * 0.3})`);
    vignetteGrad.addColorStop(1, `rgba(100, 0, 0, ${vignetteAlpha})`);
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 5. 상단에서 내려오는 빨간 바 (데인저라인 확장 느낌)
    const barHeight = progress * (BASE_HEIGHT * 0.15);
    const barGrad = ctx.createLinearGradient(0, 0, 0, barHeight);
    barGrad.addColorStop(0, `rgba(200, 30, 30, ${Math.min(progress * 0.8, 0.5)})`);
    barGrad.addColorStop(1, 'rgba(200, 30, 30, 0)');
    ctx.fillStyle = barGrad;
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
    const flash = dangerTimer > 0 ? Math.sin(dangerTimer / 100) * 0.3 + 0.5 : 0.15;
    ctx.strokeStyle = `rgba(255, 80, 80, ${flash})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(4, DANGER_LINE_Y);
    ctx.lineTo(BASE_WIDTH - 4, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drop trails — batched by color (single path per color)
    if (dropTrails.length > 0) {
      const trailsByColor = {};
      for (let i = 0; i < dropTrails.length; i++) {
        const t = dropTrails[i];
        if (!trailsByColor[t.color]) trailsByColor[t.color] = [];
        trailsByColor[t.color].push(t);
      }
      for (const color in trailsByColor) {
        const trails = trailsByColor[color];
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        for (let i = 0; i < trails.length; i++) {
          const t = trails[i];
          ctx.moveTo(t.x + t.size, t.y);
          ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

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

    // Landing dust effects — batched into single path
    if (landingEffects.length > 0) {
      ctx.fillStyle = 'rgba(180, 160, 130, 0.6)';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (let i = 0; i < landingEffects.length; i++) {
        const l = landingEffects[i];
        ctx.moveTo(l.x + l.size, l.y);
        ctx.arc(l.x, l.y, l.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Merge effects
    for (const effect of mergeEffects) {
      // Glow — layered circles instead of createRadialGradient
      const glowMult = effect.level >= 7 ? 0.6 : 0.4;
      ctx.fillStyle = effect.color;
      ctx.globalAlpha = effect.alpha * glowMult * 0.15;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = effect.alpha * glowMult * 0.25;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = effect.alpha * glowMult * 0.35;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius * 0.3, 0, Math.PI * 2);
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

    // Rainbow rings (high-level merges) — no save/restore
    for (const ring of rainbowRings) {
      ctx.globalAlpha = ring.alpha * 0.7;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsl(${ring.hue % 360}, 100%, 65%)`;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Second ring slightly delayed
      if (ring.radius > 10) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsl(${(ring.hue + 120) % 360}, 100%, 65%)`;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
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

      // Cooldown circular progress ring
      const elapsed = performance.now() - lastDropTime;
      const progress = Math.min(elapsed / DROP_COOLDOWN_MS, 1);
      const ringRadius = 12;
      const ringX = dropX;
      const ringY = DANGER_LINE_Y - 20 + FRUITS[currentLevel].radius + ringRadius + 6;

      // Background ring
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Progress arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Combo border pulse — no save/restore needed
    if (comboBorderAlpha > 0) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${comboBorderAlpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, DANGER_LINE_Y, BASE_WIDTH - 4, BASE_HEIGHT - DANGER_LINE_Y - 2);
    }

    // Combo timer bar — with roundRect polyfill
    if (comboTimer > 0 && comboCount >= 1) {
      const barW = 120;
      const barH = 6;
      const barX = (BASE_WIDTH - barW) / 2;
      const barY = DANGER_LINE_Y + 8;
      const progress = comboTimer / COMBO_WINDOW_MS;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      _roundRect(ctx, barX, barY, barW, barH, 3);
      ctx.fill();

      // Fill — color shifts from gold to red as time runs out
      const r = Math.round(255);
      const g = Math.round(215 * progress);
      const b = Math.round(0);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.beginPath();
      _roundRect(ctx, barX, barY, barW * progress, barH, 3);
      ctx.fill();
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

    // Screen flash (durian merge special effect)
    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 200, ${screenFlash})`;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    // End screen shake
    if (shakeIntensity > 0) {
      ctx.restore();
    }
  }

  return { init };
})();

window.addEventListener('load', () => Game.init());
