# Durian Merge - 프로젝트 가이드

## 개요
동남아 열대과일 테마의 수박게임(Suika) 스타일 머지 퍼즐. Canvas + Matter.js 기반.

## 파일 구조
```
durian-merge/
├── index.html              # 진입점 (HTML UI + Canvas)
├── css/style.css           # UI 스타일
├── js/
│   ├── skins.js            # 스킨 시스템 (14종 정의 + 잠금 해제 조건 + 통계 관리)
│   ├── fruits.js           # 과일 정의 11종 + 렌더링 (PNG + 프로시저럴 폴백)
│   ├── physics.js          # Matter.js 래퍼
│   ├── sounds.js           # Web Audio 프로시저럴 합성 (SFX + BGM)
│   ├── haptic.js           # 진동 피드백 (Capacitor + navigator.vibrate)
│   ├── tickets.js          # 일일 플레이 횟수 (localStorage)
│   ├── nickname.js         # 닉네임 관리 (localStorage)
│   ├── ranking.js          # 로컬 리더보드 상위 20개 (localStorage)
│   ├── ui.js               # HTML 기반 UI 매니저 (화면 전환, 설정, 공유, 튜토리얼)
│   ├── firebase-leaderboard.js # Firebase Firestore 글로벌 리더보드
│   ├── game.js             # 메인 게임 루프 + 입력 + 충돌/합체 로직 + 이펙트
│   └── admob.js            # AdMob 광고 (Capacitor 전용)
├── assets/fruits_clean/    # 과일 PNG 11개 (256x256)
├── capacitor.config.json   # Capacitor 설정
├── package.json
└── PRD.md                  # 상세 기획서
```

## JS 로드 순서 (의존성)
```
Firebase CDN → matter.js (CDN)
  ↓
skins.js → fruits.js → sounds.js → haptic.js → physics.js
  ↓
tickets.js → missions.js → nickname.js → ranking.js → tutorial.js
  ↓
ui.js → analytics.js → firebase-leaderboard.js
  ↓
game.js → admob.js
```

## 핵심 아키텍처
- **렌더링**: Canvas(게임 영역) + HTML DOM(UI 오버레이) 이중 구조
- **상태 관리**: UI.showScreen()으로 화면 전환 (menu/playing/gameover/leaderboard)
- **모듈 패턴**: 각 파일이 IIFE로 전역 객체 노출 (Physics, SoundManager, UI 등)
- **데이터**: localStorage(오프라인) + Firebase Firestore(온라인 리더보드)

## 주의사항
- **CSS 토큰**: style.css는 clamp() 기반 반응형 토큰 사용. 새 크기 추가 시 `--sp-*`, `--fs-*` 토큰으로 정의. 하드코딩 px는 예외(입력필드 16px, 게임 이펙트)만 허용
- admob.js의 `isTesting: true` → 릴리스 전 반드시 false + 실제 ID 교체
- DANGER_LINE_Y = 100 (HUD가 HTML이므로 PRD의 120보다 낮음, 의도적)
- game.js: Firebase config의 "YOUR_API_KEY" 등을 실제 값으로 교체
- localStorage `durianMergeTutorialDone` 삭제하고 튜토리얼 플로우 테스트
- AD 배너 공존: `--banner-height` CSS 변수(0px/50px), 하단 패널 padding-bottom에 `+ var(--banner-height)`, 모달 z-index(200+) > 배너(100)
- **스킨 시스템**: 14종 (procedural 9 + placeholder 5). unlock condition: totalScore, gamesPlayed, singleGameScore, loginStreak, albumCount, missionsCompleted, singleGameCombos, season. placeholder 스킨(desserts/sea/space/halloween/christmas)은 PNG 에셋 미완성 → emoji 렌더러 사용 중. 스킨 테스트: `node tests/skin-render-test.cjs` (로컬 서버 3456 필요)

## 릴리스 전 제거 (DEBUG)
- ui.js: `// DEBUG:` 주석 블록 (BEST 5탭 → 강제 게임오버)
- game.js: `triggerGameOver`를 return에서 제거 (`return { init }` 으로 복원)

## 테스트
- **사용자(황태용)**: Galaxy A17 실기기 연결 시 항상 앱(`npm run deploy`)으로 테스트
- **Claude**: 웹(`npx serve .`) 또는 Playwright E2E로 테스트 가능
- 변경사항 확인 요청 시 → `npm run deploy`로 실기기 배포 우선

```bash
# 자동화 테스트
npm test              # 로직 테스트 (Node.js)
npm run test:e2e      # E2E 테스트 (Playwright + Chromium)
npm run test:all      # 전체

# 로컬 웹 테스트
npx serve .

# 실기기 배포
npm run deploy
```

## UI/CSS 수정 후 QA 프로세스 (필수)
디자인 초안 없이 개발하므로, 실기기 스크린샷이 유일한 시각 검증 수단. **모든 UI/CSS 변경 시** 아래 프로세스를 반드시 따를 것:

1. `npm run deploy` (실기기 배포)
2. `npm run device:capture` (15개 화면 자동 캡처 → `screenshots/device_*.png`)
3. 캡처된 스크린샷을 사용자에게 보여주고 확인받기
4. 문제 없으면 커밋

**주의**: 커밋 전에 반드시 `device:capture` 실행. 스크린샷 확인 없이 UI 변경을 커밋하지 말 것.
