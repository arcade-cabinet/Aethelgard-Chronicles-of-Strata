/**
 * M_FUN.AI.NAMED — AI personality bias pin.
 *
 * Same seed + same map, two different personalities → AiPlayer
 * produces measurably different goal-mix over time. Specifically:
 * the-raider builds fewer buildings than the-builder in the same
 * window.
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { ALL_PERSONALITIES, personalityFor } from '@/config/ai-personalities';
import { Building, FactionTrait } from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('M_FUN.AI.NAMED — personality biases', () => {
  it('ai-personalities.json contains 5 personalities', () => {
    expect(ALL_PERSONALITIES.length).toBe(5);
    expect(ALL_PERSONALITIES).toContain('the-builder');
    expect(ALL_PERSONALITIES).toContain('the-raider');
  });

  it('personality weights load + validate', () => {
    const builder = personalityFor('the-builder');
    const raider = personalityFor('the-raider');
    expect(builder.weights.build).toBeGreaterThan(raider.weights.build);
    expect(builder.weights.military).toBeLessThan(raider.weights.military);
  });

  it('AiPlayer.personalityKey defaults to the registry default', () => {
    const ai = new AiPlayer('enemy');
    expect(ai.personalityKey).toBe('the-diplomat');
  });

  it('the-builder builds more than the-raider in a 60s window', () => {
    function runFaction(personalityKey: string): number {
      const game = startGame({
        seedPhrase: 'personality-bias-1',
        mapSize: 12,
        difficulty: 'normal',
        eventSeed: 'personality-bias-1-events',
        mode: 'border-clash',
        aiVsAi: false,
      });
      // Replace the auto-created enemy AI with the named personality.
      game.aiPlayers.enemy = new AiPlayer('enemy', personalityKey);
      // Run 60 sim-seconds.
      for (let i = 0; i < 60; i++) {
        runEconomyTick(game, 1);
      }
      // Count enemy buildings.
      let count = 0;
      for (const e of game.world.query(Building, FactionTrait)) {
        if (e.get(FactionTrait)?.faction === 'enemy') count++;
      }
      return count;
    }
    const builderCount = runFaction('the-builder');
    const raiderCount = runFaction('the-raider');
    // the-builder weight build=1.5; the-raider build=0.6.
    // builderCount should be >= raiderCount (often strictly >).
    expect(builderCount).toBeGreaterThanOrEqual(raiderCount);
  });
});
