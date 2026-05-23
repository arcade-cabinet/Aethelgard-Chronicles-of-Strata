import { useRef, useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexKey, hexNeighbors } from '@/core/hex';
import {
  findSelectableAtTile,
  moveUnit,
  placeBuilding,
  planMoveOrder,
  setRally,
} from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { selectEntity, selectedEntities } from '@/game/selection';
import { Building, FactionTrait, Selectable, Unit, type UnitType } from '@/ecs/components';
import { PathLine } from './PathLine';

/** Long-press threshold (ms) — touch hold beyond this fires as right-click. */
const LONG_PRESS_MS = 500;

/**
 * Per-tile invisible pick collider. Routes mouse left/right OR touch tap/
 * long-press to the parent's left/right callbacks (M_GAMEPLAY.3).
 */
function TilePick({
  x,
  y,
  z,
  onLeft,
  onRight,
}: {
  x: number;
  y: number;
  z: number;
  onLeft: () => void;
  onRight: () => void;
}) {
  const longPressRef = useRef<{ timer: number; fired: boolean } | null>(null);
  return (
    <mesh
      position={[x, y, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={pickGeometry}
      onPointerDown={(e) => {
        e.stopPropagation();
        const ne = e.nativeEvent as PointerEvent;
        // mouse right-click → fire right immediately
        if (ne.pointerType !== 'touch' && ne.button === 2) {
          onRight();
          return;
        }
        // touch: arm a long-press timer; release before threshold = left.
        if (ne.pointerType === 'touch') {
          const state = { timer: 0, fired: false };
          state.timer = window.setTimeout(() => {
            state.fired = true;
            onRight();
          }, LONG_PRESS_MS);
          longPressRef.current = state;
          return;
        }
        onLeft();
      }}
      onPointerUp={(e) => {
        const ne = e.nativeEvent as PointerEvent;
        if (ne.pointerType !== 'touch') return;
        const state = longPressRef.current;
        if (!state) return;
        clearTimeout(state.timer);
        longPressRef.current = null;
        if (!state.fired) onLeft();
      }}
      onPointerLeave={() => {
        const state = longPressRef.current;
        if (state) {
          clearTimeout(state.timer);
          longPressRef.current = null;
        }
      }}
      onContextMenu={(e) => {
        e.nativeEvent.preventDefault();
      }}
    >
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

/** Military roles right-click-move applies to (peons remain autonomous). */
const MILITARY: ReadonlySet<UnitType> = new Set([
  'Footman',
  'Goblin',
  'Orc',
  'Vampire',
  'Witch',
  'BlackKnight',
]);

const pickGeometry = new CylinderGeometry(HEX_RADIUS * 0.95, HEX_RADIUS * 0.95, 0.2, 6);

/**
 * Active build context passed from outside when the player has chosen a
 * building to place. `null` means no build in progress.
 */
export interface BuildContext {
  /** Building type selected to place. */
  type: Exclude<import('@/ecs/components').BuildingType, 'TownHall'>;
  /** Callback to invoke after placement (clears the build context). */
  onPlaced: () => void;
}

// no-visual-impact: TileInteraction renders only invisible pick colliders — routing logic change has no visible output
/**
 * Invisible per-tile pick colliders. Click routing by context:
 *
 * 1. If a unit/building is on the clicked tile → select it.
 * 2. Else if `buildContext` is set → place the chosen building and clear the
 *    context via `onPlaced()`.
 * 3. Else if the selected entity is a Barracks → set the rally point.
 * 4. Else → issue a move order for the player pawn.
 */
export function TileInteraction({
  game,
  buildContext = null,
}: {
  game: GameState;
  buildContext?: BuildContext | null;
}) {
  const [pathKeys, setPathKeys] = useState<string[]>([]);
  const tiles = [...game.board.tiles.values()].filter((t) => t.walkable);

  /**
   * Right-click / context menu (M_GAMEPLAY.3): if the player has military
   * units selected, route them toward the target tile via `moveUnit`. Peons
   * are explicitly excluded — they remain autonomous (spec 101). Flocking-
   * style ring offsets distribute units around the target so they don't
   * stack on the same hex (offset by tile neighbours).
   */
  const onRightPick = (q: number, r: number): void => {
    const targetKey = getHexKey(q, r);
    const military = selectedEntities(game).filter((e) => {
      const role = e.get(Unit)?.unitType;
      return role && MILITARY.has(role) && e.get(FactionTrait)?.faction === 'player';
    });
    if (military.length === 0) return;
    // For each military unit, target the nearest free neighbour of the target
    // tile (so the army flocks around it rather than stacking on it).
    const neighbours = [targetKey, ...hexNeighbors(q, r)];
    military.forEach((unit, i) => {
      const dest = neighbours[i % neighbours.length] ?? targetKey;
      moveUnit(game, unit, dest, 'player');
    });
    setPathKeys([]);
  };

  const onPick = (q: number, r: number): void => {
    const tileKey = getHexKey(q, r);

    // Priority 1: select a unit or building on the tile.
    const selectable = findSelectableAtTile(game, tileKey);
    if (selectable) {
      selectEntity(game, selectable);
      setPathKeys([]);
      return;
    }

    // Priority 2: place a building if build context is active.
    if (buildContext) {
      placeBuilding(game, tileKey, buildContext.type);
      buildContext.onPlaced();
      setPathKeys([]);
      return;
    }

    // Priority 3: set rally point when the Barracks is selected.
    if (game.selectedId !== undefined) {
      for (const entity of game.world.query(Selectable, Building)) {
        const sel = entity.get(Selectable);
        const bld = entity.get(Building);
        if (sel?.isSelected && bld?.buildingType === 'Barracks') {
          setRally(game, tileKey);
          setPathKeys([]);
          return;
        }
      }
    }

    // Priority 4: move order for the player pawn.
    const path = planMoveOrder(game, tileKey);
    if (path) setPathKeys(path);
  };

  return (
    <>
      <PathLine game={game} pathKeys={pathKeys} />
      {tiles.map((t) => {
        const { x, z } = axialToWorld(t.q, t.r);
        return (
          <TilePick
            key={`pick-${t.q},${t.r}`}
            x={x}
            y={t.level * TILE_HEIGHT + 0.1}
            z={z}
            onLeft={() => onPick(t.q, t.r)}
            onRight={() => onRightPick(t.q, t.r)}
          />
        );
      })}
    </>
  );
}
