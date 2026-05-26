import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { SettingsModal } from '@/hud/SettingsModal';
import { createPersistence } from '@/persistence/persistence';

/**
 * M_POLISH2.MOBILE.7 — settings modal one-handed reachability.
 * The Done button sits in a position-sticky footer so it stays
 * visible at the bottom even when the modal body scrolls (e.g. the
 * hotkey editor + 4 volume sliders make the panel taller than the
 * portrait viewport on a small phone).
 */
describe('M_POLISH2.MOBILE.7 — SettingsModal sticky footer', () => {
  it('mounts a Done button with a sticky-positioned parent', async () => {
    const persistence = createPersistence();
    await render(<SettingsModal open={true} onOpenChange={() => {}} persistence={persistence} />);
    await vi.waitFor(
      () => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.textContent?.trim() === 'Done',
        );
        if (!btn) throw new Error('Done button not found');
      },
      { timeout: 4000, interval: 100 },
    );
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Done',
    );
    if (!btn) throw new Error('Done button missing');
    const parent = btn.parentElement;
    if (!parent) throw new Error('parent missing');
    const style = window.getComputedStyle(parent);
    expect(style.position).toBe('sticky');
    expect(style.bottom).toBe('0px');
  });

  it('Done button meets 44px touch-target minimum', async () => {
    const persistence = createPersistence();
    await render(<SettingsModal open={true} onOpenChange={() => {}} persistence={persistence} />);
    await vi.waitFor(
      () => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.textContent?.trim() === 'Done',
        );
        if (!btn) throw new Error('Done button not found');
      },
      { timeout: 4000, interval: 100 },
    );
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Done',
    ) as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });
});
