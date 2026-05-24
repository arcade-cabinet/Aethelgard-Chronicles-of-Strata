import { describe, expect, it } from 'vitest';
import { pickEnemyRole } from '@/ecs/systems/spawn';

describe('pickEnemyRole escalation', () => {
  it('spawns only Goblins before vampireThreshold', () => {
    expect(pickEnemyRole(0, 0)).toBe('Goblin');
    expect(pickEnemyRole(1, 0)).toBe('Goblin');
    expect(pickEnemyRole(10, 299)).toBe('Goblin');
  });

  it('introduces Vampires after vampireThreshold (300s)', () => {
    // 3-cycle (M_QUALITY.2 rebalance): 0→Goblin, 1→Vampire, 2→Vampire
    // — newly unlocked enemy gets 2x weight so wave reflects the new threat.
    expect(pickEnemyRole(0, 300)).toBe('Goblin');
    expect(pickEnemyRole(1, 300)).toBe('Vampire');
    expect(pickEnemyRole(2, 300)).toBe('Vampire');
    expect(pickEnemyRole(3, 300)).toBe('Goblin'); // cycle wraps
  });

  it('introduces Orcs after orcThreshold (600s)', () => {
    // 4-cycle: 0→Goblin, 1→Vampire, 2→Orc, 3→Orc (Orc is the new threat)
    expect(pickEnemyRole(0, 600)).toBe('Goblin');
    expect(pickEnemyRole(1, 600)).toBe('Vampire');
    expect(pickEnemyRole(2, 600)).toBe('Orc');
    expect(pickEnemyRole(3, 600)).toBe('Orc');
    expect(pickEnemyRole(4, 600)).toBe('Goblin'); // cycle wraps
  });

  it('introduces Witches after witchThreshold (900s)', () => {
    // 5-cycle: 0→Goblin, 1→Vampire, 2→Orc, 3→Witch, 4→Witch
    expect(pickEnemyRole(0, 900)).toBe('Goblin');
    expect(pickEnemyRole(3, 900)).toBe('Witch');
    expect(pickEnemyRole(4, 900)).toBe('Witch');
    expect(pickEnemyRole(5, 900)).toBe('Goblin'); // cycle wraps
  });

  it('introduces BlackKnight after blackKnightThreshold (1200s)', () => {
    // 6-cycle: 0→Goblin, 1→Vampire, 2→Orc, 3→Witch, 4→BlackKnight, 5→BlackKnight
    expect(pickEnemyRole(0, 1200)).toBe('Goblin');
    expect(pickEnemyRole(4, 1200)).toBe('BlackKnight');
    expect(pickEnemyRole(5, 1200)).toBe('BlackKnight');
    expect(pickEnemyRole(6, 1200)).toBe('Goblin'); // cycle wraps
  });

  it('Goblin share strictly decreases as tougher enemies unlock (M_QUALITY.2)', () => {
    // 50 spawns at each tier; count Goblin frequency
    const count = (elapsed: number) => {
      let g = 0;
      for (let i = 0; i < 60; i++) if (pickEnemyRole(i, elapsed) === 'Goblin') g += 1;
      return g;
    };
    const early = count(299); // all Goblin
    const tier3 = count(300); // 1/3 Goblin
    const tier4 = count(600); // 1/4
    const tier5 = count(900); // 1/5
    const tier6 = count(1200); // 1/6
    expect(early).toBeGreaterThan(tier3);
    expect(tier3).toBeGreaterThan(tier4);
    expect(tier4).toBeGreaterThan(tier5);
    expect(tier5).toBeGreaterThan(tier6);
  });

  it('is purely deterministic — same inputs always produce same output', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickEnemyRole(i, 1200)).toBe(pickEnemyRole(i, 1200));
    }
  });
});
