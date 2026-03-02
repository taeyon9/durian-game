# Fruit Drop - Design System

## Color Palette

### Brand Colors (아이콘/스플래시/Feature Graphic 기준)
브랜딩 이미지의 배경색: **Dark Teal Emerald** (~#005048)

### CSS Variables

| Token | Value | 용도 |
|-------|-------|------|
| `--bg-dark` | `#041E1A` | 최하위 배경 (body, canvas, overlay) |
| `--bg-card` | `#093532` | 카드, 패널, 입력창 배경 |
| `--bg-panel` | `rgba(9,53,50,0.97)` | 바텀시트 등 반투명 패널 |
| `--gold` | `#FFD700` | 주요 강조 (점수, 랭크, 활성탭) |
| `--gold-dim` | `#B8860B` | 보조 강조 (레이블, 테두리) |
| `--gold-glow` | `rgba(255,215,0,0.25)` | 골드 글로우 이펙트 |
| `--red` | `#E53935` | 경고, CTA 버튼 |
| `--green` | `#2B9E80` | 토글 활성 상태 |
| `--white` | `#FFFAF0` | 제목, 점수 등 핵심 텍스트 |
| `--text` | `#E8E0D4` | 기본 본문 텍스트 |
| `--text-dim` | `#7A9A8F` | 보조 텍스트, 비활성 |

### Canvas Colors (game.js)

| 용도 | Value |
|------|-------|
| 배경 | `#041E1A` |
| 벽/바닥 | `#0D6B5E` |
| 배경 그라데이션 상단 | `rgba(13,80,70,0.3)` |
| 배경 그라데이션 하단 | `rgba(4,30,26,0)` |

### Gradient Definitions

| 용도 | Gradient |
|------|----------|
| Play 버튼 | `linear-gradient(180deg, #FF5252, #D32F2F)` |
| Gold 버튼 | `linear-gradient(180deg, #FFD700, #B8860B)` |
| HUD 상단 | `linear-gradient(180deg, rgba(4,30,26,0.95), rgba(4,30,26,0))` |
| Share 카드 | `linear-gradient(135deg, #104A42, #041E1A)` |

### Medal Colors

| 등급 | Value |
|------|-------|
| Gold | `#FFD700` |
| Silver | `#C0C0C0` |
| Bronze | `#CD7F32` |

---

## Typography

| 용도 | Size | Weight | Color |
|------|------|--------|-------|
| 메뉴 타이틀 | 42px | 700 | `--white` |
| 게임오버 점수 | 56px | 700 | `--white` |
| HUD 점수 | 32px | 700 | `--white` |
| 레이블 | 10-13px | 600 | `--gold-dim` |
| 본문 | 14px | 500 | `--text` |
| 보조 | 11-13px | 400-600 | `--text-dim` |
| 콤보 팝업 | 28px | 700 | `--gold` |
| Font family | `Fredoka` | | |

---

## Spacing & Radius

| Token | Value |
|-------|-------|
| `--radius` | `16px` |
| `--radius-sm` | `10px` |
| 버튼 radius | `50px` (pill shape) |

---

## Opacity Conventions

| 용도 | Opacity |
|------|---------|
| 테두리 (강) | `0.12 - 0.15` |
| 테두리 (약) | `0.06 - 0.08` |
| 배경 틴트 | `0.05 - 0.08` |
| 비활성 아이콘 | `0.5 - 0.6` |
| 글로우 | `0.25` |
| 모달 뒷배경 | `0.6` |

---

## Design Principles

1. **Dark Teal Base**: 모든 배경은 틸/에메랄드 계열 다크톤
2. **Gold Accent**: 강조, 활성 상태, 점수는 골드
3. **Red for Action**: CTA 버튼(Play), 경고는 레드
4. **Warm Text on Cool BG**: 크림/베이지 텍스트로 가독성 확보
5. **Consistent with Branding**: 아이콘/스플래시의 다크 에메랄드 톤과 일치
