/**
 * M_V12.DEPTH.UPGRADE-PERSISTENCE — chain-starter runtime pin.
 *
 * Each Atelier `starter-<chain>-<spec>` meta-unlock pre-purchases
 * the named tier-I Discovery at match start. Pin the mapping +
 * the apply() effect against the freshly-built GameState.
 */
import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';

describe('M_V12.DEPTH.UPGRADE-PERSISTENCE — chain-starter runtime', () => {
  it('starter-economy-harvest pre-purchases steelPlows', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-harvest',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-harvest'],
    });
    expect(g.research.purchased.has('steelPlows' as never)).toBe(true);
  });

  it('starter-economy-cap pre-purchases bulk-baskets AND lifts max supply by exactly 25', () => {
    // CodeRabbit MINOR fix: compare against a baseline run so the
    // assertion pins the actual delta (was a floor check that
    // could pass even if the modify-supply effect regressed).
    const baseline = startGame({
      seedPhrase: 'chain-starter-cap',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: [],
    });
    const withStarter = startGame({
      seedPhrase: 'chain-starter-cap',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-cap'],
    });
    expect(withStarter.research.purchased.has('bulk-baskets' as never)).toBe(true);
    expect(withStarter.economy.player.maxSupply - baseline.economy.player.maxSupply).toBe(25);
  });

  it('starter-military-infantry pre-purchases forgedBlades', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-mil',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-military-infantry'],
    });
    expect(g.research.purchased.has('forgedBlades' as never)).toBe(true);
  });

  it('multiple starters compose (cap + harvest)', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-compose',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-cap', 'starter-economy-harvest'],
    });
    expect(g.research.purchased.has('bulk-baskets' as never)).toBe(true);
    expect(g.research.purchased.has('steelPlows' as never)).toBe(true);
  });

  it('unknown meta-unlock ids no-op (do not throw)', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-unknown',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['some-nonexistent-id', 'palette-skin-iron-hill'],
    });
    // No throw; neither id should appear in research.
    expect(g.research.purchased.has('some-nonexistent-id' as never)).toBe(false);
  });

  it('empty unlockedMeta leaves research clean', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-empty',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: [],
    });
    expect(g.research.purchased.has('steelPlows' as never)).toBe(false);
    expect(g.research.purchased.has('forgedBlades' as never)).toBe(false);
  });

  // Reviewer M9 fix — pin the dedup branch: re-starting with the
  // same starter shouldn't double-add (the inner has-check in
  // applyChainStarters is the guard).
  it('duplicate starter id is semantically equivalent to single starter', () => {
    // CodeRabbit MINOR fix: instead of asserting size >= 1, compare
    // a single-starter run vs a duplicate-starter run and confirm
    // research.purchased is identical. Catches a regression where
    // the dedup branch silently corrupts state.
    const single = startGame({
      seedPhrase: 'chain-starter-dedup',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-harvest'],
    });
    const duped = startGame({
      seedPhrase: 'chain-starter-dedup',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-harvest', 'starter-economy-harvest'],
    });
    expect(duped.research.purchased.has('steelPlows' as never)).toBe(true);
    expect([...duped.research.purchased].sort()).toEqual([...single.research.purchased].sort());
  });
});
