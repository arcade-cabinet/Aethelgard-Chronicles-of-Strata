/**
 * M_V11.CAMPS.WANDER — random-walk behavior for barbarian-camp mobs.
 *
 * Per tick, each WanderBehavior mob has a `pickChance` probability of
 * picking a new random walkable tile within `radius` hexes of its
 * anchor (the camp tile). The pick is queued as a single-step
 * PathQueue; pathFollowSystem lerps Transform toward it on the same
 * step cadence used for player units.
 *
 * Mobs with an active PathQueue (i.e. a destination they haven't
 * reached yet) are skipped — they're already walking somewhere.
 * Mobs that find a target via Stance (combat-target picking) also
 * have a PathQueue set by stanceBehaviorSystem, so this never fights
 * the combat path.
 *
 * RNG: takes a deterministic event-rng so the wander pattern is
 * reproducible per seed. The pickChance gate AND the tile pick both
 * draw from this rng so a save→reload reproduces the same path.
 */
import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { FactionTrait, HexPosition, PathQueue, Unit, WanderBehavior } from '@/ecs/components';

export function wanderSystem(world: World, board: BoardData, eventRng: () => number): void {
  for (const e of world.query(Unit, FactionTrait, HexPosition, WanderBehavior)) {
    const w = e.get(WanderBehavior);
    const hex = e.get(HexPosition);
    if (!w || !hex) continue;
    // Skip if a path is already in progress.
    const pq = e.get(PathQueue);
    if (pq && pq.steps.length > 0) continue;
    // Per-tick pickChance gate.
    if (eventRng() >= w.pickChance) continue;
    // Pick a random walkable tile within radius hexes of the anchor.
    const candidates: Array<{ q: number; r: number; level: number; key: string }> = [];
    // Tighter axial sweep — iterate the anchor's hex disc.
    for (let dq = -w.radius; dq <= w.radius; dq++) {
      for (let dr = -w.radius; dr <= w.radius; dr++) {
        const q = w.anchorQ + dq;
        const r = w.anchorR + dr;
        if (hexDistance(w.anchorQ, w.anchorR, q, r) > w.radius) continue;
        const key = getHexKey(q, r);
        const tile = board.tiles.get(key);
        if (!tile?.walkable) continue;
        // Don't queue a path to the current tile.
        if (tile.q === hex.q && tile.r === hex.r) continue;
        candidates.push({ q: tile.q, r: tile.r, level: tile.level, key });
      }
    }
    if (candidates.length === 0) continue;
    const pick = candidates[Math.floor(eventRng() * candidates.length)];
    if (!pick) continue;
    if (!e.has(PathQueue)) e.add(PathQueue);
    e.set(PathQueue, { steps: [`${pick.key},${pick.level}`] });
  }
}
