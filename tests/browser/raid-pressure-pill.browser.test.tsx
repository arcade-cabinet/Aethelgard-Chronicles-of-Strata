import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { RaidPressurePill } from '@/hud/RaidPressurePill';

/**
 * M_POLISH2.MODES.40 — pin the mount-only-in-frontier-raid contract.
 */
describe('M_POLISH2.MODES.40 — RaidPressurePill', () => {
  it('does NOT mount in border-clash mode', async () => {
    const game = startGame('rpp-border');
    await render(<RaidPressurePill game={game} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(document.getElementById('raid-pressure-pill')).toBeNull();
  });

  it('mounts in frontier-raid mode with the Calm label at t=0', async () => {
    const game = startGame({
      seedPhrase: 'rpp-frontier',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'rpp-frontier-ev',
      mode: 'frontier-raid',
    });
    await render(<RaidPressurePill game={game} />);
    await vi.waitFor(
      () => {
        const pill = document.getElementById('raid-pressure-pill');
        if (!pill) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('raid-pressure-pill') as HTMLDivElement;
    expect(pill.textContent).toContain('Calm');
  });

  it('hides when outcome is not playing', async () => {
    const game = startGame({
      seedPhrase: 'rpp-frontier-win',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'rpp-frontier-win-ev',
      mode: 'frontier-raid',
    });
    game.outcome = 'win';
    await render(<RaidPressurePill game={game} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(document.getElementById('raid-pressure-pill')).toBeNull();
  });
});
