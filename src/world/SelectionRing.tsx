import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { HEX_RADIUS } from '@/config/world';
import { Building, FactionBase, Selectable, Transform, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * Per-entity-archetype ring scale (M_COMBAT_POLISH.4). The selection ring
 * sizes itself to match what's selected: small for a peon, larger for a
 * military unit, large for a building, largest for a faction base. Per the
 * original conversation's "adaptive selection rings" call-out.
 */
function ringScale(entity: Entity): number {
  if (entity.has(FactionBase)) return 1.5;
  if (entity.has(Building)) return 1.25;
  const role = entity.get(Unit)?.unitType;
  if (role === 'Peon') return 0.65;
  if (role) return 0.85; // any military unit
  return 1;
}

/**
 * A rotating cyan ring rendered beneath the currently selected entity. Scales
 * with the selection's archetype (peon < footman < building < base). Tracks
 * the first selected entity's Transform each frame; hidden when nothing
 * is selected.
 */
export function SelectionRing({ game }: { game: GameState }) {
  const ref = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    let pos: { x: number; y: number; z: number } | null = null;
    let scale = 1;
    for (const entity of game.world.query(Selectable, Transform)) {
      if (entity.get(Selectable)?.isSelected) {
        const t = entity.get(Transform);
        if (t) {
          pos = { x: t.x, y: t.y, z: t.z };
          scale = ringScale(entity);
        }
        break;
      }
    }
    if (pos) {
      mesh.visible = true;
      mesh.position.set(pos.x, pos.y + 0.06, pos.z);
      mesh.rotation.z += delta * 1.5;
      mesh.scale.setScalar(scale);
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
