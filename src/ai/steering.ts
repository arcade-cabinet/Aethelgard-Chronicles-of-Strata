/**
 * Steering behaviour factory for enemy Vehicles.
 *
 * Each enemy gets a FollowPathBehavior (steers along the hex-A* route) and an
 * ArriveBehavior (decelerates near the final waypoint). The two behaviours are
 * added to the Vehicle's SteeringManager once at Vehicle creation time; the
 * AiDirector updates the path object in-place each time a new route arrives
 * from A*.
 *
 * Hex coordinates map to world-space via axialToWorld (from core/hex) scaled
 * so one hex tile ≈ 1 world unit.
 */

import type { Vehicle } from 'yuka';
import { ArriveBehavior, FollowPathBehavior, Path, Vector3 } from 'yuka';
import { axialToWorld } from '@/core/hex';

/** Distance (world units) at which the vehicle advances to the next waypoint. */
const NEXT_WAYPOINT_DIST = 0.4;

/** Deceleration when approaching the final waypoint. */
const ARRIVE_DECEL = 3;

/** Tolerance (world units) — vehicle stops when within this distance of target. */
const ARRIVE_TOLERANCE = 0.35;

export interface EnemySteering {
  followPath: FollowPathBehavior;
  arrive: ArriveBehavior;
  path: Path;
}

/**
 * Attach steering behaviours to a newly-created Vehicle and return handles to
 * the mutable path and arrive target so the director can update them.
 */
export function setupVehicleSteering(vehicle: Vehicle): EnemySteering {
  const path = new Path();
  // FollowPathBehavior wraps its own ArriveBehavior internally (yuka defaults);
  // its end-of-path arrival uses those defaults — only the stand-alone
  // ArriveBehavior below is tuned directly, via the public constructor.
  const followPath = new FollowPathBehavior(path, NEXT_WAYPOINT_DIST);
  // Start inactive — activated when a path is loaded.
  followPath.active = false;

  const arrive = new ArriveBehavior(new Vector3(), ARRIVE_DECEL, ARRIVE_TOLERANCE);
  // Start inactive — activated when a target is assigned.
  arrive.active = false;

  vehicle.steering.add(followPath);
  // ArriveBehavior is used stand-alone when the path is empty.
  vehicle.steering.add(arrive);

  return { followPath, arrive, path };
}

/**
 * Replace the path waypoints from a fresh A* route (list of hex keys like "q,r").
 *
 * The route is a plain list of "q,r" strings (keys from the NavGraph). The
 * function converts each to a world-space Vector3 (y = 0 for flat movement
 * in the steering layer — vertical level differences are handled by koota's
 * pathFollow system, not by yuka steering).
 */
/**
 * Replace the path waypoints from a fresh A* route and activate the behavior.
 * @param followPath - The FollowPathBehavior to update.
 * @param route      - Array of "q,r" hex key strings.
 */
export function updatePath(followPath: FollowPathBehavior, route: readonly string[]): void {
  const { path } = followPath;
  path.clear();
  for (const key of route) {
    const parts = key.split(',');
    const q = Number(parts[0]);
    const r = Number(parts[1]);
    const { x, z } = axialToWorld(q, r);
    path.add(new Vector3(x, 0, z));
  }
  followPath.active = route.length > 0;
}

/**
 * Point the stand-alone ArriveBehavior at the target's world position.
 * Used when the enemy is adjacent to the target and no longer needs a path.
 */
export function setArriveTarget(arrive: ArriveBehavior, q: number, r: number): void {
  const { x, z } = axialToWorld(q, r);
  arrive.target.set(x, 0, z);
  arrive.active = true;
}
