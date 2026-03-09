# Skin System Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand skin system from 3 to 14 skins with 6 new procedural rendering types and new unlock condition types.

**Architecture:** Add 11 new skin definitions to `skins.js`, add 6 new rendering branches to `drawFruit()` in `fruits.js`, extend `checkUnlocks()` to support new condition types (`singleGameScore`, `loginStreak`, `albumCount`, `missionsCompleted`, `singleGameCombos`, `season`), and track new stats (`maxComboInGame`, `missionsCompleted`) from `game.js`/`missions.js`.

**Tech Stack:** Vanilla JS, Canvas 2D procedural rendering, localStorage

**Design doc:** `docs/plans/2026-03-09-skin-system-expansion-design.md`

---

### Task 1: Add new skin definitions to skins.js

**Files:**
- Modify: `js/skins.js:7-71` (SKINS object)
- Modify: `js/skins.js:29-34` (update jewels/emoji unlock values)

**Step 1: Update existing skin unlock values**

Change jewels `unlockValue: 5000` → `50000`, description → `'Unlock: 50,000 total pts'`.
Change emoji `unlockValue: 10` → `30`, description → `'Unlock: 30 games played'`.

**Step 2: Add 6 new procedural skins after emoji**

Each skin needs: `id`, `name`, `description`, `unlockCondition`, `unlockValue`, `type`, `data` (11 entries).

```js
neon: {
  id: 'neon', name: 'Neon', description: 'Score 10,000 in one game',
  unlockCondition: 'singleGameScore', unlockValue: 10000, type: 'neon',
  data: [
    { color: '#FF0040', glow: '#FF0040' },  // Hot Pink
    { color: '#00FF41', glow: '#00FF41' },  // Matrix Green
    { color: '#FF6600', glow: '#FF6600' },  // Orange
    { color: '#BF00FF', glow: '#BF00FF' },  // Purple
    { color: '#00D4FF', glow: '#00D4FF' },  // Cyan
    { color: '#FFFF00', glow: '#FFFF00' },  // Yellow
    { color: '#FF0080', glow: '#FF0080' },  // Magenta
    { color: '#00FF80', glow: '#00FF80' },  // Spring Green
    { color: '#FF4400', glow: '#FF4400' },  // Red-Orange
    { color: '#4400FF', glow: '#4400FF' },  // Blue
    { color: '#FFFFFF', glow: '#FFFFFF' },  // White
  ],
},
pastel: {
  id: 'pastel', name: 'Pastel', description: '7-day login streak',
  unlockCondition: 'loginStreak', unlockValue: 7, type: 'pastel',
  data: [
    { color: '#FFB3BA' },  // Pastel Pink
    { color: '#BAFFC9' },  // Pastel Green
    { color: '#BAE1FF' },  // Pastel Blue
    { color: '#E8BAFF' },  // Pastel Purple
    { color: '#FFFFBA' },  // Pastel Yellow
    { color: '#FFD4BA' },  // Pastel Peach
    { color: '#BAFFF5' },  // Pastel Mint
    { color: '#D4BAFF' },  // Pastel Lavender
    { color: '#FFF0BA' },  // Pastel Cream
    { color: '#BAFFBA' },  // Pastel Lime
    { color: '#FFDDF4' },  // Pastel Rose
  ],
},
mono: {
  id: 'mono', name: 'Monochrome', description: 'Discover 8 fruits',
  unlockCondition: 'albumCount', unlockValue: 8, type: 'mono',
  data: [
    { color: '#D4C5A9' },  // Lightest sepia
    { color: '#C4B599' },
    { color: '#B4A589' },
    { color: '#A49579' },
    { color: '#948569' },
    { color: '#847559' },
    { color: '#746549' },
    { color: '#645539' },
    { color: '#544529' },
    { color: '#443519' },
    { color: '#F5E6C8' },  // Legendary: light gold sepia
  ],
},
galaxy: {
  id: 'galaxy', name: 'Galaxy', description: 'Score 30,000 in one game',
  unlockCondition: 'singleGameScore', unlockValue: 30000, type: 'galaxy',
  data: [
    { color: '#1A0533', highlight: '#FF6BFF' },
    { color: '#0A1628', highlight: '#6BB5FF' },
    { color: '#1A0A28', highlight: '#FF6B9D' },
    { color: '#0A2818', highlight: '#6BFFC0' },
    { color: '#28180A', highlight: '#FFD46B' },
    { color: '#0A1A28', highlight: '#6BFFF2' },
    { color: '#280A1A', highlight: '#FF6BDB' },
    { color: '#0A280A', highlight: '#6BFF6B' },
    { color: '#28280A', highlight: '#FFFF6B' },
    { color: '#1A0A33', highlight: '#B36BFF' },
    { color: '#0A0A28', highlight: '#FFFFFF' },
  ],
},
pixel: {
  id: 'pixel', name: 'Pixel', description: 'Complete 30 missions',
  unlockCondition: 'missionsCompleted', unlockValue: 30, type: 'pixel',
  data: [
    { color: '#FF6B6B', dark: '#CC5555' },
    { color: '#6BCB77', dark: '#55A25F' },
    { color: '#4D96FF', dark: '#3D78CC' },
    { color: '#9B59B6', dark: '#7C4792' },
    { color: '#F39C12', dark: '#C27D0E' },
    { color: '#E74C8B', dark: '#B93D6F' },
    { color: '#1ABC9C', dark: '#15967D' },
    { color: '#95A5A6', dark: '#778485' },
    { color: '#F1C40F', dark: '#C19D0C' },
    { color: '#2ECC71', dark: '#25A25A' },
    { color: '#E8D44D', dark: '#B9A93E' },
  ],
},
candy: {
  id: 'candy', name: 'Candy', description: '100 combos in one game',
  unlockCondition: 'singleGameCombos', unlockValue: 100, type: 'candy',
  data: [
    { color: '#FF6B8A', stripe: '#FFFFFF' },
    { color: '#FFE066', stripe: '#FF9F43' },
    { color: '#7BED9F', stripe: '#FFFFFF' },
    { color: '#70A1FF', stripe: '#FFFFFF' },
    { color: '#FF6348', stripe: '#FFC312' },
    { color: '#A29BFE', stripe: '#DFE6E9' },
    { color: '#FD79A8', stripe: '#FDCB6E' },
    { color: '#55E6C1', stripe: '#FFFFFF' },
    { color: '#FECA57', stripe: '#FF6B6B' },
    { color: '#FF9FF3', stripe: '#F368E0' },
    { color: '#FFFFFF', stripe: '#FF6B8A' },
  ],
},
```

**Step 3: Add 5 PNG premium skin placeholders**

These use `type: 'placeholder'` initially. Each has a `theme` field describing the visual for future asset creation.

```js
desserts: {
  id: 'desserts', name: 'Desserts', description: 'Earn 200,000 total pts',
  unlockCondition: 'totalScore', unlockValue: 200000, type: 'placeholder',
  theme: ['Macaron', 'Cookie', 'Cupcake', 'Donut', 'Eclair', 'Cake Slice', 'Ice Cream', 'Pudding', 'Candy Apple', 'Wedding Cake', 'Star Cookie'],
  data: [
    { color: '#FFB6C1', emoji: '🧁' }, { color: '#DEB887', emoji: '🍪' },
    { color: '#FFD700', emoji: '🧁' }, { color: '#FF69B4', emoji: '🍩' },
    { color: '#D2691E', emoji: '🥐' }, { color: '#FFC0CB', emoji: '🍰' },
    { color: '#87CEEB', emoji: '🍦' }, { color: '#FFDAB9', emoji: '🍮' },
    { color: '#FF4500', emoji: '🍎' }, { color: '#FFFFF0', emoji: '🎂' },
    { color: '#FFD700', emoji: '⭐' },
  ],
},
sea: {
  id: 'sea', name: 'Sea Creatures', description: 'Play 100 games',
  unlockCondition: 'gamesPlayed', unlockValue: 100, type: 'placeholder',
  theme: ['Shell', 'Seahorse', 'Starfish', 'Jellyfish', 'Clownfish', 'Pufferfish', 'Turtle', 'Octopus', 'Dolphin', 'Whale', 'Trident'],
  data: [
    { color: '#FFB6C1', emoji: '🐚' }, { color: '#FFA07A', emoji: '🦑' },
    { color: '#FFD700', emoji: '⭐' }, { color: '#DDA0DD', emoji: '🪼' },
    { color: '#FF6347', emoji: '🐠' }, { color: '#98FB98', emoji: '🐡' },
    { color: '#20B2AA', emoji: '🐢' }, { color: '#9370DB', emoji: '🐙' },
    { color: '#87CEEB', emoji: '🐬' }, { color: '#4682B4', emoji: '🐋' },
    { color: '#00CED1', emoji: '🔱' },
  ],
},
space: {
  id: 'space', name: 'Space', description: 'Score 50,000 in one game',
  unlockCondition: 'singleGameScore', unlockValue: 50000, type: 'placeholder',
  theme: ['Asteroid', 'Moon', 'Mars', 'Comet', 'Saturn', 'Jupiter', 'Nebula', 'Supernova', 'Galaxy', 'Black Hole', 'Star'],
  data: [
    { color: '#808080', emoji: '☄️' }, { color: '#C0C0C0', emoji: '🌙' },
    { color: '#FF4500', emoji: '🔴' }, { color: '#00BFFF', emoji: '💫' },
    { color: '#DAA520', emoji: '🪐' }, { color: '#FF8C00', emoji: '🟠' },
    { color: '#8A2BE2', emoji: '🌌' }, { color: '#FF6347', emoji: '💥' },
    { color: '#4B0082', emoji: '🌀' }, { color: '#1C1C1C', emoji: '⚫' },
    { color: '#FFFFFF', emoji: '✨' },
  ],
},
halloween: {
  id: 'halloween', name: 'Halloween', description: 'Season: October',
  unlockCondition: 'season', unlockValue: { month: 10, subCondition: 'gamesPlayed', subValue: 30 },
  type: 'placeholder',
  theme: ['Candy Corn', 'Bat', 'Spider', 'Ghost', 'Witch Hat', 'Skull', 'Cauldron', 'Coffin', 'Vampire', 'Pumpkin King', 'Jack-o-Lantern'],
  data: [
    { color: '#FF8C00', emoji: '🍬' }, { color: '#2C2C2C', emoji: '🦇' },
    { color: '#1C1C1C', emoji: '🕷️' }, { color: '#F5F5F5', emoji: '👻' },
    { color: '#6A0DAD', emoji: '🧙' }, { color: '#F5F5DC', emoji: '💀' },
    { color: '#228B22', emoji: '🫕' }, { color: '#4A3728', emoji: '⚰️' },
    { color: '#8B0000', emoji: '🧛' }, { color: '#FF6600', emoji: '🎃' },
    { color: '#FFD700', emoji: '🌟' },
  ],
},
christmas: {
  id: 'christmas', name: 'Christmas', description: 'Season: December',
  unlockCondition: 'season', unlockValue: { month: 12, subCondition: 'loginStreak', subValue: 7 },
  type: 'placeholder',
  theme: ['Snowflake', 'Gingerbread', 'Ornament', 'Candy Cane', 'Bell', 'Stocking', 'Wreath', 'Reindeer', 'Sleigh', 'Christmas Tree', 'Star'],
  data: [
    { color: '#ADD8E6', emoji: '❄️' }, { color: '#D2691E', emoji: '🍪' },
    { color: '#FF0000', emoji: '🔴' }, { color: '#FF4040', emoji: '🍭' },
    { color: '#FFD700', emoji: '🔔' }, { color: '#FF0000', emoji: '🧦' },
    { color: '#228B22', emoji: '🎄' }, { color: '#8B4513', emoji: '🦌' },
    { color: '#C0C0C0', emoji: '🛷' }, { color: '#006400', emoji: '🎄' },
    { color: '#FFD700', emoji: '⭐' },
  ],
},
```

**Step 4: Commit**

```bash
git add js/skins.js
git commit -m "feat: add 11 new skin definitions (6 procedural + 5 premium placeholder)"
```

---

### Task 2: Extend unlock condition system in skins.js

**Files:**
- Modify: `js/skins.js:81-97` (recordGameEnd, add new stat tracking)
- Modify: `js/skins.js:99-123` (checkUnlocks, add new condition types)
- Modify: `js/skins.js:160-172` (getUnlockProgress, add new condition types)

**Step 1: Extend `recordGameEnd()` to accept and track more stats**

```js
// Change signature: recordGameEnd(score) → recordGameEnd(score, extras)
// extras = { maxCombo: N } (optional)
function recordGameEnd(score, extras) {
  const stats = getStats();
  stats.totalScore = (stats.totalScore || 0) + score;
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  // Track best single-game score
  if (score > (stats.bestSingleScore || 0)) {
    stats.bestSingleScore = score;
  }
  // Track best single-game combo count
  if (extras && extras.maxCombo > (stats.bestSingleCombos || 0)) {
    stats.bestSingleCombos = extras.maxCombo;
  }
  saveStats(stats);
  checkUnlocks();
}
```

**Step 2: Add `recordMissionComplete()` function**

```js
function recordMissionComplete() {
  const stats = getStats();
  stats.missionsCompleted = (stats.missionsCompleted || 0) + 1;
  saveStats(stats);
  checkUnlocks();
}
```

**Step 3: Extend `checkUnlocks()` with new condition types**

Add these branches to the `Object.values(SKINS).forEach` loop:

```js
} else if (skin.unlockCondition === 'singleGameScore') {
  met = (stats.bestSingleScore || 0) >= skin.unlockValue;
} else if (skin.unlockCondition === 'loginStreak') {
  // Read from DailyRewardManager
  if (typeof DailyRewardManager !== 'undefined') {
    met = DailyRewardManager.getStreak() >= skin.unlockValue;
  }
} else if (skin.unlockCondition === 'albumCount') {
  if (typeof FruitAlbum !== 'undefined') {
    met = FruitAlbum.count() >= skin.unlockValue;
  }
} else if (skin.unlockCondition === 'missionsCompleted') {
  met = (stats.missionsCompleted || 0) >= skin.unlockValue;
} else if (skin.unlockCondition === 'singleGameCombos') {
  met = (stats.bestSingleCombos || 0) >= skin.unlockValue;
} else if (skin.unlockCondition === 'season') {
  const now = new Date();
  const sv = skin.unlockValue;
  if (now.getMonth() + 1 === sv.month) {
    if (sv.subCondition === 'gamesPlayed') {
      met = (stats.gamesPlayed || 0) >= sv.subValue;
    } else if (sv.subCondition === 'loginStreak') {
      if (typeof DailyRewardManager !== 'undefined') {
        met = DailyRewardManager.getStreak() >= sv.subValue;
      }
    }
  }
}
```

**Step 4: Extend `getUnlockProgress()` for new condition types**

Add matching branches that return `{ current, target }` for each new condition type.

**Step 5: Export `recordMissionComplete` in the return object**

**Step 6: Commit**

```bash
git add js/skins.js
git commit -m "feat: extend unlock system with 6 new condition types"
```

---

### Task 3: Wire stat tracking from game.js and missions.js

**Files:**
- Modify: `js/game.js` — pass `maxCombo` to `recordGameEnd()`
- Modify: `js/missions.js` — call `recordMissionComplete()` on claim

**Step 1: In game.js, find where `SkinManager.recordGameEnd(score)` is called**

Search for `recordGameEnd` in game.js. Change to:
```js
SkinManager.recordGameEnd(score, { maxCombo: comboCount });
```
Note: `comboCount` tracks combos in current game. Verify variable name — might be `bestCombo` or `totalCombos`. Use the one that tracks total combos in the current game session.

**Step 2: In missions.js `claimReward()`, add skin stats tracking**

After `mission.rewarded = true; save(data);` add:
```js
if (typeof SkinManager !== 'undefined' && SkinManager.recordMissionComplete) {
  SkinManager.recordMissionComplete();
}
```

**Step 3: Commit**

```bash
git add js/game.js js/missions.js
git commit -m "feat: wire maxCombo and missionComplete stats to SkinManager"
```

---

### Task 4: Add 6 new procedural renderers in fruits.js

**Files:**
- Modify: `js/fruits.js:105-173` (drawFruit else block)

**Step 1: Add `neon` renderer**

After the `emoji` branch and before the `recolor` branch, add:
```js
} else if (skinType === 'neon' && skinData) {
  // Neon: black circle + colored glow border
  const glowColor = skinData.glow || baseColor;
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0A0A0A';
  ctx.fill();
  // Multi-layer glow
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(0, 0, fruit.radius - 2, 0, Math.PI * 2);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = i * 3;
    ctx.globalAlpha = 0.15 + (0.15 * (4 - i));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
```

**Step 2: Add `pastel` renderer**

```js
} else if (skinType === 'pastel' && skinData) {
  // Pastel: soft gradient, white-ish highlight
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  const pGrad = ctx.createRadialGradient(
    -fruit.radius * 0.2, -fruit.radius * 0.2, fruit.radius * 0.05,
    0, 0, fruit.radius
  );
  pGrad.addColorStop(0, '#FFFFFF');
  pGrad.addColorStop(0.4, baseColor);
  pGrad.addColorStop(1, darkenColor(baseColor, 15));
  ctx.fillStyle = pGrad;
  ctx.fill();
```

**Step 3: Add `mono` renderer**

```js
} else if (skinType === 'mono') {
  // Monochrome: sepia-tone gradient
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  const mGrad = ctx.createRadialGradient(
    -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
    0, 0, fruit.radius
  );
  mGrad.addColorStop(0, lightenColor(baseColor, 30));
  mGrad.addColorStop(0.6, baseColor);
  mGrad.addColorStop(1, darkenColor(baseColor, 40));
  ctx.fillStyle = mGrad;
  ctx.fill();
  // Subtle film grain overlay
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 119, 101, 0.1)';
  ctx.fill();
```

**Step 4: Add `galaxy` renderer**

```js
} else if (skinType === 'galaxy' && skinData) {
  // Galaxy: dark circle + star dots + nebula highlight
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  const gGrad = ctx.createRadialGradient(
    fruit.radius * 0.2, fruit.radius * 0.2, fruit.radius * 0.1,
    0, 0, fruit.radius
  );
  gGrad.addColorStop(0, skinData.highlight || '#FFFFFF');
  gGrad.addColorStop(0.3, baseColor);
  gGrad.addColorStop(1, '#000000');
  ctx.fillStyle = gGrad;
  ctx.fill();
  // Stars (deterministic based on level to avoid flicker)
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 6 + level * 2; i++) {
    const seed = level * 100 + i * 17;
    const sx = (Math.sin(seed) * 0.7) * fruit.radius;
    const sy = (Math.cos(seed * 1.3) * 0.7) * fruit.radius;
    const sr = 0.5 + (seed % 3) * 0.4;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
```

**Step 5: Add `pixel` renderer**

```js
} else if (skinType === 'pixel' && skinData) {
  // Pixel: blocky square shape with grid pattern
  const dark = skinData.dark || darkenColor(baseColor, 40);
  const blockSize = fruit.radius * 2;
  const gridSize = Math.max(4, Math.floor(fruit.radius / 5));
  // Main body (rounded rect)
  const r = fruit.radius * 0.85;
  ctx.beginPath();
  ctx.moveTo(-r, -r + gridSize);
  ctx.lineTo(-r, r - gridSize);
  ctx.lineTo(-r + gridSize, r);
  ctx.lineTo(r - gridSize, r);
  ctx.lineTo(r, r - gridSize);
  ctx.lineTo(r, -r + gridSize);
  ctx.lineTo(r - gridSize, -r);
  ctx.lineTo(-r + gridSize, -r);
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.fill();
  // Grid lines
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.5;
  for (let gx = -r; gx <= r; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, -r); ctx.lineTo(gx, r); ctx.stroke();
  }
  for (let gy = -r; gy <= r; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(-r, gy); ctx.lineTo(r, gy); ctx.stroke();
  }
  // Highlight block
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-r, -r, gridSize * 2, gridSize * 2);
```

**Step 6: Add `candy` renderer**

```js
} else if (skinType === 'candy' && skinData) {
  // Candy: circle with spiral stripe pattern
  const stripeColor = skinData.stripe || '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  // Spiral stripes
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineWidth = fruit.radius * 0.2;
  ctx.strokeStyle = stripeColor;
  ctx.globalAlpha = 0.5;
  for (let a = 0; a < Math.PI * 4; a += 0.1) {
    const sr = a * fruit.radius / (Math.PI * 4);
    const sx = Math.cos(a) * sr;
    const sy = Math.sin(a) * sr;
    if (a === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  // Gloss highlight
  ctx.beginPath();
  ctx.arc(-fruit.radius * 0.25, -fruit.radius * 0.25, fruit.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
```

**Step 7: Add `placeholder` renderer (for premium skins before assets)**

```js
} else if (skinType === 'placeholder' && skinData && skinData.emoji) {
  // Placeholder: emoji-based (same as emoji renderer)
  ctx.beginPath();
  ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  const phGrad = ctx.createRadialGradient(
    -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
    0, 0, fruit.radius
  );
  phGrad.addColorStop(0, lightenColor(baseColor, 40));
  phGrad.addColorStop(0.7, baseColor);
  phGrad.addColorStop(1, darkenColor(baseColor, 30));
  ctx.fillStyle = phGrad;
  ctx.fill();
  ctx.font = `${fruit.radius * 1.1}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(skinData.emoji, 0, fruit.radius * 0.08);
```

**Step 8: Commit**

```bash
git add js/fruits.js
git commit -m "feat: add 7 new procedural renderers (neon/pastel/mono/galaxy/pixel/candy/placeholder)"
```

---

### Task 5: Test all skins via Playwright

**Files:**
- Create: `tests/skin-render-test.cjs`

**Step 1: Write test that loads each skin and captures screenshot**

```js
const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.addInitScript(() => {
    localStorage.setItem('durianMergeTutorialDone', 'true');
    localStorage.setItem('durianMergeDailyReward', JSON.stringify({
      lastClaim: new Date().toISOString().slice(0,10), day: 1, claimed: true
    }));
  });

  const skins = ['tropical','jewels','emoji','neon','pastel','mono','galaxy','pixel','candy',
                  'desserts','sea','space','halloween','christmas'];

  for (const skinId of skins) {
    await page.addInitScript(id => {
      localStorage.setItem('durianMergeSkin', id);
      localStorage.setItem('durianMergeSkinUnlocks', JSON.stringify([
        'tropical','jewels','emoji','neon','pastel','mono','galaxy','pixel','candy',
        'desserts','sea','space','halloween','christmas'
      ]));
    }, skinId);

    await page.goto('http://localhost:3456');
    await page.waitForTimeout(1500);

    // Verify skin is active
    const currentSkin = await page.evaluate(() => SkinManager.getCurrentSkinId());
    assert.strictEqual(currentSkin, skinId, `Expected skin ${skinId} but got ${currentSkin}`);

    // Verify menu fruits render without error
    const hasCanvas = await page.evaluate(() => {
      return document.querySelectorAll('#menuFruits canvas').length === 3;
    });
    assert(hasCanvas, `${skinId}: menu should have 3 fruit canvases`);

    await page.screenshot({ path: `screenshots/skin-test-${skinId}.png` });
    console.log(`✓ ${skinId}`);
  }

  await browser.close();
  console.log('All skins passed!');
})();
```

**Step 2: Run `npx serve . -p 3456` and execute test**

```bash
npx serve . -p 3456 &
sleep 2
node tests/skin-render-test.cjs
kill %1
```

**Step 3: Commit test**

```bash
git add tests/skin-render-test.cjs
git commit -m "test: add skin render verification for all 14 skins"
```

---

### Task 6: Deploy and capture device screenshots

**Step 1: Run deploy + capture**

```bash
npm run deploy:capture
```

**Step 2: Show screenshots to user for approval**

Read `screenshots/device_01-menu.png` and `screenshots/device_02-skins.png`.

**Step 3: Final commit if approved**

```bash
git add -A
git commit -m "feat: skin system expansion — 14 skins with procedural renderers"
```
