import { describe, expect, it } from 'vitest';
import { AttractorBehavior, FactionTrait, HexPosition, OffensiveBehavior } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { sampleField } from '@/rules';

describe('force-field (M_ARCHETYPE.6)', () => {
  it('friendly Attractor pulls (positive force)', () => {
    const world = createEcsWorld();
    world.spawn(
      AttractorBehavior({ radius: 2 }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
    );
    expect(sampleField(world, { faction: 'player', q: 1, r: 0 })).toBeGreaterThan(0);
  });

  it('enemy Offensive repels (negative force)', () => {
    const world = createEcsWorld();
    world.spawn(
      OffensiveBehavior({ radius: 3, dps: 5, damageType: 'normal' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
    );
    expect(sampleField(world, { faction: 'player', q: 1, r: 0 })).toBeLessThan(0);
  });

  it('distance falloff: closer = stronger', () => {
    const world = createEcsWorld();
    world.spawn(
      AttractorBehavior({ radius: 2 }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
    );
    const close = sampleField(world, { faction: 'player', q: 1, r: 0 });
    const far = sampleField(world, { faction: 'player', q: 4, r: 0 });
    expect(close).toBeGreaterThan(far);
  });
});
