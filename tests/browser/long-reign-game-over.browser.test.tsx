import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/modals';

describe('M_POLISH2.MODES.41b — long-reign GameOverModal narrative', () => {
  it('shows the long-reign narrative card when mode is long-reign', async () => {
    const game = startGame({
      seedPhrase: 'lr-go-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'lr-go-test-ev',
      mode: 'long-reign',
    });
    game.outcome = 'win';
    if (game.clock) game.clock.elapsed = 1247; // 20:47
    if (game.randomEvents) game.randomEvents.fired = 4;
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('long-reign-narrative')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const card = document.getElementById('long-reign-narrative') as HTMLDivElement;
    expect(card.textContent).toContain('Survived');
    expect(card.textContent).toContain('20:47');
    expect(card.textContent).toContain('4 escalation');
  });

  it('does NOT show the narrative card in border-clash mode', async () => {
    const game = startGame('lr-go-border');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('game-over-modal')) throw new Error('modal not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    expect(document.getElementById('long-reign-narrative')).toBeNull();
  });
});
