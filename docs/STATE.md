---
title: State
updated: 2026-05-23
status: current
domain: context
---

# Current state

This page summarises the last verified game-state at commit time.
Auto-derivable from `.agent-state/directive.md`; this version is
hand-curated until the auto-generator lands (M_EXPANSION.D.169).

## Last verified commit

- Branch: `chore/release-marker`
- Tests: 438 / 438 passing (unit), 49 / 49 passing (browser)
- TypeScript: clean
- Lint: clean
- E2E: not re-run since last visual change

## Currently shipping (v0.4 in-flight)

- Wonder building → 5-minute countdown → win (F.71)
- Coexist mode (no win condition) (F.100)
- Achievement registry (F.77) — first-victory + wonder-win
- HUD: live score bar (U.105), speed control (U.111), build queue
  strip (S.58), idle peons indicator, AchievementWatcher
- Camera: bookmarks (F.89), minimap click-pan (F.90), arrow-key pan
  (UX.31), selection groups (F.91), share-seed clipboard (F.73)
- Audio: per-damageType impacts (AU.45), per-biome footsteps (AU.43),
  magic-cast SFX (AU.44), achievement chime (AU.33), ducking
  under critical-alarm (AU.41), variant-pool click rotation (AU.35)
- Visuals: faction tinting (A.29), cliff AO (S.66), rain wind drift
  (S.68), sky dither (UX.29), HealthBillboard animation (S.54),
  contested-pulse render (S.56)
- Specs landed: 106-replay-format, 107-mana-resource, 110-kaykit-
  roster-audit, M_EXPANSION-roadmap

## Active milestones

- M_EXPANSION (180-item queue, ~90 actionable items landed this session)
- M0-M7 (foundation through polish) — landed
- M_AUDIT2 (security/UX hardening) — landed
- M_REGISTRY (Thing registries) — landed

## Tracked WAIT-state items

See `.agent-state/directive.md` § wait-state. Common categories:
- WAIT-DESIGN — needs a spec doc first (~50 items)
- WAIT-DEVICE — needs macOS / Apple Developer account / Pixel-5a
- WAIT-INFRA — needs Google Play / Cloudflare / hosting account
- WAIT-MCP — needs MCP-driven asset pack ingest
- WAIT-CI — needs CI green + merge

## What's NOT shipping in v0.4

The WAIT-DESIGN items in F.* range; visual-snapshot test sweep
(T.126-.128); iOS scaffold; Play Store upload; Mana resource (4th
slot, schema bump).
