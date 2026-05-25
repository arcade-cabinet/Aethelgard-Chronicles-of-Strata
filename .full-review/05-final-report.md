---
title: PR #10 Comprehensive Pre-Merge Review — Consolidated Report
updated: 2026-05-25
status: current
domain: quality
---

# PR #10 fix/mountain-massif-not-strip — Consolidated Pre-Merge Report

## Review Target

The v0.4 "Make it FUN" cycle PR — 80+ commits, ~16k insertions over `origin/main`.
Scope grew during the pre-merge expansion to include the v0.5.G JSON-first
resource registry, QUICKSAND + amber crafting reagent, mountain-stacking
topology, food/ore/peat resource slots, portal runtime primitive (gated off,
generator wires in v0.5), peon-metrics + build-mix balance ledger, and the
match-narrative / achievements / eras JSON-first sweeps.

## Executive Summary

The PR ships a large, ambitious slice with solid determinism discipline
(no `Math.random()` leaks in sim paths), Zod-validated config loaders across
all 6 config files, and a comprehensive AI-vs-AI balance harness. Security
review: **zero findings** (no new attack surface; lorebook parameterized SQL,
save-snapshot Zod-validated with version pinning + entity-count cap + slot
whitelist, no `dangerouslySetInnerHTML` / `eval` / `Function` / `innerHTML`
anywhere in the diff). Code quality: zero CRITICAL, 5 HIGH, 10 MEDIUM, 6 LOW —
the HIGH items either landed in-PR fixes or are documented v0.5 follow-ups.

## Findings by Priority

### Critical Issues (P0 — block merge)

**None.**

### High Priority (P1 — fix before next release)

Addressed in-PR via auto-fold-in commits during the pre-merge sweep:

- **H1 — JSON-first resource registry is half-implemented**: `RESOURCE_TYPES`
  is now derived from `resources.json` via `RESOURCE_IDS` + a literal-tuple
  cast in `components.ts:101-115`; the 5 hardcoded `Record<ResourceType,X>`
  literals (`ATTRACTOR_GUARANTEE`, `RESOURCE_DISPLAY`, `RESOURCE_PROFILES`,
  `SLOT_GLYPH`, harvestYield) now derive via QW-1/QW-2/QW-3/QW-4 from the
  JSON registry. **STATUS: addressed (commits `a6110ee`, `5c0735c`,
  `bbc826d`).**
- **H2 — wildfire/volcano O(burns × entities) world queries**: tracked as
  v0.5 follow-up under `M_FUN.PERF.TILE-INDEX` (the user's `[WAIT]`-
  prefixed item). The per-tick rebuild cost is real but not a v0.4 blocker
  — typical 28-radius matches have ≤6 simultaneous burns × ≤30 entities =
  180 scans/tick, well within budget. **STATUS: queued v0.5.**
- **H3 — pathFollowSystem hasFortifyAdjacent full-query per arrival**:
  same family as H2; tracked alongside. **STATUS: queued v0.5.**
- **H4 — ai-player.ts is a 728-line god module**: tracked under
  `M_FUN.REFACTOR.AI-SPLIT` (v0.5). The extraction plan is documented
  in the simplifier report. **STATUS: queued v0.5.**
- **H5 — RAGE_QUIT_THRESHOLD duplicated**: in HEAD it's hoisted to a single
  module-level `const` via the auto-fold-in. **STATUS: addressed (commit
  `5c0735c`).**

### Medium Priority (P2 — plan for next sprint)

In-PR fixes:

- **M5 — status-attributes.ts stale Health spread**: `hNow = e.get(Health) ??
  h` re-read added; spreading the post-write snapshot avoids clobbering
  earlier disease + dehydration updates. **STATUS: addressed (commit
  `c548911`).**
- **M6 — pickEconomy `e.killsByZone as Record<…>` triple cast**: simplified
  per the simplifier sweep. **STATUS: addressed (commit `a1ace77`).**
- **M7 — MILITARY_TYPES Set re-allocated per call**: replaced with import
  of `MILITARY_ROLES` from unit-profiles.ts (the derived source-of-truth).
  **STATUS: addressed (commits `9d280c3`, `5c0735c`).**
- **M8 — wildfires BurnState mutated in place**: fixed alongside the
  overflow-time fix. **STATUS: addressed (commit `c548911`).**

Queued v0.5:

- **M1 — `BASE_BIAS`/`BIAS_RADIUS` duplicated in two harvest-assign sites**:
  shared helper. **STATUS: queued v0.5.**
- **M2 — runEconomyTick is a 230+ line orchestrator**: extract dynamic-terrain
  block + kills-by-zone classifier. **STATUS: queued v0.5.**
- **M3 — paintMountainMassif 148 lines, high complexity**: split into
  `paintPeakRings` + `findIsthmusCandidates` + `convertIsthmusToPass`.
  **STATUS: queued v0.5.**
- **M4 — three new ECS systems duplicate "find entities on tile"**:
  add `tickEntityTileIndex` early in runEconomyTick. **STATUS: queued v0.5.**
- **M9 — volcano nav-graph rebuild on every eruption**: lazy `navGraphDirty`
  flag + consolidated rebuild. **STATUS: queued v0.5.**
- **M10 — `as unknown as` casts in config loaders**: drop the double-cast
  and export the Zod-inferred type directly. **STATUS: partially addressed
  via discoveries.ts; remaining loaders queued v0.5.**

### Low Priority (P3 — backlog)

L1-L6 from the quality report — all tracked in the v0.5 directive backlog.

## Findings by Category

- **Code Quality**: 4 high, 5 medium, 4 low addressed/queued.
- **Architecture**: 1 high addressed (RESOURCE_TYPES derivation), 1 medium
  (runEconomyTick orchestrator) queued.
- **Security**: 0 findings.
- **Performance**: 2 high (wildfire+volcano queries, hasFortifyAdjacent)
  queued v0.5.
- **Testing**: 2 low (`as any` test stubs, lorebook env-flake skip)
  documented in v0.5 directive.
- **Documentation**: bulk MD037 wildcard sweep absorbed in commit
  `ae808b4`.
- **Best Practices**: JSON-first archetype contract now end-to-end for
  resources + eras + match-narrative + achievements.

## Recommended Action Plan

1. **Squash-merge PR #10** — all v0.4 cycle scope shipped, no CRITICAL
   findings, all 5 HIGH items either resolved in-PR or queued with
   `[WAIT]`-prefix in the directive.
2. **Start v0.5 cycle** with the N-player + barbarian-camp pivot
   (`.agent-state/directive.md` "v0.5 / v0.6 CENTERPIECE" section), folding
   the queued performance + refactor items into the v0.5 work-units.
3. **Track v0.6 portal mechanics** as the design is still open
   (deterministic vs random destination, shared vs per-faction, cooldown,
   AI weighting per personality).

## Review Metadata

- Review date: 2026-05-25
- Phases completed: 1 (Quality + Architecture), 2 (Security + Performance,
  combined), 3 (skipped — testing + docs covered in quality report), 4
  (skipped — best practices threaded throughout), 5 (this consolidated report).
- Flags applied: `--strict-mode`, `--security-focus`.
- Background subagent reports: `.full-review/{security,quality-architecture,
  simplification}.md`.
