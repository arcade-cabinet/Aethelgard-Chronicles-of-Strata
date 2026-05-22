# Changelog

All notable changes to Aethelgard: Chronicles of Strata will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Initial Release

The first playable release — a low-poly hex-tile tap-to-command RTS, shipped to
web (GitHub Pages) and debug Android (Capacitor) from one PR. Built across seven
milestones (M0–M6).

### Foundation & board (M0–M1)

- pnpm + Vite + TypeScript (strict) scaffold; React + react-three-fiber render
  shell; koota ECS; Biome lint/format; Vitest (node + browser) and Playwright.
- Capacitor Android config; GitHub Actions CI (build/test + debug-APK) and a
  GitHub Pages deploy workflow.
- Asset ingest pipeline curating `references/` → `public/assets/`, with
  GLB textures embedded and audio (OGG/WAV) bundled.
- Deterministic hex board — axial coordinates, FBM-noise terrain, eight biomes,
  elevation tiers, ramps, and A* pathfinding with ramp-gated traversal.

### Characters & economy (M2–M3)

- KayKit shared-rig character system — heroes and enemies retargeted onto the
  shared Rig_Medium / Rig_Large animation libraries via drei `useAnimations`.
- The autonomous Warcraft-style economy — peons harvest wood/stone/gold, carry,
  and deposit; resource nodes; the Town Hall; build mode; supply.

### Combat & systems (M4–M5)

- The combat loop — footmen vs goblins/orcs, the Goblin Portal spawn timer,
  enemy AI with retargeting, event-PRNG damage rolls, health billboards,
  floating combat text, win/loss conditions.
- Production systems — seeded weather (sunny/fog/rain) with a rain movement
  penalty, research upgrades, barracks rally points, a 2D minimap, a day/night
  cycle, and timed Orc escalation.

### Polish & ship (M6)

- Branded title screen — New Game / Continue / Settings, with a New Game modal
  for seed phrase, map size, and AI difficulty.
- Radix + framer-motion HUD — themed resource bar, selection panel with
  build/research controls, accessible win/loss dialog.
- Howler audio wired to combat, win/loss, and the gameplay music loop.
- SQLite save/load + Capacitor Preferences settings; a 5-minute auto-save.
- poc1-quality terrain — one merged terrain mesh, real cone mountains, wooden
  ramps, layered water, distance fog, soft shadows.
- Viewport architecture — desktop / phone-landscape / phone-portrait classes;
  a camera with zoom, pan, and map slicing; a viewport-adaptive HUD.

### Architecture

- Two-PRNG model — a map PRNG seeded by the player's phrase, and a separate
  event PRNG (a buried Capacitor Preferences seed) for combat/weather; the
  seed-phrase shuffle is itself an event draw, so the deterministic core has no
  `Math.random`.
- All tuning lives in `src/config/{combat,economy,world}.json`, loaded through
  typed config modules — there is no `core/constants`.

### Known follow-up

- M7 — the AI is to be promoted to a yuka-backed `src/ai/` subpackage.

## [0.2.0] — AI-as-Player + Zone of Control

A second initial release that completes the AI architecture, the territorial
model, and the player-facing UX. Built across M7 + M8 + M9, all in one PR.

### Asset & AI expansion (M7)

- `src/ai/` yuka-backed steering subpackage (`AiDirector`, `EntityManager`,
  `Vehicle`s, perception). The old `aiSystem` becomes a thin facade.
- Castle / Fantasy-Town kit buildings replace the blocky Hexagon-Kit stand-ins.
- Graveyard enemy base (crypt + gravestones + fence); +Vampire / Witch /
  Black Knight enemy roles with a spawn-escalation ladder.
- Audio: magic + UI sound packs; crit + UI event sounds.
- Per-biome environment decoration scatter (Nature Kit + Tower Defense Kit).

### Contextual crossings (M8.0, spec 99)

- `core/crossings.ts` replaces the place-a-ramp-on-every-cliff-edge model.
  Connectivity-first union-find placement + small redundancy fraction; biome-
  styled forms (rockfall / stone stairs / plank ramp / grassy hill etc).
  Far fewer crossings, deliberately placed.

### Faction symmetry (M8.1 – M8.3)

- `FactionBase` trait marks each faction's main base; `EnemySpawner` (was
  `GoblinPortalTrait`); `evaluateWinLoss` scores symmetrically.
- Render decomposition: `HomeBase.tsx` (player) + `EnemyBase.tsx` (graveyard);
  `Buildings.tsx` deleted; `structure-models.ts` faction-symmetric table.
- `commands.ts` becomes the SINGLE action channel — each command takes an
  issuing faction; `placeBuilding` stamps the faction + filters peons; the
  human UI and the AI player both call the same verbs.

### Zone of control (M8.4z + M8.5z, spec 102)

- Black fog is replaced by a drawn encirclement border. `zone.ts` holds two
  independent sets per faction: `controlled` (territory, drawn) and
  `observed` (current vision cones).
- `ZoneBorder.tsx` draws each faction's encirclement; the whole board stays
  visible.

### Symmetric economy + rules engine (M8.6a / M8.6b, spec 101)

- `GameState.economy` is now `Record<Faction, GameEconomy>`; depositSystem +
  recomputeMaxSupply run per faction.
- `src/rules/` — a pure, yuka/koota/three-free rules-engine barrel. Placement
  (`canBuild`), economy (`canTrain`, `recomputeMaxSupply`, `peonCap`,
  `canAddPeon`), peon autonomy (`nextPeonAction`), attractor map-gen
  guarantee, building-behavior profiles. The single source of game-rule
  knowledge; consulted by ECS systems, the human UI, and the AI.

### Peon autonomy + new buildings (M8.6c)

- Peons are mindless, nonviolent autonomous brutes on BOTH factions. Run
  `rules.nextPeonAction` — seek nearest resource in zone, harvest (claims the
  tile for the faction's zone of control), carry home, deposit, flee pulsing
  tiles. Faction-symmetric.
- BuildingType extended: House, Granary, Watchtower, Wall — joining Farm,
  Barracks, TownHall.
- Peon cap = base + houses + granaries (ties economy scale to construction).

### Behavior-archetype local ZoC + AI player (M8.6d / M8.6e)

- `OffensiveBehavior` / `DefensiveBehavior` / `AttractorBehavior` are composable
  ECS traits attached to ANY entity — building-type-decoupled local zones of
  control. `placeBuilding` composes the right traits at spawn from a
  `rules/building-behaviors.ts` profile table.
- `offensiveBehaviorSystem` iterates EVERY OffensiveBehavior entity (decoupled);
  Watchtower today, any future entity tomorrow.
- `encroachmentSystem` — enemy military on a controlled tile starts a pulse;
  difficulty-scaled grace; defended → pulse cancels; expired → tile flips.
- Attractor map-gen contract — each Town Hall guarantees a minimum of every
  resource type within its radius; game-start is fully emergent.
- `AiPlayer extends GameEntity` with a yuka `Think` brain. `BuildEvaluator` +
  `MilitaryEvaluator` score from KNOWN state and dispatch through
  `commands.ts` — the same channel a human uses.

### AI-vs-AI golden-path E2E (M8.7)

- A deterministic harness swaps BOTH factions to AI and asserts invariants
  across 100+ game-seconds: positions finite, economies non-negative, both
  zones grow autonomously, same seeds → same final state.

### UX & polish (M9.1)

- Build menu covers all 6 buildable types with cost labels + affordability
  gating from `rules.BUILDING_COSTS`.
- `ZoneLegend` — collapsible HUD pill teaching the territory visual language.
- First-run onboarding overlay — 4-step Radix Dialog gated by a Preferences
  flag; skippable, shown ONCE.
- `docs/specs/10-player-journey.md` (scene-by-scene), `99-glossary.md`
  (canonical terms), `docs/STATE.md` refreshed.

### E2E player-journey suite (M9.3a)

- `tests/e2e/player-journey.e2e.spec.ts` — one Playwright test per scene
  transition (S1→S2, S2→S4, onboarding, legend, full HUD).

### Spec arc

The design crystallised across specs 99–102. Spec 102 is the unified theory:
five archetype traits (Attractor / Offensive / Defensive / Mover / Consumer) +
a bi-signed magnetic force field + a pairwise composition algebra + a
damage-type × armor table. Units and buildings share the same archetype
universe — adding a new entity is a new TABLE ROW, not a new code path.

## [Unreleased]
