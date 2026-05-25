/**
 * M_V6.4X-FULL — 4X named-victory detection pins.
 */
import { describe, expect, it } from 'vitest';
import { acceptTribute } from '@/game/diplomacy-tribute';
import { setRelation } from '@/game/diplomacy';
import { startGame } from '@/game/game-state';
import {
  detectVictory,
  detectVictoryFor,
  VICTORY_THRESHOLDS,
  type VictoryRecord,
} from '@/game/victory-conditions';

function fresh(): ReturnType<typeof startGame> {
  return startGame({
    seedPhrase: 'alpha-bravo-charlie',
    mapSize: 8,
    difficulty: 'normal',
    eventSeed: 'evt',
    mode: 'age-of-strata',
  });
}

describe('VICTORY_THRESHOLDS shape', () => {
  it('declares all four threshold knobs', () => {
    expect(VICTORY_THRESHOLDS.militaryEnemyBaseDestroys).toBeGreaterThan(0);
    expect(VICTORY_THRESHOLDS.economicGold).toBeGreaterThan(0);
    expect(VICTORY_THRESHOLDS.scientificDiscoveries).toBeGreaterThan(0);
    expect(VICTORY_THRESHOLDS.diplomaticAlliances).toBeGreaterThan(0);
  });
});

describe('detectVictoryFor military', () => {
  it('returns military when game.outcome is already win (player)', () => {
    const g = fresh();
    g.outcome = 'win';
    expect(detectVictoryFor(g, 'player')).toBe('military');
  });
  it('returns military when game.outcome is loss (enemy)', () => {
    const g = fresh();
    g.outcome = 'loss';
    expect(detectVictoryFor(g, 'enemy')).toBe('military');
  });
});

describe('detectVictoryFor scientific', () => {
  it('returns scientific when research.purchased.size >= threshold', () => {
    const g = fresh();
    for (let i = 0; i < VICTORY_THRESHOLDS.scientificDiscoveries; i++) {
      g.research.purchased.add(`stub-discovery-${i}` as never);
    }
    expect(detectVictoryFor(g, 'player')).toBe('scientific');
  });
});

describe('detectVictoryFor diplomatic', () => {
  it('returns diplomatic with N ally/tributary ties', () => {
    const g = fresh();
    // Three allies on the 'player' side.
    setRelation(g.diplomacy, 'player', 'enemy', 'ally', 1);
    setRelation(g.diplomacy, 'player', 'player-3', 'ally', 1);
    acceptTribute(g.diplomacy, 'player-4', 'player', 1);
    expect(detectVictoryFor(g, 'player')).toBe('diplomatic');
  });
});

describe('detectVictory sweep', () => {
  it('returns null when nothing applies', () => {
    expect(detectVictory(fresh())).toBeNull();
  });
  it('returns the first faction + kind that fires', () => {
    const g = fresh();
    g.outcome = 'win';
    const record = detectVictory(g);
    expect(record).not.toBeNull();
    expect((record as VictoryRecord).kind).toBe('military');
    expect((record as VictoryRecord).winner).toBe('player');
  });
});
