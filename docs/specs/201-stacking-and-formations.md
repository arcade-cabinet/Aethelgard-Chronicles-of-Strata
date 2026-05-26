---
title: Stacking, Formations, Faction Encircle Coloring, and Barbarian Camps (RTS)
updated: 2026-05-25
status: current
domain: product
---

# Stacking, Formations, Faction Encircle Coloring, and Barbarian Camps

## What this doc covers

Five interlocking mechanics that together complete the RTS commitment
made in `docs/specs/200-genre-commitment.md`:

1. **Faction encircle coloring** — the per-tile faction-color ring
   that delineates "whose unit is on this hex" — already shipped
   substrate as `UnitHexOutline`. Confirmed canonical.
2. **Stacking** — multiple offensive or defensive units on a single
   tile, grouped into a formation that moves as one and fights with
   combined stats.
3. **Formations** — era-flavored grouping templates (Phalanx, Cadre,
   Vanguard, Wedge, Square, Skirmish Line, etc.) that govern HOW
   the stacked units combine. Unlocked by Discoveries.
4. **Barbarian Camps + Graveyards** — kept from the v0.5/v0.6 pivot.
   Player and AI faction units share one asset pool; random encounter
   mobs in Graveyards share a separate pool. Scales cleanly with
   stacking.
5. **Discovery-gated unlocks** — formation types ARE Discoveries
   (or one Discovery unlocks multiple formations).

This doc is the source of truth. The directive cycle v0.10.K is the
work queue derived from it.

## 1. Faction encircle coloring (already shipped substrate)

The mechanic: every player/AI unit on the board has a thin
faction-coloured ring at its feet (the `UnitHexOutline`
substrate, M_V8.OUTLINE.CANVAS-MOUNT). Building outlines use the
same colour but a thicker stroke (`BuildingOutlineRing`,
throttled 1Hz).

Why it works (vs other "whose is this?" solutions):

- Works at any zoom level — the ring scales with the camera so even
  zoomed-out you can tell faction at a glance.
- Doesn't fight the asset palette — the unit silhouette can stay
  faithful to the KayKit Adventurers / Mystery look without
  per-faction recoloring.
- Reads through fog (when ZoC contracts the ring greys, glanceably
  indicating "I no longer see what's here").
- Works for stacks (Section 2): the stack's outline is the union of
  the per-unit hexes plus a single combined-stack badge in the
  center showing the dominant unit type + count.

Decision: faction encircle coloring is canonical. No alternative
needed. M_V8.OUTLINE.CANVAS-MOUNT shipped this.

## 2. Stacking

**The mechanic**: a player can issue a "stack" command to two or
more units on adjacent tiles. The selected units path to the same
target tile, where they become a **Stack** entity. From that
moment:

- The stack moves as one — single move order, single path.
- The stack fights as one — combined stats per the active formation
  rules (Section 3).
- The stack's tile shows a single combined badge (icon = dominant
  unit type, number = total unit count, ring = faction color).
- The player can **unstack** at any time — the stack splits back
  into its component units on the tile + neighbors.

**Why stacking matters for Aethelgard**:

- **Board cleanup**: late-game with 20+ military units, the board
  becomes noise. Stacking collapses 8 footmen into one "Phalanx"
  badge — instant readability win.
- **Combat depth**: combined stats with formation-specific
  modifiers (Phalanx +50% defense vs cavalry, Wedge +25% damage
  to first attack, etc) give players a tactical lever beyond
  "build more dudes."
- **Discoveries become consequential**: a Discovery unlocking the
  Phalanx formation matters because the player's existing footmen
  can immediately benefit, not just "future buildings cost 10%
  less."
- **Touch-friendly**: tapping ONE stack badge to give an order is
  vastly better than tapping eight individual unit hexes on
  portrait phone.

### Stack composition rules

- **Max stack size**: 8 units (initial cap; revisit after playtest).
- **Stack-allowed compositions**: any mix of OWN-faction offensive
  units OR any mix of OWN-faction defensive units. Mixing offense
  + defense in the same stack is allowed (Combined Arms formation
  unlocks it after a Discovery; before the Discovery, the stack
  command rejects mixed compositions).
- **Peons cannot stack with military**. Peons can stack with other
  peons (a "Work Crew" — moves as one, harvests at the same node
  with combined throughput). Peon stacks bypass formation rules
  entirely (no Discoveries gate them, no combat modifiers — they
  flee like always when enemies approach).
- **Stacks of different factions on the same tile**: forbidden.
  If a stack tries to enter a tile already holding an enemy stack,
  it triggers combat (the enemy stack defends from the tile; the
  incoming stack attacks from its previous tile, then the survivor
  occupies).

### Stack ECS shape

New `Stack` component on a Stack entity:

```ts
interface Stack {
  members: Entity[];           // 2..8 unit entities
  formationId: FormationId;    // 'rabble' | 'phalanx' | 'cadre' | ...
  combinedStats: UnitStats;    // re-derived on member change
  dominantUnitType: UnitType;  // for the badge icon
}
```

Each member Unit gains an optional `stackId: Entity` back-reference
so render and pathing systems can early-out per-member when the
unit is in a stack.

Pathing: the stack's PathRequest uses the stack's tile (not the
union of members' tiles). Members teleport to the stack tile
on stack-creation (with a fast 200ms lerp so it doesn't look
buggy).

### UI affordances

- **Sidebar action**: "Stack Selected" when 2+ same-faction
  military units are selected.
- **Tap a stack**: SelectionPanel shows: faction-colored header,
  formation icon + name, combined stats, member roster, Unstack
  button.
- **Stack movement**: tap-to-command on a tile pathes the entire
  stack there.
- **Discovery-driven**: formations require their Discovery; the
  default stack formation is `'rabble'` (no modifiers — units
  retain their individual stats summed). Players can stack on
  day 1 with `rabble`; unlocking Phalanx via Discovery makes
  stacking *strategically meaningful*.

## 3. Formations

Each formation defines how a stack's combined stats are derived
and what visual flair (badge, on-board mesh footprint) it renders
with.

| Formation | Discovery (or default) | Composition rule | Stat modifier (over sum) | On-board visual |
|---|---|---|---|---|
| **Rabble** | DEFAULT (no Discovery needed) | any same-type military | none — pure stats sum | scattered cluster of unit minis on the tile |
| **Phalanx** | `formation-phalanx` Discovery (medieval / mystic affinity) | spearmen + pikemen only | +50% defense vs cavalry, −20% move speed | spear-tip badge, units rendered shoulder-to-shoulder |
| **Cadre** | `formation-cadre` Discovery (medieval / orc affinity) | melee infantry of any type | +25% melee damage, +0 defense | shield badge, units in a tight square |
| **Wedge** | `formation-wedge` Discovery (orc affinity) | cavalry / fast melee | +25% damage on FIRST attack each engagement, +10% move speed | arrow badge, units in V-formation |
| **Skirmish Line** | `formation-skirmish-line` Discovery (mystic / undead affinity) | ranged units only | +15% range, +0 melee | spread-line badge, units staggered across tile |
| **Square** | `formation-square` Discovery (medieval) | any defensive unit | +30% defense in all directions, immune to flank bonus, cannot move while in formation | castle-square badge |
| **Combined Arms** | `formation-combined-arms` Discovery (late-game; requires Phalanx + Wedge already known) | mix offense + defense | union of member modifiers, capped per stat | banner-and-shield badge |
| **Work Crew** | DEFAULT (peon-only) | peons only | harvest-rate +20% per peon up to 4 members, then flat | bucket-and-cart badge |

Visual notes:

- Each formation badge is a hex-fit SVG icon centered on the
  stack tile, ~70% of tile width. Faction ring outlines the badge.
- For Discovery-gated formations, the badge ALSO carries a
  Discovery glyph in the corner (so glanceable "this stack got the
  Phalanx upgrade").
- Stack member meshes still render on the tile (so you can SEE
  there are 5 footmen, not 1) — just clustered into the formation
  shape. Saves needing per-formation 3D models.

## 4. Barbarian Camps + Graveyards (kept from v0.5/v0.6 pivot)

**Player + AI faction units share one asset pool** (the
KayKit Adventurers + Mystery + custom GLBs). This is canonical
and unchanged.

**Random-encounter mobs spawned at Graveyards share a separate
pool** (a "Mystery / undead" subset of KayKit Mystery: skeletons,
ghouls, wraiths). These mobs:

- Spawn from Graveyards on a slow tick (every 90-180s by default,
  scaling with map size + game age).
- Wander within a radius of their spawn Graveyard.
- Attack ANY faction unit that enters their radius — they're
  hostile to all factions equally.
- Are destroyed when the Graveyard is destroyed (the spawn source).
- Drop loot (small wood/stone/gold cache) on death — incentive for
  player/AI to clear them.

**How this scales with stacking**:

- A Graveyard's wandering mobs auto-stack into a `Rabble` formation
  when 2+ mobs end a path tick on the same tile (no Discovery
  needed — Rabble is default). Cleans up the visual + makes them a
  cohesive threat rather than 6 individual annoyances.
- Player stacks attacking a mob stack triggers a proper combined-
  stats combat resolution.
- Clearing a Graveyard takes coordination — the wandering mobs
  buff the camp's defense radius until cleared. This becomes a
  natural mid-game side-quest for the player to do during economic
  ramp.

**Barbarian Camps** (also kept): larger, fixed encampments
(not Graveyards — different fiction) that spawn higher-tier
neutral mobs. Spawn on map gen at the start of a match in
neutral territory. Clear them for larger loot caches and to deny
the AI the same option. Same shared-mob-pool as Graveyards but
the mob lineup is tougher (heavy infantry, mounted, occasionally
a siege weapon).

**Why keep this in an RTS commitment**:

- Gives the early-game an EXTERNAL pressure beyond AI vs player —
  the world is *active*, not just an arena.
- Provides risk-reward for exploration: scouting reveals Camps to
  clear, but unprepared peons get murdered.
- Naturally bridges Skirmish RTS depth with Civ-style "the
  barbarians of the world" texture, without needing turn-based
  scaffolding.
- The shared-asset-pool separation (faction units vs neutral mobs)
  means we don't need to commission new art per faction-vs-mob
  combo. The neutral mobs are visually distinct because they're
  from the Mystery kit, not the Adventurers kit.

## 5. Discovery-gated formation unlocks

The Discoveries registry (`docs/lore/discoveries.md`) currently has
7 entries. We add a tier of FORMATION discoveries:

| Discovery id | Unlocks | Stratum | Archetype affinity |
|---|---|---|---|
| `formation-phalanx` | Phalanx formation | Bronze Stratum (defensive) | medieval / mystic |
| `formation-cadre` | Cadre formation | Iron Stratum (martial) | medieval / orc |
| `formation-wedge` | Wedge formation | Iron Stratum (martial) | orc |
| `formation-skirmish-line` | Skirmish Line formation | Mythic Stratum (ranged/magic) | mystic / undead |
| `formation-square` | Square formation | Bronze Stratum (fortification) | medieval |
| `formation-combined-arms` | Combined Arms formation | Steel Stratum (late-game) | any (requires Phalanx + Wedge prior) |

Tuning notes:

- Each Discovery costs the same as an existing-tier Discovery to
  research (~120 wood + 80 gold).
- Combined Arms requires BOTH Phalanx and Wedge as prereqs —
  the "late game formation that unifies infantry and cavalry."
- DiscoveriesPanel surfaces the formation Discoveries with a
  small formation-badge preview so the player sees the visual
  payoff before committing to research.

Existing Discoveries (forgedBlades, steelPlows, trade-route,
cartography, iron-tools, siege-engineering,
monumental-architecture) remain. The formation Discoveries are
additive — bringing the registry to 13 total entries (which is
satisfyingly the number of biomes — bookkeeping).

## What this means for the directive

Adding v0.10.K to the v0.10 cycle (after v0.10.J — RTS commitment):

- **M_GAME.STACK.1** — Add `Stack` component + ECS substrate
  (members, formationId, combinedStats, dominantUnitType).
  Pure-data + unit tests; no UI/rendering yet.
- **M_GAME.STACK.2** — Stack creation: sidebar "Stack Selected"
  action gated on selection containing 2+ same-faction military
  units. Members teleport to stack tile with 200ms lerp; stack
  entity spawned; member.stackId back-reference set.
- **M_GAME.STACK.3** — Stack movement: tap-to-command on a tile
  paths the entire Stack. PathRequest source = stack.tile.
- **M_GAME.STACK.4** — Stack combat: combined-stats damage
  resolution — incoming damage applies to combinedStats; if the
  stack's combined HP hits 0, dissolve into surviving members at
  their proportional HP. Single-member-survivor automatically
  un-stacks.
- **M_GAME.STACK.5** — Unstack action: SelectionPanel "Unstack"
  button. Stack entity destroyed; members repopulated on tile +
  neighbors.
- **M_GAME.STACK.6** — Formation registry: `src/world/formations.ts`
  exports `FORMATIONS: Record<FormationId, FormationSpec>`. Each
  spec: composition validator, stat modifier function, badge SVG
  path, available-from Discovery id.
- **M_GAME.STACK.7** — Formation switching: SelectionPanel exposes
  the player's KNOWN formations + current formation. Tap to switch
  (if composition is valid for the target formation).
- **M_GAME.STACK.8** — Rendering: stack tile shows formation badge
  + member meshes clustered per the formation visual; UnitHexOutline
  draws a thicker ring for stacks (so glanceably "this is a stack
  not a lone unit").
- **M_GAME.STACK.9** — Peon Work Crew: peons-only stacks with the
  Work Crew formation, harvest-rate buff. Auto-formed when 2+
  player peons end on the same harvest tile.
- **M_GAME.STACK.10** — Mob auto-stacking: Graveyard / Barbarian
  Camp mobs auto-stack into Rabble when 2+ mobs end a tick on the
  same tile.
- **M_GAME.DISCOVERY.FORMATION.1** — Add 6 formation Discoveries
  (Phalanx, Cadre, Wedge, Skirmish Line, Square, Combined Arms)
  to the registry with the costs / prereqs / archetype affinities
  in this doc. DiscoveriesPanel renders the formation badge
  preview.
- **M_GAME.DISCOVERY.FORMATION.2** — `docs/lore/discoveries.md`
  expanded with the 6 formation entries; each gets a
  Chronicler's-voice flavour line.
- **M_GAME.CAMP.1** — Barbarian Camp spawn pass: map-gen places
  N camps in neutral territory at start (N scales with map size).
  Each camp spawns mobs from the Mystery pool.
- **M_GAME.CAMP.2** — Graveyard mob-spawn tick (90-180s
  randomized) — Mystery-pool wraith/skeleton/ghoul lineup. Mobs
  wander within radius, attack all factions, drop loot on death,
  destroy when Graveyard destroyed.
- **M_GAME.CAMP.3** — Loot drop: camp/mob death spawns a small
  resource cache on the tile; first player/AI unit to walk over
  it collects.

Total: 16 new items in v0.10.K.

## Open decisions resolved in-doc (no defer)

- **Max stack size**: 8. Mechanically: a fresh palette of "stack
  of 8 cadre" balances against "8 individual cadre" so a player
  doesn't lose by stacking. Visually: 8 mini-meshes fit one tile
  without overcrowding.
- **Stack-vs-stack combat order**: stacks attack each other
  simultaneously (one combat tick = both deal combined damage).
  Combat ends when one stack's combinedHP hits 0.
- **Stack splitting under partial damage**: members die individually
  based on the proportional damage taken — if the stack took 40% of
  its combinedHP in one tick, 40% of members die (rounded toward
  preserving the dominant unit type). Survivors keep the formation
  until the stack drops to 1 member.
- **Formation switching mid-combat**: NOT allowed. Player must
  retreat the stack out of combat (no enemy in radius) before
  switching formations. Locks in the tactical decision.
- **Discovery research time for formation Discoveries**: same as
  existing Discovery — instant on completion, no per-stack
  re-training needed (the Discovery is faction-wide).
- **Mob stack max size**: 6 (one less than player; mobs always
  feel like rabble compared to player formations).
- **Loot drop chance**: 100% on mob death from a camp/graveyard.
  Resource type and amount depends on the spawn source biome.
- **Encircle coloring + stack badge interaction**: the
  faction-color ring sits OUTSIDE the formation badge so both read
  glanceably. The stack badge is centered, the ring outlines the
  hex.
- **Stacks and ZoC**: a stack contributes its combinedStats.zocPower
  to its tile's ZoC pressure (sum of members' individual zocPower).
  Stacks pull faction borders harder than single units — desirable
  for late-game momentum.
