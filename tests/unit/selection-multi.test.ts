import { describe, expect, it } from 'vitest';
import { FactionTrait, Selectable, Transform, Unit } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import type { GameState } from '@/game/game-state';
import { clearSelection, selectEntities, selectedEntities } from '@/game/selection';

/** A minimal GameState shim for selection unit tests. */
function makeGame(): Pick<GameState, 'world' | 'selectedId' | 'selectedIds'> {
  return { world: createEcsWorld(), selectedIds: [] };
}

describe('multi-unit selection (M_GAMEPLAY.2)', () => {
  it('selectEntities sets isSelected on every entity in the list', () => {
    const game = makeGame();
    const a = game.world.spawn(
      Unit({ unitType: 'Peon' }),
      FactionTrait({ faction: 'player' }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Selectable({ isSelected: false }),
    );
    const b = game.world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      Transform({ x: 1, y: 0, z: 0, rotationY: 0 }),
      Selectable({ isSelected: false }),
    );
    selectEntities(game as GameState, [a, b]);
    expect(a.get(Selectable)?.isSelected).toBe(true);
    expect(b.get(Selectable)?.isSelected).toBe(true);
    expect(game.selectedIds.length).toBe(2);
    expect(selectedEntities(game as GameState).length).toBe(2);
  });

  it('selectEntities clears previously-selected entities', () => {
    const game = makeGame();
    const a = game.world.spawn(
      Unit({ unitType: 'Peon' }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
    const b = game.world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: false }),
    );
    selectEntities(game as GameState, [b]);
    expect(a.get(Selectable)?.isSelected).toBe(false);
    expect(b.get(Selectable)?.isSelected).toBe(true);
    expect(game.selectedIds.length).toBe(1);
  });

  it('clearSelection empties the selection', () => {
    const game = makeGame();
    const a = game.world.spawn(
      Unit({ unitType: 'Peon' }),
      FactionTrait({ faction: 'player' }),
      Selectable({ isSelected: true }),
    );
    selectEntities(game as GameState, [a]);
    clearSelection(game as GameState);
    expect(a.get(Selectable)?.isSelected).toBe(false);
    expect(game.selectedIds.length).toBe(0);
    expect(game.selectedId).toBeUndefined();
  });
});
