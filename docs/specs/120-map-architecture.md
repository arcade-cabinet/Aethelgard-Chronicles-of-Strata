---
title: Map Architecture — Choke, Pressure, Relief
updated: 2026-05-24
status: current
domain: technical
---

# 120 — Map Architecture: Choke, Pressure, Relief

User mandate (2026-05-24):
> "what I want is playability. breaks in the clumps to create
> difficult mountain passes where elevation creates reduced /
> slowed movement, where you have to build fortification first,
> etc. I want every map type to have THOUGHT and paper
> playtesting around pressure and choke points and pressure
> relief valves and balance — every game every map type size etc
> 4 RTS all of it" (+ explicitly 4X)

This spec defines the **design discipline** every (mode × mapType
× size) combination must satisfy. Map-gen code follows from this
doc, not the other way around.

## Design vocabulary

- **Choke point** — a narrow corridor (1–3 hex wide) that forces
  units to funnel through. Examples: a mountain pass, a single
  bridge over a river, a strait between landmasses.
- **Pressure point** — a tile (or small cluster) whose ownership
  shifts the strategic balance. A central plateau, a resource node
  on contested ground, the tile that holds a Wonder.
- **Relief valve** — an alternate route that lets a losing side
  recover. A back-door path around a fortified choke, a peripheral
  resource cluster, a defensive terrain feature.
- **Elevation slowdown** — units cross HIGHLAND tiles at reduced
  speed (already wired via tile.level + WEATHER_SPEED_MULTIPLIER
  in pathFollow; needs verification + extension to MOUNTAIN-edge
  PASS tiles).
- **Fortifiable choke** — a chokepoint where building a Wall or
  Watchtower meaningfully changes who controls the funnel.

## The matrix

6 modes × 4 mapTypes × 4 sizes = 96 configurations. The matrix
collapses because not every combination is meaningful — some
mode/type pairings are forbidden (e.g. coexistence + dry-land is
incoherent), and size mostly scales the choke count linearly. The
canonical paired set is:

| Mode          | Primary mapType  | Why                                       |
|---------------|------------------|-------------------------------------------|
| border-clash  | balanced         | 1v1 RTS — symmetric island with central choke |
| frontier-raid | continent OR dry-land | fast military pressure; choke-heavy |
| long-reign    | continent        | attrition match; multiple alternate chokes |
| strata-wars   | continent        | larger landmass, 2–3 layered chokes        |
| age-of-strata | balanced OR archipelago | 4X — exploration matters, more islands |
| coexistence   | archipelago      | sandbox — relaxed chokes, abundant relief  |

Other mode/type combinations remain selectable; the table above
is the DEFAULT paired with each mode (cascaded by NewGameModal
preset).

## Per-mode design

### border-clash (1v1 symmetric RTS)

The canonical 1v1. The classic design: two bases, one central
choke (mountain pass), a relief route around each flank.

- **Choke architecture**: ONE central pass (2 hex wide) through a
  mountain massif that divides the island roughly along the
  centre line.
- **Pressure points**: the pass itself + one resource cluster
  central to each base (gold-rich).
- **Relief valves**: a coastal route around each mountain end —
  open but exposed (no cover, longer travel).
- **Elevation slowdown**: HIGHLAND tiles inside the massif but
  outside the pass should cost 1.5× to traverse, encouraging the
  pass as the primary route.
- **Fortification**: Watchtower or Wall on the pass tile is the
  single most consequential build.
- **Balance**: bases at mirror points (existing seedZones radius
  check). NO map asymmetry — competitive 1v1 demands equal start.

### frontier-raid (fast military pressure)

Continent or dry-land. Map encourages immediate harassment.

- **Choke architecture**: MULTIPLE short chokes (3–4), each
  fortifiable but none individually decisive.
- **Pressure points**: scattered resource nodes that REWARD
  raiding (e.g. an isolated gold node on an enemy-adjacent flank).
- **Relief valves**: very few — this mode is about pressure, not
  recovery. A losing side is expected to lose.
- **Elevation slowdown**: dry-land variant uses MOUNTAIN ridges
  as both visual + mechanical barriers; passes are narrow + slow.
- **Fortification**: Walls + Watchtowers expected at each choke;
  failure to fortify = quick loss.
- **Balance**: Approximately symmetric (preset.guidedMapGen still
  enforces base balance), but resource scatter can be asymmetric
  to introduce raid targets.

### long-reign (attrition match)

Continent, bases invulnerable. Map must support long fights without
either side getting decisively choked.

- **Choke architecture**: 2–3 redundant chokes; if one falls
  another can defend.
- **Pressure points**: alternating central resource nodes that
  ROTATE control as zones shift (encroachment-driven).
- **Relief valves**: many — back-door coastal paths, secondary
  passes through smaller mountain massifs.
- **Elevation slowdown**: present but not punishing.
- **Fortification**: heavy Wall/Watchtower meta; passive defence
  rewarded.
- **Balance**: strict symmetric.

### strata-wars (continent, longer match, scaled tech)

Continent with 2–3 layered chokes. Tech tree depth + 30-second
control-timer victory condition mean the map needs ZONES that can
be held + flipped, not just funnels.

- **Choke architecture**: layered — an outer choke per faction
  PLUS a central contested zone with multiple entry chokes.
- **Pressure points**: the central zone (controls victory timer).
- **Relief valves**: peripheral resource islands.
- **Elevation slowdown**: yes, around the central zone — defenders
  get the high ground.
- **Fortification**: Walls + Watchtowers at each layer.
- **Balance**: symmetric, but central zone is intentionally
  contested (no one starts holding it).

### age-of-strata (4X turn-based, 60-turn cap)

Exploration matters. Map should reward EXPANSION (Wonder building,
era progression). Less about RTS-style choke-and-funnel; more about
turn-by-turn pressure of where to settle next.

- **Choke architecture**: chokes appear later — initial expansion
  is open. Mid-game chokes form as zones bump into each other.
- **Pressure points**: Wonder buildable tiles (era-gated), high-
  yield resource clusters.
- **Relief valves**: peripheral islands (archipelago variant gives
  the strongest 4X exploration feel).
- **Elevation slowdown**: applies to TURN movement costs too —
  HIGHLAND/MOUNTAIN tiles cost more turn-action budget.
- **Fortification**: Walls + Wonders both relevant.
- **Balance**: symmetric start, but the map deliberately HAS
  asymmetric resource clusters so 4X exploration finds value.

### coexistence (no-win sandbox)

Builder mode. No pressure architecture needed; map should be
PERMISSIVE — abundant resources, no harsh chokes.

- **Choke architecture**: none. Mountains decorative only.
- **Pressure points**: none.
- **Relief valves**: irrelevant.
- **Elevation slowdown**: cosmetic.
- **Fortification**: cosmetic.
- **Balance**: doesn't matter (no opponent).

## Cross-cutting mechanics

### Mountain passes (M_NEXT.MAP.PASS — task #18)

Within every mountain massif, paintMountainMassif must LEAVE GAPS:

- Compute the noise mask
- After threshold, walk the massif and identify "isthmuses" — narrow
  necks where the mountain band is 1–2 hex thick
- Convert those tiles back to HIGHLAND (not flat) so units MOVE
  through them but at reduced speed
- Result: visual mountain wall with discrete passes the player can
  see + plan around

### Elevation slowdown (M_NEXT.MAP.ELEV)

Already partial via `tile.level` + WEATHER_SPEED_MULTIPLIER in
pathFollow. Audit + extend:

- Verify level 3+ tiles already slow movement
- Add MOUNTAIN_PASS biome (level 3, walkable, ~0.6× speed)
- Walls + Watchtowers built ON a pass tile reduce the slowdown
  for the owning faction's units (the user's "fortify first" intent)

### Per-size scaling (M_NEXT.MAP.SIZE)

`mapSize` (small/medium/large/huge) scales the choke COUNT, not the
per-choke width:

- small (radius 12): 1 central choke
- medium (radius 18): 1–2 chokes
- large (radius 24): 2–3 chokes
- huge (radius 30): 3–4 chokes

paintMountainMassif intensity dial is a placeholder; the real
generator should place N choke-architectures by mode-and-size, not
just sample noise.

## Implementation roadmap

1. **Spec lands** (this doc) — review with the user before code.
2. **MOUNTAIN_PASS biome** added (rules/biome-flags) with level 3 +
   walkable=true + speedMultiplier 0.6.
3. **paintMountainMassif refactored** to place passes after the
   noise-threshold step.
4. **Per-mode generator strategies** — extract `border-clash-rts`,
   `frontier-raid-rts`, etc. as named composers. The 4-mapType
   pipeline registry becomes a 6-mode × 4-mapType matrix.
5. **Tests pin the design contract**:
   - Every map of every mode has ≥1 traversable path between bases.
   - border-clash has exactly 1 central choke.
   - long-reign has ≥2 chokes.
   - archipelago has ≥3 island regions.
6. **Visual baselines** — per-mode-journey runs at all 4 sizes
   produce per-mode visual playtest snapshots.

## Not in scope (yet)

- River systems (M_NEXT.MAP.RIVER)
- Forest density bands (M_NEXT.MAP.BIOME)
- Coastal inlets / peninsulas for asymmetric base placement
  (M_NEXT.MAP.COAST)

Each will get its own design pass + spec section here once the
choke/pressure/relief foundation is in.
