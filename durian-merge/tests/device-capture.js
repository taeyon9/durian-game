/**
 * Device UI Capture — CDP + adb screencap hybrid
 *
 * Connects to the real device's WebView via Chrome DevTools Protocol,
 * navigates UI screens by clicking DOM elements, and captures screenshots
 * via adb screencap (full screen including status bar / nav bar).
 *
 * Usage: npm run device:capture
 * Prerequisite: App must be running on a connected device (npm run deploy)
 */

const CDP = require('chrome-remote-interface');
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

function findWebViewPid() {
  // List all WebView sockets available for debugging
  const sockets = adb('shell cat /proc/net/unix 2>/dev/null')
    .split('\n')
    .filter(l => l.includes('webview_devtools_remote'));

  if (sockets.length === 0) {
    throw new Error(
      'No WebView debug socket found. Is the app running?\n' +
      'Run: npm run deploy'
    );
  }

  // Extract PID from socket name: ...webview_devtools_remote_<pid>
  const match = sockets[0].match(/webview_devtools_remote_(\d+)/);
  if (!match) {
    // Might be a generic socket without PID suffix — try package-based approach
    const pid = adb('shell pidof com.durianmerge.game').split(/\s+/)[0];
    if (!pid) throw new Error('Could not find app PID. Is the app running?');
    return pid;
  }
  return match[1];
}

function setupForwarding(pid) {
  // Remove stale forwarding
  try { adb(`forward --remove tcp:${PORT}`); } catch {}

  // Try PID-specific socket first, then generic
  try {
    adb(`forward tcp:${PORT} localabstract:webview_devtools_remote_${pid}`);
    console.log(`  forwarding via webview_devtools_remote_${pid}`);
  } catch {
    adb(`forward tcp:${PORT} localabstract:webview_devtools_remote`);
    console.log('  forwarding via generic webview_devtools_remote');
  }
}

async function connectToDevice() {
  const pid = findWebViewPid();
  console.log(`WebView PID: ${pid}`);
  setupForwarding(pid);

  // Connect CDP
  const client = await CDP({ port: PORT });
  const { Runtime, Page } = client;
  await Runtime.enable();
  await Page.enable();
  console.log('CDP connected\n');
  return client;
}

async function captureScreen(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `device_${name}.png`);
  execSync(`${ADB} exec-out screencap -p > "${file}"`);
  const size = fs.statSync(file).size;
  console.log(`  captured: device_${name}.png (${(size / 1024).toFixed(0)}KB)`);
}

async function tap(Runtime, selector) {
  const { result } = await Runtime.evaluate({
    expression: `(() => {
      const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
      if (!el) return 'NOT_FOUND: ${selector}';
      el.click();
      return 'OK';
    })()`,
    returnByValue: true,
  });
  if (result.value !== 'OK') {
    console.warn(`    WARNING: tap('${selector}') → ${result.value}`);
    return false;
  }
  return true;
}

async function execJS(Runtime, expression) {
  const { result, exceptionDetails } = await Runtime.evaluate({
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    console.warn(`    JS error: ${exceptionDetails.text}`);
    return undefined;
  }
  return result.value;
}

async function dismissAll(Runtime) {
  await execJS(Runtime, `
    ['dailyRewardOverlay', 'tutorialOverlay', 'missionOverlay', 'achievementOverlay',
     'modeSelectOverlay', 'statsOverlay', 'settingsOverlay', 'shareOverlay', 'nickModal',
     'menuSkinsModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  `);
}

// ── Main Flow ───────────────────────────────────────────────

async function captureAllScreens() {
  const client = await connectToDevice();
  const { Runtime } = client;

  // Suppress tutorial and daily reward popup
  await execJS(Runtime, `
    localStorage.setItem('durianMergeTutorialDone', 'true');
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today, streak: 3, day: 3
    }));
  `);

  // Go to menu
  await execJS(Runtime, `UI.showScreen('menu')`);
  await sleep(SETTLE_MS);
  await dismissAll(Runtime);
  await sleep(300);

  // ===== 1. MENU =====
  console.log('1. Menu screen');
  await captureScreen('01-menu');

  // ===== 2. SKINS MODAL =====
  console.log('2. Skins modal');
  await tap(Runtime, '#menuSkinsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('02-skins');
  await execJS(Runtime, `document.getElementById('menuSkinsModal').style.display = 'none'`);
  await sleep(300);

  // ===== 3. SETTINGS =====
  console.log('3. Settings modal');
  await tap(Runtime, '#menuSettingsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('03-settings');
  await tap(Runtime, '#settingsClose');
  await sleep(300);

  // ===== 4. STATS =====
  console.log('4. Stats modal');
  await tap(Runtime, '#menuStatsBtn');
  await sleep(SETTLE_MS);
  await captureScreen('04-stats');
  await execJS(Runtime, `document.getElementById('statsOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 5. MISSIONS =====
  console.log('5. Missions modal');
  await tap(Runtime, '#missionBtn');
  await sleep(SETTLE_MS);
  await captureScreen('05-missions');
  await execJS(Runtime, `document.getElementById('missionOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 6. ACHIEVEMENTS =====
  console.log('6. Achievements modal');
  await tap(Runtime, '#achievementBtn');
  await sleep(SETTLE_MS);
  await captureScreen('06-achievements');
  await execJS(Runtime, `document.getElementById('achievementOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 7. DAILY REWARDS =====
  console.log('7. Daily rewards');
  // Reset to unclaimed for capture
  await execJS(Runtime, `
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: yesterday, streak: 2, day: 2
    }));
  `);
  await tap(Runtime, '#menuDailyBtn');
  await sleep(SETTLE_MS);
  await captureScreen('07-daily-rewards');
  await execJS(Runtime, `document.getElementById('dailyRewardOverlay').style.display = 'none'`);
  // Re-mark as claimed so it doesn't pop up later
  await execJS(Runtime, `
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today, streak: 3, day: 3
    }));
  `);
  await sleep(300);

  // ===== 8. MODE SELECT =====
  console.log('8. Mode select');
  await tap(Runtime, '#menuModesBtn');
  await sleep(SETTLE_MS);
  await captureScreen('08-mode-select');
  await execJS(Runtime, `document.getElementById('modeSelectOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 9. PLAYING (HUD) =====
  console.log('9. Playing screen');
  await tap(Runtime, '#menuPlayBtn');
  await sleep(1500); // wait for game init
  await captureScreen('09-playing');

  // ===== 10. PAUSED =====
  console.log('10. Paused screen');
  await tap(Runtime, '#hudPauseBtn');
  await sleep(SETTLE_MS);
  await captureScreen('10-paused');
  await tap(Runtime, '#pauseResumeBtn');
  await sleep(300);

  // ===== 11. GAME OVER =====
  console.log('11. Game Over');
  await execJS(Runtime, `
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
  await execJS(Runtime, `UI.showGameOver(2680, 2450, true, 1, 8, false, 6, 5)`);
  await sleep(2000);
  await captureScreen('11-gameover');

  // ===== 12. LEADERBOARD =====
  console.log('12. Leaderboard');
  await execJS(Runtime, `UI.showScreen('leaderboard')`);
  await sleep(800);
  await captureScreen('12-leaderboard');

  // ===== 13. SHARE =====
  console.log('13. Share modal');
  await execJS(Runtime, `UI.showModal('share')`);
  await sleep(SETTLE_MS);
  await captureScreen('13-share');
  await execJS(Runtime, `UI.hideModal('share')`);
  await sleep(300);

  // ===== BACK TO MENU =====
  await execJS(Runtime, `UI.showScreen('menu')`);
  await sleep(300);

  // ===== 14. TUTORIAL =====
  console.log('14. Tutorial');
  await execJS(Runtime, `
    if (typeof TutorialManager !== 'undefined') TutorialManager.show();
  `);
  await sleep(SETTLE_MS);
  await captureScreen('14-tutorial');
  await execJS(Runtime, `document.getElementById('tutorialOverlay').style.display = 'none'`);
  await sleep(300);

  // ===== 15. NICKNAME EDIT =====
  console.log('15. Nickname edit modal');
  await execJS(Runtime, `UI.showModal('nickname')`);
  await sleep(SETTLE_MS);
  await captureScreen('15-nickname');

  // Cleanup
  console.log('\nAll screenshots captured!');
  console.log(`Output: ${OUT}/device_*.png`);

  await client.close();

  // Remove port forwarding
  try { adb(`forward --remove tcp:${PORT}`); } catch {}
}

captureAllScreens().catch(err => {
  console.error('Error:', err.message || err);
  // Cleanup forwarding on error
  try { execSync(`${ADB} forward --remove tcp:${PORT}`); } catch {}
  process.exit(1);
});
