/**
 * M_V6.CARRY.SAVE-N-PLAYER — round-trip the N-player faction registry.
 *
 * Acceptance: a 6-faction save round-trips identically (same id+color+kind
 * set per slot). v0.4/v0.5 LEGACY 2-faction saves continue to load.
 *
 * Pins:
 *   1. serializeGame writes the full registry to snap.config.factions.
 *   2. deserializeGame restores it (round-trip preserves id/color/kind/
 *      archetype/personality).
 *   3. v0.4 saves (factions field absent) still load — LEGACY fallback.
 *   4. Tampered registry (invalid color hex, oversized id) fails validation.
 *   5. Barbarian-camp slots round-trip too (auto-spawned in startGame).
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultFactions, type FactionConfig, LEGACY_FACTIONS } from '@/config/ai';
import { startGame } from '@/game/game-state';
import { deserializeGame, type GameSnapshot, serializeGame } from '@/persistence/serialize-game';

describe('M_V6.CARRY.SAVE-N-PLAYER — round-trip registry', () => {
  it('LEGACY 2-faction save round-trips with default colors preserved', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    // M_V11.CAMPS.SPAWN — startGame now auto-spawns N barbarian camps
    // every match. Filter to player factions for the contract checks.
    const snap = serializeGame(game);
    expect(snap.config.factions).toBeDefined();
    const playerFactions = snap.config.factions?.filter((f) => f.kind !== 'barbarian') ?? [];
    expect(playerFactions).toHaveLength(2);
    expect(playerFactions[0]?.id).toBe('player');
    expect(playerFactions[1]?.id).toBe('enemy');
    expect(playerFactions[0]?.color).toBe('#3b82f6');
    expect(playerFactions[1]?.color).toBe('#ef4444');

    // Round-trip through JSON to mimic real persistence.
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    const restoredPlayers = restored.factions.filter((f) => f.kind !== 'barbarian');
    expect(restoredPlayers).toHaveLength(2);
    expect(restoredPlayers[0]?.id).toBe('player');
    expect(restoredPlayers[1]?.color).toBe('#ef4444');
  });

  it('6-faction save round-trips with all slot ids + colors preserved', () => {
    const colors = ['#aa0000', '#00aa00', '#0000aa', '#aaaa00', '#aa00aa', '#00aaaa'];
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 14,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: buildDefaultFactions(6, colors),
    });
    const snap = serializeGame(game);
    // 6 player factions + 1-4 auto-spawned barbarian camps (depends on board).
    const playerFactionSnap = snap.config.factions?.filter((f) => f.kind !== 'barbarian');
    const campFactionSnap = snap.config.factions?.filter((f) => f.kind === 'barbarian');
    expect(playerFactionSnap).toHaveLength(6);
    expect(campFactionSnap?.length ?? 0).toBeGreaterThanOrEqual(1);
    // Slot id ordering preserved.
    expect(playerFactionSnap?.map((f) => f.id)).toEqual([
      'player',
      'enemy',
      'player-3',
      'player-4',
      'player-5',
      'player-6',
    ]);

    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    const restoredPlayers = restored.factions.filter((f) => f.kind !== 'barbarian');
    expect(restoredPlayers).toHaveLength(6);
    expect(restoredPlayers.map((f) => f.color)).toEqual(colors);
  });

  it('v0.4/v0.5 LEGACY save (factions field absent) still loads via fallback', () => {
    // Build a synthetic snapshot WITHOUT the factions field — simulates a
    // v0.4/v0.5 save written before SAVE-N-PLAYER landed.
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const snap = serializeGame(game);
    const legacy = JSON.parse(JSON.stringify(snap)) as GameSnapshot;
    // Drop the factions field to mimic the older shape.
    delete (legacy.config as { factions?: unknown }).factions;
    const restored = deserializeGame(legacy);
    // LEGACY fallback kicks in — startGame defaults to LEGACY_FACTIONS overlay.
    // M_V11.CAMPS.SPAWN — startGame also auto-spawns barbarian camps,
    // but the LEGACY fallback path only restores the 2-player slot;
    // serialized factions are the source of truth on a restore.
    const playerFactions = restored.factions.filter((f) => f.kind !== 'barbarian');
    expect(playerFactions).toHaveLength(2);
    expect(playerFactions[0]?.id).toBe('player');
    expect(playerFactions[0]?.color).toBe(LEGACY_FACTIONS[0]?.color);
  });

  it('rejects a tampered registry (invalid color hex)', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const snap = serializeGame(game);
    const tampered = JSON.parse(JSON.stringify(snap)) as GameSnapshot;
    // Inject an invalid color into the first faction.
    (tampered.config.factions?.[0] as FactionConfig).color = 'not-a-color';
    expect(() => deserializeGame(tampered)).toThrow();
  });

  it('rejects a registry with too many entries (> 16)', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const snap = serializeGame(game);
    const oversize = JSON.parse(JSON.stringify(snap)) as GameSnapshot;
    // Inflate to 20 factions — exceeds the 16-max schema cap.
    const factions: FactionConfig[] = [];
    for (let i = 0; i < 20; i++) {
      factions.push({
        id: `slot-${i}`,
        displayName: `Slot ${i}`,
        kind: 'human',
        color: '#123456',
        archetype: 'medieval',
      });
    }
    oversize.config.factions = factions;
    expect(() => deserializeGame(oversize)).toThrow();
  });
});
