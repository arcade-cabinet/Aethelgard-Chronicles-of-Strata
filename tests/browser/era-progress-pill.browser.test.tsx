import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { EraProgressPill } from '@/hud/EraProgressPill';

describe('M_POLISH2.MODES.43 — EraProgressPill', () => {
  it('does NOT mount in border-clash mode', async () => {
    const game = startGame('epp-border');
    await render(<EraProgressPill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('era-progress-pill')).toBeNull();
  });

  it('mounts in age-of-strata mode showing Stone era at t=0', async () => {
    const game = startGame({
      seedPhrase: 'epp-age',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'epp-age-ev',
      mode: 'age-of-strata',
    });
    await render(<EraProgressPill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('era-progress-pill')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('era-progress-pill') as HTMLDivElement;
    expect(pill.textContent).toContain('Stone');
    expect(pill.textContent).toContain('100🔬');
  });

  it('hides when outcome is not playing', async () => {
    const game = startGame({
      seedPhrase: 'epp-age-win',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'epp-age-win-ev',
      mode: 'age-of-strata',
    });
    game.outcome = 'win';
    await render(<EraProgressPill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('era-progress-pill')).toBeNull();
  });
});
