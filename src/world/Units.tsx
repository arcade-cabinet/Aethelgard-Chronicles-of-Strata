import { useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import type { Group } from 'three';
import { AnimationState, Health, Transform, Unit, type UnitType } from '@/ecs/components';
import { type ClipName, clipForState } from '@/ecs/systems/animation';
import { AnimatedCharacter } from '@/entities/AnimatedCharacter';
import type { GameState } from '@/game/game-state';
import { HealthBillboard } from './HealthBillboard';

/** A live unit snapshot taken each frame from the ECS. */
interface UnitView {
  /** Entity numeric id — stable React key. */
  id: number;
  /** Unit role. */
  role: UnitType;
}

/** One rendered unit — an animated character that follows its ECS entity. */
function UnitMesh({ game, id, role }: { game: GameState; id: number; role: UnitType }) {
  const ref = useRef<Group>(null);
  const [clip, setClip] = useState<ClipName>('Idle_A');
  const [health, setHealth] = useState({ current: 1, max: 1 });

  useFrame(() => {
    const entity = findEntity(game, id);
    if (!entity) return;
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

/** Locate an ECS entity by numeric id (koota has no direct id->entity lookup). */
function findEntity(
  game: GameState,
  id: number,
): ReturnType<GameState['world']['query']>[number] | undefined {
  for (const e of game.world.query(Unit)) {
    if (Number(e) === id) return e;
  }
  return undefined;
}

/**
 * Renders every unit in the ECS — player peons and footmen, enemy goblins and
 * orcs — as an animated KayKit character with a health billboard. The unit set
 * is re-snapshotted each frame so spawned enemies appear and dead units vanish.
 */
export function Units({ game }: { game: GameState }) {
  const [units, setUnits] = useState<UnitView[]>([]);

  useFrame(() => {
    const current: UnitView[] = [];
    for (const e of game.world.query(Unit)) {
      const role = e.get(Unit)?.unitType;
      if (role) current.push({ id: Number(e), role });
    }
    // only re-render the unit list when the membership actually changes
    if (current.length !== units.length || current.some((u, i) => u.id !== units[i]?.id)) {
      setUnits(current);
    }
  });

  return (
    <group name="units">
      {units.map((u) => (
        <UnitMesh key={u.id} game={game} id={u.id} role={u.role} />
      ))}
    </group>
  );
}
