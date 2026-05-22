import { useMemo } from 'react';
import { CylinderGeometry } from 'three';
import type { BiomeType } from '@/core/biome';
import { HEX_RADIUS, TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import { BIOME_COLORS } from './palette';

/** Cache one hex-prism geometry per elevation level — only 7 distinct heights exist. */
const geometryCache = new Map<number, CylinderGeometry>();
function prismGeometry(level: number): CylinderGeometry {
  const cached = geometryCache.get(level);
  if (cached) return cached;
  const height = Math.max(level, 1) * TILE_HEIGHT;
  const geo = new CylinderGeometry(HEX_RADIUS, HEX_RADIUS, height, 6);
  geometryCache.set(level, geo);
  return geo;
}

/** Props for one rendered hex tile. */
export interface HexTileProps {
  /** Axial coordinate. */
  q: number;
  /** Axial coordinate. */
  r: number;
  /** Elevation tier 0–6. */
  level: number;
  /** Biome type — selects the tile color. */
  type: BiomeType;
}

/**
 * One hex tile rendered as a flat-shaded hexagonal prism. The prism height
 * equals `level * TILE_HEIGHT` so taller tiles read as elevation tiers; the top
 * face sits at `y = level * TILE_HEIGHT`.
 */
export function HexTile({ q, r, level, type }: HexTileProps) {
  const { x, z } = axialToWorld(q, r);
  const height = Math.max(level, 1) * TILE_HEIGHT;
  const geometry = useMemo(() => prismGeometry(level), [level]);
  return (
    <mesh
      position={[x, height / 2, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={BIOME_COLORS[type]} flatShading roughness={0.9} />
    </mesh>
  );
}
