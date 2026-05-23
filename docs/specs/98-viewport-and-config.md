# 98 — Viewport Architecture & Config Completion

Written mid-M6 in response to three linked design corrections:
1. `core/constants.ts` must die — every number is configuration.
2. The scene must present *playably and fun* per viewport — a portrait phone is
   not a small desktop.
3. The whole map should not always be on screen — camera zoom + map slicing is
   core, not optional.

Plus the symptom that exposed all three: the water disc hides the land because
tile-height / water-level proportions were hand-tuned fixed constants and wrong.

## Part 1 — Constants are configuration

`src/core/constants.ts` is deleted. Every value it held is configuration:

- Tuning numbers (`HEX_RADIUS`, `TILE_HEIGHT`, `WATER_LEVEL` factor, `MAP_RADIUS`)
  → `src/config/world.json`, already partly there.
- `HEX_DIRECTIONS` — the six axial neighbour vectors — is *also* config. "They
  are numbers, they are configuration." It moves to `world.json` under
  `hex.directions` and is read through the typed `WORLD` loader like everything
  else. There is no privileged "structural constant" tier.

All 23 current `@/core/constants` importers switch to `@/config/world`'s typed
`WORLD` object (or the derived helpers).

## Part 2 — Terrain & water proportions

The land must rise in **bold terraces above the water**, as in `poc1.png` — not
barely clear it. The fix is proportional, expressed in `world.json`:

- `tileHeight` is the height of one elevation tier. Six tiers must produce a
  visually dramatic island.
- The water surface sits low — covering only the level-0 ocean ring — so every
  land tile (level ≥ 1) stands clearly above it. The water disc height and Y are
  derived so its *top* is at or below the level-1 tile floor, never swallowing
  land.
- Cliff faces between terraces are the banded look of `poc1.png`.

## Part 3 — Viewport-adaptive presentation

The game has **three distinct viewport classes**, each a use case:

| Class | Trigger | Presentation |
|---|---|---|
| Desktop / landscape tablet | wide aspect, ≥ ~900px | Wider camera, more board visible, HUD panels at screen edges. |
| Phone landscape | wide aspect, < ~900px | Camera closer, HUD compact, fewer simultaneous panels. |
| Phone portrait | tall aspect | Camera tight on a *region* — the whole board is NOT shown. HUD stacks vertically; controls thumb-reachable. |

A `useViewport()` hook classifies the current viewport (resize-aware) and yields
a `ViewportProfile { class, cameraDistance, cameraFov, cameraPitch }`. The
camera reads the profile — the world geometry keeps one canonical unit scale
(camera-driven scaling, not world-scaling: geometry math stays stable).

## Part 4 — Camera: zoom + map slicing

The camera is no longer a fixed `OrbitControls` showing the whole board. It is a
**framed view of a region**:

- **Zoom** — pinch (touch) / wheel (desktop) adjusts camera distance within
  `[minZoom, maxZoom]` from `world.json`.
- **Pan / slice** — drag pans the camera target across the board; the view shows
  a *slice*, not the whole map. The minimap shows the full board with a viewport
  rectangle indicating the current slice.
- On portrait phones the default zoom is tighter (a region); on desktop it is
  wider (most of the board). The `ViewportProfile` sets the default.
- Camera target is clamped to the board bounds so the player cannot pan into
  empty space.

A `CameraRig` component owns this — replaces the bare `OrbitControls`. It reads
`ViewportProfile` for defaults and exposes zoom/pan state the minimap reads.

## Decomposition

- `world.json` gains `hex.directions`, `camera` (minZoom, maxZoom, defaults per
  viewport class), and corrected terrain/water proportions.
- `src/core/constants.ts` deleted; `src/config/world.ts` typed loader gains the
  new fields + accessors.
- `src/render/useViewport.ts` — viewport classification hook.
- `src/render/CameraRig.tsx` — zoom + pan + slice, viewport-aware.
- The minimap gains a viewport-rectangle overlay showing the current slice.
- Terrain/Water proportions corrected so land reads as terraces above water.

## Build order (each step informs the next)

1. Fix `world.json` proportions + complete the constants→config migration
   (delete `constants.ts`). The board renders correctly (land above water).
2. `useViewport` + `CameraRig` with zoom. The player can zoom.
3. Pan / slicing + the minimap viewport rectangle.
4. Per-viewport HUD presentation passes.

Step 1 is the prerequisite and also fixes the visible water bug. Steps 2-4 build
on a correct board.
