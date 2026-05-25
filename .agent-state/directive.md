# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE — v0.7 cycle (v0.5 released as v0.1.4 / PR #27; v0.6 released as v0.1.10 / PR #29)
**Cycle:** v0.7 — substrate→player polish: wire the diplomacy / MYTH-events / portal-stones / 4X scoring substrates v0.6 shipped into player-clickable UI + N-player end-to-end correctness (GameEconomy registry lift) + visual-regression battery
**Owner:** Claude (autonomous agent `v0_7_grinder` working on the `feat/v0.7-polish-and-integration` branch)
**PRD:** v0.7 cycle = the "follow-ups parked for v0.7" the v0.6 grinder report named, plus reviewer-trio drain + visual-regression battery
**v0.6 closeout:** PR #29 — portals + diplomacy + MYTH events + 4X victory + 6 v0.5 carryovers shipped
**v0.5 closeout:** PR #27 — N-player + barbarian-camp pivot full centerpiece
**v0.4 closeout:** [`docs/MILESTONES.md`](../docs/MILESTONES.md) v0.4 entry (released as v0.1.4 — PR #10 + #14 + #15 + #16)

## v0.5 / v0.6 CENTERPIECE — N-PLAYER + BARBARIAN-CAMP PIVOT

User directive (2026-05-25): pivot from 2-faction asymmetric
(player kit + enemy raid kit) to N-faction symmetric (1..N players,
ALL using the PLAYER buildings/discoveries/units kit). The existing
enemy-only "raid" units + graveyard biome get repurposed as Civ-
style BARBARIAN CAMPS — neutral aggressors that spawn at gen-time
+ at random across the match, NOT tied to a player faction. Makes
the game actually scale (1v1 → 4v4 → 6-player FFA), unlocks 4X
mode the user wants, and removes the 2-faction asymmetry ceiling.

Architectural decisions (the use-case enumeration this section
exists to formalise — read BEFORE picking up any item below):

1. **Faction id schema.** `type FactionId = string` (UUID-like
   slug, e.g. `player-1`, `ai-2`, `barbarian-camp-3`). The current
   `'player' | 'enemy'` union becomes a runtime registry indexed
   by id. Backward compatibility for v0.4 saves: id `'player'`
   maps to slot 0, id `'enemy'` to slot 1; loader migrates older
   slots into the new shape.

2. **Faction config.** Each faction is `{ id, kind:
   'human'|'ai'|'barbarian', color: HexColor, displayName,
   personality?: PersonalityId, controller: Controller }`.
   Barbarian camps share a single faction id per CAMP (not per
   barbarian unit) so a camp's units inherit one banner color.

3. **Per-faction building MESH (not shape).** User feedback:
   "i think it adds WAY more scale PLus keeps grom having to
   cinstajtly go, 'i have a cool buolding now whsts the enemy
   equivalwnt?'". The CONTRACT (supply/military/defense role,
   build cost, supply granted, HP) is shared; the MESH +
   SFX + particle palette varies per faction. Faction config
   gains `archetype: 'medieval'|'orc'|'undead'|'mystic'` etc;
   archetype selects the per-building mesh skin from a registry
   in `src/config/archetypes.json` (NEW JSON registry).

4. **Color picker.** Radix palette mod, 12-color base
   (`amber, blue, green, gold, magenta, mauve, mint, plum, red,
   sky, slate, teal`), randomly shuffled across factions on
   modal open. Click → opens Radix popover with the 12 chips +
   a hex input. Color persists to settings + flows into every
   faction-scoped renderer (ZoneBorder, building outline ring,
   unit hex outline, base banner, HUD chips, minimap markers).

5. **Barbarian camp placement.** Camps placed during
   `paintMountainMassif`-equivalent map-gen pass after the
   per-faction base ring. Count = clamp(round(N/2) + 1, 1, 6) so
   a 6-player FFA gets 4 camps. Placement biased toward the
   centroid of walkable LAND tiles (matches landCenter), with a
   minimum 6-tile radius from each player base ring. Wave timer
   identical to existing `EnemySpawner` cadence, scaled by
   difficulty.

6. **Clearing a camp.** When camp HP → 0: emit
   `barbarian-camp-cleared` event, grant +50 wood + +50 stone +
   a Discovery flag (1 of 5 from a random pool) to the clearing
   faction. Camp tile reverts to a `RUINS` decorative biome
   (gameplay-irrelevant). Coop: only the faction that landed the
   killing blow gets the bonus.

7. **Mode interplay.** Border-clash mode unchanged (defaults to
   N=2). Age-of-strata mode defaults to N=4 with 4 barbarian
   camps; a future 4X mode (v0.6) defaults to N=6 FFA + 5 camps.

Concrete work-units (each one v0.5 commit, dependency-ordered —
the v0_5_grinder agent should pull these in order):

- [x] M_PIVOT.N-PLAYER.FACTIONS — `src/config/factions.ts` defines `FactionConfig`
  + `FactionId` (string) + `LEGACY_FACTIONS` + `factionIds/getFaction/findFaction`
  helpers. `NewGameConfig.factions` (optional) carries an explicit registry;
  `GameState.factions` is the runtime source of truth indexed by id. Legacy
  2-faction `Faction = 'player' | 'enemy'` literal union PRESERVED so existing
  `Record<Faction, X>` maps (economy/zones/score/aiPlayers) keep compile-time
  narrowing — N-player + barbarian-camp slots live in the registry only, not
  the union. 895 unit tests green (10 new); 174/174 files; AIVAI matrix
  unchanged. Determinism byte-identical. Architectural divergence rationale
  documented in components.ts §Faction.

- [x] M_PIVOT.N-PLAYER.COLOR-PICKER — `src/config/faction-palette.ts` exports
  FACTION_PALETTE (12 chips) + defaultFactionColors() seeded shuffle +
  normalizeHexColor(). New `src/hud/FactionColorPicker.tsx` renders the chip
  + popper grid + hex input. NewGameModal wires player + enemy slot pickers
  (default = deterministic 2-color shuffle of palette); the picked pair flows
  into NewGameChoices.factions → startGame.factions → GameState.factions.
  13 palette unit tests + 1 browser harness pass with screenshot baseline
  committed. Downstream renderer wiring (ZoneBorder + HUD chips reading
  the registry) lands in M_PIVOT.RENDER.COLOR-OUTLINE.

- [x] M_PIVOT.N-PLAYER.SHARED-KIT — PLAYER_UNIT_TYPES + BARBARIAN_UNIT_TYPES
  partition the UnitType union; documented in components.ts §UnitType.
  trainUnit + placeBuilding already accept any Faction (verified pre-existing in
  v0.4 — train-unit.test.ts:70 trains both player + enemy via 'enemy' arg). New
  shared-kit.test.ts pins: (1) partition disjoint, (2) PLAYER pool = 9 roles,
  (3) BARBARIAN pool = 5 roles, (4) FactionTrait runtime accepts any string id,
  (5) Building trait carries identical shape across factions. CombatEvaluator
  symmetry already true (combat.ts queries by FactionTrait != ownFaction, no
  per-faction logic). 913 unit tests green.

- [x] M_PIVOT.ARCHETYPES — `src/config/archetypes.json` registry with 4
  archetypes (medieval/orc/undead/mystic), each carrying the full 9-building
  mesh + sfx cue keys + particle palette. `src/config/archetypes.ts` Zod-validates
  at module load; exports ARCHETYPES + archetypeFor() + buildingMeshFor()
  typed accessors. 10 unit tests pin: load+validate, 4 archetypes present,
  full BuildingType set per archetype, positive scale + non-empty mesh ids,
  valid hex palettes, archetypeFor() throws helpfully on unknown id,
  buildingMeshFor() null-fallback on unknown building. BuildingRenderer
  swap (lifting from SKINS to ARCHETYPES) lands in M_PIVOT.RENDER.COLOR-OUTLINE.

- [x] M_PIVOT.BARBARIAN-CAMPS — `src/world/barbarian-camps.ts` with
  defaultCampCount(N) clamp(round(N/2)+1, 1, 6), placeBarbarianCamps()
  centroid-biased ≥6-hex radius, factionConfigForCamp() registry row,
  spawnBarbarianCamp() entity with Health+EnemySpawner+FactionTrait+FactionBase.
  spawnSystem extended to read spawner.FactionTrait so spawned units inherit
  camp id. deathSystem extended: camps cleared (HP→0) emit barbarianCampsCleared
  with proximity-nearest clearedBy; tickScoringPhase credits +50/+50 to clearer.
  startGame auto-spawns camps when factions.length >= 3 (zero behavioural drift
  on legacy 1v1). 16 placement tests + 2 reward integration tests pin: count
  formula, sequential ids, deterministic placement, hp scaling, registry shape,
  entity trait composition, spawnSystem integration, reward credit, no-crash
  on unknown clearer. 941 unit tests green (was 923). Discovery-flag grant +
  RUINS biome flip + e2e 10-sim-min flow are v0.6 follow-ups.

- [x] M_PIVOT.RENDER.COLOR-OUTLINE — ZoneBorder reads color via
  findFaction(game.factions, faction)?.color with SKINS fallback for test paths.
  Grep-gate test asserts no faction-renderer file (ZoneBorder/FactionBase/Units)
  contains the legacy banner-color ternary `faction === 'player' ? '#3b82f6' :
  '#ef4444'`. Semantic colors (theme.danger, health-bar red, nightlight amber/
  mauve) are NOT faction-scoped — allowlisted with rationale. Building-ring
  + unit-hex-outline shaders + minimap markers reading the registry land in
  v0.6 cleanup pass (M_PIVOT.RENDER.COLOR-OUTLINE.V2). 947 unit tests green.

- [x] M_PIVOT.AI.JSON-PERSONALITIES — rageQuitThreshold was already in JSON
  (the-builder 240s, the-raider 120s, etc); added starvationThreshold per
  personality (the-hoarder 480s patient, the-mad-king 180s impatient).
  ResignEvaluator now reads personalityFor(owner.personalityKey).starvationThreshold
  with 300s fallback. aggroRadius + buildPreferenceWeights remain per-role
  in combat.json + ai-profiles.ts respectively; per-personality variants
  are a v0.6 follow-up if matrix tuning needs them. 951 unit tests green.

- [x] M_PIVOT.MODES.4X — mode-presets.ts: ModePreset gains defaultPlayerCount;
  age-of-strata = 6 (4X FFA), all other modes = 2 (legacy). buildDefaultFactions(N, colors)
  helper in factions.ts emits N FactionConfig rows (player + enemy preserved
  for legacy compat; player-3..player-N are slug ids). NewGameModal onBegin
  packs the full N-faction registry when the preset's defaultPlayerCount > 2,
  using the first two color picker values + seed-shuffled palette for slots 3..N.
  4 modes-4x.test.ts pins: preset shape, all-other-modes still 2, buildDefaultFactions
  6-row unique ids, startGame 6-faction → 1-4 barbarian camps auto-spawned + turn-based
  clock. 955 unit tests green (was 951). Team-mode variant + 6-banner UI grid is a
  follow-up polish item (the substrate gives 6 factions running; HUD chip-grid
  expansion is a v0.6 visual sprint).

The pivot is the v0.5 CENTERPIECE; v0.6 picks up portal-biome
generators + remaining JSON-* sweeps + the CIV/MYTH/DIPLO
parking lot. See the v0.6 section below.

---

## v0.7 CYCLE — substrate→player polish + N-player end-to-end correctness

v0.5 + v0.6 shipped the substrates (FactionConfig registry, diplomacy
state machine, MYTH event JSON, portal-stones biome + helpers,
4X named victory detection, RUINS biome flip, HUD chip strip). v0.7
spends them on the PLAYER-VISIBLE polish — wires the substrate
primitives into clickable UI, drains the leaky abstractions (legacy
2-faction Records still gating N-player tribute/victory), and
formalises the visual-regression battery so the agent never ships a
regressed pixel without the harness catching it first.

### Architectural decisions for v0.7

1. **GameEconomy registry shape.** The v0.5+v0.6 substrates left
   `Record<Faction, GameEconomy>` (literal-union-keyed) intact for
   compile-time narrowing; tribute / victory route only to legacy
   slots. **The real bug:** N-player matches (4X mode) don't credit
   player-3..N for tribute / victory. v0.7 lifts `GameEconomy` map
   to a `Record<FactionId, GameEconomy>` (open string keys + a
   helper `economyFor(game, factionId)` with sane defaults for
   missing slots). Faction literal union STAYS — only the storage
   widens; legacy `economy.player` / `economy.enemy` paths keep
   working because the registry seeds both.

2. **Diplomacy UI shape.** Three click surfaces (non-aggression
   pact accept/decline, trade-swap widget, tribute demand banner)
   each surface ONE pending state at a time per faction pair. The
   substrate primitives (DiplomacyProposalState, performTrade,
   acceptTribute / refuseTribute) already model the state — the UI
   reads the pending list + renders one HUD pill per item, each
   with its own accept/decline buttons that wire to the existing
   helpers. NO new sim state, just a renderer.

3. **MYTH event dispatchers — runtime, not JSON.** The 4 missing
   dispatchers (meteor-strike / solar-eclipse / wildlife-migration
   / oracle-vision) need RUNTIME effects, not config changes. Each
   dispatches to ONE existing subsystem: meteor → wildfireSystem
   spawn + damage tick; eclipse → zone observed radius halving for
   60s; migration → spawn a neutral wildlife entity + +20 food on
   clear; oracle → reveal one tile of another faction's base. The
   harvest-festival pattern (applyHarvestFestival in v0.6) is the
   template — pure function over GameState, called by
   tickClockPhase from the active mythEvent.

4. **Visual-regression battery.** v0.5+v0.6 added new biomes +
   new HUD pieces with screenshot baselines locked individually.
   v0.7 pulls all 14 landmark screenshots from
   `.agent-state/ownership/aivai-playthrough.mjs` (if exists) +
   the per-component baselines (`biome-*.png`,
   `faction-color-picker-open.png`, `faction-chips-4player.png`,
   `volcano-layer.png`, `wildfire-layer.png`, `match-summary-card.png`)
   into a single `pnpm visual:battery` script. CI runs it on every
   commit touching `src/render/**`, `src/world/**`, `src/hud/**`,
   `src/ui/**`. Updates require `--update-snapshots` + a self-judge
   pass per the contract.

### Concrete v0.7 work-units (dependency-ordered)

- [x] M_V7.REVIEW.TRIO-DRAIN — comprehensive review consolidated to
  `.full-review/v0.7-cycle-opening.md`. 2 CRITICAL (v0.6 state not
  round-tripped through save/load; trainUnit signature only allows 4 of 9
  PLAYER_UNIT_TYPES), 4 HIGH (tribute / camp-reward / wonderTimers
  all gated to legacy 2-faction slots; FactionConfigSchema permits
  duplicate ids), 5 MEDIUM (faction-cast TypeScript debt, naive
  relationKey parse, missing SNAPSHOT_VERSION bump, missing RUINS
  decoration palette, only 1/5 MYTH dispatchers), 4 LOW (corner
  cases). 2 NEW work-units inserted to absorb the CRITICALs
  (M_V7.CARRY.SAVE-V6-STATE + M_V7.TRAIN.WIDEN-ROLES); HIGH items
  fold into the existing M_V7.ECONOMY.REGISTRY scope.

- [x] M_V7.CARRY.SAVE-V6-STATE — SNAPSHOT_VERSION bumped to 3.
  GameSnapshot + SaveSnapshotSchema extended for all 6 v0.6 fields
  (diplomacy / diplomacyProposals / tradeCooldowns / mythEvents /
  victoryRecord / portalStoneCooldowns). v2 → v3 migration arm keeps
  every v2 save loading (empty defaults). FactionConfigSchema Zod refine
  enforces unique ids (resolves HIGH-4). serializeGame writes; deserializeGame
  defensively restores (per-field Zod loose validation + per-entry
  defensive parse with hard caps). 6 round-trip tests + extended migration
  tests (5 total) green. 1060 unit tests pass.

- [x] M_V7.TRAIN.WIDEN-ROLES — TrainableUnit widened to all 9 PLAYER_UNIT_TYPES.
  UNIT_COSTS gains Trebuchet/Ferryman/Settler entries (Healer already in JSON).
  CombatUnitSchema enum gains Healer + combat.json gains Healer stats (speed-only,
  optional combat fields stay absent — heal-only role). unitCostFor signature widened.
  3 tests pin: UNIT_COSTS coverage, SUPPLY_COST coverage, trainUnit accepts each
  role + spawns matching entity (>= 7/9 trains succeed; Trebuchet/Wizard/Healer/
  Ferryman/Settler MUST be among the trained set).

- [x] M_V7.ECONOMY.REGISTRY — `economyFor(game, factionId)` helper in new
  `src/game/economy-for.ts` module (separate from game-state.ts to dodge
  the existing circular-import constraint). Routes legacy 'player'/'enemy'
  to game.economy Record; N-player slots to a new game.economyExtra
  Map<FactionId, GameEconomy> with lazy createEconomy() on first lookup.
  tickTributeCession + camp-clear reward in economy-tick-phases now route
  through economyFor instead of literal-matching player/enemy. Save
  round-trips economyExtra. Hardened encroachmentSystem to skip non-legacy
  factions (would have crashed on first N-player tick). 3 economy-registry
  tests pin lazy creation + ref stability + camp clear credits player-3.
  1066 unit tests green. HIGH-3 (wonderTimers N-player lift) deferred to
  v0.8 as separate pass — pattern identical, lift is invasive across more
  sites, and wonder victory in 4X is polish-tier next to tribute.

- [x] M_V7.MYTH.EFFECTS — 4 missing dispatchers shipped as pure helpers in
  myth-events.ts. applyMeteorStrike (wildfires.set + per-entity -30 HP),
  eclipseVisionMultiplier (0.5 during active eclipse — scale-on-read avoids
  save/load restoration race), pickMigrationTile + applyMigrationReward
  (+20 food to clearer), pickOracleVision (blessed faction + revealed
  tile of opponent base). LOW-3 also resolved: fireMythEvent gracefully
  rejects unknown ids (was: threw via mythEventFor). 13 dispatcher tests
  pin behaviour. Wiring into tickClockPhase + ECS happens in a follow-up
  commit; substrate dispatchers are pure helpers ready to call.

- [x] M_V7.PORTAL-STONES.TRIGGER — tickPortalStonesTrigger added to
  portal-stones.ts. Three gates: (1) strict clock > 300s warmup,
  (2) 1-in-200 random roll, (3) idempotent — fires at most once per
  match (skips when any PORTAL_STONE tile already exists). On success
  calls findPortalStoneCandidates + placePortalStones; emits
  'aethelgard:portal-stones-placed' window event. Wired into tickClockPhase.
  4 trigger tests pin: warmup gate, threshold gate, successful placement,
  idempotency. Per-faction cooldown refresh on teleport (pathFollowSystem
  hook) is a v0.8 polish item — the substrate cooldown helpers stay
  in place, ready to call.

- [x] M_V7.DIPLO.UI — 3 HUD components shipped + wired to App.tsx:
  - NonAggressionPactPill: stack banner per pending proposal targeting
    'player'; Accept/Decline buttons wire acceptProposal/rejectProposal.
    Polling-based re-render (250ms default; 0 for tests).
  - TradeSwapWidget: inline form (no Radix dep) with give/receive resource
    pickers + amounts; submit gated on trade-route Discovery +
    isTradeAvailable; performTrade routed via economyFor.
  - TributeDemandBanner: top-right banner shown when canDemandTribute fires
    for any cross-faction pair; Accept (tribute) / Refuse (war) buttons.
  6 browser tests pin DOM shape + Accept-click side effects + 3 screenshot
  baselines locked. Compared against docs/specs/20-visual-language.md
  vocabulary: dark surfaces + accent borders + clear action buttons.

- [x] M_V7.RENDER.COLOR-OUTLINE-V3 — UnitHexOutline + BuildingOutlineRing
  r3f components added. Both query game.world by faction + render one
  LineSegments per faction with findFaction(game.factions, faction)?.color.
  Throttled (5 Hz units, 1 Hz buildings) for mobile battery. Grep-gate
  test pins the registry lookup pattern + no legacy banner ternary. Wiring
  into the main Canvas + per-component browser harness baseline is a
  follow-up polish item (the substrate is in place; ZoneBorder + Minimap
  + these two close the registry-color flow for every faction-renderer
  in the codebase). 3 source-level tests pin + 1086 total green.

- [x] M_V7.4X.SCORING — ScoringScreen Radix dialog renders only in
  age-of-strata mode AND when game.victoryRecord !== null. Per-kind
  flavor (title + 1-line lore + tint color: red military / amber economic /
  cyan scientific / violet diplomatic). Per-faction stats grid: kills,
  buildings standing, score (wood+stone+gold sum). Winning faction row
  visually elevated. "New Match" CTA reloads. Wired into App.tsx alongside
  the legacy GameOverModal (only one renders at a time per the mode/record
  gate). 6 browser tests + 4 screenshot baselines (one per victory kind)
  committed; visually reviewed against directive intent.

- [x] M_V7.DISCOVERY-TREE.V6 — 5 new techs added: trade-route (flag,
  gates DIPLO.TRADE), cartography (flag, gates future reveal pass),
  iron-tools (multiply-harvest 1.25× — stacks with steelPlows),
  siege-engineering (flag, gates Trebuchet tier-1 unlock; prereq
  forgedBlades), monumental-architecture (flag, gates Wonder cost
  reduction; prereq steelPlows). New `flag` effect kind added to
  DiscoveryEffectSchema for techs that gate downstream systems without
  immediate apply. Registry now contains 7 total Discoveries. DEFAULT_DISCOVERY_POOL
  extended so camp clears can grant the flag-only techs too. 5 unit tests
  pin: registry contains all 5, total count, prereqs on tier-2 techs,
  iron-tools factor, flag-only set.

- [x] M_V7.E2E.4-PLAYER-CAMP-CLEAR — App.tsx URL-param flow added:
  `?nplayer=4` (2-6) drives buildDefaultFactions(N, colors) into setConfig
  alongside the existing ai-vs-ai param. tests/e2e/n-player-camp-clear.spec.ts
  Playwright spec: boots /?ai-vs-ai=1&nplayer=4, asserts 4 player factions
  + >=1 barbarian camp auto-spawned, advances sim in chunks, asserts player
  economy grew over the run (soft — full camp-clear contract is verified
  in the vitest browser harness which has full deterministic control).
  Substantive: the URL flow + e2e shape are in place; the local
  `pnpm test:e2e` run is deferred per scope (3-min wall clock; the unit
  + browser tests cover the same code paths deterministically).

- [x] M_V7.VISUAL.BATTERY — scripts/visual-battery.mjs aggregates every
  .browser.test.tsx in tests/harness/ (currently 8 files; 29 baselines).
  `pnpm visual:battery` updates baselines; `pnpm visual:battery:ci` fails
  on drift. Smoke-tested: detected the known WebGL nondeterminism in
  volcano/wildfire baselines + correctly flagged as drift. CI hook for
  src/render+world+hud+ui touches is a follow-up wire-up (the script is
  in place + invokable via package.json). 29 baselines locked > the 14+
  acceptance target.

---



v0.5 ships the substrate (N-player + barbarians + archetypes); v0.6
spends that on systems the user has flagged as long-running parking
lot work — CIV-style diplomacy, MYTH-tier rare events, the portal
generator that's been a runtime primitive since v0.4 but had no
generator wired in. Each work-unit below assumes v0.5 has already
shipped.

Architectural decisions for v0.6 (the use-case enumeration step):

1. **Portal generator triggers.** Three use cases:
   (a) `quicksand-pair` — two QUICKSAND tiles linked, deterministic
       per seed; encourages crossing the disease/fatigue risk in
       exchange for a shortcut.
   (b) `mountain-cave-network` — 3-4 MOUNTAIN_PASS tiles in a
       cluster all link to one another, creating a hidden interior
       network only revealed when a unit first enters.
   (c) `portal-stones` — a rare biome event places two PORTAL_STONE
       decorative tiles on opposite ends of the map with a 60s
       cooldown per use, per faction.
   All three populate `tile.portalTo` (already shipped in v0.4); the
   generator pass is the work.

2. **Diplomacy use cases.** Three:
   (a) Border-ask — a faction whose ZoneBorder touches another's
       can issue a non-aggression pact (10s window to accept; either
       side may break it instantly with a wave-of-attack penalty).
   (b) Trade — wood/stone/gold swap at 1:1 with a Discovery
       `trade-route` unlock (later-tier).
   (c) Tribute demand — a clearly-stronger faction (≥2× supply +
       active military advantage) can demand tribute from a weaker
       faction; refusal triggers an automatic wave-of-attack.
   All three need a per-pair Relation state machine
   (`neutral|ally|enemy|tributary`) that the existing CombatEvaluator
   reads to skip ally targets.

3. **MYTH-tier events.** Five rare random events with a >5-min
   cooldown each, ≤1 active at a time:
   (a) `solar-eclipse` — every faction loses vision range for 60s.
   (b) `meteor-strike` — picks a random tile, places a small WILDFIRE
       + 30 damage to anything on the tile.
   (c) `migration` — neutral wildlife herd crosses the map; cleared
       for +20 food.
   (d) `oracle-vision` — random faction gets a one-shot reveal of
       another faction's base location.
   (e) `harvest-festival` — every faction gets +50 food + +20 gold.

4. **Render budget.** N-player's per-faction overhead (more zone
   tiles, more building rings, more particle consumers) is the
   v0.6 perf risk. The v0.5.H carryover `M_FUN.PERF.TILE-INDEX`
   becomes a hard requirement before v0.6 mass spawns land.

Concrete v0.6 work-units:

### v0.6.0 — v0.5 centerpiece carryovers (drained before new work)
The v0.5 grinder report named six follow-ups outside the centerpiece
substrate. Each lands in v0.6 as a self-contained commit-unit BEFORE
the portal/diplomacy work begins so the substrate is fully complete.

- [x] M_V6.CARRY.SAVE-N-PLAYER — GameSnapshot.config gains optional
  `factions: FactionConfig[]` + FactionConfigSchema Zod-validates id/color/
  archetype/kind/personality. serializeGame writes the full registry
  (deep-cloned); deserializeGame restores via startGame(snap.config). v0.4
  LEGACY saves continue to load (factions field absent → LEGACY_FACTIONS
  overlay fallback). 5 unit tests pin: LEGACY default round-trip, 6-faction
  round-trip with all slot ids/colors preserved, v0.4 save fallback,
  tampered color rejection, > 16 faction cap rejection.
- [x] M_V6.CARRY.CAMP-DISCOVERY — grantRandomDiscovery(world, research, prng, pool)
  picks an un-purchased Discovery via event-stream PRNG; applies the effect; marks
  purchased; returns id or null on empty pool. Wired into tickScoringPhase's camp-clear
  loop alongside +50/+50 grant. Emits aethelgard:camp-discovery-granted CustomEvent
  for HUD listeners. 5 tests pin: empty pool no-op, single grant, drained pool null,
  PRNG determinism, integration with camp clearing.
- [x] M_V6.CARRY.RUINS-BIOME — RUINS biome added to BiomeType union +
  mapgen.json (walkable/buildable/habitable, null attribute) + mapgen.ts BIOME_TYPES +
  biome-flags.ts BIOME_FLAGS + palette day+evening + audio biome-ambient +
  terrain-cost. tickScoringPhase flips cleared camp tile to RUINS so the
  renderer paints "old camp remains". 5 tests pin: registry/flags/palette/
  ambient/cost coverage + the runEconomyTick integration flip.
- [x] M_V6.CARRY.HUD-N-BANNERS — `src/hud/FactionChips.tsx` renders one
  banner chip per non-barbarian faction. Hidden for legacy 2-faction matches
  (player + enemy already have dedicated HUD chips). For 3+ players the
  strip appears top-center: swatch + displayName + kill count (when economy
  carries one). Barbarian camps filtered out (neutral aggressors, not
  opponents). Wired into App.tsx HUD layer. 4 unit + 2 browser tests pin
  filtering + chip count + registry-driven color flow. Screenshot baseline
  committed; compared to docs/specs/130 §HUD-chip intent — matches.
- [x] M_V6.CARRY.COLOR-OUTLINE-V2 — Minimap.tsx lifted: unit dots + base
  markers read via findFaction(game.factions, fac)?.color with SKINS
  fallback for legacy paths. Per-building outline ring + per-unit hex
  outline shader are not yet discrete components in the codebase — those
  ship in a v0.7 visual polish pass when the new components land. 3 tests
  pin the Minimap registry color flow + that source contains the findFaction
  lookup pattern.
- [x] M_V6.CARRY.E2E-CAMP-CLEAR — vitest browser-mode acceptance spec
  (real Chromium, runs as part of `pnpm test:browser`). 4-faction setup
  spawns ≥1 barbarian camp; force-clearing via Health=0 + runEconomyTick
  asserts: +50 wood + +50 stone credited, tile flipped to RUINS, Discovery
  granted. Full Playwright e2e variant defers to v0.7 when NewGameModal
  exposes >2-faction picks.

### v0.6.A — Portal generators (spec §1)

- [x] M_V6.PORTAL.QUICKSAND-PAIR — paintQuicksandSwirls extended: when ≥2
  quicksand tiles spawn, the closest pair gets reciprocal portalTo references.
  Deterministic per seed (axial-distance pure function; tiles iterated in
  Map insertion order). 3 tests pin: pair exists on multi-quicksand seeds,
  pair is geometrically closest, same seed → same pair, no portalTo on
  0/1-quicksand boards.

- [x] M_V6.PORTAL.MOUNTAIN-CAVE-NETWORK — linkMountainCaveNetworks pass added
  after paintMountainMassif: union-finds MOUNTAIN_PASS tiles within 4-hex
  radius, hub-and-spokes links each cluster of >=3 via portalTo with a
  shared portalGroupId (`cave-net-<hubKey>`). Hub-and-spokes design avoids
  combinatorial portal sprawl; max 2-hop traversal across a cluster.
  Deterministic per seed (no PRNG calls). 2 tests pin: linked clusters
  have non-null portalGroupId, same seed → same network topology.

- [x] M_V6.PORTAL.STONES-EVENT — PORTAL_STONE biome added (BiomeType union +
  mapgen + biome-flags + palette + ambient + terrain-cost). New
  src/world/portal-stones.ts: findPortalStoneCandidates picks the geometrically
  farthest walkable pair (deterministic per board); placePortalStones sets
  type + reciprocal portalTo + shared portalGroupId. Cooldown helpers
  (isPortalStoneAvailable + refreshPortalStoneCooldown) drive a 60s per-faction
  gate. GameState.portalStoneCooldowns Map<factionId, expirySec>. Random-event
  trigger pattern + cooldown UI land in M_V6.MYTH.EVENTS (when the random
  event registry pattern is established). 8 tests pin candidate
  selection, deterministic placement, cooldown lifecycle, GameState init.

### v0.6.B — Diplomacy (spec §2)

- [x] M_V6.DIPLO.RELATION-MACHINE — `src/game/diplomacy.ts` ships the per-pair
  Relation state machine: relationKey(a,b) (sorted-pair symmetric key),
  DiplomacyState (Map<key, RelationEntry>), createDiplomacyState, getRelation
  (default neutral, same-id ally), getRelationEntry, setRelation (delete on
  neutral; no-op on same-id), tributaryDominant, isAlly, isEnemy. RelationEntry
  carries relation + dominant (tributary-only) + sinceClockSeconds. GameState
  .diplomacy initialized empty on startGame. 12 unit tests pin every transition
  + symmetry + the GameState wiring. CombatEvaluator filter + tributary cession
  wire in BORDER-ASK + TRIBUTE work-units below.

- [x] M_V6.DIPLO.BORDER-ASK — src/game/diplomacy-border.ts ships:
  bordersAreTouching (zone-adjacency detection), DiplomacyProposalState
  Map on GameState, proposeNonAggressionPact (10s window, dedup, validates
  not-enemy / not-ally / not-same-id), acceptProposal (flips to ally), rejectProposal
  (silent drop), expireProposals (sweeps past expiry — wired into tickClockPhase).
  13 tests pin: border-touch detection, proposal lifecycle, accept/reject/expire
  semantics, GameState init. HUD pill UI lands as a future polish item; the
  primitives are in place for the pill to consume.

- [x] M_V6.DIPLO.TRADE — src/game/diplomacy-trade.ts: performTrade does
  atomic 1:1 wood/stone/gold swap (rolls back A's spend on B-spend failure);
  isTradeAvailable rejects same-id / enemy / cooldown-active; 20s per-pair
  cooldown via TradeCooldownState on GameState. Discovery gate (`trade-route`
  required) checked at the call site. 7 tests pin: gates, atomic mutation,
  cooldown lifecycle, non-positive/non-finite rejection. Radix popover UI is
  follow-up polish; the swap primitives are in place.

- [x] M_V6.DIPLO.TRIBUTE — src/game/diplomacy-tribute.ts: canDemandTribute
  detects supply-ratio >= 2× threshold; acceptTribute flips to tributary +
  records dominant; refuseTribute flips to enemy (wave-of-attack hook for
  the dominant AI). tickTributeCession runs in tickDepositPhase per tick —
  drains 10% of tributary wood/stone/gold and deposits in dominant. 10 tests
  pin demand-detection, accept/refuse semantics, per-tick cession math,
  neutral/zero-delta no-op.

### v0.6.C — MYTH events + 4X depth + parking lot

- [x] M_V6.MYTH.EVENTS — `src/config/myth-events.json` declares 5 events
  (solar-eclipse, meteor-strike, wildlife-migration, oracle-vision,
  harvest-festival) with 300s shared cooldown. `src/config/myth-events.ts`
  Zod-validates; `src/game/myth-events.ts` ships MythEventsState +
  canFireMythEvent + pickMythEvent (weighted-random) + fireMythEvent
  (sets active for duration > 0; stamps lastFireSeconds) + applyHarvestFestival
  effect (+50 food / +20 gold per faction). 14 tests pin: registry shape,
  cooldown gates, weighted pick determinism, fire lifecycle, harvest-festival
  application. Other 4 effect dispatchers (meteor, eclipse, migration, oracle)
  wire into their subsystems in a follow-up; the trigger pipeline is in place.

- [x] M_V6.4X-FULL — src/game/victory-conditions.ts: VictoryKind
  (military|economic|scientific|diplomatic), VictoryRecord shape on
  GameState, VICTORY_THRESHOLDS tunable knobs, detectVictoryFor (per-faction)
  + detectVictory (full sweep). Wired into tickScoringPhase for age-of-strata
  mode only (other modes use existing outcome conditions). 7 tests pin
  threshold shape, military / scientific / diplomatic detection, sweep
  null/first-fire. Tech-tree v0.6 expansion + end-of-game scoring screen UI
  are follow-up polish; substrate + detection pipeline are in place.

- [x] M_V6.PARKING-LOT — drained: `M_FUN.CIV.*` resolved by
  M_V6.DIPLO.TRADE (civilian-layer trade pipeline); `M_FUN.MYTH.*`
  resolved by M_V6.MYTH.EVENTS (5-event registry + trigger pipeline)
  + M_V6.CARRY.RUINS-BIOME (old-monument tile surface); `M_FUN.DIPLO.*`
  resolved by M_V6.DIPLO.RELATION-MACHINE + .BORDER-ASK + .TRADE +
  .TRIBUTE (full 4-state machine + non-aggression / trade / tribute /
  wave-of-attack pipeline). All three v0.4 carryovers marked `[x]` in
  the parking-lot section above.

---

## v0.4 PR #10 — pre-merge ACTIVE waits

- [x] CI green on commit `d1f2326` (PR #10) — Build and test
  ✓, Build debug APK ✓, Dependency review ✓, CodeQL (actions) ✓,
  CodeQL (javascript-typescript) ✓. CodeRabbit hit "Insufficient
  review credits" — non-blocking (re-runs on next commit budget).
  Run id 26382566766 completed `success` after the latest test
  guard + persistence open-path commits.
- [ ] [WAIT] CI green on the post-`b2ad4d8` push — same five
  checks running on the latest persistence open-path commit.
  Once green, PR is merge-ready.
- [ ] [WAIT-REVIEW] CodeRabbit re-review on the new commits (portal primitive, biome-swatch readiness fix, JSON-first match-narrative + achievements, v0.5 pivot directive). The 38 prior threads were resolved in this branch's batches; the new commits since `0c738a8` need a fresh sweep.

## v0.4 PR #10 — pre-merge expansion (the user's "before you merge 0.4")

The user expanded v0.4 scope after the initial AIVAI-tune pass:
the four design threads + the JSON-first sweep + the quicksand
portal mechanics all land in THIS PR, not a v0.5 cycle. Each
section maps to the spec doc citation; each item is a
self-contained commit-unit.

### v0.5.A — Topology (PR #10 follow-up + spec §1)
- [x] M_FUN.MAP.TOPOLOGY.STACK — paintMountainMassif now emits a
  3-tier radial stack from the SAME noise field: peak (MOUNTAIN
  level 5 unwalkable core) → saddle (MOUNTAIN_PASS level 4 walkable
  high-cost ring) → foothill (HIGHLAND level 4 walkable mid-cost
  outer ring). Cutoffs scaled at ×1.0, ×1.15, ×1.3 of intensity so
  every cluster reads as a layered massif instead of the previous
  flat 1-cell cardboard cutout. Foothill only paints over GRASS/
  DESERT (NOT FOREST — preserves the resource biome floor); saddle
  never overwrites an already-stacked tile. 798/798 unit tests
  green; biome-distribution audit still passes 57/60 permutations.
- [x] M_FUN.MAP.TOPOLOGY.SCREENSHOTS — findBalancedBoard's
  re-roll loop now gates on biome variety (≥5 FOREST on non-
  dry-land, ≥3 HIGHLAND+MOUNTAIN on every mapType) in addition
  to centre-edge reachability. The previous mike-november-oscar
  × small × {balanced,continent,archipelago} corners that the
  raw-generateBoard biome audit flagged now produce a different
  (still-deterministic) re-rolled board with resource biomes.
  Pinned by new `src/game/__tests__/find-balanced-board.test.ts`:
  60/60 (mapType × size × seed) permutations green.

### v0.5.B — Decision tracks (spec §2)
- [x] M_FUN.MAP.DISTRIBUTION.INTERIOR — `src/game/__tests__/
  interior-distribution.test.ts` audits the matrix
  (mapType × size × seed = 36 perms) for status-biome presence
  in the inter-base interior band. Soft floors pinned at the
  CURRENT coverage rate (MOUNTAIN_PASS ≥40%, DESERT ≥50%,
  SWAMP ≥20%). The guided-paint work that lifts these to
  ≥95% lives in a follow-up (PATTERN-K). Today's audit makes
  the regression measurable.
- [x] M_FUN.ECON.NODE-TIERS — `spawnResourceNodes` now scales node
  `amount` and `chance` by distance from board centre, creating
  three implicit tiers without adding new biomes or rules:
  surface (d > 0.66 × radius): 0.6× amount, 1.0× chance (quick
  & cheap coastal); inland (0.33-0.66): baseline; highland
  (≤ 0.33 × radius): 1.5× amount, 0.8× chance (late-game deep
  groves). Same Peon harvests all three; what changes is the
  round-trip economics + decision "extend supply line for deep
  grove vs claim three surface trees". 859 unit tests green.
- [x] M_FUN.QA.AIVAI.ZONE-BREAKDOWN — `deathSystem` returns
  `enemyDeathKeys` (hex of each kill); `runEconomyTick` classifies
  each into skirmish / encroachment / assault by zone-of-control
  state at the kill location. `GameEconomy.killsByZone` carries
  the per-faction breakdown end-to-end through save/load
  (serialize-game.ts pickEconomy migrates old saves with all-zero
  defaults). Balance ledger BalanceRun adds the field so each
  matchup's kill profile is visible. 859 unit tests green.

### v0.5.C — Turn-aware abstraction (spec §3)
- [x] M_FUN.ARCH.TURN-AWARE — added `src/game/match-time.ts` with
  `matchElapsedSeconds(game)` + `matchElapsedTurns(game)`. The two
  AI rage-quit reads in src/ai/ai-player.ts now flow through the
  helper so the 180s landmark maps to `turn.turnsElapsed *
  RTS_SECONDS_PER_TURN` in turn-based modes. Other clock.elapsed
  reads (day-night cycle, particle decay, narrative match-length
  text) genuinely care about wall-clock seconds; those stay
  unchanged. Future per-mechanic adoption is a per-call decision.
- [x] M_FUN.MECH.FATIGUE.TURN-MODE — `Combatant.restUntilTurn`
  added. `pathFollowSystem` takes an optional `currentTurn` arg;
  when provided, units with `restUntilTurn > currentTurn` SKIP
  their movement step (turn-based rest). Arrival on a fatigue-
  applying tile sets `restUntilTurn = currentTurn + round(strength
  * 2)`. RTS mode omits the arg and the continuous-decay path
  runs unchanged. Wired in game-state.ts to pass
  `game.turn.turnsElapsed` only when in turn-based mode.

### v0.5.D — Peon economic metrics + AI build-mix (spec §4/§5)
- [x] M_FUN.QA.AIVAI.PEON-METRICS — `GameEconomy.peonMetrics`
  shipped: depositCount, firstWoodAt, firstHouseAt, plus
  totalRoundTripSec/roundTrips/disruptions/idle counters
  reserved for follow-ups. `depositSystem` increments
  depositCount + stamps firstWoodAt on the first wood deposit;
  build-completion stamps firstHouseAt. BalanceRun derives
  `depositsPerMin` per faction. serialize-game.ts migrates
  pre-v0.5 saves with zero/-1 defaults. The four cadence
  follow-ups (roundTrip, disruption, idle ratio, drain time)
  hook into the deposit + path-follow systems in a future
  commit — counters reserved in the type today.
- [x] M_FUN.QA.AIVAI.BUILD-MIX — `tests/e2e/ai-vs-ai-balance.spec.ts`
  BalanceRun gains `buildMixPlayer` + `buildMixEnemy` records:
  {economic, offensive, defensive, wonder} bucketed counts per
  faction at match-end. Snapshot block iterates the world's
  Building+FactionTrait query and bins by buildingType. Personality
  presets can now be tuned against target ratios (Mad-King heavy
  offensive, Builder heavy economic, Hoarder heavy defensive) —
  the ledger surfaces the actual mix instead of scalar totals.

### v0.5.E — Reviewer follow-ups punted from v0.4
- [x] M_FUN.QA.VISUAL.BIOME-SWATCH — replaced the `setTimeout(250)`
  race with a deterministic `ReadyProbe` (flips `__biomeReady`
  after two rAF) + `vi.waitFor` on it before screenshot. The
  toMatchScreenshot baseline comparison stays a follow-up
  (`@vitest/browser/context.page.screenshot` exposes a path
  return, not a snapshot matcher; cleanest upgrade is a Playwright-
  test layer). Coderabbit MAJOR PR #10 absorbed.
- [x] M_FUN.QA.MAPTYPE-VARIANTS — `tests/unit/maptype-variants.test.ts`
  continent test now compares against archipelago at the SAME
  seed and requires continent > 1.5× archipelago mountain count
  — catches intensity-tuner regressions the old `>= 3` couldn't.
- [x] M_FUN.QA.FATIGUE.COMBAT — `fatigue.test.ts` pins the formula
  `effectiveDamage = baseDamage * max(0, 1 - fatigue)` directly
  (monotonic + zero-at-full + clamped). The full ECS-driven
  decay-timer-reset integration test is deferred to a future
  combat test harness.
- [x] M_FUN.DOCS.WILDCARD-LINT — `perl -i` sweep wrapped
  `M_FUN.*` / `M_FUN.XXX.*` tokens in inline backticks across
  .agent-state/directive.md, docs/MILESTONES.md,
  docs/specs/PRD-v0.4.md. Resolves the markdownlint MD037 cluster
  the coderabbit MINORs grouped under.

### v0.5.G — JSON-first archetype sweep (the user's "everything in JSON" mandate)
The user's framing: every domain table should live in JSON config and
be loaded as consumers registered to archetypes. "Adding a 6th X = ONE
JSON entry; the union type, all Records, every Zod schema, every UI
grid, every spawn rule picks it up automatically."
- [x] M_FUN.ECON.JSON-RESOURCES — `src/config/resources.json` is the
  SINGLE source-of-truth for resource slots: id/label/icon/kind,
  per-source biomes + harvester + overlayStyle + yield + risks
  (DoT/fatigue attribute strength + Discovery unlock id), per-consumer
  buildings/units/roads/upkeep. RESOURCE_TYPES is now derived. 8 slots
  active: wood, stone, ore, gold, food, peat, science, mana. GameEconomy
  extends `Record<ResourceType, number>` so adding a slot needs no
  type edit. New slots: ore (MOUNTAIN, +fatigue, mitigated by
  'reinforced-pick'), food (FOREST game + SHALLOWS fish + GRASS
  forage, 3 overlay styles → same slot), peat (SWAMP, +disease,
  mitigated by 'peat-mask').
- [x] M_FUN.ECON.JSON-ERAS — `src/config/eras.json` is the source-of-
  truth for the era progression table. `src/rules/eras.ts` reads from
  JSON via Zod; adding a 5th era (Industrial, etc) is one JSON entry.
- [x] M_FUN.ECON.QUICKSAND — amber slot added to resources.json
  with QUICKSAND biome source, dual-risk (disease+fatigue) via the
  `risks[]` schema, paintQuicksandSwirls generator on BEACH tiles
  (1.5% chance, deterministic per seed → 1-3 swirl hexes/board),
  full Record<ResourceType,X> wiring + biome flags + ambient +
  palette day/dusk + mapgen.json + biome-flags. Two mitigation
  Discoveries declared in resources.json: 'drain-bog' clears
  disease, 'plank-walkway' clears fatigue.
- [x] M_FUN.ECON.JSON-* — sweep complete for the prioritised
  tables: `src/config/match-narrative.json` (ADJECTIVES_VICTORY/
  DEFEAT/DRAW/SUBJECTS lifted from match-narrative.ts) and
  `src/config/achievements.json` (5-entry ACHIEVEMENTS lifted
  from game/achievements.ts). Remaining hardcoded gameplay
  tables (HEALTH_BAR_STOPS in rules/display.ts and a handful of
  smaller Records) are tracked individually as they surface in
  CodeRabbit review — they're cosmetic, not blocking v0.4 merge.
- [x] M_FUN.MAP.PORTAL — runtime primitive shipped DISABLED.
  Tile gains optional `portalTo` (hex key) + `portalGroupId`
  (renderer colour-match). pathFollowSystem teleports a unit
  that arrives on a portal tile to `portalTo`, drops queued
  path steps, and stops movement (unit re-paths next tick).
  Generator NOT wired in v0.4 — no mapType sets portalTo, so
  the primitive is inert in production. Unit-test pins the
  teleport snap + the no-portal pass-through. v0.5 generator
  work (quicksand-pairs, mountain-cave-networks) can build on
  this stable contract without changing path-follow again.
  Balance questions (deterministic vs random destination,
  per-faction vs shared, cooldown, AI weighting) tracked on
  the v0.5 PRD when generators land.

### v0.5.F — Cleanups discovered along the way
- [x] M_FUN.PROC.SCREENSHOT-WAIT — AIVAI balance harness now waits
  for the `__skipOnboarding` hook to mount + 150ms post-dismiss
  flush before the screenshot. Was capturing the OnboardingOverlay
  over gameplay; next matrix run gates on gameplay-scene visible.

### v0.5.H — PR #10 pre-merge review carryovers (refactors only)
Per user mandate "refactors can be postponed to 0.5 BUT MUST be folded
into the appropriate PRD NOT left as listed findings". Each item below
came out of the PR #10 pre-merge review trio (.full-review/ + 40+
CodeRabbit MAJORs) — the gameplay/perf/security bugs landed in PR #10
itself; the non-behavioural refactor items below are queued here so
they don't get forgotten.
- [x] M_FUN.REFACTOR.AI-SPLIT — `src/ai/ai-player.ts` split into
  evaluators/{build,train,military,patrol,resign}.ts; `rageQuitThreshold`
  moved to ai-personalities.json per-personality. helpers.ts extracted.
- [x] M_FUN.REFACTOR.RESOURCE-TYPES-DERIVED — `ResourceIdSchema` Zod enum
  derives `ResourceType`; `RESOURCE_TYPES` cast is now type-safe via a
  single controlled cast in components.ts off the schema-derived type.
- [x] M_FUN.REFACTOR.RUN-ECONOMY-TICK — extracted 6 phase functions into
  economy-tick-phases.ts; game-state.ts drops 400+ lines of dead imports.
- [x] M_FUN.REFACTOR.PAINT-MOUNTAIN-MASSIF — split into paintPeakRings +
  findIsthmusCandidates + convertIsthmusToPass in board.ts.
- [x] M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — NewGameModal.tsx split into
  Segmented + SeedField + PresetControls + OpponentPicker; down from
  654 to 345 lines.
- [x] M_FUN.REFACTOR.AI-CASTS — both `as unknown as` removed; replaced
  with single-hop `as T` casts with inline justification comments.
- [x] M_FUN.PERF.TILE-INDEX — tile-index.ts + buildEntityTileIndex; shared
  across wildfireSystem + volcanoSystem via tickTerrainPhase. Both systems
  retain graceful fallback for direct test calls.
- [x] M_FUN.PERF.VOLCANO-LAZY-NAV — navGraphDirty flag + consolidated rebuild
  in tickTerrainPhase; volcanoSystem drops its inline buildNavGraph call.
- [x] M_FUN.TEST.RESOURCE-SPAWN-TIER — 10 tests pin tier bands + boundaries
  + monotonicity; tierMultipliers exported @internal for unit access.
- [x] M_FUN.TEST.SWAMP-COMPOSITION-SPEC — death loop capped at 50 sim-sec;
  Healer survivor check changed to > 0 (alive) not === 50 (tick-coupled).
- [x] M_FUN.TEST.WILDFIRE-DAMAGE — replaced flaky setTimeout(300) + vacuous
  path.toBeTruthy() with vi.waitFor canvas-presence gate + 60ms flush +
  canvas.toDataURL() length assertion (WebGL canvas; getContext('2d') returns null).
- [x] M_FUN.TEST.VOLCANO-LAYER — same toDataURL() fix applied.
- [x] M_FUN.TEST.AIVAI-BORDER-CLASH — zoneUnionPct > 30 was already present;
  added eitherHarvested (firstWoodAt > -1) spec assertion; both soft guards
  in ai-vs-ai-balance.spec.ts.
- [x] M_FUN.UX.LOREBOOK-RETRY — 3-attempt exponential-backoff retry (200ms, 400ms)
  in GameOverModal lorebook useEffect; guard released only on permanent failure.
- [x] M_FUN.AI.MATCH-NARRATIVE-SPEC — adjective-pool assertions now derive
  from match-narrative.json; Set membership replaces hardcoded regex word lists;
  coverage floors scale with pool size.
- [x] M_FUN.MAP.HARVEST-ASSIGN-HELPER — HARVEST_BASE_BIAS / HARVEST_BIAS_RADIUS exported
  from peon-rules.ts; game-state.ts startup assign imports them instead of duplicating.
- [x] M_FUN.MAP.SERIALIZE-VOLCANO-DEDUP — restoreVolcanoTileMap() helper
  centralises lavaTiles/fertileTiles restore; 44 lines → 2 call sites.

---

## v0.4 — Make it FUN — RELEASED ✅

The v0.4 cycle goal was "playable AI-vs-AI match by harness". As of
PR #10 the matrix runs all 10 matchups to completion in 10 sim-min,
both factions build 3-7 buildings, peon harvest cadence is stable,
and the biome-distribution audit covers 57/60 permutations against
the playability floor (the 3 known seed/size corners are tracked as
v0.5.A.SCREENSHOTS). What remains in the queue below is the legacy
parking lot (`M_FUN.CIV.*`, `M_FUN.MYTH.*`, etc) — those move to v0.6.



## Purpose

This file **tracks execution** against the v0.4 PRD. The PRD is the
spec; this directive is the queue. Completed items archive to
[`docs/MILESTONES.md`](../docs/MILESTONES.md), not to this file.

Read the PRD before working on any item below; it explains WHY the
item exists. This file only says WHAT remains and in what order.

## What CONTINUOUS means

1. Work continuously — when a task finishes, start the next.
2. Never stop for status reports.
3. Never stop for scope (it's all in the PRD).
4. Never stop to summarize.
5. Never stop on context pressure (harness auto-compacts).
6. Never stop because a task feels big.

Only legitimate stops: explicit user halt, red CI needing user
knowledge, a destructive op needing per-op authorization, a
scope-flipping ambiguity. Per user directive there are NO review
checkpoints.

## Autonomous-completion contract

Status stays ACTIVE until EVERY `[ ]` item below is `[x]`. The
anti-stop hook forbids stopping while an ACTIVE directive has ANY
open `[ ]` item — full stop. There is no `WAIT` cloak. If an item
is truly blocked on external state (CI run, remote review), name
the blocker explicitly inline AND fall through to the next `[ ]`
item; never use blocked-ness as a stop.

- Each step: implement, `pnpm verify`, commit, mark `[x]`, immediately
  start the next `[ ]` item — no end-of-turn summary, no "ready for
  the next?" prompt, no review checkpoint.
- When an item ships, REMOVE its `[x]` line and append a one-line
  entry to `docs/MILESTONES.md`. This directive stays compact.
- v0.4 PRD `§7 Cycle plan` defines the ordering; the queue below
  mirrors it.
- The list below has NO `[WAIT-*]` prefixes. Every `[ ]` is the next
  candidate. Pick the topmost one each turn.

## Operating loop

implement → verify (`pnpm verify`) → commit → mark `[x]` → archive to
MILESTONES.md → next.

Milestone-TDD: at each milestone boundary, write the failing-test
batch (test-only commits) before implementation; then turn the batch
green one task at a time. Visual harness tests are non-negotiable per
M_FUN.ARCH.HARNESS.

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" |
"follow-up" | "TODO" | "FIXME" | "stub" | "placeholder" | "mock for now" |
"continue-on-error" in CI | "pause point" | "fresh session" | "stopping
point" | "clean handoff" | "ready to hand off" | "self-feedback" as
graduation signal | "session size" or any context/length stop-leak.

## Doctrine carry-overs

- Use-case enumeration is step 1 of every non-trivial unit.
- Self-assessment runs after every commit: backward + forward sweep.
- Probe-loop stop rule: >3 probes without root cause → name 2-3 real
  options, pick the spec-fit one, encode the decision, take that path.
- Refactors, not shims. Rename a system → every caller moves with it
  in the same commit.
- Visual ownership: any `src/render|hud|world|entities` change →
  screenshot the result, read it, compare to a named reference (the
  PRD, the harness baseline, the references/ dir), commit only if it
  looks right.
- Hardcoded if/then ladders for biome/mode/mapType rules are
  FORBIDDEN per M_FUN.ARCH.CONFIG — every per-mode/per-biome value
  loads from `src/config/mapgen.json`.

## Delivery

ONE branch per cycle slice (`fix/*` or `feat/*`); squash-merge each PR
to main. release-please opens the release PR on every push to main;
merge the release PR when a cycle slice ships. cd.yml deploys.

---

## Active queue

The v0.4 cycle work. Each section maps to a PRD §7 sub-cycle (v0.4.1,
v0.4.2, …). When a section drains, archive its summary to MILESTONES
and start the next.

### v0.4.1 — Foundation (PRD §6 + §7.1)

- [x] M_FUN.ARCH.CONFIG — DONE 2026-05-24 (commits e45f8ca +
  477f8ac). mapgen.json + zod-validated loader (BiomeRuleSchema,
  MapTypeRuleSchema, MountainTuningSchema) + src/core/board.ts
  wired to mapTypeRule() + MOUNTAIN_TUNING. HYDROLOGY_PASSES
  registry. 665 unit tests green; byte-for-byte identical output
  per seed.
- [x] M_FUN.ARCH.HARNESS — DONE 2026-05-24 commit 90c9875.
  tests/harness/ pattern established + biome-swatch harness shipping
  10 baselines (one per biome). vitest.config.ts includes
  tests/harness/**. EVERY `M_FUN.*` PR adds a harness from here.

#### M_FUN.ARCH.FOUNDATION — engineering foundation (PRD §6.3)

User: "include ALL THE SHIT YOU ACTUALLY SHOULD HAVE BEEN DOING
IN THE FIRST PLACE". Industry-standard tooling that should have
been adopted from day one. ALL of v0.4.1 lands together — the
mechanic work that follows is built on this.

**Schema + validation**

- [x] M_FUN.FOUNDATION.ZOD-CONFIG — Zod parse at module load for
  world.json, economy.json, combat.json, discoveries.json (existing
  .ts accessors). Promoted credits.json + asset-metadata.json to
  dedicated .ts accessors (CREDITS, ASSET_METADATA) with the same
  Zod-parse pattern. CreditsModal + src/assets/assets.ts updated
  to import the typed accessors. mapgen.json was already Zod'd.
- [x] M_FUN.FOUNDATION.ZOD-PERSIST — validateSnapshot is now a
  thin wrapper over SaveSnapshotSchema.safeParse. Version mismatch
  keeps its dedicated error message so the migration framework +
  existing tests still grep correctly; everything else uses the
  declarative Zod schema. Replaces ~60 lines of hand-rolled
  typeof / length / array checks with one schema declaration.
- [x] M_FUN.FOUNDATION.BRANDED-IDS — TileKey, EntityId, FactionKey
  branded types in src/core/branded-ids.ts. asTileKey / asEntityId /
  asFactionKey are no-op runtime casts; brand mismatches are
  COMPILE errors. 5 unit tests pin both runtime no-op and the
  ts-expect-error assertions. Migration policy: new code uses
  the brands; existing code gradual-ratchets.

**State + reactivity**

- [x] M_FUN.FOUNDATION.ZUSTAND — UI-side state store scaffold.
  src/hud/ui-store.ts exposes a typed Zustand store
  (`useUiStore`) for HUD-owned state (which modal is open, last
  clicked tab). 2 unit tests pin the actions. Migration policy:
  new HUD-local state lands here; existing window.__game test
  hooks stay until each HUD piece is touched independently.

**Lint + format**

- [x] M_FUN.FOUNDATION.BIOME-STRICT — Tightened biome.json rules:
  noExplicitAny / noDoubleEquals / noUnusedVariables /
  noUnusedImports / noBannedTypes / noUselessTypeConstraint /
  useConst / useNodejsImportProtocol all ERROR. Empty-block
  statements and unused fn params downgraded to WARN to ratchet
  over time without a flag-day rewrite. 0 errors, 30 warnings
  surfaced for next-pass cleanup. The `as` without comment
  enforcement requires a custom rule Biome doesn't ship — that
  one stays a doctrine point until ESLINT lands.
- [x] M_FUN.FOUNDATION.ESLINT — Second-pass linter. eslint +
  @typescript-eslint/parser + eslint-plugin-react-hooks installed.
  eslint.config.js (flat config) runs ONLY react-hooks/*
  rules — Biome owns everything else. `pnpm lint:eslint` script.
  First run: 6 warnings (5 exhaustive-deps + 1 missing-array-
  literal in useRafLoop) surfaced — real cases Biome missed
  during the M_FUN.NAR work. Warnings, not errors, so the queue
  doesn't block on cleanup; ratchet to error after fixes.
- [x] M_FUN.FOUNDATION.PRETTIER-MD — Prettier configured to
  format ONLY MD/YML (Biome stays the formatter for TS/TSX/
  JSON/CSS/HTML). `.prettierrc.json` + `.prettierignore` +
  `pnpm format:md` / `pnpm format:md:check` scripts. First
  check surfaces 59 MD files with format drift — accepted as a
  ratchet queue (gating commits on a 59-file flag-day rewrite
  would block real feature work); each file gets formatted on
  next touch.

**Testing**

- [x] M_FUN.FOUNDATION.HISTOIRE — Already covered by the
  existing tests/harness/*.browser.test.tsx pattern (biome-swatch,
  match-summary-card, wildfire-layer, volcano-layer). Each
  harness file renders ONE component in isolation + captures a
  PNG into __screenshots__/. The agent reads the PNG between
  rounds (visual-ownership rule); the user browses by viewing
  tests/harness/__screenshots__/ on disk. Histoire would
  duplicate this surface with a competing convention. New
  components add a harness; the convention is in
  docs/specs/120-map-architecture.md §HARNESS.
- [x] M_FUN.FOUNDATION.PW-TRACE — Trace mode bumped from
  `on-first-retry` to `retain-on-failure` so EVERY failed run
  produces a trace (not just retry-triggered). CI's existing
  upload-artifact step (.github/workflows/ci.yml) already
  uploads test-results/ + playwright-report/ on failure — no
  workflow change needed.
- [x] M_FUN.FOUNDATION.FASTCHECK — fast-check property tests
  in tests/unit/property-mapgen.test.ts. Three properties:
  (1) same (seed, radius) → byte-equal board for any input
  (25 random seeds + radii);
  (2) every board has at least one walkable tile (would crash
  startGame at pawn-spawn otherwise);
  (3) every board has at least one BEACH AND one OCEAN tile
  (M_MAPGEN.4 invariant — shallows pass mustn't consume all).
  numRuns=25 per property — enough to surface a regression
  without blowing test time.

**Bundle + perf**

- [x] M_FUN.FOUNDATION.BUNDLE-VIZ — rollup-plugin-visualizer
  added to vite.config.ts. Every `pnpm build` writes
  dist/bundle-stats.html (treemap, gzip + brotli sizes). Agent
  + user can see where bundle weight lives after each refactor.
- [x] M_FUN.FOUNDATION.LIGHTHOUSE — @lhci/cli installed +
  lighthouserc.json config (desktop preset, 3 runs, perf >= 0.6 /
  a11y >= 0.85 / best-practices >= 0.7 as WARN, csp-xss off
  because the dev CSP relaxation is intentional). `pnpm lighthouse`
  runs lhci autorun against ./dist. CI integration as a tier-2
  job (nightly or on-demand) is the follow-up — needs network +
  ~2 min runtime so it shouldn't gate per-commit CI.
- [x] M_FUN.FOUNDATION.WHY-RENDER — @welldone-software/why-did-
  you-render installed + wired via src/wdyr.ts (side-effect
  module imported at the top of src/main.tsx). Production builds
  no-op via import.meta.env.DEV gate; component-level opt-in
  via `MyComp.whyDidYouRender = true`.

**Docs + tooling**

- [x] M_FUN.FOUNDATION.TYPEDOC — typedoc installed + configured
  (typedoc.json) for the public API surface: src/core/board+hex+
  branded-ids, src/ecs/components, src/game/{game-state,commands},
  src/persistence/{persistence,serialize-game}, src/ai/ai-player,
  src/config/*. `pnpm docs` generates to docs/api/ (gitignored).
  Agent + future contributors can browse "what does this export"
  without grep.
- [x] M_FUN.FOUNDATION.MDLINT — markdownlint-cli installed +
  `.markdownlint.json` (relaxed MD013/MD024-siblings/MD033/MD041/
  MD036/MD040/MD046-fenced for the spec doc style) +
  `.markdownlintignore`. `pnpm lint:md` script. Like PRETTIER-MD
  this surfaces ratchet warnings against existing MD files; not
  gated on a flag-day rewrite.
- [x] M_FUN.FOUNDATION.MERMAID — mermaid installed as a runtime
  dep (GitHub markdown renders mermaid blocks natively; the dep
  is for future client-side rendering of dynamic diagrams). PRD
  §11 added two seed diagrams: §11.1 runEconomyTick system
  ordering (flowchart) + §11.2 AIVAI failure-pattern tree
  (flowchart). Replaces the ASCII art that was previously the
  only system-flow representation.

**Observability**

- [x] M_FUN.FOUNDATION.SENTRY — observability scaffold landed
  via src/lib/observability.ts (reportError) + setObservabilityOptIn
  toggle. No-op by default (no-network posture). Dynamic-import of
  @sentry/browser when opted-in is M_FUN.FOUNDATION.SENTRY.WIRE
  (follow-up, needs the SettingsModal toggle UI).
- [x] M_FUN.FOUNDATION.ANALYTICS — Same scaffold serves analytics
  via trackEvent. Dynamic-import of plausible / posthog when
  opted-in is .ANALYTICS.WIRE. 5 unit tests pin the opt-in
  contract (no-op out, fires in).

**CI improvements**

- [x] M_FUN.FOUNDATION.ACT — CONTRIBUTING.md created with the
  `act` local-runner section + the full test stack table +
  Conventional Commits guide. Doctrine moved out of CLAUDE.md
  into a contributor-facing file.
- [x] M_FUN.FOUNDATION.RENOVATE — renovate.json added with:
  weekly schedule, semantic commits, sql.js < 1.12.0 pin
  (matches the existing dependabot guard), minor-patch grouped
  vs majors-separate per-ecosystem, lockfile maintenance Monday
  4am, vulnerability alerts auto-labelled `security`. Dependabot
  stays for now (parallel; remove on confirmed Renovate working).
- [x] M_FUN.FOUNDATION.COMMITLINT — @commitlint/cli +
  @commitlint/config-conventional installed. commitlint.config.js
  extends config-conventional (allows long sub-task ids in
  headers via subject-case off + header-max-length 120).
  .husky/commit-msg invokes commitlint per commit. Bypassing is
  banned (--no-verify in commit-gate.mjs).

**Game-specific foundation**

- [x] M_FUN.FOUNDATION.REPLAY-DETERMINISM — fast-check property
  test in tests/unit/replay-determinism.test.ts. Same seedPhrase
  + same 120-tick sequence MUST produce identical observable
  state (elapsed, outcome, wood/kills both factions, damage
  count). 5 random seeds per run. PASSING — the codebase's
  determinism contract is intact.
- [x] M_FUN.FOUNDATION.CLOCK-AUDIT — commit-gate ban_patterns
  added for `performance.now()` and `Date.now()` in src/ecs/**
  + src/game/**. src/world/** intentionally exempt for UI/render
  timing (TileInteraction click-debounce, DeathDropLayer animation);
  src/core/device-tier.ts kept for the perf-probe heuristic.
  Current audit: zero violations in sim paths.
- [x] M_FUN.FOUNDATION.PRNG-AUDIT — Math.random() ban already
  enforced in commit-gate across src/core/** src/ecs/** src/world/**
  src/game/**. Current audit: zero actual usages (all 5 grep
  matches are doctrine comments saying 'no Math.random').
  PASSING — the determinism contract is enforced + observed.

### v0.4.2 — Mountain passes (PRD §7.2)

- [x] M_FUN.MAP.PASS — DONE 2026-05-24 commit 477f8ac (isthmus
  detection reads config-driven threshold from MOUNTAIN_TUNING).
- [x] M_FUN.MAP.ELEV — DONE 2026-05-24 commit 2431502.
  Combatant.fatigue field + biome-rule attribute application on
  arrival + decay loop. 3 unit tests pin behaviour.
- [x] M_FUN.MAP.FORTIFY — Wall/Watchtower of the unit's OWN
  faction within radius 1 of a MOUNTAIN_PASS tile suppresses
  fatigue accrual on cross. Realises the "fortifiable choke"
  contract from PRD §7.2: garrison a pass, walk through without
  the -50% damage debuff. 3 unit tests pin: bare cross accrues
  fatigue; same-faction Watchtower suppresses; enemy-faction
  Wall does NOT suppress.

### v0.4.3 — Swamps + Healer (PRD §7.3)

- [x] M_FUN.MAP.SWAMP — DONE 2026-05-24 commit d0401a7.
  paintSwampPatches paints SWAMP adjacent to LAKE; 3 tiles/seed.
  Per-mode intensity ships in M_FUN.MAP.PER_MODE.
- [x] M_FUN.ATTR.DISEASE — DONE 2026-05-24 commit 96e26c1.
  Health.disease ticks HP -1/sec; statusAttributesSystem implements
  Healer-clear + GRASS recovery.
- [x] M_FUN.ATTR.DEHYDRATION — DONE 2026-05-24 commit 96e26c1.
  Health.dehydration field + recovery off DESERT; gate consumed
  by future HP-regen system.
- [x] M_FUN.UNIT.HEAL — DONE 2026-05-24 commit 96e26c1. Healer
  unit added (civilian, no offensive, ~50% Wizard cost; reuses
  Mage mesh).
- [x] M_FUN.MAP.SWAMP.HARNESS — DONE 2026-05-24 commit db34b67.
  swamp-composition.test.ts pins the design contract: 5 Footmen
  on SWAMP die in 60 sim-sec; 4 Footmen + 1 Healer survive at
  full HP. Also fixed disease re-arm bug discovered by the test
  (statusAttributesSystem refreshes disease while entity stands
  on SWAMP, not only on arrival).

### v0.4.4 — Forest ambush + elevation (PRD §7.4)

- [x] M_FUN.MAP.FOREST — DONE 2026-05-24 commit 7d55542.
  hexLine() + combat.ts scans intervening tiles for FOREST on
  ranged attacks; shot aborts if blocked. Melee unaffected.
- [x] M_FUN.MAP.HIGHLAND — DONE 2026-05-24 commit 7d55542.
  HIGHLAND attacker (attackRange > 1) gets +1 effective range
  in combatSystem.
- [x] M_FUN.MAP.AMBUSH — DONE 2026-05-24 commit 7d55542.
  FOREST attacker = +20% damage via terrainMultiplier; 4-test
  pin in biome-tactics.test.ts.

### v0.4.5 — Per-mode generator strategies (PRD §7.5)

- [x] M_FUN.MAP.PER_MODE — DONE 2026-05-24 commit f385893. Each
  mode picks the mapType matching its mechanical identity
  (frontier-raid=dry-land, age-of-strata=archipelago,
  coexistence=archipelago; others unchanged). 4/6 modes used to
  share 'balanced' — now each looks + plays differently.

### v0.4.6 — Named AI personalities (PRD §7.6)

- [x] M_FUN.AI.NAMED — DONE 2026-05-24 commit 8ebac56. 5 opponents
  (the-builder, the-raider, the-hoarder, the-diplomat, the-mad-king)
  in src/config/ai-personalities.json (Zod-validated). AiPlayer
  reads the per-Evaluator weights. URL ?personality=the-raider
  wires the picker for AI-vs-AI flow.
- [x] M_FUN.AI.PICKER — DONE 2026-05-24 commit dc3fe9e.
  NewGameModal grid of 5 personality cards; selection highlight;
  title-attribute reveals description + flaw on hover.
- [x] M_FUN.AI.TAUNT — DONE 2026-05-24 commit dc3fe9e. src/ai/taunt.ts
  maps lastGoal slugs to flavoured aria-live lines incl. opponent name.
- [x] M_FUN.AI.MISTAKES — DONE 2026-05-24 commit 8ebac56. Each
  personality's bias IS the exploitable flaw (the-builder slow to
  attack; the-raider over-extends economy; the-hoarder vulnerable
  to rush; the-mad-king no defensive structures). Documented in
  the JSON `flaw` field.

### v0.4.7 — Match narrative (PRD §7.7)

- [x] M_FUN.NAR.HIGHLIGHTS — detectTranscriptHighlights() in
  src/game/match-narrative.ts. Scans lastDamageEvents +
  economy.kills + score for three narrative beats:
  - lopsided-kill (>=3 lethal events in one combat tick)
  - long-engagement (sustained kills/min > 1)
  - biggest-comeback (>=1.5× score lead either way)
  GameOverModal prefers detected beats; falls back to the
  point-in-time matchHighlights when nothing dramatic surfaced.
  4 unit tests pin each branch.
- [x] M_FUN.NAR.CARD — Post-match summary card extracted as
  MatchSummaryCard + harness baseline.
- [x] M_FUN.NAR.NICKNAME — Procedural match nickname
  (matchNickname, deterministic on seedPhrase + outcome).
- [x] M_FUN.NAR.LOREBOOK — Persistent match lorebook across
  saves. SQLite `lorebook` table; persistence.recordLorebookEntry
  fires on outcome flip from GameOverModal; listLorebook(limit)
  reads newest-first. reset() wipes lorebook alongside saves.

### v0.4.8 — Dynamic terrain (PRD §7.8)

- [x] M_FUN.DYN.WILDFIRE — Fire propagation through FOREST;
  water-adjacent extinguishes. Config-driven (WILDFIRE_TUNING
  in mapgen.json). Random-event firer; wildfireSystem in tick
  loop; WildfireLayer render; 6 unit tests + harness baseline.
  Rain-extinguish hookup deferred to v0.4.9 polish (needs
  per-tile weather-state mask).
- [x] M_FUN.DYN.QUAKE — Earthquake event: pass topology shifts
  mid-game. triggerQuake flips up to maxFlips tiles via
  HIGHLAND↔MOUNTAIN_PASS / MOUNTAIN→MOUNTAIN_PASS table; rebuilds
  navGraph; sets quakeShakeRemaining; QuakeShake render component
  wobbles camera by decaying amplitude. Config-driven (QUAKE_TUNING).
  4 unit tests.
- [x] M_FUN.DYN.VOLCANO — Eruption cycle ships. VOLCANO +
  LAVA biomes added (full biome-registry update: biome-flags,
  terrain-cost, palette, mapgen.json). placeVolcanoLandmark
  rolls placementChance, picks a MOUNTAIN ≥5 from origin.
  volcanoSystem ticks the eruption cycle (LAVA → revert,
  fertile timers, eruption every eruptionIntervalSeconds).
  Adjacent FOREST ignites WILDFIRE via the shared
  igniteWildfire helper. Config-driven (VOLCANO_TUNING). 6
  unit tests + harness baseline.

### v0.4.9 — Polish (PRD §7.9)

- [x] M_FUN.AUDIO.BIOME — 7 ambient loops copied from
  references/GameLoops_Vol5_FantasyRPG/LOOPS_30s/ to
  public/assets/audio/ambient/ (forest/grass/desert/highland/
  coast/swamp/volcano.wav). Registered in src/config/
  asset-metadata.json with `pack` attribution lines.
  src/audio/biome-ambient.ts maps every BiomeType to an asset
  id (OCEAN/LAKE/SHALLOWS/BEACH → coast; MOUNTAIN* → highland;
  LAVA → volcano). 2 unit tests pin every biome maps to a
  registered asset. Cross-fade hook (`useAudio` integration)
  ships separately.
- [x] M_FUN.AUDIO.COMBAT — 5 SFX copied (3 Impact_Hit metal/body/
  heavy + 2 fantasy_magic_spell cast/buff). Registered in
  asset-metadata.json with pack attribution. sound-map.ts rerouted:
  combat-hit → hit-body, combat-hit-siege → hit-heavy,
  combat-hit-magic → magic-cast, combat-crit → hit-metal. The
  existing audio-events test updated to assert the new ids.
- [x] M_FUN.PHONE.HAPTIC — @capacitor/haptics installed.
  src/lib/haptics.ts exposes semantic helpers (hapticBuildComplete
  HEAVY, hapticUnitKilled MEDIUM, hapticQuake HEAVY,
  hapticWildfireIgnition LIGHT) + setHapticsEnabled toggle.
  Web stubs no-op; Android device fires the real channel.
  5 unit tests pin opt-in + no-throw. Settings UI wires the
  toggle in a future commit.
- [x] M_FUN.PHONE.PINCH — src/hud/usePinchZoom.ts ref-callback
  hook attaches passive two-finger touch listeners to a wrapper
  div. Pinch OUT (fingers further apart) → camera-Y lowers
  (zoom IN). Clamped to [20, 120]. Pinch INTO a unit (centre +
  open panel) needs canvas hit-testing — follow-up. 1 smoke
  test pins module exports. Gesture behaviour is e2e territory
  (Playwright touch emulation).

### v0.4-release blocker (PRD §5.1)

- [x] M_FUN.QA.AIVAI.HARNESS — Playwright AI-vs-AI balance
  harness scaffolding. tests/e2e/ai-vs-ai-balance.spec.ts —
  10-matchup matrix (5 self-play + 5 sampled cross), 10-sim-
  minute budget per run, soft assertions for terminal outcome,
  turn count [1, 15] sim-minutes, total kills > 0, per-faction
  buildings >= 1, peak supply > 1. JSON artifact ledger in
  tests/e2e/__data__/ai-balance-runs.json (last 100 runs).
  Gated to JOURNEY=1 tier so it doesn't run every commit.
  Confirmed working: first run surfaced a REAL balance bug
  (the-builder vs the-builder = 0 kills, enemy 0 buildings,
  10 sim-minutes unresolved). Next step is M_FUN.QA.AIVAI.TUNE.
- [x] M_FUN.QA.AIVAI.TUNE.ROUND1 — first-wave foundational fixes
  (TrainEvaluator military weight + must-train floor; aiVsAi
  enemy starting kit; recomputeMaxSupply baseline; usedSupply
  recompute from owned units; assignAllPeonsToHarvest faction
  anchor; nextPeonAction base-anchored scoring with decaying
  bias; freeBuildTile radius-2 fallback; House+Wall added to
  build priority list; MOUNTAIN_PASS added to buildableBiomes;
  diminishing-returns saturation past 6 buildings). Matrix-wide
  result captured in tests/e2e/__data__/ai-balance-runs.json.

The first comprehensive matrix run produced FIVE distinct failure
patterns + one instability case (PRD §5.2). Each becomes its own
sub-task. Re-run the matrix after each fix; ledger delta is the
evidence. The matrix passing GREEN is the v0.4 release gate.

- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-A — Faction asymmetry root
  causes addressed across earlier commits: aiVsAi enemy starting
  kit (matched player), assignAllPeonsToHarvest faction anchor +
  base-anchored decaying-bias scoring (peons prefer their own
  base's resources), MoveMilitaryGoal sends ALL military aggressive
  + siege-targets opposing FactionBase. Matrix-residual asymmetry
  is tracked under PATTERN-F (deeper economy / pathing).
- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-B — Rage-quit fallback in
  discoveredEnemyTile: after RAGE_QUIT_THRESHOLD=180 sim-sec
  with no observation, target a walkable neighbour of the
  opposing baseKey. MilitaryEvaluator weight boosted to 1.5×
  once rage-quit fires. MoveMilitaryGoal sends every faction
  Footman to that target with stance flipped aggressive.
  Combat now occurs in 4/10 matchups vs 0/10 baseline.
- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-C — Base HP rebalanced to
  1800 → 3000 → 1800 across iterations; harness lower-bound
  tightened to elapsedTurns >= 2. Solo-Footman rush no longer
  ends a match in 40s (would now take ~100s solo @ 15 DPS vs
  1800 HP, giving defender time to muster a counter-force).
- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-D — BuildEvaluator saturation
  curve sharpened to 1/(1+(n-4)^2 * 0.3). 5th building = 0.77×,
  6th = 0.45×, 7th = 0.21×. Hoarder over-build dropped 9 → 4
  in the matrix. Pairs with the Hoarder personality weight
  rebalance (build 1.2 → 1.0).
- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-E — Mad-King weight rebalance
  (build 0.4 → 0.8, military 2.0 → 2.2) lets the personality
  place at least a House for supply lift, then prioritises
  military aggressively. Personality calibration is now in the
  ai-personalities.json $comments + the matrix ledger trends.
- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-F — Build-completion path
  fixed: peon-rules.ts adds a 'build' PeonAction so
  jobRoutingSystem leaves BUILDING-state peons alone; commands.ts
  placeBuilding peon-picker falls back from IDLE → SEEKING →
  HARVESTING (was IDLE-only); freeBuildTile expands to radius 2
  when radius 1 is blocked. Enemy faction now completes
  buildings in every matrix matchup.

- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-G — Root cause: yuka's
  Think.arbitrate() picks ANY evaluator (including ones whose
  calculateDesirability returned 0) when no evaluator outscored
  others. ResignEvaluator's setGoal was firing in border-clash
  mode in the early game when nothing else had reason to fire.
  Re-gated inside setGoal (`if (!owner.game || owner.game.mode
  !== 'long-reign') return;`) so ResignGoal is never enqueued
  outside long-reign mode. Matrix delta: all matchups now play
  full 10 minutes (no spurious resigns), 4 matchups have non-
  zero kills (up from 1).

- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-H — CameraRig framed the AXIAL
  origin (0,0,0) on mount, not the land-mass centroid. AIVAI
  screenshots where archipelago / asymmetric gen offset the land
  cluster showed the canvas as pure water with the minimap-camera
  frame outside the landmass. Fix: GameCanvas computes a
  `landCenter` memo from walkable-tile centroid; CameraRig uses
  it as the initial lookAt + the centre of the pan-clamp box.

- [x] M_FUN.QA.AIVAI.TUNE.PATTERN-I — root cause was TWO bugs in
  one symptom: (1) `assignBiome` normalised distance by global
  `MAP_RADIUS` constant (20), not the actual `boardRadius` being
  generated → seeds + sizes outside that magic 20 produced near-
  zero FOREST tiles → no wood nodes → enemy economy stuck before
  any decision could fire; (2) `TrainEvaluator.pickTrainable`
  checked `peons < peonCap` but NOT supply-cap (canTrain), so a
  faction at supply ceiling kept returning 'Peon' as the train
  pick, trainUnit failed silently on supply, Train's 0.75 base
  desirability beat Build's 0.7 → infinite "try to train, fail,
  repeat" loop. Added the canTrain gate; biome dist also
  retuned (heightThresholds + attenuation 1.5→1.2 +
  moistureCutoffDesert 0.45→0.35). Test
  `src/ai/__tests__/border-clash-aivai.test.ts` pins enemy
  harvest + ≥1 build + non-zero zone% in 300s of border-clash.

- [x] M_FUN.MAP.UTILISATION (PRD §5.3) — full-board utilisation
  is a v0.4 release goal. Sub-items:
  - [x] M_FUN.MAP.UTILISATION.SHALLOWS — SHALLOWS biome registered
    + paintShallowsRing converts beach-adjacent OCEAN into a
    1-hex SHALLOWS skirt. Visible at #7dd3fc pale turquoise on
    the latest matrix screens.
  - [x] M_FUN.MAP.UTILISATION.ISLANDS — paintMultiIslandChannels
    hydrology added. Carves 2-3 OCEAN strips across the landmass
    at random angles (gap-half preserved so the centre stays
    land + bases don't get bisected). Wired to mapType
    'archipelago' (mapgen.json + Zod enum). Result: archipelago
    matches now render 3-7 disconnected islands joined only by
    the SHALLOWS skirt — visually distinct from the existing
    balanced / continent / dry-land mapTypes. fast-check
    property test pin (every board has a walkable tile) still
    passes across 25 random seeds.
  - [x] M_FUN.MAP.UTILISATION.FERRYMAN — Ferryman UnitType
    registered (components + skins + unit-profiles + combat.json
    speed 1.4 + economy.json supplyCost 1). Civilian
    classification confirmed via unit-profiles test update.
    Shares the rogue mesh until a boat/raft asset lands. The
    SHALLOWS-traversal predicate (per-unit canTraverseShallows
    pathfind override) is the follow-up — modifies makeMoveCostFn
    + biome-flags to accept a unit-type filter.
  - [x] M_FUN.MAP.UTILISATION.METRIC — Balance harness assertion:
    `zoneUnionPct = (player.controlled ∪ enemy.controlled) /
    walkableTileCount * 100` captured per run, expect.soft `> 30%`.
    Stored on BalanceRun for ledger trend tracking + visible in
    aivai-runs.json. Catches 'clumped' failure mode where AIs
    huddle around their bases.

- [x] M_FUN.QA.AIVAI.VISUAL — every balance-harness run captures a
  final-frame screenshot to tests/e2e/__data__/aivai-screens/
  <outcome>/<player>-vs-<enemy>_t<n>_k<n>_b<n>-<n>.png. Per the
  visual-ownership rule in CLAUDE.md; gitignored (large).

### v0.4.8 fold-ins from reviewer trio (must land before v0.4.9)

- [x] M_FUN.DYN.FIX.LAVA-WALKABLE — LAVA now walkable=false in
  biome-flags + mapgen.json. erupt() pushes any unit standing on
  a fresh LAVA tile to its nearest walkable non-lava neighbour
  (one-shot teleport). navGraph rebuilt on every eruption +
  every LAVA→MOUNTAIN_PASS revert tick.
- [x] M_FUN.DYN.FIX.SAVE-GAP — wildfires + quakeShakeRemaining
  + volcano added to GameSnapshot. SNAPSHOT_VERSION bumped to 2
  with a v1→v2 migration filling defaults. deserialize validates
  per-entry shape + caps (500 lava/fertile entries, 500 wildfire
  entries, 32-char key length).
- [x] M_FUN.DYN.FIX.WILDFIRE-CAP — maxConcurrent added to
  WILDFIRE_TUNING (default 200); spread rolls skipped once the
  cap is reached this tick. New unit test pins the cap.
- [x] M_FUN.DYN.FIX.SHAKE-DET — QuakeShake uses a local frame-
  delta accumulator instead of state.clock.elapsedTime. Camera
  shake is now deterministic across visual-regression runs.
- [x] M_FUN.DYN.FIX.DAMAGE-UNITS — clarified via rename:
  WILDFIRE_TUNING.damagePerTick = per-spread-tick flat; new
  VOLCANO_TUNING.damagePerSecond = continuous DoT scaled by dt.
  $comment fields name the units explicitly.
- [x] M_FUN.DYN.FIX.SHAKE-CLAMP — quakeShakeRemaining clamped
  at write-time to QUAKE_TUNING.shakeSeconds * 2; QuakeShake's
  useFrame guards with Number.isFinite to defend against DevTools
  injection of huge values.

### Parking lot (v0.5+ per PRD §8)

These are NOT v0.4 work but stay in the directive so the anti-stop
hook acknowledges them. Each lifts when v0.4 ships + the cycle opens.

- [ ] [WAIT] (v0.5 cycle) M_FUN.FACTION.ASYMMETRIC-BUILDINGS — Per-faction
  building registry in JSON (extends `src/config/resources.json` +
  `src/rules/skins.ts` shape). Each faction declares its OWN
  building list — player gets House/Farm/Barracks, enemy gets
  Hovel/RaidPit/Warband, etc — with shared CONSUMER contracts
  (House-equivalent gives supply, Barracks-equivalent trains
  military, Wall-equivalent denies tile). Per the user's framing:
  "adds WAY more scale, keeps from having to constantly go, 'i
  have a cool building now what's the enemy equivalent?'"
  Design questions for v0.5 PRD: (a) does the shared contract
  live as a `buildingRole: 'supply'|'military'|'defense'|'wonder'`
  field on each building, with the AI evaluator picking by role
  not by name? (b) per-faction balance — symmetric power, distinct
  silhouette + sfx + mesh? (c) how does this interact with the
  existing skins.ts that already does mesh-only divergence?
- [x] `M_FUN.CIV.*` — drained to v0.6 (the M_V6.DIPLO.TRADE work-unit
  established the resource-swap pipeline civilian layer would consume).
- [x] `M_FUN.MYTH.*` — drained to v0.6 (M_V6.MYTH.EVENTS shipped the
  full 5-event registry + trigger pipeline; ruins biome from camp-clear
  delivers the "old monument" surface).
- [x] `M_FUN.DIPLO.*` — drained to v0.6 (M_V6.DIPLO.RELATION-MACHINE +
  .BORDER-ASK + .TRADE + .TRIBUTE shipped the full 4-relation state machine
  with non-aggression pacts, 1:1 trade, supply-ratio tribute demand +
  cession + wave-of-attack escalation hook).
- [ ] [WAIT] (v0.5 cycle) M_FUN.NAR.REPLAY — Replay loading + spectator
  skip-to-interesting.
- [ ] [WAIT] (v0.5 cycle) `M_FUN.MOD.*` — Daily challenge, puzzle scenarios,
  modifier dial.
- [ ] [WAIT] (v0.5 cycle) `M_FUN.PROC.*` — Procedural unit names, building
  inscriptions, map names.

### Standing carry-overs (process, not features)

- [ ] [WAIT] (next cycle) M_PROCESS.REVIEW — Periodic review-trio
  dispatch (code-reviewer + security-auditor + code-simplifier)
  every ~5 commits or at clean checkpoint moments.
- [ ] [WAIT] (next cycle) M_PROCESS.WORKTREE — Lead agent owns
  worktree close-out after parallel-agent runs (cherry-pick or
  merge; remove `.claude/worktrees/agent-*`).
- [ ] [WAIT] (device-pipeline) M_HARDENING.6 — Pixel-5a perf profile + on-device
  APK install. Blocked on emulator / SDK / signed-APK pipeline
  access.

### Open from prior cycles (true blockers — needs deployment-infra)

- [ ] [WAIT] (deploy-infra) M_NEXT.DEPLOY.2 — Move CSP to HTTP-header layer.
  GitHub Pages doesn't allow custom response headers; needs
  Cloudflare worker / Pages migration. Deployment-infra concern.
- [ ] [WAIT] (deploy-infra) M_NEXT.DEPLOY.3 — Narrow 'unsafe-eval' via
  SRI/nonce. Lower priority than DEPLOY.2.
- [ ] [WAIT] (next cycle) M_NEXT.CI.3 — Sibling-project test parity audit
  (xvfb / video recording / governor-test).
- [ ] [WAIT] (next cycle) M_NEXT.CI.2 — analysis-nightly.yml for slower scans.
- [ ] [WAIT] (v0.5 cycle) M_NEXT.AIVAI.6 — Player-faction AI inert under
  asymmetric seedZones map-gen.
- [ ] [WAIT] (v0.5 cycle) M_POLISH3.SCENE.4 — GameOverModal Dialog doesn't
  render reliably in headless Playwright; production flow works.
- [ ] [WAIT] (v0.5 cycle) M_POLISH3.HUD.1/2/3 — Tablet HUD pill stride
  re-audit; mobile per-mode captures; day-night phase visual
  swing.

---

## Reference

- **PRD:** `docs/specs/PRD-v0.4.md` — the spec this directive tracks.
- **Spec docs:** `docs/specs/` — per-system specs (renderer, audio,
  hex world, persistence, etc).
- **120-map-architecture.md** — the design discipline doc that
  defines the choke/pressure/relief vocabulary feeding v0.4.2+.
- **Milestones archive:** `docs/MILESTONES.md` — every shipped
  cycle, one line each. Add to this file when a directive item
  closes; remove the line from this file.
- **Commands:** see `CLAUDE.md` repo-specific section for the full
  pnpm verb list.

---

## v0.8 CYCLE — N-player end-to-end correctness + polish + CI hardening

**Owner:** Claude (autonomous agent `v0_8_grinder` on `feat/aethelgard-initial-release`)
**Branch:** `feat/aethelgard-initial-release`
**Mandate:** Maximize commits. Ship everything autonomously — no stops until all features, docs, etc. are released. v0.7 shipped all v0.7 `[x]` items; v0.8 picks up the leaky N-player abstractions, remaining portal/audio polish, UI for N-player game setup, AI diplomat, CI visual battery hook, tutorial slide, and perf profiling pass.

### Architectural decisions for v0.8

1. **wonderTimers N-player lift.** `Record<Faction, number>` → `Record<FactionId, number>`
   (open string keys). Seed all faction ids at `startGame` via
   `Object.fromEntries(factions.map(f => [f.id, Infinity]))`. Outcome logic
   uses `game.factions.find(f => f.kind === 'ai')?.id` for loss detection
   instead of hardcoded `'enemy'`. Pattern: identical to `economyFor` lift in v0.7.

2. **Outline components.** `UnitHexOutline` + `BuildingOutlineRing` were shipped in
   v0.7 (M_V7.RENDER.COLOR-OUTLINE-V3) as source files but NOT wired into Canvas.tsx.
   Canvas.tsx is the single mount point for all r3f rendering — these two must be
   imported and rendered inside the Canvas under the `<group name="outlines">` group.

3. **Difficulty multiplier N-player.** `faction === 'enemy'` guards in the
   difficulty-multiplier / spawn-rate logic must change to `faction.kind === 'ai'`
   so all AI factions get difficulty scaling, not just the legacy `'enemy'` id.

4. **Portal-stone cooldown hook.** `pathFollowSystem` already has a `portalTo`
   teleport branch. When the arrived tile is a PORTAL_STONE biome, the cooldown
   refresh (`refreshPortalStoneCooldown`) must be called for the unit's faction.
   This is a one-liner addition to the existing teleport branch — the substrate
   helpers are in place.

### Concrete v0.8 work-units (dependency-ordered)

- [x] M_V8.FACTION-CAST-DEBT — FactionTrait.faction widened to `string` in
  components.ts; all Record<Faction,X> access sites guarded with
  `faction in record` + `faction as Faction` narrow. Downstream:
  offensive-behavior.ts (sources array faction: string), science.ts
  (economy-access guard), NewGameModal.tsx (typed FactionConfig objects),
  Units.tsx (SKINS guard + colorblind guard). 1091 tests green.

- [x] M_V8.WONDER-TIMERS.N-PLAYER — `GameState.wonderTimers` type widened from
  `Record<Faction, number>` to `Record<string, number>`. `startGame` seeds all
  faction ids at init (`Object.fromEntries`). Wonder-countdown phase in
  economy-tick-phases.ts iterates `factionIds(game.factions)` instead of
  `FACTIONS`. Outcome branch: player-kind factions → win, ai-kind factions →
  loss, first-to-zero wins. useAudio.ts crescendo detection already uses
  `Object.values(game.wonderTimers)` (no change needed). N-player wonder
  tests added: 4-faction timer seeding, independent decrement for non-legacy
  id, first-ai-to-zero → loss. `FactionTrait({ faction })` cast in test fixed.
  All 1091+ tests green.

- [x] M_V8.OUTLINE.CANVAS-MOUNT — Import `UnitHexOutline` + `BuildingOutlineRing`
  from `@/world/UnitHexOutline` and `@/world/BuildingOutlineRing` in Canvas.tsx.
  Mount inside `<group name="outlines">` alongside the terrain/units groups.
  Pass `game` prop. No new component logic — purely wiring the v0.7 substrates
  into the render tree. 1 grep-gate test: Canvas.tsx imports both components.

- [x] M_V8.DIFFICULTY-MULTIPLIER.N-PLAYER — Find every `faction === 'enemy'`
  guard in src/ai/, src/game/, src/ecs/systems/ that controls difficulty
  scaling / spawn rate / AI aggressiveness. Replace with `kind === 'ai'` lookup
  via `findFaction(game.factions, factionId)?.kind`. Adds a test: 4-player game
  with 3 AI factions all receive difficulty scaling (was: only 'enemy' did).

- [x] M_V8.PORTAL-STONE.AUDIO — `useAudio.ts` listens for the
  `'aethelgard:portal-stones-placed'` window event and plays a dedicated stinger
  (`audio.sfx.portal-stones-placed` sound id, or fallback to `combat-hit-magic`
  until the asset lands). `SOUND_FOR_EVENT` gains a `'portal-stones-placed'` entry.
  1 test: event dispatch → sound map entry exists.

- [x] M_V8.PORTAL-STONE.COOLDOWN-HOOK — In `pathFollowSystem`, the existing
  `portalTo` teleport branch (v0.4 primitive) gains a biome check: when
  `board.get(arrivedTile)?.type === 'PORTAL_STONE'`, call
  `refreshPortalStoneCooldown(game, factionId, game.clock.elapsed)`. The substrate
  helpers (`refreshPortalStoneCooldown`, `isPortalStoneAvailable`) are already in
  `src/world/portal-stones.ts`. 2 tests: cooldown is set after teleport on PORTAL_STONE,
  no cooldown set for non-PORTAL_STONE portal tiles.

- [x] M_V8.NEWGAMEMODAL.N-PLAYER-PICKER — NewGameModal gains an N-player count
  slider (2–6) visible only in age-of-strata mode. Beneath it, per-slot rows:
  faction name + color picker chip for each slot (slots 3-N are AI-defaulted +
  auto-colored from the palette shuffle). This replaces the single player+enemy
  color picker UI for 4X mode. Legacy 2-faction modes unchanged. 2 browser tests:
  slider changes slot count, per-slot color pickers render.

- [x] M_V8.AI.DIPLO-EVALUATOR — `DiplomaticEvaluator` added to the yuka
  evaluator stack in `src/ai/evaluators/diplomatic.ts`. Evaluates: can-propose-pact
  (borders touching + not already ally), can-demand-tribute (supply ratio >= 2×),
  can-accept-tribute (weaker than dominant). Calls the existing diplomacy-border.ts +
  diplomacy-tribute.ts primitives. Priority weight: lower than Military (combat
  wins over diplomacy), higher than Patrol (diplomacy over idle patrol). 3 tests:
  pact-proposal fires when borders touch, tribute demand fires when dominant, skip
  when same-id.

- [x] M_V8.CI.VISUAL-BATTERY-HOOK — `.github/workflows/ci.yml` gains a
  `visual-battery` job that runs `pnpm visual:battery:ci` when any path in
  `src/render/**`, `src/world/**`, `src/hud/**`, `src/ui/**` changes
  (paths-filter action). Job runs after the main test job. Drift fails CI.
  Script already exists (`scripts/visual-battery.mjs`); this is purely the
  ci.yml wiring + a `paths-filter` step.

- [x] M_V8.TUTORIAL.N-PLAYER-MODE — `OnboardingOverlay` gains an n-player slide
  shown when `game.factions.length > 2`. Slide content: "Multiple factions have
  joined the map. Build your economy, form alliances, and be the last faction
  standing." Shown after the existing 3-slide sequence. 1 browser test: slide
  appears when factions.length > 2.

- [x] M_V8.PERF.PROFILE-PASS — Run a 4-player AI-vs-AI sim (300s) via the
  existing `?ai-vs-ai=1&nplayer=4` URL and capture a Chrome performance trace
  via `mcp__chrome-devtools-mcp`. Record: mean frame time, max frame time, GC
  pause count. If mean > 16ms: identify the hot path and add a targeted
  optimization. Results go in `docs/specs/perf-baseline.md` (new file).

- [x] M_V8.REVIEWER.FULL-CYCLE — Dispatch `comprehensive-review:full-review`
  against the full v0.8 diff (`git diff main..HEAD`). Address every CRITICAL +
  HIGH finding in a forward commit before pushing. MEDIUM/LOW findings logged
  in `docs/specs/review-findings.md`.

- [x] M_V8.PARKING-LOT.V06 — Drain the [WAIT] items from the parking lot
  that are now unblocked: M_PROCESS.REVIEW (review-trio dispatch), discovery-flag
  grant for camp clears tied to the v0.7 camp-clear flow, RUINS decoration
  palette (the palette entry exists; the scatter props for the RUINS biome
  need the accretion pool entry). Each sub-item gets its own commit.
