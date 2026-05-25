# Review Scope

## Target

PR #10 `fix/mountain-massif-not-strip` — full branch diff vs `origin/main` (80+ commits since branch point).

The PR encompasses the v0.4 "Make it FUN" cycle PLUS the user's pre-merge expansion that adds the v0.5 JSON-first resource registry, quicksand mechanics, mountain-stacking topology, and the coderabbit MAJOR/CRITICAL fold-ins.

## Files

All files changed on `fix/mountain-massif-not-strip` vs `origin/main`. Captured by the `/security-review` and `/comprehensive-review:full-review` runs from their git-status + git-diff inputs.

Notable surface area:
- `src/config/resources.{json,ts}` — NEW JSON-first resource registry (sources, consumers, risks)
- `src/config/eras.{json,ts}` — NEW JSON-first era progression
- `src/config/mapgen.{json,ts}` — extended with QUICKSAND biome
- `src/ecs/components.ts` — ResourceType union now derived from JSON
- `src/game/economy.ts` — GameEconomy now extends Record<ResourceType, number>
- `src/persistence/serialize-game.ts` — pickEconomy migration via iteration
- `src/core/board.ts` — paintMountainMassif 3-tier stack + paintQuicksandSwirls + isthmus snapshot fix
- `src/ecs/systems/{quake,wildfire,status-attributes}.ts` — coderabbit MAJOR fixes
- `src/hud/usePinchZoom.ts` — opts-ref pattern, listener-churn fix
- `src/rules/economy-rules.ts` — BASELINE_SUPPLY_CAP sources from config
- `src/ai/ai-player.ts` — TrainEvaluator canTrain gate, matchElapsedSeconds helper
- `tests/e2e/ai-vs-ai-balance.spec.ts` — zone-class kill breakdown ledger

## Flags

- Security Focus: yes (separate /security-review run)
- Performance Critical: no
- Strict Mode: yes — user mandate "all of these before merge 0.4"
- Framework: TypeScript + React + r3f + koota ECS + Vitest + Playwright

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report

(security-review runs as a separate top-level subagent in parallel — its markdown is appended to the final report.)
