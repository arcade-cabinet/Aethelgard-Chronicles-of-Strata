import { useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/core/constants';
import { axialToWorld, getHexKey } from '@/core/hex';
import { planMoveOrder } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { PathLine } from './PathLine';

const pickGeometry = new CylinderGeometry(HEX_RADIUS * 0.95, HEX_RADIUS * 0.95, 0.2, 6);

/**
 * Invisible per-tile pick colliders. Clicking a walkable tile issues a move
 * order; the queued path is drawn as a PathLine.
 */
export function TileInteraction({ game }: { game: GameState }) {
  const [pathKeys, setPathKeys] = useState<string[]>([]);
  const tiles = [...game.board.tiles.values()].filter((t) => t.walkable);

  const onPick = (q: number, r: number): void => {
    // planMoveOrder runs A* once, writes the pawn's PathQueue, and returns the
    // tile-key path — reused here for the PathLine (no second pathfinding pass).
    const path = planMoveOrder(game, getHexKey(q, r));
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
