/**
 * M_V11.STACK auto-form / dissolve helpers.
 *
 * Extracted from src/game/economy-tick-phases.ts to keep that file
 * under the 600-line code-quality threshold (CodeRabbit PR #89).
 * Owns the three sweeps that fire per tick inside tickTerrainPhase:
 *
 *   - autoFormWorkCrews — player peons on the same harvest tile
 *     auto-stack into a 'work-crew' formation.
 *   - dissolveStaleWorkCrews — a 'work-crew' stack whose members
 *     have transitioned out of HARVESTING dissolves so the form
 *     cycle re-fires fresh on the next convergence.
 *   - autoFormMobRabble — barbarian-camp-N mobs on the same tile
 *     auto-stack into a 'rabble' formation (cap 6).
 */
import type { Entity } from 'koota';
import { AssignedJob, FactionTrait, HexPosition, Stack, StackMember, Unit } from '@/ecs/components';
import type { GameState } from './game-state';
import { createStack, dissolveStack } from './stacking';

/**
 * M_V11.STACK.WORK-CREW — auto-form Work Crew stacks for player
 * peons that converged on the same harvest tile. Per
 * docs/specs/201-stacking-and-formations.md: "auto-formed when
 * 2+ same-faction peons end a tick on the same harvest tile."
 *
 * Sweep:
 *   1. Bucket player peons that are NOT already in a stack by
 *      hex tile + HARVESTING state (the auto-form trigger).
 *   2. Any bucket with >=2 peons → createStack. The stack's
 *      defaultFormationFor selects 'work-crew' for peon-only
 *      compositions; the harvest-rate buff is applied
 *      separately (M_V11.STACK.WORK-CREW.BUFF in harvest.ts).
 *
 * Cheap: O(peons + tiles_with_peons). Runs once per tick in the
 * turn-gated portion of tickTerrainPhase.
 */
export function autoFormWorkCrews(game: GameState): void {
  const buckets = new Map<string, Entity[]>();
  for (const e of game.world.query(Unit, FactionTrait, HexPosition, AssignedJob)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    if (e.has(StackMember)) continue;
    if (e.get(AssignedJob)?.state !== 'HARVESTING') continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const key = `${hex.q},${hex.r}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(e);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    // createStack REJECTS (not truncates) when members.length >
    // MAX_STACK_SIZE — pre-slice to the cap so a tile with 10
    // converging peons still forms a stack of the first 8.
    createStack(game, bucket.slice(0, 8));
  }
}

/**
 * M_V11.STACK.WORK-CREW dissolve sweep — gemini-code-assist review
 * on PR #89: a work-crew stack formed when N peons converged on a
 * harvest tile in HARVESTING state will persist forever as those
 * peons transition out (back to deposit, idle, build, etc.) — the
 * stack-coupled stragglers logic would keep them pinned to the
 * stack tile or the badge would render over a now-scattered group.
 *
 * Fix: each tick, walk every Stack whose formationId === 'work-crew'.
 * If ANY member is no longer HARVESTING, dissolve the stack so
 * members revert to individuals and re-form fresh when they
 * converge again. Cheap O(work-crew-stacks).
 */
export function dissolveStaleWorkCrews(game: GameState): void {
  // CodeRabbit (PR #89): pre-index member-id → AssignedJob.state once
  // per sweep so the per-member check is O(1) instead of running a
  // full world.query for each member of each work-crew.
  const memberJobState = new Map<number, string | undefined>();
  for (const m of game.world.query(StackMember, AssignedJob)) {
    memberJobState.set(m.id(), m.get(AssignedJob)?.state);
  }

  const toDissolve: Entity[] = [];
  for (const stackEntity of game.world.query(Stack)) {
    const stack = stackEntity.get(Stack);
    if (!stack || stack.formationId !== 'work-crew') continue;
    let stillHarvesting = true;
    for (const memberId of stack.members) {
      const state = memberJobState.get(memberId);
      if (state === undefined || state !== 'HARVESTING') {
        stillHarvesting = false;
        break;
      }
    }
    if (!stillHarvesting) toDissolve.push(stackEntity);
  }
  for (const stackEntity of toDissolve) {
    dissolveStack(game, stackEntity);
  }
}

/** Set membership check for barbarian unit roles (vs player roles). */
const BARBARIAN_ROLES = new Set<string>(['Goblin', 'Orc', 'Vampire', 'BlackKnight', 'Witch']);

/**
 * M_V11.STACK.MOB-RABBLE — auto-form Rabble stacks for barbarian-
 * faction mobs that converged on a tile. Per spec: "Mob auto-stack
 * into Rabble on tile convergence (max 6 mobs per stack)".
 *
 * Sweep:
 *   1. Bucket non-stacked mobs from barbarian factions by tile.
 *      Discriminator: FactionTrait.faction begins with
 *      'barbarian-camp-' (the v0.5 N-player convention).
 *   2. Any bucket with >=2 mobs → createStack(slice(0, 6)). The
 *      stack's defaultFormationFor picks 'rabble' for mixed-mob
 *      compositions; barbarian Rabble is the default formation.
 *
 * Cheap: O(mobs + tiles_with_mobs). Runs alongside autoFormWorkCrews
 * inside tickTerrainPhase.
 */
export function autoFormMobRabble(game: GameState): void {
  const buckets = new Map<string, Entity[]>();
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const fac = e.get(FactionTrait)?.faction;
    // Barbarian camps use the 'barbarian-camp-N' faction-id pattern
    // (see barbarian-camps.ts:142). The Unit type may be any of the
    // BARBARIAN pool, but tile-based clustering treats them uniformly.
    if (!fac?.startsWith('barbarian-camp-')) continue;
    const role = e.get(Unit)?.unitType;
    if (!role || !BARBARIAN_ROLES.has(role)) continue;
    if (e.has(StackMember)) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    // Bucket by tile AND faction-id — two camps' mobs on the same
    // tile shouldn't merge (different factions can't share a stack).
    const key = `${fac}|${hex.q},${hex.r}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(e);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    // Spec caps mob stacks at 6 (vs 8 for work crews).
    createStack(game, bucket.slice(0, 6));
  }
}
