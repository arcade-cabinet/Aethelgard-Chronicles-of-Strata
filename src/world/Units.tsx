import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { Suspense, useRef, useState } from 'react';
import type { Group } from 'three';
import { getHexKey } from '@/core/hex';
import {
  AnimationState,
  FactionTrait,
  Health,
  HexPosition,
  Transform,
  Unit,
  type UnitType,
} from '@/ecs/components';
import { type ClipName, clipForState } from '@/ecs/systems/animation';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';
import { tileVisibility } from '@/game/fog';
import type { GameState } from '@/game/game-state';
import { HealthBillboard } from './HealthBillboard';

/** A live unit snapshot taken when the roster changes. */
interface UnitView {
  /** Entity numeric id — stable React key. */
  id: number;
  /** The ECS entity reference. */
  entity: Entity;
  /** Unit role. */
  role: UnitType;
}

/** One rendered unit — an animated character that follows its ECS entity. */
function UnitMesh({ entity, role }: { entity: Entity; role: UnitType }) {
  const ref = useRef<Group>(null);
  const [clip, setClip] = useState<ClipName>('Idle_A');
  const [health, setHealth] = useState({ current: 1, max: 1 });

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
  });

  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <AnimatedCharacter role={role} clip={clip} />
      </Suspense>
      <HealthBillboard current={health.current} max={health.max} />
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
    for (const e of game.world.query(Unit)) {
      const role = e.get(Unit)?.unitType;
      if (!role) continue;
      // fog of war — an enemy unit renders only on a tile the player can
      // currently see. Player units always render. See docs/specs/100.
      if (e.get(FactionTrait)?.faction === 'enemy') {
        const hex = e.get(HexPosition);
        if (hex && tileVisibility(game.fog.player, getHexKey(hex.q, hex.r)) !== 'visible') {
          continue;
        }
      }
      current.push({ id: Number(e), entity: e, role });
    }
    // re-render the unit list only when the membership actually changes
    if (current.length !== units.length || current.some((u, i) => u.id !== units[i]?.id)) {
      setUnits(current);
    }
  });

  return (
    <group name="units">
      {units.map((u) => (
        <UnitMesh key={u.id} entity={u.entity} role={u.role} />
      ))}
    </group>
  );
}
