import { GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import {
  AssignedJob,
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { hexNeighbors } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { moveUnit, placeBuilding, trainUnit } from '@/game/commands';
import { canAfford } from '@/game/economy';
import { UNIT_COSTS, canBuild, peonCap } from '@/rules';

/**
 * Goal-driven AI player for one faction (spec 100/101/102).
 *
 * `AiPlayer extends GameEntity` so it can own a yuka `Think` brain. The brain
 * arbitrates a small set of `GoalEvaluator`s — one per *commander verb* — that
 * score desires from the faction's KNOWN (zone + observed) state and then
 * issue commands through the SAME `commands.ts` channel a human uses. All
 * legality lives in `src/rules/`; the AI is thin scoring + dispatch.
 *
 * Modeled on pond-warfare's Governor pattern. No `scout` goal — peons auto-
 * claim by exploitation (spec 101); exploration is emergent.
 */

// ---------------------------------------------------------------------------
// Owner context (the slice of GameState each Goal/Evaluator needs)
// ---------------------------------------------------------------------------

/** AiPlayer owns this minimal context — the slice rules + commands read. */
export class AiPlayer extends GameEntity {
  /** Live game pointer set each tick by `update`. */
  game!: GameState;
  readonly faction: Faction;
  readonly brain: AiBrain;
  /** Game-seconds between brain arbitrations — a human-like cadence. */
  private decisionInterval = 3;
  private elapsed = 0;
  /** Name of the goal chosen on the last arbitration — for tests / transcripts. */
  lastGoal: string | null = null;

  constructor(faction: Faction) {
    super();
    this.faction = faction;
    this.brain = new AiBrain(this);
    this.brain.addEvaluator(new BuildEvaluator());
    this.brain.addEvaluator(new TrainEvaluator());
    this.brain.addEvaluator(new MilitaryEvaluator());
  }

  /**
   * Drive the AI for `delta` game-seconds against the current `game`. Named
   * `tick` (not `update`) to avoid shadowing yuka's GameEntity.update.
   */
  tick(game: GameState, delta: number): void {
    this.game = game;
    this.elapsed += delta;
    if (this.elapsed < this.decisionInterval) return;
    this.elapsed -= this.decisionInterval;
    this.brain.arbitrate();
    this.brain.execute();
  }
}

/** The Think brain over the AiPlayer's evaluators. */
class AiBrain extends Think<AiPlayer> {
  constructor(owner: AiPlayer) {
    super(owner);
  }
}

// ---------------------------------------------------------------------------
// Shared helpers (faction-scoped reads from KNOWN state)
// ---------------------------------------------------------------------------

/**
 * This faction's buildings of `type` — both completed and in-progress.
 * Queries the ECS world rather than only `game.buildSites` (which omits the
 * Town Hall and any future bases spawned outside the build-site map).
 */
function ownedBuildingCount(game: GameState, faction: Faction, type: BuildingType): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Building)?.buildingType === type) n += 1;
  }
  return n;
}

/** This faction's peon count (used vs. peonCap). */
function ownedPeonCount(game: GameState, faction: Faction): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Unit)?.unitType === 'Peon') n += 1;
  }
  return n;
}

/** This faction's first ready military entity (a Footman), or null. */
function firstMilitary(game: GameState, faction: Faction) {
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Unit)?.unitType === 'Footman') return e;
  }
  return null;
}

/** A tile key from the faction's controlled zone that the AI could attack. */
function discoveredEnemyTile(game: GameState, faction: Faction): string | null {
  const myZone = game.zones[faction].controlled;
  for (const e of game.world.query(FactionTrait, HexPosition)) {
    if (e.get(FactionTrait)?.faction === faction) continue;
    const h = e.get(HexPosition);
    if (!h) continue;
    const key = `${h.q},${h.r}`;
    // an enemy on a tile WE control = we definitely know about it (own zone),
    // OR a tile we currently observe (the observed battlefield).
    if (myZone.has(key) || game.zones[faction].observed.has(key)) return key;
  }
  return null;
}

/** A free walkable tile adjacent to the faction's base for placing a building. */
function freeBuildTile(game: GameState, faction: Faction): string | null {
  const baseKey = faction === 'player' ? game.townHallKey : game.enemyBaseKey;
  const [bq, br] = baseKey.split(',').map(Number);
  for (const nKey of hexNeighbors(bq ?? 0, br ?? 0)) {
    const tile = game.board.tiles.get(nKey);
    if (tile?.walkable && !game.buildSites.has(nKey)) return nKey;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build evaluator + goal — verb 1 of 3
// ---------------------------------------------------------------------------

/** Decide what (if anything) to build next; the highest-priority unmet need wins. */
class BuildEvaluator extends GoalEvaluator<AiPlayer> {
  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickBuildable(owner);
    return choice ? 0.7 : 0;
  }

  setGoal(owner: AiPlayer): void {
    const choice = this.pickBuildable(owner);
    if (!choice) return;
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new BuildGoal(owner, choice));
  }

  /** The first need in priority order whose rules.canBuild succeeds. */
  pickBuildable(owner: AiPlayer): Exclude<BuildingType, 'TownHall'> | null {
    const { game, faction } = owner;
    if (!game) return null;
    const eco = game.economy[faction];
    const peons = ownedPeonCount(game, faction);
    const houses = ownedBuildingCount(game, faction, 'House');
    const granaries = ownedBuildingCount(game, faction, 'Granary');
    const atCap = peons >= peonCap(houses, granaries);

    // priority — economy first (cap-pressure for more peons), then military
    const priority: Array<Exclude<BuildingType, 'TownHall'>> = [];
    if (atCap) priority.push('House');
    priority.push('Farm');
    if (ownedBuildingCount(game, faction, 'Barracks') === 0 && discoveredEnemyTile(game, faction))
      priority.push('Barracks');
    if (atCap) priority.push('Granary');

    const tile = freeBuildTile(game, faction);
    if (!tile) return null;
    for (const type of priority) {
      if (canBuild(game.board, new Set(game.buildSites.keys()), tile, type, eco).ok) return type;
    }
    return null;
  }
}

/** Issue the chosen build via the shared `commands.placeBuilding`. */
class BuildGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly buildingType: Exclude<BuildingType, 'TownHall'>,
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const tile = freeBuildTile(owner.game, owner.faction);
    if (!tile) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const ok = placeBuilding(owner.game, tile, this.buildingType, owner.faction);
    this.status = ok ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (ok) owner.lastGoal = `build:${this.buildingType}`;
  }
}

// ---------------------------------------------------------------------------
// Military evaluator + goal — verb 3 of 3 (move-military)
// ---------------------------------------------------------------------------

/** Score the desire to send a military unit at a known enemy. */
class MilitaryEvaluator extends GoalEvaluator<AiPlayer> {
  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (!firstMilitary(owner.game, owner.faction)) return 0;
    return discoveredEnemyTile(owner.game, owner.faction) ? 0.6 : 0;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new MoveMilitaryGoal(owner));
  }
}

/** Send the first ready military unit at the discovered enemy. */
class MoveMilitaryGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    const unit = firstMilitary(owner.game, owner.faction);
    const target = discoveredEnemyTile(owner.game, owner.faction);
    if (!unit || !target) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const path = moveUnit(owner.game, unit, target, owner.faction);
    this.status = path ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (path) owner.lastGoal = 'move-military';
  }
}

// ---------------------------------------------------------------------------
// Train evaluator + goal — verb 2 of 3 (M_AI_DEPTH.2)
// ---------------------------------------------------------------------------

/**
 * Decide what (if anything) to train this tick. Priority:
 *   1. Peon if peon-cap allows + at least one is missing (always grow the
 *      economy).
 *   2. Footman if a Barracks exists and the AI can afford one.
 */
class TrainEvaluator extends GoalEvaluator<AiPlayer> {
  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickTrainable(owner);
    return choice ? 0.75 : 0; // slightly higher than build — training is the
    // closest-loop way to convert resources into capability
  }

  setGoal(owner: AiPlayer): void {
    const choice = this.pickTrainable(owner);
    if (!choice) return;
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new TrainGoal(owner, choice));
  }

  pickTrainable(owner: AiPlayer): 'Peon' | 'Footman' | null {
    const { game, faction } = owner;
    if (!game) return null;
    const eco = game.economy[faction];
    // peons first — more workers → more economy
    const peons = ownedPeonCount(game, faction);
    const houses = ownedBuildingCount(game, faction, 'House');
    const granaries = ownedBuildingCount(game, faction, 'Granary');
    if (peons < peonCap(houses, granaries) && canAfford(eco, UNIT_COSTS.Peon)) return 'Peon';
    // footman if Barracks exists + affordable
    if (ownedBuildingCount(game, faction, 'Barracks') > 0 && canAfford(eco, UNIT_COSTS.Footman))
      return 'Footman';
    return null;
  }
}

/** Issue the chosen train via the shared `commands.trainUnit`. */
class TrainGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly role: 'Peon' | 'Footman',
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const ok = trainUnit(owner.game, this.role, owner.faction);
    this.status = ok ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (ok) owner.lastGoal = `train:${this.role}`;
  }
}

// AssignedJob import is reserved for future fine-grained goals (e.g. assign
// idle peon to a specific consumer); kept in the import set so adding a goal
// later is a one-line trait change.
void AssignedJob;
