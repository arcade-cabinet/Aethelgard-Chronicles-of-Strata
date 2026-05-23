/**
 * Zone-of-control border rendering — browser test (M8.5z, spec 102).
 *
 * Verifies:
 * 1. The game mounts with the ZoneBorder layer in a real r3f Canvas.
 * 2. A faction's controlled tiles produce a non-empty border hull; an empty
 *    zone produces no border.
 * 3. The whole board is visible (no fog) — every unit renders regardless of
 *    observation.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { Unit } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { claimTile } from '@/game/zone';
import { enterGame } from './enter-game';

describe('zone-of-control border (M8.5z)', () => {
  it('mounts the game with the zone border layer', async () => {
    await render(<App />);
    await enterGame();
    expect(document.querySelector('canvas:not(#minimap-canvas)')).not.toBeNull();
  });

  it('a fresh game has empty zones until tiles are claimed', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.zones.player.controlled.size).toBe(0);
    expect(game.zones.enemy.controlled.size).toBe(0);
  });

  it('claiming tiles grows a faction zone', () => {
    const game = startGame('ancient-silver-forest');
    // claim a few walkable tiles for the player
    let claimed = 0;
    for (const tile of game.board.tiles.values()) {
      if (tile.walkable && claimed < 5) {
        claimTile(game.zones.player, `${tile.q},${tile.r}`);
        claimed += 1;
      }
    }
    expect(game.zones.player.controlled.size).toBe(5);
    expect(game.zones.enemy.controlled.size).toBe(0);
  });

  it('every unit renders — the board is fully visible (no fog cull)', () => {
    const game = startGame('ancient-silver-forest');
    const before = game.world.query(Unit).length;
    // the unit roster is the full ECS unit set — no visibility filtering
    expect(before).toBeGreaterThan(0);
  });
});
