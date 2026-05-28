import { vi } from 'vitest';

/**
 * Click through the title screen + New Game modal to reach the playing phase.
 * Browser tests that render `<App>` start at the title screen; this opens New
 * Game, clicks Begin, and waits for the game canvas to mount.
 */
export async function enterGame(): Promise<void> {
  // title screen → open the New Game modal
  await vi.waitFor(
    () => {
      const newGame = document.getElementById('menu-new-game');
      if (!newGame) throw new Error('title screen not ready');
      (newGame as HTMLButtonElement).click();
    },
    { timeout: 5000, interval: 100 },
  );
  // New Game modal → Begin. Wait for the button to be ENABLED
  // (M_V12.DEPTH.UPGRADE-PERSISTENCE gates Begin on the meta-
  // unlock cache resolving so chain-starters apply at tick 0).
  await vi.waitFor(
    () => {
      const begin = document.getElementById('begin-game') as HTMLButtonElement | null;
      if (!begin) throw new Error('new-game modal not ready');
      if (begin.disabled) throw new Error('begin-game button still disabled (cache resolving?)');
      begin.click();
    },
    { timeout: 5000, interval: 100 },
  );
  // wait for the r3f game canvas (not the minimap canvas) to mount
  await vi.waitFor(
    () => {
      const canvas = document.querySelector('canvas:not(#minimap-canvas)');
      if (!canvas) throw new Error('game canvas not mounted');
    },
    { timeout: 12_000, interval: 150 },
  );
}
