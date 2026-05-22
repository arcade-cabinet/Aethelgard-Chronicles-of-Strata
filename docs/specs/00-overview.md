# Aethelgard: Chronicles of Strata — Overview

**Parent doc:** `docs/superpowers/specs/2026-05-22-aethelgard-chronicles-of-strata-design.md`

## Vision

A full-featured tactical RTS played on a procedurally generated hex board. One
seed phrase produces a unique world: terraced terrain, biomes, resources, enemy
portals, and random events. Players command peons to harvest resources, construct
buildings, train soldiers, and defeat the enemy base before their Town Hall
falls. The aesthetic is a low-poly diorama — chunky distinct tiles, flat shading,
vibrant biome colors — bridging the tactile feel of Catan with the terraced
strata of Monument Valley and the biome identity of Animal Crossing: New Horizons.

## Scope

**Fully in scope:**

- Hex board: terraced continuous-feel terrain, discrete elevation tiers, biomes
  (ocean, beach, desert, grass, forest, highland, mountain, lake), implied grid
  (tiles touch, no drawn lines).
- Dual-stage PRNG from an adjective-adjective-noun seed phrase: map seed (terrain,
  resources, ramps, spawns) and event seed (combat variance, weather, raids).
- Tap-to-travel: raycast tile pick, A* pathfinding, ramp-gated elevation traversal,
  path-line preview, destination marker.
- RTS economy: peons, wood/stone/gold resources, autonomous harvest loop, Town Hall,
  build mode (Farm, Barracks), supply system.
- Combat: footmen, goblin/orc enemies, goblin portal, health bars, floating combat
  text, attack state machine, win (destroy portal) / loss (Town Hall destroyed).
- Systems: seeded weather (sunny/fog/rain), research/tech upgrades (Forged Blades,
  Steel Plows), barracks rally points, real-time 2D minimap, day/night cycle.
- Polish: branded launcher, Radix + framer-motion HUD, howler audio (music, ambient,
  sfx, UI, victory stingers), save/load, settings persistence.
- Delivery: debug Android APK + GitHub Pages web, one feature branch, one PR.

**Out of scope (non-goals for this release):**

- Multiplayer / networking.
- Procedural mesh generation of characters (curated rigged KayKit GLBs instead).
- Procedural synth audio (OGG/WAV packs instead).
- The NAS `/Volumes/home/assets` library (superseded by the `references/` bundle).
- iOS build (Capacitor Android only).
- A level editor or user-authored content.

## Milestone Map

| # | Milestone | Proves |
|---|---|---|
| M0 | Repo, toolchain, CI, asset-ingest pipeline, pillar docs | Vite/TS/r3f boots; GLB+audio load; APK + Pages builds green; docs written |
| M1 | Hex board: terraced terrain, biomes, dual-PRNG, tap-to-travel, A*+ramps | The board exists and is navigable |
| M2 | Characters: KayKit rigged GLBs, shared-rig animation, koota ECS units | Real animated characters move on the board |
| M3 | Economy: peons, resources, harvest loop, Town Hall, build mode | The Warcraft economic loop runs autonomously |
| M4 | Combat: footmen, enemies, portal, health, win/loss | The full RTS loop closes |
| M5 | Systems: weather, research, rally points, minimap, day/night | The full "production" feature set |
| M6 | Polish: HUD (Radix+framer-motion), audio (howler), persistence, branding | Shippable: APK + Pages, one PR |

## Glossary

**hex** — A single tile on the board, a flat-topped regular hexagon with radius 1 world
unit. Each hex has axial coordinates `(q, r)`.

**axial coords** — The `(q, r)` coordinate system for hex grids. The third implicit
coordinate is `s = -q - r`. Adjacency: `|dq| + |dr| + |ds| == 2` (cube coordinates
identity). See `40-hex-world.md` for the full math.

**biome** — A named terrain type assigned to a hex based on elevation and moisture noise:
OCEAN, LAKE, BEACH, DESERT, GRASS, FOREST, HIGHLAND, MOUNTAIN. Each biome has a
canonical hex color and controls which assets are placed on it.

**peon** — The player's basic worker unit. Peons autonomously harvest nearby resources
and carry loads back to the Town Hall. They can also be assigned to construct buildings.

**ramp** — A diagonal transition geometry placed between two hex tiles that differ by
exactly one elevation level. Ramps are the only legal path for A* traversal across
elevation changes.

**dual-PRNG** — Two independent seeded pseudo-random number generators derived from the
same seed phrase via cyrb128 hashing. The first (map PRNG) drives all terrain, resource,
and spawn placement at world-generation time. The second (event PRNG) drives real-time
events: combat crits, weather transitions, raid timing.

**ECS** — Entity Component System. The simulation uses the `koota` ECS library. Every
game object is an entity; its properties are components; behavior is implemented in
pure systems that run each frame. The ECS is the single source of truth for simulation
state — r3f components only read and render it.

**manifest** — `public/assets/manifest.json`, the machine-generated index of all
curated GLB and audio assets. The typed accessor `createAssetAccessor(manifest)` is the
only way application code references assets; no hard-coded paths.
