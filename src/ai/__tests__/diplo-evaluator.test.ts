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
import { AiPlayer } from '@/ai/ai-player';
import { DiplomaticEvaluator } from '@/ai/evaluators/diplomatic';
import { buildDefaultFactions } from '@/config/ai';
import { setRelation } from '@/game/diplomacy';
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

    // M_V11.EVENTS.RTS-TRIGGERED — tribute now requires prior contact
    // (lore: you can't demand tribute from a kingdom you haven't met).
    // Seed an 'ally' relation row to model "they've at least met"; the
    // tribute logic separately gates on dominance + has-contact + the
    // ally/neutral-rel pre-check in the evaluator (which still permits
    // ally as a tribute target).
    setRelation(game.diplomacy, 'player', 'enemy', 'ally', 0, null);

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

  it('ProposePact fires for N-player faction pair (ai-3 vs ai-4)', () => {
    // M_V8.REVIEWER.FULL-CYCLE (H-2) — verify DiplomaticEvaluator correctly
    // indexes game.zones by string for faction ids beyond 'player'/'enemy'.
    // Before the H-2 fix: game.zones[fc.id as 'player'|'enemy'] silently
    // returned undefined for 'ai-3' and 'ai-4', making ProposePact a no-op.
    const game = startGame({
      seedPhrase: 'diplo-eval-n-player',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'diplo-eval-n-player-ev',
      factions: buildDefaultFactions(4, ['#f00', '#0f0', '#00f', '#ff0']),
    });

    // Overwrite the N-player faction zones with adjacent tiles so borders touch.
    // startGame (H-2 fix) seeds all factions in game.zones; here we replace
    // ai-3 and ai-4's empty zones with ones that share axial neighbours.
    const zones = game.zones as Record<string, ZoneState>;
    zones['ai-3'] = makeZone(['0,0', '0,1']);
    zones['ai-4'] = makeZone(['1,0', '1,1']);

    // Create AI player for ai-3 faction (cast: AiPlayer stores Faction internally,
    // but game logic treats it as string via `owner.faction as string`).
    const ai = new AiPlayer('ai-3' as 'enemy');
    ai.game = game;

    const evaluator = new DiplomaticEvaluator(1.0);
    const desire = evaluator.calculateDesirability(ai);
    // Borders touch → ProposePact should be available → desirability > 0.
    expect(desire).toBeGreaterThan(0);
  });
});
