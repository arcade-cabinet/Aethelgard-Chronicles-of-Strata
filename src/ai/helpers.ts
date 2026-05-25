/**
 * M_FUN.REFACTOR.AI-SPLIT — shared helper functions for AI evaluators and goals.
 *
 * These were private functions inside ai-player.ts. Extracted here so each
 * evaluator module can import only what it uses without circular deps.
 */
import { hexNeighbors, parseHexKey } from '@/core/hex';
import { Building, type BuildingType, type Faction, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { matchElapsedSeconds } from '@/game/match-time';
import { MILITARY_ROLES } from '@/rules/unit-profiles';

/** This faction's buildings of `type` — both completed and in-progress. */
export function ownedBuildingCount(game: GameState, faction: Faction, type: BuildingType): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Building)?.buildingType === type) n += 1;
  }
  return n;
}

/** Total complete buildings the faction owns. Saturation curve input. */
export function totalOwnedBuildings(game: GameState, faction: Faction): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Building)?.isComplete) n += 1;
  }
  return n;
}

/** This faction's peon count (used vs. peonCap). */
export function ownedPeonCount(game: GameState, faction: Faction): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Unit)?.unitType === 'Peon') n += 1;
  }
  return n;
}

/** Count owned military units. Used by the must-train floor in TrainEvaluator. */
export function ownedMilitaryCount(game: GameState, faction: Faction): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    const t = e.get(Unit)?.unitType;
    if (t && MILITARY_ROLES.has(t)) n += 1;
  }
  return n;
}

/** This faction's first ready military entity (a Footman), or null. */
export function firstMilitary(game: GameState, faction: Faction) {
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    if (e.get(Unit)?.unitType === 'Footman') return e;
  }
  return null;
}

/** Find the first pulsing tile in our own zone — what needs defending. */
export function firstPulsingTile(game: GameState, faction: Faction): string | null {
  const zone = game.zones[faction];
  for (const key of zone.pulsing.keys()) return key;
  return null;
}

/**
 * A tile key from the faction's controlled zone that the AI could attack.
 * Falls back to the rage-quit path when no enemy is spotted but the
 * per-personality rageQuitThreshold is exceeded.
 */
export function discoveredEnemyTile(
  game: GameState,
  faction: Faction,
  rageQuitThreshold: number,
): string | null {
  const myZone = game.zones[faction].controlled;
  for (const e of game.world.query(FactionTrait, HexPosition)) {
    if (e.get(FactionTrait)?.faction === faction) continue;
    const h = e.get(HexPosition);
    if (!h) continue;
    const key = `${h.q},${h.r}`;
    if (myZone.has(key) || game.zones[faction].observed.has(key)) return key;
  }
  // Rage-quit fallback: target a walkable neighbour of the opposing base.
  if (matchElapsedSeconds(game) >= rageQuitThreshold) {
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
 * A free walkable tile near the faction's base.
 * Radius-1 first; falls back to radius-2 (sorted for determinism).
 */
import { hexDistance } from '@/core/hex';
import { baseKeyFor } from '@/game/game-state';

export function freeBuildTile(game: GameState, faction: Faction): string | null {
  const baseKey = baseKeyFor(game, faction);
  const { q: bq, r: br } = parseHexKey(baseKey);
  const blocked = (key: string) =>
    key === game.townHallKey || key === game.enemyBaseKey || game.buildSites.has(key);
  for (const nKey of hexNeighbors(bq, br)) {
    if (blocked(nKey)) continue;
    const tile = game.board.tiles.get(nKey);
    if (tile?.walkable) return nKey;
  }
  const r2: string[] = [];
  for (const nKey of hexNeighbors(bq, br)) {
    const { q, r } = parseHexKey(nKey);
    for (const nnKey of hexNeighbors(q, r)) {
      if (nnKey === baseKey) continue;
      if (blocked(nnKey)) continue;
      const tile = game.board.tiles.get(nnKey);
      if (!tile?.walkable) continue;
      if (hexDistance(tile.q, tile.r, bq, br) !== 2) continue;
      r2.push(nnKey);
    }
  }
  r2.sort();
  return r2[0] ?? null;
}

/**
 * Pick a random tile on the perimeter of the faction's controlled zone.
 * Returns null if the zone is empty or fully landlocked.
 */
export function randomPerimeterTile(game: GameState, faction: Faction): string | null {
  const zone = game.zones[faction];
  if (zone.controlled.size === 0) return null;
  const controlledSorted = [...zone.controlled].sort();
  const perim: string[] = [];
  for (const key of controlledSorted) {
    const tile = game.board.tiles.get(key);
    if (!tile) continue;
    for (const nkey of hexNeighbors(tile.q, tile.r)) {
      if (!zone.controlled.has(nkey)) {
        perim.push(key);
        break;
      }
    }
  }
  if (perim.length === 0) return null;
  return perim[Math.floor(game.eventRng() * perim.length)] ?? null;
}
