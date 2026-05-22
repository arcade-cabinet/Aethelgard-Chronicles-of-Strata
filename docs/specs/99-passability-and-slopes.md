# 99 — Passability & Contextual Slopes

Written in response to playtest feedback: too many ramps, ramps everywhere,
trees on ramps, and a binary passable/impassable model that does not capture
that a sandy rise and a sheer rock cliff are different things.

This supersedes the `placeRamps`-on-every-eligible-edge model.

## The core idea — every traversable cliff edge has TWO possible forms

A one-level elevation change between two adjacent walkable tiles, where a
crossing exists, is rendered as **one of two forms — natural or artificial** —
and the **art of each form is biome-specific**. Both forms are real, visible
geometry; neither is "just a beveled terrace."

| Biome of the transition | Natural form | Artificial form |
|---|---|---|
| **Stone / Highland** | **rockfall** — tumbled boulders/scree forming a climbable slope | **carved stone stairs** — staggered, individually-visible steps |
| **Mountain** | rugged **rock ramp** / scree | rough-cut stone steps |
| **Grass / Forest** | a **graded grassy hill** — a smooth mound blending the two levels | a **wooden ramp** — visible planks + rope rails |
| **Beach / Desert** | a **sloped sand rise** | a wooden **boardwalk** ramp |

Which form a given crossing gets is a per-edge PRNG choice (map stream), so a
realm has a deterministic mix of natural and artificial crossings.

A crossing is keyed off the **higher tile's biome** (the cliff face belongs to
the upper terrace). LAKE/OCEAN are water — never a crossing.

### Crossing vs. no crossing

Not every cliff edge gets a crossing. An edge is a **crossing candidate** when
both tiles are walkable and the level difference is exactly 1. Of the
candidates, crossings are placed **connectivity-first** (enough that every
walkable region is reachable) plus a small redundancy fraction — NOT one per
edge. Edges with no crossing are `BLOCKED` (sheer cliff). This is point A of
the feedback — far fewer crossings, deliberately placed.

## Passability — two classes per edge

`tile.walkable` (boolean) is augmented by a per-edge model. A tile-to-tile
**edge** is either:

- `FLAT` — same level, both walkable: free movement, no geometry.
- `CROSSING` — a one-level change with a placed crossing (natural or
  artificial, see the table above): traversable across the crossing.
- `BLOCKED` — everything else: a cliff edge with no crossing, a >1-level
  change, or water.

A `Crossing` record carries: `lowKey`, `highKey`, `form` (`natural` |
`artificial`), and `biomeStyle` (derived from the higher tile's biome — drives
which mesh renders). Pathfinding (`core/pathfinding.ts` `buildNavGraph`) adds an
edge for `FLAT` and `CROSSING`, never for `BLOCKED`. This replaces the current
"walkable + ramp-gates-elevation" logic.

## Crossing placement — sparse, connectivity-first, contextual

`placeRamps` becomes `placeCrossings`, rewritten:

1. **Candidates** — edges where both tiles are walkable and the level
   difference is exactly 1.
2. **Placement** — connectivity-first: place a crossing where it joins two
   otherwise-separated walkable regions (a union-find pass over candidates),
   plus a small redundancy fraction. NOT a flat per-edge probability — this is
   what kills the "ramp on every edge" problem.
3. **Form** — each placed crossing is `natural` or `artificial` by a map-PRNG
   draw; `biomeStyle` comes from the higher tile's biome. The renderer maps
   `(form, biomeStyle)` → the concrete mesh per the table above:
   - stone/highland: rockfall (natural) | carved stone stairs (artificial)
   - mountain: rock ramp (natural) | rough stone steps (artificial)
   - grass/forest: graded grassy hill (natural) | wooden plank-and-rope ramp
     (artificial)
   - beach/desert: sloped sand rise (natural) | wooden boardwalk (artificial)

Every form is real, visible geometry — staggered stone steps you can count, an
actual boulder rockfall, a plank ramp with rope rails. No invisible "graded
terrace" hand-wave.

## Decoration / resource exclusion

A tile that is a **crossing landing** (the low or high tile of a placed
`CROSSING`) is flagged on the tile. Decoration scatter and resource-node
placement **skip crossing-landing tiles** — no trees, rocks, or props on or
blocking a crossing. (Point B of the feedback.)

## Build order

Implemented **after the five M7 asset agents land and merge** — it touches
`core/ramps.ts`, `core/board.ts`, `core/pathfinding.ts`, `world/Ramps.tsx`,
and the decoration/resource scatter, which several agents are editing. Doing it
concurrently would collide.

Steps:
1. `core/biome.ts` — a `biomeStyleFor(type)` helper grouping biomes into the
   four crossing-style families (stone / mountain / grass-forest / beach-desert).
2. `core/ramps.ts` → `core/crossings.ts` — rewrite: classify candidate edges,
   place crossings connectivity-first (union-find) + redundancy, pick
   natural/artificial form per crossing, tag crossing-landing tiles.
3. `core/board.ts` / `core/pathfinding.ts` — the FLAT/CROSSING/BLOCKED edge
   model; `buildNavGraph` adds FLAT + CROSSING edges, never BLOCKED.
4. `world/Ramps.tsx` → `world/Crossings.tsx` — render the eight concrete forms
   (4 biome styles × natural/artificial): rockfall, stone stairs, rock ramp,
   rough steps, grassy hill, wooden plank ramp, sand rise, boardwalk. Each is
   real visible geometry. The natural grassy/sand "hill" form is a small graded
   mound mesh — not an invisible bevel.
5. Decoration + resource scatter — skip crossing-landing tiles.
6. `path-follow` Y-interpolation already handles the elevation change; verify it
   reads correctly across both crossing forms.
