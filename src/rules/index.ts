/**
 * `src/rules/` — the rules engine.
 *
 * The single, faction-agnostic source of game-rule *knowledge*. Pure
 * TypeScript: no yuka, no koota, no three. Everything here answers a question
 * about what is legal or what should happen — and is consulted by all three
 * layers (spec 101):
 *
 * - the ECS systems (mechanical execution),
 * - the human-UI driver (greying out illegal actions),
 * - the AI-player driver (scoring goals over the same legality).
 *
 * Because human and AI consult the identical rules, AI-vs-AI is a true
 * interface test.
 */

export {
  BUILDING_COSTS,
  BUILDING_SUPPLY,
  type PlacementCheck,
  canBuild,
} from './placement';
export {
  SUPPLY_COST,
  UNIT_COSTS,
  canAddPeon,
  canTrain,
  canTrainComplete,
  peonCap,
  recomputeMaxSupply,
} from './economy-rules';
export {
  type PeonAction,
  type PeonView,
  type PeonWorld,
  type ResourceSite,
  nextPeonAction,
} from './peon-rules';
export { ATTRACTOR_GUARANTEE, ATTRACTOR_RADIUS, ensureAttractorResources } from './attractor';
export {
  BUILDING_BEHAVIORS,
  type BuildingBehaviorProfile,
  behaviorsFor,
} from './building-behaviors';
export {
  BUILDING_DISPLAY,
  type BuildingDisplay,
  displayFor,
  trainableUnits,
  trainerFor,
} from './display';
export type { Discovery } from './discoveries';
export { DISCOVERIES, discoveryById } from './discovery-registry';
export { applyArmor, armorMultiplier } from './damage';
