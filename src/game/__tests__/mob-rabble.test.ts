/**
 * M_V11.STACK.MOB-RABBLE — autoFormMobRabble unit tests.
 *
 * Verifies the auto-stack pass that runs inside tickTerrainPhase:
 *  - Two+ same-camp mobs on the same tile auto-form a Rabble stack.
 *  - Mobs from different barbarian camps DON'T merge.
 *  - Already-stacked mobs are skipped.
 *  - Cap of 6 mobs per stack.
 *  - Solo mobs (count 1 on a tile) are left alone.
 *  - Player units (Footman) are ignored by this sweep.
 *
 * Tests the helper directly to avoid building a full GameState shape
 * for tickTerrainPhase.
 */
import { createWorld, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  Combatant,
  FactionTrait,
  Health,
  HexPosition,
  Stack,
  StackMember,
  Unit,
  type UnitType,
} from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { autoFormMobRabble } from '@/game/stack-auto-form';

/** Tiny GameState shape — autoFormMobRabble only needs game.world. */
function mockGame(world: World): GameState {
  return { world } as unknown as GameState;
}

function spawnMob(
  world: World,
  faction: string,
  q: number,
  r: number,
  unitType: UnitType = 'Goblin',
) {
  const e = world.spawn(Unit, FactionTrait, Health, Combatant, HexPosition);
  e.set(Unit, { unitType });
  // FactionTrait.faction is typed as Faction ('player' | 'enemy'),
  // but at runtime the registry stores arbitrary strings including
  // 'barbarian-camp-N'. The cast matches how spawn.ts + character-
  // factory.ts already smuggle the wider id through.
  e.set(FactionTrait, { faction: faction as 'player' | 'enemy' });
  e.set(Health, { current: 30, max: 30 });
  e.set(Combatant, { attackDamage: 6, attackRange: 1, attackCooldown: 1.4, attackTimer: 0 });
  e.set(HexPosition, { q, r, level: 0 });
  return e;
}

function countStacks(world: World): number {
  let n = 0;
  for (const _ of world.query(Stack)) n++;
  return n;
}

describe('autoFormMobRabble (M_V11.STACK.MOB-RABBLE)', () => {
  it('forms a Rabble stack when two same-camp mobs share a tile', () => {
    const world = createWorld();
    spawnMob(world, 'barbarian-camp-1', 5, 3);
    spawnMob(world, 'barbarian-camp-1', 5, 3);
    expect(countStacks(world)).toBe(0);
    autoFormMobRabble(mockGame(world));
    expect(countStacks(world)).toBe(1);
  });

  it('does NOT merge mobs from different camps on the same tile', () => {
    const world = createWorld();
    spawnMob(world, 'barbarian-camp-1', 5, 3);
    spawnMob(world, 'barbarian-camp-1', 5, 3);
    spawnMob(world, 'barbarian-camp-2', 5, 3);
    spawnMob(world, 'barbarian-camp-2', 5, 3);
    autoFormMobRabble(mockGame(world));
    expect(countStacks(world)).toBe(2);
  });

  it('skips already-stacked mobs', () => {
    const world = createWorld();
    const a = spawnMob(world, 'barbarian-camp-1', 5, 3);
    const b = spawnMob(world, 'barbarian-camp-1', 5, 3);
    a.add(StackMember);
    b.add(StackMember);
    a.set(StackMember, { stackId: 999 });
    b.set(StackMember, { stackId: 999 });
    autoFormMobRabble(mockGame(world));
    expect(countStacks(world)).toBe(0);
  });

  it('caps stack size at 6 mobs', () => {
    const world = createWorld();
    for (let i = 0; i < 10; i++) {
      spawnMob(world, 'barbarian-camp-1', 5, 3);
    }
    autoFormMobRabble(mockGame(world));
    const sizes: number[] = [];
    for (const s of world.query(Stack)) sizes.push(s.get(Stack)?.members.length ?? 0);
    expect(sizes).toHaveLength(1);
    expect(sizes[0]).toBe(6);
  });

  it('leaves solo mobs alone (count 1 on a tile)', () => {
    const world = createWorld();
    spawnMob(world, 'barbarian-camp-1', 5, 3);
    spawnMob(world, 'barbarian-camp-1', 8, 4); // different tile
    autoFormMobRabble(mockGame(world));
    expect(countStacks(world)).toBe(0);
  });

  it('ignores player units (Footman)', () => {
    const world = createWorld();
    const a = world.spawn(Unit, FactionTrait, Health, Combatant, HexPosition);
    const b = world.spawn(Unit, FactionTrait, Health, Combatant, HexPosition);
    for (const e of [a, b]) {
      e.set(Unit, { unitType: 'Footman' });
      e.set(FactionTrait, { faction: 'player' });
      e.set(Health, { current: 100, max: 100 });
      e.set(Combatant, { attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 });
      e.set(HexPosition, { q: 5, r: 3, level: 0 });
    }
    autoFormMobRabble(mockGame(world));
    expect(countStacks(world)).toBe(0);
  });
});
