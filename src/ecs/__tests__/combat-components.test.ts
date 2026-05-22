import { describe, expect, it } from 'vitest';
import { Combatant, EnemyTarget, GoblinPortalTrait } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';

describe('combat components', () => {
  it('Combatant holds attack stats', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
    );
    expect(e.get(Combatant)?.attackDamage).toBe(15);
    expect(e.get(Combatant)?.attackRange).toBe(1);
  });

  it('GoblinPortalTrait tracks the enemy spawn timer', () => {
    const world = createEcsWorld();
    const portal = world.spawn(GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }));
    expect(portal.get(GoblinPortalTrait)?.spawnInterval).toBe(45);
  });

  it('EnemyTarget records the targeted entity id, empty when none', () => {
    const world = createEcsWorld();
    const e = world.spawn(EnemyTarget());
    expect(e.get(EnemyTarget)?.targetId).toBe(-1);
  });
});
