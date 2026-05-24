import { GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import { hexDistance, hexNeighbors, parseHexKey } from '@/core/hex';
import {
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  HexPosition,
  Stance,
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
    // M_FUN.QA.AIVAI.TUNE — train inherits the military weight (not
    // build) since training units IS military investment. This
    // closes the Builder-vs-Builder loop where both sides built
    // forever without ever fielding a unit.
    this.brain.addEvaluator(new TrainEvaluator(p.weights.military));
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

/** Total complete buildings the faction owns. M_FUN.QA.AIVAI.TUNE saturation curve input. */
function totalOwnedBuildings(game: GameState, faction: Faction): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Building)?.isComplete) n += 1;
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

/**
 * M_FUN.QA.AIVAI.TUNE — count owned military units. Used by the
 * must-train floor in TrainEvaluator so a Builder vs Builder match
 * doesn't loop on build-forever with zero combat.
 */
function ownedMilitaryCount(game: GameState, faction: Faction): number {
  let n = 0;
  const MILITARY = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet']);
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    const t = e.get(Unit)?.unitType;
    if (t && MILITARY.has(t)) n += 1;
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
  // M_FUN.QA.AIVAI.TUNE.PATTERN-B — rage-quit fallback. If we've been
  // playing for RAGE_QUIT_THRESHOLD sim-seconds without ever spotting
  // an enemy through legitimate observation, target a WALKABLE
  // neighbour of the opposing base. The base tile itself is
  // non-walkable (CodeRabbit fix), so findPath to it would return
  // null. The first walkable neighbour suffices — combat tick will
  // engage the base from there once the unit arrives.
  const RAGE_QUIT_THRESHOLD = 180;
  if (game.clock.elapsed >= RAGE_QUIT_THRESHOLD) {
    const oppBaseKey = faction === 'player' ? game.enemyBaseKey : game.townHallKey;
    const { q: bq, r: br } = parseHexKey(oppBaseKey);
    for (const nKey of hexNeighbors(bq, br)) {
      const tile = game.board.tiles.get(nKey);
      if (tile?.walkable) return nKey;
    }
  }
  return null;
}

/**
 * A free walkable tile near the faction's base. Tries radius-1
 * neighbours first (the historical behaviour); if every immediate
 * neighbour is blocked (water/mountain/build site/opposing base),
 * expands to radius 2 by sweeping each radius-1 neighbour's
 * neighbours. Stops at radius 2 — going further risks the AI
 * stamping a Farm into mid-map territory which silently moves
 * encroachment goal posts. Reviewer-fix M_FUN.QA.AIVAI.TUNE.
 */
function freeBuildTile(game: GameState, faction: Faction): string | null {
  const baseKey = baseKeyFor(game, faction);
  const { q: bq, r: br } = parseHexKey(baseKey);
  const blocked = (key: string) =>
    key === game.townHallKey || key === game.enemyBaseKey || game.buildSites.has(key);
  // Radius 1 — preserve original neighbour-ordered iteration.
  for (const nKey of hexNeighbors(bq, br)) {
    if (blocked(nKey)) continue;
    const tile = game.board.tiles.get(nKey);
    if (tile?.walkable) return nKey;
  }
  // Radius 2 fallback — neighbours-of-neighbours. Visit in stable
  // order (sorted on the eventual hex key) so the choice is
  // deterministic across seeds.
  const r2: string[] = [];
  for (const nKey of hexNeighbors(bq, br)) {
    const { q, r } = parseHexKey(nKey);
    for (const nnKey of hexNeighbors(q, r)) {
      if (nnKey === baseKey) continue;
      if (blocked(nnKey)) continue;
      const tile = game.board.tiles.get(nnKey);
      if (!tile?.walkable) continue;
      // Make sure it's actually distance 2 (skip radius-1 hits).
      if (hexDistance(tile.q, tile.r, bq, br) !== 2) continue;
      r2.push(nnKey);
    }
  }
  r2.sort();
  return r2[0] ?? null;
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
    // M_FUN.QA.AIVAI.TUNE — diminishing returns past 6 buildings.
    // Without this a Builder personality (build weight 1.5) keeps
    // out-scoring military forever, even after the base is fully
    // built up — matches stall at "two factions of farms" with
    // zero combat. Each building past the 6th halves the bias.
    const builtCount = owner.game ? totalOwnedBuildings(owner.game, owner.faction) : 0;
    const saturationMul = builtCount <= 6 ? 1.0 : 1.0 / (1 + (builtCount - 6) * 0.5);
    return 0.7 * bias * profile.buildWeight * defensiveMul * this.personalityMul * saturationMul;
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
    // M_FUN.QA.AIVAI.TUNE — House first regardless of cap. Without
    // it the AI never establishes a supply pipeline; combined with
    // the M_FUN.QA.AIVAI.TUNE BASELINE_SUPPLY_CAP=5 this means a
    // first House takes a faction from 5→9 supply cap, unblocking
    // a third Footman / second Peon.
    if (!atCap && ownedBuildingCount(game, faction, 'House') < 2) priority.push('House');
    priority.push('Farm'); // supply ceiling
    const enemySighted = discoveredEnemyTile(game, faction) !== null;
    if (ownedBuildingCount(game, faction, 'Barracks') === 0 && enemySighted)
      priority.push('Barracks');
    if (atCap) priority.push('Granary'); // additional peon ceiling
    // Watchtower if enemy seen + we don't already have one (defends the
    // observed-battlefield gap).
    if (ownedBuildingCount(game, faction, 'Watchtower') === 0 && enemySighted)
      priority.push('Watchtower');
    // M_FUN.QA.AIVAI.TUNE — Wall is the resource-cheap fallback
    // (0 wood, 60 stone). Available without a Barracks so a wood-
    // starved AI can still place SOMETHING and not loop forever
    // on Build → null → Train.
    if (ownedBuildingCount(game, faction, 'Wall') < 2) priority.push('Wall');

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
    // M_FUN.QA.AIVAI.TUNE.PATTERN-B — once rage-quit kicks in
    // (game elapsed past RAGE_QUIT_THRESHOLD), Military desirability
    // OVERRIDES Build — we've sat on builds too long, time to
    // engage. Without this boost the Builder personality keeps
    // out-scoring military forever even after we have a target.
    const RAGE_QUIT_THRESHOLD = 180;
    const ragequit = owner.game.clock.elapsed >= RAGE_QUIT_THRESHOLD;
    const hasTarget = discoveredEnemyTile(owner.game, owner.faction);
    if (!hasTarget) return 0;
    return ragequit ? 1.5 * bias * modeMul : 0.6 * bias * modeMul;
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
    const defendKey = firstPulsingTile(owner.game, owner.faction);
    const target = defendKey ?? discoveredEnemyTile(owner.game, owner.faction);
    if (!target) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    // M_FUN.QA.AIVAI.TUNE.PATTERN-B — send EVERY ready military unit
    // (not just the first one) AND flip its stance to 'aggressive'
    // so it pursues opportunistically en route. Previously only the
    // first Footman moved; the rest sat at base in 'defensive'
    // stance and never engaged anyone outside their commanded-tile
    // engage radius. In AI-vs-AI matchups where bases are
    // ~10 hexes apart, that's the difference between 0 kills and
    // a finished match.
    let any = false;
    for (const e of owner.game.world.query(Unit, FactionTrait)) {
      if (e.get(FactionTrait)?.faction !== owner.faction) continue;
      const utype = e.get(Unit)?.unitType;
      if (!utype || !MILITARY_TYPES.has(utype)) continue;
      // Flip stance to aggressive so the unit chases targets it
      // sees mid-route, not just sits idle at the destination.
      if (e.has(Stance)) e.set(Stance, { mode: 'aggressive' });
      const path = moveUnit(owner.game, e, target, owner.faction);
      if (path) any = true;
    }
    this.status = any ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (any) owner.lastGoal = defendKey ? 'defend' : 'move-military';
  }
}

const MILITARY_TYPES = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet']);

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
  /**
   * M_FUN.QA.AIVAI.TUNE — personality bias on training. Default 1.0
   * = neutral. Builder underweights, Raider/Mad-King overweight.
   */
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickTrainable(owner);
    if (!choice) return 0;
    // M_FUN.QA.AIVAI.TUNE — must-train floor: if the faction has
    // ZERO military units and there's an enemy on the board, training
    // is the only path to ever scoring a kill. Override the bias
    // ladder when this is the case so a heavy Builder never gets
    // stuck in "build-forever" loops vs another Builder.
    if (owner.game && choice === 'Footman') {
      const ownMilitary = ownedMilitaryCount(owner.game, owner.faction);
      if (ownMilitary === 0) return 1.1;
    }
    return 0.75 * this.personalityMul;
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
