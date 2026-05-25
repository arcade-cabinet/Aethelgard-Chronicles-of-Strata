/**
 * M_V6.DIPLO.RELATION-MACHINE — relation state machine tests.
 *
 * Pins:
 *   1. Default state: every pair is 'neutral'.
 *   2. relationKey is symmetric: key(a,b) === key(b,a).
 *   3. setRelation stores; getRelation reads; symmetric.
 *   4. Same-id query returns 'ally' (self-allied).
 *   5. setRelation to 'neutral' deletes the entry (Map stays compact).
 *   6. tributary stores dominant + retrievable via tributaryDominant.
 *   7. isAlly + isEnemy convenience helpers.
 *   8. sinceClockSeconds stamps from setRelation's clock arg.
 *   9. GameState.diplomacy starts empty.
 */
import { describe, expect, it } from 'vitest';
import {
  createDiplomacyState,
  getRelation,
  getRelationEntry,
  isAlly,
  isEnemy,
  relationKey,
  setRelation,
  tributaryDominant,
} from '@/game/diplomacy';
import { startGame } from '@/game/game-state';

describe('relationKey symmetry', () => {
  it('key(a,b) === key(b,a)', () => {
    expect(relationKey('player', 'enemy')).toBe(relationKey('enemy', 'player'));
    expect(relationKey('barbarian-camp-1', 'player-3')).toBe(
      relationKey('player-3', 'barbarian-camp-1'),
    );
  });
});

describe('createDiplomacyState + getRelation defaults', () => {
  it('every pair starts neutral', () => {
    const d = createDiplomacyState();
    expect(getRelation(d, 'player', 'enemy')).toBe('neutral');
    expect(getRelation(d, 'player-3', 'player-4')).toBe('neutral');
  });

  it('same-id returns ally (self-allied)', () => {
    const d = createDiplomacyState();
    expect(getRelation(d, 'player', 'player')).toBe('ally');
    expect(getRelation(d, 'enemy', 'enemy')).toBe('ally');
  });

  it('getRelationEntry returns null for neutral / same-id', () => {
    const d = createDiplomacyState();
    expect(getRelationEntry(d, 'player', 'enemy')).toBeNull();
    expect(getRelationEntry(d, 'player', 'player')).toBeNull();
  });
});

describe('setRelation + getRelation round-trip', () => {
  it('ally is symmetric', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'ally', 50);
    expect(getRelation(d, 'player', 'enemy')).toBe('ally');
    expect(getRelation(d, 'enemy', 'player')).toBe('ally');
    expect(isAlly(d, 'player', 'enemy')).toBe(true);
  });

  it('enemy is symmetric', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'enemy', 100);
    expect(getRelation(d, 'player', 'enemy')).toBe('enemy');
    expect(isEnemy(d, 'player', 'enemy')).toBe(true);
  });

  it('setRelation to neutral DELETES the entry', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'ally', 50);
    expect(d.relations.size).toBe(1);
    setRelation(d, 'player', 'enemy', 'neutral', 60);
    expect(d.relations.size).toBe(0);
    expect(getRelation(d, 'player', 'enemy')).toBe('neutral');
  });

  it('same-id setRelation is a no-op', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'player', 'enemy', 100);
    expect(d.relations.size).toBe(0);
  });

  it('sinceClockSeconds stamps from the clock arg', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'ally', 123);
    expect(getRelationEntry(d, 'player', 'enemy')?.sinceClockSeconds).toBe(123);
  });
});

describe('tributary semantics', () => {
  it('stores dominant + retrievable via tributaryDominant', () => {
    const d = createDiplomacyState();
    // enemy paying tribute to player
    setRelation(d, 'player', 'enemy', 'tributary', 200, 'player');
    expect(getRelation(d, 'player', 'enemy')).toBe('tributary');
    expect(tributaryDominant(d, 'player', 'enemy')).toBe('player');
    // Symmetric retrieval
    expect(tributaryDominant(d, 'enemy', 'player')).toBe('player');
  });

  it('non-tributary pair returns null dominant', () => {
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'ally', 50);
    expect(tributaryDominant(d, 'player', 'enemy')).toBeNull();
  });
});

describe('GameState wiring', () => {
  it('startGame initializes an empty diplomacy state', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(game.diplomacy.relations.size).toBe(0);
    expect(getRelation(game.diplomacy, 'player', 'enemy')).toBe('neutral');
  });
});
