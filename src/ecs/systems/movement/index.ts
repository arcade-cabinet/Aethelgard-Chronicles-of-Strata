/**
 * ecs/systems/movement — locomotion + animation per-tick systems
 * (M_DECOMP-ECS-GAME phase 1): job-routing, path-follow, engineer-repair,
 * wander, animation.
 */
export { type ClipName, clipForState, animationSystem } from './animation';
export { engineerRepairSystem } from './engineer-repair';
export { type PeonRoutingContext, jobRoutingSystem } from './job-routing';
export { pathFollowSystem } from './path-follow';
export { wanderSystem } from './wander';
