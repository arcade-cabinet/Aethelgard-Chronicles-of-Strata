import { describe, expect, it } from 'vitest';
import { OffensiveBehavior } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { createEcsWorld } from '@/ecs/world';

describe('damageType per role (M_FEATURE.5+.6)', () => {
  it('Trebuchet has damageType: siege', () => {
    const world = createEcsWorld();
    const e = createCharacter({ world, role: 'Trebuchet', q: 0, r: 0, level: 0 });
    expect(e.get(OffensiveBehavior)?.damageType).toBe('siege');
  });

  it('Witch has damageType: magic', () => {
    const world = createEcsWorld();
    const e = createCharacter({ world, role: 'Witch', q: 0, r: 0, level: 0 });
    expect(e.get(OffensiveBehavior)?.damageType).toBe('magic');
  });

  it('Footman + Goblin + Orc default to damageType: normal', () => {
    const world = createEcsWorld();
    for (const role of ['Footman', 'Goblin', 'Orc'] as const) {
      const e = createCharacter({ world, role, q: 0, r: 0, level: 0 });
      expect(e.get(OffensiveBehavior)?.damageType).toBe('normal');
    }
  });
});
