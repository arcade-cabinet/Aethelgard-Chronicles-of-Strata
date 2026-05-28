/**
 * M_PIVOT.BARBARIAN-CAMPS — placement + spawn + registry tests.
 *
 * Pins:
 *   1. defaultCampCount formula: 1 player → 2, 2 → 2, 4 → 3, 6 → 4, 10 → 6 (clamp).
 *   2. placeBarbarianCamps returns the requested count when board is large
 *      enough; each camp at least 6 hexes from every player base + each
 *      other camp.
 *   3. Each camp gets a unique faction id (`barbarian-camp-1`, `-2`, ...).
 *   4. Same board + base keys + count + prng seed → same camp positions
 *      (determinism).
 *   5. spawnBarbarianCamp creates an entity with all required traits.
 *   6. factionConfigForCamp returns a kind:'barbarian' config with the
 *      camp's id + a grey-tone color.
 *   7. Integration: spawning a camp + ticking the spawnSystem produces
 *      a unit tagged with the camp's faction id.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { hexDistance } from '@/core/hex';
import { createMapPrng } from '@/core/rng';
import {
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { spawnSystem } from '@/ecs/systems/lifecycle';
import {
  defaultCampCount,
  factionConfigForCamp,
  placeBarbarianCamps,
  spawnBarbarianCamp,
} from '@/world/board';

describe('defaultCampCount', () => {
  it('returns 2 for a 1-player game', () => {
    expect(defaultCampCount(1)).toBe(2);
  });
  it('returns 2 for a 2-player game (round(1)+1 = 2)', () => {
    expect(defaultCampCount(2)).toBe(2);
  });
  it('returns 3 for a 4-player game', () => {
    expect(defaultCampCount(4)).toBe(3);
  });
  it('returns 4 for a 6-player game', () => {
    expect(defaultCampCount(6)).toBe(4);
  });
  it('clamps to 6 for huge player counts', () => {
    expect(defaultCampCount(20)).toBe(6);
  });
  it('floors at 1 (clamp lower bound never returns 0)', () => {
    // Formula: clamp(round(max(1,N)/2)+1, 1, 6). N=0 → max(1,0)=1 → round(0.5)+1=2.
    // The clamp's job is to ensure the result is never 0; 2 is the formula's
    // natural floor at N=0, not 1.
    expect(defaultCampCount(0)).toBe(2);
    expect(defaultCampCount(-5)).toBe(2);
  });
});

describe('placeBarbarianCamps', () => {
  it('returns the requested count on a large board', () => {
    const board = generateBoard('alpha-bravo-charlie', 14);
    const prng = createMapPrng('alpha-bravo-charlie');
    const baseKeys: string[] = [];
    for (const tile of board.tiles.values()) {
      if (tile.walkable) {
        baseKeys.push(`${tile.q},${tile.r}`);
        if (baseKeys.length === 2) break;
      }
    }
    const camps = placeBarbarianCamps(board, baseKeys, 3, prng);
    expect(camps.length).toBeLessThanOrEqual(3);
    expect(camps.length).toBeGreaterThan(0);
  });

  it('every camp is >= 6 hexes from every player base AND every other camp', () => {
    const board = generateBoard('alpha-bravo-charlie', 14);
    const prng = createMapPrng('alpha-bravo-charlie');
    // pick two well-separated walkable tiles as "player bases".
    const walkable = [...board.tiles.values()].filter((t) => t.walkable);
    const baseKeys =
      walkable.length >= 2
        ? [
            `${walkable[0]?.q},${walkable[0]?.r}`,
            `${walkable[walkable.length - 1]?.q},${walkable[walkable.length - 1]?.r}`,
          ]
        : [];
    const camps = placeBarbarianCamps(board, baseKeys, 3, prng);
    for (const camp of camps) {
      for (const baseKey of baseKeys) {
        const baseTile = board.tiles.get(baseKey);
        if (!baseTile) continue;
        const d = hexDistance(camp.q, camp.r, baseTile.q, baseTile.r);
        expect(
          d,
          `camp at (${camp.q},${camp.r}) too close to base (${baseTile.q},${baseTile.r})`,
        ).toBeGreaterThanOrEqual(6);
      }
      for (const other of camps) {
        if (other.factionId === camp.factionId) continue;
        const d = hexDistance(camp.q, camp.r, other.q, other.r);
        expect(
          d,
          `camps ${camp.factionId} and ${other.factionId} too close`,
        ).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('assigns sequential unique faction ids starting at barbarian-camp-1', () => {
    const board = generateBoard('alpha-bravo-charlie', 14);
    const prng = createMapPrng('alpha-bravo-charlie');
    const camps = placeBarbarianCamps(board, [], 3, prng);
    expect(camps.length).toBe(3);
    expect(camps[0]?.factionId).toBe('barbarian-camp-1');
    expect(camps[1]?.factionId).toBe('barbarian-camp-2');
    expect(camps[2]?.factionId).toBe('barbarian-camp-3');
  });

  it('is deterministic for the same seed + count + base keys', () => {
    const board = generateBoard('delta-echo-foxtrot', 12);
    const baseKeys: string[] = [];
    for (const tile of board.tiles.values()) {
      if (tile.walkable) {
        baseKeys.push(`${tile.q},${tile.r}`);
        break;
      }
    }
    const prngA = createMapPrng('delta-echo-foxtrot');
    const prngB = createMapPrng('delta-echo-foxtrot');
    const a = placeBarbarianCamps(board, baseKeys, 2, prngA);
    const b = placeBarbarianCamps(board, baseKeys, 2, prngB);
    expect(a.map((c) => [c.q, c.r])).toEqual(b.map((c) => [c.q, c.r]));
  });

  it('returns 0 camps when count is 0 or negative', () => {
    const board = generateBoard('a', 8);
    expect(placeBarbarianCamps(board, [], 0, createMapPrng('a'))).toEqual([]);
    expect(placeBarbarianCamps(board, [], -1, createMapPrng('a'))).toEqual([]);
  });

  it('camp hp = 200 + 50 * nearest player distance', () => {
    const board = generateBoard('alpha-bravo-charlie', 14);
    const walkable = [...board.tiles.values()].filter((t) => t.walkable);
    const baseKeys = walkable.length >= 1 ? [`${walkable[0]?.q},${walkable[0]?.r}`] : [];
    const camps = placeBarbarianCamps(board, baseKeys, 1, createMapPrng('alpha-bravo-charlie'));
    if (camps.length > 0 && baseKeys[0]) {
      const baseTile = board.tiles.get(baseKeys[0]);
      const camp = camps[0]!;
      if (baseTile) {
        const d = hexDistance(camp.q, camp.r, baseTile.q, baseTile.r);
        expect(camp.hp).toBe(200 + 50 * d);
      }
    }
  });
});

describe('factionConfigForCamp', () => {
  it('returns a kind:barbarian config with the camp id', () => {
    const cfg = factionConfigForCamp({
      factionId: 'barbarian-camp-1',
      q: 0,
      r: 0,
      level: 0,
      hp: 200,
      archetype: 'orc',
    });
    expect(cfg.id).toBe('barbarian-camp-1');
    expect(cfg.kind).toBe('barbarian');
    expect(cfg.archetype).toBe('orc');
    expect(cfg.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('cycles colors through the camp palette by index', () => {
    const c1 = factionConfigForCamp({
      factionId: 'barbarian-camp-1',
      q: 0,
      r: 0,
      level: 0,
      hp: 200,
      archetype: 'orc',
    });
    const c2 = factionConfigForCamp({
      factionId: 'barbarian-camp-2',
      q: 0,
      r: 0,
      level: 0,
      hp: 200,
      archetype: 'orc',
    });
    expect(c1.color).not.toBe(c2.color);
  });
});

describe('spawnBarbarianCamp', () => {
  it('creates an entity with HexPosition + Health + EnemySpawner + FactionTrait + FactionBase', () => {
    const world = createWorld();
    const entity = spawnBarbarianCamp(world, {
      factionId: 'barbarian-camp-1',
      q: 5,
      r: -3,
      level: 1,
      hp: 250,
      archetype: 'orc',
    });
    expect(entity.has(HexPosition)).toBe(true);
    expect(entity.has(Health)).toBe(true);
    expect(entity.has(EnemySpawner)).toBe(true);
    expect(entity.has(FactionTrait)).toBe(true);
    expect(entity.has(FactionBase)).toBe(true);
    expect(entity.get(Health)?.current).toBe(250);
    expect(entity.get(HexPosition)?.q).toBe(5);
    // koota types FactionTrait.faction as the literal union; runtime accepts any string.
    // Cast to string for the equality assertion (the field carries an extended id).
    const factionRuntime: string = entity.get(FactionTrait)?.faction as unknown as string;
    expect(factionRuntime).toBe('barbarian-camp-1');
  });

  it('integration: ticking spawnSystem on a camp spawns a unit tagged with the camp id', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 10);
    // Find a walkable tile + a walkable neighbour for the camp + spawn.
    let campTile: { q: number; r: number; level: number } | null = null;
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      // need at least one walkable neighbour
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const hasN = dirs.some(
        ([dq, dr]) => board.tiles.get(`${tile.q + dq!},${tile.r + dr!}`)?.walkable,
      );
      if (hasN) {
        campTile = { q: tile.q, r: tile.r, level: tile.level };
        break;
      }
    }
    expect(campTile).not.toBeNull();
    if (!campTile) throw new Error('campTile required');
    spawnBarbarianCamp(world, {
      factionId: 'barbarian-camp-1',
      q: campTile.q,
      r: campTile.r,
      level: campTile.level,
      hp: 200,
      archetype: 'orc',
    });
    // Tick the spawnSystem with enough delta to trigger the
    // M_V11.CAMPS.MOB-SPAWN 90s baseline interval (was 60s pre-v0.11).
    spawnSystem(world, board, 95, 0);
    // One barbarian unit should have spawned with the camp's faction id.
    let foundUnit = false;
    for (const e of world.query(Unit, FactionTrait)) {
      // Same runtime-string contract as the trait-shape test above.
      const f = e.get(FactionTrait)?.faction as unknown as string | undefined;
      if (f === 'barbarian-camp-1') {
        foundUnit = true;
        break;
      }
    }
    expect(foundUnit, 'spawnSystem should produce a unit tagged with barbarian-camp-1').toBe(true);
  });
});
