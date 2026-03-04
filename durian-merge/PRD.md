# Durian Merge - Product Requirements Document (PRD)

## 1. 제품 개요

| 항목 | 내용 |
|------|------|
| **제품명** | Durian Merge - Tropical Fruit Puzzle Game |
| **장르** | 캐주얼 퍼즐 (수박게임 / Suika 스타일) |
| **플랫폼** | Android (Capacitor 8) / 모바일 웹 |
| **기술 스택** | Vanilla JS, Matter.js 물리엔진, Canvas 2D, Web Audio API |
| **앱 ID** | com.durianmerge.game |
| **기본 해상도** | 390 × 700 (반응형 스케일링) |
| **수익 모델** | AdMob (배너 + 전면 + 보상형 광고) |

---

## 2. 핵심 게임 메카닉

### 2.1 게임 규칙
- 화면 상단에서 과일을 터치/드래그로 좌우 이동 후 놓으면 아래로 떨어짐
- **같은 종류의 과일끼리 충돌하면 합체** → 다음 레벨 과일로 진화
- 합체 시 점수 획득 (과일별 고유 점수)
- 과일이 **위험선(Y=120px) 위에 2초 이상** 머물면 게임 오버

### 2.2 과일 시스템 (11단계)

| Lv | 과일 | 반지름 | 점수 | 드롭 가능 |
|----|------|--------|------|-----------|
| 0 | Lychee (리치) | 15px | 1 | O |
| 1 | Rambutan (람부탄) | 22px | 3 | O |
| 2 | Mangosteen (망고스틴) | 30px | 6 | O |
| 3 | Passion Fruit (패션프루트) | 37px | 10 | O |
| 4 | Mango (망고) | 47px | 15 | O |
| 5 | Dragon Fruit (용과) | 57px | 21 | X |
| 6 | Papaya (파파야) | 70px | 28 | X |
| 7 | Coconut (코코넛) | 82px | 36 | X |
| 8 | Pineapple (파인애플) | 95px | 45 | X |
| 9 | Durian (두리안) | 110px | 55 | X |
| 10 | Jackfruit (잭프루트) | 130px | 66 | X |

- 테마: **동남아 열대 과일**
- 각 과일은 PNG 이미지(256×256) + Canvas 프로시저럴 폴백 렌더링
- Lv 0~4만 랜덤으로 드롭 가능, Lv 5~10은 합체로만 생성

### 2.3 물리 엔진
- **Matter.js** 기반 물리 시뮬레이션
- 중력: `{ x: 0, y: 1.8 }`
- 반발 계수: 0.2~0.3
- 마찰: 0.3~0.5
- 과일 밀도: 레벨에 비례하여 증가 (`0.001 + level × 0.0003`)
- 3면 벽 (좌, 우, 바닥) — 상단 개방

---

## 3. 게임 상태(State) & 화면 구조

### 3.1 상태 머신

```
[닉네임 입력]
    ↓
[메뉴] ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
    ↓                           │
[플레이]                        │
    ↓                           │
[일시정지] ←──────────────┐    │
    ↓                    │    │
[게임오버애니메이션]      │    │
    ↓                    │    │
[게임오버]               │    │
    ├─ [리더보드]        │    │
    ├─ [설정]            │    │
    └─ [재시작/광고] ────┼────┘

게임 상태: 'menu' | 'playing' | 'paused' | 'gameoverAnim' | 'gameover'
```

### 3.2 주요 게임 메커닉

### 3.2 화면별 상세

#### 화면 1: 메뉴 (Menu)
- **타이틀**: "Durian Merge" + 서브타이틀 "Tropical Fruit Puzzle"
- **과일 프리뷰**: 5개 샘플 과일 (Lv 0, 2, 4, 6, 9) 표시
- **PLAY 버튼** (빨간색): 티켓 있을 때
- **WATCH AD 버튼** (초록색): 티켓 없을 때
- **최고점수 / 닉네임** 표시
- 전체 캔버스 렌더링 (DOM 요소 없음)

#### 화면 2: 게임플레이 (Playing)
- **상단 패널** (0~110px):
  - 좌측: 닉네임 + 남은 플레이 횟수 ("PLAYS: X")
  - 중앙: 현재 점수
  - 우측: 최고점수 + 다음 과일 미리보기 원형 영역
- **위험선** (Y=120): 빨간 점선, 과일 초과 시 깜빡임
- **게임 영역** (120~700px): 물리 시뮬레이션 + 과일 렌더링
- **드롭 가이드**: 세로 점선 + 반투명 과일 미리보기
- **벽/바닥**: 골드 컬러 장식

#### 화면 3: 게임오버 (Game Over)
- 반투명 검정 오버레이
- **점수 패널** (골드 테두리):
  - 최고점수 갱신 시: "NEW BEST!" 표시
  - 순위 표시
- **버튼 구성** (티켓 상태에 따라 동적):
  - 티켓 있음: `PLAY AGAIN` + `AD +1 Play` + `RANKING`
  - 티켓 없음: `WATCH AD` + `RANKING`
- 전면 광고(Interstitial) 자동 표시

#### 화면 4: 리더보드 (Leaderboard)
- 전체 화면 오버레이
- **상위 10명** 표시
- 메달 시스템: 1위(금), 2위(은), 3위(동)
- 컬럼: 순위, 플레이어명, 점수, 날짜
- 현재 플레이어 점수 빨간색 하이라이트
- BACK 버튼

#### 화면 5: 닉네임 입력 (Nickname)
- 최초 실행 시 브라우저 prompt 다이얼로그
- 최대 12자, 기본값 "Player"
- localStorage 저장

---

## 4. 사운드 시스템

| 효과음 | 설명 | 구현 방식 |
|--------|------|-----------|
| Drop | 통통 튀는 효과 (400→150Hz, 150ms) | Web Audio 합성 |
| Merge | 만족스러운 팝 (레벨별 피치 상승) | Web Audio 합성 + 하모닉스 |
| Game Over | 하강 톱니파 (400→80Hz, 800ms) | Web Audio 합성 |

- 외부 오디오 파일 없음 (모두 프로시저럴 합성)
- 볼륨: 0.1~0.3 (비침습적)
- **미구현**: 사운드 ON/OFF 토글, BGM

---

## 5. 수익화 시스템

### 5.1 AdMob 광고
| 유형 | 위치 | 타이밍 |
|------|------|--------|
| **배너** | 화면 하단 | 게임플레이 중 상시 |
| **전면(Interstitial)** | 전체 화면 | 게임오버 시 자동 표시 |
| **보상형(Rewarded)** | 전체 화면 | 사용자 선택 (+1 티켓 리워드) |

### 5.2 티켓(플레이 횟수) 시스템
- **매일 무료 2회** 제공 (자정 기준 리셋)
- 보상형 광고 시청 → **+1회** 추가
- **일일 미션 완료** → **+1회** 추가
- 게임 시작 시 1회 소모
- localStorage에 날짜와 함께 저장

### 5.3 미션 & 일일 챌린지
- **3개 일일 미션**: 매일 자정 자동 갱신
- 미션 유형:
  - 점수 목표 (300/500/1000점)
  - 합체 목표 (망고 3개, 용과, 파파야, 두리안)
  - 콤보 목표 (3x, 5x 콤보)
  - 플레이 목표 (3게임)
  - 합체 누적 (5/15회)
- 완료 시 티켓 리워드

---

## 6. 데이터 저장 (모두 localStorage + Firebase Firestore)

### 6.1 localStorage (로컬 데이터)

| 키 | 데이터 |
|----|--------|
| `durianMergeHighScore` | 최고 점수 |
| `durianMergeTickets` | 남은 횟수 + 날짜 |
| `durianMergeNickname` | 플레이어 닉네임 |
| `durianMergeUserId` | 유저 고유 UUID (내부 식별) |
| `durianMergeLeaderboard` | 로컬 리더보드 상위 20개 |
| `durianMergeBestCombo` | 최고 콤보 수 |
| `durianMergeTutorialDone` | 튜토리얼 완료 여부 |
| `durianMergeAnalytics` | 통계 (총 플레이, 플레이 시간, 합체 횟수) |
| `durianMergeMissions` | 현재 일일 미션 & 진행도 |
| `durianMergeSkin` | 선택된 스킨 ID |
| `durianMergeSkinUnlocks` | 언락된 스킨 목록 |

### 6.2 Firebase Firestore (클라우드 리더보드)

- **글로벌 리더보드**: 모든 플레이어 상위 점수 (실시간 동기화)
- **사용자 프로필**: 닉네임, 최고 점수, 통계

### 6.3 데이터 구조
- **오프라인**: localStorage만으로 완전 자동 저장
- **온라인**: Firebase Firestore에 선택적 동기화
- 서버 동기화 없음 (클라이언트 중심)

---

## 7. 비주얼 디자인 현황

### 7.1 컬러 팔레트
| 용도 | 색상 코드 | 설명 |
|------|-----------|------|
| 배경 | `#FFFAF0 → #FFF0D4` | 크림~베이지 그라데이션 |
| 외부 배경 | `#1A0F0A` | 다크 브라운 |
| 강조/골드 | `#DAA520`, `#B8860B` | 벽, 테두리, 텍스트 |
| 본문 텍스트 | `#2D1B0E` | 다크 브라운 |
| PLAY 버튼 | `#E53935` | 빨간색 |
| AD 버튼 | `#4CAF50` | 초록색 |
| RANKING 버튼 | `#5D4037` | 갈색 |

### 7.2 이펙트
- 버튼: 라운드 코너(6~16px) + 그림자 + 그라데이션
- 합체 이펙트: 확장 원형 링 + 스파클 파티클 6개
- 위험선 경고: 깜빡임 애니메이션
- 프로시저럴 과일 렌더링: 그라데이션, 패턴, 디테일

### 7.3 타이포그래피
- 폰트: "Fredoka" (Google Fonts), sans-serif fallback
- 크기: 9~38px (용도별 상이)
- 가중치: 400, 500, 600, 700

---

## 8. 빌드 & 배포 현황

### 8.1 빌드 환경
- JDK 21 (Capacitor 8 요구사항)
- Android SDK (`~/android-sdk`)
- Capacitor 8.1.0
- 빌드: `npm run build` → `npx cap sync` → `./gradlew assembleDebug`

### 8.2 앱 스토어 준비물 (완료)
- 앱 아이콘 512×512
- 피처 그래픽 1024×500
- 스크린샷 5종 (메뉴, 게임시작, 과일들, 쌓인상태, 게임오버)
- 스토어 설명문 (영문 + 한국어)

### 8.3 릴리스 전 필수 작업
- [ ] AdMob 테스트 ID → 실제 ID 교체
- [ ] AndroidManifest.xml 앱 ID 업데이트
- [ ] isTesting: false 설정
- [ ] 서명된 Release APK 생성
- [ ] 실기기 테스트

---

## 9. 현재 미구현 / 개선 필요 항목

### UI/UX 개선 필요
- [x] 사운드 ON/OFF 토글 버튼 (일시정지 패널에 구현)
- [x] 튜토리얼 / 도움말 화면 (ui.js에 구현)
- [x] 닉네임 입력 UI (인게임 커스텀 UI 구현)
- [x] 설정 화면 (일시정지 패널에 통합)
- [ ] BGM (프로시저럴 생성 가능)
- [x] 과일 드롭 시 시각 이펙트 (트레일/파티클 구현)
- [x] 트레일/파티클 이펙트 구현 완료
- [x] 과일 합체 시 화려한 연출 (확장 링 + 스파클)
- [x] 콤보 시스템 구현 (연속 합체 보너스, COMBO_WINDOW_MS = 1200ms)
- [x] 진동/햅틱 피드백 구현 (haptic.js)

### 기능 확장 가능
- [ ] iOS 버전 (Capacitor iOS)
- [x] 클라우드 리더보드 (Firebase Firestore)
- [ ] 광고 제거 인앱결제
- [ ] 애널리틱스 연동
- [ ] 과일 스킨 시스템
- [ ] 일일 챌린지 / 미션

---

## 10. 파일 구조 & 모듈 설명

```
durian-merge/
├── index.html                    # 메인 진입점 (Canvas + HTML UI 오버레이)
├── css/style.css                 # UI 스타일시트
├── js/
│   ├── game.js                   # 핵심 게임 루프 (1074줄)
│   │   ├─ 물리 시뮬레이션 & 입력 처리
│   │   ├─ 충돌/합체 로직
│   │   ├─ 이펙트 & 파티클 시스템
│   │   ├─ 게임오버 애니메이션
│   │   └─ 콤보 시스템 (COMBO_WINDOW_MS = 1200ms)
│   │
│   ├── fruits.js                 # 과일 정의 11종 + Canvas 프로시저럴 렌더링
│   ├── physics.js                # Matter.js 엔진 래퍼 (130줄)
│   ├── sounds.js                 # Web Audio 프로시저럴 합성 SFX + BGM (622줄)
│   ├── haptic.js                 # 진동 피드백 (Capacitor + navigator.vibrate)
│   ├── tickets.js                # 일일 플레이 횟수 시스템 (localStorage)
│   ├── nickname.js               # 닉네임 관리 (localStorage)
│   ├── ranking.js                # 로컬 리더보드 (상위 20개, localStorage)
│   │
│   ├── ui.js                     # HTML 기반 UI 매니저 (983줄)
│   │   ├─ 화면 전환 (menu/playing/paused/gameover/leaderboard/settings)
│   │   ├─ 일시정지 패널 (음소거, 진동, 튜토리얼)
│   │   ├─ 닉네임 입력 커스텀 UI
│   │   └─ 게임오버 패널 & 팝업
│   │
│   ├── firebase-leaderboard.js   # Firebase Firestore 글로벌 리더보드 (151줄)
│   ├── analytics.js              # 로컬 통계 트래킹 (268줄)
│   │   ├─ 총 플레이 수, 플레이 시간, 과일별 합체 통계
│   │   └─ 일일 기록
│   │
│   ├── missions.js               # 일일 미션 시스템 (283줄)
│   │   ├─ 점수, 합체, 콤보 미션
│   │   ├─ 매일 3개 랜덤 선택 (시드 기반)
│   │   └─ 완료 시 티켓 리워드
│   │
│   ├── skins.js                  # 과일 스킨 시스템 (186줄)
│   │   ├─ Tropical (기본)
│   │   ├─ Jewels (5000점 이상 언락)
│   │   ├─ Emoji 등 테마
│   │   └─ 언락 조건 & 선택
│   │
│   ├── tutorial.js               # 튜토리얼 & 도움말 (164줄)
│   ├── admob.js                  # AdMob 광고 (147줄)
│   │   └─ 배너, 전면, 보상형 광고
│   │
├── assets/fruits_clean/          # 과일 PNG 11개 (256x256)
├── android/                      # Capacitor Android 프로젝트
├── www/                          # 빌드 출력 디렉토리 (npm run build)
├── capacitor.config.json         # Capacitor 설정
├── package.json                  # NPM 의존성
├── durian-merge-release.keystore # 서명 키
└── CLAUDE.md                     # 프로젝트 가이드
```

**총 코드량**: ~4,500줄 (JS 기준)

---

## 11. 게임 루프 플로우

```
【 초기화 단계 】
1. HTML 로드
   └── Firebase CDN → Matter.js CDN → 모듈 JS 로드 (순서 중요)

2. Game.init()
   ├─ Canvas 초기화
   ├─ 과일 이미지 로드
   ├─ 물리엔진 초기화
   ├─ localStorage 복구 (점수, 티켓, 닉네임)
   ├─ 튜토리얼 상태 확인
   └─ UI 초기화

【 메뉴 상태 】
3. showScreen('menu')
   ├─ 타이틀 & 게임 소개 표시
   ├─ 티켓 확인 (부족 시 WATCH AD 버튼)
   ├─ 토글: 최고점수 / 일일 미션 탭
   └─ 탭 대기

【 게임 플레이 】
4. showScreen('playing')
   ├─ 티켓 -1 소비
   ├─ HUD 표시 (점수, 최고점수, 다음 과일)
   ├─ 드롭 레벨 랜덤화 (Lv 0~4)
   └─ 루프 시작

5. 메인 게임 루프 (requestAnimationFrame)
   ├─ 입력 처리:
   │  ├─ pointerdown → dropX 업데이트
   │  ├─ pointermove → dropX 업데이트
   │  └─ pointerup → 과일 드롭 (쿨다운 확인)
   │
   ├─ 물리 업데이트 (60fps):
   │  ├─ Matter.js step()
   │  ├─ 충돌 감지 (collision + collisionActive)
   │  └─ 합체 로직 (같은 레벨끼리만)
   │
   ├─ 게임 상태 체크:
   │  ├─ 합체 시 점수, 콤보, 이펙트 생성
   │  ├─ 위험선(Y=100) 체크 → 2초 타이머 → 게임오버
   │  └─ 높은 레벨 도달 시 토스트 팝업
   │
   └─ 렌더링:
      ├─ 배경 그라데이션
      ├─ 벽/바닥 (골드)
      ├─ 물리 체가 (과일)
      ├─ 파티클/이펙트
      ├─ 점수 팝업
      ├─ 콤보 표시
      └─ 드롭 가이드 (세로 점선 + 미리보기)

6. 게임 오버
   ├─ 1.5초 감소 애니메이션 (gameoverAnim)
   ├─ 최고점수 갱신 확인 (NEW BEST!)
   ├─ 순위 계산 (로컬 리더보드)
   ├─ 미션 진행도 업데이트
   ├─ localStorage 저장 (점수, 통계, 미션)
   ├─ 전면 광고 자동 표시 (AdMob)
   └─ showScreen('gameover')

【 게임 오버 화면 】
7. 결과 패널
   ├─ 최종 점수 표시
   ├─ 새 최고점수 표시 (있으면)
   ├─ 순위 표시
   ├─ 단계적 버튼 활성화:
   │  ├─ PLAY AGAIN (티켓 1 이상)
   │  ├─ WATCH AD (보상형 광고)
   │  ├─ RANKING (로컬 + 글로벌 리더보드)
   │  └─ HOME (메뉴로 돌아가기)
   └─ 탭 대기

【 추가 화면 】
8. 일시정지 (showScreen('paused'))
   ├─ 사운드 ON/OFF 토글
   ├─ 진동 ON/OFF 토글
   ├─ 닉네임 변경
   ├─ 스킨 선택
   ├─ 도움말 보기
   └─ 메뉴로 이동

9. 리더보드 (showScreen('leaderboard'))
   ├─ 로컬 리더보드 (상위 20)
   ├─ 글로벌 리더보드 (Firebase, 탭)
   └─ BACK 버튼

10. 튜토리얼 (showScreen('tutorial'))
    ├─ 슬라이드 기반 5단계
    └─ SKIP / NEXT 버튼

11. 설정 (showScreen('settings'))
    ├─ 닉네임 변경
    ├─ 스킨 선택 & 언락 조건
    ├─ 사운드/진동 설정
    ├─ 데이터 초기화 옵션
    └─ BACK 버튼
```

---

## 12. 성능 & 최적화

### 12.1 프레임 타겟
- **60 FPS** (16.67ms per frame)
- 프레임 throttling 구현 (고주사율 기기 대응)
- 모바일 저사양(A17 등)에서도 안정적

### 12.2 최적화 기법
- **파티클 풀링**: 300개 파티클 재사용 (GC 압력 감소)
- **배치 저장**: 한 프레임 내 여러 localStorage 쓰기 → 마지막에 flush()
- **이벤트 위임**: Canvas 입력 한 곳에서 처리
- **물리 연산 캐싱**: Matter.js body 재사용
- **렌더링 최적화**:
  - 배경 그라데이션 캐시
  - 불필요한 redraw 회피
  - 캔버스 크기 조정 최소화

### 12.3 메모리 관리
- 파티클 풀 사용 → 동적 할당 최소화
- 이펙트 제거 시 생성/업데이트/렌더 3곳 모두 정리
- FruitAlbum 캐싱 (Set) → localStorage 접근 최소화

---

*이 PRD는 2026-03-05 기준 현재 구현 상태를 반영합니다.*
*실제 구현: game.js(1074줄), ui.js(983줄), sounds.js(622줄) 등 총 ~4,500줄*
