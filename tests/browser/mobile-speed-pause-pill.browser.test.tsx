import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { MobileSpeedPausePill } from '@/hud/pills';

/**
 * M_POLISH2.MOBILE.14 — unified Speed + Pause pill contract.
 * Each segment is ≥44px wide (touch-target minimum), pause toggle
 * writes through to game.paused, tapping a speed segment unpauses
 * + sets game.gameSpeed.
 */
describe('M_POLISH2.MOBILE.14 — MobileSpeedPausePill', () => {
  it('renders pause + 1× + 2× + 3× segments', async () => {
    const game = startGame('mobile-pill-render');
    await render(<MobileSpeedPausePill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('mobile-pause')) throw new Error('pause not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    expect(document.getElementById('mobile-pause')).not.toBeNull();
    expect(document.getElementById('mobile-speed-1x')).not.toBeNull();
    expect(document.getElementById('mobile-speed-2x')).not.toBeNull();
    expect(document.getElementById('mobile-speed-3x')).not.toBeNull();
  });

  it('tapping pause toggles game.paused', async () => {
    const game = startGame('mobile-pill-pause');
    await render(<MobileSpeedPausePill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('mobile-pause')) throw new Error('pause not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    expect(game.paused).toBe(false);
    const btn = document.getElementById('mobile-pause') as HTMLButtonElement;
    btn.click();
    expect(game.paused).toBe(true);
    btn.click();
    expect(game.paused).toBe(false);
  });

  it('tapping a speed segment unpauses + sets gameSpeed', async () => {
    const game = startGame('mobile-pill-speed');
    game.paused = true;
    await render(<MobileSpeedPausePill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('mobile-speed-2x')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const seg = document.getElementById('mobile-speed-2x') as HTMLButtonElement;
    seg.click();
    expect(game.gameSpeed).toBe(2);
    expect(game.paused).toBe(false);
  });

  it('each segment meets the 48dp touch-target floor (M_V13.HUD.TAP-TARGETS)', async () => {
    const game = startGame('mobile-pill-touch-target');
    await render(<MobileSpeedPausePill game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('mobile-pause')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    // Every segment (pause + each speed) must be ≥48×48 — the Material /
    // WCAG 2.5.5 minimum (was 44×36 before TAP-TARGETS bumped it).
    for (const id of ['mobile-pause', 'mobile-speed-1x', 'mobile-speed-2x', 'mobile-speed-3x']) {
      const btn = document.getElementById(id) as HTMLButtonElement;
      const rect = btn.getBoundingClientRect();
      expect(rect.width, `${id} width`).toBeGreaterThanOrEqual(48);
      expect(rect.height, `${id} height`).toBeGreaterThanOrEqual(48);
    }
  });
});
