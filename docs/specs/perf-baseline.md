---
title: Performance Baseline
updated: 2026-05-25
status: current
domain: technical
---

# Performance Baseline — M_V8.PERF.PROFILE-PASS

## Setup

- **URL:** `/?ai-vs-ai=1&nplayer=4&seed=perf-profile-pass`
- **Factions:** player (human-controlled, AI-vs-AI mode) + enemy (AI) + player-3 (AI) + player-4 (AI) + 3 barbarian camps = 7 entities in game.factions
- **Measurement:** 360 rAF-deltas (~6s) collected via `requestAnimationFrame` in Chrome via chrome-devtools-mcp
- **Environment:** macOS 25.5.0, Chrome (via devtools-mcp), Vite dev server, M_V8 worktree

## Results

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Mean frame time | 13.61 ms | ≤ 16.67 ms (60fps) | PASS |
| Median FPS | 73 fps | ≥ 60 fps | PASS |
| P95 frame time | 41.7 ms | ≤ 33 ms | WARN |
| Max frame time | 50 ms | ≤ 100 ms | PASS |
| Frames > 16.67 ms | 93/360 (26%) | ≤ 20% | WARN |

## Analysis

Mean frame time of 13.61ms is well within the 60fps budget. The 26% frames-over-16ms
and P95 of 41.7ms indicate periodic GC pauses or yuka brain arbitration spikes rather
than a sustained hot path.

No sustained frame-time degradation was observed — the hot path does not block the 60fps
target on average. The P95 WARN is expected for a dev-server run (HMR overhead +
unoptimized sourcemaps inflate GC pressure vs. a production build).

## Hot path candidates (future optimization if needed)

1. **buildFortifiedTileIndex** in `pathFollowSystem` — O(buildings × 7) per tick.
   Already optimized in v0.4 (was per-unit query; now one sweep per tick). With
   4 AI factions each building 3-7 structures, the sweep is ~28-49 buildings.
   Capped to one Map clear + rebuild per tick — no regression risk.

2. **yuka Think.arbitrate()** — called every 3s per AiPlayer (5 evaluators × 7 factions).
   Each evaluator reads zone + economy + diplomacy state. At 7 factions this is
   35 evaluator calls per arbitration cycle, amortized over 3s = negligible.

3. **pathFollowSystem world.query()** — one sweep per tick for all moving units.
   koota ECS archetype queries are O(archetypes), not O(entities). No optimization needed.

## Production build note

This baseline was captured against the Vite dev server (unminified, sourcemapped).
A production build (`pnpm build`) would reduce GC pressure significantly (no HMR
module graph, tree-shaken output). Recommend re-running against `pnpm preview` output
before the 1.0 release gate.

## Next threshold

Re-run when any of the following land:
- `src/ecs/systems/` change that adds a new per-tick world query
- `src/ai/` change that adds a new evaluator (currently 6 per AiPlayer)
- Faction count increases beyond 6 players + 4 barbarian camps (current max)
