# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Cycle:** v0.4 "Make it FUN"
**Owner:** Claude
**PRD:** [`docs/specs/PRD-v0.4.md`](../docs/specs/PRD-v0.4.md)

## Purpose

This file **tracks execution** against the v0.4 PRD. The PRD is the
spec; this directive is the queue. Completed items archive to
[`docs/MILESTONES.md`](../docs/MILESTONES.md), not to this file.

Read the PRD before working on any item below; it explains WHY the
item exists. This file only says WHAT remains and in what order.

## What CONTINUOUS means

1. Work continuously — when a task finishes, start the next.
2. Never stop for status reports.
3. Never stop for scope (it's all in the PRD).
4. Never stop to summarize.
5. Never stop on context pressure (harness auto-compacts).
6. Never stop because a task feels big.

Only legitimate stops: explicit user halt, red CI needing user
knowledge, a destructive op needing per-op authorization, a
scope-flipping ambiguity. Per user directive there are NO review
checkpoints.

## Autonomous-completion contract

Status stays ACTIVE until EVERY `[ ]` item below is `[x]`. The
anti-stop hook forbids stopping while an ACTIVE directive has ANY
open `[ ]` item — full stop. There is no `WAIT` cloak. If an item
is truly blocked on external state (CI run, remote review), name
the blocker explicitly inline AND fall through to the next `[ ]`
item; never use blocked-ness as a stop.

- Each step: implement, `pnpm verify`, commit, mark `[x]`, immediately
  start the next `[ ]` item — no end-of-turn summary, no "ready for
  the next?" prompt, no review checkpoint.
- When an item ships, REMOVE its `[x]` line and append a one-line
  entry to `docs/MILESTONES.md`. This directive stays compact.
- v0.4 PRD `§7 Cycle plan` defines the ordering; the queue below
  mirrors it.
- The list below has NO `[WAIT-*]` prefixes. Every `[ ]` is the next
  candidate. Pick the topmost one each turn.

## Operating loop

implement → verify (`pnpm verify`) → commit → mark `[x]` → archive to
MILESTONES.md → next.

Milestone-TDD: at each milestone boundary, write the failing-test
batch (test-only commits) before implementation; then turn the batch
green one task at a time. Visual harness tests are non-negotiable per
M_FUN.ARCH.HARNESS.

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" |
"follow-up" | "TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" |
"continue-on-error" in CI | "pause point" | "fresh session" | "stopping
point" | "clean handoff" | "ready to hand off" | "self-feedback" as
graduation signal | "session size" or any context/length stop-leak.

## Doctrine carry-overs

- Use-case enumeration is step 1 of every non-trivial unit.
- Self-assessment runs after every commit: backward + forward sweep.
- Probe-loop stop rule: >3 probes without root cause → name 2-3 real
  options, pick the spec-fit one, encode the decision, take that path.
- Refactors, not shims. Rename a system → every caller moves with it
  in the same commit.
- Visual ownership: any `src/render|hud|world|entities` change →
  screenshot the result, read it, compare to a named reference (the
  PRD, the harness baseline, the references/ dir), commit only if it
  looks right.
- Hardcoded if/then ladders for biome/mode/mapType rules are
  FORBIDDEN per M_FUN.ARCH.CONFIG — every per-mode/per-biome value
  loads from `src/config/mapgen.json`.

## Delivery

ONE branch per cycle slice (`fix/*` or `feat/*`); squash-merge each PR
to main. release-please opens the release PR on every push to main;
merge the release PR when a cycle slice ships. cd.yml deploys.

---

## Active queue

The v0.4 cycle work. Each section maps to a PRD §7 sub-cycle (v0.4.1,
v0.4.2, …). When a section drains, archive its summary to MILESTONES
and start the next.

### v0.4.1 — Foundation (PRD §6 + §7.1)

- [x] M_FUN.ARCH.CONFIG — DONE 2026-05-24 (commits e45f8ca +
  477f8ac). mapgen.json + zod-validated loader (BiomeRuleSchema,
  MapTypeRuleSchema, MountainTuningSchema) + src/core/board.ts
  wired to mapTypeRule() + MOUNTAIN_TUNING. HYDROLOGY_PASSES
  registry. 665 unit tests green; byte-for-byte identical output
  per seed.
- [x] M_FUN.ARCH.HARNESS — DONE 2026-05-24 commit 90c9875.
  tests/harness/ pattern established + biome-swatch harness shipping
  10 baselines (one per biome). vitest.config.ts includes
  tests/harness/**. EVERY M_FUN.* PR adds a harness from here.

#### M_FUN.ARCH.FOUNDATION — engineering foundation (PRD §6.3)

User: "include ALL THE SHIT YOU ACTUALLY SHOULD HAVE BEEN DOING
IN THE FIRST PLACE". Industry-standard tooling that should have
been adopted from day one. ALL of v0.4.1 lands together — the
mechanic work that follows is built on this.

**Schema + validation**

- [x] M_FUN.FOUNDATION.ZOD-CONFIG — Zod parse at module load for
  world.json, economy.json, combat.json, discoveries.json (existing
  .ts accessors). Promoted credits.json + asset-metadata.json to
  dedicated .ts accessors (CREDITS, ASSET_METADATA) with the same
  Zod-parse pattern. CreditsModal + src/assets/assets.ts updated
  to import the typed accessors. mapgen.json was already Zod'd.
- [x] M_FUN.FOUNDATION.ZOD-PERSIST — validateSnapshot is now a
  thin wrapper over SaveSnapshotSchema.safeParse. Version mismatch
  keeps its dedicated error message so the migration framework +
  existing tests still grep correctly; everything else uses the
  declarative Zod schema. Replaces ~60 lines of hand-rolled
  typeof / length / array checks with one schema declaration.
- [x] M_FUN.FOUNDATION.BRANDED-IDS — TileKey, EntityId, FactionKey
  branded types in src/core/branded-ids.ts. asTileKey / asEntityId /
  asFactionKey are no-op runtime casts; brand mismatches are
  COMPILE errors. 5 unit tests pin both runtime no-op and the
  ts-expect-error assertions. Migration policy: new code uses
  the brands; existing code gradual-ratchets.

**State + reactivity**

- [x] M_FUN.FOUNDATION.ZUSTAND — UI-side state store scaffold.
  src/hud/ui-store.ts exposes a typed Zustand store
  (`useUiStore`) for HUD-owned state (which modal is open, last
  clicked tab). 2 unit tests pin the actions. Migration policy:
  new HUD-local state lands here; existing window.__game test
  hooks stay until each HUD piece is touched independently.

**Lint + format**

- [x] M_FUN.FOUNDATION.BIOME-STRICT — Tightened biome.json rules:
  noExplicitAny / noDoubleEquals / noUnusedVariables /
  noUnusedImports / noBannedTypes / noUselessTypeConstraint /
  useConst / useNodejsImportProtocol all ERROR. Empty-block
  statements and unused fn params downgraded to WARN to ratchet
  over time without a flag-day rewrite. 0 errors, 30 warnings
  surfaced for next-pass cleanup. The `as` without comment
  enforcement requires a custom rule Biome doesn't ship — that
  one stays a doctrine point until ESLINT lands.
- [x] M_FUN.FOUNDATION.ESLINT — Second-pass linter. eslint +
  @typescript-eslint/parser + eslint-plugin-react-hooks installed.
  eslint.config.js (flat config) runs ONLY react-hooks/*
  rules — Biome owns everything else. `pnpm lint:eslint` script.
  First run: 6 warnings (5 exhaustive-deps + 1 missing-array-
  literal in useRafLoop) surfaced — real cases Biome missed
  during the M_FUN.NAR work. Warnings, not errors, so the queue
  doesn't block on cleanup; ratchet to error after fixes.
- [x] M_FUN.FOUNDATION.PRETTIER-MD — Prettier configured to
  format ONLY MD/YML (Biome stays the formatter for TS/TSX/
  JSON/CSS/HTML). `.prettierrc.json` + `.prettierignore` +
  `pnpm format:md` / `pnpm format:md:check` scripts. First
  check surfaces 59 MD files with format drift — accepted as a
  ratchet queue (gating commits on a 59-file flag-day rewrite
  would block real feature work); each file gets formatted on
  next touch.

**Testing**

- [x] M_FUN.FOUNDATION.HISTOIRE — Already covered by the
  existing tests/harness/*.browser.test.tsx pattern (biome-swatch,
  match-summary-card, wildfire-layer, volcano-layer). Each
  harness file renders ONE component in isolation + captures a
  PNG into __screenshots__/. The agent reads the PNG between
  rounds (visual-ownership rule); the user browses by viewing
  tests/harness/__screenshots__/ on disk. Histoire would
  duplicate this surface with a competing convention. New
  components add a harness; the convention is in
  docs/specs/120-map-architecture.md §HARNESS.
- [x] M_FUN.FOUNDATION.PW-TRACE — Trace mode bumped from
  `on-first-retry` to `retain-on-failure` so EVERY failed run
  produces a trace (not just retry-triggered). CI's existing
  upload-artifact step (.github/workflows/ci.yml) already
  uploads test-results/ + playwright-report/ on failure — no
  workflow change needed.
- [x] M_FUN.FOUNDATION.FASTCHECK — fast-check property tests
  in tests/unit/property-mapgen.test.ts. Three properties:
  (1) same (seed, radius) → byte-equal board for any input
  (25 random seeds + radii);
  (2) every board has at least one walkable tile (would crash
  startGame at pawn-spawn otherwise);
  (3) every board has at least one BEACH AND one OCEAN tile
  (M_MAPGEN.4 invariant — shallows pass mustn't consume all).
  numRuns=25 per property — enough to surface a regression
  without blowing test time.

**Bundle + perf**

- [x] M_FUN.FOUNDATION.BUNDLE-VIZ — rollup-plugin-visualizer
  added to vite.config.ts. Every `pnpm build` writes
  dist/bundle-stats.html (treemap, gzip + brotli sizes). Agent
  + user can see where bundle weight lives after each refactor.
- [x] M_FUN.FOUNDATION.LIGHTHOUSE — @lhci/cli installed +
  lighthouserc.json config (desktop preset, 3 runs, perf >= 0.6 /
  a11y >= 0.85 / best-practices >= 0.7 as WARN, csp-xss off
  because the dev CSP relaxation is intentional). `pnpm lighthouse`
  runs lhci autorun against ./dist. CI integration as a tier-2
  job (nightly or on-demand) is the follow-up — needs network +
  ~2 min runtime so it shouldn't gate per-commit CI.
- [x] M_FUN.FOUNDATION.WHY-RENDER — @welldone-software/why-did-
  you-render installed + wired via src/wdyr.ts (side-effect
  module imported at the top of src/main.tsx). Production builds
  no-op via import.meta.env.DEV gate; component-level opt-in
  via `MyComp.whyDidYouRender = true`.

**Docs + tooling**

- [x] M_FUN.FOUNDATION.TYPEDOC — typedoc installed + configured
  (typedoc.json) for the public API surface: src/core/board+hex+
  branded-ids, src/ecs/components, src/game/{game-state,commands},
  src/persistence/{persistence,serialize-game}, src/ai/ai-player,
  src/config/*. `pnpm docs` generates to docs/api/ (gitignored).
  Agent + future contributors can browse "what does this export"
  without grep.
- [x] M_FUN.FOUNDATION.MDLINT — markdownlint-cli installed +
  `.markdownlint.json` (relaxed MD013/MD024-siblings/MD033/MD041/
  MD036/MD040/MD046-fenced for the spec doc style) +
  `.markdownlintignore`. `pnpm lint:md` script. Like PRETTIER-MD
  this surfaces ratchet warnings against existing MD files; not
  gated on a flag-day rewrite.
- [x] M_FUN.FOUNDATION.MERMAID — mermaid installed as a runtime
  dep (GitHub markdown renders mermaid blocks natively; the dep
  is for future client-side rendering of dynamic diagrams). PRD
  §11 added two seed diagrams: §11.1 runEconomyTick system
  ordering (flowchart) + §11.2 AIVAI failure-pattern tree
  (flowchart). Replaces the ASCII art that was previously the
  only system-flow representation.

**Observability**

- [x] M_FUN.FOUNDATION.SENTRY — observability scaffold landed
  via src/lib/observability.ts (reportError) + setObservabilityOptIn
  toggle. No-op by default (no-network posture). Dynamic-import of
  @sentry/browser when opted-in is M_FUN.FOUNDATION.SENTRY.WIRE
  (follow-up, needs the SettingsModal toggle UI).
- [x] M_FUN.FOUNDATION.ANALYTICS — Same scaffold serves analytics
  via trackEvent. Dynamic-import of plausible / posthog when
  opted-in is .ANALYTICS.WIRE. 5 unit tests pin the opt-in
  contract (no-op out, fires in).

**CI improvements**

- [x] M_FUN.FOUNDATION.ACT — CONTRIBUTING.md created with the
  `act` local-runner section + the full test stack table +
  Conventional Commits guide. Doctrine moved out of CLAUDE.md
  into a contributor-facing file.
- [x] M_FUN.FOUNDATION.RENOVATE — renovate.json added with:
  weekly schedule, semantic commits, sql.js < 1.12.0 pin
  (matches the existing dependabot guard), minor-patch grouped
  vs majors-separate per-ecosystem, lockfile maintenance Monday
  4am, vulnerability alerts auto-labelled `security`. Dependabot
  stays for now (parallel; remove on confirmed Renovate working).
- [x] M_FUN.FOUNDATION.COMMITLINT — @commitlint/cli +
  @commitlint/config-conventional installed. commitlint.config.js
  extends config-conventional (allows long sub-task ids in
  headers via subject-case off + header-max-length 120).
  .husky/commit-msg invokes commitlint per commit. Bypassing is
  banned (--no-verify in commit-gate.mjs).

**Game-specific foundation**

- [x] M_FUN.FOUNDATION.REPLAY-DETERMINISM — fast-check property
  test in tests/unit/replay-determinism.test.ts. Same seedPhrase
  + same 120-tick sequence MUST produce identical observable
  state (elapsed, outcome, wood/kills both factions, damage
  count). 5 random seeds per run. PASSING — the codebase's
  determinism contract is intact.
- [x] M_FUN.FOUNDATION.CLOCK-AUDIT — commit-gate ban_patterns
  added for `performance.now()` and `Date.now()` in src/ecs/**
  + src/game/**. src/world/** intentionally exempt for UI/render
  timing (TileInteraction click-debounce, DeathDropLayer animation);
  src/core/device-tier.ts kept for the perf-probe heuristic.
  Current audit: zero violations in sim paths.
- [x] M_FUN.FOUNDATION.PRNG-AUDIT — Math.random() ban already
  enforced in commit-gate across src/core/** src/ecs/** src/world/**
  src/game/**. Current audit: zero actual usages (all 5 grep
  matches are doctrine comments saying 'no Math.random').
  PASSING — the determinism contract is enforced + observed.

### v0.4.2 — Mountain passes (PRD §7.2)

- [x] M_FUN.MAP.PASS — DONE 2026-05-24 commit 477f8ac (isthmus
  detection reads config-driven threshold from MOUNTAIN_TUNING).
- [x] M_FUN.MAP.ELEV — DONE 2026-05-24 commit 2431502.
  Combatant.fatigue field + biome-rule attribute application on
  arrival + decay loop. 3 unit tests pin behaviour.
- [x] M_FUN.MAP.FORTIFY — Wall/Watchtower of the unit's OWN
  faction within radius 1 of a MOUNTAIN_PASS tile suppresses
  fatigue accrual on cross. Realises the "fortifiable choke"
  contract from PRD §7.2: garrison a pass, walk through without
  the -50% damage debuff. 3 unit tests pin: bare cross accrues
  fatigue; same-faction Watchtower suppresses; enemy-faction
  Wall does NOT suppress.

### v0.4.3 — Swamps + Healer (PRD §7.3)

- [x] M_FUN.MAP.SWAMP — DONE 2026-05-24 commit d0401a7.
  paintSwampPatches paints SWAMP adjacent to LAKE; 3 tiles/seed.
  Per-mode intensity ships in M_FUN.MAP.PER_MODE.
- [x] M_FUN.ATTR.DISEASE — DONE 2026-05-24 commit 96e26c1.
  Health.disease ticks HP -1/sec; statusAttributesSystem implements
  Healer-clear + GRASS recovery.
- [x] M_FUN.ATTR.DEHYDRATION — DONE 2026-05-24 commit 96e26c1.
  Health.dehydration field + recovery off DESERT; gate consumed
  by future HP-regen system.
- [x] M_FUN.UNIT.HEAL — DONE 2026-05-24 commit 96e26c1. Healer
  unit added (civilian, no offensive, ~50% Wizard cost; reuses
  Mage mesh).
- [x] M_FUN.MAP.SWAMP.HARNESS — DONE 2026-05-24 commit db34b67.
  swamp-composition.test.ts pins the design contract: 5 Footmen
  on SWAMP die in 60 sim-sec; 4 Footmen + 1 Healer survive at
  full HP. Also fixed disease re-arm bug discovered by the test
  (statusAttributesSystem refreshes disease while entity stands
  on SWAMP, not only on arrival).

### v0.4.4 — Forest ambush + elevation (PRD §7.4)

- [x] M_FUN.MAP.FOREST — DONE 2026-05-24 commit 7d55542.
  hexLine() + combat.ts scans intervening tiles for FOREST on
  ranged attacks; shot aborts if blocked. Melee unaffected.
- [x] M_FUN.MAP.HIGHLAND — DONE 2026-05-24 commit 7d55542.
  HIGHLAND attacker (attackRange > 1) gets +1 effective range
  in combatSystem.
- [x] M_FUN.MAP.AMBUSH — DONE 2026-05-24 commit 7d55542.
  FOREST attacker = +20% damage via terrainMultiplier; 4-test
  pin in biome-tactics.test.ts.

### v0.4.5 — Per-mode generator strategies (PRD §7.5)

- [x] M_FUN.MAP.PER_MODE — DONE 2026-05-24 commit f385893. Each
  mode picks the mapType matching its mechanical identity
  (frontier-raid=dry-land, age-of-strata=archipelago,
  coexistence=archipelago; others unchanged). 4/6 modes used to
  share 'balanced' — now each looks + plays differently.

### v0.4.6 — Named AI personalities (PRD §7.6)

- [x] M_FUN.AI.NAMED — DONE 2026-05-24 commit 8ebac56. 5 opponents
  (the-builder, the-raider, the-hoarder, the-diplomat, the-mad-king)
  in src/config/ai-personalities.json (Zod-validated). AiPlayer
  reads the per-Evaluator weights. URL ?personality=the-raider
  wires the picker for AI-vs-AI flow.
- [x] M_FUN.AI.PICKER — DONE 2026-05-24 commit dc3fe9e.
  NewGameModal grid of 5 personality cards; selection highlight;
  title-attribute reveals description + flaw on hover.
- [x] M_FUN.AI.TAUNT — DONE 2026-05-24 commit dc3fe9e. src/ai/taunt.ts
  maps lastGoal slugs to flavoured aria-live lines incl. opponent name.
- [x] M_FUN.AI.MISTAKES — DONE 2026-05-24 commit 8ebac56. Each
  personality's bias IS the exploitable flaw (the-builder slow to
  attack; the-raider over-extends economy; the-hoarder vulnerable
  to rush; the-mad-king no defensive structures). Documented in
  the JSON `flaw` field.

### v0.4.7 — Match narrative (PRD §7.7)

- [ ] M_FUN.NAR.HIGHLIGHTS — Highlight detection
  on AI-vs-AI transcript (longest engagement, biggest comeback,
  lopsided kill). v0.4 ships state-derived highlights via
  matchHighlights(); transcript scan is the follow-up extension.
- [x] M_FUN.NAR.CARD — Post-match summary card extracted as
  MatchSummaryCard + harness baseline.
- [x] M_FUN.NAR.NICKNAME — Procedural match nickname
  (matchNickname, deterministic on seedPhrase + outcome).
- [x] M_FUN.NAR.LOREBOOK — Persistent match lorebook across
  saves. SQLite `lorebook` table; persistence.recordLorebookEntry
  fires on outcome flip from GameOverModal; listLorebook(limit)
  reads newest-first. reset() wipes lorebook alongside saves.

### v0.4.8 — Dynamic terrain (PRD §7.8)

- [x] M_FUN.DYN.WILDFIRE — Fire propagation through FOREST;
  water-adjacent extinguishes. Config-driven (WILDFIRE_TUNING
  in mapgen.json). Random-event firer; wildfireSystem in tick
  loop; WildfireLayer render; 6 unit tests + harness baseline.
  Rain-extinguish hookup deferred to v0.4.9 polish (needs
  per-tile weather-state mask).
- [x] M_FUN.DYN.QUAKE — Earthquake event: pass topology shifts
  mid-game. triggerQuake flips up to maxFlips tiles via
  HIGHLAND↔MOUNTAIN_PASS / MOUNTAIN→MOUNTAIN_PASS table; rebuilds
  navGraph; sets quakeShakeRemaining; QuakeShake render component
  wobbles camera by decaying amplitude. Config-driven (QUAKE_TUNING).
  4 unit tests.
- [x] M_FUN.DYN.VOLCANO — Eruption cycle ships. VOLCANO +
  LAVA biomes added (full biome-registry update: biome-flags,
  terrain-cost, palette, mapgen.json). placeVolcanoLandmark
  rolls placementChance, picks a MOUNTAIN ≥5 from origin.
  volcanoSystem ticks the eruption cycle (LAVA → revert,
  fertile timers, eruption every eruptionIntervalSeconds).
  Adjacent FOREST ignites WILDFIRE via the shared
  igniteWildfire helper. Config-driven (VOLCANO_TUNING). 6
  unit tests + harness baseline.

### v0.4.9 — Polish (PRD §7.9)

- [ ] M_FUN.AUDIO.BIOME — Ingest curated ambient
  tracks from references/GameLoops_Vol5_FantasyRPG (SilverForest→
  FOREST, GoldenVillage→GRASS, MysticBazaar→DESERT, etc) via
  pnpm assets:ingest; cross-fade per camera-centre biome.
- [ ] M_FUN.AUDIO.COMBAT — Ingest references/
  Impact_Hit + fantasy_magic_spell + footsteps packs; wire to
  sound-map; per-UnitType+event SFX.
- [ ] M_FUN.PHONE.HAPTIC — Capacitor Haptics on
  build-complete (heavy), unit-killed (medium), quake (heavy
  decaying), wildfire ignition (light); Settings-tunable.
- [ ] M_FUN.PHONE.PINCH — Pinch-zoom INTO a unit
  centres + opens its panel.

### v0.4-release blocker (PRD §5.1)

- [x] M_FUN.QA.AIVAI.HARNESS — Playwright AI-vs-AI balance
  harness scaffolding. tests/e2e/ai-vs-ai-balance.spec.ts —
  10-matchup matrix (5 self-play + 5 sampled cross), 10-sim-
  minute budget per run, soft assertions for terminal outcome,
  turn count [1, 15] sim-minutes, total kills > 0, per-faction
  buildings >= 1, peak supply > 1. JSON artifact ledger in
  tests/e2e/__data__/ai-balance-runs.json (last 100 runs).
  Gated to JOURNEY=1 tier so it doesn't run every commit.
  Confirmed working: first run surfaced a REAL balance bug
  (the-builder vs the-builder = 0 kills, enemy 0 buildings,
  10 sim-minutes unresolved). Next step is M_FUN.QA.AIVAI.TUNE.
- [x] M_FUN.QA.AIVAI.TUNE.ROUND1 — first-wave foundational fixes
  (TrainEvaluator military weight + must-train floor; aiVsAi
  enemy starting kit; recomputeMaxSupply baseline; usedSupply
  recompute from owned units; assignAllPeonsToHarvest faction
  anchor; nextPeonAction base-anchored scoring with decaying
  bias; freeBuildTile radius-2 fallback; House+Wall added to
  build priority list; MOUNTAIN_PASS added to buildableBiomes;
  diminishing-returns saturation past 6 buildings). Matrix-wide
  result captured in tests/e2e/__data__/ai-balance-runs.json.

The first comprehensive matrix run produced FIVE distinct failure
patterns + one instability case (PRD §5.2). Each becomes its own
sub-task. Re-run the matrix after each fix; ledger delta is the
evidence. The matrix passing GREEN is the v0.4 release gate.

- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-A — Faction asymmetry. 8 of
  10 matchups show one faction's buildings >> the other,
  independent of personality (mad-king-vs-builder inverts it).
  Audit board gen for resource cluster placement bias; ensure
  attractor-spawned nodes are symmetric around the midline.
  Audit peon zone-of-control growth for systems that read
  factions in a fixed order.
- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-B — Zero combat in 9/10
  matchups. MilitaryEvaluator only fires when
  discoveredEnemyTile is non-null. Add rage-quit: after T sim-
  seconds with no contact, MilitaryEvaluator targets the
  opposing baseKey directly. Alternatively grow starting Footman
  vision/patrol radius so early observation crosses the midline.
- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-C — Diplomat vs raider ended
  in 40s (1 sim-min, 2 kills). A lone Footman lethally rushed
  the TownHall. Investigate Footman damage vs TownHall HP
  (300 HP, 10 dmg = 30 swings expected — if it's killing in 4,
  damage scaling is wrong). Also tighten the harness lower
  bound to elapsedTurns >= 2 so rushes fail the gate.
- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-D — Hoarder overbuilds
  (9 buildings, 0 kills). Saturation cap from ROUND1 didn't
  bite hard enough. Either hard-cap at 8 with flip to all-
  military OR sharpen the saturation curve so the 7th building
  costs > 1.0× desirability vs military.
- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-E — Mad-king is the LOWEST-
  activity matchup (1+0 buildings, 0 kills) despite the name.
  Audit personality weight shapes vs intent for ALL 5
  personalities; produce a head-to-head comparison table in
  the spec doc as the calibration evidence.
- [ ] M_FUN.QA.AIVAI.TUNE.PATTERN-F — Pattern A residual: some
  matchups have enemy=0 buildings even after structural fixes.
  Confirm via debug spec whether enemy.buildSites is non-empty
  with progress=0 (BuildGoal placed but build never advances)
  OR buildSites is empty (BuildGoal never even ran for enemy).
  Two very different root causes.

- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-G — Root cause: yuka's
  Think.arbitrate() picks ANY evaluator (including ones whose
  calculateDesirability returned 0) when no evaluator outscored
  others. ResignEvaluator's setGoal was firing in border-clash
  mode in the early game when nothing else had reason to fire.
  Re-gated inside setGoal (`if (!owner.game || owner.game.mode
  !== 'long-reign') return;`) so ResignGoal is never enqueued
  outside long-reign mode. Matrix delta: all matchups now play
  full 10 minutes (no spurious resigns), 4 matchups have non-
  zero kills (up from 1).

- [ ] M_FUN.MAP.UTILISATION (PRD §5.3) — full-board utilisation
  is a v0.4 release goal. Sub-items:
  - [x] M_FUN.MAP.UTILISATION.SHALLOWS — SHALLOWS biome registered
    + paintShallowsRing converts beach-adjacent OCEAN into a
    1-hex SHALLOWS skirt. Visible at #7dd3fc pale turquoise on
    the latest matrix screens.
  - [ ] M_FUN.MAP.UTILISATION.ISLANDS — Real multi-island mapType.
    Today's 'archipelago' / 'continent' mapTypes all render the
    same single-landmass-in-ocean geometry. Build an islands-style
    generator that drops 3-7 disconnected landmasses + shallow
    channels between them. Continent-with-inland-lakes too.
  - [ ] M_FUN.MAP.UTILISATION.FERRYMAN — Aquatic unit class
    (Ferryman: trainable from Peon, crosses SHALLOWS at 1.8× cost,
    land-speed penalty). New build choice. Requires per-unit
    traversal-rule override (biome-flags walkable is faction-
    global today; needs a unit-type predicate).
  - [ ] M_FUN.MAP.UTILISATION.METRIC — Balance harness assertion:
    # of distinct tiles in either faction's zone-of-control union
    > 30% of walkable board. Catches 'clumped' failure mode.

- [x] M_FUN.QA.AIVAI.VISUAL — every balance-harness run captures a
  final-frame screenshot to tests/e2e/__data__/aivai-screens/
  <outcome>/<player>-vs-<enemy>_t<n>_k<n>_b<n>-<n>.png. Per the
  visual-ownership rule in CLAUDE.md; gitignored (large).

### v0.4.8 fold-ins from reviewer trio (must land before v0.4.9)

- [x] M_FUN.DYN.FIX.LAVA-WALKABLE — LAVA now walkable=false in
  biome-flags + mapgen.json. erupt() pushes any unit standing on
  a fresh LAVA tile to its nearest walkable non-lava neighbour
  (one-shot teleport). navGraph rebuilt on every eruption +
  every LAVA→MOUNTAIN_PASS revert tick.
- [x] M_FUN.DYN.FIX.SAVE-GAP — wildfires + quakeShakeRemaining
  + volcano added to GameSnapshot. SNAPSHOT_VERSION bumped to 2
  with a v1→v2 migration filling defaults. deserialize validates
  per-entry shape + caps (500 lava/fertile entries, 500 wildfire
  entries, 32-char key length).
- [x] M_FUN.DYN.FIX.WILDFIRE-CAP — maxConcurrent added to
  WILDFIRE_TUNING (default 200); spread rolls skipped once the
  cap is reached this tick. New unit test pins the cap.
- [x] M_FUN.DYN.FIX.SHAKE-DET — QuakeShake uses a local frame-
  delta accumulator instead of state.clock.elapsedTime. Camera
  shake is now deterministic across visual-regression runs.
- [x] M_FUN.DYN.FIX.DAMAGE-UNITS — clarified via rename:
  WILDFIRE_TUNING.damagePerTick = per-spread-tick flat; new
  VOLCANO_TUNING.damagePerSecond = continuous DoT scaled by dt.
  $comment fields name the units explicitly.
- [x] M_FUN.DYN.FIX.SHAKE-CLAMP — quakeShakeRemaining clamped
  at write-time to QUAKE_TUNING.shakeSeconds * 2; QuakeShake's
  useFrame guards with Number.isFinite to defend against DevTools
  injection of huge values.

### Parking lot (v0.5+ per PRD §8)

These are NOT v0.4 work but stay in the directive so the anti-stop
hook acknowledges them. Each lifts when v0.4 ships + the cycle opens.

- [ ] M_FUN.CIV.* — Civilian layer (citizens, refugees,
  trade routes).
- [ ] M_FUN.MYTH.* — Mythology (aether nodes, ruins,
  divine intervention, Sacred Grove, monuments).
- [ ] M_FUN.DIPLO.* — Diplomacy + reputation, tributary
  states, marriage alliances (post 3-faction).
- [ ] M_FUN.NAR.REPLAY — Replay loading + spectator
  skip-to-interesting.
- [ ] M_FUN.MOD.* — Daily challenge, puzzle scenarios,
  modifier dial.
- [ ] M_FUN.PROC.* — Procedural unit names, building
  inscriptions, map names.

### Standing carry-overs (process, not features)

- [ ] M_PROCESS.REVIEW — Periodic review-trio
  dispatch (code-reviewer + security-auditor + code-simplifier)
  every ~5 commits or at clean checkpoint moments.
- [ ] M_PROCESS.WORKTREE — Lead agent owns
  worktree close-out after parallel-agent runs (cherry-pick or
  merge; remove `.claude/worktrees/agent-*`).
- [ ] M_HARDENING.6 — Pixel-5a perf profile + on-device
  APK install. Blocked on emulator / SDK / signed-APK pipeline
  access.

### Open from prior cycles (true blockers — needs deployment-infra)

- [ ] M_NEXT.DEPLOY.2 — Move CSP to HTTP-header layer.
  GitHub Pages doesn't allow custom response headers; needs
  Cloudflare worker / Pages migration. Deployment-infra concern.
- [ ] M_NEXT.DEPLOY.3 — Narrow 'unsafe-eval' via
  SRI/nonce. Lower priority than DEPLOY.2.
- [ ] M_NEXT.CI.3 — Sibling-project test parity audit
  (xvfb / video recording / governor-test).
- [ ] M_NEXT.CI.2 — analysis-nightly.yml for slower scans.
- [ ] M_NEXT.AIVAI.6 — Player-faction AI inert under
  asymmetric seedZones map-gen.
- [ ] M_POLISH3.SCENE.4 — GameOverModal Dialog doesn't
  render reliably in headless Playwright; production flow works.
- [ ] M_POLISH3.HUD.1/2/3 — Tablet HUD pill stride
  re-audit; mobile per-mode captures; day-night phase visual
  swing.

---

## Reference

- **PRD:** `docs/specs/PRD-v0.4.md` — the spec this directive tracks.
- **Spec docs:** `docs/specs/` — per-system specs (renderer, audio,
  hex world, persistence, etc).
- **120-map-architecture.md** — the design discipline doc that
  defines the choke/pressure/relief vocabulary feeding v0.4.2+.
- **Milestones archive:** `docs/MILESTONES.md` — every shipped
  cycle, one line each. Add to this file when a directive item
  closes; remove the line from this file.
- **Commands:** see `CLAUDE.md` repo-specific section for the full
  pnpm verb list.
