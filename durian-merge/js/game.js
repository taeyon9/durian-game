// Main Game Logic — Canvas renders gameplay only, HTML handles all UI
const Game = (() => {
  let canvas, ctx;
  let gameWidth, gameHeight;
  let score = 0;
  let highScore = 0;
  let currentLevel = 0;
  let nextLevel = 0;
  let gameState = 'menu'; // 'menu', 'playing', 'gameover'
  let dropX = 0;
  let canDrop = true;
  let dropCooldown = 0;
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
  let lastTime = 0;
  let pointerDown = false;
  let bgGrad = null;

  // Combo tracking
  let comboCount = 0;
  let comboTimer = 0;
  const COMBO_WINDOW_MS = 1200;

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
    NicknameManager.init();
    Haptic.init();

    // Init UI
    UI.init({
      onPlay: startGame,
      onWatchAd: watchAdForTicket,
      onContinue: watchAdToContinue,
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
    if (pointerDown && canDrop) dropFruit();
    pointerDown = false;
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
    dropTrails = [];
    comboBorderAlpha = 0;
    score = 0;
    dangerTimer = 0;
    comboCount = 0;
    comboTimer = 0;
    canDrop = true;
    dropCooldown = 0;
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
    gameState = 'playing';
    UI.showScreen('playing');
    UI.updateHUD(score, highScore);
    UI.updateNextFruit(nextLevel);
  }

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
      fruitBodies.push(newBody);

      // Album unlock
      FruitAlbum.unlock(level + 1);
      if (level + 1 > maxMergedLevel) maxMergedLevel = level + 1;

      // Score
      const points = FRUITS[level + 1].score;
      score += points;

      // Combo
      comboCount++;
      comboTimer = COMBO_WINDOW_MS;
      if (comboCount >= 2) {
        const bonus = Math.floor(points * comboCount * 0.3);
        score += bonus;
        UI.showCombo(comboCount);
        SoundManager.playCombo(comboCount);
        Haptic.combo();
        comboBorderAlpha = 0.6;
      } else {
        Haptic.merge();
      }

      // Merge effect
      const particles = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = 0.08 + Math.random() * 0.06;
        particles.push({
          angle,
          dist: 0,
          speed,
          size: 2 + Math.random() * 3,
        });
      }
      mergeEffects.push({
        x: mx, y: my,
        radius: FRUITS[level + 1].radius,
        alpha: 1,
        color: FRUITS[level + 1].color,
        glowRadius: 0,
        particles,
      });

      scorePopups.push({
        x: mx, y: my,
        text: '+' + points,
        alpha: 1,
        dy: 0,
      });

      // Screen shake for high-level merges
      if (level >= 4) {
        shakeIntensity = Math.min(6, (level - 3) * 2);
      }

      SoundManager.playMerge(level);
      UI.updateHUD(score, highScore);
    }
  }

  function checkGameOver(delta) {
    let anyAbove = false;
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      if (body.droppedAt && performance.now() - body.droppedAt < 1500) continue;
      if (body.position.y - FRUITS[body.fruitLevel].radius < DANGER_LINE_Y) {
        anyAbove = true;
        break;
      }
    }

    if (anyAbove) {
      dangerTimer += delta;
      if (dangerTimer >= DANGER_TIMEOUT) triggerGameOver();
    } else {
      dangerTimer = 0;
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

    SoundManager.playGameOver();
    Haptic.gameOver();

    // Show interstitial (with frequency cap + duration filter)
    if (typeof AdMobManager !== 'undefined') {
      AdMobManager.showInterstitial(gameDurationMs);
    }

    // Can continue if: not already continued this game + rewarded ad available
    const canContinue = !continuedThisGame &&
      (typeof AdMobManager !== 'undefined' && AdMobManager.isRewardedReady());

    UI.showGameOver(score, highScore, isNewBest, gameOverRank, maxMergedLevel, canContinue);
  }

  // ===== GAME LOOP =====

  function gameLoop(timestamp) {
    const delta = Math.min(timestamp - lastTime, 33);
    lastTime = timestamp;

    if (gameState === 'playing') {
      Physics.update(delta);

      // Drop trails - generate for recently dropped fruits
      trailFrame++;
      if (trailFrame % 3 === 0) {
        for (const body of fruitBodies) {
          if (!body.droppedAt) continue;
          const age = performance.now() - body.droppedAt;
          if (age > 600) continue;
          const vel = body.velocity;
          if (Math.abs(vel.y) < 1) continue;
          const fruit = FRUITS[body.fruitLevel];
          dropTrails.push({
            x: body.position.x + (Math.random() - 0.5) * fruit.radius * 0.5,
            y: body.position.y,
            alpha: 0.5,
            size: 2 + Math.random() * 2,
            color: fruit.color,
          });
        }
      }

      if (!canDrop) {
        dropCooldown -= delta;
        if (dropCooldown <= 0) canDrop = true;
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
        e.alpha -= delta / 400;
        e.radius += delta * 0.1;
        e.glowRadius += delta * 0.15;
        for (const p of e.particles) {
          p.dist += p.speed * delta;
        }
        if (e.alpha <= 0) mergeEffects.splice(i, 1);
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

    // Merge effects
    for (const effect of mergeEffects) {
      // Glow
      ctx.save();
      ctx.globalAlpha = effect.alpha * 0.4;
      const glow = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.glowRadius
      );
      glow.addColorStop(0, effect.color);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = effect.alpha * 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Particles
      for (const p of effect.particles) {
        const px = effect.x + Math.cos(p.angle) * p.dist;
        const py = effect.y + Math.sin(p.angle) * p.dist;
        ctx.beginPath();
        ctx.arc(px, py, p.size * effect.alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 200, ${effect.alpha})`;
        ctx.fill();
      }
    }

    // Score popups
    for (const pop of scorePopups) {
      ctx.save();
      ctx.globalAlpha = pop.alpha;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
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
    }

    // Combo border pulse
    if (comboBorderAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${comboBorderAlpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, DANGER_LINE_Y, BASE_WIDTH - 4, BASE_HEIGHT - DANGER_LINE_Y - 2);
      ctx.restore();
    }

    // End screen shake
    if (shakeIntensity > 0) {
      ctx.restore();
    }
  }

  // DEBUG: triggerGameOver 노출 (릴리스 전 제거 → return { init })
  return { init, triggerGameOver };
})();

window.addEventListener('load', () => Game.init());
