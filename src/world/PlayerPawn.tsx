import { useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import type { Group } from 'three';
import { AnimationState, Transform, Unit } from '@/ecs/components';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';
import type { GameState } from '@/game/game-state';

/**
 * Renders the player pawn as an animated KayKit character. Position and facing
 * sync from the ECS Transform each frame; the played animation clip follows the
 * ECS AnimationState (driven by the movement + animation systems).
 */
export function PlayerPawn({ game }: { game: GameState }) {
  const ref = useRef<Group>(null);
  const [clip, setClip] = useState('Idle_A');
  const role = game.playerPawn.get(Unit)?.unitType ?? 'Peon';

  useFrame(() => {
    const t = game.playerPawn.get(Transform);
    if (t && ref.current) {
      ref.current.position.set(t.x, t.y, t.z);
      ref.current.rotation.y = t.rotationY;
    }
    const anim = game.playerPawn.get(AnimationState);
    if (anim && anim.clipName !== clip) setClip(anim.clipName);
  });

  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <AnimatedCharacter role={role} clip={clip} />
      </Suspense>
    </group>
  );
}
