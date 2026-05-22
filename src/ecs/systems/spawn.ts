import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey, hexNeighbors } from '@/core/hex';
import { GoblinPortalTrait, HexPosition } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';

/**
 * Advance the Goblin Portal's spawn timer. Each `spawnInterval` seconds it
 * spawns a Goblin on a walkable tile adjacent to the portal.
 */
export function spawnSystem(world: World, board: BoardData, delta: number): void {
  world.query(GoblinPortalTrait, HexPosition).updateEach(([portal, hex]) => {
    portal.spawnTimer += delta;
    if (portal.spawnTimer < portal.spawnInterval) return;
    portal.spawnTimer = 0;
    // find a walkable neighbor tile for the spawn
    for (const nKey of hexNeighbors(hex.q, hex.r)) {
      const tile = board.tiles.get(nKey);
      if (tile?.walkable) {
        createCharacter({ world, role: 'Goblin', q: tile.q, r: tile.r, level: tile.level });
        return;
      }
    }
    // fallback: spawn on the portal tile itself
    void getHexKey;
    createCharacter({ world, role: 'Goblin', q: hex.q, r: hex.r, level: hex.level });
  });
}
