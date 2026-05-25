import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import type { BoardData } from '@/core/board';
import { hexNeighbors } from '@/core/hex';
import { EnemySpawner, FactionTrait, HexPosition, type UnitType } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import type { Difficulty } from '@/game/difficulty';

/**
 * Declarative enemy-escalation schedule (M_REGISTRY.15) — replaces the
 * 4-tier if-cascade in pickEnemyRole. Each tier names its unlock
 * threshold (game-seconds) and the weighted roster the wave cycles
 * through. The cycle length = roster.length; spawnCount % length picks
 * the slot. The roster's last-unlocked enemy is **duplicated** so it
 * gets ~2x weight (the most recent threat dominates the wave).
 *
 * Ordering matters: tiers ranked by `unlockAt` DESCENDING so the first
 * match wins. Adding a new threshold is one row insert — no new
 * if-branch in pickEnemyRole.
 */
interface EscalationTier {
  /** Game-seconds at which this tier unlocks. 0 = baseline. */
  unlockAt: number;
  /** Weighted roster; tier's newest enemy is duplicated for 2x weight. */
  roster: readonly UnitType[];
}

const ESCALATION_SCHEDULE: readonly EscalationTier[] = (() => {
  // Bind config.json thresholds to tier rows. Last roster entry is the
  // "newest" enemy duplicated for 2x cycle weight.
  return [
    {
      unlockAt: COMBAT.spawn.blackKnightThreshold,
      roster: ['Goblin', 'Vampire', 'Orc', 'Witch', 'BlackKnight', 'BlackKnight'],
    },
    {
      unlockAt: COMBAT.spawn.witchThreshold,
      roster: ['Goblin', 'Vampire', 'Orc', 'Witch', 'Witch'],
    },
    {
      unlockAt: COMBAT.spawn.orcThreshold,
      roster: ['Goblin', 'Vampire', 'Orc', 'Orc'],
    },
    {
      unlockAt: COMBAT.spawn.vampireThreshold,
      roster: ['Goblin', 'Vampire', 'Vampire'],
    },
    {
      unlockAt: 0,
      roster: ['Goblin'],
    },
  ];
})();

/**
 * Pick the enemy role for a spawn event. Uses `spawnCount` (deterministic,
 * ECS-persisted) as the selection index — no Math.random(), no external PRNG.
 *
 * M_REGISTRY.15 — the old 4-tier if-cascade became a single lookup over
 * ESCALATION_SCHEDULE: first tier whose `unlockAt <= gameElapsed` wins,
 * then `spawnCount % roster.length` indexes into the weighted roster.
 *
 * M_QUALITY.2 — late-game share rebalanced (CR MED-10): Goblin's share
 * strictly DECREASES as tougher enemies unlock; each tier's newest
 * threat is duplicated in the roster for 2x cycle weight.
 */
export function pickEnemyRole(spawnCount: number, gameElapsed: number): UnitType {
  for (const tier of ESCALATION_SCHEDULE) {
    if (gameElapsed >= tier.unlockAt) {
      const idx = spawnCount % tier.roster.length;
      // tier.roster.length > 0 by construction; idx is a valid index.
      return tier.roster[idx] as UnitType;
    }
  }
  // Unreachable — the unlockAt=0 baseline tier always matches.
  return 'Goblin';
}

/**
 * Advance the enemy base's spawn timer. Each `spawnInterval` seconds the base
 * spawns an enemy on a walkable neighbour tile. The roster escalates with
 * game-elapsed: Goblins first, then Vampires, Orcs, Witches, Black Knights. The
 * spawn count lives on the `EnemySpawner` entity so the escalation cadence
 * survives a save/load round-trip.
 *
 * `difficulty` is optional (defaults to 'normal') so existing 4-arg test
 * call-sites keep working.
 */
export function spawnSystem(
  world: World,
  board: BoardData,
  delta: number,
  gameElapsed: number,
  difficulty: Difficulty = 'normal',
): void {
  // M_PIVOT.BARBARIAN-CAMPS — iterate spawner entities; if the spawner
  // also carries FactionTrait, the spawned units inherit that camp's
  // faction id (a `barbarian-camp-1` spawner produces `barbarian-camp-1`-
  // tagged units). The legacy enemy base entity carries FactionTrait
  // 'enemy' so its spawned units stay 'enemy'-tagged. Tests that spawn
  // a bare EnemySpawner + HexPosition (no FactionTrait) get the legacy
  // `stats.faction` default (typically 'enemy' for Goblin/Orc/etc).
  world.query(EnemySpawner, HexPosition).updateEach(([spawner, hex], entity) => {
    spawner.spawnTimer += delta;
    if (spawner.spawnTimer < spawner.spawnInterval) return;
    spawner.spawnTimer = 0;
    spawner.spawnCount += 1;
    const role = pickEnemyRole(spawner.spawnCount, gameElapsed);
    const factionOverride = entity.get(FactionTrait)?.faction;
    const spawnArgs = factionOverride !== undefined ? { factionOverride } : {};
    for (const nKey of hexNeighbors(hex.q, hex.r)) {
      const tile = board.tiles.get(nKey);
      if (tile?.walkable) {
        createCharacter({
          world,
          role,
          q: tile.q,
          r: tile.r,
          level: tile.level,
          difficulty,
          ...spawnArgs,
        });
        return;
      }
    }
    // fallback: spawn on the base tile itself when no walkable neighbour exists
    createCharacter({
      world,
      role,
      q: hex.q,
      r: hex.r,
      level: hex.level,
      difficulty,
      ...spawnArgs,
    });
  });
}
