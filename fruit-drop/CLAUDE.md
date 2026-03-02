# Fruit Drop - 프로젝트 가이드

## 개요
동남아 열대과일 테마의 수박게임(Suika) 스타일 머지 퍼즐. Canvas + Matter.js 기반.

## 파일 구조
```
fruit-drop/
├── index.html              # 진입점 (HTML UI + Canvas)
├── css/style.css           # UI 스타일
├── js/
│   ├── fruits.js           # 과일 정의 11종 + 렌더링 (PNG + 프로시저럴 폴백)
│   ├── physics.js          # Matter.js 래퍼
│   ├── sounds.js           # Web Audio 프로시저럴 합성 (SFX + BGM)
│   ├── haptic.js           # 진동 피드백 (Capacitor + navigator.vibrate)
│   ├── tickets.js          # 일일 플레이 횟수 (localStorage)
│   ├── nickname.js         # 닉네임 관리 (localStorage)
│   ├── ranking.js          # 로컬 리더보드 상위 20개 (localStorage)
│   ├── ui.js               # HTML 기반 UI 매니저 (화면 전환, 설정, 공유)
│   ├── game.js             # 메인 게임 루프 + 입력 + 충돌/합체 로직
│   └── admob.js            # AdMob 광고 (Capacitor 전용)
├── assets/fruits_clean/    # 과일 PNG 11개 (256x256)
├── capacitor.config.json   # Capacitor 설정
├── package.json
└── PRD.md                  # 상세 기획서
```

## JS 로드 순서 (의존성)
```
matter.js (CDN) → fruits.js → sounds.js → haptic.js → physics.js
→ tickets.js → nickname.js → ranking.js → ui.js → game.js → admob.js
```

## 핵심 아키텍처
- **렌더링**: Canvas(게임 영역) + HTML DOM(UI 오버레이) 이중 구조
- **상태 관리**: UI.showScreen()으로 화면 전환 (menu/playing/gameover/leaderboard)
- **모듈 패턴**: 각 파일이 IIFE로 전역 객체 노출 (Physics, SoundManager, UI 등)
- **데이터**: 모든 데이터 localStorage, 서버 없음

## 주의사항
- admob.js의 `isTesting: true` → 릴리스 전 반드시 false + 실제 ID 교체
- DANGER_LINE_Y = 100 (HUD가 HTML이므로 PRD의 120보다 낮음, 의도적)
- Weekly/Daily 리더보드 탭은 미구현 (현재 all-time만 작동)

## 로컬 테스트
```bash
# 간단한 방법
cd fruit-drop && npx serve .
# 또는
python3 -m http.server 8000
```
