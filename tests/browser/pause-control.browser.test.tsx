/**
 * M_AUDIT2.UX.37 — PauseControl pointer-events guard.
 *
 * When the game is paused the centered "PAUSED" overlay must NOT
 * intercept clicks — the canvas underneath is still pickable. We
 * verify the rendered overlay carries `pointer-events: none` so a
 * click at the centre of the viewport reaches whatever sits below.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { PauseControl } from '@/hud/system';

describe('PauseControl (M_AUDIT2.UX.37)', () => {
  it('renders the pause button', async () => {
    const game = startGame('default');
    const screen = await render(<PauseControl game={game} />);
    const btn = screen.container.querySelector('#pause-button');
    expect(btn).toBeTruthy();
  });

  it('paused overlay does not intercept clicks (pointer-events: none)', async () => {
    const game = startGame('default');
    game.paused = true;
    const screen = await render(<PauseControl game={game} />);
    const overlay = screen.container.querySelector('#pause-banner') as HTMLElement | null;
    expect(overlay).toBeTruthy();
    if (!overlay) return;
    const cs = getComputedStyle(overlay);
    expect(cs.pointerEvents).toBe('none');
  });
});
