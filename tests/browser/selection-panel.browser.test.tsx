import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Selectable } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { SelectionPanel } from '@/hud/selection';

describe('SelectionPanel', () => {
  it('renders nothing when no entity is selected', () => {
    const game = startGame('ancient-silver-forest');
    render(<SelectionPanel game={game} onBeginBuild={() => {}} />);
    expect(document.getElementById('selection-panel')).toBeNull();
  });

  it('slides in and shows the selected entity name', async () => {
    const game = startGame('ancient-silver-forest');
    // M_V11.OPEN.SPAWN — startGame no longer pre-spawns peons.
    // Spawn one explicitly so the selection panel has an entity
    // to display.
    const [tq, tr] = game.palaceKey.split(',').map(Number) as [number, number];
    const tile = game.board.tiles.get(`${tq + 1},${tr}`);
    if (tile?.walkable) {
      createCharacter({
        world: game.world,
        role: 'Peon',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
    }
    const entity = game.world.query(Selectable)[0];
    if (!entity) throw new Error('no selectable entity');
    selectEntity(game, entity);
    render(<SelectionPanel game={game} onBeginBuild={() => {}} />);
    await vi.waitFor(
      () => {
        const panel = document.getElementById('selection-panel');
        expect(panel).not.toBeNull();
        expect(panel?.textContent ?? '').toContain('Selected');
      },
      { timeout: 3000, interval: 100 },
    );
  });
});
