import { describe, expect, it } from 'vitest';
import { resign } from '@/game/utilities';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.85 — surrender consequences: the victor inherits
 * every zone tile the loser controlled at the moment of resignation
 * instead of those tiles evaporating.
 */
describe('M_EXPANSION.F.85 — surrender consequences', () => {
  it('player resign → enemy inherits player tiles', () => {
    const game = startGame('surrender-player');
    // Pre-seed both zones with deterministic tile keys.
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    game.zones.player.controlled.add('p-1');
    game.zones.player.controlled.add('p-2');
    game.zones.player.controlled.add('p-3');
    game.zones.enemy.controlled.add('e-1');
    const enemyGenBefore = game.zones.enemy.generation;

    resign(game, 'player');

    expect(game.outcome).toBe('loss');
    expect(game.zones.player.controlled.size).toBe(0);
    expect(game.zones.enemy.controlled.has('p-1')).toBe(true);
    expect(game.zones.enemy.controlled.has('p-2')).toBe(true);
    expect(game.zones.enemy.controlled.has('p-3')).toBe(true);
    expect(game.zones.enemy.controlled.has('e-1')).toBe(true);
    expect(game.zones.enemy.controlled.size).toBe(4);
    expect(game.zones.enemy.generation).toBe(enemyGenBefore + 1);
  });

  it('enemy resign → player inherits enemy tiles', () => {
    const game = startGame('surrender-enemy');
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    game.zones.player.controlled.add('p-1');
    game.zones.enemy.controlled.add('e-1');
    game.zones.enemy.controlled.add('e-2');

    resign(game, 'enemy');

    expect(game.outcome).toBe('win');
    expect(game.zones.enemy.controlled.size).toBe(0);
    expect(game.zones.player.controlled.has('e-1')).toBe(true);
    expect(game.zones.player.controlled.has('e-2')).toBe(true);
    expect(game.zones.player.controlled.size).toBe(3);
  });

  it('resign during a non-playing outcome is a no-op (tiles preserved)', () => {
    const game = startGame('surrender-noop');
    game.zones.player.controlled.add('p-1');
    game.outcome = 'win'; // already won; resign call should not mutate
    resign(game, 'player');
    expect(game.outcome).toBe('win');
    expect(game.zones.player.controlled.has('p-1')).toBe(true);
  });
});
