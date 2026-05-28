import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { MatchAgePill } from '@/hud/pills';

/**
 * M_POLISH2.MODES.41 — long-reign match-age chip.
 */
describe('M_POLISH2.MODES.41 — MatchAgePill', () => {
  it('does NOT mount in border-clash mode', async () => {
    const game = startGame('map-border');
    await render(<MatchAgePill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('match-age-pill')).toBeNull();
  });

  it('mounts in long-reign mode with 0:00 at t=0', async () => {
    const game = startGame({
      seedPhrase: 'map-long',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'map-long-ev',
      mode: 'long-reign',
    });
    await render(<MatchAgePill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('match-age-pill')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('match-age-pill') as HTMLDivElement;
    expect(pill.textContent).toContain('0:00');
  });

  it('formats 75 seconds as 1:15', async () => {
    const game = startGame({
      seedPhrase: 'map-long-75',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'map-long-75-ev',
      mode: 'long-reign',
    });
    if (game.clock) game.clock.elapsed = 75;
    await render(<MatchAgePill game={game} />);
    // First-tick render reads initial state; wait beyond the 1s
    // interval so the polled re-read fires + paints the 1:15.
    await new Promise((r) => setTimeout(r, 1100));
    const pill = document.getElementById('match-age-pill') as HTMLDivElement;
    expect(pill?.textContent).toContain('1:15');
  });

  it('hides when outcome is not playing', async () => {
    const game = startGame({
      seedPhrase: 'map-long-win',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'map-long-win-ev',
      mode: 'long-reign',
    });
    game.outcome = 'win';
    await render(<MatchAgePill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('match-age-pill')).toBeNull();
  });
});
