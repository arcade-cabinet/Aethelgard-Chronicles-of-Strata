import { describe, expect, it } from 'vitest';
import { pickEnemyRole } from '@/ecs/systems/spawn';

describe('pickEnemyRole escalation', () => {
  it('spawns only Goblins before vampireThreshold', () => {
    expect(pickEnemyRole(0, 0)).toBe('Goblin');
    expect(pickEnemyRole(1, 0)).toBe('Goblin');
    expect(pickEnemyRole(10, 299)).toBe('Goblin');
  });

  it('introduces Vampires after vampireThreshold (300s)', () => {
    // 3-cycle: 0→Goblin, 1→Goblin, 2→Vampire
    expect(pickEnemyRole(0, 300)).toBe('Goblin');
    expect(pickEnemyRole(1, 300)).toBe('Goblin');
    expect(pickEnemyRole(2, 300)).toBe('Vampire');
    expect(pickEnemyRole(3, 300)).toBe('Goblin'); // cycle wraps
  });

  it('introduces Orcs after orcThreshold (600s)', () => {
    // 4-cycle: 0→Goblin, 1→Goblin, 2→Vampire, 3→Orc
    expect(pickEnemyRole(0, 600)).toBe('Goblin');
    expect(pickEnemyRole(2, 600)).toBe('Vampire');
    expect(pickEnemyRole(3, 600)).toBe('Orc');
    expect(pickEnemyRole(4, 600)).toBe('Goblin'); // cycle wraps
  });

  it('introduces Witches after witchThreshold (900s)', () => {
    // 5-cycle: 0→Goblin, 1→Goblin, 2→Vampire, 3→Orc, 4→Witch
    expect(pickEnemyRole(4, 900)).toBe('Witch');
    expect(pickEnemyRole(5, 900)).toBe('Goblin'); // cycle wraps
  });

  it('introduces BlackKnight after blackKnightThreshold (1200s)', () => {
    // 6-cycle: 0→Goblin, 1→Goblin, 2→Vampire, 3→Orc, 4→Witch, 5→BlackKnight
    expect(pickEnemyRole(5, 1200)).toBe('BlackKnight');
    expect(pickEnemyRole(6, 1200)).toBe('Goblin'); // cycle wraps
  });

  it('is purely deterministic — same inputs always produce same output', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickEnemyRole(i, 1200)).toBe(pickEnemyRole(i, 1200));
    }
  });
});
