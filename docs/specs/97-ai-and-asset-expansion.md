# 97 — M7: yuka AI Subpackage & Asset Expansion

M7 is built on the `feat/aethelgard-initial-release` branch (this PR). Two
thrusts: promote the AI to a real yuka-backed subpackage, and mine the rest of
`references/` for the visual/audio richness a full game wants.

## Part 1 — The AI subpackage (`src/ai/`)

The AI currently lives in one file, `ecs/systems/ai.ts` — a hand-rolled
nearest-target scan + hex A*. It is promoted to `src/ai/`, a real subpackage
built on **yuka** (`^0.7.8`, already a dependency, currently unused).

### The model — yuka alongside koota

The koota ECS stays the simulation's single source of truth. yuka runs *beside*
it: a yuka `EntityManager` holds one `Vehicle` per enemy unit. Each tick:

1. Sync — copy each enemy's koota `HexPosition`/`Transform` into its yuka
   `Vehicle`.
2. yuka steps — `EntityManager.update(delta)` runs the `SteeringManager`
   (`FollowPathBehavior` along the hex-A* route, `ArriveBehavior` near the
   target) plus perception (vision/memory for retargeting).
3. Write back — copy `Vehicle.position` into the koota `Transform`/`HexPosition`.

The hex A* (`core/pathfinding.ts`) stays — it supplies the *route*; yuka
supplies the *behaviour/steering* along it. yuka's nav-mesh navigation is not
used (the board is a hex grid).

Yuka's internal `Math.random()` (AI micro-jitter) is left alone — it is not
reproducible game state. Everything else random stays on the event PRNG.

The `aiSystem` export keeps its call signature so `runEconomyTick` is
unchanged; its body is replaced by the `src/ai/` driver. The retarget cap
(`MAX_RETARGETS_PER_TICK`) folds into the yuka perception layer.

## Part 2 — Asset expansion

`references/` holds kits never ingested. M7 mines them — **replace + enrich**,
not just catalogue:

- **Buildings** — Castle Kit + Fantasy Town Kit replace the blocky Hexagon-Kit
  building stand-ins. Palace, Farm, Barracks become proper fantasy models.
- **Enemy bases & monsters** — the Graveyard Kit gives the Goblin Portal a real
  necropolis/graveyard base; KayKit Mystery Series 4 & 5 add monster variety
  beyond the single Orc.
- **Audio** — the fantasy-magic-spell and PixelLoops-UI sound packs (plus
  unused sfx in the already-ingested packs) extend the event→sound map.
- **Environment** — Tower Defense Kit + Nature Kit + Hexagon-Kit decoration
  props scatter ambient richness across biomes.

Every ingest goes through `scripts/asset-map.ts` + `pnpm assets:ingest`, keeps
the typed-manifest accessor contract, and embeds GLB textures (the
`embedAndWriteGlb` path). Assets are referenced by stable logical id.

## Execution

Worktree-isolated subagents, one per domain, parallel — each on its own git
worktree so there is no shared-tree edit race. They land as separate commits on
this branch. Determinism, the typed-config pattern, and `pnpm verify` green are
non-negotiable for every agent.
