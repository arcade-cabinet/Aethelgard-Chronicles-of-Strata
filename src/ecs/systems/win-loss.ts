import type { World } from 'koota';
import { Building, GoblinPortalTrait, Health } from '@/ecs/components';

/** The end-state of a session. */
export type GameOutcome = 'playing' | 'win' | 'loss';

/**
 * Evaluate the win/loss condition. Win when the Goblin Portal's Health reaches
 * 0; loss when the Town Hall's Health reaches 0. Loss takes precedence if both
 * fall on the same tick (the player has lost their base).
 */
export function evaluateWinLoss(world: World): GameOutcome {
  let townHallDead = false;
  for (const e of world.query(Building, Health)) {
    if (e.get(Building)?.buildingType === 'TownHall' && (e.get(Health)?.current ?? 1) <= 0) {
      townHallDead = true;
    }
  }
  if (townHallDead) return 'loss';

  let portalAlive = false;
  for (const e of world.query(GoblinPortalTrait, Health)) {
    if ((e.get(Health)?.current ?? 0) > 0) portalAlive = true;
  }
  // a session always has a portal — if none is alive, it was destroyed
  const portalExists = world.query(GoblinPortalTrait).length > 0;
  if (portalExists && !portalAlive) return 'win';

  return 'playing';
}
