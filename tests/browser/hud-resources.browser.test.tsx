import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';

describe('HUD resource bar', () => {
  it('shows the opening resource totals', async () => {
    await render(<App />);
    await vi.waitFor(
      () => {
        expect(document.getElementById('val-wood')?.textContent).toBe('50');
        expect(document.getElementById('val-stone')?.textContent).toBe('20');
        expect(document.getElementById('val-gold')?.textContent).toBe('20');
      },
      { timeout: 5000, interval: 100 },
    );
  });

  it('shows supply as used/max', async () => {
    await render(<App />);
    await vi.waitFor(
      () => {
        const supply = document.getElementById('val-supply')?.textContent ?? '';
        expect(supply).toMatch(/^\d+\/\d+$/);
      },
      { timeout: 5000, interval: 100 },
    );
  });
});
