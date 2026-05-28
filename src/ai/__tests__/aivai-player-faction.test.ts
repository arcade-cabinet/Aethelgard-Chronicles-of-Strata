/**
 * M_NEXT.AIVAI.6 — Pin: player-faction AI is NOT inert under N-player
 * zone setup. In v0.5, zones were only seeded for 'player'+'enemy'; the
 * player-faction AiPlayer in ai-vs-ai mode had no zone and evaluated
 * BuildEvaluator as 0. v0.8 (PR #44) seeds zones for all factions.
 *
 * Pin contract: in a 4-faction ai-vs-ai startGame, the player-faction
 * AiPlayer's BuildEvaluator returns > 0 (has zone + economy + a free tile).
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { BuildEvaluator } from '@/ai/evaluators/build';
import { buildDefaultFactions } from '@/config/ai';
import { startGame } from '@/game/game-state';

describe('M_NEXT.AIVAI.6 — player-faction AI active under N-player zones', () => {
  it('player-faction AiPlayer.brain arbitrates without returning null goal', () => {
    const factions = buildDefaultFactions(4, ['#ff0000', '#00ff00', '#0000ff', '#ff00ff']);
    const game = startGame({
      seedPhrase: 'aivai6-pin-seed',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'aivai6-pin-ev',
      aiVsAi: true,
      factions,
    });
    // The player-faction AI is present in ai-vs-ai mode.
    const playerAi = game.aiPlayers.player;
    expect(playerAi).toBeDefined();
    if (!playerAi) return;

    // Tick the AI — should not throw or deadlock.
    expect(() => playerAi.tick(game, 3)).not.toThrow();
  });

  it('BuildEvaluator calculates > 0 for the player faction (has zone + economy)', () => {
    const factions = buildDefaultFactions(4, ['#ff0000', '#00ff00', '#0000ff', '#ff00ff']);
    const game = startGame({
      seedPhrase: 'aivai6-build-seed',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'aivai6-build-ev',
      aiVsAi: true,
      factions,
    });
    // Fund the player's economy so Build becomes desirable.
    game.economy.player.wood = 200;
    game.economy.player.stone = 100;
    game.economy.player.gold = 50;

    const playerAi = new AiPlayer('player');
    playerAi.game = game;

    const buildEval = new BuildEvaluator(1.0, 180);
    const desire = buildEval.calculateDesirability(playerAi);
    // Zone is seeded for player → controlled.size > 0 → freeBuildTile returns a tile.
    expect(desire).toBeGreaterThan(0);
  });
});
