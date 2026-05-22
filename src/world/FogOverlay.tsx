import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { BufferAttribute, BufferGeometry, type Mesh } from 'three';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner, getHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { tileVisibility } from '@/game/fog';

/** Y-lift of the fog cap above a tile's top face. */
const FOG_LIFT = 0.04;

/**
 * The player's fog of war overlay. Each frame it caps every tile the player
 * cannot currently *see* with a dark hex:
 *
 * - `unknown` tiles — never discovered — get an opaque near-black cap.
 * - `discovered` tiles — explored but not currently watched — get a
 *   translucent dark cap (the classic "explored but greyed" RTS look).
 * - `visible` tiles get no cap.
 *
 * Two merged meshes (one per visibility class) are rebuilt each frame from the
 * live `game.fog.player` state. See `docs/specs/100-ai-as-player.md`.
 */
export function FogOverlay({ game }: { game: GameState }) {
  const unknownRef = useRef<Mesh>(null);
  const discoveredRef = useRef<Mesh>(null);

  useFrame(() => {
    const unknownPos: number[] = [];
    const discoveredPos: number[] = [];

    for (const tile of game.board.tiles.values()) {
      const vis = tileVisibility(game.fog.player, getHexKey(tile.q, tile.r));
      if (vis === 'visible') continue;
      const target = vis === 'unknown' ? unknownPos : discoveredPos;
      const { x, z } = axialToWorld(tile.q, tile.r);
      const y = tile.level * TILE_HEIGHT + FOG_LIFT;
      // a flat hex cap — six triangles fanned from the centre
      for (let i = 0; i < 6; i++) {
        const p1 = getHexCorner(x, z, i);
        const p2 = getHexCorner(x, z, (i + 1) % 6);
        target.push(x, y, z, p2.x, y, p2.z, p1.x, y, p1.z);
      }
    }

    const apply = (mesh: Mesh | null, pos: number[]) => {
      if (!mesh) return;
      const geo = mesh.geometry as BufferGeometry;
      geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
      geo.computeVertexNormals();
    };
    apply(unknownRef.current, unknownPos);
    apply(discoveredRef.current, discoveredPos);
  });

  return (
    <group name="fog-overlay">
      {/* unknown — opaque near-black */}
      <mesh ref={unknownRef}>
        <bufferGeometry />
        <meshBasicMaterial color="#05070d" />
      </mesh>
      {/* discovered but not currently visible — translucent dark grey */}
      <mesh ref={discoveredRef}>
        <bufferGeometry />
        <meshBasicMaterial color="#0b1018" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
