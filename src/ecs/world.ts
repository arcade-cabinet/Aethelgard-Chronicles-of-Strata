import { type World, createWorld } from 'koota';

/** Create a fresh koota ECS world. One world exists per play session. */
export function createEcsWorld(): World {
  return createWorld();
}
