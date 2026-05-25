/**
 * M_V7.PORTAL-STONES.TRIGGER — random-event roll for the rare
 * portal-stones placement.
 *
 * Pins:
 *   1. Clock <= 300s rejected (5-min warmup gate).
 *   2. Random roll above the 1-in-200 threshold rejected.
 *   3. Idempotent — fires at most once per match (second call returns
 *      null even with a passing roll).
 *   4. Successful roll mutates board.tiles with both stones present
 *      + reciprocal portalTo.
 */
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { tickPortalStonesTrigger } from '@/world/portal-stones';

describe('tickPortalStonesTrigger', () => {
  it('returns null when clock <= 300s (5-min warmup)', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    expect(tickPortalStonesTrigger(board, () => 0, 100)).toBeNull();
    expect(tickPortalStonesTrigger(board, () => 0, 300)).toBeNull();
  });

  it('returns null when random roll exceeds 1/200', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    // 0.01 > 0.005 → fails the threshold.
    expect(tickPortalStonesTrigger(board, () => 0.01, 500)).toBeNull();
  });

  it('places both stones on a passing roll past the warmup', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    // 0 is well under 1/200 = 0.005.
    const pair = tickPortalStonesTrigger(board, () => 0, 500);
    expect(pair).not.toBeNull();
    if (!pair) return;
    const tileA = board.tiles.get(pair.keyA);
    const tileB = board.tiles.get(pair.keyB);
    expect(tileA?.type).toBe('PORTAL_STONE');
    expect(tileB?.type).toBe('PORTAL_STONE');
    expect(tileA?.portalTo).toBe(pair.keyB);
    expect(tileB?.portalTo).toBe(pair.keyA);
  });

  it('idempotent — second call returns null even with passing roll', () => {
    const board = generateBoard('alpha-bravo-charlie', 12);
    const first = tickPortalStonesTrigger(board, () => 0, 500);
    expect(first).not.toBeNull();
    const second = tickPortalStonesTrigger(board, () => 0, 600);
    expect(second).toBeNull();
  });
});
