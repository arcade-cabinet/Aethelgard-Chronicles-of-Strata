---
title: v0.11 Visual Fixture Lock — Judgement Ledger
updated: 2026-05-26
status: current
domain: quality
---

# v0.11 Visual Fixture Lock — Judgement Ledger

Run: `pnpm visual:fixtures` produced **49 captures** (7 fixtures
× 7 viewports). Each fixture below was visually judged against
`docs/specs/20-visual-language.md` + the per-screen briefs in
`docs/specs/10-player-journey.md`.

Viewports (from playwright `devices` registry):

- desktop (1280×800)
- pixel-7 (412×915 — phone portrait)
- iphone-14 (390×844 — phone portrait)
- ipad-mini (768×1024 — tablet portrait)
- foldable-portrait (768×1024)
- foldable-landscape (1024×768)
- ultrawide (2560×1080)

## Per-fixture verdict

| Fixture | Desktop | Pixel-7 | iPhone-14 | iPad-Mini | Foldable-P | Foldable-L | Ultrawide |
|---------|---------|---------|-----------|-----------|------------|------------|-----------|
| title | OK | OK — see notes | OK | OK | OK | OK | OK |
| newgame | OK | OK — see notes | OK | OK | OK | OK | OK |
| onboarding | OK | OK | OK | OK | OK | OK | OK |
| gameover-win | OK | OK | OK | OK | OK | OK | OK |
| gameover-loss | OK | OK | OK | OK | OK | OK | OK |
| gameover-draw | OK | OK | OK | OK | OK | OK | OK |
| system-menu | OK | OK | OK | OK | OK | OK | OK |

### Spot-checks (pixel-7 portrait, the tightest viewport)

- **title**: "Chronicles of Aethelgard" hero text + tagline +
  3-button stack (New Game / Continue / Settings) + version pin
  + mute/light toggles at bottom-right. Hex-pattern background
  reads cleanly. Pass per spec
  `docs/specs/20-visual-language.md` §Title.
- **newgame**: "Forge Your Realm" header + seed input with
  dice/copy + miniature board preview + summary chips (seed,
  size, mode, players) + "Begin Match" CTA. All within viewport.
  Pass per spec §New Game Modal.
- **onboarding**: "Welcome to Aethelgard" copy mentions
  Palace + 80 wood + 60 stone — matches the v0.11 RTS
  opening (M_V11.OPEN). Pass.
- **gameover-win**: "Victory! Trophy + match-summary card
  ("The Patient Hearth") + stats table". Pass.

### Things to track (not blockers)

- Pixel-7 newgame's miniature board preview takes ~30% of the
  vertical viewport — fine, but if a future "biome preview"
  panel lands it'll need a collapsible variant.
- Foldable-landscape title fixture: the hex-pattern background
  fills the wider aspect cleanly; no letterboxing.

## Substrate baselines locked

The `tests/harness/__screenshots__/procmesh-*.png` baselines (30
shots: 19 primitives + 11 buildings) lock the M_V11.PROCMESH
substrate. The `tests/harness/__screenshots__/biome-*.png`
baselines lock the biome palette. Both are part of `pnpm
test:browser` and run on every CI build.

## Verification cadence

Re-run `pnpm visual:fixtures` after any change to:
- `src/hud/**` (HUD components)
- `src/world/**` (rendered surfaces)
- `src/render/**` (canvas + camera)
- `src/styles.css` or any theme constant

Diff the per-fixture PNG against the prior run + log the verdict
in this ledger.
