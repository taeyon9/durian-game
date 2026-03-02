# Phase 1: fruit-drop 출시 전 폴리시 디자인

## 개요
fruit-drop 출시 전 비주얼 이펙트 강화, 튜토리얼 추가, Firebase 글로벌 리더보드 연동.
병렬 진행하여 빠르게 마무리 후 스토어 출시.

---

## 1. 비주얼 이펙트 (안 B: 주스감 극대화)

### 합체 이펙트 강화
- 기존 원형 링 + 스파클 유지
- 점수 팝업: 합체 지점에서 "+15" 텍스트가 위로 떠오르며 페이드아웃
- 파티클: 8→12개, 크기 랜덤(2~5px), 과일 색상 반영
- 빛 번짐(glow): 합체 지점에서 과일 색상 원형 glow가 번졌다 사라짐
- 화면 쉐이크: Lv5+ 고레벨 합체 시 미세 쉐이크

### 드롭 이펙트
- 낙하 시 뒤에 원형 파티클 3~4개 트레일
- 과일 색상 기반, 0.3초 페이드아웃
- 매 3프레임마다 파티클 생성 (성능 최적화)

### 콤보 연출
- 2콤보 이상: 화면 테두리가 골드로 잠깐 빛남 (border pulse)

### 스쿼시 & 스트레치
- 과일이 바닥/다른 과일에 부딪힐 때 살짝 찌그러졌다 복원

---

## 2. 튜토리얼

- 트리거: 첫 게임 시작 시 (localStorage `fruitDropTutorialDone` 없으면)
- 방식: 게임 화면 위 반투명 오버레이 + 툴팁

### 흐름 (2단계)
1. 게임 시작 → "좌우로 드래그해서 위치를 정하세요!" + 손가락 아이콘 애니메이션
2. 첫 드롭 성공 → "같은 과일끼리 합치면 진화!" (2초 후 자동 사라짐)
3. `fruitDropTutorialDone = true` 저장

---

## 3. Firebase 글로벌 리더보드

### 데이터 구조 (Firestore)
```
scores/{docId}
├── name: string        // 닉네임
├── score: number       // 점수
├── country: string     // "KR", "TH" 등
├── createdAt: Timestamp
```

### 탭 구성
| 탭 | 쿼리 | 설명 |
|---|---|---|
| All Time | orderBy score desc, limit 50 | 전체 역대 순위 |
| Weekly | where createdAt >= 이번주 월요일 | 주간 순위 |
| Country | where country == 내 국가 + 국기 이모지 | 내 나라 순위 |

### 국가 감지
- `navigator.language` → "ko-KR" → "KR" 추출
- 국기 이모지 자동 변환 (KR → 🇰🇷)
- 별도 API/플러그인 불필요

### 보안
- Firestore Rules: 쓰기는 본인 점수만, 읽기는 전체 허용
- 점수 위변조 방지는 v1에서 스킵 (나중에 Cloud Functions로 보강 가능)

### 오프라인 폴백
- 온라인: Firebase 저장 + 조회
- 오프라인: 기존 localStorage 리더보드 사용

---

*승인일: 2026-03-02*
