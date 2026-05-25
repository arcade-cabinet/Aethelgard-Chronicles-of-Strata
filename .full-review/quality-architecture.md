# Comprehensive Code Review: PR #10 (fix/mountain-massif-not-strip)

Scope: ~80 commits, 16k+ insertions vs origin/main. Focus on code quality, maintainability, architecture, determinism, and the JSON-first refactor.

## Executive Summary

The PR delivers a large, ambitious slice — JSON-first resource registry, 3-tier mountain massifs, dynamic terrain (volcano/wildfire/quake), 5-personality AI, save schema v2, and a comprehensive AI-vs-AI balance harness. Determinism discipline is good (no `Math.random()` leaks in sim paths) and Zod-validated config loaders set a healthy precedent. The dominant risks are (1) the JSON-first claim is **partially fictional** — `ResourceType` is still hand-mirrored from JSON via a literal-tuple cast, and 4+ files still hand-enumerate every `Record<ResourceType,X>`; (2) several new ECS systems do O(burningTiles × entities) per-tick scans that will bite at scale; (3) AI evaluator code is heading toward a 700-line god class.

## Findings by Priority

### Critical (P0 — block merge)

None. No determinism violations, no save-corruption paths, no silently swallowed errors that block correctness.

### High (P1 — fix before next release)

#### H1. JSON-first resource registry is half-implemented; adding a slot is still a 5+ file edit

- Severity: High
- Files: `src/ecs/components.ts:101-115`, `src/rules/attractor.ts:24`, `src/rules/display.ts:41`, `src/rules/resource-profiles.ts:48`, `src/hud/format.ts:10`, `src/config/economy.ts:84`
- Why it matters: The whole pitch of `src/config/resources.json` + `src/config/resources.ts` is "add one row, every consumer picks it up automatically." The current implementation breaks that promise in two ways:
  1. `RESOURCE_TYPES` is declared as a hardcoded literal tuple `as readonly ['wood','stone','ore','gold','food','peat','science','mana']` cast from the JSON-derived `RESOURCE_IDS`. If a 9th slot is added to `resources.json`, the cast silently widens it to one of the existing literals, the union type does NOT grow, and TS compiles green while runtime iteration sees the new slot. That's a silent-divergence trap.
  2. Five separate `Record<ResourceType,X>` literals (`ATTRACTOR_GUARANTEE`, `RESOURCE_DISPLAY`, `RESOURCE_PROFILES`, `SLOT_GLYPH`, `harvestYield`) still hand-enumerate every slot. TS will at least complain when a new slot is added (exhaustiveness), so this isn't a silent failure — but it directly contradicts the architectural narrative in the diff comments ("ONE entry in resources.json … every UI grid picks it up automatically").
- Fix: Derive the tuple from JSON at module load and let TS infer the literal union from it; replace the five hardcoded Records with `Object.fromEntries(RESOURCES.map(r => [r.id, ...]))` builders that pull defaults from the JSON itself. Concretely:

```ts
// components.ts
import resourcesJson from '@/config/resources.json';
export const RESOURCE_TYPES = resourcesJson.resources.map(r => r.id) as
  readonly (typeof resourcesJson.resources[number]['id'])[];
export type ResourceType = typeof RESOURCE_TYPES[number];

// resource-profiles.ts (one example)
export const RESOURCE_PROFILES: Record<ResourceType, ResourceProfile> =
  Object.fromEntries(RESOURCES.map(r => [r.id, buildProfile(r)])) as Record<…>;
```

If the union truly needs to stay typed at design time, document in CLAUDE.md: "adding a slot = JSON row + components.ts tuple addition + grep for `Record<ResourceType` and update each." The current state is the worst of both worlds.

#### H2. `wildfireSystem` and `volcanoSystem` do O(burningTiles × entities) world queries per tick

- Severity: High
- Files: `src/ecs/systems/wildfire.ts:112-122`, `src/ecs/systems/volcano.ts` (lava-damage loop, around L160-180)
- Why it matters: Inside each burning-tile loop iteration, the code calls `for (const e of game.world.query(Health, HexPosition))`. With 50 entities and 30 simultaneous burns (well under `maxConcurrent`), that's 1,500 entity scans per spread tick. With 200 entities and a forest-fire chain at maxConcurrent (likely 100s by default), it's 20k+ scans. The economy tick already does many full-world scans; piling another loop-per-burn is the kind of cost the user will notice as stuttering during dramatic moments — exactly the wrong time.
- Fix: Hoist the query once per tick into a `Map<tileKey, Entity[]>` and look up by key:

```ts
const entitiesByTile = new Map<string, Entity[]>();
for (const e of game.world.query(Health, HexPosition)) {
  const pos = e.get(HexPosition);
  if (!pos) continue;
  const k = getHexKey(pos.q, pos.r);
  const list = entitiesByTile.get(k) ?? [];
  list.push(e);
  entitiesByTile.set(k, list);
}
// then inside the burning-tile loop:
for (const e of entitiesByTile.get(key) ?? []) { … }
```

Same pattern for volcano lava damage. This drops the per-tick cost from O(burns × entities) to O(entities + burns).

#### H3. `pathFollowSystem` calls `hasFortifyAdjacent` per arrival — full Building query each call

- Severity: High
- File: `src/ecs/systems/path-follow.ts:27-43, 105-120`
- Why it matters: Every time a unit steps onto a `MOUNTAIN_PASS` tile, the system runs `world.query(Building, HexPosition, FactionTrait)` to check for a faction Wall/Watchtower within radius 1. With dozens of units pathing across a wartorn map, this can hit every tick. The query rebuilds the entire building list per call.
- Fix: Either (a) hoist a `Map<tileKey, Building[]>` once at the top of `pathFollowSystem`, or (b) pre-compute a `Set<tileKey>` of "fortified-radius tiles per faction" once and do `fortifiedByFaction[ownFaction].has(stepKey)`. Option (b) is the right shape because the data is small and stable mid-tick.

#### H4. AI `ai-player.ts` is becoming a god module (700+ lines, 6 evaluator classes, scattered ad-hoc helpers)

- Severity: High
- File: `src/ai/ai-player.ts` (now 728 lines, was ~440)
- Why it matters: Six evaluator classes, three goal classes, `MILITARY_TYPES` defined twice (once in `ownedMilitaryCount` as a local Set on every call, once as a module const), helper functions intermingled with class definitions, multiple inline `M_FUN.QA.AIVAI.TUNE` patches with PATTERN-B/C/D/G/I/L codes. This module is now where the next bug will hide.
- Fix:
  - Split into `src/ai/evaluators/{build,train,military,patrol,resign}.ts`.
  - Extract `src/ai/queries.ts` for `ownedBuildingCount`, `ownedPeonCount`, `ownedMilitaryCount`, `firstMilitary`, `discoveredEnemyTile`, `freeBuildTile`, `firstPulsingTile`.
  - Define `MILITARY_TYPES` once as a frozen module const; the local `new Set(['Footman'…])` in `ownedMilitaryCount` (line ~163) allocates every call.
  - Move `RAGE_QUIT_THRESHOLD = 180` into ai-personalities or mapgen tuning; it's literally defined twice in this file (once in `discoveredEnemyTile`, once in `MilitaryEvaluator.calculateDesirability`).

#### H5. `RAGE_QUIT_THRESHOLD` duplicated across two functions

- Severity: High (single source of truth)
- File: `src/ai/ai-player.ts` two sites: `discoveredEnemyTile` and `MilitaryEvaluator.calculateDesirability`
- Why it matters: Two `const RAGE_QUIT_THRESHOLD = 180` in the same file. Tweaking one and forgetting the other silently breaks the gate (you'd see military boost without the rage-quit fallback target, or vice versa).
- Fix: Hoist to a module-level `const` (or even better, into the AI personality JSON so different personalities can rage-quit at different thresholds).

### Medium (P2 — plan for next sprint)

#### M1. `BASE_BIAS`/`BIAS_RADIUS` constants duplicated in two harvest-assign sites

- Severity: Medium
- Files: `src/rules/peon-rules.ts:62-63`, `src/game/game-state.ts:879-880` (in `assignAllPeonsToHarvest`)
- Why it matters: The comment in `game-state.ts` literally calls this out: "Centralising this in one shared helper would be cleaner; for now both call sites use the same constants." Following the inlined TODO is exactly the kind of thing that drifts when one constant changes.
- Fix: Move `nearestResourceWithBaseBias(peonQ, peonR, baseQ, baseR, sites)` into `src/rules/peon-rules.ts` as the exported helper; have `assignAllPeonsToHarvest` call it. Delete the inline copy.

#### M2. `runEconomyTick` is now a 230+ line orchestrator with no internal structure

- Severity: Medium
- File: `src/game/game-state.ts:1008+` (after the diff)
- Why it matters: The function strings together pathFollow → status-attributes → volcano → wildfire → quake-decay → hidden-bonus → supply-recompute → kills-by-zone → death → … with comments to delineate phases. It's edited in this PR (added wildfire/volcano/quake/status); each future system gets jammed in line. The function is creeping past the 50-line maintainability threshold cited in your CLAUDE.md.
- Fix: Extract the dynamic-terrain block into `tickDynamicTerrain(game, delta)` (volcano + wildfire + quake-decay); extract kills-by-zone classification into `classifyAndAttributeKills(game, deathResult)`. Keeps `runEconomyTick` as a readable phase orchestrator.

#### M3. `paintMountainMassif` (148 lines) has high cognitive complexity

- Severity: Medium
- File: `src/core/board.ts:209-356`
- Why it matters: Single function does noise generation, peak/saddle/foothill cutoffs, walkability inline-recomputation, two-pass isthmus detection with a snapshot Set, and conversions. Branch-density is high and the "stack" logic (which biomes can be over-painted vs which are protected) is implicit in the if-chain.
- Fix: Split into three: `paintPeakRings(tiles, noise, intensity)` (handles peak/saddle/foothill stacking), `findIsthmusCandidates(tiles)` (returns string[] for conversion), `convertIsthmusToPass(tiles, keys)`. Each is unit-testable independently. The current monolith is testable end-to-end but hard to reason about per-rule.

#### M4. New ECS systems duplicate "find entities on tile" pattern

- Severity: Medium
- Files: `src/ecs/systems/wildfire.ts:112`, `src/ecs/systems/volcano.ts` lava-damage, `src/ecs/systems/status-attributes.ts:75`
- Why it matters: Three different systems implement variations of "iterate Health-bearing entities, derive their tile key, do X if key matches." Each rolls its own loop. The natural abstraction is a `getEntitiesOnTile(world, key)` query — or better, a `tileIndex: Map<tileKey, Entity[]>` rebuilt once per tick by an early system that downstream systems consume.
- Fix: Add `tickEntityTileIndex(game)` as the first sub-system inside `runEconomyTick`; have wildfire / volcano / status-attributes consult it. Drops three full `world.query(Health, HexPosition)` scans to one.

#### M5. `statusAttributesSystem` reads-then-mutates `h` directly, sidestepping ECS write semantics

- Severity: Medium
- File: `src/ecs/systems/status-attributes.ts:90-94`
- Why it matters: The code mutates `h.disease = dur` AND calls `e.set(Health, {...h, disease: dur, …})`. The comment explains: "Mutate via set so the subsequent disease branch sees the refreshed value. (h is a snapshot; mutating h.disease alone would be lost on the next .get().)" The fix is correct but fragile — anyone reading the code later might think the `h.disease = dur` is the operative write and remove the `e.set(...)`, breaking persistence. There's also an explicit "Coderabbit MAJOR — re-read Health here" on line ~125 acknowledging the same trap.
- Fix: Don't mutate `h` directly — always pipe through `e.set` then re-read via `e.get(Health) ?? h` if needed. Make the snapshot's read-only nature explicit by destructuring into named locals (`const { current, disease, … } = h`) rather than holding the snapshot object.

#### M6. `serialize-game.ts` `pickEconomy` casts `e.killsByZone` as `Record<string, unknown> | undefined` three times

- Severity: Medium (code duplication; type narrowing missed)
- File: `src/persistence/serialize-game.ts:298-305`
- Why it matters: The same expression `(e.killsByZone as Record<string, unknown> | undefined)?.X` is written three times. Extract once, narrow once.
- Fix:
```ts
const kbz = (e.killsByZone ?? {}) as Record<string, unknown>;
killsByZone: {
  skirmish: safeFinite(kbz.skirmish, 0),
  encroachment: safeFinite(kbz.encroachment, 0),
  assault: safeFinite(kbz.assault, 0),
},
```

#### M7. `MILITARY_TYPES` Set re-allocated per call in `ownedMilitaryCount`

- Severity: Medium
- File: `src/ai/ai-player.ts:163`
- Why it matters: `const MILITARY = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet'])` lives inside the function body. Every AI tick allocates this Set. There's already a module-level `const MILITARY_TYPES = new Set([…])` at line 486 — the helper just doesn't use it.
- Fix: Delete the inner `MILITARY` Set; use the module const. Same for `MoveMilitaryGoal.activate` which checks against `MILITARY_TYPES` correctly.

#### M8. `wildfires` BurnState mutated in place rather than via Map.set

- Severity: Medium
- File: `src/ecs/systems/wildfire.ts:96-103`
- Why it matters: `state.secondsSinceTick += dt` and `state.burnTicksRemaining -= 1` mutate the BurnState object directly. That's fine here because Map values are stored by reference, but the rest of the codebase (ECS components, volcano fertileTiles) uses immutable-snapshot + Map.set semantics. Mixing styles within `game.wildfires` makes save serialisation reasoning harder (you'd need to know whether `entries()` returns live or frozen snapshots).
- Fix: Either commit to in-place mutation everywhere with a comment noting BurnState is mutable, OR switch to `game.wildfires.set(key, {...state, burnTicksRemaining: state.burnTicksRemaining - 1})`. Pick one, document it.

#### M9. Volcano `nav-graph rebuild on every eruption tick` may be unnecessary

- Severity: Medium
- File: `src/ecs/systems/volcano.ts:135-138`
- Why it matters: `game.navGraph = buildNavGraph(game.board);` runs on EVERY eruption AND every LAVA revert. `buildNavGraph` is O(tiles²) in the worst case (per `src/core/pathfinding`). At 28-radius medium maps that's ~2500 tiles → millions of distance checks. If an eruption flips 6 tiles and reverts 1, the entire navmesh rebuilds.
- Fix: Either pass a `dirtyKeys: Set<string>` into a partial rebuild, OR mark `game.navGraphDirty = true` and lazy-rebuild on next `aiSystem` pass (consolidating multiple flips per turn into one rebuild).

#### M10. `as unknown as` casts in 6 config loaders are unnecessary

- Severity: Medium
- Files: `src/config/economy.ts:92`, `src/config/asset-metadata.ts:34`, `src/config/combat.ts:120`, `src/config/world.ts:213`
- Why it matters: After `_validated = Schema.parse(...)`, `_validated` already has the right shape; the `as unknown as EconomyConfig` is reassuring TS that it knows what the schema produces, but `z.infer<typeof Schema>` IS the type. The double-cast suggests the type and the Zod schema have drifted and someone papered over the resulting error. If they ever match again, the cast becomes invisible scaffolding that hides the next drift.
- Fix: `export const ECONOMY = _validated;` and `export type EconomyConfig = typeof ECONOMY;` (or `z.infer<…>`). Lose the cast; let TS verify alignment.

### Low (P3 — backlog)

#### L1. `paintShallowsRing` allocates a `LAND_TYPES` Set every call

- Severity: Low
- File: `src/core/board.ts:204-214`
- Fix: Hoist to module-level `const`.

#### L2. `__game = g` and `__game_advanceFrames`, etc. use `as unknown as DevWindow` 6 times in `App.tsx`

- Severity: Low (intentional dev shim)
- File: `src/App.tsx:131, 135, 150, 162, 182, 373`
- Fix: Declare `DevWindow` once at the top, cast `const dev = window as unknown as DevWindow` in a single line, use `dev.__game = g`. Same pattern, less noise.

#### L3. `paintSwampPatches` uses a hand-rolled neighbour-offset array

- Severity: Low
- File: `src/core/board.ts:467-474`
- Why it matters: `const NEIGHBORS = [[1,0],[0,1],…]` duplicates what `hexNeighbors` already produces.
- Fix: Use `hexNeighbors(tile.q, tile.r)` like every other paint function does.

#### L4. Magic-number `MAX_WILDFIRES = 500` inside `pickEconomy/deserialize` divorced from `WILDFIRE_TUNING.maxConcurrent`

- Severity: Low
- File: `src/persistence/serialize-game.ts:198`
- Fix: `WILDFIRE_TUNING.maxConcurrent * 2` (or expose `MAX_PERSISTED_WILDFIRES` from the tuning JSON).

#### L5. Test stubs use `as any` to bypass GameState type

- Severity: Low
- File: `src/ecs/systems/__tests__/wildfire.test.ts:33, 196`
- Why it matters: `biome-ignore lint/suspicious/noExplicitAny` is present, so this is acknowledged. Still, a `MakeStubGame` helper type that captures the actual partial-fields set would be more durable.
- Fix: Define `type StubGame = Pick<GameState, 'wildfires' | 'eventRng' | 'world'>` and have `makeStubGame()` return `StubGame & Partial<GameState>` cast as `GameState` once; eliminates the `as any` chain.

#### L6. `volcanoSystem` step 4 comment is duplicated ("// 4. Rebuild …" and "// 4. Damage units …")

- Severity: Low
- File: `src/ecs/systems/volcano.ts` step 4 + step 4
- Fix: Renumber to 4 / 5.

#### L7. `MILITARY_TYPES` module const declared AFTER its first use in `MoveMilitaryGoal.activate`

- Severity: Low (hoisting works, but reads oddly)
- File: `src/ai/ai-player.ts:486` (declaration), used in `MoveMilitaryGoal.activate` at L469
- Fix: Move the const to the top of the AI helpers block before any class uses it.

## Findings by Category

- Code quality: H4, H5, M1, M2, M3, M5, M6, M7, M8, L1, L2, L3, L6, L7  (14)
- Architecture: H1, H2, H3, M4, M9  (5)
- Determinism: 0 violations found in sim paths; existing `performance.now()` uses are in exempt render/perf-probe paths
- Type system: M10, L5  (2)
- Tech debt: H1, H4, M1, M2, M3  (5)

## Architectural Wins Worth Calling Out

- **Zod-validated config loaders with `$comment`-stripping**: `src/config/mapgen.ts`, `src/config/resources.ts`, `src/rules/eras.ts`, `src/config/ai-personalities.ts`, `src/persistence/serialize-game.ts` — all follow the same pattern (load JSON, strip comments, parse with Zod, export typed const). This is house style now; great precedent.
- **Snapshot versioning + migration table** in `serialize-game.ts`: clean v1→v2 migration, defaults that round-trip via `safeFinite`, and length caps on incoming strings/arrays to prevent NaN-poison. The pattern scales.
- **Determinism rigour in new systems**: wildfire, volcano, quake all use `game.eventRng` with stable-sorted iteration before any PRNG pick. No `Math.random()` slipped into a single sim path.
- **`paintMountainMassif` isthmus snapshot fix** (`src/core/board.ts:329-342`): exactly the right pattern for "read topology, then mutate" — snapshot the set first, do all reads against the frozen view, then mutate. The Coderabbit-flagged cascade bug is properly addressed.
- **`matchElapsedSeconds` turn-aware helper**: small, focused, replaces a scattered `game.clock.elapsed` read with a semantically correct accessor that works in both RTS and turn-based modes. Good abstraction at the right level.
- **`assertHexKey` / branded IDs** (in `src/core/branded-ids.ts` + tests): brings nominal typing to the tile/entity/faction key space — exactly the place where a stringly-typed bug would corrupt the save format.

## Recommended Action Plan

1. **Before merge** (P1 fixes):
   - H1: Either truly derive `RESOURCE_TYPES` from JSON OR document the dual-edit contract in CLAUDE.md. Replace hardcoded `Record<ResourceType,X>` literals with `Object.fromEntries(RESOURCES.map(...))` builders.
   - H2 + H3 + M4: Add a `buildEntityTileIndex(world)` helper, hoist the index once per tick in `runEconomyTick`, plumb into wildfire, volcano, status-attributes, path-follow fortify-check. Big perf win for tiny diff.
   - H4: Carve `src/ai/evaluators/*.ts` files out of `ai-player.ts`. Extract `src/ai/queries.ts` for the helpers.
   - H5: Hoist `RAGE_QUIT_THRESHOLD` to a module const (or AI personality JSON).
2. **Next sprint** (P2 fixes):
   - M1: Centralise `nearestResourceWithBaseBias` in `peon-rules.ts`, delete the inline copy in `game-state.ts`.
   - M2: Extract `tickDynamicTerrain` + `classifyAndAttributeKills` from `runEconomyTick`.
   - M3: Split `paintMountainMassif` into peak-rings / find-isthmus / convert-isthmus.
   - M5 + M8: Audit ECS write-vs-mutate consistency; pick one.
   - M9: Lazy-rebuild navmesh on `navGraphDirty` flag.
   - M10: Drop `as unknown as Config` casts; let `z.infer<…>` be the source.
3. **Backlog** (P3): L1–L7 are quick wins that someone can grab on any cleanup pass.

## Notes on what was checked

- `grep -rn 'Math\.random()' src/{core,ecs,world,game,ai,config}` — 0 hits in deterministic paths.
- `grep -rn 'Date\.now\(\)\|performance\.now\(\)' src/{core,ecs,world,game,ai}` — 5 hits, all in exempt paths (device-tier perf probe, render-layer animations).
- `grep -rn 'as any\b\|@ts-ignore\|@ts-expect-error' src/` — 2 production casts in `__tests__/wildfire.test.ts` (acknowledged via `biome-ignore`), 3 legitimate `@ts-expect-error` in branded-ids tests proving negative behaviour, 6 `as unknown as DevWindow` in App.tsx dev shims (acceptable).
- Verified `gates.json` ban patterns hold across the diff (no Math.random in /core/ecs/world/game, no Date.now/performance.now in /ecs/game).
- Tests added: 17 new `*.test.ts` files. AI-vs-AI balance harness (`tests/e2e/ai-vs-ai-balance.spec.ts`) is the standout — 294 lines pinning personality-cross matchups.
