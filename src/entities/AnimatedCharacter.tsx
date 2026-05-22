import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import type { AnimationClip, Group } from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assets } from '@/assets/assets';
import type { UnitType } from '@/ecs/components';
import { characterMeshId, rigAnimationIds, rigForRole } from './rig';

/** Props for an animated KayKit character. */
export interface AnimatedCharacterProps {
  /** Unit role — selects the mesh GLB and the rig tier. */
  role: UnitType;
  /** The animation clip name to play (e.g. 'Idle_A', 'Walking_A', 'Running_A'). */
  clip: string;
  /** Crossfade duration into the clip, in seconds. */
  fade?: number;
}

/**
 * A KayKit character rendered with shared-rig animation. The character GLB
 * supplies the skinned mesh; the rig-tier animation GLBs supply every clip.
 * Clips bind to the character skeleton by bone name (verified: all KayKit
 * characters of a tier share an identical bone-name set).
 */
export function AnimatedCharacter({ role, clip, fade = 0.25 }: AnimatedCharacterProps) {
  const meshUrl = assets.url(characterMeshId(role));
  const rigIds = rigAnimationIds(rigForRole(role));
  const movementUrl = assets.url(rigIds.movement);
  const generalUrl = assets.url(rigIds.general);

  const charGltf = useGLTF(meshUrl);
  const movementGltf = useGLTF(movementUrl);
  const generalGltf = useGLTF(generalUrl);

  // Clone the character scene so multiple instances of the same role do not
  // share one skeleton (SkeletonUtils.clone preserves skinned-mesh bindings).
  const scene = useMemo(() => cloneSkeleton(charGltf.scene) as Group, [charGltf.scene]);

  // The full clip set is the union of both rig libraries.
  const clips = useMemo<AnimationClip[]>(
    () => [...movementGltf.animations, ...generalGltf.animations],
    [movementGltf.animations, generalGltf.animations],
  );

  const group = useRef<Group>(null);
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const action = actions[clip];
    if (!action) return;
    action.reset().fadeIn(fade).play();
    return () => {
      action.fadeOut(fade);
    };
  }, [actions, clip, fade]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the M2 character + rig GLBs so first spawn does not stall a frame.
useGLTF.preload(assets.url('characters.rigs.medium-movement'));
useGLTF.preload(assets.url('characters.rigs.medium-general'));
