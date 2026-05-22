import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, type Points } from 'three';
import { MAP_RADIUS } from '@/core/constants';
import type { GameState } from '@/game/game-state';

/** Number of rain streak particles. */
const DROP_COUNT = 1200;
/** Fall speed in world units per second. */
const FALL_SPEED = 18;
/** Height the rain field occupies. */
const FIELD_HEIGHT = 30;

/**
 * A falling-rain particle field, visible only while `game.weather.state` is
 * 'rain'. Drops loop from the top of the field back down over the board.
 */
export function RainParticles({ game }: { game: GameState }) {
  const ref = useRef<Points>(null);
  const span = MAP_RADIUS * 2.2;

  const geometry = useMemo(() => {
    const positions = new Float32Array(DROP_COUNT * 3);
    for (let i = 0; i < DROP_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * span;
      positions[i * 3 + 1] = Math.random() * FIELD_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * span;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [span]);

  useFrame((_, delta) => {
    const points = ref.current;
    if (!points) return;
    points.visible = game.weather.state === 'rain';
    if (!points.visible) return;
    const attr = geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < DROP_COUNT; i++) {
      const yi = i * 3 + 1;
      arr[yi] = (arr[yi] ?? 0) - FALL_SPEED * delta;
      if ((arr[yi] ?? 0) < 0) arr[yi] = FIELD_HEIGHT;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} visible={false}>
      <pointsMaterial color="#9ec5e8" size={0.18} transparent opacity={0.6} />
    </points>
  );
}
