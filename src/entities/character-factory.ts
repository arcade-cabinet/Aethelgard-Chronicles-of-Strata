import type { Entity, World } from 'koota';
import { difficultyMultiplierFor, unitStatFor } from '@/config/combat';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import {
  AnimationState,
  AssignedJob,
  Carrier,
  Combatant,
  CommandedTile,
  EnemyTarget,
  FactionTrait,
  Harvester,
  Health,
  HexPosition,
  Movement,
  OffensiveBehavior,
  PathQueue,
  Selectable,
  Stance,
  Transform,
  Unit,
  type UnitType,
} from '@/ecs/components';
import type { Difficulty } from '@/game/difficulty';
import { unitProfileFor } from '@/rules/unit-profiles';

/**
 * M_EXPANSION.D.180 — read this BEFORE editing the factory.
 *
 * The character factory has THREE distinct uses (per spec
 * docs/specs/60-characters.md §M_CHARACTERS.14). All three call
 * the same factory function; they differ in spawn trigger and
 * storage policy:
 *
 * 1. Fixed NPCs — TownHall, named heroes (Knight). Same skinned-
 *    mesh GLB across every seed, identity stable across seeds.
 *    Spawned at startGame() time from the player base config.
 *
 * 2. Generic-fixed NPCs (M_EXPANSION.S.60 — spec'd, not yet
 *    implemented) — named characters with seed-randomised stats.
 *    Spawned via statsOverride param (not yet wired) that lifts
 *    the per-role band into the spawn site.
 *
 * 3. Random NPCs — enemy raid waves. Both mesh + stats are rolled
 *    at spawn time from the event PRNG (not the map PRNG, so the
 *    same seed produces the same raid sequence).
 *
 * Adding a new use case is almost certainly a fourth statsOverride
 * code path here — don't fork the factory.
 */

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
  /**
   * Override the faction the role's stats normally assign. The faction-
   * symmetric economy (M8.6a) needs ENEMY peons + footmen; the enemy AI's
   * trainUnit command passes 'enemy' here. Undefined = use stats.faction.
   */
  factionOverride?: 'player' | 'enemy';
}

/**
 * Spawn a character ECS entity. ONE parameterised factory for every unit
 * role — the role-switch and damage-type-ternary that used to live here
 * are gone (M_REGISTRY.1). The factory now reads the unified UNIT_PROFILES
 * registry (`src/rules/unit-profiles.ts`) for slot toggles
 * (harvester/founder/nonCombat) + damageType, and composes the trait
 * tuple from slot reads. Adding a new unit role is ONE row in
 * UNIT_PROFILES + ONE stat block in combat.json — no code change here.
 */
export function createCharacter(params: CreateCharacterParams): Entity {
  const {
    world,
    role,
    q,
    r,
    level,
    selected = false,
    difficulty = 'normal',
    factionOverride,
  } = params;
  const stats = unitStatFor(role);
  const profile = unitProfileFor(role);
  const faction = factionOverride ?? stats.faction;
  const { x, z } = axialToWorld(q, r);
  const base = [
    HexPosition({ q, r, level }),
    Transform({ x, y: level * TILE_HEIGHT, z, rotationY: 0 }),
    Unit({ unitType: role }),
    FactionTrait({ faction }),
    Movement({ speed: stats.speed, isMoving: false }),
    PathQueue({ steps: [] }),
    AnimationState({ state: 'IDLE' }),
    Selectable({ isSelected: selected }),
  ] as const;

  // Non-combat civilian roles (Peon + Settler today). Skip the combat
  // trait block entirely — these roles are governed by the worker /
  // founding subsystems, not the combat tick.
  if (profile.nonCombat) {
    const civilian: Parameters<World['spawn']> = [...base];
    if (profile.harvester) {
      civilian.push(Harvester({ harvestRate: 1, harvestTimer: 0 }));
      civilian.push(Carrier({ carryType: 'none', amount: 0 }));
      civilian.push(AssignedJob({ state: 'IDLE', targetKey: '' }));
    } else if (profile.founder) {
      // Founder carries an AssignedJob for the founding state machine
      // routed by the foundBase command verb (commands.ts).
      civilian.push(AssignedJob({ state: 'IDLE', targetKey: '' }));
    }
    return world.spawn(...civilian);
  }

  // Combat roles — Footman, Trebuchet, Witch, all enemy units. Require
  // the full combat-stat tuple in combat.json. A combat-role config
  // missing hp/attackDamage/attackRange/attackCooldown is a config bug —
  // fail fast instead of silently spawning a broken combatant.
  const { hp, attackDamage, attackRange, attackCooldown } = stats;
  if (
    hp === undefined ||
    attackDamage === undefined ||
    attackRange === undefined ||
    attackCooldown === undefined
  ) {
    throw new Error(
      `character-factory: ${role} is a combat role (UNIT_PROFILES.nonCombat=false) but is ` +
        `missing combat stats (hp/attackDamage/attackRange/attackCooldown). ` +
        `Check src/config/combat.json + src/rules/unit-profiles.ts.`,
    );
  }
  // Apply difficulty multiplier to enemy roles only. Player roles unaffected.
  const mult = stats.faction === 'enemy' ? difficultyMultiplierFor(difficulty) : 1.0;
  const scaledHp = Math.round(hp * mult);
  const scaledDamage = Math.round(attackDamage * mult);
  return world.spawn(
    ...base,
    Health({ current: scaledHp, max: scaledHp }),
    Combatant({ attackDamage: scaledDamage, attackRange, attackCooldown, attackTimer: 0 }),
    EnemyTarget({ targetId: -1 }),
    // M_ARCHETYPE.5 — military units are OFFENSIVE EMITTERS on legs. They
    // adopt the same trait Watchtowers have (spec 102). dps approximates
    // scaledDamage/attackCooldown so the offensive-behavior system applies
    // continuous damage in range at the same rate combat.ts would. damageType
    // is now a slot read off UNIT_PROFILES (M_REGISTRY.1) — was a per-role
    // ternary; new combat roles drop in via UNIT_PROFILES + a DamageType
    // union extension if needed.
    OffensiveBehavior({
      radius: attackRange,
      dps: scaledDamage / attackCooldown,
      damageType: profile.damageType,
    }),
    // M_POLISH2.RTS.16 — stance system. All combat-role units spawn
    // with defensive stance and a commanded-tile anchored to their
    // spawn hex. moveUnit updates CommandedTile; setStance changes mode.
    Stance({ mode: 'defensive' }),
    CommandedTile({ q, r }),
  );
}
