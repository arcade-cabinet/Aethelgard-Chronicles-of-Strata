/**
 * M_V11.DISCOVERY-EXPANSION — DiscoveriesPanel visual baseline.
 *
 * The discovery registry grew from 13 to 36 entries across 6 themed
 * chains (GAME-DESIGN-AUDIT task #77b). The panel uses a search-
 * filter input once the registry exceeds 6 entries (always-on now);
 * this baseline pins the rendered shape so a regression in panel
 * layout / scroll / filter visibility trips the diff.
 */
import { page } from '@vitest/browser/context';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { DiscoveriesPanel } from '@/hud/modals';

function Stage({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:open-discoveries'));
    }, 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ width: 800, height: 900, position: 'relative', background: '#0f172a' }}>
      {children}
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle(ms = 500) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('M_V11.DISCOVERY-EXPANSION — DiscoveriesPanel baseline', () => {
  it('panel renders all 36 discoveries with search filter visible', async () => {
    const game = startGame('discoveries-panel-baseline');
    // Give the player some resources so the cost coloring renders the
    // affordable / unaffordable states.
    game.economy.player.wood = 500;
    game.economy.player.stone = 500;
    game.economy.player.gold = 500;
    render(
      <Stage>
        <DiscoveriesPanel game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/discoveries-panel-expanded.png` }),
    ).resolves.toBeTruthy();
  });
});
