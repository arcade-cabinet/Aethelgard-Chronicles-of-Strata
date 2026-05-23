import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { Building, type BuildingType, type Faction, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { ConstructionRing } from './ConstructionRing';
import { structureModel } from './structure-models';

/** Parse a "q,r" hex key to axial coordinates. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/**
 * One structure mesh. Loads the GLB for `(faction, type)` and clones it,
 * scaled by construction progress — a half-height stub while building, full
 * when complete.
 */
function StructureMesh({
  faction,
  type,
  x,
  y,
  z,
  progress,
}: {
  faction: Faction;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  progress: number;
}) {
  const model = structureModel(faction, type);
  const glb = useGLTF(assets.url(model.logicalId));
  const effectiveScale = model.scale * (0.5 + 0.5 * Math.min(progress, 1));
  return (
    <group position={[x, y + model.yOffset, z]} scale={effectiveScale}>
      <Clone object={glb.scene} />
    </group>
  );
}

/**
 * The player's home base — the Town Hall plus every structure the player has
 * built (Farm, Barracks). Replaces the old undifferentiated `Buildings.tsx`:
 * structures are now rendered per faction, so `HomeBase` (player) and
 * `EnemyBase` (enemy graveyard) are the two symmetric sides. The render is the
 * only thing that diverges — the structure types, costs, and ECS traits are
 * shared. See `docs/specs/100-ai-as-player.md`.
 */
export function HomeBase({ game }: { game: GameState }) {
  const townHallPos = useMemo(() => {
    const { q, r } = parseKey(game.townHallKey);
    const { x, z } = axialToWorld(q, r);
    const tile = game.board.tiles.get(game.townHallKey);
    return { x, y: (tile?.level ?? 0) * TILE_HEIGHT, z };
  }, [game.townHallKey, game.board]);

  // every player build-site (Farm, Barracks), from the ECS
  const placed = useMemo(() => {
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
    <group name="home-base">
      {/* the Town Hall — always present at the player's base tile */}
      <StructureMesh
        faction="player"
        type="TownHall"
        x={townHallPos.x}
        y={townHallPos.y}
        z={townHallPos.z}
        progress={1}
      />
      {/* player-built structures, scaled by construction progress */}
      {placed.map((b) => (
        <group key={b.key}>
          <StructureMesh
            faction="player"
            type={b.type}
            x={b.x}
            y={b.y}
            z={b.z}
            progress={b.progress}
          />
          <ConstructionRing x={b.x} y={b.y} z={b.z} progress={b.progress} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(assets.url('structures.town-hall'));
useGLTF.preload(assets.url('structures.farm'));
useGLTF.preload(assets.url('structures.barracks'));
