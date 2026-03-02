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
  let lastTime = 0;
  let pointerDown = false;

  // Combo tracking
  let comboCount = 0;
  let comboTimer = 0;
  const COMBO_WINDOW_MS = 1200;

  // Game over rank
  let gameOverRank = -1;

  // Scale
  let scale = 1;
  const BASE_WIDTH = 390;
  const BASE_HEIGHT = 700;

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    highScore = parseInt(localStorage.getItem('fruitDropHighScore') || '0');
    NicknameManager.init();
    Haptic.init();

    // Init UI
    UI.init({
      onPlay: startGame,
      onWatchAd: watchAdForTicket,
    });

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
    UI.showScreen('playing');
    UI.updateHUD(0, highScore);
    UI.updateNextFruit(nextLevel);
    SoundManager.startBGM();
  }

  function resetGame() {
    for (const body of fruitBodies) Physics.removeFruit(body);
    fruitBodies = [];
    mergeEffects = [];
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
      } else {
        Haptic.merge();
      }

      // Merge effect
      mergeEffects.push({
        x: mx, y: my,
        radius: FRUITS[level + 1].radius,
        alpha: 1,
        color: FRUITS[level + 1].color,
      });

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
    const isNewBest = score > highScore;

    if (isNewBest) {
      highScore = score;
      localStorage.setItem('fruitDropHighScore', highScore.toString());
    }

    // Save to leaderboard (only if has name already)
    const name = NicknameManager.getName();
    if (name) {
      gameOverRank = RankingManager.addScore(name, score);
    } else {
      gameOverRank = RankingManager.getRank(score);
    }

    SoundManager.playGameOver();
    SoundManager.stopBGM();
    Haptic.gameOver();

    // Show interstitial
    if (typeof AdMobManager !== 'undefined') {
      AdMobManager.showInterstitial();
    }

    UI.showGameOver(score, highScore, isNewBest, gameOverRank);
  }

  // ===== GAME LOOP =====

  function gameLoop(timestamp) {
    const delta = Math.min(timestamp - lastTime, 33);
    lastTime = timestamp;

    if (gameState === 'playing') {
      Physics.update(delta);

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
        mergeEffects[i].alpha -= delta / 400;
        mergeEffects[i].radius += delta * 0.1;
        if (mergeEffects[i].alpha <= 0) mergeEffects.splice(i, 1);
      }

      render();
    }

    requestAnimationFrame(gameLoop);
  }

  // ===== RENDERING (gameplay only — no UI) =====

  function render() {
    // Background
    ctx.fillStyle = '#0D2818';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    bgGrad.addColorStop(0, 'rgba(26,64,37,0.3)');
    bgGrad.addColorStop(1, 'rgba(13,40,24,0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Walls
    ctx.fillStyle = '#1A5C2E';
    ctx.fillRect(0, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);
    ctx.fillRect(BASE_WIDTH - 4, DANGER_LINE_Y, 4, BASE_HEIGHT - DANGER_LINE_Y);

    // Floor
    ctx.fillStyle = '#1A5C2E';
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

    // Fruits
    for (const body of fruitBodies) {
      if (body.isMerging) continue;
      drawFruit(ctx, body.position.x, body.position.y, body.fruitLevel, body.angle);
    }

    // Merge effects
    for (const effect of mergeEffects) {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      const alpha = Math.floor(effect.alpha * 60).toString(16).padStart(2, '0');
      ctx.fillStyle = effect.color + alpha;
      ctx.fill();

      // Particles
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = effect.radius * 1.2;
        ctx.beginPath();
        ctx.arc(
          effect.x + Math.cos(a) * d,
          effect.y + Math.sin(a) * d,
          3, 0, Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 200, ${effect.alpha})`;
        ctx.fill();
      }
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
  }

  return { init };
})();

window.addEventListener('load', () => Game.init());
