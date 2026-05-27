import { describe, expect, it } from 'vitest';
import { Selectable } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';

describe('selection', () => {
  it('selecting an entity sets its Selectable and clears others', () => {
    const game = startGame('ancient-silver-forest');
    // M_V11.OPEN.SPAWN — startGame no longer pre-spawns peons.
    // Spawn 2 peons so two Selectable entities exist for the
    // multi-selection clear behavior under test.
    const [tq, tr] = game.palaceKey.split(',').map(Number) as [number, number];
    const neighbors: Array<[number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
    ];
    let spawned = 0;
    for (const [dq, dr] of neighbors) {
      if (spawned >= 2) break;
      const tile = game.board.tiles.get(`${tq + dq},${tr + dr}`);
      if (tile?.walkable) {
        createCharacter({
          world: game.world,
          role: 'Peon',
          q: tile.q,
          r: tile.r,
          level: tile.level,
        });
        spawned++;
      }
    }
    const units = game.world.query(Selectable);
    const a = units[0];
    const b = units[1];
    if (!a || !b) throw new Error('need two selectable entities');
    selectEntity(game, a);
    expect(a.get(Selectable)?.isSelected).toBe(true);
    selectEntity(game, b);
    expect(a.get(Selectable)?.isSelected).toBe(false);
    expect(b.get(Selectable)?.isSelected).toBe(true);
  });
});
