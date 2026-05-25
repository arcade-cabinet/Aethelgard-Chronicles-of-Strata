---
title: PRD v0.6 — portals + diplomacy + MYTH events + 4X victory
updated: 2026-05-25
status: current
domain: product
---

# PRD v0.6 — portals + diplomacy + MYTH events + 4X victory

**Released as:** v0.1.10 (PR #29 — `feat(v0.6): portals + diplomacy + MYTH events + 4X victory + carryovers (16 work-units)`)
**Cycle goal:** build interactive depth on top of the v0.5 N-player substrate — tile-teleportation via three portal biome generators, a 4-state diplomacy machine with three interaction helpers (pact / trade / tribute), five rare MYTH-tier world events, four named 4X victory conditions with a detection pipeline, and drain of six v0.5 grinder-report carryovers.

## Why this cycle

v0.5 shipped the N-player substrate (faction registry, barbarian camps, color picker, archetype mesh map). The substrate was purely additive to `GameState`; no new player-visible depth came with it. v0.6 activates four previously dormant systems whose underlying data structures were already in place:

- **Portal biome primitives**: `tile.portalTo` landed in v0.4 but the mapgen had no generator — every portal field was `null`.
- **Diplomacy slot**: `game.diplomacy` and `game.diplomacyProposals` were initialised in `startGame` as empty Maps; the relation machine was a stub.
- **MYTH event list**: `game.mythEvents` was initialised empty; the JSON registry existed with no dispatcher.
- **4X victory enum**: the `mode === 'age-of-strata'` branch returned `undefined`; no victory condition was wired.

The v0.5 PR closing report explicitly named these as the six follow-ups to drain in v0.6.

## Architectural decisions

1. **Portal topology is mapType-coupled, not random.** Three portal variants target three distinct biome patterns: QUICKSAND (closest-pair reciprocal link), MOUNTAIN_PASS (hub-spoke cluster link within 4 hexes), PORTAL_STONE (singleton placement event, per-faction 60-second cooldown). The choice of which portal to generate is determined by which biomes are present on the map — no separate config knob.

2. **Diplomacy uses sorted-pair keys.** `relationKey(a, b) === relationKey(b, a)` (lexicographic sort of id pair). The Map stays compact at `O(N²/2)` entries for N factions. All four relation states — `neutral | ally | enemy | tributary` — can be transitioned from any other state. Tributary is the only asymmetric state: one faction cedes 10 % of income to its suzerain each tick.

3. **MYTH events are JSON-registry-driven with a single dispatcher.** Five event types (eclipse / meteor / migration / oracle / festival) share one 300-second global cooldown. The harvest-festival dispatcher was the only one wired in v0.6; the remaining four dispatchers were deferred to v0.7 (see carryovers). Each event type has a named `effect` field; the dispatcher routes on that field.

4. **4X victory is detection-only in v0.6.** The four victory kinds (military: all rivals eliminated; economic: 2500 cumulative gold; scientific: all 8 discoveries researched; diplomatic: ally-web covering 75 % of non-barbarian factions) each have a per-tick detection function in `evaluateWinLoss`. The ScoringScreen UI and per-faction stats grid were deferred to v0.7.

## Work-units shipped

| Item | Commit | What it does |
|---|---|---|
| M_V6.CARRY.SAVE-N-PLAYER | `5ba4ec5` | Round-trips FactionConfig registry through save/load; SNAPSHOT_VERSION bump |
| M_V6.CARRY.CAMP-DISCOVERY | `a6ce8ee` | Clearing a camp grants +1 Discovery from a deterministic pool |
| M_V6.CARRY.RUINS-BIOME | `faf728c` | Cleared camp tile flips to walkable RUINS biome (walkable + buildable + habitable) |
| M_V6.CARRY.HUD-N-BANNERS | `6833bf0` | Top-center strip renders 1 faction chip per non-barbarian faction in 4X mode |
| M_V6.CARRY.COLOR-OUTLINE-V2 | `1f6bef7` | Minimap unit dots + base markers read faction color from game.factions registry |
| M_V6.CARRY.E2E-CAMP-CLEAR | `2443142` | Vitest browser-mode acceptance for the full camp-clear pipeline |
| M_V6.PORTAL.QUICKSAND-PAIR | `e07dc62` | Closest pair of QUICKSAND tiles get reciprocal `portalTo` links |
| M_V6.PORTAL.MOUNTAIN-CAVE-NETWORK | `ef5340a` | Hub-spoke linking of 3+ MOUNTAIN_PASS clusters within 4 hexes |
| M_V6.PORTAL.STONES-EVENT | `6d430ad` | PORTAL_STONE biome + placement helpers + per-faction 60-second cooldown |
| M_V6.DIPLO.RELATION-MACHINE | `72b33ee` | Per-pair (neutral/ally/enemy/tributary) state machine with sorted-pair key |
| M_V6.DIPLO.BORDER-ASK | `5a1f884` | Non-aggression-pact 10-second acceptance window + lifecycle |
| M_V6.DIPLO.TRADE | `2772cd3` | Atomic 1:1 wood/stone/gold swap + 20-second cooldown |
| M_V6.DIPLO.TRIBUTE | `45f16c5` | Auto-demand at 2× supply ratio + 10 % income cession + wave-of-attack |
| M_V6.MYTH.EVENTS | `5c674a8` | 5 event types (eclipse/meteor/migration/oracle/festival) + 300s cooldown + harvest dispatcher |
| M_V6.4X-FULL | `9fbb432` | 4 named victory conditions (military/economic/scientific/diplomatic) + detection pipeline |
| M_V6.PARKING-LOT | `2ca65c8` | M_FUN.CIV.* + M_FUN.MYTH.* + M_FUN.DIPLO.* v0.4 carryovers drained |

## Determinism contract

v0.4/v0.5 AIVAI matrix passes byte-identical for the legacy 2-faction case. The four new `GameState` fields (`portalStoneCooldowns`, `diplomacy`, `diplomacyProposals`, `tradeCooldowns`, `mythEvents`, `victoryRecord`) are each initialised empty/null in `startGame` so legacy paths see no behavioural drift. SNAPSHOT_VERSION bumped for the save round-trip.

## Carryovers to v0.7

- Per-building outline ring + per-unit hex outline shader registry reads (only ZoneBorder + Minimap lifted in v0.6)
- HUD pill UI for non-aggression pact / trade / tribute demand (primitives in place, no UI)
- Portal-stone random TRIGGER (1-in-200 once map clock > 5 min) — helpers callable but not triggered
- 4 of 5 MYTH event effect dispatchers (meteor/eclipse/migration/oracle) — only harvest-festival wired
- ScoringScreen UI for 4X victory kinds
- Per-faction GameEconomy registry (tribute / victory still route only to `'player'|'enemy'` slots)
<br>See `PRD-v0.7.md` for how each was resolved.
