import { vi } from 'vitest';

/**
 * Click through the launcher to reach the playing phase. Browser tests that
 * render `<App>` start at the launcher; this clicks "Enter Realm" and waits for
 * the game canvas to mount.
 */
export async function enterGame(): Promise<void> {
  await vi.waitFor(
    () => {
      const button = document.getElementById('enter-realm');
      if (!button) throw new Error('launcher not ready');
      (button as HTMLButtonElement).click();
    },
    { timeout: 5000, interval: 100 },
  );
  await vi.waitFor(
    () => {
      const canvas = document.querySelector('canvas:not(#minimap-canvas)');
      if (!canvas) throw new Error('game canvas not mounted');
    },
    { timeout: 10_000, interval: 150 },
  );
}
