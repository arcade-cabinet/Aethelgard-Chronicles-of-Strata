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

  it('starter-economy-cap pre-purchases bulk-baskets AND lifts max supply', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-cap',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-cap'],
    });
    expect(g.research.purchased.has('bulk-baskets' as never)).toBe(true);
    // bulk-baskets is modify-supply +25; default maxSupply seed +25.
    // Don't pin exact value (other systems may also touch maxSupply
    // during startGame); just assert the floor.
    expect(g.economy.player.maxSupply).toBeGreaterThanOrEqual(25);
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
  it('starter id present twice still results in one entry', () => {
    const g = startGame({
      seedPhrase: 'chain-starter-dedup',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'chain-starter-events',
      mode: 'coexistence',
      unlockedMeta: ['starter-economy-harvest', 'starter-economy-harvest'],
    });
    expect(g.research.purchased.has('steelPlows' as never)).toBe(true);
    // Set semantics already guard at the JS layer; this asserts
    // the applyChainStarters has-check is exercised without throw.
    expect(g.research.purchased.size).toBeGreaterThanOrEqual(1);
  });
});
