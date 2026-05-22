import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * Renders the Goblin Portal's necropolis base: a central crypt flanked by
 * gravestones and iron fences on the portal tile. All props are Kenney Graveyard
 * Kit GLBs (CC0). The crypt is the dominant landmark; gravestones and fences
 * cluster around it to form a recognisable "enemy HQ" silhouette.
 *
 * Prop positions are fixed offsets in local tile-space — no PRNG needed.
 * The group sits at the portal entity's world position, derived from its ECS
 * HexPosition component each render (stable once the session starts).
 */
export function GoblinPortalBase({ game }: { game: GameState }) {
  const crypt = useGLTF(assets.url('structures.portal-crypt'));
  const gravestoneCross = useGLTF(assets.url('nature.gravestone.cross'));
  const gravestoneRound = useGLTF(assets.url('nature.gravestone.round'));
  const fence = useGLTF(assets.url('structures.portal-fence'));

  const pos = useMemo(() => {
    const hexPos = game.portalEntity.get(HexPosition);
    if (!hexPos) return null;
    const { x, z } = axialToWorld(hexPos.q, hexPos.r);
    return { x, y: hexPos.level * TILE_HEIGHT, z };
  }, [game.portalEntity]);

  if (!pos) return null;

  return (
    <group name="goblin-portal-base" position={[pos.x, pos.y, pos.z]}>
      {/* Central crypt — scaled to dominate the tile */}
      <group scale={1.4}>
        <Clone object={crypt.scene} />
      </group>

      {/* Gravestones — clustered in front of the crypt */}
      <group position={[0.6, 0, 0.4]} scale={0.9} rotation={[0, 0.4, 0]}>
        <Clone object={gravestoneCross.scene} />
      </group>
      <group position={[-0.55, 0, 0.5]} scale={0.8} rotation={[0, -0.5, 0]}>
        <Clone object={gravestoneRound.scene} />
      </group>
      <group position={[0.25, 0, 0.7]} scale={0.75} rotation={[0, 0.1, 0]}>
        <Clone object={gravestoneRound.scene} />
      </group>

      {/* Iron fence sections framing the base */}
      <group position={[0.9, 0, -0.1]} scale={0.8} rotation={[0, Math.PI / 2, 0]}>
        <Clone object={fence.scene} />
      </group>
      <group position={[-0.9, 0, -0.1]} scale={0.8} rotation={[0, -Math.PI / 2, 0]}>
        <Clone object={fence.scene} />
      </group>
      <group position={[0, 0, -0.9]} scale={0.8} rotation={[0, 0, 0]}>
        <Clone object={fence.scene} />
      </group>
    </group>
  );
}

// Preload all portal base assets so they arrive before the first render.
useGLTF.preload(assets.url('structures.portal-crypt'));
useGLTF.preload(assets.url('nature.gravestone.cross'));
useGLTF.preload(assets.url('nature.gravestone.round'));
useGLTF.preload(assets.url('structures.portal-fence'));
