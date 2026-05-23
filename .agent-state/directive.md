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

## Delivery

ONE feature branch `feat/aethelgard-initial-release`, one commit per task, ONE final PR
delivering debug Android APK + GitHub Pages web. Squash-merge on green.

---

## Shipped

See **`docs/MILESTONES.md`** for the full historical record. Summary:

- **M0–M6** — foundation, hex board, characters, economy, combat, systems, polish & ship.
- **M7** — yuka AI subpackage + asset expansion (Castle/Town/Graveyard kits, +3 monster types, audio + decoration).
- **M8** mechanics arc — faction symmetry, command API, zone of control (replaces fog), rules engine, peon autonomy, yuka Think-brain AI player, behavior-archetype local ZoC, AI-vs-AI E2E.
- **M9.1 + M9.3 + M9.4** — UX (build menu, legend, onboarding), e2e player-journey suite, visual baselines, CHANGELOG, Capacitor sync, pre-push gate.

Specs **96–102** define the architecture (peak: spec 102 — magnetic emitters, archetype composition algebra, damage-type × armor table).

---

## Active queue

The work to deliver a **complete, polished, exercised, releasable** game. Audited
against the original `references/conversation.md` vision so nothing the user
specified is dropped; expanded to cover everything a finished commercial RTS needs.

### M_REL — release the current state first

- [ ] [WAIT-CI] M_REL.1 — PR #1 CI green on `458106a` (CodeRabbit fixes) →
  squash-merge to main → confirm cd.yml deploys GitHub Pages + APK artefact.
  Do NOT block the rest of the queue on this — once merged, RE-OPEN a follow-on
  PR on the same branch for the remaining queue (M_GAMEPLAY → M_RELEASE_FINAL).

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
- [ ] M_ARCHETYPE.2 — Gate = Mover-on-Defender. Directional passability:
  friendly units cross freely (pathfinding cost 1); enemy units find a
  closed door (impassable, must destroy/circumvent).
- [x] M_ARCHETYPE.4 — damage-type × armor table (336c611): DamageType
  union; OffensiveBehavior.damageType; DefensiveBehavior.armorVs*; rules/
  damage.ts armorMultiplier + applyArmor. 281 tests.
- [x] M_ARCHETYPE.5 — units adopt OffensiveBehavior (1d55136): every
  combat unit spawns with the trait — radius=attackRange, dps=damage/
  cooldown, damageType='normal'. Unified with buildings; siege = single
  row change.
- [ ] M_ARCHETYPE.6 — `rules/force-field.ts` — bi-signed magnetic field.
  Each archetype declares attract/repel per (faction, target-kind). Three
  consumers: placement snapping, pathfinding cost, AI targeting/motivation.
  Enemy-base placement becomes principled Attractor-repels-Attractor.
- [ ] M_ARCHETYPE.7 — per-tile bitmask packing — `Uint32Array[tileIndex]`
  holding walkable + crossingLanding + controlled×2 + observed×2 +
  pulsing×2 + hasResource + hasBuilding + isRamp + biomeIndex + spare.
  Force-field sampling becomes pointer-arithmetic.

### M_ASSETS — replace the placeholder structure GLBs

- [ ] M_ASSETS.1 — ingest the KayKit Ultimate Fantasy RTS pack from the
  assets-library MCP (TowerHouse, Windmill, Archery, WonderWalls, Stable,
  etc). Each building type gets a dedicated, real GLB on both faction
  skins; `structure-models.ts` table updated.
- [ ] M_ASSETS.2 — Watchtower model: KayKit Medieval Hexagon
  `building_watchtower_*` (4 colour variants — one per "level" upgrade).
- [ ] M_ASSETS.3 — visual self-judge pass: every building rendered in-game
  vs `references/poc1.png` / `references/poc2.html` art level. Iterate
  scale/yOffset/rotation per type. Screenshot-judged before commit.

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

- [ ] M_AUDIO.1 — extend `scripts/asset-map.ts` to ingest every event-needed
  sample from the packs (not just the few wired today). Run `pnpm
  assets:ingest`; verify `asset-metadata.json` lists them all.
- [ ] M_AUDIO.2 — `src/audio/sound-map.ts` maps EVERY game event to a real
  pack sample: peon-selected, peon-deposit, chop, mine-stone, mine-gold,
  build-start, build-complete, combat-hit, combat-crit (magic-impact), arrow-
  whoosh, sword-clash, shield-deflect, enemy-growl, unit-death, encroachment-
  pulse, tile-flip, ui-button-click, ui-panel-open, research-purchased,
  rally-set, victory-stinger, defeat-stinger, gameplay-loop, title-loop.
- [ ] M_AUDIO.3 — title-screen music loop from `PixelLoops_Main_Menu` plays
  on launch; switches to a Fantasy_Tavern_Music_Pack loop in-game; both
  honour the SoundToggle mute.
- [ ] M_AUDIO.4 — victory + defeat play a *different* stinger from the
  24-stinger pack (currently a short generic). Pick distinct fitting cues.
- [ ] M_AUDIO.5 — footsteps: when a unit moves on grass vs stone vs sand,
  the footstep cue per surface (per the dedicated footstep pack); throttled
  so it doesn't spam.
- [ ] M_AUDIO.6 — encroachment pulse fires a periodic warning beep while
  the tile is pulsing; tile-flip triggers a "doom" cue.

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
- [ ] M_AI_DEPTH.5 — AI-vs-AI matches reach a decisive outcome under
  300 game-seconds at Normal difficulty. Tune dps / cadence / build
  priorities until matches converge to win or loss reliably.

### M_MOBILE — Pixel-5a-class polish

- [ ] M_MOBILE.1 — touch interactions: tap-to-select, tap-to-place, long-
  press = right-click, two-finger zoom, one-finger drag-pan. Verify on
  the dev server with Playwright mobile emulation.
- [ ] M_MOBILE.2 — portrait HUD layout — verify ResourceBar (compact),
  Minimap, ZoneLegend, SelectionPanel all readable + reachable; safe-area
  insets honoured.
- [ ] M_MOBILE.3 — perf budget — measure FPS at Huge map (radius 16) on
  Pixel-5a emulation; if <30fps, profile + optimise (likely candidates:
  Decoration instancing, ZoneBorder geometry rebuilds, FogOverlay rebuild).
- [ ] M_MOBILE.4 — APK install test: `pnpm build:native`, install the
  signed-debug APK on a device or emulator; verify boot → new game →
  first peon claim works.

### M_BALANCE — playtest + tune

- [ ] M_BALANCE.1 — economy curve: time-to-first-Footman, time-to-first-
  attack, base economy vs. enemy spawn rate. Tune `economy.json` +
  `combat.json` until Normal difficulty feels fair but tense.
- [ ] M_BALANCE.2 — building costs vs. yield: Farm supply contribution,
  House peon-cap, Granary, Watchtower dps + range, Wall HP.
- [ ] M_BALANCE.3 — Easy/Hard difficulty actually differs in feel
  (Hard noticeably harder; Easy noticeably easier — beyond just spawn
  interval).

### M_ACCESSIBILITY

- [ ] M_ACCESS.1 — keyboard support — Tab to cycle selectable HUD
  buttons; Esc to close modals; arrow keys to pan; +/- to zoom.
- [ ] M_ACCESS.2 — screen-reader landmarks — main game canvas labeled,
  HUD regions named, dialog focus-trapped (Radix already partly handles
  this; audit + fix gaps).
- [ ] M_ACCESS.3 — color contrast pass — every HUD element ≥ WCAG AA
  vs its background; the territory border + pulse colors readable to
  colorblind users (provide a high-contrast toggle in Settings).

### M_TITLE — title-screen polish per the original spec

- [ ] M_TITLE.1 — animated golden ocean + sky behind the title screen
  (per the original "Seeded Menu Environment"). r3f Canvas mounted on
  the title screen with a simplified scene.
- [ ] M_TITLE.2 — title music — a fitting Kenney/licensed loop in the
  audio buses; muted by default if SoundToggle off.
- [ ] M_TITLE.3 — version line + author/license credits row in a small
  font at the bottom (commercial release — minimal but present).

### M_RELEASE_FINAL

- [ ] M_RELEASE_FINAL.1 — full audit pass: every spec claim has a
  pinning test; no `TODO`/`FIXME`/`as any` slipped in; biome lint clean
  at the strictest level we run.
- [ ] M_RELEASE_FINAL.2 — comprehensive-review:full-review skill vs
  `origin/main..HEAD`, address every actionable finding (real bugs only;
  document deferred nits in `docs/POSTREL.md`).
- [ ] M_RELEASE_FINAL.3 — CHANGELOG 0.3.0 section: covers M_GAMEPLAY,
  M_CONSTRUCTION, M_COMBAT_POLISH, M_ARCHETYPE, M_ASSETS, M_AUDIO,
  M_AI_DEPTH, M_MOBILE, M_BALANCE, M_ACCESS, M_TITLE.
- [ ] M_RELEASE_FINAL.4 — PR description rewrite — sum the journey
  M6→M7→M8→M9→M_GAMEPLAY→...→M_RELEASE_FINAL; one paragraph per phase.
- [ ] M_RELEASE_FINAL.5 — `pnpm verify` + `test:browser` + `test:e2e`
  + `test:visual` all green on the final commit.
- [ ] M_RELEASE_FINAL.6 — squash-merge to main; confirm cd.yml deploys
  GitHub Pages + APK artefact; flip Status to RELEASED.
