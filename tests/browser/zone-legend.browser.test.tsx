/**
 * Zone legend — browser test (M9.1b).
 *
 * The legend pill renders, is collapsed by default, and expanding it reveals
 * the territory glossary (player zone, enemy zone, contested pulse, etc).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

describe('zone legend (M9.1b)', () => {
  it('renders the legend pill in-game; expands to reveal the glossary', async () => {
    await render(<App />);
    await enterGame();
    // pill is present and shows the "?" label by default
    const pill = document.querySelector('[aria-label="Toggle territory legend"]');
    expect(pill).not.toBeNull();
    expect(pill?.textContent ?? '').toContain('Legend');
    // expanded panel is hidden by default
    expect(document.querySelector('#zone-legend')).toBeNull();
    // clicking expands the panel
    (pill as HTMLButtonElement).click();
    // poll briefly for the DOM update
    let panel: Element | null = null;
    for (let i = 0; i < 20 && !panel; i++) {
      panel = document.querySelector('#zone-legend');
      if (!panel) await new Promise((r) => setTimeout(r, 50));
    }
    expect(panel).not.toBeNull();
    expect(panel?.textContent ?? '').toMatch(/zone of control/i);
    expect(panel?.textContent ?? '').toMatch(/Contested/i);
  });
});
