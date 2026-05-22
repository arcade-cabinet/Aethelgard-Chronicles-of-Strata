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
- [ ] M_GAMEPLAY.2 — multi-unit selection via click-drag rectangle. New
  `selection-rect.ts` overlay; selection state holds a Set; SelectionPanel
  shows count + roster summary on multi.
- [ ] M_GAMEPLAY.3 — right-click commands. Right-click an enemy →
  attack-move (military units engage); right-click a tile → move-to (military
  pathfind); right-click a resource → for selected peon, force-assign (peons
  remain mostly autonomous but accept a one-shot reassignment to a specific
  node). Mobile: long-press = right-click.
- [ ] M_GAMEPLAY.4 — flocking formation. Multi-unit move distributes units
  around the target tile (concentric ring offsets) so they don't stack.
- [ ] M_GAMEPLAY.5 — tracking-ring marker. Right-clicking spawns a glowing
  3D ring at the destination that fades over ~1s — visual feedback the
  command landed.
- [ ] M_GAMEPLAY.6 — building destruction system. A Building entity at 0 HP
  decays (particle + sound), is removed from `buildSites`, restores tile
  walkability, and rebuilds the nav graph. Win/loss already handles base
  destruction symmetrically — this generalizes.
- [ ] M_GAMEPLAY.7 — pause / resume. Top-right Pause button (or P key, or
  app-suspend on mobile) freezes `runEconomyTick`; resume continues.

### M_CONSTRUCTION — construction visualisation per the original spec

- [ ] M_CONSTRUCTION.1 — scaffold + progress ring. A build-site renders as
  a wooden scaffold (yellow pulsing outline) with a 3D progress ring above it
  showing `Building.progress`. On completion: dust-puff particle + the actual
  building pops in.
- [ ] M_CONSTRUCTION.2 — peon-builder assignment visualisation. The
  assigned peon's billboard says "Building"; the peon plays the harvest clip
  (re-skinned as hammering) facing the scaffold; sawdust particles.

### M_COMBAT_POLISH — the combat loop the original conversation specified

- [ ] M_COMBAT_POLISH.1 — projectile system. `OffensiveBehavior` entities
  emit a visible arrow/bolt at their target (every fire-cadence tick).
  Generic `ProjectileSystem` renders + arcs them; siege uses a heavy stone
  ball; archers an arrow; mages a glowing orb (decoupled per damage-type).
- [ ] M_COMBAT_POLISH.2 — attack animations on melee units. The
  AnimatedCharacter ATTACK clip fires on each combat hit; weapon-swing
  particle FX.
- [ ] M_COMBAT_POLISH.3 — floating combat text — `-3 HP` red, `+1 Wood` /
  `+1 Gold` floating popups. CombatText already exists; verify both damage
  AND resource events fire it.
- [ ] M_COMBAT_POLISH.4 — adaptive selection ring. Ring size scales with
  the selected entity's footprint (small for peon, larger for footman, big
  for Town Hall / enemy base / Watchtower).
- [ ] M_COMBAT_POLISH.5 — kill / victory FX pacing. A unit at 0 HP plays
  the death clip; a faction base near 0 triggers a screen-edge red pulse
  the last 30s before defeat; victory triggers a gold confetti burst before
  the modal.

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
- [ ] M_DATA.7 — Discoveries archetype + Science slot (user-flagged: tech
  tree is just another archetype with the slot machinery). Add `science`
  resource slot (accumulates from science buildings + rare events). Define
  a `Discovery` config: cost (science + optional other slots), effect
  (unlocks a unit/building, modifies a stat). Replace `research.ts` with
  the Discoveries graph. HUD: a top button opens a Discoveries panel; each
  discovery shows cost + effect + prereqs. Cost scales logarithmically by
  tree depth so complexity ramps naturally as a match progresses. This
  unifies "tech tree" into the same cause-and-effect language as the rest
  of the game (spec 102 algebra).

### M_ARCHETYPE — finish the archetype unification (spec 102)

- [ ] M_ARCHETYPE.1 — `MoverBehavior` trait — roads. ZoC-neutral; material
  (stone/wood/dirt) + 6-way connector visuals. Snap to other movers + to
  defenders (becoming a Gate at the junction). `rules/snapping.ts`
  placement-time magnetic snap.
- [ ] M_ARCHETYPE.2 — Gate = Mover-on-Defender. Directional passability:
  friendly units cross freely (pathfinding cost 1); enemy units find a
  closed door (impassable, must destroy/circumvent).
- [ ] M_ARCHETYPE.3 — `ConsumerBehavior` trait — resources. Replace
  the hard-coded `ResourceType` enum with Consumer instances (kind + amount,
  threatenable). Future magical-crystal Consumer = one new instance row.
- [ ] M_ARCHETYPE.4 — damage-type × armor table. Each Offender has
  `damageType` (normal | siege | magic | pierce); each Defender has
  `armorVs[damageType]`. Damage = `base * armor`. Trebuchet (unit/building)
  + siege buildings share projectile + cadence law via the table.
- [ ] M_ARCHETYPE.5 — units adopt `OffensiveBehavior`. Footman has the
  trait on spawn; `combat.ts` collapses into the offensive-behavior system
  + the damage-type table. Same projectile/cadence law for units as
  buildings.
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

- [ ] M_AI_DEPTH.1 — difficulty-scaled vision cones. AiPlayer reads
  `game.difficulty` and passes a per-difficulty `unitVisionRadius` to
  `updateObserved` for its own faction (Easy = narrow short; Hard = wide).
- [ ] M_AI_DEPTH.2 — AI training. AiPlayer's TrainEvaluator scores
  "train footman" (gated by `canTrain`); calls the `trainUnit` command.
- [ ] M_AI_DEPTH.3 — AI defence reaction. When a controlled tile of the
  AI's faction is pulsing, the AI moves its nearest military unit there.
  (Currently MilitaryEvaluator only attacks; needs a defend goal.)
- [ ] M_AI_DEPTH.4 — AI building diversity. AI builds House+Granary
  when peon-cap pressure rises; Watchtower at the frontier when an enemy
  is sighted; Wall to close a gap. The BuildEvaluator gets a proper
  priority table (already started — extend with the new types).
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
