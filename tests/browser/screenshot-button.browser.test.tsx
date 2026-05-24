import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { ScreenshotButton } from '@/hud/ScreenshotButton';

describe('M_POLISH2.MODES.44b — ScreenshotButton', () => {
  it('does NOT render in border-clash mode', async () => {
    const game = startGame('sb-border');
    await render(<ScreenshotButton game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('screenshot-button')).toBeNull();
  });

  it('renders in coexistence mode at the touch-target size', async () => {
    const game = startGame({
      seedPhrase: 'sb-coex',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'sb-coex-ev',
      mode: 'coexistence',
    });
    await render(<ScreenshotButton game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('screenshot-button')) throw new Error('not mounted');
      },
      { timeout: 4000, interval: 100 },
    );
    const btn = document.getElementById('screenshot-button') as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(btn.getAttribute('aria-label')).toBe('Screenshot the realm');
  });
});
