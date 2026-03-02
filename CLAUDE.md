# Game Factory - 공통 가이드

## 프로젝트 구조
```
game/
├── CLAUDE.md          ← 이 파일 (게임 공통 레슨런)
├── fruit-drop/        ← 첫 번째 게임 (동남아 열대과일 머지 퍼즐)
└── [next-game]/       ← 다음 게임
```

## 기술 스택 (기본)
- Vanilla JS + Canvas 2D (프레임워크 없음)
- Matter.js (물리 엔진 필요 시)
- Web Audio API (프로시저럴 사운드 합성, 외부 파일 없음)
- Capacitor 8 (Android/iOS 빌드)
- AdMob (수익화)

## 게임 개발 컨벤션
- 한국어로 소통, 코드/변수명은 영문
- PRD.md를 각 게임 루트에 작성 (현재 구현 상태 반영)
- 모든 렌더링은 Canvas 기반 (DOM 요소 최소화)
- 사운드는 Web Audio API로 프로시저럴 합성 (외부 오디오 파일 없음)
- 모바일 퍼스트 (터치 입력 기본)

## 레슨런

### fruit-drop에서 배운 것
- Canvas 게임에서 상태머신(state machine) 패턴이 화면 전환에 효과적
- Matter.js 물리 파라미터 튜닝이 게임 느낌을 크게 좌우함 (중력, 반발, 마찰, 밀도)
- 프로시저럴 과일 렌더링 + PNG 이미지 폴백 조합이 유연함
- localStorage만으로 오프라인 게임 데이터 관리 충분
- 티켓 시스템 + 보상형 광고 조합이 기본 수익화 모델

## 보안 (원격 저장소 업로드 금지 항목)
- **API 키/시크릿**: Firebase config, AdMob 실제 ID 등 절대 코드에 하드코딩 금지
  - 코드 내 placeholder(`YOUR_API_KEY` 등)는 OK, 실제 값은 별도 파일이나 환경변수로 관리
  - 실제 키가 들어간 파일은 `.gitignore`에 등록 필수
- **서명 관련**: keystore, 서명 비밀번호, release 인증서 (`.keystore`, `.jks`, `.p12`, `.pem`)
- **환경 파일**: `.env`, `google-services.json`, `GoogleService-Info.plist`
- **금전 관련**: AdMob 실제 광고 단위 ID, 결제 관련 설정
- `.gitignore`에 위 항목이 모두 포함되어 있는지 커밋 전 확인할 것

## 빌드 & 배포
- JDK 21 + Android SDK (`~/android-sdk`)
- `npm run build` → `npx cap sync` → `./gradlew assembleDebug`
- 릴리스 전: AdMob 테스트 ID → 실제 ID, isTesting: false, 서명된 APK
