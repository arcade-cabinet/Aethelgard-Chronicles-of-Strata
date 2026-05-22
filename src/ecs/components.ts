import { trait } from 'koota';

/** A unit class. Source: docs/specs/50-ecs-model.md. */
export type UnitType = 'Peon' | 'Footman' | 'Goblin' | 'Orc';

/** Faction ownership for targeting and AI. */
export type Faction = 'player' | 'enemy';

/** Animation state — drives which clip a character plays. */
export type AnimState = 'IDLE' | 'MOVING' | 'HARVESTING' | 'ATTACKING' | 'DYING' | 'BUILDING';

/** World-space transform. R3f reads this to drive the Three.js object. */
export const Transform = trait({ x: 0, y: 0, z: 0, rotationY: 0 });

/** The tile an entity occupies — source of truth for logical grid position. */
export const HexPosition = trait({ q: 0, r: 0, level: 0 });

/** Marks an entity as a unit and records its class. */
export const Unit = trait({ unitType: 'Peon' as UnitType });

/** Faction ownership. */
export const FactionTrait = trait({ faction: 'player' as Faction });

/** Movement capability and current motion state. */
export const Movement = trait({ speed: 2, isMoving: false });

/** Remaining A* path steps (tile keys) to the destination. */
export const PathQueue = trait((): { steps: string[] } => ({ steps: [] }));

/**
 * Current animation state. The KayKit clip name is derived from this via
 * `clipForState` (animation.ts) — not stored, so the two cannot drift.
 */
export const AnimationState = trait({ state: 'IDLE' as AnimState });

/** Whether the entity is currently selected by the player. */
export const Selectable = trait({ isSelected: false });
