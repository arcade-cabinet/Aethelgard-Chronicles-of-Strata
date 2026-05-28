import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import { FACTIONS } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * M_EXPANSION.S.56 — contested-pulse renderer (spec 102 §encroachment).
 *
 * For every tile in either faction's zone.pulsing map, render a flat
 * yellow disc on top of the tile that pulses opacity 0.3↔0.8 with a
 * 0.5Hz sine. Without this, the encroachment system's contested-tile
 * state was sim-only — players had no signal a tile was about to flip.
 *
 * Snapshot the pulsing set per RAF into local state so React only
 * reconciles when the set membership actually changes (the sine is
 * applied per-frame via useFrame on a material ref, not re-rendered).
 */
const discGeo = new CylinderGeometry(HEX_RADIUS * 0.85, HEX_RADIUS * 0.85, 0.02, 6);

interface PulseTile {
  key: string;
  x: number;
  z: number;
  y: number;
}

export function ContestedPulse({ game }: { game: GameState }) {
  const [tiles, setTiles] = useState<PulseTile[]>([]);
  // Track membership via a sorted-keys string so set-equality is cheap.
  const lastKey = useRef<string>('');
  const opacityRef = useRef<number>(0.5);

  useFrame((_, delta) => {
    // 0.5Hz sine (period 2s) — opacity walks 0.3 ↔ 0.8.
    opacityRef.current += delta;
    const next: PulseTile[] = [];
    const keysAcc: string[] = [];
    for (const faction of FACTIONS) {
      for (const key of game.zones[faction].pulsing.keys()) {
        keysAcc.push(key);
        const { q, r } = parseHexKey(key);
        const { x, z } = axialToWorld(q, r);
        const tile = game.board.tiles.get(key);
        next.push({ key, x, z, y: (tile?.level ?? 0) * TILE_HEIGHT + 0.06 });
      }
    }
    const sig = keysAcc.sort().join('|');
    if (sig !== lastKey.current) {
      lastKey.current = sig;
      setTiles(next);
    }
  });

  if (tiles.length === 0) return null;
  // Static-ish opacity — animated via cyclically-resampled ref.
  const opacity = 0.55 + Math.sin(opacityRef.current * Math.PI) * 0.25;
  return (
    <group name="contested-pulse">
      {tiles.map((t) => (
        <mesh key={t.key} position={[t.x, t.y, t.z]} geometry={discGeo} rotation={[0, 0, 0]}>
          <meshBasicMaterial color="#facc15" transparent opacity={Math.max(0.15, opacity)} />
        </mesh>
      ))}
    </group>
  );
}
