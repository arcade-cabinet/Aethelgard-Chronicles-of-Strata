/**
 * Enemy base render — browser test (M8.1).
 *
 * Verifies the faction-base model: a fresh game has exactly one player
 * `FactionBase` and one enemy `FactionBase`, the enemy base carries an
 * `EnemySpawner`, and the game (with the `EnemyBase` graveyard component)
 * mounts in a real r3f Canvas.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { EnemySpawner, FactionBase } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { enterGame } from './enter-game';

describe('enemy base (M8.1 faction model)', () => {
  it('mounts the game with the EnemyBase graveyard component', async () => {
    await render(<App />);
    await enterGame();
    expect(document.querySelector('canvas:not(#minimap-canvas)')).not.toBeNull();
  });

  it('a fresh game has one player base and one enemy base', () => {
    const game = startGame('ancient-silver-forest');
    const bases = game.world.query(FactionBase);
    const factions = bases.map((e) => e.get(FactionBase)?.faction).sort();
    expect(factions).toEqual(['enemy', 'player']);
  });

  it('the enemy base carries an EnemySpawner; the home base does not', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.enemyBaseEntity.has(EnemySpawner)).toBe(true);
    expect(game.enemyBaseEntity.has(FactionBase)).toBe(true);
    expect(game.enemyBaseEntity.get(FactionBase)?.faction).toBe('enemy');
    expect(game.townHallEntity.has(EnemySpawner)).toBe(false);
    expect(game.townHallEntity.get(FactionBase)?.faction).toBe('player');
  });
});
