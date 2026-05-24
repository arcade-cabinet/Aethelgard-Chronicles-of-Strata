import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { WinConditionPill } from '@/hud/WinConditionPill';

/**
 * M_POLISH2.MODES.39 — win-condition reminder pill.
 * Pin per-mode copy + hide-when-outcome contract.
 */
describe('M_POLISH2.MODES.39 — WinConditionPill', () => {
  it('renders the border-clash copy by default', async () => {
    const game = startGame('wcp-border');
    await render(<WinConditionPill game={game} />);
    await vi.waitFor(
      () => {
        const pill = document.getElementById('win-condition-pill');
        if (!pill) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('win-condition-pill') as HTMLDivElement;
    expect(pill.textContent).toContain('Destroy enemy base');
  });

  it('renders coexistence copy when mode is coexistence', async () => {
    const game = startGame({
      seedPhrase: 'wcp-coex',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'wcp-coex-ev',
      mode: 'coexistence',
    });
    await render(<WinConditionPill game={game} />);
    await vi.waitFor(
      () => {
        const pill = document.getElementById('win-condition-pill');
        if (!pill) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('win-condition-pill') as HTMLDivElement;
    expect(pill.textContent).toContain('Sandbox');
  });

  it('hides when outcome is not "playing"', async () => {
    const game = startGame('wcp-win');
    game.outcome = 'win';
    await render(<WinConditionPill game={game} />);
    // Wait a short tick — the pill should NOT mount.
    await new Promise((r) => setTimeout(r, 200));
    expect(document.getElementById('win-condition-pill')).toBeNull();
  });
});
