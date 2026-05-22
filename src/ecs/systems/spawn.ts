import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import type { BoardData } from '@/core/board';
import { hexNeighbors } from '@/core/hex';
import { EnemySpawner, HexPosition, type UnitType } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import type { Difficulty } from '@/game/difficulty';

/** Thresholds at which new enemy archetypes unlock (game-seconds). */
const ORC_THRESHOLD: number = COMBAT.spawn.orcThreshold;
const VAMPIRE_THRESHOLD: number = COMBAT.spawn.vampireThreshold;
const WITCH_THRESHOLD: number = COMBAT.spawn.witchThreshold;
const BLACK_KNIGHT_THRESHOLD: number = COMBAT.spawn.blackKnightThreshold;

/**
 * Pick the enemy role for a spawn event. Uses `spawnCount` (deterministic,
 * ECS-persisted) as the selection index — no Math.random(), no external PRNG.
 *
 * Escalation schedule (game-seconds elapsed):
 *  0–299   → Goblin only
 *  300–599 → Goblin × 2, Vampire × 1  (3-cycle)
 *  600–899 → Goblin × 2, Vampire, Orc  (4-cycle)
 *  900–1199→ Goblin × 2, Vampire, Orc, Witch  (5-cycle)
 *  1200+   → Goblin × 2, Vampire, Orc, Witch, BlackKnight  (6-cycle)
 */
export function pickEnemyRole(spawnCount: number, gameElapsed: number): UnitType {
  if (gameElapsed >= BLACK_KNIGHT_THRESHOLD) {
    const cycle = spawnCount % 6;
    if (cycle === 5) return 'BlackKnight';
    if (cycle === 4) return 'Witch';
    if (cycle === 3) return 'Orc';
    if (cycle === 2) return 'Vampire';
    return 'Goblin';
  }
  if (gameElapsed >= WITCH_THRESHOLD) {
    const cycle = spawnCount % 5;
    if (cycle === 4) return 'Witch';
    if (cycle === 3) return 'Orc';
    if (cycle === 2) return 'Vampire';
    return 'Goblin';
  }
  if (gameElapsed >= ORC_THRESHOLD) {
    const cycle = spawnCount % 4;
    if (cycle === 3) return 'Orc';
    if (cycle === 2) return 'Vampire';
    return 'Goblin';
  }
  if (gameElapsed >= VAMPIRE_THRESHOLD) {
    const cycle = spawnCount % 3;
    if (cycle === 2) return 'Vampire';
    return 'Goblin';
  }
  return 'Goblin';
}

/**
 * Advance the enemy base's spawn timer. Each `spawnInterval` seconds the base
 * spawns an enemy on a walkable neighbour tile. The roster escalates with
 * game-elapsed: Goblins first, then Vampires, Orcs, Witches, Black Knights. The
 * spawn count lives on the `EnemySpawner` entity so the escalation cadence
 * survives a save/load round-trip.
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
  world.query(EnemySpawner, HexPosition).updateEach(([spawner, hex]) => {
    spawner.spawnTimer += delta;
    if (spawner.spawnTimer < spawner.spawnInterval) return;
    spawner.spawnTimer = 0;
    spawner.spawnCount += 1;
    const role = pickEnemyRole(spawner.spawnCount, gameElapsed);
    for (const nKey of hexNeighbors(hex.q, hex.r)) {
      const tile = board.tiles.get(nKey);
      if (tile?.walkable) {
        createCharacter({ world, role, q: tile.q, r: tile.r, level: tile.level, difficulty });
        return;
      }
    }
    // fallback: spawn on the base tile itself when no walkable neighbour exists
    createCharacter({ world, role, q: hex.q, r: hex.r, level: hex.level, difficulty });
  });
}
