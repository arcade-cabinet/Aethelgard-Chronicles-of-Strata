import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import type { ResourceType } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** The GLB manifest id used to render each resource type. */
const NODE_MESH: Record<ResourceType, string> = {
  wood: 'nature.tree.pine-a',
  stone: 'nature.rock.large-a',
  gold: 'nature.rock.large-a', // gold veins reuse the rock mesh, gold-tinted
};

/** Tint applied to a resource-node mesh; gold veins glow gold. */
const NODE_TINT: Partial<Record<ResourceType, string>> = {
  gold: '#fbbf24',
};

/** Renders every resource node on the board as a low-poly GLB prop. */
export function ResourceNodes({ game }: { game: GameState }) {
  const treeGltf = useGLTF(assets.url('nature.tree.pine-a'));
  const rockGltf = useGLTF(assets.url('nature.rock.large-a'));

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
        const source = n.resourceType === 'wood' ? treeGltf.scene : rockGltf.scene;
        const tint = NODE_TINT[n.resourceType];
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

// Preload resource-node meshes.
for (const id of Object.values(NODE_MESH)) {
  useGLTF.preload(assets.url(id));
}
