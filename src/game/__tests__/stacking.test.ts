/**
 * M_GAME.STACK.2 + M_GAME.STACK.4 + M_GAME.STACK.5 — stacking commands.
 *
 * Pure ECS tests on a freshly-created koota world; no game-state
 * dependencies beyond the world handle. Verifies the contract from
 * docs/specs/201-stacking-and-formations.md:
 *
 * - createStack rejects single-member, cross-faction, already-stacked.
 * - createStack assigns members + sets combined stats from the
 *   resolved default formation.
 * - dissolveStack removes back-references and destroys the entity.
 * - damageStack reduces combinedHp, auto-dissolves at 0, and
 *   proportional kills strip members.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { Combatant, FactionTrait, Health, Stack, StackMember, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { createStack, damageStack, dissolveStack, MAX_STACK_SIZE } from '../stacking';

function mockGame() {
  const world = createWorld();
  return { world } as unknown as GameState;
}

function spawnFootman(
  world: ReturnType<typeof createWorld>,
  faction: 'player' | 'enemy' = 'player',
) {
  const e = world.spawn(Unit, FactionTrait, Health, Combatant);
  e.set(Unit, { unitType: 'Footman' });
  e.set(FactionTrait, { faction });
  e.set(Health, { current: 100, max: 100 });
  e.set(Combatant, { attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 });
  return e;
}

describe('createStack (M_GAME.STACK.2)', () => {
  it('rejects single-member stacks', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const result = createStack(game, [a]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/at least 2/i);
  });

  it('rejects cross-faction stacks', () => {
    const game = mockGame();
    const a = spawnFootman(game.world, 'player');
    const b = spawnFootman(game.world, 'enemy');
    const result = createStack(game, [a, b]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/share a faction/i);
  });

  it('rejects members already in a stack', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const c = spawnFootman(game.world);
    const first = createStack(game, [a, b]);
    expect(first.ok).toBe(true);
    const second = createStack(game, [a, c]);
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/already in a stack/i);
  });

  it('rejects oversized stacks', () => {
    const game = mockGame();
    const tooMany = Array.from({ length: MAX_STACK_SIZE + 1 }, () => spawnFootman(game.world));
    const result = createStack(game, tooMany);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/max stack/i);
  });

  it('creates a Stack with combined HP = sum of members for rabble default', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const c = spawnFootman(game.world);
    const result = createStack(game, [a, b, c]);
    expect(result.ok).toBe(true);
    const s = result.stack?.get(Stack);
    expect(s?.formationId).toBe('rabble');
    expect(s?.combinedMaxHp).toBe(300);
    expect(s?.combinedHp).toBe(300);
    expect(s?.members.length).toBe(3);
    expect(s?.dominantUnitType).toBe('Footman');
    // Each member has the back-reference now.
    for (const m of [a, b, c]) {
      expect(m.get(StackMember)?.stackId).toBe(result.stack?.id());
    }
  });
});

describe('dissolveStack (M_GAME.STACK.5)', () => {
  it('removes the Stack entity and clears member back-references', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const result = createStack(game, [a, b]);
    expect(result.ok).toBe(true);
    const stack = result.stack;
    if (!stack) return;
    dissolveStack(game, stack);
    expect(a.has(StackMember)).toBe(false);
    expect(b.has(StackMember)).toBe(false);
    // The Stack entity is gone from the world's Stack query.
    let n = 0;
    for (const _ of game.world.query(Stack)) n++;
    expect(n).toBe(0);
  });

  it('is idempotent on already-dissolved stacks', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const result = createStack(game, [a, b]);
    if (!result.ok || !result.stack) return;
    dissolveStack(game, result.stack);
    expect(() =>
      dissolveStack(game, result.stack as ReturnType<typeof game.world.spawn>),
    ).not.toThrow();
  });
});

describe('damageStack (M_GAME.STACK.4)', () => {
  it('reduces combinedHp', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const result = createStack(game, [a, b]);
    if (!result.ok || !result.stack) return;
    const hpAfter = damageStack(game, result.stack, 60);
    expect(hpAfter).toBe(140); // 200 - 60
  });

  it('dissolves the stack when combinedHp hits zero', () => {
    const game = mockGame();
    const a = spawnFootman(game.world);
    const b = spawnFootman(game.world);
    const result = createStack(game, [a, b]);
    if (!result.ok || !result.stack) return;
    damageStack(game, result.stack, 999);
    expect(a.has(StackMember)).toBe(false);
    expect(b.has(StackMember)).toBe(false);
  });

  it('kills proportional members on heavy partial damage', () => {
    const game = mockGame();
    const members = Array.from({ length: 4 }, () => spawnFootman(game.world));
    const result = createStack(game, members);
    if (!result.ok || !result.stack) return;
    // 50% damage on a 4-member stack should kill 2 members.
    damageStack(game, result.stack, 200);
    expect(result.stack.get(Stack)?.members.length).toBe(2);
  });
});
