import { describe, expect, it } from 'vitest';
import { resign } from '@/game/commands';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('Resign command (M_MODES.10)', () => {
  it('player resign → outcome flips to loss', () => {
    const game = startGame('resign-test-1');
    expect(game.outcome).toBe('playing');
    resign(game, 'player');
    expect(game.outcome).toBe('loss');
  });

  it('enemy resign → outcome flips to win', () => {
    const game = startGame('resign-test-2');
    resign(game, 'enemy');
    expect(game.outcome).toBe('win');
  });

  it('no-op after game already over', () => {
    const game = startGame('resign-test-3');
    resign(game, 'player');
    resign(game, 'enemy');
    // First resign set loss; second is no-op.
    expect(game.outcome).toBe('loss');
  });
});

describe('controlled-tile-time score (M_MODES.10)', () => {
  it('score accumulates each tick proportional to zone size', () => {
    const game = startGame('score-test');
    const before = game.score.player;
    runEconomyTick(game, 1);
    // Player starts with the seeded zone-of-control footprint (~7 tiles).
    // After 1 second of ticking the score should be strictly greater.
    expect(game.score.player).toBeGreaterThan(before);
  });

  it('both factions accumulate independently', () => {
    const game = startGame('score-test-2');
    runEconomyTick(game, 1);
    expect(game.score.player).toBeGreaterThan(0);
    expect(game.score.enemy).toBeGreaterThan(0);
  });
});
