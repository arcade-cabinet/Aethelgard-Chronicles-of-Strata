/**
 * Build menu — browser test (M9.1a).
 *
 * The build-menu BUILDING_COSTS table is the single source of truth gating the
 * SelectionPanel's 6 build buttons. This test pins the table and verifies the
 * app boots cleanly with the build-menu UI compiled in.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { BUILDING_COSTS } from '@/rules';
import { enterGame } from './enter-game';

describe('build menu (M9.1a)', () => {
  it('the app mounts and the build-menu BUILDING_COSTS covers all 6 types', async () => {
    await render(<App />);
    await enterGame();
    expect(document.querySelector('canvas:not(#minimap-canvas)')).not.toBeNull();
    // pin the build-menu contract: every buildable type has a cost row
    const types = ['Farm', 'House', 'Granary', 'Barracks', 'Watchtower', 'Wall'] as const;
    for (const t of types) {
      expect(BUILDING_COSTS[t]).toBeDefined();
    }
  });
});
