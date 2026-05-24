import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { ZoneControlPill } from '@/hud/ZoneControlPill';

describe('M_POLISH2.MODES.42 — ZoneControlPill', () => {
  it('does NOT mount in border-clash mode', async () => {
    const game = startGame('zcp-border');
    await render(<ZoneControlPill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('zone-control-pill')).toBeNull();
  });

  it('mounts in strata-wars mode and reads % from game.zones', async () => {
    const game = startGame({
      seedPhrase: 'zcp-strata',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'zcp-strata-ev',
      mode: 'strata-wars',
    });
    await render(<ZoneControlPill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('zone-control-pill')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const pill = document.getElementById('zone-control-pill') as HTMLDivElement;
    expect(pill.textContent).toMatch(/\d+%/);
  });

  it('hides when outcome is not playing', async () => {
    const game = startGame({
      seedPhrase: 'zcp-strata-win',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'zcp-strata-win-ev',
      mode: 'strata-wars',
    });
    game.outcome = 'win';
    await render(<ZoneControlPill game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('zone-control-pill')).toBeNull();
  });
});
