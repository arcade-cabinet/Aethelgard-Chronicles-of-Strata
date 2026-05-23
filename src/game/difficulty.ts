/**
 * AI difficulty level. Controls enemy HP/damage scaling and the portal spawn
 * cadence. Lives in its own module so config loaders can reference the type
 * without importing the heavier `game-state` module (avoids a cycle).
 */
export type Difficulty = 'easy' | 'normal' | 'hard';
