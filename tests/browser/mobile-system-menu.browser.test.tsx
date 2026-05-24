import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { MobileSystemMenu } from '@/hud/MobileSystemMenu';

/**
 * M_POLISH2.MOBILE.15 — top-left hamburger that collapses Resign
 * + Settings into one menu on portrait phones.
 */
describe('M_POLISH2.MOBILE.15 — MobileSystemMenu', () => {
  it('renders a 44×44 hamburger trigger top-left', async () => {
    const game = startGame('mobile-sys-menu-trigger');
    await render(<MobileSystemMenu game={game} onSettings={() => {}} />);
    await vi.waitFor(
      () => {
        const btn = document.getElementById('mobile-system-menu-trigger');
        if (!btn) throw new Error('trigger not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const btn = document.getElementById('mobile-system-menu-trigger') as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(btn.getAttribute('aria-label')).toBe('System menu');
  });

  // NOTE: Radix DropdownMenu uses native pointerdown events; programmatic
  // .click() in vitest-browser doesn't always reliably open the portal.
  // The trigger contract (above) + Radix's own test coverage cover the
  // rest. An e2e Playwright test should drive the real touch flow when
  // we add per-mode e2e coverage in M_POLISH2.E2E.
});
