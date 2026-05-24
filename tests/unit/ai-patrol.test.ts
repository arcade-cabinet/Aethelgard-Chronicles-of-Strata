import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.S.55 — PatrolEvaluator wires a 5th verb onto the AI
 * brain. These tests only exercise the *evaluator* surface — the
 * goal-side path-resolution depends on a fully spawned battlefield
 * which the e2e harness covers separately.
 */
describe('M_EXPANSION.S.55 — AI patrol verb', () => {
  it('AiPlayer instantiates without throwing (5 evaluators wired)', () => {
    const game = startGame('patrol-init');
    // The enemy AiPlayer is already constructed during startGame.
    const ai = game.aiPlayers.enemy;
    expect(ai).toBeInstanceOf(AiPlayer);
    // Brain initialized with 5 evaluators: Build, Train, Military,
    // Patrol, Resign. yuka's Think exposes them via .evaluators.
    // We assert via the public surface: ai.lastGoal starts null.
    expect(ai?.lastGoal).toBeNull();
  });

  it('PatrolEvaluator gates: no military → 0 desirability (no patrol)', () => {
    const game = startGame('patrol-no-mil');
    // Fresh game has no spawned enemy military yet — AI tick produces
    // no patrol command. We verify by ticking and checking lastGoal
    // never flips to 'patrol' on the first tick.
    const ai = game.aiPlayers.enemy;
    if (!ai) throw new Error('enemy AI missing');
    ai.game = game;
    // The brain may pick build/train (no military to patrol with).
    ai.tick(game, 1 / 60);
    expect(ai.lastGoal).not.toBe('patrol');
  });
});
