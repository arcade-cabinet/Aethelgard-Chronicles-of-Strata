# 102 — Zone of Control, Encroachment & Territorial Buildings

Supersedes the black fog-of-war model (specs 100 §3 / the M8.4–M8.5 fog
rendering). The map is **always fully visible** — a low-poly board is meant to
be read at a glance, especially on a phone. Territory is shown by **drawn
borders**, not concealment.

## Two independent things

1. **Zone of control** — territory a faction *holds*. Defined by tile
   *exploitation*, drawn as an encirclement border. This is ownership.
2. **Observed battlefield** — what a faction currently *perceives* through unit
   vision cones + base circles. This is current sight. Independent of control —
   an enemy army can sit inside your zone of control unobserved.

Vision cones (the `fog.ts` perception code) **survive** — they are the observed
battlefield. Only the black-fog *rendering* is dropped.

## Zone of control — claimed by exploitation

- A tile becomes a faction's the moment one of its peons **begins exploiting**
  it (starts harvesting the tile's resource). It is `controlled` by that
  faction.
- It stays controlled until either the resource is **fully cleared**, or an
  **enemy offensive (military) unit marches onto the tile** and the claim is
  not defended (see Encroachment).
- The zone-of-control **border** is the outer hull of a faction's controlled
  tiles — one drawn line, faction-coloured. It erodes visibly as tiles flip.

## Encroachment & border erosion

When an enemy **military** unit steps onto a tile a faction controls:

1. The tile **pulses** (a visible warning pulse) for `N` seconds. `N` is set by
   difficulty — Easy gives a long grace window, Hard a short one.
2. If the defending faction brings a military unit onto / adjacent to the tile
   within `N` seconds, the claim holds.
3. If `N` elapses with no response, the tile **flips** to the encroaching
   faction's control. The border redraws.

**Peons are purely nonviolent.** They never fight. They **avoid threatened
tiles** — a pulsing tile is rerouted around; a peon exploiting a tile that
starts pulsing abandons it and flees toward home. This is the "mindless brute"
contract completed: peons are also pacifists.

## ZoC as magnetic emitters — the unifying model

Every zone-of-control archetype is a **magnetic emitter** — it attracts or
reacts in its own frequency. This is the architectural principle the four
archetypes share; their differences are just *what frequency they emit on* and
*what they react to*:

- **Attractor** — magnetically spawns/concentrates *resources* in its radius
  (discrete: the map-gen guarantee. Continuous: a future field that biases
  spawn density.)
- **Offensive** — magnetically reacts to *enemies* in its radius (the targeting
  + damage law).
- **Defensive** — magnetically reacts to *itself and to offenders*. Walls snap
  to other walls and to the middle-sides of offensive buildings, creating
  emergent fortification patterns (watchtower flanked by walls = compound).
- **Mover** — pathing/visual archetype only. Crucially, **Movers emit ZERO
  zone of control** — they are perfectly *ZoC-neutral*. A road is just a
  road; walking on one does not claim it, building a road across the map
  does not grant territory. Movers' magnetism is purely placement-time +
  visual + a defender-transform rule, not control:
  - **Material defines visuals + connector form** — stone, wood, dirt; each
    snaps to other mover tiles of any material in up to a 6-way junction.
  - **Bridges across materials** — wood road meets stone road = visible
    junction; a unit crosses either freely.
  - **Defender transformation** — a Mover crossing a DefensiveBehavior
    (e.g. wood wall) replaces that tile with a **Gate**: the gate inherits
    the wall's material and the road's form. Gates are directional emitters
    (friendly = open, enemy = closed).
  - **Pillageable but inert** — a unit can destroy a road as an explicit
    action; merely standing on it does nothing.
- **Consumer** — a neutral single-tile placement holding an amount of
  something consumable. Trees, rocks, gold veins — all are Consumers
  parameterised by `kind` + `amount`. ZoC-neutral (a tree is not territory
  until a peon starts exploiting it; that exploitation is what claims the
  tile via the Attractor/peon contract). Threatenable — an enemy military
  unit may damage or fully destroy a Consumer, denying its yield to the
  opponent. This means resource *kinds* (wood/stone/gold) are NOT a baked
  enum — they are a property of a Consumer instance, so a future
  "magical-crystal" Consumer is one new instance, not a type extension.

The same principle drives both **placement-time snapping** (a placed wall
gravitates to align with adjacent walls or attaches to the side of an
offensive building) AND **runtime reactivity** (a watchtower aims at enemies,
a gate opens for a friendly). One concept, four families.

### Magnetism has TWO signs — attractive AND repulsive

The full magnetic model expresses both attractive and repulsive forces, per
faction. Each archetype emits a force on each *kind* of nearby thing:

| Force pair | Sign | Behaviour it expresses |
|---|---|---|
| Defender ↔ Defender (same faction) | attract | walls snap into networks |
| Defender ↔ friendly unit | attract | units shelter behind walls |
| Defender ↔ enemy unit | **repel** | the wall is a pathing barrier (expressed as nav cost) |
| Offensive ↔ enemy unit | attract (targeting) + **repel** (movement) | a watchtower scans for enemies AND enemy pathfinding routes around its zone |
| Attractor ↔ resources | attract | the map-gen guarantee field |
| Attractor ↔ enemy Attractor | **repel** | enemy bases naturally spawn far apart (the current "farthest walkable tile" enemy base placement is exactly this repulsion law, made principled) |
| Consumer ↔ friendly peon | attract | peons gravitate to harvest in-zone |
| Mover ↔ Mover (same / compatible) | attract | roads snap into a network |

This unifies *three* systems onto **one underlying force field**:

1. **Placement snapping** samples the field at candidate tiles → the highest
   net attraction wins as snap target; net repulsion forbids placement.
2. **Pathfinding cost** integrates the field along a path → enemy nav cost
   over a watchtower zone is *high*, encouraging detour without forbidding.
3. **AI targeting / motivation** reads attractive forces → a Footman's
   target-selection bias, a peon's resource gravitation, a goal evaluator's
   "where is the enemy concentrated."

Each behaviour trait declares its attractive/repulsive parameters per
(faction, target-kind); the field is the sum of every emitter. One model,
many systems — the depth comes from the field, not from each system's
internal heuristics.

## Archetype composition algebra — emergent richness without rule explosion

The five archetypes (Attractor, Offensive, Defensive, Mover, Consumer) are not
just a taxonomy — they are a **composition algebra**. Every gameplay pattern
the player or AI builds is a *composition of two-or-more archetype
interactions*. Defining each pairwise rule ONCE yields the whole rich behaviour
space. The intended pairwise table:

| Composition | Pattern that emerges |
|---|---|
| Consumer + Attractor | Resource node inside a base zone — the bootstrap (peon finds work in-radius). |
| Mover + Defender | **Gate** — the road transforms the wall into a directional door (friendly = open, enemy = closed). |
| Defender + Defender | **Wall network** — snap into a continuous border. |
| Defender + Offensive | **Fortified compound** — walls flank a watchtower, defenders absorb damage, the offensive kills enemies inside. |
| Mover + Mover (different materials) | **Bridged junction** — wood meets stone, both pass freely. |
| Offensive + Offensive | **Overlapping kill zones** — areas where any one source applies (one-source-per-tick rule still avoids stacking). |
| Consumer + Offensive | **Contested resource site** — the AI's "attack" verb has a concrete target. |
| Attractor + Mover | **Road system fanning out from a base** — radial expansion is visible AND navigable. |
| Mover + Consumer | **No effect** — both are neutral; a road past a tree is just a road past a tree. |
| Attractor + Attractor | Two attractor radii overlap → resources get *both* guarantees applied, naturally creating a contested heartland. |

This is the deep architecture — **rules-as-algebra**, depth as composition.
Once the five archetype traits + their pairwise systems exist, every future
building / consumable / mover is an *instance*, not an extension. Adding the
"magical-crystal" Consumer or a "trebuchet" Offensive variant requires zero
system changes — just an entry in the building/consumable table.

### The same algebra applies to UNITS

The archetypes are not building-specific — they are **universal entity
traits**. A unit is just a *mobile* emitter:

- **Peon** — a Consumer-driver. No ZoC; its purpose is to interact with
  Consumers. (Spec 101 — mindless pacifist brutes.)
- **Footman / military** — an `OffensiveBehavior` on legs. Small radius, low
  dps, but the same trait the Watchtower has. The `offensiveBehaviorSystem`
  already iterates *every* OffensiveBehavior entity — a Footman that adds the
  trait at spawn slots in for free.
- **Siege unit** — an Offensive tuned vs Defensive. Its damage law multiplies
  by the Defensive's `armorVsSiege` (the dual of M8.6f's siege-responsive
  walls).
- **Scout / spy** — a Mover instance with extended observed-battlefield radius
  and zero ZoC.

This means M8's combat surface unifies onto the same algebra: damage isn't
hard-coded "unit-vs-unit" combat, it's the `OffensiveBehavior × everything`
pairwise rule. The current `combat.ts` becomes a *thin slice* of the
offensive-behavior system. A Footman attacks a Wall = "Offensive (Footman)
× Defensive (Wall) with armorVsNormal"; a Trebuchet attacks the same Wall =
"Offensive (Trebuchet) × Defensive (Wall) with armorVsSiege". One law.

The full game's depth comes from a tiny core: five archetype traits + one
pairwise-composition table.

### Damage-type × armor table — siege is data, not code

The Offensive × Defender pairwise rule is realized as a small data table —
the **cause-and-effect matrix**:

- Each Offender entity declares a `damageType` — `normal` | `siege` | `magic`
  | `pierce` (extendable).
- Each Defender entity declares `armorVs[damageType]` — a multiplier on
  incoming damage (1.0 = no resistance; 0.2 = heavy resistance; 2.0 = weak).
- The damage formula is one line:
  `applied = base * (target.armorVs[source.damageType] ?? 1)`.

That means **siege isn't a unit subclass** — a siege unit (trebuchet) and a
siege building (catapult emplacement) are both `OffensiveBehavior` instances
with `damageType: 'siege'`. They reuse the same projectile rendering, the
same firing cadence law, the same field-driven targeting — they differ only
in mobility (unit vs building) and parameters. The Wall declares
`armorVsNormal: 0.3, armorVsSiege: 1.5`; the formula does the rest. A new
"battering ram" or a "wizard's fireball" is a new row of *data*, not new code.

This is the pattern: **every game-system effect collapses into composition +
a small typed table**. Hard-coding ("if unit.type === 'Trebuchet'") is the
anti-pattern; the system iterates `OffensiveBehavior` once, the table tells
it what each instance does.

## Territorial buildings — four local-zone kinds

Every territorial building exerts a **local zone of control** and radiates its
own border, drawn in a distinct colour. Three non-overlapping kinds:

- **Offensive** (e.g. a Watchtower) — radiates an *offensive zone*. An enemy
  *can* march into the overlap (e.g. to contest a resource), but is **shot at
  continuously** while inside the zone, until they destroy the building.
- **Defensive** (e.g. a Wall) — a **hard border**. An enemy unit **cannot path
  past it** — pathfinding treats the wall's border as blocked until the wall is
  destroyed.
- **Attractor** (the Town Hall) — radiates an *attractor zone* and shapes map
  generation (see below). Purely **non-combat** — it anchors the faction, has
  HP, never shoots. The three kinds stay strictly separate so each is a clear
  strategic choice.

These give GOAP concrete, legible signals: is a target tile pulsing? is my
border eroding? is a wall blocking my route? — far more tractable than guessing
at exploration.

## Attractors & the emergent game-start

An **attractor** building tells the map builder: *"guarantee at least N of
resource-X and M of resource-Y within radius U of me."* The **Town Hall is the
sole attractor** — one per faction, the start base, **not buildable mid-game**.
Losing the Town Hall ends the game (the existing `FactionBase` win/loss rule).

The attractor contract resolves **once, at map generation** (deterministic from
the map seed): each faction's Town Hall reserves its guaranteed resource radius.
This makes the game-start **fully emergent — no scripted sequence**:

1. Map generation places the two Town Hall attractors and, by the attractor
   contract, guarantees resources within each one's radius U.
2. Each Town Hall's attractor zone is that faction's **initial zone of control**
   (~2 hex tiles out).
3. One peon spawns per faction. Because resources are guaranteed in-radius by
   construction, the peon immediately finds work — the autonomous exploit loop
   (spec 101) self-starts, and the zone grows organically from there.

The attractor guarantees the AI's (and the player's) peons **always have a
radius to exploit** — there is no barren-start edge case.

## Difficulty

Difficulty scales two perception/response knobs — the AI never cheats:

- **Vision cone size** — Easy: narrow/short cones; Hard: wide cones.
- **Reaction latency** — how fast the AI responds to its observed battlefield;
  also sets the encroachment grace window `N`.

## Why this replaces fog

- The board stays fully legible — no black caps on a phone screen.
- "Should I explore?" disappears as an AI goal — peons auto-claim by exploiting;
  exploration is an emergent byproduct, not a decision to tune.
- Difficulty becomes one clean dial (cones + latency), not fudged heuristics.
- Encroachment + eroding borders + territorial buildings give the AI concrete
  signals to reason over.

## M8 re-decomposition (supersedes the fog steps)

- **M8.4 (revise)** — `zone.ts`: per-faction `controlled` tile set (claimed by
  exploitation) + `observed` set (vision cones). Replaces the fog `discovered`/
  `visible` framing; vision-cone code is reused for `observed`.
- **M8.5 (revise)** — `ZoneBorder.tsx`: draw the encirclement of each faction's
  `controlled` region (two faction colours) + the pulse animation on contested
  tiles. Replaces `FogOverlay`. The whole map renders; enemy units always draw.
- **M8.6c** — peon autonomy also claims tiles on exploitation and flees pulsing
  tiles.
- **M8.6c** — peon autonomy also claims tiles on exploitation, flees pulsing
  tiles. The Town Hall attractor seeds the initial zone of control.
- **M8.6e (new)** — encroachment + the three territorial-building kinds:
  enemy-military-on-controlled-tile → pulse → flip; Watchtower (offensive
  zone, shoots intruders), Wall (defensive hard border, blocks pathing),
  Town Hall (attractor — exerts the initial zone, non-combat).
- **M8.6-attractor (new)** — `board.ts` honours the attractor contract at map
  generation: each Town Hall guarantees N×resource within radius U; the
  game-start becomes fully emergent (no scripted town-hall/resource/peon
  sequence — see "Attractors & the emergent game-start" above).
- **M8.6d** — the yuka AI player has no `scout` goal; its goals read
  pulse/erosion/wall signals.
