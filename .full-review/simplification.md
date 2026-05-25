# Simplification Sweep: PR #10 (fix/mountain-massif-not-strip)

Scope: ~80 commits vs `origin/main`. Read-only analysis. The user-stated intent of this PR
is "JSON-first archetype" — `src/config/resources.json` is now the single source-of-truth
for resource slots, with `src/config/resources.ts` exporting `RESOURCES`, `RESOURCE_IDS`,
`sourcesFor()`, `consumersFor()`. `ResourceType` and `RESOURCE_TYPES` in `src/ecs/components.ts`
already flow from the registry. Most code-side simplification value lives in finishing the
sweep through the per-resource `Record<ResourceType, X>` tables in `src/rules/*`,
`src/hud/format.ts`, and `src/config/economy.ts` that still hand-enumerate the slots.

## Summary
- Quick wins (≤30 min each, immediate ROI): 11
- Medium refactors (~1–3h): 5
- Larger refactors (>3h, schedule separately): 3

## Quick Wins

### QW-1 — `src/hud/format.ts:10-22` — SLOT_GLYPH duplicates `RESOURCES[i].icon`
Current: hand-listed `Record<ResourceType, string>` of emoji per slot.
Proposed:
```ts
import { RESOURCES } from '@/config/resources';
const glyphFor = (slot: ResourceType) =>
  RESOURCES.find(r => r.id === slot)?.icon ?? '?';
```
Why: every slot in `resources.json` already has `"icon"`. Adding a 6th slot
edits JSON only — today it also requires editing this table. **Effort: 10 min.**

### QW-2 — `src/rules/attractor.ts:24-39` — ATTRACTOR_GUARANTEE hand-lists every slot
Current: literal `Record<ResourceType, number>` with explicit `wood/stone/ore/.../amber: N`.
Proposed: move per-slot guarantee onto the registry (add optional
`attractorGuarantee?: number` to `ResourceConfig`), then `RESOURCES.find(r => r.id === type)?.attractorGuarantee ?? 0`.
Bonus: loop at line 94 (`['wood', 'stone', 'gold'] as const`) becomes
`RESOURCES.filter(r => (r.attractorGuarantee ?? 0) > 0).map(r => r.id)`. **Effort: 20 min.**

### QW-3 — `src/rules/display.ts:41-59` — RESOURCE_DISPLAY hand-lists every slot
Current: per-slot `{label, color, domId}` table.
Proposed: derive `label` and `domId` (which is just `val-${id}`) from `RESOURCES`;
move only the per-slot `color` onto `ResourceConfig` (one new optional field).
`resourceDisplayFor(type)` becomes a 4-line accessor that pulls from the registry.
**Effort: 15 min.**

### QW-4 — `src/rules/resource-profiles.ts:48-126` — RESOURCE_PROFILES duplicates `resources.json#sources[].biomes`
Current: hand-listed `biomes: new Set([...])` per resource; same data lives in
`resources.json#<slot>.sources[].biomes`.
Proposed:
```ts
import { sourcesFor } from '@/config/resources';
function biomesFor(slot: ResourceType): Set<string> {
  return new Set(sourcesFor(slot).flatMap(s => s.kind === 'biome-node' ? s.biomes : []));
}
```
Then `RESOURCE_PROFILES` keeps only what JSON does not yet carry: `meshLogicalId`,
`meshTint`, `harvestYield`, `topupAmount`. **Effort: 25 min.**

### QW-5 — `src/ai/ai-player.ts:486` — local MILITARY_TYPES Set duplicates `MILITARY_ROLES`
Current: `const MILITARY_TYPES = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet']);`
Proposed: `import { MILITARY_ROLES as MILITARY_TYPES } from '@/rules/unit-profiles';`
(other systems already do this — `offensive-behavior.ts:19`, `encroachment.ts:11`).
**Effort: 5 min.**

### QW-6 — `src/ai/ai-player.ts:162` — `ownedMilitaryCount` re-declares the same Set
Same as QW-5 but inside `ownedMilitaryCount`. Replace the local literal with the
imported `MILITARY_ROLES`. **Effort: 5 min.**

### QW-7 — `src/ai/ai-player.ts:95, 600` — `starved` hardcodes three resource floors
Current: `eco.wood < 10 && eco.gold < 10 && eco.stone < 10` (duplicated in two places).
Proposed: pull a `starvationFloor: number` from the registry (or a module-local
`STARVATION_FLOORS: ResourceType[] = ['wood', 'gold', 'stone']`) and check via
`STARVATION_FLOORS.every(slot => eco[slot] < 10)`. Better: derive from
`RESOURCES.filter(r => r.kind === 'harvest' && r.sources.some(s => s.kind === 'biome-node'))`
so a new economy slot extends the floor automatically. Extract to a single helper
`isStarved(eco)` consumed by both call sites. **Effort: 15 min.**

### QW-8 — `src/core/board.ts:120-122` — `hexDistFromCenter` is a one-line wrapper
Current: local helper that delegates to `hexDistance(q, r, 0, 0)`.
Proposed: inline the 6 call sites with `hexDistance(tile.q, tile.r, 0, 0)`, drop
the wrapper. The wrapper's comment even says "M_REGISTRY.23 — collapses to
`hexDistance(q, r, 0, 0)`". **Effort: 5 min.**

### QW-9 — `src/core/board.ts:497-504, 557-564` — `paintSwampPatches` + `paintInlandLake` duplicate the 6-axial NEIGHBORS table
Current: two identical `const NEIGHBORS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const;`
Proposed: there is already `hexNeighbors(q, r)` in `@/core/hex` — both functions
should call that instead of the local axial-offset table + manual `getHexKey`. Or
lift NEIGHBORS to a module-level const (same module is fine). **Effort: 10 min.**

### QW-10 — `src/ai/ai-player.ts:715-723` — `randomPerimeterTile` redeclares the 6-axial NEIGHBORS table
Same pattern as QW-9 — already a hand-roll of axial offsets where `hexNeighbors()`
would do. **Effort: 5 min.**

### QW-11 — `src/persistence/serialize-game.ts:154-251` — `deserializeGame` repeats the same defensive shape on `volcano.lavaTiles` + `volcano.fertileTiles`
Current: two near-identical 12-line `if (Array.isArray(...)) for (const pair of v.X.slice(0, 500))` blocks (lines 222-232 vs 235-245).
Proposed: extract `restoreTileTimerMap(out: Map, src: unknown, cap = 500)` and call
it twice. **Effort: 15 min.**

## Medium Refactors

### MR-1 — `src/config/economy.ts:16-22, 31-39, 75-82` — `ResourceCostSchema` + `StartingResourcesSchema` hand-list `wood/stone/gold/science/mana`
Current:
```ts
const ResourceCostSchema = z.object({
  wood: z.number().int().nonnegative().optional(),
  stone: z.number().int().nonnegative().optional(),
  gold: z.number().int().nonnegative().optional(),
  science: z.number().int().nonnegative().optional(),
  mana: z.number().int().nonnegative().optional(),
});
```
Proposed: build the Zod schema by reducing over `RESOURCE_IDS`:
```ts
const ResourceCostSchema = z.object(
  Object.fromEntries(RESOURCE_IDS.map(id => [id, z.number().int().nonnegative().optional()])),
);
```
Same shape for `StartingResourcesSchema`. Also collapses the `interface
EconomyConfig.startingResources` block at lines 75-82 to
`Partial<Record<ResourceType, number>> & { maxSupply: number }`.
This is the single highest-ROI JSON-first conversion remaining: this schema
is THE bottleneck where adding a new slot to `resources.json` still fails
schema validation because economy.ts doesn't know about it. **Effort: 1 h.**

Caveat: `ResourceCostSchema` today omits `ore/food/peat/amber` — meaning a
building cost in `economy.json` keyed on those slots would be silently
stripped. The Zod schema is currently INCORRECT against the slot list.
This refactor also fixes a latent bug.

### MR-2 — `src/persistence/serialize-game.ts:296-305` — `killsByZone` hand-lists three zone keys
Current: three `safeFinite((e.killsByZone as ...)?.skirmish, 0)` lines with the
same triple-cast shape.
Proposed:
```ts
const ZONE_KEYS = ['skirmish', 'encroachment', 'assault'] as const;
const src = (e.killsByZone as Record<string, unknown> | undefined) ?? {};
const killsByZone = Object.fromEntries(
  ZONE_KEYS.map(k => [k, safeFinite(src[k], 0)]),
) as Record<typeof ZONE_KEYS[number], number>;
```
The cast-soup goes away and adding a 4th zone class is one tuple entry.
**Effort: 30 min.**

### MR-3 — `src/game/game-state.ts:1258-1320` — three repeated `for (const e of game.world.query(Building, FactionTrait))` Wonder loops
There are three identical query loops (lines 1124-1134 supply rebuild, 1259-1267
wonder countdown, 1309-1317 age-of-strata wonder check). Each iterates buildings
filtered by faction and tests `b.buildingType === 'Wonder'`.
Proposed: a single helper `hasCompleteBuilding(game, faction, type): boolean`
and `completeBuildings(game, faction): {type, tier}[]` (or generic `forEachBuilding(game, faction, cb)`)
that the three call sites share. **Effort: 45 min.**

### MR-4 — `src/core/board.ts:241-272` (paintShallowsRing) — `LAND_TYPES` Set hand-lists biomes
Current: hand-list of 9 biome string literals.
Proposed: derive from `biomeFlagsFor(type).walkable && type !== 'BEACH' && !water`
— or, better, add `landform: 'land' | 'water' | 'beach'` to `biome-flags.ts` so this
becomes `biomeFlagsFor(t.type).landform === 'land'`. The biome-flags table
ALREADY exists for the same iterate-not-enumerate reason. **Effort: 45 min.**

### MR-5 — `src/ai/ai-player.ts` — three Evaluator classes (`BuildEvaluator`,
`TrainEvaluator`, `MilitaryEvaluator`, `PatrolEvaluator`) share the same
constructor `(personalityMul = 1.0)` and a near-identical
`bias × profile.weight × personalityMul` arithmetic block.
Proposed: extract a `PersonalityWeightedEvaluator` base class that owns the
`personalityMul` field and a `weightedScore(base, profile, faction, owner)` helper.
The four evaluators shed ~20 lines of constructor + scoring boilerplate each.
**Effort: 1.5 h.**

## Larger Refactors

### LR-1 — `src/game/game-state.ts:runEconomyTick (lines 924-1328)` — 400-line tick orchestrator
Why it can't be a quick win: the function mixes 12+ independent subsystem advancements
(clock, weather, random events, AI tick, spawn, ai-system, stance, path-follow,
status-attributes, volcano, wildfire, shake decay, hidden-bonus, encroachment,
job-routing, harvest, build, science, offensive-behavior, projectiles, observed
update, supply recompute, combat, deposit, death, building-death, animation,
wonder, strata-wars, age-of-strata, win-loss eval, score integral). The
ordering matters for determinism, so any extraction needs explicit phase
naming + a unit test per phase that pins the order.
Proposed:
```ts
const TICK_PHASES: Array<(g: GameState, delta: number) => void> = [
  tickAlwaysOn,    // clock + weather + random-events + autosave + path-follow
  tickAiBrains,    // ai.tick + spawn + ai-system + stance
  tickAttributes,  // status-attrs + volcano + wildfire + shake-decay + hidden-bonus
  tickEconomy,     // encroachment + job-routing + harvest + build + science
  tickCombat,      // offensive-behavior + projectiles + observed + supply + combat
  tickSettlement,  // deposit + death + building-death + animation
  tickWinLoss,     // wonder + strata-wars + age-of-strata + eval + score
];
```
Each phase function lives in its own file; `runEconomyTick` becomes a 20-line
gate + loop. **Effort: 4-6 h, plus test-pinning to prove ordering.**

### LR-2 — Resource registry should absorb the remaining per-slot `Record<ResourceType, X>` tables
Why it can't be a quick win: this is the cumulative pay-off of QW-1..QW-4 + MR-1.
Once `ResourceConfig` carries `color`, `glyph`, `attractorGuarantee`, `harvestYield`,
`topupAmount`, `meshLogicalId`, `meshTint`, the JSON file becomes the single
source-of-truth the PR's commit messages claim. Today the registry is
~40% of the way there.
Suggested order: QW-1 (glyph) → QW-2 (attractor) → QW-3 (display/color) →
QW-4 (biomes) → MR-1 (zod schema). After this, `resource-profiles.ts` is
only `meshLogicalId/meshTint/harvestYield/topupAmount` (4 fields × N slots) and
the rest is JSON. **Effort: 4-5 h cumulative; do as the quick-win batch.**

### LR-3 — `src/core/board.ts` — paint pipeline can be made fully data-driven
Why it can't be a quick win: `runGenTimePass` mixes mode-dispatched passes
(via `mapTypeRule`) with fixed-order paint calls (`paintBeachRing`,
`paintMountainMassif`, `paintSwampPatches`, `paintShallowsRing`, `paintQuicksandSwirls`)
that always run. The hardcoded sequence prevents adding a new biome-paint
pass (e.g. tundra, jungle, lava) from being purely JSON-driven.
Proposed: lift the fixed sequence into `mapgen.json#mapTypes[x].paintSequence:
string[]`, then `runGenTimePass` iterates the sequence. Each paint function
gets a stable id in a registry `Record<string, PaintPass>`. The existing
`HYDROLOGY_PASSES` table is the right shape; expand it to cover all passes.
**Effort: 3-4 h, test-heavy because paint order is determinism-load-bearing.**

## JSON-First Sweep Specifically

The files below still hand-enumerate resource slots when `RESOURCE_IDS` /
`RESOURCES` / `sourcesFor(id)` would do. Quoted format: `file:line — what
it hardcodes — registry-iterating shape`.

- `src/config/economy.ts:16-22` — `ResourceCostSchema` lists `wood/stone/gold/science/mana` (missing 4 slots, **latent bug**) — replace with `z.object(Object.fromEntries(RESOURCE_IDS.map(id => [id, z.number().int().nonnegative().optional()])))`.
- `src/config/economy.ts:31-39` — `StartingResourcesSchema` lists `wood/stone/gold/science/mana?` — same `Object.fromEntries(RESOURCE_IDS.map(...))` shape.
- `src/config/economy.ts:75-82` — `EconomyConfig.startingResources` interface — replace with `Partial<Record<ResourceType, number>> & { maxSupply: number }`.
- `src/hud/format.ts:10-22` — `SLOT_GLYPH` — drop; resolve via `RESOURCES.find(r => r.id === slot)?.icon`.
- `src/rules/display.ts:41-59` — `RESOURCE_DISPLAY` — move `color` onto `ResourceConfig`, derive `label`+`domId` from `RESOURCES`.
- `src/rules/resource-profiles.ts:48-126` — per-slot literal `biomes: new Set([...])` — derive via `sourcesFor(id).flatMap(s => s.kind === 'biome-node' ? s.biomes : [])`.
- `src/rules/attractor.ts:24-39` — `ATTRACTOR_GUARANTEE` table + the literal `['wood', 'stone', 'gold'] as const` at line 94 — add `attractorGuarantee?: number` to `ResourceConfig` and iterate `RESOURCES.filter(r => (r.attractorGuarantee ?? 0) > 0)`.
- `src/ai/ai-player.ts:95, 600` — `eco.wood < 10 && eco.gold < 10 && eco.stone < 10` — drive from a `STARVATION_FLOOR` list or a `ResourceConfig.starvationFloor?` field; iterate.
- `src/ai/ai-player.ts:162, 486` — local `MILITARY` / `MILITARY_TYPES` Set literals — already replaced elsewhere by `MILITARY_ROLES` import from `@/rules/unit-profiles`; do the same here.
- `src/game/game-state.ts:511-512` — `const type = roll < 0.6 ? 'wood' : roll < 0.85 ? 'stone' : 'gold'` + nested-ternary amount — nested-ternary anti-pattern AND hardcoded slot list. Move bonus weights onto `ResourceConfig.hiddenBonus?: { weight: number; amount: number }` and pick from `RESOURCES.filter(r => r.hiddenBonus)`.
- `src/core/board.ts:241-251` — `LAND_TYPES` Set of 9 biome literals — derive from `biomeFlagsFor(t).landform === 'land'` (add `landform` to biome-flags table).
- `src/persistence/serialize-game.ts:296-305` — `killsByZone` triple lookup — drive from `ZONE_KEYS` tuple.

---

## Summary for orchestrator (5 sentences)

The PR ships `src/config/resources.json` as the new resource registry source-of-truth and `RESOURCE_TYPES` already flows from it, but several follow-on tables (`SLOT_GLYPH` in `src/hud/format.ts`, `RESOURCE_DISPLAY` in `src/rules/display.ts`, `RESOURCE_PROFILES` biomes in `src/rules/resource-profiles.ts`, `ATTRACTOR_GUARANTEE` in `src/rules/attractor.ts`, the Zod `ResourceCostSchema`/`StartingResourcesSchema` in `src/config/economy.ts`) still hand-enumerate the slot list — and `economy.ts`'s schema is actually missing `ore/food/peat/amber`, a latent silent-strip bug. I identified 11 quick wins (~3 hours combined) that finish the JSON-first sweep — converting hardcoded slot tables to registry iteration — plus 5 medium refactors covering shared evaluator scaffolding in `src/ai/ai-player.ts`, repeated `world.query(Building, FactionTrait)` Wonder loops in `src/game/game-state.ts`, and the volcano-tile defensive-restore duplication in `src/persistence/serialize-game.ts:222-245`. Two duplicated 6-axial NEIGHBORS arrays in `src/core/board.ts` and `src/ai/ai-player.ts` should call `hexNeighbors()` (already exists in `@/core/hex`), and `MILITARY` Sets in `src/ai/ai-player.ts:162,486` should import `MILITARY_ROLES` like the other systems already do. Larger refactors include extracting the 400-line `runEconomyTick` into seven named phase functions, completing the resource-registry absorption of `meshLogicalId/color/harvestYield/topupAmount`, and lifting the `src/core/board.ts` paint sequence into `mapgen.json`. Report is at `/Users/jbogaty/src/arcade-cabinet/Aethelgard-Chronicles-of-Strata/.full-review/simplification.md`.
