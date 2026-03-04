// Performance Benchmark — measures frame times during gameplay
// Run: npx playwright test tests/perf-benchmark.js --config=playwright.config.js
const { test, expect } = require('@playwright/test');

test('performance benchmark — frame times during gameplay', async ({ page }) => {
  test.setTimeout(120000);

  // Skip tutorial
  await page.addInitScript(() => {
    localStorage.setItem('durianMergeTutorialDone', 'true');
  });

  await page.goto('/');
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Game.init === 'function', { timeout: 15000 });

  // Start game
  const playBtn = page.locator('#menuPlayBtn');
  await playBtn.waitFor({ state: 'visible', timeout: 5000 });
  await playBtn.click();
  await page.waitForFunction(() => {
    const hud = document.getElementById('hud');
    return hud && hud.style.display !== 'none';
  }, { timeout: 5000 });

  // Inject frame time measurement
  await page.evaluate(() => {
    window.__perfData = {
      frameTimes: [],
      startTime: performance.now(),
      particleCounts: [],
      bodyCountMax: 0,
    };

    const origRAF = window.requestAnimationFrame;
    let lastFrame = performance.now();
    window.requestAnimationFrame = function(cb) {
      return origRAF.call(window, (ts) => {
        const now = performance.now();
        const dt = now - lastFrame;
        if (dt > 0 && dt < 200) { // skip outliers
          window.__perfData.frameTimes.push(dt);
        }
        lastFrame = now;

        // Count bodies
        try {
          const bodies = Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit');
          window.__perfData.bodyCountMax = Math.max(window.__perfData.bodyCountMax, bodies.length);
        } catch {}

        cb(ts);
      });
    };
  });

  // Play the game: drop fruits with merges happening
  // Use small fruits for more merges
  await page.evaluate(() => {
    Math._origRandom = Math.random;
    Math.random = () => 0.001; // always level 0
  });

  // Drop 30 fruits across the canvas
  for (let i = 0; i < 30; i++) {
    const x = 30 + (i % 8) * 42;
    await page.evaluate((dropX) => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / 390;
      const screenX = rect.left + dropX * scale;
      const screenY = rect.top + 50 * scale;
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: screenX, clientY: screenY, bubbles: true
      }));
      canvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: screenX, clientY: screenY, bubbles: true
      }));
    }, x);
    await page.waitForTimeout(550);
  }

  // Let physics settle and merges complete
  await page.waitForTimeout(3000);

  // Switch to large fruits for stress test
  await page.evaluate(() => {
    Math.random = () => 0.99; // level 4
  });

  for (let i = 0; i < 15; i++) {
    const x = 40 + (i % 6) * 55;
    await page.evaluate((dropX) => {
      const canvas = document.getElementById('gameCanvas');
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / 390;
      const screenX = rect.left + dropX * scale;
      const screenY = rect.top + 50 * scale;
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: screenX, clientY: screenY, bubbles: true
      }));
      canvas.dispatchEvent(new PointerEvent('pointerup', {
        clientX: screenX, clientY: screenY, bubbles: true
      }));
    }, x);
    await page.waitForTimeout(550);
  }

  await page.waitForTimeout(2000);

  // Restore random
  await page.evaluate(() => { Math.random = Math._origRandom; });

  // Collect results
  const results = await page.evaluate(() => {
    const ft = window.__perfData.frameTimes;
    if (ft.length === 0) return null;

    ft.sort((a, b) => a - b);
    const avg = ft.reduce((s, v) => s + v, 0) / ft.length;
    const median = ft[Math.floor(ft.length / 2)];
    const p95 = ft[Math.floor(ft.length * 0.95)];
    const p99 = ft[Math.floor(ft.length * 0.99)];
    const min = ft[0];
    const max = ft[ft.length - 1];
    const jank16 = ft.filter(t => t > 16.67).length;
    const jank33 = ft.filter(t => t > 33.33).length;
    const totalFrames = ft.length;
    const duration = (performance.now() - window.__perfData.startTime) / 1000;

    return {
      totalFrames,
      durationSec: Math.round(duration * 10) / 10,
      avgFps: Math.round(1000 / avg * 10) / 10,
      avgMs: Math.round(avg * 100) / 100,
      medianMs: Math.round(median * 100) / 100,
      p95Ms: Math.round(p95 * 100) / 100,
      p99Ms: Math.round(p99 * 100) / 100,
      minMs: Math.round(min * 100) / 100,
      maxMs: Math.round(max * 100) / 100,
      jankFrames16ms: jank16,
      jankFrames33ms: jank33,
      jankPercent: Math.round(jank16 / totalFrames * 10000) / 100,
      maxBodies: window.__perfData.bodyCountMax,
    };
  });

  console.log('\n===== PERFORMANCE BENCHMARK RESULTS =====');
  console.log(JSON.stringify(results, null, 2));
  console.log('==========================================\n');

  expect(results).not.toBeNull();
  expect(results.avgFps).toBeGreaterThan(30);
});
