import type { World } from 'koota';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';

/** Parse a `"q,r,level"` path step. Falls back to level 0 for legacy `"q,r"`. */
function parseStep(step: string): { q: number; r: number; level: number } {
  const [q, r, level] = step.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0, level: level ?? 0 };
}

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
      }
    });
}
