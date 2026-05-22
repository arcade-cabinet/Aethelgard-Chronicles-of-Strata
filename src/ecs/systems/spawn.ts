import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey, hexNeighbors } from '@/core/hex';
import { GoblinPortalTrait, HexPosition } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';

/** Game-seconds after which the portal also spawns Orcs. */
const ORC_THRESHOLD = 600;

/** Running spawn counter per portal entity id — for deterministic Orc cadence. */
const spawnCounts = new Map<number, number>();

/**
 * Advance the Goblin Portal's spawn timer. Each `spawnInterval` seconds it
 * spawns an enemy on a walkable neighbor tile — a Goblin, or (past
 * `ORC_THRESHOLD` game-seconds) every third spawn an Orc.
 */
export function spawnSystem(
  world: World,
  board: BoardData,
  delta: number,
  gameElapsed: number,
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
        createCharacter({ world, role, q: tile.q, r: tile.r, level: tile.level });
        return;
      }
    }
    // fallback: spawn on the portal tile itself
    void getHexKey;
    createCharacter({ world, role, q: hex.q, r: hex.r, level: hex.level });
  });
}
