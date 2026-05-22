import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import type { BoardData } from '@/core/board';
import { hexNeighbors } from '@/core/hex';
import { GoblinPortalTrait, HexPosition } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import type { Difficulty } from '@/game/difficulty';

/** Game-seconds after which the portal also spawns Orcs. */
const ORC_THRESHOLD: number = COMBAT.spawn.orcThreshold;

/**
 * Advance the Goblin Portal's spawn timer. Each `spawnInterval` seconds it
 * spawns an enemy on a walkable neighbor tile — a Goblin, or (past
 * `ORC_THRESHOLD` game-seconds) every third spawn an Orc. The spawn count
 * lives on the `GoblinPortalTrait` entity, so the Orc cadence survives a
 * save/load round-trip.
 *
 * `difficulty` is optional (defaults to 'normal') so existing 4-arg test
 * call-sites keep working.
 */
export function spawnSystem(
  world: World,
  board: BoardData,
  delta: number,
  gameElapsed: number,
  difficulty: Difficulty = 'normal',
): void {
  world.query(GoblinPortalTrait, HexPosition).updateEach(([portal, hex]) => {
    portal.spawnTimer += delta;
    if (portal.spawnTimer < portal.spawnInterval) return;
    portal.spawnTimer = 0;
    portal.spawnCount += 1;
    const role = gameElapsed >= ORC_THRESHOLD && portal.spawnCount % 3 === 0 ? 'Orc' : 'Goblin';
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
