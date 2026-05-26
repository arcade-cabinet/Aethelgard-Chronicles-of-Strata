/**
 * M_V11.POLISH.LOOT-FX — visible representation for un-collected
 * LootCache entities.
 *
 * Each cache renders a small spinning gem above its tile so the
 * player can SEE the drop from across the map before walking
 * onto it. The gem mesh is faction-agnostic; color shifts by the
 * cache's dominant resource (wood→amber, stone→slate, gold→gold)
 * with a subtle glow so even at zoom-out the dot reads.
 *
 * Rotates ~1 turn / 2s for visibility without being distracting.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { HexPosition, LootCache } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

interface CacheSnapshot {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
}

/** Pick the gem color from the cache's largest resource bundle. */
function pickColor(loot: { wood: number; stone: number; gold: number }): string {
  if (loot.gold >= loot.wood && loot.gold >= loot.stone) return '#facc15'; // gold-yellow
  if (loot.stone >= loot.wood) return '#94a3b8'; // slate
  return '#d97706'; // amber for wood
}

function GemMesh({ snap }: { snap: CacheSnapshot }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * Math.PI; // 1 turn / 2s
    ref.current.position.y = snap.y + 0.45 + Math.sin(t * 2) * 0.05;
  });
  return (
    <group ref={ref} position={[snap.x, snap.y + 0.45, snap.z]}>
      {/* octahedron-ish gem via two cones meeting at midline */}
      <mesh castShadow>
        <coneGeometry args={[0.1, 0.18, 6]} />
        <meshStandardMaterial
          color={snap.color}
          emissive={snap.color}
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, -0.09, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.1, 0.12, 6]} />
        <meshStandardMaterial
          color={snap.color}
          emissive={snap.color}
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}

export function LootCacheLayer({ game }: { game: GameState }) {
  // Re-snapshot each render — cheap (a few caches per match max).
  // The parent gameplay shell re-renders on game-state mutation
  // already, so caches appear/disappear within one frame of the
  // mob death / pickup. NOT memo'd because game.world.query()
  // can't safely be a useMemo dep (would re-run query in the dep
  // array on every render anyway).
  const snapshots: CacheSnapshot[] = [];
  for (const e of game.world.query(LootCache, HexPosition)) {
    const loot = e.get(LootCache);
    const hex = e.get(HexPosition);
    if (!loot || !hex) continue;
    const { x, z } = axialToWorld(hex.q, hex.r);
    snapshots.push({
      id: e.id(),
      x,
      y: hex.level * TILE_HEIGHT,
      z,
      color: pickColor(loot),
    });
  }
  return (
    <group name="loot-cache-layer">
      {snapshots.map((snap) => (
        <GemMesh key={snap.id} snap={snap} />
      ))}
    </group>
  );
}
