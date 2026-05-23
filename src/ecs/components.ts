import { trait } from 'koota';

/** A unit class. Source: docs/specs/50-ecs-model.md. */
export type UnitType = 'Peon' | 'Footman' | 'Goblin' | 'Orc' | 'Vampire' | 'BlackKnight' | 'Witch';

/** Faction ownership for targeting and AI. */
export type Faction = 'player' | 'enemy';

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
export type ResourceType = 'wood' | 'stone' | 'gold' | 'science';

/** The enumerable list of resource slots — iterate this, never hardcode individual slots. */
export const RESOURCE_TYPES: readonly ResourceType[] = [
  'wood',
  'stone',
  'gold',
  'science',
] as const;

/**
 * A building type. `TownHall` is the attractor (start base, not built
 * mid-game); `Farm`/`House`/`Granary` are economy buildings; `Barracks` trains
 * military; `Watchtower`/`Wall` are the offensive/defensive territorial
 * buildings. See `docs/specs/102-zone-of-control.md`.
 */
export type BuildingType =
  | 'TownHall'
  | 'Farm'
  | 'House'
  | 'Granary'
  | 'Barracks'
  | 'Watchtower'
  | 'Wall'
  | 'Wonder'
  | 'Library';

/** The peon job state machine. */
export type JobState = 'IDLE' | 'SEEKING' | 'HARVESTING' | 'CARRYING' | 'DEPOSITING' | 'BUILDING';

/** A harvestable resource node — marks an entity and tracks remaining amount. */
export const ResourceTrait = trait({ resourceType: 'wood' as ResourceType, amount: 100 });

/** Harvesting capability — drives the harvest progress timer. */
export const Harvester = trait({ harvestRate: 1, harvestTimer: 0 });

/** A carried resource load. `carryType` is 'none' when empty. */
export const Carrier = trait({ carryType: 'none' as ResourceType | 'none', amount: 0 });

/** A building — tracks type and construction progress. */
export const Building = trait({
  buildingType: 'Farm' as BuildingType,
  isComplete: false,
  progress: 0,
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
export const Health = trait({ current: 50, max: 50 });

/** Combat stats and the attack-cooldown timer. */
export const Combatant = trait({
  attackDamage: 10,
  attackRange: 1,
  attackCooldown: 1,
  attackTimer: 0,
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
export const EnemySpawner = trait({ spawnTimer: 0, spawnInterval: 45, spawnCount: 0 });

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
