import type { Entity, World } from 'koota';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import {
  AnimationState,
  AssignedJob,
  Carrier,
  Combatant,
  EnemyTarget,
  type Faction,
  FactionTrait,
  Harvester,
  Health,
  HexPosition,
  Movement,
  PathQueue,
  Selectable,
  Transform,
  Unit,
  type UnitType,
} from '@/ecs/components';
import type { Difficulty } from '@/game/game-state';
import combatConfigRaw from '@/config/combat.json';

/** Typed shape of the combat config JSON. */
interface CombatConfig {
  unitStats: Record<string, { speed: number; faction: string; hp?: number; attackDamage?: number; attackRange?: number; attackCooldown?: number }>;
  difficultyMultiplier: Record<string, number>;
  damage: { critChance: number; varianceMax: number };
  deathDelay: number;
  spawn: { orcThreshold: number; spawnIntervalByDifficulty: Record<string, number> };
  ai: { aggroRadius: number };
}
const combatConfig = combatConfigRaw as CombatConfig;

/** Per-difficulty HP/damage multipliers applied to enemy roles only. */
const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: combatConfig.difficultyMultiplier['easy'] as number,
  normal: combatConfig.difficultyMultiplier['normal'] as number,
  hard: combatConfig.difficultyMultiplier['hard'] as number,
};

/** Per-role base stats. Source: docs/specs/50-ecs-model.md entity archetypes. */
const ROLE_STATS: Record<
  UnitType,
  {
    speed: number;
    faction: Faction;
    hp?: number;
    attackDamage?: number;
    attackRange?: number;
    attackCooldown?: number;
  }
> = {
  Peon:    combatConfig.unitStats['Peon']    as { speed: number; faction: Faction },
  Footman: combatConfig.unitStats['Footman'] as { speed: number; faction: Faction; hp: number; attackDamage: number; attackRange: number; attackCooldown: number },
  Goblin:  combatConfig.unitStats['Goblin']  as { speed: number; faction: Faction; hp: number; attackDamage: number; attackRange: number; attackCooldown: number },
  Orc:     combatConfig.unitStats['Orc']     as { speed: number; faction: Faction; hp: number; attackDamage: number; attackRange: number; attackCooldown: number },
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
  /**
   * AI difficulty — scales HP and attackDamage for enemy roles (Goblin, Orc).
   * Player roles (Peon, Footman) are unaffected. Defaults to 'normal'.
   */
  difficulty?: Difficulty;
}

/**
 * Spawn a character ECS entity. One parameterized factory for every unit role:
 * it assembles the archetype's trait set (Transform, HexPosition, Unit, Faction,
 * Movement, PathQueue, AnimationState, Selectable) with role-appropriate values.
 * The r3f layer renders entities that carry these traits.
 */
export function createCharacter(params: CreateCharacterParams): Entity {
  const { world, role, q, r, level, selected = false, difficulty = 'normal' } = params;
  const stats = ROLE_STATS[role];
  const { x, z } = axialToWorld(q, r);
  const base = [
    HexPosition({ q, r, level }),
    Transform({ x, y: level * TILE_HEIGHT, z, rotationY: 0 }),
    Unit({ unitType: role }),
    FactionTrait({ faction: stats.faction }),
    Movement({ speed: stats.speed, isMoving: false }),
    PathQueue({ steps: [] }),
    AnimationState({ state: 'IDLE' }),
    Selectable({ isSelected: selected }),
  ] as const;

  // Peons participate in the harvest loop — add economy traits.
  if (role === 'Peon') {
    return world.spawn(
      ...base,
      Harvester({ harvestRate: 1, harvestTimer: 0 }),
      Carrier({ carryType: 'none', amount: 0 }),
      AssignedJob({ state: 'IDLE', targetKey: '' }),
    );
  }

  // Combat units (Footman, Goblin, Orc) get Health, Combatant, and EnemyTarget.
  const { hp, attackDamage, attackRange, attackCooldown } = stats;
  if (
    hp !== undefined &&
    attackDamage !== undefined &&
    attackRange !== undefined &&
    attackCooldown !== undefined
  ) {
    // Apply difficulty multiplier to enemy roles only. Player roles are unaffected.
    const mult = stats.faction === 'enemy' ? DIFFICULTY_MULTIPLIER[difficulty] : 1.0;
    const scaledHp = Math.round(hp * mult);
    const scaledDamage = Math.round(attackDamage * mult);
    const combatTraits = [
      Health({ current: scaledHp, max: scaledHp }),
      Combatant({ attackDamage: scaledDamage, attackRange, attackCooldown, attackTimer: 0 }),
      EnemyTarget({ targetId: -1 }),
    ] as const;
    return world.spawn(...base, ...combatTraits);
  }

  return world.spawn(...base);
}
