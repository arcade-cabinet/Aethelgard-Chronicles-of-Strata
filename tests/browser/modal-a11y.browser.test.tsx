import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/GameOverModal';

describe('GameOverModal accessibility', () => {
  it('the win modal renders as an accessible dialog', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const dialog = document.getElementById('game-over-modal');
        if (!dialog) throw new Error('modal not open');
        // Radix Dialog.Content carries the dialog role
        expect(dialog.getAttribute('role')).toBe('dialog');
      },
      { timeout: 4000, interval: 100 },
    );
  });

  it('the win modal traps focus inside itself', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const modal = document.getElementById('game-over-modal');
        if (!modal) throw new Error('modal not open');
        // Radix moves focus into the dialog when it opens
        expect(modal.contains(document.activeElement)).toBe(true);
      },
      { timeout: 4000, interval: 100 },
    );
  });

  it('the "Re-enter Aethelgard" button is keyboard-focusable', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'loss';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const button = [...document.querySelectorAll('button')].find(
          (b) => b.textContent === 'Re-enter Aethelgard',
        );
        if (!button) throw new Error('button not found');
        button.focus();
        expect(document.activeElement).toBe(button);
      },
      { timeout: 4000, interval: 100 },
    );
  });
});
