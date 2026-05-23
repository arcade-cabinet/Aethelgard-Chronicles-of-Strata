# UI and HUD

> **M_ARCH_UNIFY cross-reference (added 2026-05-23).** Pre-dates the
> unified Thing/Skin registry. The 4-layer model — Archetypes → Things
> → Slots → Skins — is the authoritative architectural shape for every
> visual/data fork in the codebase. See:
>
> - `docs/specs/103-particle-archetype.md` — keystone architectural pass
> - `docs/specs/10-architecture.md` — pillar's full M_ARCH_UNIFY block
> - `src/rules/building-profiles.ts` — Thing registry (M_REGISTRY.5)
> - `src/rules/unit-profiles.ts` — Thing registry (M_REGISTRY.1)
> - `src/rules/skins.ts` — Skin slot (M_REGISTRY.3/4/2)
>
> Per-section notes below mark where THIS pillar's text became
> superseded or extended by the unified-registry doctrine.

All HUD components are implemented using Radix UI primitives and framer-motion
transitions. The source reference for all layout, styling, and element structure is
`references/poc2.html`.

## Technology

| Concern | Library |
|---|---|
| Modal dialogs | `@radix-ui/react-dialog` |
| Health / build progress bars | `@radix-ui/react-progress` |
| Hover tooltips (unit stats, building info) | `@radix-ui/react-tooltip` |
| Component composition | `@radix-ui/react-slot` |
| Panel slide-in, popup float, modal fade | `framer-motion` |
| Fonts | Metamorphous (headings), Inter (body) via Google Fonts |

## Launcher

The launcher (`#launcher`) is a full-screen overlay shown before the game starts.
It fades out when the player clicks "Enter Realm". Source: poc2.html lines 37–95.

Layout:
- Centred flex column.
- **Brand block** (`.launcher-brand`): `<h1>Aethelgard</h1>` in Metamorphous,
  gradient text `135deg, #fef08a → #f59e0b → #b45309`, 3.5rem.
  Subtitle `<p>Chronicles of Strata</p>` in Inter, uppercase, accent blue `#38bdf8`,
  letter-spacing 4px.
  The entire block has a floating animation (translateY 0 → -10px → 0, 6s loop).
- **Seed setup panel** (`.seed-setup`): glassmorphism card, `max-width: 440px`,
  backdrop blur 15px, border `rgba(255,255,255,0.12)`.
  - Title: "Seeded World Generation" in Metamorphous.
  - Input row: text input (`#seed-phrase`) + randomize button (🎲 dice emoji).
    Input: dark background, blue border `rgba(56,189,248,0.3)`, Inter bold, centered.
    Randomize button: gold-tinted background, gold border on hover.
  - "Enter Realm" button: full-width, blue gradient `#38bdf8 → #0284c7`, Metamorphous
    1.2rem, lifts on hover (`translateY(-2px)`).

The randomize button calls `randomizeSeed()` which picks two adjectives and a noun
from seeded word lists and fills the input. The word lists are hard-coded in
`src/game/seed.ts`.

## In-Game HUD Layout

The HUD (`#hud`) is positioned `top: 20px; left: 20px; width: 320px`. It has
`opacity: 0` initially and transitions to `opacity: 1` when the game starts.
Source: poc2.html lines 97–255.

### Resource Panel (`.panel`)

The primary panel has three sub-sections:

**Game header** (`.game-header`):
- Title `<h2>Aethelgard</h2>` in Metamorphous, gradient white→`#38bdf8`.
- Seed badge (`.seed-badge`): monospace, small, grey `#94a3b8`, shows the current
  seed phrase.

**Inventory grid** (`.inventory`):
- 4-column grid showing Gold, Wood, Stone, Supply.
- Colors: Gold `#fbbf24`, Wood `#f97316`, Stone `#94a3b8`, Supply `#a855f7`.
- Label text: 0.6rem uppercase, letter-spacing 0.5px.
- Supply shows `current/max` format.

**Selection panel** (`.selection-panel`, `#sel-panel`):
- Hidden by default (`display: none`); shown when a unit or building is selected.
- Type label (`.selection-title`): "Unit" or "Building", small uppercase grey.
- Name (`.selection-name`): green `#4ade80`, 1.1rem bold — the unit/building name.
- Task (`.selection-task`): yellow `#fde047`, 0.8rem — current activity description.
- Health bar: 6px tall progress bar, green → yellow → red based on HP fraction.
- Action grid (`.action-grid` / `#sel-actions`): dynamically populated buttons.
  Standard game buttons: dark background, blue border, Inter uppercase 0.75rem.

**Global actions row** (`.global-actions`):
- "Idle Peon" button: green-tinted, selects the next idle peon.
- "Select Army" button: purple-tinted, selects all military units.

**Track Camera toggle**: checkbox labelled "Track Camera". When checked, the camera
follows the selected unit.

**Message area** (`#message`): green text, centered, shows brief status messages
(e.g., "Not enough gold!", "Barracks under construction...").

### Minimap (bottom-right)

`#minimap-container`: `position: absolute; bottom: 25px; right: 25px; width: 130px;
height: 130px`. Dark panel background, blue border `rgba(56,189,248,0.3)`, 14px
border-radius. Source: poc2.html lines 156–163.

Contains `#minimap-canvas`: a `<canvas>` element rendered via 2D canvas API (not
Three.js). Drawn each frame: one pixel per hex tile, colored by biome. Player units
shown as white dots; enemies as red dots; buildings as colored squares.

### Weather Indicator

`#weather-hud`: `position: absolute; top: 20px; right: 140px`. Small panel, uppercase
text. Shows the current weather emoji + label: "☀️ Sunny Skies", "🌫️ Thick Fog",
"🌧️ Heavy Rain". Source: poc2.html line 258.

### Sound Toggle

`.sound-toggle`: `position: absolute; top: 20px; right: 20px`. Small button panel,
"🔊 Audio ON" toggles to "🔇 Audio OFF". Source: poc2.html line 277.

## Win / Loss Modal

`#game-over-modal`: full-screen overlay, `z-index: 1000`, dark background
`rgba(3,7,18,0.9)`. Implemented as a Radix `<Dialog>` so it is accessible (focus
trap, escape to dismiss is disabled — game over is final until reload).
Source: poc2.html lines 191–204.

Modal box (`.modal-box`):
- Padding 40px, border-radius 24px, blue border `rgba(56,189,248,0.4)`, max-width 450px.
- **Victory title** (`.modal-title-win`): Metamorphous 2.8rem, gold `#fbbf24`,
  gold glow shadow, "Victory!".
- **Defeat title** (`.modal-title-loss`): Metamorphous 2.8rem, red `#ef4444`,
  red glow shadow, "Defeat!".
- Description `<p>`: "You have vanquished the Goblins of Strata." (win) or
  "Your Town Hall has fallen." (loss). Slate `#94a3b8`.
- Stat lines: Gold Earned, Lumber Harvested, Enemies Vanquished. Each is a flex row
  with the value in accent blue.
- "Re-enter Aethelgard" button: same style as launcher "Enter Realm" button.

## framer-motion Transitions

| Element | Transition |
|---|---|
| HUD panel appearance | `initial: { x: -40, opacity: 0 }` → `animate: { x: 0, opacity: 1 }`, 0.4s ease-out |
| Floating combat popup | `initial: { y: 0, opacity: 1, scale: 0.6 }` → `animate: { y: -80, opacity: 0, scale: 0.9 }`, 1.6s cubic-bezier |
| Win/loss modal | `initial: { opacity: 0, scale: 0.9 }` → `animate: { opacity: 1, scale: 1 }`, 0.3s ease |
| Launcher fade-out | `animate: { opacity: 0 }`, 0.8s ease, then `display: none` |
| Weather indicator update | `animate: { opacity: [0, 1] }`, 0.4s on each weather change |

## Floating Labels Container

`#labels-container`: a `position: absolute; top: 0; left: 0; width: 100%; height: 100%;
pointer-events: none; z-index: 5` div. Combat text popups and resource pickups are
appended here as absolutely positioned elements whose world-space position is projected
to screen coordinates each frame. Source: poc2.html line 186–188.
