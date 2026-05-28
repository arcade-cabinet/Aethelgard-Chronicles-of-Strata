/**
 * M_FUN.DYN.VOLCANO — render the volcano landmark + transient
 * eruption visuals (LAVA discs + fertile-tile ground tint).
 *
 * The volcano CONE itself uses the existing Mountains pass (tile
 * type=VOLCANO is registered with peakLevel 5, so the height
 * geometry treats it as a peak). This layer adds the eruption-
 * cycle-only visuals:
 *
 *   - A bright magma cap on the volcano tile (so the cone reads
 *     as a different mountain — not just another grey peak).
 *   - One emissive disc per LAVA tile (orange-red, opacity tied
 *     to remaining/lavaSeconds — fresh lava is bright, cooling
 *     lava fades).
 *   - A subtle green tint disc on each fertile-tile (so the
 *     player sees where Farms will benefit).
 *
 * ECS-as-source-of-truth: this component owns no state. Reads
 * `game.volcano` every frame.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { VOLCANO_TUNING } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';

function LavaDisc({ q, r, opacity }: { q: number; r: number; opacity: number }) {
  const ref = useRef<Mesh>(null);
  const { x, z } = useMemo(() => axialToWorld(q, r), [q, r]);
  useFrame((state) => {
    if (!ref.current) return;
    // Slight throbbing scale.
    const t = state.clock.elapsedTime;
    const pulse = 0.9 + 0.1 * Math.sin(t * 4);
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ref} position={[x, 1.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.5, 18]} />
      <meshStandardMaterial
        color="#dc2626"
        emissive="#f97316"
        emissiveIntensity={1.4}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

function FertileTint({ q, r }: { q: number; r: number }) {
  const { x, z } = useMemo(() => axialToWorld(q, r), [q, r]);
  return (
    <mesh position={[x, 1.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.55, 12]} />
      <meshBasicMaterial color="#22c55e" transparent opacity={0.18} />
    </mesh>
  );
}

function MagmaCap({ q, r }: { q: number; r: number }) {
  const { x, z } = useMemo(() => axialToWorld(q, r), [q, r]);
  return (
    <mesh position={[x, 1.65, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.3, 18]} />
      <meshStandardMaterial color="#f97316" emissive="#dc2626" emissiveIntensity={1.5} />
    </mesh>
  );
}

export function VolcanoLayer({ game }: { game: GameState }) {
  const v = game.volcano;
  if (!v.position) return null;
  const volcanoCoord = parseHexKey(v.position);
  const lavaEntries = [...v.lavaTiles.entries()];
  const fertileKeys = [...v.fertileTiles.keys()];
  return (
    <group name="volcano-layer">
      <MagmaCap q={volcanoCoord.q} r={volcanoCoord.r} />
      {fertileKeys.map((key) => {
        const { q, r } = parseHexKey(key);
        return <FertileTint key={`f-${key}`} q={q} r={r} />;
      })}
      {lavaEntries.map(([key, remaining]) => {
        const { q, r } = parseHexKey(key);
        const opacity = Math.max(0.3, remaining / VOLCANO_TUNING.lavaSeconds);
        return <LavaDisc key={`l-${key}`} q={q} r={r} opacity={opacity} />;
      })}
    </group>
  );
}
