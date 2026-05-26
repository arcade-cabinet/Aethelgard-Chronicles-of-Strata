import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { type AnimationClip, Color, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assets } from '@/assets/assets';
import type { UnitType } from '@/ecs/components';
import type { ClipName } from '@/ecs/systems/animation';
import { measuredScale } from '@/rules/asset-scale';
import { characterMeshId, rigAnimationIds, rigForRole } from './rig';

/**
 * M_GAME.SCALE.GLB-MEASURE.1 — per-role silhouette weight, multiplied
 * into the measured-from-bbox scale read from glb-metadata.json. The
 * measurement tool already normalizes every character mesh to
 * TARGET_UNIT_HEIGHT (~0.95 world units), so this multiplier ONLY
 * encodes silhouette hierarchy — Knights stand a touch taller than
 * Peons, Orcs a touch taller than Goblins, etc. Values stay close to
 * 1.0; large multipliers would defeat the measurement.
 */
const ROLE_SILHOUETTE_WEIGHT: Record<string, number> = {
  Peon: 0.9,
  Builder: 0.9,
  Footman: 1.0,
  Archer: 0.95,
  Knight: 1.08,
  Mage: 1.0,
  Healer: 0.95,
  Pikeman: 1.05,
  Goblin: 0.9,
  Orc: 1.12,
  Wraith: 1.0,
  Skeleton: 0.92,
};

/** Props for an animated KayKit character. */
export interface AnimatedCharacterProps {
  /** Unit role — selects the mesh GLB and the rig tier. */
  role: UnitType;
  /** The animation clip to play — a state-mapped KayKit clip name. */
  clip: ClipName;
  /** Crossfade duration into the clip, in seconds. */
  fade?: number;
  /**
   * M_EXPANSION.A.29 — cosmetic tint multiplied into every skinned-mesh
   * material's color. Use `null` (default) to leave the GLB's native
   * material untouched. The Skin slot supplies this per-faction so a
   * single hero mesh reads visually-distinct per faction.
   */
  tint?: string | null;
}

/** Dispose every geometry and material under a scene graph (frees GPU memory). */
function disposeScene(scene: Group): void {
  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat?.dispose();
    }
  });
}

/**
 * A KayKit character rendered with shared-rig animation. The character GLB
 * supplies the skinned mesh; the rig-tier animation GLBs supply every clip.
 * Clips bind to the character skeleton by bone name (verified: all KayKit
 * characters of a tier share an identical bone-name set).
 */
export function AnimatedCharacter({
  role,
  clip,
  fade = 0.25,
  tint = null,
}: AnimatedCharacterProps) {
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

  // Dispose the cloned scene's GPU resources when this instance unmounts.
  useEffect(() => () => disposeScene(scene), [scene]);

  // M_EXPANSION.A.29 — apply cosmetic tint to every skinned-mesh
  // material. Multiplied into the existing diffuse color so the
  // KayKit texture's value structure stays intact (a warm-tinted
  // Knight reads as red-tinted, not a flat red blob). Re-clones the
  // material first so adjacent instances of the same role with a
  // different tint don't trample each other (they share the GLB but
  // each gets its own material clone here).
  useEffect(() => {
    if (!tint) return;
    const c = new Color(tint);
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const cloneMat = (m: MeshStandardMaterial) => {
        const next = m.clone();
        next.color.multiply(c);
        return next;
      };
      const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
      mesh.material = Array.isArray(mat) ? mat.map(cloneMat) : cloneMat(mat);
    });
  }, [scene, tint]);

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

  const baseScale = measuredScale(characterMeshId(role), 1);
  const scaleFactor = baseScale * (ROLE_SILHOUETTE_WEIGHT[role] ?? 1);

  return (
    <group ref={group} scale={scaleFactor}>
      <primitive object={scene} />
    </group>
  );
}

// Preload every character mesh + both rig tiers so the first spawn of any role
// does not suspend and jank a frame.
for (const id of [
  'characters.heroes.engineer',
  'characters.heroes.knight',
  'characters.heroes.rogue',
  'characters.enemies.orc',
  'characters.rigs.medium-movement',
  'characters.rigs.medium-general',
  'characters.rigs.large-movement',
  'characters.rigs.large-general',
]) {
  useGLTF.preload(assets.url(id));
}
