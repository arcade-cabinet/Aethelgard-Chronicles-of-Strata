# 100 — M8: AI-as-Player, Perception & Golden-Path E2E

> **M_ARCH_UNIFY cross-reference (added 2026-05-23).** Pre-dates the
> unified Thing/Skin registry. The 4-layer model — Archetypes → Things
> → Slots → Skins — is the authoritative architectural shape for every
> visual/data fork in the codebase. See:
>
> - `docs/specs/103-particle-archetype.md` — keystone architectural pass
> - `docs/specs/10-architecture.md` — pillar's full M_ARCH_UNIFY block
> - `src/rules/building-profiles.ts` — Thing registry (M_REGISTRY.5)
> - `src/rules/unit-profiles.ts` — Thing registry (M_REGISTRY.1)
> - `src/rules/skins.ts` — Skin slot (M_REGISTRY.3/4/2)
>
> Per-section notes below mark where THIS pillar's text became
> superseded or extended by the unified-registry doctrine.

The destination, in one sentence: **the AI plays the game through the exact
same interface, perception, and action space as a human — so AI-vs-AI is
deterministic golden-path end-to-end testing.**

This is the organizing principle the faction-symmetry work serves. It is a
single sequential arc (docs → tests → code), not parallelizable.

## The five pillars

### 1. Faction symmetry — behavior identical, visuals divergent

Both factions (`player`, `enemy`) are built from the **same ECS traits, the
same systems, the same command API**. The ONLY divergence is the render layer:
a player Palace and an enemy hub are the same `Base` trait with the same
`build` behavior — they just resolve different GLB models.

- `Buildings.tsx` is deleted. `src/world/HomeBase.tsx` renders the player
  faction's structures; `src/world/EnemyBase.tsx` renders the enemy faction's.
  Both consume one shared `FactionBase` render core, parameterised by a
  `factionStyle` (which model set to use).
- ECS: a `Base` trait (faction, hub, member structures). `GoblinPortalTrait`
  → `EnemyBase` and the player Palace both become `Base` instances. The
  `GoblinPortal*` naming is fully removed.
- Every buildable structure has a player model AND an enemy model (Castle Kit
  vs Graveyard Kit). Structure *types* and their *costs/behaviors* are shared.

### 2. The command API is the ONLY action channel

`src/game/commands.ts` is the single way any actor changes the board — move,
build, train, set rally, attack. **A human tap and an AI decision both call the
same functions.** No system, no AI, ever mutates the ECS for a faction outside
`commands.ts`. This is what makes AI-vs-AI a true interface test.

The command API gains a `faction` parameter — a command is issued *by* a
faction, against *its* pieces, within *its* knowledge.

### 3. Perception — vision cones + fog of war

The board has **per-faction discovered state**. A faction knows only what it
has seen.

- Each unit and base has a **vision cone** (radius + arc; a base is a full
  circle, a unit a forward arc). Tiles within any of a faction's cones this
  tick are `visible`; tiles ever seen are `discovered`; the rest are `unknown`.
- `src/game/fog.ts` — per-faction fog state, updated each tick from unit/base
  positions + vision cones.
- Rendering: the player's fog dims `discovered` tiles and hides `unknown` ones
  (classic RTS fog). Enemy units in fog are not rendered.
- The AI's perception is **the same** — the enemy faction's `commands` may only
  target tiles/entities in *its* discovered set. No omniscience.

### 4. Yuka as a goal-driven player

The AI is not a spawn-and-charge script. It is a **goal-oriented player** that
reasons over the same WHYs a human has:

- *Why build a Farm?* — supply is near the cap and I want more units.
- *Why a Barracks?* — I have no military and an enemy was sighted.
- *Why expand / claim a resource?* — my economy is bottlenecked.
- *Why attack?* — I have a military edge and know where the enemy base is.
- *Why scout?* — large parts of the map are `unknown`.

yuka's `goal/` (GoalEvaluator, CompositeGoal) drives this. Each evaluator
scores a desire from the faction's *known* state; the highest-scoring goal
issues `commands.ts` calls. The enemy faction runs one AI "player"; the human
faction can be swapped to an AI player for testing.

### 5. AI-vs-AI golden-path E2E

With both factions as AI players sharing perception + commands, a full match is
deterministic (event PRNG + chronometer). The E2E harness:

- Swaps both factions to AI, runs N turns (10, 100, 1000).
- Each turn, probes **macro** (resource totals, supply, building count, map
  control %), **meso** (army composition, frontline position, tech), and
  **micro** (per-unit state, idle %, pathing health) state.
- Asserts invariants: no NaN positions, no stuck units, economy non-negative,
  the match terminates (one base falls) within a turn bound.
- Same seed → same match → a golden transcript that regression-tests the whole
  simulation.

## Build order — the M8 directive queue

Strictly sequential. Each step is docs-extended → tests-written → code-green
before the next.

1. **Faction model** — `Base` trait, faction-symmetric structure config; delete
   `GoblinPortal*`. Rename to `EnemyBase`/`HomeBase`.
2. **Render decomposition** — `FactionBase` core + `HomeBase`/`EnemyBase`;
   delete `Buildings.tsx`.
3. **Command API faction parameter** — `commands.ts` takes an issuing faction;
   enforce "own pieces only."
4. **Perception** — `fog.ts`, vision cones, per-faction discovered state.
5. **Fog rendering** — player fog overlay; hide unknown enemies.
6. **AI player** — yuka goal evaluators issuing commands from known state only.
7. **AI-vs-AI E2E harness** — swap both factions, turn loop, state probes,
   golden-transcript assertions.

Each step gets `docs/specs/` detail and a test batch before code. The directive
`.agent-state/directive.md` carries the decomposed task list.
