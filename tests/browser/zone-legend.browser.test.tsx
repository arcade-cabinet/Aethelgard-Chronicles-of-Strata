/**
 * Zone legend — browser test (M9.1b + M_HUD.SHELL.1).
 *
 * The legend panel is now hidden by default and toggled via the
 * universal SystemMenu drawer's "Zone Legend" row (dispatches the
 * `aethelgard:toggle-legend` CustomEvent the panel listens for).
 * The standalone bottom-left "Legend" pill that used to live here
 * was removed as part of the HUD overhaul that consolidated system
 * chrome into a single top-right hamburger.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

describe('zone legend (M9.1b + M_HUD.SHELL.1)', () => {
  it('is hidden by default; opens via aethelgard:toggle-legend CustomEvent', async () => {
    await render(<App />);
    await enterGame();
    // Standalone pill is gone — chrome now lives in SystemMenu only.
    expect(document.querySelector('[aria-label="Open territory legend"]')).toBeNull();
    // Panel is collapsed by default.
    expect(document.querySelector('#zone-legend')).toBeNull();
    // Dispatching the toggle event opens the panel (this is the same
    // event the SystemMenu's "Zone Legend" row fires).
    window.dispatchEvent(new CustomEvent('aethelgard:toggle-legend'));
    let panel: Element | null = null;
    for (let i = 0; i < 20 && !panel; i++) {
      panel = document.querySelector('#zone-legend');
      if (!panel) await new Promise((r) => setTimeout(r, 50));
    }
    expect(panel).not.toBeNull();
    expect(panel?.textContent ?? '').toMatch(/zone of control/i);
    expect(panel?.textContent ?? '').toMatch(/Contested/i);
    // Toggling again hides the panel.
    window.dispatchEvent(new CustomEvent('aethelgard:toggle-legend'));
    for (let i = 0; i < 20; i++) {
      if (!document.querySelector('#zone-legend')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(document.querySelector('#zone-legend')).toBeNull();
  });
});
