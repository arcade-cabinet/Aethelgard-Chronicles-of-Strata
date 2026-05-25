import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { Suspense, useRef, useState } from 'react';
import type { Group } from 'three';
import {
  AnimationState,
  AssignedJob,
  FactionTrait,
  Health,
  Transform,
  Unit,
  type UnitType,
  type Faction,
} from '@/ecs/components';
import { type ClipName, clipForState } from '@/ecs/systems/animation';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';
import type { GameState } from '@/game/game-state';
import { SuspenseProbe } from '@/render/SuspenseProbe';
import { isColorblindMode, resolveFactionTint } from '@/rules/colorblind';
import { SKINS } from '@/rules/skins';
import { BuilderBadge } from './BuilderBadge';
import { HealthBillboard } from './HealthBillboard';

/** A live unit snapshot taken when the roster changes. */
interface UnitView {
  /** Entity numeric id — stable React key. */
  id: number;
  /** The ECS entity reference. */
  entity: Entity;
  /** Unit role. */
  role: UnitType;
  /** M_EXPANSION.A.29 — faction tint resolved at snapshot time. */
  tint: string | null;
}

/** One rendered unit — an animated character that follows its ECS entity. */
function UnitMesh({ entity, role, tint }: { entity: Entity; role: UnitType; tint: string | null }) {
  const ref = useRef<Group>(null);
  const [clip, setClip] = useState<ClipName>('Idle_A');
  const [health, setHealth] = useState({ current: 1, max: 1 });
  const [building, setBuilding] = useState(false);

  useFrame(() => {
    const t = entity.get(Transform);
    if (t && ref.current) {
      ref.current.position.set(t.x, t.y, t.z);
      ref.current.rotation.y = t.rotationY;
    }
    const anim = entity.get(AnimationState);
    if (anim) {
      const next = clipForState(anim.state);
      if (next !== clip) setClip(next);
    }
    const h = entity.get(Health);
    if (h && (h.current !== health.current || h.max !== health.max)) {
      setHealth({ current: h.current, max: h.max });
    }
    // M_CONSTRUCTION.2 — track BUILDING state so the BuilderBadge can show
    const isBuilding = entity.get(AssignedJob)?.state === 'BUILDING';
    if (isBuilding !== building) setBuilding(isBuilding);
  });

  return (
    <group ref={ref}>
      {/* M_POLISH3.FB.2 — observable Suspense fallback. */}
      <Suspense fallback={<SuspenseProbe label={`AnimatedCharacter role=${role}`} />}>
        <AnimatedCharacter role={role} clip={clip} tint={tint} />
      </Suspense>
      <HealthBillboard current={health.current} max={health.max} />
      {building && <BuilderBadge />}
    </group>
  );
}

/**
 * Renders every unit in the ECS — player peons and footmen, enemy goblins and
 * orcs — as an animated KayKit character with a health billboard. The roster is
 * re-snapshotted each frame; the entity reference is passed straight to each
 * UnitMesh so per-unit rendering needs no per-frame id lookup.
 */
export function Units({ game }: { game: GameState }) {
  const [units, setUnits] = useState<UnitView[]>([]);

  useFrame(() => {
    const current: UnitView[] = [];
    // Under the zone-of-control model (spec 102) the whole board is visible —
    // every unit, both factions, always renders. Territory is shown by the
    // drawn zone border, not by concealing units.
    for (const e of game.world.query(Unit)) {
      const role = e.get(Unit)?.unitType;
      if (!role) continue;
      // M_EXPANSION.A.29 — resolve faction tint at snapshot time so
      // the per-frame inner render doesn't repeat the FactionTrait
      // lookup. SKINS lookup is a 2-row table — effectively constant.
      // M_EXPANSION.F.80 — game.playerColor overrides SKINS.player
      // characterTint when the player picked a palette swap in
      // NewGameModal. Enemy faction always uses its SKINS default.
      // M_EXPANSION.U.113 — colourblind mode (when on) overrides
      // BOTH the SKINS default AND the playerColor pick, returning
      // the cyan/orange dichromacy-safe pair. resolveFactionTint
      // encapsulates that precedence; we still fall back to the
      // SKINS native tint when colourblind is off + no playerColor
      // pick (a one-faction SKIN with characterTint: null reads as
      // 'use the model's native diffuse', which the resolver doesn't
      // express, so we keep the existing null-pass-through path).
      const faction = e.get(FactionTrait)?.faction;
      let tint: string | null = null;
      if (faction === 'player' && game.playerColor) tint = game.playerColor;
      // faction-narrow: SKINS is Record<Faction,Skin>; skip N-player factions (native tint).
      else if (faction && faction in SKINS)
        tint = SKINS[faction as Faction].characterTint ?? null;
      // resolveFactionTint only covers legacy 'player'/'enemy' — skip for N-player factions.
      if (faction && isColorblindMode() && (faction === 'player' || faction === 'enemy'))
        tint = resolveFactionTint(faction, game.playerColor);
      current.push({ id: Number(e), entity: e, role, tint });
    }
    // re-render the unit list only when the membership actually changes
    if (current.length !== units.length || current.some((u, i) => u.id !== units[i]?.id)) {
      setUnits(current);
    }
  });

  return (
    <group name="units">
      {units.map((u) => (
        <UnitMesh key={u.id} entity={u.entity} role={u.role} tint={u.tint} />
      ))}
    </group>
  );
}
