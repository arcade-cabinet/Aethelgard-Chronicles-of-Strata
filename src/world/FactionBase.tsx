/**
 * M_REGISTRY.4 — ONE faction-symmetric base renderer.
 *
 * Before this file, `HomeBase.tsx` (player) and `EnemyBase.tsx` (enemy)
 * were sibling components that diverged on hardcoded values: HomeBase
 * loaded the TownHall mesh + iterated `game.buildSites` for placed
 * structures; EnemyBase loaded the portal-crypt mesh + a hardcoded
 * tuple of (gravestone × 3, fence × 3) at fixed local-space offsets.
 * Per-faction divergence was 100% code.
 *
 * After M_REGISTRY.4: per-faction divergence is 100% **data**, owned by
 * the Skin slot (`SKINS[faction].structure.TownHall` + `.baseProps`).
 * `FactionBase` is the single component; the player and enemy roots
 * mount it twice with different `faction` props. A third tribe drops in
 * by adding a Skin row — no new component.
 *
 * The placed-structures loop (per-buildSite entities, with
 * ConstructionRing scaffolding) stays in this file too: it's
 * faction-agnostic — both player and enemy can construct, and the
 * iteration is over `game.buildSites` regardless. Whether a faction
 * actually places structures is gameplay, not visual.
 */
import { Clone, useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import {
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  HexPosition,
} from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { SKINS } from '@/rules/skins';
import { ConstructionRing } from './ConstructionRing';
import { structureModel } from './structure-models';

// M_MICRO.2.2 — local parseKey replaced by shared parseHexKey.

/**
 * One structure mesh. Loads the GLB for `(faction, type)` via the Skin
 * slot and clones it, scaled by construction progress — a half-height
 * stub while building, full when complete. Shared by the central base
 * mesh AND every placed structure.
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
 * One decorative base prop placed at a Skin-defined local-space offset
 * around the faction's base tile. Only enemy uses these today (the
 * necropolis silhouette); player baseProps is empty.
 */
function BasePropMesh({
  logicalId,
  x,
  y,
  z,
  scale,
  rotationY,
}: {
  logicalId: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotationY: number;
}) {
  const glb = useGLTF(assets.url(logicalId));
  return (
    <group position={[x, y, z]} scale={scale} rotation={[0, rotationY, 0]}>
      <Clone object={glb.scene} />
    </group>
  );
}

/**
 * Faction-symmetric base renderer. Reads SKINS[faction] for both the
 * central mesh + the surrounding decorative props. Also iterates
 * `game.buildSites` for placed structures owned by this faction (the
 * AI player builds too — M_MODES enemy economy).
 */
export function FactionBase({ game, faction }: { game: GameState; faction: Faction }) {
  // Base-tile world position (TownHall for player, crypt for enemy).
  const basePos = useMemo(() => {
    if (faction === 'player') {
      const { q, r } = parseHexKey(game.townHallKey);
      const { x, z } = axialToWorld(q, r);
      const tile = game.board.tiles.get(game.townHallKey);
      return { x, y: (tile?.level ?? 0) * TILE_HEIGHT, z };
    }
    // enemy — derive from the enemyBaseEntity's live HexPosition trait.
    const hexPos = game.enemyBaseEntity.get(HexPosition);
    if (!hexPos) return null;
    const { x, z } = axialToWorld(hexPos.q, hexPos.r);
    return { x, y: hexPos.level * TILE_HEIGHT, z };
  }, [faction, game.townHallKey, game.board, game.enemyBaseEntity]);

  // Per-faction placed structures (excluding the central TownHall mesh,
  // which is rendered directly below). The buildSites map is shared,
  // so filter by the entity's FactionTrait via Building component (the
  // ECS entity already carries faction; we read from the Building
  // entity's traits).
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
      // FactionTrait filter: only render this faction's placed structures
      // (the other faction's FactionBase handles theirs).
      const ft = entity.get(FactionTrait);
      if (ft?.faction !== faction) continue;
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
  }, [game.buildSites, faction]);

  if (!basePos) return null;
  const skin = SKINS[faction];

  return (
    <group name={`${faction}-base`}>
      {/* Central base mesh — TownHall (player) / crypt (enemy). */}
      <StructureMesh
        faction={faction}
        type="TownHall"
        x={basePos.x}
        y={basePos.y}
        z={basePos.z}
        progress={1}
      />
      {/* Decorative props (Skin slot — empty for player, necropolis for enemy). */}
      <group position={[basePos.x, basePos.y, basePos.z]}>
        {skin.baseProps.map((p, idx) => (
          <BasePropMesh
            key={`prop-${idx}-${p.logicalId}-${p.x}-${p.z}`}
            logicalId={p.logicalId}
            x={p.x}
            y={p.y}
            z={p.z}
            scale={p.scale}
            rotationY={p.rotationY}
          />
        ))}
      </group>
      {/* Placed structures this faction has constructed mid-game. */}
      {placed.map((b) => (
        <group key={b.key}>
          <StructureMesh
            faction={faction}
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

// Preload every GLB any Skin references — central base mesh (TownHall),
// every structure type the faction may place (Farm/House/Granary/
// Barracks/Watchtower/Wall/Wonder/Library — pre-warmed so placement
// doesn't stutter), AND decorative baseProps. The Skin registry is
// the single source of truth for what visual assets matter; this
// preload list derives from it so adding a structure or prop in
// SKINS automatically preloads its GLB.
const SEEN_PRELOAD = new Set<string>();
for (const skin of Object.values(SKINS)) {
  for (const model of Object.values(skin.structure)) SEEN_PRELOAD.add(model.logicalId);
  for (const p of skin.baseProps) SEEN_PRELOAD.add(p.logicalId);
}
for (const id of SEEN_PRELOAD) useGLTF.preload(assets.url(id));
