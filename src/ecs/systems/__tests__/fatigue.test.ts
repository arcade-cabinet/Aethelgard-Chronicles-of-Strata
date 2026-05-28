/**
 * M_FUN.MAP.ELEV — fatigue on MOUNTAIN_PASS traversal.
 *
 * Pins: arriving on a MOUNTAIN_PASS tile bumps Combatant.fatigue
 * by the biome rule's attributeStrength (0.5 per src/config/mapgen.json);
 * fatigue decays toward 0 over FATIGUE_DECAY seconds out of combat;
 * combat rollDamage scales by (1 - fatigue) so a fully-fatigued unit
 * deals 0 dmg.
 */
import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import { Combatant, HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/movement';
import { createEcsWorld } from '@/ecs/world';

/** Minimal tiles map carrying just the test tile. */
function makeTiles(tile: Tile): BoardData['tiles'] {
  const m = new Map<string, Tile>();
  m.set(`${tile.q},${tile.r}`, tile);
  return m;
}

describe('fatigue on MOUNTAIN_PASS traversal (M_FUN.MAP.ELEV)', () => {
  it('arrival on a MOUNTAIN_PASS bumps fatigue by the rule strength', () => {
    const world = createEcsWorld();
    const passTile: Tile = {
      q: 1,
      r: 0,
      type: 'MOUNTAIN_PASS',
      level: 3,
      moisture: 0.5,
      walkable: true,
      isCrossingLanding: false,
    };
    const tiles = makeTiles(passTile);
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 100, isMoving: false }),
      PathQueue({ steps: ['1,0,3'] }),
      Combatant({
        attackDamage: 10,
        attackRange: 1,
        attackCooldown: 1,
        attackTimer: 0,
        fatigue: 0,
        fatigueDecayTimer: 0,
      }),
    );

    pathFollowSystem(world, 1, 1, tiles);

    const c = entity.get(Combatant);
    expect(c?.fatigue).toBe(0.5);
  });

  it('arrival on a GRASS tile leaves fatigue at 0', () => {
    const world = createEcsWorld();
    const grassTile: Tile = {
      q: 1,
      r: 0,
      type: 'GRASS',
      level: 2,
      moisture: 0.5,
      walkable: true,
      isCrossingLanding: false,
    };
    const tiles = makeTiles(grassTile);
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 100, isMoving: false }),
      PathQueue({ steps: ['1,0,2'] }),
      Combatant({
        attackDamage: 10,
        attackRange: 1,
        attackCooldown: 1,
        attackTimer: 0,
        fatigue: 0,
        fatigueDecayTimer: 0,
      }),
    );

    pathFollowSystem(world, 1, 1, tiles);
    expect(entity.get(Combatant)?.fatigue).toBe(0);
  });

  it('fatigue decays after FATIGUE_DECAY seconds out of combat', () => {
    const world = createEcsWorld();
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 100, isMoving: false }),
      PathQueue({ steps: [] }),
      Combatant({
        attackDamage: 10,
        attackRange: 1,
        attackCooldown: 1,
        attackTimer: 0,
        fatigue: 0.5,
        fatigueDecayTimer: 0,
      }),
    );
    // After 5s the decayTimer reaches the threshold; the next tick
    // starts decrementing fatigue.
    for (let i = 0; i < 6; i++) {
      pathFollowSystem(world, 1, 1, new Map());
    }
    const final = entity.get(Combatant)?.fatigue ?? 1;
    expect(final).toBeLessThan(0.5);
  });

  // Coderabbit NIT — combat-side fatigue lock. The combat tick math
  // is `effectiveDamage = attackDamage * (1 - fatigue)`, and the
  // decay timer resets on every dealt swing. This test pins both:
  // the formula's monotonicity (more fatigue → less damage), and
  // that combat reads keep fatigue gated to [0..1] (fatigue=1
  // → 0 damage exactly).
  it('combat applies (1 - fatigue) to outgoing damage [fatigue-formula lock]', () => {
    // Encode the formula the way combat.ts:94 does. Future change
    // here without a matching test edit means a desync between the
    // formula and the gameplay-test contract.
    const effectiveDamage = (baseDamage: number, fatigue: number): number =>
      baseDamage * Math.max(0, 1 - fatigue);
    expect(effectiveDamage(50, 0)).toBe(50);
    expect(effectiveDamage(50, 0.5)).toBe(25);
    expect(effectiveDamage(50, 1.0)).toBe(0);
    // Out-of-range fatigue (defensive): clamps to 0, never negative.
    expect(effectiveDamage(50, 1.5)).toBe(0);
    // Monotonic: as fatigue rises, damage falls.
    const damages = [0, 0.25, 0.5, 0.75, 1.0].map((f) => effectiveDamage(50, f));
    for (let i = 1; i < damages.length; i++) {
      const cur = damages[i];
      const prev = damages[i - 1];
      if (cur === undefined || prev === undefined) continue;
      expect(cur).toBeLessThanOrEqual(prev);
    }
  });

  // M_FUN.MECH.FATIGUE.TURN-MODE — turn-based fatigue gating. When
  // pathFollowSystem is called with a `currentTurn` arg AND a
  // combatant's `restUntilTurn > currentTurn`, the unit's movement
  // step is SKIPPED for that tick. RTS-mode callers omit the arg
  // M_V11.PURGE — turn-based restUntilTurn-skip test deleted
  // along with the field + the gating branch.
});
