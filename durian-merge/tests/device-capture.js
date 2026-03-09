/**
 * Device UI Capture — ws + adb screencap hybrid
 *
 * Connects to the real device's WebView via Chrome DevTools Protocol (using ws),
 * navigates UI screens by evaluating JS, and captures screenshots
 * via adb screencap (full screen including status bar / nav bar).
 *
 * Usage: npm run device:capture
 * Prerequisite: App must be running on a connected device (npm run deploy)
 */

const WebSocket = require('ws');
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ADB = process.env.ADB || path.join(process.env.HOME, 'android-sdk/platform-tools/adb');
const OUT = path.join(__dirname, '..', 'screenshots');
const PORT = 9222;
const SETTLE_MS = 500;

// ── Helpers ─────────────────────────────────────────────────

function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: 'utf-8' }).trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Minimal CDP Client via ws ───────────────────────────────

class CDPClient {
  constructor(ws) {
    this._ws = ws;
    this._id = 0;
    this._callbacks = new Map();
    this._closed = false;
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id !== undefined && this._callbacks.has(msg.id)) {
        this._callbacks.get(msg.id)(msg);
        this._callbacks.delete(msg.id);
      }
    });
    ws.on('close', () => { this._closed = true; });
    ws.on('error', () => { this._closed = true; });

    // Keep-alive ping every 3 seconds
    this._pingInterval = setInterval(() => {
      if (!this._closed && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 3000);
  }

  send(method, params = {}, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (this._closed) return reject(new Error('WebSocket closed'));
      const id = ++this._id;
      this._callbacks.set(id, resolve);
      try {
        this._ws.send(JSON.stringify({ id, method, params }));
      } catch (e) {
        this._callbacks.delete(id);
        return reject(new Error(`WebSocket send failed: ${e.message}`));
      }
      setTimeout(() => {
        if (this._callbacks.has(id)) {
          this._callbacks.delete(id);
          reject(new Error(`CDP timeout: ${method} (id=${id})`));
        }
      }, timeout);
    });
  }

  async evaluate(expression, { timeout = 10000 } = {}) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    }, timeout);
    if (res.result?.exceptionDetails) {
      console.warn(`    JS error: ${res.result.exceptionDetails.text}`);
      return undefined;
    }
    return res.result?.result?.value;
  }

  async tap(selector) {
    const val = await this.evaluate(`(() => {
      const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
      if (!el) return 'NOT_FOUND: ${selector}';
      el.click();
      return 'OK';
    })()`);
    if (val !== 'OK') {
      console.warn(`    WARNING: tap('${selector}') → ${val}`);
      return false;
    }
    return true;
  }

  close() {
    clearInterval(this._pingInterval);
    this._ws.close();
  }
}

// ── Connection ──────────────────────────────────────────────

function findWebViewPid() {
  const sockets = adb('shell cat /proc/net/unix 2>/dev/null')
    .split('\n')
    .filter(l => l.includes('webview_devtools_remote'));

  if (sockets.length === 0) {
    throw new Error(
      'No WebView debug socket found. Is the app running?\nRun: npm run deploy'
    );
  }

  const match = sockets[0].match(/webview_devtools_remote_(\d+)/);
  if (!match) {
    const pid = adb('shell pidof com.durianmerge.game').split(/\s+/)[0];
    if (!pid) throw new Error('Could not find app PID');
    return pid;
  }
  return match[1];
}

function setupForwarding(pid) {
  try { adb('forward --remove-all'); } catch {}
  try {
    adb(`forward tcp:${PORT} localabstract:webview_devtools_remote_${pid}`);
    console.log(`  forwarding via webview_devtools_remote_${pid}`);
  } catch {
    adb(`forward tcp:${PORT} localabstract:webview_devtools_remote`);
    console.log('  forwarding via generic webview_devtools_remote');
  }
}

function discoverGameTarget() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          console.log(`  found ${targets.length} targets:`);
          targets.forEach((t, i) => console.log(`    [${i}] ${t.type} "${t.title}" ${t.url}`));

          // Prefer game page — look for localhost or Durian Merge title
          const game = targets.find(t =>
            t.type === 'page' && t.url.includes('localhost')
          ) || targets.find(t =>
            t.type === 'page' &&
            !t.url.includes('doubleclick') &&
            !t.url.includes('googleads')
          ) || targets.find(t => t.type === 'page');

          if (game?.webSocketDebuggerUrl) {
            const wsUrl = game.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://127.0.0.1:${PORT}`);
            console.log(`  selected: "${game.title}" (${game.url})`);
            resolve(wsUrl);
          } else {
            reject(new Error('No debuggable game page found'));
          }
        } catch { reject(new Error('JSON parse failed')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => { ws.terminate(); reject(new Error('ws connect timeout')); }, 5000);
  });
}

async function connectToDevice(retries = 5) {
  const pid = findWebViewPid();
  console.log(`WebView PID: ${pid}`);
  setupForwarding(pid);

  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`  retry ${i}/${retries - 1}...`);
        try { adb('shell input tap 200 400'); } catch {}
        await sleep(2000);
        setupForwarding(pid);
      }

      const wsUrl = await discoverGameTarget();
      console.log(`  target: ${wsUrl}`);
      const ws = await connectWebSocket(wsUrl);
      const client = new CDPClient(ws);

      // Enable domains
      await client.send('Runtime.enable');
      await client.send('Page.enable');
      console.log('CDP connected\n');
      return client;
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  connection failed: ${e.message}`);
    }
  }
}

async function captureScreen(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `device_${name}.png`);
  execSync(`${ADB} exec-out screencap -p > "${file}"`);
  const size = fs.statSync(file).size;
  console.log(`  captured: device_${name}.png (${(size / 1024).toFixed(0)}KB)`);
}

// ── Main Flow ───────────────────────────────────────────────

async function captureAllScreens() {
  // Wake screen, dismiss lock screen, and bring app to foreground
  try {
    adb('shell input keyevent KEYCODE_WAKEUP');      // screen on
    adb('shell input keyevent 82');                    // KEYCODE_MENU — dismisses lock
    adb('shell input swipe 540 2000 540 500 200');     // swipe up backup
  } catch {}
  await sleep(1500);
  try { adb('shell am start -n com.durianmerge.game/.MainActivity'); } catch {}
  await sleep(2000);

  let cdp = await connectToDevice();

  // Reconnect helper — if CDP dies, reconnect and re-navigate to menu
  async function reconnect() {
    console.log('  reconnecting CDP...');
    try { cdp.close(); } catch {}
    await sleep(1000);
    cdp = await connectToDevice();
    await cdp.evaluate(`UI.showScreen('menu')`);
    await sleep(500);
  }

  // Safe evaluate — retries once with reconnect on timeout
  async function safeEval(expr) {
    try {
      return await cdp.evaluate(expr);
    } catch (e) {
      if (e.message.includes('timeout') || e.message.includes('closed')) {
        await reconnect();
        return await cdp.evaluate(expr);
      }
      throw e;
    }
  }

  // Safe tap — retries once with reconnect
  async function safeTap(selector) {
    try {
      return await cdp.tap(selector);
    } catch (e) {
      if (e.message.includes('timeout') || e.message.includes('closed')) {
        await reconnect();
        return await cdp.tap(selector);
      }
      throw e;
    }
  }

  // Wait for page to be fully loaded
  for (let i = 0; i < 10; i++) {
    const ready = await cdp.evaluate(`document.readyState`);
    const hasUI = await cdp.evaluate(`typeof UI !== 'undefined'`);
    console.log(`  page: readyState=${ready}, UI=${hasUI}`);
    if (ready === 'complete' && hasUI === true) break;
    await sleep(1000);
  }

  // Suppress tutorial and daily reward popup
  await safeEval(`
    localStorage.setItem('durianMergeTutorialDone', 'true');
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today, streak: 3, day: 3
    }));
  `);

  // Helper: dismiss all overlays
  async function dismissAll() {
    await safeEval(`
      ['dailyRewardOverlay', 'tutorialOverlay', 'missionOverlay', 'achievementOverlay',
       'modeSelectOverlay', 'statsOverlay', 'settingsOverlay', 'shareOverlay', 'nickModal',
       'skinsOverlay', 'rankingOverlay', 'itemsOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    `);
  }

  // Go to menu
  await safeEval(`UI.showScreen('menu')`);
  await sleep(SETTLE_MS);
  await dismissAll();
  await sleep(300);

  // ===== 1. MENU =====
  console.log('1. Menu screen');
  await captureScreen('01-menu');

  // ===== 2. SKINS MODAL =====
  console.log('2. Skins modal');
  await safeTap('#menuSkinsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('02-skins');
  await safeEval(`document.getElementById('skinsOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 3. SETTINGS =====
  console.log('3. Settings modal');
  await safeTap('#menuSettingsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('03-settings');
  await safeEval(`document.getElementById('settingsOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 4. STATS =====
  console.log('4. Stats modal');
  await safeTap('#menuStatsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('04-stats');
  await safeEval(`document.getElementById('statsOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 5. MISSIONS =====
  console.log('5. Missions modal');
  await safeTap('#missionBtn');
  await sleep(SETTLE_MS);
  await captureScreen('05-missions');
  await safeEval(`document.getElementById('missionOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 6. ACHIEVEMENTS =====
  console.log('6. Achievements modal');
  await safeTap('#achievementBtn');
  await sleep(SETTLE_MS);
  await captureScreen('06-achievements');
  await safeEval(`document.getElementById('achievementOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 7. DAILY REWARDS =====
  console.log('7. Daily rewards');
  await safeEval(`
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: yesterday, streak: 2, day: 2
    }));
  `);
  await safeTap('#menuDailyBtn');
  await sleep(SETTLE_MS);
  await captureScreen('07-daily-rewards');
  await safeEval(`document.getElementById('dailyRewardOverlay').style.display = 'none'`);
  await safeEval(`
    const today2 = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today2, streak: 3, day: 3
    }));
  `);
  await sleep(300);

  // ===== 8. MODE SELECT =====
  console.log('8. Mode select');
  await safeTap('#menuModesBtn');
  await sleep(SETTLE_MS);
  await captureScreen('08-mode-select');
  await safeEval(`document.getElementById('modeSelectOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 9. PLAYING (HUD) =====
  console.log('9. Playing screen');
  await safeTap('#menuPlayBtn');
  await sleep(1500);
  await captureScreen('09-playing');

  // ===== 10. PAUSED =====
  console.log('10. Paused screen');
  await safeEval(`document.getElementById('pauseOverlay').style.display = 'flex'`);
  await sleep(SETTLE_MS);
  await captureScreen('10-paused');
  await safeEval(`document.getElementById('pauseOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 11. GAME OVER =====
  console.log('11. Game Over');
  await safeEval(`
    localStorage.setItem('durianMergeNickname', JSON.stringify({
      name: 'TestPlayer', userId: 'test-123', changedAt: Date.now() - 86400000 * 30
    }));
    const scores = [
      { name: 'MangoKing', score: 2450, date: new Date().toISOString(), userId: 'f0' },
      { name: 'TestPlayer', score: 2100, date: new Date().toISOString(), userId: 'test-123' },
      { name: 'DurianFan', score: 1820, date: new Date().toISOString(), userId: 'f1' },
    ];
    localStorage.setItem('durianMergeRanking', JSON.stringify(scores));
  `);
  await safeEval(`UI.showGameOver(2680, 2450, true, 1, 8, false, 6, 5)`);
  await sleep(2000);
  await captureScreen('11-gameover');

  // ===== 12. LEADERBOARD =====
  console.log('12. Leaderboard');
  await safeEval(`UI.showScreen('leaderboard')`);
  await sleep(800);
  await captureScreen('12-leaderboard');

  // ===== 13. SHARE =====
  console.log('13. Share modal');
  await safeEval(`UI.showModal('share')`);
  await sleep(SETTLE_MS);
  await captureScreen('13-share');
  await safeEval(`UI.hideModal('share')`);
  await sleep(300);

  // ===== BACK TO MENU =====
  await safeEval(`UI.showScreen('menu')`);
  await sleep(300);

  // ===== 14. TUTORIAL =====
  console.log('14. Tutorial');
  await safeEval(`
    if (typeof TutorialManager !== 'undefined') TutorialManager.show();
  `);
  await sleep(SETTLE_MS);
  await captureScreen('14-tutorial');
  await safeEval(`document.getElementById('tutorialOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 15. NICKNAME EDIT =====
  console.log('15. Nickname edit modal');
  await safeEval(`UI.showModal('nickname')`);
  await sleep(SETTLE_MS);
  await captureScreen('15-nickname');

  // Cleanup
  console.log('\nAll screenshots captured!');
  console.log(`Output: ${OUT}/device_*.png`);

  cdp.close();
  try { adb(`forward --remove tcp:${PORT}`); } catch {}
}

captureAllScreens().catch(err => {
  console.error('Error:', err.message || err);
  try { execSync(`${ADB} forward --remove tcp:${PORT}`); } catch {}
  process.exit(1);
});
