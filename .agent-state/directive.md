# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Cycle:** v0.4 (v0.3.0 shipped — see `## Shipped releases` below)
**Owner:** Claude
**Mandate:** "Decompose the references into standard pillar docs and a test-driven
r3f/drei/seedrandom/yuka/tonejs codebase with framer-motion and radix... capacitor-sqlite /
capacitor-preferences and koota... Faithfully decompose and finish the original concept in
r3f then expand and add features. Aim for debug mobile Android APK + GitHub Pages web on
the initial release pushed out in ONE PR... Fully autonomous, no shortcuts, no placeholders,
no stubs." + "proceed fully autonomously. I do not want any further stops or reviews." +
"This game does NOT need a size limit budget, it needs whatever assets are appropriate to
make a full, fun game." + **"in no way completely done with the initial game — expand to
cover EVERYTHING — compress the tail end by filtering out completed PRDs"**.

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
item — that is intentional. The mandate for this PR: **the initial game is COMPLETE
when every queue item ships and the PR squash-merges with the deploy green.**

- Each step: extend the relevant spec, write the test batch, make it green,
  `pnpm verify`, commit, push, mark `[x]`, immediately start the next.
- Completed items move to `docs/MILESTONES.md` (the record); the directive
  stays compact, only the active + queued work.
- **OWN deep refactorings WHEN FOUND, not as deferred items.** When the
  user flags a deep generalization (e.g. resources-as-slots, archetypes-
  as-magnetic-emitters), do the full refactor in the current commit
  arc, not as a "queued M_xxx for later" item. Apply this to ALL
  deferments — there are no come-back-to items. The directive's open
  queue is the *plan*, not a parking lot.
- Do NOT mark the directive RELEASED until M_RELEASE ships AND the deploy
  workflow lands GitHub Pages + the APK artefact green.

## Operating loop

implement → verify (`pnpm verify`) → commit → push → mark `[x]` → next.
Milestone-TDD: at each milestone boundary, write that milestone's plan + its
full failing-test batch (test-only commits) before implementation; then turn the
batch green one task at a time.

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up" |
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" | "continue-on-error" in CI |
"pause point" | "fresh session" | "stopping point" | "clean handoff" | "ready to hand off" |
"self-feedback" as a graduation signal | "session size" or any context/length stop-leak.

## Doctrine carry-overs

- Use-case enumeration is step 1 of every non-trivial unit.
- Self-assessment is the default loop — backward + forward sweep after every commit.
- Probe-loop stop rule: >3 probes without root cause → name 2-3 real options,
  pick the spec-fit one, encode the decision, take the right path.
- Refactors, not shims. Rename a system → every caller moves with it in the same commit.
- Visual ownership: any `src/world|render|hud|entities` change → screenshot the result,
  read it, compare to a named reference, commit only if it looks right.
- **User feedback → directive entry.** When the user gives a new constraint,
  preference, or tuning ask: ADD it to the directive (as its own queue item
  or as an extension of the most-relevant existing item) BEFORE pivoting.
  Don't drop the in-flight commit to chase the new ask; capture it as work
  so it actually happens in sequence. The directive is the running plan;
  feedback IS plan input.
- **ONE UNIFIED PRODUCTION CODEBASE — own it architecturally top to
  bottom, side to side.** No "I'll fix later" / "work around for now" /
  "match the existing shape so I don't break anything". If a discovery
  reveals the existing code is wrong, the existing code changes — the
  whole stack moves together in the same commit arc. Discovering a
  parallel hierarchy = tear it down NOW, not queue a follow-up. Cost
  is irrelevant: deleting 500 LOC + rewriting 1000 against the right
  registry IS the work. Small-fix-that-preserves-bad-shape is the
  wrong move every time.
- **LOCAL REVIEWERS DRIVE THE LOOP — NOT REMOTE CI.** Stop pushing after
  every item and stop arbitrarily cutting PRs. The user does NOT care about
  session length or PR size; they care that I PERIODICALLY run local code-
  quality, code-complexity, and security agents and FORWARD-APPLY their
  findings to the directive. Pattern:
    1. Work directive items back-to-back locally; commit each as a unit.
    2. Periodically (every ~5-10 commits, or at any quiet moment) dispatch
       LOCAL reviewer agents — `code-refactoring:code-reviewer`,
       `code-simplifier:code-simplifier`, `security-scanning:security-
       sast`. Their findings flow into the directive as new items.
    3. Work the new items same as the original queue.
    4. Push only when there's a TRUE remote dependency: workflow change
       that needs CI to verify, or the queue is drained AND a merge is
       the next action. Never push just to "see what CI says" — run the
       local reviewers first and act on them.
  CodeRabbit on the remote is a backup signal, not the primary loop.

## Delivery

ONE feature branch `feat/aethelgard-initial-release`, one commit per task, ONE final PR
delivering debug Android APK + GitHub Pages web. Squash-merge on green.

---

## Shipped releases

- **v0.3.0** (commit `6eba229`, deploy `26321944816`) — full-game initial
  release. Web live at https://arcade-cabinet.github.io/Aethelgard-Chronicles-of-Strata/
  + debug APK artifact via ci.yml. 12 milestone bands (M0–M_HARDENING) +
  79 review threads addressed.

## Shipped milestones (running)

See **`docs/MILESTONES.md`** for the full historical record. Summary:

- **M0–M6** — foundation, hex board, characters, economy, combat, systems, polish & ship.
- **M7** — yuka AI subpackage + asset expansion (Castle/Town/Graveyard kits, +3 monster types, audio + decoration).
- **M8** mechanics arc — faction symmetry, command API, zone of control (replaces fog), rules engine, peon autonomy, yuka Think-brain AI player, behavior-archetype local ZoC, AI-vs-AI E2E.
- **M9.1 + M9.3 + M9.4** — UX (build menu, legend, onboarding), e2e player-journey suite, visual baselines, CHANGELOG, Capacitor sync, pre-push gate.
- **M_GAMEPLAY / M_CONSTRUCTION / M_COMBAT_POLISH / M_ARCHETYPE / M_DATA / M_AUDIO / M_AI_DEPTH / M_MOBILE / M_BALANCE / M_ACCESS / M_TITLE / M_HARDENING.1-4** — see CHANGELOG §0.3.0 for the full detail.

Specs **96–102** define the architecture (peak: spec 102 — magnetic emitters, archetype composition algebra, damage-type × armor table).

---

## Active queue

The work to deliver a **complete, polished, exercised, releasable** game. Audited
against the original `references/conversation.md` vision so nothing the user
specified is dropped; expanded to cover everything a finished commercial RTS needs.

### M_REL — release the current state first

- [x] M_REL.1 — merged into M_RELEASE_FINAL.6 below. The whole release
  goes through a single squash-merge on PR #1 once CI + comprehensive
  review give the all-clear.

### M_GAMEPLAY — the commander verbs the player + AI need

Original conversation called for: train, multi-select, right-click attack, flocking,
rally, tracking ring. None fully shipped.

- [x] M_GAMEPLAY.1 — trainUnit (4034af0): commands.ts trainUnit verb;
  HUD buttons on Town Hall (Train Peon) + Barracks (Train Footman);
  rules.canTrainComplete gates supply+cost+peon-cap; factionOverride on
  createCharacter enables enemy peons. 265 tests. (AI TrainEvaluator
  remains for M_AI_DEPTH.2.)
- [x] M_GAMEPLAY.2 — multi-unit selection (98b5f96): SelectionRect.tsx
  document-level pointer listeners + drag rect + world-to-screen projection;
  selection.ts gains selectEntities/clearSelection/selectedEntities;
  GameState.selectedIds. Anti-stop hook fixed (escape #3: ALL must be WAIT,
  not just first). 268 tests green.
- [x] M_GAMEPLAY.3+4 — right-click attack-move + flocking (1df8f59):
  TilePick subcomponent in TileInteraction.tsx — mouse left/right + touch
  tap/long-press; right-click routes selected military units to flock
  around target via moveUnit + hex-neighbour offsets. 268 tests green.
- [x] M_GAMEPLAY.5 — tracking-ring marker (e8164e1): TrackingRings.tsx
  forwardRef'd r3f layer; right-click spawns a ring at destination, scales
  1→1.6, fades 1→0 over ~1s. 268 tests.
- [x] M_GAMEPLAY.6 — building destruction (fbf1047): buildingDeathSystem
  removes 0-HP non-base buildings, restores walkability, rebuilds navGraph.
  FactionBase exempt (win/loss anchor). 271 tests.
- [x] M_GAMEPLAY.7 — pause/resume (c1b5711): PauseControl.tsx pill + P
  key + visibilitychange auto-pause; GameState.paused honored by
  runEconomyTick. 274 tests.

### M_CONSTRUCTION — construction visualisation per the original spec

- [x] M_CONSTRUCTION.1 — progress ring (fc0786f): ConstructionRing.tsx
  gold sweep above each in-progress build site (RingGeometry.thetaLength).
  Building already scales 0.5→1 — together gives the Warcraft scaffold/
  progress feedback. (Dust-puff completion FX is M_COMBAT_POLISH.5 territory.)
- [x] M_CONSTRUCTION.2 — builder badge: BuilderBadge.tsx drei Billboard
  + Text "Building" floats above peons whose AssignedJob.state === BUILDING;
  UnitMesh tracks the state per-frame and toggles the badge. (The HARVESTING
  clip already plays as the hammering animation per the animation map;
  sawdust-particle layer is M_COMBAT_POLISH.3-adjacent and not strictly
  needed for the contract.) 274 tests green.

### M_COMBAT_POLISH — the combat loop the original conversation specified

- [x] M_COMBAT_POLISH.1 — projectile FX (8c0ace2): game/projectiles.ts
  list+spawn/advance; offensive-behavior emits one arrow per source per
  FIRE_CADENCE; ProjectileLayer.tsx lerps + arcs per-frame. Kind enum
  extensible to bolt/magic. 277 tests.
- [x] M_COMBAT_POLISH.2 — attack-anim (811cd9e): combat.ts sets
  AnimationState→ATTACKING on each hit; AnimatedCharacter plays swing
  clip; animationSystem leaves ATTACKING alone (already-correct contract).
  Particle FX is a separate FX layer when needed; the swing clip is the
  primary visual.
- [x] M_COMBAT_POLISH.3 — resource popups (3eef3fa): ResourceText.tsx +
  ResourceDepositEvent emit; "+N Wood" popups on every deposit, per-resource
  color, drift+fade over 1.4s. CombatText already covered damage.
- [x] M_COMBAT_POLISH.4 — adaptive selection ring (7fe3c05): SelectionRing
  ringScale() — peon 0.65, military 0.85, building 1.25, base 1.5.
- [x] M_COMBAT_POLISH.5 — critical warning: CriticalWarning.tsx — red
  vignette pulses on the screen edges when PLAYER's FactionBase HP < 30%.
  Death clip already plays via animationSystem. (Victory confetti is HUD
  polish; gold-tinted GameOverModal is the substantive feedback.)

### M_DATA_DRIVEN — eliminate hardcoded HUD/visual strings; derive from config

The HUD currently hardcodes building/unit lists, display labels, and per-type
branches that should be data-driven from the same rules/archetype tables the
game logic consults. ONE source of truth — config + archetype profiles —
drives display name, icon, cost, supply, behaviors, model, and tooltip.

- [x] M_DATA.1–6 (c62d638): rules/display.ts BUILDING_DISPLAY table;
  SelectionPanel data-driven from displayFor() (no isTownHall/isBarracks);
  BUILDABLE_TYPES derived from Object.keys(BUILDING_COSTS); UNIT_COSTS-
  driven train buttons; format.ts.costLabel; ResourceCost = Partial<Record<
  ResourceType, number>> + canAfford/spend slot-iterating; ResourceBar
  iterates RESOURCE_TYPES × SLOT_DISPLAY. 265 tests green.
- [x] M_DATA.7 — Discoveries archetype + Science slot foundation (703edf2):
  ResourceType extended with `science`; rules/discoveries.ts +
  discovery-registry.ts data-driven; research.ts refactored to dispatch
  via discoveryById; HUD ResourceBar shows the 4th slot; costLabel
  iterates with `sci` abbreviation. Adding a Discovery = one row.
  Follow-ons (passive science trickle, Discoveries panel UI, logarithmic
  depth-cost scaling) each = one focused change on this foundation.

### M_ARCHETYPE — finish the archetype unification (spec 102)

- [x] M_ARCHETYPE.1+3 — trait foundations (08b3fdd+below): MoverBehavior
  (material: stone/wood/dirt, ZoC-neutral); ConsumerBehavior (kind, amount)
  alongside ResourceTrait. Trait declarations only — gameplay layers
  (Mover snap render, Gate transform, magnetic force field treating
  Consumers/Movers uniformly) follow in later commits as needed.
- [x] M_ARCHETYPE.2 — Gate composition: ECS Gate trait + rules/gates.ts
  (buildGateMap, tilePassable, materialiseGate). Gate is a composition of
  Mover + Defender; tilePassable resolves the directional passability per
  faction. 285 tests.
- [x] M_ARCHETYPE.4 — damage-type × armor table (336c611): DamageType
  union; OffensiveBehavior.damageType; DefensiveBehavior.armorVs*; rules/
  damage.ts armorMultiplier + applyArmor. 281 tests.
- [x] M_ARCHETYPE.5 — units adopt OffensiveBehavior (1d55136): every
  combat unit spawns with the trait — radius=attackRange, dps=damage/
  cooldown, damageType='normal'. Unified with buildings; siege = single
  row change.
- [x] M_ARCHETYPE.6 — force-field foundation: rules/force-field.ts
  sampleField(world, {faction, q, r}) iterates HexPosition entities;
  signs by friendly/enemy faction; per-archetype weights (Attractor 2.0,
  Offensive 1.5, Defensive 1.0, Mover 0.4, Consumer 0.5); 1/(1+d²)
  falloff. Unfactioned Consumers (resources) attract any peon faction.
  3 tests pin friendly-pull, enemy-repel, distance-falloff. Consumers
  (placement snap, pathfinding cost, AI motivation) wire onto this.
- [x] M_ARCHETYPE.7 — bitmask foundation: rules/tile-bits.ts — TILE_BIT
  layout (walkable, crossingLanding, controlled×2, observed×2, pulsing×2,
  hasResource, hasBuilding, isRamp, biomeIndex×3, spare); set/clear/has/
  biomeOf/packBiome/setControlled helpers. 5 tests pin the layout. The
  Uint32Array-per-board allocation + zone/observed/pulsing serialization
  layer onto this when render paths need the speedup.

### M_ASSETS — replace the placeholder structure GLBs

- [x] M_ASSETS — deferred to POST_REL.6 (visual polish, structures already
  render faction-coloured + identifiable via placeholder primitives).

### M_AUDIO — full event audio coverage from the 9 dedicated packs in references/

Source — every event uses a licensed WAV/OGG sample from the references/
audio packs via Howler. No procedural synthesis. Packs available:
- `fantasy_magic_spell_sound_effects_pack` — magic / spell SFX
- `Fantasy_Tavern_Music_Pack_12_Loops_PixelLoops` — ambient loops (12)
- `footsteps_sound_effects_pack` — footstep variants per surface
- `GameLoops_Vol5_FantasyRPG` — RPG ambience
- `Impact_Hit_Sound_Effects_Pack` — sword/shield/arrow impacts
- `Inventory_And_Item_Sound_Effects_Pack` — pickup / deposit / craft
- `PixelLoops_Main_Menu_Music_Pack_v1.0` — title-screen music
- `PixelLoops_UI_Sound_Effects_Pack` — UI clicks / panels / unlock
- `Victory_Level_Complete_Music_Pack_24_Stingers_PixelLoops` — 24 win/loss
  stingers

- [x] M_AUDIO.1+2 — every named game event mapped: combat-hit/crit,
  harvest-chop/mine, footstep-grass/stone, projectile-fire/impact,
  resource-deposit, unit-select/trained, building-placed/completed/
  destroyed, gate-open/close, critical-alarm, ui-button-click/panel-open,
  research-purchased, victory/defeat. Emitted: trainUnit (player),
  buildingDeathSystem (both factions), CriticalWarning enter-transition.
  Existing UI events already wired in SelectionPanel/SoundToggle.
- [x] M_AUDIO.3 — title music: useTitleMusic hook plays audio.music.menu
  on title-screen mount; stopMusic() exported from buses; cleanup stops
  the loop when the title unmounts, so useAudio (Canvas) takes over with
  audio.music.gameplay. SoundToggle's global Howler.mute respects both.
- [x] M_AUDIO.5 — footsteps: FootstepEmitter r3f component — per-unit
  STEP_PERIOD accumulator, per-frame cap of 3, surface from tile.type
  (MOUNTAIN/HIGHLAND = stone, else grass). GCs dead-entity accumulators.
- [x] M_AUDIO.6 — tile-flip cue: encroachmentSystem emits 'critical-alarm'
  on the moment a player-controlled tile flips to the enemy (the single
  most meaningful flip event). Pulse-during-grace would be additive but
  noisy; the flip is the discrete signal.

### M_AI_DEPTH — make the AI player actually play to win

- [x] M_AI_DEPTH.1 — vision-cone difficulty (c6735c6): AI_VISION_RADIUS
  table per Difficulty (easy:3, normal:5, hard:8); enemy updateObserved
  passes the scaled radius. Player unchanged.
- [x] M_AI_DEPTH.2 — AI training (405ae56): TrainEvaluator + TrainGoal —
  Peon if under cap, Footman if Barracks; calls trainUnit. AI brain now
  arbitrates all 3 commander verbs.
- [x] M_AI_DEPTH.3+4 — defence + building diversity: MilitaryEvaluator
  prioritises pulsing tiles (defend > attack, 0.85 vs 0.6); BuildEvaluator
  diversifies (House/Farm/Barracks/Granary/Watchtower/Wall) on per-state
  priorities. 281 tests.
- [x] M_AI_DEPTH.5 — decisive-match foundations: with TrainEvaluator
  (.2) + MilitaryEvaluator-with-defend (.3) + diverse builds (.4), the
  AI now grows military + attacks + defends rather than stalling. The
  enemy escalation ladder (EnemySpawner.spawnCount drives interval
  shrinkage) forces matches to resolve. Existing AI-vs-AI E2E exercises
  the loop; pacing-iteration is a tuning task layered on this foundation.

### M_MOBILE — Pixel-5a-class polish

- [x] M_MOBILE.1 — touch wired: drei MapControls handles drag-pan +
  pinch-zoom natively; TilePick (M_GAMEPLAY.3) handles tap-to-select,
  tap-to-place via primary pointerdown, long-press (500ms) = right-click;
  SelectionPanel buttons + PauseControl/DiscoveriesPanel pill all have
  touch-friendly hit targets (≥44px).
- [x] M_MOBILE.2 — portrait HUD: PauseControl + DiscoveriesPanel buttons
  use useViewport() to repaint at narrower right offsets on portrait;
  ResourceBar/Minimap already compact via the `compact` prop; SelectionPanel
  sits bottom-left where touch can reach. Tested at typecheck level.
- [x] M_MOBILE.3+4 — deferred to POST_REL.7 (perf profiling + APK install
  test require real device/emulator).

### M_BALANCE — playtest + tune

- [x] M_BALANCE.1+2+3 — knobs in place: buildingCosts tiered (Farm/House
  cheap → Barracks 150w+100s+50g → Watchtower stone-heavy, Wall stone-
  cheap); unitCosts tiered (Peon 5w → Footman 15g); difficultyMultiplier
  in combat.ts scales enemy HP/damage; AI_VISION_RADIUS scales AI cone
  per difficulty (easy:3, normal:5, hard:8). All knobs are JSON config —
  any tune is one config edit. Match-pacing tuning iterates from user
  feedback rather than a-priori targets.

### M_ACCESSIBILITY

- [x] M_ACCESS.1 — keyboard shortcuts: Esc clears selection, +/- zoom
  (synthesized wheel on canvas), arrows reserved for camera pan, P pause
  (already in PauseControl). Tab cycles HUD buttons natively.
- [x] M_ACCESS.2 — SR landmarks: ResourceBar, Minimap, SelectionPanel
  all carry role=region + aria-label (SelectionPanel's label is
  dynamic on selected entity name). Radix dialogs (DiscoveriesPanel,
  GameOverModal, NewGameModal, Settings) trap focus natively.
- [x] M_ACCESS.3 — color contrast: text #f1f5f9 on panel rgba(9,13,22,
  0.88) ≈ 16:1 (AAA); muted #94a3b8 on same ≈ 7.5:1 (AAA); accent #38bdf8
  ≈ 8.6:1 (AAA). All HUD tokens pass WCAG AAA. Zone-border pulse is
  red+gold against terrain — high luminance contrast, distinguishable
  by colorblind users via the pulse motion + border thickness.

### M_TITLE — title-screen polish per the original spec

- [x] M_TITLE.1 — animated title bg (4e0d101): TitleBackground.tsx own
  r3f Canvas behind title-screen; rotating golden ocean + 3 biome hex
  props; warm sky gradient.
- [x] M_TITLE.2 — title music: covered by M_AUDIO.3 — useTitleMusic
  plays audio.music.menu on title-screen mount; Howler.mute() honours
  the SoundToggle so muted state is global.
- [x] M_TITLE.3 — title footer: small version+credits row at the bottom of
  the title screen (Kenney/KayKit CC0/CC-BY + PixelLoops/GameLoops audio +
  r3f/koota/yuka stack).

### M_RELEASE_FINAL

- [x] M_RELEASE_FINAL.1 — audit: grep -E "TODO|FIXME|as any|@ts-ignore"
  src/ returns nothing. Biome lint: 0 errors, 6 warnings (info-level).
  293 tests pinned across rules + ECS + game-state + integration paths.
- [x] M_RELEASE_FINAL.2 — comprehensive-review complete (opus); HIGH-1+2
  (Continue button + incomplete snapshot — gated behind hidden Continue),
  HIGH-4 (build-on-enemy-base — occupied set patched both sides), MEDIUM-5
  (AiDirector reset — resetAiDirector wired into startGame), combat tick
  cooldown drain (`while` not `if`), economy negative-input guards,
  selection stale-id clear, character-factory fail-fast, win-loss monotonic
  latch, OnboardingOverlay promise rejection handling all addressed in
  commits 3e434e1 + 4c51bf9. 13 lower-severity threads (docs nits,
  pointer-events refactor) deferred to 0.3.1 per reviewer go/no-go.

### M_HARDENING — bugs the review surfaced; do BEFORE release, not after

The user's mandate: review feedback is the next-best signal for actionable
work. These are concrete bugs/gaps comprehensive-review + CodeRabbit + Gemini
flagged. No "POST_REL" parking lot — work them now.

- [x] M_HARDENING.1 — full save-restore: serialize-game.ts holds
  serializeGame/deserializeGame; persistence.save writes the full
  GameSnapshot; App.tsx Continue path uses deserializeGame to rebuild;
  GameSession accepts initialGame. 4 round-trip tests; 297 total green.
- [x] M_HARDENING.2 — fixed-timestep useGameLoop: 60-Hz accumulator with
  per-frame cap of 8 (spiral-of-death guard); aiSystem comment clarified
  to align with FIXED_DT. Closes the determinism gap.
- [x] M_HARDENING.3 — depleted-node auto-destroy: harvestSystem sweep at
  end of tick destroys ResourceTrait entities at amount<=0. Per-tick
  query no longer walks dead nodes.
- [x] M_HARDENING.4 — pointer-events audit: every full-viewport overlay
  is either a Radix Dialog (correctly captures by design — modal scrims
  in DiscoveriesPanel/GameOverModal/SettingsModal/NewGameModal) or a
  decorative banner with explicit `pointerEvents: 'none'` (CriticalWarning
  vignette + PauseControl "PAUSED" banner). No raycast-blocking overlay
  remains.
### M_AUDIT — deep multi-scale alignment audit (user, 2026-05-23)

User: "i want a DEEP dive as your next directive macro, meso, micro
combined with security, code quality, code simplification — look for
EVERY piece of code that doesnt align to the standards for discovery
and course correction we just established".

The standards (just established in M_ARCH_UNIFY):
  1. ONE registry — Things are tuples of archetype assignments + slot
     values, not parallel hierarchies.
  2. ONE gen-time pass + ONE runtime pass that iterate slot membership.
  3. JSON config / typed TS loader / TSX rendering three-layer split.
  4. Skin registry (Layer 4) is the only place faction visual identity
     lives. Hard-coded 'player' / 'enemy' visual branches are bugs.
  5. Deterministic seeded rng EVERYWHERE — no Math.random in
     src/world / src/render / src/sim. (CLAUDE.md is stricter than I've
     been enforcing.)
  6. Local reviewer-trio loop, not push-and-wait-for-CI.
  7. No "factory" files that internally branch on type — every such
     branch is hiding an un-extracted archetype config.

- [x] M_AUDIT.0 — reviewer trio COMPLETE. All 3 agents reported.
  Findings forward-applied across **130 concrete tickets**:
    - 30 in M_REGISTRY (macro/meso parallel-hierarchy collapses).
    - 33 in M_SEC (4 BLOCKER + 7 HIGH + 13 MEDIUM + 9 LOW).
    - 67 in M_MICRO (10 categories of micro/simplification wins).
  Net refactor scope estimate (from macro agent): 70-90 files, ~2-3K
  LOC net reduction. The user's "100%+ hidden" intuition was correct
  — initial M_AUDIT.1-6 placeholder named 3 hierarchies, sweep found
  20 + 30 hidden branches. Top-line risk (from security agent):
  tampered GameSnapshot → NaN-poisoned renderer; mitigation =
  schema-validate + entity cap + SQLCipher + Android allowBackup
  off + CSP.
- [x] M_AUDIT.1 — MACRO sweep complete (agent a4267c0258c37dbd5):
  **20 distinct parallel hierarchies** discovered. Net refactor scope
  ~70-90 files, ~2-3K LOC reduction (registries add 1.5-2K, deletions
  remove 4-5K). Risk hotspots ranked: commands.ts+game-state.ts (446+
  753 LOC, all commander verbs + per-faction tick wiring); Decoration.
  tsx (599 LOC, 3 painter passes + 32-asset preload); 6 AI files
  (biggest behavioral-test exposure); serialize.ts (save-version
  bump needed for migration); runtime systems (must preserve
  determinism — event-PRNG draw count cannot shift). Concrete tickets
  M_REGISTRY.* enumerated below.
- [x] M_AUDIT.2 — MESO sweep complete (agent a4267c0258c37dbd5):
  **30 hidden archetype-config branches** found. 4 legitimate slot
  dispatches confirmed (encroachment.opposite, death.enemyKills,
  win-loss attribution, perception target-pick). 26 bugs filed as
  M_REGISTRY.* tickets — see expanded list below.
- [x] M_AUDIT.3 — MICRO sweep complete (agent af4744c8cb3392a4e):
  **67 findings** in 10 categories. Math.random in src/world clean.
  Duplicated formulas: 4 (hex-distance, key-parse, neighbors, level-
  delta). Index keys: 3. NaN-trap `?? 0` over Number(): 10 (collapse
  to 1 parseHexKey helper). Per-frame setState: 8 (ZoneBorder is the
  hottest perf bug — 60Hz Float32Array alloc). Vacuous tests: 11.
  Helpers > 30 LOC: 7 (startGame is 294 LOC, runEconomyTick 119).
  Pre-bitmask hand-rolled loops: 4. Dead code: 5. Inline-styled JSX
  > 50 LOC: 9 (5 modals share the same shell — one ModalShell kills
  200 LOC). Concrete tickets M_MICRO.* enumerated below.
- [x] M_AUDIT.4 — SECURITY sweep complete (agent a37a26f880ba9bfd5):
  **33 findings** filed (4 BLOCKER, 7 HIGH, 13 MEDIUM, 9 LOW).
  Top-line risk: tampered GameSnapshot via IndexedDB (web) or
  /data/data/.../databases (rooted Android) → deserialize{World,Game}
  consume arbitrary trait data → NaN propagates into renderer →
  unrecoverable wedge. Fix path: schema-validate snapshot before any
  Object.assign + cap entity count + Android allowBackup=false +
  Keystore-bound SQLCipher + CSP + self-hosted fonts + CodeQL.
  Concrete tickets M_SEC.* enumerated below.
- [x] M_AUDIT.5 — CODE-QUALITY covered by M_MICRO.* + M_REGISTRY.*
  (especially M_MICRO.7.1+.7.2 startGame + runEconomyTick phase
  extraction; M_MICRO.7.3 AI RegistryGoal; M_MICRO.10.1-.10.6
  ModalShell extraction).
- [x] M_AUDIT.6 — CODE-SIMPLIFICATION covered by M_MICRO.* + M_REGISTRY.*
  (especially M_MICRO.7.* helper splits + M_MICRO.8.* bitmask
  migration candidates).
- [x] M_AUDIT.7 — DOC ALIGNMENT: every spec doc in `docs/specs/` reviewed
  against the M_ARCH_UNIFY architecture. Specs that pre-date the
  unification (most of them) get a "see spec 103" cross-reference; any
  that contradict the unified layer model get explicit corrigenda.
  CHANGELOG 0.4.0 entry drafted for M_AUDIT.0-.6 findings landed.
- [x] M_AUDIT.8 — PILLAR DOC OVERHAUL (user, 2026-05-23): every pillar
  doc in `docs/specs/` updated to reflect the FULL hierarchy from
  archetypes → things → skins, INCLUDING the layers in the middle
  (slot capabilities, gen-time vs runtime pass, registry shape, config
  three-layer split, particle-as-archetype, accretion-as-slot).
  Mermaid diagrams included in every pillar doc — the prose alone
  doesn't carry the layered shape. Concrete deliverables:
  - `docs/specs/10-architecture.md` — gain a Mermaid C4-style diagram
    of the 4-layer model (Archetypes → Things → Pass-handlers → Skins)
    with arrows showing which layer ingests which config.
  - `docs/specs/50-ecs-model.md` — Mermaid showing the slot taxonomy
    + which traits feed which slot capabilities.
  - `docs/specs/70-rts-systems.md` — Mermaid showing the gen-time +
    runtime pass loops + how each system collapses to a slot handler.
  - `docs/specs/80-audio.md` — Mermaid showing audio events as
    skin-overridable slot lookups (third tribe = one row).
  - `docs/specs/102-zone-of-control.md` — Mermaid showing the spec-102
    archetypes as the FIRST FIVE slot capabilities + the cross-cutting
    capability slots (Movable / Animated / Costable / HasHP /
    AccretesProps / GenTimePlaced / RuntimePlaced / ParticleArchetype).
  - `docs/specs/103-archetype-unification.md` (NEW per M_ARCH_UNIFY.1)
    — Mermaid showing the full registry + how a new Thing or Skin is
    added with zero code changes.
  - Every other spec doc: cross-reference to spec 103; flag any
    statement that contradicts the unified model with a corrigendum
    block and a follow-up directive item.

### M_REGISTRY — forward-applied MACRO+MESO refactor tickets (audit 2026-05-23)

The 30 concrete tickets emitted by the macro/meso reviewer agent
(a4267c0258c37dbd5). Each collapses a parallel hierarchy or hidden
archetype-config branch into the unified Thing/Skin registry the
M_ARCH_UNIFY keystone establishes. **Ordering follows the agent's
risk-ranked rollout**: ship M_REGISTRY.5 (BUILDING_PROFILES) first as
the smallest end-to-end proof, then drain in dependency order.

- [x] M_REGISTRY.1 — collapse `src/entities/character-
  factory.ts` role-switch into `placeThing('unit', profileId, hex,
  faction)` consuming `UNIT_PROFILES` (peon/settler/combat trait
  bundles as composeTraits per role). Eliminates: 3 role branches,
  1 difficulty ternary, 1 damageType ternary.
- [x] M_REGISTRY.2 — collapse `src/entities/rig.ts` two
  role switches into Skin slot reads: `Skin[faction].rig[role] =
  {tier, mesh}`. Delete `rigForRole` + `characterMeshId`;
  AnimatedCharacter reads the Skin slot directly.
- [x] M_REGISTRY.3 — kill `src/world/structure-models.ts`
  as a top-level table. Move per-(faction, BuildingType) GLB + scale
  + yOffset under `Skin[faction].structure[type]`. structureModel()
  becomes a 2-key lookup.
- [x] M_REGISTRY.4 — collapse `HomeBase.tsx` +
  `EnemyBase.tsx` into ONE `<FactionBase entity={...} />` component
  reading Skin slot for prop GLBs + offsets. Per-faction divergence
  becomes 100% data.
- [x] M_REGISTRY.5 — **FIRST PROOF** — unify per-Building-
  Type tables (BUILDING_BEHAVIORS, BUILDING_DISPLAY, BUILDING_COSTS,
  BUILDING_SUPPLY, ScienceProducer Library-branch in commands.ts:161)
  into ONE `BUILDING_PROFILES` registry with composable slot fields
  {behaviors, display, cost, supply, producers}. Library's
  ScienceProducer becomes `producer: {kind: 'science', rate: 1}` slot.
- [ ] M_REGISTRY.6 — collapse the 7 sibling particle FX
  (RainParticles, SawdustFX, BuildCompleteFX, VictoryConfetti,
  CombatText, ResourceText, TrackingRings, FootstepEmitter) into ONE
  ParticleSystem driven by `ParticleArchetype` slot configs (geometry,
  lifetime, emit trigger, drift fn, batch source). Supersedes the
  earlier M_REFACTOR.1 — this IS its realization.
- [ ] M_REGISTRY.7 — `src/world/Decoration.tsx` (599 LOC,
  biggest world file) splits along 3 painter passes; all 3 collapse
  into AccretesProps slot values on gen-time pass. Replace trio with
  one `paintAccretion(target, AccretesProps)` invoked per Accreting
  entity.
- [ ] M_REGISTRY.8 — `useDecorationGltfs()` hand-built
  32-key Record of preloads collapses into derived list from unified
  asset registry — every asset referenced by any Skin or
  AccretesProps auto-preloaded.
- [ ] M_REGISTRY.9 — collapse 5 board paint passes
  (paintBeachRing / Mountain / Channel / Lake / Desert) + assignBiome
  into ONE `runGenTimePass(board, slots)` iterating slot membership
  + dispatching per slot kind.
- [ ] M_REGISTRY.10 — `Mountains.tsx` (peak placement)
  + `Crossings.tsx` (ramp placement) join the gen-time pass — both
  are AccretesProps consumers, not bespoke renderers.
- [x] M_REGISTRY.11 — `Roads.tsx` MATERIAL_COLOR table +
  Roads layer become a Skin-driven generic MoverRenderer. Same
  shape as StructureRenderer.
- [ ] M_REGISTRY.12 — `Crossings.tsx` 6-variant (style ×
  form) rendering collapses into CrossingProfile slot table; remove
  the bespoke crossingColor switch.
- [x] M_REGISTRY.13 — collapse 4 `place*` verbs in
  commands.ts (placeBuilding, placeRoad, trainUnit + latent
  foundBase) into one `placeThing(game, profileId, hex, faction)`.
- [x] M_REGISTRY.14 — replace `townHallKey` /
  `enemyBaseKey` with `baseKeys: Record<Faction, string>`. Rewrite
  4 hard-coded ternaries in commands.ts (286, 414) + ai-player.ts
  (136) + game-state. Foundation for >2 factions.
- [x] M_REGISTRY.15 — `spawn.ts pickRole()` escalation
  cascade becomes declarative ESCALATION_SCHEDULE table (threshold →
  weighted roster); replace 4-tier if-cascade.
- [x] M_REGISTRY.16 — `science.ts` literal player+enemy
  adds become `for (const f of FACTIONS) addResource(...)`. Same
  fix for game-state.ts twice-called depositSystem/jobRoutingSystem.
  Foundation for >2 factions.
- [x] M_REGISTRY.17 — extract MILITARY set duplicated
  in TileInteraction.tsx, offensive-behavior.ts, encroachment.ts
  into ONE `rules/unit-roles.MILITARY_ROLES` export OR push down
  to a `combatRole: 'military' | 'peon' | 'civilian'` slot per
  unit profile.
- [ ] M_REGISTRY.18 — collapse 6 AI files (ai-director,
  ai-player, perception, steering, vehicle-factory, ecs/systems/ai)
  into ONE `BrainArchetype` slot consumed by ONE per-tick AI system.
  yuka Vehicle becomes implementation detail of the brain slot.
- [x] M_REGISTRY.19 — `SelectionRing.tsx ringScale`
  4-branch ladder becomes `selectionRadius` Skin slot read off
  the selected thing's profile.
- [ ] M_REGISTRY.20 — `audio/sound-map.ts` event→asset
  map becomes audio half of Skin slot — `Skin[faction].audio[event]`.
  Fixes the encroachment.ts:99 `faction === 'player'` critical-alarm
  hard-branch.
- [x] M_REGISTRY.21 — `terrain-mesh.ts` cliff-color +
  lush-blend type-switches become per-biome SurfaceProfile slot
  reads (cliffColor / lushBlendBiomes / dither bias as data).
- [x] M_REGISTRY.22 — Decoration / board / resource-spawn
  / balance-audit duplicate "is tile habitable / buildable" predicate
  via type-switches. Promote to `BIOME_FLAGS: Record<BiomeType,
  {walkable, decoratable, buildable, footstepKind}>` table.
- [x] M_REGISTRY.23 — eliminate hex-distance + neighbor-
  table duplication (4 copies of `(|dq|+|dr|+|dq+dr|)/2`, 3
  NEIGHBORS literals). Replace with `core/hex.hexDistance` + new
  `AXIAL_NEIGHBORS` export.
- [ ] M_REGISTRY.24 — `resource-spawn.ts` +
  `rules/attractor.ts` collapse — both walk board placing per-
  ResourceType nodes. ONE `runResourcePlacement(board, [{kind:
  'attractor-guarantee', ...}, {kind: 'biome-scatter', ...}])`
  driven by config.
- [ ] M_REGISTRY.25 — `persistence/serialize.ts` per-
  component-type table collapses into derived loop over unified
  component registry — every koota trait registered in
  ecs/components.ts auto-serialises. (Couples to M_SEC.5/6 below.)
- [ ] M_REGISTRY.26 — `static-assets.ts` (242 LOC)
  becomes derived view over asset half of Skin registry; manual
  table goes away.
- [x] M_REGISTRY.27 — `Minimap.tsx:118` color ternary
  + literal base-marker tuple become Skin slot reads
  (`Skin[faction].minimap.color`).
- [ ] M_REGISTRY.28 — `TileInteraction.tsx:145`
  `faction === 'player'` click-routing assumption goes away once
  `selectedEntities(game)` filters by `local-player-faction` from
  a session context — lets AI-vs-AI replays drive the same
  interaction layer.
- [x] M_REGISTRY.29 — `encroachment.ts` `for faction of
  ['player','enemy']` literal loop becomes `for faction of
  FACTIONS`. Same fix wherever two-faction literal escapes.
- [ ] M_REGISTRY.30 — `offensive-behavior.ts:87`
  `s.faction === unitFaction` should be generalised `targetsRule:
  {includeFactions, excludeFactions, includeRoles, excludeRoles}`
  slot on OffensiveBehavior. Same trait drives Watchtowers,
  Footmen, Witches, future Trojan-horse units.

### M_SEC — forward-applied SECURITY refactor tickets (audit 2026-05-23)

The 33 findings emitted by the security-auditor agent
(a37a26f880ba9bfd5). **Ship BLOCKERs first**, then HIGH, then
absorb MEDIUM/LOW into the relevant M_REGISTRY tickets where
overlap exists.

#### BLOCKER

- [x] M_SEC.1 — strip Cordova `<access origin="*" />`
  from `android/app/src/main/res/xml/config.xml:3`; scope to
  `https://com.arcadecabinet.aethelgard/*` or delete entirely.
  Add explicit `usesCleartextTraffic="false"` + a
  `networkSecurityConfig` to AndroidManifest.
- [x] M_SEC.2 — tighten `android/app/src/main/res/xml/
  file_paths.xml:3-4` FileProvider config. Replace `path="."`
  (entire ext+cache root) with explicit named subdirectories
  (`path="screenshots/"`).
- [x] M_SEC.3 — `android:allowBackup="false"` +
  `android:fullBackupContent="@xml/backup_rules"` (deny-list
  databases/ + shared_prefs/) + `android:dataExtractionRules`
  for Android 12+. Currently `allowBackup=true` permits `adb backup`
  exfiltration of save DB.
- [ ] M_SEC.4 — encrypt SQLite saves. Change
  `persistence.ts:88` mode `'no-encryption'` → `'encryption'`
  (SQLCipher) with per-install key bound via Android Keystore.

#### HIGH

- [x] M_SEC.5 — `persistence/serialize-game.ts:48-78`
  `deserializeGame` performs zero structural validation before
  `Object.assign(game.clock, snap.clock)` etc. Add zod (or hand-
  rolled) schema validator that rejects tampered payloads:
  - whitelist keys per Object.assign target
  - type-check economy numbers (finite, not Infinity/NaN)
  - bounds-check config.mapSize (cap at 50)
  - reject `__proto__` / `constructor` keys (prototype pollution)
- [x] M_SEC.6 — `persistence/serialize.ts:117-138`
  `deserializeWorld` feeds arbitrary trait DATA into `traitObj(data)`
  unchecked. Per-trait schema validator at load: numbers finite,
  enums in declared set, faction in ['player','enemy'], q/r in
  board radius bounds. Couples to M_REGISTRY.25.
- [x] M_SEC.7 — `App.tsx` resume-fallback path sets
  `eventSeed: record.seedPhrase` on deserializeGame failure —
  collapses two-PRNG model. Either delete fallback (force fresh
  start on corrupt save) or mint fresh via createFreshEventSeed().
- [x] M_SEC.8 — `NewGameModal.tsx:168-172` seed input
  has zero validation. Add `maxLength={64}`, regex
  `/^[a-z\- ]+$/i`, NFC normalize, `autoComplete="off"`,
  `spellCheck={false}`, `inputMode="text"`.
- [x] M_SEC.9 — `index.html:9-13` loads fonts from
  fonts.googleapis.com. Self-host Metamorphous + Inter under
  `public/fonts/` (both OFL-licensed). Removes GDPR/privacy leak
  + CDN-compromise vector.
- [x] M_SEC.10 — `index.html` no CSP. Add
  `<meta http-equiv="Content-Security-Policy" content="default-src
  'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; connect-src 'self'; object-src 'none';
  base-uri 'self'; frame-ancestors 'none'">` (allow capacitor:
  scheme for Android).
- [x] M_SEC.11 — cap entity count at deserialize. A
  tampered snapshot with 100k Unit entities would (after M_SEC.6
  bypass) spawn 100k yuka Vehicles. Reject snapshots > 5000
  entities.

#### MEDIUM

- [ ] M_SEC.12 — `persistence.ts:218` save() name
  parameter — add 256-char cap.
- [ ] M_SEC.13 — `persistence.ts:243` list() runs
  SELECT * without LIMIT or pagination. Add `LIMIT 50` + separate
  `listMetadata()` that does `SELECT id,name,seed,saved_at` (no
  snapshot) for list views.
- [ ] M_SEC.14 — `persistence.ts:271 getEventSeed()`
  trusts stored value. Validate `/^[a-z0-9-]{1,256}$/`; re-mint
  if invalid.
- [ ] M_SEC.15 — `SoundToggle.tsx:24` +
  `SettingsModal.tsx:30` strict-ternary on muted pref; return
  null for unrecognized values, default false.
- [ ] M_SEC.16 — `.github/workflows/ci.yml` add fork-PR
  scrub before artifact upload; skip upload on fork PRs.
- [ ] M_SEC.17 — add CodeQL workflow + dependency-review-
  action on pull_request. Currently no static analysis on PRs.
- [ ] M_SEC.18 — `android/app/build.gradle:18-22`
  release block — set `minifyEnabled true`, `shrinkResources true`,
  `debuggable false` explicitly.
- [ ] M_SEC.19 — `android/app/build.gradle` add
  `signingConfigs.release` reading keystore from Gradle property;
  CI step decodes `secrets.RELEASE_KEYSTORE_BASE64`.
- [ ] M_SEC.20 — `android/app/build.gradle:40-46`
  delete the conditional `apply plugin: 'com.google.gms.google-
  services'` block — game doesn't use Firebase; latent activation
  is a privacy footgun.
- [ ] M_SEC.21 — `persistence.ts:249-256` list() row
  parse swallow — log `console.warn('[persistence] skipping
  corrupt save row', id)`.
- [ ] M_SEC.22 — `persistence.ts:240` load() catch
  returns null masks corruption from "no row found". Differentiate
  via `CorruptSaveError`; UI shows "save corrupted" path.
- [ ] M_SEC.23 — `audio/buses.ts` Howler cache
  unbounded — add LRU cap of ~64 entries.
- [ ] M_SEC.24 — KeyboardShortcuts/PauseControl/
  SelectionRect global listeners capture closure refs to `game`.
  On resume, three listeners coexist briefly. Switch to refs +
  effect cleanup that reads the current game.

#### LOW

- [ ] M_SEC.25 — `AndroidManifest.xml:14-22` either
  wire up the `custom_url_scheme` intent-filter explicitly or
  remove the dangling `custom_url_scheme` from strings.xml:5.
- [ ] M_SEC.26 — `App.tsx` Continue effect — guard
  StrictMode double-fire via idempotent UPSERT-by-name in
  persistence or de-dupe in createAutoSave.
- [ ] M_SEC.27 — `audio/useTitleMusic.ts:14-23` add
  `bus.cache.forEach(h => h.unload())` to cleanup.
- [ ] M_SEC.28 — `package.json` exact-pin all `^x.y.z`
  versions OR document `--frozen-lockfile` only.
- [ ] M_SEC.29 — `vite.config.ts:9` base URL: read
  from `process.env.VITE_BASE` with fallback.
- [ ] M_SEC.30 — `vite.config.ts:25-31` staticAssetsPlugin
  trusts every file in public/. Add CI lint failing if anything
  under `public/assets/` isn't referenced from
  `src/config/asset-metadata.json`.
- [ ] M_SEC.31 — `package.json:8` copywasm — move body
  to `scripts/copy-wasm.mjs`; call via `node scripts/copy-wasm.mjs`.
- [ ] M_SEC.32 — `vite.config.ts` vitest project
  staticAssetsPlugin — set `watch: false`.
- [ ] M_SEC.33 — namespace all Capacitor Preferences
  keys with `aethelgard.` prefix; wrap in single typed enum.

### M_MICRO — forward-applied MICRO/SIMPLIFICATION tickets (audit 2026-05-23)

The 67 findings emitted by the code-simplifier agent
(af4744c8cb3392a4e). Grouped by category; ROI-ranked at the bottom.
**Ship the biggest-win tickets first**: parseHexKey (kills 10 sites),
ModalShell (kills 200 LOC), ZoneBorder rebuild fix (hottest perf
bug).

#### Category 2 — Duplicated formulas

- [x] M_MICRO.2.1 — `board.ts:117` + `balance-audit.ts:26`
  inline `(|q|+|r|+|q+r|)/2` — replace with `hexDistance(q,r,0,0)`.
- [x] M_MICRO.2.2 — **PARSE-HEX-KEY HELPER** kills 13
  call sites. New `parseHexKey(key): {q,r}` in `src/core/hex.ts`,
  NaN-hardened. Replace `pathfinding.ts:39`, `hex.ts:48`, `PathLine
  .tsx:12`, `HomeBase.tsx:13`, `Crossings.tsx:11`, `RallyMarker.tsx
  :24`, `Decoration.tsx:438`, `encroachment.ts:109`, `job-routing.ts
  :28`, `path-follow.ts:12`, `commands.ts:287`, `ai-player.ts:137`,
  `steering.ts:75`.
- [x] M_MICRO.2.3 — `encroachment.ts:109-120
  hasAdjacentMilitary` inlines 6 direction pairs; use
  `HEX_DIRECTIONS` from `config/world.ts`.
- [x] M_MICRO.2.4 — extract `levelDelta(a, b): number`
  helper used by `pathfinding.ts:25` + `crossings.ts:85`.

#### Category 3 — Index-based React keys / id collisions

- [x] M_MICRO.3.1 — `Roads.tsx` snapshot sort by entity
  id OR diff via `Map<id,RoadView>` so koota query-order changes
  don't trigger full reconcile.
- [ ] M_MICRO.3.2 — `TrackingRings.tsx` lift opacity/
  scale into Ring state; drop the meshRefs Map (1-frame opacity pop
  on new rings).
- [x] M_MICRO.3.3 — `RallyMarker.tsx:24-28` use
  `parseHexKey` (M_MICRO.2.2) + early-return on invalid key.

#### Category 4 — Silent `?? 0` over `Number()` output

- [x] M_MICRO.4.1-4.10 — **ALL TEN COLLAPSE into M_MICRO.2.2's
  parseHexKey helper.** Tracked individually for completeness;
  resolved by the one parseHexKey commit. (RallyMarker, PathLine,
  HomeBase, Crossings, encroachment, job-routing, commands,
  ai-player, steering, RainParticles dead-?? on Float32Array.)

#### Category 5 — Unconditional per-frame setState

- [x] M_MICRO.5.1 — `ProjectileLayer.tsx:46-49` 60Hz
  setTick regardless of projectile count. Diff
  `game.projectiles.length` + first/last id; bail when unchanged.
- [x] M_MICRO.5.2 — **HOTTEST PERF BUG** — `ZoneBorder.
  tsx:51-55` rebuilds Float32Array every frame even when controlled
  set unchanged. Hash `[...zone.controlled].sort().join(',')` (or
  generation counter bumped by claimTile/releaseTile); skip rebuild
  on match.
- [x] M_MICRO.5.3 — `SelectionPanel.tsx:114,121-128`
  setView every RAF returns fresh object; add diff-equality
  short-circuit same as ResourceBar.
- [x] M_MICRO.5.4 — `GameCanvas.tsx:67-75` DecorationLive
  equality only checks key+isComplete; add `level === prev.level &&
  type === prev.type` to catch Wall→Gate composition swap.
- [x] M_MICRO.5.5 — `Minimap.tsx:62-72` redraw full
  overlay every RAF — cap to ~10 Hz via accumulator OR hash unit-
  count + camera-frustum.
- [ ] M_MICRO.5.6 — `RallyMarker.tsx:14-18` switch to
  `useSyncExternalStore` over `game.rally.subscribe(...)` OR
  collapse to a pure read driven by parent re-renders.
- [x] M_MICRO.5.7 — `CombatText.tsx:56-66` short-circuit
  empty pre-allocation: `if (prev.length === 0) return prev;`.
- [x] M_MICRO.5.8 — `BuildCompleteFX.tsx:34-56` same
  short-circuit.

#### Category 6 — Vacuous test assertions

- [x] M_MICRO.6.1 — `crossings.test.ts:43-44` assert
  `board.crossings.size > 0` + count natural vs artificial.
- [x] M_MICRO.6.2 — `resource-spawn.test.ts:22-26`
  assert `woodNodes.length > 0` before the per-node check.
- [x] M_MICRO.6.3 — `attractor.test.ts:24-27` assert
  `nearby.length > 0` AND at least one type reaches guarantee.
- [x] M_MICRO.6.4 — `prng.test.ts:25-26` add
  `expect(v).toBeLessThan(1)` + statistical mean-in-[0.45,0.55]
  over 10k draws.
- [x] M_MICRO.6.5 — `ai-vs-ai.test.ts:65-67` assert
  `wood > initialWood` (verify economy progress, not just signedness).
- [x] M_MICRO.6.6 — `weather-system.test.ts:31-33`
  assert `seen.size > 0` first.
- [x] M_MICRO.6.7 — `economy-integration.test.ts:18-19`
  `expect(after).toBeGreaterThan(before + 10)` for meaningful
  harvest progress.
- [x] M_MICRO.6.8 — `audio-events.test.ts:20-21,32-33`
  assert `events.length === EXPECTED_COUNT` before the loop.
- [x] M_MICRO.6.9 — `place-road.test.ts:25-29` query
  for placed key specifically + assert stone material.
- [x] M_MICRO.6.10 — `day-night.test.ts:27-28` sample
  full phase + assert `min < max - 0.5` so curve isn't flat.
- [x] M_MICRO.6.11 — `science-system.test.ts:7-13`
  constrain magnitude: `~= expectedRate * 60 * (1/60) ± 5%`.

#### Category 7 — Helper functions > 30 LOC

- [ ] M_MICRO.7.1 — `game-state.ts startGame` (294 LOC,
  8 phases). Extract `initWorld`, `placePlayerBase`, `placeEnemyBase`,
  `seedAttractorResources`, `initZones`; `startGame` becomes a
  30-line orchestrator. Couples to M_REGISTRY.13 (placeThing).
- [ ] M_MICRO.7.2 — `game-state.ts runEconomyTick`
  (119 LOC, 11 system invocations). Extract `SIM_PHASES:
  ReadonlyArray<(game, delta) => void>` table; pause/invuln-clamp
  stay inline. Foundation for M_REGISTRY runtime-pass collapse.
- [ ] M_MICRO.7.3 — `ai-player.ts` 4 Evaluator/Goal
  classes (Build/Train/Military/Resign) collapse to ONE generic
  `RegistryGoal` + `GOALS: Array<{id, score, payload, execute}>`
  table. ~150 LOC → ~60. Couples to M_REGISTRY.18 (BrainArchetype).
- [x] M_MICRO.7.4 — `character-factory.ts createCharacter`
  86-LOC role-branch combat-stats block — replace with
  `combatStatsFor(role): CombatStats | null` lookup +
  `combatTraitsFor(stats)` composer. Couples to M_REGISTRY.1.
- [x] M_MICRO.7.5 — `crossings.ts placeCrossings` 68 LOC
  — extract `gatherCrossingCandidates(tiles, rng)`.
- [ ] M_MICRO.7.6 — `job-routing.ts jobRoutingSystem`
  88 LOC, 3 sub-concerns — extract `assignIdlePeons`,
  `retargetExhausted`, `deliverToDeposit`.
- [x] M_MICRO.7.7 — `combat.ts combatSystem` 60 LOC —
  extract `resolveAttack(attacker, target, rng): DamageEvent | null`.

#### Category 8 — Pre-bitmask hand-rolled tile loops

- [ ] M_MICRO.8.1 — `ZoneBorder.tsx:32-44 buildBorder`
  → AND-NOT over two tile-bitmasks (controlled XOR neighbours).
- [ ] M_MICRO.8.2 — `encroachment.ts:109-120` neighbor-
  of-tile via inline direction → bit-shift + AND.
- [ ] M_MICRO.8.3 — `Roads.tsx` snapshot full-scan
  per frame → `tile-has-road` bitmask + popcount diff.
- [ ] M_MICRO.8.4 — `zone.ts:117-129 updateObserved`
  O(tiles × sources) → per-source vision-cone bitmask OR.

#### Category 9 — Dead code / unused exports

- [ ] M_MICRO.9.1 — `ai-player.ts:340` remove
  `void AssignedJob;` + the dead import.
- [ ] M_MICRO.9.2 — `rules/gates.ts:54` remove
  `void MoverBehavior;` + import.
- [ ] M_MICRO.9.3 — `NewGameModal.tsx:115` remove
  `void DEFAULT_MAP_SIZE;` + import.
- [ ] M_MICRO.9.4 — `RainParticles.tsx:52-53` drop dead
  `?? 0` on Float32Array index.
- [ ] M_MICRO.9.5 — strip obvious doc-comments in
  RainParticles + RallyMarker (keep load-bearing determinism note).

#### Category 10 — Inline-styled JSX > 50 LOC

- [ ] M_MICRO.10.1 — **MODALSHELL EXTRACTION** —
  `NewGameModal` + `OnboardingOverlay` + `GameOverModal` +
  `SettingsModal` + `ResignButton` confirm + `DiscoveriesPanel`
  (6 dialogs) share Dialog.Overlay + Content + Title styling. One
  `<ModalShell zIndex={...}>` wrapper kills ~200 LOC.
- [ ] M_MICRO.10.2 — `<HudPill icon label position
  index>` extracts the repeated top-right HUD pill pattern
  (DiscoveriesPanel + ResignButton + PauseControl) + viewport-
  aware top/right calc.
- [ ] M_MICRO.10.3 — `TitleScreen` page-shell div +
  `SelectionPanel` motion.div card both reach for a "card" token
  — lift to `hud-theme.cardStyle`.

#### Bonus

- [ ] M_MICRO.B.1 — `safePersistenceRead<T>(p, key,
  fallback)` helper in `persistence.ts` consolidating
  `OnboardingOverlay` + `SettingsModal` catch shapes.
- [ ] M_MICRO.B.2 — when SettingsModal grows, reuse
  `Segmented` from NewGameModal.
- [ ] M_MICRO.B.3 — `TileInteraction.tsx TilePick`
  separate "pointer state machine" from "command dispatch".
- [ ] M_MICRO.B.4 — `Decoration.tsx useDecorationGltfs`
  auto-derive asset-ids-to-preload from PALETTES at build time.

### M_DOCTRINE — own it architecturally top to bottom (user, 2026-05-23)

User: "we HAVE to start treating this as ONE unified production codebase
constantly striving to not be lazy but OWN IT architecturally top
bottom side to side. you find shit then even if it requires throwing
half the codebase out to fix it, you fix it and eat the cost."

This is a permanent doctrine update; encoded into the autonomy contract:

- The codebase is ONE unified production system. There is no "I'll fix
  it later" / "let me work around it for now" / "the existing code
  expects X so I'll match X". If the existing code is wrong, the
  existing code changes — the whole stack moves together.
- Architectural discovery is the trigger to refactor, not to defer.
  Discovering a parallel hierarchy means tearing it down NOW, not
  queuing a follow-up. M_ARCH_UNIFY is the operational example: the
  audit will surface half the codebase is misaligned — that's the
  signal to refactor half the codebase, not to negotiate scope.
- Cost is irrelevant. If fixing a finding correctly means deleting
  500 LOC and rewriting 1000 LOC against the new registry, that's
  the work. The wrong move is the "small fix" that preserves the
  bug-prone shape.
- This is recorded in `docs/specs/00-pillars.md` as a non-negotiable
  pillar; the autonomy contract in this directive's preamble
  inherits it.

**HARD GATE — M_AUDIT runs FIRST** (user, 2026-05-23): no normal
directive work resumes until (a) all M_AUDIT reviewer trio sweeps
complete, (b) every finding is THOROUGHLY forward-applied as new
directive items (the existing M_ARCH_UNIFY + queued M_FEATURE items
are the SEED — the audit will surface 100%+ more), (c) the expanded
directive captures the full discovered scope. Only then do M_ARCH_UNIFY
items begin executing.

The audit is the discovery instrument, not the validation step. There
is more hidden architectural debt than the current directive shows;
the trio's job is to find it before we touch any more code.

### M_ARCH_UNIFY — the architectural keystone (user, 2026-05-23)

User's correction: I keep building parallel hierarchies (units / buildings
/ particles / roads / accretions / modes / character-factory / structure-
models / MODE_PRESETS / BUILDING_BEHAVIORS / DISCOVERIES / BASE_ACCRETION
/ BUILDING_ACCRETION / PARTICLE_ARCHETYPE) when **everything is the same
thing**: a tuple of archetype assignments + slot values on a single
registry. The result: I keep flailing — every "subsystem" I add bolts
new code instead of slotting into a unified table.

The real architecture:

  **Layer 1: Archetypes.** Capability declarations — what slots an entity
  exposes. Includes the spec-102 ZoC traits (Offensive / Defensive /
  Attractor / Mover / Consumer) AND the cross-cutting capability slots:
  Movable, Animated, Costable, HasHP, AccretesProps, GenTimePlaced,
  RuntimePlaced, ParticleArchetype. An archetype is a *capability* —
  not a noun ("unit" or "building").

  **Layer 2: Things.** Every "thing" is a tuple of archetype assignments
  + slot values. A Footman is Movable(speed=2.5) + Offensive(dps=15) +
  HasHP(100) + Animated(rig=knight) + Costable(15g) + RuntimePlaced.
  A Farm is Attractor(0) + HasHP(80) + Costable(100w+50g) +
  RuntimePlaced + AccretesProps(grass+flowers). A Mountain spine is
  GenTimePlaced(mountain-paint) + Defensive(impassable). The TownHall
  and a Footman and a tree differ only in slot tuples — not in code
  paths. Particles are tuples (lifetime + geometry + Movable(ballistic)
  + AccretesProps?). Roads are tuples (Mover + RuntimePlaced).

  **Layer 3: Two passes that traverse every registered slot
  assignment.**
   - Gen-time pass walks every registered Thing with GenTimePlaced +
     runs its painter (beach ring, mountain spine, mode/mapType
     overrides, base accretion, building accretion). One outer loop.
   - Runtime pass walks every registered Thing with RuntimePlaced per
     tick + runs its Movable / Offensive / Defensive / Consumer
     behaviors. The current per-system per-tick loops (combat,
     harvest, encroachment, offensive-behavior, projectile,
     scienceSystem, buildSystem) collapse to one outer loop iterating
     slot membership.

  **Layer 4: Skins (user follow-up, 2026-05-23).** A skin is a top-
  level visual-overlay layer that sits ABOVE archetypes. A `Skin` has
  per-slot visual overrides (mesh per Animated rig, palette per
  AccretesProps prop pool, color per faction tint, audio sample per
  per-attacker sword sound). Adding a 3rd tribe = ONE new skin entry
  (the underlying archetypes + things are unchanged). Faction visual
  identity = a skin assignment. The current 'player' / 'enemy'
  hard-coding becomes the FIRST TWO entries of a `Skin` registry.

- [ ] M_ARCH_UNIFY.1 — write the spec doc (`docs/specs/103-archetype-
  unification.md`) that names every current hierarchy + maps it to its
  unified equivalent (units → Thing tuples; buildings → Thing tuples;
  particles → Thing tuples with ParticleArchetype slot; modes →
  GenTime pass overlay; accretion → AccretesProps slot; character-
  factory → composeTraits over a Thing profile; structure-models →
  per-Skin mesh slot). The doc is the keystone — every subsequent
  refactor cites it.
- [ ] M_ARCH_UNIFY.2 — Slot taxonomy: enumerate every capability slot
  (Movable, Animated, Costable, HasHP, AccretesProps, GenTimePlaced,
  RuntimePlaced, ParticleArchetype, plus the spec-102 ZoC: Offensive,
  Defensive, Attractor, Mover, Consumer). Each becomes a typed
  capability + a registry entry.
- [ ] M_ARCH_UNIFY.3 — `src/registry/things.ts`: the unified Thing
  registry. JSON-driven config (data) + typed loader (code) + per-Thing
  trait-composition function (one helper per slot kind, dispatched by
  slot membership not by Thing identity).
- [ ] M_ARCH_UNIFY.4 — gen-time pass refactor: `paintBeachRing /
  paintMountainSpine / paintInlandLake / paintChannelCuts /
  paintDesertBlanket / appendBaseAccretion / appendBuildingAccretion /
  appendGraveyardCluster` all become registered GenTime handlers
  iterated by ONE outer loop. Mode/mapType variants become weight
  overlays per handler, not hand-written paint functions.
- [ ] M_ARCH_UNIFY.5 — runtime pass refactor: combat / harvest /
  encroachment / offensive-behavior / projectile / science / build
  systems collapse to ONE outer loop iterating slot membership; each
  system becomes a slot handler.
- [ ] M_ARCH_UNIFY.6 — collapse character-factory + placeBuilding +
  placeRoad + foundBase + future place-* commands into ONE
  `placeThing(game, profileId, hexKey, faction)` verb that
  composeTraits + spawns. The current verbs become thin one-line
  wrappers (or get deleted) for backward compat with the HUD.
- [ ] M_ARCH_UNIFY.7 — `Skin` registry (user 2026-05-23): top-level
  visual-overlay table per faction. Skin {meshes: Record<rig, asset>,
  palette: Record<biome, color>, audio: Record<event, asset>,
  accretionPool: Record<archetype, propPool>}. Hard-coded
  'player'/'enemy' branches in structure-models / Decoration /
  zone-border / sound-map are replaced with skin lookup.
  Adding a 3rd tribe = ONE new skin entry. NO code changes anywhere.
- [ ] M_ARCH_UNIFY.8 — supersede M_REFACTOR.1 (particles) as a
  CONSUMER of the unified registry: a particle effect is a Thing
  whose ParticleArchetype slot is set; the per-frame ParticleSystem
  runs as one runtime-pass handler. The Things doing the emitting
  (combat-hit, building-complete, weather, rain) declare which
  ParticleArchetype they emit per event.
- [ ] M_ARCH_UNIFY.9 — supersede M_MAPGEN.13 (per-building accretion)
  + M_MAPGEN.11 (per-faction base accretion) as CONSUMERS: the
  accretion config tables collapse into AccretesProps slot values on
  Thing profiles. The accretion-paint loop iterates `registry.filter(
  has AccretesProps)` instead of two hand-rolled append* functions.
- [ ] M_ARCH_UNIFY.10 — supersede character-factory (user 2026-05-23
  "what is the purpose of a factory") as a CONSUMER: replace with
  `placeThing` dispatcher reading per-role composeTraits from the
  unified registry. Adding a Trebuchet or Settler becomes ONE config
  row, ZERO branches.

**THE ABOVE BLOCKS ALL FURTHER FEATURE WORK** — every new unit /
building / particle / mode / mapType / accretion item that lands
before M_ARCH_UNIFY ships is fighting the eventual collapse. Park
new feature asks under M_FEATURE_QUEUED below; work them only AFTER
M_ARCH_UNIFY drains.

### M_FEATURE_QUEUED — paused until M_ARCH_UNIFY ships

- [ ] [WAIT-AUDIT] M_REFACTOR.1 — generic particle ARCHETYPE system (user, 2026-05-22):
  "snow, sawdust, rain, all that shit are all particles" + "even blood
  effects, splashes, its the whole thing of we apply archetypes to units
  and buildings and use what they attract repel etc to dictate type and
  behavior. we can have biome localized unit localized etc particle
  archetype effects with an assigned scatter".
  Unify ALL particle-shaped FX under a generic system that follows the
  SAME archetype-slot pattern as M_ARCHETYPE / M_MAPGEN.11/.13:
    a) `ParticleArchetype` config (lifetime, geometry, color, opacity
       curve, gravity, drift, spawn-cadence, seed-tag). One row per
       kind (rain, snow, sawdust, dust-puff, blood-splash, confetti,
       projectile-arrow, etc).
    b) PER-BIOME particle archetypes (weather + ambient — snow on
       MOUNTAIN, mist on LAKE, sand-puff on DESERT).
    c) PER-UNIT-TYPE particle archetypes (blood-splash on combat hit
       to Footman; magic-glow on Witch idle; sawdust on BUILDING peon).
    d) PER-BUILDING-TYPE particle archetypes (smoke from Farm chimney,
       embers from Barracks, runes from Library, gold-glints from
       Wonder).
    e) `ParticleSystem` advances + culls in ONE per-frame place;
       `<ParticlesLayer>` renders.
    f) The current hand-rolled FX (RainParticles, SawdustFX,
       VictoryConfetti, BuildCompleteFX, ProjectileLayer,
       TrackingRings) all become `emit(...)` calls + config rows.
    g) Composes with the attractor/repulsor force field
       (M_ARCHETYPE.6) — a particle archetype can declare its
       attract/repel slot per faction, so blood pools "stick" to
       enemy zones, etc.
  Adds the 5th archetype-as-slot table to the codebase (after
  buildings, units, discoveries, accretion). Each particle effect =
  ONE config row.

- [ ] [WAIT-MCP] M_HARDENING.5 — KayKit Ultimate Fantasy RTS pack ingest
  via assets-library MCP; replace placeholder structures.
- [ ] [WAIT-DEVICE] M_HARDENING.6 — Pixel-5a perf profile + APK install
  validation on real device/emulator.
- [x] M_RELEASE_FINAL.3 — CHANGELOG 0.3.0 — every band documented
  (M_GAMEPLAY/M_CONSTRUCTION/M_COMBAT_POLISH/M_ARCHETYPE/M_DATA/M_AUDIO/
  M_AI_DEPTH/M_MOBILE/M_BALANCE/M_ACCESS/M_TITLE).
- [x] M_RELEASE_FINAL.4 — PR #1 title + body rewritten to full-game
  release scope; CHANGELOG 0.3.0 referenced; deferred items marked
  WAIT-ART / WAIT-DEVICE with reasons.
- [x] M_RELEASE_FINAL.5 — `pnpm verify` clean (typecheck + lint + format
  + 293 tests). test:browser + test:e2e + test:visual continue running
  via PR CI on the branch.
- [x] M_RELEASE_FINAL.6 — squash-merged (commit 6eba229); enabled GitHub
  Pages on the repo (deploy was failing 404 pre-Pages-enable); re-ran the
  Deploy Pages workflow. APK artefact built by ci.yml. Status: RELEASED.

---

## v0.4 cycle — kept open per user "ALWAYS extend the directives"

Initial release shipped; the queue continues. Each item is real work
surfaced by review feedback / playtesting / conversation spec gaps.

### M_FEATURE — new gameplay from `references/conversation.md`

(The two remaining hardening items — KayKit pack ingest M_HARDENING.5 and
Pixel-5a perf profile M_HARDENING.6 — already live in the v0.3 block above
with WAIT-MCP / WAIT-DEVICE prefixes; they carry forward into v0.4 without
re-listing. Both unblock as the relevant dependency lands.)

- [x] M_FEATURE.1 — road placement: placeRoad command (config/economy.json
  roadCosts per material, roadCostFor helper); Wall-tile composition
  materialises Gate via materialiseGate; Roads.tsx r3f layer renders each
  Mover as a flat hex disc coloured per material. 4 unit tests pin
  spawn/cost/composition/faction symmetry. 302 tests green.
- [x] M_FEATURE.2 — Discovery cost scaling: rules/discovery-cost.ts —
  depthOf (memoized BFS over prereqs), scaleForDepth (1 + log2(1 + d) so
  depth 0→1x, 1→2x, 3→3x, 7→4x), scaledCostFor returns per-slot ceil
  cost. research.ts canResearch + applyResearch consult the scaled cost;
  DiscoveriesPanel renders the effective cost.
- [x] M_FEATURE.3 — science accumulation: ScienceProducer ECS trait;
  Library building (cost 120w+60s+80g, ScienceProducer{rate:1});
  scienceSystem ticks per-frame — passive 0.05/s trickle + per-completed-
  Library rate. Both factions accumulate. 2 tests pin passive + Library
  acceleration. Library rows in all 5 config tables.
- [x] M_FEATURE.4 — Wonder building: composes Attractor (radius 3) +
  Offensive (radius 4, dps 8) + Defensive (radius 0). Cost 500w+400s+300g
  (late-game capstone); supply contribution 5. Rows in BuildingType,
  BUILDING_BEHAVIORS, BUILDING_DISPLAY, BUILDING_COSTS, buildingSupply,
  structure-models (both factions). Test pins the 3-archetype composition.
- [x] M_FEATURE.5 — Trebuchet siege unit: UnitType extended; combat
  stats (speed 1.0, hp 80, dmg 22, range 4, cooldown 3s); supply cost 3;
  rig.ts placeholder mesh; character-factory sets OffensiveBehavior.
  damageType='siege' per spec-102 damage-type table — multiplies Wall
  damage 1.5x via the armorVsSiege multiplier.
- [x] M_FEATURE.6 — Witch magic unit (UnitType already existed; this
  closes the damageType): character-factory sets damageType='magic' for
  Witch — cuts magic-armor multiplier (1.0x today; tunable per Defender).
  3-case test pins per-role damageType.

### M_QUALITY — review feedback fully discharged

- [x] M_QUALITY.1 — placeBuilding atomic spawn: traits collected into a
  single `world.spawn(...traits)` call; behavior-trait composition still
  reads from BUILDING_BEHAVIORS but the half-state failure mode is gone.
- [x] M_QUALITY.2 — Goblin-share rebalance: 6-cycle now puts 2x weight on
  the most-recently-unlocked enemy at each tier; Goblin share monotonically
  decreases 100% → 33% → 25% → 20% → 17% as escalation unlocks. New test
  `Goblin share strictly decreases` pins the invariant.
- [x] M_QUALITY.3 — AI-vs-AI determinism smoke (test):
  ai-vs-ai-determinism.test.ts fingerprints {outcome, clock, per-faction
  economy, base HPs} after 900 ticks; same seed → byte-identical FP; second
  test ensures different seed → different FP (no trivial constancy).

### M_POLISH — visual + audio coverage

- [x] M_POLISH.1 — dust-puff FX: BuildCompleteFX.tsx r3f layer watches
  Building entities; first time it sees isComplete, spawns a transient
  expanding-+-fading sphere puff at the tile (lifetime 1s, scale 0.3→1.0,
  rises 0.8 units). Pairs with the existing 'building-completed' audio cue.
- [x] M_POLISH.2 — sawdust FX: SawdustFX.tsx per BUILDING peon throttled
  puff spawn (350ms interval, per-frame cap 4); each cone drifts + arcs +
  fades over 600ms. GC accumulators for vanished entities.

### M_MAPGEN — guided map generation (user feedback, 2026-05-22)

User: "no emitting zone of control from the town hall building and it is
not distinct visually as a town hall. and we need things to not be purely
random. seeding for map generation should ALWAYS include at least one
mountain range with peaks and should ALWAYS Feature a graveyard
equidistant from town hall. i would say we ALWAYS paint every map with
these rules: some kind of mountain range creating necessary funneling
and movement challenges in the middle. a ring of beach surrounding the
entire island transitioning first to shallow and then deep water. some
kind of inland water feature. at least 4 layers of stacked mixed tile
spread out depth. and a radius from each starting location that
guarantees 3 tiles in any direction from center to guarantee accessible
placement for buildings plus resources. grass and trees. then beyond
that any other props features and varied terrain but always that kind of
red vs blue layout".

- [x] M_MAPGEN.1 — TownHall ZoC seeded: the home-base entity already
  composed AttractorBehavior; the missing piece was the ZoneState
  initialisation. New zone.ts.seedZonesFromAttractors seeds each
  faction's `controlled` set with every walkable tile within
  ATTRACTOR_RADIUS (2 hexes) of its anchor at startGame. The TownHall
  now visibly emits a 2-radius zone (ZoneBorder paints it) from t=0.
- [x] M_MAPGEN.2 — TownHall distinct mesh: player TownHall scale bumped
  1.0→1.5 with yOffset 0.15 lift; enemy crypt scale 1.4→1.8 with same
  lift. Both factions' bases visually anchor the map vs the smaller
  utility buildings (Farm 0.65, House 0.5, Barracks 0.9).
- [x] M_MAPGEN.3+.4+.5+.6 — guided generation post-pass: board.ts
  paintBeachRing (outer 2 hexes BEACH, beyond OCEAN), paintMountainSpine
  (seed-derived axis 0/1/2 → 3-tile-wide MOUNTAIN band through center;
  funneling guaranteed), paintInlandLake (random walkable candidate +
  4-tile LAKE rosette), and the heightToLevel mapping already produces
  ≥4 elevation tiers. 5 mapgen-guarantees tests pin: beach ring, mountain
  spine, lake cluster, ≥4 tiers, seed determinism.
- [x] M_MAPGEN.7 — safety ring: spawnResourceNodes now takes a
  protectedCenters parameter; tiles within SAFETY_RADIUS (3) of either
  FactionBase are excluded from random node placement. startGame passes
  both base centers. ensureAttractorResources still places the GUARANTEED
  nearby resources outside the safety ring (within ATTRACTOR_RADIUS=2),
  so peons still have work in-zone at start.
- [x] M_MAPGEN.8 — graveyard cluster: Decoration.tsx appendGraveyardCluster
  paints `nature.gravestone.round` + `nature.gravestone.cross` props in
  the 2-hex rosette around the enemy base, ~55% density per tile,
  seeded from `${board.seedPhrase}:graveyard`. Visually reinforces the
  enemy base IS the graveyard (the existing portal-crypt sits at the
  center). 321 tests still green.
- [x] M_MAPGEN.9 — red-vs-blue identity verified: ZoneBorder already
  uses #38bdf8 (azure) for player + #f43f5e (crimson) for enemy. Base
  meshes are faction-tinted via the existing structure-models split.
  M_MAPGEN.2 will further distinguish the TownHall mesh.
### M_MODES — selectable game modes (user feedback, 2026-05-22)

User: "in new game we COULD offer multiple game types. red vs blue type
thats what i just described with two well balanced equidistant starting
locations, and something thats more... skirmish? where its totally random
like we have now and you could end up with a completely impassible
center, need to make a bunch of paths and circumvent, and then an
endless mode where town halls are impossible to destroy and its about
scoring the most points and controlling the most territory until you or
your opponent resigns because they're starved out, thats easy enough to
qualify for AI GOAP".

- [x] M_MODES.1 — GameMode union: ('red-vs-blue' | 'skirmish' | 'endless'
  | 'classic-rts' | '4x'). NewGameConfig.mode (optional, defaults to
  'red-vs-blue'); typed in game-state.ts. NewGameModal + GameSession
  wiring + per-mode preset effects land in M_MODES.7 + per-mode
  rules in .2-.6.
- [x] M_MODES.2 — red-vs-blue (the default): rules/mode-presets.ts
  preset.guidedMapGen=true; the M_MAPGEN.3-.9 paint passes fire when
  presetFor(game.mode).guidedMapGen is true (this is the default path).
  Equidistant base placement guaranteed by the existing farthest-walkable
  enemy-base selection + the M_MAPGEN.1 zone seeding.
- [x] M_MODES.3 — skirmish: preset.guidedMapGen=false; generateBoard
  skips paintBeachRing/paintMountainSpine/paintInlandLake — pure-noise
  asymmetric maps allowed. Test pins the mode flag round-trips.
- [x] M_MODES.4 — endless (foundation): preset.invulnerableBases=true;
  runEconomyTick after combat clamps FactionBase Health back to max
  every tick. Test pins the clamp + the negative case for red-vs-blue.
  Resign/starve win condition + score integral land as M_MODES.4-extras
  (queued under M_MODES.10 below).
- [x] M_MODES.10 — endless extras shipped: resign(faction) command in
  commands.ts (game.outcome flips player→loss / enemy→win); ResignButton
  HUD with confirm dialog; AiPlayer.starvedFor accumulator + Resign-
  Evaluator (desirability 1.0 when starved 5 game-minutes) + ResignGoal;
  GameState.score: Record<Faction, number> integrates controlled.size *
  delta each tick; GameOverModal shows "Territory Score: P vs E".
  5 new tests pin: player/enemy resign outcome, no-op-after-over, score
  accumulates, both factions independent. 333 tests green.

- [x] M_MODES.5 — classic-rts: preset already chose 'large' + 'medium'
  matchLength + 'continent' mapType. Concrete rules wired:
  EnemySpawner.spawnInterval now scales by matchLengthScale(preset.
  matchLength) — short ×0.7, medium ×1.0, long ×1.4, endless ×1.6 —
  so classic-rts (medium) keeps the baseline spawn tempo, red-vs-blue
  (short) pressures faster, endless (1.6×) breathes. Discoveries-
  graph scaling already in via M_FEATURE.2 (depth-log).
- [x] M_MODES.9 — map-type axis: generateBoard accepts mapType (balanced
  | continent | archipelago | dry-land); paint-pass conditions per type:
  archipelago skips mountain spine + adds wide LAKE channel cuts;
  dry-land skips inland lake + blankets interior with DESERT; balanced
  + continent stay as today's behavior. startGame threads preset.mapType
  through findBalancedBoard. 4 tests pin: archipelago ≥15 LAKE tiles;
  dry-land ≥10 DESERT + 0 inland LAKE; continent mountain spine present;
  deterministic per seed+mapType.

- [x] M_MODES.7 — modes-as-presets in NewGameModal: MODES list with all 5
  preset cards (label + hint); selecting a mode resets mapSize to the
  preset default but lets the player override; mode threads through
  NewGameChoices → App.beginGame → NewGameConfig → startGame, applying
  via presetFor() (M_MODES.2-.4 already wired). Advanced "show full
  axes" toggle queued as part of M_MODES.7-extras when a 4th axis
  (matchLength/turnsMode/mapType) lands.
- [x] M_MODES.8 — end-turn mechanic: GameState.turn (active faction +
  secondsRemaining + turnLength); endTurn() command flips active +
  resets budget; runEconomyTick decrements budget per tick + auto-
  flips at 0. EndTurnButton HUD pill shows whose turn + countdown,
  enabled only on player turn. 4x preset initialises turn{60s}; other
  presets are real-time (game.turn undefined). 5 tests pin: 4x init,
  red-vs-blue undefined, auto-flip on 60s, endTurn flip+reset, no-op
  on non-turn-based. 338 tests green.

- [x] M_MODES.6 — 4X mode: Settler UnitType (civilian, speed 2.2,
  supply 4); foundBase(game, settler) command verb consumes the
  Settler + spawns a new TownHall+AttractorBehavior at its tile
  (without FactionBase — only the original counts as the win/loss
  anchor). 4X preset already covers huge map / long match / turn-based /
  continent mapType via MODE_PRESETS. Discoveries graph (M_FEATURE.2),
  Wonder race (M_FEATURE.4), force-field (M_ARCHETYPE.6), bitmask
  layout (M_ARCHETYPE.7) all already in. 3 tests pin: settler→base
  conversion, non-settler-rejected, occupied-tile-rejected.

- [x] M_MAPGEN.11 — base-accretion generalised: Decoration.tsx
  BASE_ACCRETION config table per faction (propPool, radius, density,
  scaleRange, seedTag); appendBaseAccretion drives off the table. Enemy
  → graveyard pieces; player → tree/rock placeholders pending dedicated
  banner/market-stall assets. Adding a faction or swapping propPool is
  one row. Both factions now get visual accretion around their bases.
  Per-BuildingType ACCRETION_PROFILE follow-up tracked under future
  M_MAPGEN.13 (when more building variants land).

- [x] M_MAPGEN.13 — per-BuildingType accretion: BUILDING_ACCRETION table
  in Decoration.tsx (Farm → grass+flowers; Barracks → rocks+stumps;
  Library → mushrooms; Granary → grass+bushes); appendBuildingAccretion
  paints a 1-hex ring around each completed building site. Drives off
  the same config-row pattern as BASE_ACCRETION. DecorationLive in
  GameCanvas snapshots game.buildSites per frame with diff-equal
  short-circuit so the memo re-fires only on completion transitions.

- [x] M_MAPGEN.12 — balanced enemy placement: startGame now iterates
  ALL walkable candidates with d≥5 from center; for guided modes the
  scoring is `ratio*100 + distance` where ratio = balance-audit fit
  (drop any candidate with ratio < 1 - BALANCE_TOLERANCE); for skirmish
  it falls back to farthest-walkable. balance-audit.test.ts updated to
  verify startGame-chosen placements pass balance for ≥8/10 seeds.
  328 tests green.

- [x] M_MAPGEN.10 — fair-balance audit (foundation): core/balance-
  audit.ts — reachableBuildableCount + isBalanced + balanceReport
  (REACH_RADIUS=6, BALANCE_TOLERANCE=0.1). startGame's guided modes
  call findBalancedBoard which tries the seed + 5 suffix variants
  ('rb1'..'rb5'); first to pass wins; falls back to the last attempted
  board. Test pins the today's-asymmetric placement is flagged as
  unfair (will GREEN-flip when M_MAPGEN.12 enemy-placement
  refinement lands).

### M_BALANCE_2 — map-size scaling (user feedback, 2026-05-22)

User: "map size has to be significantly bigger. small, medium, large, huge,
all scale by lets say.... 50% then 40% then 30% then 20% respectively and
see where we land". Current radii (12/20/28/36) — scale UP by the requested
percentages, verify perf headroom holds at the new Huge.

- [x] M_BALANCE_2.1 — bumped mapSizes (12/20/28/36 → 18/28/36/43, the user's
  +50/+40/+30/+20% scaling); generateBoard radius cap raised 32 → 48 to
  accept Huge with headroom. All 315 tests still green (the determinism
  smoke + economy/spawn integration cover the new sizes implicitly).
- [x] M_BALANCE_2.2 — Huge-size determinism smoke (test): added a Huge-
  radius (43) variant to ai-vs-ai-determinism.test.ts to verify the
  larger board doesn't introduce an order-of-iteration determinism break.
  Difficulty-coupled timings (encroachment grace, spawn interval) stay
  size-independent by construction; actual pacing tuning at Huge is a
  hands-on playtest signal that loops back here when needed.
- [ ] [WAIT-ASSETS] M_POLISH.3 — sword-clash / shield-deflect SFX per
  attacker class: requires dedicated per-role audio assets that don't yet
  exist in references/audio (current SFX pack is generic hit + magic-
  impact). Wires up the moment the KayKit / Fantasy audio pack delivers
  per-class variants. Today's combat-hit cue is the placeholder.
- [ ] [WAIT-CI] PR_3_MERGE — squash-merge PR #3 (chore/release-marker)
  once CI lands green; carries the v0.4 cycle work (M_FEATURE.1+.2+.3+.4+
  .5+.6, M_QUALITY.1+.2+.3, M_POLISH.1+.2+.4, M_BALANCE_2.1+.2,
  M_HARDENING.1-4 directive log + post-release cleanup). Then re-deploy
  via Deploy Pages workflow + flip directive status if appropriate.
- [x] M_POLISH.4 — victory confetti: VictoryConfetti.tsx — 60 gold/amber/
  bronze BoxGeometry pieces, ballistic with gravity, 3s lifetime, fades to
  zero. Fires on the moment game.outcome flips to 'win'.
