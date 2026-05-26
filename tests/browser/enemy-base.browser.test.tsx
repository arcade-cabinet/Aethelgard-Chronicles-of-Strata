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
import { EnemySpawner, FactionBase, FactionTrait } from '@/ecs/components';
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
    // M_V11.CAMPS.SPAWN — barbarian camps now spawn in every match
    // with FactionBase + barbarian-camp-N FactionTrait. Use
    // FactionTrait (not FactionBase.faction, which defaults to
    // 'player' on camp entities) and filter to the legacy 2.
    const bases = game.world.query(FactionBase, FactionTrait);
    const factions = bases
      .map((e) => e.get(FactionTrait)?.faction as unknown as string | undefined)
      .filter((f) => f === 'player' || f === 'enemy')
      .sort();
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
