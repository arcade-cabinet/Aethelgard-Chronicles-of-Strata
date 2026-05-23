---
title: M_EXPANSION release train (v0.3 → v1.0)
updated: 2026-05-23
status: current
domain: context
---

# M_EXPANSION release train

This doc rolls up the M_EXPANSION queue into a versioned shipping
plan. Each release is a coherent slice — assets + audio + UX work
that the player notices together. WAIT-state items only land in the
release that unblocks their gate.

## v0.3 — Asset coherence + audio polish (LANDED)

- A.1-.30 — Castle/Town/Graveyard/Tower-Defense ingest; banners,
  fountains, gates, gravestones, mossy rocks.
- A.26-.30 — KayKit Mage/Rogue/Monster wired; faction tinting.
- AU.31-.50 — PixelLoops UI SFX + variant pools; per-biome
  footsteps; per-damageType impacts; magic-cast SFX; death thuds.
- S.51-.70 — SKINS.audio override slot; resource-spawn unify;
  HealthBillboard animation; contested-pulse render; build queue
  strip; ultra-wide viewport; cliff AO; rain wind drift; delta ingest.

## v0.4 — Feature breadth (IN-FLIGHT)

- F.71  Wonder building win condition ✅
- F.73  Multiplayer-seed sharing ✅
- F.77  Achievement registry + first-victory unlock ✅
- F.82  Hex seed input acceptance ✅
- F.89  Camera bookmarks ✅
- F.90  Minimap click-to-pan ✅
- F.91  Selection groups ✅
- F.100 Coexist (no-win) mode ✅
- U.101 CombatText covers ranged hits ✅
- U.105 Live score bar ✅
- U.111 Speed control (1×/2×/4×) ✅
- U.124 DiscoveriesPanel search filter ✅

## v0.5 — WAIT-DESIGN unblocked

When the related design docs land (107-mana-resource, 106-replay-format),
these items move to active:

- F.72  Mana resource (depends on 107 spec) — 8-step ripple
- F.74  Replay export (depends on 106 spec)
- F.75  Replay import (depends on 106 spec)
- F.76  Tutorial campaign
- F.81  Random-event system
- F.83  Map preview thumbnail in NewGameModal
- F.85  Surrender consequences
- S.55  AI PatrolGoal
- S.62  yuka MovementGoal migration
- AU.46 Footman parry + deflect SFX

## v0.6 — Multi-faction + UX polish train

- F.94/.95 Diplomacy / 3rd faction
- F.96  Hero unit
- F.84  Per-faction starting bonus picks
- U.102-.121 — build-mode ghost, selection brackets, per-unit
  tooltips, enemy detail panel, etc.

## v1.0 — Commercial release

Requires:

- O.141 Google Play upload track + signed APK
- O.143 App Store assets bundle
- O.145 Crash reporter facade (opt-in)
- S.64  iOS Capacitor scaffold (needs macOS)
- F.80  Faction palette swap (commercial polish)
- T.126-.128 visual snapshot baselines for every biome × state

## Tracking

Each item has its own ticket in `.agent-state/directive.md`. This doc
re-derives from the directive — never the other way around.
