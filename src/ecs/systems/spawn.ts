import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { hexNeighbors } from '@/core/hex';
import { GoblinPortalTrait, HexPosition } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import type { Difficulty } from '@/game/game-state';

/** Game-seconds after which the portal also spawns Orcs. */
const ORC_THRESHOLD = 600;

/** Running spawn counter per portal entity id — for deterministic Orc cadence. */
const spawnCounts = new Map<number, number>();

/**
 * Reset the per-portal spawn counters. Called by `startGame` so a new session
 * does not inherit a stale Orc-cadence counter from a previous world.
 */
export function clearSpawnCounts(): void {
  spawnCounts.clear();
}

/**
 * Advance the Goblin Portal's spawn timer. Each `spawnInterval` seconds it
 * spawns an enemy on a walkable neighbor tile — a Goblin, or (past
 * `ORC_THRESHOLD` game-seconds) every third spawn an Orc.
 *
 * `difficulty` is optional (defaults to 'normal') so that existing 4-arg
 * test call-sites continue to work without changes.
 */
export function spawnSystem(
  world: World,
  board: BoardData,
  delta: number,
  gameElapsed: number,
  difficulty: Difficulty = 'normal',
): void {
  world.query(GoblinPortalTrait, HexPosition).updateEach(([portal, hex], portalEntity) => {
    portal.spawnTimer += delta;
    if (portal.spawnTimer < portal.spawnInterval) return;
    portal.spawnTimer = 0;
    const id = Number(portalEntity);
    const count = (spawnCounts.get(id) ?? 0) + 1;
    spawnCounts.set(id, count);
    const role = gameElapsed >= ORC_THRESHOLD && count % 3 === 0 ? 'Orc' : 'Goblin';
    for (const nKey of hexNeighbors(hex.q, hex.r)) {
      const tile = board.tiles.get(nKey);
      if (tile?.walkable) {
        createCharacter({ world, role, q: tile.q, r: tile.r, level: tile.level, difficulty });
        return;
      }
    }
    // fallback: spawn on the portal tile itself when no walkable neighbor exists
    createCharacter({ world, role, q: hex.q, r: hex.r, level: hex.level, difficulty });
  });
}
