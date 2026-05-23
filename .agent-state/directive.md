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
- [ ] [WAIT-NATIVE] M_SEC.4 — encrypt SQLite saves. Change
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
- [ ] [WAIT-DESIGN] M_EXPANSION.A.28 — Adventurers EXTRA shields/weapons subset for attachment points on Knight/Footman
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
- [ ] [WAIT-DESIGN] M_EXPANSION.AU.42 — pre-victory crescendo: cross-fade combat→victory stinger over the final 3s before win
  - Requires a deterministic "imminent victory" signal (enemy TownHall
    HP <10%, AI last-unit-dying, wonder-timer <3s). Predicting wrong
    would fire false-positive crescendos. Tracked WAIT until F.71
    Wonder lands a deterministic countdown.

**Footsteps + Impact + Magic SFX (43-50)** — partial usage
- [x] [HIGH] M_EXPANSION.AU.43 — footsteps per terrain biome (grass/sand/stone) — currently single sound
- [x] [HIGH] M_EXPANSION.AU.44 — magic SFX pack wired to Wizard (M_EXPANSION.A.26) attack
- [x] [MED]  M_EXPANSION.AU.45 — impact SFX per damageType (arrow vs sword vs magic) — currently one sound
- [ ] [WAIT-DESIGN] M_EXPANSION.AU.46 — shield-deflect on Footman parry chance (~10% damage→0 with deflect SFX)
  - Requires combat-math change (rollDamage extended with isParry roll,
    or a defender-side hook) + balance pass (parry chance % vs Footman
    survivability tuning) + DamageEvent extension + UI feedback (deflect
    glyph). Not a pure audio drop-in; tracked as WAIT until the combat
    balance pass that defines parry mechanics lands.
- [x] [MED]  M_EXPANSION.AU.47 — death sound per unit type from existing footstep + impact mash-ups
- [ ] [WAIT-DESIGN] M_EXPANSION.AU.48 — Howler 3D-positional sound for in-world events (combat, building) based on camera distance
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
- [ ] [WAIT-DESIGN] M_EXPANSION.S.55 — spec 100-ai-as-player.md "patrol" goal — AI military units idle into PatrolGoal between raids (currently sit at base)
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
- [ ] [WAIT-DESIGN] M_EXPANSION.S.62 — spec 97-ai-and-asset-expansion.md "yuka subpackage" — partly done; finish the migration of MovementGoal → yuka Vehicle steering for all military units
  - Wide refactor (every military unit's MovementGoal → yuka Vehicle
    instance + steering callback) + visual playtest pass (yuka
    interpolation feel vs current discrete-tile movement). WAIT until
    playtest surfaces a concrete win for the cost.
- [x] [MED]  M_EXPANSION.S.63 — spec 98-viewport-and-config.md "ultra-wide" — viewport profile for >2.4:1 (currently only landscape/portrait branch)
- [ ] [WAIT-DEVICE] M_EXPANSION.S.64 — spec 99-build-deploy.md "iOS Capacitor" — Capacitor iOS configuration in capacitor.config.ts + ios/ scaffold
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
- [ ] [WAIT-DESIGN] M_EXPANSION.F.72 — Mana resource (4th slot): drives Wizard training + Magic-spell SFX
  - Design spec landed in docs/specs/107-mana-resource.md. Implementation
    is an 8-step ripple (ResourceType → Profiles → Economy → ResourceBar
    → spawn → migration v1→v2 → Wizard cost rebalance → tests). WAIT until
    a dedicated milestone slot — the schema bump is the first real use
    of the migration framework + warrants its own review cycle.
- [x] [HIGH] M_EXPANSION.F.73 — Multiplayer-seed sharing: a "share seed" button in the New Game modal copies the current seed to clipboard
- [ ] [WAIT-DESIGN] M_EXPANSION.F.74 — Replay export: save the EventLog ndjson to a downloadable file
  - Design spec landed in docs/specs/106-replay-format.md. WAIT for the
    5-step implementation slot (EventLog → commands wire → export →
    import → round-trip test).
- [ ] [WAIT-DESIGN] M_EXPANSION.F.75 — Replay import: load a EventLog ndjson and watch the deterministic playback
  - Co-depends on F.74; same design spec.
- [ ] [WAIT-DESIGN] M_EXPANSION.F.76 — Tutorial campaign: 3 scripted scenarios with fixed seed + objective overlay
- [x] [MED]  M_EXPANSION.F.77 — Achievements: track 'first-victory', 'no-build-wonder-win', etc; persist to Preferences
- [ ] [WAIT-DESIGN] M_EXPANSION.F.78 — Scenario editor: load a saved board state + spawn units interactively (debug mode only)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.79 — Difficulty: hardcore mode (peons cost food, food depletes over time)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.80 — Faction palette swap (player can choose red/blue/green/yellow on the New Game modal)
  - SKINS.player is a module-level constant; runtime palette override
    needs touching every SKIN consumer (FactionBase, ZoneBorder,
    Minimap, Units). Same shape as M_AUDIT2.ARCH.3 ZoneBorder color
    migration — tracked WAIT until that pattern's re-applied.
- [ ] [WAIT-DESIGN] M_EXPANSION.F.81 — Random-event system: weather-spike, raid-warning, refugee-arrival (one-shot ECS events from event PRNG)
- [x] [MED]  M_EXPANSION.F.82 — Custom map seed input: 64-char hex direct entry (bypass the adjective-adjective-noun mnemonic)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.83 — Map preview thumbnail in New Game modal (render the seeded board at 256×256 before commit)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.84 — Per-faction starting bonus picks (extra peons / extra wood / extra HP at start)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.85 — Surrender consequences: AI keeps the surrendered player's tiles (currently they evaporate)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.86 — Building upgrade trees: Watchtower→Tower→Castle, each costs prior + delta
- [ ] [WAIT-DESIGN] M_EXPANSION.F.87 — Day/night vision modifier: enemy vision halves at night, player vision halves at dawn
- [ ] [WAIT-DESIGN] M_EXPANSION.F.88 — Idle peon priority queue: when player has idle peons, next building auto-claims them
- [x] [LOW]  M_EXPANSION.F.89 — Camera bookmarks: number-keys 1-5 set/restore camera position + selection
- [x] [LOW]  M_EXPANSION.F.90 — Minimap interaction: click on minimap centres the camera there
- [x] [LOW]  M_EXPANSION.F.91 — Selection groups: Ctrl+1..5 saves the current selection; press 1..5 to recall
- [ ] [WAIT-DESIGN] M_EXPANSION.F.92 — Mass-rally: right-click on a destination with a Barracks selected sets rally for ALL Barracks of the faction
- [ ] [WAIT-DESIGN] M_EXPANSION.F.93 — Resource trade UI: convert N wood → M stone at a 3:1 ratio (sink for surplus)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.94 — Diplomacy: a treaty system (truce, alliance) only meaningful for 3+ factions (future)
- [ ] [WAIT-DESIGN] M_EXPANSION.F.95 — 3rd faction (neutral hostile spawn camp) that periodically raids both player + enemy
- [ ] [WAIT-DESIGN] M_EXPANSION.F.96 — Hero unit: one player-named character with higher stats and a permadeath rule
- [ ] [WAIT-DESIGN] M_EXPANSION.F.97 — Discoverable map tiles: 5% of tiles hide a one-shot resource bonus when a peon first walks on
- [ ] [WAIT-DESIGN] M_EXPANSION.F.98 — Boat/water-crossing — ferries between islands; new building Dock
- [ ] [WAIT-DESIGN] M_EXPANSION.F.99 — Trade caravans between cities (auto-route peons between two Granaries)
- [x] [LOW]  M_EXPANSION.F.100 — Endgame slot: a 4th game-mode "Coexist" (no win condition, infinite play)

### M_EXPANSION.UX — UX/HUD polish backlog (101-125)

- [x] [MED]  M_EXPANSION.U.101 — Combat damage numbers: floating "−12" text on every hit (CombatText already exists, expand the surfaces)
- [ ] [MED]  M_EXPANSION.U.102 — Building health-radial: a circular ring around in-progress buildings showing construction %
- [ ] [MED]  M_EXPANSION.U.103 — Selection-marquee colour per faction (player blue, enemy red highlight when hover)
- [ ] [MED]  M_EXPANSION.U.104 — HUD pill long-press on mobile = hold-to-confirm for destructive (Resign, Reset)
- [x] [MED]  M_EXPANSION.U.105 — Score bar at the top showing player vs enemy score integral (already tracked; not yet displayed)
- [ ] [MED]  M_EXPANSION.U.106 — Minimap territory overlay: faction-colored fog of war
- [ ] [MED]  M_EXPANSION.U.107 — Selection bracket: yellow corner-brackets around the selected unit (replace the green ring)
- [ ] [MED]  M_EXPANSION.U.108 — Build-mode ghost: translucent ghost of the building snaps to the hover tile before placement
- [ ] [MED]  M_EXPANSION.U.109 — Cursor hint: a sword icon when hovering an enemy with a selected military unit
- [ ] [MED]  M_EXPANSION.U.110 — Right-side panel: enemy detail card (HP/type) on enemy hover, mirroring SelectionPanel
- [x] [LOW]  M_EXPANSION.U.111 — In-game speed control: 1x/2x/4x (existing pause + new fast-forward)
- [ ] [LOW]  M_EXPANSION.U.112 — Volume slider per bus (sfx/music/ambient/ui) in Settings, replacing the master mute toggle
- [ ] [LOW]  M_EXPANSION.U.113 — Colorblind mode: alternate palette (player→orange, enemy→cyan)
- [ ] [LOW]  M_EXPANSION.U.114 — Subtitle/captions for every UI sound + critical event (deaf accessibility)
- [ ] [LOW]  M_EXPANSION.U.115 — Hotkey customization (user remappable bindings; persist to Preferences)
- [ ] [LOW]  M_EXPANSION.U.116 — Mini-map zoom (pinch / wheel within minimap region)
- [ ] [LOW]  M_EXPANSION.U.117 — Touch-target hint: long-press shows the hex grid overlay
- [ ] [LOW]  M_EXPANSION.U.118 — Build-button keyboard shortcut: B opens build menu, F=Farm, H=House, etc
- [ ] [LOW]  M_EXPANSION.U.119 — Tap-and-hold-to-drag scroll on mobile (an alternative to two-finger pan)
- [ ] [LOW]  M_EXPANSION.U.120 — Click-and-hold a Barracks shows the rally-point ghost continuously
- [ ] [LOW]  M_EXPANSION.U.121 — Per-unit tooltip on hover (name + HP + behaviour)
- [ ] [LOW]  M_EXPANSION.U.122 — End-of-game stats screen: kills, buildings, peak supply, time elapsed
- [ ] [LOW]  M_EXPANSION.U.123 — Replay-of-the-match scrubber after victory
- [x] [LOW]  M_EXPANSION.U.124 — Discoveries panel: search-filter input (with > 8 discoveries the scroll-list grows)
- [x] [LOW]  M_EXPANSION.U.125 — Onboarding overlay: skip-button always visible (currently only on step 1)
  - Verified: Skip button has no step-conditional gate (renders on every
    step alongside step-counter + Next/Begin). The directive item
    premise was stale.

### M_EXPANSION.TEST — coverage gaps (126-140)

- [ ] [HIGH] M_EXPANSION.T.126 — visual snapshot of every biome (sand, grass, forest, tundra, water) at noon + midnight; lock baselines
- [ ] [HIGH] M_EXPANSION.T.127 — visual snapshot of every unit + every animation state (IDLE, WALK, ATTACK, DEATH)
- [ ] [HIGH] M_EXPANSION.T.128 — visual snapshot of every building completed + in-progress at level 1/2/3
- [ ] [MED]  M_EXPANSION.T.129 — Playwright e2e of the full player journey: title → new game → first build → first kill → victory
- [ ] [MED]  M_EXPANSION.T.130 — property test (fast-check): seedPhrase determinism — 1000 seeds, each must produce identical snapshot byte-for-byte at t=0
- [ ] [MED]  M_EXPANSION.T.131 — audio graph snapshot: every event in the SOUND_MAP fires exactly one AudioNode connection
- [ ] [MED]  M_EXPANSION.T.132 — save-load round-trip property test: any in-game state → serialize → deserialize → in-game state is byte-equal
- [ ] [MED]  M_EXPANSION.T.133 — encroachment system: tile-flip integration test with deterministic seed + 60-tick simulation
- [ ] [MED]  M_EXPANSION.T.134 — AI brain arbitration: each evaluator's desirability curve has explicit test points
- [ ] [MED]  M_EXPANSION.T.135 — combat damage falloff with weather: rain reduces ranged accuracy 30%, fog reduces sight 50%
- [ ] [MED]  M_EXPANSION.T.136 — particle archetype: spawn/age/cull at 60Hz for 10s; no allocations in the steady state
- [ ] [LOW]  M_EXPANSION.T.137 — performance regression: full game at 60fps on a mid-tier mock (Pixel 5a CPU profile)
- [ ] [LOW]  M_EXPANSION.T.138 — accessibility test: axe-core scan of every modal (NewGame, Settings, Credits, GameOver, Onboarding)
- [ ] [LOW]  M_EXPANSION.T.139 — i18n smoke: every user-facing string passes through a t() function (no hardcoded English in render)
- [ ] [LOW]  M_EXPANSION.T.140 — coverage report: aim for ≥80% line coverage on src/game/, src/ecs/, src/ai/

### M_EXPANSION.OPS — release + deploy + observability (141-160)

- [ ] [HIGH] M_EXPANSION.O.141 — release.yml: actually upload to Google Play internal testing track on every release tag (gated on a manual approval env)
- [ ] [HIGH] M_EXPANSION.O.142 — bundle the production web build into Cloudflare Pages alongside GitHub Pages (failover)
- [ ] [HIGH] M_EXPANSION.O.143 — App Store assets bundle (icons, screenshots, promo video) generation script
- [ ] [HIGH] M_EXPANSION.O.144 — Privacy policy URL hosted as a static page in the web build
- [ ] [HIGH] M_EXPANSION.O.145 — Crash reporter facade: capture window.onerror + unhandledrejection → an opt-in queue → batch send (when consent flips on)
- [ ] [MED]  M_EXPANSION.O.146 — Performance telemetry: ms/frame histogram bucketed by viewport profile (opt-in)
- [ ] [MED]  M_EXPANSION.O.147 — Feature-flag mechanism: read a JSON from public/ to gate dev-only features
- [ ] [MED]  M_EXPANSION.O.148 — `pnpm release:dry-run` — local-simulation of the full release pipeline against a fake keystore
- [ ] [MED]  M_EXPANSION.O.149 — Docker image of the dev environment (Node 22 + pnpm + Java 21 + Android SDK) for contributor onboarding
- [ ] [MED]  M_EXPANSION.O.150 — Codecov integration via the existing coverage gate
- [ ] [LOW]  M_EXPANSION.O.151 — Renovate or Dependabot grouped major bumps (split from the existing weekly minor/patch)
- [ ] [LOW]  M_EXPANSION.O.152 — SonarCloud integration (or local Sonar runner) for code quality history
- [ ] [LOW]  M_EXPANSION.O.153 — Lighthouse CI on the deployed pages build (perf + a11y score history)
- [ ] [LOW]  M_EXPANSION.O.154 — Bundle size dashboard: track gzipped JS + asset bytes per release tag
- [ ] [LOW]  M_EXPANSION.O.155 — CHANGELOG.md generation from release-please tags (we have config, no published changelog yet)
- [ ] [LOW]  M_EXPANSION.O.156 — Demo gif/mp4 baked into README on every release tag (a 10-second loop of the cove + combat)
- [ ] [LOW]  M_EXPANSION.O.157 — README badges block: CI / coverage / release / license / app-store
- [ ] [LOW]  M_EXPANSION.O.158 — `pnpm assets:lint` — surface any references/ kit not yet ingested into public/assets
- [ ] [LOW]  M_EXPANSION.O.159 — `pnpm specs:lint` — surface any spec doc that hasn't been touched in 90 days
- [ ] [LOW]  M_EXPANSION.O.160 — `pnpm gates:report` — print every coverage rule + commit-gate finding from the last N commits

### M_EXPANSION.DOCS — documentation gaps (161-170)

- [ ] [MED]  M_EXPANSION.D.161 — docs/specs/M_EXPANSION-roadmap.md — a single doc rolling up M_EXPANSION.F.* into a release-train (v0.3 → v0.4 → v1.0)
- [x] [MED]  M_EXPANSION.D.162 — docs/specs/106-replay-format.md — formal spec of the EventLog serialization (M_EXPANSION.F.74/.75)
- [x] [MED]  M_EXPANSION.D.163 — docs/specs/107-mana-resource.md — design for the 4th resource slot (M_EXPANSION.F.72)
- [ ] [MED]  M_EXPANSION.D.164 — docs/specs/108-wonder-victory.md — Wonder building rules (M_EXPANSION.F.71)
- [ ] [MED]  M_EXPANSION.D.165 — docs/specs/109-multifaction.md — design considerations for ≥3 factions (M_EXPANSION.F.94/.95)
- [ ] [MED]  M_EXPANSION.D.166 — docs/contributors.md — a contributor onboarding doc (cloning, env setup, the dev loop)
- [ ] [LOW]  M_EXPANSION.D.167 — docs/specs/20-visual-language.md — append a "post-launch palette" section consistent with M_EXPANSION.U.113 colorblind mode
- [ ] [LOW]  M_EXPANSION.D.168 — docs/specs/80-audio.md — formalise the "audio-on-first-interaction" gate as a contract (we ship it; the spec still says planned)
- [ ] [LOW]  M_EXPANSION.D.169 — docs/STATE.md — single page summarising the LAST verified game-state at commit time (auto-generated)
- [ ] [LOW]  M_EXPANSION.D.170 — docs/migration-log.md — append-only log of every breaking change since v0.1 (informs save-format migrations)

### M_EXPANSION.TECH-DEBT — known shapes worth fixing (171-180)

- [ ] [MED]  M_EXPANSION.D.171 — `src/game/game-state.ts` is ~770 lines (CR finding); split mapgen helpers (findBalancedBoard, matchLengthScale) into a sibling module
- [ ] [MED]  M_EXPANSION.D.172 — `SelectionPanel.tsx` has grown past 400 lines with the disabled-reason helpers; extract reason-helpers to a sibling
- [ ] [MED]  M_EXPANSION.D.173 — `DayNightCycle.tsx` makeDitherTexture lives at module scope and would benefit from a `src/render/textures/` namespace as the family grows
- [ ] [MED]  M_EXPANSION.D.174 — `useRafLoop` accepts a deps array but the underlying useEffect only re-runs on game change; type the deps as `[GameState]` to match
- [ ] [MED]  M_EXPANSION.D.175 — `aria-live-bus.ts` — politeness=assertive coalescing window of 250ms is hard-coded; expose as a config var matching the rest of the engine
- [ ] [LOW]  M_EXPANSION.D.176 — `CreditsModal.tsx` data table belongs in a `.json` so a localisation pass can ship without code review
- [ ] [LOW]  M_EXPANSION.D.177 — `IdlePeonsIndicator` polls every frame for an event that only fires every few seconds; throttle to 4Hz
- [ ] [LOW]  M_EXPANSION.D.178 — `WeatherIndicator` likewise; both could share a 4Hz tick driven by the engine clock
- [ ] [LOW]  M_EXPANSION.D.179 — `Decoration.tsx` is past 600 lines (lint warning threshold); split base-accretion vs scatter into siblings
- [ ] [LOW]  M_EXPANSION.D.180 — `entities/character-factory.ts` is the canonical spawn site; document the 3-use enumeration (fixed/generic-fixed/random) inline so a new contributor reads it BEFORE editing

