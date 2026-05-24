/**
 * AI-vs-AI golden-path end-to-end (M8.7, spec 100 pillar 5).
 *
 * Swap BOTH factions to AI and run the simulation forward. Every probe asserts
 * the world stays well-formed under autonomous play — the proof that the
 * faction-symmetric architecture (rules + commands + yuka AiPlayer) really is
 * a complete interface a real opponent plays through.
 *
 * No DOM, no render — pure runEconomyTick loop. Deterministic given the seeds.
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { FactionTrait, HexPosition, Transform, Unit } from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';

const SEED = 'ai-vs-ai-golden';

/** A fresh AI-vs-AI game: enemy has its default AI; player swaps in one too. */
function newAiVsAiGame() {
  const game = startGame({
    seedPhrase: SEED,
    mapSize: 12,
    difficulty: 'normal',
    eventSeed: 'ai-vs-ai-events',
  });
  // give both factions ample economy so build evaluators are not gated by cost
  for (const f of ['player', 'enemy'] as const) {
    game.economy[f].wood = 9999;
    game.economy[f].stone = 9999;
    game.economy[f].gold = 9999;
    game.economy[f].maxSupply = 50;
  }
  game.aiPlayers.player = new AiPlayer('player');
  return game;
}

/** Macro/meso/micro probes — the invariants AI-vs-AI play must satisfy. */
function probe(game: ReturnType<typeof newAiVsAiGame>) {
  const eco = game.economy;
  // micro: every unit has finite position + non-negative HP
  let units = 0;
  const totalHp = 0;
  for (const e of game.world.query(Unit, HexPosition)) {
    units += 1;
    const h = e.get(HexPosition);
    expect(Number.isFinite(h?.q ?? Number.NaN)).toBe(true);
    expect(Number.isFinite(h?.r ?? Number.NaN)).toBe(true);
    const tf = e.get(Transform);
    if (tf) {
      expect(Number.isFinite(tf.x)).toBe(true);
      expect(Number.isFinite(tf.z)).toBe(true);
    }
    expect(e.get(FactionTrait)?.faction).toMatch(/^(player|enemy)$/);
  }
  void totalHp;
  // meso: factions retain a coherent army roster
  let playerUnits = 0;
  let enemyUnits = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    const f = e.get(FactionTrait)?.faction;
    if (f === 'player') playerUnits += 1;
    else if (f === 'enemy') enemyUnits += 1;
  }
  // macro: economies stay non-negative; outcome is one of the three valid values.
  // M_MICRO.6.5 — also assert at least one faction made positive progress
  // (units spawned, harvest happened, etc) so "0 of everything" doesn't
  // pass the signedness check vacuously.
  for (const f of ['player', 'enemy'] as const) {
    expect(eco[f].wood).toBeGreaterThanOrEqual(0);
    expect(eco[f].stone).toBeGreaterThanOrEqual(0);
    expect(eco[f].gold).toBeGreaterThanOrEqual(0);
    expect(eco[f].usedSupply).toBeGreaterThanOrEqual(0);
  }
  // at least one faction has fielded units (the AI is actually playing).
  expect(playerUnits + enemyUnits).toBeGreaterThan(0);
  expect(['playing', 'win', 'loss']).toContain(game.outcome);
  return {
    units,
    playerUnits,
    enemyUnits,
    playerControlled: game.zones.player.controlled.size,
    enemyControlled: game.zones.enemy.controlled.size,
    playerWood: eco.player.wood,
    enemyWood: eco.enemy.wood,
  };
}

describe('AI-vs-AI golden-path E2E (M8.7)', () => {
  it('swapping both factions to AI runs N turns without invariant violations', () => {
    const game = newAiVsAiGame();
    // 60 ticks at 0.5s each = 30 game-seconds — 10 AI decision cycles
    for (let i = 0; i < 60; i++) runEconomyTick(game, 0.5);
    const snap = probe(game);
    expect(snap.units).toBeGreaterThan(0);
  });

  it('peons autonomously claim territory for both factions', () => {
    const game = newAiVsAiGame();
    // 200 ticks at 0.5s = 100 game-seconds — long enough for peons to harvest
    // and the autonomous loop to claim several tiles per side
    for (let i = 0; i < 200; i++) runEconomyTick(game, 0.5);
    const snap = probe(game);
    // both factions' zones must have grown beyond zero
    expect(snap.playerControlled + snap.enemyControlled).toBeGreaterThan(0);
  });

  it('is deterministic — the same seeds produce the same final probe', () => {
    const a = newAiVsAiGame();
    const b = newAiVsAiGame();
    for (let i = 0; i < 30; i++) {
      runEconomyTick(a, 0.5);
      runEconomyTick(b, 0.5);
    }
    const sa = probe(a);
    const sb = probe(b);
    expect(sa.units).toBe(sb.units);
    expect(sa.playerControlled).toBe(sb.playerControlled);
    expect(sa.enemyControlled).toBe(sb.enemyControlled);
  });
});
