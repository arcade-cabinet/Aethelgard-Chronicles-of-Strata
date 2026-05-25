/**
 * M_V7.RENDER.COLOR-OUTLINE-V3 — pin that UnitHexOutline +
 * BuildingOutlineRing read faction.color from the runtime registry.
 *
 * Source-level grep test (the actual r3f render is covered by future
 * Playwright visual baselines). Same pattern as the v0.5 ZoneBorder
 * + v0.6 Minimap grep pins.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('M_V7.RENDER.COLOR-OUTLINE-V3 — registry color flow', () => {
  it('UnitHexOutline source contains findFaction(game.factions) lookup', () => {
    const path = resolve(__dirname, '../../..', 'src/world/UnitHexOutline.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain('findFaction(game.factions');
  });

  it('BuildingOutlineRing source contains findFaction(game.factions) lookup', () => {
    const path = resolve(__dirname, '../../..', 'src/world/BuildingOutlineRing.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain('findFaction(game.factions');
  });

  it('neither component hardcodes the legacy banner ternary', () => {
    const BANNER_TERN_RE =
      /faction\s*===\s*['"](player|enemy)['"][^?]*\?\s*['"]#(3b82f6|ef4444)['"]\s*:\s*['"]#(3b82f6|ef4444)['"]/i;
    for (const rel of ['src/world/UnitHexOutline.tsx', 'src/world/BuildingOutlineRing.tsx']) {
      const path = resolve(__dirname, '../../..', rel);
      const source = readFileSync(path, 'utf-8');
      expect(source.match(BANNER_TERN_RE), `${rel} hardcodes legacy banner ternary`).toBeNull();
    }
  });
});

describe('M_V8.OUTLINE.CANVAS-MOUNT — wired into GameCanvas', () => {
  it('GameCanvas imports UnitHexOutline', () => {
    const path = resolve(__dirname, '../../..', 'src/render/GameCanvas.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain("from '@/world/UnitHexOutline'");
  });

  it('GameCanvas imports BuildingOutlineRing', () => {
    const path = resolve(__dirname, '../../..', 'src/render/GameCanvas.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain("from '@/world/BuildingOutlineRing'");
  });

  it('GameCanvas renders both outline components', () => {
    const path = resolve(__dirname, '../../..', 'src/render/GameCanvas.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain('<UnitHexOutline');
    expect(source).toContain('<BuildingOutlineRing');
  });
});
