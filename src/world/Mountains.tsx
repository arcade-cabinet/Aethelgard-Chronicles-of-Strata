import { useMemo } from 'react';
import { TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';
import { biomeFlagsFor } from '@/rules/biome-flags';

/** A placed mountain peak. */
interface Peak {
  /** Stable React key. */
  key: string;
  /** World position of the tile centre. */
  x: number;
  /** Y of the tile top face. */
  y: number;
  /** World position. */
  z: number;
  /** Whether this peak carries a snow cap (level-6 tiles). */
  snow: boolean;
  /** Per-peak yaw so peaks do not all face the same way. */
  yaw: number;
}

/**
 * Real 3D mountain peaks — a grey rock cone on every level-5+ tile, with a
 * snow cap on the highest (level-6) tiles. This is what gives the board its
 * dramatic skyline; without it, high tiles read as flat grey hexes. Mirrors
 * poc1's `spawnEcosystem` peak placement.
 */
export function Mountains({ board }: { board: BoardData }) {
  const peaks = useMemo<Peak[]>(() => {
    const out: Peak[] = [];
    for (const tile of board.tiles.values()) {
      // M_REGISTRY.10 — peak placement driven by per-biome `peakLevel`
      // slot. HIGHLAND + MOUNTAIN both place peaks at level >= 5;
      // other biomes never (peakLevel = null). Future tribes / map
      // types can opt biomes in/out without code edits.
      const peakLevel = biomeFlagsFor(tile.type).peakLevel;
      if (peakLevel === null || tile.level < peakLevel) continue;
      const { x, z } = axialToWorld(tile.q, tile.r);
      out.push({
        key: `${tile.q},${tile.r}`,
        x,
        y: tile.level * TILE_HEIGHT,
        z,
        snow: tile.level >= 6,
        // a deterministic per-tile yaw — q and r seed a stable angle
        yaw: ((tile.q * 73 + tile.r * 149) % 360) * (Math.PI / 180),
      });
    }
    return out;
  }, [board]);

  return (
    <group name="mountains">
      {peaks.map((p) => (
        <group key={p.key} position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]}>
          {/* rock peak */}
          <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.6, 3.5, 6]} />
            <meshStandardMaterial color="#475569" flatShading roughness={0.95} />
          </mesh>
          {/* snow cap on the highest peaks */}
          {p.snow && (
            <mesh position={[0, 2.6, 0]} castShadow>
              <coneGeometry args={[0.8, 1.8, 6]} />
              <meshStandardMaterial color="#f8fafc" flatShading roughness={0.6} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
