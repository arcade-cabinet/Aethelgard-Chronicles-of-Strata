import type { World } from 'koota';
import { FactionBase, Health } from '@/ecs/components';

/** The end-state of a session. */
export type GameOutcome = 'playing' | 'win' | 'loss';

/**
 * Evaluate the win/loss condition symmetrically over the `FactionBase` entities:
 * the player loses when their home base's Health reaches 0; the player wins when
 * the enemy base's Health reaches 0. Loss takes precedence if both fall on the
 * same tick. This is faction-symmetric — the same rule scores either side.
 */
export function evaluateWinLoss(world: World): GameOutcome {
  let playerBaseAlive = false;
  let playerBaseExists = false;
  let enemyBaseAlive = false;
  let enemyBaseExists = false;

  for (const e of world.query(FactionBase, Health)) {
    const faction = e.get(FactionBase)?.faction;
    const alive = (e.get(Health)?.current ?? 0) > 0;
    if (faction === 'player') {
      playerBaseExists = true;
      if (alive) playerBaseAlive = true;
    } else if (faction === 'enemy') {
      enemyBaseExists = true;
      if (alive) enemyBaseAlive = true;
    }
  }

  if (playerBaseExists && !playerBaseAlive) return 'loss';
  if (enemyBaseExists && !enemyBaseAlive) return 'win';
  return 'playing';
}
