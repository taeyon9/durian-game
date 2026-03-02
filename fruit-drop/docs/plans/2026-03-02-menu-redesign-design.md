# Menu Screen Redesign - Design Document

## Problem
- Background is bland (dark solid `#041E1A`, no visual elements)
- Fruit previews are tiny (44px) and lack presence
- No animation, feels static and lifeless for a tropical fruit game
- Button hierarchy issues: Ranking too prominent, ticket info awkwardly placed, no clear grouping
- Disconnect between rich splash screen identity and dull menu screen

## Design: CSS Emotion Upgrade

### 1. Background & Color (Splash-matched)

**Gradient**: Emerald green to match splash/icon identity
- Top: `#064A3E` (darker)
- Center: `#0A7B61` (main emerald, matches splash)
- Bottom: `#053D33` (dark again)
- Radial glow behind hero area for depth

**Gold Sparkles**: CSS pseudo-elements or small divs
- 5-8 sparkle elements (`✦` shape), various sizes (6-16px)
- Twinkling animation (opacity pulse, 2-4s cycle, staggered)
- Concentrated at top and bottom edges (matching splash layout)

**Bokeh**: 2-3 soft gold circles (`rgba(255,215,0,0.08-0.12)`)
- Slow float animation (10-15s cycle)
- Large size (60-100px), heavily blurred

### 2. Title & Hero

**Title "Fruit Drop"**:
- White text -> gold gradient (`#FFD700` -> `#FFA500`)
- `-webkit-background-clip: text` for gradient effect
- Subtle text-shadow glow (`0 0 30px rgba(255,215,0,0.3)`)

**"TROPICAL MERGE" subtitle**:
- Current `--gold-dim` -> brighter gold `#DAA520`

**Fruit Hero Area**:
- Current: 5 small (44px) canvases in a row
- New: 3 larger fruits (center ~100px, sides ~70px)
- Floating animation with staggered timing (CSS keyframes)
- Slight perspective: center fruit larger, sides slightly smaller and rotated

### 3. Button Hierarchy

**PLAY button**:
- Red gradient -> **gold gradient** (`#FFD700` -> `#E5A800`)
- Color: dark text (`#2D1B0E`)
- Keep large size, prominent shadow
- Shadow: `0 4px 20px rgba(255,215,0,0.4)`

**Ticket info**:
- Move directly below PLAY button as subtle text
- `🎟️ 5 plays left today`
- Small font (12px), dim color

**Ranking**:
- Remove outline button entirely
- Replace with text link: `🏆 Ranking ->`
- Positioned below ticket info with spacing
- Font 13px, gold color, no border/background

**Player info** (nickname + best): Keep current card style, no changes

### 4. CSS Variables Update

```
--bg-dark: #064A3E (was #041E1A)
--bg-card: #0A5C4A (was #093532)
--bg-panel: rgba(6,74,62,0.97) (was rgba(9,53,50,0.97))
```

Note: These variable changes affect all screens. Need to verify gameover, leaderboard, settings still look good.

## Files to Modify
- `css/style.css` — background, sparkles, bokeh, title, button styles, menu layout
- `index.html` — sparkle elements, restructure menu-actions, change Ranking from button to link
- `js/ui.js` — update renderMenuFruits() for larger 3-fruit layout

## Out of Scope
- Game over screen redesign
- Leaderboard screen redesign
- Sound/haptic changes
- Canvas background animation (rejected approach B)
