# M1 — Hex Board

**Proves:** The board exists and is navigable. Fixes "no game board on new game"
regression that blocked poc2. A* pathfinding with ramp-gated elevation traversal works
on the seeded procedural terrain.

**Status: COMPLETE.** All 9 contracts satisfied — 67 unit tests, 2 browser tests,
3 e2e/visual tests, all green. The board renders, is seeded-reproducible, and
tap-to-travel works (verified visually: the pawn walks the cyan path line).

Two contracts landed with refined test files vs. the original plan:
- "Board renders" — `tests/browser/board-smoke.browser.test.tsx` (the `.tsx`
  extension and `.browser.` infix are required by the Vitest browser project glob).
- "Biome colors match spec" — `tests/visual/biome-colors.spec.ts` uses a
  `toHaveScreenshot` baseline (the milestone-doc's pixel-sample idea is harder to
  make deterministic across GPUs than a tolerant full-frame diff). The locked
  darwin baseline was self-judged against the palette in `20-visual-language.md`.

## Contracts

- [x] **Hex math — axialToWorld and getHexCorner** [`tests/unit/hex-math.test.ts`]
  - `axialToWorld(0, 0)` returns `{ x: 0, z: 0 }`.
  - `axialToWorld(1, 0)` returns `{ x: √3, z: 0 }` (rounded to 3 decimals).
  - `getHexCorner(0, 0, 0)` returns the point at angle -30° from centre.
  - All six corners of `(0,0)` form a closed hexagon (corner[5] connects back to corner[0]).
  - Ref: `40-hex-world.md §Hex Math`.

- [x] **Dual-PRNG — cyrb128 hash + two independent streams** [`tests/unit/prng.test.ts`]
  - `cyrb128("ancient-silver-forest")` returns a stable, deterministic 4-tuple.
  - Map PRNG and event PRNG produce different sequences from the same seed.
  - Replaying the same seed from the start produces identical sequences.
  - Ref: `40-hex-world.md §Dual-Stage PRNG`.

- [x] **Biome assignment — elevation tiers and type from noise** [`tests/unit/biome.test.ts`]
  - `getBiome(0, 0)` with known noise stub returns expected level and type.
  - OCEAN tiles have level 0; MOUNTAIN tiles have level ≥ 5.
  - Lake override fires when moisture > 0.85 and rawHeight % 0.1 < 0.02.
  - Ref: `40-hex-world.md §Biome Assignment`.

- [x] **Ramp placement — only between tiles differing by exactly 1 level** [`tests/unit/ramps.test.ts`]
  - No ramp is placed between tiles with `|levelDelta| == 0`.
  - No ramp is placed between tiles with `|levelDelta| >= 2`.
  - No ramp is placed adjacent to an OCEAN tile.
  - Ramp set is deterministic for a given seed.
  - Ref: `40-hex-world.md §Ramp Placement Rules`.

- [x] **A* graph — adjacency and traversal rules** [`tests/unit/astar.test.ts`]
  - A* finds a path between two reachable flat tiles.
  - A* refuses to path through an OCEAN tile.
  - A* crosses an elevation change only when a ramp exists on that edge.
  - A* returns null when no path exists.
  - Ref: `40-hex-world.md §A* Pathfinding Graph`.

- [x] **Board renders in browser — canvas smoke test** [`tests/browser/board-smoke.test.ts`]
  - The Three.js canvas mounts without WebGL errors.
  - After `startGame("ancient-silver-forest")`, at least one hex tile mesh exists
    in the scene.
  - Ref: `10-architecture.md §Data Flow`.

- [x] **Biome colors match spec** [`tests/visual/biome-colors.spec.ts`]
  - Playwright screenshot of the board; pixel-sample at known OCEAN and GRASS tile
    positions matches `#0ea5e9` and `#84cc16` within a tolerance of ±5 per channel.
  - Ref: `20-visual-language.md §Biome Color Palette`.

- [x] **Tap-to-travel — raycast picks tile, path line renders** [`tests/e2e/tap-travel.spec.ts`]
  - Playwright: click on a GRASS tile; a path line appears; the selected unit moves
    along the path; it arrives at the destination tile.
  - Ref: `70-rts-systems.md` (pathfinding is consumed by the movement system);
    `40-hex-world.md §A* Pathfinding Graph`.

- [x] **Seed → identical board reproducibility** [`tests/unit/seed-reproducibility.test.ts`]
  - Generating the board twice with the same seed phrase produces the same
    `HexPosition` and biome for every tile in the board.
  - Ref: `40-hex-world.md §Dual-Stage PRNG`.
