/** M_EXPANSION.U.117 — Touch-target hex grid overlay. Shows hex edges on long-press. */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, type LineSegments } from 'three';
import { TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld, getHexCorner } from '@/core/hex';

/** Mutable flag toggled by TileInteraction on touch long-press start/end. */
export const hexGridVisibility: { show: boolean } = { show: false };

function buildGridGeometry(board: BoardData): BufferGeometry {
  const positions: number[] = [];
  for (const tile of board.tiles.values()) {
    const { x, z } = axialToWorld(tile.q, tile.r);
    const y = TILE_HEIGHT * tile.level + 0.05;
    for (let i = 0; i < 6; i++) {
      const a = getHexCorner(x, z, i);
      const b = getHexCorner(x, z, (i + 1) % 6);
      positions.push(a.x, y, a.z, b.x, y, b.z);
    }
  }
  const arr = new Float32Array(positions);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(arr, 3));
  return geo;
}

export function HexGridOverlay({ board }: { board: BoardData }) {
  const ref = useRef<LineSegments>(null);
  const geometry = useMemo(() => buildGridGeometry(board), [board]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (ref.current) ref.current.visible = hexGridVisibility.show;
  });

  return (
    <lineSegments ref={ref} geometry={geometry} visible={false}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </lineSegments>
  );
}
