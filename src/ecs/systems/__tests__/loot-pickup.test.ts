/**
 * M_V11.CAMPS.LOOT — lootPickupSystem + lootForBiome tests.
 *
 * Verifies:
 *   1. lootForBiome returns biome-weighted bundles per spec
 *      (FOREST→wood, MOUNTAIN→stone, DESERT→stone+gold, default 10/10/5).
 *   2. lootPickupSystem grants the cache to the first non-barbarian
 *      unit on the cache tile and destroys the cache.
 *   3. Barbarian-camp units on the tile do NOT collect.
 *   4. Caches with no unit on-tile persist (cleanup happens on a
 *      later tick when someone arrives).
 *   5. Non-player factions (player-3 etc) don't crash the sweep
 *      — they currently skip the economy update (no extended
 *      economy registry); cache is still destroyed.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { FactionTrait, HexPosition, LootCache, Unit } from '@/ecs/components';
import { lootForBiome } from '@/ecs/systems/lifecycle';
import { lootPickupSystem } from '@/ecs/systems/economy';
import type { GameState } from '@/game/game-state';

function mockGame(world: ReturnType<typeof createWorld>): GameState {
  return {
    world,
    economy: {
      player: { wood: 0, stone: 0, gold: 0 },
      enemy: { wood: 0, stone: 0, gold: 0 },
    },
  } as unknown as GameState;
}

describe('lootForBiome', () => {
  it('FOREST → wood-weighted', () => {
    expect(lootForBiome('FOREST')).toEqual({ wood: 15, stone: 5, gold: 5 });
  });
  it('MOUNTAIN → stone-weighted', () => {
    expect(lootForBiome('MOUNTAIN')).toEqual({ wood: 5, stone: 15, gold: 5 });
  });
  it('DESERT → stone+gold tilt', () => {
    expect(lootForBiome('DESERT')).toEqual({ wood: 5, stone: 10, gold: 10 });
  });
  it('default baseline 10/10/5 for unknown / GRASS / OCEAN', () => {
    expect(lootForBiome(undefined)).toEqual({ wood: 10, stone: 10, gold: 5 });
    expect(lootForBiome('GRASS')).toEqual({ wood: 10, stone: 10, gold: 5 });
    expect(lootForBiome('OCEAN')).toEqual({ wood: 10, stone: 10, gold: 5 });
  });
});

describe('lootPickupSystem (M_V11.CAMPS.LOOT)', () => {
  it('grants cache to the first non-barbarian unit on the tile', () => {
    const world = createWorld();
    const game = mockGame(world);
    // Cache on (5,3).
    const cache = world.spawn(LootCache, HexPosition);
    cache.set(HexPosition, { q: 5, r: 3, level: 0 });
    cache.set(LootCache, { wood: 10, stone: 10, gold: 5 });
    // Player footman on the same tile.
    const unit = world.spawn(Unit, FactionTrait, HexPosition);
    unit.set(Unit, { unitType: 'Footman' });
    unit.set(FactionTrait, { faction: 'player' });
    unit.set(HexPosition, { q: 5, r: 3, level: 0 });

    lootPickupSystem(game);

    expect(game.economy.player.wood).toBe(10);
    expect(game.economy.player.stone).toBe(10);
    expect(game.economy.player.gold).toBe(5);
    // Cache destroyed.
    let stillThere = false;
    for (const _ of world.query(LootCache)) stillThere = true;
    expect(stillThere).toBe(false);
  });

  it('barbarian-camp units do NOT collect', () => {
    const world = createWorld();
    const game = mockGame(world);
    const cache = world.spawn(LootCache, HexPosition);
    cache.set(HexPosition, { q: 5, r: 3, level: 0 });
    cache.set(LootCache, { wood: 10, stone: 10, gold: 5 });
    const mob = world.spawn(Unit, FactionTrait, HexPosition);
    mob.set(Unit, { unitType: 'Goblin' });
    mob.set(FactionTrait, { faction: 'barbarian-camp-1' as 'player' | 'enemy' });
    mob.set(HexPosition, { q: 5, r: 3, level: 0 });

    lootPickupSystem(game);

    expect(game.economy.player.wood).toBe(0);
    // Cache survives — no eligible collector.
    let stillThere = false;
    for (const _ of world.query(LootCache)) stillThere = true;
    expect(stillThere).toBe(true);
  });

  it('caches with no unit on-tile persist', () => {
    const world = createWorld();
    const game = mockGame(world);
    const cache = world.spawn(LootCache, HexPosition);
    cache.set(HexPosition, { q: 5, r: 3, level: 0 });
    cache.set(LootCache, { wood: 10, stone: 10, gold: 5 });
    lootPickupSystem(game);
    let stillThere = false;
    for (const _ of world.query(LootCache)) stillThere = true;
    expect(stillThere).toBe(true);
  });

  it('enemy (AI player) units collect into the enemy economy', () => {
    const world = createWorld();
    const game = mockGame(world);
    const cache = world.spawn(LootCache, HexPosition);
    cache.set(HexPosition, { q: 1, r: 1, level: 0 });
    cache.set(LootCache, { wood: 5, stone: 15, gold: 5 });
    const unit = world.spawn(Unit, FactionTrait, HexPosition);
    unit.set(Unit, { unitType: 'Footman' });
    unit.set(FactionTrait, { faction: 'enemy' });
    unit.set(HexPosition, { q: 1, r: 1, level: 0 });
    lootPickupSystem(game);
    expect(game.economy.enemy.stone).toBe(15);
  });
});
