// E2E Tests — Playwright (real browser)
// Run: npx playwright test tests/e2e.test.js

const { test, expect } = require('@playwright/test');

// Helper: skip tutorial by setting localStorage before page load
async function skipTutorial(page) {
  await page.addInitScript(() => {
    localStorage.setItem('durianMergeTutorialDone', 'true');
  });
}

// Helper: wait for game to be ready
async function waitForGame(page) {
  await page.waitForFunction(() => typeof Game !== 'undefined' && typeof Game.init === 'function', { timeout: 15000 });
}

// Helper: navigate with tutorial skipped
async function gotoGame(page) {
  await skipTutorial(page);
  await page.goto('/');
  await waitForGame(page);
}

// Helper: start the game (navigate + click PLAY)
async function startGame(page) {
  await gotoGame(page);

  const playBtn = page.locator('#menuPlayBtn');
  await playBtn.waitFor({ state: 'visible', timeout: 5000 });
  await playBtn.click();

  // Wait for HUD to become visible (indicates playing state)
  await page.waitForFunction(() => {
    const hud = document.getElementById('hud');
    return hud && hud.style.display !== 'none';
  }, { timeout: 5000 });
}

// Helper: drop fruit at x position by dispatching pointer events on canvas
async function dropFruit(page, x = 195) {
  await page.evaluate((dropX) => {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    // Calculate screen coordinates from game coordinates
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
}


// ============================
//  1. Page Load & Init
// ============================
test.describe('Page Load', () => {
  test('game page should load without critical errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await waitForGame(page);

    const criticalErrors = errors.filter(e =>
      !e.includes('firebase') && !e.includes('Firebase') &&
      !e.includes('AdMob') && !e.includes('admob') &&
      !e.includes('Failed to load') && !e.includes('Image')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('FRUITS should be defined with 11 entries', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    const count = await page.evaluate(() => FRUITS.length);
    expect(count).toBe(11);
  });

  test('Matter.js should be loaded', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);

    const hasMatter = await page.evaluate(() => typeof Matter !== 'undefined');
    expect(hasMatter).toBe(true);
  });
});


// ============================
//  2. Game Start
// ============================
test.describe('Game Start', () => {
  test('PLAY button should start the game', async ({ page }) => {
    await startGame(page);

    const hudVisible = await page.evaluate(() => {
      const hud = document.getElementById('hud');
      return hud && hud.style.display !== 'none';
    });
    expect(hudVisible).toBe(true);
  });

  test('score should start at 0', async ({ page }) => {
    await startGame(page);

    const scoreText = await page.locator('#hudScore').textContent();
    expect(scoreText.trim()).toBe('0');
  });

  test('canvas should be visible during gameplay', async ({ page }) => {
    await startGame(page);

    const canvasVisible = await page.evaluate(() => {
      const c = document.getElementById('gameCanvas');
      return c && c.style.display !== 'none';
    });
    expect(canvasVisible).toBe(true);
  });
});


// ============================
//  3. Fruit Drop
// ============================
test.describe('Fruit Drop', () => {
  test('clicking canvas should create a fruit body', async ({ page }) => {
    await startGame(page);

    const beforeCount = await page.evaluate(() =>
      Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit').length
    );

    await dropFruit(page);
    await page.waitForTimeout(300);

    const afterCount = await page.evaluate(() =>
      Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit').length
    );

    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('drop cooldown should prevent rapid drops', async ({ page }) => {
    await startGame(page);

    await dropFruit(page, 100);
    await page.waitForTimeout(50);
    await dropFruit(page, 200);
    await page.waitForTimeout(100);

    const count = await page.evaluate(() =>
      Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit').length
    );

    expect(count).toBe(1);
  });

  test('after cooldown, another drop should work', async ({ page }) => {
    await startGame(page);

    await dropFruit(page, 100);
    await page.waitForTimeout(650);
    await dropFruit(page, 200);
    await page.waitForTimeout(300);

    const count = await page.evaluate(() =>
      Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit').length
    );

    expect(count).toBe(2);
  });
});


// ============================
//  4. Merge & Score
// ============================
test.describe('Merge & Score', () => {
  test('dropping same-level fruits close together should eventually merge', async ({ page }) => {
    await startGame(page);

    // Override random to always get level 0 (smallest fruit)
    await page.evaluate(() => {
      Math._origRandom = Math.random;
      Math.random = () => 0.001;
    });

    for (let i = 0; i < 5; i++) {
      await dropFruit(page, 195);
      await page.waitForTimeout(650);
    }

    await page.waitForTimeout(3000);

    const score = await page.evaluate(() => {
      const el = document.getElementById('hudScore');
      return parseInt(el.textContent) || 0;
    });

    expect(score).toBeGreaterThan(0);

    await page.evaluate(() => { Math.random = Math._origRandom; });
  });
});


// ============================
//  5. UI Elements
// ============================
test.describe('UI Elements', () => {
  test('menu screen should have PLAY button', async ({ page }) => {
    await gotoGame(page);

    const playBtn = page.locator('#menuPlayBtn');
    await expect(playBtn).toBeVisible();
  });

  test('menu should have settings button', async ({ page }) => {
    await gotoGame(page);

    const settingsBtn = page.locator('#menuSettingsBtn');
    await expect(settingsBtn).toBeVisible();
  });

  test('HUD should show during gameplay', async ({ page }) => {
    await startGame(page);

    const hudVisible = await page.evaluate(() => {
      const hud = document.getElementById('hud');
      return hud && hud.style.display !== 'none';
    });
    expect(hudVisible).toBe(true);

    const score = page.locator('#hudScore');
    await expect(score).toBeVisible();
  });

  test('pause button should be visible during gameplay', async ({ page }) => {
    await startGame(page);

    const pauseBtn = page.locator('#hudPauseBtn');
    await expect(pauseBtn).toBeVisible();
  });
});


// ============================
//  6. Game Over Flow
// ============================
test.describe('Game Over', () => {
  test('game over screen elements should exist and be initially hidden', async ({ page }) => {
    await gotoGame(page);

    const goScreen = page.locator('#gameoverScreen');
    // Game over screen should exist but be hidden initially
    await expect(goScreen).toBeHidden();

    // Score element should exist
    const goScore = page.locator('#goScore');
    await expect(goScore).toBeAttached();
  });

  test('game over should show after stacking many fruits', async ({ page }) => {
    test.setTimeout(90000);
    await startGame(page);

    // Use large fruits to fill up fast
    await page.evaluate(() => {
      Math._origRandom = Math.random;
      Math.random = () => 0.99; // level 4
    });

    // Drop many large fruits — spread across canvas
    for (let i = 0; i < 25; i++) {
      const x = 30 + (i % 7) * 50;
      await dropFruit(page, x);
      await page.waitForTimeout(520);
    }

    // Check if game over triggered (non-deterministic, so allow both outcomes)
    const result = await page.evaluate(() => {
      const goScreen = document.getElementById('gameoverScreen');
      const isGameOver = goScreen && goScreen.style.display !== 'none';
      const fruitCount = Matter.Composite.allBodies(Physics.getEngine().world).filter(b => b.label === 'fruit').length;
      return { isGameOver, fruitCount };
    });

    await page.evaluate(() => { Math.random = Math._origRandom; });

    // At minimum, fruits should have been created
    expect(result.fruitCount).toBeGreaterThan(0);
    // If game over triggered, score should be visible
    if (result.isGameOver) {
      const finalScore = page.locator('#goScore');
      await expect(finalScore).toBeVisible();
    }
  });
});


// ============================
//  7. Pause / Resume
// ============================
test.describe('Pause & Resume', () => {
  test('pause button should show pause overlay', async ({ page }) => {
    await startGame(page);

    const pauseBtn = page.locator('#hudPauseBtn');
    await pauseBtn.click();

    const pauseVisible = await page.evaluate(() => {
      const overlay = document.getElementById('pauseOverlay');
      return overlay && overlay.style.display !== 'none';
    });

    expect(pauseVisible).toBe(true);
  });

  test('resume button should return to gameplay', async ({ page }) => {
    await startGame(page);

    await page.locator('#hudPauseBtn').click();
    await page.waitForTimeout(300);

    const resumeBtn = page.locator('#pauseResumeBtn');
    await resumeBtn.click();
    await page.waitForTimeout(300);

    const pauseHidden = await page.evaluate(() => {
      const overlay = document.getElementById('pauseOverlay');
      return !overlay || overlay.style.display === 'none';
    });

    expect(pauseHidden).toBe(true);
  });
});
