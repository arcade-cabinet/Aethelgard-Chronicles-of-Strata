import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { HEX_RADIUS } from '@/core/constants';
import { Selectable, Transform } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * A rotating cyan ring rendered beneath the currently selected unit. Tracks the
 * first selected entity's Transform each frame; hidden when nothing is selected.
 */
export function SelectionRing({ game }: { game: GameState }) {
  const ref = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    let selected: { x: number; y: number; z: number } | null = null;
    for (const entity of game.world.query(Selectable, Transform)) {
      if (entity.get(Selectable)?.isSelected) {
        const t = entity.get(Transform);
        if (t) selected = { x: t.x, y: t.y, z: t.z };
        break;
      }
    }
    if (selected) {
      mesh.visible = true;
      mesh.position.set(selected.x, selected.y + 0.06, selected.z);
      mesh.rotation.z += delta * 1.5;
    } else {
      mesh.visible = false;
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[HEX_RADIUS * 0.55, HEX_RADIUS * 0.7, 24]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
    </mesh>
  );
}
