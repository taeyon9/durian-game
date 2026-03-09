const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const skins = ['tropical','jewels','emoji','neon','pastel','mono','galaxy','pixel','candy',
                  'desserts','sea','space','halloween','christmas'];
  const allUnlocked = JSON.stringify(skins);

  for (const skinId of skins) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    // Collect JS errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.addInitScript((args) => {
      localStorage.setItem('durianMergeTutorialDone', 'true');
      localStorage.setItem('durianMergeDailyReward', JSON.stringify({
        lastClaim: new Date().toISOString().slice(0,10), day: 1, claimed: true
      }));
      localStorage.setItem('durianMergeSkin', args.skinId);
      localStorage.setItem('durianMergeSkinUnlocks', args.allUnlocked);
    }, { skinId, allUnlocked });

    await page.goto('http://localhost:3456');
    await page.waitForTimeout(2000);

    const currentSkin = await page.evaluate(() => SkinManager.getCurrentSkinId());
    assert.strictEqual(currentSkin, skinId, `Expected ${skinId} but got ${currentSkin}`);

    const canvasCount = await page.evaluate(() =>
      document.querySelectorAll('#menuFruits canvas').length
    );
    assert.strictEqual(canvasCount, 3, `${skinId}: expected 3 canvases, got ${canvasCount}`);

    if (errors.length > 0) {
      console.warn(`  ⚠ ${skinId} had JS errors: ${errors.join('; ')}`);
    }

    await page.screenshot({ path: `screenshots/skin-test-${skinId}.png` });
    console.log(`✓ ${skinId}`);

    await page.close();
  }

  await browser.close();
  console.log(`\nAll ${skins.length} skins passed!`);
})();
