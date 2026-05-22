import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import type { GameState } from '@/game/game-state';

/** Parse a "q,r" hex key to axial coordinates. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/**
 * Renders the Town Hall and every constructed building. The Town Hall sits on
 * `game.townHallKey`; build sites render their building GLB scaled by
 * construction progress (a half-height stub while incomplete, full when done).
 */
export function Buildings({ game }: { game: GameState }) {
  const townHall = useGLTF(assets.url('structures.town-hall'));

  const townHallPos = useMemo(() => {
    const { q, r } = parseKey(game.townHallKey);
    const { x, z } = axialToWorld(q, r);
    const tile = game.board.tiles.get(game.townHallKey);
    return { x, y: (tile?.level ?? 0) * TILE_HEIGHT, z };
  }, [game.townHallKey, game.board]);

  return (
    <group name="buildings">
      {/* Kenney building GLBs are modelled ~1 unit wide for a smaller hex grid;
          scale them up to fill our HEX_RADIUS=1 (~1.7 wide) tiles. */}
      <group position={[townHallPos.x, townHallPos.y, townHallPos.z]} scale={1.7}>
        <Clone object={townHall.scene} />
      </group>
    </group>
  );
}

useGLTF.preload(assets.url('structures.town-hall'));
useGLTF.preload(assets.url('structures.farm'));
useGLTF.preload(assets.url('structures.barracks'));
