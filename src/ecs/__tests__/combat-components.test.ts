import { describe, expect, it } from 'vitest';
import { Combatant, EnemySpawner, EnemyTarget } from '@/ecs/components';
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

  it('EnemySpawner tracks the enemy base spawn timer', () => {
    const world = createEcsWorld();
    const base = world.spawn(EnemySpawner({ spawnTimer: 0, spawnInterval: 45 }));
    expect(base.get(EnemySpawner)?.spawnInterval).toBe(45);
  });

  it('EnemyTarget records the targeted entity id, empty when none', () => {
    const world = createEcsWorld();
    const e = world.spawn(EnemyTarget());
    expect(e.get(EnemyTarget)?.targetId).toBe(-1);
  });
});
