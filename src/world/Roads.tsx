import { useFrame } from '@react-three/fiber';
import { unpackEntity } from 'koota';
import { useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { HexPosition, MoverBehavior, type MoverMaterial } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { moverProfileFor } from '@/rules/mover-profiles';

/** Flat hex disc, slightly smaller than the tile so neighbours don't z-fight. */
const roadGeo = new CylinderGeometry(HEX_RADIUS * 0.92, HEX_RADIUS * 0.92, 0.08, 6);

/** A single road tile snapshot — taken when the roster changes. */
interface RoadView {
  id: number;
  x: number;
  y: number;
  z: number;
  material: MoverMaterial;
}

/**
 * Roads layer (M_FEATURE.1) — renders every entity with a `MoverBehavior`
 * trait as a flat disc on its tile, coloured per material. Sits just above
 * the terrain so the camera reads "this tile is a road." A Gate-composed
 * tile (Wall + Mover) shows the road overlaying the existing wall mesh.
 *
 * The roster is re-snapshotted each frame (cheap — typically <20 roads on-
 * screen); the geometry is shared.
 */
export function Roads({ game }: { game: GameState }) {
  const [views, setViews] = useState<RoadView[]>(() => snapshot(game));
  // Re-snapshot each frame so newly-placed roads appear without a re-render
  // tick; setViews bails on identity-equal arrays so React doesn't reconcile
  // when nothing changed.
  useFrame(() => {
    setViews((prev) => {
      const next = snapshot(game);
      if (
        next.length === prev.length &&
        next.every((v, i) => v.id === prev[i]?.id && v.material === prev[i]?.material)
      ) {
        return prev;
      }
      return next;
    });
  });

  // Per-material instanced groups would scale better; for the v0.4 cycle
  // (typical roads <20) a per-entity mesh keeps the code obvious.
  return (
    <group name="roads">
      {views.map((v) => (
        <mesh
          key={v.id}
          position={[v.x, v.y, v.z]}
          rotation={[0, Math.PI / 6, 0]}
          geometry={roadGeo}
        >
          <meshStandardMaterial color={moverProfileFor(v.material).color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Snapshot the road roster from the live world. */
function snapshot(game: GameState): RoadView[] {
  const out: RoadView[] = [];
  for (const e of game.world.query(MoverBehavior, HexPosition)) {
    const m = e.get(MoverBehavior);
    const h = e.get(HexPosition);
    if (!m || !h) continue;
    const w = axialToWorld(h.q, h.r);
    out.push({
      // M_MICRO.3.1 — id is the koota entityId, stable across query
      // order changes. Was `i++` which would silently rotate IDs as
      // koota reordered entities → React reconciled every road on
      // every frame.
      id: unpackEntity(e).entityId,
      x: w.x,
      y: h.level * TILE_HEIGHT + 0.06,
      z: w.z,
      material: m.material,
    });
  }
  // Sort by id so the array order is deterministic across frames; the
  // diff check in useFrame then catches identity, not order.
  out.sort((a, b) => a.id - b.id);
  return out;
}
