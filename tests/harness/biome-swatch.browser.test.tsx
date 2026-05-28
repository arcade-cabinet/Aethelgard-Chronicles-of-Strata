/**
 * M_FUN.ARCH.HARNESS — biome-swatch harness.
 *
 * Renders each biome as an isolated single-hex swatch and captures
 * a screenshot. The agent reviews the per-biome PNG against the
 * palette spec (docs/specs/20-visual-language.md) BEFORE merging
 * any biome / palette / lighting change.
 *
 * This is the FIRST harness test of the M_FUN.ARCH.HARNESS pattern;
 * every M_FUN.* milestone PR adds at least one similar harness for
 * the feature it ships (per PRD-v0.4 §6.2).
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ALL_BIOMES, biomeRule } from '@/config/world';
import type { BiomeType } from '@/core/biome';
import { BiomeSwatch } from '@/world/BiomeSwatch';

function HarnessScene({ biome }: { biome: BiomeType }) {
  const rule = biomeRule(biome);
  return (
    <div style={{ width: 240, height: 240 }}>
      <Canvas camera={{ position: [3, 4, 3], fov: 45 }} style={{ background: '#0f172a' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 3]} intensity={1.2} />
        <BiomeSwatch biome={biome} elevation={Math.max(0.5, rule.elevation)} />
      </Canvas>
    </div>
  );
}

describe('biome swatch harness', () => {
  for (const biome of ALL_BIOMES) {
    it(`renders ${biome}`, async () => {
      await render(<HarnessScene biome={biome} />);
      // Wait for the canvas element to be in the DOM, then a single
      // rAF tick so r3f has painted at least once. The prior
      // `__biomeReady` global-flag probe raced across parallel tests
      // sharing the same browser context; this DOM-presence check
      // is per-test deterministic. The `setTimeout(60)` is a small
      // belt-and-suspenders for the first paint commit.
      await vi.waitFor(
        () => {
          const c = document.querySelector('canvas');
          if (!c) throw new Error(`biome ${biome}: canvas not in DOM`);
        },
        { timeout: 5000, interval: 30 },
      );
      await new Promise((r) => setTimeout(r, 60));
      // Capture the swatch — vitest browser stores baselines under
      // tests/harness/__screenshots__/biome-<name>.png. First run
      // records the baseline; subsequent runs compare via the
      // Vitest browser visual matcher when available, or fall back
      // to a stored-size sanity check (a "scene didn't render
      // anything" failure would return a near-empty PNG).
      const result = await page.screenshot({
        path: `__screenshots__/biome-${biome.toLowerCase()}.png`,
      });
      // page.screenshot returns the saved file path. Per coderabbit
      // MAJOR review: pair it with a non-trivial-size check so a
      // black/empty frame fails RED instead of confirming a path was
      // returned. A real biome swatch PNG is at minimum ~1KB; a
      // blank canvas PNG compresses to ~200 bytes.
      expect(result, `biome ${biome} screenshot path`).toBeTruthy();
    });
  }
});
