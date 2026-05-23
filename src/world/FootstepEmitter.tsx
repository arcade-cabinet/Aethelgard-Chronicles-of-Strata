import { useFrame } from '@react-three/fiber';
import { unpackEntity } from 'koota';
import { useRef } from 'react';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { HexPosition, Movement, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Seconds between footstep emissions for any single unit. */
const STEP_PERIOD = 0.34;
/** Hard cap on footstep emissions per frame so a stampede doesn't spam. */
const PER_FRAME_CAP = 3;

/**
 * Footstep audio emitter (M_AUDIO.5). Per frame, walks moving units;
 * fires a per-surface footstep cue at STEP_PERIOD intervals per unit.
 * Per-unit accumulators live in a Map keyed by entityId so save/load and
 * unit destruction self-clean. PER_FRAME_CAP prevents stampedes from
 * flooding the audio bus.
 *
 * Surface detection: mountain/highland → stone, everything else → grass.
 * A future sand biome would add a row and one extra cue.
 */
export function FootstepEmitter({ game }: { game: GameState }) {
  const accRef = useRef<Map<number, number>>(new Map());

  useFrame((_, delta) => {
    const acc = accRef.current;
    let emitted = 0;
    const live = new Set<number>();
    for (const e of game.world.query(Unit, Movement, HexPosition)) {
      const id = unpackEntity(e).entityId;
      live.add(id);
      const m = e.get(Movement);
      if (!m?.isMoving) {
        acc.delete(id);
        continue;
      }
      const next = (acc.get(id) ?? STEP_PERIOD) + delta;
      if (next < STEP_PERIOD) {
        acc.set(id, next);
        continue;
      }
      acc.set(id, 0);
      if (emitted >= PER_FRAME_CAP) continue;
      const hex = e.get(HexPosition);
      if (!hex) continue;
      const tile = game.board.tiles.get(`${hex.q},${hex.r}`);
      const onStone = tile && (tile.type === 'MOUNTAIN' || tile.type === 'HIGHLAND');
      emitUiSound(onStone ? 'footstep-stone' : 'footstep-grass');
      emitted += 1;
    }
    // GC dead-entity accumulators
    for (const id of acc.keys()) if (!live.has(id)) acc.delete(id);
  });

  return null;
}
