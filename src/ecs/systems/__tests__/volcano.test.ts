/**
 * M_FUN.DYN.VOLCANO — unit tests for the eruption cycle.
 *
 * Pins:
 *  1. Placement is gated by VOLCANO_TUNING.placementChance and only
 *     picks MOUNTAIN tiles ≥5 hexes from origin.
 *  2. After eruptionIntervalSeconds, an eruption lays LAVA on
 *     walkable neighbours + records them in volcano.lavaTiles.
 *  3. LAVA tiles revert to MOUNTAIN_PASS after lavaSeconds.
 *  4. GRASS within fertileRadius gets a fertile-tile timer.
 *  5. Adjacent FOREST ignites WILDFIRE instead of going LAVA.
 *  6. volcanoSystem is a no-op when no volcano is placed.
 */
import { describe, expect, it } from 'vitest';
import { VOLCANO_TUNING } from '@/config/world';
import type { BoardData, Tile } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { createVolcanoState, placeVolcanoLandmark, volcanoSystem } from '@/ecs/systems/volcano';
import type { GameState } from '@/game/game-state';

function tile(q: number, r: number, type: Tile['type'], level = 3): Tile {
  return {
    q,
    r,
    type,
    level,
    walkable: type !== 'OCEAN' && type !== 'LAKE' && type !== 'MOUNTAIN',
    isCrossingLanding: false,
  } as Tile;
}

function makeBoard(tiles: Tile[]): BoardData {
  const map = new Map<string, Tile>();
  for (const t of tiles) map.set(getHexKey(t.q, t.r), t);
  return { seedPhrase: 't', radius: 6, tiles: map, crossings: new Map() };
}

function makeStubGame(board: BoardData, rng: () => number = () => 0.5): GameState {
  return {
    board,
    eventRng: rng,
    volcano: createVolcanoState(),
    wildfires: new Map(),
    world: { query: () => [] },
  } as unknown as GameState;
}

describe('volcano', () => {
  it('places a volcano only when the chance roll passes and only on MOUNTAIN ≥5 from origin', () => {
    const tiles: Tile[] = [];
    // MOUNTAIN at (6, 0) — eligible.
    tiles.push(tile(6, 0, 'MOUNTAIN'));
    // MOUNTAIN at (1, 0) — too close (dist=1).
    tiles.push(tile(1, 0, 'MOUNTAIN'));
    const board = makeBoard(tiles);
    // Force the chance roll < placementChance.
    const pass = placeVolcanoLandmark(board, () => 0);
    expect(pass).toBe(getHexKey(6, 0));
    expect(board.tiles.get(pass!)?.type).toBe('VOLCANO');

    // Reset + force chance roll >= placementChance.
    tiles[0]!.type = 'MOUNTAIN';
    const board2 = makeBoard([tile(6, 0, 'MOUNTAIN')]);
    const fail = placeVolcanoLandmark(board2, () => 0.999);
    expect(fail).toBeNull();
  });

  it('erupts after eruptionIntervalSeconds — lays LAVA on walkable neighbours', () => {
    const tiles: Tile[] = [
      tile(0, 0, 'VOLCANO', 5),
      tile(1, 0, 'GRASS'),
      tile(-1, 0, 'GRASS'),
      tile(0, 1, 'GRASS'),
      tile(0, -1, 'OCEAN', 0),
      tile(1, -1, 'MOUNTAIN', 5),
      tile(-1, 1, 'GRASS'),
    ];
    const board = makeBoard(tiles);
    const game = makeStubGame(board);
    game.volcano.position = getHexKey(0, 0);
    // Tick a full interval — eruption fires exactly once.
    volcanoSystem(game, VOLCANO_TUNING.eruptionIntervalSeconds + 0.01);
    // LAVA on the 4 walkable non-MOUNTAIN non-OCEAN neighbours
    // (1,0), (-1,0), (0,1), (-1,1) = 4 tiles.
    let lavaCount = 0;
    for (const t of board.tiles.values()) if (t.type === 'LAVA') lavaCount++;
    expect(lavaCount).toBe(4);
    expect(game.volcano.lavaTiles.size).toBe(4);
  });

  it('reverts LAVA to MOUNTAIN_PASS after lavaSeconds', () => {
    const tiles = [tile(0, 0, 'VOLCANO', 5), tile(1, 0, 'GRASS')];
    const board = makeBoard(tiles);
    const game = makeStubGame(board);
    game.volcano.position = getHexKey(0, 0);
    volcanoSystem(game, VOLCANO_TUNING.eruptionIntervalSeconds + 0.01);
    expect(board.tiles.get(getHexKey(1, 0))?.type).toBe('LAVA');
    // Now tick past lavaSeconds.
    volcanoSystem(game, VOLCANO_TUNING.lavaSeconds + 0.01);
    expect(board.tiles.get(getHexKey(1, 0))?.type).toBe('MOUNTAIN_PASS');
    expect(game.volcano.lavaTiles.size).toBe(0);
  });

  it('records fertile-tile timers on GRASS within fertileRadius', () => {
    const tiles: Tile[] = [tile(0, 0, 'VOLCANO', 5)];
    // Ring of MOUNTAIN around the volcano so the eruption doesn't
    // consume nearby GRASS as LAVA — we want to assert FERTILE,
    // not LAVA conversion, here.
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, -1],
      [-1, 1],
    ] as const;
    for (const [dq, dr] of dirs) tiles.push(tile(dq, dr, 'MOUNTAIN', 5));
    // GRASS at axial distances: (2,0) dist 2, (3,0) dist 3 (both
    // in-radius=3); (4,0) dist 4 (out).
    tiles.push(tile(2, 0, 'GRASS'));
    tiles.push(tile(3, 0, 'GRASS'));
    tiles.push(tile(4, 0, 'GRASS'));
    const board = makeBoard(tiles);
    const game = makeStubGame(board);
    game.volcano.position = getHexKey(0, 0);
    volcanoSystem(game, VOLCANO_TUNING.eruptionIntervalSeconds + 0.01);
    expect(game.volcano.fertileTiles.has(getHexKey(2, 0))).toBe(true);
    expect(game.volcano.fertileTiles.has(getHexKey(3, 0))).toBe(true);
    expect(game.volcano.fertileTiles.has(getHexKey(4, 0))).toBe(false);
  });

  it('ignites WILDFIRE in adjacent FOREST instead of laying LAVA', () => {
    const tiles = [tile(0, 0, 'VOLCANO', 5), tile(1, 0, 'FOREST')];
    const board = makeBoard(tiles);
    const game = makeStubGame(board);
    game.volcano.position = getHexKey(0, 0);
    volcanoSystem(game, VOLCANO_TUNING.eruptionIntervalSeconds + 0.01);
    expect(board.tiles.get(getHexKey(1, 0))?.type).toBe('FOREST');
    expect(game.wildfires.has(getHexKey(1, 0))).toBe(true);
    expect(game.volcano.lavaTiles.has(getHexKey(1, 0))).toBe(false);
  });

  it('no-ops when no volcano is placed', () => {
    const board = makeBoard([tile(0, 0, 'GRASS')]);
    const game = makeStubGame(board);
    // game.volcano.position remains null.
    expect(() => volcanoSystem(game, 1000)).not.toThrow();
    expect(game.volcano.lavaTiles.size).toBe(0);
  });
});
