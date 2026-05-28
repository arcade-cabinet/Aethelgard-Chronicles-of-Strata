/**
 * M_V7.CARRY.SAVE-V6-STATE — round-trip every v0.6 substrate field.
 *
 * Resolves CRIT-1 from the v0.7 cycle opening review: v0.6 added 6
 * runtime fields to GameState (diplomacy, diplomacyProposals,
 * tradeCooldowns, mythEvents, victoryRecord, portalStoneCooldowns)
 * but serializeGame / deserializeGame never wrote / restored them.
 * A save mid-match dropped every brokered alliance + active event.
 *
 * Pins:
 *   1. Diplomacy relations (ally / enemy / tributary) round-trip with
 *      dominant + sinceClockSeconds preserved.
 *   2. Pending non-aggression-pact proposals round-trip with expiry.
 *   3. Trade + portal-stone cooldown Maps round-trip exactly.
 *   4. Active myth-event id + expiry + last-fire clock round-trip.
 *   5. VictoryRecord (kind + winner + detected-at) round-trips when
 *      non-null; null stays null.
 *   6. Defensive: tampered diplomacy (invalid relation enum, oversized
 *      key) is silently dropped (no crash).
 */
import { describe, expect, it } from 'vitest';
import { setRelation } from '@/game/diplomacy';
import { proposeNonAggressionPact } from '@/game/diplomacy-border';
import { acceptTribute } from '@/game/diplomacy-tribute';
import { startGame } from '@/game/game-state';
import { fireMythEvent } from '@/game/narrative';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

function fresh(): ReturnType<typeof startGame> {
  return startGame({
    seedPhrase: 'alpha-bravo-charlie',
    mapSize: 8,
    difficulty: 'normal',
    eventSeed: 'evt',
  });
}

describe('M_V7.CARRY.SAVE-V6-STATE — v0.6 substrate round-trip', () => {
  it('diplomacy relations (ally + tributary) round-trip; tampered entries dropped', () => {
    const game = fresh();
    setRelation(game.diplomacy, 'player', 'enemy', 'ally', 50);
    acceptTribute(game.diplomacy, 'player-3', 'player', 100);
    const snap = serializeGame(game);
    expect(snap.diplomacy).toBeDefined();
    expect(snap.diplomacy?.length).toBe(2);
    // Inject a tampered entry with an invalid relation enum value —
    // the defensive restore in deserializeGame MUST silently drop it.
    const tampered = JSON.parse(JSON.stringify(snap)) as ReturnType<typeof serializeGame>;
    (tampered.diplomacy as Array<[string, { relation: string }]>).push([
      'tampered|key',
      { relation: 'admin-takeover' as 'ally' },
    ]);
    const restored = deserializeGame(tampered);
    // Only the 2 valid entries restored; tampered entry dropped.
    expect(restored.diplomacy.relations.size).toBe(2);
    // Sorted-pair-key recovery — relation + dominant + sinceClockSeconds.
    const allyEntry = [...restored.diplomacy.relations.values()].find((e) => e.relation === 'ally');
    expect(allyEntry?.sinceClockSeconds).toBe(50);
    const tribEntry = [...restored.diplomacy.relations.values()].find(
      (e) => e.relation === 'tributary',
    );
    expect(tribEntry?.dominant).toBe('player');
    expect(tribEntry?.sinceClockSeconds).toBe(100);
  });

  it('pending non-aggression-pact proposals round-trip', () => {
    const game = fresh();
    proposeNonAggressionPact(game.diplomacyProposals, game.diplomacy, 'player', 'enemy', 200);
    const snap = serializeGame(game);
    expect(snap.diplomacyProposals).toBeDefined();
    expect(snap.diplomacyProposals).toHaveLength(1);
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.diplomacyProposals.pending).toHaveLength(1);
    expect(restored.diplomacyProposals.pending[0]?.proposer).toBe('player');
    expect(restored.diplomacyProposals.pending[0]?.target).toBe('enemy');
    expect(restored.diplomacyProposals.pending[0]?.expiresAtSeconds).toBe(210);
  });

  it('trade + portal-stone cooldowns round-trip', () => {
    const game = fresh();
    game.tradeCooldowns.cooldowns.set('player|enemy', 250);
    game.portalStoneCooldowns.set('player', 300);
    game.portalStoneCooldowns.set('player-3', 350);
    const snap = serializeGame(game);
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.tradeCooldowns.cooldowns.get('player|enemy')).toBe(250);
    expect(restored.portalStoneCooldowns.get('player')).toBe(300);
    expect(restored.portalStoneCooldowns.get('player-3')).toBe(350);
  });

  it('active myth event + last-fire clock round-trip', () => {
    const game = fresh();
    fireMythEvent(game.mythEvents, 'solar-eclipse', 500);
    const snap = serializeGame(game);
    expect(snap.mythEvents?.lastFireSeconds).toBe(500);
    expect(snap.mythEvents?.active?.id).toBe('solar-eclipse');
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.mythEvents.lastFireSeconds).toBe(500);
    expect(restored.mythEvents.active?.id).toBe('solar-eclipse');
    expect(restored.mythEvents.active?.expiresAtSeconds).toBe(560);
  });

  // M_V11.PURGE — victoryRecord round-trip test deleted (the
  // field was 4X-only). Other v6-state round-trips below still
  // cover the substrate.

  it('FactionConfigSchema rejects duplicate faction ids (HIGH-4)', () => {
    const game = fresh();
    const snap = serializeGame(game);
    // Inject a duplicate 'player' id into the config registry.
    const tampered = JSON.parse(JSON.stringify(snap)) as ReturnType<typeof serializeGame>;
    tampered.config.factions = [
      {
        id: 'player',
        displayName: 'P1',
        kind: 'human',
        color: '#3b82f6',
        archetype: 'medieval',
      },
      {
        id: 'player', // duplicate!
        displayName: 'P1 (tampered)',
        kind: 'human',
        color: '#ff00ff',
        archetype: 'medieval',
      },
    ];
    expect(() => deserializeGame(tampered)).toThrow(/duplicate faction ids/);
  });
});
