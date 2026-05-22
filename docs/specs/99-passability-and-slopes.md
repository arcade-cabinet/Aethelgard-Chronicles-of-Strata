# 99 — Passability & Contextual Slopes

Written in response to playtest feedback: too many ramps, ramps everywhere,
trees on ramps, and a binary passable/impassable model that does not capture
that a sandy rise and a sheer rock cliff are different things.

This supersedes the `placeRamps`-on-every-eligible-edge model.

## The core idea — the biome pair classifies the transition

A one-level elevation change between two adjacent tiles is not one thing. Its
**traversal class is determined by the biome pair**:

| Transition kind | Example | Traversal |
|---|---|---|
| **Graded slope** | BEACH→GRASS, GRASS→FOREST, GRASS→DESERT | The rise is soft earth — naturally walkable. No ramp prop; the terrain mesh bevels the cliff edge into a slope. Pathfinding treats it as a normal step. |
| **Rock face** | STONE/HIGHLAND/MOUNTAIN involved on either side | A sheer cliff. **Impassable unless a built stair/ramp is placed**, and only on a few edges (chokepoints). |
| **Sheer** | level difference > 1, or any cliff with no slope/ramp | Not traversable. |

"Soft" biomes: BEACH, GRASS, FOREST, DESERT. "Hard" biomes: STONE/HIGHLAND,
MOUNTAIN. (LAKE/OCEAN are water — already non-walkable.) A transition is a
**graded slope** when *both* tiles are soft; it is a **rock face** when *either*
tile is hard.

## Passability — three classes, not a boolean

`tile.walkable` (boolean) is replaced/augmented. A tile-to-tile **edge** has a
passability class:

- `FLAT` — same level, both walkable: free movement.
- `SLOPE` — one-level change, graded (both-soft): free movement, the edge
  renders as a beveled slope.
- `RAMP` — one-level change, rock face, **and** a stair/ramp prop is placed on
  this edge: movement allowed only across the ramp.
- `BLOCKED` — everything else (rock face with no ramp, >1 level, water).

Pathfinding (`core/pathfinding.ts` `buildNavGraph`) adds an edge for `FLAT`,
`SLOPE`, and `RAMP`; never for `BLOCKED`. This replaces the current
"walkable + ramp-gates-elevation" logic.

## Ramp placement — sparse, rock-only, contextual

`placeRamps` is rewritten:

1. Only **rock-face** transitions are ramp candidates (soft slopes need none).
2. Of the rock-face edges, place ramps sparsely — enough that every walkable
   region is reachable, but they read as deliberate chokepoints, not a fringe.
   Target: connectivity-driven, not a flat 35% — place a ramp where it actually
   joins two otherwise-separated regions, plus a small extra fraction for
   redundancy.
3. The ramp **visual differs by context**: a STONE/HIGHLAND face gets a carved
   **stone stair**; a MOUNTAIN face gets a rugged **rock ramp**. (Soft slopes
   get no prop at all — the beveled terrace edge is the "ramp".)

## Decoration / resource exclusion

A tile that is a **ramp landing** (the low or high tile of a placed `RAMP`
edge) is flagged. Decoration scatter and resource-node placement **skip
ramp-landing tiles** — no trees, rocks, or props on or blocking a ramp. (This
is point B of the feedback.)

## Build order

Implemented **after the five M7 asset agents land and merge** — it touches
`core/ramps.ts`, `core/board.ts`, `core/pathfinding.ts`, `world/Ramps.tsx`,
and the decoration/resource scatter, which several agents are editing. Doing it
concurrently would collide.

Steps:
1. `core/biome.ts` — a `biomeHardness(type): 'soft' | 'hard' | 'water'` helper.
2. `core/ramps.ts` — rewrite: classify edges, place ramps connectivity-first on
   rock faces only, tag ramp-landing tiles.
3. `core/board.ts` / `core/pathfinding.ts` — the three-class edge passability;
   `buildNavGraph` adds FLAT/SLOPE/RAMP edges.
4. `world/Ramps.tsx` — render stone-stair vs rock-ramp by context; soft slopes
   render nothing (the terrace edge already beveled).
5. Decoration + resource scatter — skip ramp-landing tiles.
6. Terrain mesh — bevel SLOPE edges (soft transitions) so they read as graded.
