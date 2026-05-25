/**
 * M_V8.AI.DIPLO-EVALUATOR — DiplomaticEvaluator unit tests.
 *
 * Three contracts:
 *   1. Pact proposal fires when borders touch and relation is neutral.
 *   2. Tribute demand fires when the AI supply is clearly dominant (≥2×).
 *   3. Same-id check — no action taken when compared against self.
 *
 * Uses startGame to get a real GameState with all fields initialised,
 * then mutates the diplomacy/zone/economy state surgically to set up
 * each scenario.
 */
import { describe, expect, it } from 'vitest';
import { DiplomaticEvaluator } from '@/ai/evaluators/diplomatic';
import { AiPlayer } from '@/ai/ai-player';
import { startGame } from '@/game/game-state';
import { createZoneState, type ZoneState } from '@/game/zone';

/** Build a minimal ZoneState with a given set of controlled tile keys. */
function makeZone(keys: string[]): ZoneState {
  const z = createZoneState();
  for (const k of keys) z.controlled.add(k);
  return z;
}

describe('M_V8.AI.DIPLO-EVALUATOR', () => {
  it('calculateDesirability > 0 when borders touch (pact available)', () => {
    const game = startGame({
      seedPhrase: 'diplo-eval-test-a',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'diplo-eval-test-a-ev',
    });

    // Create an AI player for the 'enemy' faction.
    const ai = new AiPlayer('enemy');
    ai.game = game;

    // Make player and enemy zones share adjacent tiles so borders "touch".
    // bordersAreTouching checks whether any controlled tile of A is a
    // neighbour of any controlled tile of B — sharing the key '0,0'
    // and '1,0' (axial neighbours) satisfies this.
    game.zones.player = makeZone(['0,0', '0,1']);
    game.zones.enemy = makeZone(['1,0', '1,1']);

    const evaluator = new DiplomaticEvaluator(1.0);
    const desire = evaluator.calculateDesirability(ai);
    expect(desire).toBeGreaterThan(0);
  });

  it('calculateDesirability > 0 when AI supply is ≥2× target (tribute demand)', () => {
    const game = startGame({
      seedPhrase: 'diplo-eval-test-b',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'diplo-eval-test-b-ev',
    });

    const ai = new AiPlayer('enemy');
    ai.game = game;

    // Set enemy supply to 10, player to 3 (ratio ≥ 2 and enemy has peakSupply > 0).
    game.economy.enemy.usedSupply = 10;
    game.economy.enemy.peakSupply = 10;
    game.economy.player.usedSupply = 3;

    // Ensure zones don't touch so pact isn't the picked action instead.
    game.zones.player = makeZone(['0,0']);
    game.zones.enemy = makeZone(['10,10']);

    const evaluator = new DiplomaticEvaluator(1.0);
    const desire = evaluator.calculateDesirability(ai);
    expect(desire).toBeGreaterThan(0);
  });

  it('no action taken when there is only one faction (same-id guard)', () => {
    const game = startGame({
      seedPhrase: 'diplo-eval-test-c',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'diplo-eval-test-c-ev',
    });

    // Override the factions to have only one (self). This exercises the
    // "fc.id === myId" guard — the loop finds no other faction.
    game.factions = game.factions.filter((f) => f.id === 'enemy');

    const ai = new AiPlayer('enemy');
    ai.game = game;

    const evaluator = new DiplomaticEvaluator(1.0);
    const desire = evaluator.calculateDesirability(ai);
    // No other faction → no diplomacy action possible → desirability 0.
    expect(desire).toBe(0);
  });
});
