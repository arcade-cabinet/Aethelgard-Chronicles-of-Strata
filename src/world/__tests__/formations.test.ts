/**
 * M_GAME.STACK.1 + M_GAME.STACK.6 — formation registry guards.
 *
 * Pure-data tests: no ECS, no rendering. Verifies:
 * - Every FORMATIONS entry has the right id.
 * - Composition validators accept legal mixes + reject illegal ones.
 * - Combined-stats functions apply the documented multipliers.
 * - defaultFormationFor + dominantUnitTypeOf return the spec values.
 */
import { describe, expect, it } from 'vitest';
import type { UnitType } from '@/ecs/components';
import {
  FORMATIONS,
  defaultFormationFor,
  dominantUnitTypeOf,
  type MemberAggregate,
} from '../board';

const agg = (unitTypes: UnitType[], hp: number, damage: number, cd: number): MemberAggregate => ({
  unitTypes,
  sumMaxHp: hp,
  sumAttackDamage: damage,
  minAttackCooldown: cd,
});

describe('formation registry (M_GAME.STACK.6)', () => {
  it('every entry has matching id', () => {
    for (const [id, spec] of Object.entries(FORMATIONS)) {
      expect(spec.id).toBe(id);
    }
  });

  it('Rabble accepts 2+ same-type military, rejects peons + singletons', () => {
    expect(FORMATIONS.rabble.validate(['Footman', 'Footman'])).toBe(true);
    expect(FORMATIONS.rabble.validate(['Hero', 'Wizard'])).toBe(true);
    expect(FORMATIONS.rabble.validate(['Footman'])).toBe(false);
    expect(FORMATIONS.rabble.validate(['Peon', 'Peon'])).toBe(false);
  });

  it('Phalanx applies +50% HP modifier; DPS pure-sum', () => {
    const result = FORMATIONS.phalanx.combine(agg(['Footman', 'Footman'], 100, 20, 1));
    expect(result.combinedMaxHp).toBe(150);
    expect(result.combinedDps).toBe(20);
  });

  it('Cadre applies +25% DPS', () => {
    const result = FORMATIONS.cadre.combine(agg(['Footman', 'Hero'], 100, 20, 1));
    expect(result.combinedDps).toBeCloseTo(25, 5);
  });

  it('Combined Arms requires a melee + ranged mix', () => {
    expect(FORMATIONS['combined-arms'].validate(['Footman', 'Wizard'])).toBe(true);
    expect(FORMATIONS['combined-arms'].validate(['Footman', 'Footman'])).toBe(false);
    expect(FORMATIONS['combined-arms'].validate(['Wizard', 'Wizard'])).toBe(false);
  });

  it('Work Crew accepts peon-only stacks; combat DPS is zero', () => {
    expect(FORMATIONS['work-crew'].validate(['Peon', 'Peon'])).toBe(true);
    expect(FORMATIONS['work-crew'].validate(['Peon', 'Footman'])).toBe(false);
    const result = FORMATIONS['work-crew'].combine(agg(['Peon', 'Peon'], 60, 0, 1));
    expect(result.combinedDps).toBe(0);
    expect(result.combinedMaxHp).toBe(60);
  });

  it('defaultFormationFor returns work-crew for peons, rabble otherwise', () => {
    expect(defaultFormationFor(['Peon', 'Peon'])).toBe('work-crew');
    expect(defaultFormationFor(['Footman', 'Footman'])).toBe('rabble');
    expect(defaultFormationFor([])).toBe('rabble');
  });

  it('dominantUnitTypeOf returns the most-counted type', () => {
    expect(dominantUnitTypeOf(['Footman', 'Hero', 'Footman'])).toBe('Footman');
    expect(dominantUnitTypeOf(['Hero'])).toBe('Hero');
  });

  it('formation unlock Discoveries match the spec', () => {
    expect(FORMATIONS.rabble.unlockDiscovery).toBeNull();
    expect(FORMATIONS['work-crew'].unlockDiscovery).toBeNull();
    expect(FORMATIONS.phalanx.unlockDiscovery).toBe('formation-phalanx');
    expect(FORMATIONS.cadre.unlockDiscovery).toBe('formation-cadre');
    expect(FORMATIONS.wedge.unlockDiscovery).toBe('formation-wedge');
    expect(FORMATIONS['skirmish-line'].unlockDiscovery).toBe('formation-skirmish-line');
    expect(FORMATIONS.square.unlockDiscovery).toBe('formation-square');
    expect(FORMATIONS['combined-arms'].unlockDiscovery).toBe('formation-combined-arms');
  });
});
