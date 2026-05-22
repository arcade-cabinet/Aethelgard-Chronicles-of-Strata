import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three';
import type { BoardData } from '@/core/board';
import { buildTerrainGeometry } from './terrain-mesh';

/**
 * The whole board rendered as a single merged terrain mesh — one draw call for
 * every tile's top face and cliff, with per-vertex biome colors and flat
 * shading. Replaces the per-tile prism approach (which issued one draw call per
 * hex). Mirrors poc1's terrain.
 */
export function Terrain({ board }: { board: BoardData }) {
  const geometry = useMemo(() => {
    const { positions, colors } = buildTerrainGeometry(board);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [board]);

  // release the GPU buffers when the board changes or the component unmounts
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {/* DoubleSide — the merged hex fans mix triangle windings; rendering both
          faces (as poc1 does) keeps every top face and cliff visible. */}
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.9}
        metalness={0.1}
        side={DoubleSide}
      />
    </mesh>
  );
}
