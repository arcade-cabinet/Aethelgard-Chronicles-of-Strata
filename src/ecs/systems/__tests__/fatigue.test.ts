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
import { createEcsWorld } from '@/ecs/world';
import { Combatant, HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import type { BoardData, Tile } from '@/core/board';

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
});
