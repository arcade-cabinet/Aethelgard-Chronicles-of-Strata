import type { ReactElement } from 'react';
import { CylinderGeometry, Color } from 'three';
import type { BiomeType } from '@/core/biome';
import { BIOME_COLORS } from './palette';

/**
 * M_FUN.ARCH.HARNESS — a single hex tile rendered in isolation.
 * Used by tests/harness/biome.browser.test.tsx to lock per-biome
 * visual baselines without spinning up the full game scene.
 *
 * NOT mounted in the production game — pure test-side scaffolding
 * (production tile rendering lives in Terrain.tsx as one big mesh
 * geometry). The colour comes from the same BIOME_COLORS table the
 * production mesh uses, so a baseline regression here surfaces a
 * palette regression in the live game.
 *
 * @param biome     which BiomeType to render
 * @param elevation extruded height (use the BiomeRule.elevation
 *                   value from src/config/mapgen.json so the
 *                   swatch matches in-game elevation tiers)
 */
export function BiomeSwatch({
  biome,
  elevation = 1,
}: {
  biome: BiomeType;
  elevation?: number;
}): ReactElement {
  const colour = new Color(BIOME_COLORS[biome]);
  // Hex prism: 6-sided cylinder, flat-topped. Radius 1 unit.
  const geometry = new CylinderGeometry(1, 1, elevation, 6);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={colour} flatShading />
    </mesh>
  );
}
