// Main Game Logic — Canvas renders gameplay only, HTML handles all UI
const Game = (() => {
  let canvas, ctx;
  let gameWidth, gameHeight;
  let score = 0;
  let highScore = 0;
  let currentLevel = 0;
  let nextLevel = 0;
  let gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameover'
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
  let lastTime = 0;
  let pointerDown = false;
  let bgGrad = null;

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
    // Reset lastTime to prevent delta explosion after long pause
    lastTime = performance.now();
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

  // Auto-pause on background (visibility change)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && gameState === 'playing') {
      pauseGame();
    }
  });

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
        // Multiplier: x1.5, x2, x2.5, x3 (capped)
        const multiplier = Math.min(1 + comboCount * 0.5, 3);
        const totalPoints = Math.floor(points * multiplier);
        score += totalPoints;

        if (comboCount > maxCombo) maxCombo = comboCount;

        // Canvas combo text animation
        comboDisplay = {
          text: comboCount + 'x COMBO!',
          subText: 'x' + multiplier.toFixed(1),
          alpha: 1,
          scale: 2.0,
          x: mx,
          y: Math.max(my - 40, DANGER_LINE_Y + 40),
        };

        UI.showCombo(comboCount);
        SoundManager.playCombo(comboCount);
        Haptic.combo();
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
        Haptic.merge();

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
        const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 0.06 + Math.random() * 0.08;
        particles.push({
          angle,
          dist: 0,
          speed: isHighLevel ? speed * 1.5 : speed,
          size: 2 + Math.random() * 3,
          isStar: i % 3 === 0, // every 3rd particle is star-shaped
          color: i % 2 === 0 ? fruitColor : '#FFFFC8', // alternate fruit color and sparkle
          rotSpeed: (Math.random() - 0.5) * 0.1,
          rot: Math.random() * Math.PI * 2,
        });
      }
      // Inner burst particles (small fast fragments)
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          angle,
          dist: 0,
          speed: 0.15 + Math.random() * 0.1,
          size: 1 + Math.random() * 1.5,
          isStar: false,
          color: fruitColor,
          rotSpeed: 0,
          rot: 0,
        });
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

      // Durian merge special effects (level 9 = Durian)
      if (newLevel === 9) {
        shakeIntensity = 12;
        screenFlash = 0.8;

        // Extra golden particles
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          particles.push({
            angle,
            dist: 0,
            speed: 0.1 + Math.random() * 0.12,
            size: 3 + Math.random() * 4,
            isStar: true,
            color: '#FFD700',
            rotSpeed: (Math.random() - 0.5) * 0.15,
            rot: Math.random() * Math.PI * 2,
          });
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
      if (dangerTimer >= DANGER_TIMEOUT) triggerGameOver();
    } else if (hasExemptAbove && dangerTimer > 0) {
      // Exempted fruits only in danger zone: hold timer (no increase, no decrease)
    } else {
      // No fruits above danger line: decrease timer
      dangerTimer = Math.max(0, dangerTimer - delta);
    }
  }

  function triggerGameOver() {
    gameState = 'gameover';
    const gameDurationMs = performance.now() - gameStartTime;
    const isNewBest = score > highScore;

    if (isNewBest) {
      highScore = score;
      localStorage.setItem('durianMergeHighScore', highScore.toString());
    }

    // Save best combo
    if (maxCombo > bestCombo) {
      bestCombo = maxCombo;
      localStorage.setItem('durianMergeBestCombo', bestCombo.toString());
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
    SoundManager.playGameOver();
    Haptic.gameOver();

    // Show interstitial (with frequency cap + duration filter)
    if (typeof AdMobManager !== 'undefined') {
      AdMobManager.showInterstitial(gameDurationMs);
    }

    // Can continue if: not already continued this game + rewarded ad available
    const canContinue = !continuedThisGame &&
      (typeof AdMobManager !== 'undefined' && AdMobManager.isRewardedReady());

    UI.showGameOver(score, highScore, isNewBest, gameOverRank, maxMergedLevel, canContinue, maxCombo, bestCombo);
  }

  // ===== GAME LOOP =====

  function gameLoop(timestamp) {
    const delta = Math.min(timestamp - lastTime, 33);
    lastTime = timestamp;

    if (gameState === 'playing') {
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
            dropTrails.push({
              x: body.position.x + (Math.random() - 0.5) * fruit.radius * 0.6,
              y: body.position.y + (Math.random() - 0.5) * fruit.radius * 0.3,
              alpha: Math.min(0.6, 0.3 + speed * 0.03),
              size: Math.min(5, 1.5 + speed * 0.3 + Math.random() * 1.5),
              color: fruit.color,
            });
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
            const side = d < dustCount / 2 ? -1 : 1;
            landingEffects.push({
              x: body.position.x + side * (Math.random() * fruit.radius * 0.8),
              y: bottomY,
              vx: side * (0.5 + Math.random() * 1.5),
              vy: -(0.5 + Math.random() * 1.5),
              alpha: 0.5 + Math.random() * 0.3,
              size: 1.5 + Math.random() * 2,
            });
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
        if (comboTimer <= 0) comboCount = 0;
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
        if (e.alpha <= 0) mergeEffects.splice(i, 1);
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
        if (l.alpha <= 0) landingEffects.splice(i, 1);
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
        if (dropTrails[i].alpha <= 0) dropTrails.splice(i, 1);
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

    requestAnimationFrame(gameLoop);
  }

  // ===== RENDERING (gameplay only — no UI) =====

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

    // Walls
    ctx.fillStyle = '#0D6B5E';
    ctx.fillRect(0, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);
    ctx.fillRect(BASE_WIDTH - 4, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);

    // Floor
    ctx.fillStyle = '#0D6B5E';
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

    // Drop trails
    for (const t of dropTrails) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

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

    // Landing dust effects
    for (const l of landingEffects) {
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 160, 130, ${l.alpha})`;
      ctx.fill();
    }

    // Merge effects
    for (const effect of mergeEffects) {
      // Glow — larger for high-level
      const glowMult = effect.level >= 7 ? 0.6 : 0.4;
      ctx.save();
      ctx.globalAlpha = effect.alpha * glowMult;
      const glow = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.glowRadius
      );
      glow.addColorStop(0, effect.color);
      glow.addColorStop(0.6, effect.color);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring — thicker for high level
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = effect.alpha * 0.6;
      ctx.lineWidth = effect.level >= 7 ? 3 : 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Particles — star-shaped or circular, fruit-colored
      for (const p of effect.particles) {
        const px = effect.x + Math.cos(p.angle) * p.dist;
        const py = effect.y + Math.sin(p.angle) * p.dist;
        const sz = p.size * effect.alpha;
        if (sz < 0.5) continue;

        ctx.save();
        ctx.globalAlpha = effect.alpha;
        ctx.translate(px, py);

        if (p.isStar) {
          // Draw star shape
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
        } else {
          // Circular particle with fruit color
          ctx.beginPath();
          ctx.arc(0, 0, sz, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Rainbow rings (high-level merges)
    for (const ring of rainbowRings) {
      ctx.save();
      ctx.globalAlpha = ring.alpha * 0.7;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsl(${ring.hue % 360}, 100%, 65%)`;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Second ring slightly delayed
      if (ring.radius > 10) {
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `hsl(${(ring.hue + 120) % 360}, 100%, 65%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Score popups — enhanced with dynamic size and color
    for (const pop of scorePopups) {
      ctx.save();
      ctx.globalAlpha = pop.alpha;
      const size = pop.fontSize || 16;
      ctx.font = `bold ${size}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      // Text stroke for readability
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(pop.text, pop.x, pop.y + pop.dy);
      ctx.fillStyle = pop.color || '#FFD700';
      ctx.fillText(pop.text, pop.x, pop.y + pop.dy);
      ctx.restore();
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

    // Combo border pulse
    if (comboBorderAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${comboBorderAlpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, DANGER_LINE_Y, BASE_WIDTH - 4, BASE_HEIGHT - DANGER_LINE_Y - 2);
      ctx.restore();
    }

    // Combo timer bar
    if (comboTimer > 0 && comboCount >= 1) {
      const barW = 120;
      const barH = 6;
      const barX = (BASE_WIDTH - barW) / 2;
      const barY = DANGER_LINE_Y + 8;
      const progress = comboTimer / COMBO_WINDOW_MS;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();

      // Fill — color shifts from gold to red as time runs out
      const r = Math.round(255);
      const g = Math.round(215 * progress);
      const b = Math.round(0);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progress, barH, 3);
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
      ctx.fillStyle = '#FFD700';
      ctx.fillText(comboDisplay.text, 0, 0);

      // Multiplier sub-text
      ctx.font = 'bold 18px "Fredoka", sans-serif';
      ctx.fillStyle = '#FFA500';
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
