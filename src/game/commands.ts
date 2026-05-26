import type { Entity } from 'koota';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { roadCostFor } from '@/config/economy';
import { getHexKey, hexNeighbors, parseHexKey } from '@/core/hex';
import { buildNavGraph, findPath } from '@/core/pathfinding';
import { makeMoveCostFn } from '@/core/terrain-cost';
import {
  AssignedJob,
  AttractorBehavior,
  Building,
  type BuildingType,
  CommandedTile,
  DefensiveBehavior,
  type Faction,
  FactionTrait,
  HexPosition,
  MoverBehavior,
  type MoverMaterial,
  OffensiveBehavior,
  PathQueue,
  PeonAutonomy,
  ScienceProducer,
  Selectable,
  Stance,
  type StanceMode,
  Unit,
} from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import {
  BUILDING_COSTS,
  behaviorsFor,
  canBuild,
  canTrainComplete,
  materialiseGate,
  profileFor,
  SUPPLY_COST,
  type TrainableUnit,
  UNIT_COSTS,
} from '@/rules';
import { type ResourceCost, spend } from './economy';
import { baseKeyFor, type GameState } from './game-state';
import { setRallyPoint } from './rally';
import { applyResearch, type ResearchId } from './research';

/**
 * The command API is the **single action channel** — every change a faction
 * makes to the board goes through these functions. A human tap and an AI
 * decision both call the same commands, each *issued by* a faction and acting
 * only on *that faction's* pieces. See `docs/specs/100-ai-as-player.md`.
 *
 * `faction` defaults to `'player'` so the existing player-UI call sites need no
 * change; the AI player (M8.6) passes `'enemy'`.
 */

/**
 * Encode a path tile key into a `"q,r,level"` step. The level travels with the
 * step so the path-follow system can set Y height on crossing traversal without
 * holding a board reference.
 */
function toLeveledStep(game: GameState, key: string): string {
  const tile = game.board.tiles.get(key);
  return `${key},${tile?.level ?? 0}`;
}

/**
 * True when `entity` belongs to `faction`. Fails CLOSED — an entity without a
 * FactionTrait is NOT owned (security/correctness — a stray unit must never
 * be steerable by any faction by accident).
 */
function ownedBy(entity: Entity, faction: Faction): boolean {
  const ft = entity.get(FactionTrait);
  return ft !== undefined && ft.faction === faction;
}

/**
 * Issue a move order for `unit` to `targetKey`. Runs A* from the unit's tile;
 * on success writes the level-carrying path (excluding the start tile) into the
 * unit's PathQueue and returns the tile-key path. Returns null when the unit is
 * not owned by `faction`, the target is unreachable, or the unit has no
 * position — leaving the queue untouched.
 */
export function moveUnit(
  game: GameState,
  unit: Entity,
  targetKey: string,
  faction: Faction = 'player',
): string[] | null {
  if (!ownedBy(unit, faction)) return null;
  const hex = unit.get(HexPosition);
  if (!hex) return null;
  const startKey = getHexKey(hex.q, hex.r);
  // M_POLISH2.RTS.24a — terrain-aware A*. FOREST/HIGHLAND tiles cost
  // 1.25× / 1.5× to traverse, so the unit picks the cheaper route
  // even when it's slightly longer in hex-distance.
  const path = findPath(game.navGraph, startKey, targetKey, makeMoveCostFn(game.board.tiles));
  if (!path || path.length < 2) return null;
  const steps = path.slice(1).map((key) => toLeveledStep(game, key));
  unit.set(PathQueue, { steps });
  // M_POLISH2.RTS.16 — update the commanded tile so defensive/aggressive
  // stance knows where the unit was last ordered to stand.
  const { q: tq, r: tr } = parseHexKey(targetKey);
  if (unit.has(CommandedTile)) unit.set(CommandedTile, { q: tq, r: tr });
  return path;
}

/**
 * Change the stance mode for a player military unit (M_POLISH2.RTS.16).
 * Only applies to units that carry the Stance trait (Footman, Wizard, Hero).
 * No-op on civilian units (Peons) or if the unit isn't player-faction.
 *
 * @returns `true` if the stance was changed, `false` when the unit has no Stance.
 */
export function setStance(
  _game: GameState,
  entity: Entity,
  stance: StanceMode,
  faction: Faction = 'player',
): boolean {
  if (!ownedBy(entity, faction)) return false;
  if (!entity.has(Stance)) return false;
  entity.set(Stance, { mode: stance });
  return true;
}

/**
 * Issue a move order for the player pawn — the human-UI entry point. A thin
 * wrapper over `moveUnit` against `game.playerPawn` / `'player'`.
 */
export function planMoveOrder(game: GameState, targetKey: string): string[] | null {
  return moveUnit(game, game.playerPawn, targetKey, 'player');
}

/**
 * Issue a player move order, returning whether a path was found. Thin boolean
 * wrapper over `planMoveOrder`.
 */
export function issueMoveOrder(game: GameState, targetKey: string): boolean {
  return planMoveOrder(game, targetKey) !== null;
}

// ---------------------------------------------------------------------------
// Build command
// ---------------------------------------------------------------------------

/**
 * Place a building of `type` on `tileKey` for `faction`. Validates via
 * `rules.canBuild`, deducts the cost, spawns the incomplete Building entity
 * (stamped with the issuing faction) into `game.buildSites`, and assigns the
 * nearest idle peon **of that faction** to BUILDING state.
 *
 * Returns `true` on success, `false` if the placement is invalid.
 */
export function placeBuilding(
  game: GameState,
  tileKey: string,
  type: Exclude<BuildingType, 'Palace'>,
  faction: Faction = 'player',
): boolean {
  // CodeRabbit HIGH-4: the enemy base tile (and player Palace) are
  // BOTH unbuildable — without including enemyBaseKey, a player click on
  // the enemy hex would let placeBuilding stamp a second FactionBase-
  // adjacent entity right on top of the enemy base.
  const occupied = new Set<string>([
    game.townHallKey,
    game.enemyBaseKey,
    ...game.buildSites.keys(),
  ]);
  const economy = game.economy[faction];

  const check = canBuild(game.board, occupied, tileKey, type, economy);
  if (!check.ok) return false;

  if (!spend(economy, BUILDING_COSTS[type])) return false;

  const tile = game.board.tiles.get(tileKey);
  const level = tile?.level ?? 0;

  // Mark the tile unwalkable so units path around the building site.
  if (tile) tile.walkable = false;

  // Compose the building's local-zone-of-control behaviours from the rules
  // engine (spec 102) — orthogonal traits, not type-coupled logic. Build the
  // full trait list FIRST so the spawn is atomic (M_QUALITY.1, CodeRabbit
  // MED-8): a single world.spawn(...) leaves no half-state on failure.
  // M_REGISTRY.5 — read every slot off the unified Thing registry. The
  // Library `type === 'Library'` if-branch is gone; ANY building that
  // declares a `producer: { kind: 'science', rate }` slot picks up
  // ScienceProducer. Future producer kinds (gold/wood/stone) drop in by
  // extending the kind union here only.
  const profile = profileFor(type);
  const { behaviors, producer } = profile;
  const traits = [
    HexPosition({ q: tile?.q ?? 0, r: tile?.r ?? 0, level }),
    Building({ buildingType: type, isComplete: false, progress: 0 }),
    FactionTrait({ faction }),
    // M_V11.POLISH.BUILD-MENU-CTA — every built building is tappable
    // so the player can select it (and so the build-menu CTA's
    // auto-select path can find it). Existing buildings (Palace,
    // enemy base) get Selectable at spawn in game-state.ts.
    Selectable({ isSelected: false }),
    ...(behaviors.offensive ? [OffensiveBehavior(behaviors.offensive)] : []),
    ...(behaviors.defensive ? [DefensiveBehavior(behaviors.defensive)] : []),
    ...(behaviors.attractor ? [AttractorBehavior(behaviors.attractor)] : []),
    ...(producer?.kind === 'science' ? [ScienceProducer({ rate: producer.rate })] : []),
  ];
  const buildingEntity = game.world.spawn(...traits);
  game.buildSites.set(tileKey, buildingEntity);
  // M_AUDIT2.ARCH.22 — bump the generation counter so memo'd renderer
  // views (FactionBase placed, Decoration, etc) re-invalidate.
  game.buildSitesGeneration += 1;

  // M_FUN.QA.AIVAI.TUNE — Assign the nearest peon of the issuing
  // faction to build. Prefer IDLE peons; fall back to SEEKING /
  // HARVESTING / RETURNING peons (pulling a harvester off mid-cycle
  // is fine — building is a higher-value job). Previously this
  // required `state === 'IDLE'` exclusively; that meant a faction
  // whose peons were all mid-harvest could place a build site but
  // never get a builder, so the site sat at 0% forever. This bit
  // the enemy AiPlayer particularly hard since assignAllPeonsToHarvest
  // had moved all enemy peons to SEEKING at game start.
  const PRIORITY_ORDER = ['IDLE', 'SEEKING', 'HARVESTING', 'RETURNING'] as const;
  type AssignableState = (typeof PRIORITY_ORDER)[number];
  let nearestPeon: Entity | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  let nearestPriority: number = PRIORITY_ORDER.length; // lower is better
  const tileData = game.board.tiles.get(tileKey);
  for (const entity of game.world.query(Unit, AssignedJob, HexPosition, FactionTrait)) {
    if (entity.get(Unit)?.unitType !== 'Peon') continue;
    if (entity.get(FactionTrait)?.faction !== faction) continue;
    const job = entity.get(AssignedJob);
    if (!job) continue;
    const priority = PRIORITY_ORDER.indexOf(job.state as AssignableState);
    if (priority === -1) continue; // BUILDING or unknown — skip
    const hex = entity.get(HexPosition);
    if (!hex) continue;
    const dist = Math.abs(hex.q - (tileData?.q ?? 0)) + Math.abs(hex.r - (tileData?.r ?? 0));
    // Strictly prefer lower-priority state; tie-break on distance.
    if (priority < nearestPriority || (priority === nearestPriority && dist < nearestDist)) {
      nearestPriority = priority;
      nearestDist = dist;
      nearestPeon = entity;
    }
  }
  if (nearestPeon) {
    nearestPeon.set(AssignedJob, { state: 'BUILDING', targetKey: tileKey });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Road placement (M_FEATURE.1) — Mover trait + Gate composition at runtime.
// ---------------------------------------------------------------------------

/**
 * Place a road tile of `material` at `tileKey` for `faction`. Roads are
 * Movers (spec 102): ZoC-neutral, walkable (do NOT block paths), magnetic
 * neighbours of other Movers. When placed on a tile that already holds a
 * DefensiveBehavior (a Wall), the existing entity composes a Gate — that
 * tile becomes directionally passable for `faction` only.
 *
 * Returns true on placement (cost spent + entity spawned / gate composed),
 * false on illegal placement (tile occupied by a Building, not walkable,
 * unaffordable). Roads must sit on `walkable` tiles; if a Wall already owns
 * the tile, the road COMPOSES rather than rejecting.
 */
export function placeRoad(
  game: GameState,
  tileKey: string,
  material: MoverMaterial,
  faction: Faction = 'player',
): boolean {
  const tile = game.board.tiles.get(tileKey);
  if (!tile) return false;
  // Base tiles + completed building tiles are off-limits.
  if (tileKey === game.townHallKey || tileKey === game.enemyBaseKey) return false;
  const existingBuilding = game.buildSites.get(tileKey);
  // A Wall (DefensiveBehavior + Building) at this tile composes a Gate.
  const isWallTile = existingBuilding?.has(DefensiveBehavior) === true;
  // Any other building blocks road placement (Farm/House/Barracks/etc).
  if (existingBuilding && !isWallTile) return false;
  // Reject if a Mover is already on this tile — would stack two roads
  // (CodeRabbit MAJOR). Doesn't apply to wall tiles (composing a Gate is
  // explicit; the wall's existing entity gets a Mover trait added).
  if (!isWallTile) {
    for (const e of game.world.query(MoverBehavior, HexPosition)) {
      const h = e.get(HexPosition);
      if (h && getHexKey(h.q, h.r) === tileKey) return false;
    }
  }
  // Without a wall there, the tile MUST be currently walkable (no impassable terrain).
  if (!isWallTile && !tile.walkable) return false;

  const eco = game.economy[faction];
  const cost = roadCostFor(material);
  if (!spend(eco, cost)) return false;

  if (isWallTile && existingBuilding) {
    // Compose Gate on the existing Wall entity — Mover trait + Gate trait
    // added without disturbing the underlying Defender (M_ARCHETYPE.2).
    existingBuilding.add(MoverBehavior({ material }));
    materialiseGate(existingBuilding, faction);
    return true;
  }
  // Fresh road tile — spawn a Mover-only entity. Roads are NOT Buildings,
  // so no Building trait + no buildSites registration; they're free-standing
  // tile decorations that the renderer + force-field treat uniformly.
  game.world.spawn(
    HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
    FactionTrait({ faction }),
    MoverBehavior({ material }),
  );
  return true;
}

// ---------------------------------------------------------------------------
// Train command — the 2nd commander verb (build is the 1st, move-military 3rd)
// ---------------------------------------------------------------------------

/**
 * Train a unit of `role` for `faction`. Validates against the rules engine
 * (supply + cost + peon cap), spends the cost from the faction's economy,
 * spawns the character on a walkable tile adjacent to the issuing building,
 * and (for Peons) routes the new peon to SEEKING immediately so the
 * autonomous harvest loop picks up.
 *
 * The same channel is called by:
 *  - The human UI — Train Peon button on the Palace, Train Footman on the
 *    Barracks (M_GAMEPLAY.1).
 *  - The AI player — its TrainEvaluator (M_AI_DEPTH.2).
 *
 * Returns true on success.
 */
// M_V7.TRAIN.WIDEN-ROLES — `role` param widened from the v0.4 4-role
// subset (Peon/Footman/Scout/Hero) to all 9 PLAYER_UNIT_TYPES per
// M_PIVOT.N-PLAYER.SHARED-KIT. Trebuchet/Wizard/Healer/Ferryman/Settler
// are now trainable through the build command (UNIT_COSTS has rows
// for all 9; SUPPLY_COST already covered them in v0.4).
export function trainUnit(
  game: GameState,
  role: TrainableUnit,
  faction: Faction = 'player',
): boolean {
  const eco = game.economy[faction];
  // M_EXPANSION.F.96 — only ONE Hero alive per match per faction.
  // Permadeath is enforced in deathSystem (a player Hero dying →
  // game.outcome = 'loss'), so a player can never have a Hero
  // respawn opportunity. The AI never trains Hero anyway (no
  // AiPlayer evaluator for the 'Hero' role); this guard is the
  // belt + braces.
  if (role === 'Hero') {
    for (const e of game.world.query(Unit, FactionTrait)) {
      if (e.get(FactionTrait)?.faction !== faction) continue;
      if (e.get(Unit)?.unitType === 'Hero') return false;
    }
  }
  const peonCount = countPeons(game.world, faction);
  const houseCount = countBuildings(game.world, faction, 'House');
  const granaryCount = countBuildings(game.world, faction, 'Granary');
  if (!canTrainComplete(eco, role, peonCount, houseCount, granaryCount)) return false;
  if (!spend(eco, UNIT_COSTS[role])) return false;

  // pick a walkable tile adjacent to the faction's base (the trainer building)
  // M_REGISTRY.14 — baseKeyFor() is the single faction → baseKey source.
  const baseKey = baseKeyFor(game, faction);
  const { q: bq, r: br } = parseHexKey(baseKey);
  let spawnTile: { q: number; r: number; level: number } | null = null;
  for (const nKey of hexNeighbors(bq, br)) {
    const tile = game.board.tiles.get(nKey);
    if (tile?.walkable && !game.buildSites.has(nKey)) {
      spawnTile = { q: tile.q, r: tile.r, level: tile.level };
      break;
    }
  }
  if (!spawnTile) return false;

  const entity = createCharacter({
    world: game.world,
    role,
    q: spawnTile.q,
    r: spawnTile.r,
    level: spawnTile.level,
    factionOverride: faction,
    difficulty: game.difficulty,
  });
  // tick supply: the unit now consumes its supply cost
  eco.usedSupply += SUPPLY_COST[role];
  // a fresh peon goes SEEKING immediately so the harvest loop assigns it
  if (role === 'Peon') entity.set(AssignedJob, { state: 'SEEKING', targetKey: '' });
  // M_AUDIO.1 — confirm chime only for the player's own training (the enemy
  // AI also calls trainUnit; we don't want enemy chimes leaking into the
  // player's sfx bus).
  if (faction === 'player') emitUiSound('unit-trained');
  return true;
}

/** Count this faction's peons (utility for the train cap). */
function countPeons(
  world: ReturnType<typeof Object>['constructor'] extends never ? never : GameState['world'],
  faction: Faction,
): number {
  // typed via GameState['world'] indirectly; using `any` would also work but
  // is banned project-wide
  return countByPredicate(
    world,
    (e) => e.get(Unit)?.unitType === 'Peon' && e.get(FactionTrait)?.faction === faction,
  );
}

/** Count this faction's buildings of `type` — completed or in-progress. */
function countBuildings(world: GameState['world'], faction: Faction, type: BuildingType): number {
  return countByPredicate(
    world,
    (e) => e.get(Building)?.buildingType === type && e.get(FactionTrait)?.faction === faction,
  );
}

/** Generic entity-counter with a predicate. */
function countByPredicate(world: GameState['world'], pred: (entity: Entity) => boolean): number {
  let n = 0;
  for (const e of world.query(Unit)) if (pred(e)) n += 1;
  for (const e of world.query(Building)) if (pred(e)) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// Rally command
// ---------------------------------------------------------------------------

/**
 * Set a faction's rally point to `tileKey`. Currently only the player faction
 * has a rally state; `faction` is accepted for the symmetric signature.
 */
/**
 * Found a new base from a Settler unit (M_MODES.6 / 4X mode). Consumes
 * the Settler entity, spawns a FactionBase+AttractorBehavior+Building at
 * its tile. Returns the new base entity, or null if the unit isn't a
 * Settler or the tile is occupied.
 *
 * Settlers are how 4X mode lets a faction EXPAND beyond its starting
 * base. The Wonder-race win condition (M_FEATURE.4) plus multiple
 * bases per faction = the classic 4X texture.
 */
export function foundBase(game: GameState, settler: Entity): Entity | null {
  const unit = settler.get(Unit);
  if (unit?.unitType !== 'Settler') return null;
  const faction = settler.get(FactionTrait)?.faction ?? 'player';
  const hex = settler.get(HexPosition);
  if (!hex) return null;
  const tileKey = getHexKey(hex.q, hex.r);
  if (game.buildSites.has(tileKey)) return null;
  if (tileKey === game.townHallKey || tileKey === game.enemyBaseKey) return null;
  // Consume the Settler.
  settler.destroy();
  // Compose the new base. Palace-style: AttractorBehavior + Building +
  // FactionBase + Health.
  const tile = game.board.tiles.get(tileKey);
  const profile = behaviorsFor('Palace');
  const traits = [
    HexPosition({ q: hex.q, r: hex.r, level: hex.level }),
    Building({ buildingType: 'Palace', isComplete: true, progress: 1 }),
    FactionTrait({ faction }),
    ...(profile.attractor ? [AttractorBehavior(profile.attractor)] : []),
    // NB: FactionBase NOT added — only the ORIGINAL base counts as the
    // win/loss anchor. Founded bases are pure economic outposts.
  ];
  const baseEntity = game.world.spawn(...traits);
  game.buildSites.set(tileKey, baseEntity);
  game.buildSitesGeneration += 1;
  if (tile) {
    tile.walkable = false;
    // CodeRabbit MAJOR — pathfinding cached the old walkable=true for
    // this tile; rebuild the navGraph so subsequent finds route around
    // the new base. Without this, units mid-path would walk through it
    // until the next graph rebuild (which only fires on building-
    // complete in buildSystem).
    game.navGraph = buildNavGraph(game.board);
  }
  return baseEntity;
}

/**
 * End the current turn (M_MODES.8). Flips `game.turn.active` and resets
 * the budget. No-op when the game isn't turn-based.
 */
export function endTurn(game: GameState): void {
  if (!game.turn) return;
  game.turn.active = game.turn.active === 'player' ? 'enemy' : 'player';
  game.turn.secondsRemaining = game.turn.turnLength;
}

/**
 * Resign the current match for `faction` (M_MODES.10). Sets `game.outcome`
 * to 'loss' if the resigning faction is the player, 'win' if the enemy.
 * Used by:
 *  - The Resign HUD button (player-initiated surrender).
 *  - The AI ResignEvaluator (auto-resigns when starved out).
 * No-op if the game is already over.
 */
export function resign(game: GameState, faction: Faction = 'player'): void {
  if (game.outcome !== 'playing') return;
  // M_EXPANSION.F.85 — surrender consequences. The victor inherits
  // every zone tile the resigner controlled at the moment of
  // resignation. Without this, the loser's territory evaporates
  // immediately, which reads oddly ("they didn't conquer me — I
  // gave up") and erases the surface area of the surrender from
  // the post-match summary. The victor's controlled set absorbs
  // the loser's; the loser's set drains. zones.generation bumps
  // so the ZoneBorder re-renders.
  const victor: Faction = faction === 'player' ? 'enemy' : 'player';
  const loserZone = game.zones[faction];
  const victorZone = game.zones[victor];
  for (const key of loserZone.controlled) victorZone.controlled.add(key);
  loserZone.controlled.clear();
  loserZone.pulsing.clear();
  victorZone.generation += 1;
  loserZone.generation += 1;
  game.outcome = faction === 'player' ? 'loss' : 'win';
}

export function setRally(game: GameState, tileKey: string, faction: Faction = 'player'): void {
  if (faction !== 'player') return;
  setRallyPoint(game.rally, tileKey);
}

/**
 * M_EXPANSION.F.86 — upgrade a complete Building one tier higher.
 * Tier ladder: 1 → 2 → 3 (max). Returns true on a successful
 * upgrade; false if the building isn't complete, is already at
 * max tier, the player can't afford the delta cost, or the
 * target entity isn't a Building.
 *
 * Per-tier delta cost = base cost × tier (so tier-2 = base × 2,
 * tier-3 = base × 3 — total spend across tiers is base × 6 for a
 * fully-upgraded building). Higher tiers scale supply + producer
 * rate by tier at runtime read time (no SKIN/mesh swap today;
 * see M_BUILD.TIERS.1 follow-up for multi-tile kit composition).
 */
export function upgradeBuilding(
  game: GameState,
  buildingEntity: Entity,
  faction: Faction = 'player',
): boolean {
  const b = buildingEntity.get(Building);
  if (!b) return false;
  if (!b.isComplete) return false;
  if (b.tier >= 3) return false;
  if (buildingEntity.get(FactionTrait)?.faction !== faction) return false;
  // Palace is exempt from upgrades (it's the FactionBase + has
  // no buildingCost — Object.hasOwn guard for the
  // BUILDING_COSTS lookup keeps tsc + the contract happy).
  if (b.buildingType === 'Palace') return false;
  const costs = BUILDING_COSTS as Record<string, ResourceCost>;
  const baseCost = costs[b.buildingType];
  if (!baseCost) return false;
  const nextTier = b.tier + 1;
  // Delta cost = base × (nextTier - 1) so tier 1→2 = 1× base, tier
  // 2→3 = 2× base. Total full-ladder spend = base + 2×base = 3×base.
  const multiplier = nextTier - 1;
  const cost: ResourceCost = {};
  for (const [k, v] of Object.entries(baseCost) as Array<
    [import('@/ecs/components').ResourceType, number]
  >) {
    cost[k] = Math.round(v * multiplier);
  }
  const eco = game.economy[faction];
  if (!spend(eco, cost)) return false;
  buildingEntity.set(Building, { ...b, tier: nextTier });
  // Bump generation so FactionBase re-memos visual + supply recompute fires.
  game.buildSitesGeneration += 1;
  return true;
}

/**
 * M_EXPANSION.F.93 — resource trade. Convert `fromAmount` of one
 * resource into `floor(fromAmount / 3)` of another at the fixed
 * 3:1 ratio. The trade fails (no-op, returns false) if the player
 * can't afford the source amount, or the ratio produces 0 output
 * (so a 2-wood "trade" can't sneak 0-stone through). Symmetric
 * across resource pairs — wood→stone, stone→gold, gold→wood, etc.
 *
 * The 3:1 ratio is the canonical "sink for surplus" RTS rate —
 * the player loses real value on every trade, so it's only worth
 * doing when one resource is genuinely capped while another is
 * starved. Future polish: variable ratio per economy state /
 * Library research (M_EXPANSION.F.86 building upgrade tree).
 */
/**
 * M_CODE_REVIEW.5 — material-only contract. Science and mana are
 * accumulator slots (passive trickle / Library production / Wizard
 * cost) and were never meant to be tradeable like wood/stone/gold.
 * The original spec text "wood→stone, stone→gold, gold→wood, etc."
 * implied this but the type signature admitted the full
 * ResourceType union with no runtime guard. Lock it down.
 *
 * M_SEC_REVIEW.3 — output-side cap: an extreme fromAmount on a
 * save-edited economy could grow eco[toType] without bound, which
 * would break display formatting + balance assumptions. 10^7 is well
 * past any legitimate match's max (a 30-minute Huge game ends with
 * <10^4 of any resource); anything past that is a save-edit attack.
 */
const TRADEABLE_RESOURCES = new Set<import('@/ecs/components').ResourceType>([
  'wood',
  'stone',
  'gold',
]);
const RESOURCE_TRADE_CAP = 10_000_000;
export function tradeResource(
  game: GameState,
  fromType: import('@/ecs/components').ResourceType,
  toType: import('@/ecs/components').ResourceType,
  fromAmount: number,
  faction: Faction = 'player',
): boolean {
  if (fromType === toType) return false;
  if (!TRADEABLE_RESOURCES.has(fromType) || !TRADEABLE_RESOURCES.has(toType)) return false;
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) return false;
  if (fromAmount > RESOURCE_TRADE_CAP) return false;
  const eco = game.economy[faction];
  const out = Math.floor(fromAmount / 3);
  if (out <= 0) return false;
  if (eco[fromType] < fromAmount) return false;
  if (eco[toType] + out > RESOURCE_TRADE_CAP) return false;
  eco[fromType] -= fromAmount;
  eco[toType] += out;
  return true;
}

// ---------------------------------------------------------------------------
// Research command
// ---------------------------------------------------------------------------

/**
 * Purchase and apply a research upgrade for `faction`. Thin wrapper over
 * `applyResearch`. Returns `true` on success.
 */
export function doResearch(game: GameState, id: ResearchId, faction: Faction = 'player'): boolean {
  if (faction !== 'player') return false;
  return applyResearch(game.world, game.economy[faction], game.research, id);
}

// ---------------------------------------------------------------------------
// Selection helpers for TileInteraction
// ---------------------------------------------------------------------------

/** Find an entity on `tileKey` that has Selectable (a unit or building).
 *
 * M_GAME.BUG.6 — peons are AUTONOMOUS and non-interactable. Taps on a
 * peon's tile fall through to building / tile interaction; only
 * military units + buildings respond. The peon's information is
 * irrelevant to the player (they auto-harvest, never wait for orders),
 * so making them clickable was misleading. */
/**
 * M_GAME.MODE.PEON.2 — flip the autonomy mode of a peon entity. No-op
 * if the entity isn't a peon or lacks the PeonAutonomy trait
 * (e.g. an enemy peon shouldn't be commandable by the player). Called
 * from SelectionPanel's "Take command" / "Resume automation" buttons.
 *
 * Side effect: when flipping back to 'auto', the peon's AssignedJob
 * is reset to IDLE so the auto-scheduler picks it up on the next
 * tick. When flipping to 'manual', the AssignedJob is left as-is —
 * the player can immediately issue a Harvest/Build command which
 * will override the current task.
 */
export function setPeonAutoMode(
  _game: GameState,
  entity: Entity,
  mode: 'auto' | 'manual',
): boolean {
  const unit = entity.get(Unit);
  if (unit?.unitType !== 'Peon') return false;
  if (!entity.has(PeonAutonomy)) return false;
  entity.set(PeonAutonomy, { autoMode: mode });
  if (mode === 'auto') {
    const job = entity.get(AssignedJob);
    if (job) entity.set(AssignedJob, { ...job, state: 'IDLE', targetKey: '' });
  }
  return true;
}

export function findSelectableAtTile(game: GameState, tileKey: string): Entity | undefined {
  for (const entity of game.world.query(Selectable, HexPosition)) {
    const hex = entity.get(HexPosition);
    if (!hex || getHexKey(hex.q, hex.r) !== tileKey) continue;
    // M_GAME.MODE.PEON.1 — peons ARE selectable now. The v0.1.20
    // hard skip-peons rule is reverted per
    // docs/specs/200-genre-commitment.md: the player needs to be
    // able to tap a peon to take command of it (flip autoMode →
    // 'manual') or to inspect what it's harvesting. The
    // SelectionPanel decides what verbs to expose based on the
    // peon's PeonAutonomy.autoMode.
    return entity;
  }
  return undefined;
}
