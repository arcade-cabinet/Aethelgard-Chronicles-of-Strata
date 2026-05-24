import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';

/**
 * M_EXPANSION.A.17 — coffin death-drop layer.
 *
 * Listens for the `aethelgard:enemy-death-drop` CustomEvent fired
 * from deathSystem when an enemy entity is destroyed, and renders a
 * coffin mesh at the death tile that fades over LIFETIME seconds
 * before unmounting. Pure visual — no ECS state.
 */
const LIFETIME = 3;

interface Drop {
  id: number;
  x: number;
  z: number;
  y: number;
  bornAt: number;
}

let nextId = 0;

export function DeathDropLayer() {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ q: number; r: number }>).detail;
      if (!detail) return;
      const { x, z } = axialToWorld(detail.q, detail.r);
      setDrops((prev) => [
        ...prev,
        { id: nextId++, x, z, y: 0.05 * TILE_HEIGHT, bornAt: performance.now() },
      ]);
    };
    window.addEventListener('aethelgard:enemy-death-drop', handler);
    return () => window.removeEventListener('aethelgard:enemy-death-drop', handler);
  }, []);

  useFrame(() => {
    if (drops.length === 0) return;
    const now = performance.now();
    setDrops((prev) => prev.filter((d) => now - d.bornAt < LIFETIME * 1000));
  });

  if (drops.length === 0) return null;
  return (
    <>
      {drops.map((d) => (
        <Coffin key={d.id} x={d.x} y={d.y} z={d.z} />
      ))}
    </>
  );
}

function Coffin({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<{ rotation: { y: number } } | null>(null);
  const glb = useGLTF(assets.url('nature.coffin'));
  // tiny spin so the drop reads as a notable event, not static decor
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <group ref={ref as unknown as React.Ref<never>} position={[x, y, z]} scale={0.55}>
      <Clone object={glb.scene} />
    </group>
  );
}
