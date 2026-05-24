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
};

/** Resolve the ambient track id for a biome. */
export function ambientForBiome(biome: BiomeType): string {
  return BIOME_AMBIENT[biome] ?? 'audio.music.ambient';
}
