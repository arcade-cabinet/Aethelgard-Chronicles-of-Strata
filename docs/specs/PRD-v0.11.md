---
title: PRD v0.11 — Classic-RTS Opening + Stack Runtime + 4X Strip
updated: 2026-05-26
status: current
domain: product
---

# PRD v0.11 — Classic-RTS Opening + Stack Runtime + 4X Strip

## v0.10 → v0.11 transition

**v0.10 (just shipped, released as 0.1.20):**

The v0.10 cycle was the substrate + commitment cycle. It landed:

- **RTS commitment** (`docs/specs/200-genre-commitment.md`) — no turns,
  no 4X, peons selectable+automatable, classic RTS opening as the
  target shape.
- **Stacking spec** (`docs/specs/201-stacking-and-formations.md`) —
  the Stack/StackMember substrate, 8 formations, 6 formation
  Discoveries, the Stack create/dissolve/damage commands, the
  MultiSelectActions floating button.
- **Camera + horizon** — platter rotation, distance-fog horizon,
  `aethelgard:focus-tile` auto-focus tween, settings toggle.
- **Build-time GLB measurement tool** — `pnpm assets:measure` writes
  hex-tile-tuned scale + yOffset + rigging metadata to JSON; SKINS
  + AnimatedCharacter read measured values.
- **Toast bus** — Radix Toast with queue policy + 4 emitters wired.
- **PeonAutonomy trait** + `setPeonAutoMode` command + SelectionPanel
  Take command / Resume automation button.
- **Peon roam-radius / phase-1 distance gate.**
- **HUD design language** — semantic tokens, dual theme, 6 primitives,
  desktop-keyboard subpackage, Maestro flow battery, visual fixture
  battery, `?fixture=` URL routing.
- **Lore + promo prompts** — `docs/lore/{00-canon, factions/*,
  biomes, myth-events, discoveries}.md` and
  `docs/prompts/{intro-video, key-art, biome-thumbs, social-clips}.md`.

**v0.11 (this cycle) is the runtime + opening cycle.** It picks up
the WAIT-FOCUS items deferred from v0.10 — the multi-file refactors
that the v0.10 substrate makes straightforward:

1. **Strip 4X scaffolding** — there is one game shape (RTS).
2. **Classic-RTS opening** — Palace + small stockpile, no
   pre-spawned units. Player and AI symmetric.
3. **Stack runtime** — movement, rendering, combat, peon Work Crew
   auto-form, mob auto-stack.
4. **SelectionPanel multi-select refactor** — unlocks "Select All
   [Type]" + peon command verbs split.
5. **Barbarian Camp + Graveyard mob spawn pipeline** — neutral
   mobs roaming + dropping loot.
6. **Toast wiring expansion** — enemy-engages, ZoC breach, MYTH
   event fire.

## §1 — 4X scaffolding strip (M_V11.RTS-PURGE)

The codebase carries 4X-mode artifacts from earlier era-of-strata
experiments: `EndTurnButton`, `EraProgressPill`, age-of-strata mode
UI, turn-bracketed pathways like `Combatant.restUntilTurn` +
`currentTurn` in path-follow. Per `docs/specs/200-genre-commitment.md`
the commitment is RTS-only.

### Deliverables

- **§1.1 PURGE.UI** — Delete `EndTurnButton`, `EraProgressPill`,
  age-of-strata mode UI surfaces. Strip their App.tsx mounts.
  Remove the `age-of-strata` mode entry from NewGameModal.
- **§1.2 PURGE.MODE-ENUM** — Audit `src/config/modes*.ts` for
  4X-only mode entries. Reduce to `border-clash` (the canonical
  RTS shape) + the existing tutorial/ai-vs-ai variants. NewGameModal
  mode picker collapses accordingly.
- **§1.3 PURGE.TURN-GATE** — Remove `currentTurn` parameter from
  path-follow and other systems. Delete `Combatant.restUntilTurn`
  (RTS = continuous, no turn gating). Update all callsites.
- **§1.4 PURGE.SCORING** — Remove the 4X-only scoring screen path
  (the per-era scoring panel). Keep the existing per-faction
  end-game stats summary — that's RTS-applicable.
- **§1.5 PURGE.E2E** — Delete e2e specs that exercise the
  `age-of-strata` mode (`*era*.spec.ts`, scoring-screen specs that
  assume era progression). RTS specs stay.
- **§1.6 PURGE.DOCS** — Strike 4X / era / turn references from
  `docs/specs/*.md` (excluding the historical PRD-v0.4..v0.10
  files, which are append-only history). Update README + CLAUDE.md.

## §2 — Classic-RTS opening (M_V11.RTS-OPEN)

Per `docs/specs/200-genre-commitment.md` §"The classic RTS opening":
spawn ONLY the Palace + a small stockpile. Player and AI
symmetric. No pre-spawned peons or military.

### Deliverables

- **§2.1 OPEN.SPAWN** — `src/game/game-state.ts` faction spawn:
  wipe the 2 pre-spawned peons (lines ~652-670) + the
  `extra-peons` bonus path. Spawn Palace only.
- **§2.2 OPEN.STOCKPILE** — Add `startingStockpile: { wood: 80,
  stone: 60, gold: 0 }` to faction spawn config. Sized so 2 peons
  (~30 wood each) are queueable on tick 0 and a defensive Wall
  (~20 stone) drops immediately.
- **§2.3 OPEN.TH-AFFORDANCE** — Palace first-action highlight:
  when Palace is selected and stockpile is sufficient, the
  "Queue Peon" build button gets a faction-coloured pulsing halo
  until the first peon is queued. Once any peon exists, the halo
  retires.
- **§2.4 OPEN.AI-SYMMETRY** — AI player's first scheduler tick
  runs at frame 0 and queues 2 peons. Same stockpile. No
  asymmetric advantage — difficulty axis lives in decision
  quality (AI evaluator weights), not starting resources.
- **§2.5 OPEN.ONBOARDING** — Replace the OnboardingOverlay first
  step ("Watch your peons auto-harvest") with "Tap your Palace,
  queue 2 peons." Rewrite the second step accordingly. All 4
  visual baselines for the overlay regenerate.
- **§2.6 OPEN.INACTIVITY** — Inactivity narrator beats: at 30s
  game-time with zero peons queued, emit info-tone toast
  "Aethelgard awaits your first decree." At 90s, stronger
  warning-tone "Your realm cannot grow without peons." Both
  dismissable; reset on first peon queue.
- **§2.7 OPEN.TESTS** — Update the ~6 tests that assert
  starting-peon-count or first-peon-position. Add: spawn-test
  asserts 0 peons + 0 military + 1 Palace + 80 wood + 60 stone
  for each faction.

## §3 — Stack runtime (M_V11.STACK-RUNTIME)

The substrate from v0.10 is data + commands only. v0.11 wires the
runtime: stacks MOVE as one, RENDER as a single visual badge with
clustered member meshes, and FIGHT with their combined stats.

### Deliverables

- **§3.1 STACK.MOVE** — `TileInteraction` tap-to-move on a tile
  routes through the stack: a tap with a selected Stack issues a
  PathRequest from the stack's tile, not from each member's tile.
  Members are pinned to the stack's tile (zero per-member pathing
  while in a stack).
- **§3.2 STACK.STEP-LERP** — On stack creation, members 200ms-lerp
  from their original tile to the stack tile (matches the spec's
  "members teleport to the stack tile with a fast 200ms lerp"
  language).
- **§3.3 STACK.COMBAT** — `OffensiveBehavior` system: when a unit
  in a Stack engages an enemy unit (or Stack), damage is dealt to
  the Stack's combinedHp via `damageStack`, not to individual
  members. Stack-vs-stack ticks simultaneously. Member-by-member
  combat for un-stacked units unchanged.
- **§3.4 STACK.RENDER** — `src/world/StackRender.tsx`: per Stack
  entity, render a formation badge SVG (per `FORMATIONS[id]`
  spec) centered on the stack tile + cluster the member meshes
  per the formation visual (Phalanx = shoulder-to-shoulder line,
  Wedge = V, Square = 2×N tight grid, etc.). UnitHexOutline draws
  a thicker faction-color ring under a Stack.
- **§3.5 STACK.WORK-CREW** — Peon Work Crew auto-form: when 2+
  same-faction peons in auto-mode end a tick on the same harvest
  tile, auto-create a Work Crew Stack. Harvest-system applies the
  +20% per-peon-up-to-4 buff. Dissolve when peons split off.
- **§3.6 STACK.MOB-RABBLE** — Graveyard / Barbarian Camp mob
  auto-stack: when 2+ mobs of the same camp end a tick on the
  same tile, auto-create a Rabble Stack. Mob max stack 6 (per
  spec — mobs always read as rabble vs player formations).
- **§3.7 STACK.PANEL** — SelectionPanel "Switch Formation"
  fieldset: when a Stack is selected, surface the player's known
  formations (derived from Research.purchased) + current; tap to
  switch (if `FORMATIONS[id].validate(memberTypes)` passes). NOT
  allowed mid-combat (per the spec — locks in the tactical
  decision).
- **§3.8 STACK.SAVE** — Verify save/load round-trips Stack +
  StackMember correctly (SERIALIZED_TRAITS already lists them;
  test by saving a stacked game, loading, asserting cohort
  re-mounts).

## §4 — SelectionPanel multi-select refactor (M_V11.SELECTION)

SelectionPanel today is single-selection-shaped. v0.11 multi-aware
refactor unlocks several deferred items: "Select All [Type]"
sidebar actions, peon command-verb split, batch Take command.

### Deliverables

- **§4.1 SEL.MULTI-VIEW** — SelectionView extends to carry an
  `entities: SelectionEntry[]` array. Single-select case becomes
  `entities.length === 1`. The render path branches: 1 entity →
  current detailed panel; 2+ → multi-select header (counts per
  unit type) + intersection action row (commands applicable to
  ALL selected) + per-type subgroup actions.
- **§4.2 SEL.ALL-OF-TYPE** — Sidebar "Select All Footmen" /
  "Select All Peons of [biome X]" buttons. Pull from ECS
  `world.query(Unit, FactionTrait)`. Touch-friendly, no rectangle
  drag.
- **§4.3 SEL.PEON-VERBS** — Per-unit-type command verb split:
  peons get Harvest here / Build here / Repair / Return to Town
  Hall / Take command / Resume automation. Military get
  Attack-move / Patrol / Hold position / Fall back. Mixed
  selection shows intersection (Return to Palace, Hold
  position) + per-type submenus.
- **§4.4 SEL.BATCH-PEON** — Batch Take command for peon selection.
  Calls `setPeonAutoMode` on every peon in the selection.
  MultiSelectActions component absorbs this (no longer just
  Stack/Unstack).

## §5 — Barbarian Camp + Graveyard mob spawn pipeline (M_V11.CAMPS)

The shared-asset-pool split (player+AI on the Adventurers pool;
mobs on the Mystery pool) was scoped in `docs/specs/201-
stacking-and-formations.md` §4. v0.11 lands the runtime.

### Deliverables

- **§5.1 CAMPS.SPAWN** — Map-gen places N barbarian camps in
  neutral territory at start (N scales with map size:
  small=2, medium=4, large=6, huge=8). Each camp is a Building
  entity of type 'BarbarianCamp' + carries an EnemySpawner trait
  scoped to the Mystery mob pool.
- **§5.2 CAMPS.MOB-SPAWN** — Tick-based mob spawn: every
  90-180s (eventRng-driven) per camp, spawn 1 mob of
  {Wraith, Skeleton, Ghoul} (Mystery-pool roles). Cap N=4 mobs
  per camp at any time.
- **§5.3 CAMPS.WANDER** — Mob wander behavior: each mob has a
  WanderBehavior trait with a radius from its spawn camp (~5
  hexes). Each tick, with probability p=0.05, picks a random
  walkable tile in radius and queues a path.
- **§5.4 CAMPS.HOSTILE-ALL** — Mobs are FactionTrait
  'barbarian-camp-N' (or shared 'barbarian' faction id). The
  combat system treats them as hostile to ALL factions (player,
  AI, and other camp mobs). No mob-vs-mob friendly-fire (camps
  share the 'barbarian' faction).
- **§5.5 CAMPS.LOOT** — Per-mob loot drop on death: spawns a
  small resource cache entity on the death tile. Cache contains
  10 wood / 10 stone / 5 gold (resource-type weighted by spawn
  biome). First player/AI unit to walk over it collects (already
  exists via the pickup-cache system).
- **§5.6 CAMPS.DESTROY** — When a Camp building is destroyed,
  all its spawned mobs are destroyed too (no orphan mobs after
  clearing). Drops the existing 50 wood + 50 stone + 1
  Discovery reward (already shipped; just connect the cleanup
  hook).
- **§5.7 CAMPS.TESTS** — Unit tests on the camp spawn pipeline
  (mob count over time, loot drop on death, destroy cascades to
  mobs). E2E test: 4-player game, clear one camp, assert reward
  + visual cleanup.

## §6 — Toast wiring expansion (M_V11.NOTIF)

v0.10 shipped the Toast bus + 4 emitters (Discovery, Wonder,
camp clear, first-harvest). v0.11 lands the remaining critical
emitters.

### Deliverables

- **§6.1 NOTIF.ENEMY-AT-TH** — When an enemy unit enters a tile
  adjacent to the player's Palace, fire a critical toast
  "Enemy at the gates" with focus={townHall.q, townHall.r}.
  Dedup id keyed by 'enemy-at-th'.
- **§6.2 NOTIF.ZOC-BREACH** — When a tile flips faction (player
  loses or gains a tile), fire an info-tone toast "Your border
  shifted" with focus on the flipped tile. Dedup id keyed by
  'zoc-shift-{q}-{r}' so flapping tiles don't spam.
- **§6.3 NOTIF.MYTH-EVENT** — When a MYTH event fires (the
  per-event registry already exists), fire a warning-tone
  toast with the event's Chronicler quote (from
  docs/lore/myth-events.md) + focus on the event tile. Per-event
  dedup.
- **§6.4 NOTIF.STACK-DISSOLVED** — When a Stack auto-dissolves
  due to combat damage (M_V10 STACK.4 path), fire an info-tone
  toast "Cohort broken" with focus on the dissolution tile.

## §7 — Quality + ongoing hygiene

### §7.1 — Performance baseline refresh

v0.10's per-tick additions (walkable check, roam-radius filter,
stack-substrate query) pushed CI test timeouts. v0.11 should
profile + reclaim the budget.

- **§7.1.1 PERF.PROFILE** — Run a 4-player AIVAI sim (300s) via
  `?ai-vs-ai=1&nplayer=4`. Capture a Chrome performance trace
  via `mcp__chrome-devtools-mcp`. Record mean frame time, max
  frame time, GC count. Compare against pre-v0.10 baseline at
  `docs/specs/perf-baseline.md`. Identify top 3 hot paths.
- **§7.1.2 PERF.RECLAIM** — Address each identified hot path
  with a targeted optimization. Goal: bring CI runtime within
  120% of pre-v0.10 (currently 200%+ in some specs). Update
  test timeouts down accordingly.

### §7.2 — Visual baseline lock

The v0.10 baselines were updated as part of the merge. v0.11
should run the full `pnpm visual:battery:ci` against the
classic-RTS opening (post §2) and lock the new baselines for
each fixture.

- **§7.2.1 VISUAL.LOCK** — Post-§2, run `pnpm visual:fixtures`,
  judge each output against the brief in
  `docs/specs/20-visual-language.md`, commit baselines.

### §7.3 — Release ladder (v0.1.21+)

- **§7.3.1 RELEASE.LADDER** — Land each of §1, §2, §3, §4, §5,
  §6, §7 as its own PR. release-please auto-stages the version
  bump per Conventional Commits scope. Goal: ship v0.11.0 by
  end of cycle.

## §8 — Procedural buildings via composed structural primitives (M_V11.PROCMESH)

User direction 2026-05-26 (refined): "no fallbacks, we're gonna
make all buildings have a procedural buildout and then skins the
coloring for the buildings. But we're gonna be smart by
internalizing the building types and shapes from the reference
doc as building blocks (e.g. logs, towers, buttresses, etc...) as
the lowest level for Koota and then make each building from a
composition of those lower order, versus bespoke for each
building. That will be a significant improvement over the
reference." Plus: "we're gonna entirely remove GLB buildings",
"Props and units we'll keep GLBs for now as that seems to be
working much better", "we'll also keep the graveyard pieces for
horde camps", "for now just each human/AI player will be built
from lower order structural components > buildings > skins."

### Scope

| Asset class | Source post-§8 |
|---|---|
| Player/AI faction buildings (Palace, Barracks, Wall, Watchtower, Farm, House, Granary, Library, Wonder) | **Procedural — composed from structural primitives** |
| Player/AI units (Peon, Footman, Knight, Wizard, etc.) | **GLB (KayKit Adventurers)** — unchanged |
| Nature props (trees, rocks, banners, fountains, gravestones) | **GLB** — unchanged |
| Horde-camp / Graveyard pieces (crypt, gravestones, portal-crypt) | **GLB (KayKit Mystery / Graveyard Kit)** — unchanged |

GLB building files (`public/assets/structures/rts/*`, `crypt.glb`
when used as a Palace, `town-center/*`, `barracks/*`, etc.) get
removed from the PLAYER/AI PATH. The Graveyard Kit GLBs (`crypt`,
`gravestone-*`, `portal-crypt`) STAY because horde camps continue
to use them.

### Architecture — three-tier composition

```
src/world/procedural/
  primitives/        # Tier 1: structural primitives (the koota-low-level)
    Log.tsx               # horizontal-stacked log row + end caps
    StonePlinth.tsx       # cylindrical or boxed foundation
    WoodPost.tsx          # vertical wood beam, configurable height
    StoneBrick.tsx        # stone-textured brick segment
    Banner.tsx            # rectangular banner mesh with optional emblem
    GoldTrim.tsx          # gold band (cylinder or box, configurable)
    Battlement.tsx        # crenellation block
    ConeRoof.tsx          # tower-cap cone with optional finial
    PitchedRoof.tsx       # gabled roof for buildings
    Column.tsx            # column shaft + capital + fluting
    Window.tsx            # frame + emissive glass + muntins
    Door.tsx              # door + frame + panels + handle
    WeaponRack.tsx        # rack + N weapons
    Chimney.tsx
    Spire.tsx             # cone + finial + base
    Buttress.tsx          # angled support
    Shield.tsx            # round or kite, faction-coloured
  buildings/         # Tier 2: building compositions (each = a tree of primitives)
    Palace.tsx
    Barracks.tsx
    Wall.tsx
    Watchtower.tsx
    Farm.tsx
    House.tsx
    Granary.tsx
    Library.tsx
    Wonder.tsx
  index.ts           # building<-->logical-id map for SKINS lookup
```

The composition discipline:

1. **A primitive accepts MATERIAL props, not COLOR props**:
   `<Log color={...}>` is wrong; `<Log material={woodMat}>` is
   right. The material itself is a `MeshStandardMaterialProps`
   object the building composer passes through. SKINS swaps
   materials globally per faction; primitives don't know about
   factions.
2. **A building composes primitives**: `Palace.tsx` mounts
   `<StonePlinth>` + 4× `<Column>` + N× `<Wall>` segments +
   `<PitchedRoof>` + `<Banner>` + `<Spire>` — that's the whole
   file, no inline meshes. The reference doc's bespoke building
   bodies become primitive composition trees.
3. **SKINS provides the materials**: each Skin has a
   `factionMaterials` slot returning a typed Record of
   `MeshStandardMaterialProps` keyed by primitive family
   (`stone`, `wood`, `banner`, `trim`, `accent`, `glass`).
   Each faction overrides only the colors / metalness /
   roughness it cares about; defaults supplied for the rest.

### Why this is a step up from the reference

- **N buildings × M primitives = O(N + M) code** instead of the
  reference's O(N × inline meshes). Adding a third faction is a
  new `factionMaterials` row, not a re-implementation of every
  building.
- **A new building type = a new composition file**, with all the
  primitives ready. The reference re-implements adornments per
  building; here a `<Banner>` mesh is one component shared by
  every building that wants one.
- **Visual harnesses pin every primitive** in isolation (a single
  `<Log>` rendered against a hex baseplate, materials default),
  so a renderer / material change can't silently rot a Granary's
  silo band without also reddening the primitive baseline.

### Deliverables (revised)

- **§8.1 PROCMESH.PRIMITIVES** — `src/world/procedural/primitives/`
  with the tier-1 component set (see tree above). Each accepts
  `material?: MeshStandardMaterialProps`, `position`, dimensional
  args, and renders pure r3f primitives. ZERO faction knowledge
  at this layer.
- **§8.2 PROCMESH.MATERIALS** — Skin gains a `factionMaterials:
  Record<PrimitiveFamily, MeshStandardMaterialProps>` slot
  (defaults provided). Per faction the player/AI banner +
  stone tone + trim shifts; KayKit-tinted-unit pattern from
  v0.10 stays for units.
- **§8.3 PROCMESH.BUILDINGS** — `src/world/procedural/buildings/`
  with Palace + Barracks + Wall + Watchtower + Farm + House +
  Granary + Library + Wonder. Each composes primitives + reads
  `factionMaterials` via a context or prop. NO inline meshes —
  if a building needs a shape no primitive covers, ADD A
  PRIMITIVE first.
- **§8.4 PROCMESH.SKINS-PIVOT** — SKINS.structure[type] no longer
  carries `logicalId` for the building set; it carries a
  `proceduralComponent` reference (the buildings/<Type>.tsx
  export). `FactionBase` + `StructureMesh` switch on that.
  Existing GLB-path callers for Graveyard horde camps (crypt,
  gravestone, portal-crypt) keep the `logicalId` slot — that
  pool is unchanged.
- **§8.5 PROCMESH.HARNESS** — Vitest browser test per primitive
  (~16 baselines) + per building composition (~9 baselines) +
  per faction-skin × representative building (e.g. 2 factions ×
  Palace = 2 baselines). Lock the adornments + material
  overrides so future drift is caught at PR time.
- **§8.6 PROCMESH.GLB-CLEANUP** — delete the player/AI building
  GLBs from `public/assets/structures/rts/` (town-center,
  barracks, tower-house, wall — both first-age + second-age
  variants). Update src/rules/glb-metadata.json + the
  measure-glbs.mjs categorization to skip the deleted paths.
  Graveyard Kit + non-building props stay.
- **§8.7 PROCMESH.PLAYER-SECONDARY-BUILDINGS** — the Farm /
  House / Granary / Library entries currently using Fantasy
  Town Kit GLBs (windmill, watermill, house, etc.) flip to
  procedural so faction identity carries through the whole
  player base.

### What this does NOT do

- Does NOT touch player/AI UNIT GLBs (KayKit Adventurers stay).
- Does NOT touch nature-prop GLBs (trees, rocks, banners,
  fountains stay).
- Does NOT touch the GRAVEYARD KIT GLBs (crypt, gravestone
  variants, portal-crypt) — these continue to drive horde camps.
- Does NOT change game balance. Visual + asset-pipeline only.

### Open question — building footprints

The reference's procedural buildings ship at a known scale
(WallSegment ~1.3 wide for hex tile fit). Each `buildings/<Type>.tsx`
documents its source-unit bbox and the hex-fit scale at the top
of the file. The `pnpm assets:measure` tool (M_GAME.SCALE.GLB-
MEASURE.1) doesn't apply to procedural — bbox is known at compile
time. SKINS optionally carries a per-faction scale multiplier for
buildings (Wonder might be 1.6× normal, etc.).

## Scope NOT in v0.11

- Single-Squad camera mode (per `docs/specs/200-genre-commitment.md`
  deletions).
- 4X mode card (already deleted from scope).
- Turn-bracketed pacing.
- Multi-formation switching mid-combat (locked by spec).
- Per-Stack mesh authoring (member meshes cluster per formation;
  no new GLBs).

## §9 — Lifted deferrals (user direction 2026-05-26)

Per user "EVERYTHING in scope, NOTHING deferred", §9 brings the
previously-deferred sub-items back as actionable work:

- **STACK.WORK-CREW.BUFF** — harvest +20%/peon cap +80% (4
  members) (`src/ecs/systems/harvest.ts` workCrewMultiplier).
- **STACK.PANEL.MULTI-STACK** — `setStackFormation` applies to
  every selected Stack, not just the primary.
- **SEL.PEON-VERBS.SUBMENUS** — per-class verb surfaces for
  mixed selections (Stance — Military (N), Take peons (N)).
- **SEL.ALL-OF-TYPE.BIOME** — biome-scoped peon selector.
- **PROCMESH.WALL-VARIANTS** — hasGate + isCorner variants on
  the procedural Wall; deleted dead gate-stone + wall-stone-
  corner GLBs.

## §10 — Polish, UI/UX, HUD crowding

The visual + a11y + density gates between PR open and merge:

- **HUD-AUDIT** — multi-viewport screenshot battery (60 captures
  via `JOURNEY=1 pnpm test:e2e:multiview`).
- **HUD-CROWDING** — WinConditionPill responsive top offset;
  SelectionPanel maxHeight clamp + overflow.
- **SCREENSHOT-BATTERY** — 10-shot journey-capture extended with
  long-sim (90s mobs visible) + procedural-buildings zoom.
- **VISUAL-COMPARE** — judgement ledger at
  `docs/screenshots/v0.11/judgement.md`.
- **A11Y-SWEEP** — axe-core extended to SelectionPanel.
- **MOBILE-MAESTRO** — selector-level validation of every
  `.maestro/*.yaml`; SystemMenu items now have id+aria-label;
  nplayer-setup.yaml rewritten for v0.11 2-faction setup.
- **SELECTION-PANEL-DENSITY** + **ACCORDION** — maxHeight
  + native `<details>` for Build + Research lists.
- **STACKRENDER-DEDUP** — formation badge y=1.45 sits under
  HealthBillboard y=2.1.
- **LOOT-FX** — spinning gem above un-collected LootCache.
- **CAMP-MOB-VISUAL** — CAMP_COLORS 6-step hue band.
- **PROCMESH-FACTION-CROSS** — 9 buildings × enemy palette
  visual baselines.
- **PEON-CTA-DECAY** + **WAYPOINT-RESPONSIVENESS** + **BUILD-
  MENU-CTA** + **FOCUS-TILE-CALLERS** — verified.
- **JOURNEY-CAMERA-EVENTS** — `aethelgard:focus-palace`
  forward + 3 follow-up items (BUILD-MENU-CTA / JOURNEY-
  CAPTURE-ZOOM / CAMERA-TWEEN-RACE) tracked + resolved.

## §11 — End-to-end verification gate

Hard merge gates:

- **LOCAL-PLAYTHROUGH** — automated proxy via
  `tests/e2e/ai-vs-ai-playthrough.spec.ts` (300s sim, both
  modes, webm + per-5s frames).
- **AIVAI-200S-BAKE** — `tests/unit/aivai-200s-bake.test.ts`
  (6 invariants over 400 ticks).
- **SAVE-LOAD-MID-MATCH** — `tests/unit/save-load-mid-match.test.ts`
  (90s sim → serialize → deserialize → byte-identical
  invariants).
- **CAMERA-SANITY** — `tests/unit/camera-sanity.test.ts`
  (clamp helper + bound math).
- **PERF-MOBILE** — `tests/e2e/perf-mobile-trace.spec.ts`
  (Pixel-7 viewport, 660-frame rAF sample, p95 < 40ms gate;
  current numbers mean 14ms p95 37ms).

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| §1 strip breaks legacy tests for 4X-only behaviors | High | Wholesale delete the tests; the modes don't exist anymore. |
| §2 spawn change breaks ~6 AIVAI economy tests | High | Update the tests to assert the new opening shape (0 peons → 2 queued by frame 60). |
| §3 stack runtime perf cost (member-mesh clustering) | Medium | Mesh instancing per formation type; reuse existing UnitHexOutline + skinned-character batching. |
| §4 SelectionPanel refactor scope creep | Medium | Hard scope: only multi-select aware; no other panel changes. |
| §5 mob spawn rate × camp count blows the entity ceiling | Medium | Cap at 4 mobs per camp; despawn on Camp death. |
