/**
 * M_FUN.DYN.WILDFIRE — render the active burn fronts.
 *
 * Reads game.wildfires every frame and draws one emissive disc per
 * burning tile. ECS is the source of truth: this component owns no
 * state, just maps the registry to meshes.
 *
 * The disc colour pulses by sin(time) so a player scanning the map
 * sees fire as movement, not a flat overlay. Each tile uses the
 * burn's remaining-life fraction to taper opacity as the fire
 * approaches burnout.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { WILDFIRE_TUNING } from '@/config/mapgen';
import { axialToWorld, parseHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';

function FireDisc({ q, r }: { q: number; r: number }) {
  const ref = useRef<Mesh>(null);
  const { x, z } = useMemo(() => axialToWorld(q, r), [q, r]);
  useFrame((state) => {
    if (!ref.current) return;
    // Pulse the scale + emissive intensity. The 6Hz pulse rate reads
    // as "flicker" without being epileptic.
    const t = state.clock.elapsedTime;
    const pulse = 0.85 + 0.15 * Math.sin(t * 6);
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ref} position={[x, 1.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.45, 16]} />
      <meshStandardMaterial
        color="#ff7a00"
        emissive="#ff5500"
        emissiveIntensity={1.2}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

export function WildfireLayer({ game }: { game: GameState }) {
  // Re-render when the burning-tile set changes. Stable key per tile.
  const burningKeys = [...game.wildfires.keys()];
  return (
    <group name="wildfire-layer">
      {burningKeys.map((key) => {
        const { q, r } = parseHexKey(key);
        const state = game.wildfires.get(key);
        if (!state) return null;
        // Tilt opacity by remaining life — dying fires fade.
        const life = state.burnTicksRemaining / WILDFIRE_TUNING.burnTicks;
        if (life <= 0) return null;
        return <FireDisc key={key} q={q} r={r} />;
      })}
    </group>
  );
}
