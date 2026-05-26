---
title: Player Journey
updated: 2026-05-22
status: current
domain: product
---

# 10 — Player Journey

The scene-by-scene path a player walks from launch to a finished match. Each
transition has a stable selector and is targeted by an e2e test in
`tests/e2e/`. The journey applies on both desktop and Pixel-5a-class mobile;
viewport differences are layout-only, not flow.

## Scenes

### S1 — Title Screen (cold launch)

- App boots to the title screen — `#title-screen`.
- Three buttons:
  - `#menu-new-game` — opens the New Game modal (S2).
  - `#menu-continue` — visible only when a save exists; loads the AutoSave
    and jumps directly to Gameplay (S4).
  - `#menu-settings` — opens the Settings modal.
- Decorative low-poly hex board, mute toggle, version line.

### S2 — New Game Modal

- `#new-game-modal` Radix Dialog.
- Inputs: seed phrase (`#seed-input`), map-size segment (`#size-small` /
  `-medium` / `-large` / `-huge`), difficulty segment (`#diff-easy` /
  `-normal` / `-hard`).
- Footer: `#regenerate-seed` (mints a fresh adjective-adjective-noun) and
  `#begin-game` (commits the choices, advances to S3).
- Each opening of the modal mints a *fresh event PRNG seed* (spec 96) —
  saved only when `#begin-game` commits.

### S3 — First-run Onboarding (once per device)

- On first-ever launch only, a `#onboarding-overlay` Dialog appears OVER
  the freshly-mounted game (S4 is rendering underneath).
- 4 short steps teach: kingdom + enemy + win condition, autonomous peons,
  the build menu, defending against encroachment.
- `Skip` or completing step 4 sets the Preferences `onboardingSeen` flag —
  never shown again. (Returning players go straight from S2 → S4.)

### S4 — Gameplay

- The main `<canvas>` (not `#minimap-canvas`) hosts the r3f scene.
- Always-on HUD:
  - `#resource-bar` (top-left, top-center on portrait) — wood/stone/gold/
    supply readouts.
  - `#minimap-canvas` (bottom-right) — zoom + control overview.
  - `ZoneLegend` pill (top-left under the resource bar) — teaches the
    territory visual language.
  - `SoundToggle`.
- Tapping a tile selects what's on it (your Palace, a peon, a unit, an
  enemy you can see). Selection opens the `#selection-panel`:
  - Palace → build menu (6 buttons: Farm / House / Granary / Barracks /
    Watchtower / Wall).
  - Barracks → research buttons + rally point setter.
- Peons autonomously harvest the nearest resource in your zone; the zone
  grows visibly (blue border) as they exploit tiles. The enemy AI does the
  same on its side (red border). Encroachment pulses yellow; defend before
  the grace window expires.

### S5 — Victory or Defeat (end of match)

- Win condition: enemy `FactionBase` Health hits 0 → `#game-over-modal`
  shows `Victory!` (gold) with stats + a `Re-enter` button.
- Loss condition: player `FactionBase` Health hits 0 → same modal shows
  `Defeat!` (red).
- Re-enter reloads the app — back to S1.

## E2E coverage (M9.3a)

One Playwright test per transition, all in `tests/e2e/`:

| Test | Transition |
|---|---|
| `title-to-new-game.e2e.spec.ts` | S1 → S2 |
| `new-game-to-gameplay.e2e.spec.ts` | S2 → S4 (with onboarding visible on first run) |
| `continue-to-gameplay.e2e.spec.ts` | S1 → S4 via Continue |
| `build-flow.e2e.spec.ts` | S4 build menu → tile placement → constructed building |
| `victory.e2e.spec.ts` | S4 → S5 (forced-win helper) |
| `defeat.e2e.spec.ts` | S4 → S5 (forced-loss helper) |

Each test asserts the relevant selector + a one-shot visual baseline at the
transition's "settled" frame.

## Mobile / Pixel-5a parity

The journey is identical; layout differences (handled by `useViewport`):

- Portrait — `ResourceBar` is `compact`; Minimap shifts; touch-tap replaces
  click; safe-area insets honoured.
- Touch interaction: tap-to-select, tap-to-move (military), tap-to-place
  (build mode). No hover affordances are load-bearing.
