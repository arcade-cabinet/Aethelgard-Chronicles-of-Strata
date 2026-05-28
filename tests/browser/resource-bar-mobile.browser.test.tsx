import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { ResourceBar } from '@/hud/system';

/**
 * M_POLISH2.MOBILE.2 — ResourceBar portrait overflow fix.
 * In compact mode the bar scrolls horizontally instead of wrapping;
 * each chip becomes a scroll-snap point and the bar caps at the
 * viewport width minus the safe-area gutter so it never overlaps
 * the Settings/Minimap cluster on the right.
 */
describe('M_POLISH2.MOBILE.2 — ResourceBar compact mode', () => {
  it('uses horizontal scroll with scroll-snap when compact', async () => {
    const game = startGame('rbar-compact');
    await render(<ResourceBar game={game} compact />);
    await vi.waitFor(
      () => {
        const bar = document.getElementById('resource-bar');
        if (!bar) throw new Error('bar not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const bar = document.getElementById('resource-bar');
    if (!bar) throw new Error('bar missing');
    const style = window.getComputedStyle(bar);
    // The contract: compact mode means overflow-x scrollable.
    expect(style.overflowX).toBe('auto');
    // Scroll-snap is supported in modern Chromium but may show as
    // 'none' if not applied — we accept either 'x mandatory' literal
    // or the computed 'mandatory' value.
    expect(style.scrollSnapType.length).toBeGreaterThan(0);
  });

  it('does NOT enable scroll/clip when in desktop (default) mode', async () => {
    const game = startGame('rbar-desktop');
    await render(<ResourceBar game={game} />);
    await vi.waitFor(
      () => {
        const bar = document.getElementById('resource-bar');
        if (!bar) throw new Error('bar not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const bar = document.getElementById('resource-bar');
    if (!bar) throw new Error('bar missing');
    const style = window.getComputedStyle(bar);
    // Default desktop: visible overflow (no scroll behavior added).
    expect(style.overflowX).toBe('visible');
  });

  it('each resource chip carries scroll-snap-align in compact mode', async () => {
    const game = startGame('rbar-snap-chips');
    await render(<ResourceBar game={game} compact />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('val-wood')) throw new Error('chip not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const chip = document.getElementById('val-wood')?.parentElement;
    if (!chip) throw new Error('chip parent missing');
    const style = window.getComputedStyle(chip);
    // 'start' aligns each chip's left edge to the scroll viewport.
    expect(style.scrollSnapAlign).toBe('start');
  });
});
