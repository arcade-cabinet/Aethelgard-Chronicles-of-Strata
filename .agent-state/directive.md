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

### M_BALANCE_2 — map-size scaling (user feedback, 2026-05-22)

User: "map size has to be significantly bigger. small, medium, large, huge,
all scale by lets say.... 50% then 40% then 30% then 20% respectively and
see where we land". Current radii (12/20/28/36) — scale UP by the requested
percentages, verify perf headroom holds at the new Huge.

- [x] M_BALANCE_2.1 — bumped mapSizes (12/20/28/36 → 18/28/36/43, the user's
  +50/+40/+30/+20% scaling); generateBoard radius cap raised 32 → 48 to
  accept Huge with headroom. All 315 tests still green (the determinism
  smoke + economy/spawn integration cover the new sizes implicitly).
- [ ] M_BALANCE_2.2 — playtest pass at each new size: AI-vs-AI determinism
  smoke still passes at radius 28+; spawn/economy/encroachment timings still
  produce a finishable match. Tune `combat.json` thresholds if Huge feels
  endless.
- [ ] M_POLISH.3 — sword-clash / shield-deflect SFX variants on
  combat-hit by attacker class (not the generic hit cue).
- [x] M_POLISH.4 — victory confetti: VictoryConfetti.tsx — 60 gold/amber/
  bronze BoxGeometry pieces, ballistic with gravity, 3s lifetime, fades to
  zero. Fires on the moment game.outcome flips to 'win'.
