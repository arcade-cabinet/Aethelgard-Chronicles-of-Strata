import { GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import { hexNeighbors, parseHexKey } from '@/core/hex';
import {
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { moveUnit, placeBuilding, resign, trainUnit } from '@/game/commands';
import { canAfford } from '@/game/economy';
import { SKINS } from '@/rules/skins';
import { aiProfileFor, endgameUrgencyFor } from './ai-profiles';
import { DEFAULT_PERSONALITY, personalityFor } from '@/config/ai-personalities';
import { announceAiTaunt } from './taunt';
import { baseKeyFor, type GameState } from '@/game/game-state';
import { canBuild, peonCap, UNIT_COSTS } from '@/rules';

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

  /** Seconds the faction has been "starved" (M_MODES.10) — accumulates across ticks. */
  starvedFor = 0;

  /**
   * M_FUN.AI.NAMED — opponent personality key (e.g. 'the-builder',
   * 'the-raider'). Multiplies per-Evaluator desirability so each
   * named opponent plays a distinct style. Defaults to the
   * 'default' personality from ai-personalities.json.
   */
  readonly personalityKey: string;

  constructor(faction: Faction, personalityKey?: string) {
    super();
    this.faction = faction;
    this.personalityKey = personalityKey ?? DEFAULT_PERSONALITY;
    const p = personalityFor(this.personalityKey);
    this.brain = new AiBrain(this);
    this.brain.addEvaluator(new BuildEvaluator(p.weights.build));
    this.brain.addEvaluator(new TrainEvaluator());
    this.brain.addEvaluator(new MilitaryEvaluator(p.weights.military));
    // M_EXPANSION.S.55 — patrol verb (verb 5 of 5). Idle military
    // units circulate the zone perimeter when there's no enemy in
    // sight + no defensive trigger. Without this they stand at base
    // waiting for the next raid, which reads as inert AI.
    this.brain.addEvaluator(new PatrolEvaluator(p.weights.patrol));
    this.brain.addEvaluator(new ResignEvaluator());
  }

  /**
   * Drive the AI for `delta` game-seconds against the current `game`. Named
   * `tick` (not `update`) to avoid shadowing yuka's GameEntity.update.
   */
  tick(game: GameState, delta: number): void {
    this.game = game;
    // Accumulate starvation continuously (independent of decisionInterval) —
    // ResignEvaluator reads this each arbitration.
    const zone = game.zones[this.faction];
    const eco = game.economy[this.faction];
    const starved = zone.controlled.size === 0 && eco.wood < 10 && eco.gold < 10 && eco.stone < 10;
    this.starvedFor = starved ? this.starvedFor + delta : 0;
    this.elapsed += delta;
    if (this.elapsed < this.decisionInterval) return;
    this.elapsed -= this.decisionInterval;
    const prevGoal = this.lastGoal;
    this.brain.arbitrate();
    this.brain.execute();
    // M_FUN.AI.TAUNT — announce the AI's new goal via aria-live when
    // it changes (enemy faction only; ally announcements would clutter
    // the screen-reader stream). Player-faction AI in AI-vs-AI mode
    // doesn't taunt — only the OPPONENT does.
    if (this.faction === 'enemy' && this.lastGoal && this.lastGoal !== prevGoal) {
      const p = personalityFor(this.personalityKey);
      announceAiTaunt(p.displayName, this.lastGoal);
    }
  }
}

/** The Think brain over the AiPlayer's evaluators. */
class AiBrain extends Think<AiPlayer> {}

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
  // M_REGISTRY.14 — baseKeyFor() is the single faction → baseKey source.
  const baseKey = baseKeyFor(game, faction);
  const { q: bq, r: br } = parseHexKey(baseKey);
  // Both faction-base tiles are off-limits (CodeRabbit HIGH-4 symmetric fix):
  // the AI must not stamp a Farm onto the player's TownHall if its base
  // happens to be adjacent.
  for (const nKey of hexNeighbors(bq, br)) {
    if (nKey === game.townHallKey || nKey === game.enemyBaseKey) continue;
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
  /**
   * M_FUN.AI.NAMED — personality multiplier. Default 1.0 = neutral.
   * the-builder=1.5 (eager to build), the-mad-king=0.4 (rarely builds).
   */
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickBuildable(owner);
    if (!choice) return 0;
    // M_EXPANSION.S.53 — per-faction economyFocus bias from SKINS.
    const bias = SKINS[owner.faction].brain?.economyFocus ?? 1.0;
    // M_AI_AWARE.1 — per-mode AI profile. coexistence sets
    // buildWeight to 0 so the AI never expands. strata-wars sets
    // 1.3 so it builds more eagerly than border-clash.
    const profile = aiProfileFor(owner.game?.mode);
    // M_AI_AWARE.1 — Wall/Watchtower defensive priority depends on
    // whether bases can actually be destroyed. long-reign sets
    // defensiveBuildWeight=0 (invulnerable bases → no point).
    const defensiveTypes: ReadonlyArray<string> = ['Wall', 'Watchtower'];
    const defensiveMul = defensiveTypes.includes(choice as string)
      ? profile.defensiveBuildWeight
      : 1.0;
    return 0.7 * bias * profile.buildWeight * defensiveMul * this.personalityMul;
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

    // Priority (M_AI_DEPTH.4 — building diversity): economy first, then
    // military, then territorial defence. Earlier-priority types are tried
    // first; placement succeeds when any is buildable on the chosen tile.
    const priority: Array<Exclude<BuildingType, 'TownHall'>> = [];
    if (atCap) priority.push('House'); // immediate cap-pressure relief
    priority.push('Farm'); // supply ceiling
    const enemySighted = discoveredEnemyTile(game, faction) !== null;
    if (ownedBuildingCount(game, faction, 'Barracks') === 0 && enemySighted)
      priority.push('Barracks');
    if (atCap) priority.push('Granary'); // additional peon ceiling
    // Watchtower if enemy seen + we don't already have one (defends the
    // observed-battlefield gap).
    if (ownedBuildingCount(game, faction, 'Watchtower') === 0 && enemySighted)
      priority.push('Watchtower');
    // Wall once we have a military presence (closes a gap in the perimeter).
    if (
      ownedBuildingCount(game, faction, 'Wall') < 2 &&
      ownedBuildingCount(game, faction, 'Barracks') > 0
    )
      priority.push('Wall');

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

/**
 * Score the desire to send a military unit. Defending a pulsing tile we
 * own is prioritised over attacking (M_AI_DEPTH.3) — losing a tile to
 * encroachment costs the AI its zone of control.
 */
class MilitaryEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (!firstMilitary(owner.game, owner.faction)) return 0;
    // M_EXPANSION.S.53 — per-faction aggressiveness bias.
    const bias = SKINS[owner.faction].brain?.aggressiveness ?? 1.0;
    // M_AI_AWARE.1 — per-mode militaryWeight. coexistence sets 0
    // (AI never attacks); frontier-raid sets 1.6 (rush hard).
    const profile = aiProfileFor(owner.game.mode);
    // M_AI_AWARE.1 — endgame urgency multiplier: when we're inside
    // the last `urgencyThreshold` turns of a turn-capped mode, scale
    // military by `endgameUrgencyMultiplier` to rush the final score.
    const urgency = endgameUrgencyFor(
      owner.game.mode,
      owner.game.turn?.turnsElapsed,
      owner.game.turn?.maxTurns,
    );
    const modeMul = profile.militaryWeight * urgency * this.personalityMul;
    // higher score when a tile we own is pulsing — defence is urgent
    if (firstPulsingTile(owner.game, owner.faction)) return 0.85 * bias * modeMul;
    return discoveredEnemyTile(owner.game, owner.faction) ? 0.6 * bias * modeMul : 0;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new MoveMilitaryGoal(owner));
  }
}

/** Find the first pulsing tile in our own zone — what needs defending. */
function firstPulsingTile(game: GameState, faction: Faction): string | null {
  const zone = game.zones[faction];
  for (const key of zone.pulsing.keys()) return key;
  return null;
}

/**
 * Send the first ready military unit. Prefers a pulsing-tile defend target
 * over attack; falls back to attack if nothing pulses.
 */
class MoveMilitaryGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    const unit = firstMilitary(owner.game, owner.faction);
    const defendKey = firstPulsingTile(owner.game, owner.faction);
    const target = defendKey ?? discoveredEnemyTile(owner.game, owner.faction);
    if (!unit || !target) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const path = moveUnit(owner.game, unit, target, owner.faction);
    this.status = path ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (path) owner.lastGoal = defendKey ? 'defend' : 'move-military';
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

// ---------------------------------------------------------------------------
// Resign evaluator + goal (M_MODES.10) — AI surrender when starved out.
// ---------------------------------------------------------------------------

/** Seconds of continuous starvation before the AI resigns. */
const STARVATION_THRESHOLD = 300;

/**
 * The AI surrenders when its faction is "starved" for STARVATION_THRESHOLD
 * seconds (0 controlled tiles AND economy below sustenance). Wins arbitration
 * (desirability 1.0) the moment the threshold is crossed so the brain
 * immediately fires the ResignGoal instead of futile build/train/move.
 */
class ResignEvaluator extends GoalEvaluator<AiPlayer> {
  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (owner.game.outcome !== 'playing') return 0;
    // CodeRabbit MAJOR: starve-resign is the long-reign-mode win condition
    // ONLY. Other modes have base-destruction as the proper outcome; an
    // AI resigning early would short-circuit those matches.
    if (owner.game.mode !== 'long-reign') return 0;
    const zone = owner.game.zones[owner.faction];
    const eco = owner.game.economy[owner.faction];
    const starved = zone.controlled.size === 0 && eco.wood < 10 && eco.gold < 10 && eco.stone < 10;
    if (!starved) {
      owner.starvedFor = 0;
      return 0;
    }
    return owner.starvedFor >= STARVATION_THRESHOLD ? 1 : 0;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new ResignGoal(owner));
  }
}

/** Issue the resign command on behalf of the AI's faction. */
class ResignGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    resign(owner.game, owner.faction);
    owner.lastGoal = 'resign';
    this.status = Goal.STATUS.COMPLETED;
  }
}

// ---------------------------------------------------------------------------
// Patrol evaluator + goal — verb 5 of 5 (M_EXPANSION.S.55)
// ---------------------------------------------------------------------------

/**
 * Idle military units patrol the zone perimeter when nothing else
 * needs doing. Fires when:
 *   - AI has at least one military unit
 *   - No enemy is visible (MilitaryEvaluator would return 0)
 *   - No defensive trigger (no pulsing tile)
 *   - AI mode allows military (coexistence sets profile.militaryWeight=0
 *     which zeroes patrol too — peaceful tribe doesn't patrol either)
 *
 * Picks a random zone-controlled tile on the perimeter (any tile
 * whose neighbour hex falls outside the zone) and moves the first
 * idle military unit there. Re-rolls each tick so patrols stay
 * unpredictable from the player's perspective.
 */
class PatrolEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (owner.game.outcome !== 'playing') return 0;
    if (!firstMilitary(owner.game, owner.faction)) return 0;
    // Don't patrol if there's a real combat trigger — MilitaryEvaluator
    // wins (higher score) in those cases anyway. This guard keeps the
    // evaluator cheap (skip the perimeter scan when irrelevant).
    if (firstPulsingTile(owner.game, owner.faction)) return 0;
    if (discoveredEnemyTile(owner.game, owner.faction)) return 0;
    // M_AI_AWARE.1 — coexistence + other low-military profiles
    // patrol less (or not at all). The militaryWeight directly
    // scales patrol desirability so coexistence's 0 silences it.
    const profile = aiProfileFor(owner.game.mode);
    // Low base score (0.25) — patrol is the LOWEST-priority verb,
    // beaten by every concrete need.
    return 0.25 * profile.militaryWeight * this.personalityMul;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new PatrolGoal(owner));
  }
}

/** Move one idle military unit to a random perimeter tile of the AI's zone. */
class PatrolGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    const unit = firstMilitary(owner.game, owner.faction);
    const perimeter = randomPerimeterTile(owner.game, owner.faction);
    if (!unit || !perimeter) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const path = moveUnit(owner.game, unit, perimeter, owner.faction);
    this.status = path ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (path) owner.lastGoal = 'patrol';
  }
}

/**
 * Pick a random tile on the perimeter of the faction's controlled
 * zone — a tile we own that has at least one non-controlled neighbour.
 * Returns null if the zone is empty or fully landlocked (no perimeter).
 * Uses the faction's brain RNG bias slot is not relevant here; the
 * randomness is presentation-level (a different patrol target each
 * tick), not sim-determinism-critical.
 */
function randomPerimeterTile(game: GameState, faction: Faction): string | null {
  const zone = game.zones[faction];
  if (zone.controlled.size === 0) return null;
  // Deterministic perimeter walk — iterate the Set into a sorted
  // array so AI-vs-AI determinism holds across worlds (Set iteration
  // order is insertion order, which can vary if zone updates land in
  // different sequences). Picking via game.eventRng (not Math.random)
  // is the determinism contract.
  const controlledSorted = [...zone.controlled].sort();
  const perim: string[] = [];
  // Hex neighbours: 6 axial offsets — module-level constant for
  // determinism + perf.
  const NEIGHBORS: ReadonlyArray<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  for (const key of controlledSorted) {
    const tile = game.board.tiles.get(key);
    if (!tile) continue;
    for (const [dq, dr] of NEIGHBORS) {
      const nkey = `${tile.q + dq},${tile.r + dr}`;
      if (!zone.controlled.has(nkey)) {
        perim.push(key);
        break;
      }
    }
  }
  if (perim.length === 0) return null;
  return perim[Math.floor(game.eventRng() * perim.length)] ?? null;
}
