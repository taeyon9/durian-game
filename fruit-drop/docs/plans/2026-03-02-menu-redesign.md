# Menu Screen Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the bland, static menu screen into a vibrant, splash-matching experience with proper button hierarchy.

**Architecture:** CSS-only visual upgrade on the menu screen overlay. Menu gets its own emerald gradient background, gold sparkle/bokeh decorations via CSS, enhanced title styling, larger animated fruit heroes, and reorganized button layout. Global CSS variables stay unchanged to avoid breaking other screens.

**Tech Stack:** CSS3 animations, CSS gradients, HTML restructure, JS canvas rendering update

---

### Task 1: Menu Background — Emerald Gradient + Radial Glow

**Files:**
- Modify: `css/style.css:208-218` (MENU SCREEN section)

**Step 1: Add emerald gradient background to menu screen**

Replace the `.overlay` background on menu with a dedicated gradient. Add this to the `/* ===== MENU SCREEN ===== */` section in `css/style.css`:

```css
#menuScreen {
  background:
    radial-gradient(ellipse 80% 50% at 50% 45%, rgba(10,123,97,0.4) 0%, transparent 70%),
    linear-gradient(180deg, #064A3E 0%, #0A7B61 40%, #0A7B61 60%, #053D33 100%);
}
```

This overrides the `.overlay` `background: var(--bg-dark)` for the menu only. The radial gradient adds a subtle glow behind the hero/title area.

**Step 2: Verify visually**

Run: `cd /Users/walter/projects/game/fruit-drop && npx serve . -l 8080`
Open browser, check menu screen shows emerald gradient instead of flat dark green. Other screens (gameover, leaderboard) should be unchanged.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: menu emerald gradient background matching splash"
```

---

### Task 2: Gold Sparkles & Bokeh

**Files:**
- Modify: `index.html:50-57` (menu-content area)
- Modify: `css/style.css` (add after MENU SCREEN section ~line 241)

**Step 1: Add sparkle and bokeh HTML elements inside menuScreen**

In `index.html`, add decoration elements right after the `<div id="menuScreen" ...>` opening tag, before the settings button:

```html
<div id="menuScreen" class="screen overlay">
    <!-- Decorations -->
    <div class="menu-sparkles">
      <span class="sparkle" style="top:8%;left:12%;--delay:0s;--size:10px;"></span>
      <span class="sparkle" style="top:5%;left:65%;--delay:0.8s;--size:14px;"></span>
      <span class="sparkle" style="top:12%;right:18%;--delay:1.6s;--size:8px;"></span>
      <span class="sparkle" style="bottom:18%;left:20%;--delay:0.4s;--size:12px;"></span>
      <span class="sparkle" style="bottom:12%;right:15%;--delay:1.2s;--size:10px;"></span>
      <span class="sparkle" style="top:30%;left:8%;--delay:2.0s;--size:6px;"></span>
      <span class="sparkle" style="bottom:25%;right:10%;--delay:0.6s;--size:8px;"></span>
    </div>
    <div class="menu-bokeh">
      <span class="bokeh" style="top:15%;left:-10%;--delay:0s;"></span>
      <span class="bokeh" style="bottom:20%;right:-15%;--delay:5s;"></span>
      <span class="bokeh" style="top:50%;right:5%;--delay:10s;"></span>
    </div>
    <button class="icon-btn menu-settings" id="menuSettingsBtn">⚙️</button>
    <!-- ... rest stays the same -->
```

**Step 2: Add sparkle CSS**

Add to `css/style.css` in the MENU SCREEN section:

```css
/* Sparkles */
.menu-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.sparkle {
  position: absolute;
  width: var(--size, 10px);
  height: var(--size, 10px);
  color: var(--gold);
  animation: sparkle-twinkle 2.5s ease-in-out var(--delay, 0s) infinite;
}
.sparkle::before {
  content: '✦';
  font-size: var(--size, 10px);
  display: block;
}
@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50%      { opacity: 0.8;  transform: scale(1.1); }
}

/* Bokeh */
.menu-bokeh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.bokeh {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,215,0,0.08);
  filter: blur(30px);
  animation: bokeh-float 12s ease-in-out var(--delay, 0s) infinite;
}
@keyframes bokeh-float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.08; }
  50%      { transform: translateY(-20px) scale(1.15); opacity: 0.14; }
}
```

**Step 3: Ensure menu-content and menu-actions sit above decorations**

Add `position: relative; z-index: 1;` to `.menu-content`, `.menu-player`, and `.menu-actions`:

```css
.menu-content {
  /* existing styles ... */
  position: relative;
  z-index: 1;
}
.menu-player {
  /* existing styles ... */
  position: relative;
  z-index: 1;
}
.menu-actions {
  /* existing styles ... */
  position: relative;
  z-index: 1;
}
```

**Step 4: Verify visually**

Refresh browser. Should see:
- Gold sparkles twinkling at various positions (concentrated top + bottom)
- Soft gold bokeh blobs floating gently
- All interactive elements (buttons, settings) remain clickable above decorations

**Step 5: Commit**

```bash
git add index.html css/style.css
git commit -m "style: add gold sparkles and bokeh to menu"
```

---

### Task 3: Title Gold Gradient + Subtitle Enhancement

**Files:**
- Modify: `css/style.css:229-241` (menu-title and menu-subtitle)

**Step 1: Update title to gold gradient text**

Replace `.menu-title` styles:

```css
.menu-title {
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(180deg, #FFE066 0%, #FFD700 40%, #FFA500 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 2px 20px rgba(255,215,0,0.3));
  letter-spacing: -1px;
}
```

Note: `text-shadow` doesn't work with `background-clip: text`, so we use `filter: drop-shadow()` instead for the glow.

**Step 2: Brighten subtitle**

Replace `.menu-subtitle` styles:

```css
.menu-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #DAA520;
  letter-spacing: 4px;
}
```

**Step 3: Verify visually**

Refresh browser. Title should have a rich gold gradient from light yellow to orange. Subtitle should be a warmer, brighter gold.

**Step 4: Commit**

```bash
git add css/style.css
git commit -m "style: gold gradient title and brighter subtitle"
```

---

### Task 4: Larger Fruit Heroes with Float Animation

**Files:**
- Modify: `js/ui.js:228-245` (renderMenuFruits function)
- Modify: `css/style.css:219-228` (menu-fruits styles)

**Step 1: Update renderMenuFruits() for 3 larger fruits**

Replace the `renderMenuFruits` function in `js/ui.js`:

```javascript
function renderMenuFruits() {
  // Show 3 hero fruits: Mango (4), Pineapple (8), Dragon Fruit (5)
  const levels = [4, 8, 5];
  const sizes = [70, 100, 70]; // center biggest
  els.menuFruits.innerHTML = '';
  levels.forEach((level, i) => {
    const size = sizes[i];
    const c = document.createElement('canvas');
    c.width = size * 2; c.height = size * 2;
    c.className = 'menu-hero-fruit';
    c.style.animationDelay = (i * 0.4) + 's';
    const fctx = c.getContext('2d');
    const fruit = FRUITS[level];
    const s = (size * 0.85) / fruit.radius;
    fctx.save();
    fctx.translate(size, size);
    fctx.scale(s, s);
    drawFruit(fctx, 0, 0, level, 0);
    fctx.restore();
    els.menuFruits.appendChild(c);
  });
}
```

**Step 2: Update menu-fruits CSS for new layout**

Replace `.menu-fruits` and `.menu-fruits canvas` in `css/style.css`:

```css
.menu-fruits {
  display: flex;
  gap: 0;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.menu-hero-fruit {
  border-radius: 50%;
  animation: fruit-float 3s ease-in-out infinite;
}
.menu-hero-fruit:nth-child(1) { width: 70px; height: 70px; transform: rotate(-8deg); }
.menu-hero-fruit:nth-child(2) { width: 100px; height: 100px; margin: 0 -8px; z-index: 1; }
.menu-hero-fruit:nth-child(3) { width: 70px; height: 70px; transform: rotate(8deg); }

@keyframes fruit-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
/* Preserve rotation on side fruits while floating */
.menu-hero-fruit:nth-child(1) {
  animation-name: fruit-float-left;
}
.menu-hero-fruit:nth-child(3) {
  animation-name: fruit-float-right;
}
@keyframes fruit-float-left {
  0%, 100% { transform: translateY(0) rotate(-8deg); }
  50%      { transform: translateY(-8px) rotate(-8deg); }
}
@keyframes fruit-float-right {
  0%, 100% { transform: translateY(0) rotate(8deg); }
  50%      { transform: translateY(-8px) rotate(8deg); }
}
```

**Step 3: Verify visually**

Refresh browser. Should see 3 fruits:
- Mango (left, 70px, slight tilt)
- Pineapple (center, 100px, largest)
- Dragon Fruit (right, 70px, slight tilt)
- All floating with staggered timing

**Step 4: Commit**

```bash
git add js/ui.js css/style.css
git commit -m "style: larger hero fruits with float animation"
```

---

### Task 5: Button Hierarchy — Gold PLAY + Ranking Text Link

**Files:**
- Modify: `index.html:64-74` (menu-actions section)
- Modify: `css/style.css:82-103` (btn-play, btn-outline styles)

**Step 1: Restructure menu-actions HTML**

Replace the menu-actions section in `index.html`:

```html
    <div class="menu-actions">
      <button class="btn btn-play" id="menuPlayBtn">
        <span class="btn-icon">▶</span> PLAY
      </button>
      <div class="menu-tickets">
        🎟️ <span id="menuTickets">5</span> plays left today
      </div>
      <div class="menu-ranking-link" id="menuRankingBtn">🏆 Ranking →</div>
    </div>
```

Key changes:
- Removed `.menu-row` wrapper and `.btn-outline` button for Ranking
- Ranking is now a simple `div` with text link styling

**Step 2: Update PLAY button to gold gradient**

Replace `.btn-play` in `css/style.css`:

```css
.btn-play {
  background: linear-gradient(180deg, #FFE066, #FFD700 40%, #E5A800);
  color: #2D1B0E;
  font-size: 20px;
  padding: 16px 48px;
  box-shadow: 0 4px 20px rgba(255,215,0,0.35);
  flex: none;
  width: 100%;
}
```

Note: `flex: none` replaces `flex: 1` since it's no longer in a row layout. `width: 100%` makes it span full width of `.menu-actions` (max-width 320px).

**Step 3: Add ranking link style**

Add after `.menu-tickets` in `css/style.css`:

```css
.menu-ranking-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--gold);
  cursor: pointer;
  padding: 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.menu-ranking-link:active { opacity: 1; }
```

**Step 4: Remove unused `.btn-outline` and `.menu-row` if unused elsewhere**

Check: `.btn-outline` may be used elsewhere. Search the codebase. If only used in menu Ranking button, remove it. If used elsewhere, leave it.

`.menu-row` — search usage. Remove if only used for Ranking wrapper.

**Step 5: Verify visually**

Refresh browser. Menu should show:
1. Gold PLAY button (full width, prominent)
2. Ticket info below (small, dim)
3. "🏆 Ranking →" text link (subtle, below tickets)

Confirm clicking Ranking link still navigates to leaderboard.

**Step 6: Update ui.js PLAY button text for zero tickets**

Check `js/ui.js:221-225` — the `updateMenu()` function changes PLAY button innerHTML when tickets are 0. Ensure the gold styling works for both states. The text change (`📺 WATCH AD TO PLAY`) should still be fine since we're only changing background color.

**Step 7: Commit**

```bash
git add index.html css/style.css
git commit -m "style: gold PLAY button, ranking as text link"
```

---

### Task 6: Visual Polish & Cross-Screen Verification

**Files:**
- Modify: `css/style.css` (minor adjustments as needed)

**Step 1: Check game over screen PLAY AGAIN button**

The `.btn-play` class is also used on `#goPlayAgain` in the game over screen (line 120 in index.html). Verify the gold color works there too. The game over screen has a dark overlay background (`rgba(4,30,26,0.95)`) — gold should look fine against that.

**Step 2: Check menu-settings button z-index**

The settings `⚙️` button (`icon-btn menu-settings`) needs to be above sparkles. Verify it has proper z-index or add:

```css
.menu-settings {
  position: absolute;
  top: calc(var(--safe-top) + 4px);
  right: 12px;
  z-index: 2;
}
```

**Step 3: Check overflow on small screens**

The new 100px center fruit + sparkles need to fit on smaller screens (320px width). Check that nothing overflows or breaks the scroll.

**Step 4: Commit any polish fixes**

```bash
git add css/style.css
git commit -m "style: menu redesign polish and cross-screen verification"
```
