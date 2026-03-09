// Ad Optimization Tests — Node.js built-in test runner
// Run: node --test tests/ad-optimization.test.js

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

// ===== HELPERS =====

function readSrc(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/** Build a minimal browser-like sandbox and load source files into it */
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
          fillText() {},
          createLinearGradient() { return { addColorStop() {} }; },
          createRadialGradient() { return { addColorStop() {} }; },
          fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '',
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
    },
    console,
    setTimeout: (fn, ms) => { fn(); return 1; },
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
    Math, Date, String, JSON, parseInt, parseFloat,
    Promise, Array, Object, Error, Map, Set,
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

/**
 * Load JS into sandbox. Patches top-level `const` to `var` so
 * declarations are added to the sandbox object (vm limitation).
 */
function loadInto(sandbox, ...files) {
  const ctx = vm.createContext(sandbox);
  for (const file of files) {
    let code = readSrc(file);
    // Patch top-level const/let → var so they're exposed on the sandbox
    code = code.replace(/^(const|let) /gm, 'var ');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

function fireEvent(sandbox, elementId, event, eventObj = {}) {
  const handlers = sandbox._listeners[elementId]?.[event] || [];
  handlers.forEach(fn => fn(eventObj));
}


// ============================
//  1. AdMob — Runtime Tests
// ============================
describe('AdMob — Runtime Behavior', () => {
  let ctx;

  beforeEach(() => {
    const sandbox = createSandbox();
    ctx = loadInto(sandbox, 'js/admob.js');
  });

  it('AdMobManager should exist in sandbox', () => {
    assert.ok(ctx.AdMobManager, 'AdMobManager should be defined');
  });

  it('should expose showInterstitial, showRewarded, isRewardedReady', () => {
    assert.equal(typeof ctx.AdMobManager.showInterstitial, 'function');
    assert.equal(typeof ctx.AdMobManager.showRewarded, 'function');
    assert.equal(typeof ctx.AdMobManager.isRewardedReady, 'function');
  });

  it('isRewardedReady should return true in browser mode (no Capacitor)', () => {
    assert.equal(ctx.AdMobManager.isRewardedReady(), true);
  });

  it('showRewarded should return true in browser mode (simulated)', async () => {
    const result = await ctx.AdMobManager.showRewarded();
    assert.equal(result, true);
  });

  it('showInterstitial should not throw on first call', async () => {
    await ctx.AdMobManager.showInterstitial(60000);
    // No error = pass
  });

  it('showInterstitial should not throw when called with short duration', async () => {
    await ctx.AdMobManager.showInterstitial(5000);
    // No error = pass (skipped due to duration < 30s)
  });
});


// ============================
//  2a. AdMob — ID Consistency
// ============================
describe('AdMob — ID Consistency', () => {
  const admobSrc = readSrc('js/admob.js');
  const manifestSrc = readSrc('android/app/src/main/AndroidManifest.xml');

  it('all ad unit IDs should have the same publisher prefix', () => {
    const idPattern = /ca-app-pub-(\d+)\/\d+/g;
    const prefixes = new Set();
    let match;
    while ((match = idPattern.exec(admobSrc)) !== null) {
      prefixes.add(match[1]);
    }
    assert.equal(prefixes.size, 1, `Expected 1 publisher prefix, found ${prefixes.size}: ${[...prefixes].join(', ')}`);
  });

  it('AndroidManifest app ID should match ad unit publisher prefix', () => {
    const manifestMatch = manifestSrc.match(/ca-app-pub-(\d+)~/);
    const adUnitMatch = admobSrc.match(/ca-app-pub-(\d+)\//);
    assert.ok(manifestMatch, 'AndroidManifest should contain app ID');
    assert.ok(adUnitMatch, 'admob.js should contain ad unit ID');
    assert.equal(manifestMatch[1], adUnitMatch[1],
      `Manifest prefix ${manifestMatch[1]} !== ad unit prefix ${adUnitMatch[1]}`);
  });

  it('should not use test ad IDs (ca-app-pub-3940256099942544)', () => {
    assert.ok(!admobSrc.includes('3940256099942544'), 'admob.js still has test ad IDs');
    assert.ok(!manifestSrc.includes('3940256099942544'), 'AndroidManifest still has test app ID');
  });
});


// ============================
//  2. AdMob — Source Contract
// ============================
describe('AdMob — Source Code Contract', () => {
  const src = readSrc('js/admob.js');

  it('should declare gamesSinceLastInterstitial counter', () => {
    assert.ok(src.includes('gamesSinceLastInterstitial'), 'Missing counter variable');
  });

  it('should set INTERSTITIAL_EVERY_N_GAMES = 2', () => {
    assert.ok(src.includes('INTERSTITIAL_EVERY_N_GAMES = 2'));
  });

  it('should set MIN_GAME_DURATION_MS = 30000', () => {
    assert.ok(src.includes('MIN_GAME_DURATION_MS = 30000'));
  });

  it('showInterstitial should accept gameDurationMs parameter', () => {
    assert.ok(src.includes('async function showInterstitial(gameDurationMs)'));
  });

  it('should skip when gameDurationMs < MIN_GAME_DURATION_MS', () => {
    assert.ok(src.includes('gameDurationMs < MIN_GAME_DURATION_MS'));
  });

  it('should skip when gamesSinceLastInterstitial < INTERSTITIAL_EVERY_N_GAMES', () => {
    assert.ok(src.includes('gamesSinceLastInterstitial < INTERSTITIAL_EVERY_N_GAMES'));
  });

  it('should reset counter to 0 after showing', () => {
    assert.ok(src.includes('gamesSinceLastInterstitial = 0'));
  });

  it('should increment counter on every call', () => {
    assert.ok(src.includes('gamesSinceLastInterstitial++'));
  });

  it('duration check should come BEFORE increment (short games skip counter)', () => {
    const fn = src.substring(src.indexOf('async function showInterstitial('), src.indexOf('async function showInterstitial(') + 600);
    const incIdx = fn.indexOf('gamesSinceLastInterstitial++');
    const durIdx = fn.indexOf('gameDurationMs < MIN_GAME_DURATION_MS');
    assert.ok(durIdx < incIdx, 'duration check should come before increment so short games are not counted');
  });

  it('frequency gate should come BEFORE AdMob null check', () => {
    const fn = src.substring(src.indexOf('async function showInterstitial('), src.indexOf('async function showInterstitial(') + 600);
    const freqIdx = fn.indexOf('gamesSinceLastInterstitial < INTERSTITIAL_EVERY_N_GAMES');
    const nullIdx = fn.indexOf('!AdMob || !interstitialLoaded');
    assert.ok(freqIdx < nullIdx);
  });
});


// ============================
//  3. Game.js — Source Contract
// ============================
describe('Game.js — Continue & Time Tracking', () => {
  const src = readSrc('js/game.js');

  it('should declare gameStartTime', () => {
    assert.ok(src.includes('gameStartTime = 0'));
  });

  it('startGame should set gameStartTime = performance.now()', () => {
    assert.ok(src.includes('gameStartTime = performance.now()'));
  });

  it('triggerGameOver should calculate gameDurationMs', () => {
    assert.ok(src.includes('performance.now() - gameStartTime'));
  });

  it('triggerGameOver should pass gameDurationMs to showInterstitial', () => {
    assert.ok(src.includes('AdMobManager.showInterstitial(gameDurationMs)'));
  });

});




// ============================
//  9. Backward Compatibility
// ============================
describe('Backward Compatibility', () => {
  const gameSrc = readSrc('js/game.js');
  const uiSrc = readSrc('js/ui.js');

  it('DEBUG triggerGameOver should still be exported', () => {
    assert.ok(gameSrc.includes('triggerGameOver'));
  });

  it('BEST 5-tap easter egg should still exist', () => {
    assert.ok(uiSrc.includes('bestTapCount >= 5'));
    assert.ok(uiSrc.includes('Game.triggerGameOver'));
  });

  it('startGame should still check tickets', () => {
    const block = gameSrc.substring(gameSrc.indexOf('function startGame()'), gameSrc.indexOf('function resetGame()'));
    assert.ok(block.includes('TicketManager.hasTickets()'));
    assert.ok(block.includes('TicketManager.useTicket()'));
  });

  it('watchAdForTicket should still exist', () => {
    assert.ok(gameSrc.includes('async function watchAdForTicket()'));
  });

  it('HUD settings button should be cached and bound', () => {
    assert.ok(uiSrc.includes("hudSettingsBtn: document.getElementById('hudSettingsBtn')"));
    assert.ok(uiSrc.includes('els.hudSettingsBtn.addEventListener'));
  });

  it('menu settings button should still work', () => {
    assert.ok(uiSrc.includes("els.menuSettingsBtn.addEventListener"));
  });
});
