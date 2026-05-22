import type { Entity, World } from 'koota';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import {
  AnimationState,
  type Faction,
  FactionTrait,
  HexPosition,
  Movement,
  PathQueue,
  Selectable,
  Transform,
  Unit,
  type UnitType,
} from '@/ecs/components';

/** Per-role base stats. Source: docs/specs/50-ecs-model.md entity archetypes. */
const ROLE_STATS: Record<UnitType, { speed: number; faction: Faction }> = {
  Peon: { speed: 3, faction: 'player' },
  Footman: { speed: 2.5, faction: 'player' },
  Goblin: { speed: 2, faction: 'enemy' },
  Orc: { speed: 1.5, faction: 'enemy' },
};

/** Parameters for spawning a character entity. */
export interface CreateCharacterParams {
  /** The koota world to spawn into. */
  world: World;
  /** Unit role — selects stats, faction, mesh, and rig. */
  role: UnitType;
  /** Axial tile the character spawns on. */
  q: number;
  /** Axial tile the character spawns on. */
  r: number;
  /** Elevation level of the spawn tile. */
  level: number;
  /** Whether the character starts selected (the player pawn does). */
  selected?: boolean;
}

/**
 * Spawn a character ECS entity. One parameterized factory for every unit role:
 * it assembles the archetype's trait set (Transform, HexPosition, Unit, Faction,
 * Movement, PathQueue, AnimationState, Selectable) with role-appropriate values.
 * The r3f layer renders entities that carry these traits.
 */
export function createCharacter(params: CreateCharacterParams): Entity {
  const { world, role, q, r, level, selected = false } = params;
  const stats = ROLE_STATS[role];
  const { x, z } = axialToWorld(q, r);
  return world.spawn(
    HexPosition({ q, r, level }),
    Transform({ x, y: level * TILE_HEIGHT, z, rotationY: 0 }),
    Unit({ unitType: role }),
    FactionTrait({ faction: stats.faction }),
    Movement({ speed: stats.speed, isMoving: false }),
    PathQueue({ steps: [] }),
    AnimationState({ state: 'IDLE' }),
    Selectable({ isSelected: selected }),
  );
}
