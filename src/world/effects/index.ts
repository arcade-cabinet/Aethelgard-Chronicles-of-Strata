/**
 * world/effects — visual + audio FX layers (M_V13.DECOMP.WORLD-EFFECTS).
 *
 * The particle system (ParticleEmitter archetype + the per-effect
 * consumers), footstep audio, the hazard layers (volcano / wildfire /
 * death-drop / loot-cache), the zone contested pulse, and the
 * world-space text stack (CombatText + ResourceText + the shared
 * WorldBadge billboard + world-text-font loader).
 */
export { type BaseParticle, type ParticleEmitterSpec, ParticleEmitter } from './ParticleEmitter';
export * from './particle-consumers';
export { FootstepEmitter } from './FootstepEmitter';
export { VolcanoLayer } from './VolcanoLayer';
export { WildfireLayer } from './WildfireLayer';
export { DeathDropLayer } from './DeathDropLayer';
export { LootCacheLayer } from './LootCacheLayer';
export { ContestedPulse } from './ContestedPulse';
export { CombatText } from './CombatText';
export { ResourceText } from './ResourceText';
export { WorldBadge, type WorldBadgeProps } from './WorldBadge';
export * from './world-text-font';
