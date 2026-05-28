/**
 * M_FUN.ATTR.DISEASE + .DEHYDRATION — statusAttributesSystem tests.
 *
 * Pins: disease ticks HP -1/sec while set; Healer in 2-hex range
 * clears disease instantly; standing off SWAMP for 5+ sec recovers;
 * dehydration recovers when off DESERT for 3+ sec; entities without
 * the attribute are untouched.
 */
import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import { Building, FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';
import { statusAttributesSystem } from '@/ecs/systems/meta';
import { createEcsWorld } from '@/ecs/world';

function tilesAt(q: number, r: number, type: Tile['type']): BoardData['tiles'] {
  const m = new Map<string, Tile>();
  m.set(`${q},${r}`, {
    q,
    r,
    type,
    level: 1,
    moisture: 0.5,
    walkable: true,
    isCrossingLanding: false,
  });
  return m;
}

describe('statusAttributesSystem (M_FUN.ATTR)', () => {
  it('disease ticks HP -1 per sim-second on SWAMP', () => {
    const world = createEcsWorld();
    const tiles = tilesAt(0, 0, 'SWAMP');
    const e = world.spawn(
      HexPosition({ q: 0, r: 0, level: 1 }),
      Health({
        current: 50,
        max: 50,
        disease: 5,
        diseaseRecoveryTimer: 0,
        dehydration: 0,
        dehydrationRecoveryTimer: 0,
      }),
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
    );
    statusAttributesSystem(world, tiles, 1);
    expect(e.get(Health)?.current).toBe(49);
  });

  it('Healer in 2-hex range clears disease', () => {
    const world = createEcsWorld();
    const tiles = tilesAt(0, 0, 'SWAMP');
    const sick = world.spawn(
      HexPosition({ q: 0, r: 0, level: 1 }),
      Health({
        current: 50,
        max: 50,
        disease: 5,
        diseaseRecoveryTimer: 0,
        dehydration: 0,
        dehydrationRecoveryTimer: 0,
      }),
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
    );
    world.spawn(
      HexPosition({ q: 1, r: 0, level: 1 }),
      FactionTrait({ faction: 'player' }),
      Unit({ unitType: 'Healer' }),
    );
    statusAttributesSystem(world, tiles, 1);
    expect(sick.get(Health)?.disease).toBe(0);
    // current HP unchanged because the heal happens BEFORE the tick.
    expect(sick.get(Health)?.current).toBe(50);
  });

  it('off-SWAMP for 5+ seconds recovers disease', () => {
    const world = createEcsWorld();
    const tiles = tilesAt(0, 0, 'GRASS');
    const e = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Health({
        current: 50,
        max: 50,
        disease: 5,
        diseaseRecoveryTimer: 0,
        dehydration: 0,
        dehydrationRecoveryTimer: 0,
      }),
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
    );
    for (let i = 0; i < 6; i++) statusAttributesSystem(world, tiles, 1);
    expect(e.get(Health)?.disease).toBe(0);
  });

  it('buildings on SWAMP are NOT damaged by terrain ticks', () => {
    // Coderabbit MAJOR PR #10 04:56Z: the system used to query
    // Health+HexPosition, so a Palace planted on a SWAMP tile
    // took -1 HP/tick from the disease branch. Adding Unit to the
    // query gates the loop to mobile combatants only.
    const world = createEcsWorld();
    const tiles = tilesAt(0, 0, 'SWAMP');
    const palace = world.spawn(
      HexPosition({ q: 0, r: 0, level: 1 }),
      Health({
        current: 500,
        max: 500,
        disease: 5,
        diseaseRecoveryTimer: 0,
        dehydration: 0,
        dehydrationRecoveryTimer: 0,
      }),
      Building({ buildingType: 'Palace', isComplete: true, progress: 1, tier: 1 }),
      FactionTrait({ faction: 'player' }),
    );
    for (let i = 0; i < 10; i++) statusAttributesSystem(world, tiles, 1);
    expect(palace.get(Health)?.current).toBe(500);
  });

  it('off-DESERT for 3+ seconds recovers dehydration', () => {
    const world = createEcsWorld();
    const tiles = tilesAt(0, 0, 'GRASS');
    const e = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Health({
        current: 50,
        max: 50,
        disease: 0,
        diseaseRecoveryTimer: 0,
        dehydration: 5,
        dehydrationRecoveryTimer: 0,
      }),
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
    );
    for (let i = 0; i < 4; i++) statusAttributesSystem(world, tiles, 1);
    expect(e.get(Health)?.dehydration).toBe(0);
  });
});
