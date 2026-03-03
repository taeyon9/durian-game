# Release Checklist

## AdMob 설정
- [ ] `admob.js` — Test Ad ID를 실제 Ad Unit ID로 교체
  - `BANNER_ID`
  - `INTERSTITIAL_ID`
  - `REWARDED_ID`
- [ ] `admob.js` — `isTesting: true` → `isTesting: false` 변경 (4곳)
  - `initializeForTesting`
  - `showBanner`
  - `prepareInterstitial`
  - `prepareRewardVideoAd`

## Firebase 설정
- [ ] `game.js` — Firebase config를 실제 프로젝트 값으로 교체
  - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

## 디버그 코드 확인
- [ ] `console.log` / `console.debug` 호출이 없는지 확인
- [ ] `triggerGameOver`가 외부에 노출되지 않는지 확인 (`return { init }`)
- [ ] DEBUG 주석 블록이 모두 제거되었는지 확인

## 빌드 & 배포
- [ ] `npm run build` 정상 동작 확인
- [ ] `npx cap sync android` 실행
- [ ] 서명된 릴리스 APK 빌드 (`assembleRelease`)
- [ ] 실기기 테스트 (Android)
  - [ ] 배너 광고 노출
  - [ ] 전면 광고 동작
  - [ ] 리워드 광고 동작
  - [ ] 게임 플레이 정상
  - [ ] 리더보드 동작
  - [ ] 햅틱/사운드 동작

## 스토어 등록
- [ ] 스크린샷 준비
- [ ] 앱 설명 작성
- [ ] 개인정보 처리방침 URL 준비
