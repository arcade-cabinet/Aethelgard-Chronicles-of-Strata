import { describe, expect, it } from 'vitest';
import { Combatant } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { createEconomy } from '@/game/economy';
import { applyResearch, canResearch, createResearch } from '@/game/research';

describe('research — Forged Blades', () => {
  it('adds +5 attack damage to every footman', () => {
    const world = createEcsWorld();
    const footman = world.spawn(
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
    );
    const research = createResearch();
    const eco = createEconomy();
    eco.gold = 200;
    eco.stone = 200;
    applyResearch(world, eco, research, 'forgedBlades');
    expect(footman.get(Combatant)?.attackDamage).toBe(20);
  });

  it('cannot be researched twice', () => {
    const world = createEcsWorld();
    const research = createResearch();
    const eco = createEconomy();
    eco.gold = 500;
    eco.stone = 500;
    applyResearch(world, eco, research, 'forgedBlades');
    expect(canResearch(eco, research, 'forgedBlades')).toBe(false);
  });

  it('cannot be researched without resources', () => {
    const research = createResearch();
    const eco = createEconomy(); // 20 gold — far short of 150
    expect(canResearch(eco, research, 'forgedBlades')).toBe(false);
  });
});
