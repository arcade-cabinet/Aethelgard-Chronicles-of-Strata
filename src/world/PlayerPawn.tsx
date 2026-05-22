import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Transform } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Renders the player pawn and syncs its position from the ECS Transform each frame. */
export function PlayerPawn({ game }: { game: GameState }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const t = game.playerPawn.get(Transform);
    if (t && ref.current) {
      ref.current.position.set(t.x, t.y + 0.5, t.z);
      ref.current.rotation.y = t.rotationY;
    }
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <coneGeometry args={[0.3, 0.8, 6]} />
        <meshStandardMaterial color="#ef4444" flatShading />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#fcd34d" flatShading />
      </mesh>
    </group>
  );
}
