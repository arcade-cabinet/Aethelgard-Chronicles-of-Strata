/**
 * Onboarding overlay — browser test (M9.1c).
 *
 * On first run (Preferences flag absent), the tutorial Dialog opens with the
 * first step. Clicking Skip dismisses it; the Preferences flag is then set so
 * subsequent runs do not show it.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

describe('onboarding overlay (M9.1c)', () => {
  it('opens on first run, shows step content, and dismisses on Skip', async () => {
    await render(<App />);
    await enterGame();
    // poll for the overlay (Dialog has an async setting load)
    let panel: Element | null = null;
    for (let i = 0; i < 40 && !panel; i++) {
      panel = document.querySelector('#onboarding-overlay');
      if (!panel) await new Promise((r) => setTimeout(r, 50));
    }
    expect(panel).not.toBeNull();
    expect(panel?.textContent ?? '').toMatch(/Aethelgard/i);
    // a Skip button is rendered (M_HUD.SHELL.4 — label is now "Skip tutorial")
    const skipBtn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Skip tutorial' || b.textContent?.trim() === 'Skip',
    );
    expect(skipBtn).toBeDefined();
    skipBtn?.click();
    // poll for the overlay to close
    for (let i = 0; i < 20; i++) {
      if (!document.querySelector('#onboarding-overlay')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(document.querySelector('#onboarding-overlay')).toBeNull();
  });
});
