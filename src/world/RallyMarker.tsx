import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Group } from 'three';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import type { GameState } from '@/game/game-state';

/**
 * The barracks rally-point marker — a small flag on a pole, rendered at
 * `game.rally.targetKey` when a rally point is set, hidden otherwise. Polls the
 * rally state so the marker follows the player moving the rally point.
 */
export function RallyMarker({ game }: { game: GameState }) {
  const ref = useRef<Group>(null);
  const [key, setKey] = useState(game.rally.targetKey);

  useFrame(() => {
    if (game.rally.targetKey !== key) setKey(game.rally.targetKey);
  });

  if (key === '') return null;
  const [q, r] = key.split(',').map(Number);
  const { x, z } = axialToWorld(q ?? 0, r ?? 0);
  const tile = game.board.tiles.get(key);
  const y = (tile?.level ?? 0) * TILE_HEIGHT;

  return (
    <group ref={ref} position={[x, y, z]}>
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
