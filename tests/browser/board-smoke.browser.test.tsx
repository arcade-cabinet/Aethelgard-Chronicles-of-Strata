import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { enterGame } from './enter-game';

describe('board renders', () => {
  it('mounts the game canvas without crashing', async () => {
    await render(<App />);
    await enterGame();
    const canvas = document.querySelector('canvas:not(#minimap-canvas)');
    expect(canvas).not.toBeNull();
  });

  it('generates a board with tiles for the fixed seed', async () => {
    const { startGame } = await import('@/game/game-state');
    const game = startGame('ancient-silver-forest');
    expect(game.board.tiles.size).toBeGreaterThan(100);
  });
});
