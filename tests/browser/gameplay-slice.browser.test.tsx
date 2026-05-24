import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

/**
 * Real-Chromium baseline coverage for the recent gameplay slices
 * (M_BRAND.1/.2/.3, M_TURNS.1/.2/.3, M_EXPANSION.F.80/.84/.87/.93,
 * M_EXPANSION.AU.48, M_EXPANSION.S.55, M_REFACTOR.1).
 *
 * Visual baseline locks are still TODO (separate item
 * M_TEST.BROWSER.1) — for now we assert the gameplay slices MOUNT
 * cleanly in real Chromium with a fresh game session, which is
 * what was previously only validated via chrome-devtools-mcp probes.
 */
describe('gameplay slice — recent feature commits land cleanly in real Chromium', () => {
  it('canvas + HUD render after entering a game', async () => {
    await render(<App />);
    await enterGame();
    const canvas = document.querySelector('canvas:not(#minimap-canvas)');
    expect(canvas).not.toBeNull();
    // ResourceBar should be visible immediately after mount
    expect(document.querySelector('#hud-resources, [aria-label="Resource totals"]')).not.toBeNull();
    // Minimap region exists
    expect(document.querySelector('[aria-label="Minimap"]')).not.toBeNull();
  });

  it('NewGameModal exposes the M_BRAND.1 mode chips by their lore labels', async () => {
    await render(<App />);
    // Open the New Game modal but DON'T begin.
    const titleBtn = await new Promise<HTMLButtonElement>((resolve) => {
      const interval = setInterval(() => {
        const el = document.getElementById('menu-new-game');
        if (el) {
          clearInterval(interval);
          resolve(el as HTMLButtonElement);
        }
      }, 50);
    });
    titleBtn.click();
    // The 6 brand-aligned mode labels.
    const expected = [
      'Border Clash',
      'Frontier Raid',
      'Long Reign',
      'Strata Wars',
      'Age of Strata',
      'Coexistence',
    ];
    await new Promise((r) => setTimeout(r, 200));
    const text = document.body.textContent ?? '';
    for (const label of expected) {
      expect(text.includes(label), `Mode label "${label}" should appear`).toBe(true);
    }
  });

  it('exposes M_BRAND.3 "Realm preset" + M_EXPANSION.F.84 "Starting bonus" + F.80 "Player colour"', async () => {
    await render(<App />);
    const titleBtn = await new Promise<HTMLButtonElement>((resolve) => {
      const interval = setInterval(() => {
        const el = document.getElementById('menu-new-game');
        if (el) {
          clearInterval(interval);
          resolve(el as HTMLButtonElement);
        }
      }, 50);
    });
    titleBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    const text = document.body.textContent ?? '';
    // Each of the 3 cascaded controls + the 2 orthogonal ones.
    expect(text.includes('Realm preset')).toBe(true);
    expect(text.includes('Map size')).toBe(true);
    expect(text.includes('AI difficulty')).toBe(true);
    expect(text.includes('Turn style')).toBe(true);
    expect(text.includes('Player colour')).toBe(true);
    expect(text.includes('Starting bonus')).toBe(true);
  });
});
