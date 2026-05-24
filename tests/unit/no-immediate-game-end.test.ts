import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_POLISH2.B.3 — game session must NOT end immediately on fresh start.
 *
 * Mobile-audit agent reported the game returning to launcher within
 * ~10 seconds. Pin a smoke test: a freshly-started game with default
 * config ticks for 600 frames (~10 game-seconds at 60Hz) with
 * outcome === 'playing' the whole time.
 *
 * If this fails, we've got a real win-condition bug. If it passes,
 * the mobile-audit observation was misattributed (could've been
 * the agent itself force-flipping outcome via the dev console, or
 * a session-recovery flow we didn't see).
 */
describe('M_POLISH2.B.3 — no immediate game end on fresh start', () => {
  it('border-clash mode stays playing for 600 ticks', () => {
    const game = startGame({
      seedPhrase: 'no-immediate-end-border',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'no-immediate-end-events',
      mode: 'border-clash',
    });
    expect(game.outcome).toBe('playing');
    for (let i = 0; i < 600; i++) {
      runEconomyTick(game, 1 / 60);
      if (game.outcome !== 'playing') {
        throw new Error(`outcome flipped to ${game.outcome} after ${i} ticks`);
      }
    }
    expect(game.outcome).toBe('playing');
  });

  it('coexistence mode (no win condition) stays playing for 600 ticks', () => {
    const game = startGame({
      seedPhrase: 'no-immediate-end-coex',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'no-immediate-end-coex-ev',
      mode: 'coexistence',
    });
    expect(game.outcome).toBe('playing');
    for (let i = 0; i < 600; i++) runEconomyTick(game, 1 / 60);
    expect(game.outcome).toBe('playing');
  });
});
