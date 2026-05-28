/**
 * ecs/systems/lifecycle — entity create/destroy per-tick systems
 * (M_DECOMP-ECS-GAME phase 1): build (construction), spawn, death,
 * building-death.
 */
export { buildSystem } from './build';
export { buildingDeathSystem } from './building-death';
export { type DeathSystemResult, lootForBiome, deathSystem } from './death';
export { pickEnemyRole, spawnSystem } from './spawn';
