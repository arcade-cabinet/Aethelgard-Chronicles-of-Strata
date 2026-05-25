/**
 * M_V7.RENDER.COLOR-OUTLINE-V3 — per-building outline ring renderer.
 *
 * Reads game.world's (Building + FactionTrait + HexPosition) tuples
 * and draws one colored ring per complete building, color from the
 * runtime registry (findFaction(game.factions, faction)?.color).
 *
 * Same pattern as UnitHexOutline but for completed Building entities —
 * the territory-ownership cue around static structures. Throttles to
 * 1 Hz because buildings don't move (the registry color CAN change
 * mid-match if a diplomacy event recolors; the throttle is the
 * batching window).
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type BufferGeometry, type LineSegments, BufferAttribute } from 'three';
import { findFaction } from '@/config/factions';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner } from '@/core/hex';
import { Building, FactionTrait, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

const OUTLINE_LIFT = 0.04; // sits above unit rings if they overlap

function buildBuildingRings(game: GameState, faction: string): Float32Array {
  const arr: number[] = [];
  for (const e of game.world.query(Building, HexPosition, FactionTrait)) {
    const b = e.get(Building);
    const f = (e.get(FactionTrait)?.faction ?? 'player') as string;
    const hex = e.get(HexPosition);
    if (!b?.isComplete || !hex || f !== faction) continue;
    const { x, z } = axialToWorld(hex.q, hex.r);
    const y = hex.level * TILE_HEIGHT + OUTLINE_LIFT;
    for (let i = 0; i < 6; i++) {
      const c1 = getHexCorner(x, z, i);
      const c2 = getHexCorner(x, z, (i + 1) % 6);
      // Inset by 15% — slightly larger than unit rings so they read as
      // "the structure's halo" rather than "the unit standing here".
      const ix1 = x + (c1.x - x) * 0.85;
      const iz1 = z + (c1.z - z) * 0.85;
      const ix2 = x + (c2.x - x) * 0.85;
      const iz2 = z + (c2.z - z) * 0.85;
      arr.push(ix1, y, iz1, ix2, y, iz2);
    }
  }
  return new Float32Array(arr);
}

function FactionBuildingRings({ game, faction }: { game: GameState; faction: string }) {
  const ref = useRef<LineSegments>(null);
  const color = useMemo(
    () => findFaction(game.factions, faction)?.color ?? '#ffffff',
    [game.factions, faction],
  );
  const lastUpdate = useRef(0);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const now = clock.getElapsedTime();
    if (now - lastUpdate.current < 1.0) return; // 1 Hz — buildings stable
    lastUpdate.current = now;
    const positions = buildBuildingRings(game, faction);
    const geo = ref.current.geometry as BufferGeometry;
    geo.setAttribute('position', new BufferAttribute(positions, 3));
  });
  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.7} />
    </lineSegments>
  );
}

export function BuildingOutlineRing({ game }: { game: GameState }) {
  return (
    <group name="building-outline-ring">
      {game.factions.map((f) => (
        <FactionBuildingRings key={f.id} game={game} faction={f.id} />
      ))}
    </group>
  );
}
