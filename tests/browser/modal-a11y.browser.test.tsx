import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/GameOverModal';

describe('GameOverModal accessibility', () => {
  it('the win modal has the Radix dialog role and aria-modal', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'win';
    render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).not.toBeNull();
        expect(dialog?.getAttribute('aria-modal')).toBe('true');
      },
      { timeout: 3000, interval: 100 },
    );
  });

  it('the win modal traps focus on an interactive element', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'win';
    render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const modal = document.getElementById('game-over-modal');
        expect(modal).not.toBeNull();
        // Radix moves focus into the dialog when it opens
        expect(modal?.contains(document.activeElement)).toBe(true);
      },
      { timeout: 3000, interval: 100 },
    );
  });

  it('the "Re-enter Aethelgard" button is keyboard-focusable', async () => {
    const game = startGame('ancient-silver-forest');
    game.outcome = 'loss';
    render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        const button = [...document.querySelectorAll('button')].find(
          (b) => b.textContent === 'Re-enter Aethelgard',
        );
        expect(button).toBeDefined();
        button?.focus();
        expect(document.activeElement).toBe(button);
      },
      { timeout: 3000, interval: 100 },
    );
  });
});
