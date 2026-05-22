import { useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexKey } from '@/core/hex';
import { findSelectableAtTile, placeBuilding, planMoveOrder, setRally } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { Building, Selectable } from '@/ecs/components';
import { PathLine } from './PathLine';

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
          <mesh
            key={`pick-${t.q},${t.r}`}
            position={[x, t.level * TILE_HEIGHT + 0.1, z]}
            rotation={[0, Math.PI / 6, 0]}
            geometry={pickGeometry}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPick(t.q, t.r);
            }}
          >
            <meshBasicMaterial visible={false} />
          </mesh>
        );
      })}
    </>
  );
}
