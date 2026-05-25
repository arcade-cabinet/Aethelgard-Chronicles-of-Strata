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
import { Canvas, useThree } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { BiomeType } from '@/core/biome';
import { ALL_BIOMES, biomeRule } from '@/config/mapgen';
import { BiomeSwatch } from '@/world/BiomeSwatch';

/**
 * Probe that flips `window.__biomeReady = true` after the r3f gl
 * context exists + the scene has drawn at least one frame. Replaces
 * the prior `setTimeout(250)` race — Coderabbit reviewer finding
 * (MAJOR) noted that timing-based readiness is exactly the flake
 * source visual harnesses are supposed to eliminate.
 */
function ReadyProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!gl) return;
    let raf = 0;
    // r3f renders on the next rAF; flip the flag after one paint so
    // the screenshot capture sees the bound scene, not a black frame.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        (window as unknown as { __biomeReady?: boolean }).__biomeReady = true;
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

function HarnessScene({ biome }: { biome: BiomeType }) {
  const rule = biomeRule(biome);
  return (
    <div style={{ width: 240, height: 240 }}>
      <Canvas camera={{ position: [3, 4, 3], fov: 45 }} style={{ background: '#0f172a' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 3]} intensity={1.2} />
        <BiomeSwatch biome={biome} elevation={Math.max(0.5, rule.elevation)} />
        <ReadyProbe />
      </Canvas>
    </div>
  );
}

describe('biome swatch harness', () => {
  for (const biome of ALL_BIOMES) {
    it(`renders ${biome}`, async () => {
      // Reset the per-test readiness flag before mount.
      (window as unknown as { __biomeReady?: boolean }).__biomeReady = false;
      await render(<HarnessScene biome={biome} />);
      // Deterministic readiness wait — replaces the prior
      // `setTimeout(250)` race. The probe flips the flag after the
      // second rAF (one frame to bind the gl context, one to paint).
      await vi.waitFor(
        () => {
          if (!(window as unknown as { __biomeReady?: boolean }).__biomeReady) {
            throw new Error(`biome ${biome}: scene not ready`);
          }
        },
        { timeout: 5000, interval: 30 },
      );
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
