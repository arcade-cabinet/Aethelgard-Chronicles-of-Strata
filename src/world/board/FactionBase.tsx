/**
 * M_REGISTRY.4 — ONE faction-symmetric base renderer.
 *
 * Before this file, `HomeBase.tsx` (player) and `EnemyBase.tsx` (enemy)
 * were sibling components that diverged on hardcoded values: HomeBase
 * loaded the Palace mesh + iterated `game.buildSites` for placed
 * structures; EnemyBase loaded the portal-crypt mesh + a hardcoded
 * tuple of (gravestone × 3, fence × 3) at fixed local-space offsets.
 * Per-faction divergence was 100% code.
 *
 * After M_REGISTRY.4: per-faction divergence is 100% **data**, owned by
 * the Skin slot (`SKINS[faction].structure.Palace` + `.baseProps`).
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
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { PointLight } from 'three';
import { assets } from '@/assets/assets';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import {
  Building,
  type BuildingType,
  type Faction,
  FactionTrait,
  Gate,
  HexPosition,
} from '@/ecs/components';
import { cyclePhase, lightIntensityAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';
import { SKINS } from '@/rules/skins';
import { ConstructionRing } from './ConstructionRing';
import { FactionMaterialsProvider } from '../procedural/FactionMaterialsContext';
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
  hasGate = false,
  isCorner = false,
}: {
  faction: Faction;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  progress: number;
  /** M_EXPANSION.A.3 — render the gate variant when a Wall has the Gate trait. */
  hasGate?: boolean;
  /** M_EXPANSION.A.6 — render the corner variant for end-of-row wall tiles. */
  isCorner?: boolean;
}) {
  const model = structureModel(faction, type);
  const effectiveScale = model.scale * (0.5 + 0.5 * Math.min(progress, 1));
  // M_V11.PROCMESH.SKINS-PIVOT — when the Skin slot supplies a
  // procedural component, render it instead of loading a GLB. The
  // FactionMaterialsProvider wrapping the FactionBase tree pipes the
  // per-faction palette through; primitives consume via context.
  if (model.proceduralComponent) {
    const Component = model.proceduralComponent;
    // M_V11.POLISH.PROCMESH.WALL-VARIANTS — Wall variants accept
    // hasGate + isCorner. Other proc components ignore these
    // (their type signature only declares `position` but JS
    // ignores extra props).
    const extraProps = type === 'Wall' ? { hasGate, isCorner } : {};
    return (
      <group position={[x, y + model.yOffset, z]} scale={effectiveScale}>
        <Component position={[0, 0, 0]} {...extraProps} />
      </group>
    );
  }
  return (
    <GlbStructureMesh
      faction={faction}
      type={type}
      x={x}
      y={y + model.yOffset}
      z={z}
      scale={effectiveScale}
      hasGate={hasGate}
      isCorner={isCorner}
      defaultLogicalId={model.logicalId}
    />
  );
}

/** GLB-path fallback for Skin entries that still reference a logicalId
 *  (e.g. future graveyard-kit horde camps or temporary asset rows). */
function GlbStructureMesh({
  faction,
  type,
  x,
  y,
  z,
  scale,
  hasGate,
  isCorner,
  defaultLogicalId,
}: {
  faction: Faction;
  type: BuildingType;
  x: number;
  y: number;
  z: number;
  scale: number;
  hasGate: boolean;
  isCorner: boolean;
  defaultLogicalId: string;
}) {
  // M_V11.POLISH.PROCMESH.WALL-VARIANTS — gate + corner variants
  // are now driven by procedural Wall (hasGate/isCorner props
  // threaded through the proc path). Reference parameters retained
  // for signature compatibility with any remaining GLB-path
  // building entries (Graveyard Kit / horde camps).
  void hasGate;
  void isCorner;
  void type;
  void faction;
  const glb = useGLTF(assets.url(defaultLogicalId));
  return (
    <group position={[x, y, z]} scale={scale}>
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
 * M_EXPANSION.A.11 — warm point light at the faction base that fades
 * up at night. Reads game.clock each frame; intensity is the inverse
 * of the directional-light intensity (peaks at midnight, off at noon).
 * Local-space child of the faction base group, so it sits at the base
 * regardless of where the player has placed their Palace.
 */
function BaseNightLight({ game, faction }: { game: GameState; faction: Faction }) {
  const ref = useRef<PointLight | null>(null);
  useFrame(() => {
    if (!ref.current) return;
    const day = lightIntensityAt(cyclePhase(game.clock));
    // Night intensity = 1 - day, ramped a bit so it's invisible at
    // dusk and only really lights up midnight.
    const night = Math.max(0, 1 - day) ** 1.4;
    ref.current.intensity = night * 2.4;
  });
  // Warm amber light, scoped to the base footprint. Position is local
  // to the parent baseProps group (already at basePos).
  return (
    <pointLight
      ref={ref}
      position={[0, 1.6, 0]}
      color={faction === 'player' ? '#fcd34d' : '#a855f7'}
      distance={6}
      decay={2}
      intensity={0}
    />
  );
}

/**
 * Faction-symmetric base renderer. Reads SKINS[faction] for both the
 * central mesh + the surrounding decorative props. Also iterates
 * `game.buildSites` for placed structures owned by this faction (the
 * AI player builds too — M_MODES enemy economy).
 */
export function FactionBase({ game, faction }: { game: GameState; faction: Faction }) {
  // Base-tile world position (Palace for player, crypt for enemy).
  const basePos = useMemo(() => {
    if (faction === 'player') {
      const { q, r } = parseHexKey(game.palaceKey);
      const { x, z } = axialToWorld(q, r);
      const tile = game.board.tiles.get(game.palaceKey);
      return { x, y: (tile?.level ?? 0) * TILE_HEIGHT, z };
    }
    // enemy — derive from the enemyBaseEntity's live HexPosition trait.
    const hexPos = game.enemyBaseEntity.get(HexPosition);
    if (!hexPos) return null;
    const { x, z } = axialToWorld(hexPos.q, hexPos.r);
    return { x, y: hexPos.level * TILE_HEIGHT, z };
  }, [faction, game.palaceKey, game.board, game.enemyBaseEntity]);

  // Per-faction placed structures (excluding the central Palace mesh,
  // which is rendered directly below). The buildSites map is shared,
  // so filter by the entity's FactionTrait via Building component (the
  // ECS entity already carries faction; we read from the Building
  // entity's traits).
  // biome-ignore lint/correctness/useExhaustiveDependencies: buildSitesGeneration is the tick counter that bumps when ECS trait sets mutate (Gate attach, hasGate flip) without the buildSites Map identity changing — required for correct re-memo, do NOT remove
  const placed = useMemo(() => {
    const result: Array<{
      key: string;
      type: BuildingType;
      x: number;
      y: number;
      z: number;
      progress: number;
      hasGate: boolean;
      q: number;
      r: number;
      isCorner?: boolean;
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
      // M_EXPANSION.A.3 — a Wall that also carries the Gate trait
      // renders with the Castle Kit gate mesh (open-passage silhouette)
      // instead of the plain wall slab.
      const hasGate = b.buildingType === 'Wall' && entity.has(Gate);
      result.push({
        key: tileKey,
        type: b.buildingType,
        x,
        y: pos.level * TILE_HEIGHT,
        z,
        progress: b.progress,
        hasGate,
        q: pos.q,
        r: pos.r,
      });
    }
    // M_EXPANSION.A.6 — pick corner mesh for Wall tiles that have ≤1
    // walking-wall neighbour. Build a set of wall keys first, then
    // count neighbours per wall site in O(neighbours_per_wall).
    const wallKeys = new Set(result.filter((b) => b.type === 'Wall').map((b) => `${b.q},${b.r}`));
    const neighbourOffsets: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, -1],
      [-1, 1],
    ];
    for (const b of result) {
      if (b.type !== 'Wall') continue;
      let count = 0;
      for (const [dq, dr] of neighbourOffsets) {
        if (wallKeys.has(`${b.q + dq},${b.r + dr}`)) count += 1;
      }
      b.isCorner = count <= 1;
    }
    return result;
    // M_AUDIT2.ARCH.22 — depend on buildSitesGeneration (bumped per-
    // mutation), NOT the Map ref (which never changes identity).
    // M_EXPANSION.A.3 — generation also bumps when Gate trait is
    // attached, so the Wall→Gate visual swap is picked up.
  }, [game.buildSites, faction, game.buildSitesGeneration]);

  if (!basePos) return null;
  const skin = SKINS[faction];

  return (
    <FactionMaterialsProvider faction={faction}>
      <group name={`${faction}-base`}>
        {/* M_GAME.BUG.1 — faction-color halo ring under the Palace
          so the player can LOCATE their capital at a glance from any
          camera distance, regardless of mesh silhouette + map
          biome. The ring is rendered just above ground level (y+0.02)
          to avoid z-fighting with terrain. Pulses gently by reading
          the day/night phase indirectly (no extra subscriptions —
          the constant radius + faction tint is enough at this scale). */}
        <mesh
          position={[basePos.x, basePos.y + 0.02, basePos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <ringGeometry args={[1.0, 1.35, 36]} />
          <meshBasicMaterial color={skin.zoneBorderColor} transparent opacity={0.6} />
        </mesh>
        {/* Central base mesh — Palace (player) / crypt (enemy). */}
        <StructureMesh
          faction={faction}
          type="Palace"
          x={basePos.x}
          y={basePos.y}
          z={basePos.z}
          progress={1}
        />
        {/* Decorative props (Skin slot — empty for player, necropolis for enemy). */}
        <group position={[basePos.x, basePos.y, basePos.z]}>
          {skin.baseProps.map((p) => (
            <BasePropMesh
              // CodeRabbit MAJOR — composite key from stable data fields
              // only (logicalId + x + y + z + scale + rotationY uniquely
              // identifies a prop within a skin); idx removed.
              key={`prop-${p.logicalId}-${p.x}-${p.y}-${p.z}-${p.scale}-${p.rotationY}`}
              logicalId={p.logicalId}
              x={p.x}
              y={p.y}
              z={p.z}
              scale={p.scale}
              rotationY={p.rotationY}
            />
          ))}
          {/* M_EXPANSION.A.11 — warm point light at the base, auto-fades
            up at night. Placeholder for a future lamp-post asset; for
            now the banner-faction baseProp serves as the visual anchor
            (the light origin coincides with it). */}
          <BaseNightLight game={game} faction={faction} />
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
              hasGate={b.hasGate}
              isCorner={b.isCorner ?? false}
            />
            <ConstructionRing x={b.x} y={b.y} z={b.z} progress={b.progress} />
          </group>
        ))}
      </group>
    </FactionMaterialsProvider>
  );
}

// Preload every GLB any Skin references — central base mesh (Palace),
// every structure type the faction may place (Farm/House/Granary/
// Barracks/Watchtower/Wall/Wonder/Library — pre-warmed so placement
// doesn't stutter), AND decorative baseProps. The Skin registry is
// the single source of truth for what visual assets matter; this
// preload list derives from it so adding a structure or prop in
// SKINS automatically preloads its GLB.
const SEEN_PRELOAD = new Set<string>();
for (const skin of Object.values(SKINS)) {
  for (const model of Object.values(skin.structure)) {
    // M_V11.PROCMESH.SKINS-PIVOT — procedural entries carry a
    // sentinel logicalId ('procedural'); skip them in the GLB
    // preload pass since they have no asset.
    if (model.proceduralComponent || model.logicalId === 'procedural') continue;
    SEEN_PRELOAD.add(model.logicalId);
  }
  for (const p of skin.baseProps) SEEN_PRELOAD.add(p.logicalId);
}
for (const id of SEEN_PRELOAD) useGLTF.preload(assets.url(id));
