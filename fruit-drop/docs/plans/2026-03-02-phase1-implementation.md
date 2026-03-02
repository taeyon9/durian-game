# Phase 1: fruit-drop 출시 전 폴리시 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 비주얼 이펙트 주스감 극대화 + 첫 게임 튜토리얼 + Firebase 글로벌 리더보드를 추가하여 출시 품질 달성

**Architecture:** 기존 IIFE 모듈 패턴 유지. 이펙트는 game.js render()에 통합, 튜토리얼은 HTML 오버레이(ui.js), Firebase는 새 모듈 firebase-leaderboard.js로 분리. 기존 로컬 RankingManager는 오프라인 폴백으로 유지.

**Tech Stack:** Vanilla JS, Canvas 2D, Firebase Firestore (CDN), Web Audio API, Matter.js

---

## Task 1: 점수 팝업 이펙트

**Files:**
- Modify: `js/game.js` (scorePopups 배열, 합체 시 push, render에서 그리기)

**Step 1: game.js 상단에 scorePopups 배열 추가**

`mergeEffects` 선언 옆(18줄 근처)에 추가:
```javascript
let scorePopups = [];
```

**Step 2: handleCollision에서 점수 팝업 push**

`mergeEffects.push(...)` 뒤(258줄 근처)에 추가:
```javascript
scorePopups.push({
  x: mx, y: my,
  text: '+' + points,
  alpha: 1,
  dy: 0,
});
```

**Step 3: resetGame에서 scorePopups 초기화**

`mergeEffects = [];` 뒤에 추가:
```javascript
scorePopups = [];
```

**Step 4: render()에서 점수 팝업 그리기**

merge effects 렌더링 블록 뒤에 추가:
```javascript
// Score popups
for (const pop of scorePopups) {
  ctx.save();
  ctx.globalAlpha = pop.alpha;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 16px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(pop.text, pop.x, pop.y + pop.dy);
  ctx.restore();
}
```

**Step 5: gameLoop에서 scorePopups 업데이트**

merge effects decay 블록 근처에 추가:
```javascript
// Score popup decay
for (let i = scorePopups.length - 1; i >= 0; i--) {
  scorePopups[i].dy -= delta * 0.05;
  scorePopups[i].alpha -= delta / 800;
  if (scorePopups[i].alpha <= 0) scorePopups.splice(i, 1);
}
```

**Step 6: 브라우저에서 확인**

Run: `cd fruit-drop && python3 -m http.server 8000`
확인: 과일 합체 시 "+15" 같은 골드색 텍스트가 위로 떠오르며 사라지는지 확인

**Step 7: 커밋**

```bash
git add js/game.js
git commit -m "feat: add score popup effect on fruit merge"
```

---

## Task 2: 합체 파티클 강화 + glow 이펙트

**Files:**
- Modify: `js/game.js` (mergeEffects push 시 파티클 데이터 추가, render 수정)

**Step 1: mergeEffects push에 파티클 배열과 glow 데이터 추가**

기존 mergeEffects.push(252-258줄)를 교체:
```javascript
// Merge effect
const particles = [];
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const speed = 0.08 + Math.random() * 0.06;
  particles.push({
    angle,
    dist: 0,
    speed,
    size: 2 + Math.random() * 3,
  });
}
mergeEffects.push({
  x: mx, y: my,
  radius: FRUITS[level + 1].radius,
  alpha: 1,
  color: FRUITS[level + 1].color,
  glowRadius: 0,
  particles,
});
```

**Step 2: render()의 merge effects 블록 교체**

기존 merge effects 렌더링(388-408줄)을 교체:
```javascript
// Merge effects
for (const effect of mergeEffects) {
  // Glow
  ctx.save();
  ctx.globalAlpha = effect.alpha * 0.4;
  const glow = ctx.createRadialGradient(
    effect.x, effect.y, 0,
    effect.x, effect.y, effect.glowRadius
  );
  glow.addColorStop(0, effect.color);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ring
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
  ctx.strokeStyle = effect.color;
  ctx.globalAlpha = effect.alpha * 0.6;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Particles
  for (const p of effect.particles) {
    const px = effect.x + Math.cos(p.angle) * p.dist;
    const py = effect.y + Math.sin(p.angle) * p.dist;
    ctx.beginPath();
    ctx.arc(px, py, p.size * effect.alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 200, ${effect.alpha})`;
    ctx.fill();
  }
}
```

**Step 3: gameLoop의 merge effects decay 수정**

기존 decay 블록(336-339줄)을 교체:
```javascript
// Merge effects decay
for (let i = mergeEffects.length - 1; i >= 0; i--) {
  const e = mergeEffects[i];
  e.alpha -= delta / 400;
  e.radius += delta * 0.1;
  e.glowRadius += delta * 0.15;
  for (const p of e.particles) {
    p.dist += p.speed * delta;
  }
  if (e.alpha <= 0) mergeEffects.splice(i, 1);
}
```

**Step 4: 브라우저에서 확인**

확인: 합체 시 원형 glow + 12개 파티클이 바깥으로 퍼지는지

**Step 5: 커밋**

```bash
git add js/game.js
git commit -m "feat: enhance merge effect with glow and more particles"
```

---

## Task 3: 화면 쉐이크 (고레벨 합체)

**Files:**
- Modify: `js/game.js` (shakeOffset 변수, 합체 시 트리거, render에서 적용)

**Step 1: 상단에 shake 변수 추가**

```javascript
let shakeIntensity = 0;
```

**Step 2: handleCollision에서 Lv5+ 합체 시 shake 트리거**

`SoundManager.playMerge(level)` 근처에 추가:
```javascript
// Screen shake for high-level merges
if (level >= 4) {
  shakeIntensity = Math.min(6, (level - 3) * 2);
}
```

**Step 3: render() 시작 부분에 shake 적용**

`function render() {` 직후, 배경 그리기 전에:
```javascript
// Screen shake
if (shakeIntensity > 0) {
  const sx = (Math.random() - 0.5) * shakeIntensity;
  const sy = (Math.random() - 0.5) * shakeIntensity;
  ctx.save();
  ctx.translate(sx, sy);
}
```

render() 맨 끝에:
```javascript
// End screen shake
if (shakeIntensity > 0) {
  ctx.restore();
}
```

**Step 4: gameLoop에서 shake 감소**

```javascript
// Shake decay
if (shakeIntensity > 0) {
  shakeIntensity -= delta * 0.02;
  if (shakeIntensity < 0) shakeIntensity = 0;
}
```

**Step 5: resetGame에 shakeIntensity = 0 추가**

**Step 6: 브라우저에서 확인 + 커밋**

```bash
git add js/game.js
git commit -m "feat: add screen shake on high-level merges"
```

---

## Task 4: 드롭 트레일 이펙트

**Files:**
- Modify: `js/game.js` (dropTrails 배열, 드롭 시 생성, render에서 그리기)

**Step 1: 상단에 dropTrails 배열 추가**

```javascript
let dropTrails = [];
let trailFrame = 0;
```

**Step 2: gameLoop의 playing 블록에서 트레일 생성**

`Physics.update(delta)` 직후에 추가:
```javascript
// Drop trails - generate for recently dropped fruits
trailFrame++;
if (trailFrame % 3 === 0) {
  for (const body of fruitBodies) {
    if (!body.droppedAt) continue;
    const age = performance.now() - body.droppedAt;
    if (age > 600) continue; // Only trail for 0.6s after drop
    const vel = body.velocity;
    if (Math.abs(vel.y) < 1) continue; // Only when moving fast
    const fruit = FRUITS[body.fruitLevel];
    dropTrails.push({
      x: body.position.x + (Math.random() - 0.5) * fruit.radius * 0.5,
      y: body.position.y,
      alpha: 0.5,
      size: 2 + Math.random() * 2,
      color: fruit.color,
    });
  }
}
```

**Step 3: gameLoop에서 트레일 감소**

```javascript
// Drop trail decay
for (let i = dropTrails.length - 1; i >= 0; i--) {
  dropTrails[i].alpha -= delta / 300;
  if (dropTrails[i].alpha <= 0) dropTrails.splice(i, 1);
}
```

**Step 4: render()에서 과일 그리기 전에 트레일 그리기**

Fruits 렌더링 바로 위에:
```javascript
// Drop trails
for (const t of dropTrails) {
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
  ctx.fillStyle = t.color;
  ctx.globalAlpha = t.alpha;
  ctx.fill();
}
ctx.globalAlpha = 1;
```

**Step 5: resetGame에 dropTrails = [] 추가**

**Step 6: 브라우저에서 확인 + 커밋**

```bash
git add js/game.js
git commit -m "feat: add drop trail particles"
```

---

## Task 5: 콤보 보더 펄스

**Files:**
- Modify: `js/game.js` (comboBorderAlpha 변수, 콤보 시 트리거, render에서 그리기)

**Step 1: 상단에 변수 추가**

```javascript
let comboBorderAlpha = 0;
```

**Step 2: handleCollision의 콤보 >= 2 블록에서 트리거**

`UI.showCombo(comboCount)` 근처에 추가:
```javascript
comboBorderAlpha = 0.6;
```

**Step 3: render() 맨 끝(drop guide 뒤)에 보더 펄스 그리기**

```javascript
// Combo border pulse
if (comboBorderAlpha > 0) {
  ctx.save();
  ctx.strokeStyle = `rgba(255, 215, 0, ${comboBorderAlpha})`;
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.strokeRect(2, DANGER_LINE_Y, BASE_WIDTH - 4, BASE_HEIGHT - DANGER_LINE_Y - 2);
  ctx.restore();
}
```

**Step 4: gameLoop에서 감소**

```javascript
if (comboBorderAlpha > 0) {
  comboBorderAlpha -= delta / 500;
  if (comboBorderAlpha < 0) comboBorderAlpha = 0;
}
```

**Step 5: resetGame에 comboBorderAlpha = 0 추가**

**Step 6: 브라우저에서 확인 + 커밋**

```bash
git add js/game.js
git commit -m "feat: add combo border pulse effect"
```

---

## Task 6: 스쿼시 & 스트레치

**Files:**
- Modify: `js/game.js` (과일 렌더링 시 속도 기반 스쿼시 적용)

**Step 1: render()의 과일 그리기 블록 수정**

기존(382-386줄):
```javascript
for (const body of fruitBodies) {
  if (body.isMerging) continue;
  drawFruit(ctx, body.position.x, body.position.y, body.fruitLevel, body.angle);
}
```

교체:
```javascript
for (const body of fruitBodies) {
  if (body.isMerging) continue;
  const vel = body.velocity;
  const speed = Math.abs(vel.y);
  // Squash when fast, stretch slightly
  const squashX = speed > 3 ? 1 + Math.min(speed * 0.01, 0.12) : 1;
  const squashY = speed > 3 ? 1 - Math.min(speed * 0.01, 0.12) : 1;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  ctx.scale(squashX, squashY);
  drawFruit(ctx, 0, 0, body.fruitLevel, 0);
  ctx.restore();
}
```

**Step 2: 브라우저에서 확인 + 커밋**

확인: 과일이 빠르게 떨어질 때 살짝 세로로 찌그러지는지

```bash
git add js/game.js
git commit -m "feat: add squash and stretch to falling fruits"
```

---

## Task 7: 튜토리얼 오버레이

**Files:**
- Modify: `index.html` (튜토리얼 HTML 추가)
- Modify: `css/style.css` (튜토리얼 스타일)
- Modify: `js/ui.js` (튜토리얼 로직)
- Modify: `js/game.js` (첫 드롭 시 ui 호출)

**Step 1: index.html에 튜토리얼 오버레이 추가**

`comboPopup` div 뒤에:
```html
<!-- Tutorial overlay -->
<div id="tutorialOverlay" class="tutorial-overlay" style="display:none;">
  <div class="tutorial-msg" id="tutorialMsg"></div>
  <div class="tutorial-hand" id="tutorialHand">👆</div>
</div>
```

**Step 2: css/style.css에 스타일 추가**

파일 맨 끝에:
```css
/* ===== TUTORIAL ===== */
.tutorial-overlay {
  position: fixed;
  inset: 0;
  z-index: 18;
  pointer-events: none;
}
.tutorial-msg {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: var(--white);
  font-family: var(--font);
  font-size: 15px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 50px;
  border: 1px solid var(--gold-dim);
  white-space: nowrap;
}
.tutorial-hand {
  position: absolute;
  top: 20%;
  left: 50%;
  font-size: 32px;
  animation: tutorialSwipe 1.5s ease-in-out infinite;
}
@keyframes tutorialSwipe {
  0%   { transform: translateX(-40px); opacity: 0.4; }
  50%  { transform: translateX(40px); opacity: 1; }
  100% { transform: translateX(-40px); opacity: 0.4; }
}
```

**Step 3: ui.js에 튜토리얼 함수 추가**

els 캐시에 추가:
```javascript
tutorial: document.getElementById('tutorialOverlay'),
tutorialMsg: document.getElementById('tutorialMsg'),
tutorialHand: document.getElementById('tutorialHand'),
```

함수 추가 (return 전):
```javascript
// ===== TUTORIAL =====
let tutorialStep = 0;

function showTutorial() {
  if (localStorage.getItem('fruitDropTutorialDone')) return;
  tutorialStep = 1;
  els.tutorialMsg.textContent = '좌우로 드래그해서 위치를 정하세요!';
  els.tutorial.style.display = '';
}

function advanceTutorial() {
  if (tutorialStep === 1) {
    tutorialStep = 2;
    els.tutorialHand.style.display = 'none';
    els.tutorialMsg.textContent = '같은 과일끼리 합치면 진화! 🎯';
    setTimeout(() => {
      els.tutorial.style.display = 'none';
      localStorage.setItem('fruitDropTutorialDone', 'true');
      tutorialStep = 0;
    }, 2000);
  }
}
```

return 객체에 `showTutorial, advanceTutorial` 추가.

**Step 4: game.js에서 튜토리얼 연동**

`startGame()` 맨 끝에:
```javascript
UI.showTutorial();
```

`dropFruit()` 안의 `SoundManager.playDrop()` 뒤에:
```javascript
UI.advanceTutorial();
```

**Step 5: 브라우저에서 확인**

확인: localStorage에서 `fruitDropTutorialDone` 삭제 후 게임 시작 → 드래그 안내 → 드롭 후 합체 안내 → 2초 후 사라짐

**Step 6: 커밋**

```bash
git add index.html css/style.css js/ui.js js/game.js
git commit -m "feat: add first-game tutorial overlay"
```

---

## Task 8: Firebase 프로젝트 셋업 + Firestore 모듈

**Files:**
- Modify: `index.html` (Firebase CDN 스크립트 추가)
- Create: `js/firebase-leaderboard.js` (Firestore 읽기/쓰기)

**Step 1: index.html에 Firebase CDN 추가**

matter.js 스크립트 태그 앞에:
```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
```

js/game.js 스크립트 태그 앞에(ui.js 뒤에):
```html
<script src="js/firebase-leaderboard.js"></script>
```

**Step 2: Firebase 콘솔에서 프로젝트 생성**

수동 작업:
1. https://console.firebase.google.com 에서 프로젝트 생성 (fruit-drop)
2. 웹 앱 추가 → firebaseConfig 복사
3. Firestore Database 생성 (asia-southeast1 리전 추천)
4. Firestore Rules 설정:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{docId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['name', 'score', 'country', 'createdAt'])
                    && request.resource.data.score is number
                    && request.resource.data.score > 0
                    && request.resource.data.name is string
                    && request.resource.data.name.size() <= 12;
    }
  }
}
```

**Step 3: firebase-leaderboard.js 작성**

```javascript
// Firebase Leaderboard — Firestore-based global rankings
const FirebaseLeaderboard = (() => {
  let db = null;
  let userCountry = 'XX';

  function init(firebaseConfig) {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      // Detect country from locale
      const lang = navigator.language || 'en-US';
      const parts = lang.split('-');
      userCountry = (parts[1] || parts[0]).toUpperCase().slice(0, 2);
    } catch (e) {
      console.warn('Firebase init failed, using local leaderboard:', e);
    }
  }

  function isAvailable() {
    return db !== null;
  }

  function getCountry() {
    return userCountry;
  }

  // Country code → flag emoji
  function countryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    const offset = 127397;
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    );
  }

  async function submitScore(name, score) {
    if (!db) return null;
    try {
      await db.collection('scores').add({
        name: name,
        score: score,
        country: userCountry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.warn('Failed to submit score:', e);
      return false;
    }
  }

  async function getScores(tab, limit = 50) {
    if (!db) return [];
    try {
      let query = db.collection('scores');

      if (tab === 'weekly') {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + 1);
        monday.setHours(0, 0, 0, 0);
        query = query.where('createdAt', '>=', monday);
      } else if (tab === 'country') {
        query = query.where('country', '==', userCountry);
      }

      const snapshot = await query
        .orderBy(tab === 'weekly' ? 'createdAt' : 'score', tab === 'weekly' ? 'asc' : 'desc')
        .limit(limit)
        .get();

      let results = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          name: d.name,
          score: d.score,
          country: d.country,
          date: d.createdAt ? d.createdAt.toDate().toISOString().split('T')[0] : '',
        };
      });

      // Weekly needs score sort (queried by createdAt for filter)
      if (tab === 'weekly') {
        results.sort((a, b) => b.score - a.score);
        results = results.slice(0, limit);
      }

      return results;
    } catch (e) {
      console.warn('Failed to fetch scores:', e);
      return [];
    }
  }

  return { init, isAvailable, getCountry, countryFlag, submitScore, getScores };
})();
```

**Step 4: 커밋**

```bash
git add index.html js/firebase-leaderboard.js
git commit -m "feat: add Firebase Firestore leaderboard module"
```

---

## Task 9: UI 리더보드 Firebase 연동

**Files:**
- Modify: `js/ui.js` (renderLeaderboardFull을 Firebase 기반으로 수정)
- Modify: `js/game.js` (Firebase 초기화 + 점수 제출)

**Step 1: game.js init()에서 Firebase 초기화**

`UI.init(...)` 뒤에 추가:
```javascript
// Firebase init
if (typeof FirebaseLeaderboard !== 'undefined') {
  FirebaseLeaderboard.init({
    // TODO: 실제 Firebase config로 교체
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  });
}
```

**Step 2: game.js triggerGameOver()에서 Firebase에 점수 제출**

`RankingManager.addScore(name, score)` 뒤에 추가:
```javascript
// Submit to Firebase
if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
  FirebaseLeaderboard.submitScore(name, score);
}
```

**Step 3: ui.js renderLeaderboardFull()을 async로 수정**

기존 함수를 교체:
```javascript
async function renderLeaderboardFull(tab) {
  const name = NicknameManager.getName();
  let board = [];

  // Try Firebase first, fallback to local
  if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
    els.lbList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">Loading...</div>';
    board = await FirebaseLeaderboard.getScores(tab === 'alltime' ? 'alltime' : tab, 50);
  }

  // Fallback to local
  if (board.length === 0 && tab === 'alltime') {
    board = RankingManager.getTopScores(20);
  }

  let html = '';
  if (board.length === 0) {
    html = '<div style="text-align:center;padding:40px;color:var(--text-dim);">No scores yet. Play a game!</div>';
  } else {
    board.forEach((entry, i) => {
      const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
      const isMe = entry.name === name;
      const flag = entry.country && typeof FirebaseLeaderboard !== 'undefined'
        ? FirebaseLeaderboard.countryFlag(entry.country) + ' '
        : '';
      html += `
        <div class="lb-row ${isMe ? 'me' : ''}">
          <div class="lb-rank">${rankLabel}</div>
          <div class="lb-name">${flag}${escHtml(entry.name)}${isMe ? ' ⭐' : ''}</div>
          <div class="lb-pts">${entry.score}</div>
        </div>`;
    });
  }
  els.lbList.innerHTML = html;
}
```

**Step 4: index.html에서 리더보드 탭 이름 변경**

기존 Weekly/Daily 탭을:
```html
<div class="lb-tab active" data-tab="alltime">All Time</div>
<div class="lb-tab" data-tab="weekly">Weekly</div>
<div class="lb-tab" data-tab="country">🌏 Country</div>
```

**Step 5: 브라우저에서 확인**

확인: Firebase config 설정 전에는 로컬 폴백으로 작동하는지. Config 설정 후에는 글로벌 리더보드 표시되는지.

**Step 6: 커밋**

```bash
git add js/game.js js/ui.js index.html
git commit -m "feat: integrate Firebase leaderboard with country flags"
```

---

## Task 10: 빌드 스크립트 업데이트 + 최종 확인

**Files:**
- Modify: `package.json` (build 스크립트에 firebase-leaderboard.js 포함)
- Modify: `fruit-drop/CLAUDE.md` (릴리스 체크리스트 업데이트)

**Step 1: package.json build 확인**

기존 build 스크립트가 `cp js/*.js www/js/`이므로 새 파일도 자동 포함됨. 확인만.

**Step 2: CLAUDE.md 릴리스 체크리스트 업데이트**

릴리스 전 제거 섹션에 추가:
```markdown
- game.js: Firebase config의 "YOUR_API_KEY" 등을 실제 값으로 교체
- localStorage `fruitDropTutorialDone` 삭제하고 튜토리얼 플로우 테스트
```

**Step 3: 전체 테스트**

Run: `cd fruit-drop && python3 -m http.server 8000`

체크리스트:
- [ ] 게임 시작 시 튜토리얼 표시 (첫 판만)
- [ ] 드롭 시 트레일 파티클
- [ ] 합체 시 glow + 파티클 + 점수 팝업
- [ ] 고레벨 합체 시 화면 쉐이크
- [ ] 콤보 2+ 시 보더 펄스
- [ ] 과일 낙하 시 스쿼시
- [ ] 리더보드 3탭 (All Time / Weekly / Country)
- [ ] 오프라인 시 로컬 폴백

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: update build and release checklist for Phase 1"
```

---

*총 10개 태스크. 이펙트(Task 1-6) 과 Firebase(Task 8-9)는 병렬 진행 가능.*
