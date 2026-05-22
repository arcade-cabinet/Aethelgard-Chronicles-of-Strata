import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { AnimationState, Transform, Unit } from '@/ecs/components';
import { type ClipName, clipForState } from '@/ecs/systems/animation';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';
import type { GameState } from '@/game/game-state';

/**
 * Renders the player pawn as an animated KayKit character. Position and facing
 * sync from the ECS Transform every frame (no React state — direct object
 * mutation). The played clip is derived from the ECS AnimationState; it is held
 * in React state because it is an `AnimatedCharacter` prop, but `setClip` only
 * fires on an actual state change (IDLE <-> MOVING is rare), so there is no
 * per-frame re-render.
 */
export function PlayerPawn({ game }: { game: GameState }) {
  const ref = useRef<Group>(null);
  const [clip, setClip] = useState<ClipName>('Idle_A');
  // unit role is fixed for a spawned entity — read once
  const role = useMemo(() => game.playerPawn.get(Unit)?.unitType ?? 'Peon', [game.playerPawn]);

  useFrame(() => {
    const t = game.playerPawn.get(Transform);
    if (t && ref.current) {
      ref.current.position.set(t.x, t.y, t.z);
      ref.current.rotation.y = t.rotationY;
    }
    const anim = game.playerPawn.get(AnimationState);
    if (anim) {
      const next = clipForState(anim.state);
      if (next !== clip) setClip(next);
    }
  });

  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <AnimatedCharacter role={role} clip={clip} />
      </Suspense>
    </group>
  );
}
