/**
 * M_GAME.STACK.1 — Stack + StackMember ECS substrate guards.
 *
 * Pure-data koota test: verifies the traits compile, spawn correctly
 * with the documented defaults, and round-trip array members through
 * the trait shape (koota stores trait-init returns by reference, so
 * arrays MUST come from the trait factory, never module-level).
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { Stack, StackMember } from '@/ecs/components';

describe('Stack + StackMember (M_GAME.STACK.1)', () => {
  it('spawns Stack with default rabble formation, empty members', () => {
    const world = createWorld();
    const e = world.spawn(Stack);
    const s = e.get(Stack);
    expect(s).toBeDefined();
    expect(s?.formationId).toBe('rabble');
    expect(s?.members).toEqual([]);
    expect(s?.combinedHp).toBe(0);
    expect(s?.dominantUnitType).toBe('Footman');
  });

  it('mutating Stack.members updates the trait on subsequent get', () => {
    const world = createWorld();
    const e = world.spawn(Stack);
    e.set(Stack, {
      members: [1, 2, 3],
      formationId: 'phalanx',
      combinedHp: 300,
      combinedMaxHp: 300,
      combinedDps: 25,
      dominantUnitType: 'Footman',
    });
    const s = e.get(Stack);
    expect(s?.members).toEqual([1, 2, 3]);
    expect(s?.formationId).toBe('phalanx');
    expect(s?.combinedMaxHp).toBe(300);
  });

  it('StackMember back-reference defaults to stackId -1', () => {
    const world = createWorld();
    const e = world.spawn(StackMember);
    expect(e.get(StackMember)?.stackId).toBe(-1);
  });

  it('a unit can be a StackMember pointing at the Stack entity id', () => {
    const world = createWorld();
    const stack = world.spawn(Stack);
    const unit = world.spawn(StackMember);
    unit.set(StackMember, { stackId: stack.id() });
    expect(unit.get(StackMember)?.stackId).toBe(stack.id());
  });

  it('two Stack entities have independent members arrays (no module-level mutation)', () => {
    const world = createWorld();
    const a = world.spawn(Stack);
    const b = world.spawn(Stack);
    a.set(Stack, {
      members: [1, 2],
      formationId: 'rabble',
      combinedHp: 0,
      combinedMaxHp: 0,
      combinedDps: 0,
      dominantUnitType: 'Footman',
    });
    expect(b.get(Stack)?.members).toEqual([]);
  });
});
