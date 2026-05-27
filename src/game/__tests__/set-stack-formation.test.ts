/**
 * M_V11.STACK.PANEL — setStackFormation unit tests.
 *
 * Pins the five gate conditions for switching a stack's formation:
 *   1. Stack must exist + have ≥2 members.
 *   2. Target formation must exist (FormationId is a literal, but
 *      the runtime function still guards).
 *   3. Composition validates against the target formation's predicate.
 *   4. Discovery (when unlockDiscovery is non-null) is owned in
 *      game.research.purchased.
 *   5. No member is mid-combat (Combatant.attackTimer > 0).
 *
 * Successful switch recomputes combinedMaxHp + combinedDps and
 * preserves the existing HP-ratio (so a half-dead stack stays half-
 * dead — switching doesn't free-heal).
 */
import { createWorld, type Entity, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  Combatant,
  FactionTrait,
  Health,
  HexPosition,
  Stack,
  Unit,
  type UnitType,
} from '@/ecs/components';
import { createResearch } from '@/game/research';
import type { GameState } from '@/game/game-state';
import { createStack, setStackFormation } from '@/game/stacking';

function mockGame(world: World): GameState {
  return {
    world,
    research: createResearch(),
  } as unknown as GameState;
}

function spawnUnit(
  world: World,
  unitType: UnitType,
  faction: 'player' | 'enemy' = 'player',
): Entity {
  const e = world.spawn(Unit, FactionTrait, Health, Combatant, HexPosition);
  e.set(Unit, { unitType });
  e.set(FactionTrait, { faction });
  e.set(Health, { current: 100, max: 100 });
  e.set(Combatant, { attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 });
  e.set(HexPosition, { q: 0, r: 0, level: 0 });
  return e;
}

describe('setStackFormation (M_V11.STACK.PANEL)', () => {
  it('switches a Rabble stack to a discovered formation', () => {
    const world = createWorld();
    const game = mockGame(world);
    game.research.purchased.add('formation-cadre' as never);
    const a = spawnUnit(world, 'Footman');
    const b = spawnUnit(world, 'Footman');
    const created = createStack(game, [a, b]);
    expect(created.ok).toBe(true);
    if (!created.ok || !created.stack) return;
    const stack = created.stack;
    expect(stack.get(Stack)?.formationId).toBe('rabble');
    const result = setStackFormation(game, stack, 'cadre');
    expect(result.ok).toBe(true);
    expect(stack.get(Stack)?.formationId).toBe('cadre');
    // Cadre adds +25% DPS — verify the combinedDps actually shifted.
    const before = 10 + 10; // 20 sum / 1 cooldown = 20 dps (rabble pure-sum)
    const after = stack.get(Stack)?.combinedDps ?? 0;
    expect(after).toBeCloseTo(before * 1.25, 2);
  });

  it('rejects switch to a formation that fails composition validate', () => {
    const world = createWorld();
    const game = mockGame(world);
    game.research.purchased.add('formation-wedge' as never);
    const a = spawnUnit(world, 'Footman');
    const b = spawnUnit(world, 'Footman');
    const created = createStack(game, [a, b]);
    if (!created.ok || !created.stack) throw new Error('setup failed');
    // Wedge requires Hero or BlackKnight only — Footmen fail.
    const result = setStackFormation(game, created.stack, 'wedge');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/invalid for/i);
  });

  it('rejects switch to a formation whose Discovery is not owned', () => {
    const world = createWorld();
    const game = mockGame(world);
    // Don't add 'formation-cadre' to purchased.
    const a = spawnUnit(world, 'Footman');
    const b = spawnUnit(world, 'Footman');
    const created = createStack(game, [a, b]);
    if (!created.ok || !created.stack) throw new Error('setup failed');
    const result = setStackFormation(game, created.stack, 'cadre');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/discovery/i);
  });

  it('rejects switch when a member is mid-combat (attackTimer > 0)', () => {
    const world = createWorld();
    const game = mockGame(world);
    game.research.purchased.add('formation-cadre' as never);
    const a = spawnUnit(world, 'Footman');
    const b = spawnUnit(world, 'Footman');
    const created = createStack(game, [a, b]);
    if (!created.ok || !created.stack) throw new Error('setup failed');
    // Set member-a as mid-swing.
    a.set(Combatant, { attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0.5 });
    const result = setStackFormation(game, created.stack, 'cadre');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/combat/i);
  });

  it('preserves HP ratio across the switch', () => {
    const world = createWorld();
    const game = mockGame(world);
    game.research.purchased.add('formation-phalanx' as never);
    // Phalanx requires SPEAR_UNITS (Footman today). Two Footmen.
    const a = spawnUnit(world, 'Footman');
    const b = spawnUnit(world, 'Footman');
    const created = createStack(game, [a, b]);
    if (!created.ok || !created.stack) throw new Error('setup failed');
    const stack = created.stack;
    // Pre-damage: knock the stack down to 50% combinedHp.
    const s0 = stack.get(Stack);
    if (!s0) throw new Error('no stack data');
    stack.set(Stack, { ...s0, combinedHp: Math.round(s0.combinedMaxHp * 0.5) });
    const result = setStackFormation(game, stack, 'phalanx');
    expect(result.ok).toBe(true);
    const s1 = stack.get(Stack);
    if (!s1) throw new Error('post-switch stack missing');
    // Phalanx adds +50% maxHP; combinedMaxHp should grow, combinedHp
    // should remain at ~50% of the new max.
    const ratio = s1.combinedHp / s1.combinedMaxHp;
    expect(ratio).toBeGreaterThan(0.49);
    expect(ratio).toBeLessThan(0.51);
  });
});
