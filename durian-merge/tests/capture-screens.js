const { chromium } = require('playwright');
const path = require('path');

const VIEWPORT = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'screenshots');

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Helper: screenshot with name
  async function snap(name) {
    const filePath = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  captured: ${name}`);
  }

  // Helper: wait for stability
  async function settle(ms = 300) {
    await page.waitForTimeout(ms);
  }

  // Suppress tutorial and daily reward auto-popup on load
  await page.addInitScript(() => {
    localStorage.setItem('durianMergeTutorialDone', 'true');
    // Mark daily reward as already claimed today to prevent auto-popup
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today, streak: 3, day: 3
    }));
  });

  console.log('Loading game...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await settle(1000);

  // Dismiss any overlay that might have auto-shown
  await page.evaluate(() => {
    ['dailyRewardOverlay', 'tutorialOverlay', 'missionOverlay', 'achievementOverlay',
     'modeSelectOverlay', 'statsOverlay', 'settingsOverlay', 'shareOverlay', 'nickModal',
     'skinsOverlay', 'rankingOverlay', 'itemsOverlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });
  await settle(300);

  // ===== 1. MENU =====
  console.log('1. Menu screen');
  await snap('01-menu');

  // ===== 2. TUTORIAL =====
  console.log('2. Tutorial');
  await page.evaluate(() => {
    if (typeof TutorialManager !== 'undefined') TutorialManager.show();
  });
  await settle(500);
  await snap('02-tutorial');
  // Close tutorial
  await page.evaluate(() => {
    document.getElementById('tutorialOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 3. SETTINGS MODAL (from menu) =====
  console.log('3. Settings modal');
  await page.click('#menuSettingsBtn');
  await settle(400);
  await snap('03-settings');
  // Close settings
  await page.click('#settingsClose');
  await settle(300);

  // ===== 4. STATS MODAL =====
  console.log('4. Stats modal');
  await page.click('#menuStatsBtn');
  await settle(400);
  await snap('04-stats');
  // Close stats
  await page.evaluate(() => {
    document.getElementById('statsOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 5a. MISSIONS MODAL (in progress) =====
  console.log('5a. Missions modal - in progress');
  await page.click('#missionBtn');
  await settle(400);
  await snap('05a-missions-progress');
  await page.evaluate(() => {
    document.getElementById('missionOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 5b. MISSIONS MODAL (completed, claimable) =====
  console.log('5b. Missions modal - completed claimable');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('durianMergeMissions') || '{}');
    if (data.missions) {
      data.missions.forEach(m => { m.completed = true; m.progress = m.target; m.rewarded = false; });
      localStorage.setItem('durianMergeMissions', JSON.stringify(data));
    }
    MissionManager.updateUI();
  });
  await page.click('#missionBtn');
  await settle(400);
  await snap('05b-missions-claimable');
  await page.evaluate(() => {
    document.getElementById('missionOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 5c. MISSIONS MODAL (all claimed) =====
  console.log('5c. Missions modal - all claimed');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('durianMergeMissions') || '{}');
    if (data.missions) {
      data.missions.forEach(m => { m.completed = true; m.progress = m.target; m.rewarded = true; });
      localStorage.setItem('durianMergeMissions', JSON.stringify(data));
    }
    MissionManager.updateUI();
  });
  await page.click('#missionBtn');
  await settle(400);
  await snap('05c-missions-claimed');
  await page.evaluate(() => {
    document.getElementById('missionOverlay').style.display = 'none';
  });
  await settle(200);

  // Reset missions back to normal for rest of captures
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('durianMergeMissions') || '{}');
    if (data.missions) {
      data.missions.forEach(m => { m.completed = false; m.progress = 0; m.rewarded = false; });
      localStorage.setItem('durianMergeMissions', JSON.stringify(data));
    }
    MissionManager.updateUI();
  });
  await settle(200);

  // ===== 6. ACHIEVEMENTS MODAL =====
  console.log('6. Achievements modal');
  await page.click('#achievementBtn');
  await settle(400);
  await snap('06-achievements');
  await page.evaluate(() => {
    document.getElementById('achievementOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 7a. DAILY REWARDS MODAL (unclaimed) =====
  console.log('7a. Daily rewards modal - unclaimed');
  // Reset daily reward to unclaimed state
  await page.evaluate(() => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: yesterday, streak: 2, day: 2
    }));
  });
  await page.click('#menuDailyBtn');
  await settle(400);
  await snap('07a-daily-rewards');
  await page.evaluate(() => {
    document.getElementById('dailyRewardOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 7b. DAILY REWARDS MODAL (claimed) =====
  console.log('7b. Daily rewards modal - claimed');
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaimDate: today, streak: 3, day: 3
    }));
  });
  await page.click('#menuDailyBtn');
  await settle(400);
  await snap('07b-daily-rewards-claimed');
  await page.evaluate(() => {
    document.getElementById('dailyRewardOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 8. MODE SELECT MODAL =====
  console.log('8. Mode select modal');
  await page.click('#menuModesBtn');
  await settle(400);
  await snap('08-mode-select');
  await page.evaluate(() => {
    document.getElementById('modeSelectOverlay').style.display = 'none';
  });
  await settle(200);

  // ===== 9. PLAYING (HUD) =====
  console.log('9. Playing screen');
  await page.click('#menuPlayBtn');
  await settle(1500); // wait for game to initialize
  await snap('09-playing');

  // ===== 10. PAUSED =====
  console.log('10. Paused screen');
  await page.click('#hudPauseBtn');
  await settle(400);
  await snap('10-paused');

  // ===== 11. PAUSE CONFIRM (restart) =====
  console.log('11. Pause confirm dialog');
  await page.click('#pauseRestartBtn');
  await settle(300);
  await snap('11-pause-confirm');
  // Cancel and resume
  await page.click('#pauseConfirmNo');
  await settle(200);
  await page.click('#pauseResumeBtn');
  await settle(300);

  // ===== 12. SETTINGS MODAL (from HUD/playing) =====
  // Skip — same as #3

  // ===== 13. GAME OVER (first-time user, no nickname) =====
  console.log('13. Game Over - first time user');
  // Clear nickname and set up fake ranking data
  await page.evaluate(() => {
    localStorage.removeItem('durianMergeNickname');
    localStorage.removeItem('durianMergeUserId');
    // Add fake scores for leaderboard display
    const scores = [];
    const names = ['MangoKing', 'DurianFan', 'CoconutJr', 'PapayaPro', 'RambutanX'];
    const pts = [2450, 1820, 1340, 980, 650];
    for (let i = 0; i < 5; i++) {
      scores.push({ name: names[i], score: pts[i], date: new Date().toISOString(), userId: 'fake' + i });
    }
    localStorage.setItem('durianMergeRanking', JSON.stringify(scores));
  });
  // Directly call showGameOver with realistic params
  await page.evaluate(() => {
    UI.showGameOver(1280, 2450, false, 3, 6, true, 4, 5);
  });
  await settle(2000);
  await snap('13-gameover-firsttime');

  // ===== 14. GAME OVER (returning user, new best) =====
  console.log('14. Game Over - returning user');
  await page.evaluate(() => {
    // Set nickname
    localStorage.setItem('durianMergeNickname', JSON.stringify({
      name: 'TestPlayer',
      userId: 'test-user-123',
      changedAt: Date.now() - 86400000 * 30
    }));
    // Add scores with player included
    const scores = [
      { name: 'MangoKing', score: 2450, date: new Date().toISOString(), userId: 'fake0' },
      { name: 'TestPlayer', score: 2100, date: new Date().toISOString(), userId: 'test-user-123' },
      { name: 'DurianFan', score: 1820, date: new Date().toISOString(), userId: 'fake1' },
      { name: 'CoconutJr', score: 1340, date: new Date().toISOString(), userId: 'fake2' },
      { name: 'PapayaPro', score: 980, date: new Date().toISOString(), userId: 'fake3' },
    ];
    localStorage.setItem('durianMergeRanking', JSON.stringify(scores));
    // Reload ranking manager
    if (typeof RankingManager !== 'undefined' && RankingManager.reload) RankingManager.reload();
  });
  await page.evaluate(() => {
    UI.showGameOver(2680, 2450, true, 1, 8, false, 6, 5);
  });
  await settle(2000);
  await snap('14-gameover-returning');

  // ===== 15. SHARE MODAL =====
  console.log('15. Share modal');
  await page.evaluate(() => {
    UI.showModal('share');
  });
  await settle(400);
  await snap('15-share');
  await page.evaluate(() => {
    UI.hideModal('share');
  });
  await settle(300);

  // ===== 16. LEADERBOARD (with data) =====
  console.log('16. Leaderboard');
  await page.evaluate(() => {
    UI.showScreen('leaderboard');
  });
  await settle(800);
  await snap('16-leaderboard');

  // ===== 17. NICKNAME EDIT MODAL =====
  console.log('17. Nickname edit modal');
  await page.evaluate(() => {
    UI.showScreen('menu');
  });
  await settle(300);
  await page.evaluate(() => {
    UI.showModal('nickname');
  });
  await settle(400);
  await snap('17-nickname-edit');

  console.log('\nAll screenshots captured!');
  await browser.close();
}

capture().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
