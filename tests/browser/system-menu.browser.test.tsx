/**
 * M_HUD.SHELL.1 — universal SystemMenu (top-right hamburger + slide
 * drawer). Replaces the per-viewport scatter of ResignButton +
 * MobileSystemMenu + SoundToggle pills with a single drawer that
 * mounts on every viewport class.
 *
 * Contracts:
 *   1. Renders a single round 44×44 hamburger trigger top-right.
 *   2. Click opens a Radix Portal drawer with menu rows for Settings,
 *      Discoveries, Legend, Sound (toggle), Resign.
 *   3. Settings row fires the onSettings callback + closes the drawer.
 *   4. Discoveries row dispatches 'aethelgard:open-discoveries' event.
 *   5. Legend row dispatches 'aethelgard:toggle-legend' event.
 *   6. Resign row needs two taps to commit; the first arms a confirm
 *      label, the second calls resign().
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { SystemMenu } from '@/hud/system';

async function waitFor<T>(probe: () => T | null, timeoutMs = 2000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = probe();
    if (v !== null && v !== undefined) return v;
    await new Promise<void>((res) => setTimeout(res, 25));
  }
  const v = probe();
  if (v !== null && v !== undefined) return v;
  throw new Error(`waitFor timeout after ${timeoutMs}ms`);
}

describe('M_HUD.SHELL.1 — SystemMenu', () => {
  it('renders a single hamburger trigger top-right', async () => {
    const game = startGame('sysmenu-trigger');
    await render(<SystemMenu game={game} onSettings={() => {}} />);
    const trigger = await waitFor(() => document.getElementById('system-menu-trigger'));
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toBe('Open system menu');
  });

  it('opens drawer on click and renders all 5 rows', async () => {
    const game = startGame('sysmenu-open');
    await render(<SystemMenu game={game} onSettings={() => {}} />);
    const trigger = await waitFor(() => document.getElementById('system-menu-trigger'));
    trigger?.click();
    await waitFor(() => document.querySelector('[data-testid="system-menu-drawer"]'));
    for (const id of ['settings', 'discoveries', 'legend', 'sound', 'resign']) {
      expect(document.querySelector(`[data-testid="system-menu-${id}"]`)).not.toBeNull();
    }
  });

  it('Settings row fires the onSettings callback', async () => {
    const game = startGame('sysmenu-settings');
    const onSettings = vi.fn();
    await render(<SystemMenu game={game} onSettings={onSettings} />);
    document.getElementById('system-menu-trigger')?.click();
    const settings = await waitFor(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="system-menu-settings"]'),
    );
    settings?.click();
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('Discoveries row dispatches aethelgard:open-discoveries', async () => {
    const game = startGame('sysmenu-discoveries');
    const onDiscoveries = vi.fn();
    window.addEventListener('aethelgard:open-discoveries', onDiscoveries);
    await render(<SystemMenu game={game} onSettings={() => {}} />);
    document.getElementById('system-menu-trigger')?.click();
    const row = await waitFor(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="system-menu-discoveries"]'),
    );
    row?.click();
    expect(onDiscoveries).toHaveBeenCalledTimes(1);
    window.removeEventListener('aethelgard:open-discoveries', onDiscoveries);
  });

  it('Legend row dispatches aethelgard:toggle-legend', async () => {
    const game = startGame('sysmenu-legend');
    const onLegend = vi.fn();
    window.addEventListener('aethelgard:toggle-legend', onLegend);
    await render(<SystemMenu game={game} onSettings={() => {}} />);
    document.getElementById('system-menu-trigger')?.click();
    const row = await waitFor(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="system-menu-legend"]'),
    );
    row?.click();
    expect(onLegend).toHaveBeenCalledTimes(1);
    window.removeEventListener('aethelgard:toggle-legend', onLegend);
  });

  it('Resign row requires two taps to commit (confirm pattern)', async () => {
    const game = startGame('sysmenu-resign');
    await render(<SystemMenu game={game} onSettings={() => {}} />);
    document.getElementById('system-menu-trigger')?.click();
    const row = await waitFor(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="system-menu-resign"]'),
    );
    // First tap arms confirm — label flips, game still 'playing'.
    row?.click();
    await waitFor(() => (row && row.textContent?.includes('Tap again to surrender') ? true : null));
    expect(game.outcome).toBe('playing');
    // Second tap commits.
    row?.click();
    await waitFor(() => (game.outcome === 'loss' ? true : null));
    expect(game.outcome).toBe('loss');
  });
});
