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

User mandate (2026-05-24, expanded):
> "update your directives to cover balance testing as described
> using not just mountains but also think about OTHER biomes right
> now we are not really exploring the medium of depth and also we
> aren't thinking about things like how we could create terrain
> elements that impact like choke points through swamp biomes that
> cause damage over time until exited or even smarter, apply a
> disease attribute that does it, so that you need to make sure
> you have some kind of healer, and then as an alternative a
> mountain pass that requires significant elevation and a fatigue
> modifier"

### Terrain-as-choke (the full medium)

Mountains are ONE chokepoint mechanism. The map medium offers more
and each should be designed across every mode:

- **Mountain pass** — 1–2 hex passes through a MOUNTAIN massif.
  Traversable but at reduced speed AND a **fatigue** modifier
  (units arriving across a pass take 1–2 ticks to recover full
  combat effectiveness; encourages garrison build-up BEFORE rushing).
- **Swamp choke** — a SWAMP biome band that's walkable but applies
  a **disease** attribute on entry. Disease ticks HP damage until
  the unit exits OR is healed by a friendly Healer/Wizard in range.
  This DEMANDS a counter-unit, not a static fortification — adds
  composition pressure (you can't rush military without a healer).
- **Forest choke** — dense FOREST band that hides units (line-of-
  sight blocker) but doesn't slow them. Creates ambush opportunity
  for the defender, danger for the attacker.
- **River/strait choke** — water gap crossed only via a built
  Bridge (or Crossing). Pure fortification + cost choke.
- **Desert choke** — DESERT biome with a **dehydration** modifier
  (slow HP regen on the tile). Cumulative pressure if forces sit.

### Standard primitives

- **Choke point** — narrow corridor (1–3 hex) that funnels.
- **Pressure point** — tile/cluster whose ownership shifts balance.
- **Relief valve** — alternate route for the losing side to recover.
- **Elevation slowdown** — HIGHLAND tiles cost more to traverse.
- **Fortifiable choke** — Wall/Watchtower meaningfully changes
  control of the funnel (mountain passes, river crossings).
- **Unit-counter choke** — needs a SPECIFIC unit type to traverse
  cheaply (Healer for swamps/disease, Trebuchet for fortifications,
  scout-type for forests). Forces composition strategy, not just
  unit count.

### New unit/attribute follow-ups

- **Healer / Cleric** unit (UnitType extension): heal-on-tick aura,
  required to push through swamp/disease terrain. Spec: 50% Wizard
  cost, no offensive, 4-hex heal aura.
- **Disease attribute** (Health.disease field): ticks HP -1 per
  sim-second while attribute is set; cleared when Healer in 2-hex
  range OR unit stands on GRASS for 5+ seconds.
- **Fatigue attribute** (Combatant.fatigue field): reduces damage
  dealt by 50% while set; decays over 5 seconds out of combat.
  Applied when unit crosses MOUNTAIN_PASS.
- **Dehydration attribute** (Health.dehydration field): suppresses
  natural HP regen while set; cleared by leaving DESERT for 3+
  seconds.

### Security note (forward-looking, for when the attributes land)

Per security-auditor review on PR #10 (2026-05-24): the disease/
fatigue/dehydration fields will end up in the SQLite save schema.
When implementing:

- **Clamp on deserialize.** Disease/fatigue/dehydration values
  loaded from a save MUST be bounds-checked (e.g. `disease ∈
  [0, MAX_TICKS]`). A tampered or corrupt save could set
  `fatigue = Infinity` (suppress all damage forever) or
  `disease = -1` (negative tick = infinite damage loop → crash).
  Belongs in `src/persistence/serialize-game.ts::validateSnapshot`
  alongside the existing `mapSize` + `research.purchased` guards.
- **Sim-authoritative if multiplayer ever lands.** "Healer in
  2-hex range clears disease" is a server check, not a client
  assertion. Out of scope today (single-player only) but spec
  this in `100-ai-as-player.md` when netcode arrives.
- **Determinism.** Attribute tick logic lives in `src/ecs/systems/**`
  which is in the determinism-guarded ban_patterns
  (`.claude/gates.json`). No `Math.random` / `Date.now` /
  `performance.now` — use the engine clock facade.

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

### Mountain passes (M_NEXT.MAP.PASS — task #18) — STATUS: partial

**Today (shipped in this PR)**: `MOUNTAIN_PASS` biome added to the
`BiomeType` union + biome-flags + palette + terrain-cost tables.
Walkable, buildable, level-3 elevation.

**Still to land**: paintMountainMassif must LEAVE GAPS:

- Compute the noise mask
- After threshold, walk the massif and identify "isthmuses" —
  narrow necks where the mountain band is 1–2 hex thick
- Convert those tiles back to MOUNTAIN_PASS (level 3 walkable)
  with a ~0.6× speedMultiplier in terrain-cost
- Apply Combatant.fatigue attribute on traversal (-50% damage for
  5 sec; see M_FUN.ATTR.FATIGUE)
- Result: visual mountain wall with discrete passes the player can
  see + plan around AND a fortification gameplay loop (build Wall/
  Watchtower on a pass tile to make the choke yours)

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

---

## The FUN space — full exploration (M_FUN)

User mandate (2026-05-24):
> "really explore the space. we have the GAME. now we need to
> make it FUN"

The game is functionally complete (combat, economy, AI, 6 modes,
6 buildings, 7 unit types). What it LACKS is the texture that makes
each playthrough feel different + memorable. Below is the full
design-space exploration the v0.4+ cycles need to ship across all
modes + map types.

### 1. Terrain-as-decision (M_FUN.TERRAIN)

Today: 7 biomes, mostly cosmetic. Goal: every biome is a MEANINGFUL
decision the player makes about HOW to engage with it.

- **MOUNTAIN_PASS** (new, level 3): traversable but applies fatigue.
- **SWAMP** (new biome): walkable, applies disease over time.
  Counter: Healer unit.
- **DESERT** (existing decorative → mechanical): suppresses HP regen,
  reduces stamina (no Healer counter — only leaving the biome heals).
- **FOREST**: blocks ranged line-of-sight; ambush mechanic.
  Defenders get a +20% damage bonus when initiating from FOREST.
- **HIGHLAND**: ranged units gain +1 range when standing on it.
  Holding the high ground is a real strategic choice.
- **LAKE/RIVER**: passable only at Crossings or via late-game
  amphibious unit (a future Boat unit).
- **SACRED GROVE** (new biome, rare): one tile per map; standing
  units regenerate HP at 3× rate. Pressure point that rewards
  controlling.
- **RUINS** (new biome, rare): one-shot bonus on discovery (gold or
  tech-fragment). Encourages early scouting.

### 2. Random events (M_FUN.EVENTS)

Today: random-events.ts has weather + some scripted events.
Expand to mode-specific narrative events that shake up midgame:

- **Plague**: applies disease to all units in a random 5-hex region;
  the affected faction must rush a Healer there.
- **Migration**: a wandering monster pack appears at a random edge
  and marches toward the nearest base.
- **Harvest festival**: +50% wood/food yield for both factions for
  60 seconds. Encourages economy build during the window.
- **Earthquake**: a random mountain massif gains a new pass OR
  loses an existing one (chokepoint topology shifts mid-game).
- **Trade caravan**: a passing neutral unit grants gold to whoever
  controls the tile it stops on. Pulls attention to a specific tile.
- **Mercenary offer**: spend gold to spawn a one-off elite unit.

### 3. Asymmetric starts (M_FUN.START)

Today: bases are mirror-symmetric. For replayability + 4X depth:

- **Faction asymmetry**: each faction picks a "trait" at game start
  (cheaper military / faster harvest / +1 starting peon / +50 wood)
  — already partially shipped as startingBonus, expand to 6-8 picks
  with real tradeoffs.
- **Hero unit**: each faction starts with ONE unique Hero unit that
  has named abilities. Death of the Hero is significant (not the
  win condition, but a major setback).
- **Heirloom resource**: a small chance each game that a faction
  starts with an unusual resource bonus (a Wonder fragment, a
  hidden mana node).

### 4. Late-game systems (M_FUN.LATE)

Today: long-reign + age-of-strata are the long modes but get
repetitive past ~10 minutes. Add:

- **Era progression** (already in age-of-strata): extend to all
  modes — tech eras unlock new buildings + units.
- **Settler / colony** unit: build a 2nd Town Hall on a peripheral
  island. Multi-base play.
- **Diplomatic events** (3+ faction modes, future): temporary
  alliances, betrayal mechanics.
- **Wonder race** (already shipped as Wonder building): expand to
  3 different Wonder paths with different costs + effects (Wonder
  of Production / War / Discovery).

### 5. Map biome diversity (M_FUN.BIOME)

Each map type should feel unique. Add:

- **Tundra/snow** mapType for frozen-cap maps (cold-DoT outside of
  fires).
- **Volcanic** mapType (lava chokes that DoT, mountain passes that
  shift mid-game per the Earthquake event).
- **Marsh** mapType (heavy SWAMP coverage, healer-meta).
- **Underground** mapType (cave network, line-of-sight focus).

### 6. Music + audio reactivity (M_FUN.AUDIO)

Today: ambient music + per-event SFX. Add:

- **Combat intensity layer**: music adds a percussion layer when
  combat is active within 8 hexes of the camera.
- **Choke-point alarm**: audible warning when an enemy unit enters
  a contested pass.
- **Per-biome ambient**: distinct ambient layers swap as the camera
  pans across biomes.

### 7. Replay + spectator (M_FUN.REPLAY)

The AI-vs-AI harness already records transcripts + .webm. Promote
to a player-facing feature:

- **Replay mode**: load a saved game's transcript and play it back
  with the original camera moves.
- **Spectator mode**: AI-vs-AI is already there; add a "fast forward
  to next interesting moment" button (first engagement, first
  building destroyed, era change).

### 8. Accessibility (M_FUN.A11Y)

- **Colour-blind palette modes** (already partial via PREF_KEYS).
- **High-contrast HUD**.
- **Closed captions** for all audio events.
- **Tutorial overlay** for first-time players (the onboarding
  modal exists but is one-shot text; replace with an interactive
  "build your first farm" tutorial scenario).

### 9. Polish (M_FUN.POLISH)

- **Camera shake** on building destruction (already exists, audit
  + extend).
- **Screen-edge alerts** when off-camera combat starts.
- **Victory animations**: real outro sequences, not just a modal.
- **Death sounds + dust effects per unit type** (existing partial).

---

## Agent brainstorm — significant expansion (M_FUN.BRAINSTORM)

The user examples above (swamp DoT + healer counter, mountain
fatigue) are illustrative. The point: explore the space. Below
is agent-originated brainstorm pushing the design well beyond
the "biome with status effect" template.

### A. Dynamic terrain

Terrain changes during play, creating narrative moments + shifting
strategy mid-match. Static maps get solved; dynamic maps stay
fresh.

- **Wildfire propagation**: any building destroyed by fire (a future
  Trebuchet variant or a Witch fire spell) can ignite adjacent
  FOREST tiles. Fire spreads tile-by-tile until rain (weather
  state) or sufficient adjacent water tiles extinguish it. Fire
  tiles damage all units in them. Players can use it as a defensive
  burn line OR get burned by their own fire if the wind shifts.
- **Glaciation / drought cycle** (long modes only): a slow
  centuries-long climate model — every era boundary swaps biomes
  (FOREST→GRASS→DESERT→…). Late-game maps look different from
  early-game maps. Forces players to re-plan economy.
- **Erosion**: heavy water flow over CROSSINGS gradually deepens
  them, eventually breaking them into impassable RIVER again
  (after 10 minutes of constant unit traffic). Forces investment
  in upkeep.
- **Volcanic eruption** (event): a random MOUNTAIN tile erupts,
  spawning fresh LAVA tiles for 30 sec that destroy any unit/
  building on them. Then the tile becomes fertile (3× resource
  yield for next 60s) — high-risk reward zone.

### B. Crowd + civilian systems

Today: only military + peons. Add a civilian layer that makes
the world feel populated AND introduces protect-the-VIP gameplay:

- **Citizens**: passive non-combatant entities that wander between
  your buildings. Producing visible MICROHABITS — a House has 4
  citizens walking to the marketplace at noon, the Granary attracts
  carts. Citizen count IS your population score.
- **Refugee waves**: a defeated faction (or a Plague event) sends
  refugees wandering toward another base. Hosting them = +economy
  but they consume food. Refusing them = morale penalty.
- **Trade routes**: TWO bases on the same faction (post-Settler)
  AUTOMATICALLY exchange resources via wandering carts. Disrupt
  enemy trade = economy damage without taking a base. New unit:
  Caravan (slow, no combat, drops resources at destination).

### C. Diplomacy + soft conflict

Not just "kill enemy base". Add layers that reward non-combat play:

- **Reputation system** (multi-faction modes): each faction has
  rep with every other faction. Combat lowers rep with the
  attacked AND its neighbours. Trade raises it. High rep =
  cheaper alliance + shared vision. Negative rep = ranged
  diplomacy actions (sanctions, demand tribute).
- **Tributary states**: instead of destroying an enemy base, force
  it to pay you 10% of its income. Late-game "soft conquest" path
  that's faster than total destruction.
- **Marriage alliances** (4X-style): combine factions via a
  one-shot game event; permanent alliance, no longer hostile.

### D. Mythology + lore-driven mechanics

Aethelgard already has a name + a setting. Lean in:

- **Aether nodes**: 3-5 magical ley-line tiles per map. Standing
  units channel mana to the controller. Wizards channel 5×.
  Activates after era 3.
- **Ancient ruins** (one-shot per map): scouting unit can
  excavate a ruin (15 sec) → unlock a randomly-chosen ancient
  tech that gives a permanent perk (e.g. "Forgotten Armory" =
  all melee +1 dmg).
- **Divine intervention** (very rare): every 20 sim-minutes, the
  player can pray (cost mana + science) for a one-shot effect:
  full HP heal, summon 10 footmen, freeze all enemies 10 sec.
- **Living monuments**: a Wonder built on a Sacred Grove tile
  gains a passive bonus to ALL friendly units everywhere
  (legacy effect).

### E. Player-readable AI personalities

Today: enemy AI is a generic goal-driven entity. Give it character:

- **Named opponents**: 5-8 named AI personalities the player picks
  from in NewGameModal — each with a documented strategy bias
  (the Builder, the Raider, the Hoarder, the Diplomat, the Mad
  King). Visible in the AI's name + portrait + audio cue when it
  acts.
- **AI taunts**: the enemy occasionally announces its current
  goal in an aria-live banner ("the Raider gathers an army") so
  the player has narrative texture, not just abstract pressure.
- **Personality-driven mistakes**: the Hoarder over-saves and
  loses to aggression; the Raider over-extends and bleeds. Each
  personality is BEATABLE by exploiting its specific flaw.

### F. Discoverable mechanics

The user has a Discoveries panel for tech. Extend the discovery
metaphor to MECHANICS:

- **Lost arts**: 10–20 minor mechanics that don't appear until a
  random condition unlocks them (e.g. "your peons learn to swim"
  after a peon falls in water 3 times, allowing water tile cross-
  through). Replay value via incremental mechanic discovery.
- **Faction historybook**: every match adds a paragraph to a
  shared persistent lorebook describing what happened (the
  Forgotten Armory was uncovered, the Witches survived 3 raids).
  Persists across saves; reads as the realm's history.

### G. Hooks for emergent narrative

The current AI-vs-AI playthrough produces transcripts (frames →
state). Promote those to NARRATIVE moments:

- **Highlight detection**: scan a finished match's transcript for
  notable moments (longest single engagement, biggest comeback,
  most lopsided kill). Surface as a post-match summary card.
- **Auto-generated victory text**: pick one of 50 templated
  victory stanzas based on how the match went ("by attrition",
  "in a final desperate rush", "through diplomatic dominance").
- **Match nickname**: each match auto-names itself based on its
  defining moment ("The Burning of Eastwall", "The Long Quiet
  Winter") — visible in the save-game list.

### H. Phone-specific affordances

Capacitor target = Android phone. Touch-first mechanics:

- **Pinch-to-zoom intelligently**: zoom INTO a unit centres camera
  on it AND opens its unit panel (one gesture, two effects).
- **Long-press = bookmark**: long-press any tile to drop a
  named bookmark (camera quick-jump).
- **Drag-from-edge**: drag from screen edge to summon a hidden
  menu specific to that edge (e.g. drag from right = quick-build
  palette).
- **Haptic per-event**: phone vibrates for combat hits / building
  complete / era unlock. Tunable via Settings.

### I. Replayability beyond seed

- **Daily challenge**: same seed for all players each calendar day;
  optional online score submission (later).
- **Puzzle scenarios**: hand-crafted maps with specific win
  conditions ("destroy this base with only 5 peons", "survive 10
  raids without building a Wall"). Unlocked by clearing the
  campaign.
- **Modifier dial** (M_FUN.MOD): pre-game knobs that change rules
  ("double resource cost", "no walls allowed", "everything dies
  in one hit"). Self-handicap or self-buff for variety.

### J. Procedurally generated names + flavour

Tiny touches that make the world feel alive:

- **Unit names**: every spawned unit gets a procedurally generated
  name ("Aelric the Bold", "Maeve of Stoneford"). When a unit dies,
  a small floating tombstone shows the name briefly. Builds
  attachment to individual units.
- **Building inscriptions**: hovering on a building shows when it
  was built + by which peon ("Built 4:12 by Maeve").
- **Procedural map name**: every generated map gets a name from a
  generative wordlist + the seed phrase ("the Bitter Marsh of
  noble-amber-keep"). Save-game list reads better.

### K. The "ONE big idea per cycle" rule

For v0.4+ cycles, every milestone PR should ship at LEAST one
"wow that's a real mechanic" item from above, not just a polish
delta. The game ships fun by accreting genuinely new toys, not
by fine-tuning the existing ones.

---

## Implementation note

The full M_FUN brainstorm is forward-looking. Each subsection
becomes a milestone (M_FUN.TERRAIN, M_FUN.EVENTS, M_FUN.DYNAMIC,
M_FUN.CIV, M_FUN.DIPLO, M_FUN.MYTH, M_FUN.AI, …). The mountain-
massif fix (PR #10) is the FIRST step — proving the design
discipline by doing it once. The follow-up milestones extend the
same discipline (paper-playtest → spec → impl) across the rest
of the design space.

The agent-brainstorm sections (A–K above) are the FUN-driving
items the user mandate explicitly asks for ("really explore the
space"). They go on top of the user-named examples and explicit
mechanic asks.

Suggested ordering for v0.4–v1.0 (no specific time horizon —
each is a milestone ship):

| Cycle | Theme               | Headline mechanic                       |
|-------|---------------------|-----------------------------------------|
| v0.4  | choke/pressure      | MAP.PASS + SWAMP/disease + Healer       |
| v0.5  | dynamic terrain     | Wildfire propagation + Earthquake event |
| v0.6  | civilian layer      | Citizens + Refugee waves                |
| v0.7  | named AI            | 5 personalities + AI taunts             |
| v0.8  | mythology layer     | Aether nodes + Sacred Grove + ruins     |
| v0.9  | replay + narrative  | Highlight detection + match nicknames   |
| v1.0  | phone polish + audio reactivity | Haptics + combat music layer     |
| v1.1+ | diplomacy + 3-faction modes | Tributary states + alliances      |

Each cycle = one PR-able milestone. Spec → tests → impl → ship.
Each ships at least one item from sections A–K so the game
accretes texture, not just polish.
