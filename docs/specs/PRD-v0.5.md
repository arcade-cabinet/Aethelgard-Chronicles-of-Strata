---
title: PRD v0.5 — N-player + barbarian-camp pivot
updated: 2026-05-25
status: current
domain: product
---

# PRD v0.5 — N-player + barbarian-camp pivot

**Released as:** tag v0.1.9 (PR #27)
**Cycle goal:** pivot from 2-faction asymmetric to N-faction symmetric (1..N players, ALL using player kit). Repurpose enemy-only "raid" units + graveyard biome as Civ-style barbarian camps.

## Why the pivot

The v0.4 "playable AI-vs-AI by harness" proved the substrate but capped at 2-faction asymmetric. User: "I think it adds WAY more scale" — N-player removes the asymmetry ceiling, unlocks 4X mode, and means new units stop needing per-faction equivalents.

## Architectural decisions

1. **FactionId** = string slug (e.g. `player-1`, `ai-2`, `barbarian-camp-3`). Registry-backed runtime indexed by id. v0.4 saves migrate `'player'` → slot 0, `'enemy'` → slot 1.
2. **Faction config** = `{ id, kind: 'human'|'ai'|'barbarian', color, displayName, personality?, controller, archetype }`. Barbarian camps share one faction id per CAMP (not per unit).
3. **Per-faction building MESH** (not shape). Shared CONTRACT (supply/military/defense role, cost, supply, HP); MESH + SFX + particle palette varies per faction via `archetype: 'medieval'|'orc'|'undead'|'mystic'`.
4. **Color picker** — Radix 12-color palette, randomly shuffled per faction on modal open. Click → Radix popover with chips + hex input. Color flows into ZoneBorder, building outline, unit hex outline, base banner, HUD chips, minimap.
5. **Barbarian camp placement** — Centroid-biased; count = `clamp(round(N/2)+1, 1, 6)`; ≥6-tile radius from each base.
6. **Clearing a camp** — Camp HP → 0 emits `barbarian-camp-cleared` → +50 wood + +50 stone + 1 random Discovery to killing faction. Tile → RUINS biome.
7. **Mode interplay** — border-clash N=2; age-of-strata N=4 + 4 camps; 4X N=6 FFA + 5 camps.

## Work-units shipped (8)
- M_PIVOT.N-PLAYER.FACTIONS — registry-backed FactionId
- M_PIVOT.N-PLAYER.COLOR-PICKER — Radix UI
- M_PIVOT.N-PLAYER.SHARED-KIT — all factions same building/unit/Discovery tree
- M_PIVOT.ARCHETYPES — `src/config/archetypes.json` per-faction MESH/SFX
- M_PIVOT.BARBARIAN-CAMPS — neutral aggressor camps
- M_PIVOT.RENDER.COLOR-OUTLINE — registry-sourced colors throughout
- M_PIVOT.AI.JSON-PERSONALITIES — RAGE_QUIT/STARVATION per personality
- M_PIVOT.MODES.4X — 6-player default

## Determinism

v0.4 AIVAI matrix passes byte-identical for legacy 2-faction. Save-schema migration arm; SNAPSHOT_VERSION bumped.

## Carryovers to v0.6

N-player save round-trip, Discovery flag on camp clear, RUINS biome flip, 6-banner HUD chips, color-outline V2, e2e 4-player camp clearing.
