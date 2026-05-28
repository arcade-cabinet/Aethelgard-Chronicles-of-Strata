/**
 * M_V11.CAMPS.DESTROY — camp-clear cascade tests.
 *
 * When a barbarian-camp-N camp (FactionBase) reaches 0 HP, every mob
 * with the same FactionTrait should be flagged for death (Health.current
 * set to 0). The existing per-unit death pipeline then runs uniformly
 * — DeathTimer ticks, dispatchEvent fires, LootCache drops, etc.
 *
 * This test runs the deathSystem ONCE — the camp + cascaded mobs both
 * transition. A subsequent tick (after DEATH_DELAY) would also tick
 * the DeathTimer to actually remove the entities; here we just verify
 * the Health flip is the cascade trigger.
 */
import { createWorld, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  AnimationState,
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { deathSystem } from '@/ecs/systems/lifecycle';

function spawnCamp(world: World, factionId: string, q: number, r: number) {
  const e = world.spawn(FactionBase, Health, HexPosition, EnemySpawner, FactionTrait);
  e.set(FactionTrait, { faction: factionId as 'player' | 'enemy' });
  e.set(HexPosition, { q, r, level: 0 });
  e.set(EnemySpawner, {
    spawnTimer: 0,
    spawnInterval: 90,
    spawnCount: 0,
    mobCap: 4,
    liveMobs: 0,
  });
  return e;
}

function spawnMob(world: World, factionId: string, q: number, r: number) {
  const e = world.spawn(Unit, FactionTrait, Health, HexPosition, AnimationState);
  e.set(Unit, { unitType: 'Goblin' });
  e.set(FactionTrait, { faction: factionId as 'player' | 'enemy' });
  e.set(Health, { current: 30, max: 30 });
  e.set(HexPosition, { q, r, level: 0 });
  e.set(AnimationState, { state: 'IDLE' });
  return e;
}

describe('camp-destroy cascade (M_V11.CAMPS.DESTROY)', () => {
  it('flips every same-faction mob to 0 HP when a camp is destroyed', () => {
    const world = createWorld();
    const camp = spawnCamp(world, 'barbarian-camp-1', 0, 0);
    const mob1 = spawnMob(world, 'barbarian-camp-1', 1, 0);
    const mob2 = spawnMob(world, 'barbarian-camp-1', 2, 0);
    // Different camp — should NOT cascade.
    const stranger = spawnMob(world, 'barbarian-camp-2', 1, 1);
    // Player unit on the map so the camp-cleared bookkeeping has a
    // nearest non-barbarian faction (avoids the null path).
    const player = world.spawn(Unit, FactionTrait, HexPosition);
    player.set(Unit, { unitType: 'Footman' });
    player.set(FactionTrait, { faction: 'player' });
    player.set(HexPosition, { q: 0, r: 1, level: 0 });
    // Kill the camp.
    camp.set(Health, { current: 0, max: 200 });

    deathSystem(world, 0.1);

    // Same-camp mobs flipped to 0 HP.
    expect(mob1.get(Health)?.current).toBe(0);
    expect(mob2.get(Health)?.current).toBe(0);
    // Different-camp mob unchanged.
    expect(stranger.get(Health)?.current).toBe(30);
    // Player unchanged.
    expect(player.get(FactionTrait)?.faction).toBe('player');
  });

  it('does NOT cascade when the camp survives', () => {
    const world = createWorld();
    const camp = spawnCamp(world, 'barbarian-camp-1', 0, 0);
    camp.set(Health, { current: 100, max: 200 }); // alive
    const mob = spawnMob(world, 'barbarian-camp-1', 1, 0);
    deathSystem(world, 0.1);
    expect(mob.get(Health)?.current).toBe(30);
  });
});
