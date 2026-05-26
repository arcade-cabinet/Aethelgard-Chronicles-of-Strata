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
2. **Classic-RTS opening** — Town Hall + small stockpile, no
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
spawn ONLY the Town Hall + a small stockpile. Player and AI
symmetric. No pre-spawned peons or military.

### Deliverables

- **§2.1 OPEN.SPAWN** — `src/game/game-state.ts` faction spawn:
  wipe the 2 pre-spawned peons (lines ~652-670) + the
  `extra-peons` bonus path. Spawn Town Hall only.
- **§2.2 OPEN.STOCKPILE** — Add `startingStockpile: { wood: 80,
  stone: 60, gold: 0 }` to faction spawn config. Sized so 2 peons
  (~30 wood each) are queueable on tick 0 and a defensive Wall
  (~20 stone) drops immediately.
- **§2.3 OPEN.TH-AFFORDANCE** — Town Hall first-action highlight:
  when Town Hall is selected and stockpile is sufficient, the
  "Queue Peon" build button gets a faction-coloured pulsing halo
  until the first peon is queued. Once any peon exists, the halo
  retires.
- **§2.4 OPEN.AI-SYMMETRY** — AI player's first scheduler tick
  runs at frame 0 and queues 2 peons. Same stockpile. No
  asymmetric advantage — difficulty axis lives in decision
  quality (AI evaluator weights), not starting resources.
- **§2.5 OPEN.ONBOARDING** — Replace the OnboardingOverlay first
  step ("Watch your peons auto-harvest") with "Tap your Town Hall,
  queue 2 peons." Rewrite the second step accordingly. All 4
  visual baselines for the overlay regenerate.
- **§2.6 OPEN.INACTIVITY** — Inactivity narrator beats: at 30s
  game-time with zero peons queued, emit info-tone toast
  "Aethelgard awaits your first decree." At 90s, stronger
  warning-tone "Your realm cannot grow without peons." Both
  dismissable; reset on first peon queue.
- **§2.7 OPEN.TESTS** — Update the ~6 tests that assert
  starting-peon-count or first-peon-position. Add: spawn-test
  asserts 0 peons + 0 military + 1 Town Hall + 80 wood + 60 stone
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
  selection shows intersection (Return to Town Hall, Hold
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
  adjacent to the player's Town Hall, fire a critical toast
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

## Scope NOT in v0.11

- Single-Squad camera mode (per `docs/specs/200-genre-commitment.md`
  deletions).
- 4X mode card (already deleted from scope).
- Turn-bracketed pacing.
- Multi-formation switching mid-combat (locked by spec).
- Per-Stack mesh authoring (member meshes cluster per formation;
  no new GLBs).

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| §1 strip breaks legacy tests for 4X-only behaviors | High | Wholesale delete the tests; the modes don't exist anymore. |
| §2 spawn change breaks ~6 AIVAI economy tests | High | Update the tests to assert the new opening shape (0 peons → 2 queued by frame 60). |
| §3 stack runtime perf cost (member-mesh clustering) | Medium | Mesh instancing per formation type; reuse existing UnitHexOutline + skinned-character batching. |
| §4 SelectionPanel refactor scope creep | Medium | Hard scope: only multi-select aware; no other panel changes. |
| §5 mob spawn rate × camp count blows the entity ceiling | Medium | Cap at 4 mobs per camp; despawn on Camp death. |
