# 닉네임-랭킹 연동 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 닉네임 변경 시 로컬/Firebase 랭킹에 반영하고, 변경을 주 1회로 제한하며, GeoIP로 국적 판단을 개선한다.

**Architecture:** UUID 기반 유저 식별 → 모든 점수 기록에 userId 포함 → 닉네임 변경 시 userId로 기록 일괄 업데이트. 국적은 GeoIP API 1회 호출 후 localStorage 캐시.

**Tech Stack:** Vanilla JS (IIFE), localStorage, Firebase Firestore, ipapi.co GeoIP API

---

### Task 1: nickname.js — UUID 생성 + 주 1회 제한

**Files:**
- Modify: `js/nickname.js` (전체 재작성)

**Step 1: nickname.js 확장 구현**

```js
// Nickname System — UUID identification + weekly change limit
const NicknameManager = (() => {
  const STORAGE_KEY = 'fruitDropNickname';
  const USER_ID_KEY = 'fruitDropUserId';
  const CHANGED_AT_KEY = 'fruitDropNickChangedAt';
  const CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  let currentName = '';
  let userId = '';

  function init() {
    currentName = localStorage.getItem(STORAGE_KEY) || '';

    // Generate UUID on first run
    userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, userId);
    }
  }

  function getName() { return currentName; }
  function hasName() { return currentName.length > 0; }
  function getUserId() { return userId; }

  function canChangeName() {
    // First-time setup is always allowed
    if (!currentName) return true;

    const lastChanged = localStorage.getItem(CHANGED_AT_KEY);
    if (!lastChanged) return true;

    const elapsed = Date.now() - new Date(lastChanged).getTime();
    return elapsed >= CHANGE_COOLDOWN_MS;
  }

  function getNextChangeDate() {
    const lastChanged = localStorage.getItem(CHANGED_AT_KEY);
    if (!lastChanged) return null;
    return new Date(new Date(lastChanged).getTime() + CHANGE_COOLDOWN_MS);
  }

  function setName(name) {
    const isFirstTime = !currentName;
    const oldName = currentName;

    currentName = name.trim().substring(0, 12);
    localStorage.setItem(STORAGE_KEY, currentName);

    // Record change timestamp (skip for first-time setup)
    if (!isFirstTime) {
      localStorage.setItem(CHANGED_AT_KEY, new Date().toISOString());
    }

    return { oldName, newName: currentName, isFirstTime };
  }

  return { init, getName, hasName, getUserId, canChangeName, getNextChangeDate, setName };
})();
```

**Step 2: 브라우저 콘솔에서 검증**

```
서버 실행: npx serve . (fruit-drop 디렉토리)
브라우저에서 localhost 접속 후 콘솔:

// UUID 생성 확인
NicknameManager.getUserId()  // → UUID 문자열

// 최초 설정 (제한 없음)
NicknameManager.canChangeName()  // → true
NicknameManager.setName('TestUser')
NicknameManager.getName()  // → 'TestUser'

// 변경 시도 (주 1회 제한)
NicknameManager.canChangeName()  // → false
NicknameManager.getNextChangeDate()  // → 7일 뒤 Date
```

**Step 3: 커밋**

```bash
git add js/nickname.js
git commit -m "feat: add UUID user identification and weekly nickname change limit"
```

---

### Task 2: ranking.js — userId 필드 + 닉네임 일괄 변경

**Files:**
- Modify: `js/ranking.js`

**Step 1: ranking.js 수정**

```js
// Ranking/Leaderboard System - Local storage based
const RankingManager = (() => {
  const STORAGE_KEY = 'fruitDropLeaderboard';
  const MAX_ENTRIES = 20;

  function getLeaderboard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  }

  function save(board) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }

  function addScore(nickname, score, userId) {
    if (score <= 0) return -1;

    const board = getLeaderboard();
    const entry = {
      name: nickname || 'Player',
      score: score,
      date: new Date().toISOString().split('T')[0],
      userId: userId || '',
    };

    board.push(entry);
    board.sort((a, b) => b.score - a.score);

    if (board.length > MAX_ENTRIES) {
      board.length = MAX_ENTRIES;
    }

    save(board);

    return board.findIndex(e => e === entry) + 1;
  }

  function getTopScores(count) {
    return getLeaderboard().slice(0, count || 10);
  }

  function getRank(score) {
    const board = getLeaderboard();
    let rank = 1;
    for (const entry of board) {
      if (entry.score > score) rank++;
      else break;
    }
    return rank;
  }

  function updateNickname(userId, newName) {
    if (!userId) return;
    const board = getLeaderboard();
    let changed = false;
    for (const entry of board) {
      if (entry.userId === userId) {
        entry.name = newName;
        changed = true;
      }
    }
    if (changed) save(board);
  }

  return { addScore, getTopScores, getRank, updateNickname };
})();
```

**Step 2: 브라우저 콘솔에서 검증**

```
// 점수 추가 (userId 포함)
const uid = NicknameManager.getUserId();
RankingManager.addScore('OldName', 500, uid);
RankingManager.addScore('OldName', 300, uid);
RankingManager.getTopScores(5)
// → [{name:'OldName', score:500, userId:uid, ...}, ...]

// 닉네임 일괄 변경
RankingManager.updateNickname(uid, 'NewName');
RankingManager.getTopScores(5)
// → [{name:'NewName', score:500, userId:uid, ...}, ...]
```

**Step 3: 커밋**

```bash
git add js/ranking.js
git commit -m "feat: add userId to local rankings and nickname bulk update"
```

---

### Task 3: firebase-leaderboard.js — userId + GeoIP + batch update

**Files:**
- Modify: `js/firebase-leaderboard.js`

**Step 1: firebase-leaderboard.js 수정**

```js
// Firebase Leaderboard — Firestore-based global rankings
const FirebaseLeaderboard = (() => {
  let db = null;
  let userCountry = 'XX';
  const COUNTRY_CACHE_KEY = 'fruitDropCountry';

  function init(firebaseConfig) {
    try {
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('YOUR_')) return;
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      detectCountry();
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

  async function detectCountry() {
    // Check cache first
    const cached = localStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) {
      userCountry = cached;
      return;
    }

    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.country_code) {
          userCountry = data.country_code;
          localStorage.setItem(COUNTRY_CACHE_KEY, userCountry);
          return;
        }
      }
    } catch (e) {
      console.warn('GeoIP failed, falling back to navigator.language:', e);
    }

    // Fallback to navigator.language
    const lang = navigator.language || 'en-US';
    const parts = lang.split('-');
    userCountry = (parts[1] || parts[0]).toUpperCase().slice(0, 2);
    localStorage.setItem(COUNTRY_CACHE_KEY, userCountry);
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

  async function submitScore(name, score, userId) {
    if (!db) return null;
    try {
      await db.collection('scores').add({
        name: name,
        score: score,
        country: userCountry,
        userId: userId || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.warn('Failed to submit score:', e);
      return false;
    }
  }

  async function updateNickname(userId, newName) {
    if (!db || !userId) return false;
    try {
      const snapshot = await db.collection('scores')
        .where('userId', '==', userId)
        .get();

      if (snapshot.empty) return false;

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { name: newName });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.warn('Failed to update nickname in Firebase:', e);
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

  return { init, isAvailable, getCountry, countryFlag, submitScore, updateNickname, getScores };
})();
```

**Step 2: 브라우저 콘솔에서 검증**

```
// GeoIP 캐시 확인
localStorage.getItem('fruitDropCountry')  // → 'KR' (한국이면)

// Firebase 미설정 시 isAvailable() = false 정상
FirebaseLeaderboard.isAvailable()  // → false (placeholder config)

// updateNickname, submitScore는 Firebase 설정 후 테스트
```

**Step 3: 커밋**

```bash
git add js/firebase-leaderboard.js
git commit -m "feat: add userId tracking, GeoIP country detection, and nickname batch update to Firebase leaderboard"
```

---

### Task 4: ui.js — 닉네임 변경 제한 UI

**Files:**
- Modify: `js/ui.js` (handleNickEdit, handleNickSubmit, unlockRanking, updateSettingsPanel)

**Step 1: handleNickEdit 수정 — 주 1회 제한 체크**

`handleNickEdit()`를 다음으로 교체:

```js
function handleNickEdit() {
  if (!NicknameManager.canChangeName()) {
    const nextDate = NicknameManager.getNextChangeDate();
    const days = Math.ceil((nextDate - Date.now()) / (1000 * 60 * 60 * 24));
    alert('Nickname change available in ' + days + ' day' + (days !== 1 ? 's' : ''));
    return;
  }

  const current = NicknameManager.getName() || '';
  const name = prompt('Edit nickname (max 12 chars):', current);
  if (name && name.trim() && name.trim() !== current) {
    const userId = NicknameManager.getUserId();
    NicknameManager.setName(name.trim());

    // Update local rankings
    RankingManager.updateNickname(userId, name.trim());

    // Update Firebase rankings
    if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
      FirebaseLeaderboard.updateNickname(userId, name.trim());
    }

    updateSettingsPanel();
  }
}
```

**Step 2: updateSettingsPanel 수정 — 변경 가능 상태 표시**

`updateSettingsPanel()`을 다음으로 교체:

```js
function updateSettingsPanel() {
  const name = NicknameManager.getName();
  if (name) {
    els.settingsNickSection.style.display = '';
    els.settingsNickName.textContent = name;

    // Show change availability
    if (!NicknameManager.canChangeName()) {
      const nextDate = NicknameManager.getNextChangeDate();
      const days = Math.ceil((nextDate - Date.now()) / (1000 * 60 * 60 * 24));
      els.settingsNickEdit.textContent = '🔒';
      els.settingsNickEdit.title = days + ' day(s) until change';
    } else {
      els.settingsNickEdit.textContent = '✏️';
      els.settingsNickEdit.title = 'Edit nickname';
    }
  } else {
    els.settingsNickSection.style.display = 'none';
  }
}
```

**Step 3: handleNickSubmit + unlockRanking 수정 — userId 연결**

`handleNickSubmit()`은 그대로, `unlockRanking()`에서 userId 전달:

```js
function unlockRanking() {
  els.goNickOverlay.style.display = 'none';
  els.goBoardList.classList.remove('blurred');

  const score = parseInt(els.goScore.textContent);
  const name = NicknameManager.getName();
  const userId = NicknameManager.getUserId();
  const rank = RankingManager.addScore(name, score, userId);

  // Submit to Firebase
  if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
    FirebaseLeaderboard.submitScore(name, score, userId);
  }

  renderBoardList(true);

  setTimeout(() => {
    els.goRankReveal.style.display = '';
    els.goRankText.textContent = '🎉 You\'re #' + rank + '!';
  }, 400);
}
```

**Step 4: 브라우저에서 검증**

```
1. 서버 실행, 게임 플레이 → 게임오버 → 닉네임 입력 → 랭킹 확인
2. 설정 → 닉네임 편집 → "X일 후 변경 가능" 알림 확인
3. localStorage에서 fruitDropNickChangedAt 삭제 후 재시도 → 변경 성공 확인
4. 랭킹에서 변경된 이름 표시 확인
```

**Step 5: 커밋**

```bash
git add js/ui.js
git commit -m "feat: add weekly nickname change limit UI and userId integration"
```

---

### Task 5: game.js — triggerGameOver에 userId 전달

**Files:**
- Modify: `js/game.js` (triggerGameOver 함수)

**Step 1: triggerGameOver 수정**

`triggerGameOver()` 안의 점수 저장 부분을 교체:

```js
// 기존:
// gameOverRank = RankingManager.addScore(name, score);
// FirebaseLeaderboard.submitScore(name, score);

// 변경:
const userId = NicknameManager.getUserId();
gameOverRank = RankingManager.addScore(name, score, userId);
if (typeof FirebaseLeaderboard !== 'undefined' && FirebaseLeaderboard.isAvailable()) {
  FirebaseLeaderboard.submitScore(name, score, userId);
}
```

**Step 2: 브라우저에서 전체 플로우 검증**

```
1. localStorage 클리어 → 새 유저로 시작
2. 게임 플레이 → 게임오버 → 닉네임 입력 → 랭킹 확인
3. 다시 플레이 → 게임오버 → 같은 닉네임으로 저장 확인
4. 설정에서 닉네임 변경 → 로컬 랭킹 이름 변경 확인
5. 다시 변경 시도 → "X일 후" 메시지 확인
```

**Step 3: 커밋**

```bash
git add js/game.js
git commit -m "feat: pass userId when saving scores on game over"
```

---

### Task 6: 최종 통합 검증 + PRD 업데이트

**Files:**
- Modify: `PRD.md` (데이터 저장 섹션 업데이트)

**Step 1: 전체 시나리오 검증**

```
시나리오 A — 신규 유저:
1. localStorage 클리어
2. 게임 시작 → 게임오버 → 닉네임 'Alice' 입력
3. 랭킹에 Alice 표시 확인
4. 설정 → 닉네임 표시 + ✏️ 아이콘
5. 닉네임 'Bob'으로 변경
6. 랭킹에서 Bob으로 변경 확인
7. 다시 변경 시도 → 🔒 아이콘 + 7일 제한 메시지

시나리오 B — 복귀 유저 (기존 데이터):
1. 기존 fruitDropLeaderboard에 userId 없는 레코드 유지 확인
2. 새 게임 → 새 레코드에는 userId 포함 확인
3. 닉네임 변경 시 userId 있는 레코드만 업데이트 확인
```

**Step 2: PRD.md 데이터 저장 섹션 업데이트**

PRD.md의 "6. 데이터 저장" 섹션을 새 키 포함하여 업데이트:

```markdown
| 키 | 데이터 |
|----|--------|
| `fruitDropHighScore` | 최고 점수 |
| `fruitDropTickets` | 남은 횟수 + 날짜 |
| `fruitDropNickname` | 플레이어 닉네임 |
| `fruitDropUserId` | 유저 고유 UUID (내부 식별) |
| `fruitDropNickChangedAt` | 닉네임 마지막 변경 일시 |
| `fruitDropCountry` | 국가 코드 (GeoIP 캐시) |
| `fruitDropLeaderboard` | 상위 20개 기록 (이름, 점수, 날짜, userId) |
```

**Step 3: 커밋**

```bash
git add PRD.md
git commit -m "docs: update PRD with userId and GeoIP data fields"
```
