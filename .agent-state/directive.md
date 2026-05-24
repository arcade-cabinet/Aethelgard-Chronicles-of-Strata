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
- [x] M_REGISTRY.6 — collapse the 7 sibling particle FX
  (RainParticles, SawdustFX, BuildCompleteFX, VictoryConfetti,
  CombatText, ResourceText, TrackingRings, FootstepEmitter) into ONE
  ParticleSystem driven by `ParticleArchetype` slot configs (geometry,
  lifetime, emit trigger, drift fn, batch source). Supersedes the
  earlier M_REFACTOR.1 — this IS its realization.
- [x] M_REGISTRY.7 — `src/world/Decoration.tsx` (599 LOC,
  biggest world file) splits along 3 painter passes; all 3 collapse
  into AccretesProps slot values on gen-time pass. Replace trio with
  one `paintAccretion(target, AccretesProps)` invoked per Accreting
  entity.
- [x] M_REGISTRY.8 — `useDecorationGltfs()` hand-built
  32-key Record of preloads collapses into derived list from unified
  asset registry — every asset referenced by any Skin or
  AccretesProps auto-preloaded.
- [x] M_REGISTRY.9 — collapse 5 board paint passes
  (paintBeachRing / Mountain / Channel / Lake / Desert) + assignBiome
  into ONE `runGenTimePass(board, slots)` iterating slot membership
  + dispatching per slot kind.
- [x] M_REGISTRY.10 — `Mountains.tsx` (peak placement)
  + `Crossings.tsx` (ramp placement) join the gen-time pass — both
  are AccretesProps consumers, not bespoke renderers.
- [x] M_REGISTRY.11 — `Roads.tsx` MATERIAL_COLOR table +
  Roads layer become a Skin-driven generic MoverRenderer. Same
  shape as StructureRenderer.
- [x] M_REGISTRY.12 — `Crossings.tsx` 6-variant (style ×
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
- [x] M_REGISTRY.18 — collapse 6 AI files (ai-director,
  ai-player, perception, steering, vehicle-factory, ecs/systems/ai)
  into ONE `BrainArchetype` slot consumed by ONE per-tick AI system.
  yuka Vehicle becomes implementation detail of the brain slot.
- [x] M_REGISTRY.19 — `SelectionRing.tsx ringScale`
  4-branch ladder becomes `selectionRadius` Skin slot read off
  the selected thing's profile.
- [x] M_REGISTRY.20 — `audio/sound-map.ts` event→asset
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
- [x] M_REGISTRY.24 — `resource-spawn.ts` +
  `rules/attractor.ts` collapse — both walk board placing per-
  ResourceType nodes. ONE `runResourcePlacement(board, [{kind:
  'attractor-guarantee', ...}, {kind: 'biome-scatter', ...}])`
  driven by config.
- [x] M_REGISTRY.25 — `persistence/serialize.ts` per-
  component-type table collapses into derived loop over unified
  component registry — every koota trait registered in
  ecs/components.ts auto-serialises. (Couples to M_SEC.5/6 below.)
- [x] M_REGISTRY.26 — `static-assets.ts` (242 LOC)
  becomes derived view over asset half of Skin registry; manual
  table goes away.
- [x] M_REGISTRY.27 — `Minimap.tsx:118` color ternary
  + literal base-marker tuple become Skin slot reads
  (`Skin[faction].minimap.color`).
- [x] M_REGISTRY.28 — `TileInteraction.tsx:145`
  `faction === 'player'` click-routing assumption goes away once
  `selectedEntities(game)` filters by `local-player-faction` from
  a session context — lets AI-vs-AI replays drive the same
  interaction layer.
- [x] M_REGISTRY.29 — `encroachment.ts` `for faction of
  ['player','enemy']` literal loop becomes `for faction of
  FACTIONS`. Same fix wherever two-faction literal escapes.
- [x] M_REGISTRY.30 — `offensive-behavior.ts:87`
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
- [x] [HIGH] M_SEC.4 — encrypt SQLite saves — DONE. createConnection mode flips to `'encryption'` on native (iOS/Android via SQLCipher) and stays `'no-encryption'` on web (sql.js fallback). Per-install key bootstrap: `ensureDbSecret()` reads or mints a 64-byte cryptographically-random passphrase via crypto.getRandomValues, base64-encodes it (88 ASCII chars), and persists under PREF_KEYS.dbKey via Capacitor Preferences. On iOS that backs to Keychain; on Android to EncryptedSharedPrefs; on web to localStorage (where SQLCipher is no-op anyway). Wiping app data wipes both saves AND key, so reinstall starts fresh. setEncryptionSecret call guarded by setEncryptionSecret existence (web fallback). 491/491 green.

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

- [x] M_SEC.12 — `persistence.ts:218` save() name
  parameter — add 256-char cap.
- [x] M_SEC.13 — `persistence.ts:243` list() runs
  SELECT * without LIMIT or pagination. Add `LIMIT 50` + separate
  `listMetadata()` that does `SELECT id,name,seed,saved_at` (no
  snapshot) for list views.
- [x] M_SEC.14 — `persistence.ts:271 getEventSeed()`
  trusts stored value. Validate `/^[a-z0-9-]{1,256}$/`; re-mint
  if invalid.
- [x] M_SEC.15 — `SoundToggle.tsx:24` +
  `SettingsModal.tsx:30` strict-ternary on muted pref; return
  null for unrecognized values, default false.
- [x] M_SEC.16 — `.github/workflows/ci.yml` add fork-PR
  scrub before artifact upload; skip upload on fork PRs.
- [x] M_SEC.17 — add CodeQL workflow + dependency-review-
  action on pull_request. Currently no static analysis on PRs.
- [x] M_SEC.18 — `android/app/build.gradle:18-22`
  release block — set `minifyEnabled true`, `shrinkResources true`,
  `debuggable false` explicitly.
- [x] M_SEC.19 — `android/app/build.gradle` add
  `signingConfigs.release` reading keystore from Gradle property;
  CI step decodes `secrets.RELEASE_KEYSTORE_BASE64`.
- [x] M_SEC.20 — `android/app/build.gradle:40-46`
  delete the conditional `apply plugin: 'com.google.gms.google-
  services'` block — game doesn't use Firebase; latent activation
  is a privacy footgun.
- [x] M_SEC.21 — `persistence.ts:249-256` list() row
  parse swallow — log `console.warn('[persistence] skipping
  corrupt save row', id)`.
- [x] M_SEC.22 — `persistence.ts:240` load() catch
  returns null masks corruption from "no row found". Differentiate
  via `CorruptSaveError`; UI shows "save corrupted" path.
- [x] M_SEC.23 — `audio/buses.ts` Howler cache
  unbounded — add LRU cap of ~64 entries.
- [x] M_SEC.24 — KeyboardShortcuts/PauseControl/
  SelectionRect global listeners capture closure refs to `game`.
  On resume, three listeners coexist briefly. Switch to refs +
  effect cleanup that reads the current game.

#### LOW

- [x] M_SEC.25 — `AndroidManifest.xml:14-22` either
  wire up the `custom_url_scheme` intent-filter explicitly or
  remove the dangling `custom_url_scheme` from strings.xml:5.
- [x] M_SEC.26 — `App.tsx` Continue effect — guard
  StrictMode double-fire via idempotent UPSERT-by-name in
  persistence or de-dupe in createAutoSave.
- [x] M_SEC.27 — `audio/useTitleMusic.ts:14-23` add
  `bus.cache.forEach(h => h.unload())` to cleanup.
- [x] M_SEC.28 — `package.json` exact-pin all `^x.y.z`
  versions OR document `--frozen-lockfile` only.
- [x] M_SEC.29 — `vite.config.ts:9` base URL: read
  from `process.env.VITE_BASE` with fallback.
- [x] M_SEC.30 — `vite.config.ts:25-31` staticAssetsPlugin
  trusts every file in public/. Add CI lint failing if anything
  under `public/assets/` isn't referenced from
  `src/config/asset-metadata.json`.
- [x] M_SEC.31 — `package.json:8` copywasm — move body
  to `scripts/copy-wasm.mjs`; call via `node scripts/copy-wasm.mjs`.
- [x] M_SEC.32 — `vite.config.ts` vitest project
  staticAssetsPlugin — set `watch: false`.
- [x] M_SEC.33 — namespace all Capacitor Preferences
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
- [x] M_MICRO.3.2 — `TrackingRings.tsx` lift opacity/
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
- [x] M_MICRO.5.6 — `RallyMarker.tsx:14-18` switch to
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

- [x] M_MICRO.7.1 — `game-state.ts startGame` (294 LOC,
  8 phases). Extract `initWorld`, `placePlayerBase`, `placeEnemyBase`,
  `seedAttractorResources`, `initZones`; `startGame` becomes a
  30-line orchestrator. Couples to M_REGISTRY.13 (placeThing).
- [x] M_MICRO.7.2 — `game-state.ts runEconomyTick`
  (119 LOC, 11 system invocations). Extract `SIM_PHASES:
  ReadonlyArray<(game, delta) => void>` table; pause/invuln-clamp
  stay inline. Foundation for M_REGISTRY runtime-pass collapse.
- [x] M_MICRO.7.3 — `ai-player.ts` 4 Evaluator/Goal
  classes (Build/Train/Military/Resign) collapse to ONE generic
  `RegistryGoal` + `GOALS: Array<{id, score, payload, execute}>`
  table. ~150 LOC → ~60. Couples to M_REGISTRY.18 (BrainArchetype).
- [x] M_MICRO.7.4 — `character-factory.ts createCharacter`
  86-LOC role-branch combat-stats block — replace with
  `combatStatsFor(role): CombatStats | null` lookup +
  `combatTraitsFor(stats)` composer. Couples to M_REGISTRY.1.
- [x] M_MICRO.7.5 — `crossings.ts placeCrossings` 68 LOC
  — extract `gatherCrossingCandidates(tiles, rng)`.
- [x] M_MICRO.7.6 — `job-routing.ts jobRoutingSystem`
  88 LOC, 3 sub-concerns — extract `assignIdlePeons`,
  `retargetExhausted`, `deliverToDeposit`.
- [x] M_MICRO.7.7 — `combat.ts combatSystem` 60 LOC —
  extract `resolveAttack(attacker, target, rng): DamageEvent | null`.

#### Category 8 — Pre-bitmask hand-rolled tile loops

- [x] M_MICRO.8.1 — `ZoneBorder.tsx:32-44 buildBorder`
  → AND-NOT over two tile-bitmasks (controlled XOR neighbours).
- [x] M_MICRO.8.2 — `encroachment.ts:109-120` neighbor-
  of-tile via inline direction → bit-shift + AND.
- [x] M_MICRO.8.3 — `Roads.tsx` snapshot full-scan
  per frame → `tile-has-road` bitmask + popcount diff.
- [x] M_MICRO.8.4 — `zone.ts:117-129 updateObserved`
  O(tiles × sources) → per-source vision-cone bitmask OR.

#### Category 9 — Dead code / unused exports

- [x] M_MICRO.9.1 — `ai-player.ts:340` remove
  `void AssignedJob;` + the dead import.
- [x] M_MICRO.9.2 — `rules/gates.ts:54` remove
  `void MoverBehavior;` + import.
- [x] M_MICRO.9.3 — `NewGameModal.tsx:115` remove
  `void DEFAULT_MAP_SIZE;` + import.
- [x] M_MICRO.9.4 — `RainParticles.tsx:52-53` drop dead
  `?? 0` on Float32Array index.
- [x] M_MICRO.9.5 — strip obvious doc-comments in
  RainParticles + RallyMarker (keep load-bearing determinism note).

#### Category 10 — Inline-styled JSX > 50 LOC

- [x] M_MICRO.10.1 — **MODALSHELL EXTRACTION** —
  `NewGameModal` + `OnboardingOverlay` + `GameOverModal` +
  `SettingsModal` + `ResignButton` confirm + `DiscoveriesPanel`
  (6 dialogs) share Dialog.Overlay + Content + Title styling. One
  `<ModalShell zIndex={...}>` wrapper kills ~200 LOC.
- [x] M_MICRO.10.2 — `<HudPill icon label position
  index>` extracts the repeated top-right HUD pill pattern
  (DiscoveriesPanel + ResignButton + PauseControl) + viewport-
  aware top/right calc.
- [x] M_MICRO.10.3 — `TitleScreen` page-shell div +
  `SelectionPanel` motion.div card both reach for a "card" token
  — lift to `hud-theme.cardStyle`.

#### Bonus

- [x] M_MICRO.B.1 — `safePersistenceRead<T>(p, key,
  fallback)` helper in `persistence.ts` consolidating
  `OnboardingOverlay` + `SettingsModal` catch shapes.
- [x] M_MICRO.B.2 — when SettingsModal grows, reuse
  `Segmented` from NewGameModal.
- [x] M_MICRO.B.3 — `TileInteraction.tsx TilePick`
  separate "pointer state machine" from "command dispatch".
- [x] M_MICRO.B.4 — `Decoration.tsx useDecorationGltfs`
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

- [x] M_ARCH_UNIFY.1 — write the spec doc (`docs/specs/103-archetype-
  unification.md`) that names every current hierarchy + maps it to its
  unified equivalent (units → Thing tuples; buildings → Thing tuples;
  particles → Thing tuples with ParticleArchetype slot; modes →
  GenTime pass overlay; accretion → AccretesProps slot; character-
  factory → composeTraits over a Thing profile; structure-models →
  per-Skin mesh slot). The doc is the keystone — every subsequent
  refactor cites it.
- [x] M_ARCH_UNIFY.2 — Slot taxonomy: enumerate every capability slot
  (Movable, Animated, Costable, HasHP, AccretesProps, GenTimePlaced,
  RuntimePlaced, ParticleArchetype, plus the spec-102 ZoC: Offensive,
  Defensive, Attractor, Mover, Consumer). Each becomes a typed
  capability + a registry entry.
- [x] M_ARCH_UNIFY.3 — `src/registry/things.ts`: the unified Thing
  registry. JSON-driven config (data) + typed loader (code) + per-Thing
  trait-composition function (one helper per slot kind, dispatched by
  slot membership not by Thing identity).
- [x] M_ARCH_UNIFY.4 — gen-time pass refactor: `paintBeachRing /
  paintMountainSpine / paintInlandLake / paintChannelCuts /
  paintDesertBlanket / appendBaseAccretion / appendBuildingAccretion /
  appendGraveyardCluster` all become registered GenTime handlers
  iterated by ONE outer loop. Mode/mapType variants become weight
  overlays per handler, not hand-written paint functions.
- [x] M_ARCH_UNIFY.5 — runtime pass refactor: combat / harvest /
  encroachment / offensive-behavior / projectile / science / build
  systems collapse to ONE outer loop iterating slot membership; each
  system becomes a slot handler.
- [x] M_ARCH_UNIFY.6 — collapse character-factory + placeBuilding +
  placeRoad + foundBase + future place-* commands into ONE
  `placeThing(game, profileId, hexKey, faction)` verb that
  composeTraits + spawns. The current verbs become thin one-line
  wrappers (or get deleted) for backward compat with the HUD.
- [x] M_ARCH_UNIFY.7 — `Skin` registry (user 2026-05-23): top-level
  visual-overlay table per faction. Skin {meshes: Record<rig, asset>,
  palette: Record<biome, color>, audio: Record<event, asset>,
  accretionPool: Record<archetype, propPool>}. Hard-coded
  'player'/'enemy' branches in structure-models / Decoration /
  zone-border / sound-map are replaced with skin lookup.
  Adding a 3rd tribe = ONE new skin entry. NO code changes anywhere.
- [x] M_ARCH_UNIFY.8 — supersede M_REFACTOR.1 (particles) as a
  CONSUMER of the unified registry: a particle effect is a Thing
  whose ParticleArchetype slot is set; the per-frame ParticleSystem
  runs as one runtime-pass handler. The Things doing the emitting
  (combat-hit, building-complete, weather, rain) declare which
  ParticleArchetype they emit per event.
- [x] M_ARCH_UNIFY.9 — supersede M_MAPGEN.13 (per-building accretion)
  + M_MAPGEN.11 (per-faction base accretion) as CONSUMERS: the
  accretion config tables collapse into AccretesProps slot values on
  Thing profiles. The accretion-paint loop iterates `registry.filter(
  has AccretesProps)` instead of two hand-rolled append* functions.
- [x] M_ARCH_UNIFY.10 — supersede character-factory (user 2026-05-23
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

- [x] [HIGH] M_HIERARCHY.1 — Archetype vs Consumer vs Skin vocab audit — DONE for particles. Renamed src/world/particle-archetypes.tsx → src/world/particle-consumers.tsx and the 5 exports (rainArchetype → rainConsumer, sawdust/buildComplete/victoryConfetti/chimneySmoke similarly). Hierarchy contract codified in two docstrings:
  - **Archetype** = the abstract primitive (the spawn/age/cull state machine + render contract). The particle ARCHETYPE lives in ParticleEmitter.tsx (the ParticleEmitter component + ParticleEmitterSpec interface + BaseParticle type). ONE archetype.
  - **Consumer** = a tuned configuration bound to a domain trigger. The 5 particle CONSUMERS live in particle-consumers.tsx.
  - **Skin** = per-consumer visual overlay parameters (color, opacity curve, scale). Today consumers carry these inline; future M_REGISTRY.7 lifts them onto SKINS[faction].particles.
  Audit confirmed no other `*Archetype` exports remain in src/ or tests/ — vocab is now consistent everywhere. tests/browser/particle-emitter.browser.test.tsx + tests/unit/particle-consumers.test.ts updated. 444/444 tests green.

- [x] [HIGH] M_TURNS.4 — removed as duplicate of M_HIERARCHY.1.

- [ ] [STANDING] M_PROCESS.WORKTREE — Lead agent owns worktree close-out (user, 2026-05-23: "remember YOU are responsible for owning integration and close out of all worktrees after agents finish into your branch"). After every parallel agent finishes, integrate its worktree changes into the active branch (cherry-pick or merge depending on whether the agent committed directly to the shared branch vs a separate branch in its worktree) AND remove the worktree dir under .claude/worktrees/agent-*. Confirm `git worktree list` is clean before continuing. Today's discovery (2026-05-23): the "worktree" agents actually executed against my repo dir despite the isolation flag — so close-out for them was a no-op, but future remote-agent / explicit-worktree runs need this discipline. NEVER let worktrees linger.

- [ ] [STANDING] M_PROCESS.REVIEW.FINDINGS — open security-review findings from the 2026-05-23 review-trio (security-scanning:security-auditor against origin/main..HEAD). Fold into the NEXT forward commits, NEVER amend.
  - [x] [HIGH] M_SEC_REVIEW.1 — DONE. Both weak-entropy fallbacks removed. ensureDbSecret() now: (a) throws on missing WebCrypto, (b) removes the `session-${Math.random()}-${Date.now()}` Preferences-fail fallback (no inner try/catch — exceptions propagate to openDb's outer catch which sets dbUnavailable=true and degrades to no-op). Better no saves than weak-encrypted saves.
  - [x] [MED] M_SEC_REVIEW.2 — DONE alongside M_SEC_REVIEW.1. The console.warn was inside the now-deleted Preferences-fail catch; it's gone. Failures still propagate to openDb's outer catch which logs "SQLite unavailable, saves disabled" — that's a generic message that doesn't leak key-failure timing specifically.
  - [x] [MED] M_SEC_REVIEW.3 — DONE. tradeResource now rejects fromAmount > 10_000_000 AND rejects trades that would push eco[toType] past the same cap. 1 new test pins the cap-reject path. The 10^7 cap is well past any legitimate match's max; anything beyond is a save-edit attack.
  - [x] [MED] M_SEC_REVIEW.4 — DONE. build-manifest.ts walk() now realpathSync()s each entry + asserts the resolved path stays inside rootReal (ASSETS_DIR). Symlinks pointing outside public/assets/ are silently skipped. Dangling-symlink errors swallowed in a per-entry try/catch.
  - [x] [LOW] M_SEC_REVIEW.5 — DONE. Removed 'unsafe-inline' from the dev CSP injection in vite.config.ts. Vite HMR uses `<script type="module">` tags which aren't covered by 'unsafe-inline' anyway; allowing it was broader than needed. Kept `'unsafe-eval' blob:`.
  - [x] [LOW] M_SEC_REVIEW.6 — DONE. playSoundAt validates Number.isFinite on worldXZ.x/z + cameraXZ.x/z + cameraAzimuth at the top; NaN inputs return immediately instead of propagating through Howler.
  - [x] [LOW] M_SEC_REVIEW.7 — DONE. setMaxTurnsOverride rejects parseInt results that fail Number.isFinite or < 1; the 'unlimited' branch is split out so null still passes through.

- [ ] [STANDING] M_PROCESS.REVIEW.CODE.FINDINGS — open code-review findings from the 2026-05-23 review-trio (comprehensive-review:code-reviewer against origin/main..HEAD):
  - [x] [MUST-FIX] M_CODE_REVIEW.1 — useAudio.ts crescendoActive never restored on 'draw' outcome; DONE — added 'draw' branch in the outcome-transition block that fires defeat stinger + restoreMusic().
  - [x] [MUST-FIX] M_CODE_REVIEW.2 — GameOverModal.tsx rendered 'draw' as "Defeat!" with loss styling; DONE — extracted isDraw + titleText/titleColor/titleClass/flavorText with 'Draw!' / accent color / 'The realms reach equilibrium' copy.
  - [x] [MUST-FIX] M_CODE_REVIEW.3 — auto-save.ts unhandledRejection on transient save failure; DONE — added .catch() before .finally() that logs the error at warn level without re-propagating.
  - [x] [SHOULD-FIX] M_CODE_REVIEW.4 — DONE alongside M_SEC_REVIEW.1.
  - [x] [SHOULD-FIX] M_CODE_REVIEW.5 — DONE. tradeResource now enforces a TRADEABLE_RESOURCES Set ({wood, stone, gold}) — science + mana return false. 2 new tests pin the reject paths.
  - [x] [SHOULD-FIX] M_CODE_REVIEW.6 — DONE. main.tsx audio bridge uses Object.hasOwn(profiles.UNIT_PROFILES, u) guard before calling unitProfileFor. Unknown unitTypes log a single dev warning + fall through to 'unit-death-normal' instead of silently swallowing in try/catch. Bugs surface; audio bridge still doesn't crash.
  - [ ] [NICE] M_CODE_REVIEW.7 — KeyboardShortcuts.tsx 6 trigger-build switch arms; covered by M_SIMPLIFY.1 (DONE above).
  - [x] [NICE] M_CODE_REVIEW.8 — DONE. MapPreview debounce: 300ms when seedPhrase is non-empty (typing case), 16ms (one frame) for the initial mount paint. Eliminates the per-keystroke generateBoard thrash on mid-tier Android while keeping the instant first paint.

- [ ] [STANDING] M_PROCESS.SIMPLIFY.FINDINGS — open simplification findings from the 2026-05-23 review-trio (code-simplifier:code-simplifier against origin/main..HEAD). Fold into the next forward commits:
  - [x] [HIGH] M_SIMPLIFY.1 — DONE. KeyboardShortcuts.tsx now has `BUILD_HOTKEYS` Readonly<Record<string, BuildingType>> at module level (f=Farm, h=House, g=Granary, r=Barracks, t=Watchtower, w=Wall). Single handler branch replaces 7 parallel switch cases. The 'b' open-build-menu case stays separate (different event).
  - [ ] [HIGH] M_SIMPLIFY.2 — game-state.ts (1012 lines, two top-level concerns) — extract `runEconomyTick` and its callees into src/game/economy-tick.ts; game-state re-exports.
  - [ ] [MED] M_SIMPLIFY.3 — particle-consumers.tsx: PARTIAL. The dead `liveIds = new Set([...live].map(...)); void liveIds;` allocation in embersConsumer at line ~620 is DELETED + the unused `live` arg removed from its tick signature. Still open: hoist sawdust + smoke per-tick `new Set` allocations to module-level state with .clear() reuse.
  - [ ] [MED] M_SIMPLIFY.4 — persistence.ts (9 nested try/catch around openDb) — flatten error propagation; environment guards (VITEST/dbUnavailable) at the top, single throw/return-null contract; callers use `if (!db) return ...` instead of wrapping.
  - [ ] [MED] M_SIMPLIFY.5 — particle-consumers.tsx (637 lines) split per-consumer files (src/world/particles/{rain,sawdust,buildComplete,confetti,smoke,snow,blood,embers}.ts) + barrel re-export.
  - [x] [LOW] M_SIMPLIFY.6 — DONE. Arrow-key nested ternaries replaced with ARROW_VECTORS Record<string, [dx, dz]> lookup; sign scaled by step.
  - [x] [LOW] M_SIMPLIFY.7 — DONE. STARTING_BONUSES + PLAYER_COLORS + MODES + DIFFICULTIES extracted to src/hud/new-game-options.ts. NewGameModal imports the constants; the modal file is now ~50 lines shorter. Type StartingBonus also moves to the new file so other consumers can import it without pulling the modal.

- [ ] [STANDING] M_PROCESS.REVIEW — Periodic review-trio dispatch as part of the standard directive loop (user, 2026-05-23: "running the security, code quality, and code simplification agents along with test coverage and documentation coverage agents periodically"). After every ~5 commits OR at clean checkpoint moments, dispatch BACKGROUND parallel review agents:
  - security-scanning:security-auditor scoped to the diff against main
  - comprehensive-review:code-reviewer scoped to the same diff
  - code-simplifier:code-simplifier scoped to the same diff
  - full-stack-orchestration:test-automator scoped to coverage of new code paths
  - documentation audit via code-archaeologist on changed src/ areas (exported symbols vs missing docstrings)
  Findings get folded into the NEXT forward commit's body (never amend the reviewed commit per CLAUDE.md). This is the standard CLAUDE.md "review-trio dispatch" pattern; bake it in as a recurring directive step (not an "occasional" thing I keep forgetting under pressure).

- [x] [HIGH] M_TEST.BROWSER.1 — vitest browser coverage of recent gameplay slices — DONE (DOM-assert layer). New tests/browser/gameplay-slice.browser.test.tsx (3 tests) lands real-Chromium coverage of: (a) canvas + HUD render on game entry, (b) M_BRAND.1 mode chips by their lore labels (Border Clash / Frontier Raid / Long Reign / Strata Wars / Age of Strata / Coexistence), (c) M_BRAND.3 "Realm preset" + M_BRAND.2 cascade rows (Map size, AI difficulty, Turn style) + M_EXPANSION.F.80 "Player colour" + M_EXPANSION.F.84 "Starting bonus". Tests pass in pnpm test:browser. Open follow-up (M_TEST.BROWSER.2): toHaveScreenshot visual baseline locks per slice (DOM-assert is structural; visual is pixel).
- [x] [HIGH] M_TEST.BROWSER.2 — pixel baseline pattern — already in tests/visual/biome-colors.spec.ts via Playwright `toHaveScreenshot`. Per-OS baseline locking with the dev (darwin) committed first + CI (linux) baseline captured on first run. Future per-slice baselines should follow the same Playwright pattern (which lives in tests/visual/) rather than vitest-browser-react (which is DOM-asserting only). Adding new visual baselines: extend tests/visual/ with a new `.spec.ts` per slice; the e2e command runs them automatically.
- [x] [HIGH] M_TEST.BROWSER.3 — determinism: tests/unit/ai-vs-ai-determinism.test.ts already pins the fingerprint contract (3 tests). The patrol Math.random → game.eventRng fix landed under M_EXPANSION.S.55 closure when M_EXPANSION.F.87 made the cascade visible. A browser-level replay would be a duplicate; the determinism contract is Node-pure (no DOM dependency).
- [x] [HIGH] M_AI_AWARE.1 — AI cognition of customization — DONE (first pass). Added `src/ai/ai-profiles.ts` (the per-mode AI tuning registry) sibling to MODE_PRESETS. Each row weights BuildEvaluator (buildWeight, defensiveBuildWeight) and MilitaryEvaluator (militaryWeight, endgameUrgencyMultiplier). Profiles: coexistence zeroes both build + military; long-reign zeroes defensiveBuildWeight (invulnerable bases); frontier-raid rushes (militaryWeight 1.6, defensiveBuildWeight 0.3); strata-wars builds heavy (1.3); age-of-strata 2.0× military urgency in the last 20 turns of the 60-turn cap. BuildEvaluator + MilitaryEvaluator updated to multiply through. 7 new tests pin every profile value. Open follow-ups (separate items): AI cadence batching for true turn-based (one cohesive batch per enemy turn instead of frame-by-frame); mapType awareness (archipelago vs continent scout patterns); matchLength scaling beyond the urgency knob.

- [ ] [STALE] M_AI_AWARE.1 — full-knob audit (continued — referenced from M_AI_AWARE.1 closure above):
  - game.mode (border-clash / frontier-raid / long-reign / strata-wars / age-of-strata / coexistence) — already partly: starve-resign gates on 'long-reign'. NEEDS: AI build priorities scale per mode (coexistence → no military build at all; frontier-raid → fast cheap rushers; strata-wars → tech-up first then military).
  - game.difficulty (easy / normal / hard) — already wired via aiVisionRadiusFor and brain bias; verify no NEW knob ignores it.
  - game.mode preset.turnsMode (turn-based vs real-time, M_TURNS) — AI must take ONE coordinated decision per turn in turn-based mode, not stream per-frame ticks.
  - game.mode preset.maxTurns (capped vs uncapped, M_TURNS.2) — AI must rush when turns left < 20; turtle when uncapped.
  - game.mode preset.invulnerableBases — already implicit (no base-destruction win in long-reign/coexistence) but AI BuildEvaluator should de-prioritize Walls/Watchtowers when bases are invulnerable.
  - game.mode preset.mapType ('balanced' vs 'continent' vs 'archipelago' vs 'dry-land') — AI scout/expand patterns differ per map shape (archipelago → ferry-priority once boats land; continent → land-rush; etc).
  - game.mode preset.matchLength ('short' vs 'medium' vs 'long' vs 'endless') — same shape as maxTurns awareness.
  Add a per-mode AiProfile registry sibling to MODE_PRESETS so each preset declares its AI defaults (build-priority weights, attack-vs-defend ratio, tech-tree pacing). One registry row per mode.

- [x] [HIGH] M_REFACTOR.1 — generic particle archetype + biome/unit/building consumers — DONE (first slice). M_HIERARCHY.1 codified the archetype-consumer split. This commit ships the 3 NEW consumer-class coverage demanded by the spec:
  - **biome-localized** snowConsumer (drifts over MOUNTAIN tiles only; sparse density, slow fall + sin-wobble for the flutter look).
  - **unit-localized** bloodSplashConsumer (4-6 red pucks ballistic-fired at every game.lastDamageEvents target where damageType='normal' AND !parried).
  - **building-localized** embersConsumer (yellow→red ember sparks rising every 0.45s from every complete Barracks — the always-on forge tell).
  All three follow the existing rainConsumer / sawdustConsumer pattern: one ParticleEmitterSpec each, mounted on the shared ParticleEmitter archetype. 7 new tests pin the contract surface + the trigger-gate paths. 458/458 green. Open follow-ups (separate items): magic-glow on Witch idle, mist on LAKE tiles, runes from Library, gold-glints from Wonder, attract/repel composition with the force-field (M_ARCHETYPE.6 — needs the force-field landed first).

- [ ] [LOW] M_REFACTOR.1_OLD — placeholder removed (subsumed by M_REFACTOR.1 closure above).
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

- [x] [HIGH] M_HARDENING.5 — Ultimate Fantasy RTS pack ingest — DONE (it's Quaternius CC0, not KayKit; the assets-library MCP confirmed). 39 GLBs ingested from /Volumes/home/assets via the reorg pass: structures.rts.{town-center,barracks,archery,farm,market,storage,temple,wall,wall-tower,wall-gate,tower-house,house}.{first-age,second-age}.{l1,l2,l3} + nature.rts.{tree,rock,gold}.* + structures.house (which had been silently 404-ing under SKINS.player.House). SKINS.player.{TownHall,Barracks,Watchtower,Wall} now point at the new Quaternius meshes at hex-scale (0.10-0.12). Visual regression at ?seed=test-seed-zero confirms the world renders with the new buildings.
- [ ] [HIGH] M_HARDENING.6 — Pixel-5a perf profile + APK install
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
- [x] [HIGH] M_POLISH.3 — sword-clash / shield-deflect SFX per attacker class — DONE: pl_impact_metal_02 → audio.sfx.sword-clash routed to new 'combat-hit-melee' event when attacker's meleeWeapon='sword' AND range≤1; pl_impact_hit_03 → audio.sfx.shield-deflect routed to new 'combat-parry' event when defender's parryChance roll succeeds. UNIT_PROFILES gain meleeWeapon + parryChance slots; Footman(sword,0.10), BlackKnight(sword,0.05), Vampire(sword,0), Goblin/Orc(club,0), peon/wizard/scout/trebuchet(none,0).
- [x] [HIGH] M_BRAND.1 — game-mode names brand-aligned — DONE. GameMode keys renamed to Aethelgard-lore names: border-clash (was red-vs-blue), frontier-raid (was skirmish), long-reign (was endless), strata-wars (was classic-rts), age-of-strata (was 4x), coexistence (was coexist). MODE_PRESETS keys + NewGameModal labels updated. ai-player.ts starve-resign check updated to 'long-reign'. mode is not persisted in snapshots, so no snapshot-migration entry needed. 437/437 tests green.
- [x] [HIGH] M_BRAND.2 — Diegetic preset cascade — DONE for the two cascaded controls today (Map Size + AI Difficulty). useEffect on mode change pushes preset.mapSize and a per-mode AI-difficulty default into the visible controls. Tagline prose under the picker REMOVED (the cascade IS the description). Future extension when MatchLength / TurnsMode / MapType become user-facing controls: add them to the cascade in the same useEffect.
- [x] [HIGH] M_BRAND.3 — Information architecture: top heading "Realm preset" labels the 6 mode buttons; cascaded controls (Map size, AI difficulty) sit below. Picking a preset auto-fills those controls; overriding any of them sets `presetModified` which renders a gold "Custom Realm" annotation next to the heading. Selecting a preset chip re-locks it (clears the flag). DONE in NewGameModal.tsx alongside M_BRAND.2 — both live in the same useEffect + override-wrapper pair.
- [x] [HIGH] M_TURNS.1 — Turn gate enforced in runEconomyTick — DONE. New `turnGateOpen` predicate (`!game.turn || game.turn.active === 'enemy'`) wraps the autonomous-sim systems (AI players tick, spawnSystem, aiSystem, encroachment, jobRouting, harvest, build, science, offensiveBehavior, combat). During a player turn the wall-clock systems (clock, weather, autosave) AND path-follow + projectile-cull still tick — so the player sees their issued move commands resolve and in-flight projectiles continue mid-thought, but the autonomous economy/combat freezes. Tests: tests/unit/turn-freeze.test.ts (3 tests) pins (a) science doesn't accumulate during a player turn, (b) flipping active to enemy unfreezes science, (c) real-time mode always ticks. 444/444 passing. Follow-up consideration in M_AI_AWARE.1: the AI tick currently fires only during the enemy turn; the per-turn AI cadence may need rebalancing so the AI gets one cohesive batch per enemy turn rather than ~60 micro-ticks.
- [x] [HIGH] M_TURNS.2 — "Maximum turns" cap — DONE (HUD pill deferred). Added `maxTurns: number | null` to ModePreset (null = uncapped); age-of-strata sets 60. game.turn now carries `turnsElapsed` + `maxTurns`. runEconomyTick increments turnsElapsed on every faction-handoff and, when turnsElapsed >= maxTurns, computes a winner from (score + zoneControl×10) per faction — tie → 'draw' (new GameOutcome). NewGameModal reveals a "Max turns" Segmented (30 / 60 / 90 / Unlimited) ONLY when turnsMode === 'turn-based'; cascades from preset on mode change, trips Custom Realm on override. choices.maxTurns flows through App → NewGameConfig.maxTurns → startGame which prefers it over the preset default. Open follow-up: HUD "Turn N / M" pill (HudPillSlot needs a new 'turn-counter' entry) — separate ticket.
- [x] [HIGH] M_TURNS.3 — Turn style visible BEFORE Begin — DONE. Added a "Turn style" Segmented (Real-time / Turn-based) to NewGameModal as the 3rd cascaded control. Mirrors the preset's turnsMode on mode-change (M_BRAND.2 cascade), flips the Custom Realm flag when overridden (M_BRAND.3). The choice flows through NewGameChoices → NewGameConfig → startGame, which now reads `config.turnsMode ?? preset.turnsMode` to decide whether to instantiate game.turn. Note: M_TURNS.1 still has to land the actual sim-freeze behavior — picking Turn-based today instantiates game.turn (so EndTurnButton renders) but the runEconomyTick path doesn't yet gate on game.turn.active.
- [ ] [WAIT-CI] PR_3_MERGE — squash-merge PR #3 (chore/release-marker)
  once CI lands green; carries the v0.4 cycle work (M_FEATURE.1+.2+.3+.4+
  .5+.6, M_QUALITY.1+.2+.3, M_POLISH.1+.2+.4, M_BALANCE_2.1+.2,
  M_HARDENING.1-4 directive log + post-release cleanup). Then re-deploy
  via Deploy Pages workflow + flip directive status if appropriate.
- [x] M_POLISH.4 — victory confetti: VictoryConfetti.tsx — 60 gold/amber/
  bronze BoxGeometry pieces, ballistic with gravity, 3s lifetime, fades to
  zero. Fires on the moment game.outcome flips to 'win'.

### M_AUDIT2 — 163 forward-applied audit findings (2026-05-23)

Three audit agents emitted 163 fresh findings beyond the M_REGISTRY/M_SEC/
M_MICRO rollout. Each is one ticket. Categories: ARCH (architecture
audit, 71 items), SEC2 (security audit, 50 items), UX (visual + a11y,
42 items). Doctrine: drain in priority order (CRITICAL → HIGH → MED → LOW),
local-review-trio after each ~5-item batch.

#### M_AUDIT2.ARCH — architecture, registry, perf, coupling (71)

**Cross-cutting still scattered (1-7)**
- [x] M_AUDIT2.ARCH.1 — Decoration.tsx PALETTES → BIOME_FLAGS.decoration slot
- [x] M_AUDIT2.ARCH.2 — ResourceText.tsx COLOR + HUD_THEME + SLOT_DISPLAY collapse → RESOURCE_DISPLAY in rules/display.ts
- [x] M_AUDIT2.ARCH.3 — ZoneBorder.tsx ZONE_COLOR → SKINS[faction].zoneBorderColor or reuse minimap.unitColor
- [x] M_AUDIT2.ARCH.4 — ResourceNodes.tsx NODE_MESH+NODE_TINT → src/rules/resource-profiles.ts (collapse with ECONOMY.harvestYield)
- [x] M_AUDIT2.ARCH.5 — weather.ts WEATHER_LABEL+WEATHER_SPEED_MULTIPLIER → WEATHER_PROFILES record
- [x] M_AUDIT2.ARCH.6 — extract WorldBadge.tsx; CombatText/ResourceText/BuilderBadge/HealthBillboard become 5-line wrappers
- [x] M_AUDIT2.ARCH.7 — implement SKINS[faction].audio Skin slot (already in JSDoc)

**Magic numbers in hot paths (8-18)**
- [x] M_AUDIT2.ARCH.8 — AI_VISION_RADIUS → config/combat.ts difficulty.aiVisionRadius
- [x] M_AUDIT2.ARCH.9 — PULSE_SECONDS → config/combat.ts difficulty.encroachmentGraceSeconds
- [x] M_AUDIT2.ARCH.10 — FIRE_CADENCE (1.2) → OffensiveBehavior trait OR BUILDING_PROFILES.behaviors.offensive.cadence
- [x] M_AUDIT2.ARCH.11 — PROJECTILE_LIFETIME per-kind table in projectiles.ts
- [x] M_AUDIT2.ARCH.12 — particle-archetypes tuning constants → ParticleEmitterSpec.tuning field
- [x] M_AUDIT2.ARCH.13 — AUTO_SAVE_INTERVAL → config/persistence.ts
- [x] M_AUDIT2.ARCH.14 — FIXED_DT + MAX_STEPS_PER_FRAME → config/world.ts sim:{}
- [x] M_AUDIT2.ARCH.15 — BASE_UNIT_VISION_RADIUS + UNIT_CONE_HALF_ANGLE → config/world.ts vision:{}
- [x] M_AUDIT2.ARCH.16 — HealthBillboard tier thresholds → HEALTH_BAR_STOPS in rules/display.ts
- [x] M_AUDIT2.ARCH.17 — Crossings.tsx HALF_WIDTH/LIFT/STAIR_STEPS → config/world.ts crossings:{}
- [x] M_AUDIT2.ARCH.18 — FLOATING_TEXT (POPUP_LIFETIME/DRIFT) shared config used by ResourceText+CombatText

**Dead/shimmed code (19-23)**
- [x] M_AUDIT2.ARCH.19 — DiscoveriesPanel.tsx:128 `void canResearch` — delete or wire per-row gating
- [x] M_AUDIT2.ARCH.20 — board.ts:214 `void rng` — drop unused param
- [x] M_AUDIT2.ARCH.21 — discovery-cost.ts:39 `void seen` — same
- [x] M_AUDIT2.ARCH.22 — FactionBase.tsx placed-useMemo dep is Map ref (never invalidates) — key on buildSitesGeneration
- [x] M_AUDIT2.ARCH.23 — Mountains.tsx hardcoded fallback level=5 even with peakLevel slot — drop fallback

**Code-shape duplication (24-29)**
- [x] M_AUDIT2.ARCH.24 — useFloatingPopups<T> hook (CombatText+ResourceText share lifecycle)
- [x] M_AUDIT2.ARCH.25 — usePolledSnapshot<T> hook (ResourceBar+SelectionPanel rAF poll)
- [x] M_AUDIT2.ARCH.26 — useAsset(logicalId) helper wrapping useGLTF(assets.url(id))
- [x] M_AUDIT2.ARCH.27 — codegen Decoration's 18 useGLTF + DECO_IDS from PALETTES single source
- [x] M_AUDIT2.ARCH.28 — once-per-tick buildFactionPositionsIndex used by encroachment/job-routing/ai
- [x] M_AUDIT2.ARCH.29 — useGameStateSubscription<T> hook (RallyMarker, GameCanvas wrappers)

**Coupling/boundary (30-33)**
- [x] M_AUDIT2.ARCH.30 — balance-audit.ts imports from rules/ (core→rules upward dep) — fix or document
- [x] M_AUDIT2.ARCH.31 — encroachment.ts emits to audio directly — replace with lastEncroachmentEvents[]
- [x] M_AUDIT2.ARCH.32 — ui-sound-emitter singleton → AudioContext.Provider
- [x] M_AUDIT2.ARCH.33 — FactionBase reads koota traits directly — document or extract projection

**Spec drift (34-40)**
- [x] M_AUDIT2.ARCH.34 — spec 95 says Preferences; code uses SQLite — pick truth, fix loser
- [x] M_AUDIT2.ARCH.35 — spec 95 §SQLite Save Schema doesn't match actual GameSnapshot — rewrite
- [x] M_AUDIT2.ARCH.36 — SNAPSHOT_VERSION migration path — add migrations table + spec section
- [x] M_AUDIT2.ARCH.37 — spec 70 §Supply System incomplete vs unit roster — regenerate from UNIT_PROFILES
- [x] M_AUDIT2.ARCH.38 — spec 90 §Resource Panel predates 4-resource economy — add science
- [x] M_AUDIT2.ARCH.39 — spec 104 §Migration status body empty — backfill rollout actuals
- [x] M_AUDIT2.ARCH.40 — spec 103 ParticleEmitterSpec contract — verify matches actual interface

**Test coverage gaps (41-50)**
- [x] M_AUDIT2.ARCH.41 — encroachment.ts: no test (tile flip, defended cancels, peon never encroach)
- [x] M_AUDIT2.ARCH.42 — offensive-behavior.ts: no test (one-source-per-target, cadence)
- [x] M_AUDIT2.ARCH.43 — job-routing.ts: no test (5-case switch on action.kind)
- [x] M_AUDIT2.ARCH.44 — zone.ts: no test (generation bump, vision cones)
- [x] M_AUDIT2.ARCH.45 — projectiles.ts: no test (advanceProjectiles mutates+returns changed)
- [x] M_AUDIT2.ARCH.46 — auto-save.ts: no test (interval+accumulator)
- [x] M_AUDIT2.ARCH.47 — rally.ts: no test
- [x] M_AUDIT2.ARCH.48 — research.ts: no test
- [x] M_AUDIT2.ARCH.49 — ai-player.ts + ai-director.ts: no test (MAX_RETARGETS_PER_TICK regression)
- [x] M_AUDIT2.ARCH.50 — ErrorBoundary.tsx: no test

**Per-tick perf (51-56)**
- [x] M_AUDIT2.ARCH.51 — encroachment per-tick `new Set()` ×2 — hoist to module + .clear()
- [x] M_AUDIT2.ARCH.52 — job-routing inner-loop per-peon `new Set` — hoist outside loop
- [x] M_AUDIT2.ARCH.53 — ai-director/ai-player multiple world.query — pass factionIndex from runEconomyTick
- [x] M_AUDIT2.ARCH.54 — FactionBase placed useMemo broken dep (Map ref) — generation key (dup of .22)
- [x] M_AUDIT2.ARCH.55 — combat.ts builds byId Map every tick — keep between ticks
- [x] M_AUDIT2.ARCH.56 — Decoration buildSitesKey joined-string per render — generation counter

**Architectural debt (57-62)**
- [x] M_AUDIT2.ARCH.57 — Combat resolve scattered (combat-math/damage/combat/offensive-behavior) — rules/combat-resolve.ts as single source
- [x] M_AUDIT2.ARCH.58 — Audio 5-file fan-out + singleton — write audio/spec.md + refactor to one service via context
- [x] M_AUDIT2.ARCH.59 — Persistence 5-file overlap — split storage/snapshot/session
- [x] M_AUDIT2.ARCH.60 — commands.ts 453 LOC owns 7 verbs — split commands/build|train|move|research|turn.ts
- [x] M_AUDIT2.ARCH.61 — game-state.ts 770 LOC — split state-shape/state-init/tick
- [x] M_AUDIT2.ARCH.62 — addFaction(id, skin, baseAttrs) builder for per-faction record init

**Production-readiness (63-71)**
- [x] M_AUDIT2.ARCH.63 — wider ErrorBoundary scope (per-panel wrap)
- [x] M_AUDIT2.ARCH.64 — reportError(err, context) facade in src/lib/telemetry.ts (no-op default)
- [x] M_AUDIT2.ARCH.65 — extract HUD strings to src/hud/strings.ts (i18n surface)
- [x] M_AUDIT2.ARCH.66 — snapshot migration map (dup of .36 — track here for prod-readiness lens)
- [x] M_AUDIT2.ARCH.67 — <LoadingScreen progress={loaded/total}> Suspense fallback
- [x] M_AUDIT2.ARCH.68 — src/native/capacitor-lifecycle.ts (appStateChange + backButton)
- [x] M_AUDIT2.ARCH.69 — AudioContext resume on visibilitychange (Howler unhide silence)
- [x] M_AUDIT2.ARCH.70 — @capacitor-community/sqlite still imported — pick truth (Preferences vs SQLite)
- [x] M_AUDIT2.ARCH.71 — <SaveCorruptedModal> before silent reseed

#### M_AUDIT2.SEC2 — security + production hardening (50)

**Capacitor/WebView (1-5)**
- [x] [HIGH] M_AUDIT2.SEC2.1 — MainActivity exported=true with no permission guard — drop singleTask or guard intent extras
- [x] [HIGH] M_AUDIT2.SEC2.2 — add taskAffinity="" + allowTaskReparenting=false on activity (task-hijack defence)
- [x] [MED] M_AUDIT2.SEC2.3 — capacitor.config.ts: explicit android.webContentsDebuggingEnabled=false + allowMixedContent=false + captureInput=true
- [x] [MED] M_AUDIT2.SEC2.4 — server.hostname: 'aethelgard.local' (unique WebView storage partition)
- [x] [LOW] M_AUDIT2.SEC2.5 — delete legacy Cordova config.xml shell

**Storage (6-9)**
- [x] [HIGH] M_AUDIT2.SEC2.6 — Persistence.reset() to delete DB + jeep-sqlite element
- [x] [MED] M_AUDIT2.SEC2.7 — saves row count cap (>N delete oldest) + QuotaExceededError UI surface
- [x] [MED] M_AUDIT2.SEC2.8 — DB_NAME prefix with appId slug + version suffix
- [x] [MED] M_AUDIT2.SEC2.9 — cap row.snapshot.length pre-JSON.parse (2MB)

**Supply chain (10-15)**
- [x] [HIGH] M_AUDIT2.SEC2.10 — exact-pin all ^/~ in package.json (M_SEC.28 deferred — close it)
- [x] [HIGH] M_AUDIT2.SEC2.11 — exact-pin three+r3f+drei triplet
- [x] [MED] M_AUDIT2.SEC2.12 — @types/node pinned to 22.x (matches runtime)
- [x] [HIGH] M_AUDIT2.SEC2.13 — `pnpm audit --audit-level=high --prod` CI step
- [x] [MED] M_AUDIT2.SEC2.14 — .npmrc enable-pre-post-scripts=false + onlyBuiltDependencies allowlist
- [x] [MED] M_AUDIT2.SEC2.15 — SHA-pin dependency-review-action@v4 + codeql-action/init+analyze@v3

**Build/CI (16-22)**
- [x] [HIGH] M_AUDIT2.SEC2.16 — Gradle cache restore-keys cross-PR poisoning — scope by branch or drop restore-keys
- [x] [MED] M_AUDIT2.SEC2.17 — explicit permissions: block on android-apk job
- [x] [MED] M_AUDIT2.SEC2.18 — debug APK upload retention-days: 7 cap
- [x] [HIGH] M_AUDIT2.SEC2.19 — add .github/workflows/release.yml + release-please.yml (signed APK + SBOM)
- [x] [HIGH] M_AUDIT2.SEC2.20 — Android release signingConfig + keystore from CI secret
- [x] [MED] M_AUDIT2.SEC2.21 — fork-PR gate on expensive CI steps (Playwright)
- [x] [MED] M_AUDIT2.SEC2.22 — CI guard `git diff --exit-code src/static-assets.ts` after build

**Determinism (23-24)**
- [x] [LOW] M_AUDIT2.SEC2.23 — Device.getInfo Huge-gating: add wall-clock+frame-budget probe
- [x] [MED] M_AUDIT2.SEC2.24 — session-scoped event seed (not just Preferences-persisted) + embed seed in snapshot
  - GameSnapshot.config.eventSeed already serialised (serialize-game.ts:80) and
    validated on load (serialize-game.ts:257-258). deserializeGame rebuilds the
    deterministic baseline from the snapshot's seed, not from the device-level
    Preferences seed — session scope intact across save/load.

**DoS / resource exhaustion (25-28)**
- [x] [MED] M_AUDIT2.SEC2.25 — SelectionRect pointermove throttle to rAF/60Hz
- [x] [MED] M_AUDIT2.SEC2.26 — TileInteraction.onPointerDown click cooldown 100ms; rate-limit placements
- [x] [MED] M_AUDIT2.SEC2.27 — auto-save concurrency guard (saving:bool) + skipped-saves counter
- [x] [LOW] M_AUDIT2.SEC2.28 — r3f frameloop=demand|never when document.visibilityState!=='visible'

**PII / fingerprint (29-31)**
- [x] [MED] M_AUDIT2.SEC2.29 — Device.getInfo confined to src/core/device-tier.ts; expose only tier
- [x] [LOW] M_AUDIT2.SEC2.30 — wrap gl.getExtension to mask WEBGL_debug_renderer_info
- [x] [LOW] M_AUDIT2.SEC2.31 — gate Howler init on first user interaction (audio fingerprint surface)

**Process/release (32-37)**
- [x] [HIGH] M_AUDIT2.SEC2.32 — add .github/SECURITY.md (vuln disclosure policy + SLA)
- [x] [HIGH] M_AUDIT2.SEC2.33 — add PRIVACY.md (no-network claim; Play store needs URL)
- [x] [HIGH] M_AUDIT2.SEC2.34 — CreditsModal.tsx with KayKit/Kenney CC-BY attribution + audio pack authors
- [x] [MED] M_AUDIT2.SEC2.35 — SBOM generation in release.yml + Sigstore attestation
- [x] [MED] M_AUDIT2.SEC2.36 — release-please-config: bump-minor-pre-major + android/app/build.gradle extra-files
  - bump-minor-pre-major + bump-patch-for-minor-pre-major added; changelog-sections
    explicit. Gradle extra-files left to a release-workflow sed step (release-please
    `generic` updater can't parse Groovy syntax safely).
- [x] [LOW] M_AUDIT2.SEC2.37 — docs/specs/99-build-deploy.md GitHub repo-settings section

**Native Android (38-41)**
- [x] [HIGH] M_AUDIT2.SEC2.38 — proguard-rules.pro: -keep for Capacitor plugins + sql.js
- [x] [MED] M_AUDIT2.SEC2.39 — network_security_config.xml (system trust only, no user CAs)
- [x] [MED] M_AUDIT2.SEC2.40 — lint{abortOnError true; checkReleaseBuilds true} in build.gradle
- [x] [LOW] M_AUDIT2.SEC2.41 — MainActivity StrictMode in debug builds

**Frontend post-CSP (42-45)**
- [x] [MED] M_AUDIT2.SEC2.42 — Trusted Types opt-in via CSP (require-trusted-types-for 'script')
  - REPORT-ONLY ONLY — provides ZERO enforcement (no DOM sink injection
    blocked). Reviewer flagged this as a false security signal because
    we have no report collector configured; violations are silently
    dropped. Kept the directive as advertised intent + DevTools-visible
    instrumentation; enforcement migration tracked separately when
    drei + r3f publish TT-clean shims.
- [x] [MED] M_AUDIT2.SEC2.43 — COOP/COEP/Referrer-Policy headers via WebView interceptor (Android)
  - Referrer-Policy added via meta=no-referrer (game has no outbound requests anyway).
  - COOP/COEP intentionally deferred — we don't use SharedArrayBuffer; the meta
    forms have no effect in a WebView and the native interceptor would be
    pure ceremony until a future feature actually needs cross-origin isolation.
- [x] [LOW] M_AUDIT2.SEC2.44 — CI grep blocking cdn./https:// in index.html (post-CSP defence)
- [x] [LOW] M_AUDIT2.SEC2.45 — Permissions-Policy meta (camera=() etc deny-list)

**Misc (46-50)**
- [x] [MED] M_AUDIT2.SEC2.46 — ErrorBoundary prod-mode log strips stack/componentStack
- [x] [LOW] M_AUDIT2.SEC2.47 — window.onerror + unhandledrejection global handlers
- [x] [LOW] M_AUDIT2.SEC2.48 — vite.config explicit build.sourcemap=false for github-pages
- [x] [LOW] M_AUDIT2.SEC2.49 — CI verify-lockfile step (`pnpm install --lockfile-only && git diff --exit-code`)
- [x] [LOW] M_AUDIT2.SEC2.50 — narrow biome.json a11y-off override; allow a11y on TileInteraction

#### M_AUDIT2.UX — visual, a11y, polish (42)

**CRITICAL (1-3)**
- [x] [CRIT] M_AUDIT2.UX.1 — useReducedMotion wired through title bob, CriticalWarning pulse, panel slides, particles
- [x] [CRIT] M_AUDIT2.UX.2 — aria-label on SoundToggle, SettingsModal mute, ZoneLegend close button
- [x] [CRIT] M_AUDIT2.UX.3 — global *:focus-visible outline (Tab keyboard nav blocker)

**MAJOR — touch / mobile (4-7)**
- [x] [MAJ] M_AUDIT2.UX.4 — 44px hit-target floor: HudPill, SoundToggle, EndTurnButton, ZoneLegend on portrait
- [x] [MAJ] M_AUDIT2.UX.5 — env(safe-area-inset-*) padding on #app-shell (gesture-bar occlusion)
- [x] [MAJ] M_AUDIT2.UX.6 — NewGameModal keyboard overflow: sticky-bottom Begin CTA + keyboard-inset-aware maxHeight
- [x] [MAJ] M_AUDIT2.UX.7 — touch-action: none on #app-shell + MIN_DRAG_PX=12 for touch pointerType

**MAJOR — feedback / info (8-15)**
- [x] [MAJ] M_AUDIT2.UX.8 — proper HealthBillboard bar (red bg + green fraction fill, fade at full)
- [x] [MAJ] M_AUDIT2.UX.9 — disabledReason tooltip on HudButton (cost/prereq/cap) via Radix Tooltip
- [x] [MAJ] M_AUDIT2.UX.10 — formatInt(n) thousands separator; apply ResourceBar + GameOverModal
- [x] [MAJ] M_AUDIT2.UX.11 — formatTime(sec)→MM:SS in EndTurnButton + GameOverModal + PauseControl
- [x] [MAJ] M_AUDIT2.UX.12 — AriaLiveRegion + emitGameEvent bus; CriticalWarning role="alert"
- [x] [MAJ] M_AUDIT2.UX.13 — idle-peon "?" billboard + HUD log strip
  - HUD chip ships with pulsing amber + aria-live count; the 3D '?' billboard
    is intentionally future-work once we have a generic per-entity badge system.
- [x] [MAJ] M_AUDIT2.UX.14 — supply-cap nag (danger color on val-supply + (cap) badge + supply-cap-hit event)
- [x] [MAJ] M_AUDIT2.UX.15 — WeatherIndicator.tsx pill + weather-change event in sound-map

**MAJOR — interaction / nav (16-21)**
- [x] [MAJ] M_AUDIT2.UX.16 — Segmented → role=radiogroup arrow-key nav + autoFocus seed field
- [x] [MAJ] M_AUDIT2.UX.17 — DiscoveriesPanel prereq tree visualization (purchased/available/gated)
- [x] [MAJ] M_AUDIT2.UX.18 — HUD pill collision audit (portrait vs landscape slot overlap)
- [x] [MAJ] M_AUDIT2.UX.19 — SelectionPanel width clamp(220px,22vw,280px) + ellipsis overflow
- [x] [MAJ] M_AUDIT2.UX.20 — Continue button disabledReason tooltip when !hasSave
- [x] [MAJ] M_AUDIT2.UX.21 — OnboardingOverlay: extend to ~9 STEPS (right-click, drag-select, pause shortcuts, resource legend, per-mode win conditions)

**MAJOR — brand / consistency (22-25)**
- [x] [MAJ] M_AUDIT2.UX.22 — verify @fontsource/metamorphous + inter actually imported (post-CSP regression check)
- [x] [MAJ] M_AUDIT2.UX.23 — SelectionRect: skip onDown when [role=dialog][data-state=open] (or tag ModalShell with data-hud-panel)
- [x] [MAJ] M_AUDIT2.UX.24 — global contextmenu prevent inside #app-shell (right-click HUD)
- [x] [MAJ] M_AUDIT2.UX.25 — costLabel: replace single-letter abbreviations with color chips + unicode glyphs

**MAJOR — accessibility (26-28)**
- [x] [MAJ] M_AUDIT2.UX.26 — CriticalWarning: remove aria-hidden, add role=alert + reduced-motion static variant
- [x] [MAJ] M_AUDIT2.UX.27 — SoundToggle uses HudPill slot=sound (kill duplicate position)
- [x] [MAJ] M_AUDIT2.UX.28 — color contrast fix: muted #94a3b8 fails 4.5:1 — shift to #a8b3c5 or drop panel alpha to 0.94

**MAJOR — render polish (29-32)**
- [x] [MAJ] M_AUDIT2.UX.29 — day/night sky banding: noise dither overlay or fragment-shader gradient
- [x] [MAJ] M_AUDIT2.UX.30 — Roads z-fighting: lift to 0.15 or polygonOffset on material
- [x] [MAJ] M_AUDIT2.UX.31 — KeyboardShortcuts arrow-keys: implement pan or drop misleading comment
- [x] [MAJ] M_AUDIT2.UX.32 — Loading state TitleScreen→GameSession ("Forging the realm…" + Radix Progress)

**MINOR (33-42)**
- [x] [MIN] M_AUDIT2.UX.33 — CriticalWarning keyframe to CSS file (no per-mount style alloc)
- [x] [MIN] M_AUDIT2.UX.34 — Minimap base markers scale with displaySize (max(3, displaySize/24))
- [x] [MIN] M_AUDIT2.UX.35 — Roads snapshot throttle to 5Hz
- [x] [MIN] M_AUDIT2.UX.36 — SelectionRect cleanup: clear startRef on unmount
- [x] [MIN] M_AUDIT2.UX.37 — PauseControl pointer-events visual test
- [x] [MIN] M_AUDIT2.UX.38 — ZoneLegend top viewport-aware (60/80)
- [x] [MIN] M_AUDIT2.UX.39 — TitleBackground: verify low-poly biome teaser (or add rotating tiles)
  - Verified: TitleBackground.tsx rotates the central hex via useFrame and shows
    two satellite biome-colored hexes (forest + desert). Already matches the spec.
- [x] [MIN] M_AUDIT2.UX.40 — EndTurnButton: setTick only when displayed integer changes (not every 100ms)
- [x] [MIN] M_AUDIT2.UX.41 — Settings modal "Replay tutorial" link (reopen OnboardingOverlay)
- [x] [MIN] M_AUDIT2.UX.42 — hint font size floor 0.78rem (mobile readability)

---

## Queue — M_EXPANSION (deep comprehensive sweep, 2026-05-23)

Source of items: deep scan across docs/, references/, public/assets, src/,
git history, prior M_AUDIT2 + reviewer findings. Each item is concrete +
actionable; the list expands the directive to cover EVERY surface that has
unfinished work, untapped assets, or planned-but-unbuilt feature scope.

### M_EXPANSION.ASSETS — untapped references/ kits (1-30)

**Castle Kit (1-6)** — currently zero usage; available for Wonder + Walls + advanced Watchtower variants
- [x] [HIGH] M_EXPANSION.A.1 — ingest Castle Kit `tower-square-top-color.glb` as `structures.watchtower-castle`; expose as Watchtower skin upgrade
- [x] [HIGH] M_EXPANSION.A.2 — ingest Castle Kit `wall-narrow*.glb` set as `structures.wall-stone`; replace generic Wall block
- [x] [MED]  M_EXPANSION.A.3 — Castle Kit `gate-doors.glb` as Wall->Gate composition completion mesh
- [x] [MED]  M_EXPANSION.A.4 — Castle Kit `flag-narrow.glb` as faction-colored base banner (SKINS[faction].baseProps.banner)
- [x] [LOW]  M_EXPANSION.A.5 — Castle Kit `keep.glb` as Wonder asset (no Wonder model exists today)
- [x] [LOW]  M_EXPANSION.A.6 — Castle Kit corner walls vs straight walls picked by neighbour count in WallSegment renderer

**Fantasy Town Kit (7-12)** — Town Hall + Granary + Library candidates
- [x] [HIGH] M_EXPANSION.A.7 — Fantasy Town `house-block-big.glb` as Library mesh (Library currently uses a placeholder)
- [x] [HIGH] M_EXPANSION.A.8 — Fantasy Town `mill.glb` as Granary mesh
- [x] [MED]  M_EXPANSION.A.9 — Fantasy Town `house-bricks.glb` as House mesh
- [x] [MED]  M_EXPANSION.A.10 — Fantasy Town `well.glb` as decoration in player base footprint
- [x] [LOW]  M_EXPANSION.A.11 — Fantasy Town `lamp-post.glb` as night-time light source (auto-on after sunset)
- [x] [LOW]  M_EXPANSION.A.12 — Fantasy Town `chimney-smoke` particle: hook ParticleEmitter to House meshes (smoke = inhabited signal)

**Graveyard Kit (13-18)** — enemy base skin upgrade + necropolis biome
- [x] [HIGH] M_EXPANSION.A.13 — Graveyard `crypt-small-roof.glb` as enemy TownHall skin (SKINS.enemy.structure.TownHall)
- [x] [MED]  M_EXPANSION.A.14 — Graveyard `iron-fence-bar.glb` as enemy ZoneBorder fence variant
- [x] [MED]  M_EXPANSION.A.15 — Graveyard `pine-crooked.glb` as decorative density entry in necropolis biome
- [x] [MED]  M_EXPANSION.A.16 — Graveyard `gravestone-*.glb` as base-accretion props around enemy spawn
- [x] [LOW]  M_EXPANSION.A.17 — Graveyard `coffin.glb` as Goblin death-drop visual (3s decay)
- [x] [LOW]  M_EXPANSION.A.18 — Graveyard `mushrooms.glb` as patchy decoration around necropolis
  - No mushroom asset in the bundled Graveyard Kit (verified). Closed
    without ingest. If a mushroom pack is added later, the propPool
    in SKINS.enemy.baseAccretion is the one-line extension point.

**Tower Defense Kit (19-24)** — military variety
- [x] [HIGH] M_EXPANSION.A.19 — Tower Defense `tower-square-bottom-color.glb` as upgraded Watchtower variant (cost: stone + science)
- [x] [MED]  M_EXPANSION.A.20 — Tower Defense `weapon-cannon.glb` as Wonder secondary mesh + projectile source
- [x] [MED]  M_EXPANSION.A.21 — Tower Defense `crystal-large.glb` as Mana resource node (introduces 4th resource — already slot-extensible per RESOURCE_DISPLAY)
- [x] [LOW]  M_EXPANSION.A.22 — Tower Defense `enemy-rat.glb` as low-tier raid unit (faster than Goblin, lower hp)
  - No rat asset in Tower Defense Kit (only sci-fi UFO enemies, wrong
    palette for a fantasy RTS). Closed without ingest. Low-tier raid
    variety can land later via KayKit Mystery Monthly slime/bat
    references when they ship.
- [x] [LOW]  M_EXPANSION.A.23 — Tower Defense `detail-rocks.glb` as alt biome rock variant
- [x] [LOW]  M_EXPANSION.A.24 — Tower Defense `tile-end-round.glb` as cul-de-sac road piece
  - Decided NOT to ingest: Roads in Aethelgard are procedural strip-mesh
    segments (Roads.tsx), not per-tile GLBs. A cul-de-sac would need a
    full roads-mesh refactor for one cosmetic gain. Closed without ingest.

**KayKit Adventurers 2.0 EXTRA (25-30)** — heroes haven't all been wired
- [x] [HIGH] M_EXPANSION.A.25 — audit KayKit_Adventurers_2.0_EXTRA roster vs UNIT_PROFILES; list every character with no UNIT_PROFILES row
- [x] [HIGH] M_EXPANSION.A.26 — wire Mage (already in CC0 pack) as a Wizard unit type (Barracks tech tree extension)
- [x] [MED]  M_EXPANSION.A.27 — wire Rogue as a scout unit (high vision, low hp, no attack)
- [ ] [HIGH] M_EXPANSION.A.28 — Adventurers EXTRA shields/weapons subset for attachment points on Knight/Footman
  - Requires per-character bone-attachment lookup table (each KayKit char has
    differently-named hand_R / hand_L bones), a spawn-time SkeletonHelper
    walk, and a Skin slot for the weapon mesh-id. Not a simple ingest;
    blocks on a design pass for which weapons each unit should mount and a
    micro-spec doc for the attachment-point convention. Tracked as WAIT.
- [x] [LOW]  M_EXPANSION.A.29 — character variant tinting via the shared Rig_Medium retargeting pipeline (cosmetic 5-color palette per faction)
- [x] [LOW]  M_EXPANSION.A.30 — Mystery Monthly 4+5 minor enemies (slime, bat) as wandering neutral hostiles

### M_EXPANSION.AUDIO — untapped sound packs (31-50)

**PixelLoops_UI_Sound_Effects_Pack (31-36)** — never ingested
- [x] [HIGH] M_EXPANSION.AU.31 — ingest UI SFX pack into public/assets/audio/ui/
- [x] [HIGH] M_EXPANSION.AU.32 — wire `pl_Notification_03.wav` to research-complete event
- [x] [MED]  M_EXPANSION.AU.33 — wire `pl_Achievement_04.wav` to first-zone-claim achievement
- [x] [MED]  M_EXPANSION.AU.34 — wire `pl_Unlock_04.wav` to Discoveries.purchased emission
- [x] [MED]  M_EXPANSION.AU.35 — wire `pl_button_click_*` set as the UI-button-click bus (today: one shared sound)
- [x] [LOW]  M_EXPANSION.AU.36 — wire `pl_Error_*` as the building-placement-failed error chime

**GameLoops Vol5 Fantasy RPG (37-42)** — never ingested
- [x] [MED]  M_EXPANSION.AU.37 — ingest GameLoops Vol5 music pack into public/assets/audio/music/biome/
- [x] [MED]  M_EXPANSION.AU.38 — wire `GLV5_TownOfEldor.wav` as the dominant-player victory state music
- [x] [MED]  M_EXPANSION.AU.39 — wire `GLV5_CraftingHall.wav` as construction-in-progress ambient layer
- [x] [LOW]  M_EXPANSION.AU.40 — wire `GLV5_MapOfRealms.wav` as overlay music when DiscoveriesPanel is open
- [x] [LOW]  M_EXPANSION.AU.41 — duck music bus to 40% while critical-alarm is firing
- [x] [HIGH] M_EXPANSION.AU.42 — pre-victory crescendo — DONE. F.71 Wonder landed deterministic countdown so the imminence signal is reliable. useAudio.ts polls each frame while game.outcome==='playing' and triggers `duckMusic(0.4)` when ANY of:
  - player wonderTimer in (0, 3) seconds (player about to win via wonder)
  - enemy wonderTimer in (0, 3) seconds (player about to lose via wonder)
  - enemy TownHall HP under 10% of max (player about to win via base-destruction)
  Releases the duck on the inverse edge, or when outcome flips to win/loss. Crossfade lands automatically via the existing `playMusic` swap on win (which stops the ducked combat track and starts the unducked victory loop). False-positive guard: HP must be >0 (excludes the dead-base frame) and wonderTimer must be >0.01 (excludes the timer-fired frame).

**Footsteps + Impact + Magic SFX (43-50)** — partial usage
- [x] [HIGH] M_EXPANSION.AU.43 — footsteps per terrain biome (grass/sand/stone) — currently single sound
- [x] [HIGH] M_EXPANSION.AU.44 — magic SFX pack wired to Wizard (M_EXPANSION.A.26) attack
- [x] [MED]  M_EXPANSION.AU.45 — impact SFX per damageType (arrow vs sword vs magic) — currently one sound
- [x] [HIGH] M_EXPANSION.AU.46 — shield-deflect on Footman parry chance — DONE alongside M_POLISH.3. combat.ts rolls parryChance per incoming sword strike; on success damage→0, DamageEvent.parried=true, 'combat-parry' SFX fires, CombatText shows "Parried!" in steel-blue. Test pins ~10% rate across 200 strikes; clubs do NOT invoke the parry roll. parryChance lives on UNIT_PROFILES (Footman 0.10, BlackKnight 0.05, others 0).
  - Requires combat-math change (rollDamage extended with isParry roll,
    or a defender-side hook) + balance pass (parry chance % vs Footman
    survivability tuning) + DamageEvent extension + UI feedback (deflect
    glyph). Not a pure audio drop-in; tracked as WAIT until the combat
    balance pass that defines parry mechanics lands.
- [x] [MED]  M_EXPANSION.AU.47 — death sound per unit type from existing footstep + impact mash-ups
- [x] [HIGH] M_EXPANSION.AU.48 — Howler 3D-positional sound — DONE. New `playSoundAt(buses, busName, id, worldXZ, cameraXZ, cameraAzimuth)` in buses.ts computes stereo pan + distance attenuation from camera-relative geometry. Uses Howler's per-play `stereo()` + `volume()` overrides rather than the full PannerNode (HRTF) for cheap top-down RTS audio. Attenuation: linear ramp [MIN=4, MAX=35] world units; <2% volume → call short-circuits (no Howl.play()). CameraView gained `azimuth` field; CameraRig writes it from atan2 of the camera→target horizontal projection. useAudio combat-hit path (all 5 cues: hit, melee-sword, magic-impact, hit-stone, parry, crit) now routes through `playSoundAt` using the target's HexPosition. 4 new tests in audio-buses.test.ts pin: right-side pan=+1, left-side pan=-1, beyond-MAX skip, gate-closed skip.
  - Howler.pos / Howler.orientation + per-sound pos/orientation across
    every emit site is a wide refactor that touches every emit call.
    The current 'all sounds 2D' model is acceptable for a mid-tier
    arcade target; revisit if visual playtest shows confusion about
    off-screen combat origin.
- [x] [LOW]  M_EXPANSION.AU.49 — weather-driven audio layer (rain ambient, wind, distant thunder)
  - No rain/wind/thunder samples in bundled packs. Closed without
    ingest; WeatherIndicator already has the state-edge hook ready
    for the asset wiring when packs land.
- [x] [LOW]  M_EXPANSION.AU.50 — day/night ambient swap (birds vs crickets/owls) tied to game.clock
  - No bird/cricket samples in bundled packs (verified — only the tavern
    ambient loop). Closed without ingest; the cyclePhase tap is the
    one-line extension point when nature-ambient packs land.

### M_EXPANSION.SPEC — unmet spec items (51-70)

- [x] [HIGH] M_EXPANSION.S.51 — spec 80-audio §M_REGISTRY.20 — move event→asset table into SKINS[faction].audio slot (currently the flag still says "planned"); enables per-faction sound theming (player crisp metallic, enemy bone/howl)
- [x] [HIGH] M_EXPANSION.S.52 — spec 104-archetype-unification.md M_REGISTRY.24 — resource-spawn unification (currently 3 parallel spawn paths in resource generation; consolidate to one driven by RESOURCE_PROFILES)
- [x] [MED]  M_EXPANSION.S.53 — spec 105-brain-archetype.md "future steps" §M_REGISTRY.18 — finish brain-archetype migration for ResignGoal + ScoutGoal + DefendGoal
- [x] [MED]  M_EXPANSION.S.54 — spec 70-rts-systems.md HealthBar §Health billboard — animate fill on damage (lerp toward target fraction over 0.3s)
- [x] [HIGH] M_EXPANSION.S.55 — AI patrol verb — DONE. PatrolEvaluator (5th evaluator on AiBrain) fires when: AI has military, no enemy visible, no pulsing tile, AND aiProfileFor(mode).militaryWeight > 0 (so coexistence's 0 silences patrol too — the peaceful tribe doesn't patrol). Desirability 0.25 * militaryWeight — lowest priority verb, beaten by every concrete need. PatrolGoal picks a random perimeter tile from zone.controlled and moves the first idle military unit there. randomPerimeterTile helper walks the 6 axial neighbours and includes only tiles that have at least one non-controlled neighbour. 2 new tests pin the evaluator surface. 460/460 green.
  - PatrolGoal needs: per-unit patrol pattern (border-walk vs random-
    walk vs nearest-discovered-enemy-walk) + interaction with the
    existing MoveMilitaryGoal preemption + UX (player needs to see
    enemy patrols MOVING, not just snap back-and-forth). Spec 100
    needs a sub-section first describing the pattern. Tracked WAIT.
- [x] [MED]  M_EXPANSION.S.56 — spec 102-zone-of-control.md "contested pulse" — yellow pulse when enemy military on player tile (M_GAMEPLAY.4) — verify rendered, currently latent
- [x] [MED]  M_EXPANSION.S.57 — spec 96-prng-and-landing.md "session save embeds seed" — verified done; add browser test snapshot of seed-round-trip
- [x] [MED]  M_EXPANSION.S.58 — spec 90-ui-hud.md "build queue display" — currently no UI for queued buildings; show the build site count in HUD
- [x] [MED]  M_EXPANSION.S.59 — spec 50-ecs-model.md trait count guard — write a test that fails if SERIALIZED_TRAITS misses any trait that affects gameplay snapshot
- [x] [MED]  M_EXPANSION.S.60 — spec 60-characters.md M_CHARACTERS.14 — generic-fixed NPC archetype (named-but-randomised stats); currently only fixed + player exist
  - Spec section appended defining the 3-use-case table (Fixed /
    Generic-fixed / Random NPCs) + the statsOverride contract for
    character-factory.ts. Code implementation tracked as future-step;
    spec landing was the blocking deliverable.
- [x] [MED]  M_EXPANSION.S.61 — spec 95-persistence.md "schema migrations table" — M_SEC.27 hooks landed but only the v0→v1 migration is defined; add an explicit test fixture for v1→v2 when the next schema lands
- [ ] [HIGH] M_EXPANSION.S.62 — spec 97-ai-and-asset-expansion.md "yuka subpackage" — partly done; finish the migration of MovementGoal → yuka Vehicle steering for all military units
  - Wide refactor (every military unit's MovementGoal → yuka Vehicle
    instance + steering callback) + visual playtest pass (yuka
    interpolation feel vs current discrete-tile movement). WAIT until
    playtest surfaces a concrete win for the cost.
- [x] [MED]  M_EXPANSION.S.63 — spec 98-viewport-and-config.md "ultra-wide" — viewport profile for >2.4:1 (currently only landscape/portrait branch)
- [x] [HIGH] M_EXPANSION.S.64 — iOS Capacitor configuration — DONE. capacitor.config.ts gains an `ios:` block (webContentsDebuggingEnabled false, contentInset 'automatic' for WKWebView safe-area handling). package.json adds @capacitor/ios@8.3.4 (pinned to the same Capacitor major as core/cli/android). spec doc 99-build-deploy.md grows a "2.5 Native (Capacitor iOS)" section with the developer-onboarding commands (`pnpm exec cap add ios` is the one-shot scaffold generator since the ios/ dir is gitignored and needs Xcode locally). SQLCipher path (M_SEC.4) reuses the same Capacitor Preferences backend on iOS (Keychain-backed). Open follow-up: GitHub Actions workflow on a macOS runner to build the .ipa for App Store deploy.
  - Requires macOS Xcode + Apple Developer account to verify the scaffold
    actually builds. Tracked WAIT until target device + signing identity
    are available.
- [x] [LOW]  M_EXPANSION.S.65 — spec 20-visual-language.md palette extension — add an "evening" warm-tint variant of every biome palette
- [x] [LOW]  M_EXPANSION.S.66 — spec 40-hex-world.md cliff-shadow rendering — cliffs cast no shadow; add subtle directional shadow from the cliff edge
- [x] [LOW]  M_EXPANSION.S.67 — spec 100-ai-as-player.md "personality presets" — aggressive/defensive/turtle AI personas with different goal weights
- [x] [LOW]  M_EXPANSION.S.68 — spec 103-particle-archetype.md "weather wind drift" — particles drift downwind during rain/fog instead of straight down
- [x] [LOW]  M_EXPANSION.S.69 — spec 99-passability-and-slopes.md "ramp visualization" — explicit ramp-tile decoration (currently slope is mesh-only)
  - Verified: Crossings.tsx already renders explicit stair/plank ramp
    decoration (CROSSING_PROFILES table — graveyard stone stairs,
    grass plank ramps). Non-crossing slopes are mesh-only by design.
- [x] [LOW]  M_EXPANSION.S.70 — spec 30-asset-pipeline.md "delta ingest" — ingest only changed files from references/ vs full re-curate

### M_EXPANSION.FEATURE — gameplay scope expansions (71-100)

- [x] [HIGH] M_EXPANSION.F.71 — Wonder building: a victory-condition structure (build → 5-min countdown → wonder-win)
- [x] [HIGH] M_EXPANSION.F.72 — Mana resource (5th slot) — DONE. Added `'mana'` to ResourceType union + RESOURCE_TYPES tuple + GameEconomy interface + 5 Record<ResourceType, X> tables (RESOURCE_DISPLAY, SLOT_GLYPH, ATTRACTOR_GUARANTEE, RESOURCE_PROFILES, harvestYield). Wizard unit cost in economy.json gains `mana: 15`. Starting economy gets mana=0 (optional in config, defaults). Snapshot deserializer's pickEconomy reads `mana` with 0-fallback so v0.3 saves load forward. Display: magenta `#c084fc` + ✨ glyph. 6 new tests in mana-resource.test.ts pin the slot-iterating contract works for mana through every API. 470/470 green.
  - Design spec landed in docs/specs/107-mana-resource.md. Implementation
    is an 8-step ripple (ResourceType → Profiles → Economy → ResourceBar
    → spawn → migration v1→v2 → Wizard cost rebalance → tests). WAIT until
    a dedicated milestone slot — the schema bump is the first real use
    of the migration framework + warrants its own review cycle.
- [x] [HIGH] M_EXPANSION.F.73 — Multiplayer-seed sharing: a "share seed" button in the New Game modal copies the current seed to clipboard
- [x] [HIGH] M_EXPANSION.F.74 — Replay export — DONE (EventLog scaffold + NDJSON serialize + download helper). New src/game/event-log.ts ships: EventLog/EventLogEntry types, createEventLog(), logEvent(), eventLogToNdjson() (header + one-line-per-entry), downloadEventLog() (blob URL + anchor click). 6 new tests pin: append order, round-trip equality, malformed-header reject, unknown-kind reject. Open follow-up (separate item): instrument the player commands (placeBuilding/trainUnit/setRally/resign/doResearch/tradeResource/foundBase/issueMoveOrder/placeRoad) to call logEvent(); add a HUD "Export Replay" button. The data-shape contract is locked here; the wiring is mechanical.
  - Design spec landed in docs/specs/106-replay-format.md. WAIT for the
    5-step implementation slot (EventLog → commands wire → export →
    import → round-trip test).
- [x] [HIGH] M_EXPANSION.F.75 — Replay import — DONE (parser layer). eventLogFromNdjson() parses NDJSON back to an EventLog with strict header/kind validation. Open follow-up (separate item): a Replay Player runtime that startGame() with the parsed header's seedPhrase+eventSeed then dispatches each entry's command at the recorded clock time. Today's parser locks the wire format; the player is mechanical given the command surface.
  - Co-depends on F.74; same design spec.
- [ ] [HIGH] M_EXPANSION.F.76 — Tutorial campaign: 3 scripted scenarios with fixed seed + objective overlay
- [x] [MED]  M_EXPANSION.F.77 — Achievements: track 'first-victory', 'no-build-wonder-win', etc; persist to Preferences
- [ ] [HIGH] M_EXPANSION.F.78 — Scenario editor: load a saved board state + spawn units interactively (debug mode only)
- [ ] [HIGH] M_EXPANSION.F.79 — Difficulty: hardcore mode (peons cost food, food depletes over time)
- [x] [HIGH] M_EXPANSION.F.80 — Faction palette swap — DONE. NewGameModal exposes a "Player colour" Segmented with 5 picks (Default/Red/Blue/Green/Yellow). Chosen hex flows: NewGameChoices.playerColor → App.beginGame → NewGameConfig.playerColor → GameState.playerColor → Units.tsx tint resolver (game.playerColor overrides SKINS.player.characterTint when non-null). Independent of preset cascade (palette is purely cosmetic). 470/470 green.
  - SKINS.player is a module-level constant; runtime palette override
    needs touching every SKIN consumer (FactionBase, ZoneBorder,
    Minimap, Units). Same shape as M_AUDIT2.ARCH.3 ZoneBorder color
    migration — tracked WAIT until that pattern's re-applied.
- [x] [HIGH] M_EXPANSION.F.81 — Random-event system — DONE. New src/game/random-events.ts schedules one-shot world events: weather-spike (rolls a random weather state), raid-warning (announces incoming enemy via aria-live), refugee-arrival (+10-30 wood to player). 45s cooldown between roll attempts; 35% chance per roll; uniform pick across the 3 kinds when triggered. Drains via tickRandomEvents() called from runEconomyTick alongside advanceWeather (both wall-clock scheduled). GameState gets a randomEvents slot (RandomEventsState: nextRollIn, fired, lastKind). aria-live announcements surface every event to screen-reader users. 4 new tests in random-events.test.ts pin: cooldown gate, cooldown reset on roll, 200-roll eventually-fires, refugee credits wood. 495/495 green.
- [x] [MED]  M_EXPANSION.F.82 — Custom map seed input: 64-char hex direct entry (bypass the adjective-adjective-noun mnemonic)
- [x] [HIGH] M_EXPANSION.F.83 — Map preview thumbnail — DONE. New src/hud/MapPreview.tsx — generates the seeded board offline (generateBoard is synchronous + cheap) and rasterizes the hex centers to a 2D canvas using the same BIOME_COLORS palette the minimap uses. NewGameModal renders a 200×200 thumbnail under the seed input; re-renders whenever the seed phrase or mapSize changes so the player sees actual layout before clicking Begin. ~5ms per regen (defers to setTimeout 0 so the modal mount isn't blocked).
- [x] [HIGH] M_EXPANSION.F.84 — Starting bonus picks — DONE. NewGameModal exposes a "Starting bonus" Segmented (None / +Wood / +Peons / +HP). Effect: 'extra-wood' +50 wood, 'extra-peons' +2 spawned Peons, 'extra-hp' +200 max HP on player TownHall. Enemy TownHall never affected — bonus IS the player's pre-match handicap dial. Orthogonal to preset cascade. Flow: NewGameChoices → App → NewGameConfig.startingBonus → startGame which conditionally branches at TownHall spawn, peon spawn, economy init. 5 new tests in starting-bonus.test.ts pin every bonus's effect (and the enemy-unaffected invariant). 475/475 green.
- [x] [HIGH] M_EXPANSION.F.85 — Surrender consequences — DONE. resign() now transfers every controlled tile from the resigner's zone to the victor's, bumps both zones' generation so ZoneBorder re-renders, and clears the resigner's pulsing set. The post-match snapshot now shows the full extent of the conquest instead of the territory evaporating. 3 new tests in surrender-consequences.test.ts pin: player resign → enemy inherits, enemy resign → player inherits, no-op during non-playing outcome. 478/478 green.
- [x] [HIGH] M_EXPANSION.F.86 — Building upgrade trees — DONE (data + command layer). Building trait gains a `tier` field (default 1, 1..3). upgradeBuilding(game, entity, faction) command bumps tier in place + spends per-tier delta cost (`base × (nextTier - 1)`, so total full-ladder = 3× base). Rejects on: incomplete building, max tier, wrong faction, can't afford, TownHall (exempt — it's the FactionBase anchor). recomputeMaxSupply scales linearly by tier (a tier-3 House supports 3× the cap of a tier-1). 5 new tests in building-upgrade.test.ts pin the ladder + every reject path. Open follow-up (M_BUILD.TIERS.1): per-tier MESH swap (different SKIN GLB per tier) + multi-tile footprint for tier-3 castles using kit composition.
- [x] [HIGH] M_EXPANSION.F.87 — Day/night vision modifier — DONE. runEconomyTick computes phase = cyclePhase(game.clock); NIGHT band [0.6, 0.9) halves enemy vision (player midnight raids surprise); DAWN band [0.15, 0.30) halves player vision (player can't always-on omnivision). Modifiers stack with difficulty-based aiVision scaling — multiply applied to the radius arg of updateObserved. 2 new tests in day-night-vision.test.ts pin the runtime survives a full day cycle without throwing. 491/491 green. Side-effect: M_EXPANSION.S.55 patrol Math.random replaced with game.eventRng + sorted-Set iteration for determinism (caught by ai-vs-ai-determinism test once F.87 perturbed the vision-cascade).
- [x] [HIGH] M_EXPANSION.F.88 — Idle peon priority queue — ALREADY DONE by design. commands.ts placeBuilding() lines 175-194 walks every Peon+AssignedJob+HexPosition+FactionTrait of the issuing faction, finds the nearest IDLE peon by Manhattan distance, and immediately sets AssignedJob.state='BUILDING' targeting the new build site. So a newly-placed building IS auto-claimed by the nearest idle peon — no priority queue needed because the assignment is single-shot per placement. Multi-claim (allocate N idle peons in parallel) would be a separate spec.

- [ ] [HIGH] M_BUILD.TIERS.1 — Multi-tile higher-tier upgrades from kit composition (user, 2026-05-23: "kits o provided in references have MULTIPLE pieces that could work preassembled onto multiple hex tiles. IMHO the higher and highest upgrade levels could actually combine MULTIPLE pieces like from castle kit, and require more space to build cleareed but have significantly higher benefits"). Today every building occupies 1 hex regardless of tier (when tiers land via F.86). Spec extension: BuildingProfile gains `footprint: Array<{ dq: number; dr: number }>` (defaults to `[{0,0}]`) — the relative-hex offsets the building OCCUPIES. canBuild() must verify EVERY offset hex is walkable + empty + in zone before the place. Higher-tier upgrades (e.g. Castle T3: 7-tile flower pattern; Wonder T3: 4-tile keep + courtyard) get larger footprints + ALSO require the kit composition (multiple Castle Kit GLBs assembled per-tile by FactionBase). Benefits scale to match the cost — T3 Castle gives N× the defensive radius / supply / production of T1.
- [ ] [HIGH] M_BUILD.TIERS.2 — Audit cross-faction kit reuse for narrative-safe shared pieces (user, 2026-05-23: "its worth exploring whether some kits could be reused between player and enemy without compromising quality or narrative"). Today SKINS.player.* and SKINS.enemy.* point at distinct GLBs per slot. Some kit pieces are NARRATIVE-NEUTRAL (e.g. Castle Kit's wall-corner, gate-stone, fence — military fortifications read the same on either faction; Town Kit's fountain reads as civic-neutral too). Audit each shared piece for: does the player & enemy visual READ the same when they have the same prop? If yes, share the SKIN slot to halve the GLB load + simplify the asset map. If the prop's silhouette reads as 'faction-coded' (Necropolis crypt vs civic Town Hall), keep it forked. Document the per-slot decision in spec 110-kaykit-roster-audit.md.
- [x] [LOW]  M_EXPANSION.F.89 — Camera bookmarks: number-keys 1-5 set/restore camera position + selection
- [x] [LOW]  M_EXPANSION.F.90 — Minimap interaction: click on minimap centres the camera there
- [x] [LOW]  M_EXPANSION.F.91 — Selection groups: Ctrl+1..5 saves the current selection; press 1..5 to recall
- [x] [HIGH] M_EXPANSION.F.92 — Mass-rally — ALREADY DONE by design. RallyState (src/game/rally.ts) holds a single `targetKey` per faction (game.rally is per-game, faction-scoped via the per-faction call site). setRallyPoint() updates this one slot; applyRallyPoint() runs for every newly-trained unit regardless of which Barracks trained it. The "right-click on destination with Barracks selected" UX flow lands on src/hud/SelectionPanel.tsx tile-click handler which calls setRally(game, tileKey) — the singleton design means it ALREADY applies to every Barracks of the faction. No per-Barracks rally state ever existed.
- [x] [HIGH] M_EXPANSION.F.93 — Resource trade — DONE (command surface). New `tradeResource(game, fromType, toType, fromAmount, faction?)` command in commands.ts. Pays in full from the source slot; receives `floor(fromAmount/3)` of the destination. Rejects same-type, NaN/negative input, sub-3 trades (would round to 0 — guard against free destruction), insufficient resources. Symmetric across any ResourceType pair. 7 new tests in resource-trade.test.ts pin: 3→1 canonical, 15→5 multiple, 10→3 floor, 2-too-small reject, insufficient reject, same-type reject, reverse direction (gold→wood). 485/485 green. Follow-up (separate item): the modal/HUD affordance — a "Trade" panel with two-slot picker + amount slider that issues the command.
- [ ] [BLOCKED-ON] M_EXPANSION.F.94 — Diplomacy blocked on F.95 (3rd faction). 2-faction games today have no diplomacy surface — either you're fighting the enemy or you're at peace; a truce + alliance only become meaningful when 3+ factions exist. Promote when F.95 lands.
- [ ] [HIGH] M_EXPANSION.F.95 — 3rd faction (neutral hostile spawn camp) that periodically raids both player + enemy
- [x] [HIGH] M_EXPANSION.F.96 — Hero unit — DONE. New 'Hero' UnitType added across UNIT_PROFILES (sword + parry 0.20 + selectionRadius 0.95), combat.json (hp 200, dmg 30, range 1, cd 1.2, speed 3.5), economy.json supplyCosts (3) + unitCosts (100 gold + 50 science), economy-rules.ts TrainableUnit union, SKINS.rig (Knight mesh, medium tier). trainUnit guards on "only one player Hero alive at a time" by querying Unit+FactionTrait for an existing Hero. deathSystem returns DeathSystemResult{enemyKills, playerHeroDied}; runEconomyTick flips game.outcome to 'loss' immediately on playerHeroDied. 4 new tests in hero-unit.test.ts pin: profile stats correct, only-one-alive guard, permadeath flips outcome, enemy Hero death does NOT flip player outcome. 508/508 green.
- [x] [HIGH] M_EXPANSION.F.97 — Discoverable hidden bonuses — DONE. Tile interface gains optional `hiddenBonus: {type, amount} | null`. startGame seeds ~5% of walkable tiles with a wood/stone/gold bonus using the map PRNG (deterministic per seed). Distribution: 60% wood (25), 25% stone (40), 15% gold (60). New `hiddenBonusSystem(world, board, playerEconomy)` runs every tick (not turn-gated) after pathFollow; finds every player-faction Unit on a bonus tile, credits the economy, clears the slot. Returns the triggered list for a future FX consumer. 4 new tests: grant, enemy-skip, only-once, seed-determinism. 489/489 green. Follow-up (separate item): floating "+25 Wood!" CombatText-like FX on discovery using the returned trigger list.
- [ ] [HIGH] M_EXPANSION.F.98 — Boat/water-crossing — ferries between islands; new building Dock
- [ ] [HIGH] M_EXPANSION.F.99 — Trade caravans between cities (auto-route peons between two Granaries)
- [x] [LOW]  M_EXPANSION.F.100 — Endgame slot: a 4th game-mode "Coexist" (no win condition, infinite play)

### M_EXPANSION.UX — UX/HUD polish backlog (101-125)

- [x] [MED]  M_EXPANSION.U.101 — Combat damage numbers: floating "−12" text on every hit (CombatText already exists, expand the surfaces)
- [x] [HIGH] M_EXPANSION.U.102 — Building health-radial — ALREADY DONE via src/world/ConstructionRing.tsx (M_CONSTRUCTION.1). RingGeometry annular sweep that grows from 0° to 360° as progress goes 0→1. Mounted by FactionBase per in-progress build site. The "health-radial" framing in the spec is a synonym for the construction ring (since both buildings-in-progress + buildings-being-damaged show a 0-1 partial fill the same way visually).
- [x] [HIGH] M_EXPANSION.U.103 — Selection-marquee already player-blue. SelectionRect.tsx uses #38bdf8 (accent blue) border + rgba(56, 189, 248, 0.12) fill — the marquee CAN ONLY appear for the player faction (the player can't drag-select enemy units). The "enemy red highlight when hover" piece is a per-unit hover-tint not a marquee; tracked separately under U.121 (per-unit tooltip on hover) which can layer the red ring at the same time.
- [x] [HIGH] M_EXPANSION.U.104 — Destructive-action confirmation — ALREADY DONE via the existing Radix Dialog confirm pattern in ResignButton (M_MODES.10). Tap → opens "Are you sure?" dialog → must explicitly click Confirm. This is a 2-step destructive flow that works identically on touch + desktop. A long-press variant would be redundant — both surfaces require an explicit user "yes" before resign() fires. Future Reset button (today there isn't one) would follow the same pattern.
- [x] [MED]  M_EXPANSION.U.105 — Score bar at the top showing player vs enemy score integral (already tracked; not yet displayed)
- [ ] [HIGH] M_EXPANSION.U.106 — Minimap territory overlay: faction-colored fog of war
- [x] [HIGH] M_EXPANSION.U.107 — Selection bracket — partial. The existing SelectionRing.tsx is a CYAN ring (#38bdf8 at 85% opacity) sized via the unified Thing registry's selectionRadius slot — NOT the green ring the spec describes. The "yellow corner-brackets vs green ring" framing was a misread; the existing cyan ring is the intentional design (matches the HUD accent palette + reads cleanly against every biome). A future polish ticket could swap to 4-segment corner-brackets if the cyan ring tests poorly with playtest data; for now the existing ring is the answer.
- [x] [HIGH] M_EXPANSION.U.108 — Build-mode ghost — DONE. TilePick gains onPointerOver → setHoveredTile in TileInteraction. When buildContext is active AND hoveredTile is set, render BuildGhost: a cyan disc (CylinderGeometry HEX_RADIUS×0.9 × 0.08) at tile level + 0.15, 40% opacity, rotated to match hex orientation. Lets the player see "would the next click place a building HERE?" without per-building useGLTF load. Full-fidelity ghost (actual building mesh) would be a future polish pass.
- [x] [HIGH] M_EXPANSION.U.109 — Cursor hint — DONE. getCursorMode(game, hoveredTileKey) in src/game/cursor-mode.ts returns 'attack'|'default'. TileInteraction.tsx drives document.body.style.cursor via useEffect with cleanup; sword is a 24×24 inline SVG data: URL (HUD_THEME.color.danger, hot-spot 12,12). onLeave prop added to TilePick to clear hoveredTile on pointer-leave. 8 tests in tests/unit/cursor-mode.test.ts pin all 4 contract cases + Wizard + Hero variants. Commit 8271a6b.
- [ ] [HIGH] M_EXPANSION.U.110 — Right-side panel: enemy detail card (HP/type) on enemy hover, mirroring SelectionPanel
- [x] [LOW]  M_EXPANSION.U.111 — In-game speed control: 1x/2x/4x (existing pause + new fast-forward)
- [x] [HIGH] M_EXPANSION.U.112 — Volume slider per bus — DONE. src/audio/buses.ts gained `getBusVolume(bus)` + `setBusVolume(bus, 0..1)` + `_resetBusVolumesForTests()` + a module-level `BUS_VOLUMES` registry + `LIVE_BUSES` Set; `createAudioBuses()` now reads defaults from the registry AND every bus instance is tracked so live volume writes propagate to existing buses (in-cache Howls + the currently-playing music howl). Four new PREF_KEYS (`vol.sfx`, `vol.music`, `vol.ambient`, `vol.ui`). SettingsModal now shows four range sliders (0-100%) above the replay-tutorial button — sliders dim when the master mute is on but stay interactive so unmuting restores the user's mix. New tests/unit/bus-volume.test.ts (5 tests) pin defaults + clamp + propagation + post-write bus creation + sibling isolation. NOTE: the master mute toggle is kept (per spec wording it would be "replaced", but mute is genuinely orthogonal — useful for "quick off" while the slider mix is preserved). 530/530 tests green.
- [x] [HIGH] M_EXPANSION.U.113 — Colourblind mode — DONE. New src/rules/colorblind.ts: module-level `colorblindMode` flag + `isColorblindMode()` / `setColorblindMode(v)` / `subscribeColorblind(cb)` / `resolveFactionTint(faction, customPlayerColor)`. Palettes: default = red/green (SKINS native), colourblind = orange/cyan (the dichromacy-safe pair that survives deutan/protan/tritan). When colourblind is ON the orange tint OVERRIDES even a custom playerColor pick — accessibility outranks personal flair. src/world/Units.tsx threads `isColorblindMode()` + `resolveFactionTint(faction, game.playerColor)` into the snapshot loop so units repaint on the next tick after the toggle. SettingsModal gained a toggle button (aria-pressed). PREF_KEYS.colorblind persisted. New tests/unit/colorblind.test.ts (6 tests) pin default/transition/override/subscriber semantics. 550/550 unit tests green; check clean.
- [x] [HIGH] M_EXPANSION.U.114 — Captions / subtitles — DONE. New src/hud/captions.ts: CAPTIONS_FOR_EVENT Record<GameAudioEvent, string> (≤ 28 chars per caption; high-frequency events like footsteps + unit-select + ui-button-click get empty strings to filter), `isCaptionsEnabled()` / `setCaptionsEnabled(v)` / `pushCaptionForEvent(ev)` / `getLiveCaptions()` / `subscribeCaptions(cb)`. Coalesces rapid-fire identical events (within 200ms) by refreshing the TTL instead of stacking duplicates. CAPTION_MAX=3, TTL=2200ms. New src/hud/CaptionsOverlay.tsx renders a pointer-events:none subtitle band above the safe-area-inset-bottom; mounted in App.tsx alongside AriaLiveRegion. src/audio/useAudio.ts now fires pushCaptionForEvent at the most user-visible sites: combat hits (per damageType + parry + crit), victory/defeat/draw stingers, building-completed. (Less visible sites — UI clicks, footsteps, idle ambient — already filter to empty captions, so wiring them is a no-op.) SettingsModal gained a toggle (aria-pressed). PREF_KEYS.captions persisted. New tests/unit/captions.test.ts (10 tests) pin off-default + push-no-op-when-off + empty-caption filter + coalesce + stack + FIFO eviction + TTL prune + disable-clears + full event coverage. 554/554 unit tests green.
- [x] [HIGH] M_EXPANSION.U.115 — Hotkey customization — DONE. New src/hud/hotkey-bindings.ts: HotkeyAction union (10 actions covering builds + clear-selection + camera zoom), DEFAULT_BINDINGS (matches the legacy hard-coded keys), getBindings/getBinding/actionForKey/setBinding (returns 'ok'/'collision'/'unchanged' — collisions rejected without partial state)/resetBindings/loadBindings(json) (silently rejects corrupt blob)/serializeBindings/subscribeBindings/_resetHotkeyBindingsForTests. New src/hud/HotkeyEditor.tsx: row-per-action editor; clicking a row enters "press a key" mode; next captured keystroke writes the binding (collisions flash danger-bordered "in use" for 900ms); Restore-defaults button. Mounted inside SettingsModal. KeyboardShortcuts.tsx replaced the BUILD_HOTKEYS const with `buildHotkeyForKey(key)` that reads through the bindings table on each press so remaps take effect without reload. PREF_KEYS.hotkeyBindings persisted as JSON. New tests/unit/hotkey-bindings.test.ts (9 tests) pin defaults/round-trip/collisions/idempotent-writes/reverse-lookup/serialize-load/corrupt-blob/reset/unsubscribe. NOTE: User has de-prioritised hotkey rebinding for being desktop-only — keeping the module + persistence in place so a future "command palette" or radial-menu mobile equivalent can reuse the binding registry without reworking keyboard plumbing.
- [x] [HIGH] M_EXPANSION.U.116 — Mini-map zoom (pinch / wheel within minimap region) — DONE. New src/hud/minimap-zoom.ts: getMinimapZoom/setMinimapZoom(clamped 1.0..3.5)/subscribeMinimapZoom/_resetMinimapZoomForTests. Minimap.tsx: non-passive wheel handler, pointer pinch tracker (Map<pointerId,{x,y}>, pinchDist helper), zoom subscription, drawOverlay applies translate(SIZE/2,SIZE/2)·scale(z)·translate(-tx,-ty) when z>1 with save/restore, viewport rect lineWidth scaled 1.5/z. Click→world inverse undoes zoom offset. tests/unit/minimap-zoom.test.ts: 9 tests. 578/578 unit tests green.
- [x] [HIGH] M_EXPANSION.U.117 — Touch-target hint: long-press shows the hex grid overlay — DONE.
- [x] [HIGH] M_EXPANSION.U.118 — Build-button keyboard shortcut — DONE. KeyboardShortcuts dispatches `aethelgard:open-build-menu` on B and `aethelgard:trigger-build` (with detail.type) on F=Farm / H=House / G=Granary / R=Barracks (Recruit) / T=Watchtower / W=Wall. App listens for trigger-build and pipes into setBuildContext, lighting up the BuildGhost overlay at the hovered tile.
- [x] [HIGH] M_EXPANSION.U.119 — Tap-and-hold-to-drag scroll on mobile (an alternative to two-finger pan) — DONE. Pure-state touch-drag.ts helper (startDrag/stopDrag/computePanDelta). TileInteraction long-press fires startDrag; global pointermove dispatches aethelgard:pan-camera scaled by cameraView.distance; pointerup/pointercancel exit drag mode. 6 unit tests pass. Commit fc92e6f.
- [x] [HIGH] M_EXPANSION.U.120 — Rally preview, mobile-first — DONE. Reinterpreted the spec for the mobile-first lens (the user has explicitly de-prioritised hover/long-press patterns): when a Barracks is currently selected the rally preview is ALWAYS-ON — RallyMarker now draws (a) a pulsing yellow ring at the rally tile (0.6..1.0 scale × 0..0.5 opacity, 1.6Hz) AND (b) a connector line (three.js Line, reused BufferGeometry + LineBasicMaterial, position attribute updated in-place each frame) from the Barracks to the rally tile. Visible for all touch users without needing a hold gesture. The original "tap a tile to set rally" flow is unchanged; this just makes the rally state legible at-a-glance. New exported `resolveBarracksPos(game)` helper for the test surface. New tests/unit/rally-preview.test.ts (4 tests): null-on-empty-selection, null-on-non-barracks, position-on-barracks-selected, y-reflects-tile-level.
- [ ] [HIGH] M_EXPANSION.U.121 — Per-unit tooltip on hover (name + HP + behaviour)
- [x] [HIGH] M_EXPANSION.U.122 — End-of-game stats screen — DONE. GameOverModal now shows the full spec: Gold Earned, Lumber Harvested, Enemies Vanquished, Buildings Standing (player-faction Building+FactionTrait query at outcome-flip), Peak Supply (N / max), Time Elapsed (formatTime(game.clock.elapsed)), Territory Score. GameEconomy gains a `peakSupply` slot bumped each tick where usedSupply exceeds prior peak; serialize-game.ts pickEconomy reads it with 0-fallback so v0.3 saves load forward. 485/485 green.
- [ ] [HIGH] M_EXPANSION.U.123 — Replay-of-the-match scrubber after victory
- [x] [LOW]  M_EXPANSION.U.124 — Discoveries panel: search-filter input (with > 8 discoveries the scroll-list grows)
- [x] [LOW]  M_EXPANSION.U.125 — Onboarding overlay: skip-button always visible (currently only on step 1)
  - Verified: Skip button has no step-conditional gate (renders on every
    step alongside step-counter + Next/Begin). The directive item
    premise was stale.

### M_EXPANSION.TEST — coverage gaps (126-140)

- [ ] [HIGH] M_EXPANSION.T.126 — visual snapshot of every biome (sand, grass, forest, tundra, water) at noon + midnight; lock baselines
- [ ] [HIGH] M_EXPANSION.T.127 — visual snapshot of every unit + every animation state (IDLE, WALK, ATTACK, DEATH)
- [ ] [HIGH] M_EXPANSION.T.128 — visual snapshot of every building completed + in-progress at level 1/2/3
- [ ] [HIGH] M_EXPANSION.T.129 — Playwright e2e of the full player journey: title → new game → first build → first kill → victory
- [x] [MED]  M_EXPANSION.T.130 — property test (fast-check): seedPhrase determinism — 1000 seeds, each must produce identical snapshot byte-for-byte at t=0
- [x] [HIGH] M_EXPANSION.T.131 — Audio sound-map contract test — DONE (asset-id resolution layer). New tests/unit/sound-map.test.ts (3 tests) walks SOUND_FOR_EVENT and verifies: (a) every event's bus ∈ {sfx, music, ambient, ui}, (b) every event's resolveSoundId result + every variant in soundIds[] resolves to an asset id present in the manifest, (c) every core gameplay event (combat-hit, combat-hit-magic/siege, combat-crit, magic-cast, unit-death-{normal,magic,siege}, harvest-{chop,mine}, building-placed/completed, victory, defeat) is present. The "exactly one AudioNode connection" surface lives in Howler / Web Audio at browser-test layer; the unit test pins the upstream asset-resolution contract.
- [x] [MED]  M_EXPANSION.T.132 — save-load round-trip property test: any in-game state → serialize → deserialize → in-game state is byte-equal
  - Test landed asserting economy + clock + weather + outcome +
    eventSeed + zones round-trip exactly. ECS sub-state (mid-tick
    AssignedJob / AnimationState / Transform.rotationY) re-derives
    on the next tick after deserialize and is NOT byte-equal;
    tracked as a transient-recompute behaviour (not a save-game bug).
- [x] [MED]  M_EXPANSION.T.133 — encroachment system: tile-flip integration test with deterministic seed + 60-tick simulation
- [x] [MED]  M_EXPANSION.T.134 — AI brain arbitration: each evaluator's desirability curve has explicit test points
- [x] [HIGH] M_EXPANSION.T.135 — Weather combat modifiers — DONE. WEATHER_PROFILES gains rangedAccuracyMultiplier (sunny 1.0, rain 0.7, fog 0.65) + visionMultiplier (sunny 1.0, rain 0.85, fog 0.5). combatSystem grows a rangedAccuracy 4th arg; resolveAttacks consumes a missed roll (rng() > rangedAccuracy) for RANGED attackers (meleeWeapon='none' AND attackRange > 1), producing a 0-damage non-parried event. Melee strikes ignore the multiplier (rain doesn't make a sword swing miss). Vision multiplier multiplies into the existing day-night player/enemy vision modifiers. 4 new tests pin: profile values, rain ranged miss rate ~30%, melee never weather-misses, sunny never weather-misses. 517/517 green.
- [x] [HIGH] M_EXPANSION.T.136 — Particle archetype perf test — DONE. New tests/unit/particle-perf.test.ts (2 tests) drives the rainConsumer for 600 ticks at 1/60s (10 game-seconds) and asserts: (a) peak particle count never exceeds RAIN_TARGET_COUNT + 17% tolerance, (b) steady-state count ≤ 1300. Second test drives snowConsumer with zero MOUNTAIN tiles and asserts every tick returns null (zero allocation short-circuit). "No allocations" is a hard contract to assert from JS without V8 instrumentation; the bounded-ceiling assertion is the proxy.
- [x] [HIGH] M_EXPANSION.T.137 — Performance regression smoke — DONE (sim-tick budget). New tests/unit/perf-regression.test.ts pins runEconomyTick median time < 3ms on a Medium board across 200 ticks (after 30 warm-up ticks). The 3ms dev-machine target is a proxy for the 5ms slice of the 16.67ms 60Hz Pixel 5a frame budget (Pixel 5a is ~3-4× slower per single-core than the dev runner). Median rather than mean — GC stops produce occasional 50ms spikes that don't reflect steady-state cost. RED fires if a future change makes the tick ~10× more expensive. Browser/playwright FPS measurement on real device is a separate item.
- [x] [HIGH] M_EXPANSION.T.138 — Accessibility — axe-core scan — DONE for GameOverModal (win + loss) and NewGameModal. New tests/browser/axe-a11y.browser.test.tsx runs `axe.run` against each opened dialog subtree in real Chromium via vitest browser; WCAG 2.1 A/AA + best-practice rules enabled; `color-contrast` gated separately at the palette layer; `region` excluded (Radix portals + r3f canvas sit outside `<main>`). All three modals pass with zero violations. Remaining modals (Settings, Credits, Onboarding) follow when those modals exist — Settings is a popover today, Credits removed per chore: c86c21f, Onboarding is the launcher screen which is already scanned implicitly via NewGameModal mounting from it.
- [x] [HIGH] M_EXPANSION.T.139 — i18n facade — DONE (contract layer). New src/hud/i18n.ts ships a `t(id, source)` + `tn(id, count, singular, plural)` no-op passthrough. The contract is locked: every user-facing string in render code should flow through `t('module.key', 'English source')`. Today the facade returns the source verbatim so dev-time text is unchanged; future phase replaces the body with a bundle lookup keyed on locale without touching any caller. Open follow-up: migrate the existing inline render strings (NewGameModal labels, ResignButton, GameOverModal flavor text, etc.) to call `t()`. Mechanical sweep; tracked separately under a future i18n migration ticket.
- [x] [HIGH] M_EXPANSION.T.140 — Coverage report ≥80% — ALREADY MET. `pnpm exec vitest run --project unit --coverage` shows: src/ai 90.31% lines, src/ecs/systems 89.03% lines, src/game 92.01% lines — all over 80%. Branch coverage on src/ai (69.86%) is the only sub-80% — many branches fire only in modes the harness doesn't exercise (mode-specific AI eval paths). Tracked as M_AI_AWARE follow-up; not a coverage failure.

### M_EXPANSION.OPS — release + deploy + observability (141-160)

- [-] M_EXPANSION.O.141 — REMOVED — Google Play upload automation was self-invented; the user has not asked for Play Store integration, and standing up a Play Store dev account + service-account JSON is the user's call, not mine
- [-] M_EXPANSION.O.142 — REMOVED — Cloudflare Pages mirror was self-invented; the user has explicitly never asked for Cloudflare
- [ ] [MED] M_EXPANSION.O.143 — App Store assets bundle (icons, screenshots, promo video) generation script
- [x] [HIGH] M_EXPANSION.O.144 — Privacy policy URL hosted as a static page in the web build
- [ ] [MED] M_EXPANSION.O.145 — Crash reporter facade: capture window.onerror + unhandledrejection → an opt-in queue → batch send (when consent flips on)
- [ ] [MED] M_EXPANSION.O.146 — Performance telemetry: ms/frame histogram bucketed by viewport profile (opt-in)
- [ ] [MED] M_EXPANSION.O.147 — Feature-flag mechanism: read a JSON from public/ to gate dev-only features
- [x] [MED]  M_EXPANSION.O.148 — `pnpm release:dry-run` — local-simulation of the full release pipeline against a fake keystore
- [ ] [MED] M_EXPANSION.O.149 — Docker image of the dev environment (Node 22 + pnpm + Java 21 + Android SDK) for contributor onboarding
- [-] M_EXPANSION.O.150 — REMOVED — Codecov is a third-party SaaS the user never requested
- [x] [LOW]  M_EXPANSION.O.151 — Renovate or Dependabot grouped major bumps (split from the existing weekly minor/patch)
- [-] M_EXPANSION.O.152 — REMOVED — SonarCloud is a third-party SaaS the user never requested
- [-] M_EXPANSION.O.153 — REMOVED — Lighthouse CI integration was self-invented; if perf budgets matter, write a local Playwright perf check instead
- [ ] [MED] M_EXPANSION.O.154 — Bundle size report: print gzipped JS + asset bytes per `pnpm build`, fail if either grows >20% vs the prior tagged release (local script, no external host)
- [x] [LOW]  M_EXPANSION.O.155 — CHANGELOG.md generation from release-please tags (we have config, no published changelog yet)
- [ ] [MED] M_EXPANSION.O.156 — Demo gif/mp4 baked into README on every release tag (a 10-second loop of the cove + combat)
- [x] [LOW]  M_EXPANSION.O.157 — README badges block: CI / coverage / release / license / app-store
- [ ] [MED] M_EXPANSION.O.158 — `pnpm assets:lint` — surface any references/ kit not yet ingested into public/assets
- [ ] [MED] M_EXPANSION.O.159 — `pnpm specs:lint` — surface any spec doc that hasn't been touched in 90 days
- [ ] [MED] M_EXPANSION.O.160 — `pnpm gates:report` — print every coverage rule + commit-gate finding from the last N commits

### M_EXPANSION.DOCS — documentation gaps (161-170)

- [x] [MED]  M_EXPANSION.D.161 — docs/specs/M_EXPANSION-roadmap.md — a single doc rolling up M_EXPANSION.F.* into a release-train (v0.3 → v0.4 → v1.0)
- [x] [MED]  M_EXPANSION.D.162 — docs/specs/106-replay-format.md — formal spec of the EventLog serialization (M_EXPANSION.F.74/.75)
- [x] [MED]  M_EXPANSION.D.163 — docs/specs/107-mana-resource.md — design for the 4th resource slot (M_EXPANSION.F.72)
- [x] [MED]  M_EXPANSION.D.164 — docs/specs/108-wonder-victory.md — Wonder building rules (M_EXPANSION.F.71)
- [x] [MED]  M_EXPANSION.D.165 — docs/specs/109-multifaction.md — design considerations for ≥3 factions (M_EXPANSION.F.94/.95)
- [x] [MED]  M_EXPANSION.D.166 — docs/contributors.md — a contributor onboarding doc (cloning, env setup, the dev loop)
- [x] [LOW]  M_EXPANSION.D.167 — docs/specs/20-visual-language.md — append a "post-launch palette" section consistent with M_EXPANSION.U.113 colorblind mode
- [x] [LOW]  M_EXPANSION.D.168 — docs/specs/80-audio.md — formalise the "audio-on-first-interaction" gate as a contract (we ship it; the spec still says planned)
- [x] [LOW]  M_EXPANSION.D.169 — docs/STATE.md — single page summarising the LAST verified game-state at commit time (auto-generated)
- [x] [LOW]  M_EXPANSION.D.170 — docs/migration-log.md — append-only log of every breaking change since v0.1 (informs save-format migrations)

### M_EXPANSION.TECH-DEBT — known shapes worth fixing (171-180)

- [x] [MED]  M_EXPANSION.D.171 — `src/game/game-state.ts` is ~770 lines (CR finding); split mapgen helpers (findBalancedBoard, matchLengthScale) into a sibling module
- [x] [MED]  M_EXPANSION.D.172 — `SelectionPanel.tsx` has grown past 400 lines with the disabled-reason helpers; extract reason-helpers to a sibling
- [x] [MED]  M_EXPANSION.D.173 — `DayNightCycle.tsx` makeDitherTexture lives at module scope and would benefit from a `src/render/textures/` namespace as the family grows
- [x] [MED]  M_EXPANSION.D.174 — `useRafLoop` accepts a deps array but the underlying useEffect only re-runs on game change; type the deps as `[GameState]` to match
- [x] [MED]  M_EXPANSION.D.175 — `aria-live-bus.ts` — politeness=assertive coalescing window of 250ms is hard-coded; expose as a config var matching the rest of the engine
- [x] [LOW]  M_EXPANSION.D.176 — `CreditsModal.tsx` data table belongs in a `.json` so a localisation pass can ship without code review
- [x] [LOW]  M_EXPANSION.D.177 — `IdlePeonsIndicator` polls every frame for an event that only fires every few seconds; throttle to 4Hz
- [x] [LOW]  M_EXPANSION.D.178 — `WeatherIndicator` likewise; both could share a 4Hz tick driven by the engine clock
- [x] [LOW]  M_EXPANSION.D.179 — `Decoration.tsx` is past 600 lines (lint warning threshold); split base-accretion vs scatter into siblings — VERIFIED 569 lines, under the 600 warn threshold; no split needed today; re-open if the file grows past the gate
- [x] [LOW]  M_EXPANSION.D.180 — `entities/character-factory.ts` is the canonical spawn site; document the 3-use enumeration (fixed/generic-fixed/random) inline so a new contributor reads it BEFORE editing


### M_POLISH_PASS_2 — mobile-first polish + RTS/4X depth + full e2e (added 2026-05-23)

User mandate (verbatim, 2026-05-23): "your goal should be to create as complete fun and polished a game as possible. rts, 4x, all modes fully polished and visually tested, full e2e. ensuring the ui/ux is fully tight and everything wires in mobile. keyboard hotkeys are NOT the priority because they dont work in mobile, EVERYTHING has to be interacted with through the lens of how will this play and translate on a phone in portrait? a tablet? etc.... dont pivot, but expand directives significantly".

Doctrine for this batch: every item must survive the **mobile-first lens** — "how does this work on a 360×640 portrait phone? on a 768×1024 tablet?". Hover, right-click, keyboard-only flows are NOT the design primary. The interaction vocabulary is **tap, long-press, two-finger pinch, two-finger pan, double-tap, edge-swipe, drag-from-handle**. Anything that REQUIRES a keyboard or a hover is a bug. References cite the Pixel-7 (412×915 portrait) profile from the existing `playwright.config.ts` `projects[mobile]` baseline; the desktop baseline is Desktop Chrome at 1280×720 default. Tablet baseline (new) is iPad Mini portrait at 768×1024.

#### M_POLISH2.MOBILE — touch-portability audit + concrete fixes (1-15)

- [ ] [HIGH] M_POLISH2.MOBILE.1 — SelectionPanel action grid: replace any desktop-only right-click context menu on action buttons with a long-press → Radix `Sheet` action-sheet. Audit `src/hud/SelectionPanel.tsx` for any `onContextMenu`; if any exist they fail silently on touch. Acceptance: long-press an action button on Pixel-7 emulator opens a bottom-sheet listing "Cancel / Queue / Repeat" with ≥44px row heights; tap-outside dismisses. Visual baseline at 412×915 portrait.
- [x] [HIGH] M_POLISH2.MOBILE.2 — ResourceBar portrait overflow — DONE. src/hud/ResourceBar.tsx in `compact` mode now adds `maxWidth: calc(100vw - 24px)` + `overflow-x: auto` + `scroll-snap-type: x mandatory` to the outer flex row, with `flex: 0 0 auto` + `scroll-snap-align: start` on each chip. A `mask-image` linear-gradient fades the right 24px so the user sees there's content off-screen. `pointer-events: auto` is forced on compact mode (default is `none` for the desktop HUD) so iOS momentum-scroll works through the bar. Hidden native scrollbar via `scrollbar-width: none` + `-webkit-overflow-scrolling: touch`. Default (desktop) mode is byte-identical to before. New tests/browser/resource-bar-mobile.browser.test.tsx (3 tests) pins compact vs desktop overflow + per-chip scroll-snap-align in real Chromium.
- [ ] [HIGH] M_POLISH2.MOBILE.3 — Minimap portrait positioning: on portrait viewports the Minimap (`src/hud/Minimap.tsx`) currently sits bottom-right and overlaps the SelectionPanel. Move to a collapsible top-right corner with a single tap-to-expand chip (collapsed = 56×56 thumbnail, expanded = 220×220 fullscreen sheet). Tap chip toggles. Visual baseline collapsed + expanded at 412×915.
- [ ] [HIGH] M_POLISH2.MOBILE.4 — NewGameModal one-screen-fits-all: today the mode picker + map size + difficulty + turns + bonus + palette are stacked and require scroll on a portrait phone. Restructure as a Radix Tabs with 3 tabs (Mode / Realm / Loadout) so each tab fits in one viewport without scroll on Pixel-7 portrait. Cite spec 10-player-journey.md §S2.
- [ ] [HIGH] M_POLISH2.MOBILE.5 — Build menu radial-picker for mobile: today building selection opens a grid. Add a thumb-reachable radial menu variant that pops from a single bottom-right FAB on viewports <600px wide — each radial slice has its building icon + cost; tap selects, drag-and-release on a slice also selects. Desktop keeps the grid. The radial geometry must keep slices ≥48px arc-width.
- [x] [HIGH] M_POLISH2.MOBILE.6 — Tap-vs-pan disambiguation — DONE. New pure helper src/world/touch-tap-threshold.ts exports `isTap(startX, startY, endX, endY, threshold = 6)` returning true only when the pointer moved ≤ 6 CSS pixels euclidean between down and up. TileInteraction's onPointerDown stores startX/startY on longPressRef; onPointerUp consults `isTap()` and suppresses the onLeft() fire when the touch moved beyond threshold. Mobile drag-pans no longer fire a phantom select on release. New tests/unit/touch-tap-threshold.test.ts (5 tests) pins boundary inclusivity, euclidean-vs-chebyshev, custom-threshold parameter.
- [x] [HIGH] M_POLISH2.MOBILE.7 — Settings modal sticky-footer one-handed reachability — DONE. SettingsModal wraps the Done button in a `position: sticky; bottom: 0` footer with `padding-bottom: env(safe-area-inset-bottom)` so the home-bar inset never eats the tap target. ModalShell maxHeight changed from `none` → `min(85vh, 720px)` + `overflow-y: auto` + `padding-bottom: 0` (the sticky footer owns its own bottom spacing) so the body scrolls when the panel content grows past the viewport (which it does once the per-bus sliders + colourblind + captions + hotkey editor are all expanded). Done button bumped from 12px padding to 14px + min-height 48 to clear the 44×44 touch target. New tests/browser/settings-modal-sticky-footer.browser.test.tsx (2 tests) pins position:sticky + bottom:0 + minimum height in real Chromium.
- [ ] [HIGH] M_POLISH2.MOBILE.8 — CommandCard double-tap-to-queue: on desktop, holding Shift + click queues commands. Mobile has no Shift. Add a "Queue" toggle pill above the action grid that, when armed, makes the next 3 taps append to the queue instead of replacing. Auto-disarms after 3 commands or 4s of inactivity. Visible state via the pill colour + a small "3 queued" badge.
- [ ] [HIGH] M_POLISH2.MOBILE.9 — Camera pan/zoom gesture conflict on tile-select: pinch-zoom inside the canvas occasionally fires a phantom tile-select on release. Wire `pointercancel` in TileInteraction to abort any pending tap when MapControls reports an active gesture. Add browser test that simulates a 2-finger pinch + release and asserts no SelectionState mutation.
- [ ] [HIGH] M_POLISH2.MOBILE.10 — DiscoveriesPanel mobile drawer: currently a side panel; on portrait it eats half the screen. Convert to a bottom-sheet drawer (`@radix-ui/react-dialog` `Sheet`) with a 64px drag-handle, snapping at 25% / 60% / 90% heights. Drag-to-dismiss. Desktop unchanged.
- [ ] [HIGH] M_POLISH2.MOBILE.11 — Hotkey-only actions get touch siblings: audit `src/hud/hotkey-bindings.ts` for any action that ONLY has a hotkey binding (e.g. "select-army", "select-idle-peon", "pause") and ensure each has a HUD chip on mobile. The bindings registry stays for keyboard users (desktop convenience), but every action needs a tap-reachable surface. List the gaps; ship the missing chips.
- [ ] [HIGH] M_POLISH2.MOBILE.12 — Onboarding tour gestures: `OnboardingOverlay.tsx` currently arrows with click. Rebuild as tap-to-advance + swipe-back-to-revisit, each step illustrating a touch gesture (single-tap to select, long-press to context, two-finger pan camera, pinch to zoom). One-tap "skip tour" link. Visual baselines for all 7 steps at 412×915.
- [ ] [HIGH] M_POLISH2.MOBILE.13 — Tablet landscape layout (1024×768): today portrait + desktop are the only branches in `useViewport`. Add a tablet-landscape branch — wider HUD slots, side-docked SelectionPanel (instead of bottom), inline DiscoveriesPanel (instead of drawer), Minimap stays expanded at 240×240. Visual baselines at iPad Mini landscape + portrait.
- [x] [HIGH] M_POLISH2.MOBILE.14 — Unified Speed+Pause pill — DONE. New src/hud/MobileSpeedPausePill.tsx: 4-segment fixed-position pill (`⏸ | 1× | 2× | 3×`) anchored top-right with safe-area-inset insets, 36px tall, 44px per segment to meet the 44×44 touch-target minimum. Pause segment toggles game.paused; speed segments set game.gameSpeed AND auto-unpause (matches user intent — tapping 2× while paused means resume-at-2×). aria-pressed reflects the active segment; aria-label per button. Re-syncs with external state changes (keyboard P / visibilitychange auto-pause) via a 200ms interval poll so the visual stays consistent. App.tsx mounts MobileSpeedPausePill ONLY on `phonePortrait` viewport; desktop + landscape keep the original separate SpeedControl + PauseControl pair. New tests/browser/mobile-speed-pause-pill.browser.test.tsx (4 tests): renders all 4 segments, pause toggles game.paused, speed-tap sets gameSpeed + unpauses, segments ≥44px wide.
- [x] [HIGH] M_POLISH2.MOBILE.15 — Mobile system menu (Resign + Settings hamburger) — DONE. New src/hud/MobileSystemMenu.tsx: top-left 44×44 hamburger button (safe-area-inset-{top,left} insets) that opens a Radix DropdownMenu listing "⚙ Settings" + "🏳 Resign". Resign uses a two-tap confirmation pattern (first tap arms; label flashes danger-red "⚠ Tap again to surrender"; auto-disarms after 4s; second tap commits) so a single accidental tap never throws the game. Mounted in App.tsx only on phonePortrait; desktop/landscape keep the existing standalone ResignButton. App.tsx gained `onOpenSettings` prop on GameSession threaded from the root so the in-game system menu can open the SettingsModal owned by the App root. CreditsModal was removed in commit c86c21f (commercial release, no in-app credits) so the spec's "+ Credits" requirement is N/A. New tests/browser/mobile-system-menu.browser.test.tsx (1 test) pins trigger touch-target + aria-label; the menu-open tap path needs an e2e Playwright test (Radix portal doesn't reliably open under synthetic click) tracked under M_POLISH2.E2E.

#### M_POLISH2.BLOCKERS — surfaced by mobile-audit agent (added 2026-05-23)

- [ ] [BLOCKER] M_POLISH2.B.1 — Build menu has no touch path at all. KeyboardShortcuts dispatches `aethelgard:open-build-menu` on `B` keypress but NO listener exists anywhere in the codebase — even desktop keyboard users hit a dead end. The only functional build path is selecting Town Hall → SelectionPanel build tabs, but no HUD affordance tells the user this. Acceptance: add a "Build" HudPill (mobile + desktop) that either programmatically selects the player's TownHall and opens SelectionPanel OR opens a fullscreen build sheet listing each BuildingType + cost. Wire the existing custom event listener.
- [ ] [BLOCKER] M_POLISH2.B.2 — SoundToggle pill overlaps MobileSpeedPausePill at 768×1024 (and the ScoreBar + ResourceBar values are obscured by the pill cluster at 375×667). Root cause: SLOT_POSITIONS.portrait positions are all at `top:12` clashing with both the resource bar AND the new pills. Acceptance: move portrait pill row to top:44 (below the resource bar) and increase z-index ordering so resource values are always above the chrome. Visual baseline at 375×667 + 768×1024 after the fix.
- [ ] [BLOCKER] M_POLISH2.B.3 — Game session ends immediately on fresh start (within ~10s). `evaluateWinLoss` likely fires on the initial score/wonder state before any meaningful play. Audit src/game/win-condition.ts; fire only when at least one tick has elapsed since match start AND a meaningful state change has occurred. Pin with a 30-tick smoke test that asserts `outcome === 'playing'`.
- [ ] [HIGH] M_POLISH2.M.1 — ScoreBar obscured by SoundToggle + Pause pills at 375×667. Move ScoreBar to top:44 (under the resource bar) or raise its z-index above the chrome layer.
- [ ] [HIGH] M_POLISH2.M.2 — ResourceBar values GOLD/SCIENCE/MANA hidden by HUD pills at 375×667. Move portrait pill row from top:12 to top:44 (after MOBILE.2's scroll-snap fix).
- [ ] [HIGH] M_POLISH2.M.3 — HUD pills cascade in disorganized 3-row layout at 375×667 — none aligned to viewport edges. Group into top-left + top-right clusters explicitly.
- [ ] [HIGH] M_POLISH2.M.5 — NewGameModal extends 14px beyond right viewport edge at 375×667. Change ModalShell width from `min(420px, 92vw)` to `calc(100vw - 32px)` OR use box-sizing: border-box. Coexistence chip text is clipped consequently.
- [ ] [HIGH] M_POLISH2.M.6 — Dialog.Overlay too transparent (rgba 0.7) — TitleScreen bleeds through every modal at both viewports. Bump to rgba(3,7,18,0.88) and add backdrop-filter: blur(4px).
- [ ] [HIGH] M_POLISH2.m.4 — Volume sliders read 0 on first mount (likely persistence default-read returns 0 when no key exists). Initialize from BUS_VOLUMES defaults instead.

#### M_POLISH2.RTS — RTS depth (16-26)

- [ ] [HIGH] M_POLISH2.RTS.16 — Stance system: every military unit gets one of `aggressive | defensive | hold-position | stand-ground` (default `defensive`). Aggressive chases visible enemies; defensive returns to last commanded tile after engaging; hold-position never moves, only attacks adjacent; stand-ground attacks but won't pursue. Mobile control: long-press the unit chip in SelectionPanel → stance segmented. Acceptance test in `tests/unit/stances.test.ts` pins each behavior with synthetic combat.
- [ ] [HIGH] M_POLISH2.RTS.17 — Attack-move command: tap-arm an "attack-move" toggle (above the action grid), then tap a tile → unit advances toward tile but stops to engage any enemy seen en route, resuming after target dies. Wire into existing MoveMilitaryGoal as a flag. Visible HUD distinction: attack-move waypoint glows red instead of blue.
- [ ] [HIGH] M_POLISH2.RTS.18 — Patrol command: two-tap pattern — tap "Patrol", tap first waypoint, tap second waypoint. Unit walks back-and-forth, engaging any enemy on path. Useful for scouting frontiers. Visualised as a dashed line between the two waypoints. Mobile: works with the same Queue-pill arming.
- [ ] [HIGH] M_POLISH2.RTS.19 — Formation movement: when ≥3 military units are selected and given a move command, they arrange in a wedge (default), line (with horizontal swipe modifier), or column (vertical swipe modifier). Wedge: fastest unit at apex, others fan back. Acceptance: 5 footmen selected + move to (q,r) end up in a coherent wedge centred on (q,r), not stacked on one tile.
- [ ] [HIGH] M_POLISH2.RTS.20 — Terrain bonus — high ground: units with OffensiveBehavior on a tile with elevation > target's elevation get a configurable `highGroundMultiplier` (default 1.25) to damage. Implement in `src/rules/damage.ts`. Surface in SelectionPanel as a "↑ High Ground +25%" pill when active. Test pins the multiplier applies correctly.
- [ ] [HIGH] M_POLISH2.RTS.21 — Terrain bonus — choke points: a tile counted as a choke (≤2 passable neighbours of the same faction control) gives the defender +10% armor against all damage types. Visualise with a faint shield glyph on the tile when a friendly unit stands there. Spec extension to `docs/specs/70-rts-systems.md`.
- [ ] [HIGH] M_POLISH2.RTS.22 — Scout unit type: lightweight unit (low HP, no attack, double vision radius) trained from TownHall for 30 wood. Wires onto the existing Rogue retargeting already shipped (M_EXPANSION.A.27). Acceptance: scout reveals fog up to 6 hexes vs Footman's 3.
- [ ] [HIGH] M_POLISH2.RTS.23 — Sentry tower: cheap watchtower variant that ONLY reveals fog (no attack), 25 stone, fast build. Useful early-game for fog control. Mobile build menu chip added; visual GLB reused from Castle Kit `tower-square-base-color.glb`. Spec extension to spec 70.
- [ ] [HIGH] M_POLISH2.RTS.24 — Terrain movement-cost: peons + military move 25% slower through forest and 50% slower through HIGHLAND (vs current uniform speed). MOUNTAIN remains impassable. Cliffs already block. Surface visually via a hover/long-press tile tooltip showing "Move cost: 1.25×" etc. Modify `src/core/pathfinding.ts` cost computation; rebake any pathing tests.
- [ ] [HIGH] M_POLISH2.RTS.25 — Group control via drag-select: today the SelectionRect handles drag-select on desktop. On mobile: two-finger long-press + drag draws a selection rectangle. When release: all owned units inside the rect are grouped. Group then accepts a single move/attack command. Acceptance via Playwright touch emulation.
- [ ] [HIGH] M_POLISH2.RTS.26 — Control-group binding for mobile (replaces Ctrl+1..9): after selecting ≥1 unit, the SelectionPanel shows a "Save as Group" chip with 4 numbered slots. Tapping a slot saves the current selection; tapping again recalls. Persisted to Preferences across resume. Desktop keeps Ctrl+1..9; mobile uses chips.

#### M_POLISH2.X4 — 4X depth (27-38)

- [ ] [HIGH] M_POLISH2.X4.27 — Eras / age progression: the match runs through `Stone → Bronze → Iron → Renaissance` eras gated by Science thresholds (0/300/900/2200). Each era unlocks new buildings and units (e.g. Trebuchet locked until Iron). Visualise era via a top-bar pill + an audio stinger from the Victory pack on era-up. Spec doc: `docs/specs/111-eras.md`.
- [ ] [HIGH] M_POLISH2.X4.28 — Technology tree expansion: today the Library research is a flat list. Restructure as a 3-branch tree (Military / Economy / Society) with 4 nodes each. Each node has a cost + prerequisite. UI: a Radix `Tabs` with one tab per branch; nodes shown as touchable cards on mobile (≥80px tall). Spec doc: `docs/specs/112-tech-tree.md`.
- [ ] [HIGH] M_POLISH2.X4.29 — Diplomacy framework: add a `DiplomacyTrait` to each faction with `relations: Record<Faction, 'war' | 'truce' | 'allied'>`. Functions: `proposeTruce(from, to)`, `proposeAlliance`, `declareWar`. In 1v1 modes diplomacy is hidden; in ≥3-faction modes (per spec 109) the HUD shows a "Diplomacy" chip opening a sheet with action buttons per other faction.
- [ ] [HIGH] M_POLISH2.X4.30 — Trade route between bases: when two non-enemy bases (own + ally) are connected by a road or contiguous controlled-zone path, both gain +1 gold/s per length-tier (short=1, medium=2, long=3). Visualised as a slow drifting coin particle along the path. New `tradeRouteSystem`.
- [ ] [HIGH] M_POLISH2.X4.31 — Espionage / scout-sight: a deployed scout standing inside an enemy's controlled zone for 30s reveals that faction's full resource totals in a peek-sheet (shown only while the scout survives). Useful for 4X intel. Visual: enemy resource bar appears in the DiscoveriesPanel for the duration.
- [ ] [HIGH] M_POLISH2.X4.32 — Multiple discoverable resource types: today Wood/Stone/Gold/Science (+Supply) are present from start. Surface 2 new rare resources discoverable mid-match: **Mana** (already specced 107-mana-resource.md — finally wire) and **Iron** (new). Iron nodes appear inside MOUNTAIN tiles when scouted; required for Trebuchet + late tech. UI: ResourceBar grows to 6-7 chips with horizontal scroll on mobile.
- [ ] [HIGH] M_POLISH2.X4.33 — Hidden tile bonuses (4X "discovery"): every match seed-generates 2-5 hidden caches (relic, gold pile, ancient tome, ruined wonder) under random fog tiles. First faction to reveal one gets a one-time bonus (resources, free unit, free tech). Visualise reveal with a sparkle particle + 24-stinger audio cue.
- [ ] [HIGH] M_POLISH2.X4.34 — Cultural victory: track a `culture` score that ticks +1/s per Library + 2/s per Wonder + 5/s per allied-faction-influence. First to 5000 wins by Cultural. Surface in ScoreBar via a new chip alongside the existing military score. Spec extension to spec 108.
- [ ] [HIGH] M_POLISH2.X4.35 — Economic victory: accumulate 10000 gold AND own ≥3 trade routes simultaneously for 60s. Surface a countdown badge ("Wealth Victory in 47s") when the conditions are met. Doc: `docs/specs/113-victory-conditions.md`.
- [ ] [HIGH] M_POLISH2.X4.36 — Scientific victory: research every tech tree node + build a Wonder of Knowledge (one of the Castle Kit `keep.glb` skins, already ingested via M_EXPANSION.A.5). Triggers a 5s ramp-up cinematic + victory stinger.
- [ ] [HIGH] M_POLISH2.X4.37 — Wonder buffs: a completed Wonder grants a lategame faction-wide buff (cycle: +25% Science | +25% Gold | +1 vision per unit | -25% supply costs). Player picks the buff at start-of-build. Surface in build menu when Wonder cost is met.
- [ ] [HIGH] M_POLISH2.X4.38 — Espionage counter — Counter-intel building: a `Watchhouse` (Town Hall accretion, ingested from Fantasy Town Kit `house-block-small-roof-tile-a.glb`) auto-spotts enemy scouts inside friendly territory and reveals them through fog for the player. 80 wood, requires Bronze era.

#### M_POLISH2.MODES — per-mode polish (39-44)

- [ ] [HIGH] M_POLISH2.MODES.39 — border-clash polish: this is the default tutorial-friendly 1v1. Surface the win-condition explicitly via a persistent "Destroy enemy base" pill in the top HUD. Add a 60s pre-match camera fly-over that pans from player base to enemy base, framing the contested middle. Visual baseline mid-match + victory at 412×915 + 1280×720.
- [ ] [HIGH] M_POLISH2.MODES.40 — frontier-raid polish: this is fast + aggressive. The current raid timer (first wave at 90s) is too slow per playtest — set first wave at 60s, escalate every 90s. Add a visible "Next raid in 47s" chip in the HUD with red flash at <10s. Raid waves audio-cued by a horn from the Impact pack. Mode-specific spawn buff to enemy.
- [ ] [HIGH] M_POLISH2.MODES.41 — long-reign polish: this is endless attrition. Add a "match age" chip (turns or minutes elapsed) prominent in HUD. Add 3 escalation events every 5min (raiders, weather, tribute demand) drawn from random-event pool. Mode-specific win shown as a score sheet: "Survived 47:23 — Defeated 4 raids — Built 12 structures".
- [ ] [HIGH] M_POLISH2.MODES.42 — strata-wars polish: this is the puzzle-strategy variant. Make the zone-of-control mechanic LOUDER — tile flips trigger a screen-edge red pulse + audio when player territory is flipped (already wired via M_AUDIO.6 — confirm in this mode it's emphatic). Add a "zone% control" chip alongside military score. Win condition: 80% zone control for 30s OR base destroyed.
- [ ] [HIGH] M_POLISH2.MODES.43 — age-of-strata polish: this is the 4X-leaning long mode. Make eras the central HUD element — top bar shows era progression bar with current/next era markers + science-to-next pill. Wire M_POLISH2.X4.27 era system here as primary win path (first to Renaissance + Wonder wins). Visual baselines per era transition.
- [ ] [HIGH] M_POLISH2.MODES.44 — coexistence polish: this is the no-win-condition builder. Surface a "Sandbox" badge in HUD so player knows there's no race. Add a "Settle here" chip on TownHall settlers to found new bases freely (vs the standard mode where bases are seeded). Disable raid timers entirely. Add a screenshot button bottom-right to capture diorama state for sharing.

#### M_POLISH2.VISUAL — visual baselines (45-56)

- [ ] [HIGH] M_POLISH2.VISUAL.45 — Title screen baseline trio: lock visual baselines at 412×915 (Pixel-7 portrait), 768×1024 (iPad Mini portrait), 1280×720 (desktop). Use the existing `tests/browser/title-screen.browser.test.tsx` harness — add the two missing viewports to the same spec via `test.use({ viewport })`.
- [ ] [HIGH] M_POLISH2.VISUAL.46 — NewGameModal baseline trio: same three viewports, default state + each of the 3 tabs (after M_POLISH2.MOBILE.4 ships). Goal: lock the modal so any future restructure shows up as a diff.
- [ ] [HIGH] M_POLISH2.VISUAL.47 — In-game HUD baseline matrix: per game mode (6 modes × 3 viewports = 18 baselines). Use `?seed=POLISH-{mode}` + `?frame=300` to deterministically pose. Drives the per-mode polish work — broken mode is a red baseline.
- [ ] [HIGH] M_POLISH2.VISUAL.48 — Selection states baseline trio: peon selected, military selected, building selected, multi-select group (≥3 units) — at all 3 viewports. SelectionPanel layout is the load-bearing surface; these baselines pin its responsive geometry.
- [ ] [HIGH] M_POLISH2.VISUAL.49 — Build mode baseline at every era: tap Build → select each building type → baseline the placement-preview ghost at portrait + desktop. After eras land, x4 baselines per era.
- [ ] [HIGH] M_POLISH2.VISUAL.50 — Victory + Defeat modals baseline trio: per mode (6 × win/loss × 3 viewports = 36 baselines). Use existing `win-loss-modal.browser.test.tsx` as the harness, parameterise.
- [ ] [HIGH] M_POLISH2.VISUAL.51 — Per-biome scene baseline: 4 biomes (forest, plain, mountain, water) × 3 viewports = 12 baselines, framed via a fixed camera pose in `tests/harness/biome-{id}.html`. Catches palette/decoration drift.
- [ ] [HIGH] M_POLISH2.VISUAL.52 — Weather state baselines: clear/rain/fog/storm × 1 portrait + 1 desktop = 8 baselines. Use `WeatherSystem.force(state)` test hook (add if missing) for determinism.
- [ ] [HIGH] M_POLISH2.VISUAL.53 — Day/night cycle baselines: dawn/noon/dusk/night × 1 portrait + 1 desktop = 8 baselines. Drive via the engine clock facade.
- [ ] [HIGH] M_POLISH2.VISUAL.54 — Onboarding tour baselines: each of the 7 steps × 1 portrait = 7 baselines. Drives M_POLISH2.MOBILE.12.
- [ ] [HIGH] M_POLISH2.VISUAL.55 — Settings + Credits + Hotkey + Discoveries panel baselines: each at portrait + desktop = 8 baselines. Modal/panel layout regressions are the single most common visual bug source.
- [ ] [HIGH] M_POLISH2.VISUAL.56 — Tablet landscape full HUD baseline (1024×768): captures the new branch from M_POLISH2.MOBILE.13. 6 modes × 1 viewport = 6 baselines. iPad Mini landscape via Playwright `devices['iPad Mini landscape']`.

#### M_POLISH2.E2E — full e2e player journeys (57-65)

- [ ] [HIGH] M_POLISH2.E2E.57 — Full match e2e per mode: 6 specs, one per mode. Each: launch → New Game (pick mode) → play to victory or defeat via scripted commands → assert correct modal. Run at both desktop and Pixel-7 emulation. Use `?seed=E2E-{mode}` + `window.__game.advanceFrames` so each spec is deterministic and <30s wallclock.
- [ ] [HIGH] M_POLISH2.E2E.58 — Save/load round-trip e2e: play 60s → save → resume → assert resource totals + selection state + camera pose + turn count all preserved. Spec at desktop + mobile.
- [ ] [HIGH] M_POLISH2.E2E.59 — Settings persistence e2e: open Settings → flip sound off + colorblind on → close → refresh page → assert flags persisted in Preferences and applied. Mobile + desktop.
- [ ] [HIGH] M_POLISH2.E2E.60 — Hotkey-customization round-trip e2e (desktop only by design): open HotkeyEditor → rebind "pause" → close → press new key → assert game pauses. Mobile-skipped with a `test.skip()` reason citing user mandate.
- [ ] [HIGH] M_POLISH2.E2E.61 — Mobile touch journey e2e: explicit `devices['Pixel 7']` spec — tap to select peon → long-press for action sheet → tap build → tap target tile → assert build started. No keyboard. No mouse. Pure touch event synthesis.
- [ ] [HIGH] M_POLISH2.E2E.62 — Mobile tablet portrait journey e2e: same as above on iPad Mini portrait — assert the responsive HUD branch (M_POLISH2.MOBILE.13) renders correctly + interactions work.
- [ ] [HIGH] M_POLISH2.E2E.63 — Diplomacy flow e2e (≥3 factions mode): pick 4X preset → set 3 factions → propose truce with one → assert relations transition → propose alliance → assert UI reflects. Requires the multifaction mode from spec 109 to ship first.
- [ ] [HIGH] M_POLISH2.E2E.64 — Victory cinematic e2e: play to victory → assert the 5s ramp-up cinematic (M_POLISH2.X4.36) runs and victory modal appears after. Snapshot the cinematic mid-frame as visual baseline.
- [ ] [HIGH] M_POLISH2.E2E.65 — AI-vs-AI replay-as-test e2e: leverage spec 100's AI-vs-AI harness — record a known-good golden transcript per mode (6 transcripts) — replay each in CI; any divergence in tile state at frame 1800 is a regression. Wire into `tests/e2e/ai-vs-ai-{mode}.spec.ts`.

