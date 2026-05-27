/**
 * M_V12.AI-DIPLO.TIMED-ALLY-USE — pin that discoveredEnemyTile
 * skips allied factions, so an AI with a timed-ally relation
 * doesn't focus-fire on its current ally. When the alliance
 * expires (tickAllianceExpiry), targeting resumes.
 */
import { describe, expect, it } from 'vitest';
import { discoveredEnemyTile } from '@/ai/helpers';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { setRelation, tickAllianceExpiry } from '@/game/diplomacy';
import { startGame } from '@/game/game-state';

describe('M_V12.AI-DIPLO.TIMED-ALLY-USE — target picker skips allies', () => {
  it("an ally's zone tiles are not returned as a target", () => {
    const g = startGame({
      seedPhrase: 'ally-target-skip',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'ally-target-events',
      mode: 'border-clash',
    });
    // Spawn an enemy Footman inside the player's zone so the
    // target picker would find it under baseline rules.
    const someTile = g.zones.player.controlled.values().next().value as string;
    const parts = someTile.split(',').map(Number);
    const q = parts[0] ?? 0;
    const r = parts[1] ?? 0;
    g.world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q, r, level: 0 }),
    );
    // Sanity: target found pre-alliance.
    expect(discoveredEnemyTile(g, 'player', 9999)).not.toBeNull();
    // Form a timed alliance.
    setRelation(g.diplomacy, 'player', 'enemy', 'ally', 0, null, 300);
    // Target now skipped.
    expect(discoveredEnemyTile(g, 'player', 9999)).toBeNull();
  });

  it('alliance expiry restores targeting', () => {
    const g = startGame({
      seedPhrase: 'ally-target-restore',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'ally-target-events',
      mode: 'border-clash',
    });
    const someTile = g.zones.player.controlled.values().next().value as string;
    const parts = someTile.split(',').map(Number);
    const q = parts[0] ?? 0;
    const r = parts[1] ?? 0;
    g.world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q, r, level: 0 }),
    );
    setRelation(g.diplomacy, 'player', 'enemy', 'ally', 0, null, 5);
    expect(discoveredEnemyTile(g, 'player', 9999)).toBeNull();
    // Tick past the 5s expiry.
    tickAllianceExpiry(g.diplomacy, 10);
    // Alliance gone, target returns.
    expect(discoveredEnemyTile(g, 'player', 9999)).not.toBeNull();
  });
});
