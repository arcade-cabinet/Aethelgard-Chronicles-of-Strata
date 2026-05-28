import { useFrame } from '@react-three/fiber';
import { unpackEntity } from 'koota';
import { useMemo, useRef, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial } from 'three';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import { Building, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/**
 * The barracks rally-point marker — a small flag on a pole. Stays mounted and
 * toggles `visible`/position with the rally state (no unmount/remount, so the
 * Three.js geometry is created once) so the marker follows the player moving
 * the rally point.
 *
 * M_EXPANSION.U.120 — when a Barracks is currently selected, the marker
 * surfaces a connector line from the Barracks to the rally tile + a larger
 * pulsing ring at the rally tile. Mobile-portable: the rally preview is
 * ALWAYS-ON while the Barracks is selected (no hover/hold needed). The
 * existing "tap a tile to set rally" flow is unchanged; this just makes
 * the rally state legible at-a-glance on touch.
 */
export function RallyMarker({ game }: { game: GameState }) {
  const [key, setKey] = useState(game.rally.targetKey);
  // Track Barracks selection state. We only fall into the ECS query when
  // selectedId actually changes — the snapshot pattern keeps useFrame cheap.
  const [barracksXZ, setBarracksXZ] = useState<{ x: number; y: number; z: number } | null>(null);
  const lastSelectedRef = useRef<number | undefined>(undefined);
  // Pulse phase advances each frame; 0..1 ramp used for ring scale + opacity.
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (game.rally.targetKey !== key) setKey(game.rally.targetKey);
    if (game.selectedId !== lastSelectedRef.current) {
      lastSelectedRef.current = game.selectedId;
      const next = resolveBarracksPos(game);
      setBarracksXZ(next);
    }
    pulseRef.current = (pulseRef.current + delta * 1.6) % 1;
  });

  let rx = 0;
  let ry = 0;
  let rz = 0;
  if (key !== '') {
    const { q, r } = parseHexKey(key);
    const world = axialToWorld(q, r);
    rx = world.x;
    rz = world.z;
    ry = (game.board.tiles.get(key)?.level ?? 0) * TILE_HEIGHT;
  }

  // Connector line — pre-built three.js Line so we sidestep r3f's
  // <line> name colliding with the SVG intrinsic. The position attribute
  // is updated in-place each frame; geometry + material are reused
  // across renders so we don't allocate.
  const lineObj = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3));
    const m = new LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 });
    return new Line(g, m);
  }, []);

  useFrame(() => {
    if (!barracksXZ || key === '') return;
    const pos = lineObj.geometry.getAttribute('position');
    pos.setXYZ(0, barracksXZ.x, barracksXZ.y + 0.3, barracksXZ.z);
    pos.setXYZ(1, rx, ry + 0.2, rz);
    pos.needsUpdate = true;
  });

  const previewVisible = barracksXZ !== null && key !== '';
  const pulse = pulseRef.current;
  const ringScale = 0.6 + pulse * 0.4;
  const ringOpacity = 0.5 * (1 - pulse);

  return (
    <>
      <group position={[rx, ry, rz]} visible={key !== ''}>
        {/* pole */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
          <meshStandardMaterial color="#78350f" flatShading />
        </mesh>
        {/* flag */}
        <mesh position={[0.22, 1, 0]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshStandardMaterial color="#ef4444" flatShading side={2} />
        </mesh>
        {/* M_EXPANSION.U.120 — pulsing ring at rally tile, visible while
              Barracks selected. Touch-readable from any zoom. */}
        {previewVisible && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]}
            scale={[ringScale, ringScale, ringScale]}
          >
            <ringGeometry args={[0.55, 0.75, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={ringOpacity} />
          </mesh>
        )}
      </group>
      {/* Connector line from Barracks to rally tile. */}
      {previewVisible && <primitive object={lineObj} />}
    </>
  );
}

/**
 * Look up the world position of the currently-selected Barracks, or null
 * if the current selection is not a Barracks (or nothing is selected).
 * Exported for the unit test (M_EXPANSION.U.120) — kept module-private
 * otherwise.
 */
export function resolveBarracksPos(game: GameState): { x: number; y: number; z: number } | null {
  const id = game.selectedId;
  if (id === undefined) return null;
  for (const e of game.world.query(Building, HexPosition)) {
    if (unpackEntity(e).entityId !== id) continue;
    const b = e.get(Building);
    if (!b || b.buildingType !== 'Barracks') return null;
    const hex = e.get(HexPosition);
    if (!hex) return null;
    const w = axialToWorld(hex.q, hex.r);
    return { x: w.x, y: hex.level * TILE_HEIGHT, z: w.z };
  }
  return null;
}
