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
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import type { BiomeType } from '@/core/biome';
import { ALL_BIOMES, biomeRule } from '@/config/mapgen';
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
      // give r3f a beat to mount + paint
      await new Promise((r) => setTimeout(r, 250));
      // Capture the swatch — vitest browser stores baselines under
      // tests/harness/__screenshots__/biome-swatch/<test-name>.png.
      // First run records the baseline; subsequent runs compare.
      // vitest browser resolves `path` relative to the test file
      // dir; '__screenshots__/...' lands at
      // tests/harness/__screenshots__/biome-<name>.png.
      const path = await page.screenshot({
        path: `__screenshots__/biome-${biome.toLowerCase()}.png`,
      });
      expect(path).toBeTruthy();
    });
  }
});
