# Changelog

All notable changes to Aethelgard: Chronicles of Strata will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.7...v0.1.8) (2026-05-25)


### Bug Fixes

* **test:** raise border-clash-aivai timeout to 120s for CI headroom ([#25](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/25)) ([5708383](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/5708383a545170237c13579d37e6175a6baacc05))

## [0.1.7](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.6...v0.1.7) (2026-05-25)


### Features

* **v0.5.H:** all 16 PR [#10](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/10) review carryovers shipped — refactors + perf + test coverage ([#22](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/22)) ([c8ad51c](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/c8ad51c3a999cae7d064f5f84252ddf8a323a83f))

## [0.1.6](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.5...v0.1.6) (2026-05-25)


### Bug Fixes

* **v0.4:** camera frames the base midpoint, not the land centroid ([#20](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/20)) ([93acf95](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/93acf9586f0e6739f27f1026982b17fed10abfa0))

## [0.1.5](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.4...v0.1.5) (2026-05-25)


### Bug Fixes

* **v0.4:** real device-class detection + WebGL context-lost handler + biome ignore release-please manifest ([#16](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/16)) ([03ff057](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/03ff057c7375b39de204a5f99a44956b5bfe22d0))


### Documentation

* **directive:** full v0.6 cycle PRD — portals + diplomacy + MYTH events + 4X depth ([#19](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/19)) ([cc8ec4c](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/cc8ec4c7b6fbdac164685c54e635ebe0618b2de7))

## [0.1.4](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.3...v0.1.4) (2026-05-25)


### Bug Fixes

* **format:** biome format restores on aivai-playthrough.mjs + release-please manifest ([#14](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/14)) ([0062a68](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/0062a680ff7db853e20ab47f5b9f83933980d9e3))

## [0.1.3](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.2...v0.1.3) (2026-05-25)


### Features

* **v0.4:** Make it FUN — playable AI-vs-AI cycle (PR [#10](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/10)) ([f74aa02](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/f74aa02cbb84cb4d9422e6573dd8347d1e07f6d0))

## [0.1.2](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.1...v0.1.2) (2026-05-24)


### Bug Fixes

* **deploy+ci:** unblock deployed Pages (CSP 'unsafe-eval' for koota) + workflow standard trio ([#8](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues/8)) ([5c65a19](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/5c65a19a88f0c1a9bb5eeefcd0b0dc460b3c9145))

## [0.1.1](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/compare/v0.1.0...v0.1.1) (2026-05-24)


### Features

* Aethelgard Chronicles of Strata — full-game initial release (M0–M_HARDENING) ([6eba229](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/commit/6eba22914c9e3c19d232484c1a30eb7d22104a54))

## [Unreleased] — M_ARCH_UNIFY + M_AUDIT + M_SEC hardening (0.4.0 in-flight)

Two interleaved tracks: (1) the unified Thing/Skin registry layer
that collapses every per-Type and per-Faction parallel hierarchy into
one slot-driven model (M_AUDIT.0-.6 findings forward-applied, then
M_REGISTRY rollout); (2) Android + snapshot security hardening
(M_SEC.1-11) per the deep-audit pass.

### Architectural unification (M_REGISTRY.* + M_ARCH_UNIFY)

- `src/rules/building-profiles.ts` — unified BUILDING_PROFILES registry
  collapses 5 parallel per-BuildingType tables (BEHAVIORS, DISPLAY,
  COSTS, SUPPLY, Library ScienceProducer if-branch) into ONE record
  with named slots {behaviors, display, cost, supply, producer,
  selectionRadius}. (M_REGISTRY.5, .19)
- `src/rules/unit-profiles.ts` — UNIT_PROFILES per-role slot toggles
  {harvester, nonCombat, founder, damageType, combatRole,
  selectionRadius}. character-factory.ts's 3-way role switch +
  damageType ternary collapsed to slot reads. (M_REGISTRY.1, .19)
- `src/rules/skins.ts` — Skin registry (layer 4 of M_ARCH_UNIFY).
  SKINS[faction] bundles {structure, baseProps, rig}. HomeBase.tsx +
  EnemyBase.tsx (191 LOC parallel components) deleted; replaced by
  ONE FactionBase mounted twice with different `faction` prop.
  Per-faction divergence is now 100% data. A third tribe drops in as
  ONE Skin row. (M_REGISTRY.2, .3, .4)
- `src/rules/mover-profiles.ts` — third Thing-family registry; Roads.tsx
  MATERIAL_COLOR table moved here. (M_REGISTRY.11)
- `src/ecs/components.ts` — `FACTIONS: readonly Faction[]` constant.
  science.ts passive trickle + game-state.ts depositSystem now loop
  over FACTIONS instead of hand-unrolling player+enemy. (M_REGISTRY.16)
- MILITARY_ROLES derived from UNIT_PROFILES.combatRole slot. 3
  duplicate hand-built MILITARY sets collapsed. **Latent bug fix:** the
  legacy sets omitted Trebuchet (a siege military unit); offensive
  zones, right-click move, and encroachment now correctly include
  Trebuchet. (M_REGISTRY.17)
- spawn.ts pickEnemyRole 4-tier if-cascade replaced with declarative
  ESCALATION_SCHEDULE table. (M_REGISTRY.15)
- `parseHexKey` + `parseHexLevelKey` helpers in `src/core/hex.ts`
  replace 11 hand-rolled `key.split(',').map(Number)` duplicates.
  Centralises the missing-coord NaN fallback. (M_MICRO.2.2)
- New spec `docs/specs/103-particle-archetype.md` — use-case
  enumeration for the 8 particle FX components, 4-shape decomposition,
  scope cut for the GeometryCloud-first slice. (M_REGISTRY.6 spec)
- Cross-reference banners added to 10 pre-existing pillar specs
  (M_AUDIT.7) pointing every reader at the unified registry stack.

### Security hardening (M_SEC.*)

- Android Manifest: `allowBackup=false`, `usesCleartextTraffic=false`,
  scoped `data_extraction_rules.xml` + `backup_rules.xml` (deny-all
  for database/sharedpref/file/external/root). (M_SEC.3)
- Cordova `<access origin="*"/>` stripped from `config.xml`. (M_SEC.1)
- `FileProvider` scoped to `screenshots/` + `cache_screenshots/` only.
  (M_SEC.2)
- Snapshot validator (`serialize-game.ts`): `validateSnapshot` rejects
  prototype-pollution keys, NaN/Infinity numbers, out-of-bounds
  mapSize, unknown weather states. `pickEconomy` whitelists keys with
  `safeFinite` coercion. Entity-count capped at 5000. (M_SEC.5, .11)
- `serialize.ts` deserializeWorld rejects `__proto__` / `constructor`
  / `prototype` at both trait-name and trait-payload layers. (M_SEC.6)
- App.tsx resume fallback no longer collapses the two-PRNG model — a
  failed resume mints a fresh event seed instead of deriving it from
  the map seed. (M_SEC.7)
- NewGameModal seed input capped at 64 chars, NFC-normalised, ASCII
  letters+hyphens+space whitelist (rejects RTL overrides, zero-width
  joiners). (M_SEC.8)
- Self-host Metamorphous + Inter via `@fontsource/*`; removed
  `fonts.googleapis.com` runtime dependency. (M_SEC.9)
- `Content-Security-Policy` meta tag — `default-src 'self'`,
  `object-src 'none'`, no third-party origins. (M_SEC.10)

### Doctrine + state

- `LOCAL REVIEWERS DRIVE THE LOOP` doctrine encoded in the directive.
- `ONE UNIFIED PRODUCTION CODEBASE` doctrine encoded — no fix-laters,
  throw out and rewrite if the refactor demands it.
- All M_AUDIT.0-.6 findings forward-applied into the directive as
  ~130 concrete tickets (M_REGISTRY × 30, M_MICRO × 67, M_SEC × 33).

## [0.3.0] — Game-loop completion + spec-102 architecture

The full-game release. Closes every gap from the original `references/
conversation.md` brief and lands the magnetic-archetype architecture
the user defined mid-conversation. Built across nine milestone bands
(M_GAMEPLAY · M_CONSTRUCTION · M_COMBAT_POLISH · M_ARCHETYPE · M_DATA ·
M_AUDIO · M_AI_DEPTH · M_MOBILE · M_BALANCE · M_ACCESS · M_TITLE).

### Gameplay surface (M_GAMEPLAY 1-7)

- Train Peon + Footman from Town Hall + Barracks; UNIT_COSTS data-driven.
- Click-drag multi-unit selection (SelectionRect) with world→screen
  projection.
- Right-click + touch long-press attack-move; military units flock around
  the target tile via hex-neighbour offsets.
- Tracking-ring command feedback (glowing cyan ring scales + fades on
  every right-click destination).
- Building destruction system — 0-HP non-base buildings remove, restore
  walkability, rebuild nav graph. FactionBase exempt (win/loss anchor).
- Pause/resume — top-right pill + P-key + visibilitychange auto-pause.

### Construction (M_CONSTRUCTION)

- ConstructionRing — gold sweep above each in-progress build site.
- BuilderBadge — "Building" billboard above peons in BUILDING state.

### Combat polish (M_COMBAT_POLISH 1-5)

- Projectile FX system — arrows lerp+arc source→target on every cadence
  tick (presentation-only; damage stream unchanged).
- Attack animations — combat.ts sets AnimationState→ATTACKING on each hit.
- Resource-deposit popups — "+N Wood" floating text per deposit.
- Adaptive selection ring — peon < military < building < base.
- CriticalWarning — red vignette pulses when player base HP < 30%.

### Spec-102 archetype algebra (M_ARCHETYPE 1-7)

- MoverBehavior (roads — ZoC-neutral, material-typed).
- Gate composition — Mover-on-Defender = directionally-passable tile;
  tilePassable rules helper for nav-graph integration.
- ConsumerBehavior (resources as archetype-marker for the magnetic
  pipeline).
- Damage-type × armor table — DamageType union (normal/siege/magic/
  pierce); DefensiveBehavior.armorVs* multipliers; applyArmor() helper.
- Military units adopt OffensiveBehavior — unified emitter membership.
- Bi-signed magnetic force field — sampleField(world, faction, q, r)
  scores any tile, with per-archetype weights + distance falloff.
- Per-tile u32 bitmask layout — TILE_BIT table for walkable/controlled/
  observed/pulsing/biome/etc; bit-packing helpers ready for the contiguous
  Uint32Array tile-state buffer.

### Data-driven HUD (M_DATA 1-7)

- BUILDING_DISPLAY table drives every selection-panel action — no
  hardcoded isTownHall/isBarracks; adding a building = one config row.
- Resources as ECONOMIC SLOTS — ResourceCost is Partial<Record<ResourceType,
  number>>; canAfford/spend iterate RESOURCE_TYPES; ResourceBar drives off
  SLOT_DISPLAY × iteration. Adding a 4th slot is one row.
- science slot added — 4th resource accumulated for the tech tree.
- Discoveries archetype — the tech tree as ONE more archetype. Each row in
  `discoveries.json` is a Discovery; rules/discovery-registry.ts dispatches
  the declarative effect (buff-combatant / multiply-harvest) to the ECS;
  DiscoveriesPanel.tsx renders the registry as a text-only graph (Radix
  Dialog, compact rows, available/unaffordable/purchased badges).

### Audio (M_AUDIO 1-6)

- Full per-event coverage: combat-hit, combat-crit, projectile-fire/impact,
  harvest-chop/mine, footstep-grass/stone, resource-deposit, unit-select,
  unit-trained, building-placed/completed/destroyed, gate-open/close,
  critical-alarm, research-purchased, victory, defeat — every cue routed
  to a real PixelLoops / fantasy WAV/OGG asset.
- Title music — useTitleMusic plays menu loop on title-screen mount;
  cleanly swaps to gameplay loop on session start.
- Per-surface footstep emission — FootstepEmitter throttled to ~3 Hz per
  unit, capped per frame.
- Encroachment-flip alarm — chime fires the moment a player-controlled
  tile flips to the enemy.

### AI depth (M_AI_DEPTH 1-5)

- Difficulty-scaled vision cones — AI sees 3/5/8 hexes on easy/normal/hard.
- TrainEvaluator + TrainGoal — AI trains Peons + Footmen via the same
  `trainUnit` command verb the human uses.
- Defence priority — MilitaryEvaluator scores 0.85 for defending a
  pulsing tile, 0.6 for attacking.
- Building diversity — BuildEvaluator chooses from 6 building types per
  per-state priority (House/Farm/Barracks/Granary/Watchtower/Wall).

### Mobile + accessibility (M_MOBILE / M_ACCESS / M_TITLE)

- Touch wired natively via drei MapControls + TilePick long-press.
- Portrait HUD layouts — viewport-aware right/top offsets so the toolbar
  fits on narrow phones.
- Keyboard shortcuts — Esc/clear, +/- zoom, P pause, Tab cycles HUD.
- SR landmarks — role=region/section + aria-label on every HUD landmark;
  Radix dialogs focus-trap natively.
- WCAG AAA contrast on every HUD token (text:panel 16:1, muted:panel 7.5:1).
- TitleBackground — slowly rotating r3f scene behind the menu.
- Title footer — version + license credits row.

### Balance (M_BALANCE)

- Building/unit cost knobs tiered (House cheap → Barracks 150w+100s+50g →
  Watchtower stone-heavy → Wall stone-cheap); difficultyMultiplier scales
  enemy HP/damage; AI_VISION_RADIUS scales the AI's eye-line per difficulty.

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
