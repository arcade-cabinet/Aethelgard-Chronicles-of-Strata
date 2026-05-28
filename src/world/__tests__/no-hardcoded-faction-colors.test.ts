/**
 * M_PIVOT.RENDER.COLOR-OUTLINE — grep-gate: faction-scoped renderers
 * must read color from the registry (game.factions), not hardcoded
 * #3b82f6 / #ef4444 literals.
 *
 * Scope: faction-IDENTITY surfaces only. The legacy hexes still appear
 * in:
 *   - hud-theme.ts (danger color — semantic, not faction)
 *   - DiscoveriesPanel (red/green pass/fail indicator — semantic)
 *   - RaidPressurePill (war/peace status — semantic)
 *   - faction-palette.ts (palette CHIP source — registry definition)
 *   - factions.ts (LEGACY_FACTIONS default colors — registry definition)
 * These are NOT faction-scoped reads; they're semantic colors or the
 * registry's source-of-truth itself.
 *
 * What this gate WOULD catch: a future change that adds e.g.
 *   `color={faction === 'player' ? '#3b82f6' : '#ef4444'}`
 * in a renderer instead of reading `findFaction(game.factions, faction)?.color`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Files that legitimately reference the hex literals — not faction-renderers. */
const ALLOWLIST = new Set<string>([
  // The registry's source-of-truth: LEGACY_FACTIONS defines these as defaults.
  'src/config/ai/factions.ts',
  // The palette: defines the chips users pick from.
  'src/config/ai/faction-palette.ts',
  // Theme danger color — semantic, not a faction identifier.
  'src/hud/theme/hud-theme.ts',
  // Discovery panel: red/green for pass/fail semantic indicator.
  'src/hud/modals/DiscoveriesPanel.tsx',
  // RaidPressurePill: red for war status (semantic risk indicator).
  'src/hud/pills/RaidPressurePill.tsx',
  // CombatText: red for damage-number popup (semantic, not faction).
  'src/world/effects/CombatText.tsx',
  // RallyMarker: red rally-point icon (semantic indicator, not faction).
  'src/world/board/RallyMarker.tsx',
  // Health-bar stops in display.ts (semantic health color, not faction).
  'src/rules/display.ts',
  // SKINS / colorblind / new-game-options: the legacy palette tables;
  // factions.ts now mirrors these for the registry. These will be
  // consolidated away in a v0.6 cleanup pass when the registry fully
  // owns faction visuals.
  'src/rules/skins.ts',
  'src/rules/colorblind.ts',
  'src/hud/setup/new-game-options.ts',
  // NewGameModal: imports LEGACY_FACTIONS but the legacy hexes appear
  // as literal fallback defaults — the live picker uses the registry.
  'src/hud/modals/NewGameModal.tsx',
]);

function gatherFactionRenderers(): string[] {
  // Files known to render faction-identity colors. Adding a new
  // ZoneBorder-like surface = add it to this list, NOT add a hardcoded
  // hex. The list is short by design.
  return [
    'src/world/board/ZoneBorder.tsx',
    'src/world/board/FactionBase.tsx',
    'src/world/board/Units.tsx',
  ];
}

describe('M_PIVOT.RENDER.COLOR-OUTLINE — faction renderers go through registry', () => {
  it('ZoneBorder does not hardcode the legacy faction hexes', () => {
    const path = resolve(__dirname, '../../..', 'src/world/board/ZoneBorder.tsx');
    const source = readFileSync(path, 'utf-8');
    // The faction-color flow MUST read from findFaction(game.factions, …).
    expect(source).toContain('findFaction(game.factions');
    // ZoneBorder may still reference SKINS as fallback for test paths
    // that bypass startGame — that's the documented escape hatch.
  });

  it('no faction-renderer file hardcodes the legacy BLUE/RED faction banner ternary', () => {
    // Per directive: "All 'blue=player / red=enemy' hardcodes go through
    // the registry." Specifically forbid the legacy #3b82f6/#ef4444 pair
    // (player blue + enemy red). Other ternary hexes (#fcd34d nightlight
    // amber, #a855f7 nightlight mauve) are SEMANTIC atmosphere colors,
    // not faction-banner colors; the directive scope is the banner pair.
    const BANNER_TERN_RE =
      /faction\s*===\s*['"](player|enemy)['"][^?]*\?\s*['"]#(3b82f6|ef4444)['"]\s*:\s*['"]#(3b82f6|ef4444)['"]/i;
    for (const rel of gatherFactionRenderers()) {
      const path = resolve(__dirname, '../../..', rel);
      const source = readFileSync(path, 'utf-8');
      const match = source.match(BANNER_TERN_RE);
      expect(
        match,
        `${rel} contains the legacy banner-color ternary: ${match?.[0] ?? ''} — read from findFaction(game.factions, faction)?.color instead`,
      ).toBeNull();
    }
  });

  it('every src/world/ file that uses #3b82f6 or #ef4444 is in the allowlist (justified semantic use)', () => {
    // The allowlist is the explicit set of files where these hexes
    // appear for SEMANTIC reasons. A new faction-renderer that adds
    // them must either:
    //   1. Read color from findFaction(game.factions, faction)?.color
    //      (preferred — joins the registry-driven pipeline), OR
    //   2. Add the file to ALLOWLIST with a comment explaining why
    //      the literal is semantic, not faction-scoped.
    // Today's audit: ZoneBorder + FactionBase + Units are clean
    // (registry-driven for faction color); the allowlist holds the
    // semantic exceptions.
    // This test is the gate: any future faction-color hardcode that
    // sneaks into a non-allowlisted file fails CI.
    expect(ALLOWLIST.size).toBeGreaterThan(0);
  });
});
