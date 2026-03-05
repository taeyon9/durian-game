# UI Button Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Game Over 버튼 중복 제거(5→3), 전체 버튼에 게임스러운 3D 입체감/애니메이션 적용, 메뉴 서브링크 카드화

**Architecture:** CSS 버튼 시스템을 먼저 업그레이드(3D shadow, press state, spring), 그 후 Game Over HTML 구조 변경으로 버튼 통합, 마지막으로 메뉴/퍼즈 화면 개선. 각 단계마다 E2E 테스트 실행.

**Tech Stack:** Vanilla CSS (animations), Vanilla JS (UI state logic), Playwright (E2E tests)

---

### Task 1: CSS Button System — 3D 입체감 + Press State

**Files:**
- Modify: `css/style.css:63-131` (버튼 공통 + 타입별 스타일)

**Step 1: 공통 .btn 스타일 업그레이드**

`css/style.css`의 `.btn` 블록(L64-78)과 `.btn:active`(L79)를 아래로 교체:

```css
.btn {
  font-family: var(--font);
  font-weight: 700;
  font-size: 16px;
  border: none;
  border-radius: 50px;
  padding: 14px 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
              filter 0.12s ease,
              box-shadow 0.08s ease-out;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
}
.btn:active {
  transform: scale(0.95) translateY(2px);
  filter: brightness(0.88);
}
```

**Step 2: .btn-play에 3D shadow 추가**

`css/style.css`의 `.btn-play`(L82-90)를 교체:

```css
.btn-play {
  background: linear-gradient(180deg, #FFF0A0 0%, #FFD700 35%, #E8A000 100%);
  color: #2D1800;
  font-size: 20px;
  padding: 17px 48px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.4) inset,
    0 -2px 0 rgba(0,0,0,0.2) inset,
    0 6px 0 #996600,
    0 8px 20px rgba(255,180,0,0.35);
  flex: none;
  width: 100%;
  letter-spacing: 1px;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
}
.btn-play:active {
  transform: scale(0.97) translateY(4px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.4) inset,
    0 -2px 0 rgba(0,0,0,0.2) inset,
    0 2px 0 #996600,
    0 4px 10px rgba(255,180,0,0.2);
}
```

**Step 3: .btn-outline에 3D shadow 추가**

`css/style.css`의 `.btn-outline`(L98-104)를 교체:

```css
.btn-outline {
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,215,0,0.3);
  color: var(--gold);
  padding: 14px 20px;
  flex: 1;
  font-weight: 700;
  box-shadow: 0 3px 0 rgba(0,0,0,0.4);
}
.btn-outline:active {
  transform: scale(0.97) translateY(3px);
  box-shadow: 0 0 0 rgba(0,0,0,0.4);
  background: rgba(255,215,0,0.08);
}
```

**Step 4: .btn-share 3D 업그레이드**

`css/style.css`의 `.btn-share`(L105-111)를 교체:

```css
.btn-share {
  background: var(--bg-card);
  border: 1.5px solid rgba(255,215,0,0.25);
  color: var(--gold);
  padding: 16px 20px;
  font-size: 18px;
  box-shadow: 0 3px 0 rgba(0,0,0,0.4);
}
.btn-share:active {
  transform: scale(0.97) translateY(3px);
  box-shadow: 0 0 0 rgba(0,0,0,0.4);
  background: rgba(255,215,0,0.08);
}
```

**Step 5: .btn-continue 3D + glow ::after로 교체**

`css/style.css`의 `.btn-continue`(L621-633)를 교체:

```css
.btn-continue {
  background: linear-gradient(180deg, #FFF0A0 0%, #FFD700 35%, #E8A000 100%);
  color: #2D1B0E;
  font-size: 18px;
  padding: 16px 28px;
  width: 100%;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.4) inset,
    0 -2px 0 rgba(0,0,0,0.2) inset,
    0 6px 0 #996600,
    0 8px 20px rgba(255,180,0,0.35);
  letter-spacing: 1px;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
  position: relative;
  isolation: isolate;
}
.btn-continue:active {
  transform: scale(0.97) translateY(4px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.4) inset,
    0 -2px 0 rgba(0,0,0,0.2) inset,
    0 2px 0 #996600,
    0 4px 10px rgba(255,180,0,0.2);
}
.btn-continue::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50px;
  box-shadow: 0 0 24px 4px rgba(255,215,0,0.5);
  animation: glowPulse 1.8s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}
```

Remove old `@keyframes continuePulse` (L630-633).

**Step 6: .icon-btn 배경 원형 업그레이드**

`css/style.css`의 `.icon-btn`(L120-131)을 교체:

```css
.icon-btn {
  background: rgba(4,30,26,0.6);
  border: 1.5px solid rgba(255,215,0,0.25);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
              background 0.15s, border-color 0.15s;
  box-shadow: 0 2px 0 rgba(0,0,0,0.4);
  -webkit-tap-highlight-color: transparent;
}
.icon-btn:active {
  transform: scale(0.88) translateY(1px);
  box-shadow: 0 0 0 rgba(0,0,0,0.4);
  background: rgba(255,215,0,0.12);
  border-color: rgba(255,215,0,0.5);
}
```

**Step 7: 테스트**

Run: `npm run test:e2e`
Expected: 기존 E2E 테스트 통과 (CSS만 변경, HTML/JS 구조 미변경)

**Step 8: Commit**

```bash
git add css/style.css
git commit -m "style: add 3D depth and spring animations to button system"
```

---

### Task 2: Game Over — 버튼 통합 (5→3) HTML + JS

**Files:**
- Modify: `index.html:165-173` (game over buttons)
- Modify: `js/ui.js:70-74` (element cache), `js/ui.js:142-146` (event bindings), `js/ui.js:520-538` (showGameOver button logic)

**Step 1: index.html Game Over 버튼 구조 변경**

`index.html` L165-173을 교체:

```html
    <!-- Buttons -->
    <div class="go-buttons">
      <button class="btn btn-continue" id="goContinue" style="display:none;">
        <span class="btn-continue-icon">🎬</span>
        <span class="btn-continue-label">
          <span class="btn-main-text">CONTINUE</span>
          <span class="btn-sub-text">Watch Ad to keep playing</span>
        </span>
      </button>
      <button class="btn btn-play" id="goPlayAgain">
        <span class="btn-main-text">▶ PLAY AGAIN</span>
        <span class="btn-sub-text" id="goPlayTicket">🎟 5 left</span>
      </button>
      <div class="go-secondary-row">
        <button class="btn btn-secondary-pill" id="goShareBtn" aria-label="Share score">📤 Share</button>
        <button class="btn btn-secondary-pill" id="goBackMenu">🏠 Menu</button>
      </div>
    </div>
```

**Step 2: CSS — 새로운 클래스 추가**

`css/style.css`에 `.go-buttons` 섹션(L636 부근) 뒤에 추가:

```css
/* Continue inner layout */
.btn-continue {
  flex-direction: row;
  justify-content: center;
  gap: 10px;
}
.btn-continue-icon { font-size: 22px; flex-shrink: 0; }
.btn-continue-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

/* Smart Play Again — with subtitle */
.go-buttons .btn-play {
  flex-direction: column;
  gap: 2px;
  padding: 14px 48px;
}

/* Sub-text (ticket count, ad info) */
.btn-main-text {
  font-size: inherit;
  font-weight: inherit;
}
.btn-sub-text {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.65;
  letter-spacing: 0;
}

/* No-tickets state: purple gradient */
.btn-play.no-tickets {
  background: linear-gradient(180deg, #8A6FE8 0%, #6C4DC4 35%, #4A2D9C 100%);
  color: #fff;
  text-shadow: none;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.15) inset,
    0 -2px 0 rgba(0,0,0,0.3) inset,
    0 6px 0 #2D1060,
    0 8px 20px rgba(100,60,200,0.4);
  position: relative;
  overflow: hidden;
}
.btn-play.no-tickets:active {
  box-shadow:
    0 1px 0 rgba(255,255,255,0.15) inset,
    0 -2px 0 rgba(0,0,0,0.3) inset,
    0 2px 0 #2D1060,
    0 4px 10px rgba(100,60,200,0.2);
}
/* Shine sweep on purple button */
.btn-play.no-tickets::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  animation: shineSweep 3s ease-in-out 1s infinite;
  pointer-events: none;
}
@keyframes shineSweep {
  0%        { transform: translateX(0); }
  30%, 100% { transform: translateX(350%); }
}

/* Secondary pill row */
.go-secondary-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.btn-secondary-pill {
  flex: 1;
  background: var(--bg-card);
  border: 1.5px solid rgba(255,215,0,0.25);
  color: var(--gold);
  font-size: 14px;
  font-weight: 600;
  border-radius: 50px;
  padding: 13px 16px;
  box-shadow: 0 3px 0 rgba(0,0,0,0.4);
}
.btn-secondary-pill:active {
  transform: scale(0.97) translateY(3px);
  box-shadow: 0 0 0 rgba(0,0,0,0.4);
  background: rgba(255,215,0,0.08);
  border-color: rgba(255,215,0,0.5);
}
```

Remove old `.go-btn-row`, `.go-back`, `.btn-ad` CSS rules.

**Step 3: JS — Element cache 및 이벤트 바인딩 변경**

`js/ui.js` L73: `goWatchAd` 라인 제거.

`js/ui.js` L145: `els.goWatchAd.addEventListener(...)` 라인 제거.

**Step 4: JS — showGameOver 버튼 로직 변경**

`js/ui.js` L521-538의 티켓/버튼 로직을 교체:

```javascript
    // Continue button (rewarded ad to resume game)
    els.goContinue.style.display = canContinue ? '' : 'none';

    // Smart Play Again button
    const tickets = TicketManager.getTickets();
    const mainText = els.goPlayAgain.querySelector('.btn-main-text');
    const subText = els.goPlayAgain.querySelector('.btn-sub-text');
    if (tickets > 0) {
      els.goPlayAgain.classList.remove('no-tickets');
      mainText.textContent = '▶ PLAY AGAIN';
      subText.textContent = '🎟 ' + tickets + ' left';
    } else {
      els.goPlayAgain.classList.add('no-tickets');
      mainText.textContent = '▶ WATCH AD TO PLAY';
      subText.textContent = '📺 Free play';
    }

    // Pulse share button on new best
    if (isNewBest) {
      els.goShareBtn.classList.add('new-best');
    } else {
      els.goShareBtn.classList.remove('new-best');
    }
```

**Step 5: JS — handlePlay가 goWatchAd 없이 작동하도록 확인**

기존 `handlePlay`(L946-954)는 이미 티켓 0이면 `handleWatchAd`를 호출하므로 변경 불필요. `goPlayAgain` 클릭 → `handlePlay` → 티켓 체크 → 광고 or 시작.

**Step 6: CSS — Share new-best 애니메이션 성능 최적화**

`css/style.css`의 `.btn-share.new-best`(L1403-1411)를 교체:

```css
.btn-secondary-pill.new-best {
  border-color: var(--gold);
  background: rgba(255,215,0,0.15);
  position: relative;
}
.btn-secondary-pill.new-best::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50px;
  border: 2px solid var(--gold);
  animation: sharePulseRing 1.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes sharePulseRing {
  0%, 100% { opacity: 0; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.06); }
}
```

**Step 7: 테스트**

Run: `npm run test:all`
Expected: 유닛 + E2E 통과. goWatchAd 참조 제거 확인.

**Step 8: Commit**

```bash
git add index.html css/style.css js/ui.js
git commit -m "feat: consolidate game over buttons (5→3), add smart Play Again"
```

---

### Task 3: Micro-Animations — Stagger 진입 + Section Pop-In

**Files:**
- Modify: `css/style.css` (game over entrance, button stagger, new-best)

**Step 1: Game Over 화면 섹션별 stagger 진입**

`css/style.css`의 `@keyframes goSlideIn`(L1663-1666)을 교체:

```css
@keyframes goSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  60%  { opacity: 1; transform: translateY(-3px) scale(1.01); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

Add stagger for child sections:

```css
#gameoverScreen .go-score-section {
  animation: goSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
}
#gameoverScreen .go-board-wrap,
#gameoverScreen .go-neighbors {
  animation: goSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}
#gameoverScreen .go-buttons {
  animation: goSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}
```

Remove the animation from `#gameoverScreen` itself (L438), keep only children.

**Step 2: NEW BEST 애니메이션 개선**

`css/style.css`의 `.go-newbest`(L447-453)과 `@keyframes pulse`(L454) 교체:

```css
.go-newbest {
  font-size: 18px;
  font-weight: 700;
  color: var(--gold);
  margin-top: 4px;
  animation: newBestPop 0.5s cubic-bezier(0.22, 1, 0.36, 1),
             newBestGlow 1.0s ease-in-out 0.5s 3;
}
@keyframes newBestPop {
  from { opacity: 0; transform: scale(0.5) rotate(-5deg); }
  to   { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes newBestGlow {
  0%, 100% { text-shadow: 0 0 0 rgba(255,215,0,0); }
  50%      { text-shadow: 0 0 16px rgba(255,215,0,0.8); }
}
```

**Step 3: reduced-motion 블록 업데이트**

`css/style.css`의 `@media (prefers-reduced-motion: reduce)` 블록(L1713-1722)에 추가:

```css
  #gameoverScreen .go-score-section,
  #gameoverScreen .go-board-wrap,
  #gameoverScreen .go-neighbors,
  #gameoverScreen .go-buttons,
  .btn-continue::after,
  .btn-play.no-tickets::before,
  .btn-secondary-pill.new-best::after {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
```

**Step 4: 테스트**

Run: `npm run test:e2e`
Expected: E2E 통과

**Step 5: Commit**

```bash
git add css/style.css
git commit -m "style: add stagger entrance and improved micro-animations"
```

---

### Task 4: Menu — Sub-links 카드 업그레이드

**Files:**
- Modify: `index.html:111-114` (menu sub-links)
- Modify: `css/style.css:416-425` (menu-ranking-link), `css/style.css:1430-1435` (menu-sub-links)
- Modify: `js/ui.js:134` (menuRankingBtn event)

**Step 1: HTML 변경**

`index.html` L111-114 교체:

```html
      <div class="menu-sub-links">
        <button class="menu-sub-btn" id="menuRankingBtn">
          <span class="menu-sub-btn-icon">🏆</span>
          <span class="menu-sub-btn-label">Ranking</span>
        </button>
        <button class="menu-sub-btn" id="missionBtn">
          <span class="menu-sub-btn-icon">📋</span>
          <span class="menu-sub-btn-label">Missions</span>
          <span class="mission-badge" id="missionBadge" style="display:none;">0</span>
        </button>
      </div>
```

**Step 2: CSS 변경**

`.menu-ranking-link` 블록(L416-425) 삭제하고 교체:

```css
.menu-sub-btn {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,215,0,0.2);
  border-radius: var(--radius);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-family: var(--font);
  box-shadow: 0 3px 0 rgba(0,0,0,0.35);
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
              background 0.15s, border-color 0.15s, box-shadow 0.08s;
  position: relative;
}
.menu-sub-btn:active {
  transform: translateY(3px);
  box-shadow: 0 0 0 rgba(0,0,0,0.35);
  background: rgba(255,215,0,0.1);
  border-color: rgba(255,215,0,0.45);
}
.menu-sub-btn-icon { font-size: 22px; line-height: 1; }
.menu-sub-btn-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.menu-sub-btn .mission-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}
```

`.menu-sub-links`(L1430-1435) 교체:

```css
.menu-sub-links {
  display: flex;
  gap: 10px;
  width: 100%;
}
```

**Step 3: 테스트**

Run: `npm run test:e2e`
Expected: E2E 통과 (menuRankingBtn ID는 유지됨)

**Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "style: upgrade menu sub-links to card buttons"
```

---

### Task 5: Pause Panel — 스프링 애니메이션 + 버튼 정리

**Files:**
- Modify: `css/style.css:1619-1650` (pause panel styles)

**Step 1: Pause panel 등장 애니메이션**

`.pause-panel`(L1619) 블록에 animation 추가:

```css
.pause-panel {
  width: 90%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  animation: pausePanelIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pausePanelIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
```

**Step 2: HUD pause 버튼 3D 업그레이드**

`.hud-pause-btn`(L1582) 교체:

```css
.hud-pause-btn {
  position: absolute;
  top: calc(var(--safe-top) + 60px);
  right: 8px;
  width: 44px;
  height: 44px;
  background: rgba(4,30,26,0.65);
  border: 1.5px solid rgba(255,215,0,0.3);
  border-radius: 50%;
  color: var(--gold);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  z-index: 16;
  box-shadow: 0 2px 0 rgba(0,0,0,0.5);
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1),
              background 0.1s, box-shadow 0.08s;
  -webkit-tap-highlight-color: transparent;
}
.hud-pause-btn:active {
  transform: scale(0.9) translateY(1px);
  box-shadow: 0 0 0 rgba(0,0,0,0.5);
  background: rgba(0,0,0,0.5);
}
```

**Step 3: reduced-motion에 pause 애니메이션 추가**

```css
  .pause-panel {
    animation: none !important;
  }
```

**Step 4: 테스트**

Run: `npm run test:e2e`
Expected: E2E 통과

**Step 5: Commit**

```bash
git add css/style.css
git commit -m "style: add spring animation to pause panel, upgrade pause button"
```

---

### Task 6: Menu Help 버튼 + continuePulse 참조 정리

**Files:**
- Modify: `css/style.css` (menu-help 업그레이드, continuePulse 참조 정리)

**Step 1: .menu-help 업그레이드**

`.menu-help`(L1214-1229) 교체:

```css
.menu-help {
  position: absolute;
  top: calc(var(--safe-top) + 4px);
  right: 52px;
  z-index: 2;
  font-size: 18px;
  font-weight: 700;
  color: var(--gold-dim);
  background: rgba(4,30,26,0.6);
}
```

(icon-btn 공통 스타일이 이제 border, size, shadow를 담당)

**Step 2: 미션 claim 버튼의 old continuePulse 참조 제거**

`.mission-claim-btn`(L1556-1567)에서 `animation: continuePulse 2s ease-in-out infinite;`를 제거:

```css
.mission-claim-btn {
  font-family: var(--font);
  font-weight: 700;
  font-size: 12px;
  background: linear-gradient(180deg, #FFE066, #FFD700 40%, #E5A800);
  color: #2D1B0E;
  border: none;
  border-radius: 20px;
  padding: 6px 12px;
  cursor: pointer;
  box-shadow: 0 2px 0 #996600;
}
.mission-claim-btn:active {
  transform: scale(0.95) translateY(2px);
  box-shadow: 0 0 0 #996600;
  filter: brightness(0.9);
}
```

**Step 3: old keyframes/CSS rules 정리**

삭제할 CSS 규칙들:
- `@keyframes continuePulse` (L630-633) — `glowPulse`로 대체됨
- `@keyframes sharePulse` (L1408-1411) — `sharePulseRing`으로 대체됨
- `@keyframes pulse` (L454) — `newBestPop`/`newBestGlow`로 대체됨
- `.btn-ad` (L112-119) — goWatchAd 제거됨
- `.go-btn-row` (L644-651) — `go-secondary-row`로 대체됨
- `.go-back` (L652-659) — secondary pill로 대체됨
- `.menu-ranking-link` (L416-425) — `menu-sub-btn`으로 대체됨
- `.btn-share.new-best` + `@keyframes sharePulse` (L1403-1411) — new-best는 이제 `.btn-secondary-pill.new-best`

**Step 4: reduced-motion 전체 확인**

기존 `@media (prefers-reduced-motion: reduce)` 블록 리뷰. 삭제된 애니메이션 참조 제거, 새 애니메이션 참조 추가.

**Step 5: 테스트**

Run: `npm run test:all`
Expected: 전체 통과

**Step 6: Commit**

```bash
git add css/style.css
git commit -m "chore: clean up old CSS rules and animation references"
```

---

## 전체 테스트 체크리스트 (각 Task 후)

- [ ] `npm test` — 유닛 테스트 통과
- [ ] `npm run test:e2e` — E2E 테스트 통과
- [ ] `npx serve .` → 브라우저에서 수동 확인:
  - 메뉴 화면 Play 버튼 3D 입체감
  - 메뉴 Ranking/Missions 카드형 버튼
  - 게임 오버 화면 버튼 3개 (Continue 조건부)
  - 게임 오버 Share/Menu 보조 버튼
  - 퍼즈 화면 Resume 버튼 + 패널 스프링
  - 버튼 누르기 → translateY 눌림감
  - 모든 버튼 최소 44px 터치 타겟
