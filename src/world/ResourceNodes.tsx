import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { RESOURCE_PROFILES, resourceProfileFor } from '@/rules';

// M_AUDIT2.ARCH.4 — NODE_MESH + NODE_TINT collapsed onto
// RESOURCE_PROFILES (src/rules/resource-profiles.ts). Reads via
// resourceProfileFor() so a future resource (gems, mana) drops in
// as ONE registry row.

/** Renders every resource node on the board as a low-poly GLB prop. */
export function ResourceNodes({ game }: { game: GameState }) {
  // Per rules-of-hooks the useGLTF calls must be in a constant order;
  // the per-resource mesh dispatch happens via a static lookup table
  // populated by the slot reads at module-eval time (below).
  const treeGltf = useGLTF(assets.url(RESOURCE_PROFILES.wood.meshLogicalId));
  const rockGltf = useGLTF(assets.url(RESOURCE_PROFILES.stone.meshLogicalId));

  const nodes = useMemo(
    () =>
      game.resourceNodes.map((n) => {
        const { x, z } = axialToWorld(n.q, n.r);
        return { ...n, x, y: n.level * TILE_HEIGHT, z };
      }),
    [game.resourceNodes],
  );

  return (
    <group name="resource-nodes">
      {nodes.map((n) => {
        const profile = resourceProfileFor(n.resourceType);
        // The two distinct meshes today are tree (wood) and rock (stone,
        // gold, science); compare by mesh id rather than role to keep
        // the dispatch data-driven.
        const source =
          profile.meshLogicalId === RESOURCE_PROFILES.wood.meshLogicalId
            ? treeGltf.scene
            : rockGltf.scene;
        const tint = profile.meshTint;
        return (
          <group key={n.key} position={[n.x, n.y, n.z]}>
            <Clone
              object={source}
              {...(tint ? { inject: <meshStandardMaterial color={tint} /> } : {})}
            />
          </group>
        );
      })}
    </group>
  );
}

// Preload every unique mesh referenced by any RESOURCE_PROFILES row.
const PRELOAD_IDS = new Set<string>();
for (const p of Object.values(RESOURCE_PROFILES)) PRELOAD_IDS.add(p.meshLogicalId);
for (const id of PRELOAD_IDS) useGLTF.preload(assets.url(id));
