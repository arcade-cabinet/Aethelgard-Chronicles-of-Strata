import { describe, expect, it } from 'vitest';
import { Selectable } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';

describe('selection', () => {
  it('selecting an entity sets its Selectable and clears others', () => {
    const game = startGame('ancient-silver-forest');
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
