import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

describe('HUD resource bar', () => {
  it('shows the opening resource totals', async () => {
    await render(<App />);
    await enterGame();
    await vi.waitFor(
      () => {
        // M_V11.OPEN.STOCKPILE — opening 80/60/0.
        expect(document.getElementById('val-wood')?.textContent).toBe('80');
        expect(document.getElementById('val-stone')?.textContent).toBe('60');
        expect(document.getElementById('val-gold')?.textContent).toBe('0');
      },
      { timeout: 5000, interval: 100 },
    );
  });

  it('shows supply as used/max', async () => {
    await render(<App />);
    await enterGame();
    await vi.waitFor(
      () => {
        const supply = document.getElementById('val-supply')?.textContent ?? '';
        expect(supply).toMatch(/^\d+\/\d+$/);
      },
      { timeout: 5000, interval: 100 },
    );
  });
});
