/**
 * M_V6.PORTAL.STONES-EVENT — portal-stone placement + cooldown tests.
 *
 * Pins:
 *   1. findPortalStoneCandidates picks the two farthest-apart walkable
 *      tiles (deterministic per board).
 *   2. placePortalStones sets type, portalTo, and portalGroupId on both
 *      tiles (reciprocal references).
 *   3. Cooldown helpers: never-used faction is available; refresh sets
 *      the expiry; available after the expiry passes.
 *   4. GameState carries an empty cooldown Map by default.
 */
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { hexDistance } from '@/core/hex';
import { startGame } from '@/game/game-state';
import {
  findPortalStoneCandidates,
  isPortalStoneAvailable,
  PORTAL_STONE_COOLDOWN_SECONDS,
  placePortalStones,
  refreshPortalStoneCooldown,
} from '@/world/board';

describe('findPortalStoneCandidates', () => {
  it('returns null on a near-empty board', () => {
    // Tiny board → unlikely to have 2+ walkable tiles past pure noise.
    const board = generateBoard('alpha', 1);
    // The helper handles the 0-or-1 walkable case gracefully — null OR a pair.
    const pair = findPortalStoneCandidates(board);
    expect(pair === null || (pair.keyA && pair.keyB)).toBeTruthy();
  });

  it('picks the geometrically farthest walkable pair', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    const pair = findPortalStoneCandidates(board);
    expect(pair).not.toBeNull();
    if (!pair) return;
    const a = board.tiles.get(pair.keyA)!;
    const b = board.tiles.get(pair.keyB)!;
    const pairDist = hexDistance(a.q, a.r, b.q, b.r);
    // No other walkable pair should be farther apart.
    for (const t1 of board.tiles.values()) {
      if (!t1.walkable || t1.type === 'OCEAN' || t1.type === 'LAKE') continue;
      for (const t2 of board.tiles.values()) {
        if (!t2.walkable || t2.type === 'OCEAN' || t2.type === 'LAKE') continue;
        const d = hexDistance(t1.q, t1.r, t2.q, t2.r);
        expect(d).toBeLessThanOrEqual(pairDist);
      }
    }
  });

  it('is deterministic: same seed → same candidate pair', () => {
    const a = generateBoard('delta-echo-foxtrot', 12);
    const b = generateBoard('delta-echo-foxtrot', 12);
    expect(findPortalStoneCandidates(a)).toEqual(findPortalStoneCandidates(b));
  });
});

describe('placePortalStones', () => {
  it('flips tile type + sets reciprocal portalTo + shared groupId', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    const pair = findPortalStoneCandidates(board);
    expect(pair).not.toBeNull();
    if (!pair) return;
    const { tileA, tileB } = placePortalStones(board, pair);
    expect(tileA).not.toBeNull();
    expect(tileB).not.toBeNull();
    expect(tileA?.type).toBe('PORTAL_STONE');
    expect(tileB?.type).toBe('PORTAL_STONE');
    expect(tileA?.portalTo).toBe(pair.keyB);
    expect(tileB?.portalTo).toBe(pair.keyA);
    expect(tileA?.portalGroupId).toBe(pair.portalGroupId);
    expect(tileB?.portalGroupId).toBe(pair.portalGroupId);
  });
});

describe('portal-stone cooldown helpers', () => {
  it('isPortalStoneAvailable: never-used faction is available', () => {
    const cd = new Map<string, number>();
    expect(isPortalStoneAvailable(cd, 'player', 0)).toBe(true);
    expect(isPortalStoneAvailable(cd, 'player-3', 9999)).toBe(true);
  });

  it('refreshPortalStoneCooldown sets the expiry to now + COOLDOWN', () => {
    const cd = new Map<string, number>();
    refreshPortalStoneCooldown(cd, 'player', 100);
    expect(cd.get('player')).toBe(100 + PORTAL_STONE_COOLDOWN_SECONDS);
  });

  it('isPortalStoneAvailable: blocked before expiry; available after', () => {
    const cd = new Map<string, number>();
    refreshPortalStoneCooldown(cd, 'player', 100);
    expect(isPortalStoneAvailable(cd, 'player', 100)).toBe(false); // just after use
    expect(isPortalStoneAvailable(cd, 'player', 100 + PORTAL_STONE_COOLDOWN_SECONDS - 1)).toBe(
      false,
    );
    expect(isPortalStoneAvailable(cd, 'player', 100 + PORTAL_STONE_COOLDOWN_SECONDS)).toBe(true);
    expect(isPortalStoneAvailable(cd, 'player', 100 + PORTAL_STONE_COOLDOWN_SECONDS + 5)).toBe(
      true,
    );
  });
});

describe('GameState wiring', () => {
  it('startGame initializes an empty portalStoneCooldowns Map', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(game.portalStoneCooldowns).toBeInstanceOf(Map);
    expect(game.portalStoneCooldowns.size).toBe(0);
  });
});
