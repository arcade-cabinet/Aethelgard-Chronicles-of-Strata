import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { HEX_RADIUS } from '@/config/world';
import { Building, FactionBase, Selectable, Transform, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { profileFor } from '@/rules/building-profiles';
import { unitProfileFor } from '@/rules/unit-profiles';

/**
 * Per-entity-archetype ring scale (M_COMBAT_POLISH.4 + M_REGISTRY.19).
 * The selection ring sizes itself to match what's selected via the
 * unified Thing registry's `selectionRadius` slot:
 *
 *   - FactionBase  → 1.5  (the home base ring, fixed)
 *   - Building     → BUILDING_PROFILES[type].selectionRadius
 *   - Unit         → UNIT_PROFILES[role].selectionRadius
 *
 * No more 4-branch if-ladder; the per-thing data IS the answer. Adding
 * a new building type or unit role drops in via its profile row.
 */
function ringScale(entity: Entity): number {
  if (entity.has(FactionBase)) return 1.5;
  const buildingType = entity.get(Building)?.buildingType;
  if (buildingType) return profileFor(buildingType).selectionRadius;
  const role = entity.get(Unit)?.unitType;
  if (role) return unitProfileFor(role).selectionRadius;
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
