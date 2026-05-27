# Aethelgard: Chronicles of Strata — Design

**Date:** 2026-05-22
**Status:** Approved — ready for implementation planning
**Source of truth:** `references/conversation.md` (described concept), `references/poc1.html`
(last working build, proven logic), `references/poc2.html` (the broken "production"
target — describes the full feature set but calls ~15 undefined functions).

---

## 1. Summary

Aethelgard: Chronicles of Strata is a low-poly, hex-tile, tap-to-command real-time
strategy game. It is a faithful reconstruction and completion of the game the Gemini
conversation in `references/conversation.md` describes — a 2.5D hexagonal diorama RTS
with terraced terrain, procedural biomes, A* pathfinding with ramps, an autonomous
resource economy, base-building, combat against a goblin/orc incursion, weather,
research, a dual-stage PRNG, and win/loss conditions.

The original PoCs were single-file HTML. This project rebuilds the concept as a
test-driven **r3f / drei / koota / yuka / seedrandom / howler** application with a
**Radix UI + framer-motion** HUD, **Capacitor SQLite + Preferences** persistence,
shipping as a debug Android APK and a GitHub Pages web build in a single PR.

Procedural geometry characters and props are replaced with curated 3D assets and the
synth audio is replaced with real OGG/WAV packs — both drawn entirely from the
self-contained `references/` asset bundle.

## 2. Scope

**In scope — the full described feature set as the initial release:**

- Hex board: terraced continuous-feel terrain, discrete elevation tiers, biomes
  (ocean, beach, desert, grass, forest, highland, mountain, lake), implied grid.
- Dual-stage PRNG from an adjective-adjective-noun seed phrase: map seed (terrain,
  resources, ramps, spawns) + event seed (combat variance, weather, raids).
- Tap-to-travel: raycast tile pick, A* pathfinding, ramp-gated elevation traversal,
  path-line preview, destination marker.
- RTS economy: peons, wood/stone/gold resources, autonomous harvest loop, Palace,
  build mode (Farm, Barracks), supply system.
- Combat: footmen, goblin/orc enemies, goblin portal, health bars, floating combat
  text, attack state machine, win (destroy portal) / loss (Palace destroyed).
- Systems: seeded weather (sunny/fog/rain), research/tech upgrades, barracks rally
  points, real-time 2D minimap, day/night cycle.
- Polish: branded launcher, Radix + framer-motion HUD, howler audio (music, ambient,
  sfx, UI, victory stingers), save/load, settings persistence.
- Delivery: debug Android APK + GitHub Pages web, one feature branch, one PR.

**Out of scope (explicit non-goals for this release):**

- Multiplayer / networking.
- Procedural mesh generation of characters (replaced by curated rigged GLBs).
- Procedural synth audio (replaced by OGG/WAV packs).
- The NAS `/Volumes/home/assets` library — superseded by the `references/` bundle.
- iOS build (Capacitor Android only this release).
- A level editor / user-authored content.

## 3. Milestone Decomposition

Each milestone is the minimum slice that proves the *next* milestone's shape. Each gets
a milestone spec doc (`docs/milestones/MN-*.md`) and a milestone-level TDD batch.

| # | Milestone | Proves |
|---|---|---|
| M0 | Repo, toolchain, CI, asset-ingest pipeline, pillar docs | Vite/TS/r3f boots; GLB+audio load; APK + Pages builds green; docs written |
| M1 | Hex board: terraced terrain, biomes, dual-PRNG, tap-to-travel, A*+ramps | The board exists and is navigable — fixes "no game board on new game" |
| M2 | Characters: KayKit rigged GLBs, shared-rig animation, koota ECS units | Real animated characters move on the board |
| M3 | Economy: peons, resources, harvest loop, Palace, build mode | The Warcraft economic loop runs autonomously |
| M4 | Combat: footmen, enemies, portal, health, win/loss | The full RTS loop closes |
| M5 | Systems: weather, research, rally points, minimap, day/night | The full "production" feature set |
| M6 | Polish: HUD (Radix+framer-motion), audio (howler), persistence, branding | Shippable: APK + Pages, one PR |

## 4. Technology Stack

| Layer | Choice | Role |
|---|---|---|
| Build | Vite + TypeScript (strict) | ESM, HMR, dual target (Pages + Capacitor) |
| Render | React + react-three-fiber + drei | declarative 3D; useGLTF, useAnimations, Bvh, Html |
| Simulation | koota ECS | all live entities as ECS world; single source of sim truth |
| RNG | seedrandom | dual-stage PRNG (map seed + event seed) |
| AI/steering | yuka | A* graph pathfinding, steering, unit state machines |
| Audio | howler | OGG/WAV sfx/music/ambient buses |
| UI/HUD | Radix UI + framer-motion | accessible HUD primitives + animated panels/transitions |
| Persistence | @capacitor-community/sqlite + @capacitor/preferences | SQLite save games; Preferences settings |
| Mobile | Capacitor (Android) | debug APK |
| Test | Vitest (+ browser mode) + Playwright | logic TDD; real-r3f tests; HUD/Canvas screenshots |

## 5. Source Architecture

```
src/
  core/        hex math, dual-PRNG, A* graph, constants — pure, no THREE/React
  ecs/         koota world: components/, systems/ (movement, harvest, combat, ai, weather)
  world/       terrain gen, biome assignment, ramp placement, board r3f components
  entities/    character/building/resource r3f components; KayKit rig + shared-anim loader
  render/      Canvas, lighting, day-night, camera rig, particles, water
  audio/       howler buses (sfx/music/ambient), event→sound mapping
  hud/         Radix + framer-motion: panels, minimap, launcher, win/loss modals
  game/        orchestration: game state machine, selection/command, save/load
  persistence/ SQLite save schema, Preferences settings
public/assets/ curated GLB + OGG/WAV bundle organized by domain
docs/specs/    pillar docs
docs/milestones/ per-milestone contract docs
tests/         unit + browser + visual
```

**Load-bearing boundary:** `core/` and `ecs/systems/` are pure and fully TDD'd.
`world/`, `entities/`, `render/`, `hud/` are r3f/React, tested via Vitest browser mode
and Playwright. **The koota ECS is the single source of truth for simulation; r3f
components read ECS state and render it — they never own game state.** This is the
correction of poc2's failure mode, where game state was scattered across global
variables and undefined functions.

## 6. Asset Pipeline

`references/` is git-ignored, FBX/OBJ/DAE-heavy. A deterministic, idempotent build-time
ingest script curates it into a lean GLB+OGG `public/assets/` tree organized by logical
domain. CI verifies the output.

```
public/assets/
  board/        hex tiles + rivers/paths/bridges            (Kenney Hexagon Kit)
  nature/       trees, rocks, cliffs, waterfalls, crops      (Kenney Nature Kit)
  structures/   town hall, farm, barracks, towers, walls     (Hexagon/Castle/Town Kits)
  siege/        ballista, catapult, trebuchet, ram
  characters/
    heroes/     KayKit Adventurers (8 rigged)
    enemies/    orc, werewolf, frostgolem, skeleton, zombie, witch
    rigs/       Rig_Medium/Rig_Large shared animation libraries
    attachments/ swords, axes, shields, staves, bows
  audio/
    sfx/        footsteps, impact, magic, inventory, ui
    music/      tavern loops, rpg loops, main-menu
    stingers/   victory / level-complete
  manifest.json generated catalog: logical id → path, category, polycount, anims, license
```

**`manifest.json` is the contract.** Code references assets by stable logical id
(`board.tile.grass`, `characters.heroes.knight`, `audio.sfx.footstep.grass`) through a
typed accessor — never raw paths. Terrain gen, the character factory, and the audio bus
all consume the manifest, decoupling game code from vendor folder layout.

**Ingest steps:** prefer existing `.glb` (ignore FBX/OBJ/DAE); copy OGG for web + keep
WAV fallback; dedupe; parse polycounts + animation lists per GLB into the manifest; copy
license files; fail loudly on any missing expected asset.

**Licensing:** Kenney packs = CC0; KayKit = CC-BY (attribution required); audio packs
per their `LICENSE.txt`. The build bundles all `LICENSE.txt` files and renders an
in-game credits screen.

## 7. Characters & Animation

KayKit ships character GLBs (heroes + enemies) **plus** shared `Rig_Medium_General.glb`
/ `Rig_Medium_MovementBasic.glb` (and `Rig_Large_*`) animation-library GLBs. Characters
sharing a rig share an identical skeleton.

**Approach — shared-rig retargeting (KayKit's documented pipeline):** load each
character GLB for its skinned mesh; load the Rig_Medium/Rig_Large animation GLBs once;
bind those `AnimationClip`s to every character on the matching skeleton via drei
`useAnimations` / `useGLTF`. One animation set (idle, walk, run, attack, hit, death)
drives all KayKit characters of a rig size.

The koota ECS holds unit entities; an `AnimationState` component maps ECS unit state
(IDLE / MOVING / HARVESTING / ATTACKING / DYING) to the active clip. r3f character
components read that component and cross-fade clips. No procedural limb animation.

## 8. Pillar Documentation

Written first (M0), reviewed, then each milestone's TDD batch derives assertions from
them. Spec drift is a bug — code and pillar doc disagreeing means one is wrong and gets
fixed in the same commit.

```
docs/specs/
  00-overview.md         vision, scope, milestone map, glossary
  10-architecture.md     stack, src/ layout, ECS-as-truth boundary, data flow
  20-visual-language.md  palette, lighting, low-poly diorama rules, biome identity,
                         reference targets (Catan / Monument Valley / AC:NH)
  30-asset-pipeline.md   references/ → public/assets/ ingest, manifest contract, licensing
  40-hex-world.md        axial coords, hex math, terraced terrain, biomes, dual-PRNG,
                         ramp placement, A* graph
  50-ecs-model.md        koota components + systems catalog, entity archetypes
  60-characters.md       KayKit roster, shared-rig retargeting, character factory,
                         animation state mapping
  70-rts-systems.md      economy, combat, base-building, weather, research, win/loss, AI
  80-audio.md            howler buses, event→sound map, music/ambient logic
  90-ui-hud.md           Radix component set, framer-motion transitions, HUD layout,
                         launcher, minimap, modals
  95-persistence.md      SQLite save schema, Preferences settings, save/load flow
  99-build-deploy.md     Vite config, Capacitor Android, GitHub Pages, CI gates
docs/milestones/
  M0..M6-<slug>.md       per-milestone contract list; each contract cites a pillar doc
                         and names the test file that pins it
```

## 9. Testing & CI Strategy

- **Logic TDD (Vitest, strict RED→GREEN):** `core/` (hex math, dual-PRNG determinism,
  A* correctness), `ecs/systems/` (movement, harvest, combat, weather), `game/` state
  machine, `persistence/` save round-trip. Determinism test: same seed → identical
  board + identical event sequence.
- **Browser-mode tests (Vitest browser):** real r3f components mount — terrain renders,
  character GLB loads + animates, HUD components behave.
- **Visual (Playwright):** HUD screenshot regression; a Canvas smoke test that boots a
  game and screenshots the board (guards the "no game board" failure class).
- **Milestone-level TDD:** at each milestone boundary the full contract list from
  `docs/milestones/MN-*.md` becomes a batch of failing tests (test-only commits) before
  implementation. Green across the batch = milestone done by construction.
- **CI gates** (`.claude/gates.json` + GitHub Actions): coverage rule — changes to
  `src/render/**` or `src/world/**` require `tests/visual/**` updates or a
  `// no-visual-impact:` justification; `require_run` for `vitest` + `playwright`;
  APK + Pages builds must succeed. Per-commit local review trio runs in background.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| KayKit rig retargeting fails (skeleton mismatch) | M2 first task is a rig-verification harness; lock approach on evidence before building the factory |
| poc2's described systems (weather/research/rally) have no working reference | Reconstruct from the conversation's prose descriptions; pin each as an M5 milestone contract with explicit acceptance criteria in `70-rts-systems.md` |
| Asset payload large for web/APK | NOT budget-capped — the game ships whatever assets make it full and fun. Ingest script ships GLB+OGG only and dedupes; draco/meshopt compression + lazy per-milestone asset chunks keep load times reasonable without cutting content. No `size-limit` gate. |
| r3f in Vitest browser mode flaky | Canvas smoke test via Playwright as the backstop; browser-mode tests scoped to component behavior, not pixel exactness |
| Capacitor SQLite native plugin on web | `@capacitor-community/sqlite` has a web (wa-sqlite) fallback; persistence layer abstracts the platform |

## 11. Reference Material Notes

- `references/conversation.md` — the full design narrative; the **described** feature
  set is the spec, including systems poc2 never implemented.
- `references/poc1.html` — last fully-working build; **proven logic** for hex math,
  terraced terrain, A*, ramps, harvest loop. Logic ports, presentation does not.
- `references/poc2.html` — the "production" target; **structurally broken** (calls
  `startGame`, `findPath`, `buildRamp`, `getSurfaceColor`, `createHealthBillboard`,
  weather/research/rally systems — all undefined). Its intent is the goal; its code is
  not a source.
- `references/` 3D + audio packs — the complete, self-contained asset bundle. The NAS
  library is not used.
