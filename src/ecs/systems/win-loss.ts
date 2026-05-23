import type { World } from 'koota';
import { FactionBase, Health } from '@/ecs/components';

/** The end-state of a session. */
export type GameOutcome = 'playing' | 'win' | 'loss';

/**
 * Evaluate the win/loss condition symmetrically over the `FactionBase` entities:
 * the player loses when their home base's Health reaches 0; the player wins when
 * the enemy base's Health reaches 0. Loss takes precedence if both fall on the
 * same tick.
 *
 * MONOTONIC: once the outcome flips to 'win' or 'loss', it never flips back —
 * passing the prior outcome short-circuits. This guards against a base being
 * despawned after destruction (which buildingDeathSystem prevents today via
 * FactionBase-exempt, but a defensive latch costs nothing). Faction-symmetric
 * — the same rule scores either side.
 */
export function evaluateWinLoss(world: World, prior: GameOutcome = 'playing'): GameOutcome {
  if (prior !== 'playing') return prior;
  let playerAlive = false;
  let enemyAlive = false;
  let playerSeen = false;
  let enemySeen = false;
  for (const e of world.query(FactionBase, Health)) {
    const faction = e.get(FactionBase)?.faction;
    const alive = (e.get(Health)?.current ?? 0) > 0;
    if (faction === 'player') {
      playerSeen = true;
      if (alive) playerAlive = true;
    } else if (faction === 'enemy') {
      enemySeen = true;
      if (alive) enemyAlive = true;
    }
  }
  if (playerSeen && !playerAlive) return 'loss';
  if (enemySeen && !enemyAlive) return 'win';
  return 'playing';
}
