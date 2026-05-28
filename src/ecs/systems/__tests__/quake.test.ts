/**
 * M_FUN.DYN.QUAKE — unit tests for the earthquake system.
 *
 * Pins:
 *  1. Returns a clean no-op result on a board with no eligible
 *     tiles (all water / GRASS).
 *  2. Flips at most QUAKE_TUNING.maxFlips tiles per call.
 *  3. Flipped tiles re-derive walkable from biomeFlags (a HIGHLAND
 *     → MOUNTAIN_PASS flip should still be walkable; a MOUNTAIN
 *     → MOUNTAIN_PASS flip should become walkable).
 *  4. Deterministic for a fixed PRNG sequence.
 */
import { describe, expect, it } from 'vitest';
import { QUAKE_TUNING } from '@/config/world';
import type { BoardData, Tile } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { triggerQuake } from '@/ecs/systems/hazards';
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
  return {
    seedPhrase: 'test',
    radius: 4,
    tiles: map,
    crossings: new Map(),
  };
}

function makeStubGame(rng: () => number): GameState {
  return { eventRng: rng } as unknown as GameState;
}

describe('quake', () => {
  it('no-ops cleanly when no eligible tiles exist', () => {
    const game = makeStubGame(() => 0.5);
    const board = makeBoard([tile(0, 0, 'GRASS'), tile(1, 0, 'OCEAN')]);
    const out = triggerQuake(game, board);
    expect(out.epicentre).toBeNull();
    expect(out.flipped).toEqual([]);
  });

  it('flips at most QUAKE_TUNING.maxFlips tiles', () => {
    const game = makeStubGame(() => 0);
    // Build a 5x5 ring of MOUNTAIN tiles, all eligible.
    const tiles: Tile[] = [];
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        tiles.push(tile(q, r, 'MOUNTAIN'));
      }
    }
    const board = makeBoard(tiles);
    const out = triggerQuake(game, board);
    expect(out.flipped.length).toBeLessThanOrEqual(QUAKE_TUNING.maxFlips);
    expect(out.epicentre).not.toBeNull();
    expect(out.shakeSeconds).toBe(QUAKE_TUNING.shakeSeconds);
  });

  it('re-derives walkable after flip (MOUNTAIN -> MOUNTAIN_PASS becomes walkable)', () => {
    const game = makeStubGame(() => 0);
    // Single MOUNTAIN tile — guaranteed to be picked + flipped.
    const tiles = [tile(0, 0, 'MOUNTAIN')];
    const board = makeBoard(tiles);
    expect(board.tiles.get(getHexKey(0, 0))?.walkable).toBe(false);
    triggerQuake(game, board);
    const after = board.tiles.get(getHexKey(0, 0));
    expect(after?.type).toBe('MOUNTAIN_PASS');
    expect(after?.walkable).toBe(true);
  });

  it('is deterministic for a fixed PRNG sequence', () => {
    const seq = [0.1, 0.5, 0.05, 0.9, 0.2, 0.7, 0.4, 0.6, 0.3, 0.8];
    const runOnce = (): string[] => {
      let i = 0;
      const game = makeStubGame(() => seq[i++ % seq.length] ?? 0.5);
      const tiles: Tile[] = [];
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          tiles.push(tile(q, r, 'HIGHLAND'));
        }
      }
      const board = makeBoard(tiles);
      const out = triggerQuake(game, board);
      return [...out.flipped].sort();
    };
    expect(runOnce()).toEqual(runOnce());
  });
});
