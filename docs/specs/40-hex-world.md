# Hex World

## Coordinate System

Tiles use axial coordinates `(q, r)`. The third cube coordinate is implicit:
`s = -q - r`. Two tiles are adjacent when `|dq| + |dr| + |ds| == 2` (the cube
coordinate identity). The six neighbor directions in axial space are:

```
{ q:+1, r: 0 }, { q: 0, r:+1 }, { q:-1, r:+1 },
{ q:-1, r: 0 }, { q: 0, r:-1 }, { q:+1, r:-1 }
```

The board is a circular region of radius `MAP_RADIUS = 20`. A tile `(q, r)` is within
the board when `max(|q|, |r|, |s|) <= MAP_RADIUS`.

## Hex Math

Source: `references/poc1.html` lines 114–116 (and identically in poc2.html lines
289–291). These functions are the canonical implementation — port them verbatim into
`src/core/hex.ts`.

```typescript
const HEX_RADIUS = 1; // world units

function round(val: number): number {
  return Math.round(val * 1000) / 1000;
}

// Convert axial (q, r) to world XZ position (flat-top hex orientation)
function axialToWorld(q: number, r: number): { x: number; z: number } {
  return {
    x: round(HEX_RADIUS * Math.sqrt(3) * (q + r / 2)),
    z: round(HEX_RADIUS * 1.5 * r),
  };
}

// Get the world position of corner i (0–5) of a hex centred at (cx, cz)
// Corner 0 is at angle -30°, incrementing 60° per step (pointy-top corners)
function getHexCorner(cx: number, cz: number, i: number): { x: number; z: number } {
  const a = (Math.PI / 180) * (60 * i - 30);
  return {
    x: round(cx + HEX_RADIUS * Math.cos(a)),
    z: round(cz + HEX_RADIUS * Math.sin(a)),
  };
}

function getHexKey(q: number, r: number): string {
  return `${q},${r}`;
}
```

`axialToWorld` produces the XZ world position of a tile's centre. The Y axis is set by
the tile's elevation tier: `y = level * TILE_HEIGHT` where `TILE_HEIGHT = 0.85`.

## Discrete Elevation Tiers

Elevation is not continuous. Each tile has an integer `level` from 0 to 6.

| Level | Description |
|---|---|
| 0 | Ocean floor (below water plane) |
| 1 | Beach / coastal flat |
| 2 | Low land (grass, desert) |
| 3 | Mid land (forest, grass) |
| 4 | Highland plateau |
| 5 | Mountain base |
| 6 | Mountain peak (snow-capped) |

The water plane sits at `y = WATER_LEVEL = 0.5 * TILE_HEIGHT`. Level-0 tiles are
submerged; their top face is below this plane.

## Biome Assignment

Source: `references/poc1.html` `getBiome()` function (lines 124–141). Biome is
determined from a SimplexNoise height value and a moisture value, both sampled at
`(q * 0.06, r * 0.06)`. The height value is attenuated by distance from the map
centre to create an island shape:

```
rawHeight -= Math.pow(dist, 2.0) * 1.5
```

Where `dist = sqrt(q² + r² + s²) / sqrt(3) / MAP_RADIUS` (normalized cube distance).

The level thresholds are:

```
rawHeight ≤ 0.10  → level 0
rawHeight ≤ 0.25  → level 1
rawHeight ≤ 0.45  → level 2
rawHeight ≤ 0.60  → level 3
rawHeight ≤ 0.75  → level 4
rawHeight ≤ 0.88  → level 5
rawHeight >  0.88 → level 6
```

Biome type from level + moisture:

```
level 0           → OCEAN
level 1           → BEACH
level 2, moisture < 0.45 → DESERT
level 2, moisture ≥ 0.45 → GRASS
level 3, moisture < 0.45 → DESERT
level 3, moisture ≥ 0.45 → FOREST
level 4           → HIGHLAND
level ≥ 5         → MOUNTAIN
level 3–4, moisture > 0.85 AND rawHeight % 0.1 < 0.02 → LAKE (lake pocket override)
```

See `20-visual-language.md` for the canonical color per biome.

## Terraced Terrain

Each tile is a flat top-face hexagonal prism. The side faces (cliffs) connect a tile's
top edge to the top edge of the tile below, creating sheer vertical drops between
elevation levels. There are no sloped mesh faces — the diorama look requires crisp
horizontal plateaus and vertical cliffs, not ramps in the terrain mesh. (Ramps are
separate placed geometry, not mesh morphing.)

## Ramp Placement Rules

A ramp is a navigable sloped prop placed between two adjacent tiles where:
- The two tiles are neighbors in axial space.
- Their elevation levels differ by exactly 1.
- Neither tile is OCEAN (water tiles are not walkable).
- The map PRNG seed permits it (ramps are placed stochastically, not on every eligible
  edge, to preserve the tactical chokepoint feel).

Ramps are placed at the edge midpoint between the two tiles, oriented perpendicular to
the shared edge. The ramp geometry spans from the lower tile's top face to the upper
tile's top face.

## A* Pathfinding Graph

A* runs on a graph where:
- **Nodes:** all non-OCEAN tiles on the board.
- **Edges:** any two adjacent tiles where `|levelDelta| == 0` (flat traversal) OR
  `|levelDelta| == 1 AND a ramp exists on that edge` (ramped elevation change).
- **Cost:** 1 per step (uniform cost). Future extension: terrain cost modifiers (forest
  slows movement) are an M5 feature, not part of the base graph.

The graph is computed once at world generation time and stored in a `Map<string, Set<string>>` adjacency list keyed by `getHexKey(q, r)`.

## Dual-Stage PRNG

The seed phrase (an adjective-adjective-noun string, e.g. "ancient-silver-forest") is
hashed by the `cyrb128` function (a 128-bit non-cryptographic hash) to produce two
independent 32-bit seeds.

```typescript
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k: number; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  // ... finalization rounds ...
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
```

The first two words of the hash seed the **map PRNG** (controls: terrain noise offset,
resource node placement, ramp placement, enemy spawn positions, Palace position).
The second two words seed the **event PRNG** (controls: combat crits, hit variance,
weather transitions, raid timing).

Both PRNGs are seeded once at game start and advance independently. The map PRNG runs
to completion during world generation and is then discarded. The event PRNG advances
every time a random event fires during gameplay.

Acceptance criterion: the same seed phrase always produces the identical board layout
and the same sequence of random events.
