import type { World } from 'koota';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexLevelKey } from '@/core/hex';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';

/**
 * Parse a `"q,r,level"` path step. Falls back to level 0 for legacy `"q,r"`.
 * NaN-hardens each component (CodeRabbit: `?? 0` only catches `undefined`,
 * not the `NaN` that `Number('foo')` produces from malformed input).
 */
// M_MICRO.2.2 — local parseStep replaced by shared parseHexLevelKey.
const parseStep = parseHexLevelKey;

/**
 * Advance every entity with a PathQueue toward its next tile. When an entity
 * reaches the next step it snaps to that tile, updates HexPosition (including
 * the elevation level carried in the step, so ramp traversal sets the correct
 * Y height), and pops the step. With no steps remaining it stops.
 *
 * @param speedMultiplier — optional multiplier applied to step distance (e.g.
 *   0.8 for rain penalty). Defaults to 1 (no change).
 */
export function pathFollowSystem(world: World, delta: number, speedMultiplier = 1): void {
  world
    .query(HexPosition, Transform, Movement, PathQueue)
    .updateEach(([hex, transform, movement, path]) => {
      const next = path.steps[0];
      if (!next) {
        movement.isMoving = false;
        return;
      }
      movement.isMoving = true;
      const step = parseStep(next);
      const goal = axialToWorld(step.q, step.r);
      const dx = goal.x - transform.x;
      const dz = goal.z - transform.z;
      const dist = Math.hypot(dx, dz);
      const stepDist = movement.speed * delta * speedMultiplier;

      if (dist <= stepDist || dist === 0) {
        // arrive: snap to tile, update logical position + elevation, pop the step
        transform.x = goal.x;
        transform.z = goal.z;
        hex.q = step.q;
        hex.r = step.r;
        hex.level = step.level;
        transform.y = step.level * TILE_HEIGHT;
        path.steps.shift();
        if (path.steps.length === 0) movement.isMoving = false;
      } else {
        // advance toward the tile
        transform.x += (dx / dist) * stepDist;
        transform.z += (dz / dist) * stepDist;
        transform.rotationY = Math.atan2(dx, dz);
        // interpolate Y across the step so a unit climbing a ramp rises
        // smoothly instead of teleporting vertically on arrival
        const fromY = hex.level * TILE_HEIGHT;
        const toY = step.level * TILE_HEIGHT;
        if (fromY !== toY) {
          const tileSpacing = Math.hypot(
            goal.x - axialToWorld(hex.q, hex.r).x,
            goal.z - axialToWorld(hex.q, hex.r).z,
          );
          const progress = tileSpacing > 0 ? 1 - dist / tileSpacing : 1;
          transform.y = fromY + (toY - fromY) * Math.max(0, Math.min(1, progress));
        }
      }
    });
}
