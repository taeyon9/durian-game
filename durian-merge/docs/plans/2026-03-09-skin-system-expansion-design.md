# Skin System Expansion Design

## Overview
스킨 시스템을 3종 → 14종으로 확장. 프로시저럴(무료/저가) + PNG 에셋(프리미엄) 혼합 전략.
PNG 프리미엄은 프로시저럴 플레이스홀더로 시작, 에셋 준비되면 교체.

## Skin Lineup

### Procedural Skins (9종)

| # | ID | Name | Type | Rendering | Unlock Condition |
|---|---|---|---|---|---|
| 1 | tropical | Tropical | default | PNG images | Free (default) |
| 2 | jewels | Jewels | recolor | Gem gradient + sparkle | 50,000 total pts |
| 3 | emoji | Emoji | emoji | Color circle + emoji text | 30 games played |
| 4 | neon | Neon | neon | Black circle + neon glow border | 10,000 pts in single game |
| 5 | pastel | Pastel | pastel | Soft pastel gradients | 7-day login streak |
| 6 | mono | Monochrome | mono | Single tone (sepia) | 8+ fruits in album |
| 7 | galaxy | Galaxy | galaxy | Dark bg + stars/sparkle | 30,000 pts in single game |
| 8 | pixel | Pixel | pixel | Square-based 8bit style | 30 missions completed (cumulative) |
| 9 | candy | Candy | candy | Stripe/swirl patterns | 100 combos in single game |

### PNG Premium Skins (5종, placeholder until assets ready)

| # | ID | Name | Assets Folder | Unlock Condition |
|---|---|---|---|---|
| 10 | desserts | Desserts | assets/skins/desserts/ | 200,000 total pts |
| 11 | sea | Sea Creatures | assets/skins/sea/ | 100 games played |
| 12 | space | Space | assets/skins/space/ | 50,000 pts in single game |
| 13 | halloween | Halloween | assets/skins/halloween/ | Season (Oct) + 30 games in season |
| 14 | christmas | Christmas | assets/skins/christmas/ | Season (Dec) + 7-day streak in season |

### Asset Spec (PNG skins)
- 11 images per skin: `01.png` ~ `11.png` (256x256, transparent bg)
- Small→Large progression matching FRUITS order
- Stored in `assets/skins/{skinId}/`

## Unlock Condition Types

| Condition | Key | Description |
|---|---|---|
| totalScore | cumulative score across all games | |
| gamesPlayed | total games played | |
| singleGameScore | highest score in one game | |
| loginStreak | consecutive daily logins | |
| albumCount | number of fruits unlocked in album | |
| missionsCompleted | cumulative missions completed | |
| singleGameCombos | most combos in one game | |
| season | time-gated + sub-condition | |

## Tier Structure

| Tier | Skins | Future Monetization |
|---|---|---|
| Free | tropical | Always free |
| Free (conditional) | jewels, emoji | Auto-unlock on condition met |
| Low | neon, pastel, mono | Low credit price OR condition |
| Mid | galaxy, pixel, candy | Mid credit price OR condition |
| Premium | desserts, sea, space | High credit price OR IAP |
| Season | halloween, christmas | Season-limited credit/IAP |

## Rendering Types

### Existing
- `default`: PNG image (tropical only)
- `recolor`: Radial gradient + gem sparkle highlights
- `emoji`: Color circle + emoji text overlay

### New Procedural Types
- `neon`: Black fill + colored strokeStyle glow (multiple strokes with decreasing alpha)
- `pastel`: Soft radial gradient with high-lightness colors, subtle inner shadow
- `mono`: Single hue gradient (sepia/blue tone), desaturated look
- `galaxy`: Dark purple/navy fill + random white dots (stars) + radial highlight
- `pixel`: Rounded rect instead of circle, pixelated color blocks pattern
- `candy`: Conic gradient or stripe pattern with 2-3 alternating colors

### Future Image Type
- `image`: Same as `default` but loads from `assets/skins/{skinId}/` instead of `assets/fruits_clean/`

## Notes
- Credit/currency system design deferred to separate doc
- Premium skins launch as procedural placeholders, swap to `image` type when assets ready
- IAP integration planned for future
