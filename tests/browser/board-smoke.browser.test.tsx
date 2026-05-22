import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';

describe('board renders', () => {
  it('mounts the game canvas without crashing', async () => {
    await render(<App />);
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('generates a board with tiles for the fixed seed', async () => {
    const { startGame } = await import('@/game/game-state');
    const game = startGame('ancient-silver-forest');
    expect(game.board.tiles.size).toBeGreaterThan(100);
  });
});
