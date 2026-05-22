/**
 * Click-to-select — unit and building selection.
 *
 * `selectEntity(game, entity)` marks the target `Selectable.isSelected = true`
 * and clears every other Selectable entity. `selectedEntity(game)` returns the
 * currently-selected entity, or `undefined`.
 *
 * The current selection is tracked on `game.selectedId` (the koota entityId
 * from `unpackEntity`), so it survives frame re-renders without storing a
 * mutable entity reference.
 *
 * Source: docs/specs/90-ui-hud.md §Click-to-Select
 */
import type { Entity } from 'koota';
import { unpackEntity } from 'koota';
import { Selectable } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * Select `entity`: sets its `Selectable.isSelected = true` and clears the
 * flag on every other Selectable entity in the world. Tracks the selection on
 * `game.selectedId`.
 */
export function selectEntity(game: GameState, entity: Entity): void {
  const { entityId } = unpackEntity(entity);

  // Clear all Selectable entities first.
  for (const e of game.world.query(Selectable)) {
    e.set(Selectable, { isSelected: false });
  }

  // Mark the target selected.
  entity.set(Selectable, { isSelected: true });
  game.selectedId = entityId;
}

/**
 * Return the currently-selected entity, or `undefined` if nothing is selected
 * or the selected entity no longer exists.
 */
export function selectedEntity(game: GameState): Entity | undefined {
  if (game.selectedId === undefined) return undefined;
  const id = game.selectedId;
  for (const e of game.world.query(Selectable)) {
    const { entityId } = unpackEntity(e);
    if (entityId === id) return e;
  }
  return undefined;
}
