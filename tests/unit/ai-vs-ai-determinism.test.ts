/**
 * AI-vs-AI determinism smoke test (M_QUALITY.3).
 *
 * Same seed + same delta sequence → byte-identical fingerprint. Pins the
 * determinism contract the comprehensive-review HIGH-3 called out. If a
 * future refactor breaks the contract (a stray Math.random, a Date.now leak,
 * a Set-ordering regression), this test fires red with a fingerprint diff.
 *
 * The fingerprint covers the outcome + clock + per-faction economy totals +
 * the FactionBase HP for each side after N ticks. Cheap to compute, sensitive
 * to most determinism breaks.
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { FactionBase, Health } from '@/ecs/components';
import { type GameState, runEconomyTick, startGame } from '@/game/game-state';

const SEED = 'determinism-smoke-seed-1';
const EVENT_SEED = 'determinism-smoke-events';
const TICKS = 900; // 15 game-seconds at 60 Hz
const DELTA = 1 / 60;

function newAiVsAiGame(): GameState {
  const game = startGame({
    seedPhrase: SEED,
    mapSize: 12,
    difficulty: 'normal',
    eventSeed: EVENT_SEED,
  });
  for (const f of ['player', 'enemy'] as const) {
    game.economy[f].wood = 1000;
    game.economy[f].stone = 1000;
    game.economy[f].gold = 1000;
    game.aiPlayers[f] = new AiPlayer(f);
  }
  return game;
}

function fingerprint(game: GameState): string {
  let playerBaseHp = 0;
  let enemyBaseHp = 0;
  for (const e of game.world.query(FactionBase, Health)) {
    const f = e.get(FactionBase)?.faction;
    const hp = e.get(Health)?.current ?? 0;
    if (f === 'player') playerBaseHp = hp;
    else if (f === 'enemy') enemyBaseHp = hp;
  }
  return [
    game.outcome,
    Math.round(game.clock.elapsed * 100),
    game.economy.player.wood,
    game.economy.player.stone,
    game.economy.player.gold,
    game.economy.enemy.wood,
    game.economy.enemy.stone,
    game.economy.enemy.gold,
    playerBaseHp,
    enemyBaseHp,
  ].join('|');
}

describe('AI-vs-AI determinism smoke (M_QUALITY.3)', () => {
  it('same seed → byte-identical fingerprint after N ticks', () => {
    const a = newAiVsAiGame();
    const b = newAiVsAiGame();
    for (let i = 0; i < TICKS; i++) {
      runEconomyTick(a, DELTA);
      runEconomyTick(b, DELTA);
    }
    const fpA = fingerprint(a);
    const fpB = fingerprint(b);
    expect(fpA).toBe(fpB);
  });

  it('determinism holds at Huge map size (M_BALANCE_2.2)', () => {
    // user's +20%-bumped Huge tier; ensure the larger board doesn't introduce
    // an order-of-iteration determinism break.
    const make = () => {
      const g = startGame({
        seedPhrase: 'huge-determinism',
        mapSize: 43,
        difficulty: 'normal',
        eventSeed: 'huge-events',
      });
      for (const f of ['player', 'enemy'] as const) {
        g.economy[f].wood = 1000;
        g.economy[f].stone = 1000;
        g.economy[f].gold = 1000;
        g.aiPlayers[f] = new AiPlayer(f);
      }
      return g;
    };
    const a = make();
    const b = make();
    for (let i = 0; i < TICKS; i++) {
      runEconomyTick(a, DELTA);
      runEconomyTick(b, DELTA);
    }
    expect(fingerprint(a)).toBe(fingerprint(b));
  }, 30000);

  it('different seed → different fingerprint (sanity: determinism isnt just trivial constancy)', () => {
    const a = newAiVsAiGame();
    const b = startGame({
      seedPhrase: 'different-seed-entirely',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'different-events',
    });
    for (const f of ['player', 'enemy'] as const) {
      b.economy[f].wood = 1000;
      b.economy[f].stone = 1000;
      b.economy[f].gold = 1000;
      b.aiPlayers[f] = new AiPlayer(f);
    }
    for (let i = 0; i < TICKS; i++) {
      runEconomyTick(a, DELTA);
      runEconomyTick(b, DELTA);
    }
    // The two seeds produce different boards + different combat dice; some
    // axis of the fingerprint MUST differ. A perfect match would mean the
    // sim is ignoring its seed somewhere.
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});
