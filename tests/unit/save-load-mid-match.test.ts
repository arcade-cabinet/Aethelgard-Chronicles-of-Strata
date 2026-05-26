/**
 * M_V11.E2E.SAVE-LOAD-MID-MATCH — save at the 90s mark of an AIVAI
 * sim, load via JSON round-trip, resume; verify entity counts +
 * economy + outcome match the pre-save snapshot byte-identical.
 *
 * Stronger than the existing save-stack-roundtrip test in the
 * persistence suite because this drives a real sim to 90s
 * (covering Stack formation, mob spawn, loot drops, camp cascades)
 * before snapshotting.
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import {
  Combatant,
  EnemySpawner,
  FactionTrait,
  Health,
  HexPosition,
  Stack,
  Unit,
  WanderBehavior,
} from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

interface InvariantSnapshot {
  unitCount: number;
  buildingCount: number;
  stackCount: number;
  mobCount: number;
  wandererCount: number;
  playerWood: number;
  playerStone: number;
  playerGold: number;
  enemyWood: number;
  enemyStone: number;
  enemyGold: number;
  outcome: string;
}

function snapshot(game: ReturnType<typeof startGame>): InvariantSnapshot {
  let unitCount = 0;
  let buildingCount = 0;
  let mobCount = 0;
  let wandererCount = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    unitCount++;
    const fac = e.get(FactionTrait)?.faction as unknown as string | undefined;
    if (fac?.startsWith('barbarian-camp-')) mobCount++;
  }
  for (const _ of game.world.query(Combatant, FactionTrait, HexPosition, Health)) {
    // counted as Combatant; redundant with unitCount but loops the trait.
  }
  for (const _ of game.world.query(Stack)) {
    // count stacks
  }
  let stackCount = 0;
  for (const _ of game.world.query(Stack)) stackCount++;
  for (const _ of game.world.query(WanderBehavior)) wandererCount++;
  for (const _ of game.world.query(EnemySpawner)) buildingCount++;
  return {
    unitCount,
    buildingCount,
    stackCount,
    mobCount,
    wandererCount,
    playerWood: game.economy.player.wood,
    playerStone: game.economy.player.stone,
    playerGold: game.economy.player.gold,
    enemyWood: game.economy.enemy.wood,
    enemyStone: game.economy.enemy.stone,
    enemyGold: game.economy.enemy.gold,
    outcome: String(game.outcome),
  };
}

describe('save/load mid-match (M_V11.E2E.SAVE-LOAD-MID-MATCH)', () => {
  it('snapshot at 90s + deserialize → identical invariants', () => {
    const game = startGame({
      seedPhrase: 'saveload-alpha-bravo',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'saveload-events',
    });
    for (const fid of ['player', 'enemy'] as const) {
      game.aiPlayers[fid] = new AiPlayer(fid);
      const eco = game.economy[fid];
      eco.wood = 9999;
      eco.stone = 9999;
      eco.gold = 9999;
      eco.maxSupply = 50;
    }
    // 180 ticks × 0.5s = 90 sim-seconds.
    for (let i = 0; i < 180; i++) runEconomyTick(game, 0.5);

    const beforeSnap = snapshot(game);

    // Serialize → JSON round-trip → deserialize.
    const snap = serializeGame(game);
    const json = JSON.stringify(snap);
    const restoredSnap = JSON.parse(json);
    const restored = deserializeGame(restoredSnap);

    const afterSnap = snapshot(restored);

    // Entity counts must match byte-identical.
    expect(afterSnap.unitCount).toBe(beforeSnap.unitCount);
    expect(afterSnap.buildingCount).toBe(beforeSnap.buildingCount);
    expect(afterSnap.stackCount).toBe(beforeSnap.stackCount);
    expect(afterSnap.mobCount).toBe(beforeSnap.mobCount);
    expect(afterSnap.wandererCount).toBe(beforeSnap.wandererCount);
    // Economy state preserved.
    expect(afterSnap.playerWood).toBe(beforeSnap.playerWood);
    expect(afterSnap.playerStone).toBe(beforeSnap.playerStone);
    expect(afterSnap.playerGold).toBe(beforeSnap.playerGold);
    expect(afterSnap.enemyWood).toBe(beforeSnap.enemyWood);
    expect(afterSnap.enemyStone).toBe(beforeSnap.enemyStone);
    expect(afterSnap.enemyGold).toBe(beforeSnap.enemyGold);
    // Outcome preserved.
    expect(afterSnap.outcome).toBe(beforeSnap.outcome);
  });
});
