import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { ConeGeometry, type Mesh } from 'three';
import type { GameState } from '@/game/game-state';
import type { Projectile } from '@/game/projectiles';

/** Per-kind material color — extensible via a config row when more kinds land. */
const KIND_COLOR: Record<Projectile['kind'], string> = {
  arrow: '#fde047',
  bolt: '#94a3b8',
  magic: '#a855f7',
};

const arrowGeo = new ConeGeometry(0.08, 0.4, 6);

/** One projectile mesh — lerps source→target as its age advances; arcs slightly upward. */
function ProjectileMesh({ p }: { p: Projectile }) {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, p.age / p.lifetime);
    // straight lerp + a small parabolic arc so projectiles read as in-flight
    const arc = Math.sin(t * Math.PI) * 0.8;
    ref.current.position.set(
      p.sx + (p.tx - p.sx) * t,
      p.sy + (p.ty - p.sy) * t + arc,
      p.sz + (p.tz - p.sz) * t,
    );
    // point along the flight direction
    ref.current.lookAt(p.tx, p.ty, p.tz);
    ref.current.rotateX(Math.PI / 2);
  });
  return (
    <mesh ref={ref} geometry={arrowGeo}>
      <meshBasicMaterial color={KIND_COLOR[p.kind]} />
    </mesh>
  );
}

/**
 * Projectile FX layer (M_COMBAT_POLISH.1). Renders every projectile in
 * `game.projectiles`; each mesh follows its tween per-frame. Auto-despawn
 * happens in `advanceProjectiles` (game-state.ts).
 */
export function ProjectileLayer({ game }: { game: GameState }) {
  const [, setTick] = useState(0);
  // The projectiles list is mutated in place by the sim tick; force re-render
  // each frame so React picks up new entries.
  useFrame(() => setTick((n) => (n + 1) & 0xffff));
  return (
    <group name="projectiles">
      {game.projectiles.map((p) => (
        <ProjectileMesh key={p.id} p={p} />
      ))}
    </group>
  );
}
