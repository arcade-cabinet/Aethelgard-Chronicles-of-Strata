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

export { ATTRACTOR_GUARANTEE, ATTRACTOR_RADIUS, ensureAttractorResources } from './attractor';
export { type BuildingBehaviorProfile, behaviorsFor } from './building-behaviors';
// M_REGISTRY.5 — unified building Thing registry. Re-exported for the
// surfaces (HUD, AI, commands) that previously read 5 different tables.
// trainableUnits / trainerFor now live on the unified registry (M_REGISTRY.5).
export {
  BUILDING_PROFILES,
  type BuildingProfile,
  type DisplaySlot,
  type ProducerSlot,
  profileFor,
  trainableUnits,
  trainerFor,
} from './building-profiles';
export { applyArmor, armorMultiplier } from './damage';
export type { Discovery } from './discoveries';
export type { DiscoveryChain } from '@/config/progression';
export { depthOf, scaledCostFor, scaleForDepth } from './discovery-cost';
export { DISCOVERIES, discoveryById } from './discovery-registry';
export {
  type BuildingDisplay,
  displayFor,
  HEALTH_BAR_STOPS,
  type HealthBarStop,
  healthBarColor,
  RESOURCE_DISPLAY,
  type ResourceDisplay,
  resourceDisplayFor,
} from './display';
export {
  canAddPeon,
  canTrain,
  canTrainComplete,
  peonCap,
  recomputeMaxSupply,
  SUPPLY_COST,
  type TrainableUnit,
  UNIT_COSTS,
} from './economy-rules';
export { type FieldParams, sampleField } from './force-field';
export { buildGateMap, materialiseGate, tilePassable } from './gates';
export {
  type MapType,
  type MatchLength,
  MODE_PRESETS,
  type ModePreset,
  presetFor,
  type TurnsMode,
} from './mode-presets';
export {
  nextPeonAction,
  type PeonAction,
  type PeonView,
  type PeonWorld,
  type ResourceSite,
} from './peon-rules';
export {
  BUILDING_COSTS,
  BUILDING_SUPPLY,
  canBuild,
  type PlacementCheck,
} from './placement';
export {
  RESOURCE_PROFILES,
  type ResourceProfile,
  resourceProfileFor,
} from './resource-profiles';
export {
  biomeOf,
  clearBit,
  hasBit,
  packBiome,
  setBit,
  setControlled,
  TILE_BIT,
} from './tile-bits';
