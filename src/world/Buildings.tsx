import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import type { BuildingType } from '@/ecs/components';
import { Building, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Parse a "q,r" hex key to axial coordinates. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/**
 * Per-building-type render config.
 *
 * Castle Kit and Fantasy Town Kit models are authored for a ~1-unit grid.
 * Our hex tiles are HEX_RADIUS=1 (~1.7 units wide). Scale factors are tuned
 * so each building fills the tile without overflowing or appearing tiny.
 *
 * - town-hall (tower-square): full square castle keep. Scale 1.0 fits
 *   the footprint; the tower height reads as an imposing player base.
 * - farm (windmill): tall rotating mill — iconic rural landmark.
 *   Scale 0.65 keeps the wings within the tile.
 * - barracks (tower-slant-roof): fortified outpost tower. Scale 0.9.
 */
const BUILDING_CONFIG: Record<BuildingType, { logicalId: string; scale: number; yOffset: number }> =
  {
    TownHall: { logicalId: 'structures.town-hall', scale: 1.0, yOffset: 0 },
    Farm: { logicalId: 'structures.farm', scale: 0.65, yOffset: 0 },
    Barracks: { logicalId: 'structures.barracks', scale: 0.9, yOffset: 0 },
  };

/** Single building mesh — loads its own GLB and clones the scene. */
function BuildingMesh({
  type,
  x,
  y,
  z,
  progress,
}: {
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  progress: number;
}) {
  const cfg = BUILDING_CONFIG[type];
  const glb = useGLTF(assets.url(cfg.logicalId));
  // Scale by construction progress: a half-height stub while building, full when done.
  const effectiveScale = cfg.scale * (0.5 + 0.5 * Math.min(progress, 1));
  return (
    <group position={[x, y + cfg.yOffset, z]} scale={effectiveScale}>
      <Clone object={glb.scene} />
    </group>
  );
}

/**
 * Renders the Town Hall and every constructed building. The Town Hall sits on
 * `game.townHallKey`; build sites render their building GLB scaled by
 * construction progress (a half-height stub while incomplete, full when done).
 */
export function Buildings({ game }: { game: GameState }) {
  const townHallPos = useMemo(() => {
    const { q, r } = parseKey(game.townHallKey);
    const { x, z } = axialToWorld(q, r);
    const tile = game.board.tiles.get(game.townHallKey);
    return { x, y: (tile?.level ?? 0) * TILE_HEIGHT, z };
  }, [game.townHallKey, game.board]);

  // Gather all placed building sites (Farm, Barracks) from the ECS.
  const placedBuildings = useMemo(() => {
    const result: Array<{
      key: string;
      type: BuildingType;
      x: number;
      y: number;
      z: number;
      progress: number;
    }> = [];
    for (const [tileKey, entity] of game.buildSites) {
      const b = entity.get(Building);
      const pos = entity.get(HexPosition);
      if (!b || !pos) continue;
      const { x, z } = axialToWorld(pos.q, pos.r);
      result.push({
        key: tileKey,
        type: b.buildingType,
        x,
        y: pos.level * TILE_HEIGHT,
        z,
        progress: b.progress,
      });
    }
    return result;
  }, [game.buildSites]);

  return (
    <group name="buildings">
      {/* Town Hall — always present at the player base tile. */}
      <BuildingMesh
        type="TownHall"
        x={townHallPos.x}
        y={townHallPos.y}
        z={townHallPos.z}
        progress={1}
      />

      {/* Constructed / under-construction buildings (Farm, Barracks). */}
      {placedBuildings.map((b) => (
        <BuildingMesh key={b.key} type={b.type} x={b.x} y={b.y} z={b.z} progress={b.progress} />
      ))}
    </group>
  );
}

useGLTF.preload(assets.url('structures.town-hall'));
useGLTF.preload(assets.url('structures.farm'));
useGLTF.preload(assets.url('structures.barracks'));
