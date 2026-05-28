/**
 * ecs/systems/combat — the combat + targeting + stance systems
 * (M_DECOMP-ECS-GAME phase 1).
 *
 * Per-tick world mutators for fighting: damage resolution (combat),
 * offensive movement/engage (offensive-behavior), target acquisition
 * (mob-targeting), the wave-defense mode driver, and stance behavior.
 * offensive-behavior consumes combat's DamageEvent type (intra-group).
 */
export { type DamageEvent, combatSystem } from './combat';
export { offensiveBehaviorSystem } from './offensive-behavior';
export { mobTargetingSystem } from './mob-targeting';
export { waveDefenseSystem, waveDefenseProgress } from './wave-defense';
export { stanceBehaviorSystem } from './stance-behavior';
