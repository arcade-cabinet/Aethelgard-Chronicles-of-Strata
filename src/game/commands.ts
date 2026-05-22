import { getHexKey } from '@/core/hex';
import { findPath } from '@/core/pathfinding';
import {
  AssignedJob,
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  HexPosition,
  PathQueue,
  Selectable,
  Unit,
} from '@/ecs/components';
import type { Entity } from 'koota';
import { BUILDING_COSTS, canBuild } from '@/rules';
import { spend } from './economy';
import type { GameState } from './game-state';
import { type ResearchId, applyResearch } from './research';
import { setRallyPoint } from './rally';

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

/** True when `entity` belongs to `faction` (or has no faction trait at all). */
function ownedBy(entity: Entity, faction: Faction): boolean {
  const ft = entity.get(FactionTrait);
  return ft === undefined || ft.faction === faction;
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
  const path = findPath(game.navGraph, startKey, targetKey);
  if (!path || path.length < 2) return null;
  const steps = path.slice(1).map((key) => toLeveledStep(game, key));
  unit.set(PathQueue, { steps });
  return path;
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
  type: Exclude<BuildingType, 'TownHall'>,
  faction: Faction = 'player',
): boolean {
  const occupied = new Set<string>([game.townHallKey, ...game.buildSites.keys()]);
  const economy = game.economy[faction];

  const check = canBuild(game.board, occupied, tileKey, type, economy);
  if (!check.ok) return false;

  if (!spend(economy, BUILDING_COSTS[type])) return false;

  const tile = game.board.tiles.get(tileKey);
  const level = tile?.level ?? 0;

  // Mark the tile unwalkable so units path around the building site.
  if (tile) tile.walkable = false;

  const buildingEntity = game.world.spawn(
    HexPosition({ q: tile?.q ?? 0, r: tile?.r ?? 0, level }),
    Building({ buildingType: type, isComplete: false, progress: 0 }),
    FactionTrait({ faction }),
  );
  game.buildSites.set(tileKey, buildingEntity);

  // Assign the nearest idle peon OF THE ISSUING FACTION to build.
  let nearestPeon: Entity | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  const tileData = game.board.tiles.get(tileKey);
  for (const entity of game.world.query(Unit, AssignedJob, HexPosition, FactionTrait)) {
    if (entity.get(Unit)?.unitType !== 'Peon') continue;
    if (entity.get(FactionTrait)?.faction !== faction) continue;
    const job = entity.get(AssignedJob);
    if (!job || job.state !== 'IDLE') continue;
    const hex = entity.get(HexPosition);
    if (!hex) continue;
    const dist = Math.abs(hex.q - (tileData?.q ?? 0)) + Math.abs(hex.r - (tileData?.r ?? 0));
    if (dist < nearestDist) {
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
// Rally command
// ---------------------------------------------------------------------------

/**
 * Set a faction's rally point to `tileKey`. Currently only the player faction
 * has a rally state; `faction` is accepted for the symmetric signature.
 */
export function setRally(game: GameState, tileKey: string, faction: Faction = 'player'): void {
  if (faction !== 'player') return;
  setRallyPoint(game.rally, tileKey);
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

/** Find an entity on `tileKey` that has Selectable (a unit or building). */
export function findSelectableAtTile(game: GameState, tileKey: string): Entity | undefined {
  for (const entity of game.world.query(Selectable, HexPosition)) {
    const hex = entity.get(HexPosition);
    if (hex && getHexKey(hex.q, hex.r) === tileKey) return entity;
  }
  return undefined;
}
