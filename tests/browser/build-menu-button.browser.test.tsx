import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { BuildMenuButton } from '@/hud/BuildMenuButton';

/**
 * M_POLISH2.B.1 — touch-reachable build FAB.
 * Pin the contract: button mounts at ≥56×56, dispatches the
 * `aethelgard:open-build-menu` CustomEvent on click.
 */
describe('M_POLISH2.B.1 — BuildMenuButton', () => {
  it('renders a 56×56 FAB bottom-right', async () => {
    await render(<BuildMenuButton />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('hud-build-menu-button')) {
          throw new Error('button not mounted');
        }
      },
      { timeout: 4000, interval: 100 },
    );
    const btn = document.getElementById('hud-build-menu-button') as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(56);
    expect(rect.height).toBeGreaterThanOrEqual(56);
    expect(btn.getAttribute('aria-label')).toBe('Open build menu');
  });

  it('dispatches aethelgard:open-build-menu on click', async () => {
    await render(<BuildMenuButton />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('hud-build-menu-button')) {
          throw new Error('button not mounted');
        }
      },
      { timeout: 4000, interval: 100 },
    );
    const heard = vi.fn();
    window.addEventListener('aethelgard:open-build-menu', heard);
    const btn = document.getElementById('hud-build-menu-button') as HTMLButtonElement;
    btn.click();
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener('aethelgard:open-build-menu', heard);
  });
});
