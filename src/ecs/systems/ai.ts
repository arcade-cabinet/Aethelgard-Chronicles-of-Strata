/**
 * Enemy AI system — thin facade over `src/ai/`.
 *
 * This file keeps the original export so that every existing import path
 * (`@/ecs/systems/ai`) and the call site in `game-state.ts` require zero
 * modification. The implementation has been promoted to the `src/ai/`
 * subpackage (built on yuka) as specified in `docs/specs/97-ai-and-asset-expansion.md`.
 *
 * Observable behaviour is identical:
 *  - Each enemy with no live target finds the nearest player-faction entity
 *    within `AGGRO_RADIUS` and is given an A* path toward it.
 *  - An enemy whose target died retargets (rate-limited to MAX_RETARGETS_PER_TICK).
 */
export { aiSystem, resetAiDirector } from '@/ai/index';
