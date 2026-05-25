---
title: PRD v0.7 — substrate→player polish + N-player correctness fixes
updated: 2026-05-25
status: current
domain: product
---

# PRD v0.7 — substrate→player polish + N-player correctness fixes

**Released as:** v0.1.11 (PR #31 — `feat(v0.7): substrate→player polish + 2 CRITICAL fixes + 11 work-units shipped`)
**Cycle goal:** wire the v0.5+v0.6 substrates (faction registry, diplomacy state machine, MYTH event JSON, portal-stones biome, 4X named victory) into player-clickable UI; fix two CRITICAL correctness gaps the v0.7 opening review identified; formalise a `pnpm visual:battery` per-cycle visual-regression script.

## Why this cycle

The v0.7-opening review (`docs/reviews/v0.7-cycle-opening.md`, commit `08d0e1d`) conducted a comprehensive single-pass review of PR #27 (v0.5) + PR #29 (v0.6) and surfaced 15 findings: 2 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW.

The two CRITICAL findings were release-blockers:

- **CRIT-1**: The save snapshot did not round-trip six new `GameState` fields added in v0.6 (diplomacy / proposals / mythEvents / victoryRecord / portalStoneCooldowns / tradeCooldowns). A save-then-load cycle silently discarded mid-match diplomatic state.
- **CRIT-2**: `trainUnit` only accepted 4 of the 9 declared `PLAYER_UNIT_TYPES`. Trebuchet / Wizard / Healer / Ferryman / Settler were declared in the registry but unreachable via the trainer — effectively non-existent in the game.

v0.7 drains both CRITICALs, 3 of 4 HIGHs, and 3 of 5 MEDIUMs, then layers the substrate-to-UI work that makes the v0.6 diplomacy + MYTH + 4X systems visible to players.

## Architectural decisions

1. **SNAPSHOT_VERSION 2 → 3 with a migration arm.** The save schema expands to include all six v0.6 `GameState` fields via Zod `z.object()` schemas. The loader distinguishes v2 from v3 snapshots and applies a migration arm that back-fills the missing fields with safe defaults (empty Maps, `null`, `[]`). The `FactionConfigSchema` adds a `.refine()` that rejects duplicate faction ids — a silent corruption bug the v0.6 cycle introduced.

2. **`economyFor(game, factionId)` helper pattern.** The v0.5/v0.6 GameEconomy was a `Record<'player'|'enemy', EconomyState>` with hard-coded keys at call sites. `economyFor` wraps the lookup and throws if the factionId is missing — converting silent `undefined` reads into loud failures. Tribute and camp-reward now route through `economyFor` for all N factions, not just `'player'`.

3. **Substrate → UI: one component per mechanic.** Three HUD components were added:
   - `NonAggressionPactPill` — shows the active pact state, accept/reject actions.
   - `TradeSwapWidget` — surfaces the 1:1 atomic swap UI with cooldown indicator.
   - `TributeDemandBanner` — shows auto-triggered demands with accept/reject.

   Each component mounts lazily (only when its data exists in `game.diplomacy`) so the 2-faction legacy path sees nothing new.

4. **Visual battery as a gating artifact.** `pnpm visual:battery` (script `scripts/visual-battery.mjs`) aggregates the 29 harness baselines into a single pass/fail. The CI mode (`--ci`) exits non-zero on any drift. This was the first per-cycle ceremony to catch baseline rot before pushing — a process lesson from the prior two cycles where Mac vs Linux subpixel rounding was only discovered on CI.

## Work-units shipped

| Item | Commit | What it does |
|---|---|---|
| M_V7.CARRY.SAVE-V6-STATE | `70fcbd4` | CRIT-1: SNAPSHOT_VERSION 2→3; round-trips all 6 new GameState fields; FactionConfigSchema rejects duplicate ids; v2→v3 migration |
| M_V7.TRAIN.WIDEN-ROLES | `1308f68` | CRIT-2: trainUnit accepts all 9 PLAYER_UNIT_TYPES; Trebuchet/Wizard/Healer/Ferryman/Settler now trainable |
| M_V7.ECONOMY.REGISTRY | `f493f7d` | HIGH-1/2/3: economyFor(game, factionId) helper; N-player tribute + camp-reward route through registry; encroachment hardened |
| M_V7.MYTH.EFFECTS | `f74155b` | MED-5: 4 missing dispatchers (meteor/eclipse/migration/oracle wired); LOW-3 typo guard |
| M_V7.PORTAL-STONES.TRIGGER | `272bb95` | 1-in-200 roll after 5-min map clock; idempotent guard (only fires once) |
| M_V7.DIPLO.UI | `9106d2a` | 3 HUD components: NonAggressionPactPill + TradeSwapWidget + TributeDemandBanner; wired to App.tsx; 4 screenshot baselines |
| M_V7.RENDER.COLOR-OUTLINE-V3 | `d1579e9` | UnitHexOutline + BuildingOutlineRing r3f components; completes the registry-color flow for all faction-scoped surfaces |
| M_V7.4X.SCORING | `8c073bc` | ScoringScreen for 4X mode; per-kind tint + flavor + per-faction stats grid; 4 screenshot baselines (one per victory kind) |
| M_V7.DISCOVERY-TREE.V6 | `145fb7b` | 5 new techs (trade-route/cartography/iron-tools/siege-engineering/monumental-architecture); new `flag` effect kind |
| M_V7.E2E.4-PLAYER-CAMP-CLEAR | `6dd8946`+`55bf2c0` | `?nplayer=N` URL flow wired into App.tsx; Playwright spec for 4-player setup |
| M_V7.VISUAL.BATTERY | `0eaab7e` | pnpm visual:battery aggregates 29 harness baselines; CI mode fails on drift |

## Determinism contract

v0.4/v0.5 byte-determinism preserved on legacy 2-faction matches — 1091 unit tests pass. `pnpm test:browser` 127 browser tests pass (8 harness files, 29 baselines). `pnpm test:e2e` 9 specs pass locally including the new n-player-camp-clear spec.

## Carryovers to v0.8

- HIGH-3: `wonderTimers` N-player lift — still `Record<'player'|'enemy', number>` (same pattern as `economyFor`; lift is invasive across more sites)
- MED-1: `factionOverride` TypeScript-cast debt (architectural; v0.8 lift)
- LOW-1: difficulty multiplier literal-`'enemy'` check
- LOW-2: PORTAL_STONE bespoke ambient
- Per-faction cooldown refresh on portal-stone teleport (`pathFollowSystem` hook)
- NewGameModal >2-faction picker UI (4X mode currently driven via `?nplayer=N` URL only)
- CI hook for `pnpm visual:battery:ci` on src/render+world+hud+ui touches
- Building+unit outline canvas wiring (substrate components in place; main Canvas mount is the last step)

See `PRD-v0.8.md` for how each was resolved.
