# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Owner:** Claude
**Mandate:** "Decompose the references into standard pillar docs and a test-driven
r3f/drei/seedrandom/yuka/tonejs codebase with framer-motion and radix... capacitor-sqlite /
capacitor-preferences and koota... Faithfully decompose and finish the original concept in
r3f then expand and add features. Aim for debug mobile Android APK + GitHub Pages web on
the initial release pushed out in ONE PR... Fully autonomous, no shortcuts, no placeholders,
no stubs." + "proceed fully autonomously. I do not want any further stops or reviews." +
"This game does NOT need a size limit budget, it needs whatever assets are appropriate to
make a full, fun game."

## What CONTINUOUS means

1. Work continuously — when a task finishes, start the next.
2. Never stop for status reports.
3. Never stop for scope (it's all in the design doc).
4. Never stop to summarize.
5. Never stop on context pressure (the harness auto-compacts).
6. Never stop because a task feels big.

Only legitimate stops: explicit user halt, red CI needing user knowledge, a destructive
op needing per-op authorization, a scope-flipping ambiguity. Per user directive there are
NO review checkpoints.

## Autonomous-completion contract (aligned with the anti-stop hook)

This directive stays **Status: ACTIVE** until EVERY `[ ]` item below is `[x]`. The
anti-stop hook forbids stopping while an ACTIVE directive has any non-WAIT open
item — that is intentional. The mandate for this PR: **finish all of M8
(M8.3 → M8.7) and any remaining open item, in this PR, with no stopping.**

- Each M8.x step: extend the spec, write the test batch, make it green,
  `pnpm verify`, commit (the commit-gate needs a `tests/browser|visual` file
  for any `src/world|render|hud|entities` change — write the real test, do not
  reach for the override), push, mark `[x]`, immediately start the next.
- Do NOT mark the directive RELEASED or add `[WAIT]` prefixes to dodge the
  hook. The only legitimate `[WAIT]` here is genuine external state (CI in
  flight). Work the queue to zero.
- When the M8 queue is empty: run the full pre-push gate (verify + browser +
  e2e), confirm CI green on the PR, THEN flip Status to RELEASED.

## Operating loop

While the queue has `[ ]` items: implement → verify (`pnpm verify`) → commit →
dispatch the background reviewer trio scoped to the commit diff → mark `[x]` → next.
Milestone-TDD: at each milestone boundary, write that milestone's plan
(`docs/superpowers/plans/`) + its full failing-test batch (test-only commits) before
implementation, then turn the batch green one task at a time.

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up" |
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" | "continue-on-error" in CI |
"pause point" | "fresh session" | "stopping point" | "clean handoff" | "ready to hand off" |
"self-feedback" as a graduation signal.

## Debug-loop stop rule

If a probe loop runs >3 iterations without finding the cause, STOP probing. The bug is
architectural. Name the 2-3 real options, pick the one matching the spec doc, record the
decision + why in the spec doc, delete the probe scaffolding, take the right path.

## Step 1 of every unit is use-case enumeration

Before code for any non-trivial system: list its actual users / triggers / lifecycle
moments. >1 use case → the answer is usually a hybrid (shared core, per-use triggers).
Read the pillar docs first — don't make the user quote them back.

## Self-assessment is the default loop

After every commit/milestone: backward sweep (what shipped, what gaps) + forward sweep
(is the next stage still right? architectural questions to answer NOW in the spec doc?).
Encode forward learnings into this directive before the next stage.

## Delivery

ONE feature branch `feat/aethelgard-initial-release`, one commit per task/issue,
ONE final PR delivering debug Android APK + GitHub Pages web. Push only after all 7
milestones are `[x]` and the local review trio findings are absorbed.

---

## Queue

### M0 — Foundation  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m0-foundation.md` (13 tasks)
- [x] M0.1 pnpm project + package.json + .gitignore
- [x] M0.2 TypeScript + Vite config + React shell
- [x] M0.3 Biome lint/format config
- [x] M0.4 Vitest node + browser projects
- [x] M0.5 Playwright config
- [x] M0.6 Capacitor Android config
- [x] M0.7 Asset manifest types + typed accessor (TDD)
- [x] M0.8 Asset ingest script + curation map (TDD)
- [x] M0.9 Asset verification script + manifest contract test
- [x] M0.10 Pillar documentation set (12 specs + 7 milestone docs)
- [x] M0.11 GitHub Actions CI (build/test + debug APK)
- [x] M0.12 GitHub Pages deploy workflow
- [x] M0.13 Coverage gates + standard repo files + release config

M0 learnings carried into M1: (1) modern stack versions verified — React 19 / r3f 9
/ Vitest 4 (provider via @vitest/browser-playwright) / Biome 2 / Capacitor 8.
(2) Single non-composite tsconfig — project-references break on noEmit; do NOT
re-split. (3) `exactOptionalPropertyTypes` is on — omit optional props, never set
them `undefined`. (4) Vitest browser API: `page` from `vitest/browser`, `render`
is async. (5) `references/` paths confirmed: Hexagon Kit GLBs at
`Hexagon Kit/Models/GLB format/`, Nature Kit at `Nature Kit/Models/GLTF format/`.

### M1 — Hex board  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m1-hex-board.md` (17 tasks)
- [x] M1.1-8 core — constants, hex math, dual-PRNG, FBM noise, biome, board, ramps, A*
- [x] M1.9-12 ECS — koota world + components, path-follow system, startGame, commands
- [x] M1.13-16 render — palette, hex tiles, GameCanvas, tap-to-travel (visually verified)
- [x] M1.17 verification — 67 unit + 2 browser + 3 e2e/visual tests green

M1 learnings carried into M2:
- The "no game board" bug is FIXED — `startGame` produces a seeded, navigable
  board; tap-to-travel walks the pawn (screenshot-confirmed).
- r3f 9 needs `import '@react-three/fiber'` types in vite-env.d.ts for JSX
  intrinsics; Vitest browser mode needs `resolve.dedupe: ['react','react-dom']`.
- Single-octave noise starved biome variety — FBM + contrast stretch fixed it.
  M2's character placement (random NPCs) should use the same FBM field, NOT
  fresh single-octave noise.
- KNOWN M1 DEFERRALS (deliberate, not bugs — for later milestones): ocean is
  hex-prisms not a flat translucent water plane; mountains lack snow peaks.
  These are M5 (day/night + water polish) per the meta-rule — M1's contract was
  "the board renders + is navigable", which is met. Recorded here so they are
  not lost.
- M2 FIRST TASK is the KayKit rig-verification harness (per design §10 risk) —
  load a KayKit character + Rig_Medium animation GLBs, confirm the skeleton
  retargeting works, lock the approach in `60-characters.md` BEFORE the factory.

### M2 — Characters  ✅ COMPLETE
Pillar: `60-characters.md`, `50-ecs-model.md`.
- [x] M2.1 rig verification — KayKit shares an identical 23-bone skeleton; bind by name
- [x] M2.2 ingested 8 KayKit heroes + 4 rig-animation libs + orc enemy (25 assets)
- [x] M2.3 AnimatedCharacter — drei useGLTF/useAnimations shared-rig retargeting
- [x] M2.4 character factory — parameterized createCharacter, koota archetypes
- [x] M2.5 AnimationState component + animationSystem (Movement → clip)
- [x] M2.6 KayKit Engineer replaces the cone-pawn — visually verified, no T-pose
- [x] M2.7 milestone verification — 81 unit + 3 browser + 3 e2e tests green

M2 learnings carried into M3:
- The M2 milestone doc was over-specified (written in M0 from the design table).
  Health-billboard re-scoped to M4 (needs damage), selection-ring re-scoped to
  M3 (needs the command loop). Both recorded in the respective milestone docs.
  LESSON: milestone docs decompose at milestone START, not in M0 — M3+ contracts
  get their detail when that milestone begins, informed by the prior milestone.
- The character factory deliberately omits Health/Harvester/Carrier/Combatant —
  they join the archetype in the milestone that adds the system that reads them
  (dead components otherwise). M3 adds Harvester + Carrier; M4 adds Health +
  Combatant.
- M3 FIRST STEP: write the M3 plan + milestone-TDD batch, then build the peon
  harvest economy (resource nodes, harvest loop, Town Hall, deposit, build mode,
  supply) + the re-scoped selection ring.

### M3 — Economy  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m3-economy.md` (13 tasks)
- [x] M3.1-10 economy logic — components, GameEconomy, resource spawn, harvest/
  deposit/job-routing/build systems, supply, runEconomyTick wiring
- [x] M3.11 r3f rendering — resource nodes, Town Hall, selection ring;
  ingest now embeds GLB textures; Town Hall placed off the peon spawn tiles
- [x] M3.12 HUD resource/supply bar
- [x] M3.13 verification — 121 unit + 5 browser + 3 e2e green; the autonomous
  harvest loop verified in-app (wood 50→250 in 25s hands-off)

M3 learnings carried into M4:
- M2 review findings folded before M3 (ErrorBoundary, GLB dispose, preload all
  rigs, AnimationState.clipName dropped). M3 review trio runs next.
- Asset-pipeline lesson: Kenney GLBs reference external Textures/colormap.png;
  the ingest script now embeds textures into every GLB. Kenney building GLBs
  are modelled ~1u wide for a smaller hex grid — render-scale them ~1.7x.
- Two M3 contracts (build-mode UI, click-to-select) re-scoped to M6 — the
  logic (buildSystem, SelectionRing) is built+tested; the HUD *trigger* is M6.
- M4 FIRST STEP: write M4 plan + milestone-TDD batch, then combat — Combatant
  component, footmen, goblin/orc enemies, Goblin Portal, attack state machine,
  health billboards (re-scoped from M2), floating combat text, win/loss.

### M4 — Combat  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m4-combat.md` (11 tasks)
- [x] M4.1-8 combat logic — components, damage roll, combat/death/spawn/ai/
  win-loss systems, GameState wiring (Town Hall + Portal entities, Footman)
- [x] M4.9 r3f — Units (all-unit render), HealthBillboard, CombatText
- [x] M4.10 win/loss GameOverModal
- [x] M4.11 verification — 147 unit + 9 browser + 3 e2e green; 7200-tick
  combat-integration test passes

M4 learnings carried into M5:
- M3 review findings folded before M4 finished (harvest loop self-heals on
  node depletion, run-order fixed, recomputeMaxSupply wired). M4 review runs next.
- The full RTS loop is closed: economy + combat + win/loss all run in
  runEconomyTick. The game is PLAYABLE end-to-end.
- M5 adds the "production feature set": seeded weather (sunny/fog/rain),
  research/tech upgrades, barracks rally points, the 2D minimap, day/night
  cycle. These are mostly additive systems on the established ECS + r3f
  patterns — lower architectural risk than M2/M3/M4.
- M5 FIRST STEP: write M5 plan + milestone-TDD batch.

### M5 — Systems  ✅ COMPLETE
Plan: `docs/superpowers/plans/2026-05-22-m5-systems.md` (9 tasks)
- [x] M5.1-6 logic — clock + day/night curve, weather state machine, research,
  rally points, Orc escalation, GameState wiring (rain penalty threaded)
- [x] M5.7 r3f — DayNightCycle, RainParticles, RallyMarker
- [x] M5.8 2D minimap
- [x] M5.9 verification — 173 unit + 10 browser + 3 e2e green

M5 learnings carried into M6:
- M4 review findings folded mid-M5 (session-safe Maps, multi-attacker damage
  accumulation, CombatText batch detection, Units O(n²) removed). M5 review next.
- The minimap added a 2nd <canvas>; e2e selectors now use
  `canvas:not(#minimap-canvas)`. Watch for this pattern in M6 HUD work.
- Research/rally HUD triggers re-scoped to M6 — the logic is built+tested, the
  Barracks selection panel + buttons are M6 (same split as build-mode M3→M6).
- M6 is the FINAL milestone: Radix + framer-motion HUD polish (selection panel,
  build/research/rally buttons, branded launcher), howler audio buses,
  SQLite/Preferences persistence, credits screen. Then: ONE final push of the
  whole feat/aethelgard-initial-release branch as the single PR.

### M6 — Polish & Ship
Plan: `docs/superpowers/plans/2026-05-22-m6-polish.md`.
Mid-M6 design correction (`docs/specs/96-prng-and-landing.md`): split the map
and event PRNGs; the landing page becomes New Game / Continue / Settings with
map-size + difficulty + seed-phrase config; the event PRNG seed is a buried
Capacitor Preferences value; the seed-phrase shuffle draws from it (no Math.random).
- [x] M6.1-6 logic — audio buses, sound map, persistence, auto-save, selection,
  build/research/rally commands
- [x] M6 HUD built — hud-theme, TitleScreen, NewGameModal, SettingsModal,
  SelectionPanel, SoundToggle, CreditsPanel, CREDITS.md, themed ResourceBar,
  GameOverModal → Radix Dialog, map-size.ts (device-gated Huge)
- [x] core two-PRNG refactor — createMapPrng / createEventPrng / advanceEventSeed,
  generateBoard takes a radius
- [x] core two-PRNG refactor landed (08fc538); App.tsx rewired to the
  TitleScreen → NewGame → play flow (b998472)
- [x] new browser tests written (title-screen, selection-panel, modal-a11y)
- [x] config agents reviewed + the `as`-cast weakness FIXED — typed config
  loaders src/config/{combat,economy,world}.ts replace the 13 scattered casts
  (ec3b0ff). asset-plugin migration landed (d149d84) — public/ import bug fixed.
- [x] vite-static-assets-plugin migration; Biome linter confirmed latest (2.4.15)
- [x] useAudio wired into useGameLoop; auto-save wired into runEconomyTick
- [x] typed-config-loader refactor (ec3b0ff) — killed the scattered as-casts
- [x] WORLD-vs-poc1 visual gap fixed (71350be) — merged terrain mesh, real
  cone mountains, wooden ramps, layered water; DoubleSide was the bug that
  left the land backface-culled. Verified against references/poc1.png.
- [x] constants→config (6f16830) — core/constants.ts deleted, all values
  (incl. HEX_DIRECTIONS) now in world.json via the typed WORLD loader.
- [x] viewport/camera layer — useViewport (a377d7f), CameraRig zoom+pan
  (a377d7f), minimap viewport-rectangle (721e5b8), per-viewport HUD (b83f17b).
  Spec 98 Steps 1-4 all done, verified desktop + phone-portrait.
- [x] full verification green — 188 unit + 19 browser + 4 e2e (e7bdffa)
- [x] build targets verified — build:pages (correct Pages base path) +
  cap:sync both succeed
- [x] M6 milestone doc + CHANGELOG 0.1.0 written
- [x] pushed feat/aethelgard-initial-release; opened PR #1 (the single
  release PR delivering all of M0-M6)
- [x] PR-review (gemini-code-assist) — all 8 findings folded (72ee98a):
  module state → ECS components, RainParticles determinism, kill-count via
  deathSystem return, ramp Y-interp, terrain winding (DoubleSide dropped)
- [x] CI "Build and test" green on 72ee98a
- [x] CI fully green on PR #1 (build/test + APK).

### Post-PR fixes (user playtest feedback)  ✅ DONE
- [x] persistence: SQLite + jeep-sqlite (a00c059); sql.js pinned to 1.11.0 to
  match jeep-sqlite's bundled WASM glue — ^1.14.1 caused a dev LinkError.
- [x] event-PRNG lifecycle (0f235e7) — NewGameModal mints a fresh event seed
  per open; the seed phrase varies on every reopen/refresh. Verified in-browser.
- [x] cliff color (0f235e7) — fixed earth/rock tone per tier, continuous walls.
- [x] ramps (6a6ac58) — rebuilt as explicit-vertex sloped quads (no rotation);
  render as proper slopes. The rotated-box approaches both rendered flat.
- [ ] [WAIT] CI on the post-playtest commits (6a6ac58)
- [ ] further visual pass vs poc1.png — mountains drama, terrace crispness

### M7 — yuka AI subpackage + asset expansion  ✅ COMPLETE
Spec `docs/specs/97-ai-and-asset-expansion.md`. Five worktree agents, merged to
the branch (merge `db9cb0b`):
- [x] yuka AI subpackage — `src/ai/` (AiDirector, EntityManager, steering,
  perception); `ecs/systems/ai.ts` is now a thin facade. 213 tests green.
- [x] buildings — Castle/Town-kit models replace the blocky Hexagon stand-ins.
- [x] enemy base + monsters — graveyard base, +Vampire/Witch/BlackKnight roles,
  spawn escalation ladder.
- [x] audio — magic + UI sound packs, crit + UI event sounds.
- [x] decoration — per-biome environment scatter.

### M8 — AI-as-Player, Perception & Golden-Path E2E  [ACTIVE]
Spec `docs/specs/100-ai-as-player.md`. The destination: the AI plays through the
SAME interface, perception, and action space as a human — so AI-vs-AI is
deterministic golden-path E2E testing. Strictly sequential; I drive it myself,
docs → tests → code per step. Also folds in spec `99` (contextual crossings).

- [x] M8.0 — crossings/passability (spec 99) — c704bf5. core/crossings.ts
  (connectivity-first union-find placement), biomeStyleFor, FLAT/CROSSING/
  BLOCKED edges, Crossings.tsx contextual forms, scatter skips landings.
  220 tests green, verified in-browser — ramp-fringe gone.
- [x] M8.1 — faction model (d3f303b): `FactionBase` trait marks each faction's
  base symmetrically; `EnemySpawner` (was `GoblinPortalTrait`); `evaluateWinLoss`
  scores symmetrically over `FactionBase`; `EnemyBase.tsx`; all `GoblinPortal`
  naming gone. 221 tests green.
- [x] M8.2 — render decomposition (ca8e754): structure-models.ts faction-
  symmetric model table; HomeBase.tsx renders player structures via a reusable
  StructureMesh core; Buildings.tsx deleted; EnemyBase is the enemy side.
  Render-only, 220 tests green.
- [x] M8.3 — faction-aware command API (2d92904): every command takes an
  issuing faction; moveUnit enforces ownership; placeBuilding stamps the
  faction + filters peons by faction. The single action channel. 221 tests.
- [x] M8.4 — perception cones (f3805a0): src/game/fog.ts — per-faction vision
  cones (units) + circles (bases). NOTE: spec 102 supersedes the fog framing —
  the cone code is kept as the "observed battlefield"; M8.4z re-frames it.
- [x] M8.5 — fog rendering (f5b32b7): FogOverlay. SUPERSEDED by spec 102 —
  M8.5z replaces black fog with the drawn zone-of-control border.
- [x] M8.6a — symmetric economy (1a24098): `GameState.economy` is now
  `Record<Faction, GameEconomy>`; `enemyBaseKey`; depositSystem +
  recomputeMaxSupply run per faction. 227 tests green.
- [x] M8.4z — zone model (cd10305): src/game/zone.ts — ZoneState with
  `controlled` (claimTile/releaseTile) + `observed` (difficulty-scaled vision
  cones); GameState.zones replaces .fog. 233 tests green.
- [x] M8.5z — zone rendering (cd10305): ZoneBorder.tsx draws each faction's
  controlled-region encirclement; whole board visible, all units render.
  Verified in-browser — no black fog. (Pulse layered in by M8.6e.)
- [x] M8.6b — `src/rules/` engine (37fb082): yuka/koota-free barrel —
  placement (`canBuild`), economy-rules (`canTrain`, `recomputeMaxSupply`,
  `peonCap`, `canAddPeon`). build.ts/supply.ts deleted, consumers repointed.
  235 tests. (Peon-autonomy `nextPeonAction` + building behavior land in
  M8.6c as that's where they're first exercised.)
- [x] M8.6c — peon autonomy + 4 new building types (a396a55): peons run
  rules.nextPeonAction on both factions (harvest, claim, flee); House, Granary,
  Watchtower, Wall types in BuildingType + economy.json + structure-models;
  244 tests. (Dedicated GLBs for the 4 new types land in M9.2a.)
- [ ] M8.6e — encroachment + behavior-archetype LOCAL ZONE OF CONTROL (spec 102):
  OffensiveBehavior/DefensiveBehavior/AttractorBehavior are composable traits
  (not building-type-coupled); `rules/building-behaviors.ts` maps each type to
  its profile; placeBuilding composes the right traits at spawn. Encroachment:
  enemy-military-on-controlled-tile → pulse → flip (difficulty-scaled grace).
  Watchtower offensive zone via offensiveBehaviorSystem (decoupled — runs over
  ANY OffensiveBehavior entity). Town Hall + enemy base get AttractorBehavior;
  attractor map-gen contract guarantees N×resource in radius (emergent
  game-start). Wall blocks pathing via the existing walkable=false.
- [ ] M8.6f — behavior-system polish: (a) OffensiveBehavior consumes the event
  PRNG for arrow-volley jitter and multi-target selection (upgradable —
  `targetCount`, wider radius); (b) DefensiveBehavior extended with
  `armorVsSiege` / `armorVsNormal` and a system that absorbs proportional
  damage by attacker type (responsive to siege units); (c) arrow/projectile
  animation when an OffensiveBehavior fires.
- [ ] M8.6d — yuka AI player (spec 101/102): `AiPlayer extends GameEntity` with
  a yuka `Think` brain; `GoalEvaluator`s for build / train / move-military
  (no scout goal — peons auto-claim) reading pulse/erosion/wall signals,
  calling `commands.ts`. Built on `src/rules/`. Modeled on pond-warfare's
  `Governor`. Uses `@types/yuka`.
- [ ] M8.7 — AI-vs-AI golden-path E2E: swap both factions to AI, turn loop,
  macro/meso/micro state probes, golden-transcript regression assertions.
- [ ] M8.8 — M8 integration check: `pnpm verify` + `test:browser` green; an
  AI-vs-AI match runs start→win without NaN/stuck-unit/economy invariants
  broken; commit the M8 milestone-complete marker.

## Queue — M9 (Completion & Polish — make the game shippable)

The game must be **complete, polished, and exercised** — not just mechanically
done. M9 closes every gap between "M8 mechanics work" and "this is a finished,
fun, releasable game."

### M9.1 — UX for the new systems (the player must understand the game)
- [ ] M9.1a — build menu covers ALL buildable types: Farm, Barracks, House,
  Granary, Watchtower, Wall — each with icon, cost, a one-line description,
  and `rules.canBuild` gating the button. `SelectionPanel` / build UI updated.
- [ ] M9.1b — zone & territory legend: the HUD teaches what the zone border,
  the contested-tile pulse, and the three building auras mean (a compact
  legend / first-run hints — the player must read the board correctly).
- [ ] M9.1c — onboarding: a short first-run tutorial overlay walking the core
  loop (peons auto-harvest, watch resources, build, defend the Town Hall).
  Skippable, shown once (Preferences flag).
- [ ] M9.1d — docs completeness: write `docs/specs/10-player-journey.md`
  (scene-by-scene journey — does not exist; every transition gets an e2e) and
  `docs/specs/99-glossary.md` (canonical term list). Refresh `docs/STATE.md`.

### M9.2 — visual & audio polish (the agent owns this — judge vs references)
- [ ] M9.2a — building models: House, Granary, Watchtower, Wall get dedicated
  GLBs in `structure-models.ts` (M8.6c reuses existing structure GLBs to land
  the logic). Curate from the **KayKit Ultimate Fantasy RTS** pack via the
  assets-library MCP (`/Volumes/home/assets/3DLowPoly/GameKits/Fantasy/Ultimate
  Fantasy RTS` — TowerHouse, Windmill, Archery, WonderWalls) + the KayKit
  Medieval Hexagon `building_watchtower`. Both faction skins; screenshot-judged
  vs `references/poc1.png`. Consider this pack for a whole-game building
  upgrade.
- [ ] M9.2b — zone-border + pulse polish: the encirclement line and the
  encroachment pulse are tuned to read clearly and look good on a phone
  screen; screenshot-judged at desktop + Pixel-7 portrait.
- [ ] M9.2c — audio: zone-claimed, encroachment-warning, building-placed,
  tile-lost cues wired through the audio buses; audio-graph tests.
- [ ] M9.2d — full visual sweep: every screen + new component screenshotted,
  read, and judged against `docs/specs/20-visual-language.md` and the
  references; fix anything that is "acceptable, not great."

### M9.3 — exercised (the full five-layer test pyramid, all green)
- [ ] M9.3a — e2e player-journey suite: one Playwright test per transition in
  `10-player-journey.md` (launch → new-game → play → build → combat →
  victory/defeat), all green.
- [ ] M9.3b — visual baselines: lock `toHaveScreenshot` baselines for every
  HUD component, the zone border, each building, the title screen — self-judge
  before locking, per the visual lock-in ladder.
- [ ] M9.3c — coverage audit: every `docs/specs/` claim has a pinning test;
  `pnpm verify` + `test:browser` + `test:e2e` + `test:visual` all green.

### M9.4 — mobile & release
- [ ] M9.4a — Capacitor: `pnpm cap:sync`; the debug APK builds; touch input
  works for the new build menu + tap-to-move; safe-area insets respected;
  tested at Pixel-5a render budget.
- [ ] M9.4b — release hygiene: CHANGELOG updated (Keep a Changelog), all root
  `STANDARDS.md`/`README.md`/`docs/STATE.md` current, the PR description
  rewritten to summarise M7+M8+M9.
- [ ] M9.4c — pre-push gate: `comprehensive-review:full-review` vs
  `origin/main..HEAD`, address blockers; full suite green; CI green on PR #1.
- [ ] M9.5 — RELEASE: squash-merge PR #1 to main; confirm cd.yml deploys
  GitHub Pages + the APK artifact; flip directive Status to RELEASED.

Each M8/M9 step: extend `docs/specs/`, write the test batch, make it green, commit,
then the next. The faction-symmetry rule — identical traits/behaviors/commands,
render-only divergence — is the invariant the whole milestone protects.
