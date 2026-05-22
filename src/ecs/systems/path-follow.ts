import type { World } from 'koota';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';

/**
 * Advance every entity with a PathQueue toward its next tile. When an entity
 * reaches the next step it snaps to that tile, updates HexPosition, and pops the
 * step. With no steps remaining it stops (isMoving = false).
 */
export function pathFollowSystem(world: World, delta: number): void {
  world.query(HexPosition, Transform, Movement, PathQueue).updateEach(([hex, transform, movement, path]) => {
    const next = path.steps[0];
    if (!next) {
      movement.isMoving = false;
      return;
    }
    movement.isMoving = true;
    const [nq, nr] = next.split(',').map(Number);
    const goal = axialToWorld(nq ?? 0, nr ?? 0);
    const dx = goal.x - transform.x;
    const dz = goal.z - transform.z;
    const dist = Math.hypot(dx, dz);
    const stepDist = movement.speed * delta;

    if (dist <= stepDist || dist === 0) {
      // arrive: snap to tile, update logical position, pop the step
      transform.x = goal.x;
      transform.z = goal.z;
      hex.q = nq ?? hex.q;
      hex.r = nr ?? hex.r;
      transform.y = hex.level * TILE_HEIGHT;
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
