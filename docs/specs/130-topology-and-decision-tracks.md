---
title: Topology, distribution patterns, decision tracks, peon economics
updated: 2026-05-24
status: draft
domain: technical
---

# 130 — Topology, distribution patterns, decision tracks, peon economics

> Captures four design conversations that surfaced during the
> M_FUN.QA.AIVAI.TUNE balance pass and are too cross-cutting to
> belong to any single existing pillar. Treat this as the
> source-of-truth for the *systems-of-systems* layer: the
> rules that govern how individual mechanics combine into a
> satisfying loop.

## §1 — Topology: mountains that *stack*

**Today's behaviour.** `paintMountainMassif` flips qualifying
tiles to a single `level: 5` MOUNTAIN biome plus
`MOUNTAIN_PASS` necks. The result reads as a flat 1-cell-tall
peak that abruptly ends at the surrounding land. No sense of a
*massif* — a real-world mountain has a foothill ring, a slope
band, then the unwalkable cap, all stacked vertically.

**Target shape — a layered massif.** A "peak" is a *region*,
not a tile. For every cell whose noise+bias exceeds the peak
threshold, expand it into a 3-tier stack:

| Tier | Biome           | Walkable | Elevation | When generated                              |
|------|-----------------|---------:|----------:|----------------------------------------------|
| 0    | HIGHLAND        |        ✓ |         4 | Outer ring of the peak cluster (foothills) |
| 1    | MOUNTAIN_PASS   |        ✓ |         5 | Mid ring (saddles + necks; high move-cost) |
| 2    | MOUNTAIN        |        ✗ |         6 | Core (the impassable cap)                  |
| 3    | (extension)     |        ✗ |         7 | Sparse `VOLCANO` peak if intensity > 0.85  |

The generator picks an N-ring radius per cluster based on the
mask intensity at the cluster centre (`intensity * span / 2`),
then walks outward decreasing the tier. The current single-
tile `level: 5` becomes the *tier-2 core* of a 3-ring stack.

This wins three ways:

1. **Visual depth** — the silhouette tells you "peak vs plateau"
   from across the map.
2. **Gameplay depth** — Wall placements along the HIGHLAND
   ring become *natural fortifications*; the MOUNTAIN_PASS
   neck is the choke point. The same MAP gives both terrains
   *without* the generator having to know about choke-points.
3. **Resource decision tracks** — stone spawns on MOUNTAIN
   tier; ore (future) on MOUNTAIN_PASS; herbs (future) on
   HIGHLAND. Different harvesters, different risk profiles
   (foothill = safe; pass = exposed to siege; core = need a
   `MountainGoat` aquatic-style skill unit).

**Implementation note.** Keep the noise field; add a tier
function `tier(cell.mask) = ⌊(mask - threshold) * 3⌋ + 1` so
elevated bands fall out of the SAME noise rather than three
independent passes. Determinism preserved.

## §2 — Distribution patterns that *create decision tracks*

The user's framing: "automate patterns of distribution that
create decision tracks, like fatigue versus DoT and so on."

The principle: **a mechanic only matters if it forces a
choice the player wouldn't otherwise make.** Distribution
patterns are how the board *teaches the choice without dialog
boxes*. Pin three orthogonal tracks:

### Track A — Movement track (fatigue ↔ DoT ↔ throughput)

Currently FATIGUE applies on MOUNTAIN_PASS, DEHYDRATION on
DESERT, DISEASE on SWAMP. These are HIGH-level distinct
statuses — the player sees three colour states and ought to
react with three different choices:

- **Fatigue (MOUNTAIN_PASS)** — slow refill. Force *rest stops*.
  In RTS: unit auto-idles a fixed window before resuming. In a
  turn-based mode: unit consumes N turns of movement budget.
- **Dehydration (DESERT)** — DoT during traversal. Force
  *route avoidance* (go around the desert if you can) OR
  *forced-march cost* (lose HP for speed).
- **Disease (SWAMP)** — gradual debuff that *persists past
  exit*. Force *cure plays* (Healer becomes a strategic asset,
  not just a battlefield medic).

The *distribution* of these three biomes across the board is
what creates the decision: a board with a MOUNTAIN_PASS choke
between two DESERTS forces "slow but safe" vs "fast but bleed"
on every militaries-on-the-move turn.

**Authoring rule:** every generated map must have ≥1 tile of
each status-bearing biome inside the central interior (between
the two bases). The biome-distribution audit (PATTERN-I) is
the first half of this; the *interior placement* check is the
follow-up (PATTERN-K).

### Track B — Economy track (rate ↔ richness ↔ travel)

Resource nodes are currently uniform: each yields a fixed
amount, harvested at a fixed rate, located via spawn rules.
The MISSING dimension is **richness vs travel-time trade-off**.

| Resource node type | Yield/tick | Total deposit | Travel cost | Decision presented |
|--------------------|-----------:|--------------:|-------------|--------------------|
| Surface trees      |  high      | low           | very low    | quick boost — first 60s only |
| Inland forest      |  medium    | medium        | medium      | sustained mid-game economy |
| Highland grove     |  low       | very high     | very high   | late-game commitment        |

Today every wood node is "inland forest." Add the *surface*
(BEACH adjacency) and *highland* (HIGHLAND adjacency)
variants. Same mechanism — different `amount` and `chance`
fields in `ECONOMY.resourceSpawn`. The harvester is the same
Peon but the optimal play differs. Same goes for stone
(quarry vs mine vs deep mine).

### Track C — Combat track (risk ↔ visibility ↔ commitment)

The board today doesn't tell the player **which fights to
take**. Differentiate by zone-of-control overlap:

- **Skirmish zone** — neutral tiles between the two ZOCs.
  Low commitment, high information return (scouting). 
- **Encroachment zone** — opponent's ZOC tiles. Moderate
  commitment (cost time + supply), denies the opponent
  the tile's harvest yield for the next N ticks.
- **Assault zone** — within 3 tiles of the opponent base.
  Maximum commitment (your loss = game-winning lever).

The same Footman fights differently in each. The map's job is
to make sure *all three* exist for every match — the AI
balance harness should soft-assert that some kills happen in
each zone class. Today the harness only counts total kills.

## §3 — RTS vs turn-based mechanic mapping

The user asked specifically about fatigue, but the question
generalises: which mechanics need a *mode-specific* tick
function?

| Mechanic                | RTS form                                     | Turn-based form                              |
|-------------------------|----------------------------------------------|----------------------------------------------|
| Fatigue                 | unit idles X seconds before next move        | unit skips N turns                           |
| DoT (dehydration)       | HP ticks down per second                     | HP drops by fixed amount per traversed tile  |
| Disease (DoT post-exit) | persists 30s, ticks every 2s                 | persists N turns, ticks each turn-start      |
| Construction            | linear progress over T seconds               | atomic placement, completes next turn        |
| Harvest                 | continuous (5 units/sec)                     | atomic per visit (10 units, 1 visit/turn)    |
| Combat                  | continuous attack cooldowns                  | dice-roll exchange resolved at turn-end      |
| Pathing                 | continuous A*, re-plan on disruption         | A* once at turn-start, freeze for the turn   |
| AI decision interval    | 3 sec (configurable)                         | once per turn                                |

**Architectural consequence:** every mechanic that has a
turn-based mapping needs to consume time as a *resource*
(seconds OR turns), not as a wall-clock-elapsed assumption.
`runEconomyTick(game, delta)` is the unifier — the same code
runs with `delta = 1/60` (RTS, called 60×/sec) or
`delta = turnLengthSeconds` (turn-based, called once per
turn). Today the codebase IS already on this path
(see `src/engine/test-mode.ts`); the gap is in *systems that
read `game.clock.elapsed` raw* and assume RTS pacing. PATTERN-L
(future) — audit those reads, redirect to a turn-aware
abstraction.

## §4 — Peon economic metrics worth tracking

Today the balance harness records 7 axes (outcome, kills,
buildings × 2, peak supply × 2, elapsedTurns). The harness
DOES NOT track the peon-economy axes that would tell you
whether *the loop itself feels satisfying* (vs whether the
match merely resolves).

Add the following per-faction per-run:

| Metric                          | What it tells you                                          |
|---------------------------------|------------------------------------------------------------|
| `timeToFirstWood`               | seconds from match start until the first 1 wood deposited |
| `timeToFirstHouse`              | seconds until first House completes                       |
| `peonHarvestCyclesPerMin`       | round-trips per peon per minute (chop → deposit)         |
| `peonAvgRoundTripSec`           | mean cycle time — too high = nodes too far from base      |
| `peonDisruptionRatePerMin`      | times a peon was re-routed (encroached, threatened, node depleted) |
| `peonIdleRatioPercent`          | seconds idle (no job) / total — high = job-routing dead-zone |
| `nodeDrainTimeAvgSec`           | how fast a single node is consumed by its harvesters     |
| `nodesActiveSimultaneously`     | peak number of nodes being worked at once                |

**Why each matters.** A satisfying RTS economy isn't about
TOTAL harvest — it's about the *cadence*. If `peonAvgRoundTripSec`
is 60s, the player gets one deposit-per-minute-per-peon dopamine
hit. If it's 5s, they get twelve. If it's 30s, they probably
won't notice. Same with `nodeDrainTimeAvgSec`: if a single FOREST
disappears in 20s, the world feels fragile; if it takes 5 minutes,
the harvest feels meaningful but slow. The sweet spot is
genre-known (~45-90s round-trip; ~2-4 min per node) — we
should *measure* and *gate* on it.

**Resource depletion philosophy** (the user's "not immediate
consumption of an entire tile's worth"). Today a peon hits a
node once and drains it OVER MANY DEPOSITS, but each deposit
chunks a fixed amount. The architecture is already correct;
what's missing is the *visual + audio cadence*. Each deposit
should be its own beat — chop sound, tree-shake, deposit ring.
Currently sawdust particles fire on harvest tick which is
faster than the deposit rhythm. Bring them onto the same beat.

## §5 — AI building-mix metrics

The user's question: "how frequently the AI builds offensive
buildings, defensive attractor, and all the rest."

Today `buildingsPlayer` and `buildingsEnemy` are scalar
counts. They tell you *whether* the AI builds but not *what
mix*. Add a per-faction breakdown:

| Bucket       | Buildings included                  | What a healthy mix looks like (border-clash)        |
|--------------|-------------------------------------|------------------------------------------------------|
| Economic     | House, Farm, Granary, Library       | 50-65% of buildings by mid-game                     |
| Offensive    | Barracks (training infra)           | 1-2 by mid-game (more = wasted slots)               |
| Defensive    | Wall, Watchtower                    | 10-25% — depends on personality + map pressure      |
| Wonder       | Wonder                              | 0-1 (long-game only)                                |

The balance harness should record `{economic, offensive, defensive, wonder}`
per faction at match-end and the personality-tuning iteration
should target the right mix per personality preset. Mad-King
heavy offensive; Builder heavy economic; Hoarder heavy
defensive. Today a `the-builder` AI might be producing a
single Barracks and 5 Walls — the LEDGER doesn't expose that,
so we tune blind.

## §6 — Self-assessment: what this doc commits us to

A doc enumerating six new tracks needs to map back to the
running directive. Convert each section into a concrete
directive item:

- §1 mountain stacks → `M_FUN.MAP.TOPOLOGY.STACK` —
  rework `paintMountainMassif` to emit 3-tier clusters.
- §2 distribution tracks → `M_FUN.MAP.DISTRIBUTION.INTERIOR` —
  audit that every map has ≥1 of each status-bearing biome
  inside the inter-base interior.
- §2.B economy track → `M_FUN.ECON.NODE-TIERS` — add
  surface/inland/highland node tiers to `resourceSpawn`.
- §2.C combat track → `M_FUN.QA.AIVAI.ZONE-BREAKDOWN` —
  balance ledger records kills per skirmish/encroachment/
  assault zone class.
- §3 RTS vs turn-based → `M_FUN.ARCH.TURN-AWARE` — audit
  `game.clock.elapsed` reads, redirect through a turn-aware
  abstraction.
- §4 peon metrics → `M_FUN.QA.AIVAI.PEON-METRICS` — extend
  the balance ledger with the 8 economic-axis fields.
- §5 building mix → `M_FUN.QA.AIVAI.BUILD-MIX` — extend
  ledger with per-bucket counts; tune personality presets
  against the target mixes.

Each gets its own commit + reviewer trio. None of these block
v0.4 release (the v0.4 cycle was an AI-vs-AI playable-match
gate, which the PATTERN-I fix unblocks). They define the v0.5
"satisfying loop" cycle.
