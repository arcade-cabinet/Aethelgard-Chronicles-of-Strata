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

The same principle drives both **placement-time snapping** (a placed wall
gravitates to align with adjacent walls or attaches to the side of an
offensive building) AND **runtime reactivity** (a watchtower aims at enemies,
a gate opens for a friendly). One concept, four families.

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
