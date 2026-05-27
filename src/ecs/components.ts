import { trait } from 'koota';

/** A unit class. Source: docs/specs/50-ecs-model.md.
 *
 * M_PIVOT.N-PLAYER.SHARED-KIT: the union mixes two pools —
 *   1. PLAYER kit (Peon/Footman/Trebuchet/Wizard/Healer/Ferryman/
 *      Scout/Settler/Hero) — every player faction can train any of
 *      these via the standard buildings. Symmetric across all factions.
 *   2. BARBARIAN pool (Goblin/Orc/Vampire/BlackKnight/Witch) — the
 *      legacy enemy-only raid roster; M_PIVOT.BARBARIAN-CAMPS moves
 *      these to neutral aggressor camps spawned at gen-time. No
 *      PLAYER faction trains these; they exist only as camp output.
 * The single-union shape persists so existing systems (combat,
 * pathing, deposit, scoring) treat both pools identically — only
 * the spawn source differs.
 */
export type UnitType =
  | 'Peon'
  | 'Footman'
  | 'Trebuchet'
  | 'Wizard'
  /** M_FUN.UNIT.HEAL — Healer / Cleric. No offensive; 2-hex
   *  heal-aura that clears disease for friendly units in range
   *  and ticks HP+regen. Counter-unit for SWAMP/disease pressure. */
  | 'Healer'
  /** M_FUN.MAP.UTILISATION.FERRYMAN — aquatic unit. Crosses
   *  SHALLOWS at 1.8× cost; land-speed penalty (60%). Trainable
   *  from a Peon. Opens multi-island maps to combined-arms
   *  pressure. */
  | 'Ferryman'
  | 'Scout'
  | 'Settler'
  | 'Hero'
  /** M_V11.UNITS-EXPANSION.ARCHER — ranged anti-air tier-1 (predates
   *  Wizard's magic ranged). Cheap arrow attack; weak in melee. */
  | 'Archer'
  /** M_V11.UNITS-EXPANSION.PIKEMAN — anti-cavalry tier-2 spear.
   *  Bonus damage vs Knight / BlackKnight; otherwise mid stats. */
  | 'Pikeman'
  /** M_V11.UNITS-EXPANSION.KNIGHT — player-side mounted heavy. High
   *  HP + damage; expensive; slow attack speed. */
  | 'Knight'
  /** M_V11.UNITS-EXPANSION.ENGINEER — builds + repairs siege at range.
   *  Can repair friendly Watchtowers / Walls / Trebuchets for free. */
  | 'Engineer'
  /** M_V11.UNITS-EXPANSION.DIPLOMAT — physical "first contact" carrier.
   *  Walking a Diplomat into a foreign zone establishes the diplomacy
   *  contact gate (the abstraction added in M_V11.EVENTS.RTS-TRIGGERED). */
  | 'Diplomat'
  /** M_V11.UNITS-EXPANSION.MAGE-TOWER-GARRISON — Mage Tower's auto-fire
   *  spirit. Not trainable directly; spawns when a Mage Tower is
   *  built (planned for buildings expansion #77e). */
  | 'MageTowerGarrison'
  | 'Goblin'
  | 'Orc'
  | 'Vampire'
  | 'BlackKnight'
  | 'Witch';

/**
 * M_PIVOT.N-PLAYER.SHARED-KIT — the PLAYER unit pool. Every player
 * faction (id `player`, `enemy`, `player-3`, ...) can train any of
 * these via the appropriate building; symmetric across all factions.
 *
 * The SAME `Unit.unitType` field carries both player and barbarian
 * roles — the discriminator is `FactionTrait.faction` (a player-kit
 * faction id implies a PLAYER unit; a barbarian-camp faction id
 * implies a BARBARIAN unit, regardless of UnitType value).
 */
export const PLAYER_UNIT_TYPES: readonly UnitType[] = [
  'Peon',
  'Footman',
  'Trebuchet',
  'Wizard',
  'Healer',
  'Ferryman',
  'Scout',
  'Settler',
  'Hero',
  // M_V11.UNITS-EXPANSION (#77d) — 6 new player units.
  'Archer',
  'Pikeman',
  'Knight',
  'Engineer',
  'Diplomat',
  'MageTowerGarrison',
] as const;

/**
 * M_PIVOT.N-PLAYER.SHARED-KIT — the BARBARIAN unit pool. These types
 * spawn only from EnemySpawner entities (legacy v0.4) or from
 * barbarian-camp spawners (M_PIVOT.BARBARIAN-CAMPS, v0.5). No PLAYER
 * faction trains these via `trainUnit`. Repurposed as the neutral
 * aggressor roster: clearing a camp removes its spawner.
 */
export const BARBARIAN_UNIT_TYPES: readonly UnitType[] = [
  'Goblin',
  'Orc',
  'Vampire',
  'BlackKnight',
  'Witch',
] as const;

/**
 * Faction ownership for targeting and AI. M_PIVOT.N-PLAYER.FACTIONS:
 * the v0.4 literal union `'player' | 'enemy'` is preserved here for
 * the two PLAYABLE faction slots — every existing `Record<Faction, X>`
 * map (economy / zones / score / aiPlayers) keeps its compile-time
 * narrowing. The N-player + barbarian-camp registry lives in a
 * PARALLEL space:
 *
 *   `src/config/factions.ts` — `FactionConfig` + `FactionId` (string)
 *   `GameState.factions`     — runtime registry, indexed by FactionId
 *
 * Barbarian camps and additional player slots (player-3, player-4,
 * etc) get FactionId values like `barbarian-camp-1`, `player-3`. They
 * do NOT join the `Faction` literal union — they live in the registry
 * + carry FactionTrait with the matching FactionId string. Renderers
 * read color / archetype from the registry; the legacy 2-faction tick
 * loops still iterate `FACTIONS` here.
 *
 * Acceptance for the M_PIVOT.N-PLAYER.FACTIONS substrate work-unit:
 * "the 2-faction case still passes byte-identical, determinism
 * unchanged" — preserved precisely by keeping this union intact.
 */
export type Faction = 'player' | 'enemy';

/**
 * M_V11.FACTION.WIDE-ID — the actual string the FactionTrait.faction
 * field can hold at runtime. The legacy 2-faction code path uses
 * Faction; v0.6 N-player adds `player-3..N` registry ids; v0.11
 * barbarian-camp work adds `barbarian-camp-${number}` ids for
 * camp-owned mobs. Tests that work with non-legacy ids should accept
 * this widened type to avoid the `as unknown as string | undefined`
 * cast pattern CodeRabbit (PR #89) called out.
 */
export type FactionLike = Faction | `player-${number}` | `barbarian-camp-${number}`;

/**
 * The complete set of factions in the current game. M_REGISTRY.16 —
 * the single iteration target for any per-faction loop (science
 * trickle, deposit pump, job routing, AI tick). Every literal
 * player+enemy hand-unrolled pair across the codebase should iterate
 * this constant instead.
 *
 * For N-player code paths (barbarian camps, 3+ players) iterate
 * `factionIds(game.factions)` from `src/config/factions.ts` — that
 * registry is the runtime source of truth for non-legacy slots.
 */
export const FACTIONS: readonly Faction[] = ['player', 'enemy'] as const;

/** Animation state — drives which clip a character plays. */
export type AnimState = 'IDLE' | 'MOVING' | 'HARVESTING' | 'ATTACKING' | 'DYING' | 'BUILDING';

/** World-space transform. R3f reads this to drive the Three.js object. */
export const Transform = trait({ x: 0, y: 0, z: 0, rotationY: 0 });

/** The tile an entity occupies — source of truth for logical grid position. */
export const HexPosition = trait({ q: 0, r: 0, level: 0 });

/** Marks an entity as a unit and records its class. */
export const Unit = trait({ unitType: 'Peon' as UnitType });

/** Faction ownership. */
export const FactionTrait = trait({ faction: 'player' as Faction });

/** Movement capability and current motion state. */
export const Movement = trait({ speed: 2, isMoving: false });

/** Remaining A* path steps (tile keys) to the destination. */
export const PathQueue = trait((): { steps: string[] } => ({ steps: [] }));

/**
 * Current animation state. The KayKit clip name is derived from this via
 * `clipForState` (animation.ts) — not stored, so the two cannot drift.
 */
export const AnimationState = trait({ state: 'IDLE' as AnimState });

/** Whether the entity is currently selected by the player. */
export const Selectable = trait({ isSelected: false });

/** A harvestable resource type. */
/**
 * A resource type — an economic "slot" the player + AI accumulate and spend.
 * Per spec 102 + the user's slot-model insight, resources are slots-with-
 * multipliers, not unique types: each ResourceType represents an accumulation
 * slot tied magnetically to Consumers (which fill it) and to Costs (which
 * spend it). The union here is the *known* slots; iteration ALWAYS uses
 * `RESOURCE_TYPES` (the enumerable list) so adding a 4th slot is one config
 * row + one union entry, never `if/elseif` branches.
 */
/**
 * Resource slots — derived from `src/config/resources.json` (the
 * SINGLE source-of-truth: each slot declares its sources, consumers,
 * label, and kind). The `RESOURCE_TYPES` array + `ResourceType`
 * union flow from the JSON via `src/config/resources.ts`.
 *
 * Per the archetype principle (the user's "consumers registered to
 * archetypes" framing): a resource is a generic slot tied
 * magnetically to its Consumers + Sources. No JSON file, type, or
 * schema should hand-enumerate the five names — they iterate
 * RESOURCE_TYPES. Adding a 6th slot is ONE entry in resources.json;
 * the union, every Partial<Record<…>>, every Zod cost schema, every
 * HUD grid, every spawn rule picks it up automatically.
 *
 * For backwards-compat with code that imported these names from
 * `@/ecs/components` (the historic location), the symbols are
 * re-exported here as a thin pass-through.
 */
import { RESOURCE_IDS, type ResourceType } from '@/config/resources';

// `ResourceType` is now derived from the Zod enum in `@/config/resources`
// (see ResourceIdSchema there). Adding a 10th resource slot requires only:
//   1. A new entry in resources.json.
//   2. Adding the id to ResourceIdSchema in resources.ts.
// No cast, no tuple to maintain here.
//
// `RESOURCE_TYPES` is kept as a runtime constant so existing call sites
// that iterate `RESOURCE_TYPES` or do `(typeof RESOURCE_TYPES)[number]`
// continue to compile unchanged. It is typed `ReadonlyArray<ResourceType>`
// so the element type is still the narrow literal union.
export const RESOURCE_TYPES: ReadonlyArray<ResourceType> =
  RESOURCE_IDS as ReadonlyArray<ResourceType>;
export type { ResourceType };

/**
 * A building type. `Palace` is the attractor (start base, not built
 * mid-game); `Farm`/`House`/`Granary` are economy buildings; `Barracks` trains
 * military; `Watchtower`/`Wall` are the offensive/defensive territorial
 * buildings. See `docs/specs/102-zone-of-control.md`.
 */
export type BuildingType =
  | 'Palace'
  | 'Farm'
  | 'House'
  | 'Granary'
  | 'Barracks'
  | 'Watchtower'
  | 'Wall'
  | 'Wonder'
  | 'Library'
  // M_V11.BUILDINGS-EXPANSION (#77e) — 5 new buildings.
  /** Market — unlocks per-tick trade cession with allied factions
   *  (1:1 wood/stone/gold swap honored AUTOMATICALLY per minute,
   *  not via the manual Trade widget). */
  | 'Market'
  /** Embassy — required-for-diplomacy gate; building one creates a
   *  hasHadContact entry with every faction whose zone touches your
   *  zone (the per-faction physical version of the Diplomat unit). */
  | 'Embassy'
  /** Lighthouse — extends Ferryman max-cargo range by +2 and reveals
   *  every OCEAN / SHALLOWS tile within 5 hex permanently. */
  | 'Lighthouse'
  /** Mage Tower — auto-fires magic damage at any enemy in 3-hex
   *  range (no garrison-unit micro required). Spawns a
   *  MageTowerGarrison unit on construction for selection / repair. */
  | 'MageTower'
  /** Workshop — Engineer + siege production hub. Trebuchets are
   *  trainable here at tier-1 (instead of needing Barracks tier-2),
   *  and Engineers built here gain a free Siege-Engineering buff. */
  | 'Workshop';

/** The peon job state machine. */
export type JobState = 'IDLE' | 'SEEKING' | 'HARVESTING' | 'CARRYING' | 'DEPOSITING' | 'BUILDING';

/** A harvestable resource node — marks an entity and tracks remaining amount. */
export const ResourceTrait = trait({ resourceType: 'wood' as ResourceType, amount: 100 });

/** Harvesting capability — drives the harvest progress timer. */
export const Harvester = trait({ harvestRate: 1, harvestTimer: 0 });

/** A carried resource load. `carryType` is 'none' when empty. */
export const Carrier = trait({ carryType: 'none' as ResourceType | 'none', amount: 0 });

/** A building — tracks type, construction progress, and upgrade tier. */
export const Building = trait({
  buildingType: 'Farm' as BuildingType,
  isComplete: false,
  progress: 0,
  // M_EXPANSION.F.86 — upgrade tier (1 = base, 2 = mid, 3 = max).
  // Tier 1 is the construction default. upgradeBuilding command
  // bumps in place + re-spends per-tier delta cost. Higher tiers
  // scale BuildingProfile.supply and producer.rate (when present)
  // by tier-multiplier at runtime read.
  tier: 1,
});

/** A peon's current job assignment: the state machine + the target entity id. */
export const AssignedJob = trait({ state: 'IDLE' as JobState, targetKey: '' });

// ----- Local-zone-of-control behaviour archetypes (spec 102, refined). -----
// Behaviours are composable traits attached to ANY entity (typically a building)
// rather than baked into a building type. A future Wonder could have all three.

/** Damage kind an Offensive entity deals — see DefensiveBehavior.armorVs. */
export type DamageType = 'normal' | 'siege' | 'magic' | 'pierce';

/**
 * Offensive zone of control — the entity radiates an offensive aura over
 * neighbouring tiles within `radius`; the offensive system deals `dps` damage
 * each second to enemy military units inside the aura. `damageType` slots
 * into the Defender's armorVs[damageType] table (spec 102) — a Trebuchet
 * (`damageType:'siege'`) hits a Wall (`armorVsSiege: 1.5`) much harder than
 * its `armorVsNormal: 0.3` would let a Footman.
 */
export const OffensiveBehavior = trait({
  radius: 3,
  dps: 6,
  damageType: 'normal' as DamageType,
});

/**
 * Defensive zone of control — the entity is a hard pathing border. The tile
 * itself is non-walkable; enemy units cannot path past it until the entity is
 * destroyed. `radius` is reserved for future area-defence walls.
 *
 * `armorVs<DamageType>` are incoming-damage multipliers (1.0 = no resistance;
 * <1.0 = resistant; >1.0 = vulnerable). The damage formula (M_ARCHETYPE.4):
 *   applied = base * (target.armorVs[source.damageType] ?? 1)
 * Adding a new damage type = a new field here + a row in any Offender's
 * `damageType`; the system iterates the existing table — no code branches.
 */
export const DefensiveBehavior = trait({
  radius: 0,
  armorVsNormal: 0.3,
  armorVsSiege: 1.5,
  armorVsMagic: 1.0,
  armorVsPierce: 0.6,
});

/**
 * Attractor zone of control — the entity is a faction anchor. Its `radius`
 * guarantees resource minimums at map-generation (the rules engine reads this).
 * Non-combat by itself; combat capability comes from composing OffensiveBehavior.
 */
export const AttractorBehavior = trait({ radius: 2 });

/** Material a Mover (road) is made of — drives visuals + Gate-material when crossing a Defender. */
export type MoverMaterial = 'stone' | 'wood' | 'dirt';

/**
 * Mover zone — roads. Per spec 102: ZoC-NEUTRAL (emit zero zone of control —
 * walking on a road never claims a tile). Movers snap to other Movers
 * (network), and when crossing a DefensiveBehavior transform that tile into
 * a Gate (directional passability: friendly open, enemy closed).
 *
 * `material` is the visual + composition kind: a stone Mover crossing a
 * wood Wall produces a wood Gate (the gate inherits the wall's material).
 */
export const MoverBehavior = trait({ material: 'stone' as MoverMaterial });

/**
 * Consumer zone — resources (spec 102). ZoC-NEUTRAL — a tree isn't
 * territory; the Attractor + peon machinery claim the tile *when exploited*,
 * not because of the Consumer's presence. Each Consumer declares the slot
 * it fills (the existing ResourceTrait holds the same data — this is the
 * archetype-level marker, attached alongside or wrapping ResourceTrait so
 * the magnetic-emitter pipeline (M_ARCHETYPE.6) treats it uniformly with the
 * other archetypes). `kind` matches a ResourceType slot; `amount` is the
 * remaining yield.
 */
export const ConsumerBehavior = trait({
  kind: 'wood' as ResourceType,
  amount: 100,
});

/**
 * Gate — a Mover + Defender composition (spec 102). A Gate occupies a tile
 * and is directionally passable: friendly units of `faction` cross freely
 * (the existing pathfinding sees it as walkable); enemy units find it
 * impassable (the existing wall semantics apply). Spawned when a Mover is
 * placed on a tile that already has a DefensiveBehavior: the gate inherits
 * the wall's material (via MoverBehavior.material) AND the wall's defence
 * (via the existing DefensiveBehavior trait kept on the entity).
 *
 * The faction field encodes WHICH side the gate is open for. Today it
 * matches the placing faction; future neutral gates could leave it ''.
 */
export const Gate = trait({ faction: 'player' as Faction });

/** Hit points. */
/**
 * Per-entity HP + status attributes.
 *
 * M_FUN.ATTR.DISEASE / .DEHYDRATION — disease and dehydration are
 * timers in seconds. `disease > 0` ticks HP -1 per sim-second
 * (see diseaseSystem in src/ecs/systems/status-attributes.ts);
 * cleared by a Healer in 2-hex range OR standing on GRASS for 5+
 * seconds (recovery via diseaseRecoveryTimer). `dehydration > 0`
 * suppresses natural HP regen while set; cleared by leaving DESERT
 * for 3+ seconds. Defaults 0 — no behaviour change for entities
 * that never touch SWAMP / DESERT.
 */
export const Health = trait({
  current: 50,
  max: 50,
  disease: 0,
  diseaseRecoveryTimer: 0,
  dehydration: 0,
  dehydrationRecoveryTimer: 0,
});

/**
 * Combat stats and the attack-cooldown timer.
 *
 * M_FUN.MAP.ELEV — `fatigue` is a 0..1 multiplier on damage dealt.
 * 0 = normal; 1.0 = -100% (no damage). Applied when a unit crosses
 * a MOUNTAIN_PASS tile (Combatant biome-rule attributeStrength=0.5
 * → fatigue +0.5 = -50% dmg). Decays toward 0 over `FATIGUE_DECAY`
 * seconds out of combat (combat.ts applies fatigue to outgoing
 * damage via `effectiveDamage = attackDamage * (1 - fatigue)`).
 *
 * `fatigueDecayTimer` accumulates seconds since combat last hit;
 * fatigue decrements once the timer exceeds the decay-rate window.
 */
export const Combatant = trait({
  attackDamage: 10,
  attackRange: 1,
  attackCooldown: 1,
  attackTimer: 0,
  fatigue: 0,
  fatigueDecayTimer: 0,
  // M_V11.PURGE — restUntilTurn removed with the 4X turn-based
  // mode. Continuous-decay fatigue handling remains via
  // fatigueDecayTimer above.
});

/**
 * Marks a faction's main base — the player's home base or the enemy's. A
 * faction loses when its `FactionBase` entity is destroyed. The base is the
 * symmetric anchor of each faction's structures. See `docs/specs/100-ai-as-player.md`.
 */
export const FactionBase = trait({ faction: 'player' as Faction });

/**
 * The enemy base's unit-spawning behaviour — its spawn timer, interval, and the
 * running spawn count (drives the escalation ladder). Attached alongside
 * `FactionBase` on the enemy base entity. The player home base has no spawner;
 * the player builds units instead. The count lives on the entity — not module
 * state — so it survives save/load.
 */
/**
 * M_V11.CAMPS.MOB-SPAWN — `mobCap` (>0) caps the number of live mobs
 *  this spawner has produced; once hit, the tick skips spawning until
 *  one of its mobs dies. 0 = uncapped (legacy enemy base behavior).
 *
 *  `liveMobs` is the current count, maintained by spawnSystem +
 *  decremented by deathSystem on barbarian-camp-N mob death.
 */
export const EnemySpawner = trait({
  spawnTimer: 0,
  spawnInterval: 45,
  spawnCount: 0,
  mobCap: 0,
  liveMobs: 0,
});

/**
 * M_V11.CAMPS.WANDER — anchor + radius for a roaming mob's behavior.
 *
 * - `anchorQ` / `anchorR`: the camp tile the mob came from.
 * - `radius`: max hex distance the mob will wander from its anchor.
 *   Spec default 5.
 * - `pickChance`: per-tick probability of choosing a new random
 *   walkable tile within the radius. Spec default 0.05.
 *
 * Wander logic stays distinct from Stance (combat-target picking) —
 * a mob with WanderBehavior + no enemy in stance-range walks aimlessly
 * within its leash; once an enemy enters stance-range, Stance takes
 * over and Wander pauses by definition (the stance pathing overrides
 * the wander destination).
 */
export const WanderBehavior = trait({
  anchorQ: 0,
  anchorR: 0,
  radius: 5,
  pickChance: 0.05,
});

/**
 * M_V11.CAMPS.LOOT — resource cache dropped on a tile by a dying mob.
 *
 * First non-barbarian unit to occupy the cache's HexPosition tile
 * collects it and the cache entity is destroyed. The pickup grants
 * the unit's faction wood/stone/gold per the per-biome weight from
 * docs/specs/202-camps-and-mobs.md (default: 10 wood, 10 stone,
 * 5 gold; tundra/desert biomes shift toward stone).
 *
 * Caches live as koota entities so they survive save/load — a
 * partially looted map keeps its un-collected drops.
 */
export const LootCache = trait({
  wood: 0,
  stone: 0,
  gold: 0,
});

/** The entity an enemy is currently hunting. `targetId` is -1 when none. */
export const EnemyTarget = trait({ targetId: -1 });

/**
 * Death countdown — added to a unit when it reaches 0 HP. `elapsed` accumulates
 * until the death clip finishes, then the entity is removed. An ECS component
 * (not module state) so a mid-death unit survives a save/load round-trip.
 */
export const DeathTimer = trait({ elapsed: 0 });

/**
 * Science producer (M_FEATURE.3) — any building with this trait adds
 * `rate` science per second to its faction's economy. Composes orthogonally
 * with the ZoC archetypes — a Wonder could carry ScienceProducer too.
 * Today only the Library building spawns with it.
 */
export const ScienceProducer = trait({ rate: 1 });

// ---------------------------------------------------------------------------
// Stance system (M_POLISH2.RTS.16)
// ---------------------------------------------------------------------------

/**
 * The four stance modes for military units.
 *
 * - `aggressive`     — chases any visible enemy up to AGGRESSIVE_CHASE_RADIUS
 *                      hexes from the unit's last commanded tile.
 * - `defensive`      — engages adjacent enemies; returns to the commanded tile
 *                      when no enemy is adjacent (DEFAULT).
 * - `hold-position`  — never moves; attacks only enemies within attackRange.
 * - `stand-ground`   — attacks enemies within attackRange but will NOT move
 *                      toward a target to close distance.
 */
export type StanceMode = 'aggressive' | 'defensive' | 'hold-position' | 'stand-ground';

/**
 * Stance trait for military units (Footman, Wizard, Hero, and all combat roles).
 * `mode` governs how the stanceBehaviorSystem selects and pursues targets.
 * Default is `'defensive'` — attack nearby, then return home.
 */
export const Stance = trait({ mode: 'defensive' as StanceMode });

/**
 * The last tile the player explicitly commanded this unit to — used by
 * defensive stance to determine the "home" position to return to, and by
 * aggressive stance to bound the chase radius.
 *
 * Set by `moveUnit` (and the `setStance` command's home-tile snapshot).
 * Initialised to the spawn tile.
 */
export const CommandedTile = trait({ q: 0, r: 0 });

// ---------------------------------------------------------------------------
// M_GAME.MODE.PEON.1 — Peon autonomy mode
// ---------------------------------------------------------------------------

/**
 * Per docs/specs/200-genre-commitment.md: peons spawn in `'auto'` mode
 * (the auto scheduler re-tasks them whenever they go idle); the player
 * can flip them to `'manual'` mode via the SelectionPanel "Take command"
 * action, at which point they obey player commands + surface in the
 * IdleUnitIndicator count when idle.
 *
 * Only Peon-type units carry this trait. Spawn applies it automatically
 * (default 'auto'); manual flip is the player command's responsibility.
 */
export type PeonAutoMode = 'auto' | 'manual';
export const PeonAutonomy = trait({ autoMode: 'auto' as PeonAutoMode });

// ---------------------------------------------------------------------------
// M_GAME.STACK.1 — Stack components (per docs/specs/201-stacking-and-formations.md)
// ---------------------------------------------------------------------------

/** A formation id — gates which combined-stat modifier applies to a Stack. */
export type FormationId =
  | 'rabble'
  | 'phalanx'
  | 'cadre'
  | 'wedge'
  | 'skirmish-line'
  | 'square'
  | 'combined-arms'
  | 'work-crew';

/**
 * A multi-member stack of same-faction units occupying a single tile.
 * The Stack entity itself is created when 2+ units stack-up; its
 * members keep their Unit + FactionTrait + HexPosition traits but also
 * gain a StackMember back-reference so render + pathing systems can
 * early-out on per-member ticks (the stack drives motion + combat).
 *
 * `members` is an Entity[] — koota uses numeric ids; the Stack
 * substrate stores the live Entity refs so a member's death simply
 * filters the array. When `members.length <= 1` the stack auto-
 * dissolves (handled by stackSystem in M_GAME.STACK.4).
 *
 * `combinedHp` / `combinedMaxHp` are SUMMED across members at
 * formation time + on every member-death. They drive Stack-vs-Stack
 * combat resolution.
 *
 * `combinedDps` is derived from members' Combatant.attackDamage /
 * attackCooldown × the formation's stat modifier.
 *
 * `dominantUnitType` powers the badge icon (the unit type with the
 * largest member count, tie-broken by member order).
 */
export const Stack = trait(
  (): {
    members: number[]; // Entity ids; koota Entity is a numeric handle
    formationId: FormationId;
    combinedHp: number;
    combinedMaxHp: number;
    combinedDps: number;
    dominantUnitType: UnitType;
  } => ({
    members: [],
    formationId: 'rabble',
    combinedHp: 0,
    combinedMaxHp: 0,
    combinedDps: 0,
    dominantUnitType: 'Footman',
  }),
);

/**
 * Back-reference: a Unit entity that's part of a Stack. Set when the
 * member joins; cleared when the stack dissolves or the member is
 * un-stacked. `stackId === -1` means "not in a stack" (legal but
 * never persisted — the trait is removed entirely instead, so a
 * has-Stack-member ECS query returns only true members).
 */
export const StackMember = trait({ stackId: -1 });

// SERIALIZED_TRAITS moved to ./serialized-traits.ts (CodeRabbit
// PR #89: keep components.ts under the 600-line code-quality
// threshold). Consumers import it from '@/ecs/serialized-traits'
// directly (avoiding the circular-dep that re-exporting here would
// introduce — serialized-traits.ts imports trait objects from
// components.ts, so components.ts can't re-export from it without
// the trait values being `undefined` at module-init time).
