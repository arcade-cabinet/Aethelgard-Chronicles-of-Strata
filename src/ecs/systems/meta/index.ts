/**
 * ecs/systems/meta — cross-cutting / match-level per-tick systems
 * (M_DECOMP-ECS-GAME phase 1): ai (re-export of the @/ai director),
 * diplomat-contact, status-attributes, win-loss.
 */
export { aiSystem, resetAiDirector } from './ai';
export { diplomatContactSystem } from './diplomat-contact';
export { statusAttributesSystem } from './status-attributes';
export { type GameOutcome, evaluateWinLoss } from './win-loss';
