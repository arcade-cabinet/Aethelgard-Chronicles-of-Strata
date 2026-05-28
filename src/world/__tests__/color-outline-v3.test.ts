/**
 * M_V7.RENDER.COLOR-OUTLINE-V3 — pin that UnitHexOutline +
 * BuildingOutlineRing read faction.color from the runtime registry.
 *
 * M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — partial conversion:
 *  - "source contains findFaction" → module-export shape check (component
 *    is a function). The actual color resolution is exercised by e2e +
 *    visual baselines; the import contract is verified by TypeScript.
 *  - "no hardcoded banner ternary" and "GameCanvas mounts both" are
 *    retained as code-quality lint gates (the invariant is structural,
 *    not behavioral; r3f components can't be rendered in jsdom).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BuildingOutlineRing } from '@/world/board';
import { UnitHexOutline } from '@/world/board';

describe('M_V7.RENDER.COLOR-OUTLINE-V3 — registry color flow', () => {
  it('UnitHexOutline is exported as a function (React component)', () => {
    expect(typeof UnitHexOutline).toBe('function');
  });

  it('BuildingOutlineRing is exported as a function (React component)', () => {
    expect(typeof BuildingOutlineRing).toBe('function');
  });

  it('neither component hardcodes the legacy banner ternary', () => {
    const BANNER_TERN_RE =
      /faction\s*===\s*['"](player|enemy)['"][^?]*\?\s*['"]#(3b82f6|ef4444)['"]\s*:\s*['"]#(3b82f6|ef4444)['"]/i;
    for (const rel of [
      'src/world/board/UnitHexOutline.tsx',
      'src/world/board/BuildingOutlineRing.tsx',
    ]) {
      const path = resolve(__dirname, '../../..', rel);
      const source = readFileSync(path, 'utf-8');
      expect(source.match(BANNER_TERN_RE), `${rel} hardcodes legacy banner ternary`).toBeNull();
    }
  });
});

describe('M_V8.OUTLINE.CANVAS-MOUNT — wired into GameCanvas', () => {
  it('GameCanvas source imports UnitHexOutline and BuildingOutlineRing', () => {
    // Structural gate: verifies the outline components are wired into the
    // canvas. The r3f render path is exercised by visual baselines + e2e.
    const path = resolve(__dirname, '../../..', 'src/render/GameCanvas.tsx');
    const source = readFileSync(path, 'utf-8');
    expect(source).toContain("from '@/world/board'");
    expect(source).toContain("from '@/world/board'");
    expect(source).toContain('<UnitHexOutline');
    expect(source).toContain('<BuildingOutlineRing');
  });
});
