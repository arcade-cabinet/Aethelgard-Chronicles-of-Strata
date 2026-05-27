/**
 * M_V11.CAMPS.TESTS — end-to-end integration test for the camp
 * lifecycle.
 *
 * Scenario:
 *   1. Spawn a barbarian camp with EnemySpawner + WanderBehavior
 *      capable mobs.
 *   2. Tick spawnSystem until the camp produces its first mob.
 *   3. Kill the mob; tick deathSystem twice (across DEATH_DELAY=2s)
 *      to clear the corpse.
 *   4. Verify a LootCache landed on the death tile.
 *   5. Walk a player unit onto the cache tile; tick lootPickupSystem
 *      and verify the wood/stone/gold landed in game.economy.player.
 *   6. Knock the camp's Health to 0; tick deathSystem and verify
 *      the cascade (remaining mobs flip to 0 HP).
 *
 * Confirms the full mob spawn → wander → loot → camp-clear flow ties
 * together with no orphans.
 */
import { createWorld, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import {
  AnimationState,
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  LootCache,
  Unit,
} from '@/ecs/components';
import { deathSystem } from '@/ecs/systems/death';
import { lootPickupSystem } from '@/ecs/systems/loot-pickup';
import { spawnSystem } from '@/ecs/systems/spawn';
import type { GameState } from '@/game/game-state';

function findWalkableWithNeighbor(board: ReturnType<typeof generateBoard>) {
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const hasN = dirs.some(
      ([dq, dr]) => board.tiles.get(`${tile.q + dq},${tile.r + dr}`)?.walkable,
    );
    if (hasN) return tile;
  }
  throw new Error('no walkable tile with neighbor');
}

// CodeRabbit (PR #89): widened factionId to the actual barbarian-camp
// shape so the spawnCamp helper doesn't need a narrowing `as` cast.
// FactionTrait.faction is a string union at the trait layer (the schema
// uses a permissive `as Faction` since v0.6 N-player), so any string id
// is valid at runtime; the type alias just spells out the test's intent.
type TestFactionId = 'player' | 'enemy' | `barbarian-camp-${number}`;

function spawnCamp(
  world: World,
  factionId: TestFactionId,
  tile: { q: number; r: number; level: number },
) {
  const e = world.spawn(FactionBase, Health, HexPosition, EnemySpawner, FactionTrait);
  e.set(FactionTrait, { faction: factionId as 'player' | 'enemy' });
  e.set(HexPosition, { q: tile.q, r: tile.r, level: tile.level });
  e.set(Health, { current: 200, max: 200 });
  e.set(EnemySpawner, {
    spawnTimer: 0,
    spawnInterval: 90,
    spawnCount: 0,
    mobCap: 4,
    liveMobs: 0,
  });
  return e;
}

function mockGame(world: World): GameState {
  return {
    world,
    economy: {
      player: { wood: 0, stone: 0, gold: 0 },
      enemy: { wood: 0, stone: 0, gold: 0 },
    },
  } as unknown as GameState;
}

// CodeRabbit (PR #89): single helper for the faction-id read so the
// `as unknown as string | undefined` cast lives in exactly one place.
// FactionTrait.faction is typed as `Faction` ('player' | 'enemy') at
// the trait layer but holds any string id at runtime (N-player +
// barbarian-camp-N ids), so a widening read is unavoidable in tests
// that work with non-legacy ids.
function getFactionId(e: {
  get: (t: typeof FactionTrait) => { faction: string } | undefined;
}): string | undefined {
  return e.get(FactionTrait)?.faction as unknown as string | undefined;
}

function countWith<T>(world: World, trait: T): number {
  let n = 0;
  for (const _ of world.query(trait as never)) n++;
  return n;
}

describe('camps integration (M_V11.CAMPS.TESTS)', () => {
  it('spawn → mob death → loot cache → player collects → camp clear cascades', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 10);
    const tile = findWalkableWithNeighbor(board);
    spawnCamp(world, 'barbarian-camp-1', tile);
    const game = mockGame(world);

    // 1. Tick spawn — 95s clears the 90s baseline interval.
    spawnSystem(world, board, 95, 0, 'normal', () => 0.5);
    // The camp now has at least one mob.
    let mobs = 0;
    for (const e of world.query(Unit, FactionTrait)) {
      const f = getFactionId(e);
      if (f === 'barbarian-camp-1') mobs++;
    }
    expect(mobs).toBeGreaterThanOrEqual(1);

    // 2. Kill the first mob. Mobs typically spawn missing AnimationState;
    //    add it so the death pipeline runs.
    let mob: ReturnType<typeof world.spawn> | null = null;
    for (const e of world.query(Unit, FactionTrait, Health)) {
      const f = getFactionId(e);
      if (f === 'barbarian-camp-1') {
        mob = e;
        break;
      }
    }
    if (!mob) throw new Error('mob missing');
    if (!mob.has(AnimationState)) mob.add(AnimationState);
    mob.set(AnimationState, { state: 'IDLE' });
    const mobHex = mob.get(HexPosition);
    if (!mobHex) throw new Error('mob hex missing');
    mob.set(Health, { current: 0, max: 30 });

    // 3. Tick deathSystem twice across DEATH_DELAY (2s by default).
    deathSystem(world, 1.0, board);
    deathSystem(world, 1.5, board);

    // 4. A LootCache landed on the death tile.
    let cachesOnTile = 0;
    for (const c of world.query(LootCache, HexPosition)) {
      const hex = c.get(HexPosition);
      if (hex && hex.q === mobHex.q && hex.r === mobHex.r) cachesOnTile++;
    }
    expect(cachesOnTile).toBe(1);

    // 5. Player walks onto the cache tile; lootPickupSystem grants
    //    the bundle.
    const player = world.spawn(Unit, FactionTrait, HexPosition);
    player.set(Unit, { unitType: 'Footman' });
    player.set(FactionTrait, { faction: 'player' });
    player.set(HexPosition, { q: mobHex.q, r: mobHex.r, level: mobHex.level });
    lootPickupSystem(game);
    const got = game.economy.player.wood + game.economy.player.stone + game.economy.player.gold;
    expect(got).toBeGreaterThan(0);
    // Cache destroyed.
    expect(countWith(world, LootCache)).toBe(0);

    // 6. Spawn another mob so cascade has something to flip.
    spawnSystem(world, board, 200, 100, 'normal', () => 0.5);
    let aliveCampMobsBefore = 0;
    for (const e of world.query(Unit, FactionTrait, Health)) {
      const f = getFactionId(e);
      if (f !== 'barbarian-camp-1') continue;
      const hp = e.get(Health)?.current ?? 0;
      if (hp > 0) {
        aliveCampMobsBefore++;
        if (!e.has(AnimationState)) e.add(AnimationState);
        e.set(AnimationState, { state: 'IDLE' });
      }
    }
    expect(aliveCampMobsBefore).toBeGreaterThanOrEqual(1);

    // Kill camp.
    for (const c of world.query(FactionBase, Health, FactionTrait)) {
      const f = getFactionId(c);
      if (f === 'barbarian-camp-1') {
        c.set(Health, { current: 0, max: 200 });
        break;
      }
    }
    deathSystem(world, 0.1, board);
    // Cascade ran: all camp mobs flipped to 0 HP (still alive in ECS
    // until DEATH_DELAY ticks; the trait flip is the cascade trigger).
    for (const e of world.query(Unit, FactionTrait, Health)) {
      const f = getFactionId(e);
      if (f !== 'barbarian-camp-1') continue;
      expect(e.get(Health)?.current ?? -1).toBe(0);
    }
  });
});
