/**
 * M_FUN.MAP.SWAMP.HARNESS — composition test.
 *
 * Pins the contract per PRD-v0.4 §3 "composition pressure":
 * 5 Footmen standing on SWAMP die in <50 sim-seconds.
 * 4 Footmen + 1 Healer on SWAMP survive indefinitely (the
 * Healer-clear loop holds disease at 0).
 *
 * M_FUN.TEST.SWAMP-COMPOSITION-SPEC — assertions are spec-driven:
 *   - Death test: asserts all dead by 50 sim-sec (not by counting ticks
 *     to a magic `current === 50` sentinel).
 *   - Healer test: asserts survivors alive (current > 0), not at exact
 *     starting HP (which is tick-order-coupled if disease fires first).
 *
 * Unit-level test (cheaper than a browser harness) — runs
 * statusAttributesSystem in a loop, asserts survivor counts.
 */
import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import { FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';
import { statusAttributesSystem } from '@/ecs/systems/meta';
import { createEcsWorld } from '@/ecs/world';

function swampMap(): BoardData['tiles'] {
  const tiles = new Map<string, Tile>();
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      tiles.set(`${q},${r}`, {
        q,
        r,
        type: 'SWAMP',
        level: 1,
        moisture: 0.5,
        walkable: true,
        isCrossingLanding: false,
      });
    }
  }
  return tiles;
}

function spawnFootman(world: ReturnType<typeof createEcsWorld>, q: number, r: number) {
  return world.spawn(
    HexPosition({ q, r, level: 1 }),
    Health({
      current: 50,
      max: 50,
      disease: 5,
      diseaseRecoveryTimer: 0,
      dehydration: 0,
      dehydrationRecoveryTimer: 0,
    }),
    FactionTrait({ faction: 'player' }),
    Unit({ unitType: 'Footman' }),
  );
}

describe('SWAMP composition pressure (M_FUN.MAP.SWAMP.HARNESS)', () => {
  it('5 Footmen on SWAMP all die within 50 sim-seconds (spec: <50s death)', () => {
    const world = createEcsWorld();
    const tiles = swampMap();
    const footmen = [
      spawnFootman(world, 0, 0),
      spawnFootman(world, 1, 0),
      spawnFootman(world, -1, 0),
      spawnFootman(world, 0, 1),
      spawnFootman(world, 0, -1),
    ];
    // Disease was set to 5; each tick re-checks the biome. Without any
    // Healer (every tile is SWAMP, recovery timer never accumulates) HP
    // bleeds 1/sec. Spec says "die in <50 sim-seconds" — assert at 50s.
    for (let i = 0; i < 50; i++) statusAttributesSystem(world, tiles, 1);
    const survivors = footmen.filter((e) => (e.get(Health)?.current ?? 0) > 0).length;
    expect(survivors).toBe(0);
  });

  it('4 Footmen + 1 Healer on SWAMP all survive (Healer clears disease before damage)', () => {
    const world = createEcsWorld();
    const tiles = swampMap();
    const footmen = [
      spawnFootman(world, 0, 0),
      spawnFootman(world, 1, 0),
      spawnFootman(world, -1, 0),
      spawnFootman(world, 0, 1),
    ];
    // Healer in the middle — every Footman is in 2-hex range.
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 1 }),
      FactionTrait({ faction: 'player' }),
      Unit({ unitType: 'Healer' }),
    );
    // Spec: Healer in 2-hex range holds disease at 0 so Footmen survive.
    // Assert alive (current > 0), not at exact starting HP — the first
    // tick may apply disease before the Healer clears it, so HP may not
    // be exactly at max. The structural guarantee is: no Footman dies.
    for (let i = 0; i < 60; i++) statusAttributesSystem(world, tiles, 1);
    const survivors = footmen.filter((e) => (e.get(Health)?.current ?? 0) > 0).length;
    expect(survivors).toBe(4);
  });
});
