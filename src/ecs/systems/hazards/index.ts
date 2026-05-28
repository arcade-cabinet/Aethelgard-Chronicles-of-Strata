/**
 * ecs/systems/hazards — environmental hazard per-tick systems
 * (M_DECOMP-ECS-GAME phase 1): volcano, quake, wildfire, encroachment
 * (zone pressure is a slow environmental hazard on the board).
 */
export { encroachmentSystem } from './encroachment';
export { type QuakeResult, triggerQuake } from './quake';
export {
  type VolcanoState,
  createVolcanoState,
  placeVolcanoLandmark,
  volcanoSystem,
} from './volcano';
export {
  type BurnState,
  type WildfireTickResult,
  igniteWildfire,
  wildfireSystem,
} from './wildfire';
