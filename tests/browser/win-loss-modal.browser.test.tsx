import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/modals';

describe('GameOverModal', () => {
  it('shows the victory modal when the game outcome is "win"', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'win';
    render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const title = document.querySelector('.modal-title-win');
        expect(title?.textContent).toBe('Victory!');
      },
      { timeout: 3000, interval: 100 },
    );
  });

  it('shows the defeat modal when the game outcome is "loss"', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'loss';
    render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const title = document.querySelector('.modal-title-loss');
        expect(title?.textContent).toBe('Defeat!');
      },
      { timeout: 3000, interval: 100 },
    );
  });

  it('renders nothing while the game is still playing', () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'playing';
    render(<GameOverModal game={game} />);
    expect(document.getElementById('game-over-modal')).toBeNull();
  });
});
