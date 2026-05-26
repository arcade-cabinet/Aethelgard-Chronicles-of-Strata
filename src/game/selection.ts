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
import { HexPosition, Selectable } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * M_GAME.BUG.7b + M_HUD.SHELL.CAMERA.1 — when "auto-focus on
 * selection" is enabled (default ON), dispatch the focus-tile
 * event so the CameraRig M_GAME.BUG.11 tween centers the view
 * on the newly-selected entity. Reads the preference from
 * localStorage directly to avoid a Persistence dep here.
 */
function maybeFocusOnSelection(entity: Entity): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage?.getItem('aethelgard.camera.autoFocus');
    if (raw === '0') return; // explicit opt-out
  } catch {
    // localStorage may throw on Safari private mode; default to ON.
  }
  const pos = entity.get(HexPosition);
  if (!pos) return;
  window.dispatchEvent(
    new CustomEvent('aethelgard:focus-tile', { detail: { q: pos.q, r: pos.r } }),
  );
}

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
  game.selectedIds = [entityId];
  maybeFocusOnSelection(entity);
}

/**
 * Select multiple entities at once (M_GAMEPLAY.2 — click-drag rectangle).
 * Every entity in `entities` becomes selected; all other Selectable entities
 * are cleared. `selectedId` tracks the first as the "primary" selection for
 * single-selection consumers (SelectionPanel etc); `selectedIds` lists all.
 */
export function selectEntities(game: GameState, entities: ReadonlyArray<Entity>): void {
  for (const e of game.world.query(Selectable)) {
    e.set(Selectable, { isSelected: false });
  }
  const ids: number[] = [];
  for (const entity of entities) {
    entity.set(Selectable, { isSelected: true });
    ids.push(unpackEntity(entity).entityId);
  }
  game.selectedIds = ids;
  if (ids[0] !== undefined) game.selectedId = ids[0];
  else delete game.selectedId;
}

/** Clear all selection state. */
export function clearSelection(game: GameState): void {
  for (const e of game.world.query(Selectable)) {
    e.set(Selectable, { isSelected: false });
  }
  delete game.selectedId;
  game.selectedIds = [];
}

/**
 * Return the currently-selected entity, or `undefined` if nothing is selected
 * or the selected entity no longer exists. For multi-select, returns the
 * PRIMARY (first) selection — see `selectedEntities` for the full list.
 */
export function selectedEntity(game: GameState): Entity | undefined {
  if (game.selectedId === undefined) return undefined;
  const id = game.selectedId;
  for (const e of game.world.query(Selectable)) {
    const { entityId } = unpackEntity(e);
    if (entityId === id) return e;
  }
  // The stored id no longer references a live Selectable entity — the unit
  // was destroyed under selection. Clear it so subsequent calls don't keep
  // scanning + so HUD consumers don't render a stale selection panel.
  delete game.selectedId;
  if (game.selectedIds.length > 0) game.selectedIds = [];
  return undefined;
}

/** Every currently-selected entity (for multi-unit commands). */
export function selectedEntities(game: GameState): Entity[] {
  const ids = new Set(game.selectedIds ?? []);
  if (ids.size === 0) return [];
  const out: Entity[] = [];
  for (const e of game.world.query(Selectable)) {
    if (ids.has(unpackEntity(e).entityId)) out.push(e);
  }
  return out;
}
