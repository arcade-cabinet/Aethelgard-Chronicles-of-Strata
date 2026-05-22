import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import type { GameState } from '@/game/game-state';

/**
 * The barracks rally-point marker — a small flag on a pole. Stays mounted and
 * toggles `visible`/position with the rally state (no unmount/remount, so the
 * Three.js geometry is created once) so the marker follows the player moving
 * the rally point.
 */
export function RallyMarker({ game }: { game: GameState }) {
  const [key, setKey] = useState(game.rally.targetKey);

  useFrame(() => {
    if (game.rally.targetKey !== key) setKey(game.rally.targetKey);
  });

  let x = 0;
  let y = 0;
  let z = 0;
  if (key !== '') {
    const [q, r] = key.split(',').map(Number);
    const world = axialToWorld(q ?? 0, r ?? 0);
    x = world.x;
    z = world.z;
    y = (game.board.tiles.get(key)?.level ?? 0) * TILE_HEIGHT;
  }

  return (
    <group position={[x, y, z]} visible={key !== ''}>
      {/* pole */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
        <meshStandardMaterial color="#78350f" flatShading />
      </mesh>
      {/* flag */}
      <mesh position={[0.22, 1, 0]}>
        <planeGeometry args={[0.4, 0.28]} />
        <meshStandardMaterial color="#ef4444" flatShading side={2} />
      </mesh>
    </group>
  );
}
