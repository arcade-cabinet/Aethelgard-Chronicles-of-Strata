import { getHexKey } from '@/core/hex';
import { findPath } from '@/core/pathfinding';
import {
  AssignedJob,
  Building,
  type BuildingType,
  FactionTrait,
  HexPosition,
  PathQueue,
  Selectable,
  Unit,
} from '@/ecs/components';
import type { GameState } from './game-state';
import { canPlaceBuilding, BUILDING_COSTS } from './build';
import { applyResearch, type ResearchId } from './research';
import { setRallyPoint } from './rally';
import { spend } from './economy';

/**
 * Encode a path tile key into a `"q,r,level"` step. The level travels with the
 * step so the path-follow system can set the pawn's Y height on ramp traversal
 * without holding a board reference.
 */
function toLeveledStep(game: GameState, key: string): string {
  const tile = game.board.tiles.get(key);
  return `${key},${tile?.level ?? 0}`;
}

/**
 * Issue a move order: path the player pawn to `targetKey`. Runs A* from the
 * pawn's current tile; on success writes the path (excluding the start tile,
 * each step carrying its elevation level) into the pawn's PathQueue and returns
 * the tile-key path. Returns null when the target is unreachable, leaving the
 * queue untouched.
 */
export function planMoveOrder(game: GameState, targetKey: string): string[] | null {
  const hex = game.playerPawn.get(HexPosition);
  if (!hex) return null;
  const startKey = getHexKey(hex.q, hex.r);
  const path = findPath(game.navGraph, startKey, targetKey);
  if (!path || path.length < 2) return null;
  // drop the start tile — the pawn is already there
  const steps = path.slice(1).map((key) => toLeveledStep(game, key));
  game.playerPawn.set(PathQueue, { steps });
  return path;
}

/**
 * Issue a move order, returning whether a path was found. Thin boolean wrapper
 * over `planMoveOrder` for callers that do not need the path itself.
 */
export function issueMoveOrder(game: GameState, targetKey: string): boolean {
  return planMoveOrder(game, targetKey) !== null;
}

// ---------------------------------------------------------------------------
// Build command
// ---------------------------------------------------------------------------

/**
 * Place a building of `type` on `tileKey`. Validates via `canPlaceBuilding`,
 * deducts the cost, spawns the incomplete Building entity into `game.buildSites`,
 * and assigns the nearest idle peon to BUILDING state.
 *
 * Returns `true` on success, `false` if the placement is invalid.
 */
export function placeBuilding(
  game: GameState,
  tileKey: string,
  type: Exclude<BuildingType, 'TownHall'>,
): boolean {
  // Build the set of currently occupied tiles.
  const occupied = new Set<string>([game.townHallKey, ...game.buildSites.keys()]);

  const check = canPlaceBuilding(game.board, occupied, tileKey, type, game.economy);
  if (!check.ok) return false;

  if (!spend(game.economy, BUILDING_COSTS[type])) return false;

  const tile = game.board.tiles.get(tileKey);
  const level = tile?.level ?? 0;

  // Mark the tile unwalkable so units path around the building site.
  if (tile) tile.walkable = false;

  const buildingEntity = game.world.spawn(
    HexPosition({ q: tile?.q ?? 0, r: tile?.r ?? 0, level }),
    Building({ buildingType: type, isComplete: false, progress: 0 }),
    FactionTrait({ faction: 'player' }),
  );
  game.buildSites.set(tileKey, buildingEntity);

  // Assign the nearest idle peon to build.
  let nearestPeon = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  const tileData = game.board.tiles.get(tileKey);
  for (const entity of game.world.query(Unit, AssignedJob, HexPosition)) {
    const u = entity.get(Unit);
    if (u?.unitType !== 'Peon') continue;
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
 * Set the Barracks rally point to `tileKey`. Thin wrapper over
 * `setRallyPoint` from the rally module.
 */
export function setRally(game: GameState, tileKey: string): void {
  setRallyPoint(game.rally, tileKey);
}

// ---------------------------------------------------------------------------
// Research command
// ---------------------------------------------------------------------------

/**
 * Purchase and apply a research upgrade. Thin wrapper over `applyResearch`
 * from the research module. Returns `true` on success.
 */
export function doResearch(game: GameState, id: ResearchId): boolean {
  return applyResearch(game.world, game.economy, game.research, id);
}

// ---------------------------------------------------------------------------
// Selection helpers for TileInteraction
// ---------------------------------------------------------------------------

/** Find an entity on `tileKey` that has Selectable (a unit or building). */
export function findSelectableAtTile(
  game: GameState,
  tileKey: string,
): import('koota').Entity | undefined {
  for (const entity of game.world.query(Selectable, HexPosition)) {
    const hex = entity.get(HexPosition);
    if (hex && getHexKey(hex.q, hex.r) === tileKey) return entity;
  }
  return undefined;
}
