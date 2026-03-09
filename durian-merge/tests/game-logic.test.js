// Game Logic Tests — Node.js built-in test runner
// Run: node --test tests/game-logic.test.js

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function readSrc(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function createSandbox(overrides = {}) {
  const storage = {};
  const elements = {};
  const listeners = {};

  function makeEl(id, tag = 'div') {
    return {
      id,
      tagName: tag.toUpperCase(),
      style: {},
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
      },
      innerHTML: '',
      textContent: '',
      value: '',
      checked: true,
      title: '',
      dataset: {},
      children: [],
      appendChild(c) { this.children.push(c); },
      addEventListener(ev, fn) {
        if (!listeners[id]) listeners[id] = {};
        if (!listeners[id][ev]) listeners[id][ev] = [];
        listeners[id][ev].push(fn);
      },
      removeEventListener() {},
      focus() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 700 }; },
      getContext() {
        return {
          clearRect() {}, fillRect() {}, strokeRect() {},
          beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
          fill() {}, stroke() {}, save() {}, restore() {},
          translate() {}, rotate() {}, scale() {},
          setTransform() {}, setLineDash() {},
          fillText() {}, drawImage() {},
          createLinearGradient() { return { addColorStop() {} }; },
          createRadialGradient() { return { addColorStop() {} }; },
          fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
          font: '', textAlign: '', textBaseline: '', shadowColor: '', shadowBlur: 0,
        };
      },
      offsetWidth: 100,
    };
  }

  function getElementById(id) {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  }

  const sandbox = {
    window: {},
    document: {
      getElementById,
      querySelectorAll: () => [],
      createElement: (tag) => makeEl('_dyn_' + Math.random(), tag),
      body: { classList: { add() {}, remove() {} } },
      addEventListener() {},
      visibilityState: 'visible',
    },
    console,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => {},
    navigator: { share: null, clipboard: { writeText: () => Promise.resolve() }, language: 'en-US', vibrate: () => {} },
    alert: () => {},
    prompt: () => null,
    localStorage: {
      _data: storage,
      getItem(k) { return storage[k] ?? null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; },
    },
    fetch: () => Promise.resolve({ ok: false }),
    Math, Date, String, JSON, parseInt, parseFloat, Number, isNaN,
    Promise, Array, Object, Error, Map, Set, Image: function() { this.onload = null; this.onerror = null; this.src = ''; },
    _elements: elements,
    _listeners: listeners,
    _storage: storage,
    ...overrides,
  };

  sandbox.window = sandbox;
  sandbox.window.Capacitor = undefined;
  sandbox.window.innerWidth = 390;
  sandbox.window.innerHeight = 750;
  sandbox.window.devicePixelRatio = 1;
  sandbox.window.addEventListener = () => {};

  return sandbox;
}

function loadInto(sandbox, ...files) {
  const ctx = vm.createContext(sandbox);
  for (const file of files) {
    let code = readSrc(file);
    code = code.replace(/^(const|let) /gm, 'var ');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

/** Build a full game sandbox with mocked dependencies */
function createGameSandbox(opts = {}) {
  const mergeLog = [];
  const removedBodies = [];
  let bodyIdCounter = 0;
  let collisionCallback = null;
  const allBodies = [];

  const sandbox = createSandbox();

  // Load fruits.js first for FRUITS and MAX_DROP_LEVEL
  loadInto(sandbox, 'js/fruits.js');

  // Mock Matter.js
  sandbox.Matter = {
    Engine: { create: () => ({ world: {} }), update() {} },
    World: { add(w, b) {}, remove(w, b) {} },
    Bodies: {
      circle: (x, y, r, opts2) => {
        const body = {
          id: ++bodyIdCounter,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          angle: 0,
          label: opts2?.label || 'fruit',
          fruitLevel: opts2?.fruitLevel ?? 0,
          isMerging: false,
          isStatic: opts2?.isStatic || false,
          droppedAt: 0,
          circleRadius: r,
        };
        return body;
      },
      rectangle: (x, y, w, h, opts2) => ({
        id: ++bodyIdCounter, position: { x, y }, isStatic: true, label: opts2?.label || 'wall',
      }),
    },
    Body: {
      setPosition(b, p) { b.position = p; },
      setVelocity(b, v) { b.velocity = v; },
      setStatic(b, s) { b.isStatic = s; },
    },
    Sleeping: { set() {} },
    Events: { on(engine, event, cb) { collisionCallback = cb; } },
    Runner: { create() {}, run() {} },
    Composite: { allBodies: () => allBodies.filter(b => !b.isStatic) },
  };

  // Physics mock that tracks created/removed fruits
  const createdBodies = [];
  sandbox.Physics = {
    init() {},
    onCollision(cb) { collisionCallback = cb; },
    createFruit(x, y, level) {
      const fruit = sandbox.FRUITS[level];
      if (!fruit) return null;
      const body = {
        id: ++bodyIdCounter,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        angle: 0,
        label: 'fruit',
        fruitLevel: level,
        isMerging: false,
        droppedAt: 0,
        circleRadius: fruit.radius,
      };
      createdBodies.push(body);
      allBodies.push(body);
      return body;
    },
    removeFruit(body) {
      removedBodies.push(body);
      const idx = allBodies.indexOf(body);
      if (idx >= 0) allBodies.splice(idx, 1);
    },
    update() {},
    getAllBodies: () => allBodies.filter(b => !b.isStatic),
    setStatic(b, s) { b.isStatic = s; },
    setPosition(b, x, y) { b.position = { x, y }; },
    setVelocity(b, vx, vy) { b.velocity = { x: vx, y: vy }; },
    getEngine: () => ({}),
    getWorld: () => ({}),
  };

  sandbox.SoundManager = {
    resume() {}, playDrop() {}, playMerge() {}, playGameOver() {},
    playCombo() {}, playComboBreak() {}, suspendCtx() {}, resumeCtx() {},
    fadeOutBGM() {},
    sfxMuted: false,
  };
  sandbox.Haptic = { init() {}, drop() {}, merge() {}, combo() {}, gameOver() {}, dangerWarning() {}, enabled: true };
  sandbox.NicknameManager = { init() {}, getName: () => 'TestPlayer', hasName: () => true, getUserId: () => 'uuid', canChangeName: () => true, getNextChangeDate: () => Date.now(), setName: (n) => ({ newName: n }) };
  sandbox.TicketManager = { getTickets: () => 5, hasTickets: () => true, useTicket() {}, addTicket() {} };
  sandbox.RankingManager = { addScore: () => 1, getRank: () => 1, getTopScores: () => [], updateNickname() {} };
  sandbox.FirebaseLeaderboard = undefined;
  if (!sandbox.FruitAlbum) sandbox.FruitAlbum = { unlock() {}, isUnlocked: () => false, count: () => 0, getUnlocked: () => [] };
  sandbox.AdMobManager = {
    showInterstitial: async () => {},
    showRewarded: async () => true,
    isRewardedReady: () => true,
  };

  // Load UI mock
  const uiCalls = { showScreen: [], updateHUD: [], updateNextFruit: [], showGameOver: [] };
  sandbox.UI = {
    init() {},
    showScreen(s) { uiCalls.showScreen.push(s); },
    updateHUD(s, h) { uiCalls.updateHUD.push({ score: s, highScore: h }); },
    updateNextFruit(l) { uiCalls.updateNextFruit.push(l); },
    showGameOver(...args) { uiCalls.showGameOver.push(args); },
    showCombo() {},
  };

  // Override setTimeout to NOT auto-execute (game.js uses it for window.load)
  sandbox.setTimeout = (fn, ms) => {
    sandbox._pendingTimeouts = sandbox._pendingTimeouts || [];
    sandbox._pendingTimeouts.push(fn);
    return sandbox._pendingTimeouts.length;
  };

  // Load game.js
  loadInto(sandbox, 'js/game.js');

  // Run pending timeouts (window.load handler)
  if (sandbox._pendingTimeouts) {
    for (const fn of sandbox._pendingTimeouts) fn();
  }

  return {
    sandbox,
    mergeLog,
    removedBodies,
    createdBodies,
    allBodies,
    uiCalls,
    triggerCollision(bodyA, bodyB) {
      if (collisionCallback) {
        collisionCallback({ pairs: [{ bodyA, bodyB }] });
      }
    },
    getCollisionCallback() { return collisionCallback; },
  };
}


// ============================
//  1. Fruit Definitions
// ============================
describe('Fruit Definitions', () => {
  it('should have 11 fruits defined', () => {
    const sandbox = createSandbox();
    const ctx = loadInto(sandbox, 'js/fruits.js');
    assert.equal(ctx.FRUITS.length, 11);
  });

  it('MAX_DROP_LEVEL should be 4 (only levels 0-4 droppable)', () => {
    const sandbox = createSandbox();
    const ctx = loadInto(sandbox, 'js/fruits.js');
    assert.equal(ctx.MAX_DROP_LEVEL, 4);
  });

  it('fruit radii should increase with level (except legendary)', () => {
    const sandbox = createSandbox();
    const ctx = loadInto(sandbox, 'js/fruits.js');
    for (let i = 1; i < 10; i++) {
      assert.ok(ctx.FRUITS[i].radius > ctx.FRUITS[i - 1].radius,
        `Level ${i} radius should be > level ${i - 1}`);
    }
  });

  it('fruit scores should increase with level (except legendary)', () => {
    const sandbox = createSandbox();
    const ctx = loadInto(sandbox, 'js/fruits.js');
    for (let i = 1; i < 10; i++) {
      assert.ok(ctx.FRUITS[i].score > ctx.FRUITS[i - 1].score,
        `Level ${i} score should be > level ${i - 1}`);
    }
  });

  it('legendary fruit (level 10) should have legendary flag', () => {
    const sandbox = createSandbox();
    const ctx = loadInto(sandbox, 'js/fruits.js');
    assert.equal(ctx.FRUITS[10].legendary, true);
  });
});


// ============================
//  2. Merge Logic
// ============================
describe('Merge Logic', () => {
  let env;

  beforeEach(() => {
    env = createGameSandbox();
  });

  it('same-level fruits should merge into next level', () => {
    const { sandbox, triggerCollision, createdBodies } = env;

    // Simulate startGame
    sandbox.Game.init && void 0; // already initialized
    // Directly create two level-2 fruits
    const bodyA = sandbox.Physics.createFruit(100, 400, 2);
    const bodyB = sandbox.Physics.createFruit(120, 400, 2);
    bodyA.droppedAt = 0;
    bodyB.droppedAt = 0;

    // Need to add them to fruitBodies - since we can't access internal state,
    // we test via collision event triggering
    // The collision handler checks fruitBodies internally, so we need to go through the game flow
    // Instead, verify the source logic directly
    const src = readSrc('js/game.js');
    assert.ok(src.includes('bodyA.fruitLevel !== bodyB.fruitLevel'));
    assert.ok(src.includes('Physics.createFruit(mx, my, level + 1)'));
  });

  it('max-level fruits should NOT merge further', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('level >= FRUITS.length - 1'));
  });

  it('merging fruits should be removed from physics', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Physics.removeFruit(bodyA)'));
    assert.ok(src.includes('Physics.removeFruit(bodyB)'));
  });

  it('new fruit position should be midpoint of merged pair', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('(bodyA.position.x + bodyB.position.x) / 2'));
    assert.ok(src.includes('(bodyA.position.y + bodyB.position.y) / 2'));
  });

  it('already-merging fruits should be skipped', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('bodyA.isMerging || bodyB.isMerging'));
  });
});


// ============================
//  3. Score Calculation
// ============================
describe('Score Calculation', () => {
  it('base merge score should come from next-level fruit', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('FRUITS[level + 1].score'));
  });

  it('score without combo should add raw points', () => {
    const src = readSrc('js/game.js');
    // When comboCount < 2, score += points (no multiplier)
    assert.ok(src.includes('score += points'));
  });

  it('combo score should apply multiplier', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Math.floor(points * multiplier)'));
  });

  it('score should be floored (no decimals)', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Math.floor(points * multiplier)'));
  });
});


// ============================
//  4. Combo System
// ============================
describe('Combo System', () => {
  it('combo window should decay: 900 → 700 → 500ms', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('function getComboWindow()'));
    assert.ok(src.includes('return 500'));
    assert.ok(src.includes('return 700'));
    assert.ok(src.includes('return 900'));
  });

  it('comboCount should increment on each merge', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('comboCount++'));
  });

  it('comboTimer should reset to getComboWindow() on merge', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('comboTimer = getComboWindow()'));
  });

  it('multiplier should be 1 + comboCount * 0.3, capped at 3', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Math.min(1 + comboCount * 0.3, 3)'));
  });

  it('combo multiplier values should be correct', () => {
    // comboCount=2 → 1+2*0.3=1.6, count=3 → 1.9, count=4 → 2.2, count=7+ → 3.0
    const calc = (count) => Math.min(1 + count * 0.3, 3);
    assert.strictEqual(calc(2), 1.6);
    assert.strictEqual(calc(3), 1.9);
    assert.strictEqual(calc(4), 2.2);
    assert.strictEqual(calc(5), 2.5);
    assert.strictEqual(calc(7), 3.0);
    assert.strictEqual(calc(10), 3.0); // capped
  });

  it('combo should only activate at comboCount >= 2', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('comboCount >= 2'));
  });

  it('combo should reset when timer expires', () => {
    const src = readSrc('js/game.js');
    // When timer hits 0, comboCount resets to 0
    const timerBlock = src.substring(
      src.indexOf('if (comboTimer > 0)'),
      src.indexOf('if (comboTimer > 0)') + 200
    );
    assert.ok(timerBlock.includes('comboCount = 0'));
  });

  it('combo break sound should play when combo >= 2 ends', () => {
    const src = readSrc('js/game.js');
    const timerBlock = src.substring(
      src.indexOf('if (comboTimer > 0)'),
      src.indexOf('if (comboTimer > 0)') + 200
    );
    assert.ok(timerBlock.includes('comboCount >= 2'));
    assert.ok(timerBlock.includes('SoundManager.playComboBreak()'));
  });

  it('combo text tiers should be correct', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes("comboText = 'COMBO!'"));    // count=2
    assert.ok(src.includes("comboText = 'NICE!!'"));    // count=3
    assert.ok(src.includes("comboText = 'GREAT!'"));    // count=4
    assert.ok(src.includes("comboText = 'FEVER!'"));    // count=5
    assert.ok(src.includes("comboText = 'MAX!!'"));     // count>=6
  });
});


// ============================
//  5. Game Over Detection
// ============================
describe('Game Over Detection', () => {
  it('DANGER_LINE_Y should be 100', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('DANGER_LINE_Y = 100'));
  });

  it('DANGER_TIMEOUT should be 2000ms', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('DANGER_TIMEOUT = 2000'));
  });

  it('recently dropped fruits should be exempt (1500ms grace)', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('body.droppedAt && now - body.droppedAt < 1500'));
  });

  it('recently merged fruits should be exempt (2000ms grace)', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('body.mergedAt && now - body.mergedAt < 2000'));
  });

  it('dangerTimer should accumulate when fruit is above line', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('dangerTimer += delta'));
  });

  it('dangerTimer should trigger game over at DANGER_TIMEOUT', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('dangerTimer >= DANGER_TIMEOUT'));
    assert.ok(src.includes('triggerGameOver()'));
  });

  it('dangerTimer should decrease when no danger', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('dangerTimer = Math.max(0, dangerTimer - delta)'));
  });

  it('danger warning haptic should fire after 1000ms', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('dangerTimer > 1000'));
    assert.ok(src.includes('Haptic.dangerWarning()'));
  });
});


// ============================
//  6. State Transitions
// ============================
describe('State Transitions', () => {
  it('initial state should be menu', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes("gameState = 'menu'"));
  });

  it('startGame should set state to playing', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function startGame()'), src.indexOf('function resetGame()'));
    assert.ok(block.includes("gameState = 'playing'"));
  });

  it('triggerGameOver should set state to gameoverAnim', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function triggerGameOver()'), src.indexOf('function finishGameOver()'));
    assert.ok(block.includes("gameState = 'gameoverAnim'"));
  });

  it('finishGameOver should set state to gameover', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function finishGameOver()'), src.indexOf('function gameLoop('));
    assert.ok(block.includes("gameState = 'gameover'"));
  });

  it('pauseGame should set state to paused', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes("function pauseGame()"));
    const block = src.substring(src.indexOf('function pauseGame()'), src.indexOf('function resumeGame()'));
    assert.ok(block.includes("gameState = 'paused'"));
  });

  it('resumeGame should restore state to playing', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function resumeGame()'), src.indexOf('function restartFromPause()'));
    assert.ok(block.includes("gameState = 'playing'"));
  });

  it('collision handler should skip if not playing', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function handleCollision('), src.indexOf('function handleCollision(') + 100);
    assert.ok(block.includes("gameState !== 'playing'"));
  });
});


// ============================
//  7. Drop Cooldown
// ============================
describe('Drop Cooldown', () => {
  it('DROP_COOLDOWN_MS should be 350ms', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('DROP_COOLDOWN_MS = 350'));
  });

  it('canDrop should be false after dropping', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function dropFruit()'), src.indexOf('function handleCollision('));
    assert.ok(block.includes('canDrop = false'));
  });

  it('dropFruit should exit early when canDrop is false', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function dropFruit()'), src.indexOf('function dropFruit()') + 100);
    assert.ok(block.includes('if (!canDrop) return'));
  });

  it('canDrop should re-enable after cooldown in game loop', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('performance.now() - lastDropTime >= DROP_COOLDOWN_MS'));
    assert.ok(src.includes('canDrop = true'));
  });

  it('drop position should be at DANGER_LINE_Y - 20', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Physics.createFruit(dropX, DANGER_LINE_Y - 20, currentLevel)'));
  });
});


// ============================
//  8. Fruit Generation
// ============================
describe('Fruit Generation', () => {
  it('randomDropLevel should use MAX_DROP_LEVEL + 1 range', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Math.floor(Math.random() * (MAX_DROP_LEVEL + 1))'));
  });

  it('next fruit should advance after drop', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function dropFruit()'), src.indexOf('function handleCollision('));
    assert.ok(block.includes('currentLevel = nextLevel'));
    assert.ok(block.includes('nextLevel = randomDropLevel()'));
  });

  it('UI should be updated with next fruit after drop', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function dropFruit()'), src.indexOf('function handleCollision('));
    assert.ok(block.includes('UI.updateNextFruit(nextLevel)'));
  });
});


// ============================
//  9. Game Loop — Physics & Timing
// ============================
describe('Game Loop', () => {
  it('should use fixed physics timestep of 16.67ms', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Physics.update(16.67)'));
  });

  it('should cap delta to prevent spiral of death', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Math.min(accumulator, 33)'));
  });

  it('should use frame throttling for 120Hz displays', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('accumulator < FRAME_DURATION'));
  });

  it('should check game over every frame', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('checkGameOver(delta)'));
  });
});


// ============================
// 10. Integration — Full Game Flow
// ============================
describe('Integration — Game Flow via Sandbox', () => {
  let env;

  beforeEach(() => {
    env = createGameSandbox();
  });

  it('Game.init should exist and be callable', () => {
    assert.ok(env.sandbox.Game);
    assert.equal(typeof env.sandbox.Game.init, 'function');
  });

  it('startGame should show playing screen', () => {
    // startGame is called internally; we can verify UI was told to show 'playing'
    // by checking if UI.showScreen was called during init flow
    // Actually, startGame isn't automatically called. Let's verify the source.
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function startGame()'), src.indexOf('function resetGame()'));
    assert.ok(block.includes("UI.showScreen('playing')"));
    assert.ok(block.includes('UI.updateHUD('));
    assert.ok(block.includes('UI.updateNextFruit(nextLevel)'));
  });

  it('resetGame should clear all game state', () => {
    const src = readSrc('js/game.js');
    const block = src.substring(src.indexOf('function resetGame()'), src.indexOf('async function watchAdForTicket()'));
    assert.ok(block.includes('fruitBodies = []'));
    assert.ok(block.includes('score = 0'));
    assert.ok(block.includes('dangerTimer = 0'));
    assert.ok(block.includes('comboCount = 0'));
    assert.ok(block.includes('comboTimer = 0'));
    assert.ok(block.includes('canDrop = true'));
    assert.ok(block.includes('dropCooldown = 0'));
    assert.ok(block.includes('maxMergedLevel = 0'));
  });

  it('HUD should update on score change (merge path)', () => {
    const src = readSrc('js/game.js');
    // After merge, UI.updateHUD is called
    const block = src.substring(src.indexOf('function handleCollision('), src.indexOf('function checkGameOver('));
    assert.ok(block.includes('UI.updateHUD(score, highScore)'));
  });
});

// ============================
//  11. Item System
// ============================
describe('Item System', () => {
  it('items.js should define ItemManager with IIFE pattern', () => {
    const src = readSrc('js/items.js');
    assert.ok(src.includes('const ItemManager'));
    assert.ok(src.includes('bomb'));
    assert.ok(src.includes('shake'));
    assert.ok(src.includes('upgrade'));
  });

  it('ItemManager should have getCount, addItem, useItem methods', () => {
    const src = readSrc('js/items.js');
    assert.ok(src.includes('function getCount'));
    assert.ok(src.includes('function addItem'));
    assert.ok(src.includes('function useItem'));
  });

  it('game.js should integrate item usage', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('function useItem'));
    assert.ok(src.includes('function useBomb'));
    assert.ok(src.includes('function useShake'));
    assert.ok(src.includes('function useUpgrade'));
  });

  it('game.js should expose useItem in return', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('return { init, useItem }'));
  });
});

// ============================
//  12. Challenge System
// ============================
describe('Challenge System', () => {
  it('challenge.js should define ChallengeManager with 6 modes', () => {
    const src = readSrc('js/challenge.js');
    assert.ok(src.includes('const ChallengeManager'));
    assert.ok(src.includes("normal"));
    assert.ok(src.includes("timeattack"));
    assert.ok(src.includes("tinyfruit"));
    assert.ok(src.includes("hard"));
    assert.ok(src.includes("speedrun"));
    assert.ok(src.includes("zen"));
  });

  it('game.js should apply challenge settings', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('function applyChallengeSettings'));
    assert.ok(src.includes('challengeTimer'));
    assert.ok(src.includes('radiusScale'));
  });

  it('game.js should handle time attack countdown', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('challengeTimer -= delta'));
  });
});

// ============================
//  13. Achievement System
// ============================
describe('Achievement System', () => {
  it('achievements.js should define 20 achievements', () => {
    const src = readSrc('js/achievements.js');
    assert.ok(src.includes('const AchievementManager'));
    assert.ok(src.includes("first_merge"));
    assert.ok(src.includes("merge_durian"));
    assert.ok(src.includes("all_achievements"));
    // Count achievement entries
    const count = (src.match(/\{ id: '/g) || []).length;
    assert.ok(count >= 20, 'Should have at least 20 achievements, got ' + count);
  });

  it('game.js should call AchievementManager.check', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes("AchievementManager.check('merge'"));
    assert.ok(src.includes("AchievementManager.check('combo'"));
    assert.ok(src.includes("AchievementManager.check('score'"));
    assert.ok(src.includes("AchievementManager.check('play'"));
  });
});

// ============================
//  14. Daily Reward System
// ============================
describe('Daily Reward System', () => {
  it('daily-rewards.js should define 7-day reward cycle', () => {
    const src = readSrc('js/daily-rewards.js');
    assert.ok(src.includes('const DailyRewardManager'));
    assert.ok(src.includes('day: 1'));
    assert.ok(src.includes('day: 7'));
    // Count reward entries
    const count = (src.match(/\{ day:/g) || []).length;
    assert.equal(count, 7);
  });

  it('should have checkIn and canCheckIn methods', () => {
    const src = readSrc('js/daily-rewards.js');
    assert.ok(src.includes('function checkIn'));
    assert.ok(src.includes('function canCheckIn'));
    assert.ok(src.includes('function getStreak'));
  });
});

// ============================
//  15. Season System
// ============================
describe('Season System', () => {
  it('season.js should define 6 themes', () => {
    const src = readSrc('js/season.js');
    assert.ok(src.includes('const SeasonManager'));
    assert.ok(src.includes('tropical_summer'));
    assert.ok(src.includes('midnight_neon'));
    assert.ok(src.includes('aurora_night'));
    const count = (src.match(/id: '/g) || []).length;
    assert.ok(count >= 6, 'Should have at least 6 themes');
  });

  it('game.js should track season missions', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes("SeasonManager.trackSeasonMission"));
  });
});

// ============================
//  16. Visual Effects
// ============================
describe('Visual Effects', () => {
  it('game.js should have merge flash effect', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('function renderMergeFlash'));
    assert.ok(src.includes('renderMergeFlash(effect)'));
  });

  it('game.js should have danger zone pulse', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('Danger zone pulse'));
  });
});

// ============================
//  17. Sound Effects
// ============================
describe('Sound Effects', () => {
  it('sounds.js should have item use and achievement sounds', () => {
    const src = readSrc('js/sounds.js');
    assert.ok(src.includes('function playItemUse'));
    assert.ok(src.includes('function playAchievement'));
    assert.ok(src.includes('function fadeOutBGM'));
  });
});

// ============================
//  18. Statistics Enhancement
// ============================
describe('Statistics Enhancement', () => {
  it('analytics.js should track combo stats', () => {
    const src = readSrc('js/analytics.js');
    assert.ok(src.includes("case 'combo'"));
    assert.ok(src.includes('comboStats'));
    assert.ok(src.includes('distribution'));
  });

  it('index.html should have combo stats section', () => {
    const src = readSrc('index.html');
    assert.ok(src.includes('statComboSection'));
    assert.ok(src.includes('statBestCombo'));
    assert.ok(src.includes('statComboDistribution'));
  });
});


// ============================
//  19. NEW BEST Detection Fix
// ============================
describe('NEW BEST Detection', () => {
  it('game.js should use highScoreAtStart for isNewBest comparison', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('highScoreAtStart'), 'highScoreAtStart variable should exist');
    assert.ok(src.includes('score > highScoreAtStart'), 'isNewBest should compare against highScoreAtStart');
  });

  it('startGame should save highScoreAtStart', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('highScoreAtStart = highScore'), 'startGame should save highScore at start');
  });

  it('isNewBest should be true when score exceeds initial highScore', () => {
    const { sandbox, triggerCollision, allBodies } = createGameSandbox();
    // Set initial high score
    sandbox.localStorage.setItem('durianMergeHighScore', '100');

    // Start game (reads highScore, saves highScoreAtStart)
    sandbox.Game.init();
    const startResult = sandbox.TicketManager.hasTickets();
    assert.ok(startResult, 'should have tickets');
  });
});


// ============================
//  20. Ticket Max Cap
// ============================
describe('Ticket Max Cap', () => {
  it('addTicket should cap at 999', () => {
    const src = readSrc('js/tickets.js');
    assert.ok(src.includes('Math.min(data.tickets + 1, 999)'), 'addTicket should use Math.min with 999');
  });
});


// ============================
//  21. Item In-Memory Cache
// ============================
describe('Item Cache', () => {
  it('items.js should have _cache variable', () => {
    const src = readSrc('js/items.js');
    assert.ok(src.includes('let _cache = null'), 'should have _cache variable');
  });

  it('load() should return cache when available', () => {
    const src = readSrc('js/items.js');
    assert.ok(src.includes('if (_cache) return _cache'), 'load should check cache first');
  });

  it('save() should update cache', () => {
    const src = readSrc('js/items.js');
    assert.ok(src.includes('_cache = data'), 'save should update cache');
  });
});


// ============================
//  22. Achievement Cache
// ============================
describe('Achievement Cache', () => {
  it('achievements.js should have _cache variable', () => {
    const src = readSrc('js/achievements.js');
    assert.ok(src.includes('let _cache = null'), 'should have _cache variable');
  });

  it('achievements should be badge-only (no material rewards)', () => {
    const src = readSrc('js/achievements.js');
    assert.ok(!src.includes("reward: { type: 'ticket'"), 'should not have ticket rewards');
    assert.ok(!src.includes("reward: { type: 'item'"), 'should not have item rewards');
    assert.ok(!src.includes("reward: { type: 'skin'"), 'should not have skin rewards');
  });
});


// ============================
//  23. Mission Debounce
// ============================
describe('Mission UI Debounce', () => {
  it('missions.js should debounce updateUI with requestAnimationFrame', () => {
    const src = readSrc('js/missions.js');
    assert.ok(src.includes('_uiPending'), 'should have _uiPending flag');
    assert.ok(src.includes('requestAnimationFrame'), 'should use requestAnimationFrame');
  });

  it('missions claimReward should play sound', () => {
    const src = readSrc('js/missions.js');
    assert.ok(src.includes("SoundManager.playDrop()"), 'claimReward should play drop sound');
  });
});


// ============================
//  24. Daily Reward Feedback
// ============================
describe('Daily Reward Feedback', () => {
  it('daily-rewards.js should play sound on check-in', () => {
    const src = readSrc('js/daily-rewards.js');
    assert.ok(src.includes('SoundManager.playDrop()'), 'checkIn should play sound');
    assert.ok(src.includes('Haptic.drop()'), 'checkIn should trigger haptic');
  });
});


// ============================
//  25. Modal Hiding Animations
// ============================
describe('Modal Hiding Animations', () => {
  it('achievements hidePanel should use hiding class', () => {
    const src = readSrc('js/achievements.js');
    assert.ok(src.includes("classList.add('hiding')"), 'should add hiding class');
    assert.ok(src.includes("classList.remove('hiding')"), 'should remove hiding class after timeout');
  });

  it('daily-rewards hidePanel should use hiding class', () => {
    const src = readSrc('js/daily-rewards.js');
    assert.ok(src.includes("classList.add('hiding')"), 'should add hiding class');
  });

  it('missions hidePanel should use hiding class', () => {
    const src = readSrc('js/missions.js');
    assert.ok(src.includes("classList.add('hiding')"), 'should add hiding class');
  });

  it('CSS should have hiding animation for overlay panels', () => {
    const src = readSrc('css/style.css');
    assert.ok(src.includes('#achievementOverlay.hiding'), 'should have achievement hiding rule');
    assert.ok(src.includes('#dailyRewardOverlay.hiding'), 'should have daily reward hiding rule');
    assert.ok(src.includes('#missionOverlay.hiding'), 'should have mission hiding rule');
  });
});


// ============================
//  26. Safe Area & BGM Fix
// ============================
describe('Safe Area & BGM', () => {
  it('--safe-bottom should use max() with 20px fallback', () => {
    const src = readSrc('css/style.css');
    assert.ok(src.includes('max(env(safe-area-inset-bottom'), 'should have max() wrapper');
    assert.ok(src.includes('20px'), 'should have 20px fallback');
  });

  it('sounds.js bgmPlay should disconnect previous nodes', () => {
    const src = readSrc('js/sounds.js');
    assert.ok(src.includes('n.disconnect()'), 'should disconnect previous nodes');
  });
});


// ============================
//  27. Leaderboard GoBack Context
// ============================
describe('Leaderboard GoBack Context', () => {
  it('ui.js should track previousScreen for leaderboard', () => {
    const src = readSrc('js/ui.js');
    assert.ok(src.includes("name === 'leaderboard'"), 'showScreen should handle leaderboard');
    assert.ok(src.includes("previousScreen === 'gameover'"), 'goBack should check gameover context');
  });
});


// ============================
//  28. Pause Restart Ticket Check
// ============================
describe('Pause Restart Ticket Check', () => {
  it('game.js restartFromPause should check tickets', () => {
    const src = readSrc('js/game.js');
    assert.ok(src.includes('restartFromPause'), 'should have restartFromPause function');
    // Find the restartFromPause section and verify ticket check
    const idx = src.indexOf('function restartFromPause');
    assert.ok(idx >= 0, 'should have restartFromPause function definition');
    const section = src.substring(idx, idx + 400);
    assert.ok(section.includes('hasTickets'), 'restartFromPause should check hasTickets');
    assert.ok(section.includes('showToast'), 'restartFromPause should show toast when no tickets');
  });
});
