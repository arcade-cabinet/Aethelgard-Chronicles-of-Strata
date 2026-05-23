/**
 * Factory for yuka Vehicles representing enemy units.
 *
 * Tuning is kept here so it is easy to adjust without touching the director.
 * All values are in world-space units (1 unit = 1 hex tile with HEX_SCALE=1).
 */
import { Vehicle } from 'yuka';
import { setupVehicleSteering } from './steering';

/** Maximum speed (world units per second). */
const MAX_SPEED = 2.0;

/** Maximum force the vehicle can apply. */
const MAX_FORCE = 80;

/** Mass (kg) — affects how quickly force changes velocity. */
const MASS = 1;

/**
 * Create a yuka Vehicle, position it at world-space (x, 0, z), and wire up
 * the FollowPath + Arrive steering behaviours.
 */
export function createVehicle(x: number, z: number): Vehicle {
  const v = new Vehicle();
  v.position.set(x, 0, z);
  v.maxSpeed = MAX_SPEED;
  v.maxForce = MAX_FORCE;
  v.mass = MASS;
  // Orientation auto-tracking is not needed — koota controls rotation.
  v.updateOrientation = false;

  setupVehicleSteering(v);

  return v;
}
