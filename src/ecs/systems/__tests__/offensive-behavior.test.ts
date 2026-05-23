/**
 * offensiveBehaviorSystem regression (M_AUDIT2.ARCH.42).
 *
 * Pins: source builds damage enemy military in range; source skips
 * incomplete buildings; source skips same-faction units; peons not
 * targeted (combatRole=civilian); HP decrement applies via DPS×delta.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { createMapPrng } from '@/core/rng';
import {
  Building,
  type Faction,
  FactionTrait,
  Health,
  HexPosition,
  OffensiveBehavior,
  Transform,
  Unit,
} from '@/ecs/components';
import { offensiveBehaviorSystem } from '@/ecs/systems/offensive-behavior';

function spawnTower(world: ReturnType<typeof createWorld>, faction: Faction, q: number, r: number) {
  return world.spawn(
    HexPosition({ q, r, level: 0 }),
    Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    FactionTrait({ faction }),
    OffensiveBehavior({ radius: 3, dps: 10, damageType: 'normal' }),
    Building({ buildingType: 'Watchtower', isComplete: true, progress: 1 }),
  );
}

function spawnVictim(
  world: ReturnType<typeof createWorld>,
  faction: Faction,
  role: 'Footman' | 'Peon',
  q: number,
  r: number,
  hp = 100,
) {
  return world.spawn(
    HexPosition({ q, r, level: 0 }),
    Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    FactionTrait({ faction }),
    Unit({ unitType: role }),
    Health({ current: hp, max: hp }),
  );
}

describe('offensiveBehaviorSystem (M_AUDIT2.ARCH.42)', () => {
  it('damages an enemy military unit inside the source radius', () => {
    const world = createWorld();
    spawnTower(world, 'player', 0, 0);
    const target = spawnVictim(world, 'enemy', 'Footman', 1, 0); // dist 1 < radius 3
    offensiveBehaviorSystem(world, 1, createMapPrng('test'));
    const hp = target.get(Health);
    // DPS 10 × delta 1 = 10 damage; HP should drop from 100 to 90.
    expect(hp?.current).toBeLessThan(100);
    expect(hp?.current).toBeGreaterThanOrEqual(89);
  });

  it('skips incomplete buildings (no damage emitted)', () => {
    const world = createWorld();
    const tower = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      FactionTrait({ faction: 'player' }),
      OffensiveBehavior({ radius: 3, dps: 10, damageType: 'normal' }),
      Building({ buildingType: 'Watchtower', isComplete: false, progress: 0.5 }),
    );
    void tower;
    const target = spawnVictim(world, 'enemy', 'Footman', 1, 0);
    offensiveBehaviorSystem(world, 1, createMapPrng('test'));
    expect(target.get(Health)?.current).toBe(100);
  });

  it('does not damage same-faction units', () => {
    const world = createWorld();
    spawnTower(world, 'player', 0, 0);
    const ally = spawnVictim(world, 'player', 'Footman', 1, 0);
    offensiveBehaviorSystem(world, 1, createMapPrng('test'));
    expect(ally.get(Health)?.current).toBe(100);
  });

  it('does not damage peons (combatRole=civilian)', () => {
    const world = createWorld();
    spawnTower(world, 'player', 0, 0);
    const peon = spawnVictim(world, 'enemy', 'Peon', 1, 0);
    offensiveBehaviorSystem(world, 1, createMapPrng('test'));
    expect(peon.get(Health)?.current).toBe(100);
  });

  it('does not damage targets outside the radius', () => {
    const world = createWorld();
    spawnTower(world, 'player', 0, 0);
    const far = spawnVictim(world, 'enemy', 'Footman', 5, 0); // dist 5 > radius 3
    offensiveBehaviorSystem(world, 1, createMapPrng('test'));
    expect(far.get(Health)?.current).toBe(100);
  });
});
