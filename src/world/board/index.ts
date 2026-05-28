/**
 * world/board — the entities ON the board (M_V13.DECOMP.WORLD-BOARD).
 *
 * Everything rendered/placed atop the terrain: units (+ their builder
 * badge + health billboard), faction bases + structures (+ construction
 * ring, structure-models, portal-stones), resource nodes (+ spawn
 * rules), projectiles, rally markers, stacks + formations, barbarian
 * camps, and the selection/outline/tracking/zone-border ring visuals.
 */
export { Units } from './Units';
export { BuilderBadge } from './BuilderBadge';
export { HealthBillboard, type HealthBillboardProps } from './HealthBillboard';
export { SelectionRing } from './SelectionRing';
export { UnitHexOutline } from './UnitHexOutline';
export { BuildingOutlineRing } from './BuildingOutlineRing';
export { ConstructionRing } from './ConstructionRing';
export { FactionBase } from './FactionBase';
export { ResourceNodes } from './ResourceNodes';
export { ProjectileLayer } from './ProjectileLayer';
export { RallyMarker, resolveBarracksPos } from './RallyMarker';
export { StackRender } from './StackRender';
export { ZoneBorder } from './ZoneBorder';
export { TrackingRings, type TrackingRingsHandle } from './TrackingRings';
export {
  type BarbarianCampSpec,
  defaultCampCount,
  campCountForMapSize,
  placeBarbarianCamps,
  factionConfigForCamp,
  spawnBarbarianCamp,
} from './barbarian-camps';
export {
  type MemberAggregate,
  type CombinedStats,
  type FormationSpec,
  FORMATIONS,
  defaultFormationFor,
  dominantUnitTypeOf,
} from './formations';
export { structureModel } from './structure-models';
export {
  type PortalStonePair,
  findPortalStoneCandidates,
  placePortalStones,
  PORTAL_STONE_COOLDOWN_SECONDS,
  isPortalStoneAvailable,
  tickPortalStonesTrigger,
  refreshPortalStoneCooldown,
} from './portal-stones';
export {
  type ResourceNodePlan,
  SAFETY_RADIUS,
  tierMultipliers,
  spawnResourceNodes,
} from './resource-spawn';
