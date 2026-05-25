/**
 * M_FUN.AUDIO.BIOME — per-biome ambient track routing.
 *
 * Maps each BiomeType to a curated asset id from
 * references/GameLoops_Vol5_FantasyRPG (CC-BY, attribution in
 * src/config/credits.json). The hook ambientForBiome() reads the
 * camera-centre tile's biome and the consumer (useAudio /
 * playMusic) cross-fades from current → next.
 *
 * Coverage: 7 biome-anchored loops cover the 12 biomes via
 * sensible fallbacks (OCEAN/LAKE/SHALLOWS share `coast`;
 * MOUNTAIN/MOUNTAIN_PASS share `highland`; LAVA shares
 * `volcano`). Adding a new biome = add one row.
 */
import { assets } from '@/assets/assets';
import type { BiomeType } from '@/core/biome';

export const BIOME_AMBIENT: Record<BiomeType, string> = {
  OCEAN: 'audio.ambient.coast',
  LAKE: 'audio.ambient.coast',
  SHALLOWS: 'audio.ambient.coast',
  BEACH: 'audio.ambient.coast',
  SWAMP: 'audio.ambient.swamp',
  DESERT: 'audio.ambient.desert',
  GRASS: 'audio.ambient.grass',
  FOREST: 'audio.ambient.forest',
  HIGHLAND: 'audio.ambient.highland',
  MOUNTAIN_PASS: 'audio.ambient.highland',
  MOUNTAIN: 'audio.ambient.highland',
  VOLCANO: 'audio.ambient.volcano',
  LAVA: 'audio.ambient.volcano',
  // M_FUN.ECON.QUICKSAND — quicksand on a beach hex shares the coast
  // ambient (waves + birds); the visual swirl carries the danger cue.
  QUICKSAND: 'audio.ambient.coast',
  // M_V6.CARRY.RUINS-BIOME — cleared-camp tile uses the grass ambient
  // (it's structurally a grass-tier walkable tile; the visual carries
  // the "old camp" cue, not the audio).
  RUINS: 'audio.ambient.grass',
  // M_V6.PORTAL.STONES-EVENT — uses the grass ambient as a base;
  // the portal swirl visual carries the magical cue.
  PORTAL_STONE: 'audio.ambient.grass',
};

// Coderabbit MAJOR PR #10 05:46Z — typed-manifest enforcement.
// The string IDs above can't be compile-time checked (TypeScript
// can't infer the manifest's `audio.ambient.*` keys from JSON), so
// a rename slips through tsc and surfaces as silent gameplay. Validate
// every id resolves at module load — throws fast on drift, same shape
// as the equivalent sound-map.ts guard.
for (const [biome, id] of Object.entries(BIOME_AMBIENT)) {
  try {
    assets.entry(id);
  } catch {
    throw new Error(
      `BIOME_AMBIENT["${biome}"] references unknown asset id "${id}" — ` +
        'manifest drift or typo. Check src/config/asset-metadata.json.',
    );
  }
}

/** Resolve the ambient track id for a biome. */
export function ambientForBiome(biome: BiomeType): string {
  return BIOME_AMBIENT[biome] ?? 'audio.music.ambient';
}
